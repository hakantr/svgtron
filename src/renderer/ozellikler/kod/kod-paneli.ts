import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import {
  EditorView,
  keymap,
  lineNumbers,
  Decoration,
  type DecorationSet,
} from "@codemirror/view";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { html as htmlDili } from "@codemirror/lang-html";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import type { BelgeDeposu } from "../../../cekirdek/belge/belge-deposu";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import { KodUygulaKomutu } from "../../../cekirdek/komutlar/kod-uygula-komutu";
import { panelKayitDefteri } from "../../../cekirdek/registry/panel-registry";
import { dilYonetici, t } from "../../diller/dil";
import { kodMetni, konumdakiKimlik } from "./kod-metin";

/** Seçili düğüm aralıklarını vurgulayan decoration alanı (StateEffect ile güncellenir). */
const seciliEtkisi = StateEffect.define<{ from: number; to: number }[]>();
/**
 * Seçili bloğun zemin vurgusu — kapsadığı HER satıra tam-genişlik decoration.
 * İlk satır `cm-secili-bas` (üst köşe yuvarlama + sol uç bandı), son satır
 * `cm-secili-son` (alt köşe yuvarlama) sınıfını da alır → grup gövdesi tek blok
 * olarak okunur. Tek satırlık (yaprak) eleman ikisini birden alır.
 */
const satirDeko = Decoration.line({ class: "cm-secili-satir" });
const basSatirDeko = Decoration.line({ class: "cm-secili-satir cm-secili-bas" });
const sonSatirDeko = Decoration.line({ class: "cm-secili-satir cm-secili-son" });
const tekSatirDeko = Decoration.line({
  class: "cm-secili-satir cm-secili-bas cm-secili-son",
});

/** Verilen aralıkların kapsadığı tüm satırlara zemin decoration'ı üretir (tekilleştirir). */
function blokDekor(
  doc: { lineAt: (pos: number) => { from: number; to: number } },
  araliklar: { from: number; to: number }[],
): DecorationSet {
  const satira = new Map<number, Decoration>(); // line.from → decoration
  for (const r of araliklar.filter((r) => r.to >= r.from)) {
    let pos = r.from;
    let ilk = true;
    while (pos <= r.to) {
      const satir = doc.lineAt(pos);
      const son = r.to <= satir.to;
      const deko =
        ilk && son
          ? tekSatirDeko
          : ilk
            ? basSatirDeko
            : son
              ? sonSatirDeko
              : satirDeko;
      // İç içe seçimde aynı satıra birden çok aralık düşerse ilk yazılanı koru.
      if (!satira.has(satir.from)) satira.set(satir.from, deko);
      ilk = false;
      if (satir.to + 1 > pos) pos = satir.to + 1;
      else break;
    }
  }
  const isaretler = [...satira.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([from, deko]) => deko.range(from));
  return Decoration.set(isaretler, true);
}

const seciliAlan = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(seciliEtkisi)) deco = blokDekor(tr.state.doc, e.value);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Canlı SVG kod paneli (§11.4) — **CodeMirror 6** (TK-39 kütüphane raporu). Eski
 * contenteditable mini-editör yerine CM6: söz-dizimi vurgu, sağlam seçim/caret/undo,
 * büyük dosya başarımı. Projenin ÇİFT YÖNLÜ senkronu ve geri-alınabilir "Uygula"sı
 * korunur:
 *  - Model → `kodMetni` ile metin + kimlik→aralık haritası üretilir (kod-metin.ts).
 *  - Tuvalde seçili düğüm(ler) kodda decoration ile vurgulanır; koda tıklayınca
 *    konumu kapsayan EN İÇTEKİ düğüm seçilir (Shift = çoklu).
 *  - "Uygula" editör metnini {@link KodUygulaKomutu} ile YERİNDE uygular (İlke 2 →
 *    ctrl+z geri alır). CM6'nın editör-içi undo'su yalnız metin düzenlemesi içindir.
 *  - Düzenleme sırasında (kirli) model değişse de metin EZİLMEZ (yazılanlar korunur);
 *    temizken belge değişince yeniden üretilir.
 *
 * Tek doğruluk kaynağı yine belge modelidir (İlke 3); panel onun bir görünümüdür.
 */
