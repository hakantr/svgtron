import type { Playback } from './playback';
import { SmilPlayback } from './smil-playback';
import { WaapiPlayback } from './waapi-playback';
import { BilesikPlayback } from './bilesik-playback';

const SMIL_SECICI =
  'animate, animateTransform, animateMotion, animateColor, set, discard';

/** SVG'de SMIL animasyonu var mı? */
function smilVarMi(svg: SVGSVGElement): boolean {
  return svg.querySelector(SMIL_SECICI) !== null;
}

/** SVG alt ağacında CSS/WAAPI animasyonu var mı? */
function waapiVarMi(svg: SVGSVGElement): boolean {
  try {
    return svg.getAnimations({ subtree: true }).length > 0;
  } catch {
    return false;
  }
}

/**
 * Oynatma deposu — o an etkin Playback'i tutan gözlemlenebilir kap.
 *
 * Gözlemleyici, render ettiği gerçek `<svg>` kökünü buraya bildirir; depo
 * animasyon türünü algılayıp uygun Playback'i oluşturur: CSS/WAAPI ve SMIL bir
 * arada ise {@link BilesikPlayback}, yalnız biri varsa {@link WaapiPlayback} ya
 * da {@link SmilPlayback}. Zaman çizelgesi yalnızca {@link Playback} arayüzüyle
 * konuşur — hangi teknoloji olduğunu bilmez (İlke 6).
 */
export class OynatmaDeposu {
  #aktif: Playback | null = null;
  readonly #dinleyiciler = new Set<() => void>();

  /** O an etkin Playback (belge yoksa null). */
  get aktif(): Playback | null {
    return this.#aktif;
  }

  /** Render edilen `<svg>` kökünü ayarlar; null ise oynatmayı kaldırır. */
  svgAyarla(svg: SVGSVGElement | null): void {
    this.#aktif?.serbestBirak();
    this.#aktif = svg ? this.#playbackOlustur(svg) : null;
    this.#bildir();
  }

  /**
   * Etkin Playback'i mevcut SVG için yeniden kurar; oynat/duraklat durumunu ve
   * konumu KORUR. Düzenleme animasyon kümesini değiştirdiğinde (örn. yeni
   * CSS-animasyonlu eleman eklendiğinde) WaapiPlayback'in bir kez yakaladığı
   * liste bayatlamasın diye (İlke 3). Yeni Playback varsayılan olarak oynar →
   * eski durum geri yüklenir.
   */
  tazele(svg: SVGSVGElement | null): void {
    if (!svg) return;
    const oynuyorEski = this.#aktif?.oynuyor ?? false;
    const konumEski = this.#aktif?.konum ?? 0;
    this.#aktif?.serbestBirak();
    this.#aktif = this.#playbackOlustur(svg);
    if (this.#aktif) {
      this.#aktif.konumaGit(konumEski);
      if (!oynuyorEski) this.#aktif.durakla();
    }
    this.#bildir();
  }

  /** SVG'deki animasyon teknolojilerine göre uygun Playback'i kurar. */
  #playbackOlustur(svg: SVGSVGElement): Playback | null {
    const waapi = waapiVarMi(svg);
    const smil = smilVarMi(svg);
    // İkisi birden varsa birlikte yönet (İlke 6) — getAnimations() SMIL'i
    // içermediğinden tek WaapiPlayback SMIL'i kontrol edemezdi.
    if (waapi && smil) return new BilesikPlayback([new WaapiPlayback(svg), new SmilPlayback(svg)]);
    if (waapi) return new WaapiPlayback(svg);
    if (smil) return new SmilPlayback(svg);
    return null;
  }

  /** Etkin Playback değişimine abone olur; iptal fonksiyonunu döndürür. */
  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  #bildir(): void {
    for (const dinleyici of this.#dinleyiciler) dinleyici();
  }
}
