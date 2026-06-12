import {
  dugumOlustur,
  gez,
  benzersizId,
  type Dugum,
} from "../../cekirdek/belge/model/dugum";
import type { Belge } from "../../cekirdek/belge/belge";
import type { Komut } from "../../cekirdek/komutlar/komut";
import {
  BilesikKomut,
  DugumCikarKomutu,
  DugumEkleKomutu,
} from "../../cekirdek/komutlar/dugum-komutlari";
import { ayristir, metin } from "./renk";
import { stilUygulaKomutu } from "./stil-uygula";
import type { BoyaDegeri, GradyanDurak } from "./boya-degeri";

/**
 * Boya tanımı ↔ belge modeli (defs/fill) köprüsü.
 *
 * `fillToBoya`: bir `fill` dizesini (renk / url(#id) / none) BoyaDegeri'ne çözer
 * (gradyan ise defs'teki tanımı okur). `gradyanKomutu`: bir gradyanı defs'e
 * yazıp şeklin fill'ini `url(#id)` yapan tek, geri-alınabilir komut üretir.
 */

const ONEK = "svgtron-grad-";

/** Bir fill/style değerindeki url(#id) atfından id'yi çıkarır (yoksa null). */
export function urlId(fill: string): string | null {
  return /url\(["']?#([^"')]+)["']?\)/.exec(fill)?.[1] ?? null;
}

function gradyanBul(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok)) {
    if (
      d.oznitelikler.get("id") === id &&
      (d.etiket === "linearGradient" || d.etiket === "radialGradient")
    ) {
      return d;
    }
  }
  return null;
}

function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === "defs") ?? null;
}

/** Bir `fill` dizesini BoyaDegeri'ne çözer. */
export function fillToBoya(fill: string, belge: Belge): BoyaDegeri {
  const f = fill.trim();
  if (!f || f === "none") return { tip: "yok" };

  const id = urlId(f);
  if (id) {
    const g = gradyanBul(belge, id);
    if (g) {
      const duraklar: GradyanDurak[] = g.cocuklar
        .filter((c) => c.etiket === "stop")
        .map((s) => {
          const off = Number(s.oznitelikler.get("offset") ?? "0");
          const renkHam = s.oznitelikler.get("stop-color") ?? "#000000";
          const so = Number(s.oznitelikler.get("stop-opacity") ?? "1");
          const rgba = ayristir(renkHam) ?? { r: 0, g: 0, b: 0, a: 1 };
          return {
            offset: off > 1 ? off / 100 : off,
            renk: metin({ ...rgba, a: so }),
          };
        });
      const tur = g.etiket === "radialGradient" ? "radyal" : "dogrusal";
      let aci = 90;
      if (tur === "dogrusal") {
        const x1 = Number(g.oznitelikler.get("x1") ?? "0");
        const y1 = Number(g.oznitelikler.get("y1") ?? "0");
        const x2 = Number(g.oznitelikler.get("x2") ?? "1");
        const y2 = Number(g.oznitelikler.get("y2") ?? "0");
        aci = Math.round((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
      }
      return {
        tip: "gradyan",
        gradyanTuru: tur,
        aci,
        duraklar:
          duraklar.length >= 2
            ? duraklar
            : [
                { offset: 0, renk: "rgb(0, 0, 0)" },
                { offset: 1, renk: "rgb(255, 255, 255)" },
              ],
      };
    }
  }

  return { tip: "duz", renk: f };
}

function durakDugumu(d: GradyanDurak): Dugum {
  const rgba = ayristir(d.renk) ?? { r: 0, g: 0, b: 0, a: 1 };
  return dugumOlustur("stop", {
    offset: String(d.offset),
    "stop-color": `rgb(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)})`,
    "stop-opacity": String(Number(rgba.a.toFixed(3))),
  });
}

function gradyanDugumu(
  id: string,
  boya: Extract<BoyaDegeri, { tip: "gradyan" }>,
): Dugum {
  const duraklar = boya.duraklar.map(durakDugumu);
  if (boya.gradyanTuru === "radyal") {
    return dugumOlustur(
      "radialGradient",
      { id, cx: "0.5", cy: "0.5", r: "0.5" },
      duraklar,
    );
  }
  const rad = (boya.aci * Math.PI) / 180;
  return dugumOlustur(
    "linearGradient",
    {
      id,
      x1: (0.5 - Math.cos(rad) * 0.5).toFixed(4),
      y1: (0.5 - Math.sin(rad) * 0.5).toFixed(4),
      x2: (0.5 + Math.cos(rad) * 0.5).toFixed(4),
      y2: (0.5 + Math.sin(rad) * 0.5).toFixed(4),
    },
    duraklar,
  );
}

/**
 * Önceki (BİZİM ürettiğimiz, ONEK önekli) gradyanı defs'ten çıkaran komut; yoksa
 * null. Kullanıcının elle yazdığı gradyanlara dokunmaz. Düz renge/none'a ya da
 * başka bir gradyana geçişte öksüz (orphan) kaynak kalmasını önler (TK-6, İlke 7).
 */
export function eskiGradyanTemizle(
  belge: Belge,
  eskiFill: string,
): Komut | null {
  const eskiId = urlId(eskiFill);
  if (!eskiId || !eskiId.startsWith(ONEK)) return null;
  const defs = defsBul(belge);
  const eski = gradyanBul(belge, eskiId);
  if (!defs || !eski || !defs.cocuklar.includes(eski)) return null;
  return new DugumCikarKomutu(belge, defs, eski);
}

/**
 * Gradyanı defs'e ekleyip şeklin fill'ini `url(#id)` yapan tek komut. Önceki
 * gradyan bizimse (önekimiz) temizlenir. Hepsi tek geri-al adımı (BilesikKomut).
 */
export function gradyanKomutu(
  belge: Belge,
  dugum: Dugum,
  eskiFill: string,
  boya: Extract<BoyaDegeri, { tip: "gradyan" }>,
  ozellik: "fill" | "stroke" = "fill",
): Komut {
  const komutlar: Komut[] = [];

  let defs = defsBul(belge);
  if (!defs) {
    defs = dugumOlustur("defs");
    komutlar.push(new DugumEkleKomutu(belge, belge.kok, defs, 0));
  }

  const id = benzersizId(belge.kok, ONEK);
  komutlar.push(new DugumEkleKomutu(belge, defs, gradyanDugumu(id, boya)));

  komutlar.push(stilUygulaKomutu(belge, dugum, ozellik, `url(#${id})`));

  const temizle = eskiGradyanTemizle(belge, eskiFill);
  if (temizle) komutlar.push(temizle);

  return new BilesikKomut("gradyan uygula", komutlar);
}
