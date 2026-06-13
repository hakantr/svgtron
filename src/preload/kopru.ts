import { contextBridge, ipcRenderer } from "electron";
import { KANALLAR, type KopruApi } from "../ortak/api-sozlesmesi";

/**
 * Preload köprüsü: renderer'a açılan TEK, dar ve tiplenmiş yüzey (İlke 4).
 *
 * Renderer `ipcRenderer`'ı asla doğrudan görmez; yalnızca aşağıdaki `api`
 * nesnesini (window.api) görür. Yeni yetenek = bu nesneye, sözleşmedeki bir
 * kanala karşılık gelen yeni bir metot eklemek.
 */
const api: KopruApi = {
  platform: process.platform,
  surumBilgisiAl: () => ipcRenderer.invoke(KANALLAR.surumBilgisi),
  dosyaAc: () => ipcRenderer.invoke(KANALLAR.dosyaAc),
  dosyaYoldanAc: (yol) => ipcRenderer.invoke(KANALLAR.dosyaYoldanAc, yol),
  dosyaKaydet: (icerik, ad) =>
    ipcRenderer.invoke(KANALLAR.dosyaKaydet, icerik, ad),
  gorselAc: () => ipcRenderer.invoke(KANALLAR.gorselAc),
  dilDosyasiSenkron: (kod, eksik) =>
    ipcRenderer.invoke(KANALLAR.dilSenkron, kod, eksik),
  pencereSimgelestir: () => ipcRenderer.send(KANALLAR.pencereSimgelestir),
  pencereBuyutGeriAl: () => ipcRenderer.send(KANALLAR.pencereBuyutGeriAl),
  pencereKapat: () => ipcRenderer.send(KANALLAR.pencereKapat),
  pencereKapanisinaAbone: (geriCagri) => {
    const dinleyici = (): void => geriCagri();
    ipcRenderer.on(KANALLAR.pencereKapanisIstegi, dinleyici);
    return () =>
      ipcRenderer.removeListener(KANALLAR.pencereKapanisIstegi, dinleyici);
  },
  pencereKapatGercek: () => ipcRenderer.send(KANALLAR.pencereKapatGercek),
  pencereKaplandiMi: () => ipcRenderer.invoke(KANALLAR.pencereKaplandiMi),
  pencereDurumunaAbone: (geriCagri) => {
    const dinleyici = (_olay: unknown, kaplandi: boolean): void =>
      geriCagri(kaplandi);
    ipcRenderer.on(KANALLAR.pencereDurumDegisti, dinleyici);
    return () =>
      ipcRenderer.removeListener(KANALLAR.pencereDurumDegisti, dinleyici);
  },
  uygulamaMenusunuKur: (gruplar) =>
    ipcRenderer.send(KANALLAR.uygulamaMenusu, gruplar),
  menuEylemineAbone: (geriCagri) => {
    const dinleyici = (_olay: unknown, id: string): void => geriCagri(id);
    ipcRenderer.on(KANALLAR.menuEylem, dinleyici);
    return () => ipcRenderer.removeListener(KANALLAR.menuEylem, dinleyici);
  },
};

contextBridge.exposeInMainWorld("api", api);
