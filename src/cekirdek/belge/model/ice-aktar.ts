import { dugumOlustur, type Dugum } from './dugum';

/**
 * İçe aktarıcı (CLAUDE.md İlke 8 — kabul ederken esnek).
 *
 * Herhangi bir SVG metnini (SVG 1.1, SVG 2, kaldırılmış yapılar) ayrıştırıp
 * soyut belge modeline NORMALİZE eder. Geriye uyum yalnızca okuma içindir.
 *
 * Şimdilik uygulanan normalizasyonlar (özellik geldikçe artar):
 *  - `animateColor` → `animate` (kaldırılmış; bkz. §10.10)
 *  - yorum/işlem-yönergesi düğümleri atılır
 *  - `xmlns*` öznitelikleri korunur (dışa aktarımda gerekir)
 *  - GÜVENLİK: aktif içerik ayıklanır — `<script>` öğeleri, `on*` event
 *    handler öznitelikleri ve `javascript:` href'leri modele HİÇ alınmaz.
 *    Editör hiçbir zaman yazar betiğini çalıştırmaz; CSP'ye ek, derinlemesine
 *    savunma katmanıdır (`foreignObject` gibi meşru yapılar korunur).
 */

/** Kaldırılmış/eşlenen eleman adları → normalize karşılığı. */
const ETIKET_ESLEME: Record<string, string> = {
  animateColor: 'animate',
};

/** Editör kontrol yorumu: `<!-- @svgtron lock=true artboard=true -->` (İlke 10). */
const SVGTRON_YORUMU = /@svgtron\b/i;
const LOCK_RE = /\block\s*=\s*true\b/i;
const ARTBOARD_RE = /\bartboard\s*=\s*true\b/i;

/** Betik taşıyabilen şema (href/xlink:href değerinde reddedilir). */
const TEHLIKELI_SEMA = /^\s*javascript:/i;

/** Boşluğun anlamlı olabileceği metin elemanları (ham içerik korunur). */
const METIN_ELEMANLARI = new Set(['text', 'tspan', 'textPath']);

/** Bir SVG DOM elemanını model düğümüne dönüştürür (özyinelemeli). */
function elemandanDugum(el: Element): Dugum {
  // Normalizasyonu yerel ad üzerinde yap, ad-uzayı önekini KORU (örn.
  // `inkscape:label`, `sodipodi:namedview` — liberal okuma sadakatle taşımalı).
  const yerel = ETIKET_ESLEME[el.localName] ?? el.localName;
  const etiket = el.prefix ? `${el.prefix}:${yerel}` : yerel;

  const oznitelikler = new Map<string, string>();
  for (const attr of Array.from(el.attributes)) {
    // on* event handler'ları (onload/onclick/onbegin...) hiç alınmaz.
    if (/^on/i.test(attr.name)) continue;
    // javascript: şemalı href/xlink:href reddedilir (boş bırakılır).
    if (/(^|:)href$/i.test(attr.name) && TEHLIKELI_SEMA.test(attr.value)) continue;
    oznitelikler.set(attr.name, attr.value);
  }

  // Çocukları gez; editör yorumları (İlke 10) bir sonraki elemana iliştirilir.
  const cocuklar: Dugum[] = [];
  let kilitBekleyen = false;
  let artboardBekleyen = false;
  for (const c of Array.from(el.childNodes)) {
    if (c.nodeType === 8 /* COMMENT_NODE */) {
      const tx = c.textContent ?? '';
      if (SVGTRON_YORUMU.test(tx)) {
        if (LOCK_RE.test(tx)) kilitBekleyen = true;
        if (ARTBOARD_RE.test(tx)) artboardBekleyen = true;
      }
      continue;
    }
    if (c.nodeType === 1 /* ELEMENT_NODE */) {
      // <script> öğesi (ad-uzayı önekli olsa da) tümden atılır.
      if ((c as Element).localName === 'script') continue;
      const cocuk = elemandanDugum(c as Element);
      if (kilitBekleyen) cocuk.kilitli = true;
      if (artboardBekleyen) cocuk.artboard = true;
      kilitBekleyen = false;
      artboardBekleyen = false;
      cocuklar.push(cocuk);
    }
  }

  // Element çocuğu yoksa pür metin içeriği koru (text/style/title/desc...).
  // Metin elemanlarında (text/tspan/textPath) boşluk anlamlı olabilir → ham
  // içeriği koru; diğer leaf'lerde yalnız boşluk-dışı içeriği sakla (pretty-print
  // girinti gürültüsünü atar).
  let metin: string | undefined;
  if (cocuklar.length === 0) {
    const ham = el.textContent ?? '';
    const anlamli = METIN_ELEMANLARI.has(el.localName) ? ham.length > 0 : ham.trim().length > 0;
    if (anlamli) metin = ham;
  }

  return dugumOlustur(etiket, oznitelikler, cocuklar, metin);
}

/**
 * SVG metnini ayrıştırıp belge modelinin kökünü (soyut düğüm) döndürür.
 * @throws Geçersiz/ayrıştırılamayan SVG'de hata fırlatır.
 */
export function iceAktar(metin: string): Dugum {
  const doc = new DOMParser().parseFromString(metin, 'image/svg+xml');
  if (
    doc.querySelector('parsererror') ||
    !(doc.documentElement instanceof SVGSVGElement)
  ) {
    throw new Error('Geçersiz SVG: belge ayrıştırılamadı.');
  }
  return elemandanDugum(doc.documentElement);
}
