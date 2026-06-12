/**
 * Süreçler arası iletişim için TEK tipli sözleşme (CLAUDE.md İlke 4).
 *
 * Bu dosya main (handler), preload (köprü) ve renderer (tüketici) tarafından
 * ortak kaynak olarak kullanılır. Yeni özellik eklemek = buraya yeni bir kanal
 * EKLEMEK demektir; var olan kanalın imzasını değiştirmek değil.
 */

/** IPC kanal adları — tek yerde tanımlı, sihirli string yok. */
export const KANALLAR = {
  /** Uygulama/çalışma zamanı sürüm bilgisini döndürür (köprü kanıtı). */
  surumBilgisi: 'app:surum-bilgisi',
  /** Dosya seçtirip SVG içeriğini okur. */
  dosyaAc: 'dosya:ac',
  /** Verilen yoldaki SVG'yi okur (son dosyalar listesinden yeniden açma). */
  dosyaYoldanAc: 'dosya:yoldan-ac',
  /** SVG içeriğini bir dosyaya kaydeder. */
  dosyaKaydet: 'dosya:kaydet',
  /** Görsel seçtirip data-URI olarak okur (image yerleştirme). */
  gorselAc: 'dosya:gorsel-ac',
  /** Dil dosyasını (kod.dil) tr.dil'e göre eksik anahtarlarla senkronlar (geliştirme). */
  dilSenkron: 'dil:senkron',
  /** Pencereyi simge durumuna küçültür. */
  pencereSimgelestir: 'pencere:simgelestir',
  /** Pencereyi ekrana kaplar / önceki boyuta döndürür. */
  pencereBuyutGeriAl: 'pencere:buyut-geri-al',
  /** Pencereyi kapatır (kapanış onayı akışını tetikler). */
  pencereKapat: 'pencere:kapat',
  /** Kapanış istendi; renderer kaydetmeyi sorup onaylamalı (main → renderer olayı). */
  pencereKapanisIstegi: 'pencere:kapanis-istegi',
  /** Renderer kapanışı onayladı → pencere gerçekten kapanır (renderer → main). */
  pencereKapatGercek: 'pencere:kapat-gercek',
  /** Pencere ekranı kaplıyor mu? (invoke → boolean) */
  pencereKaplandiMi: 'pencere:kaplandi-mi',
  /** Pencere kapla/geri-al durumu değişti (main → renderer olayı). */
  pencereDurumDegisti: 'pencere:durum-degisti',
} as const;

/** {@link KANALLAR.surumBilgisi} kanalının dönüş yükü. */
export interface SurumBilgisi {
  uygulama: string;
  electron: string;
  chrome: string;
  node: string;
}

/** Açılan SVG dosyasının bilgisi. */
export interface AcilanDosya {
  /** Mutlak dosya yolu. */
  yol: string;
  /** Dosya adı (yol olmadan). */
  ad: string;
  /** Dosya içeriği (SVG metni). */
  icerik: string;
}

/**
 * Renderer'a açılan dar, tiplenmiş API yüzeyi.
 *
 * preload bunu `window.api` olarak yayınlar; renderer YALNIZCA bu arayüzü görür,
 * `ipcRenderer`'a ya da Node'a doğrudan erişemez (CLAUDE.md §3 güvenlik modeli).
 */
export interface KopruApi {
  /** Çalışan platform ('darwin' | 'win32' | 'linux'). UI yerleşimi için. */
  readonly platform: string;
  /** Çalışma zamanı sürüm bilgisini ister. */
  surumBilgisiAl(): Promise<SurumBilgisi>;
  /** Dosya seçtirir; iptal edilirse null döner. */
  dosyaAc(): Promise<AcilanDosya | null>;
  /** Verilen yoldaki SVG'yi okur (son dosyalar); okunamazsa null. */
  dosyaYoldanAc(yol: string): Promise<AcilanDosya | null>;
  /** SVG içeriğini kaydeder; kaydedilen yolu, iptal edilirse null döner. */
  dosyaKaydet(icerik: string, varsayilanAd: string): Promise<string | null>;
  /** Görsel seçtirir; data-URI döner, iptal edilirse null. */
  gorselAc(): Promise<{ dataUri: string } | null>;
  /**
   * `<kod>.dil` kaynağını tr.dil'e göre eksik anahtarlarla (`= ?`) senkronlar
   * (geliştirme bakım aracı, TK-28). Eklenen anahtar sayısını döner (üretimde 0).
   */
  dilDosyasiSenkron(kod: string, eksikAnahtarlar: string[]): Promise<number>;
  /** Pencereyi simge durumuna küçültür. */
  pencereSimgelestir(): void;
  /** Pencereyi kaplar / önceki boyuta döndürür. */
  pencereBuyutGeriAl(): void;
  /** Pencereyi kapatmayı dener (kaydetme onayı akışını başlatır). */
  pencereKapat(): void;
  /** Kapanış istendi olayına abone olur (kaydedilmemiş değişiklik sorusu için). */
  pencereKapanisinaAbone(geriCagri: () => void): () => void;
  /** Kapanış onaylandı → pencereyi gerçekten kapatır. */
  pencereKapatGercek(): void;
  /** Pencere şu an ekranı kaplıyor mu? */
  pencereKaplandiMi(): Promise<boolean>;
  /** Pencere kapla/geri-al durumu değişince haber verir; aboneliği iptal eder. */
  pencereDurumunaAbone(geriCagri: (kaplandi: boolean) => void): () => void;
}
