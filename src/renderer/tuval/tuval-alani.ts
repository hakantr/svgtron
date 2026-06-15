import { LitElement, html, css } from "lit";
import { customElement, query } from "lit/decorators.js";
import type { BelgeDeposu } from "../../cekirdek/belge/belge-deposu";
import type { Belge } from "../../cekirdek/belge/belge";
import type { Dugum } from "../../cekirdek/belge/model/dugum";
import type { SecimDeposu } from "../../cekirdek/secim/secim-deposu";
import type { KomutGecmisi } from "../../cekirdek/komutlar/komut-gecmisi";
import type { OynatmaDeposu } from "../../cekirdek/animasyon/oynatma-deposu";
import { panelKayitDefteri } from "../../cekirdek/registry/panel-registry";
import { dilYonetici, t } from "../diller/dil";
import { Yansitici } from "./yansitici";
import { cizimErisimi } from "./cizim-erisimi";
import {
  aracDeposu,
  SURUKLEME_ESIGI,
  type AracBaglami,
  type TuvalNoktasi,
} from "../araclar/arac";
import { OznitelikDegistirKomutu } from "../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { BilesikKomut } from "../../cekirdek/komutlar/dugum-komutlari";
import { MetinKomutu } from "../../cekirdek/komutlar/metin-komutu";
import { say } from "./donusum";
import type { Kilavuz } from "./yapisma";
import { oranKilidi } from "./oran-kilidi";
import { izgara } from "./izgara";
import { kilavuzDeposu } from "./kilavuz-deposu";
import { guzelAdim, tickler } from "./cetvel-yardimci";
import {
  hizalaReferans,
  referansDugum,
} from "../ozellikler/hizalama/hizala-referans";
import { bildirimServisi } from "../kabuk/bildirim-servisi";

/** Grup seçim çerçevesi içerik kenarından bu kadar px DIŞARIDA durur (TK-21). */
const GRUP_BOSLUK = 2;

/**
 * Tuval — ana çalışma alanı (AGENTS.md §9: render + canlı animasyon + seçim).
 *
 * Soyut belge modelini {@link Yansitici} ile DOM'a yansıtır; düzenlemede DOM'u
 * uyumlar (yeniden kurmaz) → animasyon bozulmaz. Tıklama, DOM elemanını
 * `data-kimlik` üzerinden model düğümüne çevirip seçim deposuna yazar (İlke 3).
 * Seçili düğüm, belgeyi kirletmeyen ayrı bir çerçeveyle vurgulanır.
 */
