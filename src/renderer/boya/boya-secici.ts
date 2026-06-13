import { LitElement, html, css } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { ayristir, hex, metin, rgbToHsv, hsvToRgb, type HSVA } from "./renk";
import type { BoyaDegeri, GradyanDurak } from "./boya-degeri";
import { sonRenkler } from "./son-renkler";
import { t } from "../diller/dil";

type Mod = "yok" | "duz" | "dogrusal" | "radyal";

/** Bir boya değerinin CSS önizleme arka planı. */
export function boyaOnizleme(b: BoyaDegeri): string {
  if (b.tip === "yok") return "transparent";
  if (b.tip === "duz") return b.renk;
  const duraklar = [...b.duraklar]
    .sort((x, y) => x.offset - y.offset)
    .map((d) => `${d.renk} ${Math.round(d.offset * 100)}%`)
    .join(", ");
  return b.gradyanTuru === "radyal"
    ? `radial-gradient(circle, ${duraklar})`
    : `linear-gradient(${90 - b.aci}deg, ${duraklar})`;
}

/**
 * Gelişmiş boya seçici (TK-6): Yok / Düz renk / Doğrusal / Radyal gradyan.
 * Düz renk ve her gradyan durağı için doygunluk-parlaklık karesi + ton + alfa +
 * hex. Değişince `degisti` olayı yayar (detail: {@link BoyaDegeri}).
 */
