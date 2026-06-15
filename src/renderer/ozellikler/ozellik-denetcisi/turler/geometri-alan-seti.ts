import { html, svg, type TemplateResult } from "lit";
import {
  alanSetiKayitDefteri,
  type AlanSeti,
  type AlanSetiBaglami,
} from "./alan-seti-registry";
import { konumAlanlari, konumOku } from "../../../../cekirdek/belge/konum";
import { OznitelikDegistirKomutu } from "../../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { BilesikKomut } from "../../../../cekirdek/komutlar/dugum-komutlari";
import { t } from "../../../diller/dil";
import { cizimErisimi } from "../../../tuval/cizim-erisimi";
import { oranKilidi } from "../../../tuval/oran-kilidi";
import {
  say,
  ekranDeltaKullanici,
  donusumAyristir,
  donusumKur,
  type DonusumParcalari,
} from "../../../tuval/donusum";

/** Kapalı asma kilit (köşeler bağlı). */
const KILIT_KAPALI = svg`<svg viewBox="0 0 16 16" width="13" height="13">
  <path d="M5 7.5 V5 a3 3 0 0 1 6 0 V7.5" fill="none" stroke="currentColor" stroke-width="1.4" />
  <rect x="3.3" y="7.3" width="9.4" height="6.4" rx="1.4" fill="currentColor" />
</svg>`;

/** Açık asma kilit (köşeler bağımsız). */
const KILIT_ACIK = svg`<svg viewBox="0 0 16 16" width="13" height="13">
  <path d="M5 7.5 V4.5 a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.4" />
  <rect x="3.3" y="7.3" width="9.4" height="6.4" rx="1.4" fill="currentColor" />
</svg>`;

/** Boyut/uçlar bölümü olan temel şekiller. */
const SEKILLER = new Set(["rect", "circle", "ellipse", "line"]);
/** Doğal width/height'ı olmayan; görsel sınır kutusundan boyutlanan şekiller. */
const YOL_SEKILLERI = new Set(["path", "polyline", "polygon"]);
const EPS = 1e-6;

/**
 * Köşelerin (rect rx/ry) bağlı olup olmadığı — oturum tercihi (görünüm durumu,
 * undo'ya girmez). Bağlıyken tek değer ikisini de yazar; bağımsızken ayrı ayrı.
 */
let koselerBagli = true;

/**
 * Dönüşüm ölçeği (sx/sy) oranlı mı — oturum tercihi (görünüm durumu, undo'ya
 * girmez). Boyut oranından (oranKilidi) BAĞIMSIZDIR: kullanıcı biri oranlı diğeri
 * serbest olsun isteyebilir (kullanıcı isteği). Açıkken sx/sy oranı korunur.
 */
let olcekBagli = false;

/**
 * Konum giriş modu (görünüm durumu, undo'ya girmez). false → x/y (canlı konum),
 * true → tx/ty (baseline'a göre öte). Tek çift giriş; checkbox ile dönüşür
 * (kullanıcı isteği: x/y ve tx/ty için ayrı kutular YOK).
 */
let konumOteModu = false;

/**
 * Referans (ankraj) noktası — ölçeklemenin SABİT kalacağı bbox noktası (kesir:
 * 0=sol/üst, 0.5=merkez, 1=sağ/alt). Illustrator'ın 3×3 proxy'si. Görünüm durumu
 * (undo'ya girmez). Varsayılan merkez. Şimdilik path/grup W/H ölçeğine bağlı.
 */
let refNoktaH = 0.5;
let refNoktaV = 0.5;

/** 3×3 referans-noktası seçici (proxy). Tıkla → ölçek pivotu o nokta olur. */
function referansProxy(baglam: AlanSetiBaglami): TemplateResult {
  const oranlar = [0, 0.5, 1] as const;
  return html`
    <div class="ref-satir">
      <div
        class="ref-proxy"
        role="group"
        aria-label=${t("denetci.refNokta")}
        title=${t("denetci.refNokta")}
      >
        ${oranlar.flatMap((v) =>
          oranlar.map(
            (hx) => html`<button
              type="button"
              class="ref-nokta ${refNoktaH === hx && refNoktaV === v
                ? "sec"
                : ""}"
              @click=${() => {
                refNoktaH = hx;
                refNoktaV = v;
                baglam.tazele();
              }}
            ></button>`,
          ),
        )}
      </div>
      <span class="eti">${t("denetci.refNokta")}</span>
    </div>
  `;
}

