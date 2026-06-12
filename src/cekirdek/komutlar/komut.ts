/**
 * Komut sözleşmesi (AGENTS.md İlke 2).
 *
 * Belge üzerindeki HER düzenleme bir komuttur: `uygula` / `geriAl` çiftiyle.
 * Belgeye komut dışında doğrudan mutasyon yapmak yasaktır. Bu sayede undo/redo,
 * makrolar ve betikle otomasyon "bedava" gelir.
 *
 * Komutlar belgeyi değiştirdikten sonra `Belge.bildir()` çağırmalıdır; böylece
 * görünümler tek yönlü akışla (İlke 3) güncellenir.
 */
export interface Komut {
  /** Kısa, insan-okur etiket (örn. undo menüsünde gösterilebilir). */
  readonly etiket?: string;
  /** Değişikliği uygular. */
  uygula(): void;
  /** Değişikliği geri alır (uygula'nın tam tersi). */
  geriAl(): void;
}
