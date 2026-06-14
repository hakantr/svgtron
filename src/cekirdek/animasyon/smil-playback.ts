import type { Playback } from "./playback";

/** SMIL saat değerini ('4s', '500ms', '1.5min') saniyeye çevirir; geçersizse NaN. */
function klokSaniye(deger: string | null | undefined): number {
  if (!deger) return NaN;
  const m = String(deger)
    .trim()
    .match(/^([\d.]+)(ms|s|min|h)?$/);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "ms":
      return n / 1000;
    case "min":
      return n * 60;
    case "h":
      return n * 3600;
    default:
      return n;
  }
}

/** `begin` listesindeki ilk sayısal ofset (olay-temelli değerler 0 sayılır). */
function ilkBeginOfseti(begin: string | null): number {
  if (!begin) return 0;
  const s = klokSaniye(begin.split(";")[0]);
  return Number.isFinite(s) ? s : 0;
}

const ANIMASYON_SECICI =
  "animate, animateTransform, animateMotion, animateColor, set";

/**
 * SMIL animasyonlarının toplam süresini sezgisel olarak hesaplar.
 * Süresiz (`repeatCount="indefinite"`) animasyon varsa süre tek döngü kabul
 * edilir ve `sonsuz` true döner (zaman çizelgesi bu durumda döngüsel gösterir).
 */
function sureHesapla(svg: SVGSVGElement): { sure: number; sonsuz: boolean } {
  let sure = 0;
  let sonsuz = false;

  for (const a of svg.querySelectorAll(ANIMASYON_SECICI)) {
    const dur = klokSaniye(a.getAttribute("dur"));
    const begin = ilkBeginOfseti(a.getAttribute("begin"));
    const repeat = a.getAttribute("repeatCount");
    const repeatDurHam = a.getAttribute("repeatDur");
    const repeatDur = klokSaniye(repeatDurHam);
    const birDongu = Number.isFinite(dur) ? dur : 0;

    let aktif: number;
    if (repeat === "indefinite" || repeatDurHam === "indefinite") {
      sonsuz = true;
      aktif = birDongu;
    } else if (Number.isFinite(repeatDur)) {
      aktif = repeatDur;
    } else if (repeat && Number.isFinite(Number(repeat))) {
      aktif = birDongu * Number(repeat);
    } else {
      aktif = birDongu;
    }

    sure = Math.max(sure, begin + aktif);
  }

  return { sure, sonsuz };
}

/**
 * SMIL tabanlı Playback (AGENTS.md İlke 6).
 *
 * Bir `<svg>` kök elemanını sarar; `setCurrentTime` / `pauseAnimations` /
 * `unpauseAnimations` ile yönetir. Oynarken her animasyon karesinde dinleyicileri
 * uyararak zaman çizelgesinin akıcı güncellenmesini sağlar. UI bu sınıfı bilmez;
 * yalnızca {@link Playback} arayüzünü görür.
 *
 * SVG'nin render edilmiş (DOM'a bağlı) olması gerekir — SMIL zamanı yalnızca o
 * zaman akar.
 */
export class SmilPlayback implements Playback {
  readonly sure: number;
  readonly #sonsuz: boolean;
  #dongu: boolean;
  #oynuyor = true; // SMIL varsayılan olarak oynar
  #rafKimligi = 0;
  readonly #dinleyiciler = new Set<() => void>();

  constructor(
    private readonly svg: SVGSVGElement,
    dongu = false,
  ) {
    const { sure, sonsuz } = sureHesapla(svg);
    this.sure = sure;
    this.#sonsuz = sonsuz;
    this.#dongu = dongu;
    this.#izle(); // baştan oynar; döngü kapalıysa bir tur sonra durur
  }

  get konum(): number {
    return this.svg.getCurrentTime();
  }

  get oynuyor(): boolean {
    return this.#oynuyor;
  }

  get sonsuz(): boolean {
    return this.#sonsuz;
  }

  get dongu(): boolean {
    return this.#dongu;
  }

  oynat(): void {
    if (this.#oynuyor) return;
    this.#dongu = true; // kullanıcı play'e bastı → durdurana dek tekrarla
    // Sona geldiyse baştan başlat (sonlu: konum sürede; sonsuz: kendi sarar).
    if (this.sure > 0 && this.konum >= this.sure) {
      this.svg.setCurrentTime(0);
    }
    this.svg.unpauseAnimations();
    this.#oynuyor = true;
    this.#izle();
    this.#bildir();
  }

  durakla(): void {
    if (!this.#oynuyor) return;
    this.svg.pauseAnimations();
    this.#oynuyor = false;
    this.#izlemeyiDurdur();
    this.#bildir();
  }

  basaSar(): void {
    this.konumaGit(0);
  }

  konumaGit(saniye: number): void {
    this.svg.setCurrentTime(Math.max(0, saniye));
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
      // Bir tur tamamlandığında: döngü kapalıysa dur, açıksa sürdür.
      if (this.sure > 0 && this.konum >= this.sure) {
        if (this.#dongu) {
          // Sonlu animasyonu başa sar (sonsuz olan zaten kendi sarar).
          if (!this.#sonsuz) this.svg.setCurrentTime(0);
        } else {
          // Tek tur: sonlu animasyonu son karede tut, sonsuzu olduğu yerde durdur.
          if (!this.#sonsuz) this.svg.setCurrentTime(this.sure);
          this.svg.pauseAnimations();
          this.#oynuyor = false;
          this.#rafKimligi = 0;
          this.#bildir();
          return;
        }
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