/**
 * Bir girişi sayıya çözer. Düz sayı YA DA Illustrator-tarzı MATEMATİK ifadesi
 * (`+ - * /` ve parantez; örn. `200/3`, `12*1.5`, `(4+2)*10`). Güvenlik: yalnız
 * sayı/işleç/parantez/nokta/boşluk karakterlerine izin → kod enjeksiyonu yok.
 * Geçersizse null.
 */
function sayiCoz(ham: string): number | null {
  const s = ham.trim();
  if (s === "") return null;
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  // Yalnız + - * / (ve parantez); `**` (üs) sözleşme dışı → reddet (yazım hatası
  // sessizce üs almasın, eski değere dönsün).
  if (/^[-+*/().\d\s]+$/.test(s) && !/\*\*/.test(s)) {
    try {
      const v = Function(`"use strict";return (${s})`)() as unknown;
      if (typeof v === "number" && Number.isFinite(v)) return v;
    } catch {
      /* geçersiz ifade */
    }
  }
  return null;
}

/** Sayısal giriş change: boş/geçersiz YAZILMAZ (eski değere döner); matematik kabul. */
function sayiDegisti(
  mevcut: string,
  uygula: (n: number) => void,
): (olay: Event) => void {
  return (olay) => {
    const el = olay.target as HTMLInputElement;
    const n = sayiCoz(el.value);
    if (n === null) {
      el.value = mevcut; // null/boş/geçersiz giriş engeli
      return;
    }
    uygula(n);
  };
}

/**
 * Sayısal giriş kutusu (metin) — matematik ifadesi + ok-tuşu adımı (Illustrator):
 * ↑/↓ ±1, Shift ±10, Alt ±0.1. `type=text` çünkü `number` `*`/`/` kabul etmez.
 */
function sayiGiris(
  mevcut: string,
  uygula: (n: number) => void,
  saltOkunur = false,
): TemplateResult {
  const tus = (e: KeyboardEvent): void => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const taban =
      sayiCoz((e.target as HTMLInputElement).value) ?? (Number(mevcut) || 0);
    const adim = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    uygula(say(taban + (e.key === "ArrowUp" ? adim : -adim)));
  };
  return html`
    <input
      type="text"
      inputmode="decimal"
      .value=${mevcut}
      ?disabled=${saltOkunur}
      @change=${sayiDegisti(mevcut, uygula)}
      @keydown=${tus}
    />
  `;
}

/** Tek bir sayısal alan (etiket + giriş). */
function alan(
  etiket: string,
  mevcut: string,
  uygula: (n: number) => void,
  saltOkunur = false,
): TemplateResult {
  return html` <label>${etiket}</label>
    ${sayiGiris(mevcut, uygula, saltOkunur)}`;
}

/** Küçük inline oran/bağ kilidi düğmesi (etiketli satıra değil, kutuların yanına). */
function kilitDugmesi(
  kilitli: boolean,
  degistir: () => void,
  baslikAcik: string,
  baslikKapali: string,
): TemplateResult {
  return html`
    <button
      type="button"
      class="kilit kucuk"
      aria-pressed=${kilitli}
      title=${kilitli ? baslikAcik : baslikKapali}
      @click=${degistir}
    >
      ${kilitli ? KILIT_KAPALI : KILIT_ACIK}
    </button>
  `;
}

// Çevir (flip) ikonları: kesik ayna ekseni + iki yöne üçgen.
const IK_CEVIR_YATAY = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M8 2v12" stroke-dasharray="1.6 1.6"/><path d="M6 5 3 8l3 3z" fill="currentColor" stroke="none"/><path d="M10 5l3 3-3 3z" fill="currentColor" stroke="none"/></svg>`;
const IK_CEVIR_DIKEY = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M2 8h12" stroke-dasharray="1.6 1.6"/><path d="M5 6 8 3l3 3z" fill="currentColor" stroke="none"/><path d="M5 10l3 3 3-3z" fill="currentColor" stroke="none"/></svg>`;

