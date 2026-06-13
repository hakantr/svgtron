import { LitElement, html, css, svg } from "lit";
import { customElement } from "lit/decorators.js";
import type { BelgeDeposu } from "../../../cekirdek/belge/belge-deposu";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { panelKayitDefteri } from "../../../cekirdek/registry/panel-registry";
import { dilYonetici, t } from "../../diller/dil";
import { stilYazimModu, type StilModu } from "../../boya/stil-yazim-modu";
import { alanSetiKayitDefteri } from "./turler/alan-seti-registry";
// Alan setleri import edilince kendilerini registry'ye kaydeder (İlke 5).
import "./turler/gorunum-alan-seti";
import "./turler/geometri-alan-seti";
import "./turler/metin-alan-seti";
import "./turler/metadata-alan-seti";
import "./turler/marker-alan-seti";
import "./turler/tanim-alan-seti";
import "./turler/tuval-ayarlari-alan-seti";

/**
 * Özellik Denetçisi paneli (AGENTS.md §5.4, §9.3) — seçime DUYARLI.
 *
 * Seçili düğümün türüne uygun alan setlerini (registry'den) gösterir; yeni nesne
 * türü = yeni alan seti kaydı (kabuk/panel değişmez). Her değişiklik DAİMA
 * Command ile (İlke 2) geçmişe yazılır → undo/redo; Tuval canlı güncellenir
 * (İlke 3).
 */
@customElement("ozellik-denetcisi-panel")
export class OzellikDenetcisiPanel extends LitElement {
  static override styles = css`
    :host {
      display: block;
      /* Rayda tek panel açık olduğundan sağ içeriğin tamamını doldur. */
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
    .stil-modu {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-bottom: 1px solid var(--kenarlik);
    }
    .stil-modu label {
      font-size: 0.72rem;
      color: var(--metin-soluk);
      white-space: nowrap;
    }
    .stil-modu select {
      flex: 1;
      min-width: 0;
      font: inherit;
      font-size: 0.78rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.18rem 0.3rem;
    }
    .bos {
      padding: 0.75rem;
      font-size: 0.8rem;
      color: var(--metin-soluk);
    }
    .eleman {
      padding: 0.5rem 0.75rem;
      font-size: 0.82rem;
      border-bottom: 1px solid var(--kenarlik);
    }
    .eleman .etiket {
      color: var(--metin-soluk);
      font-size: 0.7rem;
    }
    .eleman code {
      font-family: ui-monospace, monospace;
    }
    .grup {
      border-bottom: 1px solid var(--kenarlik);
      padding-bottom: 0.4rem;
    }
    .grup-baslik {
      padding: 0.45rem 0.75rem 0.25rem;
      font-size: 0.66rem;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--metin-soluk);
    }
    .alan {
      display: grid;
      gap: 0.3rem;
      padding: 0.3rem 0.75rem;
    }
    .alan label {
      font-size: 0.75rem;
      color: var(--metin-soluk);
    }
    .satir {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .izgara {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      align-items: center;
      gap: 0.3rem 0.5rem;
      padding: 0.3rem 0.75rem;
    }
    .izgara label {
      font-size: 0.75rem;
      color: var(--metin-soluk);
      font-family: ui-monospace, monospace;
    }
    .alt-baslik {
      padding: 0.45rem 0.75rem 0.15rem;
      font-size: 0.66rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--metin-soluk);
    }
    .alt-baslik.kose {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .kilit {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 22px;
      padding: 0;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .kilit[aria-pressed="true"] {
      color: var(--vurgu-metin);
      background: var(--vurgu);
      border-color: transparent;
    }
    .kilit svg {
      display: block;
    }
    /* Global user-select:none'ı form alanlarında geri aç (değer seçilip değiştirilsin). */
    input,
    textarea,
    select {
      -webkit-user-select: text;
      user-select: text;
    }
    input:disabled {
      opacity: 0.55;
      cursor: default;
    }
    input[type="text"],
    input[type="number"] {
      flex: 1;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      font-size: 0.8rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.22rem 0.4rem;
    }
    input[type="color"] {
      width: 28px;
      height: 26px;
      padding: 0;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      cursor: pointer;
    }
    /* Alan içi seçiciler (tanım ataması: filtre/kırpma/maske). */
    .alan select {
      flex: 1;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      font-size: 0.8rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.22rem 0.4rem;
      cursor: pointer;
    }
    /* Stil sınıfı çipleri (tıkla = ata/kaldır toggle). */
    .cipler {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      padding: 0.15rem 0.75rem 0.4rem;
    }
    .cip {
      font: inherit;
      font-size: 0.75rem;
      font-family: ui-monospace, monospace;
      color: var(--metin-soluk);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 999px;
      padding: 0.12rem 0.55rem;
      cursor: pointer;
    }
    .cip:hover {
      border-color: var(--vurgu, #4a90e2);
    }
    .cip.aktif {
      color: var(--vurgu-metin, #fff);
      background: var(--vurgu, #4a90e2);
      border-color: transparent;
    }
    .ipucu-bos {
      font-size: 0.75rem;
      color: var(--metin-soluk);
      line-height: 1.4;
    }
    input[type="range"] {
      flex: 1;
      min-width: 0;
      accent-color: var(--vurgu, #4a90e2);
    }
    .deger {
      width: 2.6rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-size: 0.78rem;
      color: var(--metin-soluk);
    }
  `;

