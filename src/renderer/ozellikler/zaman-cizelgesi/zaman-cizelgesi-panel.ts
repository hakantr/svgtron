import { LitElement, html, css, svg } from "lit";
import { customElement } from "lit/decorators.js";
import type { OynatmaDeposu } from "../../../cekirdek/animasyon/oynatma-deposu";
import type { Playback } from "../../../cekirdek/animasyon/playback";
import { panelKayitDefteri } from "../../../cekirdek/registry/panel-registry";
import { dilYonetici, t } from "../../diller/dil";

/**
 * Zaman çizelgesi paneli (MVP §5.3).
 *
 * Yalnızca {@link Playback} arayüzüyle konuşur (İlke 6); arkasında SMIL/WAAPI
 * olduğunu bilmez. Oynat/duraklat/başa-sar düğmeleri + konum kaydırıcısı sunar.
 * Etkin oynatma ya da onun durumu değişince yeniden çizilir (İlke 3).
 */
@customElement("zaman-cizelgesi-panel")
export class ZamanCizelgesiPanel extends LitElement {
  static override styles = css`
    :host {
      display: block;
      background: var(--yuzey);
      border-top: 1px solid var(--kenarlik);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.9rem;
    }
    button {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: 1px solid var(--kenarlik);
      border-radius: 6px;
      background: var(--yuzey-2);
      color: var(--metin);
      cursor: pointer;
      transition: background 0.12s ease;
    }
    button:hover:not(:disabled) {
      background: var(--yuzey-hover);
    }
    button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    button svg {
      width: 12px;
      height: 12px;
      fill: currentColor;
    }
    input[type="range"] {
      flex: 1;
      min-width: 0;
      accent-color: var(--vurgu, #4a90e2);
    }
    input[type="range"]:disabled {
      opacity: 0.4;
    }
    .sure {
      font-variant-numeric: tabular-nums;
      font-size: 0.76rem;
      color: var(--metin-soluk);
      white-space: nowrap;
    }
    .bos {
      font-size: 0.76rem;
      color: var(--metin-soluk);
    }
  `;

  /** Oynatma deposu (panel oluşturulurken atanır). */
  oynatma!: OynatmaDeposu;

  #oynatmaCoz?: () => void;
  #pbCoz?: () => void;
  #dilCoz?: () => void;
  #pb: Playback | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#oynatmaCoz = this.oynatma.dinle(() => this.aktifDegisti());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
    this.aktifDegisti();
  }

  override disconnectedCallback(): void {
    this.#oynatmaCoz?.();
    this.#pbCoz?.();
    this.#dilCoz?.();
    super.disconnectedCallback();
  }

  /** Etkin Playback değişince ona (yeniden) abone ol. */
  private aktifDegisti(): void {
    this.#pbCoz?.();
    this.#pb = this.oynatma.aktif;
    this.#pbCoz = this.#pb?.dinle(() => this.requestUpdate());
    this.requestUpdate();
  }

  private bicimle(saniye: number): string {
    return `${saniye.toFixed(1)}s`;
  }

  override render() {
    const pb = this.#pb;
    const oynatilabilir = !!pb && pb.sure > 0;
    // Sonsuz animasyonda konum süreyi aşıp döner → modulo ile [0,sure) sar.
    // Sonlu animasyonda sonda kenetle (modulo sonu 0'a düşürürdü, kaydırıcı başa
    // sıçrardı); float taşması için Math.min güvenli.
    const konum = !oynatilabilir
      ? 0
      : pb.sonsuz
        ? pb.konum % pb.sure
        : Math.min(pb.konum, pb.sure);
    const oynuyor = !!pb && pb.oynuyor;

    return html`
      <div class="bar">
        <button
          title=${oynuyor ? t("zaman.durakla") : t("zaman.oynat")}
          ?disabled=${!oynatilabilir}
          @click=${() => (oynuyor ? pb!.durakla() : pb!.oynat())}
        >
          ${oynuyor
            ? svg`<svg viewBox="0 0 12 12"><rect x="2" y="1.5" width="3" height="9"/><rect x="7" y="1.5" width="3" height="9"/></svg>`
            : svg`<svg viewBox="0 0 12 12"><path d="M2.5 1.5 L10 6 L2.5 10.5 Z"/></svg>`}
        </button>

        <button
          title=${t("zaman.basaSar")}
          ?disabled=${!oynatilabilir}
          @click=${() => pb!.basaSar()}
        >
          ${svg`<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="2" height="9"/><path d="M11 1.5 L4.5 6 L11 10.5 Z"/></svg>`}
        </button>

        <input
          type="range"
          min="0"
          max=${oynatilabilir ? pb.sure : 0}
          step="0.01"
          .value=${String(konum)}
          ?disabled=${!oynatilabilir}
          @input=${(e: Event) =>
            pb?.konumaGit(Number((e.target as HTMLInputElement).value))}
        />

        ${oynatilabilir
          ? html`<span class="sure"
              >${this.bicimle(konum)} / ${this.bicimle(pb.sure)}</span
            >`
          : html`<span class="bos">${t("zaman.animasyonYok")}</span>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zaman-cizelgesi-panel": ZamanCizelgesiPanel;
  }
}

// Registry'ye kaydol (İlke 5) — alt bölgede.
panelKayitDefteri.kaydet({
  id: "zaman-cizelgesi",
  baslik: "Zaman Çizelgesi",
  bolge: "alt",
  olustur: ({ oynatma }) => {
    const panel = new ZamanCizelgesiPanel();
    panel.oynatma = oynatma;
    return panel;
  },
});
