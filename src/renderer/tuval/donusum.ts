/**
 * Tuval dönüşüm yardımcıları — taşıma/boyutlandırma için ekran↔kullanıcı
 * koordinat dönüşümü ve `transform` dizesi düzenleme.
 */

export function say(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * `transform` dizesine (dx, dy) ötelemesi ekler. Baştaki `translate` varsa ona
 * eklenir (birikmez), yoksa başa eklenir. Geri kalan dönüşümler korunur.
 */
export function transformTasi(mevcut: string, dx: number, dy: number): string {
  const t = (mevcut ?? '').trim();
  const m = t.match(/^translate\(\s*(-?[\d.eE+]+)(?:[ ,]+(-?[\d.eE+]+))?\s*\)\s*([\s\S]*)$/);
  if (m) {
    const x = parseFloat(m[1]!) + dx;
    const y = (m[2] !== undefined ? parseFloat(m[2]!) : 0) + dy;
    const kalan = m[3]!.trim();
    return `translate(${say(x)}, ${say(y)})${kalan ? ' ' + kalan : ''}`;
  }
  const yeni = `translate(${say(dx)}, ${say(dy)})`;
  return t ? `${yeni} ${t}` : yeni;
}

/**
 * Ekran-uzayı bir DELTA'yı (sdx, sdy) verilen CTM'nin (kullanıcı→ekran) ait
 * olduğu kullanıcı uzayına çevirir. Yalnız doğrusal kısım kullanılır (öteleme
 * yok), çünkü bu bir vektördür.
 */
export function ekranDeltaKullanici(
  ctm: DOMMatrix,
  sdx: number,
  sdy: number,
): { x: number; y: number } {
  const inv = ctm.inverse();
  return { x: inv.a * sdx + inv.c * sdy, y: inv.b * sdx + inv.d * sdy };
}

/** Ayrıştırılmış 2B dönüşüm bileşenleri (öteleme/döndürme/eğme/ölçek; açı DERECE). */
export interface DonusumParcalari {
  /** Öteleme (kullanıcı birimi). */
  tx: number;
  ty: number;
  /** Döndürme (derece). */
  donme: number;
  /** X-eğme (derece). */
  egme: number;
  /** Ölçek (1 = doğal). */
  sx: number;
  sy: number;
}

/**
 * Bir 2B afin matrisi (her transform notasyonu — matrix/translate/rotate/scale/skew,
 * zincirli olsa da — bir matrise indirgenir) öteleme·döndürme·eğme·ölçek bileşenlerine
 * AYRIŞTIRIR. CSS 2D matris ayrıştırma algoritmasına dayanır; `donusumKur` ile tersi
 * matrisi yeniden üretir (kayıpsız). Böylece denetçi, dağınık bir transform zincirini
 * (örn. `translate(0,0) scale(.7,.7) translate(0,0)`) temiz, düzenlenebilir alanlara döker.
 */
export function donusumAyristir(m: DOMMatrix): DonusumParcalari {
  let r0x = m.a, r0y = m.b, r1x = m.c, r1y = m.d;
  let sx = Math.hypot(r0x, r0y);
  if (sx) { r0x /= sx; r0y /= sx; }
  let egmeKesme = r0x * r1x + r0y * r1y; // row0·row1
  r1x -= r0x * egmeKesme; r1y -= r0y * egmeKesme; // row1'i row0'a dik yap
  let sy = Math.hypot(r1x, r1y);
  if (sy) { r1x /= sy; r1y /= sy; egmeKesme /= sy; }
  // Yansıma (negatif determinant) → sx işaretini çevir.
  if (r0x * r1y - r0y * r1x < 0) { sx = -sx; r0x = -r0x; r0y = -r0y; egmeKesme = -egmeKesme; }
  const RAD = 180 / Math.PI;
  return {
    tx: m.e,
    ty: m.f,
    donme: Math.atan2(r0y, r0x) * RAD,
    egme: Math.atan(egmeKesme) * RAD,
    sx,
    sy,
  };
}

/**
 * {@link donusumAyristir}'ın tersi — bileşenleri OKUNUR bir SVG transform dizesine
 * kurar (birim olmayan parçalar atlanır; hepsi birim ise boş dize). Sıra
 * translate·rotate·skewX·scale (ayrıştırmayla aynı) → matris birebir yeniden üretilir.
 */
export function donusumKur(p: DonusumParcalari): string {
  const parcalar: string[] = [];
  if (Math.abs(p.tx) > 1e-4 || Math.abs(p.ty) > 1e-4) parcalar.push(`translate(${say(p.tx)}, ${say(p.ty)})`);
  if (Math.abs(p.donme) > 1e-4) parcalar.push(`rotate(${say(p.donme)})`);
  if (Math.abs(p.egme) > 1e-4) parcalar.push(`skewX(${say(p.egme)})`);
  if (Math.abs(p.sx - 1) > 1e-4 || Math.abs(p.sy - 1) > 1e-4) parcalar.push(`scale(${say(p.sx)}, ${say(p.sy)})`);
  return parcalar.join(' ');
}
