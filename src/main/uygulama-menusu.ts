import {
  app,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
} from "electron";
import { KANALLAR, type NativeMenuGrubu } from "../ortak/api-sozlesmesi";

/**
 * macOS native uygulama menüsü (TK-36) — yalnız `darwin`'de etkin. Renderer, menü
 * registry'sinden ürettiği yapıyı IPC ile gönderir; main bunu Electron `Menu`'süne
 * çevirir. Eylem mantığı KOPYALANMAZ: tıklama, eylem id'sini renderer'a geri yollar,
 * orada `menuKayitDefteri` çalıştırır (tek doğruluk kaynağı registry — İlke 5).
 *
 * Windows/Linux'ta renderer bu kanalı hiç çağırmaz (hamburger menü korunur); bu
 * handler da darwin dışında erken döner → diğer platformlarda SIFIR etki.
 */
export function uygulamaMenusunuBagla(): void {
  ipcMain.on(
    KANALLAR.uygulamaMenusu,
    (olay, gruplar: NativeMenuGrubu[]) => {
      if (process.platform !== "darwin") return;
      const gonder = (id: string): void =>
        olay.sender.send(KANALLAR.menuEylem, id);
      const sablon: MenuItemConstructorOptions[] = [
        {
          // Uygulama menüsü (macOS kuralları): Hakkında + Gizle/Çıkış rolleri.
          label: app.getName(),
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
        ...gruplar.map(
          (g): MenuItemConstructorOptions => ({
            label: g.etiket,
            submenu: g.ogeler.map((o) => ({
              label: o.etiket,
              click: () => gonder(o.id),
            })),
          }),
        ),
        // Standart Pencere menüsü (macOS beklentisi).
        { role: "windowMenu" },
      ];
      Menu.setApplicationMenu(Menu.buildFromTemplate(sablon));
    },
  );
}
