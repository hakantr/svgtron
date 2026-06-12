import {
  dugumOlustur,
  gez,
  type Dugum,
} from "../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../cekirdek/belge/belge";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import {
  DugumEkleKomutu,
  DugumCikarKomutu,
  BilesikKomut,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import { secimKaydiBastir } from "../../../cekirdek/secim/secim-kayit-bastir";

/**
 * Semboller / Bileşenler (AGENTS.md §11.3, §10.4) — `<symbol>` + `<use>`.
 *
 * "Sembol Yap": seçimi `<defs>`'teki bir `<symbol>`'e taşır ve yerine bir `<use>`
 * koyar. Ana sembolü düzenleyince TÜM `<use>` örnekleri kendiliğinden güncellenir
 * (SVG `<use>` canlı referanstır — İlke 3'ün doğal sonucu). Yeni örnek = bir
 * `<use>`'u çoğaltmak (mevcut "Çoğalt" href'i koruyarak senkron örnek üretir).
 *
 * "Sembolü Genişlet": bir `<use>`'u sembol içeriğinin düzenlenebilir kopyasıyla
 * değiştirir (bağı çözer). Hepsi tek BileşikKomut (İlke 2).
 *
 * Konum korunur: `<symbol overflow="visible">` + `<use>` (w/h yok) içeriği özgün
 * koordinatlarında render eder; viewBox/ölçek yoktur.
 */

/** Belgede kullanılmayan bir `sembolN` id'si üretir. */
function yeniSembolId(belge: Belge): string {
  const mevcut = new Set<string>();
  for (const d of gez(belge.kok)) {
    const id = d.oznitelikler.get("id");
    if (id) mevcut.add(id);
  }
  let i = 1;
  while (mevcut.has(`sembol${i}`)) i++;
  return `sembol${i}`;
}

/** İlk `<defs>`'i döndürür; yoksa oluşturup komut listesine ekler. */
function defsAl(belge: Belge, komutlar: Komut[]): Dugum {
  const mevcut = belge.kok.cocuklar.find((d) => d.etiket === "defs");
  if (mevcut) return mevcut;
  const defs = dugumOlustur("defs");
  komutlar.push(new DugumEkleKomutu(belge, belge.kok, defs, 0));
  return defs;
}

/** id'leri çıkararak derin kopya (genişletmede yinelenen id'leri önler). */
function kopyalaIdsiz(d: Dugum): Dugum {
  const oz = new Map([...d.oznitelikler].filter(([k]) => k !== "id"));
  return dugumOlustur(d.etiket, oz, d.cocuklar.map(kopyalaIdsiz), d.metin);
}

/** Belge sırası (DFS) — operandları boyama sırasıyla (alttan üste) sıralar. */
function dokumanSirasi(belge: Belge): Map<string, number> {
  const sira = new Map<string, number>();
  let i = 0;
  for (const d of gez(belge.kok)) sira.set(d.kimlik, i++);
  return sira;
}

/** Seçimi bir `<symbol>`'e taşıyıp yerine `<use>` koyar (§11.3). */
export function sembolYap(
  belge: Belge,
  secim: SecimDeposu,
  gecmis: KomutGecmisi,
): boolean {
  if (secim.secililer.length === 0) return false;
  const sira = dokumanSirasi(belge);
  const operandlar = [...secim.secililer].sort(
    (a, b) => (sira.get(a.kimlik) ?? 0) - (sira.get(b.kimlik) ?? 0),
  );
  const alt = operandlar[0]!;
  const ebeveyn = belge.ebeveyn(alt) ?? belge.kok;
  const idx = ebeveyn.cocuklar.indexOf(alt);
  const id = yeniSembolId(belge);

  const sembol = dugumOlustur("symbol", { id, overflow: "visible" }, [
    ...operandlar,
  ]);
  const komutlar: Komut[] = operandlar.map(
    (s) => new DugumCikarKomutu(belge, belge.ebeveyn(s) ?? belge.kok, s),
  );
  const defs = defsAl(belge, komutlar);
  komutlar.push(new DugumEkleKomutu(belge, defs, sembol));
  const use = dugumOlustur("use", { href: `#${id}` });
  komutlar.push(new DugumEkleKomutu(belge, ebeveyn, use, idx));

  // Düzenleme + seçim = tek kullanıcı eylemi (§9.4): seçim ayrı geçmiş adımı yazmaz.
  secimKaydiBastir(() => {
    gecmis.calistir(new BilesikKomut("sembol yap", komutlar));
    secim.sec(use);
  });
  return true;
}

/** Seçili `<use>`(leri) sembol içeriğinin düzenlenebilir kopyasıyla değiştirir. */
export function sembolGenislet(
  belge: Belge,
  secim: SecimDeposu,
  gecmis: KomutGecmisi,
): boolean {
  const useler = secim.secililer.filter((d) => d.etiket === "use");
  if (useler.length === 0) return false;

  const komutlar: Komut[] = [];
  const yeniSecim: Dugum[] = [];
  for (const use of useler) {
    const href =
      use.oznitelikler.get("href") ?? use.oznitelikler.get("xlink:href") ?? "";
    const id = href.replace(/^#/, "");
    if (!id) continue;
    const sembol = [...gez(belge.kok)].find(
      (d) => d.oznitelikler.get("id") === id,
    );
    if (!sembol) continue;
    const ebeveyn = belge.ebeveyn(use) ?? belge.kok;
    const idx = ebeveyn.cocuklar.indexOf(use);

    const parcalar: string[] = [];
    const tr = use.oznitelikler.get("transform");
    if (tr) parcalar.push(tr);
    const x = parseFloat(use.oznitelikler.get("x") ?? "0") || 0;
    const y = parseFloat(use.oznitelikler.get("y") ?? "0") || 0;
    if (x || y) parcalar.push(`translate(${x}, ${y})`);

    const klonlar = sembol.cocuklar.map(kopyalaIdsiz);
    const g = dugumOlustur(
      "g",
      parcalar.length ? { transform: parcalar.join(" ") } : {},
      klonlar,
    );
    komutlar.push(new DugumCikarKomutu(belge, ebeveyn, use));
    komutlar.push(new DugumEkleKomutu(belge, ebeveyn, g, idx));
    yeniSecim.push(g);
  }
  if (komutlar.length === 0) return false;
  secimKaydiBastir(() => {
    gecmis.calistir(new BilesikKomut("sembolü genişlet", komutlar));
    secim.cokluSec(yeniSecim);
  });
  return true;
}
