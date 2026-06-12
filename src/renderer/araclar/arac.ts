import type { TemplateResult } from 'lit';
import type { Dugum } from '../../cekirdek/belge/model/dugum';
import type { BelgeDeposu } from '../../cekirdek/belge/belge-deposu';
import type { SecimDeposu } from '../../cekirdek/secim/secim-deposu';
import type { KomutGecmisi } from '../../cekirdek/komutlar/komut-gecmisi';
import type { Kilavuz } from '../tuval/yapisma';

/**
 * Araç altyapısı (CLAUDE.md §9.2, İlke 5).
 *
 * Her araç registry'ye kaydolur; Tuval, aktif aracın işaretçi olaylarını
 * (bas/sürükle/bırak/tıkla) çağırır ve gerekli bağlamı (koordinat dönüşümü,
 * isabet, servisler) sağlar. Yeni araç = yeni kayıt; Tuval/kabuk değişmez.
 *
 * Araçlar UI'dır (Lit ikonu + DOM etkileşimi); bu yüzden registry renderer
 * tarafındadır. Çekirdek bundan habersizdir (İlke 1).
 */

/**
 * Tıklama↔sürükleme eşiği (px, ekran). TEK kaynak: hem Tuval'in tıkla/sürükle
 * ayrımı hem araçların taşıma/kement başlatması bunu kullanır → "ölü bant"
 * (iki farklı eşik) olmaz (TK-21 denetimi).
 */
export const SURUKLEME_ESIGI = 4;

/** Tuval üzerindeki bir nokta (SVG kullanıcı koordinatları). */
export interface TuvalNoktasi {
  readonly x: number;
  readonly y: number;
}

/** Araca her olayda verilen bağlam. */
export interface AracBaglami {
  readonly depo: BelgeDeposu;
  readonly secim: SecimDeposu;
  readonly gecmis: KomutGecmisi;
  /** Render edilen kök SVG (yoksa null). */
  readonly kok: SVGSVGElement | null;
  /** İşaretçi olayını SVG kullanıcı koordinatlarına çevirir. */
  svgKonum(olay: PointerEvent): TuvalNoktasi;
  /** Olayın altındaki en üst seçilebilir düğüm (yoksa null). */
  isabet(olay: PointerEvent): Dugum | null;
  /** Kimliğe karşılık gelen render edilmiş DOM elemanı. */
  eleman(kimlik: string): Element | null;

  /** Görünümü kaydırır (piksel; görünüm durumu, undo'ya girmez — İlke 9). */
  gorunumKaydir(dx: number, dy: number): void;
  /** Görünümü merkez etrafında ölçekler (faktör > 1 yakınlaştırır). */
  gorunumYakinlastir(faktor: number): void;
  /** Kement (alan seçimi) dikdörtgenini çizer (ekran koordinatları); null gizler. */
  kementCiz(dortgen: { x: number; y: number; w: number; h: number } | null): void;
  /** Akıllı hizalama kılavuzlarını çizer (ekran koord.); boş dizi gizler (§11.1). */
  kilavuzCiz(kilavuzlar: readonly Kilavuz[]): void;
  /**
   * Aktif aracın kendi bindirmesini (örn. düğüm tutamaçları) yerleştirebileceği
   * kap. Tuval'in seçim katmanına denk gelir (ekran koord.); araç bu kabı
   * doldurur ve temizler. pointer-events: çocuklara aittir (kap geçirgendir).
   */
  aracKatmani(): HTMLElement;
  /**
   * Kullanıcıya GEÇİCİ (toast) bir mesaj gösterir — görünüm durumu (İlke 9):
   * undo'ya GİRMEZ, Command üretmez. Araç sessiz no-op yerine geri bildirim
   * versin diye (örn. Pipet'te hedef seçilmemiş). Varsayılan tür 'bilgi'.
   */
  bildir(mesaj: string, tur?: 'bilgi' | 'uyari' | 'hata'): void;
}

/** Bir araç. */
export interface Arac {
  /** Benzersiz kimlik (örn. 'sec'). */
  readonly id: string;
  /** Etiketin/ipucunun i18n anahtarı. */
  readonly etiketAnahtari: string;
  /** Araç çubuğu ikonu (Lit svg şablonu). */
  readonly ikon: TemplateResult;
  /** Tuval imleci (CSS cursor). */
  readonly imlec?: string;
  /** Çubuktaki sıralama (küçük önce). */
  readonly sira?: number;
  /**
   * Etkinken Tuval'in kendi boyut/döndürme tutamaçlarını gizler (örn. Düğüm
   * aracı kendi tutamaçlarını çizdiği için). Jenerik bayrak — Tuval hangi araç
   * olduğunu bilmez (İlke 5, §6).
   */
  readonly tutamacGizle?: boolean;

  /** İşaretçi basıldı. */
  bas?(olay: PointerEvent, baglam: AracBaglami): void;
  /** Basılıyken sürüklendi. */
  surukle?(olay: PointerEvent, baglam: AracBaglami): void;
  /** İşaretçi bırakıldı. */
  birak?(olay: PointerEvent, baglam: AracBaglami): void;
  /** Tek tık (bas→bırak, sürükleme olmadan). */
  tikla?(olay: PointerEvent, baglam: AracBaglami): void;
  /** Tuş basılı değilken hareket (hover) — örn. kalem ipucu çizgisi. */
  hareket?(olay: PointerEvent, baglam: AracBaglami): void;
  /**
   * Tuval her kare (rAF) bindirme konumlarını yenilerken çağrılır — aracın
   * ekran-koordinatlı tutamaçlarını yakınlaştırma/kaydırma/animasyona göre
   * yeniden yerleştirmesi için (örn. Düğüm tutamaçları).
   */
  konumla?(baglam: AracBaglami): void;
  /** Araç etkinken klavye (Enter/Esc gibi; giriş alanında değilken). */
  tus?(olay: KeyboardEvent, baglam: AracBaglami): void;
  /** Araç etkinleştiğinde / pasifleştiğinde (durum kurulumu/temizliği). */
  etkinlesti?(baglam: AracBaglami): void;
  pasiflesti?(baglam: AracBaglami): void;
}

class AracKayitDefteri {
  readonly #araclar: Arac[] = [];

  kaydet(arac: Arac): void {
    if (this.#araclar.some((a) => a.id === arac.id)) {
      throw new Error(`Araç zaten kayıtlı: ${arac.id}`);
    }
    this.#araclar.push(arac);
  }

  hepsi(): readonly Arac[] {
    return [...this.#araclar].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  }

  bul(id: string): Arac | undefined {
    return this.#araclar.find((a) => a.id === id);
  }
}

/** Uygulama genelinde tek araç kayıt defteri. */
export const aracKayitDefteri = new AracKayitDefteri();

/**
 * Aktif araç deposu — o an seçili aracı tutan gözlemlenebilir kap (görünüm
 * durumu; İlke 9 — undo'ya girmez). Varsayılan 'sec'.
 */
class AracDeposu {
  #aktifId = 'sec';
  readonly #dinleyiciler = new Set<() => void>();

  get aktifId(): string {
    return this.#aktifId;
  }

  get aktif(): Arac | undefined {
    return aracKayitDefteri.bul(this.#aktifId);
  }

  ayarla(id: string): void {
    if (this.#aktifId === id || !aracKayitDefteri.bul(id)) return;
    this.#aktifId = id;
    for (const d of this.#dinleyiciler) d();
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }
}

/** Uygulama genelinde tek aktif araç deposu. */
export const aracDeposu = new AracDeposu();
