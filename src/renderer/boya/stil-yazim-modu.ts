/**
 * Stil yazım modu (TK-18) — uygulama stratejilerinin stilleri INLINE `style`'a mı
 * yoksa nesne-başına bir CSS SINIFINA mı yazacağını belirleyen tercih.
 *
 * Görünüm durumudur (İlke 9): belge modeline dokunmaz, Command ÜRETMEZ, undo'ya
 * GİRMEZ. Oturumlar arası localStorage'da korunur. Tek doğruluk kaynağı budur;
 * `stilUygulaKomutu` bunu okur.
 */
import { yerelOku, yerelYaz } from '../yerel-depo';

export type StilModu = 'inline' | 'css' | 'otomatik';

const ANAHTAR = 'svgtron.stilModu';
const GECERLI: readonly StilModu[] = ['inline', 'css', 'otomatik'];

class StilYazimModu {
  #mod: StilModu = 'otomatik';
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    const k = yerelOku(ANAHTAR);
    if (k && GECERLI.includes(k as StilModu)) this.#mod = k as StilModu;
  }

  get mod(): StilModu {
    return this.#mod;
  }

  ayarla(mod: StilModu): void {
    if (mod === this.#mod) return;
    this.#mod = mod;
    yerelYaz(ANAHTAR, mod);
    for (const d of this.#dinleyiciler) d();
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }
}

/** Uygulama geneli tek stil yazım modu. */
export const stilYazimModu = new StilYazimModu();
