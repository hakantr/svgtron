import type { Dugum } from "../../../cekirdek/belge/model/dugum";
import {
  metinKacis,
  metinElemaniMi,
  oznitelikDizesi,
  editorYorumDizesi,
  uretilemez,
} from "../../../cekirdek/belge/model/disa-aktar";

/**
 * Kod metni üreticisi (§11.4, TK-39/CodeMirror) — belge modelini dışa aktarıcıyla
 * AYNI biçimde (girintili, metin elemanları satır-içi) DÜZ METİN olarak yazar VE her
 * elemanın karakter aralığını ({@link KodMetni.araliklar}) kaydeder. CodeMirror
 * paneli bu aralıklarla çift-yönlü senkronu kurar (koddaki konum ↔ model düğümü):
 * seçili düğüm aralığı vurgulanır; koda tıklanınca aralığı kapsayan EN İÇTEKİ düğüm
 * seçilir. (Eski `kod-goster.ts` span ağacının metin+aralık karşılığı.)
 *
 * Tek doğruluk kaynağı yine belge modelidir (İlke 3); biçim mantığı çekirdek dışa
 * aktarıcının yardımcılarıyla paylaşılır → ikisi sürüklenmez.
 */
export interface KodMetni {
  metin: string;
  /** kimlik → [from, to) karakter aralığı (İlke 10 yorumu dâhil, eleman bloğu). */
  araliklar: Map<string, { from: number; to: number }>;
}

/** Satır-içi (tek satır) bir düğümü ham metin olarak seri hâle getirir. */
function satirIciMetin(d: Dugum): string {
  const oz = oznitelikDizesi(d);
  if (d.cocuklar.length === 0 && d.metin === undefined)
    return `<${d.etiket}${oz}/>`;
  let s = `<${d.etiket}${oz}>`;
  if (d.metin !== undefined) s += metinKacis(d.metin);
  for (const c of d.cocuklar) {
    if (uretilemez(c.etiket)) continue;
    s += satirIciMetin(c);
  }
  return s + `</${d.etiket}>`;
}

class Yazici {
  #parcalar: string[] = [];
  uzunluk = 0;
  readonly araliklar = new Map<string, { from: number; to: number }>();

  yaz(s: string): void {
    this.#parcalar.push(s);
    this.uzunluk += s.length;
  }
  metin(): string {
    return this.#parcalar.join("");
  }
}

function dugumYaz(y: Yazici, d: Dugum, derinlik: number): void {
  if (uretilemez(d.etiket)) return; // §10.10
  const girinti = "  ".repeat(derinlik);
  const yorum = editorYorumDizesi(d);
  const metinYaprak = d.metin !== undefined && d.cocuklar.length === 0;
  const bosMu = d.cocuklar.length === 0 && d.metin === undefined;
  const satirIci = bosMu || metinYaprak || metinElemaniMi(d.etiket);

  const basla = y.uzunluk; // aralık İlke 10 yorumunu da kapsasın
  if (yorum) y.yaz(`${girinti}${yorum}\n`);

  if (satirIci) {
    y.yaz(`${girinti}${satirIciMetin(d)}\n`);
  } else {
    y.yaz(`${girinti}<${d.etiket}${oznitelikDizesi(d)}>\n`);
    if (d.metin !== undefined)
      y.yaz(`${"  ".repeat(derinlik + 1)}${metinKacis(d.metin)}\n`);
    for (const c of d.cocuklar) dugumYaz(y, c, derinlik + 1);
    y.yaz(`${girinti}</${d.etiket}>\n`);
  }
  y.araliklar.set(d.kimlik, { from: basla, to: y.uzunluk });
}

export function kodMetni(kok: Dugum): KodMetni {
  const y = new Yazici();
  dugumYaz(y, kok, 0);
  return { metin: y.metin().replace(/\n+$/, ""), araliklar: y.araliklar };
}

/** Bir karakter konumunu kapsayan EN İÇTEKİ (en küçük) düğüm kimliği (yoksa null). */
export function konumdakiKimlik(
  araliklar: Map<string, { from: number; to: number }>,
  konum: number,
): string | null {
  let enIyi: string | null = null;
  let enKucuk = Infinity;
  for (const [kimlik, r] of araliklar) {
    if (konum >= r.from && konum <= r.to) {
      const boy = r.to - r.from;
      if (boy < enKucuk) {
        enKucuk = boy;
        enIyi = kimlik;
      }
    }
  }
  return enIyi;
}
