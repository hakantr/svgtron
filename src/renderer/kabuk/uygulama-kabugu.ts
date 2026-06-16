import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import type { SurumBilgisi } from "../../ortak/api-sozlesmesi";
import { OynatmaDeposu } from "../../cekirdek/animasyon/oynatma-deposu";
import { sekmeYoneticisi } from "../sekmeler/sekme-yoneticisi";
import "../sekmeler/sekme-cubugu";
import {
  panelKayitDefteri,
  type PanelBolgesi,
} from "../../cekirdek/registry/panel-registry";
import { temaKayitDefteri } from "../../cekirdek/registry/tema-registry";
import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../cekirdek/registry/menu-registry";
import { temaYonetici } from "./tema-yonetici";
import { dilYonetici, t } from "../diller/dil";
import { bildirimServisi, type Bildirim } from "./bildirim-servisi";
import type { MenuGorunumOgesi } from "./uygulama-menusu";
import { duzenUygula } from "../ozellikler/duzen/duzen-eylemleri";
import {
  sil,
  cogalt,
  grupla,
  coz,
  panoyaKopyala,
  panoyaKes,
  yapistir,
} from "../ozellikler/duzen/duzenleme";
import { sonDosyalar } from "../ozellikler/dosya/son-dosyalar";
import { aracDeposu } from "../araclar/arac";
import { disaAktarSor } from "../ozellikler/dosya/disa-aktar-sor";
import {
  yoldanYukle,
  kaydetBelge,
  yeniBelge,
} from "../ozellikler/dosya/dosya-eylemleri";
import { degisiklikSor } from "./degisiklik-sor";
import { hakkindaServisi } from "../ozellikler/yardim/hakkinda";
import {
  paletEylemleri,
  paletSuz,
} from "../ozellikler/komut-paleti/palet-eylemleri";
import "./pencere-kontrolleri";
import "./uygulama-menusu";

/** Üst Çubuktaki bir menü grubu (Dosya/Düzen/Dil…). */
interface MenuGrubu {
  readonly id: string;
  readonly ogeler: MenuGorunumOgesi[];
}

/**
 * Uygulama kabuğu — çerçevesiz, özel Üst Çubuk, registry-sürümlü çatı.
 *
 * Üst Çubuk iki mod arasında geçer (AGENTS.md §9.5; bu geçiş görünüm durumudur,
 * undo'ya girmez — İlke 9):
 *  - Toplu mod: ☰ hamburger · "SVG Editör" · açık dosya adı.
 *  - Menü modu: hamburger'a tıklanınca bunlar gizlenir, aynı yerden yatay menü
 *    çubuğu (Dosya · Düzen · Dil…) açılır. Toplu moda dönüş: öğe seçilince, dışarı
 *    tıklanınca ya da Esc.
 *
 * Menü grupları/eylemleri menü registry'sinden gelir (İlke 5). Renkler tema
 * token'larından; metinler i18n'den (varsayılan Türkçe).
 */
