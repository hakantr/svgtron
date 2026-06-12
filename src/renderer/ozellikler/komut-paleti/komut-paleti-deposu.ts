/**
 * Komut Paleti açık/kapalı durumu — paylaşılan gözlemlenebilir kap (§11.3).
 *
 * Üst Çubuktaki arama kutusu (kabuk) ile palette bileşeni farklı shadow DOM'larda
 * olduğundan, aralarındaki tek sinyal bu depodur. Tek doğruluk kaynağı (İlke 3):
 * hem titlebar düğmesi hem Ctrl/Cmd+K hem palette bunu okuyup yazar. Görünüm
 * durumudur (İlke 9 — undo'ya girmez).
 */
class KomutPaletiDeposu {
  #acik = false;
  readonly #dinleyiciler = new Set<() => void>();

  get acikMi(): boolean {
    return this.#acik;
  }

  ayarla(acik: boolean): void {
    if (this.#acik === acik) return;
    this.#acik = acik;
    for (const d of this.#dinleyiciler) d();
  }

  degistir(): void {
    this.ayarla(!this.#acik);
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }
}

/** Uygulama genelinde tek komut paleti durumu. */
export const komutPaletiDeposu = new KomutPaletiDeposu();
