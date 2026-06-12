import type { Belge } from '../belge/belge';
import type { Dugum } from '../belge/model/dugum';
import type { Komut } from './komut';

/**
 * Nesne kilidini açar/kapatır (§9.7) — editör bayrağı; geri-alınabilir.
 * Kalıcılığı İlke 10'a göre dışa aktarımda SVG yorumuyla sağlanır.
 */
export class KilitKomutu implements Komut {
  readonly etiket = 'kilit';
  readonly #eski: boolean;

  constructor(
    private readonly belge: Belge,
    private readonly dugum: Dugum,
    private readonly kilitli: boolean,
  ) {
    this.#eski = !!dugum.kilitli;
  }

  uygula(): void {
    this.dugum.kilitli = this.kilitli;
    this.belge.bildir();
  }

  geriAl(): void {
    this.dugum.kilitli = this.#eski;
    this.belge.bildir();
  }
}