/**
 * Nesneyi görsel sınır kutusu MERKEZİ etrafında çevirir (yansıtır): transform'un
 * başına `translate(c) scale(±1) translate(-c)` ekler — tek Command (İlke 2). yatay=
 * dikey eksen etrafında (sol↔sağ), değilse yatay eksen (üst↔alt).
 */
function cevir(
  baglam: AlanSetiBaglami,
  el: SVGGraphicsElement,
  yatay: boolean,
): void {
  let bbox: DOMRect;
  try {
    bbox = el.getBBox();
  } catch {
    return;
  }
  const m = el.transform.baseVal.consolidate()?.matrix ?? new DOMMatrix();
  const c = new DOMPoint(
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height / 2,
  ).matrixTransform(m);
  const sx = yatay ? -1 : 1;
  const sy = yatay ? 1 : -1;
  const eskiT = baglam.dugum.oznitelikler.get("transform") ?? "";
  const T = `translate(${say(c.x)}, ${say(c.y)}) scale(${sx}, ${sy}) translate(${say(-c.x)}, ${say(-c.y)})`;
  baglam.yaz("transform", `${T}${eskiT ? " " + eskiT : ""}`);
}

/** "Çevir" satırı: yatay/dikey flip düğmeleri (Illustrator Transform). */
function cevirSatiri(
  baglam: AlanSetiBaglami,
  el: SVGGraphicsElement,
): TemplateResult {
  return html`
    <div class="cevir-satir">
      <span class="eti">${t("denetci.don.cevir")}</span>
      <button
        type="button"
        class="cevir-dugme"
        title=${t("denetci.don.cevirYatay")}
        aria-label=${t("denetci.don.cevirYatay")}
        @click=${() => cevir(baglam, el, true)}
      >
        ${IK_CEVIR_YATAY}
      </button>
      <button
        type="button"
        class="cevir-dugme"
        title=${t("denetci.don.cevirDikey")}
        aria-label=${t("denetci.don.cevirDikey")}
        @click=${() => cevir(baglam, el, false)}
      >
        ${IK_CEVIR_DIKEY}
      </button>
    </div>
  `;
}

/** İki özniteliği TEK Command'da yazar (oranlı çift için → tek geri-al adımı). */
function ciftYaz(
  baglam: AlanSetiBaglami,
  ad1: string,
  n1: number,
  ad2: string,
  n2: number,
): void {
  baglam.komut(
    new BilesikKomut("oranlı boyut", [
      new OznitelikDegistirKomutu(baglam.belge, baglam.dugum, ad1, String(n1)),
      new OznitelikDegistirKomutu(baglam.belge, baglam.dugum, ad2, String(n2)),
    ]),
  );
}

/**
 * Oranlı çift satırı: `et1 [input] [kilit] et2 [input]` — ayrı "Boyut" başlığı
 * YOK; oran kilidi tam etkilediği kutuların arasında (kullanıcı isteği). Kilit
 * AÇIKKEN biri değişince diğeri orantılı (uyN geri çağırımları o mantığı taşır).
 */
function oranCiftSatiri(
  et1: string,
  mev1: string,
  uy1: (n: number) => void,
  salt1: boolean,
  et2: string,
  mev2: string,
  uy2: (n: number) => void,
  salt2: boolean,
  kilitli: boolean,
  kilitDegistir: () => void,
): TemplateResult {
  return html`
    <div class="oran-cift">
      <label>${et1}</label>
      ${sayiGiris(mev1, uy1, salt1)}
      <label>${et2}</label>
      ${sayiGiris(mev2, uy2, salt2)}
      ${kilitDugmesi(
        kilitli,
        kilitDegistir,
        t("denetci.oranKilidi.acik"),
        t("denetci.oranKilidi.kapali"),
      )}
    </div>
  `;
}

