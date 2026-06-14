import type { TuvalNoktasi } from "./arac";
import { say } from "../tuval/donusum";

/**
 * Nokta dizisinden `path` `d` dizesi (M + L'ler). `ipucu` verilirse sona bir L
 * daha (canlı önizleme), `kapali` ise `Z` eklenir. Kalem/kurşun-kalem/hareket-yolu
 * araçları aynı üretimi yapıyordu; tek yerde toplandı (sadece sayılar yuvarlanır).
 */
export function dDizesi(
  nokta: readonly TuvalNoktasi[],
  ipucu?: TuvalNoktasi,
  kapali = false,
): string {
  if (nokta.length === 0) return "";
  const parcalar = [`M ${say(nokta[0]!.x)} ${say(nokta[0]!.y)}`];
  for (let i = 1; i < nokta.length; i++)
    parcalar.push(`L ${say(nokta[i]!.x)} ${say(nokta[i]!.y)}`);
  if (ipucu) parcalar.push(`L ${say(ipucu.x)} ${say(ipucu.y)}`);
  if (kapali) parcalar.push("Z");
  return parcalar.join(" ");
}
