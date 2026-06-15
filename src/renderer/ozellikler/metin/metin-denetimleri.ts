import { html, svg, type TemplateResult } from "lit";
import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../cekirdek/belge/belge";
import type { Komut } from "../../../cekirdek/komutlar/komut";
import { cizimErisimi } from "../../tuval/cizim-erisimi";
import { t } from "../../diller/dil";
import { stilUygulaKomutu } from "../../boya/stil-uygula";
import { OznitelikDegistirKomutu } from "../../../cekirdek/komutlar/oznitelik-degistir-komutu";

/** Metin denetimlerinin uygulanabildiği eleman etiketleri. */
export const METIN_ETIKETLERI = new Set(["text", "tspan", "textPath"]);

/** Metin denetimleri için (panel) bağlamı — düğüm + belge + geri-alınabilir komut. */
export interface MetinBaglami {
  readonly dugum: Dugum;
  readonly belge: Belge;
  komut(k: Komut): void;
}

/** Yazı tipi önerileri (datalist; SVG fontu ÜRETİLMEZ §10.2 → sistem/web fontu adı). */
const FONTLAR: readonly string[] = [
  "sans-serif",
  "serif",
  "monospace",
  "system-ui",
  "cursive",
  "Arial",
  "Helvetica",
  "Helvetica Neue",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Segoe UI",
  "Roboto",
  "Inter",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Palatino",
  "Courier New",
  "Consolas",
  "Menlo",
  "Comic Sans MS",
  "Impact",
  "Brush Script MT",
];

/** Yazı tipi önerileri datalist'i (statik → her render'da yeniden üretilmez). */
const FONT_DATALIST = html`<datalist id="metin-font-listesi">
  ${FONTLAR.map((f) => html`<option value=${f}></option>`)}
</datalist>`;

/** Ağırlık seçenekleri (sayısal değer · ad). */
const AGIRLIKLAR: readonly (readonly [string, string])[] = [
  ["100", "Thin 100"],
  ["200", "Extra Light 200"],
  ["300", "Light 300"],
  ["400", "Normal 400"],
  ["500", "Medium 500"],
  ["600", "Semi Bold 600"],
  ["700", "Bold 700"],
  ["800", "Extra Bold 800"],
  ["900", "Black 900"],
];

// —— İkonlar (kompakt, currentColor) ——
const ikonHiza = (cizgiler: readonly (readonly [number, number])[]) =>
  svg`<svg viewBox="0 0 16 16" width="13" height="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
    ${cizgiler.map(
      ([x1, x2], i) =>
        svg`<line x1=${x1} x2=${x2} y1=${3.5 + i * 3} y2=${3.5 + i * 3} />`,
    )}
  </svg>`;
const IK_SOL = ikonHiza([
  [2, 14],
  [2, 10],
  [2, 13],
  [2, 8],
]);
const IK_ORTA = ikonHiza([
  [2, 14],
  [4, 12],
  [3, 13],
  [5, 11],
]);
const IK_SAG = ikonHiza([
  [2, 14],
  [6, 14],
  [3, 14],
  [8, 14],
]);
// Dikey hizalama ikonları: soluk metin kutusu + hizalama çizgisinin yüksekliği.
const ikonDikey = (y: number) =>
  svg`<svg viewBox="0 0 16 16" width="13" height="13" stroke="currentColor" fill="none" stroke-linecap="round"><rect x="3.4" y="3.2" width="9.2" height="9.6" rx="1" stroke-width="1" opacity="0.4" /><line x1="1.5" x2="14.5" y1=${y} y2=${y} stroke-width="1.7" /></svg>`;
const IK_DTABAN = ikonDikey(11);
const IK_DORTA = ikonDikey(8);
const IK_DUST = ikonDikey(3.6);
const IK_DALT = ikonDikey(12.6);
const IK_BOYUT = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.2h7M6 4.2V12" /><path d="M12.4 5.4v5.2M10.9 7l1.5-1.6L13.9 7M10.9 9l1.5 1.6 1.5-1.6" /></svg>`;
const IK_IZLEME = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5 2.5 12M5 3.5 7.5 12M11 3.5 8.5 12M11 3.5 13.5 12" opacity="0.85"/><path d="M1.5 14h13M1.5 14l1.4-1M14.5 14l-1.4-1"/></svg>`;
const IK_KELIME = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v6M14 4v6"/><path d="M5.5 11 7 5.5 8.5 11M6 9h2"/></svg>`;
const IK_TABAN = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h12"/><path d="M5.5 9 7 4l1.5 5M6 7h2"/><path d="M11.5 9.5 13 8l1.5 1.5M13 8v4"/></svg>`;

