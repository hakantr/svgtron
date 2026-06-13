/**
 * Easing (yumuşatma) çekirdeği (TK-37 #5) — SAF, DOM bağımsız, birim testlenebilir.
 * Easing eğrisi editörünün ve SMIL `keySplines` üretiminin matematiksel temeli.
 *
 * Kübik Bézier zamanlama fonksiyonu (CSS `cubic-bezier(x1,y1,x2,y2)` ile aynı):
 * (0,0) ve (1,1) sabit uçlar; iki kontrol noktası eğriyi belirler. `deger(t)` bir
 * ilerleme t∈[0,1] için eased çıktıyı verir.
 */

/** Tek boyutlu kübik Bézier (0, p1, p2, 1) değeri. */
function kubik(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

/**
 * `cubic-bezier(x1,y1,x2,y2)` zamanlama fonksiyonu → `deger(x)` (x∈[0,1] → eased y).
 * x→t kökü ikili arama ile bulunur (monoton x varsayımı; CSS'in de gerektirdiği gibi
 * x1,x2 ∈ [0,1]). Uçlarda tam 0/1 döner.
 */
export function kubikBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 40; i++) {
      const xt = kubik(t, x1, x2);
      if (Math.abs(xt - x) < 1e-6) break;
      if (xt < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return kubik(t, y1, y2);
  };
}

/** Adlandırılmış easing → kontrol noktaları (CSS karşılıkları). */
export const EASING_NOKTALARI: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/** Kontrol noktalarından SMIL `keySplines` segmenti ("x1 y1 x2 y2"). */
export function keySplines(n: readonly [number, number, number, number]): string {
  return n.join(" ");
}

/**
 * N segmentli bir animasyon için (keyTimes/values arası N geçiş) `keySplines`
 * dizesi — aynı eğri her segmentte (`;` ile ayrık). `calcMode="spline"` ile kullanılır.
 */
export function keySplinesTekrar(
  n: readonly [number, number, number, number],
  segment: number,
): string {
  const tek = keySplines(n);
  return Array.from({ length: Math.max(1, segment) }, () => tek).join("; ");
}
