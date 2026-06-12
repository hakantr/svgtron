import type { Dugum } from "../../../cekirdek/belge/model/dugum";

/**
 * Pano (kes/kopyala/yapıştır) — görünüm durumu (İlke 9): belge modeline dokunmaz,
 * Command ÜRETMEZ, undo'ya GİRMEZ. Yalnız "yapıştır" eylemi (ayrı bir üreticide)
 * belgeye bir Command yazar.
 *
 * Her girdi, kopyalanan düğümün **id'siz derin kopyasını** ve kopyalandığı
 * **ebeveyn referansını** tutar. "Yerinde yapıştır" (TK-37 #9), ebeveyn hâlâ
 * belgedeyse düğümü AYNI ebeveyne (dolayısıyla aynı koordinat uzayına) koyar →
 * görsel konum korunur; ebeveyn artık yoksa (silinmiş/yeni belge) köke düşer.
 */
export interface PanoGirdisi {
  /** id'siz derin kopya (yapıştırırken bundan yeni kopya türetilir). */
  readonly kopya: Dugum;
  /** Kopyalandığı ebeveyn (yerinde yapıştırma hedefi); kök çocuğuysa kökün kendisi. */
  readonly ebeveyn: Dugum | null;
}

class Pano {
  #girdiler: readonly PanoGirdisi[] = [];

  /** Pano boş mu? (yapıştır eylemi buna göre pasifleşir.) */
  get bosMu(): boolean {
    return this.#girdiler.length === 0;
  }

  /** Panoyu (yeni) girdilerle değiştirir. */
  yaz(girdiler: readonly PanoGirdisi[]): void {
    this.#girdiler = girdiler;
  }

  /** Pano içeriğini okur (salt-okunur). */
  oku(): readonly PanoGirdisi[] {
    return this.#girdiler;
  }
}

/** Uygulama geneli tek pano. */
export const pano = new Pano();
