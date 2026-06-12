import { dugumOlustur, gez, type Dugum } from "../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../cekirdek/belge/belge";
import { pano } from "./pano";
import type { SecimDeposu } from "../../../cekirdek/secim/secim-deposu";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import {
  BilesikKomut,
  DugumCikarKomutu,
  DugumEkleKomutu,
} from "../../../cekirdek/komutlar/dugum-komutlari";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { transformTasi } from "../../tuval/donusum";

/**
 * Düzenleme eylem üreticileri (§9/§11) — sil / çoğalt / grupla / çöz. Hepsi
 * komut ilkellerinden (İlke 2) BilesikKomut üretir; çağıran geçmişe çalıştırır
 * ve gerekirse seçimi günceller (`sonraSec`).
 */
export interface DuzenSonuc {
  readonly komut: Komut;
  /** Komuttan sonra seçilecek düğümler (varsa). */
  readonly sonraSec?: Dugum[];
}

/** id'leri çıkararak derin kopya (yinelenen id'leri önler). */
function kopyala(d: Dugum): Dugum {
  const oz = new Map(d.oznitelikler);
  oz.delete("id");
  return dugumOlustur(d.etiket, oz, d.cocuklar.map(kopyala), d.metin);
}

/** Seçili düğümleri siler. */
export function sil(belge: Belge, secim: SecimDeposu): DuzenSonuc | null {
  const komutlar: Komut[] = [];
  for (const d of secim.secililer) {
    const p = belge.ebeveyn(d);
    if (p) komutlar.push(new DugumCikarKomutu(belge, p, d));
  }
  return komutlar.length
    ? { komut: new BilesikKomut("sil", komutlar), sonraSec: [] }
    : null;
}

/** Seçili düğümleri çoğaltır (küçük ofsetle) ve kopyaları seçer. */
export function cogalt(belge: Belge, secim: SecimDeposu): DuzenSonuc | null {
  const komutlar: Komut[] = [];
  const yeniler: Dugum[] = [];
  for (const d of secim.secililer) {
    const p = belge.ebeveyn(d);
    if (!p) continue;
    const kopya = kopyala(d);
    kopya.oznitelikler.set(
      "transform",
      transformTasi(kopya.oznitelikler.get("transform") ?? "", 12, 12),
    );
    yeniler.push(kopya);
    komutlar.push(
      new DugumEkleKomutu(belge, p, kopya, p.cocuklar.indexOf(d) + 1),
    );
  }
  return komutlar.length
    ? { komut: new BilesikKomut("çoğalt", komutlar), sonraSec: yeniler }
    : null;
}

/**
 * Seçili düğümleri panoya kopyalar (görünüm durumu — Command DEĞİL, undo'ya GİRMEZ).
 * Her girdi id'siz derin kopya + kopyalandığı ebeveyn referansını tutar (yerinde
 * yapıştırma hedefi için). `true` = kopyalandı.
 */
export function panoyaKopyala(belge: Belge, secim: SecimDeposu): boolean {
  const girdiler = secim.secililer.map((d) => ({
    kopya: kopyala(d),
    ebeveyn: belge.ebeveyn(d),
  }));
  if (!girdiler.length) return false;
  pano.yaz(girdiler);
  return true;
}

/** Seçili düğümleri panoya kopyalar VE siler (kes). Silme tek BilesikKomut'tur. */
export function panoyaKes(belge: Belge, secim: SecimDeposu): DuzenSonuc | null {
  if (!panoyaKopyala(belge, secim)) return null;
  return sil(belge, secim);
}

/**
 * Panodaki düğümleri YERİNDE yapıştırır (TK-37 #9): kopyalandığı ebeveyn hâlâ
 * belgedeyse oraya (aynı koordinat uzayı → görsel konum korunur), değilse köke
 * ekler. Her yapıştırmada YENİ kopya türetilir (tekrar tekrar yapıştırılabilir;
 * id'ler `kopyala` ile düşürülür → çakışma yok). Tek BilesikKomut; kopyalar seçilir.
 */
export function yapistir(belge: Belge, _secim: SecimDeposu): DuzenSonuc | null {
  const girdiler = pano.oku();
  if (!girdiler.length) return null;
  const agacta = new Set(gez(belge.kok)); // ebeveyn hâlâ belgede mi?
  const komutlar: Komut[] = [];
  const yeniler: Dugum[] = [];
  for (const g of girdiler) {
    const ebeveyn = g.ebeveyn && agacta.has(g.ebeveyn) ? g.ebeveyn : belge.kok;
    const kopya = kopyala(g.kopya);
    yeniler.push(kopya);
    komutlar.push(new DugumEkleKomutu(belge, ebeveyn, kopya));
  }
  return { komut: new BilesikKomut("yapıştır", komutlar), sonraSec: yeniler };
}

/** Seçili düğümleri (aynı ebeveyndeyse) bir <g> içine alır. */
export function grupla(belge: Belge, secim: SecimDeposu): DuzenSonuc | null {
  const ds = secim.secililer;
  if (ds.length < 1) return null;
  const p = belge.ebeveyn(ds[0]!);
  if (!p || !ds.every((d) => belge.ebeveyn(d) === p)) return null;

  const sirali = [...ds].sort(
    (a, b) => p.cocuklar.indexOf(a) - p.cocuklar.indexOf(b),
  );
  const minIdx = p.cocuklar.indexOf(sirali[0]!);
  const g = dugumOlustur("g", {}, []);
  const komutlar: Komut[] = [];
  for (const d of sirali) {
    komutlar.push(new DugumCikarKomutu(belge, p, d));
    komutlar.push(new DugumEkleKomutu(belge, g, d));
  }
  komutlar.push(new DugumEkleKomutu(belge, p, g, minIdx));
  return { komut: new BilesikKomut("grupla", komutlar), sonraSec: [g] };
}

/** Seçili tek grubu (<g>) çözer; grubun dönüşümü çocuklara aktarılır. */
export function coz(belge: Belge, secim: SecimDeposu): DuzenSonuc | null {
  const ds = secim.secililer;
  if (ds.length !== 1 || ds[0]!.etiket !== "g") return null;
  const g = ds[0]!;
  const p = belge.ebeveyn(g);
  if (!p) return null;
  const idx = p.cocuklar.indexOf(g);
  const gTransform = g.oznitelikler.get("transform") ?? "";
  const cocuklar = [...g.cocuklar];
  const komutlar: Komut[] = [];
  cocuklar.forEach((c, i) => {
    komutlar.push(new DugumCikarKomutu(belge, g, c));
    // Grubun dönüşümünü çocuğun başına ekle (konum korunsun) — geri-alınabilir
    // bir Command ile (İlke 2). Doğrudan mutasyon yapılsaydı geriAl eski
    // transform'u yükleyemez, çöz çift dönüşümle yanlış konuma kayardı.
    if (gTransform) {
      const mevcut = c.oznitelikler.get("transform") ?? "";
      komutlar.push(
        new OznitelikDegistirKomutu(
          belge,
          c,
          "transform",
          mevcut ? `${gTransform} ${mevcut}` : gTransform,
        ),
      );
    }
    komutlar.push(new DugumEkleKomutu(belge, p, c, idx + i));
  });
  komutlar.push(new DugumCikarKomutu(belge, p, g));
  return { komut: new BilesikKomut("çöz", komutlar), sonraSec: cocuklar };
}
