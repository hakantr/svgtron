import { Belge } from "./belge";

/** Belgenin geldiği kaynağın tanımı (dosya). */
export interface BelgeKaynagi {
  /** Dosya adı (yol olmadan). */
  readonly ad: string;
  /** Mutlak yol (varsa). */
  readonly yol?: string;
}

/**
 * Belge deposu — uygulamanın o anki belgesini tutan gözlemlenebilir kap.
 *
 * Görünümler (paneller) buraya abone olur; yeni dosya yüklendiğinde ya da
 * belge içi bir komut çalıştığında tek bir kanaldan haberdar olur (İlke 3,
 * tek yönlü akış). Çekirdektedir, Electron'dan habersizdir (İlke 1).
 */
export class BelgeDeposu {
  #belge: Belge | null = null;
  #kaynak: BelgeKaynagi | null = null;
  /** Son yükleme/kayıttan beri kaydedilmemiş değişiklik var mı? (komut çalıştı mı.) */
  #degisti = false;
  #belgeAboneligiCoz?: () => void;
  readonly #dinleyiciler = new Set<() => void>();

  /** O anki belge (henüz açılmadıysa null). */
  get belge(): Belge | null {
    return this.#belge;
  }

  /** O anki belgenin kaynağı (dosya adı/yolu); yoksa null. */
  get kaynak(): BelgeKaynagi | null {
    return this.#kaynak;
  }

  /**
   * Son yükleme/kayıttan bu yana kaydedilmemiş değişiklik var mı? Bir belge komutu
   * çalışınca (belge.bildir) true olur; {@link yukle}/{@link kaydedildi} ile sıfırlanır.
   * "Yeni / Aç / Kapat" akışları bunu okuyup kullanıcıya kaydetmeyi sorar.
   */
  get degisti(): boolean {
    return this.#degisti;
  }

  /** Belge diske kaydedildi → kaydedilmemiş değişiklik bayrağını sıfırlar. */
  kaydedildi(): void {
    this.#degisti = false;
  }

  /**
   * SVG metninden yeni bir belge yükler ve dinleyicileri uyarır.
   * @param kaynak Belgenin geldiği dosya bilgisi (başlık çubuğunda gösterilir).
   * @throws Geçersiz SVG'de hata fırlatır (çağıran yakalamalı).
   */
  yukle(svgMetni: string, kaynak?: BelgeKaynagi): void {
    const yeni = Belge.svgMetninden(svgMetni);

    // Önceki belgenin iç-mutasyon aboneliğini bırak, yenisine bağlan:
    // komut belgeyi değiştirince bu depo da dinleyicilerini uyarır.
    this.#belgeAboneligiCoz?.();
    this.#belge = yeni;
    this.#kaynak = kaynak ?? null;
    this.#degisti = false; // taze belge: kaydedilmemiş değişiklik yok
    // Komut belgeyi değiştirince (bildir) hem "değişti" işaretlenir hem panellere
    // haber verilir (tek yönlü akış, İlke 3).
    this.#belgeAboneligiCoz = yeni.dinle(() => {
      this.#degisti = true;
      this.#bildir();
    });

    this.#bildir();
  }

  /** Belge değişikliklerine abone olur; iptal fonksiyonunu döndürür. */
  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  #bildir(): void {
    for (const dinleyici of this.#dinleyiciler) {
      dinleyici();
    }
  }
}
