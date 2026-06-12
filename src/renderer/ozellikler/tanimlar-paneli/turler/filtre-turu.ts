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

/** input[type=color] yalnız #rrggbb kabul eder; değilse picker için varsayılan. */
function hexNorm(c: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c.trim()) ? c.trim() : "#000000";
}

/** İlk primitif çocukta var olabilecek sayısal alanlar (alt küme: var olan gösterilir). */
const SAYI_ALANLARI = ["stdDeviation", "dx", "dy"] as const;

/**
 * Filter kaynak türü (AGENTS.md Faz C, §8.1) — "kaynak türü deseni"nin ilk uçtan
 * uca kanıtı: listele · uygula (şekle `filter="url(#id)"`) · oluştur · sil.
 * Önizleme ayrı iş değildir: komut belgeyi değiştirince Tuval canlı güncellenir.
 */

function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === "defs") ?? null;
}

function filtreDugumu(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok)) {
    if (d.etiket === "filter" && d.oznitelikler.get("id") === id) return d;
  }
  return null;
}

kaynakTuruKayitDefteri.kaydet({
  id: "filter",
  etiket: "Filtreler",

  listele(belge) {
    const ogeler: { id: string; etiket: string }[] = [];
    for (const d of gez(belge.kok)) {
      const id = d.oznitelikler.get("id");
      if (d.etiket === "filter" && id) ogeler.push({ id, etiket: id });
    }
    return ogeler;
  },

  uygula(belge, dugumler, kaynakId): Komut | null {
    if (dugumler.length === 0) return null;
    return new BilesikKomut(
      "filtre uygula",
      dugumler.map((d) =>
        stilUygulaKomutu(belge, d, "filter", `url(#${kaynakId})`),
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
    const id = benzersizId(belge.kok, "svgtron-filtre-");
    const filtre = dugumOlustur(
      "filter",
      { id, x: "-20%", y: "-20%", width: "140%", height: "140%" },
      [
        dugumOlustur("feDropShadow", {
          dx: "2",
          dy: "2",
          stdDeviation: "3",
          "flood-color": "#000000",
          "flood-opacity": "0.4",
        }),
      ],
    );
    komutlar.push(new DugumEkleKomutu(belge, defs, filtre));
    return new BilesikKomut("filtre oluştur", komutlar);
  },

  sil(belge, kaynakId): Komut | null {
    const defs = defsBul(belge);
    const filtre = filtreDugumu(belge, kaynakId);
    if (!defs || !filtre || !defs.cocuklar.includes(filtre)) return null;
    return new DugumCikarKomutu(belge, defs, filtre);
  },
});

/**
 * Filtre GÖRÜNÜMÜ (önizleme + düzenleyici) — §8.1 deseni. Önizleme: filtreyi
 * uygulayan küçük bir yuvarlatılmış dikdörtgen. Düzenleyici: filtrenin İLK primitif
 * çocuğundaki yaygın alanlar (feGaussianBlur → stdDeviation; feDropShadow → dx, dy,
 * stdDeviation, flood-color; feOffset → dx, dy) — yalnız VAR OLAN öznitelikler alan
 * olur. Değişiklik komutla yazılır (İlke 2 → geri-alınabilir); Tuval + önizleme
 * canlı güncellenir (İlke 3). Tanınan primitif yoksa nothing.
 */
kaynakGorunumKaydet({
  turId: "filter",
  onizleme: (belge, id) =>
    defsOnizleme(
      belge,
      id,
      `<rect x="5" y="3" width="20" height="12" rx="2" fill="#7aa7e6" filter="url(#${id})"/>`,
    ),
  duzenle: ({ belge, kaynakId, komut }) => {
    const filtre = filtreDugumu(belge, kaynakId);
    if (!filtre) return nothing;
    const primitif =
      filtre.cocuklar.find((c) => c.etiket.startsWith("fe")) ?? null;
    if (!primitif) return nothing;
    const yaz = (ad: string, deger: string): void =>
      komut(new OznitelikDegistirKomutu(belge, primitif, ad, deger));
    const sayiAlanlari = SAYI_ALANLARI.filter((ad) =>
      primitif.oznitelikler.has(ad),
    );
    const renkVar = primitif.oznitelikler.has("flood-color");
    if (sayiAlanlari.length === 0 && !renkVar) return nothing;
    return html`
      ${sayiAlanlari.map(
        (ad) =>
          html`<div class="satir">
            <label>${ad}</label>
            <input
              type="number"
              step="0.5"
              .value=${primitif.oznitelikler.get(ad) ?? "0"}
              @change=${(e: Event) =>
                yaz(ad, (e.target as HTMLInputElement).value)}
            />
          </div>`,
      )}
      ${renkVar
        ? html`<div class="satir">
            <label>flood-color</label>
            <input
              type="color"
              .value=${hexNorm(
                primitif.oznitelikler.get("flood-color") ?? "#000000",
              )}
              @change=${(e: Event) =>
                yaz("flood-color", (e.target as HTMLInputElement).value)}
            />
          </div>`
        : nothing}
    `;
  },
});