@customElement("uygulama-kabugu")
export class UygulamaKabugu extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      /* ÜST ÇUBUK · gövde · ALT BÖLGE (kod paneli). Sürüm alt çubuğu kaldırıldı
         (artık Yardım → Hakkında'da gösterilir, kullanıcı isteği). */
      grid-template-rows: auto 1fr auto;
      height: 100vh;
      font-family:
        system-ui,
        -apple-system,
        "Segoe UI",
        sans-serif;
      color: var(--metin);
      background: var(--zemin);
    }

    .ust-bar {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      height: 40px;
      padding: 0 0 0 0.4rem;
      background: var(--yuzey);
      border-bottom: 1px solid var(--kenarlik);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 2px 10px rgba(0, 0, 0, 0.28);
      z-index: 2;
      -webkit-app-region: drag;
    }
    /* macOS: yerel trafik-ışıklarına yer aç. */
    :host([data-platform="darwin"]) .ust-bar {
      padding-left: 80px;
    }

    .hamburger,
    .menu-cubugu,
    .tema-secim,
    .dil-secim,
    .komut-ara,
    select {
      -webkit-app-region: no-drag;
    }

    /* Dil seçimi (üst çubuk, tema'nın sağında dünya simgesi → açılır liste). */
    .dil-secim {
      position: relative;
      display: flex;
      align-items: center;
      /* Tema seçici ile dünya simgesi arasını ~2px'e indir (üst-bar gap'i 0.6rem;
         negatif marj ile nötrlenip 2px bırakılır). */
      margin-left: calc(2px - 0.6rem);
      margin-right: 0.5rem;
    }
    .dil-dugme {
      display: grid;
      place-items: center;
      width: 30px;
      height: 28px;
      border: 1px solid var(--kenarlik);
      border-radius: 6px;
      background: var(--yuzey-2);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .dil-dugme:hover,
    .dil-dugme.acik {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    .dil-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      min-width: 130px;
      background: var(--yuzey);
      border: 1px solid var(--kenarlik);
      border-radius: 8px;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.32);
      padding: 0.25rem 0;
      z-index: 20;
    }
    .dil-oge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      padding: 0.4rem 0.8rem;
      border: 0;
      background: transparent;
      color: var(--metin);
      font: inherit;
      font-size: 0.82rem;
      text-align: left;
      cursor: pointer;
    }
    .dil-oge:hover {
      background: var(--yuzey-hover);
    }
    .dil-oge .iz {
      color: var(--metin-soluk);
    }

    /* Üst Çubuk komut arama kutusu (§11.3, 11.a) — tıkla/Ctrl+K paletini açar. */
    .komut-ara {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 220px;
      max-width: 360px;
      height: 26px;
      padding: 0 0.5rem 0 0.6rem;
      font: inherit;
      font-size: 0.8rem;
      color: var(--metin-soluk);
      background: var(--yuzey-2, rgba(127, 127, 127, 0.12));
      border: 1px solid var(--kenarlik);
      border-radius: 7px;
      cursor: text;
    }
    .komut-ara:hover {
      background: var(--yuzey-hover);
    }
    .komut-ara .etiket {
      flex: 1;
      text-align: left;
    }
    .komut-ara kbd {
      font: inherit;
      font-size: 0.7rem;
      padding: 0.05rem 0.3rem;
      border: 1px solid var(--kenarlik);
      border-radius: 4px;
      color: var(--metin-soluk);
    }
    /* Yerinde arama: kutu açılınca biraz genişler; liste altından açılır. */
    .komut-ara {
      position: relative;
    }
    .komut-ara.acik {
      min-width: 360px;
      max-width: 460px;
      background: var(--yuzey-2, var(--yuzey));
      border-color: var(--vurgu, #4a90e2);
    }
    .komut-ara input {
      flex: 1;
      min-width: 0;
      font: inherit;
      font-size: 0.8rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--metin);
      outline: none;
    }
    .komut-ara input::placeholder {
      color: var(--metin-soluk);
    }
    /* Açılır liste — title bardaki komut-ara görünümüyle aynı (yüzey-2/kenarlık/yuvarlama). */
    .komut-liste {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      margin: 0;
      padding: 0.25rem;
      list-style: none;
      max-height: 60vh;
      overflow-y: auto;
      background: var(--yuzey-2, var(--yuzey));
      color: var(--metin);
      border: 1px solid var(--kenarlik);
      border-radius: 7px;
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.4);
      z-index: 60;
      -webkit-app-region: no-drag;
    }
    .komut-oge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      padding: 0.35rem 0.5rem;
      border-radius: 5px;
      font-size: 0.8rem;
      cursor: pointer;
    }
    .komut-oge.sec {
      background: var(--vurgu, #4a90e2);
      color: var(--vurgu-metin, #fff);
    }
    .komut-oge .ipucu {
      font-size: 0.72rem;
      opacity: 0.7;
    }
    .komut-bos {
      padding: 0.6rem 0.5rem;
      color: var(--metin-soluk);
      font-size: 0.8rem;
    }

    .hamburger {
      display: grid;
      gap: 3px;
      width: 30px;
      height: 30px;
      padding: 7px;
      box-sizing: border-box;
      align-content: center;
      border: 0;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
    }
    .hamburger:hover {
      background: var(--yuzey-hover);
    }
    .hamburger span {
      display: block;
      height: 2px;
      border-radius: 2px;
      background: var(--metin);
    }

    .ad {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .dosya {
      color: var(--metin-soluk);
      font-size: 0.82rem;
    }
    /* Geçici bildirim (toast) — viewport altına ortalanır, süreyle kapanır. */
    .toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      max-width: min(560px, 90vw);
      padding: 0.55rem 0.9rem;
      border-radius: 8px;
      font-size: 0.82rem;
      line-height: 1.3;
      color: var(--metin, #e8e8ea);
      background: var(--yuzey, #25272c);
      border: 1px solid var(--kenarlik, #3a3d44);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
      z-index: 1000;
      pointer-events: none;
      animation: toast-giris 0.16s ease-out;
    }
    .toast.uyari {
      border-color: #d9a441;
    }
    .toast.hata {
      border-color: var(--hata, #e5484d);
      color: var(--hata, #e5484d);
    }
    @keyframes toast-giris {
      from {
        opacity: 0;
        transform: translate(-50%, 8px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
    .bosluk {
      flex: 1;
      align-self: stretch;
    }

    /* Kaydetme onayı modalı (kaydedilmemiş değişiklik). */
    .modal-perde {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: grid;
      place-items: center;
      background: rgba(0, 0, 0, 0.5);
      -webkit-app-region: no-drag;
    }
    .modal {
      min-width: 320px;
      max-width: min(440px, 90vw);
      padding: 1.1rem 1.2rem 0.9rem;
      border-radius: 12px;
      background: var(--yuzey, #25272c);
      border: 1px solid var(--kenarlik, #3a3d44);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    }
    .modal h2 {
      margin: 0 0 0.4rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--metin);
    }
    .modal p {
      margin: 0 0 1rem;
      font-size: 0.82rem;
      line-height: 1.4;
      color: var(--metin-soluk);
    }
    .modal .dugmeler {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .modal button {
      font: inherit;
      font-size: 0.82rem;
      padding: 0.4rem 0.85rem;
      border: 1px solid var(--kenarlik);
      border-radius: 7px;
      background: var(--yuzey-2, rgba(127, 127, 127, 0.12));
      color: var(--metin);
      cursor: pointer;
    }
    .modal button:hover {
      background: var(--yuzey-hover);
    }
    .modal button.birincil {
      background: var(--vurgu);
      color: var(--vurgu-metin);
      border-color: transparent;
    }
    .modal button.tehlike {
      color: var(--hata, #e5484d);
    }
    /* Hakkında: sürüm satırları (tek tek, monospace). */
    .modal .surumler {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      margin: 0 0 1rem;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.78rem;
      color: var(--metin-soluk);
    }

    /* Dışa aktarım profili seçim kartları (TK-37 #10). */
    .modal .profiller {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 0 0 0.9rem;
    }
    .modal button.profil {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.2rem;
      padding: 0.6rem 0.8rem;
      text-align: left;
    }
    .modal button.profil .ad {
      font-size: 0.85rem;
      font-weight: 600;
    }
    .modal button.profil .aciklama {
      font-size: 0.76rem;
      line-height: 1.35;
      color: var(--metin-soluk);
    }
    .modal button.profil.birincil .aciklama {
      color: var(--vurgu-metin);
      opacity: 0.85;
    }

    /* Menü çubuğu (menü modu) */
    .menu-cubugu {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      height: 100%;
    }
    .menu-grup {
      position: relative;
      height: 100%;
      display: flex;
      align-items: center;
    }
    /* Aktif grubu menüsüne bağlayan çizgi: GRUP genişliğinde (açılan menü
       genişliğinde değil), çubuğun alt kenarında — öğe bitişi ile menü başlangıcı
       arasında (TK-1). */
    .menu-grup.acik::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 3px;
      background: var(--vurgu);
      z-index: 11;
    }
    .grup-dugme {
      font: inherit;
      font-size: 0.85rem;
      color: var(--metin);
      background: transparent;
      border: 0;
      border-radius: 5px;
      padding: 0.3rem 0.6rem;
      cursor: pointer;
    }
    /* Aktif grupta zemin DEĞİŞMEZ (kullanıcı tercihi); bağ, açılan menünün
       üstündeki vurgu çizgisiyle kurulur. Yalnızca hover'da hafif zemin. */
    .grup-dugme:hover {
      background: var(--yuzey-hover);
    }
    /* Açılan menü üst öğesine BİTİŞİK durur (TK-1: boşluk yok). */
    .menu-acilir {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: -1px;
      z-index: 10;
    }

    select {
      font: inherit;
      font-size: 0.82rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
    }
    .tema-secim {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-right: 0.5rem;
      font-size: 0.78rem;
      color: var(--metin-soluk);
    }

    .govde {
      display: grid;
      grid-template-columns: auto 1fr auto;
      min-height: 0;
    }
    /* Araçlar bölgesi (sol) — boşken 0 genişlik; araçlar registry'den dolar. */
    .sol {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .sol:not(:empty) {
      border-right: 1px solid var(--kenarlik);
      background: var(--yuzey);
    }
    .merkez {
      min-width: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    /* Tuval kabı — sekme çubuğunun altında kalan alanı doldurur. */
    .tuval-kap {
      flex: 1;
      min-height: 0;
      position: relative;
    }
    /* Sağ bölge: [tutamaç][içerik][simge rayı]. Aynı anda en çok bir panel açık
       (Y7) — gereksiz paneller görünmez; ray simgeleriyle açılır. */
    .sag {
      display: flex;
      flex-direction: row;
      border-left: 1px solid var(--kenarlik);
      background: var(--yuzey);
      min-height: 0;
      box-shadow: -1px 0 0 rgba(255, 255, 255, 0.03) inset;
    }
    .sag-tutamac {
      width: 6px;
      flex: 0 0 auto;
      cursor: ew-resize;
      background: transparent;
    }
    .sag-tutamac:hover {
      background: var(--vurgu, #4a90e2);
      opacity: 0.5;
    }
    .sag-icerik {
      width: 300px;
      min-width: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      scrollbar-gutter: stable;
    }
    .sag-icerik[hidden] {
      display: none;
    }
    .sag-ray {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px 4px;
      border-left: 1px solid var(--kenarlik);
      background: var(--yuzey-2);
      flex: 0 0 auto;
    }
    .sag-ray button {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid transparent;
      border-radius: 5px;
      background: transparent;
      color: var(--metin-soluk);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .sag-ray button:hover {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    .sag-ray button.aktif {
      background: var(--vurgu, #4a90e2);
      color: var(--vurgu-metin, #fff);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    }
  `;

  /**
   * Uygulama servisleri. #depo/#secim/#gecmis, sekme yöneticisinin AKTİF sekmeye
   * delege eden vekilleridir (çoklu belge); paneller bunlara bir kez abone olur,
   * sekme değişince aktif belgeye yönlenirler. #oynatma tek: aktif tuvali izler.
   */
  readonly #depo = sekmeYoneticisi.belge;
  readonly #secim = sekmeYoneticisi.secim;
  readonly #gecmis = sekmeYoneticisi.gecmis;
  readonly #oynatma = new OynatmaDeposu();

  @state() private surum?: SurumBilgisi;
  @state() private acikDosyaAdi?: string;
  /** Geçici (toast) bildirim — görünüm durumu; süreyle kapanır. */
  @state() private bildirim?: Bildirim;
  #bildirimZaman?: ReturnType<typeof setTimeout>;
  #bildirimCoz?: () => void;
  @state() private temaId = temaYonetici.mevcutId;
  /** Üst Çubuk menü modunda mı? (§9.5) */
  @state() private menuModu = false;
  /** Açık olan menü grubunun id'si (yoksa null). */
  @state() private acikGrup: string | null = null;
  /** Klavyeyle odaklanan menü öğesi indisi (-1 = yok). */
  @state() private menuOdak = -1;
  /** Kaydedilmemiş değişiklik modalı açık mı? (Kaydet/Kaydetme/İptal sorusu.) */
  @state() private kaydetSorusu = false;
  /** Dışa aktarım profili sorusu açık mı? (Dosya → Dışa aktar, TK-37 #10) */
  @state() private disaAktarSorusu = false;
  /** Hakkında penceresi açık mı? (Yardım → Hakkında) */
  @state() private acikHakkinda = false;
  /** Üst çubuktaki dil (dünya simgesi) açılırı açık mı? */
  @state() private dilAcik = false;
  // Komut araması (üst çubuk; eski modal yerine yerinde açılır liste).
  @state() private komutAcik = false;
  @state() private komutSorgu = "";
  @state() private komutIndis = 0;
  @query(".komut-ara input") private komutGirisEl?: HTMLInputElement;
  #degisiklikCoz?: () => void;
  #disaAktarCoz?: () => void;
  #menuEylemCoz?: () => void;
  #kapanisCoz?: () => void;
  #sekmeCoz?: () => void;
  #hakkindaCoz?: () => void;
  /** Sağ rayda açık panelin id'si (null = tümü kapalı) — Y7. */
  @state() private aktifSag: string | null = "ozellik-denetcisi";
  /** Sağ içerik genişliği (px; tutamaçla değişir). */
  @state() private sagGenislik = 300;

  @query(".sol") private sol!: HTMLElement;
  @query(".tuval-kap") private tuvalKap!: HTMLElement;
  @query(".sag-icerik") private sagIcerik!: HTMLElement;
  @query(".alt-bolge") private altBolge!: HTMLElement;
  /** Sağ panel id → DOM elemanı (görünürlük rayla değişir). */
  readonly #sagPanelleri = new Map<string, HTMLElement>();

  #depoCoz?: () => void;
  #dilCoz?: () => void;
  #secimSagCoz?: () => void;
  /** Metin paneli otomatik öne gelmeden önceki sağ panel (geri dönmek için). */
  #sagMetinOncesi: string | null = null;

  /** Menü eylemlerine geçirilen bağlam (servisler + hata bildirimi). */
  readonly #menuBaglami: MenuBaglami = {
    depo: this.#depo,
    secim: this.#secim,
    gecmis: this.#gecmis,
    hataBildir: (mesaj) => bildirimServisi.bildir(mesaj, "hata"),
  };

  /** Toast bildirimi gösterir ve türüne göre süreyle kendiliğinden kapatır. */
  #bildirimGoster(b: Bildirim): void {
    if (this.#bildirimZaman) clearTimeout(this.#bildirimZaman);
    this.bildirim = b;
    const sure = b.tur === "hata" ? 5000 : b.tur === "uyari" ? 4000 : 2500;
    this.#bildirimZaman = setTimeout(() => {
      this.bildirim = undefined;
      this.#bildirimZaman = undefined;
    }, sure);
  }

  // Klavye: menü modu gezinmesi + düzenleme kısayolları (giriş alanında değilken).
  readonly #klavye = (olay: KeyboardEvent): void => {
    // Ctrl/Cmd+K: üst çubuk komut aramasına odaklan (eski modal yerine).
    if ((olay.ctrlKey || olay.metaKey) && olay.key.toLowerCase() === "k") {
      olay.preventDefault();
      this.komutGirisEl?.focus();
      this.komutGirisEl?.select();
      return;
    }
    // Dil açılırı açıkken Esc kapatır.
    if (this.dilAcik && olay.key === "Escape") {
      olay.preventDefault();
      this.dilAcik = false;
      window.removeEventListener("pointerdown", this.#disDil, true);
      return;
    }
    // Hakkında penceresi açıkken Esc/Enter kapatır.
    if (this.acikHakkinda) {
      if (olay.key === "Escape" || olay.key === "Enter") {
        olay.preventDefault();
        this.acikHakkinda = false;
      }
      return;
    }
    // Kaydetme modalı açıkken klavye onu yönetir (Esc=İptal, Enter=Kaydet).
    if (this.kaydetSorusu) {
      if (olay.key === "Escape") {
        olay.preventDefault();
        degisiklikSor.cevapla("iptal");
      } else if (olay.key === "Enter") {
        olay.preventDefault();
        degisiklikSor.cevapla("kaydet");
      }
      return;
    }
    // Dışa aktarım profili modalı (Esc=İptal, Enter=Geniş uyumluluk — önerilen,
    // eski davranışla aynı varsayılan).
    if (this.disaAktarSorusu) {
      if (olay.key === "Escape") {
        olay.preventDefault();
        disaAktarSor.cevapla(null);
      } else if (olay.key === "Enter") {
        olay.preventDefault();
        disaAktarSor.cevapla("genis-uyumluluk");
      }
      return;
    }
    if (this.menuModu) {
      this.#menuKlavye(olay);
      return;
    }
    const hedef = olay.composedPath()[0];
    const yaziAlani =
      hedef instanceof HTMLElement &&
      (hedef.tagName === "INPUT" ||
        hedef.tagName === "TEXTAREA" ||
        hedef.isContentEditable);
    const baglam = {
      depo: this.#depo,
      secim: this.#secim,
      gecmis: this.#gecmis,
    };

    // Sil — Delete/Backspace (modifiersiz, giriş alanında değilken).
    if (
      !olay.ctrlKey &&
      !olay.metaKey &&
      (olay.key === "Delete" || olay.key === "Backspace")
    ) {
      if (yaziAlani) return;
      olay.preventDefault();
      duzenUygula(baglam, sil);
      return;
    }
    if (!(olay.ctrlKey || olay.metaKey)) return;
    // Yazı alanı/kod paneli odaktayken Ctrl+Z/Y/D/G'yi YAKALAMA → tarayıcının yerel
    // metin geri-al/yinele'si çalışsın (belge/seçim geçmişini tetikleme).
    if (yaziAlani) return;

    const harf = olay.key.toLowerCase();
    if (harf === "z" && !olay.shiftKey) {
      olay.preventDefault();
      // Aktif araç Ctrl+Z'yi yakalayabilir (çok-noktalı çizim: yalnız "bitirme
      // adımı"nı geri al, çizime dön — İlke 5). Yakalanmazsa normal geri-al.
      if (!aracDeposu.aktif?.geriAlYakala?.()) this.#gecmis.geriAl();
    } else if ((harf === "z" && olay.shiftKey) || harf === "y") {
      olay.preventDefault();
      this.#gecmis.ileriAl();
    } else if (harf === "d") {
      olay.preventDefault();
      duzenUygula(baglam, cogalt);
    } else if (harf === "c") {
      olay.preventDefault();
      const belge = this.#depo.belge;
      if (belge) panoyaKopyala(belge, this.#secim);
    } else if (harf === "x") {
      olay.preventDefault();
      duzenUygula(baglam, panoyaKes);
    } else if (harf === "v") {
      olay.preventDefault();
      duzenUygula(baglam, yapistir);
    } else if (harf === "g") {
      olay.preventDefault();
      duzenUygula(baglam, olay.shiftKey ? coz : grupla);
    }
  };

  // Menü modu klavyesi: ←/→ grup değiştir, ↑/↓ öğe gez, Enter seç, Esc kapat.
  #menuKlavye(olay: KeyboardEvent): void {
    const gruplar = this.menuGruplari();
    const grupIdx = Math.max(
      0,
      gruplar.findIndex((g) => g.id === this.acikGrup),
    );
    const ogeler = gruplar[grupIdx]?.ogeler ?? [];

    switch (olay.key) {
      case "Escape":
        this.menuModunuKapat();
        break;
      case "ArrowRight":
        olay.preventDefault();
        this.grupAc(gruplar[(grupIdx + 1) % gruplar.length]!.id);
        break;
      case "ArrowLeft":
        olay.preventDefault();
        this.grupAc(
          gruplar[(grupIdx - 1 + gruplar.length) % gruplar.length]!.id,
        );
        break;
      case "ArrowDown":
        olay.preventDefault();
        this.menuOdak = Math.min(this.menuOdak + 1, ogeler.length - 1);
        break;
      case "ArrowUp":
        olay.preventDefault();
        this.menuOdak = Math.max(this.menuOdak - 1, 0);
        break;
      case "Enter": {
        olay.preventDefault();
        const oge = ogeler[this.menuOdak];
        if (oge && !oge.altOgeler) {
          this.menuModunuKapat();
          void oge.calistir?.();
        }
        break;
      }
    }
  }

  // Menü çubuğu dışına tıklama → toplu moda dön (§9.5).
  readonly #disMenu = (olay: Event): void => {
    const iceride = olay
      .composedPath()
      .some(
        (d) => d instanceof HTMLElement && d.classList.contains("menu-cubugu"),
      );
    if (!iceride) this.menuModunuKapat();
  };

  // --- Komut araması (üst çubuk, yerinde açılır liste) ---
  #komutGiris(olay: Event): void {
    this.komutSorgu = (olay.target as HTMLInputElement).value;
    this.komutIndis = 0;
    this.komutAcik = true;
  }
  #komutKapat(): void {
    this.komutAcik = false;
    this.komutSorgu = "";
    this.komutIndis = 0;
  }
  #komutKlavye(olay: KeyboardEvent): void {
    olay.stopPropagation(); // arama klavyeyi sahiplenir → araç kısayolları tetiklenmesin
    const liste = paletSuz(paletEylemleri(this.#menuBaglami), this.komutSorgu);
    switch (olay.key) {
      case "Escape":
        olay.preventDefault();
        this.#komutKapat();
        this.komutGirisEl?.blur();
        break;
      case "ArrowDown":
        olay.preventDefault();
        this.komutIndis = Math.min(this.komutIndis + 1, liste.length - 1);
        break;
      case "ArrowUp":
        olay.preventDefault();
        this.komutIndis = Math.max(this.komutIndis - 1, 0);
        break;
      case "Enter":
        olay.preventDefault();
        void this.#komutSec(liste[this.komutIndis]);
        break;
    }
  }
  async #komutSec(eylem?: {
    calistir(): void | Promise<void>;
  }): Promise<void> {
    if (!eylem) return;
    this.#komutKapat();
    this.komutGirisEl?.blur();
    await eylem.calistir();
  }
  #komutListe() {
    const liste = paletSuz(paletEylemleri(this.#menuBaglami), this.komutSorgu);
    if (liste.length === 0)
      return html`<div class="komut-liste">
        <div class="komut-bos">${t("komutpalet.bos")}</div>
      </div>`;
    return html`<ul class="komut-liste">
      ${liste.map(
        (e, i) => html`<li
          class="komut-oge ${i === this.komutIndis ? "sec" : ""}"
          @mousedown=${(ev: Event) => ev.preventDefault()}
          @mouseenter=${() => (this.komutIndis = i)}
          @click=${() => this.#komutSec(e)}
        >
          <span class="etiket">${e.etiket}</span>
          <span class="ipucu">${e.ipucu}</span>
        </li>`,
      )}
    </ul>`;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.dataset.platform = window.api.platform;
    temaYonetici.baslat();
    dilYonetici.baslat();
    this.temaId = temaYonetici.mevcutId;

    // Belge değişince Üst Çubuğu güncelle (dosya adı).
    this.#depoCoz = this.#depo.dinle(() => {
      this.acikDosyaAdi = this.#depo.kaynak?.ad;
    });
    // Dil değişince tüm metinleri yeniden çiz.
    this.#dilCoz = dilYonetici.dinle(() => {
      this.requestUpdate();
      this.#nativeMenuKur(); // macOS menü etiketleri dile göre tazelensin (TK-36)
    });
    // Geçici bildirimlere (araç/menü/dosya) abone ol → toast.
    this.#bildirimCoz = bildirimServisi.dinle((b) => this.#bildirimGoster(b));
    // Kaydetme sorusu açık/kapalı → modalı çiz.
    this.#degisiklikCoz = degisiklikSor.dinle(
      (acik) => (this.kaydetSorusu = acik),
    );
    // Dışa aktarım profili sorusu açık/kapalı → modalı çiz (TK-37 #10).
    this.#disaAktarCoz = disaAktarSor.dinle(
      (acik) => (this.disaAktarSorusu = acik),
    );
    // Pencere kapanış isteği → kaydedilmemiş değişiklik varsa sor, sonra kapat.
    this.#kapanisCoz = window.api.pencereKapanisinaAbone(
      () => void this.#kapanisIstegi(),
    );
    // Yardım → Hakkında isteği → modalı aç.
    this.#hakkindaCoz = hakkindaServisi.dinle(() => (this.acikHakkinda = true));
    // macOS: native uygulama menüsü (TK-36) — yapıyı gönder, tıklamaları dinle.
    if (window.api.platform === "darwin") {
      this.#menuEylemCoz = window.api.menuEylemineAbone((id) =>
        this.#nativeMenuEylem(id),
      );
      this.#nativeMenuKur();
    }
    // Sekme listesi/aktif değişimi → çubuğu/başlığı tazele.
    this.#sekmeCoz = sekmeYoneticisi.dinle(() => {
      this.acikDosyaAdi = this.#depo.kaynak?.ad;
      this.requestUpdate();
      // Sekme çubuğu görünür/gizli olunca tuval boyutu değişir → tuvalin seçim/sayfa
      // çerçevelerini yeniden konumlandırması için (bir kare sonra) resize tetikle.
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
    window.addEventListener("keydown", this.#klavye);
    // Metin nesnesi seçilince Metin panelini otomatik öne getir (ayrı grup; metin
    // çıkınca önceki panele dön). Görünüm durumu (İlke 9) — undo'ya girmez.
    this.#secimSagCoz = this.#secim.dinle(() => this.#metinPaneliOtomatik());

    void this.surumYukle();
  }

  override disconnectedCallback(): void {
    this.#depoCoz?.();
    this.#dilCoz?.();
    this.#secimSagCoz?.();
    this.#bildirimCoz?.();
    this.#degisiklikCoz?.();
    this.#disaAktarCoz?.();
    this.#menuEylemCoz?.();
    this.#kapanisCoz?.();
    this.#sekmeCoz?.();
    this.#hakkindaCoz?.();
    if (this.#bildirimZaman) clearTimeout(this.#bildirimZaman);
    window.removeEventListener("pointerdown", this.#disMenu, true);
    window.removeEventListener("pointerdown", this.#disDil, true);
    window.removeEventListener("keydown", this.#klavye);
    super.disconnectedCallback();
  }

  /**
   * Pencere kapanış isteği: HERHANGİ bir sekmede kaydedilmemiş değişiklik varsa sor;
   * "Kaydet" ise her kirli sekmeyi sırayla (aktif yapıp) kaydet. Onaylanırsa kapat.
   */
  async #kapanisIstegi(): Promise<void> {
    let kapat = true;
    try {
      // Her kirli sekme için AYRI sor (modal o sekmenin adını gösterir; çoğul kayıtta
      // tek mesaj yanıltıcı olmasın — degisiklikSor kuyruğu zaten sıralı tutar).
      const kirliler = sekmeYoneticisi.sekmeler
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.belge.degisti);
      for (const { i } of kirliler) {
        sekmeYoneticisi.aktifSec(i); // modal + kaydetme bu sekmeyi hedefler
        const cevap = await degisiklikSor.sor();
        if (cevap === "iptal") {
          kapat = false;
          break;
        }
        if (cevap === "kaydet" && !(await kaydetBelge(this.#menuBaglami))) {
          kapat = false; // kayıt iptal/başarısız → kapatma
          break;
        }
        // 'kaydetme' → o sekmeyi at, sonrakine geç
      }
    } catch {
      // Beklenmeyen hata: kullanıcıyı kapatamaz pencerede bırakma (asılı kalma).
      kapat = true;
    }
    if (kapat) window.api.pencereKapatGercek();
  }

  /** "+" sekme: "Yeni" akışı (belge varsa yeni sekmede boş tuval). */
  #sekmeYeni(): void {
    yeniBelge(this.#menuBaglami);
  }

  /** Bir sekmeyi kapatır; kaydedilmemiş değişiklik varsa önce sorar. */
  async #sekmeKapat(indis: number): Promise<void> {
    const sekme = sekmeYoneticisi.sekmeler[indis];
    if (!sekme) return;
    if (sekme.belge.degisti) {
      sekmeYoneticisi.aktifSec(indis); // soru/kayıt bu sekmeyi hedeflesin
      const cevap = await degisiklikSor.sor();
      if (cevap === "iptal") return;
      if (cevap === "kaydet" && !(await kaydetBelge(this.#menuBaglami))) return;
    }
    sekmeYoneticisi.sekmeKapat(indis);
  }

  override firstUpdated(): void {
    this.panelleriYerlestir();
  }

  private async surumYukle(): Promise<void> {
    this.surum = await window.api.surumBilgisiAl();
  }

  /** Registry'deki panelleri bölgelerine yerleştirir (İlke 5). */
  private panelleriYerlestir(): void {
    const baglam = {
      depo: this.#depo,
      secim: this.#secim,
      gecmis: this.#gecmis,
      oynatma: this.#oynatma,
    };
    const yerlestir = (bolge: PanelBolgesi, kap: HTMLElement): void => {
      for (const kayit of panelKayitDefteri.bolgedekiler(bolge)) {
        kap.append(kayit.olustur(baglam));
      }
    };
    yerlestir("sol", this.sol);
    yerlestir("merkez", this.tuvalKap); // tuval, sekme çubuğunun altındaki kaba
    yerlestir("alt", this.altBolge);
    // Sağ paneller içeriğe konur ama aynı anda yalnız biri görünür (Y7).
    for (const kayit of panelKayitDefteri.bolgedekiler("sag")) {
      const el = kayit.olustur(baglam);
      this.#sagPanelleri.set(kayit.id, el);
      this.sagIcerik.append(el);
    }
    if (!this.#sagPanelleri.has(this.aktifSag ?? "")) {
      this.aktifSag = panelKayitDefteri.bolgedekiler("sag")[0]?.id ?? null;
    }
    this.#sagGorunurluk();
  }

  /** Yalnız aktif sağ paneli gösterir (diğerlerini gizler). */
  #sagGorunurluk(): void {
    for (const [id, el] of this.#sagPanelleri) {
      el.style.display = id === this.aktifSag ? "" : "none";
    }
  }

  /** Ray simgesine tıklama: paneli aç / zaten açıksa kapat (katla). */
  private sagSec(id: string): void {
    this.aktifSag = this.aktifSag === id ? null : id;
    // Kullanıcı elle panel değiştirdiyse otomatik geri-dönüş hedefini sıfırla.
    this.#sagMetinOncesi = null;
    this.#sagGorunurluk();
  }

  /**
   * Seçim metin nesnesiyse Metin panelini öne getirir; metinden çıkınca önceki
   * panele döner. (Görünüm durumu, İlke 9 → undo'ya girmez.)
   */
  #metinPaneliOtomatik(): void {
    if (!this.#sagPanelleri.has("metin")) return;
    const d = this.#secim.secili;
    const metinMi =
      !!d &&
      (d.etiket === "text" || d.etiket === "tspan" || d.etiket === "textPath");
    if (metinMi && this.aktifSag !== "metin") {
      this.#sagMetinOncesi = this.aktifSag;
      this.aktifSag = "metin";
      this.#sagGorunurluk();
    } else if (!metinMi && this.aktifSag === "metin") {
      this.aktifSag = this.#sagMetinOncesi; // önceki panele (ya da kapalıya) dön
      this.#sagMetinOncesi = null;
      this.#sagGorunurluk();
    }
  }

  /** Sağ içerik genişliğini tutamaçla yeniden boyutlandırır. */
  private sagBoyutBasla(olay: PointerEvent): void {
    olay.preventDefault();
    const basX = olay.clientX;
    const basGenislik = this.sagGenislik;
    const hareket = (o: PointerEvent): void => {
      this.sagGenislik = Math.max(
        180,
        Math.min(640, basGenislik + (basX - o.clientX)),
      );
    };
    const birak = (): void => {
      window.removeEventListener("pointermove", hareket);
      window.removeEventListener("pointerup", birak);
    };
    window.addEventListener("pointermove", hareket);
    window.addEventListener("pointerup", birak);
  }

  /**
   * macOS native menü yapısını (TK-36) registry'den üretip main'e gönderir.
   * Etiketler yerelleştirilir; eylem mantığı KOPYALANMAZ (tıklama id'yi geri yollar,
   * {@link #nativeMenuEylem} registry'yi çalıştırır). Yalnız darwin'de anlamlı.
   */
  #nativeMenuKur(): void {
    if (window.api.platform !== "darwin") return;
    const gruplar = menuKayitDefteri.gruplar().map((g) => ({
      etiket: t(`menu.grup.${g.grup}`),
      ogeler: g.ogeler.map((o) => ({ id: o.id, etiket: t(o.etiketAnahtari) })),
    }));
    window.api.uygulamaMenusunuKur(gruplar);
  }

  /** Native menü ögesi tıklandı → registry eylemini id ile çalıştır (TK-36). */
  #nativeMenuEylem(id: string): void {
    for (const g of menuKayitDefteri.gruplar())
      for (const o of g.ogeler)
        if (o.id === id) {
          void o.calistir(this.#menuBaglami);
          return;
        }
  }

  /** Registry menü grupları, görünüm öğeleri olarak. (Dil artık üst çubukta — dünya simgesi.) */
  private menuGruplari(): MenuGrubu[] {
    const gruplar: MenuGrubu[] = menuKayitDefteri.gruplar().map((g) => ({
      id: g.grup,
      ogeler: g.ogeler.map((oge) => ({
        etiket: t(oge.etiketAnahtari),
        calistir: () => oge.calistir(this.#menuBaglami),
      })),
    }));
    // Dosya grubuna dinamik "Son Dosyalar" alt menüsünü enjekte et (registry
    // statik; bu liste oturuma göre değişir).
    const dosyaGrubu = gruplar.find((g) => g.id === "dosya");
    const son = sonDosyalar.liste();
    if (dosyaGrubu && son.length > 0) {
      const acIdx = dosyaGrubu.ogeler.findIndex(
        (o) => o.etiket === t("menu.dosya.ac"),
      );
      const ekIndis = acIdx >= 0 ? acIdx + 1 : dosyaGrubu.ogeler.length;
      dosyaGrubu.ogeler.splice(ekIndis, 0, {
        etiket: t("menu.dosya.son"),
        altOgeler: son.map((r) => ({
          etiket: r.ad,
          ipucu: r.yol, // tam yol hover'da görünür (yalnız ad değil)
          calistir: () => void yoldanYukle(this.#menuBaglami, r.yol),
        })),
      });
    }
    return gruplar;
  }

  private menuModaGec(): void {
    this.menuModu = true;
    this.menuOdak = -1;
    // TK-1: menü açılınca ilk grup (Dosya) zaten açık olur.
    this.acikGrup = this.menuGruplari()[0]?.id ?? null;
    window.addEventListener("pointerdown", this.#disMenu, true);
  }

  private menuModunuKapat(): void {
    if (!this.menuModu) return;
    this.menuModu = false;
    this.acikGrup = null;
    this.menuOdak = -1;
    window.removeEventListener("pointerdown", this.#disMenu, true);
  }

  // TK-1: gruplar arası geçiş hover ile (tıklama da çalışır).
  private grupAc(id: string): void {
    this.acikGrup = id;
    this.menuOdak = -1;
  }

  private temaSec(olay: Event): void {
    const id = (olay.target as HTMLSelectElement).value;
    temaYonetici.uygula(id);
    this.temaId = id;
  }

  /** Dil açılırını aç/kapat; açıkken dışarı tıklama dinleyicisi ekler/çıkarır. */
  #dilAcKapat(): void {
    this.dilAcik = !this.dilAcik;
    if (this.dilAcik)
      window.addEventListener("pointerdown", this.#disDil, true);
    else window.removeEventListener("pointerdown", this.#disDil, true);
  }

  /** Dili seçer ve açılırı kapatır. */
  #dilSec(kod: string): void {
    dilYonetici.ayarla(kod);
    this.dilAcik = false;
    window.removeEventListener("pointerdown", this.#disDil, true);
  }

  /** Dil açılırı dışına tıklama → kapat (composedPath gölge-DOM'u kapsar). */
  readonly #disDil = (olay: Event): void => {
    const iceride = olay
      .composedPath()
      .some(
        (d) => d instanceof HTMLElement && d.classList.contains("dil-secim"),
      );
    if (!iceride) {
      this.dilAcik = false;
      window.removeEventListener("pointerdown", this.#disDil, true);
    }
  };

  override render() {
    const macOS = window.api.platform === "darwin";

    return html`
      <header
        class="ust-bar"
        @dblclick=${() => window.api.pencereBuyutGeriAl()}
      >
        ${this.menuModu ? this.menuCubuguGorunumu() : this.topluGorunumu()}

        <span class="bosluk"></span>

        <div class="komut-ara ${this.komutAcik ? "acik" : ""}">
          <svg
            viewBox="0 0 16 16"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11 L14.5 14.5" stroke-linecap="round" />
          </svg>
          <input
            type="text"
            placeholder=${t("komutpalet.ara")}
            title=${t("komutpalet.ipucu")}
            .value=${this.komutSorgu}
            @focus=${() => (this.komutAcik = true)}
            @input=${this.#komutGiris}
            @keydown=${this.#komutKlavye}
            @blur=${() => (this.komutAcik = false)}
          />
          ${this.komutAcik
            ? ""
            : html`<kbd>${macOS ? "⌘K" : "Ctrl+K"}</kbd>`}
          ${this.komutAcik ? this.#komutListe() : ""}
        </div>

        <span class="bosluk"></span>

        <label class="tema-secim">
          ${t("tema.etiket")}
          <select @change=${this.temaSec} .value=${this.temaId}>
            ${temaKayitDefteri
              .hepsi()
              .map(
                (tema) => html`
                  <option value=${tema.id} ?selected=${tema.id === this.temaId}>
                    ${tema.etiket}
                  </option>
                `,
              )}
          </select>
        </label>

        <div class="dil-secim">
          <button
            class="dil-dugme ${this.dilAcik ? "acik" : ""}"
            title=${t("menu.grup.dil")}
            aria-label=${t("menu.grup.dil")}
            @click=${() => this.#dilAcKapat()}
          >
            <svg
              viewBox="0 0 16 16"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
            >
              <circle cx="8" cy="8" r="6.3" />
              <path d="M1.8 8h12.4" />
              <path
                d="M8 1.7c2.5 1.8 2.5 10.8 0 12.6 M8 1.7c-2.5 1.8-2.5 10.8 0 12.6"
              />
            </svg>
          </button>
          ${this.dilAcik
            ? html`<div class="dil-menu">
                ${dilYonetici.dilleriAl().map(
                  (dil) =>
                    html`<button
                      class="dil-oge"
                      @click=${() => this.#dilSec(dil.kod)}
                    >
                      <span>${dil.ad}</span>
                      ${dil.kod === dilYonetici.mevcut
                        ? html`<span class="iz">✓</span>`
                        : ""}
                    </button>`,
                )}
              </div>`
            : ""}
        </div>

        ${macOS ? "" : html`<pencere-kontrolleri></pencere-kontrolleri>`}
      </header>

      <div class="govde">
        <aside class="sol"></aside>
        <main class="merkez">
          ${sekmeYoneticisi.sekmeler.length >= 2
            ? html`<sekme-cubugu
                @sekme-kapat=${(e: CustomEvent<number>) =>
                  void this.#sekmeKapat(e.detail)}
                @sekme-yeni=${() => void this.#sekmeYeni()}
              ></sekme-cubugu>`
            : ""}
          <div class="tuval-kap"></div>
        </main>
        <aside class="sag">
          <div
            class="sag-tutamac"
            title="Genişliği sürükle"
            @pointerdown=${(e: PointerEvent) => this.sagBoyutBasla(e)}
          ></div>
          <div
            class="sag-icerik"
            ?hidden=${this.aktifSag === null}
            style="width:${this.sagGenislik}px"
          ></div>
          <nav class="sag-ray">
            ${panelKayitDefteri
              .bolgedekiler("sag")
              .map(
                (p) => html`
                  <button
                    class=${this.aktifSag === p.id ? "aktif" : ""}
                    title=${p.baslik}
                    aria-label=${p.baslik}
                    @click=${() => this.sagSec(p.id)}
                  >
                    ${p.ikon ?? p.baslik.slice(0, 1).toLocaleUpperCase("tr")}
                  </button>
                `,
              )}
          </nav>
        </aside>
      </div>

      <div class="alt-bolge"></div>

      ${this.bildirim
        ? html`<div class="toast ${this.bildirim.tur}" role="status">
            ${this.bildirim.mesaj}
          </div>`
        : ""}
      ${this.kaydetSorusu ? this.#kaydetModali() : ""}
      ${this.disaAktarSorusu ? this.#disaAktarModali() : ""}
      ${this.acikHakkinda ? this.#hakkindaModali() : ""}
    `;
  }

  /** Dışa aktarım profili seçim modalı (TK-37 #10): Uygulama-içi / Geniş uyumluluk. */
  #disaAktarModali() {
    return html`
      <div
        class="modal-perde"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) disaAktarSor.cevapla(null);
        }}
      >
        <div class="modal disa-aktar" role="dialog" aria-modal="true">
          <h2>${t("dialog.disaAktar.baslik")}</h2>
          <p>${t("dialog.disaAktar.mesaj")}</p>
          <div class="profiller">
            <button
              class="profil"
              @click=${() => disaAktarSor.cevapla("blink")}
            >
              <span class="ad">${t("dialog.disaAktar.blink.ad")}</span>
              <span class="aciklama"
                >${t("dialog.disaAktar.blink.aciklama")}</span
              >
            </button>
            <button
              class="profil birincil"
              @click=${() => disaAktarSor.cevapla("genis-uyumluluk")}
            >
              <span class="ad">${t("dialog.disaAktar.genis.ad")}</span>
              <span class="aciklama"
                >${t("dialog.disaAktar.genis.aciklama")}</span
              >
            </button>
          </div>
          <div class="dugmeler">
            <button @click=${() => disaAktarSor.cevapla(null)}>
              ${t("dialog.iptal")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** Hakkında penceresi (Yardım → Hakkında) — uygulama + sürüm bilgileri. */
  #hakkindaModali() {
    return html`
      <div
        class="modal-perde"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) this.acikHakkinda = false;
        }}
      >
        <div class="modal hakkinda" role="dialog" aria-modal="true">
          <h2>${t("uygulama.ad")}</h2>
          ${this.surum
            ? html`<div class="surumler">
                <span>${t("durum.surum", { surum: this.surum.uygulama })}</span>
                <span
                  >${t("durum.electron", { surum: this.surum.electron })}</span
                >
                <span
                  >${t("durum.chromium", { surum: this.surum.chrome })}</span
                >
                <span>${t("durum.node", { surum: this.surum.node })}</span>
              </div>`
            : html`<p>${t("durum.surumYukleniyor")}</p>`}
          <div class="dugmeler">
            <button
              class="birincil"
              @click=${() => (this.acikHakkinda = false)}
            >
              ${t("dialog.kapat")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** Kaydedilmemiş değişiklik modalı (Kaydet / Kaydetme / İptal). */
  #kaydetModali() {
    const ad = this.acikDosyaAdi ?? t("dosya.yeniAd");
    return html`
      <div
        class="modal-perde"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) degisiklikSor.cevapla("iptal");
        }}
      >
        <div class="modal" role="dialog" aria-modal="true">
          <h2>${t("dialog.kaydetSor.baslik")}</h2>
          <p>${t("dialog.kaydetSor.mesaj", { ad })}</p>
          <div class="dugmeler">
            <button
              class="tehlike"
              @click=${() => degisiklikSor.cevapla("kaydetme")}
            >
              ${t("dialog.kaydetme")}
            </button>
            <button @click=${() => degisiklikSor.cevapla("iptal")}>
              ${t("dialog.iptal")}
            </button>
            <button
              class="birincil"
              @click=${() => degisiklikSor.cevapla("kaydet")}
            >
              ${t("dialog.kaydet")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** Toplu mod: hamburger · "SVG Editör" · dosya adı. */
  private topluGorunumu() {
    // macOS'ta üst menü native uygulama menüsüdür (TK-36) → hamburger gizlenir.
    const macOS = window.api.platform === "darwin";
    return html`
      ${macOS
        ? ""
        : html`<button
            class="hamburger"
            title=${t("menu.ac")}
            aria-label=${t("menu.ac")}
            @click=${this.menuModaGec}
          >
            <span></span><span></span><span></span>
          </button>`}
      <span class="ad">${t("uygulama.ad")}</span>
      ${this.acikDosyaAdi
        ? html`<span class="dosya">${this.acikDosyaAdi}</span>`
        : ""}
    `;
  }

  /** Menü modu: yatay menü çubuğu (Dosya · Düzen · Dil…). */
  private menuCubuguGorunumu() {
    return html`
      <nav class="menu-cubugu">
        ${this.menuGruplari().map(
          (grup) => html`
            <div class="menu-grup ${this.acikGrup === grup.id ? "acik" : ""}">
              <button
                class="grup-dugme"
                @mouseenter=${() => this.grupAc(grup.id)}
                @click=${() => this.grupAc(grup.id)}
              >
                ${t(`menu.grup.${grup.id}`)}
              </button>
              ${this.acikGrup === grup.id
                ? html`
                    <div class="menu-acilir" @kapat=${this.menuModunuKapat}>
                      <uygulama-menusu
                        .ogeler=${grup.ogeler}
                        .odakIndis=${this.menuOdak}
                      ></uygulama-menusu>
                    </div>
                  `
                : ""}
            </div>
          `,
        )}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "uygulama-kabugu": UygulamaKabugu;
  }
}
