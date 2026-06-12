/**
 * `<style>` metni içinde tek bir BASİT sınıf kuralını (`.sinif { ... }`)
 * düzenleyen saf yardımcılar (DOM'a bağlı değil). CSS yazım modunun (TK-18)
 * "nesne başına sınıf" stratejisi bunları kullanır.
 *
 * Önemli: yalnız hedef basit kural (iç içe brace YOK) düzenlenir; `@keyframes`/
 * `@media` blokları ve yorumlar AYNEN korunur (regex iç-brace içermeyen gövde
 * eşler; yeni kurallar metin sonuna eklenir).
 */

/** `a: b; c: d` gövdesini ad→değer haritasına ayrıştırır. */
function bildirimAyristir(govde: string): Map<string, string> {
  const harita = new Map<string, string>();
  for (const parca of govde.split(';')) {
    const i = parca.indexOf(':');
    if (i === -1) continue;
    const ad = parca.slice(0, i).trim();
    const deger = parca.slice(i + 1).trim();
    if (ad) harita.set(ad, deger);
  }
  return harita;
}

function bildirimYaz(harita: Map<string, string>): string {
  return [...harita].map(([k, v]) => `${k}: ${v}`).join('; ');
}

function kacis(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * `<style>` metnindeki `selector` kuralının `ozellik`'ini ayarlar/siler ve yeni
 * metni döndürür. Kural yoksa ve değer doluysa metin sonuna eklenir. Boş değer
 * özelliği siler; sonuçta kural boş kalsa bile (zararsız) bırakılır.
 */
export function cssKuralYaz(
  styleMetni: string,
  selector: string,
  ozellik: string,
  deger: string,
): string {
  const re = new RegExp(`(${kacis(selector)}\\s*\\{)([^{}]*)(\\})`);
  let bulundu = false;
  const cikti = styleMetni.replace(re, (_tam, ac: string, govde: string, kapa: string) => {
    bulundu = true;
    const harita = bildirimAyristir(govde);
    if (deger.trim() === '') harita.delete(ozellik);
    else harita.set(ozellik, deger.trim());
    const s = bildirimYaz(harita);
    return s ? `${ac} ${s} ${kapa}` : `${ac} ${kapa}`;
  });
  if (bulundu) return cikti;
  if (deger.trim() === '') return styleMetni; // eklenecek bir şey yok
  const yeniKural = `${selector} { ${ozellik}: ${deger.trim()} }`;
  return styleMetni.trim() ? `${styleMetni.replace(/\s+$/, '')}\n${yeniKural}\n` : `\n${yeniKural}\n`;
}

/** `<style>` metnindeki bir basit kuralın bir özelliğinin değeri (yoksa null). */
export function cssKuralOku(styleMetni: string, selector: string, ozellik: string): string | null {
  const re = new RegExp(`${kacis(selector)}\\s*\\{([^{}]*)\\}`);
  const m = re.exec(styleMetni);
  if (!m) return null;
  return bildirimAyristir(m[1]!).get(ozellik) ?? null;
}
