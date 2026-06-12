import { html, nothing } from "lit";
import {
  dugumOlustur,
  gez,
  benzersizId,
  type Dugum,
} from "../../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../../cekirdek/belge/belge";
import type { Komut } from "../../../../cekirdek/komutlar/komut";
import {
  BilesikKomut,
  DugumCikarKomutu,
  DugumEkleKomutu,
} from "../../../../cekirdek/komutlar/dugum-komutlari";
import { OznitelikDegistirKomutu } from "../../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { kaynakTuruKayitDefteri } from "../../../../cekirdek/registry/kaynak-turu-registry";
import { stilUygulaKomutu } from "../../../boya/stil-uygula";
import { kaynakGorunumKaydet, defsOnizleme } from "../kaynak-gorunum";

/**
 * Pattern (desen) kaynak türü (AGENTS.md Faz G+, §8.1, §10.5). "Yeni tür = yeni
 * registry kaydı" (İlke 5). Uygulama stratejisi gradyan gibi `fill="url(#id)"`tir.
 * Listele · uygula · oluştur (nokta deseni) · sil.
 */

function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === "defs") ?? null;
}
function desenDugumu(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok))
    if (d.etiket === "pattern" && d.oznitelikler.get("id") === id) return d;
  return null;
}

kaynakTuruKayitDefteri.kaydet({
  id: "pattern",
  etiket: "Desenler (pattern)",

  listele(belge) {
    const ogeler: { id: string; etiket: string }[] = [];
    for (const d of gez(belge.kok)) {
      const id = d.oznitelikler.get("id");
      if (d.etiket === "pattern" && id) ogeler.push({ id, etiket: id });
    }
    return ogeler;
  },

  uygula(belge, dugumler, kaynakId): Komut | null {
    if (dugumler.length === 0) return null;
    return new BilesikKomut(
      "desen uygula",
      dugumler.map((d) =>
        stilUygulaKomutu(belge, d, "fill", `url(#${kaynakId})`),
      ),
    );
  },

  olustur(belge): Komut {
    const komutlar: Komut[] = [];
    let defs = defsBul(belge);
    if (!defs) {
      defs = dugumOlustur("defs");
      komutlar.push(new DugumEkleKomutu(belge, belge.kok, defs, 0));
    }
    const id = benzersizId(belge.kok, "svgtron-desen-");
    const desen = dugumOlustur(
      "pattern",
      { id, width: "10", height: "10", patternUnits: "userSpaceOnUse" },
      [
        dugumOlustur("rect", { width: "10", height: "10", fill: "#ffffff" }),
        dugumOlustur("circle", { cx: "5", cy: "5", r: "2", fill: "#4a90e2" }),
      ],
    );
    komutlar.push(new DugumEkleKomutu(belge, defs, desen));
    return new BilesikKomut("desen oluştur", komutlar);
  },

  sil(belge, kaynakId): Komut | null {
    const defs = defsBul(belge);
    const desen = desenDugumu(belge, kaynakId);
    if (!defs || !desen || !defs.cocuklar.includes(desen)) return null;
    return new DugumCikarKomutu(belge, defs, desen);
  },
});

/**
 * Desen GÖRÜNÜMÜ (önizleme + düzenleyici) — §8.1/§8.3 deseni. Önizleme: url(#id) ile
 * dolu küçük bir kare. Düzenleyici: pattern düğümünün `width`/`height` öznitelikleri
 * (döşeme boyutu, number). Hepsi komutla (İlke 2 → geri-alınabilir); değişince Tuval +
 * önizleme canlı güncellenir (İlke 3).
 */
kaynakGorunumKaydet({
  turId: "pattern",
  onizleme: (belge, id) =>
    defsOnizleme(
      belge,
      id,
      `<rect width="30" height="18" fill="url(#${id})"/>`,
    ),
  duzenle: ({ belge, kaynakId, komut }) => {
    const desen = desenDugumu(belge, kaynakId);
    if (!desen) return nothing;
    const yaz = (ad: string, deger: string): void =>
      komut(new OznitelikDegistirKomutu(belge, desen, ad, deger));
    return html`
      <div class="satir">
        <label>width</label>
        <input
          type="number"
          step="1"
          min="0"
          .value=${desen.oznitelikler.get("width") ?? "0"}
          @change=${(e: Event) =>
            yaz("width", (e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="satir">
        <label>height</label>
        <input
          type="number"
          step="1"
          min="0"
          .value=${desen.oznitelikler.get("height") ?? "0"}
          @change=${(e: Event) =>
            yaz("height", (e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  },
});
