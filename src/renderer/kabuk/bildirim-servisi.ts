/**
 * Bildirim servisi — araçların/eylemlerin kullanıcıya GEÇİCİ (toast) mesaj
 * göstermesi için tek, gözlemlenebilir kanal.
 *
 * Bu **görünüm durumudur** (CLAUDE.md İlke 9): belge modeline dokunmaz, Command
 * ÜRETMEZ, undo'ya GİRMEZ. Üreticiler buraya yayın yapar (araçlar
 * `AracBaglami.bildir`, menü/dosya/yol eylemleri `hataBildir` üzerinden); kabuk
 * abone olup toast'ı çizer ve süreyle kendiliğinden kapatır. Böylece sessiz
 * no-op yerine kullanıcıya görünür geri bildirim verilir (örn. Pipet'te hedef
 * seçilmemiş, görsel yüklenememiş).
 */
export type BildirimTuru = 'bilgi' | 'uyari' | 'hata';

export interface Bildirim {
  readonly mesaj: string;
  readonly tur: BildirimTuru;
}

class BildirimServisi {
  readonly #dinleyiciler = new Set<(b: Bildirim) => void>();

  /** Bir bildirim yayınlar (varsayılan tür: bilgi). */
  bildir(mesaj: string, tur: BildirimTuru = 'bilgi'): void {
    const b: Bildirim = { mesaj, tur };
    for (const dinleyici of this.#dinleyiciler) dinleyici(b);
  }

  /** Bildirimlere abone olur; aboneliği iptal eden fonksiyonu döndürür. */
  dinle(dinleyici: (b: Bildirim) => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }
}

/** Uygulama geneli tek bildirim servisi örneği. */
export const bildirimServisi = new BildirimServisi();
