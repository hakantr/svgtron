/**
 * Playback (oynatma) arayüzü — AGENTS.md İlke 6.
 *
 * Zaman çizelgesi UI'ı YALNIZCA bu arayüzle konuşur; arkasında SMIL ya da WAAPI
 * olduğunu bilmez. Böylece animasyon teknolojisi UI'ı bozmadan değiştirilebilir
 * veya birlikte yönetilebilir.
 *
 * Tüm zamanlar saniye cinsindendir.
 */
export interface Playback {
  /** Toplam süre (saniye). Bilinmiyorsa/animasyon yoksa 0. */
  readonly sure: number;
  /** Güncel konum (saniye); mutlak zaman. */
  readonly konum: number;
  /** Şu an oynuyor mu? */
  readonly oynuyor: boolean;
  /** Süresiz/döngülü animasyon mu? (zaman çizelgesi konumu modulo gösterir) */
  readonly sonsuz: boolean;

  /** Oynatmayı başlatır/sürdürür. */
  oynat(): void;
  /** Oynatmayı duraklatır. */
  durakla(): void;
  /** Konumu 0'a alır. */
  basaSar(): void;
  /** Belirtilen saniyeye atlar. */
  konumaGit(saniye: number): void;

  /** Durum/zaman değişimine abone olur; iptal fonksiyonunu döndürür. */
  dinle(dinleyici: () => void): () => void;
  /** Kaynakları bırakır (örn. animasyon karesi döngüsünü durdurur). */
  serbestBirak(): void;
}