/** Konum bölümü (§9.8): x/y (canlı) · sx/sy (baseline) · tx/ty (ofset). */
function konumBolumu(baglam: AlanSetiBaglami): TemplateResult | "" {
  const { dugum, belge, yaz, tazele } = baglam;
  const alanlar = konumAlanlari(dugum.etiket);
  const pos = konumOku(dugum);
  if (!alanlar || !pos) return "";

  const [xa, ya] = alanlar;
  const temel = belge.temelKonum(dugum) ?? { sx: pos.x, sy: pos.y };
  const tx = pos.x - temel.sx;
  const ty = pos.y - temel.sy;
  const ote = konumOteModu;

  return html`
    <div class="alt-baslik kose">
      <span>${t("denetci.altbaslik.konum")}</span>
      <label class="onay" title=${t("denetci.konum.oteIpucu")}>
        <input
          type="checkbox"
          .checked=${ote}
          @change=${() => {
            konumOteModu = !konumOteModu;
            tazele();
          }}
        />
        ${t("denetci.konum.ote")}
      </label>
    </div>
    <div class="izgara">
      ${ote
        ? html`
            ${alan("tx", String(say(tx)), (n) =>
              yaz(xa, String(say(temel.sx + n))),
            )}
            ${alan("ty", String(say(ty)), (n) =>
              yaz(ya, String(say(temel.sy + n))),
            )}
          `
        : html`
            ${alan("x", String(pos.x), (n) => yaz(xa, String(n)))}
            ${alan("y", String(pos.y), (n) => yaz(ya, String(n)))}
          `}
    </div>
  `;
}

/** rect: width/height (oranlı kilit) + bağlı/bağımsız köşe yarıçapı (rx/ry). */
function dikdortgenBolumu(baglam: AlanSetiBaglami): TemplateResult {
  const { dugum, yaz, tazele } = baglam;
  const oz = dugum.oznitelikler;

  const wHam = oz.get("width") ?? "0";
  const hHam = oz.get("height") ?? "0";
  const wv = Number(wHam);
  const hv = Number(hHam);
  const kil = oranKilidi.acik;
  const uyW = (n: number): void =>
    kil && wv > 0 && hv > 0
      ? ciftYaz(baglam, "width", n, "height", say((hv * n) / wv))
      : yaz("width", String(n));
  const uyH = (n: number): void =>
    kil && wv > 0 && hv > 0
      ? ciftYaz(baglam, "height", n, "width", say((wv * n) / hv))
      : yaz("height", String(n));

  // §SVG: rx yoksa ry'ye, ry yoksa rx'e eşittir → etkin değeri göster.
  const rxHam = oz.get("rx");
  const ryHam = oz.get("ry");
  const etkinRx = rxHam ?? ryHam ?? "0";
  const etkinRy = ryHam ?? rxHam ?? "0";

  const koseYaz = (n: number, hangi: "rx" | "ry"): void => {
    if (koselerBagli) {
      yaz("rx", String(n));
      yaz("ry", String(n));
    } else {
      yaz(hangi, String(n));
    }
  };

  return html`
    ${oranCiftSatiri(
      t("denetci.geo.gen"),
      wHam,
      uyW,
      false,
      t("denetci.geo.yuk"),
      hHam,
      uyH,
      false,
      kil,
      () => {
        oranKilidi.degistir();
        tazele();
      },
    )}

    <div class="oran-cift onlu">
      <span class="on">${t("denetci.altbaslik.kose")}</span>
      <label>rx</label>
      ${sayiGiris(etkinRx, (n) => koseYaz(n, "rx"))}
      <label>ry</label>
      ${sayiGiris(etkinRy, (n) => koseYaz(n, "ry"))}
      ${kilitDugmesi(
        koselerBagli,
        () => {
          koselerBagli = !koselerBagli;
          tazele();
        },
        t("denetci.kose.bagli"),
        t("denetci.kose.bagimsiz"),
      )}
    </div>
  `;
}

/**
 * GRUP (`g`) ve doğal x/y/width/height'ı OLMAYAN şekiller (path/polyline/polygon):
 * konum ve boyut **görsel sınır kutusundan** (getBBox × eleman transform'u) ebeveyn
 * uzayında hesaplanır. Düzenleme, transform'un BAŞINA (parent uzayı) bir öteleme
 * (konum) ya da sol-üst etrafında **ölçek** (boyut) ekler — tek Command. Grupta
 * ölçek çocukları ORANSAL büyütür/küçültür (kullanıcı isteği). 0 olan boyut
 * salt-okunur; bir değeri olan boyut 0/negatif yapılamaz. (Döndürülmüş elemanlarda
 * boyut, eksen-hizalı sınır kutusu üzerinden çalışır — yaklaşık.)
 */