  /** Uygulama servisleri (panel oluşturulurken atanır). */
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

  /** Bir özniteliği komutla yazar (değişmediyse komut üretmez). */
  private yaz(dugum: Dugum, ad: string, deger: string): void {
    const belge = this.depo.belge;
    if (!belge || (dugum.oznitelikler.get(ad) ?? "") === deger) return;
    this.gecmis.calistir(new OznitelikDegistirKomutu(belge, dugum, ad, deger));
  }

  override render() {
    const dugum = this.secim.secili;
    return html`
      <div class="baslik">${t("denetci.baslik")}</div>
      <div class="stil-modu" title=${t("denetci.stilModu.ipucu")}>
        <label>${t("denetci.stilModu")}</label>
        <select
          .value=${stilYazimModu.mod}
          @change=${(e: Event) =>
            stilYazimModu.ayarla(
              (e.target as HTMLSelectElement).value as StilModu,
            )}
        >
          <option
            value="otomatik"
            ?selected=${stilYazimModu.mod === "otomatik"}
          >
            ${t("denetci.stilModu.otomatik")}
          </option>
          <option value="inline" ?selected=${stilYazimModu.mod === "inline"}>
            ${t("denetci.stilModu.inline")}
          </option>
          <option value="css" ?selected=${stilYazimModu.mod === "css"}>
            ${t("denetci.stilModu.css")}
          </option>
        </select>
      </div>
      ${!dugum ? this.#tuvalGorunumu() : this.dugumGorunumu(dugum)}
    `;
  }

  /**
   * Seçim YOKKEN: belgenin kökünü (`<svg>`) tuval ayarları olarak gösterir
   * (width/height/viewBox + belge başlığı/açıklaması — kullanıcı isteği). Belge
   * yoksa boş-seçim mesajı.
   */
  #tuvalGorunumu() {
    const belge = this.depo.belge;
    if (!belge) return html`<div class="bos">${t("denetci.bosSecim")}</div>`;
    const kok = belge.kok;
    const baglam = {
      dugum: kok,
      belge,
      yaz: (ad: string, deger: string) => this.yaz(kok, ad, deger),
      komut: (k: Parameters<typeof this.gecmis.calistir>[0]) =>
        this.gecmis.calistir(k),
      tazele: () => this.requestUpdate(),
    };
    const setler = alanSetiKayitDefteri.uygunlar(kok);
    return html`
      <div class="eleman">
        <span class="etiket">${t("denetci.belge")}:</span>
        <code>&lt;svg&gt;</code>
      </div>
      ${setler.map(
        (set) => html`
          <div class="grup">
            <div class="grup-baslik">${t(set.baslikAnahtari)}</div>
            ${set.render(baglam)}
          </div>
        `,
      )}
    `;
  }

  private dugumGorunumu(dugum: Dugum) {
    const belge = this.depo.belge;
    if (!belge) return html``;
    const id = dugum.oznitelikler.get("id");
    const baglam = {
      dugum,
      belge,
      yaz: (ad: string, deger: string) => this.yaz(dugum, ad, deger),
      komut: (k: Parameters<typeof this.gecmis.calistir>[0]) =>
        this.gecmis.calistir(k),
      tazele: () => this.requestUpdate(),
    };
    const setler = alanSetiKayitDefteri.uygunlar(dugum);

    return html`
      <div class="eleman">
        <span class="etiket">${t("denetci.eleman")}:</span>
        <code>&lt;${dugum.etiket}&gt;</code>
        ${id ? html`<code>#${id}</code>` : ""}
      </div>
      ${setler.length === 0
        ? html`<div class="bos">${t("denetci.alanYok")}</div>`
        : setler.map(
            (set) => html`
              <div class="grup">
                <div class="grup-baslik">${t(set.baslikAnahtari)}</div>
                ${set.render(baglam)}
              </div>
            `,
          )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozellik-denetcisi-panel": OzellikDenetcisiPanel;
  }
}

// Registry'ye kaydol (İlke 5). Sağ-üst.
panelKayitDefteri.kaydet({
  id: "ozellik-denetcisi",
  baslik: "Özellik Denetçisi",
  bolge: "sag",
  ikon: svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 5h6M14.5 5H15M3 9h2M9.5 9H15M3 13h8M15 13h0.01"/><circle cx="11" cy="5" r="1.7"/><circle cx="7.5" cy="9" r="1.7"/><circle cx="13" cy="13" r="1.7"/></svg>`,
  olustur: ({ depo, secim, gecmis }) => {
    const panel = new OzellikDenetcisiPanel();
    panel.depo = depo;
    panel.secim = secim;
    panel.gecmis = gecmis;
    return panel;
  },
});