/** Bir CSS özelliğinin efektif değeri (hesaplanmış stil → modele düşer). */
function efektif(
  h: CSSStyleDeclaration | null,
  dugum: Dugum,
  css: string,
): string {
  return h?.getPropertyValue(css).trim() || dugum.oznitelikler.get(css) || "";
}

/** Sayıya çevirir (px/birim soyar); geçersizse varsayılan. */
function say(deger: string, vars = 0): number {
  const n = parseFloat(deger);
  return Number.isFinite(n) ? n : vars;
}

/** İlk font ailesi (virgül listesinden), tırnaklar soyulmuş. */
function ilkFont(deger: string): string {
  const ilk = deger.split(",")[0]?.trim() ?? "";
  return ilk.replace(/^["']|["']$/g, "");
}

/** Ağırlığı sayısal değere normalize eder (normal→400, bold→700). */
function agirlikNormal(deger: string): string {
  if (deger === "normal" || deger === "") return "400";
  if (deger === "bold") return "700";
  return deger;
}

// —— Küçük UI yapıları ——

/** İkonlu uzunluk/sayı kutusu (ikon + giriş). Boş/geçersiz → eski değere döner. */
function uzunlukAlan(
  ikon: TemplateResult,
  baslik: string,
  mevcut: number,
  uygula: (n: number) => void,
): TemplateResult {
  const m = String(mevcut);
  return html`
    <div class="ikon-alan" title=${baslik}>
      <span class="ikon" aria-hidden="true">${ikon}</span>
      <input
        type="number"
        step="any"
        .value=${m}
        aria-label=${baslik}
        @change=${(e: Event) => {
          const el = e.target as HTMLInputElement;
          const v = el.value.trim();
          const n = Number(v);
          if (v === "" || !Number.isFinite(n)) {
            el.value = m;
            return;
          }
          uygula(n);
        }}
      />
    </div>
  `;
}

interface SegOge {
  readonly deger: string;
  readonly icerik: TemplateResult | string;
  readonly baslik: string;
}

/** Segmentli denetim (tek seçim — hizalama/yön gibi). */
function segli(
  secili: string,
  ogeler: readonly SegOge[],
  uygula: (deger: string) => void,
): TemplateResult {
  return html`
    <div class="seg" role="group">
      ${ogeler.map(
        (o) => html`
          <button
            type="button"
            class=${o.deger === secili ? "sec" : ""}
            aria-pressed=${o.deger === secili}
            title=${o.baslik}
            @click=${() => uygula(o.deger)}
          >
            ${o.icerik}
          </button>
        `,
      )}
    </div>
  `;
}

/** Açma/kapama düğmesi (çoklu — süsleme/küçük-büyük gibi). */
function acmaKapa(
  basili: boolean,
  icerik: TemplateResult | string,
  baslik: string,
  degistir: () => void,
): TemplateResult {
  return html`
    <button
      type="button"
      class="tgl ${basili ? "sec" : ""}"
      aria-pressed=${basili}
      title=${baslik}
      @click=${degistir}
    >
      ${icerik}
    </button>
  `;
}

/**
 * Illustrator düzeyinde KARAKTER + PARAGRAF metin denetimleri (ayrı "Metin"
 * panelinde kullanılır). Okuma EFEKTİFTİR (getComputedStyle; TK-5); yazım stil
 * moduna (TK-18) saygılıdır (`stilUygulaKomutu`, İlke 2 → undo). CSS uzunluklarına
 * BİRİM (px) eklenir (birimsiz CSS geçersizdir); SVG-öznitelik olan `baseline-shift`
 * doğrudan öznitelikle yazılır. SVG fontları üretilmez (§10.2). Hizalama YALNIZ
 * text-anchor (Blink SVG metin sarmayı render etmez → justify sunulmaz, §10).
 */
export function metinDenetimleri(baglam: MetinBaglami): TemplateResult {
  const { dugum, belge } = baglam;
  const el = cizimErisimi.eleman(dugum.kimlik);
  const h = el instanceof Element ? getComputedStyle(el) : null;

  // Yazıcılar: stilYaz → CSS (stil moduna göre inline/sınıf); oznYaz → SVG öznitelik.
  const stilYaz = (css: string, deger: string): void =>
    baglam.komut(stilUygulaKomutu(belge, dugum, css, deger));
  const oznYaz = (ad: string, deger: string | null): void =>
    baglam.komut(new OznitelikDegistirKomutu(belge, dugum, ad, deger));

  // —— Değerleri efektif oku ——
  const font = ilkFont(efektif(h, dugum, "font-family"));
  const agirlik = agirlikNormal(efektif(h, dugum, "font-weight"));
  const italikMi = (efektif(h, dugum, "font-style") || "normal") !== "normal";
  const boyut = say(efektif(h, dugum, "font-size"), 16);
  const izleme = (() => {
    const v = efektif(h, dugum, "letter-spacing");
    return v === "normal" || v === "" ? 0 : say(v);
  })();
  const kelime = (() => {
    const v = efektif(h, dugum, "word-spacing");
    return v === "normal" || v === "" ? 0 : say(v);
  })();
  const tabanHam =
    dugum.oznitelikler.get("baseline-shift") ??
    (h?.getPropertyValue("baseline-shift").trim() || "0");
  const tabanOzel = tabanHam === "sub" || tabanHam === "super";
  const taban = tabanOzel ? 0 : say(tabanHam);
  const buyukKucuk = efektif(h, dugum, "text-transform") || "none";
  const susHam = efektif(h, dugum, "text-decoration-line") || "none";
  const altiCizili = susHam.includes("underline");
  const ustuCizili = susHam.includes("line-through");
  const uzeriCizgi = susHam.includes("overline");
  const kucukBuyuk =
    (efektif(h, dugum, "font-variant-caps") ||
      efektif(h, dugum, "font-variant")) === "small-caps";
  const anchor = efektif(h, dugum, "text-anchor") || "start";
  const dbaseline = efektif(h, dugum, "dominant-baseline") || "auto";

  // —— Süsleme aç/kapa: mevcut kümeyi değiştirip text-decoration-line yaz ——
  const suslemeDegistir = (ad: string, acik: boolean): void => {
    const set = new Set(susHam.split(/\s+/).filter((x) => x && x !== "none"));
    if (acik) set.add(ad);
    else set.delete(ad);
    stilYaz("text-decoration-line", set.size ? [...set].join(" ") : "none");
  };

  // —— Hizalama: SVG metninde hizalamayı YALNIZ text-anchor belirler. Tek yazım → tek undo.
  const hizala = (deger: "start" | "middle" | "end"): void =>
    stilYaz("text-anchor", deger);
  const hizaSecili =
    anchor === "middle" ? "middle" : anchor === "end" ? "end" : "start";

  return html`
    <div class="alt-baslik">${t("denetci.metin.karakter")}</div>
    <div class="metin-bolum">
      <input
        class="font-giris"
        type="text"
        list="metin-font-listesi"
        .value=${font}
        placeholder="sans-serif, 'Inter', …"
        title=${t("denetci.metin.font")}
        aria-label=${t("denetci.metin.font")}
        @change=${(e: Event) =>
          stilYaz("font-family", (e.target as HTMLInputElement).value.trim())}
      />
      ${FONT_DATALIST}

      <div class="metin-satir">
        <select
          class="agirlik-sec"
          title=${t("denetci.metin.agirlik")}
          aria-label=${t("denetci.metin.agirlik")}
          @change=${(e: Event) =>
            stilYaz("font-weight", (e.target as HTMLSelectElement).value)}
        >
          ${AGIRLIKLAR.map(
            ([deg, ad]) =>
              html`<option value=${deg} ?selected=${deg === agirlik}>
                ${ad}
              </option>`,
          )}
        </select>
        ${acmaKapa(
          italikMi,
          html`<span style="font-style:italic">I</span>`,
          t("denetci.metin.stil.italik"),
          () => stilYaz("font-style", italikMi ? "normal" : "italic"),
        )}
      </div>

      <div class="metin-satir iki">
        ${uzunlukAlan(IK_BOYUT, t("denetci.metin.boyut"), boyut, (n) =>
          stilYaz("font-size", `${n}px`),
        )}
        ${uzunlukAlan(IK_IZLEME, t("denetci.metin.izleme"), izleme, (n) =>
          stilYaz("letter-spacing", n === 0 ? "normal" : `${n}px`),
        )}
      </div>

      <div class="metin-satir iki">
        ${uzunlukAlan(IK_KELIME, t("denetci.metin.kelimeAralik"), kelime, (n) =>
          stilYaz("word-spacing", n === 0 ? "normal" : `${n}px`),
        )}
        <div class="taban-grup">
          ${uzunlukAlan(IK_TABAN, t("denetci.metin.tabanKaymasi"), taban, (n) =>
            oznYaz("baseline-shift", n === 0 ? null : String(n)),
          )}
          ${acmaKapa(
            tabanHam === "super",
            html`<span style="font-size:0.7em;vertical-align:super">a</span>`,
            t("denetci.metin.ustIndis"),
            () =>
              oznYaz("baseline-shift", tabanHam === "super" ? null : "super"),
          )}
          ${acmaKapa(
            tabanHam === "sub",
            html`<span style="font-size:0.7em;vertical-align:sub">a</span>`,
            t("denetci.metin.altIndis"),
            () => oznYaz("baseline-shift", tabanHam === "sub" ? null : "sub"),
          )}
        </div>
      </div>

      <div class="metin-satir arasi">
        <span class="metin-eti">${t("denetci.metin.buyukKucuk")}</span>
        ${segli(
          buyukKucuk,
          [
            { deger: "none", icerik: "Aa", baslik: t("denetci.metin.harfNormal") },
            { deger: "uppercase", icerik: "AA", baslik: t("denetci.metin.harfBuyuk") },
            { deger: "lowercase", icerik: "aa", baslik: t("denetci.metin.harfKucuk") },
            { deger: "capitalize", icerik: "Ab", baslik: t("denetci.metin.harfBaslik") },
          ],
          (v) => stilYaz("text-transform", v),
        )}
      </div>

      <div class="metin-satir arasi">
        <span class="metin-eti">${t("denetci.metin.susleme")}</span>
        <div class="tgl-grup">
          ${acmaKapa(
            altiCizili,
            html`<span style="text-decoration:underline">U</span>`,
            t("denetci.metin.altiCizili"),
            () => suslemeDegistir("underline", !altiCizili),
          )}
          ${acmaKapa(
            ustuCizili,
            html`<span style="text-decoration:line-through">S</span>`,
            t("denetci.metin.ustuCizili"),
            () => suslemeDegistir("line-through", !ustuCizili),
          )}
          ${acmaKapa(
            uzeriCizgi,
            html`<span style="text-decoration:overline">O</span>`,
            t("denetci.metin.uzeriCizgi"),
            () => suslemeDegistir("overline", !uzeriCizgi),
          )}
          ${acmaKapa(
            kucukBuyuk,
            html`<span style="font-variant:small-caps">Aa</span>`,
            t("denetci.metin.kucukBuyuk"),
            () => stilYaz("font-variant", kucukBuyuk ? "normal" : "small-caps"),
          )}
        </div>
      </div>
    </div>

    <div class="alt-baslik">${t("denetci.metin.paragraf")}</div>
    <div class="metin-bolum">
      <div class="metin-satir arasi">
        <span class="metin-eti">${t("denetci.metin.hizalama")}</span>
        ${segli(
          hizaSecili,
          [
            { deger: "start", icerik: IK_SOL, baslik: t("denetci.metin.hiza.sol") },
            { deger: "middle", icerik: IK_ORTA, baslik: t("denetci.metin.hiza.orta") },
            { deger: "end", icerik: IK_SAG, baslik: t("denetci.metin.hiza.sag") },
          ],
          (v) => hizala(v as "start" | "middle" | "end"),
        )}
      </div>

      <div class="metin-satir arasi">
        <span class="metin-eti">${t("denetci.metin.dikeyHiza")}</span>
        ${segli(
          dbaseline,
          [
            { deger: "auto", icerik: IK_DTABAN, baslik: t("denetci.metin.dhiza.taban") },
            { deger: "middle", icerik: IK_DORTA, baslik: t("denetci.metin.dhiza.orta") },
            { deger: "hanging", icerik: IK_DUST, baslik: t("denetci.metin.dhiza.ust") },
            { deger: "text-after-edge", icerik: IK_DALT, baslik: t("denetci.metin.dhiza.alt") },
          ],
          (v) => stilYaz("dominant-baseline", v),
        )}
      </div>
    </div>
  `;
}
