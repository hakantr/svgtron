/**
 * Izgara tercihi (TK-37 #2) — görünürlük + adım (belge/kullanıcı birimi). Görünüm/
 * araç durumudur (İlke 9): belge modeline dokunmaz, Command ÜRETMEZ, undo'ya GİRMEZ.
 * Oturumlar arası localStorage'da korunur. Izgaraya yapışma bu adımı kullanır; ızgara
 * GİZLİYKEN yapışma da uygulanmaz (görünmeyen şeye yapışma şaşırtıcı olur).
 */
import { yerelOku, yerelYaz } from "../yerel-depo";

class Izgara {
  #gorunur = false;
  #adim = 10;
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    this.#gorunur = yerelOku("svgtron.izgara.gorunur") === "1";
    const a = Number(yerelOku("svgtron.izgara.adim"));
    if (Number.isFinite(a) && a > 0) this.#adim = a;
  }

  get gorunur(): boolean {
    return this.#gorunur;
  }
  get adim(): number {
    return this.#adim;
  }

  gorunurAyarla(v: boolean): void {
    if (v === this.#gorunur) return;
    this.#gorunur = v;
    this.#kaydet("svgtron.izgara.gorunur", v ? "1" : "0");
    this.#bildir();
  }
  degistir(): void {
    this.gorunurAyarla(!this.#gorunur);
  }
  adimAyarla(a: number): void {
    if (!Number.isFinite(a) || a <= 0 || a === this.#adim) return;
    this.#adim = a;
    this.#kaydet("svgtron.izgara.adim", String(a));
    this.#bildir();
  }

  dinle(d: () => void): () => void {
    this.#dinleyiciler.add(d);
    return () => this.#dinleyiciler.delete(d);
  }

  #kaydet(anahtar: string, deger: string): void {
    yerelYaz(anahtar, deger);
  }
  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
}

/** Uygulama geneli ızgara tercihi. */
export const izgara = new Izgara();
