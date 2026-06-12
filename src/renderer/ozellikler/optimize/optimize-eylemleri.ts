import {
  gez,
  dugumOlustur,
  type Dugum,
} from "../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../cekirdek/belge/belge";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import {
  menuKayitDefteri,
  type MenuBaglami,
} from "../../../cekirdek/registry/menu-registry";
import {
  BilesikKomut,
  DugumCikarKomutu,
  DugumDegistirKomutu,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { yoluAyristir, yoluYaz } from "../../../cekirdek/belge/model/yol";
import { cizimErisimi } from "../../tuval/cizim-erisimi";
import { say } from "../../tuval/donusum";
import { bildirimServisi } from "../../kabuk/bildirim-servisi";
import { t } from "../../diller/dil";

/**
 * Optimize / temizle (AGENTS.md §11.4) — "temiz" dışa-aktarım profilinin (İlke 8)
 * iç karşılığı. "Belge" menü grubunda (registry, İlke 5). Her işlem tek Command.
 */

/** `<defs>` altında tanımlı, hiçbir yerden atıf almayan id'leri toplar. */
function kullanilmayanTanimlar(
  belge: Belge,
): { dugum: Dugum; ebeveyn: Dugum }[] {
  const tanimli = new Map<string, { dugum: Dugum; ebeveyn: Dugum }>();
  for (const defs of [...gez(belge.kok)].filter((d) => d.etiket === "defs")) {
    for (const c of defs.cocuklar) {
      const id = c.oznitelikler.get("id");
      if (id) tanimli.set(id, { dugum: c, ebeveyn: defs });
    }
  }
  const kullanilan = new Set<string>();
  const refRe = /url\(\s*#([^)\s'"]+)\s*\)/g;
  for (const d of gez(belge.kok)) {
    for (const v of d.oznitelikler.values()) {
      let m: RegExpExecArray | null;
      refRe.lastIndex = 0;
      while ((m = refRe.exec(v))) kullanilan.add(m[1]!);
    }
    const href = d.oznitelikler.get("href") ?? d.oznitelikler.get("xlink:href");
    if (href?.startsWith("#")) kullanilan.add(href.slice(1));
  }
  const sonuc: { dugum: Dugum; ebeveyn: Dugum }[] = [];
  for (const [id, kayit] of tanimli) if (!kullanilan.has(id)) sonuc.push(kayit);
  return sonuc;
}

const YUVARLANACAK = new Set([
  "x",
  "y",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "x1",
  "y1",
  "x2",
  "y2",
  "dx",
  "dy",
  "offset",
  "stroke-width",
  "font-size",
]);

function sayiYuvarla(s: string, k: number): string {
  return (s.match(/-?\d*\.?\d+(?:[eE][+-]?\d+)?/g) ?? [s])
    .map((p) => {
      const n = Number(p);
      return Number.isFinite(n) ? String(Math.round(n * k) / k) : p;
    })
    .join(" ");
}

/** Koordinatları/sayıları `basamak` ondalığa yuvarlayan komutlar. */
function yuvarlamaKomutlari(belge: Belge, basamak: number): Komut[] {
  const k = 10 ** basamak;
  const komutlar: Komut[] = [];
  const yaz = (d: Dugum, ad: string, yeni: string): void => {
    if (yeni !== d.oznitelikler.get(ad))
      komutlar.push(new OznitelikDegistirKomutu(belge, d, ad, yeni));
  };
  for (const d of gez(belge.kok)) {
    const dd = d.oznitelikler.get("d");
    if (dd) {
      try {
        yaz(d, "d", yoluYaz(yoluAyristir(dd)));
      } catch {
        /* geçersiz d → atla */
      }
    }
    const pts = d.oznitelikler.get("points");
    if (pts) yaz(d, "points", sayiYuvarla(pts, k));
    for (const a of YUVARLANACAK) {
      const v = d.oznitelikler.get(a);
      // Yalnız SAF sayıları yuvarla; '100%'/'5px' gibi birimli değerlere DOKUNMA.
      if (v !== undefined && /^-?\d*\.?\d+(?:[eE][+-]?\d+)?$/.test(v.trim())) {
        yaz(d, a, String(Math.round(parseFloat(v) * k) / k));
      }
    }
  }
  return komutlar;
}

function temizle(baglam: MenuBaglami): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const komutlar = kullanilmayanTanimlar(belge).map(
    ({ dugum, ebeveyn }) => new DugumCikarKomutu(belge, ebeveyn, dugum),
  );
  if (komutlar.length)
    baglam.gecmis.calistir(
      new BilesikKomut("kullanılmayanları temizle", komutlar),
    );
}

function yuvarla(baglam: MenuBaglami): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const komutlar = yuvarlamaKomutlari(belge, 2);
  if (komutlar.length)
    baglam.gecmis.calistir(new BilesikKomut("koordinatları yuvarla", komutlar));
}

// --- Dejenere şekilleri sadeleştir (path→çizgi, sıfır-boyut nesneleri sil) ---

