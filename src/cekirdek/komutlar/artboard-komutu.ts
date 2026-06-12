import type { Belge } from '../belge/belge';
import type { Dugum } from '../belge/model/dugum';
import type { Komut } from './komut';

/**
 * Bir düğümü ARTBOARD (tam-boy zemin/sayfa) olarak işaretler/kaldırır (TK-23).
 * Artboard daima KİLİTLİdir → bayrak ile birlikte kilit de ayarlanır. Geri-alınır;
 * kalıcılığı İlke 10 yorumuyla (dışa aktarımda `@svgtron artboard=true`).
 */
export class ArtboardKomutu implements Komut {
  readonly etiket = 'artboard';
  readonly #eskiArtboard: boolean;
  readonly #eskiKilit: boolean;

  constructor(
    private readonly belge: Belge,
    private readonly dugum: Dugum,
    private readonly artboard: boolean,
  ) {
    this.#eskiArtboard = !!dugum.artboard;
    this.#eskiKilit = !!dugum.kilitli;
  }

  uygula(): void {
    this.dugum.artboard = this.artboard;
    this.dugum.kilitli = this.artboard; // artboard ⇒ kilitli (kaldırınca kilit de açılır)
    this.belge.bildir();
  }

  geriAl(): void {
    this.dugum.artboard = this.#eskiArtboard;
    this.dugum.kilitli = this.#eskiKilit;
    this.belge.bildir();
  }
}
