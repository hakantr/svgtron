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
import { say } from "./donusum";
import type { Kilavuz } from "./yapisma";
import { oranKilidi } from "./oran-kilidi";
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
      height: 100%;
      overflow: hidden;
    }
    .kaydir {
      position: absolute;
      inset: 0;
      overflow: hidden;
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
  @query(".sayfa-cerceve") private sayfaCerceve!: HTMLDivElement;
  @query(".kilavuzlar") private kilavuzlar!: HTMLDivElement;
  @query(".arac-katman") private aracKat!: HTMLDivElement;
  @query(".tutamaclar") private tutamaclar!: HTMLDivElement;
  @query(".uc-tutamaclar") private ucTutamaclar!: HTMLDivElement;

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
    // Denetçi, efektif (hesaplanmış) stilleri okuyabilsin diye render erişimi yayınla.
    cizimErisimi.kaynakAyarla((kimlik) => this.#yansitici.elemanGetir(kimlik));
  }

  override disconnectedCallback(): void {
    this.#depoCoz?.();
    this.#secimCoz?.();
    this.#dilCoz?.();
    this.#aracCoz?.();
    window.removeEventListener("resize", this.#konumla);
    window.removeEventListener("keydown", this.#zoomKlavye);
    window.removeEventListener("keydown", this.#aracTus);
    window.removeEventListener("pointermove", this.#tutamacHareket);
    window.removeEventListener("pointerup", this.#tutamacBirak);
    window.removeEventListener("pointermove", this.#ucHareket);
    window.removeEventListener("pointerup", this.#ucBirak);
    this.kaydir?.removeEventListener("wheel", this.#tekerlek);
    this.kaydir?.removeEventListener("pointermove", this.#hover);
    this.#izlemeyiDurdur();
    cizimErisimi.kaynakAyarla(null);
    super.disconnectedCallback();
  }

  override firstUpdated(): void {
    this.kaydir.addEventListener("wheel", this.#tekerlek, { passive: false });
    this.kaydir.addEventListener("pointermove", this.#hover);
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
    };
  }

  // --- Görünüm (yakınlaştırma/kaydırma) ---
  #transformUygula(): void {
    if (this.icerik) {
      this.icerik.style.transform = `translate(${this.#panX}px, ${this.#panY}px) scale(${this.#olcek})`;
    }
    this.#konumla();
  }
  #yakinlastir(faktor: number): void {
    this.#olcek = Math.min(64, Math.max(0.05, this.#olcek * faktor));
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
    this.#yakinlastir(olay.deltaY < 0 ? 1.12 : 1 / 1.12);
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
    if (olay.buttons !== 0) return;
    aracDeposu.aktif?.hareket?.(olay, this.#aracBaglami());
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

  /** Her seçili düğüm için sınır kutusu çerçevesi çizer (referans belirgin). */
  readonly #konumla = (): void => {
    if (!this.katman) return;
    // Artboard çerçevesi seçimden bağımsızdır → taşıma korumasından ÖNCE çiz.
    this.#sayfaCercevesiKonumla();
    // Nesne taşınırken (gövde sürüklemesi) seçim çerçevesi/tutamaçları gizle;
    // fare bırakılınca (sürükleme biter) tekrar görünür olur (§ kullanıcı isteği).
    if (this.#basNokta && this.#suruklendi) {
      for (const c of this.#cerceveler.values()) c.style.display = "none";
      if (this.tutamaclar) this.tutamaclar.style.display = "none";
      if (this.ucTutamaclar) this.ucTutamaclar.style.display = "none";
      aracDeposu.aktif?.konumla?.(this.#aracBaglami()); // araç bindirmesi sürebilir
      return;
    }
    const h = this.getBoundingClientRect();
    const ref = this.secim.secili;
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
