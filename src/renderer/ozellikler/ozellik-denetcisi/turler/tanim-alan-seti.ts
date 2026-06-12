import { html, type TemplateResult } from "lit";
import {
  alanSetiKayitDefteri,
  type AlanSeti,
  type AlanSetiBaglami,
} from "./alan-seti-registry";
import { gez, type Dugum } from "../../../../cekirdek/belge/model/dugum";
import type { Belge } from "../../../../cekirdek/belge/belge";
import { OznitelikDegistirKomutu } from "../../../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { kaynakTuruKayitDefteri } from "../../../../cekirdek/registry/kaynak-turu-registry";
import { stilUygulaKomutu } from "../../../boya/stil-uygula";
import { cizimErisimi } from "../../../tuval/cizim-erisimi";
import { t } from "../../../diller/dil";

/**
 * "Uygulanan tanımlar" alan seti (§9.3) — seçili nesneye, belgede TANIMLI kaynakları
 * (filtre / kırpma / maske / stil sınıfı) ATAR. Tanımlar panelinde kaynak "oluşturulur";
 * burası onu nesneye uygular ("bir nesneye atayabileceğimiz ne varsa" — kullanıcı isteği).
 *
 * Marker ataması ayrı alan setindedir (uç kutuları); dolgu/kontur gradyanı boya
 * seçicisindedir. Atamalar style yazım moduna (TK-18) saygı duyar (`stilUygulaKomutu`);
 * sınıf ise nesnenin `class` listesine eklenir/çıkarılır. Hepsi komutla (İlke 2).
 */

const ATANABILIR = new Set([
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "image",
  "use",
  "g",
]);

/** Belgedeki verilen etiketli tanımların id'leri (filter/clipPath/mask). */
function tanimIdleri(belge: Belge, etiket: string): string[] {
  const out: string[] = [];
  for (const d of gez(belge.kok)) {
    if (d.etiket === etiket) {
      const id = d.oznitelikler.get("id");
      if (id) out.push(id);
    }
  }
  return out;
}

/** `url(#id)` / `url("#id")` → id (yoksa null). */
function urlId(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/.exec(v);
  return m ? m[1]! : null;
}

/** Seçili nesnenin bir sunum özelliğinin (filter/clip-path/mask) EFEKTİF kaynağı (TK-5). */
function etkinId(dugum: Dugum, cssOzellik: string): string | null {
  const el = cizimErisimi.eleman(dugum.kimlik);
  const comp =
    el instanceof Element
      ? getComputedStyle(el).getPropertyValue(cssOzellik)
      : "";
  return urlId(comp) ?? urlId(dugum.oznitelikler.get(cssOzellik));
}

/** Bir kaynak seçim satırı (filter/clip-path/mask için). */
function secimSatiri(
  baglam: AlanSetiBaglami,
  etiket: string,
  cssOzellik: string,
  idler: string[],
): TemplateResult | "" {
  if (idler.length === 0) return "";
  const mevcut = etkinId(baglam.dugum, cssOzellik);
  return html`
    <div class="alan">
      <div class="satir">
        <label>${etiket}</label>
        <select
          @change=${(e: Event) => {
            const v = (e.target as HTMLSelectElement).value;
            baglam.komut(
              stilUygulaKomutu(
                baglam.belge,
                baglam.dugum,
                cssOzellik,
                v ? `url(#${v})` : "",
              ),
            );
          }}
        >
          <option value="" ?selected=${!mevcut}>
            ${t("denetci.tanim.yok")}
          </option>
          ${idler.map(
            (id) =>
              html`<option value=${id} ?selected=${mevcut === id}>
                ${id}
              </option>`,
          )}
        </select>
      </div>
    </div>
  `;
}

const tanimAlanSeti: AlanSeti = {
  id: "tanim-ataama",
  baslikAnahtari: "denetci.grup.tanimlar",
  sira: 20,
  uygunMu: (dugum) => ATANABILIR.has(dugum.etiket),
  render: (baglam) => {
    const { belge, dugum } = baglam;
    const filtreler = tanimIdleri(belge, "filter");
    const kirpmalar = tanimIdleri(belge, "clipPath");
    const maskeler = tanimIdleri(belge, "mask");
    // Yalnız `<style>`'da TANIMLI sınıflar atanabilir (tüm class token'ları değil —
    // svgtron-stil-* iç sınıfları/tanımsız sınıflar gösterilmez). Kaynak deseni:
    // stil kaynak türünün `listele`'siyle tek doğruluk kaynağı (kaynak-türü registry).
    const siniflar = (
      kaynakTuruKayitDefteri.al("stil")?.listele(belge) ?? []
    ).map((o) => o.id);

    if (
      !filtreler.length &&
      !kirpmalar.length &&
      !maskeler.length &&
      !siniflar.length
    ) {
      return html`<div class="alan">
        <span class="ipucu-bos">${t("denetci.tanim.bos")}</span>
      </div>`;
    }

    const mevcutSinif = (dugum.oznitelikler.get("class") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    const sinifDegistir = (c: string): void => {
      const yeni = mevcutSinif.includes(c)
        ? mevcutSinif.filter((x) => x !== c)
        : [...mevcutSinif, c];
      baglam.komut(
        new OznitelikDegistirKomutu(belge, dugum, "class", yeni.join(" ")),
      );
    };

    return html`
      ${secimSatiri(baglam, t("denetci.tanim.filtre"), "filter", filtreler)}
      ${secimSatiri(baglam, t("denetci.tanim.kirpma"), "clip-path", kirpmalar)}
      ${secimSatiri(baglam, t("denetci.tanim.maske"), "mask", maskeler)}
      ${siniflar.length
        ? html`
            <div class="alt-baslik">${t("denetci.tanim.stiller")}</div>
            <div class="cipler">
              ${siniflar.map(
                (c) =>
                  html`<button
                    class="cip ${mevcutSinif.includes(c) ? "aktif" : ""}"
                    @click=${() => sinifDegistir(c)}
                  >
                    .${c}
                  </button>`,
              )}
            </div>
          `
        : ""}
    `;
  },
};

alanSetiKayitDefteri.kaydet(tanimAlanSeti);
