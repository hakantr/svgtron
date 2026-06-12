/**
 * Yapışma ve akıllı kılavuzlar (AGENTS.md §11.1) — saf geometri.
 *
 * Bu modül DOM'a, belgeye ya da Command'a DOKUNMAZ; yalnızca ekran-uzayı
 * dikdörtgenleriyle çalışır. Taşınan seçimin kenar/merkezlerini, sabit
 * hedeflerin (diğer nesneler + tuval çerçevesi) kenar/merkezleriyle karşılaştırıp
 * bir **düzeltme** (ax, ay) ve çizilecek **kılavuz çizgileri** üretir. Sonucun
 * Command'a çevrilmesi çağıranın işidir (İlke 9 — kılavuzlar görünüm durumudur).
 */

/** Ekran-uzayı dikdörtgeni (px). */
export interface Kutu {
  sol: number;
  ust: number;
  sag: number;
  alt: number;
}

/** Çizilecek hizalama kılavuzu (ekran px). */
export interface Kilavuz {
  /** 'dikey' = sabit x'te düşey çizgi; 'yatay' = sabit y'de yatay çizgi. */
  yon: "dikey" | "yatay";
  /** Çizginin konumu (dikey için x, yatay için y). */
  konum: number;
  /** Çizginin diğer eksendeki başı ve sonu (kapsadığı aralık). */
  bas: number;
  son: number;
}

export interface YapismaSonuc {
  /** Ham ötelemeye EKLENECEK düzeltme (ekran px). */
  ax: number;
  ay: number;
  kilavuzlar: Kilavuz[];
}

const YAKIN = 0.5; // px — bir hedef kenarının yapışma çizgisiyle "aynı" sayılma toleransı

/** Bir kutunun bir eksendeki üç yapışma noktası: kenar–merkez–kenar. */
function noktalarX(k: Kutu): number[] {
  return [k.sol, (k.sol + k.sag) / 2, k.sag];
}
function noktalarY(k: Kutu): number[] {
  return [k.ust, (k.ust + k.alt) / 2, k.alt];
}

/** Bir eksende en iyi (en küçük) yapışma düzeltmesini bulur. */
function enIyiEksen(
  hareketli: number[],
  hedefNoktalari: number[][],
  esik: number,
): { duzeltme: number; cizgi: number } | null {
  let en: { duzeltme: number; cizgi: number } | null = null;
  for (const tNoktalar of hedefNoktalari) {
    for (const t of tNoktalar) {
      for (const m of hareketli) {
        const fark = t - m;
        if (
          Math.abs(fark) <= esik &&
          (en === null || Math.abs(fark) < Math.abs(en.duzeltme))
        ) {
          en = { duzeltme: fark, cizgi: t };
        }
      }
    }
  }
  return en;
}

/**
 * Taşınan kutuyu (ham ötelemeli konumda) hedeflere yapıştırır.
 *
 * @param hareketli Ham ötelemeden SONRAKİ taşınan seçim sınır kutusu (ekran px).
 * @param hedefler  Sabit hedef kutuları (diğer nesneler + tuval çerçevesi).
 * @param esik      Yapışma eşiği (ekran px).
 */
export function yapismaHesapla(
  hareketli: Kutu,
  hedefler: Kutu[],
  esik: number,
): YapismaSonuc {
  const hedefX = hedefler.map(noktalarX);
  const hedefY = hedefler.map(noktalarY);
  const enX = enIyiEksen(noktalarX(hareketli), hedefX, esik);
  const enY = enIyiEksen(noktalarY(hareketli), hedefY, esik);

  const ax = enX?.duzeltme ?? 0;
  const ay = enY?.duzeltme ?? 0;

  // Yapışmadan sonraki nihai kutu — kılavuzların kapsamını bunun üstünden hesapla.
  const son: Kutu = {
    sol: hareketli.sol + ax,
    sag: hareketli.sag + ax,
    ust: hareketli.ust + ay,
    alt: hareketli.alt + ay,
  };

  const kilavuzlar: Kilavuz[] = [];

  if (enX) {
    // Bu düşey çizgiye değen tüm hedefleri (+ taşınan kutuyu) kapsa.
    let ust = son.ust;
    let alt = son.alt;
    for (const h of hedefler) {
      if (noktalarX(h).some((p) => Math.abs(p - enX.cizgi) <= YAKIN)) {
        ust = Math.min(ust, h.ust);
        alt = Math.max(alt, h.alt);
      }
    }
    kilavuzlar.push({ yon: "dikey", konum: enX.cizgi, bas: ust, son: alt });
  }

  if (enY) {
    let sol = son.sol;
    let sag = son.sag;
    for (const h of hedefler) {
      if (noktalarY(h).some((p) => Math.abs(p - enY.cizgi) <= YAKIN)) {
        sol = Math.min(sol, h.sol);
        sag = Math.max(sag, h.sag);
      }
    }
    kilavuzlar.push({ yon: "yatay", konum: enY.cizgi, bas: sol, son: sag });
  }

  return { ax, ay, kilavuzlar };
}

/** DOMRect benzeri bir nesneyi ekran-uzayı {@link Kutu}'ya çevirir. */
export function kutuYap(r: {
  left: number;
  top: number;
  right: number;
  bottom: number;
}): Kutu {
  return { sol: r.left, ust: r.top, sag: r.right, alt: r.bottom };
}

/** İki kutunun birleşimi (union). */
export function birlestir(a: Kutu, b: Kutu): Kutu {
  return {
    sol: Math.min(a.sol, b.sol),
    ust: Math.min(a.ust, b.ust),
    sag: Math.max(a.sag, b.sag),
    alt: Math.max(a.alt, b.alt),
  };
}