@customElement("tuval-alani")
export class TuvalAlani extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      /* Kendi yığın bağlamını oluştur → cetvel/ızgara/tutamaç z-index'leri tuval
         İÇİNDE kalır, kabuğun menülerinin üstüne SIZMAZ (menüler tuvalin üstünde). */
      isolation: isolate;
      height: 100%;
      overflow: hidden;
    }
    .kaydir {
      position: absolute;
      inset: 0;
      overflow: hidden;
      /* Tuval içeriği (SVG metni dâhil) yerel olarak SEÇİLMESİN → çift-tıkta
         "gri seçim" oluşmaz (düzenleme overlay input ile yapılır). */
      user-select: none;
      -webkit-user-select: none;
      background: repeating-conic-gradient(
          var(--tuval-1) 0% 25%,
          var(--tuval-2) 0% 50%
        )
        50% / 24px 24px;
    }
    .icerik {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      box-sizing: border-box;
      transform-origin: center center;
    }
    .icerik svg {
      max-width: 100%;
      height: auto;
      filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.35));
    }
    .bos {
      color: var(--metin-soluk);
      font-family: system-ui, sans-serif;
    }
    .secim-katman {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .cerceve {
      position: absolute;
      box-sizing: border-box;
      border: 1.5px solid var(--vurgu, #4a90e2);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
      border-radius: 1px;
      opacity: 0.5; /* %50 transparan (taşımada gizlenir) */
    }
    /* Referans nesne (en son seçilen) daha belirgin (§9.6a). */
    .cerceve.ref {
      border-width: 2px;
      box-shadow: 0 0 0 1px var(--vurgu, #4a90e2);
    }
    /* Grup seçimi: içerikten boşluklu + kesik çizgi (nesne seçiminden ayırt et). */
    .cerceve.grup {
      border-style: dashed;
    }
    .kement {
      position: absolute;
      display: none;
      box-sizing: border-box;
      border: 1px dashed rgba(130, 175, 255, 0.95);
      background: rgba(130, 175, 255, 0.12);
      border-radius: 1px;
    }
    /* Yerinde metin düzenleme kutusu (çift-tık / Metin aracı) — konum/font/genişlik
       JS'te. ŞEFFAF zemin + çerçeve YOK → canlı metin gizlenir, düzenleme yerinde
       görünür. Genişlik içeriğe göre büyür (#metinBoyutla); hizaya göre konumlanır. */
    .metin-giris {
      position: absolute;
      display: none;
      z-index: 20;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--metin);
      caret-color: var(--vurgu, #4a90e2);
      outline: none;
      white-space: pre;
      line-height: 1;
    }
    /* Izgara (TK-37 #2) — ekran-uzayı CSS arka planı; #izgaraCiz hem arka planı
       hem KONUMU/BOYUTU kök SVG çizim alanına kıstar (svg dışına taşmaz). */
    .izgara {
      position: absolute;
      display: none;
      pointer-events: none;
    }
    /* Kullanıcı kılavuzları (TK-37 #2) — #kullaniciKilavuzCiz imperatif doldurur. */
    .kullanici-kilavuzlar {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .uguide {
      position: absolute;
      background: var(--kilavuz-user, #16b8c4);
      pointer-events: auto;
    }
    .uguide.yatay {
      left: 0;
      right: 0;
      height: 1px;
      cursor: ns-resize;
    }
    .uguide.dikey {
      top: 0;
      bottom: 0;
      width: 1px;
      cursor: ew-resize;
    }
    .uguide::after {
      content: "";
      position: absolute;
      inset: -3px 0; /* yatay için tıklama bandını genişlet */
    }
    .uguide.dikey::after {
      inset: 0 -3px;
    }
    /* Cetveller (TK-37 #2) — #cetvelCiz tick/etiketleri imperatif doldurur. */
    .cetvel {
      position: absolute;
      display: none;
      background: var(--yuzey-2, rgba(127, 127, 127, 0.1));
      color: var(--metin-soluk);
      z-index: 5;
      font-size: 9px;
    }
    /* SVG yer-tutuculu (replaced) eleman olduğundan left/right ile ESNEMEZ; açık
       width/height verilmezse içsel 300×150 boyutunda kalır → cetvel kısa görünür.
       Bu yüzden boyutu calc ile tam uzunluğa sabitliyoruz. */
    .cetvel-ust {
      top: 0;
      left: 20px;
      right: 0;
      width: calc(100% - 20px);
      height: 20px;
      cursor: ns-resize;
      border-bottom: 1px solid var(--kenarlik);
    }
    .cetvel-sol {
      top: 20px;
      left: 0;
      bottom: 0;
      width: 20px;
      height: calc(100% - 20px);
      cursor: ew-resize;
      border-right: 1px solid var(--kenarlik);
    }
    .cetvel-kose {
      position: absolute;
      top: 0;
      left: 0;
      width: 20px;
      height: 20px;
      display: none;
      background: var(--yuzey-2, rgba(127, 127, 127, 0.15));
      border-right: 1px solid var(--kenarlik);
      border-bottom: 1px solid var(--kenarlik);
      z-index: 6;
    }
    /* Artboard (sayfa zemini) çerçevesi (TK-23) — belgenin sayfa sınırını gösterir;
       seçimden bağımsız, taşıma sırasında da görünür kalır. Soluk, kesik olmayan
       ince çizgi → tuval içeriğinden ayrışır ama dikkat dağıtmaz. */
    .sayfa-cerceve {
      position: absolute;
      display: none;
      box-sizing: border-box;
      border: 1px solid var(--vurgu, #4a90e2);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
      border-radius: 1px;
      opacity: 0.4;
      pointer-events: none;
    }
    /* Akıllı hizalama kılavuzları (§11.1) — görünüm durumu, undo'ya girmez. */
    .kilavuz {
      position: absolute;
      background: var(--kilavuz, #ff3b8d);
      pointer-events: none;
    }
    .kilavuz.dikey {
      width: 1px;
    }
    .kilavuz.yatay {
      height: 1px;
    }
    /* Aktif aracın bindirmesi (örn. düğüm tutamaçları) — geçirgen kap. */
    .arac-katman {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    /* Boyut/döndürme tutamaçları (tek seçim) */
    .tutamaclar {
      position: absolute;
      inset: 0;
      display: none;
    }
    .tutamac {
      position: absolute;
      width: 7px;
      height: 7px;
      margin: -3.5px 0 0 -3.5px;
      box-sizing: border-box;
      background: #fff;
      border: 1.5px solid var(--vurgu, #4a90e2);
      border-radius: 2px;
      /* Zıt renkli koyu halka: beyaz tutamaç açık zeminde/kutuda da görünür. */
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.55);
      pointer-events: auto;
    }
    .tutamac.dondur {
      border-radius: 50%;
      background: var(--vurgu, #4a90e2);
    }
    .tutamac[data-tip="nw"],
    .tutamac[data-tip="se"] {
      cursor: nwse-resize;
    }
    .tutamac[data-tip="ne"],
    .tutamac[data-tip="sw"] {
      cursor: nesw-resize;
    }
    .tutamac[data-tip="n"],
    .tutamac[data-tip="s"] {
      cursor: ns-resize;
    }
    .tutamac[data-tip="e"],
    .tutamac[data-tip="w"] {
      cursor: ew-resize;
    }
    .tutamac[data-tip="rot"] {
      cursor: grab;
    }
    /* Çizgi uç (yeniden konumlandırma) tutamaçları — boyut yerine uç taşıma. */
    .uc-tutamaclar {
      position: absolute;
      inset: 0;
      display: none;
    }
    .uc-tutamac {
      position: absolute;
      width: 9px;
      height: 9px;
      margin: -4.5px 0 0 -4.5px;
      box-sizing: border-box;
      background: #fff;
      border: 2px solid var(--vurgu, #4a90e2);
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.55); /* zıt renkli halka (açık zeminde de görünür) */
      cursor: move;
      pointer-events: auto;
    }
  `;

  /** Uygulama servisleri (panel oluşturulurken atanır). */
  depo!: BelgeDeposu;
  secim!: SecimDeposu;
  gecmis!: KomutGecmisi;
  oynatma!: OynatmaDeposu;

  @query(".kaydir") private kaydir!: HTMLDivElement;
  @query(".icerik") private icerik!: HTMLDivElement;
  @query(".secim-katman") private katman!: HTMLDivElement;
  @query(".kement") private kement!: HTMLDivElement;
  @query(".metin-giris") private metinGiris?: HTMLInputElement;
  /** Yerinde düzenlenen metin düğümü (yoksa null). */
  #metinDugum: Dugum | null = null;
  /** Düzenlenen elemanın canlı DOM'u (düzenleme süresince gizlenir). */
  #metinEl: SVGGraphicsElement | null = null;
  /** Hizalama ankrajı: tip (start/middle/end), sabit ankraj X'i, üst, yükseklik, font. */
  #metinAnchor: {
    tip: string;
    x: number;
    top: number;
    yukseklik: number;
    font: string;
  } | null = null;
  /** Metin genişliği ölçer (auto-grow için). */
  readonly #olcer = document.createElement("canvas").getContext("2d");
  @query(".izgara") private izgaraKat!: HTMLDivElement;
  @query(".cetvel-ust") private cetvelUst!: SVGSVGElement;
  @query(".cetvel-sol") private cetvelSol!: SVGSVGElement;
  @query(".cetvel-kose") private cetvelKose!: HTMLDivElement;
  @query(".kullanici-kilavuzlar") private kullaniciKilavuzKat!: HTMLDivElement;
  @query(".sayfa-cerceve") private sayfaCerceve!: HTMLDivElement;
  @query(".kilavuzlar") private kilavuzlar!: HTMLDivElement;
  @query(".arac-katman") private aracKat!: HTMLDivElement;
  @query(".tutamaclar") private tutamaclar!: HTMLDivElement;
  @query(".uc-tutamaclar") private ucTutamaclar!: HTMLDivElement;

  /** Cetvel imleç göstergesi (kullanıcı isteği): fareyi izleyen ince çizgiler. */
  #imlecUst?: SVGLineElement;
  #imlecSol?: SVGLineElement;
  /** İmleç çizgisinin yanındaki sayısal koordinat (kullanıcı/viewBox değeri). */
  #imlecUstYazi?: SVGTextElement;
  #imlecSolYazi?: SVGTextElement;
  /** Son fare client konumu (cetvel göstergesi için); fare tuvalden çıkınca null. */
  #sonImlecX: number | null = null;
  #sonImlecY: number | null = null;

  /** Seçili düğüm kimliği → çerçeve divi. */
  readonly #cerceveler = new Map<string, HTMLDivElement>();

  // Tutamaç (boyut/döndürme) durumu.
  #tutamac: string | null = null;
  #tutamacBas: { x: number; y: number } | null = null;
  // `donmus`: nesnenin kendi transform'unda rotasyon/eğme var mı? Varsa boyutlandırma
  // üniforma zorlanır (non-uniform ölçek rotate ile birleşince shear üretirdi).
  #tutamacAsil: {
    transform: string;
    ctm: DOMMatrix;
    bbox: DOMRect;
    donmus: boolean;
  } | null = null;

  // Çizgi uç tutamacı durumu ('1' = (x1,y1), '2' = (x2,y2)).
  #ucDurum: {
    uc: "1" | "2";
    dugum: Dugum;
    ctm: DOMMatrix;
    bas: { x: number; y: number };
    ilk: { x: number; y: number };
  } | null = null;

  readonly #yansitici = new Yansitici();
  #sonBelge: Belge | null = null;
  /**
   * Belge (≈ sekme) başına görünüm durumu (yakınlaştırma/kaydırma). Sekme değişince
   * çıkan belgeninki saklanır, girene geri yüklenir → sekme değişiminde zoom/pan
   * KORUNUR (yalnız ilk görülen/yeni belgede sıfırlanır). (TK-30 inceleme düzeltmesi.)
   */
  readonly #gorunumler = new WeakMap<
    Belge,
    { olcek: number; panX: number; panY: number }
  >();
  /** Son animasyon kümesi imzası (WAAPI sayısı + SMIL eleman sayısı). */
  #sonAnimImza = "";

  #depoCoz?: () => void;
  #secimCoz?: () => void;
  #dilCoz?: () => void;
  #aracCoz?: () => void;
  #hizalaCoz?: () => void;
  #izgaraCoz?: () => void;
  #kilavuzCoz?: () => void;
  #oncekiArac = aracDeposu.aktif;
  #rafKimligi = 0;
  #basNokta: { x: number; y: number } | null = null;
  #suruklendi = false;
  #ortaPan: { x: number; y: number } | null = null;
  // Görünüm dönüşümü (yakınlaştırma/kaydırma) — görünüm durumu (İlke 9).
  #olcek = 1;
  #panX = 0;
  #panY = 0;

  /** Çalışma alanında çizili kök SVG (zaman çizelgesi/Playback için). */
  get cizilenKok(): SVGSVGElement | null {
    return this.#yansitici.kok;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#depoCoz = this.depo.dinle(() => this.belgeyiGuncelle());
    this.#secimCoz = this.secim.dinle(() => this.secimDegisti());
    this.#dilCoz = dilYonetici.dinle(() => this.belgeyiGuncelle());
    // Araç değişimi: eskiyi pasifle, yeniyi etkinle (+ imleç güncelle).
    this.#aracCoz = aracDeposu.dinle(() => {
      const yeni = aracDeposu.aktif;
      if (this.#oncekiArac !== yeni) {
        this.#oncekiArac?.pasiflesti?.(this.#aracBaglami());
        yeni?.etkinlesti?.(this.#aracBaglami());
        this.#oncekiArac = yeni;
      }
      this.requestUpdate();
    });
    window.addEventListener("resize", this.#konumla);
    window.addEventListener("keydown", this.#zoomKlavye);
    window.addEventListener("keydown", this.#aracTus);
    // Hizalama referans modu değişince (§9.6a) referans işaretini tazele.
    this.#hizalaCoz = hizalaReferans.dinle(() => this.#konumla());
    // Izgara tercihi değişince (TK-37 #2) ızgarayı yeniden çiz.
    this.#izgaraCoz = izgara.dinle(() => this.#izgaraCiz());
    // Cetvel/kılavuz değişince (TK-37 #2) yeniden çiz.
    this.#kilavuzCoz = kilavuzDeposu.dinle(() => {
      this.#cetvelCiz();
      this.#kullaniciKilavuzCiz();
    });
    // Denetçi, efektif (hesaplanmış) stilleri okuyabilsin diye render erişimi yayınla.
    cizimErisimi.kaynakAyarla((kimlik) => this.#yansitici.elemanGetir(kimlik));
  }

  override disconnectedCallback(): void {
    this.#depoCoz?.();
    this.#secimCoz?.();
    this.#dilCoz?.();
    this.#aracCoz?.();
    this.#hizalaCoz?.();
    this.#izgaraCoz?.();
    this.#kilavuzCoz?.();
    window.removeEventListener("resize", this.#konumla);
    window.removeEventListener("keydown", this.#zoomKlavye);
    window.removeEventListener("keydown", this.#aracTus);
    window.removeEventListener("pointermove", this.#tutamacHareket);
    window.removeEventListener("pointerup", this.#tutamacBirak);
    window.removeEventListener("pointermove", this.#ucHareket);
    window.removeEventListener("pointerup", this.#ucBirak);
    this.kaydir?.removeEventListener("wheel", this.#tekerlek);
    this.kaydir?.removeEventListener("pointermove", this.#hover);
    this.kaydir?.removeEventListener("dblclick", this.#cifttik);
    this.removeEventListener("pointermove", this.#cetvelImlecIzle);
    this.removeEventListener("pointerleave", this.#cetvelImlecCik);
    this.#izlemeyiDurdur();
    cizimErisimi.kaynakAyarla(null);
    super.disconnectedCallback();
  }

  override firstUpdated(): void {
    this.kaydir.addEventListener("wheel", this.#tekerlek, { passive: false });
    this.kaydir.addEventListener("pointermove", this.#hover);
    this.kaydir.addEventListener("dblclick", this.#cifttik);
    // Cetvel göstergesi HOST'ta dinlenir → tutamaç/boyutlandırma katmanları üstünde de çalışır.
    this.addEventListener("pointermove", this.#cetvelImlecIzle);
    this.addEventListener("pointerleave", this.#cetvelImlecCik);
    this.belgeyiGuncelle();
  }

  /**
   * Modeli DOM'a yansıtır. Belge örneği değiştiyse (yeni dosya) taze yansıtır;
   * sadece düzenleme olduysa (komut) uyumlar — DOM yeniden kurulmaz, animasyon
   * korunur.
   */
  private belgeyiGuncelle(): void {
    if (!this.icerik) return;
    const belge = this.depo.belge;

    if (belge && belge === this.#sonBelge) {
      this.#yansitici.uyumla(belge.kok); // düzenleme: yamala
      this.#animKumesiKontrol(); // düzenleme animasyon ekledi/kaldırdıysa Playback'i tazele
      this.#konumla();
      return;
    }

    // Çıkan belgenin görünümünü (zoom/pan) sakla — sekmeye dönünce geri yüklenir.
    if (this.#sonBelge) {
      this.#gorunumler.set(this.#sonBelge, {
        olcek: this.#olcek,
        panX: this.#panX,
        panY: this.#panY,
      });
    }
    this.#sonBelge = belge;
    this.icerik.replaceChildren();

    if (!belge) {
      const bos = document.createElement("div");
      bos.className = "bos";
      bos.textContent = t("tuval.bosBelge");
      this.icerik.append(bos);
      this.oynatma.svgAyarla(null);
      this.#konumla();
      return;
    }

    const kok = this.#yansitici.yansit(belge.kok);
    this.icerik.append(kok);
    this.oynatma.svgAyarla(kok);
    this.#sonAnimImza = this.#animImza(kok);
    // Daha önce görülen sekmeye dönüş → kayıtlı görünümü geri yükle; yeni belge → sıfırla.
    const kayit = this.#gorunumler.get(belge);
    if (kayit) {
      this.#olcek = kayit.olcek;
      this.#panX = kayit.panX;
      this.#panY = kayit.panY;
      this.#transformUygula();
    } else {
      this.#gorunumSifirla();
    }
  }

  /** Animasyon kümesi imzası: WAAPI animasyon sayısı + SMIL eleman sayısı. */
  #animImza(kok: SVGSVGElement): string {
    let waapi = 0;
    try {
      waapi = kok.getAnimations({ subtree: true }).length;
    } catch {
      /* getAnimations yoksa 0 */
    }
    const smil = kok.querySelectorAll(
      "animate, animateTransform, animateMotion, animateColor, set, discard",
    ).length;
    return `${waapi}:${smil}`;
  }

  /**
   * Düzenleme animasyon kümesini değiştirdiyse (yeni CSS/SMIL animasyonu
   * eklendi/kaldırıldı) Playback'i durum koruyarak tazele — WaapiPlayback'in
   * kurucuda yakaladığı liste bayatlamasın (İlke 3). İmza aynıysa hiçbir şey
   * yapılmaz (oynatma kesintiye uğramaz).
   */
  #animKumesiKontrol(): void {
    const kok = this.#yansitici.kok;
    if (!kok) return;
    const imza = this.#animImza(kok);
    if (imza === this.#sonAnimImza) return;
    this.#sonAnimImza = imza;
    this.oynatma.tazele(kok);
  }

  /** Aktif araca verilen bağlam (koordinat/isabet + servisler). */
  #aracBaglami(): AracBaglami {
    return {
      depo: this.depo,
      secim: this.secim,
      gecmis: this.gecmis,
      kok: this.#yansitici.kok,
      svgKonum: (o) => this.#svgKonum(o),
      isabet: (o) => this.#isabet(o),
      eleman: (k) => this.#yansitici.elemanGetir(k),
      gorunumKaydir: (dx, dy) => this.#kaydir(dx, dy),
      gorunumYakinlastir: (f) => this.#yakinlastir(f),
      kementCiz: (d) => this.#kementCiz(d),
      kilavuzCiz: (k) => this.#kilavuzCiz(k),
      aracKatmani: () => this.aracKat,
      bildir: (mesaj, tur) => bildirimServisi.bildir(mesaj, tur),
      metinDuzenle: (d) => this.#metinDuzenleBasla(d),
    };
  }

  // --- Yerinde metin düzenleme ---
  /** Metin düğümünün üzerine bir giriş kutusu açar (çift-tık ya da Metin aracı). */
  #metinDuzenleBasla(dugum: Dugum): void {
    this.#metinDugum = dugum;
    window.getSelection()?.removeAllRanges(); // yerel "gri seçim" kalıntısını temizle
    this.#konumla(); // seçim çerçevesini gizle (düzenleme overlay'i ile çakışmasın)
    // Yeni oluşturulan metin için render+yerleşim hazır olsun → bir kare bekle.
    requestAnimationFrame(() => {
      const giris = this.metinGiris;
      const el = this.#yansitici.elemanGetir(dugum.kimlik);
      if (!giris || !(el instanceof SVGGraphicsElement) || this.#metinDugum !== dugum)
        return;
      const r = el.getBoundingClientRect();
      const h = this.getBoundingClientRect();
      const ctm = el.getScreenCTM();
      const olcek = ctm ? Math.abs(ctm.a) : 1;
      const k = getComputedStyle(el);
      const px = (parseFloat(k.fontSize) || 16) * olcek;
      // Hizalama ankrajı: text-anchor'a göre SABİT nokta (start=sol, middle=orta, end=sağ).
      const tip = k.getPropertyValue("text-anchor").trim() || "start";
      const sol = r.left - h.left;
      const sag = r.right - h.left;
      const x = tip === "middle" ? (sol + sag) / 2 : tip === "end" ? sag : sol;
      const font = `${k.fontStyle} ${k.fontWeight} ${px}px ${k.fontFamily}`;
      const renk = k.fill && k.fill !== "none" ? k.fill : "var(--metin)";
      this.#metinAnchor = {
        tip,
        x,
        top: r.top - h.top,
        yukseklik: Math.max(r.height, px * 1.3),
        font,
      };
      this.#metinEl = el;
      el.style.visibility = "hidden"; // canlı metni gizle (overlay ŞEFFAF; çift metin olmasın)
      giris.value = dugum.metin ?? el.textContent ?? "";
      giris.style.display = "block";
      giris.style.font = font;
      giris.style.color = renk;
      giris.style.top = `${r.top - h.top}px`;
      giris.style.height = `${this.#metinAnchor.yukseklik}px`;
      giris.style.textAlign =
        tip === "middle" ? "center" : tip === "end" ? "right" : "left";
      this.#metinBoyutla(); // genişlik + hizaya göre konum
      giris.focus();
      giris.select();
    });
  }

  /** Giriş kutusunu içeriğe göre büyütür ve ankraja (hizaya) göre konumlandırır. */
  #metinBoyutla(): void {
    const giris = this.metinGiris;
    const a = this.#metinAnchor;
    if (!giris || !a || !this.#olcer) return;
    this.#olcer.font = a.font;
    const w = this.#olcer.measureText(giris.value || " ").width + 3;
    giris.style.width = `${Math.max(w, 6)}px`;
    // start: sol sabit (sağa büyür) · middle: orta sabit (iki yana) · end: sağ sabit (sola).
    const left = a.tip === "middle" ? a.x - w / 2 : a.tip === "end" ? a.x - w : a.x;
    giris.style.left = `${left}px`;
  }

  /** Yazdıkça boyutu/konumu güncelle (auto-grow). */
  readonly #metinGirisGirdi = (): void => this.#metinBoyutla();

  /** Düzenlemeyi bitirir; iptal değilse içerik değişimini Command ile yazar (İlke 2). */
  #metinDuzenleBitir(iptal: boolean): void {
    const dugum = this.#metinDugum;
    if (!dugum) return;
    this.#metinDugum = null;
    const giris = this.metinGiris;
    const yeni = giris?.value ?? "";
    if (giris) giris.style.display = "none";
    if (this.#metinEl) {
      this.#metinEl.style.visibility = ""; // canlı metni geri göster
      this.#metinEl = null;
    }
    this.#metinAnchor = null;
    window.getSelection()?.removeAllRanges();
    this.#konumla(); // seçim çerçevesini geri getir
    if (iptal) return;
    const belge = this.depo.belge;
    if (belge && yeni !== (dugum.metin ?? ""))
      this.gecmis.calistir(new MetinKomutu(belge, dugum, yeni));
  }

  /** Düzenleme kutusu klavyesi: Enter onaylar, Esc iptal (araç kısayolları tetiklenmez). */
  readonly #metinGirisTus = (olay: KeyboardEvent): void => {
    olay.stopPropagation();
    if (olay.key === "Enter") {
      olay.preventDefault();
      this.#metinDuzenleBitir(false);
    } else if (olay.key === "Escape") {
      olay.preventDefault();
      this.#metinDuzenleBitir(true);
    }
  };

  /** Çift tık: bir metin düğümü ise yerinde düzenlemeye gir. */
  readonly #cifttik = (olay: MouseEvent): void => {
    const hedef = olay.target;
    if (!(hedef instanceof Element)) return;
    const kimlik = hedef.closest("[data-kimlik]")?.getAttribute("data-kimlik");
    const dugum = kimlik ? this.depo.belge?.dugumBul(kimlik) : null;
    if (
      dugum &&
      (dugum.etiket === "text" ||
        dugum.etiket === "tspan" ||
        dugum.etiket === "textPath")
    ) {
      olay.preventDefault();
      this.#metinDuzenleBasla(dugum);
    }
  };

  // --- Görünüm (yakınlaştırma/kaydırma) ---
  #transformUygula(): void {
    if (this.icerik) {
      this.icerik.style.transform = `translate(${this.#panX}px, ${this.#panY}px) scale(${this.#olcek})`;
    }
    this.#konumla();
  }
  /**
   * Yakınlaştırır. `ankraj` (imleç ekran konumu) verilirse o nokta SABİT kalır,
   * gerisi onun çevresinde ölçeklenir (zoom-to-cursor). `.icerik` ölçeği merkez
   * (transform-origin) etrafında uygulandığından, ankraj sabitliği pan ile telafi
   * edilir: pan1 = (1-k)·(C-O) + k·pan0  (O = kutu merkezi, C = imleç, k = gerçek
   * uygulanan ölçek oranı). Ankraj yoksa merkez etrafında (klavye/araç zoom'u).
   */
  #yakinlastir(faktor: number, ankraj?: { x: number; y: number }): void {
    // Üst sınır 24× (aşırı yakınlaştırmada dev kompozit katman → tile memory
    // uyarısı); alt sınır 0.75 (%75) — daha fazla küçültmeye izin verilmez.
    const yeni = Math.min(24, Math.max(0.75, this.#olcek * faktor));
    const k = yeni / this.#olcek; // clamp sonrası gerçek oran
    if (ankraj && this.kaydir && k !== 1) {
      const r = this.kaydir.getBoundingClientRect();
      const cx = ankraj.x - (r.left + r.width / 2);
      const cy = ankraj.y - (r.top + r.height / 2);
      this.#panX = (1 - k) * cx + k * this.#panX;
      this.#panY = (1 - k) * cy + k * this.#panY;
    }
    this.#olcek = yeni;
    this.#transformUygula();
  }
  #kaydir(dx: number, dy: number): void {
    this.#panX += dx;
    this.#panY += dy;
    this.#transformUygula();
  }
  #gorunumSifirla(): void {
    this.#olcek = 1;
    this.#panX = 0;
    this.#panY = 0;
    this.#transformUygula();
  }

  readonly #tekerlek = (olay: WheelEvent): void => {
    olay.preventDefault();
    // İmlecin altındaki nokta sabit kalsın (zoom-to-cursor).
    this.#yakinlastir(olay.deltaY < 0 ? 1.12 : 1 / 1.12, {
      x: olay.clientX,
      y: olay.clientY,
    });
  };

  readonly #zoomKlavye = (olay: KeyboardEvent): void => {
    if (!(olay.ctrlKey || olay.metaKey)) return;
    if (olay.key === "0") {
      olay.preventDefault();
      this.#gorunumSifirla();
    } else if (olay.key === "=" || olay.key === "+") {
      olay.preventDefault();
      this.#yakinlastir(1.2);
    } else if (olay.key === "-") {
      olay.preventDefault();
      this.#yakinlastir(1 / 1.2);
    }
  };

  /** İşaretçi olayını SVG kullanıcı koordinatlarına çevirir. */
  #svgKonum(olay: PointerEvent): TuvalNoktasi {
    const svg = this.#yansitici.kok;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(olay.clientX, olay.clientY).matrixTransform(
      ctm.inverse(),
    );
    return { x: p.x, y: p.y };
  }

  /** Olayın altındaki en üst seçilebilir model düğümü (kök/boşluk → null). */
  #isabet(olay: PointerEvent): Dugum | null {
    const belge = this.depo.belge;
    const hedef = olay.target;
    if (!belge || !(hedef instanceof Element)) return null;
    const isabet = hedef.closest("[data-kimlik]");
    const kimlik = isabet?.getAttribute("data-kimlik");
    if (!kimlik || isabet === this.#yansitici.kok) return null;
    const dugum = belge.dugumBul(kimlik) ?? null;
    // Kilitli düğüm Tuval'den seçilemez (§9.7) → Katmanlar panelinden.
    return dugum?.kilitli ? null : dugum;
  }

  // İşaretçi olaylarını aktif araca devret (§9.2). Sürükleme eşiği ile
  // tıklama/sürükleme ayrımı yapılır (§9.7).
  readonly #bas = (olay: PointerEvent): void => {
    // Orta fare: aktif araçtan bağımsız kaydırma (görünüm durumu).
    if (olay.button === 1) {
      olay.preventDefault();
      this.#ortaPan = { x: olay.clientX, y: olay.clientY };
      window.addEventListener("pointermove", this.#hareket);
      window.addEventListener("pointerup", this.#birak);
      return;
    }
    if (olay.button !== 0) return;
    this.#basNokta = { x: olay.clientX, y: olay.clientY };
    this.#suruklendi = false;
    aracDeposu.aktif?.bas?.(olay, this.#aracBaglami());
    window.addEventListener("pointermove", this.#hareket);
    window.addEventListener("pointerup", this.#birak);
  };

  readonly #hareket = (olay: PointerEvent): void => {
    if (this.#ortaPan) {
      this.#kaydir(
        olay.clientX - this.#ortaPan.x,
        olay.clientY - this.#ortaPan.y,
      );
      this.#ortaPan = { x: olay.clientX, y: olay.clientY };
      return;
    }
    if (this.#basNokta) {
      const dx = olay.clientX - this.#basNokta.x;
      const dy = olay.clientY - this.#basNokta.y;
      if (Math.hypot(dx, dy) > SURUKLEME_ESIGI) this.#suruklendi = true;
    }
    aracDeposu.aktif?.surukle?.(olay, this.#aracBaglami());
  };

  // Tuş basılı DEĞİLken hareket (hover) → aktif araca (örn. kalem ipucu çizgisi).
  readonly #hover = (olay: PointerEvent): void => {
    const arac = aracDeposu.aktif;
    // İmleci aracın konuma-duyarlı tercihine göre güncelle (örn. Metin → "text").
    if (arac && this.kaydir)
      this.kaydir.style.cursor =
        arac.imlecIcin?.(olay, this.#aracBaglami()) ?? arac.imlec ?? "default";
    if (olay.buttons !== 0) return;
    arac?.hareket?.(olay, this.#aracBaglami());
  };

  /**
   * Cetvel imleç göstergesini her harekette güncelle. HOST seviyesinde dinlenir
   * (yalnız .kaydir değil) → boyutlandırma tutamaçları gibi ÜST katmanların
   * üzerindeyken ve boyutlandırma/taşıma sürerken de gösterge kaybolmaz.
   */
  readonly #cetvelImlecIzle = (olay: PointerEvent): void => {
    this.#sonImlecX = olay.clientX;
    this.#sonImlecY = olay.clientY;
    this.#cetvelImlecKonumla();
  };

  /** Fare tuval bileşeninden çıkınca cetvel göstergesini gizle. */
  readonly #cetvelImlecCik = (): void => {
    this.#sonImlecX = null;
    this.#sonImlecY = null;
    this.#cetvelImlecKonumla();
  };

  // Araç etkinken klavye (Enter/Esc gibi) → aktif araca (giriş alanında değilken).
  readonly #aracTus = (olay: KeyboardEvent): void => {
    const hedef = olay.composedPath()[0];
    if (
      hedef instanceof HTMLElement &&
      (hedef.tagName === "INPUT" ||
        hedef.tagName === "TEXTAREA" ||
        hedef.isContentEditable)
    ) {
      return;
    }
    aracDeposu.aktif?.tus?.(olay, this.#aracBaglami());
  };

  readonly #birak = (olay: PointerEvent): void => {
    const dinleyiciKaldir = (): void => {
      window.removeEventListener("pointermove", this.#hareket);
      window.removeEventListener("pointerup", this.#birak);
    };
    if (this.#ortaPan) {
      this.#ortaPan = null;
      dinleyiciKaldir();
      return;
    }
    const arac = aracDeposu.aktif;
    const baglam = this.#aracBaglami();
    arac?.birak?.(olay, baglam);
    if (!this.#suruklendi) arac?.tikla?.(olay, baglam);
    this.#basNokta = null;
    dinleyiciKaldir();
  };

  private secimDegisti(): void {
    if (this.secim.secililer.length > 0) this.#izlemeyiBaslat();
    else this.#izlemeyiDurdur();
    this.#konumla();
  }

  #izlemeyiBaslat(): void {
    if (this.#rafKimligi) return;
    const dongu = (): void => {
      this.#konumla();
      this.#rafKimligi = requestAnimationFrame(dongu);
    };
    this.#rafKimligi = requestAnimationFrame(dongu);
  }

  #izlemeyiDurdur(): void {
    if (this.#rafKimligi) cancelAnimationFrame(this.#rafKimligi);
    this.#rafKimligi = 0;
  }

  /** Belgedeki artboard düğümü (TK-23); yoksa null. */
  #artboardDugumu(): Dugum | null {
    const kok = this.depo.belge?.kok;
    if (!kok) return null;
    for (const c of kok.cocuklar) if (c.artboard) return c;
    return null;
  }

  /**
   * Artboard'un (sayfa zemini) ekran sınırına bir çerçeve çizer (TK-23). Seçimden
   * bağımsızdır → taşıma sırasında bile görünür kalır (bu yüzden #konumla'daki
   * "taşınıyor" korumasından ÖNCE çağrılır).
   */
  #sayfaCercevesiKonumla(): void {
    if (!this.sayfaCerceve) return;
    const dugum = this.#artboardDugumu();
    const el = dugum ? this.#yansitici.elemanGetir(dugum.kimlik) : null;
    if (!dugum || !(el instanceof SVGGraphicsElement) || !el.isConnected) {
      this.sayfaCerceve.style.display = "none";
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      this.sayfaCerceve.style.display = "none";
      return;
    }
    const h = this.getBoundingClientRect();
    this.sayfaCerceve.style.display = "block";
    this.sayfaCerceve.style.left = `${r.left - h.left}px`;
    this.sayfaCerceve.style.top = `${r.top - h.top}px`;
    this.sayfaCerceve.style.width = `${r.width}px`;
    this.sayfaCerceve.style.height = `${r.height}px`;
  }

  /**
   * Izgara CSS arka planını ekran-uzayında kurar (TK-37 #2). Kullanıcı (0,0)'ın
   * ekran konumunu ve adım×ölçek aralığını kök SVG'nin CTM'inden alır → zoom/pan ile
   * tutarlı. Görünmezse ya da aşırı sıklaşırsa (zoom-out) çizmez.
   */
  #izgaraCiz(): void {
    if (!this.izgaraKat) return;
    const svg = this.#yansitici.kok;
    const ctm = svg?.getScreenCTM?.();
    if (!izgara.gorunur || !svg || !ctm) {
      this.izgaraKat.style.display = "none";
      return;
    }
    const adimX = izgara.adim * ctm.a;
    const adimY = izgara.adim * ctm.d;
    if (!(adimX > 2) || !(adimY > 2)) {
      this.izgaraKat.style.display = "none"; // çok sık → moiré/performans
      return;
    }
    // Izgarayı SVG çizim alanına kıstla → svg dışındaki zemine taşmaz (göz yormaz).
    const h = this.getBoundingClientRect();
    const sr = svg.getBoundingClientRect();
    if (sr.width === 0 && sr.height === 0) {
      this.izgaraKat.style.display = "none";
      return;
    }
    const o = new DOMPoint(0, 0).matrixTransform(ctm);
    const cizgi = "var(--izgara-cizgi, rgba(127, 127, 127, 0.32))";
    this.izgaraKat.style.display = "block";
    this.izgaraKat.style.left = `${sr.left - h.left}px`;
    this.izgaraKat.style.top = `${sr.top - h.top}px`;
    this.izgaraKat.style.width = `${sr.width}px`;
    this.izgaraKat.style.height = `${sr.height}px`;
    this.izgaraKat.style.backgroundImage =
      `linear-gradient(to right, ${cizgi} 1px, transparent 1px),` +
      `linear-gradient(to bottom, ${cizgi} 1px, transparent 1px)`;
    this.izgaraKat.style.backgroundSize = `${adimX}px ${adimY}px`;
    // Arka plan konumu artık elemanın (SVG alanı) sol-üstüne göre.
    this.izgaraKat.style.backgroundPosition = `${o.x - sr.left}px ${o.y - sr.top}px`;
  }

  /** Bir client koordinatını kullanıcı (SVG) koordinatına çevirir (kök CTM ters). */
  #kullaniciKoord(clientX: number, clientY: number): TuvalNoktasi | null {
    const ctm = this.#yansitici.kok?.getScreenCTM?.();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  /** Cetvelleri (TK-37 #2) çizer; görünür değilse gizler. */
  #cetvelCiz(): void {
    const goster = kilavuzDeposu.cetvel;
    if (this.cetvelUst) this.cetvelUst.style.display = goster ? "block" : "none";
    if (this.cetvelSol) this.cetvelSol.style.display = goster ? "block" : "none";
    if (this.cetvelKose)
      this.cetvelKose.style.display = goster ? "block" : "none";
    const ctm = goster ? this.#yansitici.kok?.getScreenCTM?.() : null;
    if (!ctm) return;
    this.#cetvelEkseni(this.cetvelUst, ctm, "x");
    this.#cetvelEkseni(this.cetvelSol, ctm, "y");
  }

  #cetvelEkseni(svg: SVGSVGElement, ctm: DOMMatrix, eksen: "x" | "y"): void {
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
    const r = svg.getBoundingClientRect();
    const olcek = Math.abs(eksen === "x" ? ctm.a : ctm.d) || 1;
    const adim = guzelAdim(64, olcek);
    const inv = ctm.inverse();
    const uAt = (cli: number): number =>
      eksen === "x"
        ? new DOMPoint(cli, 0).matrixTransform(inv).x
        : new DOMPoint(0, cli).matrixTransform(inv).y;
    const u1 = uAt(eksen === "x" ? r.left : r.top);
    const u2 = uAt(eksen === "x" ? r.right : r.bottom);
    const cocuklar: SVGElement[] = [];

    // Sayfa (artboard) kapsam bandı — cetveli çalışma alanına BAĞLAR (kullanıcı isteği):
    // kök SVG viewBox kapsamını ekran konumuna çevirip cetvelde vurgulu bant olarak göster.
    const vb = this.#yansitici.kok?.viewBox?.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      const a0 = eksen === "x" ? vb.x : vb.y;
      const a1 = eksen === "x" ? vb.x + vb.width : vb.y + vb.height;
      const ekranAt = (u: number): number =>
        eksen === "x"
          ? new DOMPoint(u, 0).matrixTransform(ctm).x - r.left
          : new DOMPoint(0, u).matrixTransform(ctm).y - r.top;
      const s0 = ekranAt(a0);
      const s1 = ekranAt(a1);
      const bant = document.createElementNS(NS, "rect");
      bant.setAttribute("fill", "var(--vurgu, #4a90e2)");
      bant.setAttribute("opacity", "0.3");
      if (eksen === "x") {
        bant.setAttribute("x", String(Math.min(s0, s1)));
        bant.setAttribute("width", String(Math.abs(s1 - s0)));
        bant.setAttribute("y", "0");
        bant.setAttribute("height", "20");
      } else {
        bant.setAttribute("y", String(Math.min(s0, s1)));
        bant.setAttribute("height", String(Math.abs(s1 - s0)));
        bant.setAttribute("x", "0");
        bant.setAttribute("width", "20");
      }
      cocuklar.push(bant); // ticks bunun üstüne çizilsin
    }
    for (const t of tickler(Math.min(u1, u2), Math.max(u1, u2), adim, 400)) {
      const sc =
        eksen === "x"
          ? new DOMPoint(t, 0).matrixTransform(ctm).x - r.left
          : new DOMPoint(0, t).matrixTransform(ctm).y - r.top;
      const line = document.createElementNS(NS, "line");
      line.setAttribute("stroke", "currentColor");
      line.setAttribute("opacity", "0.5");
      if (eksen === "x") {
        line.setAttribute("x1", String(sc));
        line.setAttribute("x2", String(sc));
        line.setAttribute("y1", "12");
        line.setAttribute("y2", "20");
      } else {
        line.setAttribute("y1", String(sc));
        line.setAttribute("y2", String(sc));
        line.setAttribute("x1", "12");
        line.setAttribute("x2", "20");
      }
      cocuklar.push(line);
      const tx = document.createElementNS(NS, "text");
      tx.textContent = String(Math.round(t));
      tx.setAttribute("fill", "currentColor");
      tx.setAttribute("font-size", "8");
      if (eksen === "x") {
        tx.setAttribute("x", String(sc + 2));
        tx.setAttribute("y", "9");
      } else {
        tx.setAttribute("x", "2");
        tx.setAttribute("y", String(sc - 2));
      }
      cocuklar.push(tx);
    }
    // Fareyi izleyen imleç çizgisi + sayısal değer (kalıcı) — en sona eklenir (üstte).
    let imlec = eksen === "x" ? this.#imlecUst : this.#imlecSol;
    if (!imlec) {
      imlec = document.createElementNS(NS, "line");
      imlec.setAttribute("stroke", "var(--cetvel-imlec, #25d07d)");
      imlec.setAttribute("stroke-width", "1");
      imlec.setAttribute("pointer-events", "none");
      imlec.style.display = "none";
      if (eksen === "x") this.#imlecUst = imlec;
      else this.#imlecSol = imlec;
    }
    let yazi = eksen === "x" ? this.#imlecUstYazi : this.#imlecSolYazi;
    if (!yazi) {
      yazi = document.createElementNS(NS, "text");
      yazi.setAttribute("fill", "var(--cetvel-imlec, #25d07d)");
      yazi.setAttribute("font-size", "8");
      yazi.setAttribute("font-weight", "700");
      yazi.setAttribute("pointer-events", "none");
      yazi.style.display = "none";
      if (eksen === "x") this.#imlecUstYazi = yazi;
      else this.#imlecSolYazi = yazi;
    }
    cocuklar.push(imlec, yazi);
    svg.replaceChildren(...cocuklar);
    this.#cetvelImlecKonumla(); // yeniden çizimden sonra son fare konumuna getir
  }

  /** Cetvel imleç çizgilerini + sayısal değerini son fare konumuna taşır (yoksa gizler). */
  #cetvelImlecKonumla(): void {
    const ctm = this.#yansitici.kok?.getScreenCTM?.();
    const inv = ctm ? ctm.inverse() : null;
    // Fare client noktasını kullanıcı (viewBox) koordinatına çevir.
    const u =
      inv && this.#sonImlecX != null && this.#sonImlecY != null
        ? new DOMPoint(this.#sonImlecX, this.#sonImlecY).matrixTransform(inv)
        : null;

    const ust = this.#imlecUst;
    if (ust && this.cetvelUst) {
      const r = this.cetvelUst.getBoundingClientRect();
      const x = this.#sonImlecX == null ? -1 : this.#sonImlecX - r.left;
      const gor = x >= 0 && x <= r.width;
      if (gor) {
        ust.setAttribute("x1", String(x));
        ust.setAttribute("x2", String(x));
        ust.setAttribute("y1", "0");
        ust.setAttribute("y2", "20");
        ust.style.display = "";
      } else ust.style.display = "none";
      const yazi = this.#imlecUstYazi;
      if (yazi) {
        if (gor && u) {
          const sagYakin = x > r.width - 26;
          yazi.textContent = String(Math.round(u.x));
          yazi.setAttribute("text-anchor", sagYakin ? "end" : "start");
          yazi.setAttribute("x", String(sagYakin ? x - 3 : x + 3));
          yazi.setAttribute("y", "8");
          yazi.style.display = "";
        } else yazi.style.display = "none";
      }
    }

    const sol = this.#imlecSol;
    if (sol && this.cetvelSol) {
      const r = this.cetvelSol.getBoundingClientRect();
      const y = this.#sonImlecY == null ? -1 : this.#sonImlecY - r.top;
      const gor = y >= 0 && y <= r.height;
      if (gor) {
        sol.setAttribute("y1", String(y));
        sol.setAttribute("y2", String(y));
        sol.setAttribute("x1", "0");
        sol.setAttribute("x2", "20");
        sol.style.display = "";
      } else sol.style.display = "none";
      const yazi = this.#imlecSolYazi;
      if (yazi) {
        if (gor && u) {
          yazi.textContent = String(Math.round(u.y));
          yazi.setAttribute("text-anchor", "start");
          yazi.setAttribute("x", "2");
          yazi.setAttribute("y", String(Math.max(8, y - 2)));
          yazi.style.display = "";
        } else yazi.style.display = "none";
      }
    }
  }

  /** Kullanıcı kılavuzlarını (TK-37 #2) çizer (ekran konumuna). */
  #kullaniciKilavuzCiz(): void {
    if (!this.kullaniciKilavuzKat) return;
    const ctm = this.#yansitici.kok?.getScreenCTM?.();
    const h = this.getBoundingClientRect();
    const cocuklar: HTMLElement[] = [];
    if (ctm) {
      kilavuzDeposu.liste.forEach((g, i) => {
        const div = document.createElement("div");
        div.className = `uguide ${g.yon}`;
        if (g.yon === "yatay") {
          const sy = new DOMPoint(0, g.konum).matrixTransform(ctm).y - h.top;
          div.style.top = `${sy}px`;
        } else {
          const sx = new DOMPoint(g.konum, 0).matrixTransform(ctm).x - h.left;
          div.style.left = `${sx}px`;
        }
        div.addEventListener("pointerdown", (e) => this.#kilavuzSurukle(i, e));
        cocuklar.push(div);
      });
    }
    this.kullaniciKilavuzKat.replaceChildren(...cocuklar);
  }

  /** Cetvelden yeni kılavuz oluştur + hemen sürükle (TK-37 #2). */
  #cetveldenKilavuz(yon: "yatay" | "dikey", olay: PointerEvent): void {
    olay.preventDefault();
    const u = this.#kullaniciKoord(olay.clientX, olay.clientY);
    if (!u) return;
    const i = kilavuzDeposu.ekle({ yon, konum: yon === "yatay" ? u.y : u.x });
    this.#kilavuzSurukle(i, olay);
  }

  /** Mevcut kılavuzu sürükle (taşı); cetvel bölgesine bırakılırsa sil. */
  #kilavuzSurukle(i: number, olay: PointerEvent): void {
    olay.preventDefault();
    olay.stopPropagation();
    const yon = kilavuzDeposu.liste[i]?.yon;
    if (!yon) return;
    const hareket = (o: PointerEvent): void => {
      const u = this.#kullaniciKoord(o.clientX, o.clientY);
      if (u) kilavuzDeposu.tasi(i, yon === "yatay" ? u.y : u.x);
    };
    const birak = (o: PointerEvent): void => {
      window.removeEventListener("pointermove", hareket);
      window.removeEventListener("pointerup", birak);
      const h = this.getBoundingClientRect();
      const cetveldeMi =
        yon === "yatay" ? o.clientY - h.top < 20 : o.clientX - h.left < 20;
      if (cetveldeMi) kilavuzDeposu.sil(i);
    };
    window.addEventListener("pointermove", hareket);
    window.addEventListener("pointerup", birak);
  }

  /** Her seçili düğüm için sınır kutusu çerçevesi çizer (referans belirgin). */
  readonly #konumla = (): void => {
    if (!this.katman) return;
    this.#izgaraCiz(); // ızgara seçimden bağımsız → her zaman güncelle
    this.#cetvelCiz(); // cetveller + kullanıcı kılavuzları seçimden bağımsız
    this.#kullaniciKilavuzCiz();
    // Artboard çerçevesi seçimden bağımsızdır → taşıma korumasından ÖNCE çiz.
    this.#sayfaCercevesiKonumla();
    // Nesne taşınırken (gövde sürüklemesi) YA DA metin yerinde düzenlenirken
    // seçim çerçevesi/tutamaçları gizle (düzenleme overlay'iyle çakışmasın);
    // bittiğinde tekrar görünür olur.
    if ((this.#basNokta && this.#suruklendi) || this.#metinDugum) {
      for (const c of this.#cerceveler.values()) c.style.display = "none";
      if (this.tutamaclar) this.tutamaclar.style.display = "none";
      if (this.ucTutamaclar) this.ucTutamaclar.style.display = "none";
      aracDeposu.aktif?.konumla?.(this.#aracBaglami()); // araç bindirmesi sürebilir
      return;
    }
    const h = this.getBoundingClientRect();
    // Referans işareti hizalama MODUNA göre (§9.6a): son-secilen → en son eklenen;
    // anahtar → z-üst; secim/belge → tek-nesne referansı yok (işaret gösterilmez).
    const belgeRef = this.depo.belge;
    const ref = belgeRef
      ? referansDugum(belgeRef, this.secim.secililer, hizalaReferans.mod)
      : null;
    const cokMu = this.secim.secililer.length > 1;
    const kalan = new Set(this.#cerceveler.keys());

    for (const dugum of this.secim.secililer) {
      const el = this.#yansitici.elemanGetir(dugum.kimlik);
      if (!(el instanceof SVGGraphicsElement) || !el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;

      let cerceve = this.#cerceveler.get(dugum.kimlik);
      if (!cerceve) {
        cerceve = document.createElement("div");
        cerceve.className = "cerceve";
        this.katman.appendChild(cerceve);
        this.#cerceveler.set(dugum.kimlik, cerceve);
      }
      const pad = dugum.etiket === "g" ? GRUP_BOSLUK : 0;
      cerceve.classList.toggle("ref", cokMu && dugum === ref);
      cerceve.classList.toggle("grup", dugum.etiket === "g");
      cerceve.style.display = ""; // taşıma sonrası tekrar görünür
      cerceve.style.left = `${r.left - h.left - pad}px`;
      cerceve.style.top = `${r.top - h.top - pad}px`;
      cerceve.style.width = `${r.width + 2 * pad}px`;
      cerceve.style.height = `${r.height + 2 * pad}px`;
      kalan.delete(dugum.kimlik);
    }

    for (const kimlik of kalan) {
      this.#cerceveler.get(kimlik)?.remove();
      this.#cerceveler.delete(kimlik);
    }

    // Tutamaçlar: tam olarak 1 (kilitsiz) seçimde göster — aktif araç gizlemiyorsa
    // (örn. Düğüm aracı kendi tutamaçlarını çizer, §11.6). Çizgi seçilirse boyut
    // tutamaçları yerine iki UÇ tutamacı (yeniden konumlandırma) gösterilir.
    const tek = this.secim.secililer.length === 1 ? this.secim.secili : null;
    const aracGizler = aracDeposu.aktif?.tutamacGizle === true;
    const duzTek = tek && !tek.kilitli && !aracGizler ? tek : null;
    const tekEl = duzTek ? this.#yansitici.elemanGetir(duzTek.kimlik) : null;
    const cizgiMi = duzTek?.etiket === "line";
    if (cizgiMi && tekEl instanceof SVGGraphicsElement && tekEl.isConnected) {
      this.#ucTutamaclariKonumla(duzTek!, tekEl, h);
      this.ucTutamaclar.style.display = "block";
      this.tutamaclar.style.display = "none";
    } else {
      this.ucTutamaclar.style.display = "none";
      if (this.tutamaclar) {
        if (tekEl instanceof SVGGraphicsElement && tekEl.isConnected) {
          const r = tekEl.getBoundingClientRect();
          const pad = duzTek!.etiket === "g" ? GRUP_BOSLUK : 0;
          this.#tutamaclariKonumla(
            r.left - h.left - pad,
            r.top - h.top - pad,
            r.width + 2 * pad,
            r.height + 2 * pad,
          );
          this.tutamaclar.style.display = "block";
        } else {
          this.tutamaclar.style.display = "none";
        }
      }
    }

    // Aktif aracın bindirmesini (varsa) her karede yeniden yerleştir.
    aracDeposu.aktif?.konumla?.(this.#aracBaglami());
  };

  #tutamaclariKonumla(x: number, y: number, w: number, h: number): void {
    const noktalar: Record<string, [number, number]> = {
      nw: [x, y],
      n: [x + w / 2, y],
      ne: [x + w, y],
      e: [x + w, y + h / 2],
      se: [x + w, y + h],
      s: [x + w / 2, y + h],
      sw: [x, y + h],
      w: [x, y + h / 2],
      rot: [x + w / 2, y - 22],
    };
    for (const el of this.renderRoot.querySelectorAll<HTMLElement>(
      ".tutamac",
    )) {
      const p = noktalar[el.dataset.tip ?? ""];
      if (!p) continue;
      el.style.left = `${p[0]}px`;
      el.style.top = `${p[1]}px`;
    }
  }

  /** Çizginin iki ucunu (x1,y1 / x2,y2) ekran konumuna yerleştirir. */
  #ucTutamaclariKonumla(
    dugum: Dugum,
    el: SVGGraphicsElement,
    h: DOMRect,
  ): void {
    const ctm = el.getScreenCTM();
    if (!ctm) return;
    const oku = (a: string): number =>
      parseFloat(dugum.oznitelikler.get(a) ?? "0") || 0;
    const noktalar: Record<string, [number, number]> = {
      "1": [oku("x1"), oku("y1")],
      "2": [oku("x2"), oku("y2")],
    };
    for (const ucEl of this.renderRoot.querySelectorAll<HTMLElement>(
      ".uc-tutamac",
    )) {
      const p = noktalar[ucEl.dataset.uc ?? ""];
      if (!p) continue;
      const sp = new DOMPoint(p[0], p[1]).matrixTransform(ctm);
      ucEl.style.left = `${sp.x - h.left}px`;
      ucEl.style.top = `${sp.y - h.top}px`;
    }
  }

  /** Çizgi ucundan yeni yerel konumu hesaplar (ekran delta → yerel, CTM ile). */
  #ucKonum(olay: PointerEvent): { x: number; y: number } | null {
    const d = this.#ucDurum;
    if (!d) return null;
    const inv = d.ctm.inverse();
    const sdx = olay.clientX - d.bas.x;
    const sdy = olay.clientY - d.bas.y;
    return {
      x: d.ilk.x + (inv.a * sdx + inv.c * sdy),
      y: d.ilk.y + (inv.b * sdx + inv.d * sdy),
    };
  }

  #ucBasla(uc: "1" | "2", olay: PointerEvent): void {
    olay.preventDefault();
    olay.stopPropagation();
    const tek = this.secim.secili;
    const el = tek ? this.#yansitici.elemanGetir(tek.kimlik) : null;
    if (!tek || tek.etiket !== "line" || !(el instanceof SVGGraphicsElement))
      return;
    const oku = (a: string): number =>
      parseFloat(tek.oznitelikler.get(a) ?? "0") || 0;
    this.#ucDurum = {
      uc,
      dugum: tek,
      ctm: el.getScreenCTM() ?? new DOMMatrix(),
      bas: { x: olay.clientX, y: olay.clientY },
      ilk: {
        x: oku(uc === "1" ? "x1" : "x2"),
        y: oku(uc === "1" ? "y1" : "y2"),
      },
    };
    window.addEventListener("pointermove", this.#ucHareket);
    window.addEventListener("pointerup", this.#ucBirak);
  }

  readonly #ucHareket = (olay: PointerEvent): void => {
    const d = this.#ucDurum;
    const p = this.#ucKonum(olay);
    if (!d || !p) return;
    const el = this.#yansitici.elemanGetir(d.dugum.kimlik);
    if (el) {
      el.setAttribute(d.uc === "1" ? "x1" : "x2", String(say(p.x))); // canlı önizleme
      el.setAttribute(d.uc === "1" ? "y1" : "y2", String(say(p.y)));
    }
    this.#konumla();
  };

  readonly #ucBirak = (olay: PointerEvent): void => {
    const d = this.#ucDurum;
    const p = this.#ucKonum(olay);
    this.#ucDurum = null;
    window.removeEventListener("pointermove", this.#ucHareket);
    window.removeEventListener("pointerup", this.#ucBirak);
    const belge = this.depo.belge;
    if (!d || !p || !belge) return;
    const ax = d.uc === "1" ? "x1" : "x2";
    const ay = d.uc === "1" ? "y1" : "y2";
    this.gecmis.calistir(
      new BilesikKomut("uç taşı", [
        new OznitelikDegistirKomutu(belge, d.dugum, ax, String(say(p.x))),
        new OznitelikDegistirKomutu(belge, d.dugum, ay, String(say(p.y))),
      ]),
    );
  };

  #tutamacBasla(tip: string, olay: PointerEvent): void {
    olay.preventDefault();
    olay.stopPropagation();
    const tek = this.secim.secili;
    const el = tek ? this.#yansitici.elemanGetir(tek.kimlik) : null;
    if (!tek || !(el instanceof SVGGraphicsElement)) return;
    const ebeveyn = el.parentElement as unknown as SVGGraphicsElement | null;
    // Nesnenin kendi transform matrisinde rotasyon/eğme var mı? (b/c ≠ 0)
    const m = el.transform.baseVal.consolidate()?.matrix;
    const donmus = !!m && (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6);
    this.#tutamac = tip;
    this.#tutamacBas = { x: olay.clientX, y: olay.clientY };
    this.#tutamacAsil = {
      transform: tek.oznitelikler.get("transform") ?? "",
      ctm: ebeveyn?.getScreenCTM?.() ?? new DOMMatrix(),
      bbox: el.getBoundingClientRect(),
      donmus,
    };
    window.addEventListener("pointermove", this.#tutamacHareket);
    window.addEventListener("pointerup", this.#tutamacBirak);
  }

  readonly #tutamacHareket = (olay: PointerEvent): void => {
    const yeni = this.#tutamacTransform(olay);
    const tek = this.secim.secili;
    const el = tek ? this.#yansitici.elemanGetir(tek.kimlik) : null;
    if (yeni !== null && el) el.setAttribute("transform", yeni); // canlı önizleme
    this.#konumla();
  };

  readonly #tutamacBirak = (olay: PointerEvent): void => {
    const yeni = this.#tutamacTransform(olay);
    const tek = this.secim.secili;
    const belge = this.depo.belge;
    if (yeni !== null && tek && belge) {
      this.gecmis.calistir(
        new OznitelikDegistirKomutu(belge, tek, "transform", yeni),
      );
    }
    this.#tutamac = null;
    this.#tutamacBas = null;
    this.#tutamacAsil = null;
    window.removeEventListener("pointermove", this.#tutamacHareket);
    window.removeEventListener("pointerup", this.#tutamacBirak);
  };

  /** Tutamaç hareketinden yeni transform dizesini hesaplar (boyut/döndürme). */
  #tutamacTransform(olay: PointerEvent): string | null {
    const tip = this.#tutamac;
    const bas = this.#tutamacBas;
    const asil = this.#tutamacAsil;
    if (!tip || !bas || !asil) return null;
    const b = asil.bbox;

    if (tip === "rot") {
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const a0 = Math.atan2(bas.y - cy, bas.x - cx);
      const a1 = Math.atan2(olay.clientY - cy, olay.clientX - cx);
      let derece = ((a1 - a0) * 180) / Math.PI;
      if (olay.shiftKey) derece = Math.round(derece / 15) * 15;
      const c = new DOMPoint(cx, cy).matrixTransform(asil.ctm.inverse());
      return `rotate(${say(derece)}, ${say(c.x)}, ${say(c.y)}) ${asil.transform}`.trim();
    }

    const sol = tip.includes("w");
    const sag = tip.includes("e");
    const ust = tip.includes("n");
    const alt = tip.includes("s");
    const pivotX = sag ? b.left : sol ? b.right : b.left + b.width / 2;
    const pivotY = alt ? b.top : ust ? b.bottom : b.top + b.height / 2;
    const yatay = sol || sag;
    const dikey = ust || alt;
    let sx = 1;
    let sy = 1;
    if (yatay)
      sx = (olay.clientX - pivotX) / ((sag ? b.right : b.left) - pivotX);
    if (dikey)
      sy = (olay.clientY - pivotY) / ((alt ? b.bottom : b.top) - pivotY);
    // ÜNİFORM ölçek koşulu:
    //  - Döndürülmüş/eğik nesne → DAİMA üniform (doğruluk kısıtı: eksen-hizalı ekran
    //    bbox'tan türetilen non-uniform ölçek, transform'daki rotate ile birleşince
    //    shear üretir; izotropik ölçek rotasyonla değişmeli olduğundan S(s,s) bunu önler).
    //  - Oran kilidi (TK-37 #9): kilit AÇIKSA üniform, Shift onu GEÇİCİ tersine çevirir;
    //    kilit KAPALIYSA yalnız Shift üniform yapar. (oranKilidi.acik XOR shiftKey.)
    const oranUniform = oranKilidi.acik ? !olay.shiftKey : olay.shiftKey;
    if (oranUniform || asil.donmus) {
      const s =
        Math.max(yatay ? Math.abs(sx) : 0, dikey ? Math.abs(sy) : 0) || 1;
      sx = yatay ? Math.sign(sx || 1) * s : s;
      sy = dikey ? Math.sign(sy || 1) * s : s;
    }
    if (!Number.isFinite(sx)) sx = 1;
    if (!Number.isFinite(sy)) sy = 1;
    const p = new DOMPoint(pivotX, pivotY).matrixTransform(asil.ctm.inverse());
    return `translate(${say(p.x)}, ${say(p.y)}) scale(${say(sx)}, ${say(sy)}) translate(${say(-p.x)}, ${say(-p.y)}) ${asil.transform}`.trim();
  }

  /** Kement dikdörtgenini (ekran koord.) çizer; null gizler. */
  #kementCiz(
    dortgen: { x: number; y: number; w: number; h: number } | null,
  ): void {
    if (!this.kement) return;
    if (!dortgen) {
      this.kement.style.display = "none";
      return;
    }
    const h = this.getBoundingClientRect();
    this.kement.style.display = "block";
    this.kement.style.left = `${dortgen.x - h.left}px`;
    this.kement.style.top = `${dortgen.y - h.top}px`;
    this.kement.style.width = `${dortgen.w}px`;
    this.kement.style.height = `${dortgen.h}px`;
  }

  /** Akıllı hizalama kılavuzlarını çizer (ekran koord.); boş → gizler (§11.1). */
  #kilavuzCiz(kilavuzlar: readonly Kilavuz[]): void {
    if (!this.kilavuzlar) return;
    const h = this.getBoundingClientRect();
    this.kilavuzlar.replaceChildren();
    for (const k of kilavuzlar) {
      const c = document.createElement("div");
      c.className = `kilavuz ${k.yon}`;
      if (k.yon === "dikey") {
        c.style.left = `${k.konum - h.left}px`;
        c.style.top = `${k.bas - h.top}px`;
        c.style.height = `${k.son - k.bas}px`;
      } else {
        c.style.top = `${k.konum - h.top}px`;
        c.style.left = `${k.bas - h.left}px`;
        c.style.width = `${k.son - k.bas}px`;
      }
      this.kilavuzlar.appendChild(c);
    }
  }

  override render() {
    return html`
      <div
        class="kaydir"
        style="cursor:${aracDeposu.aktif?.imlec ?? "default"}"
        @pointerdown=${this.#bas}
      >
        <div class="icerik"></div>
      </div>
      <div class="secim-katman">
        <div class="izgara"></div>
        <div class="kullanici-kilavuzlar"></div>
        <div class="sayfa-cerceve"></div>
        <div class="kilavuzlar"></div>
        <div class="arac-katman"></div>
        <div class="kement"></div>
        <div class="tutamaclar">
          ${["nw", "n", "ne", "e", "se", "s", "sw", "w"].map(
            (tip) =>
              html`<div
                class="tutamac"
                data-tip=${tip}
                @pointerdown=${(e: PointerEvent) => this.#tutamacBasla(tip, e)}
              ></div>`,
          )}
          <div
            class="tutamac dondur"
            data-tip="rot"
            @pointerdown=${(e: PointerEvent) => this.#tutamacBasla("rot", e)}
          ></div>
        </div>
        <div class="uc-tutamaclar">
          ${(["1", "2"] as const).map(
            (uc) =>
              html`<div
                class="uc-tutamac"
                data-uc=${uc}
                @pointerdown=${(e: PointerEvent) => this.#ucBasla(uc, e)}
              ></div>`,
          )}
        </div>
      </div>
      <svg
        class="cetvel cetvel-ust"
        @pointerdown=${(e: PointerEvent) => this.#cetveldenKilavuz("yatay", e)}
      ></svg>
      <svg
        class="cetvel cetvel-sol"
        @pointerdown=${(e: PointerEvent) => this.#cetveldenKilavuz("dikey", e)}
      ></svg>
      <div class="cetvel-kose"></div>
      <input
        class="metin-giris"
        type="text"
        spellcheck="false"
        @input=${this.#metinGirisGirdi}
        @keydown=${this.#metinGirisTus}
        @blur=${() => this.#metinDuzenleBitir(false)}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tuval-alani": TuvalAlani;
  }
}

// Registry'ye kaydol (İlke 5) — merkez bölge (ana çalışma alanı).
panelKayitDefteri.kaydet({
  id: "tuval",
  baslik: "Tuval",
  bolge: "merkez",
  olustur: ({ depo, secim, gecmis, oynatma }) => {
    const panel = new TuvalAlani();
    panel.depo = depo;
    panel.secim = secim;
    panel.gecmis = gecmis;
    panel.oynatma = oynatma;
    return panel;
  },
});
