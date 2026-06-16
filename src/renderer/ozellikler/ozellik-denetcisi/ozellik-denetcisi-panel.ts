import { LitElement, html, css, svg } from "lit";
import { customElement } from "lit/decorators.js";
import type { BelgeDeposu } from "../../../cekirdek/belge/belge-deposu";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { panelKayitDefteri } from "../../../cekirdek/registry/panel-registry";
import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import { bildirimServisi } from "../../kabuk/bildirim-servisi";
import { dilYonetici, t } from "../../diller/dil";
import { stilYazimModu, type StilModu } from "../../boya/stil-yazim-modu";
import { alanSetiKayitDefteri } from "./turler/alan-seti-registry";
// Alan setleri import edilince kendilerini registry'ye kaydeder (İlke 5).
import "./turler/gorunum-alan-seti";
import "./turler/geometri-alan-seti";
import "./turler/metadata-alan-seti";
import "./turler/marker-alan-seti";
import "./turler/tanim-alan-seti";
import "./turler/tuval-ayarlari-alan-seti";

// Hızlı Eylemler ikonları (Illustrator Quick Actions deseni).
const IK_GRUPLA = svg`<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="7" y="7" width="6" height="6" rx="1"/></svg>`;
const IK_COZ = svg`<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.4"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1"/></svg>`;
const IK_COGALT = svg`<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="3" width="7" height="7" rx="1"/><path d="M6 12.5h6.5a.5.5 0 0 0 .5-.5V6"/></svg>`;
const IK_SIL = svg`<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M3.5 4.5h9M6 4.5V3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4.5M5 4.5l.6 8a1 1 0 0 0 1 .9h2.8a1 1 0 0 0 1-.9l.6-8"/></svg>`;

/** Katlanmış bölüm id'leri (yoğunluk modeli; oturum görünüm durumu, undo'ya girmez). */
const kapaliGruplar = new Set<string>();

