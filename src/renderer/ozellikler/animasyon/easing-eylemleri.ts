import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import { BilesikKomut } from "../../../cekirdek/komutlar/dugum-komutlari";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { EASING_NOKTALARI, keySplinesTekrar } from "../zaman-cizelgesi/easing";
import { t } from "../../diller/dil";

/**
 * Easing (yumuşatma) eylemleri (TK-37 #5, İlke 5) — seçili SMIL animasyon
 * düğümlerine bir kübik-bézier zamanlama uygular: `calcMode="spline"` + `keySplines`
 * (segment sayısına göre tekrarlı). Saf çekirdek `zaman-cizelgesi/easing.ts` (testli).
 * Tek BilesikKomut (İlke 2). [Eased oynatma görsel — §5.]
 */

const ANIMASYON = new Set(["animate", "animateTransform", "animateMotion"]);

/** Animasyonun segment (geçiş) sayısı — keySplines bunun kadar `;`-ayrık olmalı. */
function segmentSayisi(anim: Dugum): number {
  const values = anim.oznitelikler.get("values");
  if (values)
    return Math.max(1, values.split(";").filter((s) => s.trim()).length - 1);
  const kt = anim.oznitelikler.get("keyTimes");
  if (kt) return Math.max(1, kt.split(";").filter((s) => s.trim()).length - 1);
  return 1; // from/to → tek geçiş
}

function easingUygula(baglam: MenuBaglami, ad: string): void {
  const belge = baglam.depo.belge;
  const noktalar = EASING_NOKTALARI[ad];
  if (!belge || !noktalar) return;
  const animler = baglam.secim.secililer.filter((d) => ANIMASYON.has(d.etiket));
  if (animler.length === 0) {
    baglam.hataBildir(t("animasyon.easingGecersiz"));
    return;
  }
  const komutlar: Komut[] = [];
  for (const a of animler) {
    komutlar.push(new OznitelikDegistirKomutu(belge, a, "calcMode", "spline"));
    komutlar.push(
      new OznitelikDegistirKomutu(
        belge,
        a,
        "keySplines",
        keySplinesTekrar(noktalar, segmentSayisi(a)),
      ),
    );
  }
  baglam.gecmis.calistir(new BilesikKomut("yumuşatma", komutlar));
}

// ease / ease-in / ease-out / ease-in-out preset menü ögeleri (Animasyon grubu).
const PRESETLER: { ad: string; anahtar: string; sira: number }[] = [
  { ad: "ease", anahtar: "menu.animasyon.easingEase", sira: 20 },
  { ad: "ease-in", anahtar: "menu.animasyon.easingIn", sira: 30 },
  { ad: "ease-out", anahtar: "menu.animasyon.easingOut", sira: 40 },
  { ad: "ease-in-out", anahtar: "menu.animasyon.easingInOut", sira: 50 },
];

for (const p of PRESETLER) {
  menuKayitDefteri.kaydet({
    id: `animasyon.easing.${p.ad}`,
    grup: "animasyon",
    etiketAnahtari: p.anahtar,
    sira: p.sira,
    calistir: (baglam) => easingUygula(baglam, p.ad),
  });
}
