/**
 * `style` (inline) dizesinde tek bir CSS özelliğini ayarlar/siler; yeni dizeyi
 * döndürür. Boş değer özelliği siler. Sıra korunur.
 */
export function stilAyarla(
  mevcut: string | null,
  ozellik: string,
  deger: string,
): string {
  const harita = new Map<string, string>();
  for (const parca of (mevcut ?? '').split(';')) {
    const i = parca.indexOf(':');
    if (i === -1) continue;
    const k = parca.slice(0, i).trim();
    const v = parca.slice(i + 1).trim();
    if (k) harita.set(k, v);
  }
  if (deger.trim() === '') harita.delete(ozellik);
  else harita.set(ozellik, deger.trim());
  return [...harita].map(([k, v]) => `${k}: ${v}`).join('; ');
}

/** `style` dizesinden tek bir özelliğin değerini okur (yoksa null). */
export function stilOku(style: string | null, ozellik: string): string | null {
  for (const parca of (style ?? '').split(';')) {
    const i = parca.indexOf(':');
    if (i === -1) continue;
    if (parca.slice(0, i).trim() === ozellik) return parca.slice(i + 1).trim();
  }
  return null;
}
