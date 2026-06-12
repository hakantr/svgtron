import { html } from "lit";
import {
  alanSetiKayitDefteri,
  type AlanSeti,
  type AlanSetiBaglami,
} from "./alan-seti-registry";
import {
  dugumOlustur,
  type Dugum,
} from "../../../../cekirdek/belge/model/dugum";
import { MetinKomutu } from "../../../../cekirdek/komutlar/metin-komutu";
import { DugumEkleKomutu } from "../../../../cekirdek/komutlar/dugum-komutlari";
import { t } from "../../../diller/dil";

/** Eleman düzeyi <title>/<desc> düzenleme (Faz B, §8.3). Erişilebilirlik (§11.4). */

function altDugum(dugum: Dugum, etiket: string): Dugum | undefined {
  return dugum.cocuklar.find((c) => c.etiket === etiket);
}

function yaz(baglam: AlanSetiBaglami, etiket: string, deger: string): void {
  const mevcut = altDugum(baglam.dugum, etiket);
  if (mevcut) {
    baglam.komut(new MetinKomutu(baglam.belge, mevcut, deger));
  } else if (deger.trim() !== "") {
    // title/desc kapsayıcının başında olmalı.
    baglam.komut(
      new DugumEkleKomutu(
        baglam.belge,
        baglam.dugum,
        dugumOlustur(etiket, {}, [], deger),
        0,
      ),
    );
  }
}

const metadataAlanSeti: AlanSeti = {
  id: "metadata",
  baslikAnahtari: "denetci.grup.metadata",
  sira: 90,
  // Her elemana uygulanabilir (kök svg dâhil); title/desc evrenseldir.
  uygunMu: () => true,
  render: (baglam) => {
    const baslik = altDugum(baglam.dugum, "title")?.metin ?? "";
    const aciklama = altDugum(baglam.dugum, "desc")?.metin ?? "";
    return html`
      <div class="alan">
        <label>${t("denetci.meta.baslik")}</label>
        <input
          type="text"
          .value=${baslik}
          @change=${(e: Event) =>
            yaz(baglam, "title", (e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="alan">
        <label>${t("denetci.meta.aciklama")}</label>
        <input
          type="text"
          .value=${aciklama}
          @change=${(e: Event) =>
            yaz(baglam, "desc", (e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="alan">
        <label>${t("denetci.meta.aria")}</label>
        <input
          type="text"
          .value=${baglam.dugum.oznitelikler.get("aria-label") ?? ""}
          @change=${(e: Event) =>
            baglam.yaz("aria-label", (e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  },
};

alanSetiKayitDefteri.kaydet(metadataAlanSeti);
