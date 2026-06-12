import { dialog, type BrowserWindow } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { AcilanDosya } from '../ortak/api-sozlesmesi';

/**
 * Dosya servisi — tüm fs işleri burada (CLAUDE.md §4). Renderer asla `fs` ya da
 * `dialog` görmez; yalnızca tipli köprü kanalından geçer (İlke 1, §3 güvenlik).
 */

/**
 * Kullanıcıya SVG dosyası seçtirir ve içeriğini okur.
 * @param pencere Dialog'un bağlanacağı ana pencere (modal; görev çubuğunda ayrı
 *   pencere olarak görünmesini engeller).
 * @returns Seçilen dosya bilgisi; iptal edilirse null.
 */
export async function svgDosyasiAc(
  pencere?: BrowserWindow | null,
): Promise<AcilanDosya | null> {
  const secenekler = {
    title: 'SVG Aç',
    properties: ['openFile' as const],
    filters: [{ name: 'SVG', extensions: ['svg'] }],
  };
  const sonuc = pencere
    ? await dialog.showOpenDialog(pencere, secenekler)
    : await dialog.showOpenDialog(secenekler);

  if (sonuc.canceled || sonuc.filePaths.length === 0) {
    return null;
  }

  const yol = sonuc.filePaths[0];
  const icerik = await readFile(yol, 'utf-8');
  return { yol, ad: basename(yol), icerik };
}

/**
 * Verilen yoldaki SVG'yi okur (son dosyalar listesinden yeniden açma). Güvenlik:
 * yalnızca `.svg` uzantılı dosyalar okunur (rastgele dosya okuma yüzeyini daraltır);
 * okunamazsa null döner.
 */
export async function svgYoldanAc(yol: string): Promise<AcilanDosya | null> {
  if (typeof yol !== 'string' || !/\.svg$/i.test(yol)) return null;
  try {
    const icerik = await readFile(yol, 'utf-8');
    return { yol, ad: basename(yol), icerik };
  } catch {
    return null; // dosya yok / izin yok
  }
}

/**
 * SVG içeriğini bir dosyaya kaydeder (İlke 10: tek doğal format SVG).
 * @returns Kaydedilen yol; iptal edilirse null.
 */
export async function svgKaydet(
  pencere: BrowserWindow | null,
  icerik: string,
  varsayilanAd: string,
): Promise<string | null> {
  const secenekler = {
    title: 'SVG Kaydet',
    defaultPath: varsayilanAd,
    filters: [{ name: 'SVG', extensions: ['svg'] }],
  };
  const sonuc = pencere
    ? await dialog.showSaveDialog(pencere, secenekler)
    : await dialog.showSaveDialog(secenekler);
  if (sonuc.canceled || !sonuc.filePath) return null;
  await writeFile(sonuc.filePath, icerik, 'utf-8');
  return sonuc.filePath;
}

const GORSEL_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif',
};

/** Kullanıcıya görsel seçtirir ve data-URI olarak okur (SVG'ye gömülür). */
export async function gorselDosyasiAc(
  pencere?: BrowserWindow | null,
): Promise<{ dataUri: string } | null> {
  const secenekler = {
    title: 'Görsel Yerleştir',
    properties: ['openFile' as const],
    filters: [{ name: 'Görsel', extensions: Object.keys(GORSEL_MIME) }],
  };
  const sonuc = pencere
    ? await dialog.showOpenDialog(pencere, secenekler)
    : await dialog.showOpenDialog(secenekler);
  if (sonuc.canceled || sonuc.filePaths.length === 0) return null;
  const yol = sonuc.filePaths[0]!;
  const uzanti = yol.split('.').pop()?.toLowerCase() ?? '';
  const mime = GORSEL_MIME[uzanti];
  // Tanınmayan uzantı (örn. uzantısız ya da "Tüm dosyalar" ile seçilen): bozuk
  // bir octet-stream data-URI üretmek yerine yerleştirmeyi reddet (<image>'da
  // güvenilir render olmaz). Çağıran null'ı sessizce yok sayar.
  if (!mime) return null;
  const veri = await readFile(yol);
  return { dataUri: `data:${mime};base64,${veri.toString('base64')}` };
}
