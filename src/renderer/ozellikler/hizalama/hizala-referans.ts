/**
 * Hizalama referans tercihi (§9.2) — hizalamanın NEYE GÖRE yapılacağı.
 *
 * Görünüm/araç durumudur (İlke 9): belge modeline dokunmaz, Command ÜRETMEZ,
 * undo'ya GİRMEZ; yalnız referansı belirler (sonuç yine tek Command olarak commit
 * edilir). Oturumlar arası localStorage'da korunur. Varsayılan "son seçilene göre".
 *
 *  - `son-secilen` — referans, seçime en son eklenen nesne (SecimDeposu.secili). **(VARSAYILAN.)**
 *  - `anahtar`     — referans, katman (z-sıralama) yapısında EN ÜSTTEKİ nesne.
 *  - `secim`       — referans, seçili nesnelerin toplu sınır kutusu.
 *  - `belge`       — referans, belgenin/tuvalin sınırları (viewBox / artboard).
 */
export type HizalaReferans = 'son-secilen' | 'anahtar' | 'secim' | 'belge';

const ANAHTAR = 'svgtron.hizalaReferans';
const GECERLI: readonly HizalaReferans[] = ['son-secilen', 'anahtar', 'secim', 'belge'];

class HizalaReferansModu {
  #mod: HizalaReferans = 'son-secilen';
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    try {
      const k = localStorage.getItem(ANAHTAR);
      if (k && GECERLI.includes(k as HizalaReferans)) this.#mod = k as HizalaReferans;
    } catch {
      /* localStorage yoksa varsayılan kalır */
    }
  }

  get mod(): HizalaReferans {
    return this.#mod;
  }

  ayarla(mod: HizalaReferans): void {
    if (mod === this.#mod) return;
    this.#mod = mod;
    try {
      localStorage.setItem(ANAHTAR, mod);
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

/** Uygulama geneli tek hizalama referans tercihi. */
export const hizalaReferans = new HizalaReferansModu();
