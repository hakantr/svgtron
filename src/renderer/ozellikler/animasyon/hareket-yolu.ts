import { dugumOlustur, type Dugum } from "../../../cekirdek/belge/model/dugum";

/**
 * Hareket yolu (animateMotion) saf kurulumu (TK-37 #4) — DOM/dil/menü bağımsız,
 * birim testlenebilir. Wiring (`hareket-yolu-eylemleri.ts`) bunu Command'a sarar.
 *
 * Üretilen yapı (SMIL; §10.8, kara listede değil):
 *   <animateMotion dur="..." repeatCount="indefinite" rotate="auto">
 *     <mpath href="#pathId"/>
 *   </animateMotion>
 * Nesneye ÇOCUK olarak eklenir → nesne yol boyunca oynar (rotate=auto: yöne döner).
 */
export function hareketYoluDugumu(pathId: string, sure = "3s"): Dugum {
  const mpath = dugumOlustur("mpath", new Map([["href", `#${pathId}`]]));
  return dugumOlustur(
    "animateMotion",
    new Map([
      ["dur", sure],
      ["repeatCount", "indefinite"],
      ["rotate", "auto"],
    ]),
    [mpath],
  );
}