/**
 * Özellik Denetçisi paneli (AGENTS.md §5.4, §9.3) — seçime DUYARLI.
 *
 * Seçili düğümün türüne uygun alan setlerini (registry'den) gösterir; yeni nesne
 * türü = yeni alan seti kaydı (kabuk/panel değişmez). Her değişiklik DAİMA
 * Command ile (İlke 2) geçmişe yazılır → undo/redo; Tuval canlı güncellenir
 * (İlke 3). Altta seçime göre değişen Hızlı Eylemler şeridi (Illustrator deseni).
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
      padding-bottom: 0.55rem;
    }
    .stil-modu {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-bottom: 1px solid var(--kenarlik);
      background: var(--yuzey-2);
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
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
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
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    /* Bölüm (Illustrator Properties deseni): ince ayraç + soluk küçük başlık,
       kart değil düz; gruplar dikey boşlukla ayrılır. */
    .grup {
      border-bottom: 1px solid var(--kenarlik);
      padding-bottom: 0.45rem;
    }
    .grup:last-of-type {
      border-bottom: 0;
    }
    /* Katlanabilir bölüm başlığı (yoğunluk modeli): tıkla → aç/kapa. */
    .grup-baslik {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 0.75rem 0.2rem;
      font: inherit;
      font-size: 0.64rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--metin-soluk);
      opacity: 0.85;
      background: none;
      border: 0;
      text-align: left;
      cursor: pointer;
    }
    .grup-baslik:hover {
      color: var(--metin);
      opacity: 1;
    }
    .grup-baslik .ok {
      font-size: 0.7rem;
      width: 0.7rem;
      opacity: 0.75;
    }
    .alan {
      display: grid;
      gap: 0.3rem;
      padding: 0.3rem 0.75rem;
    }
    /* Tek satır alan (etiket + kontrol yan yana) — dolgu/kontur gibi alanlar iki
       satır kaplamasın (kullanıcı isteği). */
    .alan.satirici {
      grid-template-columns: auto 1fr;
      align-items: center;
      column-gap: 0.5rem;
    }
    .alan label {
      font-size: 0.75rem;
      color: var(--metin-soluk);
    }
    /* Oranlı çift satırı: etiket · giriş · etiket · giriş · [kilit] (tek satır;
       kilit en sonda — kullanıcı isteği). */
    .oran-cift {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr auto;
      align-items: center;
      gap: 0.3rem 0.4rem;
      padding: 0.3rem 0.75rem;
    }
    /* Ön-etiketli (örn. "Köşe") oranlı çift: ön · etiket · giriş · etiket · giriş · [kilit]. */
    .oran-cift.onlu {
      grid-template-columns: auto auto 1fr auto 1fr auto;
    }
    .oran-cift .on {
      font-size: 0.66rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--metin-soluk);
    }
    .oran-cift label {
      font-size: 0.75rem;
      color: var(--metin-soluk);
      font-family: ui-monospace, monospace;
    }
    /* Konum başlığındaki "öte" onay kutusu (x/y ↔ tx/ty). */
    .onay {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.66rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .onay input {
      accent-color: var(--vurgu, #4a90e2);
      cursor: pointer;
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
    .kilit:hover:not([aria-pressed="true"]) {
      border-color: var(--metin-soluk);
      color: var(--metin);
    }
    .kilit[aria-pressed="true"] {
      color: var(--vurgu-metin);
      background: var(--vurgu);
      border-color: transparent;
    }
    .kilit.kucuk {
      width: 22px;
      height: 20px;
    }
    /* Çevir (flip) satırı — Illustrator Transform: yatay/dikey yansıt düğmeleri. */
    .cevir-satir {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
    }
    .cevir-satir .eti {
      flex: 1;
      font-size: 0.72rem;
      color: var(--metin-soluk);
    }
    .cevir-dugme {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 22px;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .cevir-dugme:hover {
      border-color: var(--metin-soluk);
      color: var(--metin);
    }
    .cevir-dugme svg {
      display: block;
    }
    /* Konum satırı: 3×3 referans proxy'si SOLDA, X/Y kutuları YANINDA (Illustrator). */
    .konum-satir {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.3rem 0.75rem;
    }
    .konum-alanlar {
      flex: 1;
      min-width: 0;
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      align-items: center;
      gap: 0.3rem 0.5rem;
    }
    .konum-alanlar label {
      font-size: 0.75rem;
      color: var(--metin-soluk);
      font-family: ui-monospace, monospace;
    }
    /* 3×3 referans-noktası proxy'si — kompakt, yazısız. */
    .ref-proxy {
      display: grid;
      grid-template-columns: repeat(3, 9px);
      grid-auto-rows: 9px;
      gap: 1.5px;
      flex: 0 0 auto;
    }
    .ref-proxy.pasif {
      opacity: 0.4;
    }
    .ref-nokta {
      width: 9px;
      height: 9px;
      padding: 0;
      border: 1px solid var(--kenarlik);
      border-radius: 2px;
      background: var(--yuzey-2);
      cursor: pointer;
    }
    .ref-proxy.pasif .ref-nokta {
      cursor: default;
    }
    .ref-nokta:hover:not(.sec):not(:disabled) {
      border-color: var(--metin-soluk);
    }
    .ref-nokta.sec {
      background: var(--vurgu, #4a90e2);
      border-color: transparent;
    }
    /* Hızlı Eylemler şeridi (Illustrator Quick Actions) — en altta, bağlam-duyarlı. */
    .hizli {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--kenarlik);
      background: var(--yuzey-2);
    }
    .hizli-dugme {
      display: inline-grid;
      place-items: center;
      width: 30px;
      height: 26px;
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      background: var(--yuzey-2);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .hizli-dugme:hover {
      border-color: var(--vurgu, #4a90e2);
      color: var(--metin);
    }
    .hizli-dugme svg {
      display: block;
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
      min-height: 1.6rem;
      box-sizing: border-box;
      font: inherit;
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.2rem 0.4rem;
    }
    /* Alan etkileşim durumları (Illustrator: odakta accent kenarlık). */
    input[type="text"]:hover,
    input[type="number"]:hover,
    .alan select:hover {
      border-color: var(--metin-soluk);
    }
    input[type="text"]:focus,
    input[type="number"]:focus,
    .alan select:focus,
    .stil-modu select:focus {
      border-color: var(--vurgu, #4a90e2);
      outline: none;
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
      min-height: 1.6rem;
      box-sizing: border-box;
      font: inherit;
      font-size: 0.8rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.2rem 0.4rem;
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
    const baglamEtiketi = dugum
      ? this.secim.secililer.length > 1
        ? t("denetci.seciliSayisi", { sayi: this.secim.secililer.length })
        : t("denetci.eleman")
      : t("denetci.belge");
    return html`
      <header class="panel-kafa">
        <div>
          <div class="panel-etiket">${baglamEtiketi}</div>
          <div class="panel-baslik">${t("denetci.baslik")}</div>
        </div>
        <code class="panel-kimlik">${this.#kimlikMetni(dugum)}</code>
      </header>
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
      <div class="panel-govde">
        ${!dugum ? this.#tuvalGorunumu() : this.dugumGorunumu(dugum)}
      </div>
    `;
  }

  #kimlikMetni(dugum: Dugum | null): string {
    if (!dugum) return "<svg>";
    const id = dugum.oznitelikler.get("id");
    return `<${dugum.etiket}>${id ? ` #${id}` : ""}`;
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
      ${setler.map((set) => this.#grupCiz(set, baglam))}
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
      ${this.#hizliEylemler()}
      ${setler.length === 0
        ? html`<div class="bos">${t("denetci.alanYok")}</div>`
        : setler.map((set) => this.#grupCiz(set, baglam))}
    `;
  }

  /** Katlanabilir bölüm (Illustrator yoğunluk modeli): başlığa tıkla → aç/kapa. */
  #grupCiz(
    set: { id: string; baslikAnahtari: string; render: (b: never) => unknown },
    baglam: unknown,
  ) {
    const kapali = kapaliGruplar.has(set.id);
    return html`
      <div class="grup ${kapali ? "kapali" : ""}">
        <button
          type="button"
          class="grup-baslik"
          aria-expanded=${!kapali}
          @click=${() => {
            if (kapali) kapaliGruplar.delete(set.id);
            else kapaliGruplar.add(set.id);
            this.requestUpdate();
          }}
        >
          <span class="ok" aria-hidden="true">${kapali ? "▸" : "▾"}</span>
          ${t(set.baslikAnahtari)}
        </button>
        ${kapali ? "" : set.render(baglam as never)}
      </div>
    `;
  }

  /**
   * Hızlı Eylemler şeridi (Illustrator Quick Actions) — seçime göre değişen,
   * en alttaki eylem düğmeleri. Eylemler menü kayıt defterinden gelir (İlke 5):
   * yeni eylem = yeni menü ögesi; bu panel değişmez. Her biri kendi Command'ını
   * üretir (İlke 9: şerit görünüm durumu, eylem belge durumudur).
   */
  #hizliEylemler() {
    const menuBaglami: MenuBaglami = {
      depo: this.depo,
      secim: this.secim,
      gecmis: this.gecmis,
      hataBildir: (m) => bildirimServisi.bildir(m, "hata"),
    };
    const cok = this.secim.secililer.length >= 2;
    const grupMu = this.secim.secili?.etiket === "g";
    const adaylar: { id: string; ikon: typeof IK_SIL; goster: boolean }[] = [
      { id: "duzen.grupla", ikon: IK_GRUPLA, goster: cok },
      { id: "duzen.coz", ikon: IK_COZ, goster: grupMu },
      { id: "duzen.cogalt", ikon: IK_COGALT, goster: true },
      { id: "duzen.sil", ikon: IK_SIL, goster: true },
    ];
    const gorunur = adaylar.filter(
      (a) => a.goster && menuKayitDefteri.bul(a.id),
    );
    if (gorunur.length === 0) return "";
    return html`
      <div class="hizli">
        ${gorunur.map((a) => {
          const oge = menuKayitDefteri.bul(a.id)!;
          return html`<button
            type="button"
            class="hizli-dugme"
            title=${t(oge.etiketAnahtari)}
            aria-label=${t(oge.etiketAnahtari)}
            @click=${() => void oge.calistir(menuBaglami)}
          >
            ${a.ikon}
          </button>`;
        })}
      </div>
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
