import { html, nothing, type TemplateResult } from "lit";
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
 * Marker (uç işaretleri) kaynak türü (AGENTS.md Faz D, §8.1, §10.5).
 *
 * "Yeni tür = yeni registry kaydı"nın kanıtı: kabuk/sağ panel değişmeden bir SVG
 * kavramı daha eklenir (İlke 5). Uygulama stratejisi filtreden FARKLIDIR —
 * `filter="url(#id)"` yerine `marker-end="url(#id)"` — ki §8.1'in "deseni esnek
 * tutan" noktası tam da budur. Listele · uygula · oluştur (ok ucu) · sil; önizleme
 * ayrı iş değildir (komut belgeyi değiştirince Tuval canlı güncellenir, İlke 3).
 */

function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === "defs") ?? null;
}

function markerDugumu(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok)) {
    if (d.etiket === "marker" && d.oznitelikler.get("id") === id) return d;
  }
  return null;
}

kaynakTuruKayitDefteri.kaydet({
  id: "marker",
  etiket: "Uç işaretleri (marker)",

  listele(belge) {
    const ogeler: { id: string; etiket: string }[] = [];
    for (const d of gez(belge.kok)) {
      const id = d.oznitelikler.get("id");
      if (d.etiket === "marker" && id) ogeler.push({ id, etiket: id });
    }
    return ogeler;
  },

  // Uygulama stratejisi: seçili şekillerin yol/çizgi uçlarına ok koy (marker-end).
  uygula(belge, dugumler, kaynakId): Komut | null {
    if (dugumler.length === 0) return null;
    return new BilesikKomut(
      "marker uygula",
      dugumler.map((d) =>
        stilUygulaKomutu(belge, d, "marker-end", `url(#${kaynakId})`),
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
    const id = benzersizId(belge.kok, "svgtron-marker-");
    // Ok ucu; `orient=auto-start-reverse` (§10.5) yön takip eder; `context-stroke`
    // (§10.9) çizginin rengini alır (desteklenmezse koyu varsayılana düşer).
    const marker = dugumOlustur(
      "marker",
      {
        id,
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "6",
        markerHeight: "6",
        orient: "auto-start-reverse",
      },
      [
        dugumOlustur("path", {
          d: "M 0 0 L 10 5 L 0 10 z",
          fill: "context-stroke",
        }),
      ],
    );
    komutlar.push(new DugumEkleKomutu(belge, defs, marker));
    return new BilesikKomut("marker oluştur", komutlar);
  },

  sil(belge, kaynakId): Komut | null {
    const defs = defsBul(belge);
    const marker = markerDugumu(belge, kaynakId);
    if (!defs || !marker || !defs.cocuklar.includes(marker)) return null;
    return new DugumCikarKomutu(belge, defs, marker);
  },
});

/** input[type=color] yalnız #rrggbb kabul eder; context-stroke/-fill ya da boş ise picker varsayılanı. */
function hexNorm(c: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c.trim()) ? c.trim() : "#000000";
}

/** orient için sunulan değerler (mevcut değer listede yoksa select yine de o değerle eşleşir). */
const ORIENT_SECENEKLERI = [
  "auto",
  "auto-start-reverse",
  "0",
  "90",
  "180",
  "270",
];

/**
 * Marker GÖRÜNÜMÜ (önizleme + düzenleyici) — §8.1 deseninin görsel yüzü (İlke 5).
 * Önizleme: bir çizginin ucuna marker'ı koyar; marker `context-stroke` kullandığından
 * çizgi rengi marker'a yansır. Düzenleyici: marker'ın yön/geometri öznitelikleri
 * (orient · markerWidth · markerHeight · refX · refY) ve ilk çocuk şeklin `fill` rengi.
 * Hepsi komutla (İlke 2 → geri-alınabilir); değişince Tuval + önizleme canlı güncellenir (İlke 3).
 */
kaynakGorunumKaydet({
  turId: "marker",
  onizleme: (belge, id) =>
    defsOnizleme(
      belge,
      id,
      `<line x1="3" y1="9" x2="24" y2="9" stroke="#8a93a3" stroke-width="2" marker-end="url(#${id})"/>`,
    ),
  duzenle: ({ belge, kaynakId, komut }) => {
    const marker = markerDugumu(belge, kaynakId);
    if (!marker) return nothing;
    const yaz = (dugum: Dugum, ad: string, deger: string): void =>
      komut(new OznitelikDegistirKomutu(belge, dugum, ad, deger));
    const sayiAlan = (ad: string): TemplateResult =>
      html`<div class="satir">
        <label>${ad}</label>
        <input
          type="number"
          .value=${marker.oznitelikler.get(ad) ?? ""}
          @change=${(e: Event) =>
            yaz(marker, ad, (e.target as HTMLInputElement).value)}
        />
      </div>`;
    const orient = marker.oznitelikler.get("orient") ?? "auto-start-reverse";
    const ilkSekil = marker.cocuklar[0] ?? null;
    const fillHam = ilkSekil?.oznitelikler.get("fill") ?? "";
    return html`
      <div class="satir">
        <label>orient</label>
        <select
          @change=${(e: Event) =>
            yaz(marker, "orient", (e.target as HTMLSelectElement).value)}
        >
          ${ORIENT_SECENEKLERI.map(
            (s) =>
              html`<option value=${s} ?selected=${s === orient}>${s}</option>`,
          )}
        </select>
      </div>
      ${sayiAlan("markerWidth")} ${sayiAlan("markerHeight")} ${sayiAlan("refX")}
      ${sayiAlan("refY")}
      ${ilkSekil
        ? html`<div class="satir">
            <label>fill</label>
            <input
              type="color"
              .value=${hexNorm(fillHam)}
              @change=${(e: Event) =>
                yaz(ilkSekil, "fill", (e.target as HTMLInputElement).value)}
            />
          </div>`
        : nothing}
    `;
  },
});
