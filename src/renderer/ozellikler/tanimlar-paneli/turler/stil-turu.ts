import { defsBul } from "../../../../cekirdek/belge/defs";
import { html, nothing } from "lit";
import {
  dugumOlustur,
  gez,
  tumSiniflar,
  type Dugum,
} from "../../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../../cekirdek/belge/belge";
import type { Komut } from "../../../../cekirdek/komutlar/komut";
import {
  BilesikKomut,
  DugumEkleKomutu,
} from "../../../../cekirdek/komutlar/dugum-komutlari";
import { OznitelikDegistirKomutu } from "../../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { MetinKomutu } from "../../../../cekirdek/komutlar/metin-komutu";
import { dugumSerile } from "../../../../cekirdek/belge/model/disa-aktar";
import { kaynakTuruKayitDefteri } from "../../../../cekirdek/registry/kaynak-turu-registry";
import { kaynakGorunumKaydet, onizlemeSvg } from "../kaynak-gorunum";
import { cssKuralOku, cssKuralYaz } from "../../../boya/stil-css";

/** input[type=color] yalnız #rrggbb kabul eder; değilse picker için varsayılan. */
function hexNorm(c: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c.trim()) ? c.trim() : "#000000";
}

/**
 * Stil sınıfları kaynak türü (AGENTS.md Faz E, §8.1, §10.5).
 *
 * `<style>` içindeki CSS sınıflarını listeler ve şekillere uygular. Uygulama
 * stratejisi diğer türlerden TEMELDEN FARKLIDIR: `url(#id)` değil, şeklin `class`
 * listesine sınıf ekler/çıkarır (§8.1). Bu fark, "kaynak türü deseni"nin bu
 * esnekliği zaten karşıladığını gösterir — kabuk/sağ panel yine değişmedi (İlke 5).
 * Listele · uygula (class ekle) · oluştur (yeni kural) · sil (kuralı çıkar).
 */

function stilDugumleri(belge: Belge): Dugum[] {
  return [...gez(belge.kok)].filter((d) => d.etiket === "style");
}

/** CSS metninden sınıf adlarını (`.ad` seçicileri) çıkarır. */
function siniflariCikar(css: string): string[] {
  const set = new Set<string>();
  for (const m of css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) set.add(m[1]!);
  return [...set];
}

kaynakTuruKayitDefteri.kaydet({
  id: "stil",
  etiket: "Stil sınıfları",
  referansTuru: "sinif", // url(#id) değil; şeklin class listesine eklenir (§8.1)

  listele(belge) {
    const set = new Set<string>();
    for (const s of stilDugumleri(belge))
      for (const c of siniflariCikar(s.metin ?? "")) set.add(c);
    return [...set].map((c) => ({ id: c, etiket: `.${c}` }));
  },

  // Uygulama stratejisi: url() DEĞİL — şeklin class listesine ekle (§8.1).
  uygula(belge, dugumler, kaynakId): Komut | null {
    if (dugumler.length === 0) return null;
    const komutlar = dugumler.map((d) => {
      const mevcut = (d.oznitelikler.get("class") ?? "")
        .split(/\s+/)
        .filter(Boolean);
      if (!mevcut.includes(kaynakId)) mevcut.push(kaynakId);
      return new OznitelikDegistirKomutu(belge, d, "class", mevcut.join(" "));
    });
    return new BilesikKomut("sınıf uygula", komutlar);
  },

  olustur(belge): Komut {
    const komutlar: Komut[] = [];
    // Benzersiz sınıf adı: hem <style> kurallarında tanımlı hem de bir öğeye
    // uygulanmış sınıfları topla; çakışmayana kadar say (oturumlar arası güvenli).
    const mevcut = tumSiniflar(belge.kok);
    for (const s of stilDugumleri(belge))
      for (const c of siniflariCikar(s.metin ?? "")) mevcut.add(c);
    let n = 1;
    let ad = `svgtron-sinif-${n}`;
    while (mevcut.has(ad)) ad = `svgtron-sinif-${++n}`;
    const kural = `.${ad} { fill: #4a90e2; }`;
    const stil = stilDugumleri(belge)[0];
    if (stil) {
      komutlar.push(
        new MetinKomutu(
          belge,
          stil,
          `${(stil.metin ?? "").trimEnd()}\n${kural}\n`,
        ),
      );
    } else {
      let defs = defsBul(belge);
      if (!defs) {
        defs = dugumOlustur("defs");
        komutlar.push(new DugumEkleKomutu(belge, belge.kok, defs, 0));
      }
      komutlar.push(
        new DugumEkleKomutu(
          belge,
          defs,
          dugumOlustur("style", {}, [], `\n${kural}\n`),
        ),
      );
    }
    return new BilesikKomut("sınıf oluştur", komutlar);
  },

  sil(belge, kaynakId): Komut | null {
    const stil = stilDugumleri(belge).find((s) =>
      siniflariCikar(s.metin ?? "").includes(kaynakId),
    );
    if (!stil) return null;
    const kacis = kaynakId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const yeni = (stil.metin ?? "").replace(
      new RegExp(`\\.${kacis}\\s*\\{[^}]*\\}\\s*`, "g"),
      "",
    );
    return new MetinKomutu(belge, stil, yeni);
  },
});

