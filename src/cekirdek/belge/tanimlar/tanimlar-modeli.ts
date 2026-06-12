import { gez, type Dugum } from "../model/dugum";

/**
 * Tanımlar modeli (AGENTS.md §7.5 — defs/style için YAPISAL yer).
 *
 * `<defs>` içindeki yeniden kullanılabilir kaynaklar (filter, gradient,
 * marker...) ve `<style>` düğümleri, soyut belge modelinde yapısal olarak
 * izlenir. Her kaynak türünün listeleme/düzenleme mantığı ileride kaynak-türü
 * registry'sinden gelir; burası id→düğüm indeksini ve stil düğümlerini toplar.
 */
export class TanimlarModeli {
  /** Belgedeki ilk `<defs>` düğümü (yoksa null). */
  readonly defs: Dugum | null;
  /** Belgedeki tüm `<style>` düğümleri. */
  readonly stilDugumleri: readonly Dugum[];
  /** `<defs>` altındaki, id'si olan tanımlar: id → düğüm. */
  readonly tanimlar: ReadonlyMap<string, Dugum>;

  constructor(kok: Dugum) {
    const hepsi = [...gez(kok)];
    this.defs = hepsi.find((d) => d.etiket === "defs") ?? null;
    this.stilDugumleri = hepsi.filter((d) => d.etiket === "style");

    const tanimlar = new Map<string, Dugum>();
    for (const defs of hepsi.filter((d) => d.etiket === "defs")) {
      for (const d of gez(defs)) {
        const id = d.oznitelikler.get("id");
        if (id && d !== defs) tanimlar.set(id, d);
      }
    }
    this.tanimlar = tanimlar;
  }

  /** Verilen etiketle eşleşen tanımlar (örn. 'filter', 'linearGradient'). */
  turdekiler(etiket: string): Dugum[] {
    return [...this.tanimlar.values()].filter((d) => d.etiket === etiket);
  }
}
