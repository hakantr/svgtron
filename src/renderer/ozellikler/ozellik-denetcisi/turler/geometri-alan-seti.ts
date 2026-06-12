import { html, svg, type TemplateResult } from "lit";
import {
  alanSetiKayitDefteri,
  type AlanSeti,
  type AlanSetiBaglami,
} from "./alan-seti-registry";
import { konumAlanlari, konumOku } from "../../../../cekirdek/belge/konum";
import { OznitelikDegistirKomutu } from "../../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { t } from "../../../diller/dil";
import { cizimErisimi } from "../../../tuval/cizim-erisimi";
import {
  say,
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

/** Sayısal giriş: boş/geçersiz değer YAZILMAZ (eski değere döner). */
function sayiDegisti(
  mevcut: string,
  uygula: (n: number) => void,
): (olay: Event) => void {
  return (olay) => {
    const el = olay.target as HTMLInputElement;
    const ham = el.value.trim();
    const n = Number(ham);
    if (ham === "" || !Number.isFinite(n)) {
      el.value = mevcut; // null/boş giriş engeli
      return;
    }
    uygula(n);
  };
}

/** Tek bir sayısal alan (etiket + giriş). */
function alan(
  etiket: string,
  mevcut: string,
  uygula: (n: number) => void,
  saltOkunur = false,
): TemplateResult {
  return html`
    <label>${etiket}</label>
    <input
      type="number"
      step="any"
      .value=${mevcut}
      ?disabled=${saltOkunur}
      @change=${sayiDegisti(mevcut, uygula)}
    />
  `;
}

/** Konum bölümü (§9.8): x/y (canlı) · sx/sy (baseline) · tx/ty (ofset). */
function konumBolumu(baglam: AlanSetiBaglami): TemplateResult | "" {
  const { dugum, belge, yaz } = baglam;
  const alanlar = konumAlanlari(dugum.etiket);
  const pos = konumOku(dugum);
  if (!alanlar || !pos) return "";

  const [xa, ya] = alanlar;
  const temel = belge.temelKonum(dugum) ?? { sx: pos.x, sy: pos.y };
  const tx = pos.x - temel.sx;
  const ty = pos.y - temel.sy;

  return html`
    <div class="alt-baslik">${t("denetci.altbaslik.konum")}</div>
    <div class="izgara">
      ${alan("x", String(pos.x), (n) => yaz(xa, String(n)))}
      ${alan("y", String(pos.y), (n) => yaz(ya, String(n)))}
      ${alan("sx", String(temel.sx), () => {}, true)}
      ${alan("sy", String(temel.sy), () => {}, true)}
      ${alan("tx", String(tx), (n) => yaz(xa, String(temel.sx + n)))}
      ${alan("ty", String(ty), (n) => yaz(ya, String(temel.sy + n)))}
    </div>
  `;
}

/** rect: width/height + bağlı/bağımsız köşe yarıçapı (rx/ry). */
function dikdortgenBolumu(baglam: AlanSetiBaglami): TemplateResult {
  const { dugum, yaz } = baglam;
  const oz = dugum.oznitelikler;

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
    <div class="alt-baslik">${t("denetci.altbaslik.boyut")}</div>
    <div class="izgara">
      ${alan(t("denetci.geo.genislik"), oz.get("width") ?? "0", (n) =>
        yaz("width", String(n)),
      )}
      ${alan(t("denetci.geo.yukseklik"), oz.get("height") ?? "0", (n) =>
        yaz("height", String(n)),
      )}
    </div>

    <div class="alt-baslik kose">
      <span>${t("denetci.altbaslik.kose")}</span>
      <button
        type="button"
        class="kilit"
        aria-pressed=${koselerBagli}
        title=${koselerBagli
          ? t("denetci.kose.bagli")
          : t("denetci.kose.bagimsiz")}
        @click=${() => {
          koselerBagli = !koselerBagli;
          baglam.tazele();
        }}
      >
        ${koselerBagli ? KILIT_KAPALI : KILIT_ACIK}
      </button>
    </div>
    <div class="izgara">
      ${alan("rx", etkinRx, (n) => koseYaz(n, "rx"))}
      ${alan("ry", etkinRy, (n) => koseYaz(n, "ry"))}
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
  const m = el.transform.baseVal.consolidate()?.matrix ?? new DOMMatrix();
  const kose = (
    [
      [bbox.x, bbox.y],
      [bbox.x + bbox.width, bbox.y],
      [bbox.x + bbox.width, bbox.y + bbox.height],
      [bbox.x, bbox.y + bbox.height],
    ] as const
  ).map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
  const xs = kose.map((p) => p.x);
  const ys = kose.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const eskiT = dugum.oznitelikler.get("transform") ?? "";

  const onEkle = (T: string): void =>
    yaz("transform", `${T}${eskiT ? " " + eskiT : ""}`);

  const tasi = (eksen: "x" | "y", hedef: number): void => {
    const dx = eksen === "x" ? hedef - minX : 0;
    const dy = eksen === "y" ? hedef - minY : 0;
    if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) {
      tazele();
      return;
    }
    onEkle(`translate(${say(dx)}, ${say(dy)})`);
  };
  const olcekle = (eksen: "w" | "h", hedef: number): void => {
    const mevcut = eksen === "w" ? w : h;
    if (hedef <= 0 || mevcut <= EPS) {
      tazele(); // 0/negatif yasak (ya da 0 boyut) → alanı eski değerine döndür
      return;
    }
    const s = hedef / mevcut;
    onEkle(
      eksen === "w"
        ? `translate(${say(minX)}, ${say(minY)}) scale(${say(s)}, 1) translate(${say(-minX)}, ${say(-minY)})`
        : `translate(${say(minX)}, ${say(minY)}) scale(1, ${say(s)}) translate(${say(-minX)}, ${say(-minY)})`,
    );
  };

  return html`
    <div class="alt-baslik">${t("denetci.altbaslik.konum")}</div>
    <div class="izgara">
      ${alan("x", String(say(minX)), (n) => tasi("x", n))}
      ${alan("y", String(say(minY)), (n) => tasi("y", n))}
    </div>
    <div class="alt-baslik">${t("denetci.altbaslik.boyut")}</div>
    <div class="izgara">
      ${alan(
        t("denetci.geo.genislik"),
        String(say(w)),
        (n) => olcekle("w", n),
        w <= EPS,
      )}
      ${alan(
        t("denetci.geo.yukseklik"),
        String(say(h)),
        (n) => olcekle("h", n),
        h <= EPS,
      )}
    </div>
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
  const olcekYaz = (eksen: "sx" | "sy", n: number): void => {
    if (Math.abs(n) < MIN_OLCEK) {
      tazele();
      return;
    }
    yazP({ [eksen]: n });
  };

  return html`
    <div class="alt-baslik">${t("denetci.altbaslik.donusum")}</div>
    <div class="izgara">
      ${alan(t("denetci.don.tx"), String(say(p.tx)), (n) => yazP({ tx: n }))}
      ${alan(t("denetci.don.ty"), String(say(p.ty)), (n) => yazP({ ty: n }))}
      ${alan(t("denetci.don.sx"), String(say(p.sx)), (n) => olcekYaz("sx", n))}
      ${alan(t("denetci.don.sy"), String(say(p.sy)), (n) => olcekYaz("sy", n))}
      ${alan(t("denetci.don.donme"), String(say(p.donme)), (n) =>
        yazP({ donme: n }),
      )}
      ${alan(t("denetci.don.egme"), String(say(p.egme)), (n) =>
        yazP({ egme: n }),
      )}
    </div>
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
        <div class="alt-baslik">${t("denetci.altbaslik.boyut")}</div>
        <div class="izgara">
          ${alan(t("denetci.geo.yaricap"), oz.get("r") ?? "0", (n) =>
            yaz("r", String(n)),
          )}
        </div>
      `;
    case "ellipse":
      // ellipse'te rx/ry yarıçaptır (köşe değil) → bağımsız.
      return html`
        <div class="alt-baslik">${t("denetci.altbaslik.boyut")}</div>
        <div class="izgara">
          ${alan("rx", oz.get("rx") ?? "0", (n) => yaz("rx", String(n)))}
          ${alan("ry", oz.get("ry") ?? "0", (n) => yaz("ry", String(n)))}
        </div>
      `;
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
