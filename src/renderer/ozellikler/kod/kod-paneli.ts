import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import type { BelgeDeposu } from '../../../cekirdek/belge/belge-deposu';
import type { Belge } from '../../../cekirdek/belge/belge';
import type { SecimDeposu } from '../../../cekirdek/secim/secim-deposu';
import type { KomutGecmisi } from '../../../cekirdek/komutlar/komut-gecmisi';
import { KodUygulaKomutu } from '../../../cekirdek/komutlar/kod-uygula-komutu';
import { panelKayitDefteri } from '../../../cekirdek/registry/panel-registry';
import { dilYonetici, t } from '../../diller/dil';
import { kodGorunumu } from './kod-goster';

/**
 * Canlı SVG kod paneli (§11.4) — ÇİFT YÖNLÜ senkron + YERİNDE DÜZENLEME:
 *  - Model, girintili ve vurgulanabilir kod olarak çizilir. Tuvalde seçili düğüm(ler)
 *    burada vurgulanır; koddaki bir elemana tıklayınca o düğüm tuvalde de seçilir.
 *  - Kod alanı `contenteditable`'dır: doğrudan yazılıp "Uygula" ile yeniden içe
 *    aktarılır. "Uygula" GERİ-ALINABİLİR ({@link KodUygulaKomutu}, İlke 2).
 *  - Fare üzerine gelince YALNIZ en-içteki elemanın bloğu vurgulanır (iç içe span'lar
 *    olduğundan CSS `:hover` tüm ağacı vurgulardı → imperatif en-içte vurgu).
 *
 * Tek doğruluk kaynağı yine belge modelidir (İlke 3); panel onun bir görünümüdür.
 * Perf: kod ağacı yalnız belge içeriği değişince yeniden üretilir (memoize); seçim
 * değişiminde sadece `.secili` sınıfı imperatif güncellenir. Düzenleme sırasında
 * (odakta/uygulanmamış değişiklik) ağaç YENİDEN ÜRETİLMEZ → yazılanlar korunur.
 */
