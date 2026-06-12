import type { Segment, Nokta } from "./yol";

/**
 * Yol (path) düzenleme işlemleri (AGENTS.md §11.2) — saf, Electron'dan habersiz.
 * Mutlak-normalize segmentler üzerinde çalışır (bkz. {@link ./yol}).
 */

interface AltYol {
  segs: Segment[]; // M + ardışık segmentler (Z hariç)
  kapali: boolean;
}

/** Segment dizisini alt-yollara böler (her M yeni alt-yol; Z kapalı işaretler). */
function altYollaraBol(segs: readonly Segment[]): AltYol[] {
  const altlar: AltYol[] = [];
  let gecerli: AltYol | null = null;
  for (const s of segs) {
    if (s.tip === "M") {
      gecerli = { segs: [s], kapali: false };
      altlar.push(gecerli);
    } else if (s.tip === "Z") {
      if (gecerli) gecerli.kapali = true;
    } else if (gecerli) {
      gecerli.segs.push(s);
    }
  }
  return altlar;
}

function anchor(s: Segment): Nokta | null {
  return "p" in s ? s.p : null;
}

/** Bir alt-yolu tersine çevirir (kontrol noktaları/yay bayrağı uygun şekilde). */
function altYoluTersCevir(alt: AltYol): Segment[] {
  const ss = alt.segs;
  const a: Nokta[] = ss
    .map((s) => anchor(s))
    .filter((p): p is Nokta => p !== null);
  const n = a.length - 1;
  if (n < 1) return ss.slice();
  const sonuc: Segment[] = [{ tip: "M", p: { ...a[n]! } }];
  for (let k = n; k >= 1; k--) {
    const seg = ss[k]!; // a[k-1] → a[k] segmenti
    const hedef = { ...a[k - 1]! };
    switch (seg.tip) {
      case "L":
      case "M":
        sonuc.push({ tip: "L", p: hedef });
        break;
      case "C":
        sonuc.push({
          tip: "C",
          c1: { ...seg.c2 },
          c2: { ...seg.c1 },
          p: hedef,
        });
        break;
      case "Q":
        sonuc.push({ tip: "Q", c: { ...seg.c }, p: hedef });
        break;
      case "A":
        sonuc.push({
          tip: "A",
          rx: seg.rx,
          ry: seg.ry,
          donus: seg.donus,
          buyukYay: seg.buyukYay,
          suzme: !seg.suzme, // ters yönde tarama bayrağı tersine döner
          p: hedef,
        });
        break;
    }
  }
  if (alt.kapali) sonuc.push({ tip: "Z" });
  return sonuc;
}

/** Tüm yolu tersine çevirir (her alt-yolu ayrı). */
export function yoluTersCevir(segs: readonly Segment[]): Segment[] {
  return altYollaraBol(segs).flatMap(altYoluTersCevir);
}

/** Bir noktanın bir doğru parçasına dik uzaklığı. */
function dikUzaklik(p: Nokta, a: Nokta, b: Nokta): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const uz = Math.hypot(dx, dy);
  if (uz < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / uz;
}

/** Ramer–Douglas–Peucker basitleştirme (dışa açık — serbest çizim için). */
export function noktaBasitlestir(noktalar: Nokta[], eps: number): Nokta[] {
  return rdp(noktalar, eps);
}

/** Ramer–Douglas–Peucker basitleştirme. */
function rdp(noktalar: Nokta[], eps: number): Nokta[] {
  if (noktalar.length < 3) return noktalar.slice();
  let enUzak = 0;
  let indis = 0;
  const ilk = noktalar[0]!;
  const son = noktalar[noktalar.length - 1]!;
  for (let i = 1; i < noktalar.length - 1; i++) {
    const d = dikUzaklik(noktalar[i]!, ilk, son);
    if (d > enUzak) {
      enUzak = d;
      indis = i;
    }
  }
  if (enUzak > eps) {
    const sol = rdp(noktalar.slice(0, indis + 1), eps);
    const sag = rdp(noktalar.slice(indis), eps);
    return [...sol.slice(0, -1), ...sag];
  }
  return [ilk, son];
}

/**
 * Yolu basitleştirir: her alt-yolun çapa noktalarına RDP uygular ve M/L olarak
 * yeniden üretir (eğriler düzleşir). Yoğun polyline'lar için idealdir.
 */
export function yoluBasitlestir(
  segs: readonly Segment[],
  tolerans = 1,
): Segment[] {
  const sonuc: Segment[] = [];
  for (const alt of altYollaraBol(segs)) {
    const pts = alt.segs
      .map((s) => anchor(s))
      .filter((p): p is Nokta => p !== null);
    const sade = rdp(pts, tolerans);
    if (sade.length === 0) continue;
    sonuc.push({ tip: "M", p: { ...sade[0]! } });
    for (let i = 1; i < sade.length; i++)
      sonuc.push({ tip: "L", p: { ...sade[i]! } });
    if (alt.kapali) sonuc.push({ tip: "Z" });
  }
  return sonuc;
}
