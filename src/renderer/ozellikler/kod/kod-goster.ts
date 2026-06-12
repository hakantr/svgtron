import { html, nothing, type TemplateResult } from 'lit';
import type { Dugum } from '../../../cekirdek/belge/model/dugum';
import {
  metinKacis,
  metinElemaniMi,
  oznitelikDizesi,
  editorYorumDizesi,
  uretilemez,
} from '../../../cekirdek/belge/model/disa-aktar';

/**
 * Kod GÖRÜNÜMÜ üreticisi (§11.4) — belge modelini, dışa aktarıcıyla AYNI biçimde
 * (girintili, metin elemanları satır-içi) ama her elemanı `data-kimlik`'li,
 * tıklanabilir bir `<span>` içine sararak çizer. Böylece koddaki bir elemana
 * tıklayınca o düğüm seçilebilir ve seçili düğüm(ler) vurgulanabilir.
 *
 * VURGU SEÇİMDEN BAĞIMSIZDIR: bu üretici seçim durumunu BİLMEZ; `.secili` sınıfı
 * panelde imperatif olarak (her seçim değişiminde ağacı yeniden üretmeden) eklenir.
 * Böylece büyük belgede tıklama başına O(n) string üretimi olmaz (yalnız belge
 * içeriği değişince yeniden kurulur).
 *
 * Tek doğruluk kaynağı yine belge modelidir (İlke 3); biçim mantığı çekirdek dışa
 * aktarıcının yardımcılarıyla paylaşılır → ikisi sürüklenmez. Kaçış (xml/metin)
 * çıktının SVG KAYNAĞIYLA birebir görünmesi içindir (lit metni ayrıca düz-metin
 * olarak yazar; ekranda kaçışlı kaynak görünür — dosyadaki hâliyle aynı).
 */

/** Satır-içi (tek satır) bir düğümü ham metin olarak seri hâle getirir. */
function satirIciMetin(d: Dugum): string {
  const oz = oznitelikDizesi(d);
  if (d.cocuklar.length === 0 && d.metin === undefined) return `<${d.etiket}${oz}/>`;
  let s = `<${d.etiket}${oz}>`;
  if (d.metin !== undefined) s += metinKacis(d.metin);
  for (const c of d.cocuklar) {
    if (uretilemez(c.etiket)) continue;
    s += satirIciMetin(c);
  }
  return s + `</${d.etiket}>`;
}

/** Bir düğümü (ve alt ağacını) tıklanabilir span ağacına çevirir. */
function dugumGoster(d: Dugum, derinlik: number): TemplateResult | typeof nothing {
  if (uretilemez(d.etiket)) return nothing; // §10.10: üretilmeyen yapı görünümde de yok
  const girinti = '  '.repeat(derinlik);
  const yorum = editorYorumDizesi(d);

  const metinYaprak = d.metin !== undefined && d.cocuklar.length === 0;
  const bosMu = d.cocuklar.length === 0 && d.metin === undefined;
  const satirIci = bosMu || metinYaprak || metinElemaniMi(d.etiket);

  // İlke 10 yorumu (kilit/artboard) elemanın ÜSTÜNDE; düğüme aittir → span içinde.
  const yorumParca = yorum ? html`<span class="yorum">${girinti}${yorum}\n</span>` : '';

  if (satirIci) {
    return html`<span class="el" data-kimlik=${d.kimlik}>${yorumParca}${girinti}${satirIciMetin(d)}</span>\n`;
  }

  const acilis = `<${d.etiket}${oznitelikDizesi(d)}>`;
  const kapanis = `</${d.etiket}>`;
  // Karışık içerik (metin + element çocuk, metin-elemanı olmayan) nadir; yine de
  // metni DÜŞÜRME (dışa aktarıcıyla tutarlı; sessiz kayıp olmasın).
  const govdeMetin = d.metin !== undefined ? metinKacis(d.metin) : '';
  return html`<span class="el" data-kimlik=${d.kimlik}>${yorumParca}${girinti}${acilis}\n${govdeMetin}${d.cocuklar.map(
    (c) => dugumGoster(c, derinlik + 1),
  )}${girinti}${kapanis}</span>\n`;
}

/** Kök düğümü, tıklanabilir/vurgulanabilir kod görünümüne çevirir. */
export function kodGorunumu(kok: Dugum): TemplateResult | typeof nothing {
  return dugumGoster(kok, 0);
}
