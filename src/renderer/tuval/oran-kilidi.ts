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
import { yerelOku, yerelYaz } from "../yerel-depo";

class OranKilidi {
  #acik = false;
  readonly #dinleyiciler = new Set<() => void>();

  constructor() {
    this.#acik = yerelOku("svgtron.oranKilidi") === "1";
  }

  get acik(): boolean {
    return this.#acik;
  }

  ayarla(acik: boolean): void {
    if (acik === this.#acik) return;
    this.#acik = acik;
    yerelYaz("svgtron.oranKilidi", acik ? "1" : "0");
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
