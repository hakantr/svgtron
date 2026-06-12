import type { Playback } from './playback';

/**
 * Bileşik Playback (CLAUDE.md İlke 6, §10.8).
 *
 * Bir belge AYNI ANDA hem CSS/WAAPI hem de SMIL animasyonu içerdiğinde ikisini
 * tek bir {@link Playback} arayüzü arkasında BİRLİKTE yönetir. `getAnimations()`
 * Chromium'da SMIL'i içermez; bu yüzden iki teknoloji ayrı Playback'lerle sarılıp
 * burada birleştirilir. Zaman çizelgesi yine yalnızca Playback'i görür — kaç
 * teknolojinin sarıldığını bilmez. Çağrılar tüm alt-Playback'lere iletilir;
 * süre/konum birleştirilir.
 */
export class BilesikPlayback implements Playback {
  readonly #parcalar: readonly Playback[];
  readonly #dinleyiciler = new Set<() => void>();
  readonly #cozumler: (() => void)[] = [];

  constructor(parcalar: Playback[]) {
    this.#parcalar = parcalar;
    // Alt-Playback'lerin durum/zaman bildirimlerini dışarıya birleştir.
    for (const p of parcalar) this.#cozumler.push(p.dinle(() => this.#bildir()));
  }

  /** En uzun alt-süre. */
  get sure(): number {
    return this.#parcalar.reduce((m, p) => Math.max(m, p.sure), 0);
  }

  /** En ileri alt-konum. */
  get konum(): number {
    return this.#parcalar.reduce((m, p) => Math.max(m, p.konum), 0);
  }

  /** Alt-Playback'lerden biri bile oynuyorsa oynuyor sayılır. */
  get oynuyor(): boolean {
    return this.#parcalar.some((p) => p.oynuyor);
  }

  get sonsuz(): boolean {
    return this.#parcalar.some((p) => p.sonsuz);
  }

  oynat(): void {
    for (const p of this.#parcalar) p.oynat();
  }

  durakla(): void {
    for (const p of this.#parcalar) p.durakla();
  }

  basaSar(): void {
    for (const p of this.#parcalar) p.basaSar();
  }

  konumaGit(saniye: number): void {
    for (const p of this.#parcalar) p.konumaGit(saniye);
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  serbestBirak(): void {
    for (const coz of this.#cozumler) coz();
    this.#cozumler.length = 0;
    for (const p of this.#parcalar) p.serbestBirak();
    this.#dinleyiciler.clear();
  }

  #bildir(): void {
    for (const dinleyici of this.#dinleyiciler) dinleyici();
  }
}