@customElement("kod-paneli")
export class KodPaneli extends LitElement {
  static override styles = css`
    :host {
      display: block;
      background: var(--yuzey);
      border-top: 1px solid var(--kenarlik);
      font-size: 0.78rem;
      color: var(--metin);
    }
    .baslik {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.7rem;
      cursor: pointer;
      user-select: none;
    }
    .baslik .ok {
      color: var(--metin-soluk);
    }
    .baslik .ad {
      flex: 1;
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--metin-soluk);
    }
    .hata {
      color: var(--hata);
      font-size: 0.72rem;
    }
    button {
      font: inherit;
      font-size: 0.74rem;
      padding: 0.15rem 0.6rem;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--vurgu);
      color: var(--vurgu-metin);
      cursor: pointer;
    }
    .kap {
      border-top: 1px solid var(--kenarlik);
    }
    .kap.gizli {
      display: none;
    }
    .bos {
      padding: 0.6rem 0.7rem;
      color: var(--metin-soluk);
      font-size: 0.74rem;
    }
    /* CodeMirror düzeni (tema EditorView.theme'de; renkler CSS değişkenlerinden). */
    .cm-editor {
      max-height: 240px;
      font-size: 0.72rem;
    }
    .cm-editor.cm-focused {
      outline: none;
    }
  `;

  depo!: BelgeDeposu;
  secim!: SecimDeposu;
  gecmis!: KomutGecmisi;

  @state() private acik = false;
  @state() private kirli = false;
  @state() private hata?: string;

  #view?: EditorView;
  /** kimlik → karakter aralığı (en son üretilen metne göre). */
  #araliklar = new Map<string, { from: number; to: number }>();
  /** Programatik doc değişimi sırasında "kirli" işaretlemeyi bastır. */
  #programatik = false;
  /** Kod alanı odakta mı (düzenleniyor) — odaktayken/kirliyken metin EZİLMEZ. */
  #odakta = false;
  #sonScrollImza = "";
  #depoCoz?: () => void;
  #secimCoz?: () => void;
  #dilCoz?: () => void;

