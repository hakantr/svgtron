/**
 * Oran kilidi (TK-37 #9) — boyutlandırma tutamacıyla ölçeklerken en/boy oranını
 * koruma tercihi. Görünüm/araç durumudur (İlke 9): belge modeline dokunmaz, Command
 * ÜRETMEZ, undo'ya GİRMEZ. Oturumlar arası localStorage'da korunur.
 *
 * Etki: kilit AÇIKSA köşe/kenar boyutlandırması ÜNİFORM ölçek uygular (oran sabit);
 * Shift basılıysa kilit GEÇİCİ tersine döner (serbest ölçek). Kilit KAPALIYSA mevcut
 * davranış: yalnız Shift üniform yapar. (Döndürülmüş/eğik nesne, skew'i önlemek için
 * her durumda üniform kalır — bu bir tercih değil, doğruluk kısıtıdır; bkz. tuval-alani.)
 */
class OranKilidi {
  #acik = false;
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    try {
      this.#acik = localStorage.getItem("svgtron.oranKilidi") === "1";
    } catch {
      /* localStorage yoksa varsayılan (kapalı) kalır */
    }
  }

  get acik(): boolean {
    return this.#acik;
  }

  ayarla(acik: boolean): void {
    if (acik === this.#acik) return;
    this.#acik = acik;
    try {
      localStorage.setItem("svgtron.oranKilidi", acik ? "1" : "0");
    } catch {
      /* yoksa yalnız bellekte */
    }
    for (const d of this.#dinleyiciler) d();
  }

  degistir(): void {
    this.ayarla(!this.#acik);
  }

  dinle(dinleyici: () => void): () => void {
    this.#dinleyiciler.add(dinleyici);
    return () => this.#dinleyiciler.delete(dinleyici);
  }
}

/** Uygulama geneli tek oran kilidi tercihi. */
export const oranKilidi = new OranKilidi();
