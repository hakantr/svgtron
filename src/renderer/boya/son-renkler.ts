/**
 * Son kullanılan renkler (TK-37 #8) — boya seçicide hızlı erişim için en son
 * kullanılan DÜZ renkler. Görünüm/tercih durumudur (İlke 9): belge modeline
 * dokunmaz, Command ÜRETMEZ, undo'ya GİRMEZ. Oturumlar arası localStorage'da korunur.
 *
 * Renkler kanonik `rgb()/rgba()` dizesi olarak tutulur; en yeni başta, yinelenler
 * tekilleştirilir, en çok {@link SINIR} kayıt. (Belgeye yazılan kalıcı bir PALET
 * ayrı bir tasarımdır — kaynak/metadata + Command; TK-37 #8 notu — burada yok.)
 */
const ANAHTAR = "svgtron.sonRenkler";
const SINIR = 12;

class SonRenkler {
  #renkler: string[] = [];
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    try {
      const ham = localStorage.getItem(ANAHTAR);
      if (ham) {
        const dizi = JSON.parse(ham);
        if (Array.isArray(dizi))
          this.#renkler = dizi
            .filter((x): x is string => typeof x === "string")
            .slice(0, SINIR);
      }
    } catch {
      /* yoksa/bozuksa boş kalır */
    }
  }

  /** En yeni başta, salt-okunur. */
  get renkler(): readonly string[] {
    return this.#renkler;
  }

  /**
   * Bir rengi en başa ekler (yineleni yukarı taşır, sınırı aşan en eskiyi atar).
   * Boş/şeffaf (alfa 0) renk eklenmez — swatch olarak işe yaramaz.
   */
  ekle(renk: string): void {
    const r = renk.trim();
    if (!r || /^rgba\([^)]*,\s*0(\.0+)?\s*\)$/i.test(r)) return;
    const kalan = this.#renkler.filter((x) => x !== r);
    this.#renkler = [r, ...kalan].slice(0, SINIR);
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify(this.#renkler));
    } catch {
      /* yoksa yalnız bellekte */
    }
    for (const d of this.#dinleyiciler) d();
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }
}

/** Uygulama geneli son-renkler deposu. */
export const sonRenkler = new SonRenkler();