  @query(".kap") private kap?: HTMLDivElement;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#depoCoz = this.depo.dinle(() => this.#modelDegisti());
    this.#secimCoz = this.secim.dinle(() => this.#seciliVurgula());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#depoCoz?.();
    this.#secimCoz?.();
    this.#dilCoz?.();
    this.#view?.destroy();
    this.#view = undefined;
    super.disconnectedCallback();
  }

  override updated(): void {
    // Panel açık ve belge varsa editörü kur; kapanınca yok et.
    const belge = this.depo.belge;
    if (this.acik && belge && this.kap && !this.#view) this.#editorKur();
    else if ((!this.acik || !belge) && this.#view) {
      this.#view.destroy();
      this.#view = undefined;
    }
  }

  #editorKur(): void {
    const belge = this.depo.belge;
    if (!belge || !this.kap) return;
    const { metin, araliklar } = kodMetni(belge.kok);
    this.#araliklar = araliklar;
    this.#view = new EditorView({
      parent: this.kap,
      root: this.renderRoot as ShadowRoot,
      state: EditorState.create({
        doc: metin,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          htmlDili(),
          syntaxHighlighting(defaultHighlightStyle),
          seciliAlan,
          EditorView.lineWrapping,
          this.#tema(),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !this.#programatik && !this.kirli)
              this.kirli = true;
            if (u.focusChanged) this.#odakta = u.view.hasFocus;
          }),
          EditorView.domEventHandlers({
            click: (olay, view) => this.#kodTikla(olay, view),
          }),
        ],
      }),
    });
    this.#seciliVurgula();
  }

  #tema() {
    return EditorView.theme({
      "&": {
        color: "var(--metin)",
        backgroundColor: "var(--zemin)",
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
      },
      ".cm-content": { caretColor: "var(--vurgu, #4a90e2)" },
      ".cm-gutters": {
        backgroundColor: "var(--yuzey)",
        color: "var(--metin-soluk)",
        border: "none",
      },
      // Seçili düğümün gövdesi (grup/tek) — tam satır zemini ayrı renkte.
      ".cm-secili-satir": {
        backgroundColor:
          "color-mix(in srgb, var(--vurgu, #4a90e2) 18%, transparent)",
        boxShadow: "inset 2px 0 0 var(--vurgu, #4a90e2)",
      },
      ".cm-secili-bas": { borderTopLeftRadius: "3px", borderTopRightRadius: "3px" },
      ".cm-secili-son": {
        borderBottomLeftRadius: "3px",
        borderBottomRightRadius: "3px",
      },
      // Metin (caret) seçimi — bloğun zemininden ayırt edilsin diye farklı tonda.
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor:
          "color-mix(in srgb, var(--vurgu, #4a90e2) 34%, transparent)",
      },
    });
  }

  /** Belge içeriği değişti: temizse metni yeniden üret (kirliyse yazılanı koru). */
  #modelDegisti(): void {
    this.#sonScrollImza = "";
    const belge = this.depo.belge;
    if (!this.#view || !belge) {
      this.requestUpdate();
      return;
    }
    if (this.#odakta || this.kirli) return; // düzenlemeyi ezme
    const { metin, araliklar } = kodMetni(belge.kok);
    this.#araliklar = araliklar;
    this.#programatik = true;
    this.#view.dispatch({
      changes: { from: 0, to: this.#view.state.doc.length, insert: metin },
    });
    this.#programatik = false;
    this.#seciliVurgula();
  }

  /** Tuval seçimi → kodda decoration vurgusu + ilk seçiliye kaydır (düzenlerken değil). */
  #seciliVurgula(): void {
    if (!this.#view) return;
    const araliklar = this.secim.secililer
      .map((d) => this.#araliklar.get(d.kimlik))
      .filter((r): r is { from: number; to: number } => !!r);
    this.#view.dispatch({ effects: seciliEtkisi.of(araliklar) });
    if (this.#odakta) return; // düzenlerken caret zıplamasın
    const imza = this.secim.secililer.map((d) => d.kimlik).join(",");
    if (imza === this.#sonScrollImza || !araliklar.length) return;
    this.#sonScrollImza = imza;
    this.#view.dispatch({ effects: EditorView.scrollIntoView(araliklar[0]!.from) });
  }

  /** Koddaki konuma tıklama → konumu kapsayan EN İÇTEKİ düğümü seç (Shift = çoklu). */
  #kodTikla(olay: MouseEvent, view: EditorView): boolean {
    const belge = this.depo.belge;
    if (!belge) return false;
    const pos = view.posAtCoords({ x: olay.clientX, y: olay.clientY });
    if (pos == null) return false;
    const kimlik = konumdakiKimlik(this.#araliklar, pos);
    const dugum = kimlik ? belge.dugumBul(kimlik) : null;
    if (!dugum || dugum === belge.kok) return false; // kök (svg) seçilmez
    if (olay.shiftKey) this.secim.degistir(dugum);
    else this.secim.sec(dugum);
    return false; // CM6 kendi seçim/caret işini sürdürsün
  }

  /** Editör metnini belgeye uygular (geri-alınabilir). */
  private uygula(): void {
    if (!this.#view || !this.kirli) return;
    const belge = this.depo.belge;
    const metin = this.#view.state.doc.toString();
    try {
      if (belge) this.gecmis.calistir(new KodUygulaKomutu(belge, metin));
      else this.depo.yukle(metin);
      this.secim.temizle();
      this.kirli = false;
      this.hata = undefined;
      this.#modelDegisti(); // uygulanan modeli yeniden biçimlendir + aralıkları tazele
    } catch {
      this.hata = t("kod.gecersiz");
    }
  }

  override render() {
    const belge = this.depo.belge;
    return html`
      <div class="baslik" @click=${() => (this.acik = !this.acik)}>
        <span class="ok">${this.acik ? "▾" : "▸"}</span>
        <span class="ad">${t("kod.baslik")}</span>
        ${this.hata ? html`<span class="hata">${this.hata}</span>` : ""}
        ${this.acik && this.kirli
          ? html`<button
              @click=${(e: Event) => {
                e.stopPropagation();
                this.uygula();
              }}
            >
              ${t("kod.uygula")}
            </button>`
          : ""}
      </div>
      ${this.acik && !belge
        ? html`<div class="bos">${t("kod.bosBelge")}</div>`
        : ""}
      <div class="kap ${this.acik && belge ? "" : "gizli"}"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kod-paneli": KodPaneli;
  }
}

panelKayitDefteri.kaydet({
  id: "kod",
  baslik: "SVG Kodu",
  bolge: "alt",
  olustur: ({ depo, secim, gecmis }) => {
    const panel = new KodPaneli();
    panel.depo = depo;
    panel.secim = secim;
    panel.gecmis = gecmis;
    return panel;
  },
});
