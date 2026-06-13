import type { Dugum } from "../../cekirdek/belge/model/dugum";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * Bir düğümün ÇOCUKLARININ ad uzayı: `<foreignObject>` içeriği XHTML'dir (HTML
 * gibi render edilsin diye), diğer her şey ebeveynin ad uzayını sürdürür (TK-37 #7).
 */
function cocukNs(dugum: Dugum, ns: string): string {
  return dugum.etiket === "foreignObject" ? XHTML_NS : ns;
}

/**
 * Yansıtıcı — soyut belge modelini canlı SVG DOM'una çevirir ve sonraki
 * değişikliklerde DOM'u YENİDEN KURMADAN uyumlar (reconcile).
 *
 * Bu, İlke 8'in (soyut model) en kritik parçasıdır: model değişince DOM baştan
 * üretilseydi SMIL animasyonu sıfırlanır ve titrerdi. Uyumlayıcı yalnızca değişen
 * öznitelikleri/yapıyı yamalar; böylece render sadakati ve canlı animasyon
 * korunur. Her DOM elemanına `data-kimlik` yazılır → tıklama isabeti ve seçim
 * çerçevesi için model↔DOM eşlemesi.
 */
export class Yansitici {
  readonly #elemanlar = new Map<string, Element>();
  #kok: SVGSVGElement | null = null;

  /** Üretilen DOM kökü (yoksa null). */
  get kok(): SVGSVGElement | null {
    return this.#kok;
  }

  /** Kimliğe karşılık gelen DOM elemanı (yoksa null). */
  elemanGetir(kimlik: string): Element | null {
    return this.#elemanlar.get(kimlik) ?? null;
  }

  /** Model kökünden TAZE bir DOM kökü üretir (eşlemeyi sıfırlar). */
  yansit(kokDugum: Dugum): SVGSVGElement {
    this.#elemanlar.clear();
    this.#kok = this.#olustur(kokDugum) as SVGSVGElement;
    return this.#kok;
  }

  /** Mevcut DOM kökünü modele göre uyumlar (yamalar). */
  uyumla(kokDugum: Dugum): void {
    if (this.#kok) this.#uyumlaEleman(this.#kok, kokDugum);
  }

  #olustur(dugum: Dugum, ns: string = SVG_NS): Element {
    const el = document.createElementNS(ns, dugum.etiket);
    el.setAttribute("data-kimlik", dugum.kimlik);
    for (const [ad, deger] of dugum.oznitelikler)
      this.#oznitelikYaz(el, ad, deger);

    if (dugum.metin !== undefined && dugum.cocuklar.length === 0) {
      el.textContent = dugum.metin;
    } else {
      const cns = cocukNs(dugum, ns);
      for (const cocuk of dugum.cocuklar)
        el.appendChild(this.#olustur(cocuk, cns));
    }

    this.#elemanlar.set(dugum.kimlik, el);
    return el;
  }

  #uyumlaEleman(el: Element, dugum: Dugum, ns: string = SVG_NS): void {
    this.#elemanlar.set(dugum.kimlik, el);

    // Öznitelikleri senkronla (data-kimlik hariç).
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === "data-kimlik") continue;
      if (!dugum.oznitelikler.has(attr.name)) el.removeAttribute(attr.name);
    }
    for (const [ad, deger] of dugum.oznitelikler) {
      if (el.getAttribute(ad) !== deger) this.#oznitelikYaz(el, ad, deger);
    }

    if (dugum.metin !== undefined && dugum.cocuklar.length === 0) {
      if (el.textContent !== dugum.metin) el.textContent = dugum.metin;
      return;
    }
    this.#uyumlaCocuklar(el, dugum.cocuklar, cocukNs(dugum, ns));
  }

  #uyumlaCocuklar(
    domEbeveyn: Element,
    modelCocuklar: Dugum[],
    ns: string = SVG_NS,
  ): void {
    const mevcut = new Map<string, Element>();
    for (const c of Array.from(domEbeveyn.children)) {
      const k = c.getAttribute("data-kimlik");
      if (k) mevcut.set(k, c);
    }

    let i = 0;
    for (const md of modelCocuklar) {
      let el = mevcut.get(md.kimlik);
      if (el) {
        this.#uyumlaEleman(el, md, ns);
        mevcut.delete(md.kimlik);
      } else {
        el = this.#olustur(md, ns);
      }
      const suanki = domEbeveyn.children[i] ?? null;
      if (suanki !== el) domEbeveyn.insertBefore(el, suanki);
      i++;
    }

    // Modelde kalmayan DOM çocuklarını sil.
    for (const fazla of mevcut.values()) {
      this.#unutAgac(fazla);
      fazla.remove();
    }
  }

  #unutAgac(el: Element): void {
    const k = el.getAttribute("data-kimlik");
    if (k) this.#elemanlar.delete(k);
    for (const c of Array.from(el.children)) this.#unutAgac(c);
  }

  #oznitelikYaz(el: Element, ad: string, deger: string): void {
    if (ad.startsWith("xmlns")) return; // createElementNS yeterli
    if (ad === "xlink:href") el.setAttributeNS(XLINK_NS, ad, deger);
    else el.setAttribute(ad, deger);
  }
}
