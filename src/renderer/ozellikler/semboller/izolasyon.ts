/**
 * Sembol izolasyon durumu (TK-37 #1) — görünüm/çalışma bağlamı (İlke 9): hangi
 * sembolün düzenlenmekte olduğunu ve düzenlenen geçici grubun kimliğini tutar.
 * Belge modeline dokunmaz; içeriği değiştiren işlemler ayrıca Command'dır.
 *
 * Akış: bir `<use>`'tan "Sembolü Düzenle" → sembol içeriği DÜZENLENEBİLİR bir `<g>`
 * olarak açılır (izolasyon). "Bitir" → düzenlenen grup ana sembole geri yazılır →
 * TÜM `<use>` örnekleri güncellenir (İlke 3); grup yerine `<use>` konur.
 */
export interface IzolasyonDurumu {
  /** Düzenlenen ana sembolün id'si. */
  sembolId: string;
  /** Düzenlenebilir geçici grubun kimliği (belge.dugumBul ile çözülür). */
  grupKimlik: string;
}

class Izolasyon {
  #durum: IzolasyonDurumu | null = null;
  readonly #dinleyiciler = new Set<() => void>();

  get aktif(): IzolasyonDurumu | null {
    return this.#durum;
  }

  ayarla(durum: IzolasyonDurumu | null): void {
    this.#durum = durum;
    for (const d of this.#dinleyiciler) d();
  }

  dinle(d: () => void): () => void {
    this.#dinleyiciler.add(d);
    return () => this.#dinleyiciler.delete(d);
  }
}

/** Uygulama geneli tek izolasyon durumu. */
export const izolasyon = new Izolasyon();
