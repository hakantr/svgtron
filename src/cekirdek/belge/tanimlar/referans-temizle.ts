import type { Belge } from '../belge';
import type { Dugum } from '../model/dugum';
import type { Komut } from '../../komutlar/komut';
import { OznitelikDegistirKomutu } from '../../komutlar/oznitelik-degistir-komutu';

/**
 * Kaynak referans temizliği (güvenli silme — CLAUDE.md §8.2, İlke 7).
 *
 * Bir kaynak (filtre/gradyan/marker/... ya da stil sınıfı) silindiğinde, ona
 * `url(#id)` veya `class` ile atıf veren şekiller **dangling** (kırık) referans
 * taşır → SVG geçersizleşir / şekil sessizce bozulur. Bu modül, atıf veren
 * şekillerden referansı kaldıran (geri-alınabilir) komutları üretir; silme
 * komutuyla aynı BilesikKomut'a konup tek geri-al adımı yapılır.
 *
 * Saf çekirdek (İlke 1): yalnız belge modeli + Command; DOM/Electron bilmez.
 */

function kacis(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Bir düğümdeki `url(#id)` / `#id` atıflarını kaldıran komutlar. */
function idReferansiniTemizle(belge: Belge, dugum: Dugum, id: string): Komut[] {
  const esc = kacis(id);
  // .test() için durumsuz, .replace() için global ayrı kalıplar (lastIndex tuzağı).
  const urlTest = new RegExp(`url\\(\\s*["']?#${esc}["']?\\s*\\)`, 'i');
  const urlGlobal = new RegExp(`url\\(\\s*["']?#${esc}["']?\\s*\\)`, 'gi');
  const hashEsit = new RegExp(`^\\s*#${esc}\\s*$`, 'i');

  const komutlar: Komut[] = [];
  for (const [ad, deger] of dugum.oznitelikler) {
    if (ad === 'style') {
      if (!urlTest.test(deger)) continue;
      // url(#id) içeren bildirimi (örn. "filter: url(#id)") tümden düşür.
      const yeni = deger
        .split(';')
        .map((b) => b.trim())
        .filter((b) => b && !urlTest.test(b))
        .join('; ');
      komutlar.push(new OznitelikDegistirKomutu(belge, dugum, 'style', yeni));
    } else if ((ad === 'href' || ad === 'xlink:href') && (hashEsit.test(deger) || urlTest.test(deger))) {
      // use/textPath/mpath/feImage atfı: referans kalkınca öznitelik boşaltılır.
      komutlar.push(new OznitelikDegistirKomutu(belge, dugum, ad, ''));
    } else if (urlTest.test(deger)) {
      // Doğrudan url-öznitelik (fill/stroke/filter/clip-path/mask/marker*):
      // url() token'ını çıkar (varsa fallback değeri korunur).
      komutlar.push(new OznitelikDegistirKomutu(belge, dugum, ad, deger.replace(urlGlobal, '').trim()));
    }
  }
  return komutlar;
}

/** Bir düğümün `class` listesinden bir sınıf adını çıkaran komut. */
function sinifReferansiniTemizle(belge: Belge, dugum: Dugum, sinif: string): Komut[] {
  const mevcut = (dugum.oznitelikler.get('class') ?? '').split(/\s+/).filter(Boolean);
  if (!mevcut.includes(sinif)) return [];
  return [
    new OznitelikDegistirKomutu(belge, dugum, 'class', mevcut.filter((c) => c !== sinif).join(' ')),
  ];
}

/**
 * Bir kaynağa atıf veren TÜM şekillerdeki referansları temizleyen komut listesi
 * + etkilenen şekil sayısı. `sinifMi` true ise `class` (stil sınıfı), değilse
 * `url(#id)` atıfları ele alınır. Referans indeksiyle (O(1)) bulunur.
 */
export function kaynakReferansTemizle(
  belge: Belge,
  kaynakId: string,
  sinifMi: boolean,
): { komutlar: Komut[]; sayi: number } {
  const idx = belge.referansIndeksi;
  const dugumler = sinifMi ? idx.sinifiKullananlar(kaynakId) : idx.kullananlar(kaynakId);
  const komutlar: Komut[] = [];
  for (const d of dugumler) {
    komutlar.push(
      ...(sinifMi
        ? sinifReferansiniTemizle(belge, d, kaynakId)
        : idReferansiniTemizle(belge, d, kaynakId)),
    );
  }
  return { komutlar, sayi: dugumler.length };
}