function donusumGeometriBolumu(baglam: AlanSetiBaglami): TemplateResult | "" {
  const { dugum, yaz, tazele } = baglam;
  const el = cizimErisimi.eleman(dugum.kimlik);
  if (!(el instanceof SVGGraphicsElement)) return "";
  let bbox: DOMRect;
  try {
    bbox = el.getBBox();
  } catch {
    return "";
  }
  const koseler = [
    [bbox.x, bbox.y],
    [bbox.x + bbox.width, bbox.y],
    [bbox.x + bbox.width, bbox.y + bbox.height],
    [bbox.x, bbox.y + bbox.height],
  ] as const;
  const enKucukEnBuyuk = (
    pts: DOMPoint[],
  ): { minX: number; minY: number; w: number; h: number } => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { minX, minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
  };

  // EBEVEYN uzayı (düzenleme transform'larının uygulandığı yer): elemanın KENDİ
  // transform'u. Ölçek pivotu burada (minXp, minYp).
  const m = el.transform.baseVal.consolidate()?.matrix ?? new DOMMatrix();
  const p = enKucukEnBuyuk(
    koseler.map(([x, y]) => new DOMPoint(x, y).matrixTransform(m)),
  );

  // KÖK (viewBox) uzayı — CETVELLE AYNI; GÖSTERİM ve hedef-deltalar burada
  // (kullanıcı isteği: denetçideki konum cetvelle eşleşsin, grup içindeyken bile).
  const kok = el.ownerSVGElement;
  const elScreen = el.getScreenCTM();
  const rootScreen = kok?.getScreenCTM?.() ?? null;
  const ebeveynEl = el.parentNode;
  const parentScreen =
    (ebeveynEl instanceof SVGGraphicsElement
      ? ebeveynEl.getScreenCTM?.()
      : null) ?? rootScreen;
  const localToRoot =
    rootScreen && elScreen
      ? rootScreen.inverse().multiply(elScreen)
      : new DOMMatrix();
  const parentToRoot =
    rootScreen && parentScreen
      ? rootScreen.inverse().multiply(parentScreen)
      : new DOMMatrix();
  const { minX, minY, w, h } = enKucukEnBuyuk(
    koseler.map(([x, y]) => new DOMPoint(x, y).matrixTransform(localToRoot)),
  );
  const eskiT = dugum.oznitelikler.get("transform") ?? "";

  const onEkle = (T: string): void =>
    yaz("transform", `${T}${eskiT ? " " + eskiT : ""}`);

  const tasi = (eksen: "x" | "y", hedef: number): void => {
    // Kök-uzayı hedef → ebeveyn-uzayı translate (ebeveyn ölçek/öteleme hesaba katılır).
    const drx = eksen === "x" ? hedef - minX : 0;
    const dry = eksen === "y" ? hedef - minY : 0;
    const pd = ekranDeltaKullanici(parentToRoot, drx, dry);
    if (Math.abs(pd.x) < EPS && Math.abs(pd.y) < EPS) {
      tazele();
      return;
    }
    onEkle(`translate(${say(pd.x)}, ${say(pd.y)})`);
  };
  const olcekle = (eksen: "w" | "h", hedef: number): void => {
    const mevcut = eksen === "w" ? w : h; // kök-uzayı boyut (oran için)
    if (hedef <= 0 || mevcut <= EPS) {
      tazele(); // 0/negatif yasak (ya da 0 boyut) → alanı eski değerine döndür
      return;
    }
    const s = hedef / mevcut;
    // Ölçek pivotu EBEVEYN-uzayı REFERANS NOKTASI (3×3 proxy) — transform orada uygulanır.
    const px = p.minX + p.w * refNoktaH;
    const py = p.minY + p.h * refNoktaV;
    if (oranKilidi.acik) {
      onEkle(
        `translate(${say(px)}, ${say(py)}) scale(${say(s)}, ${say(s)}) translate(${say(-px)}, ${say(-py)})`,
      );
      return;
    }
    onEkle(
      eksen === "w"
        ? `translate(${say(px)}, ${say(py)}) scale(${say(s)}, 1) translate(${say(-px)}, ${say(-py)})`
        : `translate(${say(px)}, ${say(py)}) scale(1, ${say(s)}) translate(${say(-px)}, ${say(-py)})`,
    );
  };
  const kil = oranKilidi.acik;

  return html`
    <div class="alt-baslik">${t("denetci.altbaslik.konum")}</div>
    <div class="izgara">
      ${alan("x", String(say(minX)), (n) => tasi("x", n))}
      ${alan("y", String(say(minY)), (n) => tasi("y", n))}
    </div>
    ${referansProxy(baglam)}
    ${oranCiftSatiri(
      t("denetci.geo.gen"),
      String(say(w)),
      (n) => olcekle("w", n),
      w <= EPS,
      t("denetci.geo.yuk"),
      String(say(h)),
      (n) => olcekle("h", n),
      h <= EPS,
      kil,
      () => {
        oranKilidi.degistir();
        tazele();
      },
    )}
    ${cevirSatiri(baglam, el)}
  `;
}

