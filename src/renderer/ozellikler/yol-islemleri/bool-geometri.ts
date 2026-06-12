/**
 * Boole işlemleri için saf poligon geometrisi (AGENTS.md §11.2).
 *
 * polygon-clipping kütüphanesinin biçimiyle uyumludur:
 *   Çift = [x, y] · Halka = Çift[] · Poligon = [dışHalka, ...delikler] ·
 *   CokPoligon = Poligon[].
 *
 * Bu modül DOM/belge/Command bilmez. Düz halka listesini **even-odd** kuralıyla
 * dış/delik olarak nest'ler (donut'lar doğru çalışsın) ve sonucu `path` `d`
 * dizesine çevirir.
 */

export type Cift = [number, number];
export type Halka = Cift[];
export type Poligon = Halka[];
export type CokPoligon = Poligon[];

/** Bir noktanın bir halkanın içinde olup olmadığı (ışın atma). */
export function noktaIcinde(p: Cift, h: Halka): boolean {
  let ic = false;
  const px = p[0];
  const py = p[1];
  for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
    const xi = h[i]![0];
    const yi = h[i]![1];
    const xj = h[j]![0];
    const yj = h[j]![1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      ic = !ic;
  }
  return ic;
}

/**
 * Bir halkanın derinlik testi için TEMSİL noktası. İlk köşe, başka bir halkanın
 * köşesi/kenarıyla çakışırsa ışın-atma (PNPOLY) sınırda kararsızdır → yanlış nest.
 * Bunun yerine ilk KENARIN orta noktasından centroid'e doğru küçük bir adım atılır
 * (sınırdan içeri kaçar; paylaşılan köşeye düşme olasılığı düşer).
 */
function temsilNoktasi(h: Halka): Cift {
  const n = h.length;
  let cx = 0;
  let cy = 0;
  for (const c of h) {
    cx += c[0];
    cy += c[1];
  }
  cx /= n;
  cy /= n;
  const a = h[0]!;
  const b = h[1 % n]!;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const t = 1e-3; // kenar orta noktasından centroid'e doğru küçük kayma
  return [mx + (cx - mx) * t, my + (cy - my) * t];
}

/**
 * Düz halka listesini even-odd kuralıyla CokPoligon'a nest'ler. Bir halkanın
 * "derinliği" onu içeren diğer halka sayısıdır; çift = dış (dolu), tek = delik.
 * Her delik, onu içeren en derin dış halkaya atanır.
 */
export function nesle(halkalar: Halka[]): CokPoligon {
  const n = halkalar.length;
  if (n === 0) return [];
  const nokta = halkalar.map(temsilNoktasi);
  const derinlik = halkalar.map((_, i) =>
    halkalar.reduce(
      (d, o, j) => (j !== i && noktaIcinde(nokta[i]!, o) ? d + 1 : d),
      0,
    ),
  );

  const polys: Poligon[] = [];
  const disPolyIndeksi = new Map<number, number>(); // halka indeksi → polys indeksi
  halkalar.forEach((h, i) => {
    if (derinlik[i]! % 2 === 0) {
      disPolyIndeksi.set(i, polys.length);
      polys.push([h]);
    }
  });
  halkalar.forEach((h, i) => {
    if (derinlik[i]! % 2 === 1) {
      let enIyi = -1;
      let enDerin = -1;
      halkalar.forEach((o, j) => {
        if (
          j !== i &&
          derinlik[j]! % 2 === 0 &&
          derinlik[j]! > enDerin &&
          noktaIcinde(nokta[i]!, o)
        ) {
          enIyi = j;
          enDerin = derinlik[j]!;
        }
      });
      if (enIyi >= 0) polys[disPolyIndeksi.get(enIyi)!]!.push(h);
    }
  });
  return polys;
}

/** Bir noktanın bir CokPoligon yüzünün içinde olup olmadığı (delikler dışlanır). */
export function yuzIcinde(cp: CokPoligon, p: Cift): boolean {
  for (const poly of cp) {
    if (poly.length === 0 || !noktaIcinde(p, poly[0]!)) continue;
    let delikte = false;
    for (let h = 1; h < poly.length; h++) {
      if (noktaIcinde(p, poly[h]!)) {
        delikte = true;
        break;
      }
    }
    if (!delikte) return true;
  }
  return false;
}

function v(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** CokPoligon'u `path` `d` dizesine çevirir (her halka bir alt-yol; winding korunur). */
export function cokPoligonuD(cp: CokPoligon): string {
  const parcalar: string[] = [];
  for (const poly of cp) {
    for (const halkaHam of poly) {
      const halka = halkaHam.slice();
      // Kapanış köşesi (ilk==son) varsa at — Z zaten kapatır.
      if (
        halka.length > 1 &&
        halka[0]![0] === halka[halka.length - 1]![0] &&
        halka[0]![1] === halka[halka.length - 1]![1]
      ) {
        halka.pop();
      }
      if (halka.length < 3) continue;
      parcalar.push(`M ${v(halka[0]![0])} ${v(halka[0]![1])}`);
      for (let k = 1; k < halka.length; k++)
        parcalar.push(`L ${v(halka[k]![0])} ${v(halka[k]![1])}`);
      parcalar.push("Z");
    }
  }
  return parcalar.join(" ");
}
