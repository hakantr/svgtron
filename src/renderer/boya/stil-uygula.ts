import {
  dugumOlustur,
  gez,
  benzersizSinif,
  type Dugum,
} from "../../cekirdek/belge/model/dugum";
import type { Belge } from "../../cekirdek/belge/belge";
import type { Komut } from "../../cekirdek/komutlar/komut";
import { OznitelikDegistirKomutu } from "../../cekirdek/komutlar/oznitelik-degistir-komutu";
import { MetinKomutu } from "../../cekirdek/komutlar/metin-komutu";
import {
  BilesikKomut,
  DugumEkleKomutu,
} from "../../cekirdek/komutlar/dugum-komutlari";
import { stilAyarla, stilOku } from "./stil";
import { cssKuralYaz } from "./stil-css";
import { stilYazimModu } from "./stil-yazim-modu";

/**
 * Stil uygulama yardımcısı (TK-18) — bir şekle tek bir stil özelliğini, **stil
 * yazım moduna göre** INLINE `style` ya da nesne-başına bir CSS SINIFI olarak
 * yazan geri-alınabilir komut üretir. Tüm uygulama stratejileri (fill/stroke/
 * marker/filter/gradient/clip/mask...) bunu kullanır; böylece "inline mı CSS mi"
 * tek yerden yönetilir. Okuma her zaman efektiftir (getComputedStyle) → her iki
 * mod da doğru görünür.
 */

/** Nesne-başına stil sınıfı öneki. */
const ONEK = "svgtron-stil-";

/** Düğümün kendi (svgtron) stil sınıfı; yoksa null. */
function nesneStilSinifi(dugum: Dugum): string | null {
  return (
    (dugum.oznitelikler.get("class") ?? "")
      .split(/\s+/)
      .find((c) => c.startsWith(ONEK)) ?? null
  );
}

/** Belgenin ilk `<style>` düğümü (yoksa null). */
function styleDugumu(belge: Belge): Dugum | null {
  for (const d of gez(belge.kok)) if (d.etiket === "style") return d;
  return null;
}

function defsBul(belge: Belge): Dugum | null {
  return belge.kok.cocuklar.find((d) => d.etiket === "defs") ?? null;
}

function kacis(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Nesnenin bir sınıfı `<style>`'da tanımlı mı (CSS konvansiyonu işareti)? */
function belgeSinifTanimliMi(belge: Belge, cls: string): boolean {
  const st = styleDugumu(belge);
  if (!st) return false;
  const metin = st.metin ?? "";
  return cls
    .split(/\s+/)
    .some((c) => c && new RegExp(`\\.${kacis(c)}(?![\\w-])`).test(metin));
}

/** Belge ağırlıklı CSS sınıfı mı kullanıyor (en az bir sınıf kuralı)? */
function belgeCssAgirlikli(belge: Belge): boolean {
  const st = styleDugumu(belge);
  return !!st && /\.[A-Za-z_-][\w-]*\s*\{/.test(st.metin ?? "");
}

/**
 * Otomatik mod: "o nesnenin özelliğine göre". Nesnenin zaten kendi stil sınıfı
 * varsa ya da `<style>`'da tanımlı bir sınıf taşıyorsa CSS; inline `style`'ı varsa
 * inline; tamamen yeni ise belge konvansiyonunu izle (CSS ağırlıklıysa CSS).
 */
function otomatikSec(belge: Belge, dugum: Dugum): "inline" | "css" {
  if (nesneStilSinifi(dugum)) return "css";
  const cls = dugum.oznitelikler.get("class");
  if (cls && belgeSinifTanimliMi(belge, cls)) return "css";
  if (dugum.oznitelikler.get("style")) return "inline";
  return belgeCssAgirlikli(belge) ? "css" : "inline";
}

/** INLINE: özelliği nesnenin `style` özniteliğine yazar. */
function inlineKomutu(
  belge: Belge,
  dugum: Dugum,
  ozellik: string,
  deger: string,
): Komut {
  return new OznitelikDegistirKomutu(
    belge,
    dugum,
    "style",
    stilAyarla(dugum.oznitelikler.get("style") ?? null, ozellik, deger),
  );
}

/** CSS: özelliği nesne-başına bir sınıf kuralına yazar (+ inline gölgeyi temizler). */
function cssKomutu(
  belge: Belge,
  dugum: Dugum,
  ozellik: string,
  deger: string,
): Komut {
  const komutlar: Komut[] = [];

  // 1) Nesnenin stil sınıfı: varsa kullan, yoksa üret + class listesine ekle.
  let sinif = nesneStilSinifi(dugum);
  if (!sinif) {
    sinif = benzersizSinif(belge.kok, ONEK);
    const mevcut = (dugum.oznitelikler.get("class") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    mevcut.push(sinif);
    komutlar.push(
      new OznitelikDegistirKomutu(belge, dugum, "class", mevcut.join(" ")),
    );
  }
  const selector = `.${sinif}`;

  // 2) <style>: varsa kuralı güncelle, yoksa içeriğiyle birlikte oluştur (defs'te).
  const st = styleDugumu(belge);
  if (st) {
    komutlar.push(
      new MetinKomutu(
        belge,
        st,
        cssKuralYaz(st.metin ?? "", selector, ozellik, deger),
      ),
    );
  } else {
    let defs = defsBul(belge);
    if (!defs) {
      defs = dugumOlustur("defs");
      komutlar.push(new DugumEkleKomutu(belge, belge.kok, defs, 0));
    }
    const metin = cssKuralYaz("", selector, ozellik, deger);
    komutlar.push(
      new DugumEkleKomutu(belge, defs, dugumOlustur("style", {}, [], metin)),
    );
  }

  // 3) Aynı özellik nesnenin INLINE style'ında varsa kaldır (inline > sınıf;
  //    yoksa sınıf değeri gölgelenir).
  const inlineStyle = dugum.oznitelikler.get("style");
  if (inlineStyle && stilOku(inlineStyle, ozellik) != null) {
    komutlar.push(
      new OznitelikDegistirKomutu(
        belge,
        dugum,
        "style",
        stilAyarla(inlineStyle, ozellik, ""),
      ),
    );
  }

  return komutlar.length === 1
    ? komutlar[0]!
    : new BilesikKomut("stil (css)", komutlar);
}

/**
 * Bir şekle bir stil özelliğini stil yazım moduna göre yazan komut. `deger`
 * boşsa özellik kaldırılır (inline'da siler; css'te sınıf kuralından çıkarır).
 */
export function stilUygulaKomutu(
  belge: Belge,
  dugum: Dugum,
  ozellik: string,
  deger: string,
): Komut {
  const istenen = stilYazimModu.mod;
  const mod = istenen === "otomatik" ? otomatikSec(belge, dugum) : istenen;
  return mod === "css"
    ? cssKomutu(belge, dugum, ozellik, deger)
    : inlineKomutu(belge, dugum, ozellik, deger);
}
