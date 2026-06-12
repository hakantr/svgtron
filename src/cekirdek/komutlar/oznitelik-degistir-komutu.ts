import type { Belge } from "../belge/belge";
import type { Dugum } from "../belge/model/dugum";
import type { Komut } from "./komut";

/**
 * Bir düğümün tek bir özniteliğini değiştiren komut (İlke 2).
 *
 * Eski değeri oluşturulurken yakalar; `geriAl` onu (yoksa özniteliği silerek)
 * geri yükler. Her iki yön de belgeyi `bildir` ile uyarır (İlke 3) — Tuval
 * uyumlayıcısı yalnızca değişen özniteliği yamalar (animasyon bozulmaz).
 *
 * Özellik denetçisinin `fill`, `opacity`, geometri vb. düzenlemeleri bununla
 * yapılır.
 */
export class OznitelikDegistirKomutu implements Komut {
  readonly etiket: string;
  readonly #eskiDeger: string | null;

  constructor(
    private readonly belge: Belge,
    private readonly dugum: Dugum,
    private readonly ad: string,
    // null → özniteliği SİLER (örn. transform identity'ye dönünce artık bırakmamak için).
    private readonly yeniDeger: string | null,
  ) {
    this.#eskiDeger = dugum.oznitelikler.get(ad) ?? null;
    this.etiket = `${ad} değiştir`;
  }

  uygula(): void {
    this.#yaz(this.yeniDeger);
  }

  geriAl(): void {
    this.#yaz(this.#eskiDeger);
  }

  #yaz(deger: string | null): void {
    if (deger === null) {
      this.dugum.oznitelikler.delete(this.ad);
    } else {
      this.dugum.oznitelikler.set(this.ad, deger);
    }
    this.belge.bildir();
  }
}
