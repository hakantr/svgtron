/**
 * Boya (paint) tanımı — boya seçicinin ürettiği/aldığı soyut değer.
 *
 * SVG'de gradyan, `fill` içine satır içi yazılamaz; bir `<defs>` kaynağı olup
 * `url(#id)` ile atıf alır. Bu yüzden boya seçici düz metin değil, bu TANIMLA
 * çalışır; modele (defs + fill) çevirme işini denetçi/komut yapar.
 */

/** Bir gradyan durağı. */
export interface GradyanDurak {
  /** 0–1. */
  readonly offset: number;
  /** rgba/rgb dizesi. */
  readonly renk: string;
}

/** Boya değeri: yok / düz renk / gradyan. */
export type BoyaDegeri =
  | { readonly tip: 'yok' }
  | { readonly tip: 'duz'; readonly renk: string }
  | {
      readonly tip: 'gradyan';
      readonly gradyanTuru: 'dogrusal' | 'radyal';
      readonly duraklar: readonly GradyanDurak[];
      /** Doğrusal gradyan açısı (derece). */
      readonly aci: number;
    };
