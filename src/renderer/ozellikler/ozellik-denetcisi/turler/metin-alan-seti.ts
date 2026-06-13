import { html, type TemplateResult } from "lit";
import {
  alanSetiKayitDefteri,
  type AlanSeti,
  type AlanSetiBaglami,
} from "./alan-seti-registry";
import { cizimErisimi } from "../../../tuval/cizim-erisimi";
import { t } from "../../../diller/dil";
import { stilUygulaKomutu } from "../../../boya/stil-uygula";

/** Metin elemanları (gelişmiş metin denetçisi, TK-37 #6). */
const METIN = new Set(["text", "tspan", "textPath"]);

/** Bir CSS özelliğinin efektif değerini okur (hesaplanmış stil → modele düşer). */
function efektif(
  h: CSSStyleDeclaration | null,
  dugum: AlanSetiBaglami["dugum"],
  css: string,
): string {
  return (
    h?.getPropertyValue(css).trim() || dugum.oznitelikler.get(css) || ""
  );
}

/** Etiket + `<select>` alanı (seçenek: [değer, etiket]). */
function secimAlani(
  etiket: string,
  mevcut: string,
  secenekler: readonly (readonly [string, string])[],
  uygula: (deger: string) => void,
): TemplateResult {
  return html`
    <div class="alan">
      <label>${etiket}</label>
      <select
        @change=${(e: Event) => uygula((e.target as HTMLSelectElement).value)}
      >
        ${secenekler.map(
          ([deger, ad]) =>
            html`<option value=${deger} ?selected=${mevcut === deger}>
              ${ad}
            </option>`,
        )}
      </select>
    </div>
  `;
}

/**
 * "Metin" alan seti (TK-37 #6) — seçili `text`/`tspan`/`textPath` için yazı tipi,
 * boyut, ağırlık, stil, hizalama (text-anchor) ve harf aralığı.
 *
 * Okuma EFEKTİFTİR (getComputedStyle; TK-5) → CSS sınıfından gelen değer de doğru
 * görünür. Yazım stil moduna (TK-18) saygılıdır (`stilUygulaKomutu`, İlke 2 → undo).
 * SVG fontları ÜRETİLMEZ (§10.2); yazı tipi WOFF/TTF/OTF/sistem fontu adıdır.
 */
const metinAlanSeti: AlanSeti = {
  id: "metin",
  baslikAnahtari: "denetci.grup.metin",
  sira: 8,
  uygunMu: (dugum) => METIN.has(dugum.etiket),
  render: (baglam) => {
    const { dugum } = baglam;
    const el = cizimErisimi.eleman(dugum.kimlik);
    const h = el ? getComputedStyle(el) : null;
    const yaz = (css: string, deger: string): void =>
      baglam.komut(stilUygulaKomutu(baglam.belge, dugum, css, deger));

    const font = efektif(h, dugum, "font-family");
    const boyut = efektif(h, dugum, "font-size").replace("px", "");
    const agirlik = efektif(h, dugum, "font-weight") || "normal";
    const stil = efektif(h, dugum, "font-style") || "normal";
    const hiza = efektif(h, dugum, "text-anchor") || "start";
    const harf = efektif(h, dugum, "letter-spacing").replace(/px$/, "");

    return html`
      <div class="alan">
        <label>${t("denetci.metin.font")}</label>
        <input
          type="text"
          .value=${font}
          placeholder="sans-serif, 'Inter', …"
          @change=${(e: Event) =>
            yaz("font-family", (e.target as HTMLInputElement).value.trim())}
        />
      </div>

      <div class="alan">
        <label>${t("denetci.metin.boyut")}</label>
        <input
          type="number"
          step="any"
          min="0"
          .value=${boyut}
          @change=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value.trim();
            const n = Number(v);
            if (v === "" || !Number.isFinite(n)) {
              (e.target as HTMLInputElement).value = boyut;
              return;
            }
            yaz("font-size", String(n));
          }}
        />
      </div>

      ${secimAlani(
        t("denetci.metin.agirlik"),
        agirlik === "400" ? "normal" : agirlik === "700" ? "bold" : agirlik,
        [
          ["normal", t("denetci.metin.agirlik.normal")],
          ["bold", t("denetci.metin.agirlik.kalin")],
          ["100", "100"],
          ["300", "300"],
          ["500", "500"],
          ["600", "600"],
          ["800", "800"],
          ["900", "900"],
        ],
        (v) => yaz("font-weight", v),
      )}
      ${secimAlani(
        t("denetci.metin.stil"),
        stil,
        [
          ["normal", t("denetci.metin.stil.normal")],
          ["italic", t("denetci.metin.stil.italik")],
          ["oblique", t("denetci.metin.stil.egik")],
        ],
        (v) => yaz("font-style", v),
      )}
      ${secimAlani(
        t("denetci.metin.hizalama"),
        hiza,
        [
          ["start", t("denetci.metin.hiza.basla")],
          ["middle", t("denetci.metin.hiza.orta")],
          ["end", t("denetci.metin.hiza.son")],
        ],
        (v) => yaz("text-anchor", v),
      )}

      <div class="alan">
        <label>${t("denetci.metin.harfAralik")}</label>
        <input
          type="number"
          step="any"
          .value=${harf === "normal" ? "0" : harf}
          @change=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value.trim();
            const n = Number(v);
            if (v === "" || !Number.isFinite(n)) {
              (e.target as HTMLInputElement).value = harf;
              return;
            }
            yaz("letter-spacing", n === 0 ? "normal" : String(n));
          }}
        />
      </div>
    `;
  },
};

alanSetiKayitDefteri.kaydet(metinAlanSeti);
