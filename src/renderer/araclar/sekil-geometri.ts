import { say } from '../tuval/donusum';

/** Parametrik şekil geometrisi (saf) — yıldız ve spiral. Birim testlenebilir. */

export interface Nokta {
  x: number;
  y: number;
}

/**
 * Yıldız köşeleri (`polygon points`): merkez + dış nokta (yarıçap+açı sürüklemeden).
 * `kollar` uç sayısı, `icOran` iç/dış yarıçap oranı.
 */
export function yildizNoktalari(merkez: Nokta, dis: Nokta, kollar = 5, icOran = 0.5): string {
  const dx = dis.x - merkez.x;
  const dy = dis.y - merkez.y;
  const R = Math.hypot(dx, dy);
  const a0 = Math.atan2(dy, dx); // dış uç sürükleme yönünü izler
  const pts: string[] = [];
  for (let i = 0; i < kollar * 2; i++) {
    const r = i % 2 === 0 ? R : R * icOran;
    const a = a0 + (i * Math.PI) / kollar;
    pts.push(`${say(merkez.x + r * Math.cos(a))},${say(merkez.y + r * Math.sin(a))}`);
  }
  return pts.join(' ');
}

/** Arşimet spirali (`path d`): merkezden dış noktaya `donus` tur. */
export function spiralYolu(merkez: Nokta, dis: Nokta, donus = 3, adim = 96): string {
  const R = Math.hypot(dis.x - merkez.x, dis.y - merkez.y);
  const a0 = Math.atan2(dis.y - merkez.y, dis.x - merkez.x);
  const maxA = donus * 2 * Math.PI;
  let d = '';
  for (let i = 0; i <= adim; i++) {
    const t = i / adim;
    const a = a0 + t * maxA;
    const r = R * t;
    const x = merkez.x + r * Math.cos(a);
    const y = merkez.y + r * Math.sin(a);
    d += i === 0 ? `M ${say(x)} ${say(y)}` : ` L ${say(x)} ${say(y)}`;
  }
  return d;
}
