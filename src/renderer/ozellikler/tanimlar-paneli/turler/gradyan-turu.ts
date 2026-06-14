import { defsBul } from "../../../../cekirdek/belge/defs";
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
import { t } from "../../../diller/dil";

/** input[type=color] yalnız #rrggbb kabul eder; değilse picker için varsayılan. */
function hexNorm(c: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c.trim()) ? c.trim() : "#000000";
}

/** Doğrusal gradyanın yönü → derece (x1,y1→x2,y2 vektörünün açısı; 0° = soldan sağa). */
function gradyanAci(grad: Dugum): number {
  const s = (ad: string, v: number) =>
    parseFloat(grad.oznitelikler.get(ad) ?? String(v)) || 0;
  const dx = s("x2", 1) - s("x1", 0);
  const dy = s("y2", 0) - s("y1", 0);
  return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
}

/**
 * Açıyı (derece) x1/y1/x2/y2'ye yazar — tek geri-al adımı. `gradientUnits`'e
 * duyarlı (İlke 8, tam sadakat):
 *  - **objectBoundingBox** (varsayılan): kutuyu tam kaplayacak şekilde, merkez
 *    (0.5,0.5) üzerinden 0–1 koordinatları yazılır (gradyanın doğal UX'i).
 *  - **userSpaceOnUse**: mevcut MERKEZ ve UZUNLUK korunur, vektör yalnız döndürülür
 *    — içe aktarılan kullanıcı-uzayı gradyanları 0–1'e ezilmez.
 */
