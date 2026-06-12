/**
 * Renk dönüşümleri (boya seçici için). Saf fonksiyonlar; DOM'a bağlı değil.
 */

export interface RGBA {
  /** 0–255 */
  r: number;
  /** 0–255 */
  g: number;
  /** 0–255 */
  b: number;
  /** 0–1 */
  a: number;
}

export interface HSVA {
  /** 0–360 */
  h: number;
  /** 0–1 */
  s: number;
  /** 0–1 */
  v: number;
  /** 0–1 */
  a: number;
}

function kirp(n: number, alt: number, ust: number): number {
  return Math.min(ust, Math.max(alt, n));
}

function iki(n: number): string {
  return Math.round(kirp(n, 0, 255)).toString(16).padStart(2, '0');
}

/** rgb/rgba/#hex(3,4,6,8) metnini RGBA'ya ayrıştırır; renk değilse null. */
export function ayristir(metin: string): RGBA | null {
  const m = metin.trim();

  const rgb = m.match(
    /^rgba?\(\s*([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (rgb) {
    // Renk bileşeni yüzdeli olabilir (rgb(100%,0%,0%)); % → 0–255 ölçekle.
    const bilesen = (s: string): number =>
      s.endsWith('%') ? (parseFloat(s) / 100) * 255 : parseFloat(s);
    let a = 1;
    if (rgb[4] != null) a = rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return {
      r: kirp(bilesen(rgb[1]!), 0, 255),
      g: kirp(bilesen(rgb[2]!), 0, 255),
      b: kirp(bilesen(rgb[3]!), 0, 255),
      a: kirp(a, 0, 1),
    };
  }

  let h = m.replace(/^#/, '');
  if (/^[0-9a-f]{3,4}$/i.test(h)) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (/^[0-9a-f]{6}$/i.test(h)) {
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  if (/^[0-9a-f]{8}$/i.test(h)) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  return null;
}

/** RGBA → '#rrggbb' (alfa 1) ya da '#rrggbbaa'. */
export function hex(c: RGBA): string {
  const taban = `#${iki(c.r)}${iki(c.g)}${iki(c.b)}`;
  return c.a >= 1 ? taban : taban + iki(c.a * 255);
}

/** RGBA → 'rgb(...)' (alfa 1) ya da 'rgba(...)'. */
export function metin(c: RGBA): string {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  if (c.a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${Number(c.a.toFixed(3))})`;
}

/** Algılanan parlaklık (0=koyu, 1=açık) — kontrast/okunabilirlik kararı için. */
export function parlaklik(c: RGBA): number {
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}

export function rgbToHsv(c: RGBA): HSVA {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max, a: c.a };
}

export function hsvToRgb(c: HSVA): RGBA {
  const { h, s, v } = c;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][i]!;
  return { r: r * 255, g: g * 255, b: b * 255, a: c.a };
}