/** Tuvalde gerçekten çizilen (görsel) yaprak öğeler. */
const CIZILEN = new Set([
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "image",
  "use",
  "foreignObject",
]);
/** İçeriği render EDİLMEYEN konteynerler — altındaki şekiller geometri/tanımdır. */
const TANIM_KAPSAYICI = new Set([
  "defs",
  "symbol",
  "clipPath",
  "mask",
  "marker",
  "pattern",
  "linearGradient",
  "radialGradient",
  "filter",
  "style",
  "title",
  "desc",
  "metadata",
]);
const SIFIR_ESIK = 1e-6;

/** Dejenere bir `path`'i eşdeğer `line` düğümüne çevirir (`d` düşürülür, x1..y2 eklenir). */
function pathiCizgiyeCevir(dugum: Dugum, bbox: DOMRect, yatay: boolean): Dugum {
  const oz = new Map(dugum.oznitelikler);
  oz.delete("d"); // geometri artık x1/y1/x2/y2'de; diğer öznitelikler (stroke/id/transform...) korunur
  const x = say(bbox.x);
  const y = say(bbox.y);
  if (yatay) {
    // height ≈ 0 → yatay çizgi
    oz.set("x1", String(x));
    oz.set("y1", String(y));
    oz.set("x2", String(say(bbox.x + bbox.width)));
    oz.set("y2", String(y));
  } else {
    // width ≈ 0 → dikey çizgi
    oz.set("x1", String(x));
    oz.set("y1", String(y));
    oz.set("x2", String(x));
    oz.set("y2", String(say(bbox.y + bbox.height)));
  }
  return dugumOlustur("line", oz);
}

/**
 * Bir çizilen düğümün render bbox'ına göre kararı: 'sil' (her iki boyut ≈ 0),
 * bir `line` düğümü (path + tek boyut ≈ 0 → çizgi), ya da null (dokunma).
 */
function dejenereKarar(belge: Belge, dugum: Dugum): "sil" | Dugum | null {
  const el = cizimErisimi.eleman(dugum.kimlik);
  if (!(el instanceof SVGGraphicsElement) || !el.isConnected) return null;
  let bbox: DOMRect;
  try {
    bbox = el.getBBox();
  } catch {
    return null; // render edilemeyen/ölçülemeyen öğe
  }
  const wSifir = bbox.width <= SIFIR_ESIK;
  const hSifir = bbox.height <= SIFIR_ESIK;

  if (wSifir && hSifir) {
    // Her iki boyut da 0 → görünmez nesne. Ona atıf veren (örn. <use>) varsa
    // dangling bırakmamak için silme (id referans alıyorsa atla).
    const id = dugum.oznitelikler.get("id");
    if (id && belge.referansIndeksi.kullananlar(id).length > 0) return null;
    return "sil";
  }
  // Tek boyut 0 olan PATH aslında bir çizgidir → yönüne göre line'a çevir.
  if (dugum.etiket === "path" && (wSifir || hSifir)) {
    return pathiCizgiyeCevir(dugum, bbox, hSifir);
  }
  return null;
}

/** Dejenere şekiller için komutları toplar (tanım konteynerleri atlanır). */
function dejenereKomutlari(belge: Belge): {
  komutlar: Komut[];
  cizgi: number;
  sil: number;
} {
  const komutlar: Komut[] = [];
  let cizgi = 0;
  let sil = 0;

  const yuru = (
    dugum: Dugum,
    ebeveyn: Dugum | null,
    tanimda: boolean,
  ): void => {
    if (ebeveyn && !tanimda && CIZILEN.has(dugum.etiket)) {
      const karar = dejenereKarar(belge, dugum);
      if (karar === "sil") {
        komutlar.push(new DugumCikarKomutu(belge, ebeveyn, dugum));
        sil++;
        return; // çocukları da gitti
      }
      if (karar) {
        komutlar.push(new DugumDegistirKomutu(belge, ebeveyn, dugum, karar));
        cizgi++;
        return;
      }
    }
    const altTanimda = tanimda || TANIM_KAPSAYICI.has(dugum.etiket);
    for (const c of [...dugum.cocuklar]) yuru(c, dugum, altTanimda);
  };
  yuru(belge.kok, null, false);
  return { komutlar, cizgi, sil };
}

function sadelestir(baglam: MenuBaglami): void {
  const belge = baglam.depo.belge;
  if (!belge) return;
  const { komutlar, cizgi, sil } = dejenereKomutlari(belge);
  if (komutlar.length === 0) {
    bildirimServisi.bildir(t("belge.sadelestir.yok"), "bilgi");
    return;
  }
  baglam.gecmis.calistir(new BilesikKomut("şekilleri sadeleştir", komutlar));
  bildirimServisi.bildir(
    t("belge.sadelestir.sonuc", { cizgi: String(cizgi), sil: String(sil) }),
    "bilgi",
  );
}

menuKayitDefteri.kaydet({
  id: "belge.temizle",
  grup: "belge",
  etiketAnahtari: "menu.belge.temizle",
  sira: 0,
  calistir: temizle,
});
menuKayitDefteri.kaydet({
  id: "belge.yuvarla",
  grup: "belge",
  etiketAnahtari: "menu.belge.yuvarla",
  sira: 1,
  calistir: yuvarla,
});
menuKayitDefteri.kaydet({
  id: "belge.sadelestir",
  grup: "belge",
  etiketAnahtari: "menu.belge.sadelestir",
  sira: 2,
  calistir: sadelestir,
});