/**
 * DÖNÜŞÜM bölümü — seçili nesnenin `transform`'unu öteleme/ölçek/döndürme/eğme
 * olarak AYRIŞTIRIP düzenlenebilir alanlarda gösterir (kullanıcı isteği: transform'a
 * tam denetim). Tuval'in boyutlandırma tutamaçları jenerik olduğundan bir rect bile
 * `scale(...)` transform'u alır (width/height değişmez); burası o transform'u görünür
 * ve düzenlenebilir kılar. Her notasyon (matrix/translate/rotate/scale/skew, zincirli)
 * render edilen elemanın konsolide matrisinden okunur → "farklı tanımlama" boşluğu yok.
 * Bir alan değişince bileşenler yeniden birleştirilip tek `transform` olarak yazılır.
 */
/** Ölçek değeri 0/sıfıra çok yakın olamaz — scale(0) tersinmez matris → eleman çöker. */
const MIN_OLCEK = 1e-3;

function donusumBolumu(baglam: AlanSetiBaglami): TemplateResult | "" {
  const { dugum, belge, yaz, tazele } = baglam;
  const el = cizimErisimi.eleman(dugum.kimlik);
  if (!(el instanceof SVGGraphicsElement)) return "";
  const m = el.transform.baseVal.consolidate()?.matrix ?? new DOMMatrix();
  const p = donusumAyristir(m);

  // Bir bileşeni değiştirip tümünü yeniden birleştirerek tek transform yaz; sonuç
  // identity ise transform özniteliğini SİL (boş bırakma → dışa aktarımda gürültü yok).
  const yazP = (degisiklik: Partial<DonusumParcalari>): void => {
    const dize = donusumKur({ ...p, ...degisiklik });
    if (dize === "") {
      if (dugum.oznitelikler.has("transform")) {
        baglam.komut(
          new OznitelikDegistirKomutu(belge, dugum, "transform", null),
        );
      } else {
        tazele();
      }
    } else {
      yaz("transform", dize);
    }
  };
  // Ölçek alanı: 0/çok küçük değer eleman'ı çökertir → reddet (eski değere dön).
  // Oran kilidi (olcekBagli) AÇIKSA biri değişince diğeri sx/sy oranını korur.
  const olcekYaz = (eksen: "sx" | "sy", n: number): void => {
    if (Math.abs(n) < MIN_OLCEK) {
      tazele();
      return;
    }
    if (olcekBagli) {
      const bu = eksen === "sx" ? p.sx : p.sy;
      const diger = eksen === "sx" ? p.sy : p.sx;
      const digerAd = eksen === "sx" ? "sy" : "sx";
      if (Math.abs(bu) > MIN_OLCEK) {
        yazP({ [eksen]: n, [digerAd]: say((diger * n) / bu) });
        return;
      }
    }
    yazP({ [eksen]: n });
  };

  return html`
    <div class="alt-baslik">${t("denetci.altbaslik.donusum")}</div>
    <div class="izgara">
      ${alan(t("denetci.don.tx"), String(say(p.tx)), (n) => yazP({ tx: n }))}
      ${alan(t("denetci.don.ty"), String(say(p.ty)), (n) => yazP({ ty: n }))}
      ${alan(t("denetci.don.donme"), String(say(p.donme)), (n) =>
        yazP({ donme: n }),
      )}
      ${alan(t("denetci.don.egme"), String(say(p.egme)), (n) =>
        yazP({ egme: n }),
      )}
    </div>
    ${oranCiftSatiri(
      t("denetci.don.sx"),
      String(say(p.sx)),
      (n) => olcekYaz("sx", n),
      false,
      t("denetci.don.sy"),
      String(say(p.sy)),
      (n) => olcekYaz("sy", n),
      false,
      olcekBagli,
      () => {
        olcekBagli = !olcekBagli;
        tazele();
      },
    )}
    ${cevirSatiri(baglam, el)}
  `;
}

