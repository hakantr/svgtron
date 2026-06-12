import { type Dugum } from './model/dugum';

/**
 * Konum modeli yardımcıları (CLAUDE.md §9.8).
 *
 * Her nesnenin "canlı" konumunu (x, y) kendi ebeveyninin koordinatlarında
 * okur. Bazı şekiller konumu farklı attribute çiftiyle taşır (circle/ellipse →
 * cx/cy). Konumu olmayan şekiller (path, polygon, line...) için null döner.
 */

/** Şekil türü → konum attribute çifti (x-benzeri, y-benzeri). */
const KONUM_ALANLARI: Record<string, readonly [string, string]> = {
  rect: ['x', 'y'],
  image: ['x', 'y'],
  text: ['x', 'y'],
  use: ['x', 'y'],
  foreignObject: ['x', 'y'],
  circle: ['cx', 'cy'],
  ellipse: ['cx', 'cy'],
};

/**
 * Saf sayısal konum değeri. Eksik/boş öznitelik SVG varsayılanı olan 0'a düşer;
 * fakat BİRİMLİ/yüzde değer (`10%`, `2em`) saf sayı değildir → `null` sinyali
 * döner. Böyle değerler `Number(...)` ile sessizce 0'a çevrilip baseline'ı
 * (§9.8) yanlış kurmamalı (bkz. GELISTIRME-DURUMU §4.3).
 */
function safSayi(deger: string | undefined): number | null {
  if (deger === undefined || deger.trim() === '') return 0;
  const n = Number(deger);
  return Number.isFinite(n) ? n : null;
}

/** Düğümün konum attribute çiftini döndürür (yoksa null). */
export function konumAlanlari(etiket: string): readonly [string, string] | null {
  return KONUM_ALANLARI[etiket] ?? null;
}

/**
 * Düğümün canlı konumunu (x, y) okur; konumu yoksa VEYA birimli/yüzde değer
 * taşıyorsa null (o nesnenin geometri alanları gösterilmez → sessiz `%→mutlak`
 * üstüne-yazma engellenir).
 */
export function konumOku(dugum: Dugum): { x: number; y: number } | null {
  const alanlar = konumAlanlari(dugum.etiket);
  if (!alanlar) return null;
  const x = safSayi(dugum.oznitelikler.get(alanlar[0]));
  const y = safSayi(dugum.oznitelikler.get(alanlar[1]));
  if (x === null || y === null) return null;
  return { x, y };
}
