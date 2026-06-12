import type { Dugum } from "../belge/model/dugum";

/**
 * Seçim deposu — o an seçili düğümleri tutan gözlemlenebilir kap (ÇOKLU seçim).
 *
 * Tuval (tıklama/kement) seçimi yazar; özellik denetçisi (referansı) ve seçim
 * çerçeveleri okur. Tek yönlü akışa uyar (İlke 3). Çekirdektedir, Electron'dan
 * habersizdir (İlke 1). Seçim belgeyi DEĞİŞTİRMEZ (İlke 9).
 *
 * "Referans", seçime en son eklenen düğümdür (§9.6) — denetçi onu gösterir,
 * hizalama ona göre yapılır.
 */
export class SecimDeposu {
  #secililer: Dugum[] = [];
  readonly #dinleyiciler = new Set<() => void>();

  /** Referans (en son eklenen) düğüm; seçim boşsa null. */
  get secili(): Dugum | null {
    return this.#secililer.at(-1) ?? null;
  }

  /** Seçili düğümler (sıralı; sonuncu = referans). */
  get secililer(): readonly Dugum[] {
    return this.#secililer;
  }

  /** Düğüm seçili mi? */
  icindeMi(dugum: Dugum): boolean {
    return this.#secililer.includes(dugum);
  }

  /** Seçimi tek düğümle değiştirir (null → temizler). */
  sec(dugum: Dugum | null): void {
    this.#ayarla(dugum ? [dugum] : []);
  }

  /** Seçimi bir liste yapar (kement için). */
  cokluSec(dugumler: readonly Dugum[]): void {
    this.#ayarla([...new Set(dugumler)]);
  }

  /** Düğümü seçime ekler (zaten varsa referans yapar). */
  ekle(dugum: Dugum): void {
    const kalan = this.#secililer.filter((d) => d !== dugum);
    this.#ayarla([...kalan, dugum]);
  }

  /** Düğümü seçimden çıkarır. */
  cikar(dugum: Dugum): void {
    if (!this.#secililer.includes(dugum)) return;
    this.#ayarla(this.#secililer.filter((d) => d !== dugum));
  }

  /** Seçiliyse çıkarır, değilse ekler (shift davranışı, §9.7). */
  degistir(dugum: Dugum): void {
    if (this.#secililer.includes(dugum)) this.cikar(dugum);
    else this.ekle(dugum);
  }

  /** Seçimi kaldırır. */
  temizle(): void {
    this.#ayarla([]);
  }

  /** Seçim değişimine abone olur; iptal fonksiyonunu döndürür. */
  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  #ayarla(yeni: Dugum[]): void {
    const a = this.#secililer;
    if (a.length === yeni.length && a.every((d, i) => d === yeni[i])) return;
    this.#secililer = yeni;
    for (const d of this.#dinleyiciler) d();
  }
}
