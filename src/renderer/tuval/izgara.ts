/**
 * Izgara tercihi (TK-37 #2) — görünürlük + adım (belge/kullanıcı birimi). Görünüm/
 * araç durumudur (İlke 9): belge modeline dokunmaz, Command ÜRETMEZ, undo'ya GİRMEZ.
 * Oturumlar arası localStorage'da korunur. Izgaraya yapışma bu adımı kullanır; ızgara
 * GİZLİYKEN yapışma da uygulanmaz (görünmeyen şeye yapışma şaşırtıcı olur).
 */
class Izgara {
  #gorunur = false;
  #adim = 10;
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    try {
      this.#gorunur = localStorage.getItem("svgtron.izgara.gorunur") === "1";
      const a = Number(localStorage.getItem("svgtron.izgara.adim"));
      if (Number.isFinite(a) && a > 0) this.#adim = a;
    } catch {
      /* yoksa varsayılan */
    }
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
    try {
      localStorage.setItem(anahtar, deger);
    } catch {
      /* yoksa yalnız bellekte */
    }
  }
  #bildir(): void {
    for (const d of this.#dinleyiciler) d();
  }
}

/** Uygulama geneli ızgara tercihi. */
export const izgara = new Izgara();