@customElement('kod-paneli')
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
    /* Düzenlenebilir, vurgulu kod görünümü. */
    pre.kod {
      margin: 0;
      max-height: 220px;
      overflow: auto;
      box-sizing: border-box;
      border-top: 1px solid var(--kenarlik);
      padding: 0.5rem 0.7rem;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.72rem;
      line-height: 1.45;
      color: var(--metin);
      background: var(--zemin);
      white-space: pre;
      tab-size: 2;
      cursor: text;
      outline: none;
      caret-color: var(--vurgu, #4a90e2);
      /* Global user-select:none'ı geri aç — kodu seçip kopyalamak/düzenlemek için. */
      -webkit-user-select: text;
      user-select: text;
    }
    pre.kod .el {
      border-radius: 2px;
    }
    /* Fare üzerine gelince YALNIZ en-içteki eleman bloğu (imperatif vurgu sınıfı). */
    pre.kod .el.vurgu {
      background: var(--yuzey-hover);
    }
    /* Seçili düğüm bloğu vurgulanır (iç içe seçimlerde katmanlanır → okunur kalsın
       diye yarı saydam). */
    pre.kod .el.secili {
      background: color-mix(in srgb, var(--vurgu, #4a90e2) 22%, transparent);
      box-shadow: inset 2px 0 0 var(--vurgu, #4a90e2);
    }
    pre.kod .yorum {
      color: var(--metin-soluk);
      font-style: italic;
    }
    .bos {
      padding: 0.6rem 0.7rem;
      color: var(--metin-soluk);
      font-size: 0.74rem;
    }
  `;

  depo!: BelgeDeposu;
  secim!: SecimDeposu;
  gecmis!: KomutGecmisi;

  @state() private acik = false;
  /** Uygulanmamış (yazılmış ama "Uygula" denmemiş) düzenleme var mı? */
  @state() private kirli = false;
  @state() private hata?: string;
  /** Son kaydırılan seçim imzası (gereksiz scroll'u önler). */
  #sonScrollImza = '';
  /** Memoize edilmiş kod ağacı + kaynağı (belge içeriği değişince yeniden kurulur). */
  #kodAgaciCache: TemplateResult | typeof nothing = nothing;
  #kodCacheBelge: Belge | null = null;
  #kodKirli = true;
  /** Kod alanı odakta mı (düzenleniyor) — odaktayken ağaç yeniden üretilmez. */
  #odakta = false;
  /** Fareyle vurgulanan (en-içteki) eleman; bir sonrakinde kaldırılır. */
  #vurgulu: HTMLElement | null = null;
  #depoCoz?: () => void;
  #secimCoz?: () => void;
  #dilCoz?: () => void;

  @query('pre.kod') private kodEl?: HTMLPreElement;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#depoCoz = this.depo.dinle(() => this.#modelDegisti());
    // Seçim değişimi: ağacı yeniden ÜRETME, yalnız vurguyu imperatif güncelle (perf).
    this.#secimCoz = this.secim.dinle(() => this.#vurguGuncelle());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#depoCoz?.();
    this.#secimCoz?.();
    this.#dilCoz?.();
    super.disconnectedCallback();
  }

  /** Belge içeriği değişti: kod ağacı önbelleğini geçersiz kıl + yeniden çiz. */
  #modelDegisti(): void {
    this.#kodKirli = true;
    this.#sonScrollImza = ''; // düğümler yeni konuma kaymış olabilir → yeniden kaydır
    this.requestUpdate();
  }

  override updated(): void {
    this.#vurguGuncelle();
  }

  /** `.secili` sınıflarını imperatif günceller + ilk seçiliye kaydırır (düzenlemeyi bozmaz). */
  #vurguGuncelle(): void {
    if (!this.acik || !this.kodEl) return;
    const secili = new Set(this.secim.secililer.map((d) => d.kimlik));
    for (const el of this.kodEl.querySelectorAll<HTMLElement>('.el')) {
      const k = el.getAttribute('data-kimlik');
      el.classList.toggle('secili', !!k && secili.has(k));
    }
    this.#seciliyeKaydir();
  }

  /** Seçim değişince ilk seçili elemanı görünüre kaydır (düzenlerken DEĞİL — caret zıplamasın). */
  #seciliyeKaydir(): void {
    if (!this.kodEl || this.#odakta) return;
    const imza = this.secim.secililer.map((d) => d.kimlik).join(',');
    if (imza === this.#sonScrollImza) return;
    this.#sonScrollImza = imza;
    if (!imza) return;
    const ilk = this.kodEl.querySelector<HTMLElement>('.el.secili');
    ilk?.scrollIntoView({ block: 'nearest' });
  }

  /** Fare üzerine gelince yalnız EN-İÇTEKİ elemanı vurgula (iç içe span sorunu). */
  readonly #hover = (olay: PointerEvent): void => {
    const hedef =
      olay.target instanceof Element ? (olay.target.closest('.el') as HTMLElement | null) : null;
    if (hedef === this.#vurgulu) return;
    this.#vurgulu?.classList.remove('vurgu');
    this.#vurgulu = hedef;
    hedef?.classList.add('vurgu');
  };
  readonly #hoverCik = (): void => {
    this.#vurgulu?.classList.remove('vurgu');
    this.#vurgulu = null;
  };

  /**
   * Enter'ı DETERMİNİSTİK kıl: `contenteditable` (plaintext-only olsa da) Enter'da
   * bazen `<br>`/`<div>` enjekte eder; `pre.textContent` bunları satır-sonu olarak
   * GÖRMEZ → uygulanan SVG'de satırlar birleşir. Her zaman ham `\n` ekleyerek bunu
   * by-pass et (kritik: çok satırlı düzenleme bozulmasın).
   */
  readonly #girisOnce = (olay: InputEvent): void => {
    if (olay.inputType === 'insertParagraph' || olay.inputType === 'insertLineBreak') {
      olay.preventDefault();
      document.execCommand('insertText', false, '\n');
    }
  };

  /** Koddaki bir elemana tıklama → o düğümü seç (Shift = çoklu seçime ekle/çıkar). */
  #kodTikla(olay: MouseEvent): void {
    const belge = this.depo.belge;
    const hedef = olay.target;
    if (!belge || !(hedef instanceof Element)) return;
    const span = hedef.closest('[data-kimlik]');
    const kimlik = span?.getAttribute('data-kimlik');
    if (!kimlik) return;
    const dugum = belge.dugumBul(kimlik);
    if (!dugum || dugum === belge.kok) return; // kök (svg) seçilmez
    if (olay.shiftKey) this.secim.degistir(dugum);
    else this.secim.sec(dugum);
  }

  /** Kod alanındaki ham metni belgeye uygular (geri-alınabilir). */
  private uygula(): void {
    if (!this.kodEl || !this.kirli) return;
    const belge = this.depo.belge;
    const metin = this.kodEl.textContent ?? '';
    try {
      if (belge) {
        this.gecmis.calistir(new KodUygulaKomutu(belge, metin)); // aynı belge örneğinde yerinde
      } else {
        this.depo.yukle(metin); // henüz belge yok → yeni belge
      }
      this.secim.temizle();
      this.kirli = false;
      this.hata = undefined;
    } catch {
      this.hata = t('kod.gecersiz');
    }
  }

  /** Memoize edilmiş kod ağacı; düzenleme sırasında YENİDEN ÜRETİLMEZ (yazılanlar korunur). */
  #kodAgaci(belge: Belge | null): TemplateResult | typeof nothing {
    const duzenleniyor = this.#odakta || this.kirli;
    if (!duzenleniyor && (this.#kodKirli || this.#kodCacheBelge !== belge)) {
      this.#kodAgaciCache = belge ? kodGorunumu(belge.kok) : nothing;
      this.#kodCacheBelge = belge;
      this.#kodKirli = false;
      this.#vurgulu = null; // eski ağaçtaki hover referansı koptu
    }
    return this.#kodAgaciCache;
  }

  override render() {
    const belge = this.depo.belge;
    return html`
      <div class="baslik" @click=${() => (this.acik = !this.acik)}>
        <span class="ok">${this.acik ? '▾' : '▸'}</span>
        <span class="ad">${t('kod.baslik')}</span>
        ${this.hata ? html`<span class="hata">${this.hata}</span>` : ''}
        ${this.acik && this.kirli
          ? html`<button
              @click=${(e: Event) => {
                e.stopPropagation();
                this.uygula();
              }}
            >
              ${t('kod.uygula')}
            </button>`
          : ''}
      </div>
      ${this.acik ? this.#govde(belge) : ''}
    `;
  }

  #govde(belge: Belge | null) {
    if (!belge) return html`<div class="bos">${t('kod.bosBelge')}</div>`;
    return html`<pre
      class="kod"
      contenteditable="plaintext-only"
      spellcheck="false"
      @click=${(e: MouseEvent) => this.#kodTikla(e)}
      @pointermove=${this.#hover}
      @pointerleave=${this.#hoverCik}
      @beforeinput=${this.#girisOnce}
      @input=${() => {
        if (!this.kirli) this.kirli = true;
      }}
      @focusin=${() => {
        this.#odakta = true;
      }}
      @focusout=${() => {
        this.#odakta = false;
      }}
    >${this.#kodAgaci(belge)}</pre>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'kod-paneli': KodPaneli;
  }
}

panelKayitDefteri.kaydet({
  id: 'kod',
  baslik: 'SVG Kodu',
  bolge: 'alt',
  olustur: ({ depo, secim, gecmis }) => {
    const panel = new KodPaneli();
    panel.depo = depo;
    panel.secim = secim;
    panel.gecmis = gecmis;
    return panel;
  },
});
