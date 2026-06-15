import { LitElement, html, css, svg } from "lit";
import { customElement } from "lit/decorators.js";
import type { BelgeDeposu } from "../../../cekirdek/belge/belge-deposu";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import { panelKayitDefteri } from "../../../cekirdek/registry/panel-registry";
import { dilYonetici, t } from "../../diller/dil";
import { stilYazimModu } from "../../boya/stil-yazim-modu";
import {
  metinDenetimleri,
  METIN_ETIKETLERI,
} from "./metin-denetimleri";

/**
 * Metin paneli (sağ bölge) — seçili `text`/`tspan`/`textPath` için Illustrator
 * düzeyinde KARAKTER + PARAGRAF denetimleri. AYRI bir gruptur (Özellik Denetçisi'nin
 * içinde DEĞİL, kullanıcı isteği); metin seçilince kabuk bu paneli otomatik öne
 * getirir. Registry'ye kaydolur (İlke 5); her değişiklik Command'dır (İlke 2 → undo).
 */
@customElement("metin-paneli")
export class MetinPaneli extends LitElement {
  static override styles = css`
    :host {
      display: block;
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      font-family: system-ui, sans-serif;
      color: var(--metin);
    }
    .baslik {
      padding: 0.55rem 0.75rem;
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--metin-soluk);
      border-bottom: 1px solid var(--kenarlik);
    }
    .bos {
      padding: 0.75rem;
      font-size: 0.8rem;
      color: var(--metin-soluk);
    }
    .alt-baslik {
      padding: 0.5rem 0.75rem 0.15rem;
      font-size: 0.66rem;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--metin-soluk);
    }
    input,
    select {
      -webkit-user-select: text;
      user-select: text;
    }
    /* Metin denetimleri düzeni */
    .metin-bolum {
      display: grid;
      gap: 0.35rem;
      padding: 0.1rem 0.75rem 0.5rem;
    }
    .metin-satir {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .metin-satir.iki {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .metin-satir.arasi {
      justify-content: space-between;
    }
    .metin-eti {
      font-size: 0.72rem;
      color: var(--metin-soluk);
      white-space: nowrap;
    }
    .font-giris,
    .agirlik-sec {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      font: inherit;
      font-size: 0.8rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.24rem 0.4rem;
    }
    .agirlik-sec {
      flex: 1;
      cursor: pointer;
    }
    .font-giris:hover,
    .agirlik-sec:hover {
      border-color: var(--metin-soluk);
    }
    .font-giris:focus,
    .agirlik-sec:focus {
      border-color: var(--vurgu, #4a90e2);
      outline: none;
    }
    .ikon-alan {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      min-width: 0;
      padding: 0 0.35rem;
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
    }
    .ikon-alan:focus-within {
      border-color: var(--vurgu, #4a90e2);
    }
    .ikon-alan .ikon {
      display: grid;
      place-items: center;
      color: var(--metin-soluk);
      flex: 0 0 auto;
    }
    .ikon-alan input {
      width: 100%;
      min-width: 0;
      border: 0;
      background: transparent;
      padding: 0.22rem 0;
      font: inherit;
      font-size: 0.8rem;
      color: var(--metin);
      outline: none;
    }
    .taban-grup {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      min-width: 0;
    }
    .taban-grup .ikon-alan {
      flex: 1;
    }
    .seg {
      display: inline-flex;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      overflow: hidden;
    }
    .seg button {
      display: grid;
      place-items: center;
      min-width: 28px;
      height: 24px;
      padding: 0 0.35rem;
      font: inherit;
      font-size: 0.78rem;
      border: 0;
      border-right: 1px solid var(--kenarlik);
      background: var(--yuzey-2);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .seg button:last-child {
      border-right: 0;
    }
    .seg button:hover:not(.sec) {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    .seg button.sec {
      background: var(--vurgu);
      color: var(--vurgu-metin);
    }
    .seg button svg {
      display: block;
    }
    .tgl-grup {
      display: inline-flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .tgl {
      display: grid;
      place-items: center;
      min-width: 26px;
      height: 24px;
      padding: 0 0.3rem;
      font: inherit;
      font-size: 0.82rem;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .tgl:hover:not(.sec) {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    .tgl.sec {
      background: var(--vurgu);
      color: var(--vurgu-metin);
      border-color: transparent;
    }
  `;

  depo!: BelgeDeposu;
  secim!: SecimDeposu;
  gecmis!: KomutGecmisi;

  #depoCoz?: () => void;
  #secimCoz?: () => void;
  #dilCoz?: () => void;
  #modCoz?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#secimCoz = this.secim.dinle(() => this.requestUpdate());
    this.#depoCoz = this.depo.dinle(() => this.requestUpdate());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
    this.#modCoz = stilYazimModu.dinle(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#secimCoz?.();
    this.#depoCoz?.();
    this.#dilCoz?.();
    this.#modCoz?.();
    super.disconnectedCallback();
  }

  override render() {
    const dugum = this.secim.secili;
    const belge = this.depo.belge;
    const metinMi = !!dugum && METIN_ETIKETLERI.has(dugum.etiket);
    return html`
      <div class="baslik">${t("denetci.grup.metin")}</div>
      ${metinMi && belge
        ? metinDenetimleri({
            dugum: dugum!,
            belge,
            komut: (k) => this.gecmis.calistir(k),
          })
        : html`<div class="bos">${t("metin.bosSecim")}</div>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "metin-paneli": MetinPaneli;
  }
}

// Registry'ye kaydol (İlke 5). Sağ ray — "T" simgesi.
panelKayitDefteri.kaydet({
  id: "metin",
  baslik: "Metin",
  bolge: "sag",
  ikon: svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 4.5h11M9 4.5V14" /></svg>`,
  olustur: ({ depo, secim, gecmis }) => {
    const panel = new MetinPaneli();
    panel.depo = depo;
    panel.secim = secim;
    panel.gecmis = gecmis;
    return panel;
  },
});
