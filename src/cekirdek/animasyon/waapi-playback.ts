import type { Playback } from "./playback";

/**
 * WAAPI tabanlı Playback (AGENTS.md İlke 6, §10.8) — CSS `@keyframes` ve
 * JS Web Animations API animasyonlarını yönetir.
 *
 * Render edilmiş `<svg>` alt ağacındaki tüm animasyonları
 * `getAnimations({subtree:true})` ile toplar; play/pause/seek bunlar üzerinde
 * yapılır. UI bu sınıfı bilmez; yalnızca {@link Playback} arayüzünü görür —
 * böylece SMIL mi CSS mi olduğu UI'ı ilgilendirmez.
 */
export class WaapiPlayback implements Playback {
  readonly sure: number;
  readonly #sonsuz: boolean;
  #oynuyor = true; // CSS animasyonları varsayılan olarak oynar
  #rafKimligi = 0;
  readonly #dinleyiciler = new Set<() => void>();
  readonly #animasyonlar: Animation[];

  constructor(svg: SVGSVGElement) {
    this.#animasyonlar = svg.getAnimations({ subtree: true });

    let sure = 0;
    let sonsuz = false;
    for (const animasyon of this.#animasyonlar) {
      const t = animasyon.effect?.getComputedTiming();
      if (!t) continue;
      const gecikme = Number(t.delay) || 0;
      const dongu = Number(t.duration) || 0; // ms ('auto' → 0)
      const tekrar = t.iterations ?? 1;
      if (!Number.isFinite(tekrar)) {
        sonsuz = true;
        sure = Math.max(sure, gecikme + dongu); // bir döngü
      } else {
        sure = Math.max(sure, gecikme + dongu * tekrar);
      }
    }
    this.sure = sure / 1000;
    this.#sonsuz = sonsuz;
    this.#izle();
  }

  get konum(): number {
    let enBuyuk = 0;
    for (const a of this.#animasyonlar) {
      const c = Number(a.currentTime) || 0;
      if (c > enBuyuk) enBuyuk = c;
    }
    return enBuyuk / 1000;
  }

  get oynuyor(): boolean {
    return this.#oynuyor;
  }

  get sonsuz(): boolean {
    return this.#sonsuz;
  }

  oynat(): void {
    if (this.#oynuyor) return;
    if (!this.#sonsuz && this.sure > 0 && this.konum >= this.sure) {
      this.konumaGit(0);
    }
    for (const a of this.#animasyonlar) a.play();
    this.#oynuyor = true;
    this.#izle();
    this.#bildir();
  }

  durakla(): void {
    if (!this.#oynuyor) return;
    for (const a of this.#animasyonlar) a.pause();
    this.#oynuyor = false;
    this.#izlemeyiDurdur();
    this.#bildir();
  }

  basaSar(): void {
    this.konumaGit(0);
  }

  konumaGit(saniye: number): void {
    const ms = Math.max(0, saniye) * 1000;
    for (const a of this.#animasyonlar) {
      try {
        a.currentTime = ms;
      } catch {
        /* animasyon henüz hazır değilse atla */
      }
    }
    this.#bildir();
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }

  serbestBirak(): void {
    this.#izlemeyiDurdur();
    this.#dinleyiciler.clear();
  }

  #izle(): void {
    if (this.#rafKimligi) return;
    const tik = (): void => {
      if (!this.#sonsuz && this.sure > 0 && this.konum >= this.sure) {
        this.konumaGit(this.sure);
        for (const a of this.#animasyonlar) a.pause();
        this.#oynuyor = false;
        this.#rafKimligi = 0;
        this.#bildir();
        return;
      }
      this.#bildir();
      this.#rafKimligi = requestAnimationFrame(tik);
    };
    this.#rafKimligi = requestAnimationFrame(tik);
  }

  #izlemeyiDurdur(): void {
    if (this.#rafKimligi) cancelAnimationFrame(this.#rafKimligi);
    this.#rafKimligi = 0;
  }

  #bildir(): void {
    for (const dinleyici of this.#dinleyiciler) dinleyici();
  }
}
