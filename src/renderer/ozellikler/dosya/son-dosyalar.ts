/**
 * Son açılan dosyalar listesi (görünüm durumu) — Dosya menüsünde "Son Dosyalar"
 * alt menüsünü besler. localStorage'da kalıcı; en yeni başta, en çok 8 kayıt,
 * aynı yol tekrarlanmaz. Belge modeline dokunmaz (İlke 9).
 */
import { yerelOku, yerelYaz } from '../../yerel-depo';

export interface SonDosya {
  readonly yol: string;
  readonly ad: string;
}

const ANAHTAR = 'svgtron.sonDosyalar';
const MAKS = 8;

class SonDosyalar {
  #liste: SonDosya[] = [];
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    try {
      const ham = yerelOku(ANAHTAR);
      const p: unknown = ham ? JSON.parse(ham) : null;
      if (Array.isArray(p)) {
        this.#liste = p
          .filter(
            (x): x is SonDosya =>
              !!x && typeof x.yol === 'string' && typeof x.ad === 'string',
          )
          .slice(0, MAKS);
      }
    } catch {
      /* bozuk/yoksa boş */
    }
  }

  /** En yeniden eskiye son dosyalar. */
  liste(): readonly SonDosya[] {
    return this.#liste;
  }

  /** Bir dosyayı listenin başına ekler (varsa öne taşır). */
  ekle(dosya: SonDosya): void {
    if (!dosya.yol) return;
    this.#liste = [dosya, ...this.#liste.filter((d) => d.yol !== dosya.yol)].slice(0, MAKS);
    this.#kaydet();
    this.#bildir();
  }

  /** Bir yolu listeden çıkarır (örn. dosya artık yoksa). */
  cikar(yol: string): void {
    const yeni = this.#liste.filter((d) => d.yol !== yol);
    if (yeni.length === this.#liste.length) return;
    this.#liste = yeni;
    this.#kaydet();
    this.#bildir();
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  #kaydet(): void {
    yerelYaz(ANAHTAR, JSON.stringify(this.#liste));
  }

  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
}

/** Uygulama geneli son dosyalar listesi. */
export const sonDosyalar = new SonDosyalar();