function gradyanAciYaz(belge: Belge, grad: Dugum, derece: number): Komut {
  const r = (derece * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const y = (n: number) => String(Math.round(n * 1000) / 1000);
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  if (grad.oznitelikler.get("gradientUnits") === "userSpaceOnUse") {
    const oku = (ad: string, v: number) =>
      parseFloat(grad.oznitelikler.get(ad) ?? String(v)) || 0;
    const ox1 = oku("x1", 0);
    const oy1 = oku("y1", 0);
    const ox2 = oku("x2", 0);
    const oy2 = oku("y2", 0);
    const cx = (ox1 + ox2) / 2;
    const cy = (oy1 + oy2) / 2;
    const yari = (Math.hypot(ox2 - ox1, oy2 - oy1) || 1) / 2; // mevcut uzunluğu koru
    x1 = cx - yari * cos;
    y1 = cy - yari * sin;
    x2 = cx + yari * cos;
    y2 = cy + yari * sin;
  } else {
    x1 = 0.5 - cos / 2;
    y1 = 0.5 - sin / 2;
    x2 = 0.5 + cos / 2;
    y2 = 0.5 + sin / 2;
  }
  return new BilesikKomut("gradyan yönü", [
    new OznitelikDegistirKomutu(belge, grad, "x1", y(x1)),
    new OznitelikDegistirKomutu(belge, grad, "y1", y(y1)),
    new OznitelikDegistirKomutu(belge, grad, "x2", y(x2)),
    new OznitelikDegistirKomutu(belge, grad, "y2", y(y2)),
  ]);
}

/**
 * Gradyan kaynak türü (AGENTS.md Faz D, §8.1, §10.5) — `linearGradient` /
 * `radialGradient`'leri listeler, seçili şekillere **yeniden uygular**
 * (`fill="url(#id)"`), yeni gradyan oluşturur, siler. Boya seçicideki (TK-6)
 * gradyan ÜRETİMİNİ tamamlar: burada amaç var olanı tekrar kullanmaktır (§8 deseni).
 */
const GRADYAN = new Set(["linearGradient", "radialGradient"]);

function gradyanDugumu(belge: Belge, id: string): Dugum | null {
  for (const d of gez(belge.kok)) {
    if (GRADYAN.has(d.etiket) && d.oznitelikler.get("id") === id) return d;
  }
  return null;
}

kaynakTuruKayitDefteri.kaydet({
  id: "gradyan",
  etiket: "Gradyanlar",

  listele(belge) {
    const ogeler: { id: string; etiket: string }[] = [];
    for (const d of gez(belge.kok)) {
      const id = d.oznitelikler.get("id");
      if (GRADYAN.has(d.etiket) && id) {
        ogeler.push({
          id,
          etiket: `${id} (${d.etiket === "radialGradient" ? "radyal" : "doğrusal"})`,
        });
      }
    }
    return ogeler;
  },

  uygula(belge, dugumler, kaynakId): Komut | null {
    if (dugumler.length === 0) return null;
    return new BilesikKomut(
      "gradyan uygula",
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
    const id = benzersizId(belge.kok, "svgtron-gradyan-");
    const gradyan = dugumOlustur("linearGradient", { id }, [
      dugumOlustur("stop", { offset: "0", "stop-color": "#4a90e2" }),
      dugumOlustur("stop", { offset: "1", "stop-color": "#9013fe" }),
    ]);
    komutlar.push(new DugumEkleKomutu(belge, defs, gradyan));
    return new BilesikKomut("gradyan oluştur", komutlar);
  },

  sil(belge, kaynakId): Komut | null {
    const defs = defsBul(belge);
    const gradyan = gradyanDugumu(belge, kaynakId);
    if (!defs || !gradyan || !defs.cocuklar.includes(gradyan)) return null;
    return new DugumCikarKomutu(belge, defs, gradyan);
  },
});

/**
 * Gradyan GÖRÜNÜMÜ (önizleme + düzenleyici) — referans uygulama (§8.3: deseni bir
 * türle uçtan uca kanıtla). Önizleme: url(#id) ile dolu küçük bir kare. Düzenleyici:
 * her durağın rengi (color picker) + ofseti (0–1); durak ekle/çıkar. Hepsi komutla
 * (İlke 2 → geri-alınabilir); değişince Tuval + önizleme canlı güncellenir (İlke 3).
 */
kaynakGorunumKaydet({
  turId: "gradyan",
  onizleme: (belge, id) =>
    defsOnizleme(
      belge,
      id,
      `<rect width="30" height="18" fill="url(#${id})"/>`,
    ),
  duzenle: ({ belge, kaynakId, komut }) => {
    const grad = gradyanDugumu(belge, kaynakId);
    if (!grad) return nothing;
    const duraklar = grad.cocuklar.filter((c) => c.etiket === "stop");
    const yaz = (durak: Dugum, ad: string, deger: string): void =>
      komut(new OznitelikDegistirKomutu(belge, durak, ad, deger));
    const durakEkle = (): void =>
      komut(
        new DugumEkleKomutu(
          belge,
          grad,
          dugumOlustur("stop", { offset: "1", "stop-color": "#000000" }),
        ),
      );
    return html`
      ${grad.etiket === "linearGradient"
        ? html`<div class="satir">
            <label>${t("boya.aci")}</label>
            <input
              type="number"
              step="15"
              .value=${String(gradyanAci(grad))}
              @change=${(e: Event) =>
                komut(
                  gradyanAciYaz(
                    belge,
                    grad,
                    Number((e.target as HTMLInputElement).value) || 0,
                  ),
                )}
            />
          </div>`
        : ""}
      ${duraklar.map(
        (durak) =>
          html`<div class="satir">
            <input
              type="color"
              .value=${hexNorm(
                durak.oznitelikler.get("stop-color") ?? "#000000",
              )}
              @change=${(e: Event) =>
                yaz(durak, "stop-color", (e.target as HTMLInputElement).value)}
            />
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              .value=${durak.oznitelikler.get("offset") ?? "0"}
              @change=${(e: Event) =>
                yaz(durak, "offset", (e.target as HTMLInputElement).value)}
            />
            ${duraklar.length > 2
              ? html`<button
                  class="kucuk-sil"
                  title=${t("tanimlar.sil")}
                  @click=${() =>
                    komut(new DugumCikarKomutu(belge, grad, durak))}
                >
                  ✕
                </button>`
              : ""}
          </div>`,
      )}
      <button class="ekle" @click=${durakEkle}>
        ${t("tanimlar.durakEkle")}
      </button>
    `;
  },
});
