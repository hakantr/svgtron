/**
 * Gradyan vektör geometrisi (TK-37 #3) — tuvalde gradyan durağı/uç düzenlemenin
 * SAF çekirdeği (DOM/koordinat-uzayı bağımsız; birim testlenebilir). Etkileşimli
 * overlay (uç/durak tutamaçları, objectBoundingBox↔ekran eşlemesi) bunları kullanır.
 *
 * Bir doğrusal gradyan, (x1,y1)→(x2,y2) vektörü boyunca tanımlıdır; her durağın
 * `offset`'i bu vektör üzerinde 0..1 bir orandır.
 */

export interface Nokta {
  x: number;
  y: number;
}

/**
 * Bir noktayı gradyan vektörüne (p1→p2) İZDÜŞÜRÜP 0..1 ofsete çevirir (vektör dışına
 * düşse de [0,1]'e kırpılır). Dejenere vektör (p1==p2) → 0. Bir durağı imleçle
 * sürüklerken yeni ofseti budur.
 */
export function noktaOfset(p: Nokta, p1: Nokta, p2: Nokta): number {
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const uzunlukKare = vx * vx + vy * vy;
  if (uzunlukKare === 0) return 0;
  const t = ((p.x - p1.x) * vx + (p.y - p1.y) * vy) / uzunlukKare;
  return Math.min(1, Math.max(0, t));
}

/**
 * Bir ofsetin (0..1) gradyan vektörü üzerindeki NOKTASI — durak tutamacını çizmek
 * için. (Kırpma yok: çağıran ofseti zaten 0..1 verir; dışı da hesaplanabilsin.)
 */
export function ofsetNokta(offset: number, p1: Nokta, p2: Nokta): Nokta {
  return {
    x: p1.x + offset * (p2.x - p1.x),
    y: p1.y + offset * (p2.y - p1.y),
  };
}
