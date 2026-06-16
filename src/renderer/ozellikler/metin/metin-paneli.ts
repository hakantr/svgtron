import { LitElement, html, css, svg } from "lit";
import { customElement } from "lit/decorators.js";
import type { BelgeDeposu } from "../../../cekirdek/belge/belge-deposu";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import { panelKayitDefteri } from "../../../cekirdek/registry/panel-registry";
import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { bildirimServisi } from "../../kabuk/bildirim-servisi";
import { dilYonetici, t } from "../../diller/dil";
import { stilYazimModu } from "../../boya/stil-yazim-modu";
import {
  metinDenetimleri,
  METIN_ETIKETLERI,
} from "./metin-denetimleri";

const IK_YOLA_BAGLA = svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 12.6c3.2-5.8 8.2-6.2 11.6-2.2"/><path d="M4.5 4.6h7M8 4.6v8.3"/></svg>`;
const IK_YOLDAN_COZ = svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 12.8c3.2-5.8 8.2-6.2 11.6-2.2" stroke-dasharray="2 2"/><path d="M4.5 4.6h7M8 4.6v6.6"/><path d="M12.2 4.2 14.8 6.8M14.8 4.2 12.2 6.8"/></svg>`;

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
      scrollbar-gutter: stable;
      font-family: system-ui, sans-serif;
      color: var(--metin);
      background: var(--yuzey);
    }
    .panel-kafa {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem 0.55rem;
      border-bottom: 1px solid var(--kenarlik);
      background: var(--yuzey);
    }
    .panel-etiket {
      font-size: 0.62rem;
      font-weight: 650;
      line-height: 1.1;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--metin-soluk);
    }
    .panel-baslik {
      margin-top: 0.12rem;
      font-size: 0.92rem;
      font-weight: 650;
      line-height: 1.15;
      color: var(--metin);
    }
    .panel-kimlik {
      max-width: 42%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 0 1 auto;
      padding: 0.17rem 0.4rem;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      color: var(--metin-soluk);
      font-family: ui-monospace, monospace;
      font-size: 0.72rem;
    }
    .panel-govde {
      padding-bottom: 0.6rem;
    }
    .bos {
      padding: 0.75rem;
      font-size: 0.8rem;
      color: var(--metin-soluk);
    }
    .eylem-seridi {
      display: flex;
      gap: 0.35rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--kenarlik);
      background: var(--yuzey-2);
    }
    .eylem-dugme {
      display: inline-grid;
      place-items: center;
      width: 30px;
      height: 26px;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .eylem-dugme:hover {
      border-color: var(--vurgu, #4a90e2);
      color: var(--metin);
    }
    .eylem-dugme svg {
      display: block;
    }
    .alt-baslik {
      padding: 0.5rem 0.75rem 0.15rem;
      font-size: 0.66rem;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--metin-soluk);
      border-top: 1px solid var(--kenarlik);
    }
    .alt-baslik:first-child {
      border-top: 0;
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
      padding: 0.35rem 0.75rem 0.65rem;
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
      <header class="panel-kafa">
        <div>
          <div class="panel-etiket">${t("denetci.metin.karakter")}</div>
          <div class="panel-baslik">${t("denetci.grup.metin")}</div>
        </div>
        <code class="panel-kimlik">${this.#kimlikMetni(dugum)}</code>
      </header>
      ${metinMi && belge ? this.#metinEylemleri() : ""}
      <div class="panel-govde">
        ${metinMi && belge
          ? metinDenetimleri({
              dugum: dugum!,
              belge,
              komut: (k) => this.gecmis.calistir(k),
            })
          : html`<div class="bos">${t("metin.bosSecim")}</div>`}
      </div>
    `;
  }

  #kimlikMetni(dugum: Dugum | null): string {
    if (!dugum) return "T";
    const id = dugum.oznitelikler.get("id");
    return `<${dugum.etiket}>${id ? ` #${id}` : ""}`;
  }

  #metinEylemleri() {
    const menuBaglami: MenuBaglami = {
      depo: this.depo,
      secim: this.secim,
      gecmis: this.gecmis,
      hataBildir: (m) => bildirimServisi.bildir(m, "hata"),
    };
    const adaylar = [
      { id: "metin.yolaBagla", ikon: IK_YOLA_BAGLA },
      { id: "metin.yoldanCoz", ikon: IK_YOLDAN_COZ },
    ];
    const gorunur = adaylar.filter((a) => menuKayitDefteri.bul(a.id));
    if (gorunur.length === 0) return "";
    return html`<div class="eylem-seridi">
      ${gorunur.map((a) => {
        const oge = menuKayitDefteri.bul(a.id)!;
        return html`<button
          type="button"
          class="eylem-dugme"
          title=${t(oge.etiketAnahtari)}
          aria-label=${t(oge.etiketAnahtari)}
          @click=${() => void oge.calistir(menuBaglami)}
        >
          ${a.ikon}
        </button>`;
      })}
    </div>`;
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
