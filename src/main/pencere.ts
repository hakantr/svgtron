import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { KANALLAR } from '../ortak/api-sozlesmesi';

/**
 * Renderer'ın kapanışı ONAYLADIĞI pencereler. Onaylı pencerede 'close' engellenmez
 * → normal kapanış/çıkış zinciri (Cmd+Q, before-quit, window-all-closed) işler.
 */
const onayliKapanis = new WeakSet<BrowserWindow>();

/**
 * Renderer kaydetme sorusunu geçtikten sonra pencereyi GERÇEKTEN kapatır. Onay
 * bayrağı set edilip `close()` çağrılır (destroy değil) → uygulama çıkış zinciri
 * (window-all-closed → quit) doğru ilerler.
 */
export function pencereyiOnaylayipKapat(pencere: BrowserWindow): void {
  onayliKapanis.add(pencere);
  pencere.close();
}

/** Uygulama amblemi (pencere/görev çubuğu ikonu) — varsa yolu, yoksa null. */
export function ikonYolu(): string | null {
  const yol = join(app.getAppPath(), 'resources', 'amblem.png');
  return existsSync(yol) ? yol : null;
}

/** Yalnızca güvenli web şemaları dışarı (varsayılan tarayıcıya) verilir. */
function guvenliDisBaglanti(url: string): boolean {
  try {
    const { protocol } = new URL(url); // protocol zaten küçük harfe normalize
    return protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

/**
 * Adres uygulamanın kendi kaynağına mı ait? (dev'de aynı origin, üretimde
 * yerel `file:`). Origin bazlı karşılaştırma; iç yol/hash değişimleri yanlışlıkla
 * engellenmez.
 */
function uygulamaIciAdres(url: string, rendererUrl: string | undefined): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return true;
    if (rendererUrl) return u.origin === new URL(rendererUrl).origin;
    return false;
  } catch {
    return false;
  }
}

/**
 * Ana pencereyi oluşturur ve CLAUDE.md §3 güvenlik modelini ZORUNLU kılar.
 *
 * Pencere ÇERÇEVESİZdir; başlık çubuğu renderer'da özel olarak çizilir:
 *   - macOS: yerel trafik-ışıkları görünür kalır (titleBarStyle: 'hidden'),
 *   - Windows/Linux: çerçeve tamamen kapatılır (frame: false); kontrol tuşlarını
 *     renderer çizer ve köprü üzerinden bu sürece iletir.
 */
export function pencereOlustur(): BrowserWindow {
  const macOS = process.platform === 'darwin';
  const ikon = ikonYolu();

  const pencere = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // titreme olmaması için içerik hazır olunca gösterilir
    backgroundColor: '#121316',
    // Görev çubuğu/pencere ikonu (Win/Linux; macOS paket ikonunu kullanır).
    ...(ikon ? { icon: ikon } : {}),
    // Platforma göre başlık çubuğu davranışı:
    ...(macOS
      ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 14, y: 13 } }
      : { frame: false }),
    webPreferences: {
      preload: join(__dirname, '../preload/kopru.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  pencere.once('ready-to-show', () => pencere.show());

  // Kapanış engelleyici: HER kapanış yolu (özel kapat tuşu, Cmd/Alt+F4, pencere
  // yöneticisi, Cmd+Q) önce renderer'a sorulur; renderer kaydedilmemiş değişiklik
  // varsa kullanıcıya kaydetmeyi sorar ve onaylarsa `pencereKapatGercek` →
  // {@link pencereyiOnaylayipKapat} ile onaylı kapanır (bu kez engellenmez).
  // Onaylıysa ya da webContents yıkıldıysa/yanıt veremiyorsa engelleme yapma
  // (asılı kalmasın); böylece çıkış zinciri de doğru ilerler.
  let kapanisIstendi = false;
  pencere.on('close', (olay) => {
    if (onayliKapanis.has(pencere) || pencere.webContents.isDestroyed()) return;
    olay.preventDefault();
    kapanisIstendi = true;
    pencere.webContents.send(KANALLAR.pencereKapanisIstegi);
  });
  // Asılı kalma koruması: renderer ÇÖKERSE ya da kapanış istendikten sonra YANIT
  // VEREMEZ olursa pencereyi zorla yık (aksi halde 'close' kalıcı engellenirdi).
  const zorlaKapat = (): void => {
    if (!pencere.isDestroyed()) pencere.destroy();
  };
  pencere.webContents.on('render-process-gone', zorlaKapat);
  pencere.on('unresponsive', () => {
    if (kapanisIstendi) zorlaKapat(); // yalnız kapanış beklenirken (normal yoğun işte değil)
  });

  // Kapla/geri-al durumunu renderer'a bildir (kontrol tuşu ikonu güncellensin).
  const durumGonder = (): void => {
    pencere.webContents.send(KANALLAR.pencereDurumDegisti, pencere.isMaximized());
  };
  pencere.on('maximize', durumGonder);
  pencere.on('unmaximize', durumGonder);

  // Geliştirmede electron-vite dev sunucusu, üretimde paketlenmiş dosya.
  const rendererUrl = process.env['ELECTRON_RENDERER_URL'];

  // Harici bağlantılar varsayılan tarayıcıda açılır; uygulama penceresi
  // içinde gezinme/yeni pencere engellenir (güvenlik). shell.openExternal OS
  // kabuğunu kullandığından YALNIZCA güvenli web şemaları (http/https/mailto)
  // dışarı verilir; güvenilmeyen bir SVG `file:`/UNC/özel-uygulama protokolü
  // (örn. NTLM-hash sızdıran `\\sunucu\paylasim`) ile bu kapıyı kötüye
  // kullanamasın. Parse hatası dahil her durumda yeni pencere reddedilir.
  pencere.webContents.setWindowOpenHandler(({ url }) => {
    if (guvenliDisBaglanti(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  // Uygulama penceresinin KENDİSİNİN başka bir adrese gitmesini engelle
  // (Electron güvenlik checklist'i). Güvenilmeyen SVG içindeki `<a href>`
  // tıklanınca top-level navigation olur; izin verilirse renderer yerini
  // saldırganın sayfasına bırakır ve window.api köprüsü ona açık kalır.
  // Yalnızca uygulamanın kendi kaynağına (dev sunucusu) / yerel dosyasına
  // gezinmeye izin ver; gerisini engelle, harici ise tarayıcıya yönlendir.
  const icGezinme = (olay: Electron.Event, url: string): void => {
    if (uygulamaIciAdres(url, rendererUrl)) return;
    olay.preventDefault();
    if (guvenliDisBaglanti(url)) void shell.openExternal(url);
  };
  pencere.webContents.on('will-navigate', icGezinme);
  pencere.webContents.on('will-frame-navigate', (olay) => icGezinme(olay, olay.url));

  if (rendererUrl) {
    void pencere.loadURL(rendererUrl);
  } else {
    void pencere.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return pencere;
}
