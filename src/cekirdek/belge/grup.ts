import type { Belge } from './belge';
import type { Dugum } from './model/dugum';

/**
 * Grup (hiyerarşi) sorguları — saf, DOM'dan habersiz (İlke 1). Grup-duyarlı
 * seçim (TK-21) ve benzeri davranışlar için.
 */

/** Düğümün EN DIŞTAKİ `<g>` atası (yoksa null) — grup seçiminin hedefi. */
export function enDistakiGrup(belge: Belge, dugum: Dugum): Dugum | null {
  let grup: Dugum | null = null;
  let p = belge.ebeveyn(dugum);
  while (p && p.etiket === 'g') {
    grup = p;
    p = belge.ebeveyn(p);
  }
  return grup;
}

/** `atasi`, `dugum`'un atası-ya-da-kendisi mi? */
export function atasiMi(belge: Belge, atasi: Dugum, dugum: Dugum): boolean {
  let n: Dugum | null = dugum;
  while (n) {
    if (n === atasi) return true;
    n = belge.ebeveyn(n);
  }
  return false;
}
