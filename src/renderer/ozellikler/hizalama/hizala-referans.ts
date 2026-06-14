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

import { gez, type Dugum } from '../../../cekirdek/belge/model/dugum';
import type { Belge } from '../../../cekirdek/belge/belge';
import { yerelOku, yerelYaz } from '../../yerel-depo';

/**
 * Etkin referans NESNESİ (mod tek-nesne referansıysa), yoksa null (§9.6a/§9.2).
 * Tek doğruluk kaynağı: hem Tuval'in referans işareti (TK-35/§9.6a) hem hizalama
 * (`hizalama.ts`) bunu kullanır → işaret ile gerçek hizalama referansı DAİMA uyuşur.
 *
 *  - `son-secilen` → seçime en son eklenen (`secililer.at(-1)`).
 *  - `anahtar`     → z-sıralamada EN ÜSTTEKİ = belge traversal'inde en SONDAKİ seçili.
 *  - `secim`/`belge` → tek-nesne referansı YOK → null (işaret gösterilmez).
 *
 * Saf (DOM'suz); `hizala-referans.ts` yalnız çekirdeğe bağlı kaldığından Tuval bunu
 * döngüsüz import edebilir (`hizalama.ts` tuval'e bağımlı olduğundan oradan alınamaz).
 */
export function referansDugum(
  belge: Belge,
  secililer: readonly Dugum[],
  mod: HizalaReferans,
): Dugum | null {
  if (secililer.length === 0) return null;
  if (mod === 'son-secilen') return secililer.at(-1) ?? null;
  if (mod === 'anahtar') {
    const sira = new Map<Dugum, number>();
    let i = 0;
    for (const d of gez(belge.kok)) sira.set(d, i++);
    let enUst: Dugum | null = null;
    let enUstSira = -1;
    for (const d of secililer) {
      const s = sira.get(d) ?? -1;
      if (s > enUstSira) {
        enUstSira = s;
        enUst = d;
      }
    }
    return enUst;
  }
  return null; // secim / belge → tek-nesne referansı yok
}

const ANAHTAR = 'svgtron.hizalaReferans';
const GECERLI: readonly HizalaReferans[] = ['son-secilen', 'anahtar', 'secim', 'belge'];

class HizalaReferansModu {
  #mod: HizalaReferans = 'son-secilen';
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    const k = yerelOku(ANAHTAR);
    if (k && GECERLI.includes(k as HizalaReferans)) this.#mod = k as HizalaReferans;
  }

  get mod(): HizalaReferans {
    return this.#mod;
  }

  ayarla(mod: HizalaReferans): void {
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

/** Uygulama geneli tek hizalama referans tercihi. */
export const hizalaReferans = new HizalaReferansModu();
