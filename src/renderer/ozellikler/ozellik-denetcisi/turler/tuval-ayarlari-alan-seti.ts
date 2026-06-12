import { html, type TemplateResult } from "lit";
import {
  alanSetiKayitDefteri,
  type AlanSeti,
  type AlanSetiBaglami,
} from "./alan-seti-registry";
import { t } from "../../../diller/dil";
import { say } from "../../../tuval/donusum";

/**
 * "Tuval / Belge" alan seti (§9.3) — kök `<svg>` için tuval ayarları: ölçü
 * (`width`/`height`) ve görünüm kutusu (`viewBox`). Denetçi, HİÇBİR ŞEY SEÇİLİ
 * DEĞİLKEN belgenin kökünü bu setle gösterir (kullanıcı isteği: seçim yokken tuval
 * ayarları). Tüm yazımlar komutla (İlke 2) → undo/redo, canlı güncelleme (İlke 3).
 */

/** Sayısal giriş (boş/geçersiz → eski değer; alanı geri yaz). */
function sayiAlan(
  etiket: string,
  mevcut: string,
  uygula: (n: number) => void,
): TemplateResult {
  return html`
    <label>${etiket}</label>
    <input
      type="number"
      step="any"
      .value=${mevcut}
      @change=${(olay: Event) => {
        const el = olay.target as HTMLInputElement;
        const n = Number(el.value.trim());
        if (el.value.trim() === "" || !Number.isFinite(n)) {
          el.value = mevcut;
          return;
        }
        uygula(n);
      }}
    />
  `;
}

/** Metin giriş (width/height birim içerebilir: `800`, `800px`, `100%`). */
function metinAlan(
  etiket: string,
  mevcut: string,
  uygula: (v: string) => void,
): TemplateResult {
  return html`
    <label>${etiket}</label>
    <input
      type="text"
      .value=${mevcut}
      @change=${(olay: Event) => {
        const el = olay.target as HTMLInputElement;
        const v = el.value.trim();
        if (v === "") {
          el.value = mevcut; // boş → eski değere dön (width/height silinmesin)
          return;
        }
        uygula(v);
      }}
    />
  `;
}

/** `viewBox` ("minX minY w h") → 4 sayı; geçersizse null. */
function viewBoxParcala(
  deger: string | undefined,
): [number, number, number, number] | null {
  if (!deger) return null;
  const p = deger
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
    return [p[0]!, p[1]!, p[2]!, p[3]!];
  }
  return null;
}

function tuvalBolumu(baglam: AlanSetiBaglami): TemplateResult {
  const { dugum, yaz } = baglam;
  const oz = dugum.oznitelikler;
  const vb = viewBoxParcala(oz.get("viewBox")) ?? [0, 0, 0, 0];

  // Bir viewBox bileşenini değiştirip tümünü yeniden yaz.
  const vbYaz = (indis: number, n: number): void => {
    const yeni = [...vb] as [number, number, number, number];
    yeni[indis] = n;
    yaz("viewBox", yeni.map((x) => say(x)).join(" "));
  };

  return html`
    <div class="alt-baslik">${t("denetci.altbaslik.olcu")}</div>
    <div class="izgara">
      ${metinAlan(t("denetci.geo.genislik"), oz.get("width") ?? "", (v) =>
        yaz("width", v),
      )}
      ${metinAlan(t("denetci.geo.yukseklik"), oz.get("height") ?? "", (v) =>
        yaz("height", v),
      )}
    </div>
    <div class="alt-baslik">${t("denetci.altbaslik.viewbox")}</div>
    <div class="izgara">
      ${sayiAlan(t("denetci.vb.x"), String(vb[0]), (n) => vbYaz(0, n))}
      ${sayiAlan(t("denetci.vb.y"), String(vb[1]), (n) => vbYaz(1, n))}
      ${sayiAlan(t("denetci.vb.en"), String(vb[2]), (n) => vbYaz(2, n))}
      ${sayiAlan(t("denetci.vb.boy"), String(vb[3]), (n) => vbYaz(3, n))}
    </div>
  `;
}

const tuvalAyarlariAlanSeti: AlanSeti = {
  id: "tuval-ayarlari",
  baslikAnahtari: "denetci.grup.tuval",
  sira: -10, // belge görünümünde en üstte
  uygunMu: (dugum) => dugum.etiket === "svg",
  render: (baglam) => tuvalBolumu(baglam),
};

alanSetiKayitDefteri.kaydet(tuvalAyarlariAlanSeti);