/** Türe göre boyut bölümü (doğal x/y/width'i olan şekiller). */
function boyutBolumu(baglam: AlanSetiBaglami): TemplateResult | "" {
  const { dugum, yaz } = baglam;
  const oz = dugum.oznitelikler;

  switch (dugum.etiket) {
    case "rect":
      return dikdortgenBolumu(baglam);
    case "circle":
      return html`
        <div class="izgara">
          ${alan(t("denetci.geo.yaricap"), oz.get("r") ?? "0", (n) =>
            yaz("r", String(n)),
          )}
        </div>
      `;
    case "ellipse": {
      // ellipse'te rx/ry yarıçaptır (köşe değil); oran kilidiyle orantılı tutulabilir.
      const rxHam = oz.get("rx") ?? "0";
      const ryHam = oz.get("ry") ?? "0";
      const rxv = Number(rxHam);
      const ryv = Number(ryHam);
      const kil = oranKilidi.acik;
      const uyRx = (n: number): void =>
        kil && rxv > 0 && ryv > 0
          ? ciftYaz(baglam, "rx", n, "ry", say((ryv * n) / rxv))
          : yaz("rx", String(n));
      const uyRy = (n: number): void =>
        kil && rxv > 0 && ryv > 0
          ? ciftYaz(baglam, "ry", n, "rx", say((rxv * n) / ryv))
          : yaz("ry", String(n));
      return oranCiftSatiri(
        "rx",
        rxHam,
        uyRx,
        false,
        "ry",
        ryHam,
        uyRy,
        false,
        kil,
        () => {
          oranKilidi.degistir();
          baglam.tazele();
        },
      );
    }
    case "line":
      return html`
        <div class="alt-baslik">${t("denetci.altbaslik.uclar")}</div>
        <div class="izgara">
          ${alan("x1", oz.get("x1") ?? "0", (n) => yaz("x1", String(n)))}
          ${alan("y1", oz.get("y1") ?? "0", (n) => yaz("y1", String(n)))}
          ${alan("x2", oz.get("x2") ?? "0", (n) => yaz("x2", String(n)))}
          ${alan("y2", oz.get("y2") ?? "0", (n) => yaz("y2", String(n)))}
        </div>
      `;
    default:
      return "";
  }
}

/**
 * "Geometri" alan seti — seçili şeklin TÜRÜNE göre konum + boyut alanları
 * (§9.3, §9.8). Tüm yazımlar komutla (İlke 2); boş/null girişe izin verilmez.
 */
const geometriAlanSeti: AlanSeti = {
  id: "geometri",
  baslikAnahtari: "denetci.grup.geometri",
  sira: 5,
  // Grup, konumu olan (text/image/use dâhil) ya da boyutu olan tüm nesneler.
  uygunMu: (dugum) =>
    dugum.etiket === "g" ||
    konumAlanlari(dugum.etiket) !== null ||
    SEKILLER.has(dugum.etiket) ||
    YOL_SEKILLERI.has(dugum.etiket),
  // Grup ve doğal x/y'si olmayan şekiller (path/poly): transform-tabanlı konum+boyut
  // (x/y/w/h zaten transform'a PREPEND eder → ayrı matris-replace DÖNÜŞÜM editörü
  // çelişir, gösterilmez). Native şekiller: konum+boyut ÖZNİTELİK uzayında, transform
  // ondan BAĞIMSIZ → ayrıştırılmış DÖNÜŞÜM editörü eklenir (kullanıcı isteği: transforma
  // tam denetim; rect resize'ının ürettiği scale buradan görülüp düzenlenir).
  render: (baglam) =>
    baglam.dugum.etiket === "g" || YOL_SEKILLERI.has(baglam.dugum.etiket)
      ? html`${donusumGeometriBolumu(baglam)}`
      : html`${konumBolumu(baglam)}${boyutBolumu(baglam)}${donusumBolumu(
          baglam,
        )}`,
};

alanSetiKayitDefteri.kaydet(geometriAlanSeti);
