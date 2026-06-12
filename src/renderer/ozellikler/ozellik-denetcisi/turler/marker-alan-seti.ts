import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gez, type Dugum } from '../../../../cekirdek/belge/model/dugum';
import { stilUygulaKomutu } from '../../../boya/stil-uygula';
import { cizimErisimi } from '../../../tuval/cizim-erisimi';
import { ayristir, parlaklik, type RGBA } from '../../../boya/renk';
import { t } from '../../../diller/dil';
import { alanSetiKayitDefteri, type AlanSetiBaglami } from './alan-seti-registry';

/**
 * Marker (uç işaretleri) alan seti (§10.5 DENETÇİ) — marker uygulanabilen
 * şekiller (path/line/polyline/polygon) seçiliyken üç kutu: başlangıç · orta ·
 * bitiş (sırasıyla). Kutuda marker'ın canlı ÖNİZLEMESİ gösterilir; marker rengi
 * kutu zeminine yakınsa (düşük kontrast) zemin okunabilir bir renge çekilir.
 * Bir kutuya tıklamak o pozisyon (marker-start/mid/end) için belgedeki
 * marker'lardan seçtiren menü açar. Yazım moda göre (TK-18), tek Command (İlke 2).
 */
type MarkerPoz = 'start' | 'mid' | 'end';
const POZLAR: MarkerPoz[] = ['start', 'mid', 'end'];
const SVG_NS = 'http://www.w3.org/2000/svg';

/** `style` dizesinden tek bir özelliğin değerini okur (yoksa null). */
function stilOku(style: string, ozellik: string): string | null {
  for (const parca of style.split(';')) {
    const i = parca.indexOf(':');
    if (i === -1) continue;
    if (parca.slice(0, i).trim() === ozellik) return parca.slice(i + 1).trim();
  }
  return null;
}

