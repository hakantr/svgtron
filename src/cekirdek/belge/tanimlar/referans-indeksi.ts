import { gez, type Dugum } from '../model/dugum';

/**
 * Referans indeksi (CLAUDE.md İlke 7'nin pratiği).
 *
 * "Hangi şekil hangi kaynağı kullanıyor?" sorusunu O(1) yanıtlar. Kaynaklar iki
 * yolla atıf alır: `url(#id)` (filter, gradient, marker, clip-path, mask...) ve
 * sınıf adı (`class="..."`). Soyut belge modeli (düğüm ağacı) üzerinde kurulur.
 *
 * "Kullanıldığı yerler", güvenli yeniden adlandırma/silme ve canlı önizlemenin
 * yalnızca etkilenen şekillerde tetiklenmesi için zemindir. Şimdilik salt-okunur
 * kurulur; mutasyon akışı geldiğinde yeniden kurulur.
 */
const URL_ATTRIBUTLERI = [
  'fill',
  'stroke',
  'filter',
  'clip-path',
  'mask',
  'marker',
  'marker-start',
  'marker-mid',
  'marker-end',
] as const;

// Global (bir değerde birden çok url() — paint fallback/çoklu marker — olabilir).
const URL_DESENI = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/g;
// Çıplak `#id` atıfı (use/symbol/mpath/textPath/feImage href/xlink:href).
const CIPLAK_ID = /^\s*#([^\s]+)\s*$/;
const HREF_ATTRIBUTLERI = ['href', 'xlink:href'] as const;

export class ReferansIndeksi {
  readonly #idKullananlar = new Map<string, Set<Dugum>>();
  readonly #sinifKullananlar = new Map<string, Set<Dugum>>();

  constructor(kok: Dugum) {
    for (const dugum of gez(kok)) {
      // Doğrudan url(#id) taşıyan öznitelikler (fill/stroke/filter/...).
      for (const attr of URL_ATTRIBUTLERI) this.#urlAtiflari(dugum.oznitelikler.get(attr), dugum);
      // Inline `style` içindeki url(#id) — panel uygulama stratejileri buraya
      // yazar (`style="filter:url(#id)"` vb.); bunlar dogrudan attr'da görünmez.
      this.#urlAtiflari(dugum.oznitelikler.get('style'), dugum);
      // href / xlink:href: çıplak `#id` ya da url(#id) biçimi.
      for (const ad of HREF_ATTRIBUTLERI) {
        const deger = dugum.oznitelikler.get(ad);
        if (!deger) continue;
        const m = CIPLAK_ID.exec(deger);
        if (m?.[1]) this.#ekle(this.#idKullananlar, m[1], dugum);
        else this.#urlAtiflari(deger, dugum);
      }
      const sinif = dugum.oznitelikler.get('class');
      if (sinif) {
        for (const ad of sinif.trim().split(/\s+/)) {
          if (ad) this.#ekle(this.#sinifKullananlar, ad, dugum);
        }
      }
    }
  }

  /** Bir değerdeki tüm url(#id) atıflarını id indeksine ekler. */
  #urlAtiflari(deger: string | undefined, dugum: Dugum): void {
    if (!deger) return;
    for (const m of deger.matchAll(URL_DESENI)) {
      if (m[1]) this.#ekle(this.#idKullananlar, m[1], dugum);
    }
  }

  /** Verilen id'li kaynağı kullanan düğümler (yoksa boş dizi). */
  kullananlar(id: string): Dugum[] {
    return [...(this.#idKullananlar.get(id) ?? [])];
  }

  /** Verilen sınıfı taşıyan düğümler (yoksa boş dizi). */
  sinifiKullananlar(sinif: string): Dugum[] {
    return [...(this.#sinifKullananlar.get(sinif) ?? [])];
  }

  #ekle(harita: Map<string, Set<Dugum>>, anahtar: string, dugum: Dugum): void {
    let kume = harita.get(anahtar);
    if (!kume) {
      kume = new Set<Dugum>();
      harita.set(anahtar, kume);
    }
    kume.add(dugum);
  }
}
