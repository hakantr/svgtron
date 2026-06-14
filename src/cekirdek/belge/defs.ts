import type { Belge } from "./belge";
import type { Dugum } from "./model/dugum";

/**
 * Belgedeki ilk `<defs>` düğümü (yoksa null). Pek çok kaynak-türü ve boya modülü
 * aynı aramayı yapıyordu; tek yerde toplandı (saf belge-model işlemi, İlke 1).
 */
export function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === "defs") ?? null;
}