@customElement('marker-alani')
export class MarkerAlani extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .kutular {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.35rem;
      padding: 0.3rem 0.75rem;
    }
    .kutu {
      display: grid;
      place-items: center;
      height: 34px;
      padding: 0.2rem;
      border: 1px solid var(--kenarlik);
      border-radius: 6px;
      background: var(--yuzey-2);
      cursor: pointer;
      min-width: 0;
      overflow: hidden;
    }
    .kutu:hover {
      border-color: var(--vurgu, #4a90e2);
    }
    .kutu.acik {
      border-color: var(--vurgu, #4a90e2);
    }
    .marker-onizle {
      width: 100%;
      height: 26px;
      display: block;
    }
    .kutu .bos {
      font-size: 0.78rem;
      color: var(--metin-soluk);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      font-family: ui-monospace, monospace;
    }
    .menu {
      margin: 0 0.75rem 0.4rem;
      border: 1px solid var(--kenarlik);
      border-radius: 6px;
      background: var(--yuzey);
      overflow: hidden;
    }
    .menu button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.32rem 0.6rem;
      border: 0;
      background: transparent;
      color: var(--metin);
      font: inherit;
      font-size: 0.78rem;
      cursor: pointer;
    }
    .menu button:hover {
      background: var(--yuzey-hover);
    }
    .menu .bos {
      padding: 0.4rem 0.6rem;
      font-size: 0.74rem;
      color: var(--metin-soluk);
    }
  `;

  @property({ attribute: false }) baglam!: AlanSetiBaglami;
  @state() private acik: MarkerPoz | null = null;
  #sonDugum: Dugum | null = null;

  override willUpdate(degisen: PropertyValues): void {
    // Seçili nesne değişince açık menüyü kapat (yanlış nesneye yazmayı önle).
    if (degisen.has('baglam') && this.#sonDugum !== this.baglam?.dugum) {
      this.#sonDugum = this.baglam?.dugum ?? null;
      this.acik = null;
    }
  }

  /** Belgedeki tanımlı marker id'leri. */
  #markerlar(): string[] {
    const ids: string[] = [];
    for (const d of gez(this.baglam.belge.kok)) {
      const id = d.oznitelikler.get('id');
      if (d.etiket === 'marker' && id) ids.push(id);
    }
    return ids;
  }

  /** id'li marker düğümü (yoksa null). */
  #markerDugumu(id: string): Dugum | null {
    for (const d of gez(this.baglam.belge.kok)) {
      if (d.etiket === 'marker' && d.oznitelikler.get('id') === id) return d;
    }
    return null;
  }

  /**
   * Bir pozisyonun ETKİN marker id'si (yoksa null). Marker çoğu zaman inline
   * style/öznitelikten değil bir CSS SINIFINDAN gelir (`.cls { marker-end:... }`);
   * bu yüzden render edilen elemanın `getComputedStyle` çıktısı okunur (TK-5).
   * Eleman henüz render edilmemişse modele (style/öznitelik) düşülür.
   */
  #mevcutId(poz: MarkerPoz): string | null {
    const ozellik = `marker-${poz}`;
    const dugum = this.baglam.dugum;
    const el = cizimErisimi.eleman(dugum.kimlik);
    let deger = el instanceof Element ? getComputedStyle(el).getPropertyValue(ozellik).trim() : '';
    if (!deger) {
      deger = stilOku(dugum.oznitelikler.get('style') ?? '', ozellik) ?? dugum.oznitelikler.get(ozellik) ?? '';
    }
    if (deger === '' || deger === 'none') return null;
    return /url\(["']?#([^"')]+)["']?\)/.exec(deger)?.[1] ?? null;
  }

  /** Marker'ın render edilmiş öğesindeki ilk SABİT (context-* değil) rengi. */
  #markerRengi(el: Element): RGBA | null {
    for (const node of [el, ...Array.from(el.querySelectorAll('*'))]) {
      for (const attr of ['fill', 'stroke'] as const) {
        const ham = node.getAttribute(attr);
        if (ham && /context-(fill|stroke)/.test(ham)) continue; // bağlama bağlı
        const aday =
          ham && !/none|inherit|currentColor/.test(ham)
            ? ham
            : getComputedStyle(node).getPropertyValue(attr).trim();
        if (aday && aday !== 'none') {
          const rgba = ayristir(aday);
          if (rgba && rgba.a > 0.05) return rgba;
        }
      }
    }
    return null;
  }

  /** Tema yüzey rengini (kutu varsayılan zemini) parlaklık olarak okur. */
  #zeminParlaklik(): number {
    const bg = ayristir(getComputedStyle(this).getPropertyValue('--yuzey-2').trim());
    return bg ? parlaklik(bg) : 0.15; // okunamazsa koyu varsay
  }

  /** Marker rengi kutu zeminine yakınsa kontrastlı bir zemin döndür; değilse null. */
  #kutuZemin(renk: RGBA | null): string | null {
    if (!renk) return null;
    const lm = parlaklik(renk);
    if (Math.abs(lm - this.#zeminParlaklik()) >= 0.28) return null; // yeterli kontrast
    return lm > 0.5 ? '#22262e' : '#eef1f5'; // açık marker → koyu zemin, koyu → açık
  }

  /** Önizlemede context-* ve currentColor için kullanılacak (zemine kontrastlı) renk. */
  #cizgiRengi(zemin: string | null): string {
    const bg = ayristir(zemin ?? '');
    const lb = bg ? parlaklik(bg) : this.#zeminParlaklik();
    return lb > 0.5 ? '#1f2430' : '#e8e8ea';
  }

  /**
   * Marker önizleme `<svg>` düğümü + (gerekiyorsa) kutu zemin rengi.
   * İçerik bir `<g>`'ye konur; viewBox SONRADAN (`updated`'da getBBox ile) içeriğin
   * GERÇEK sınırlarına göre ayarlanır → marker, kendi viewBox'undan (overflow ile)
   * taşsa bile özgün görünümü korunarak kutuya sığacak şekilde ölçeklenir.
   */
  #onizleme(id: string): { node: SVGSVGElement; zemin: string | null } | null {
    const markerD = this.#markerDugumu(id);
    if (!markerD) return null;
    const el = cizimErisimi.eleman(markerD.kimlik);
    if (!(el instanceof Element) || el.children.length === 0) return null;

    const renk = this.#markerRengi(el);
    const zemin = this.#kutuZemin(renk);
    const cizgi = this.#cizgiRengi(zemin);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('marker-onizle');
    // Yalnız `color` ver: context-fill/stroke → currentColor bununla çözülür.
    // `stroke` VERME — SVG'de stroke kalıtsaldır; stroke'suz bir ok ucu istenmeyen
    // (açık) bir kontur miras alırdı. Okunurluk kutu ZEMİNİYLE sağlanır (#kutuZemin).
    svg.style.color = cizgi;
    const g = document.createElementNS(SVG_NS, 'g');
    for (const c of Array.from(el.children)) {
      const klon = c.cloneNode(true) as Element;
      this.#contextRenkDuzelt(klon);
      g.appendChild(klon);
    }
    svg.appendChild(g);
    return { node: svg, zemin };
  }

  /** Önizleme SVG'lerini içeriğin gerçek bbox'ına göre ölçekle (kutuya sığsın). */
  override updated(): void {
    for (const svg of this.renderRoot.querySelectorAll<SVGSVGElement>('.marker-onizle')) {
      if (svg.dataset['fit'] === '1') continue; // bu düğüm zaten ölçeklendi
      const g = svg.firstElementChild as SVGGraphicsElement | null;
      if (!g) continue;
      try {
        const b = g.getBBox();
        if (b.width <= 0 && b.height <= 0) continue; // ölçülemez/boş → atla
        const pad = Math.max(b.width, b.height) * 0.12 || 0.5;
        svg.setAttribute(
          'viewBox',
          `${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`,
        );
        svg.dataset['fit'] = '1';
      } catch {
        /* getBBox ölçemezse (gizli/boş) atla */
      }
    }
  }

  /** Klon içindeki context-fill/stroke'ları currentColor'a çevir (bağlam yok). */
  #contextRenkDuzelt(el: Element): void {
    for (const node of [el, ...Array.from(el.querySelectorAll('*'))]) {
      for (const attr of ['fill', 'stroke'] as const) {
        const v = node.getAttribute(attr);
        if (v && /context-(fill|stroke)/.test(v)) node.setAttribute(attr, 'currentColor');
      }
      const style = node.getAttribute('style');
      if (style && /context-(fill|stroke)/.test(style)) {
        node.setAttribute('style', style.replace(/context-(fill|stroke)/g, 'currentColor'));
      }
    }
  }

  /** Bir pozisyona marker uygular (id) ya da kaldırır (null → none). Moda göre. */
  #uygula(poz: MarkerPoz, id: string | null): void {
    this.baglam.komut(
      stilUygulaKomutu(this.baglam.belge, this.baglam.dugum, `marker-${poz}`, id ? `url(#${id})` : 'none'),
    );
    this.acik = null;
  }

  override render() {
    const liste = this.#markerlar();
    return html`
      <div class="kutular">
        ${POZLAR.map((poz) => {
          const cur = this.#mevcutId(poz);
          const oniz = cur ? this.#onizleme(cur) : null;
          return html`<button
            class="kutu ${this.acik === poz ? 'acik' : ''}"
            title=${t(`denetci.marker.${poz}`)}
            style=${oniz?.zemin ? `background:${oniz.zemin}` : ''}
            @click=${() => (this.acik = this.acik === poz ? null : poz)}
          >
            ${oniz ? oniz.node : html`<span class="bos">${cur ? `#${cur}` : '—'}</span>`}
          </button>`;
        })}
      </div>
      ${this.acik
        ? html`<div class="menu">
            <button @click=${() => this.#uygula(this.acik!, null)}>${t('denetci.marker.yok')}</button>
            ${liste.length === 0
              ? html`<div class="bos">${t('denetci.marker.bos')}</div>`
              : liste.map(
                  (id) => html`<button @click=${() => this.#uygula(this.acik!, id)}>#${id}</button>`,
                )}
          </div>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'marker-alani': MarkerAlani;
  }
}

/** Marker uygulanabilen şekiller (SVG: yalnız bu öğeler marker render eder). */
const MARKERLI = new Set(['path', 'line', 'polyline', 'polygon']);

alanSetiKayitDefteri.kaydet({
  id: 'marker',
  baslikAnahtari: 'denetci.grup.marker',
  sira: 30,
  uygunMu: (dugum) => MARKERLI.has(dugum.etiket),
  render: (baglam) => html`<marker-alani .baglam=${baglam}></marker-alani>`,
});