/** Sınıfı (kuralını) içeren `<style>` düğümünü bulur (hangi style'da tanımlı). */
function sinifStilDugumu(belge: Belge, kaynakId: string): Dugum | null {
  return (
    stilDugumleri(belge).find((s) =>
      siniflariCikar(s.metin ?? "").includes(kaynakId),
    ) ?? null
  );
}

/**
 * Stil sınıfı GÖRÜNÜMÜ (önizleme + düzenleyici) — kaynak bir defs düğümü DEĞİL, bir
 * CSS sınıfıdır (id = sınıf adı). Önizleme: sınıfı içeren `<style>` düğümünü
 * serileştirip o sınıfı taşıyan küçük bir `<rect>` ile gösterir. Düzenleyici:
 * `fill`/`stroke`/`opacity` bildirimlerini okur/yazar (komutla → geri-alınabilir,
 * İlke 2; değişince Tuval + önizleme canlı güncellenir, İlke 3).
 */
kaynakGorunumKaydet({
  turId: "stil",
  onizleme: (belge, id) => {
    const stil = sinifStilDugumu(belge, id);
    if (!stil) return nothing;
    return onizlemeSvg(
      `${dugumSerile(stil)}<rect width="30" height="18" class="${id}"/>`,
    );
  },
  duzenle: ({ belge, kaynakId, komut }) => {
    const stil = sinifStilDugumu(belge, kaynakId);
    if (!stil) return nothing;
    const selector = `.${kaynakId}`;
    const oku = (ozellik: string): string | null =>
      cssKuralOku(stil.metin ?? "", selector, ozellik);
    const yaz = (ozellik: string, deger: string): void =>
      komut(
        new MetinKomutu(
          belge,
          stil,
          cssKuralYaz(stil.metin ?? "", selector, ozellik, deger),
        ),
      );
    return html`
      <div class="satir">
        <label>fill</label>
        <input
          type="color"
          .value=${hexNorm(oku("fill") ?? "#000000")}
          @change=${(e: Event) =>
            yaz("fill", (e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="satir">
        <label>stroke</label>
        <input
          type="color"
          .value=${hexNorm(oku("stroke") ?? "#000000")}
          @change=${(e: Event) =>
            yaz("stroke", (e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="satir">
        <label>opacity</label>
        <input
          type="number"
          step="0.05"
          min="0"
          max="1"
          .value=${oku("opacity") ?? "1"}
          @change=${(e: Event) =>
            yaz("opacity", (e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  },
});