@customElement("boya-secici")
export class BoyaSecici extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
    }
    .dama {
      background-image:
        linear-gradient(45deg, #bbb 25%, transparent 25%),
        linear-gradient(-45deg, #bbb 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #bbb 75%),
        linear-gradient(-45deg, transparent 75%, #bbb 75%);
      background-size: 10px 10px;
      background-position:
        0 0,
        0 5px,
        5px -5px,
        -5px 0;
    }
    .swatch {
      position: relative;
      width: 28px;
      height: 26px;
      padding: 0;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      cursor: pointer;
      overflow: hidden;
    }
    .swatch .renk {
      position: absolute;
      inset: 0;
      border-radius: 4px;
    }
    .pop {
      position: fixed;
      z-index: 50;
      width: 232px;
      padding: 10px;
      background: var(--yuzey);
      border: 1px solid var(--kenarlik);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      -webkit-app-region: no-drag;
      display: grid;
      gap: 8px;
      color: var(--metin);
      font-size: 0.8rem;
    }
    .modlar {
      display: flex;
      gap: 4px;
    }
    .modlar button {
      flex: 1;
      font: inherit;
      font-size: 0.72rem;
      padding: 0.25rem 0;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      color: var(--metin);
      cursor: pointer;
    }
    .modlar button.etkin {
      background: var(--vurgu);
      color: var(--vurgu-metin);
      border-color: transparent;
    }
    .sv {
      position: relative;
      width: 100%;
      height: 120px;
      border-radius: 6px;
      cursor: crosshair;
      touch-action: none;
    }
    .sv-imlec {
      position: absolute;
      width: 12px;
      height: 12px;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    input[type="range"] {
      width: 100%;
      margin: 0;
      -webkit-appearance: none;
      height: 12px;
      border-radius: 6px;
      cursor: pointer;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      border: 1px solid rgba(0, 0, 0, 0.4);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
    .ton {
      background: linear-gradient(
        to right,
        #f00,
        #ff0 17%,
        #0f0 33%,
        #0ff 50%,
        #00f 67%,
        #f0f 83%,
        #f00
      );
    }
    .satir {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .satir > label {
      color: var(--metin-soluk);
      font-size: 0.72rem;
      white-space: nowrap;
    }
    .onizleme {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      border: 1px solid var(--kenarlik);
      flex: 0 0 auto;
    }
    input.hex {
      flex: 1;
      min-width: 0;
      font: inherit;
      font-size: 0.76rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.2rem 0.4rem;
    }
    .duraklar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .durak {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 2px solid transparent;
      cursor: pointer;
    }
    .durak.secili {
      border-color: var(--vurgu, #4a90e2);
    }
    .kucuk {
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      color: var(--metin);
      cursor: pointer;
    }
    .gradyan-bar {
      height: 14px;
      border-radius: 6px;
      border: 1px solid var(--kenarlik);
    }
    .son-renkler {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      border-top: 1px solid var(--kenarlik);
      padding-top: 8px;
    }
    .son-renkler .mini {
      width: 18px;
      height: 18px;
      padding: 0;
      border: 1px solid var(--kenarlik);
      border-radius: 4px;
      cursor: pointer;
      overflow: hidden;
    }
    .son-renkler .mini span {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 3px;
    }
  `;

  /** Gelen boya değeri. */
  @property({ attribute: false }) deger: BoyaDegeri = {
    tip: "duz",
    renk: "#000000",
  };

  @state() private acik = false;
  @state() private popX = 0;
  @state() private popY = 0;

  // Düzenleme durumu
  @state() private mod: Mod = "duz";
  @state() private hsva: HSVA = { h: 0, s: 0, v: 0, a: 1 };
  @state() private duraklar: GradyanDurak[] = [];
  @state() private aci = 90;
  @state() private seciliDurak = 0;

  @query(".swatch") private swatch!: HTMLElement;

  #disKapat = (olay: Event): void => {
    const yol = olay.composedPath();
    if (
      !yol.some(
        (d) =>
          d instanceof HTMLElement &&
          (d.classList?.contains("pop") || d.classList?.contains("swatch")),
      )
    ) {
      this.kapat();
    }
  };
  #klavye = (olay: KeyboardEvent): void => {
    if (olay.key === "Escape") this.kapat();
  };
  #sonRenklerCoz?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    // Son renkler değişince açık popover'ı tazele (TK-37 #8).
    this.#sonRenklerCoz = sonRenkler.dinle(() => this.requestUpdate());
  }

  override disconnectedCallback(): void {
    this.#kapatDinleyici();
    this.#sonRenklerCoz?.();
    super.disconnectedCallback();
  }

  private ac(): void {
    const b = this.deger;
    this.duraklar = [
      { offset: 0, renk: "rgb(0, 0, 0)" },
      { offset: 1, renk: "rgb(255, 255, 255)" },
    ];
    this.aci = 90;
    this.seciliDurak = 0;
    if (b.tip === "yok") {
      this.mod = "yok";
      this.hsva = { h: 0, s: 1, v: 1, a: 1 };
    } else if (b.tip === "duz") {
      this.mod = "duz";
      this.hsva = rgbToHsv(ayristir(b.renk) ?? { r: 0, g: 0, b: 0, a: 1 });
    } else {
      this.mod = b.gradyanTuru === "radyal" ? "radyal" : "dogrusal";
      this.duraklar = b.duraklar.map((d) => ({ ...d }));
      this.aci = b.aci;
      this.hsva = rgbToHsv(
        ayristir(this.duraklar[0]!.renk) ?? { r: 0, g: 0, b: 0, a: 1 },
      );
    }

    const r = this.swatch.getBoundingClientRect();
    this.popX = Math.min(r.left, window.innerWidth - 248);
    this.popY = Math.min(r.bottom + 6, window.innerHeight - 320);
    this.acik = true;
    window.addEventListener("pointerdown", this.#disKapat, true);
    window.addEventListener("keydown", this.#klavye, true);
  }

  private kapat(): void {
    if (!this.acik) return;
    this.#sonRenkleriKaydet();
    this.acik = false;
    this.#kapatDinleyici();
  }

  /** Kapanışta kullanılan düz renk(ler)i son renklere işler (TK-37 #8). */
  #sonRenkleriKaydet(): void {
    if (this.mod === "duz") {
      sonRenkler.ekle(metin(hsvToRgb(this.hsva)));
    } else if (this.mod === "dogrusal" || this.mod === "radyal") {
      for (const d of this.duraklar) sonRenkler.ekle(d.renk);
    }
  }

  /** Bir son-rengi etkin renge (düz ya da seçili durak) uygular. */
  private sonRenkSec(renk: string): void {
    const c = ayristir(renk);
    if (c) this.renkGuncelle(rgbToHsv(c));
  }
  #kapatDinleyici(): void {
    window.removeEventListener("pointerdown", this.#disKapat, true);
    window.removeEventListener("keydown", this.#klavye, true);
  }

  #deger(): BoyaDegeri {
    if (this.mod === "yok") return { tip: "yok" };
    if (this.mod === "duz")
      return { tip: "duz", renk: metin(hsvToRgb(this.hsva)) };
    return {
      tip: "gradyan",
      gradyanTuru: this.mod === "radyal" ? "radyal" : "dogrusal",
      aci: this.aci,
      duraklar: this.duraklar.map((d) => ({ ...d })),
    };
  }
  #yay(): void {
    this.dispatchEvent(
      new CustomEvent<BoyaDegeri>("degisti", {
        detail: this.#deger(),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private modSec(mod: Mod): void {
    this.mod = mod;
    if ((mod === "dogrusal" || mod === "radyal") && this.duraklar.length < 2) {
      this.duraklar = [
        { offset: 0, renk: metin(hsvToRgb(this.hsva)) },
        { offset: 1, renk: "rgba(0, 0, 0, 0)" },
      ];
      this.seciliDurak = 0;
    }
    this.#yay();
  }

  /** Etkin rengi (düz renk ya da seçili durak) günceller. */
  private renkGuncelle(yeni: Partial<HSVA>): void {
    this.hsva = { ...this.hsva, ...yeni };
    if (this.mod === "dogrusal" || this.mod === "radyal") {
      const yeniDuraklar = [...this.duraklar];
      yeniDuraklar[this.seciliDurak] = {
        ...yeniDuraklar[this.seciliDurak]!,
        renk: metin(hsvToRgb(this.hsva)),
      };
      this.duraklar = yeniDuraklar;
    }
    this.#yay();
  }

  private svBas(olay: PointerEvent): void {
    (olay.currentTarget as HTMLElement).setPointerCapture(olay.pointerId);
    this.svGuncelle(olay);
  }
  private svHareket(olay: PointerEvent): void {
    if (olay.buttons === 0) return;
    this.svGuncelle(olay);
  }
  private svGuncelle(olay: PointerEvent): void {
    const r = (olay.currentTarget as HTMLElement).getBoundingClientRect();
    const s = Math.min(1, Math.max(0, (olay.clientX - r.left) / r.width));
    const v = Math.min(1, Math.max(0, 1 - (olay.clientY - r.top) / r.height));
    this.renkGuncelle({ s, v });
  }
  private hexDegis(olay: Event): void {
    const c = ayristir((olay.target as HTMLInputElement).value);
    if (c) this.renkGuncelle(rgbToHsv(c));
  }

  private durakSec(i: number): void {
    this.seciliDurak = i;
    this.hsva = rgbToHsv(
      ayristir(this.duraklar[i]!.renk) ?? { r: 0, g: 0, b: 0, a: 1 },
    );
  }
  private durakEkle(): void {
    const renk = metin(hsvToRgb(this.hsva));
    // Yeni durağı REFERANS eşitliğiyle seç: değer eşitliği (renk+offset), aynı
    // değere sahip başka bir durak varsa onu seçerdi (ilk eşleşme). Spread+sort
    // eleman referansını koruduğundan indexOf doğru nesneyi bulur.
    const yeni = { offset: 0.5, renk };
    this.duraklar = [...this.duraklar, yeni].sort(
      (a, b) => a.offset - b.offset,
    );
    this.seciliDurak = this.duraklar.indexOf(yeni);
    this.#yay();
  }
  private durakSil(): void {
    if (this.duraklar.length <= 2) return;
    this.duraklar = this.duraklar.filter((_, i) => i !== this.seciliDurak);
    this.seciliDurak = Math.max(0, this.seciliDurak - 1);
    this.durakSec(this.seciliDurak);
    this.#yay();
  }
  private offsetGuncelle(deger: number): void {
    const y = [...this.duraklar];
    y[this.seciliDurak] = { ...y[this.seciliDurak]!, offset: deger };
    this.duraklar = y;
    this.#yay();
  }

  override render() {
    return html`
      <button
        class="swatch dama"
        title=${t("boya.sec")}
        @click=${() => (this.acik ? this.kapat() : this.ac())}
      >
        <span
          class="renk"
          style="background:${boyaOnizleme(this.deger)}"
        ></span>
      </button>
      ${this.acik ? this.#popover() : ""}
    `;
  }

  #popover() {
    const gradyanMi = this.mod === "dogrusal" || this.mod === "radyal";
    const rgb = hsvToRgb(this.hsva);
    const tonRenk = `hsl(${this.hsva.h}, 100%, 50%)`;

    return html`
      <div class="pop" style="left:${this.popX}px; top:${this.popY}px">
        <div class="modlar">
          ${(["yok", "duz", "dogrusal", "radyal"] as Mod[]).map(
            (m) => html`
              <button
                class=${this.mod === m ? "etkin" : ""}
                @click=${() => this.modSec(m)}
              >
                ${t(`boya.mod.${m}`)}
              </button>
            `,
          )}
        </div>

        ${this.mod === "yok"
          ? html`<div style="color:var(--metin-soluk); padding:0.3rem 0;">
              ${t("boya.yokAciklama")}
            </div>`
          : html`
              ${gradyanMi ? this.#gradyanAlani() : ""}
              ${this.#renkSecici(rgb, tonRenk)} ${this.#sonRenklerSatiri()}
            `}
      </div>
    `;
  }

  #gradyanAlani() {
    const onizleme = boyaOnizleme(this.#deger());
    return html`
      <div class="gradyan-bar" style="background:${onizleme}"></div>
      <div class="duraklar">
        ${this.duraklar.map(
          (d, i) => html`
            <span
              class="durak dama ${i === this.seciliDurak ? "secili" : ""}"
              style="background:${d.renk}"
              @click=${() => this.durakSec(i)}
            ></span>
          `,
        )}
        <button class="kucuk" @click=${this.durakEkle}>
          + ${t("boya.durak")}
        </button>
        ${this.duraklar.length > 2
          ? html`<button class="kucuk" @click=${this.durakSil}>−</button>`
          : ""}
      </div>
      <div class="satir">
        <label>${t("boya.konum")}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          .value=${String(this.duraklar[this.seciliDurak]?.offset ?? 0)}
          @input=${(e: Event) =>
            this.offsetGuncelle(Number((e.target as HTMLInputElement).value))}
        />
      </div>
      ${this.mod === "dogrusal"
        ? html`
            <div class="satir">
              <label>${t("boya.aci")}</label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                .value=${String(this.aci)}
                @input=${(e: Event) => {
                  this.aci = Number((e.target as HTMLInputElement).value);
                  this.#yay();
                }}
              />
            </div>
          `
        : ""}
    `;
  }

  /** Son kullanılan renkler satırı (TK-37 #8); boşsa gizli. */
  #sonRenklerSatiri() {
    const renkler = sonRenkler.renkler;
    if (renkler.length === 0) return "";
    return html`
      <div class="son-renkler">
        ${renkler.map(
          (r) => html`
            <button
              class="mini dama"
              title=${r}
              @click=${() => this.sonRenkSec(r)}
            >
              <span style="background:${r}"></span>
            </button>
          `,
        )}
      </div>
    `;
  }

  #renkSecici(rgb: ReturnType<typeof hsvToRgb>, tonRenk: string) {
    return html`
      <div
        class="sv"
        style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${tonRenk};"
        @pointerdown=${this.svBas}
        @pointermove=${this.svHareket}
      >
        <div
          class="sv-imlec"
          style="left:${this.hsva.s * 100}%; top:${(1 - this.hsva.v) *
          100}%; background:${metin({ ...rgb, a: 1 })}"
        ></div>
      </div>
      <input
        class="ton"
        type="range"
        min="0"
        max="360"
        step="1"
        .value=${String(this.hsva.h)}
        @input=${(e: Event) =>
          this.renkGuncelle({
            h: Number((e.target as HTMLInputElement).value),
          })}
      />
      <div class="dama" style="border-radius:6px;">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          style="background: linear-gradient(to right, transparent, ${metin({
            ...rgb,
            a: 1,
          })});"
          .value=${String(this.hsva.a)}
          @input=${(e: Event) =>
            this.renkGuncelle({
              a: Number((e.target as HTMLInputElement).value),
            })}
        />
      </div>
      <div class="satir">
        <span class="onizleme dama"
          ><span
            style="display:block;width:100%;height:100%;border-radius:4px;background:${metin(
              rgb,
            )}"
          ></span
        ></span>
        <input
          class="hex"
          type="text"
          .value=${hex(rgb)}
          @change=${this.hexDegis}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "boya-secici": BoyaSecici;
  }
}
