import { app, BrowserWindow, ipcMain } from "electron";
import { KANALLAR, type SurumBilgisi } from "../ortak/api-sozlesmesi";
import { pencereOlustur, ikonYolu, pencereyiOnaylayipKapat } from "./pencere";
import {
  svgDosyasiAc,
  svgYoldanAc,
  svgKaydet,
  gorselDosyasiAc,
} from "./dosya-servisi";
import { dilDosyasiniSenkronla } from "./dil-servisi";

/**
 * Electron ana süreç giriş noktası.
 *
 * Bu süreç Node yeteneklerine (fs, pencere, menü...) sahiptir; renderer'a hiçbir
 * şeyi doğrudan açmaz. Renderer ile tek temas noktası, tipli IPC sözleşmesidir
 * (AGENTS.md İlke 4).
 */

// Uygulama kimliği — Linux/Wayland'de pencere app_id'si; dock bunu `.desktop`
// dosyasıyla eşleyip amblemi gösterir (X11'de WM_CLASS olur). Sabitlemezsek
// dock varsayılan Electron ikonunu gösterir. (Kurulum: resources/dock-ikonu-kur.sh)
const UYGULAMA_KIMLIGI = "svgtron";
app.setName(UYGULAMA_KIMLIGI);
app.commandLine.appendSwitch("class", UYGULAMA_KIMLIGI);

// Sürüm bilgisi handler'ı — tipli köprünün uçtan uca çalıştığını kanıtlar.
// İleride dosya servisi vb. yetenekler de aynı desende buraya eklenecek.
ipcMain.handle(
  KANALLAR.surumBilgisi,
  (): SurumBilgisi => ({
    uygulama: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }),
);

// Dosya açma handler'ı — fs ve dialog yalnızca main'de; renderer köprüden ister.
// Dialog, olayı gönderen pencereye bağlanır (modal; görev çubuğunda ayrı görünmez).
ipcMain.handle(KANALLAR.dosyaAc, (olay) =>
  svgDosyasiAc(BrowserWindow.fromWebContents(olay.sender)),
);
ipcMain.handle(KANALLAR.dosyaYoldanAc, (_olay, yol: string) =>
  svgYoldanAc(yol),
);
ipcMain.handle(KANALLAR.dosyaKaydet, (olay, icerik: string, ad: string) =>
  svgKaydet(BrowserWindow.fromWebContents(olay.sender), icerik, ad),
);
ipcMain.handle(KANALLAR.gorselAc, (olay) =>
  gorselDosyasiAc(BrowserWindow.fromWebContents(olay.sender)),
);
// Dil dosyası bakımı (TK-28): eksik anahtarları `<kod>.dil`'e `= ?` olarak ekler
// (yalnız geliştirme; argümanlar servis tarafında sıkı doğrulanır).
ipcMain.handle(KANALLAR.dilSenkron, (_olay, kod: string, eksik: string[]) =>
  dilDosyasiniSenkronla(kod, eksik),
);

// Pencere kontrolleri (çerçevesiz pencere). İşlem, olayı gönderen pencereye
// uygulanır; böylece renderer pencere nesnesine doğrudan erişmez (İlke 1, §3).
ipcMain.on(KANALLAR.pencereSimgelestir, (olay) => {
  BrowserWindow.fromWebContents(olay.sender)?.minimize();
});
ipcMain.on(KANALLAR.pencereBuyutGeriAl, (olay) => {
  const pencere = BrowserWindow.fromWebContents(olay.sender);
  if (!pencere) return;
  pencere.isMaximized() ? pencere.unmaximize() : pencere.maximize();
});
ipcMain.on(KANALLAR.pencereKapat, (olay) => {
  // close() → pencere.on('close') engelleyicisi kapanış-onayı akışını başlatır.
  BrowserWindow.fromWebContents(olay.sender)?.close();
});
// Renderer kapanışı onayladı → onay bayrağıyla normal kapanışı (çıkış zinciri dahil)
// ilerlet.
ipcMain.on(KANALLAR.pencereKapatGercek, (olay) => {
  const pencere = BrowserWindow.fromWebContents(olay.sender);
  if (pencere) pencereyiOnaylayipKapat(pencere);
});
ipcMain.handle(
  KANALLAR.pencereKaplandiMi,
  (olay) => BrowserWindow.fromWebContents(olay.sender)?.isMaximized() ?? false,
);

app.whenReady().then(() => {
  // macOS: dock ikonu (Win/Linux'ta pencere `icon` seçeneğiyle ayarlanır).
  const ikon = ikonYolu();
  if (process.platform === "darwin" && ikon) {
    app.dock?.setIcon(ikon);
  }

  pencereOlustur();
});

// TÜM platformlarda ana pencere kapanınca uygulamadan çık (kullanıcı isteği —
// macOS'ta da pencere kapanışı uygulamayı sonlandırır). Kaydedilmemiş değişiklik
// sorusu zaten pencere kapanış engelleyicisinde sorulur (bkz. pencere.ts).
app.on("window-all-closed", () => {
  app.quit();
});
