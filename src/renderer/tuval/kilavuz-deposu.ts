/**
 * Kullanıcı kılavuzları + cetvel görünürlüğü (TK-37 #2) — görünüm/araç durumu
 * (İlke 9): belge modeline dokunmaz, Command ÜRETMEZ, undo'ya GİRMEZ. Kılavuzlar
 * KULLANICI koordinatında tutulur (zoom/pan ile tutarlı). Bellekte; belge değişince
 * temizlenir (kılavuzlar belgeye yazılmaz — saf SVG kalır, İlke 10).
 */
import { yerelOku, yerelYaz } from "../yerel-depo";

export interface KullaniciKilavuzu {
  yon: "yatay" | "dikey";
  /** Kullanıcı koordinatı (yatay → y; dikey → x). */
  konum: number;
}

class KilavuzDeposu {
  #liste: KullaniciKilavuzu[] = [];
  #cetvel = false;
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    this.#cetvel = yerelOku("svgtron.cetvel") === "1";
  }

  get liste(): readonly KullaniciKilavuzu[] {
    return this.#liste;
  }
  get cetvel(): boolean {
    return this.#cetvel;
  }

  cetvelDegistir(): void {
    this.#cetvel = !this.#cetvel;
    yerelYaz("svgtron.cetvel", this.#cetvel ? "1" : "0");
    this.#bildir();
  }

  /** Kılavuz ekler, indeksini döndürür. */
  ekle(k: KullaniciKilavuzu): number {
    this.#liste.push(k);
    this.#bildir();
    return this.#liste.length - 1;
  }
  tasi(i: number, konum: number): void {
    const k = this.#liste[i];
    if (!k) return;
    k.konum = konum;
    this.#bildir();
  }
  sil(i: number): void {
    if (i < 0 || i >= this.#liste.length) return;
    this.#liste.splice(i, 1);
    this.#bildir();
  }
  temizle(): void {
    if (this.#liste.length === 0) return;
    this.#liste = [];
    this.#bildir();
  }

  dinle(d: () => void): () => void {
    this.#dinleyiciler.add(d);
    return () => this.#dinleyiciler.delete(d);
  }
  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
}

/** Uygulama geneli kılavuz/cetvel deposu. */
export const kilavuzDeposu = new KilavuzDeposu();
