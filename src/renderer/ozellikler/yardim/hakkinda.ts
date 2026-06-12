import { menuKayitDefteri } from "../../../cekirdek/registry/menu-registry";

/**
 * "Hakkında" servisi + menü kaydı (Yardım menüsü).
 *
 * Sürüm bilgisi artık ana pencere altında sabit gösterilmez; bunun yerine Yardım →
 * Hakkında ile açılan bir pencerede gösterilir (kullanıcı isteği). Menü ögesi bu
 * servisi çağırır; kabuk (uygulama-kabugu) dinleyip modalı çizer.
 */
class HakkindaServisi {
  #dinleyici: (() => void) | null = null;

  /** Hakkında penceresini açar (kabuk dinler). */
  ac(): void {
    this.#dinleyici?.();
  }

  /** Kabuk, "aç" isteğine abone olur; iptal fonksiyonunu döndürür. */
  dinle(fn: () => void): () => void {
    this.#dinleyici = fn;
    return () => {
      if (this.#dinleyici === fn) this.#dinleyici = null;
    };
  }
}

/** Uygulama geneli Hakkında servisi. */
export const hakkindaServisi = new HakkindaServisi();

menuKayitDefteri.kaydet({
  id: "yardim.hakkinda",
  grup: "yardim",
  etiketAnahtari: "menu.yardim.hakkinda",
  sira: 10,
  calistir: () => hakkindaServisi.ac(),
});
