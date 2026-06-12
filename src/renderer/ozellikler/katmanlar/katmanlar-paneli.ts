import { LitElement, html, css, svg, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { BelgeDeposu } from '../../../cekirdek/belge/belge-deposu';
import type { SecimDeposu } from '../../../cekirdek/secim/secim-deposu';
import type { KomutGecmisi } from '../../../cekirdek/komutlar/komut-gecmisi';
import type { Dugum } from '../../../cekirdek/belge/model/dugum';
import { OznitelikDegistirKomutu } from '../../../cekirdek/komutlar/oznitelik-degistir-komutu';
import { KilitKomutu } from '../../../cekirdek/komutlar/kilit-komutu';
import { ArtboardKomutu } from '../../../cekirdek/komutlar/artboard-komutu';
import { SiraKomutu } from '../../../cekirdek/komutlar/dugum-komutlari';
import { panelKayitDefteri } from '../../../cekirdek/registry/panel-registry';
import { cizimErisimi } from '../../tuval/cizim-erisimi';
import { stilAyarla } from '../../boya/stil';
import { dilYonetici, t } from '../../diller/dil';

/** Ağaçta gösterilmeyen kapsayıcı/tanım etiketleri. */
const GIZLI = new Set(['defs', 'style', 'title', 'desc', 'metadata']);
/**
 * Artboard ADAYI olabilecek (render edilen, geometrisi olan) etiketler — beyaz liste.
 * Kök altına doğrudan konan tanım/paint-server elemanları (linearGradient, filter,
 * clipPath, mask, marker, pattern, symbol…) ve animasyonlar render edilmediğinden
 * aday DEĞİLDİR; beyaz liste, ileride yeni tanım türleri gelse de yanlış adayı önler.
 */
const ARTBOARD_GRAFIKSEL = new Set([
  'rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline', 'line', 'image', 'g', 'use',
]);
/** Artboard ölçü eşleşmesinde kabul edilen sapma (~%2). */
const ARTBOARD_TOLERANS = 0.02;

const GOZ = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z"/><circle cx="8" cy="8" r="2"/></svg>`;
const GOZ_KAPALI = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 2 L14 14 M6.5 6.6a2 2 0 0 0 2.8 2.8 M4 4.6C2.2 5.8 1 8 1 8s2.5 4.5 7 4.5c1 0 1.9-.2 2.7-.5 M9.5 4C9 3.9 8.5 3.9 8 3.9"/></svg>`;
const KILITLI = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="7" width="10" height="6.5" rx="1.3"/></svg>`;
const KILITSIZ = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M4.5 7V5a3.5 3.5 0 0 1 6.9-.8" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="7" width="10" height="6.5" rx="1.3" opacity="0.55"/></svg>`;
/** Artboard (sayfa/zemin) simgesi — tam-boy çerçeve. */
const ARTBOARD_IKON = svg`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2.5" width="12" height="11" rx="1"/><path d="M2 5.5h12"/></svg>`;

/**
 * Katmanlar paneli (§9.1/9.4) — nesne/grup ağacını, z-sıralamasını gösterir;
 * seçme (kilitli dâhil), görünürlük, kilit, öne/arkaya işlemleri sunar. Sıralama
 * ve görünürlük belge durumudur → Command (İlke 2). Liste ÜSTÜ = ön (üst z).
 */
@customElement('katmanlar-paneli')
export class KatmanlarPaneli extends LitElement {
  static override styles = css`
    :host {
      display: block;
      /* Sağ ray'da tek panel açık (Y7) → tüm sağ içerik alanını DOLDUR (eski yığın
         düzeninden kalma flex:0 0 auto + max-height:32% kaldırıldı, kullanıcı isteği). */
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      font-family: system-ui, sans-serif;
      color: var(--metin);
      font-size: 0.8rem;
    }
    .baslik {
      padding: 0.55rem 0.75rem;
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--metin-soluk);
      border-bottom: 1px solid var(--kenarlik);
    }
    .satir {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.5rem 0.2rem 0.3rem;
      cursor: pointer;
    }
    .satir:hover {
      background: var(--yuzey-hover);
    }
    .satir.secili {
      background: var(--vurgu);
      color: var(--vurgu-metin);
    }
    .ad {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ad code {
      opacity: 0.7;
      font-size: 0.72rem;
    }
    .ikonlar {
      display: flex;
      gap: 1px;
      opacity: 0.85;
    }
    .ikonlar button {
      display: grid;
      place-items: center;
      width: 20px;
      height: 18px;
      padding: 0;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .ikonlar button:hover {
      background: rgba(127, 127, 127, 0.25);
    }
    .ikonlar button.etkin {
      color: var(--vurgu);
      opacity: 1;
    }
    .bos {
      padding: 0.75rem;
      color: var(--metin-soluk);
    }
  `;

  depo!: BelgeDeposu;
  secim!: SecimDeposu;
  gecmis!: KomutGecmisi;

  #depoCoz?: () => void;
  #secimCoz?: () => void;
  #dilCoz?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#depoCoz = this.depo.dinle(() => this.requestUpdate());
    this.#secimCoz = this.secim.dinle(() => this.requestUpdate());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#depoCoz?.();
    this.#secimCoz?.();
    this.#dilCoz?.();
    super.disconnectedCallback();
  }

  private gizliMi(d: Dugum): boolean {
    const s = d.oznitelikler.get('style') ?? '';
    return /display\s*:\s*none/.test(s) || d.oznitelikler.get('display') === 'none';
  }

  private gorunurlukDegistir(d: Dugum): void {
    const belge = this.depo.belge;
    if (!belge) return;
    const yeni = stilAyarla(d.oznitelikler.get('style') ?? null, 'display', this.gizliMi(d) ? '' : 'none');
    this.gecmis.calistir(new OznitelikDegistirKomutu(belge, d, 'style', yeni));
  }

  private kilitDegistir(d: Dugum): void {
    const belge = this.depo.belge;
    if (belge) this.gecmis.calistir(new KilitKomutu(belge, d, !d.kilitli));
  }

  private artboardDegistir(d: Dugum): void {
    const belge = this.depo.belge;
    if (belge) this.gecmis.calistir(new ArtboardKomutu(belge, d, !d.artboard));
  }

  /**
   * Kökün viewBox/ölçü hedefini (köşe minX/minY + genişlik/yükseklik, kullanıcı
   * birimi) okur (TK-23). viewBox öncelikli; yoksa width/height MUTLAK (px/sayısal)
   * değerlerinden. width/height YÜZDE ise (`100%`) koordinat ölçüsü viewport'a bağlı
   * olduğundan hedef BELİRLENEMEZ → null (sahte 100×100 üretme).
   */
  #kokHedef(): { minX: number; minY: number; g: number; y: number } | null {
    const kok = this.depo.belge?.kok;
    if (!kok) return null;
    const vb = kok.oznitelikler.get('viewBox');
    if (vb) {
      const p = vb.trim().split(/[\s,]+/).map(Number);
      if (p.length === 4 && p.every((n) => Number.isFinite(n)) && p[2]! > 0 && p[3]! > 0) {
        return { minX: p[0]!, minY: p[1]!, g: p[2]!, y: p[3]! };
      }
    }
    const g = this.#mutlakSayi(kok.oznitelikler.get('width'));
    const y = this.#mutlakSayi(kok.oznitelikler.get('height'));
    if (g !== null && y !== null && g > 0 && y > 0) return { minX: 0, minY: 0, g, y };
    return null;
  }

  /** Bir öznitelik değerini MUTLAK (yüzde olmayan) sayıya çevirir; yüzde/geçersizse null. */
  #mutlakSayi(deger: string | undefined): number | null {
    if (!deger || /%/.test(deger)) return null; // yüzde → koordinat ölçüsü belirsiz
    const v = parseFloat(deger);
    return Number.isFinite(v) ? v : null;
  }

  /**
   * Artboard ADAYI (TK-23): kökün en alttaki (z-en arka) grafiksel çocuğu, SVG'yi
   * TAM kapsıyorsa. "Tam kapsama" iki yoldan biriyle kabul edilir (kullanıcı isteği):
   *  - **Öznitelik** (`width="100%" height="100%"` gibi YÜZDE ya da viewBox ölçüsüne
   *    eşit sayısal genişlik/yükseklik, köşesi 0/0) — sayısal olmayan değerleri de
   *    yakalar; ya da
   *  - **Render bbox'ı** SVG ölçülerine (~%2 tolerans) uyuyorsa (transform/şekil farkı).
   * Zaten artboard ise null döner ("kaldır" butonu gösterilir).
   */
  #artboardAdayi(): Dugum | null {
    const kok = this.depo.belge?.kok;
    const hedef = this.#kokHedef();
    if (!kok || !hedef) return null;
    // En alttaki (z-en arka) RENDER edilen grafiksel çocuk (tanım/animasyon atlanır).
    const aday = kok.cocuklar.find((c) => ARTBOARD_GRAFIKSEL.has(c.etiket));
    if (!aday || aday.artboard) return null;
    return this.#tamKapsarMi(aday, hedef) ? aday : null;
  }

  /** Aday düğüm SVG'yi tam kapsıyor mu? (öznitelik yüzde/eşit ya da render bbox.) */
  #tamKapsarMi(aday: Dugum, hedef: { minX: number; minY: number; g: number; y: number }): boolean {
    // 1) Öznitelik tabanlı: width/height tam kapsıyor + köşe 0 (sayısaldan bağımsız).
    const oz = (ad: string) => aday.oznitelikler.get(ad);
    if (
      this.#boyutKapsar(oz('width'), hedef.g) &&
      this.#boyutKapsar(oz('height'), hedef.y) &&
      this.#sifirKonum(oz('x')) &&
      this.#sifirKonum(oz('y'))
    ) {
      return true;
    }
    // 2) Render bbox'ı (transform/şekil farkını yakalar; yüzdeyi de çözer). Hem ÖLÇÜ
    //    hem KONUM kontrol edilir → kaymış (örn. y=50) tam-boy-olmayan nesne elenir.
    const el = cizimErisimi.eleman(aday.kimlik);
    if (!(el instanceof SVGGraphicsElement)) return false;
    let bbox: DOMRect;
    try {
      bbox = el.getBBox();
    } catch {
      return false;
    }
    const tg = hedef.g * ARTBOARD_TOLERANS;
    const ty = hedef.y * ARTBOARD_TOLERANS;
    return (
      Math.abs(bbox.width - hedef.g) <= tg &&
      Math.abs(bbox.height - hedef.y) <= ty &&
      Math.abs(bbox.x - hedef.minX) <= tg &&
      Math.abs(bbox.y - hedef.minY) <= ty
    );
  }

  /** Bir genişlik/yükseklik değeri SVG ölçüsünü tam kapsıyor mu? ("100%" ya da ≈hedef). */
  #boyutKapsar(deger: string | undefined, hedef: number): boolean {
    if (!deger) return false;
    const s = deger.trim();
    const yuzde = /^([\d.]+)\s*%$/.exec(s);
    // Yüzde eşiği toleransla tutarlı (≥%98): sayısal/bbox dalıyla aynı sapmayı paylaşır.
    if (yuzde) return parseFloat(yuzde[1]!) >= (1 - ARTBOARD_TOLERANS) * 100;
    const sayi = parseFloat(s);
    return Number.isFinite(sayi) && Math.abs(sayi - hedef) <= hedef * ARTBOARD_TOLERANS;
  }

  /** x/y köşesi başlangıçta (0 ya da yok) mı? (yüzde/px ~0). */
  #sifirKonum(deger: string | undefined): boolean {
    if (!deger) return true; // yok = 0
    const v = parseFloat(deger);
    return Number.isFinite(v) && Math.abs(v) < 1;
  }

  private siraDegistir(ebeveyn: Dugum, d: Dugum, yon: 1 | -1): void {
    const belge = this.depo.belge;
    if (!belge) return;
    const i = ebeveyn.cocuklar.indexOf(d);
    const hedef = i + yon;
    if (hedef < 0 || hedef >= ebeveyn.cocuklar.length) return;
    this.gecmis.calistir(new SiraKomutu(belge, ebeveyn, d, hedef));
  }

  override render() {
    const kok = this.depo.belge?.kok;
    const aday = this.#artboardAdayi();
    return html`
      <div class="baslik">${t('katmanlar.baslik')}</div>
      ${kok
        ? this.#agac(kok, 0, aday)
        : html`<div class="bos">${t('katmanlar.bos')}</div>`}
    `;
  }

  /** Bir ebeveynin çocuklarını TERS sırada (ön üstte) çizer. */
  #agac(ebeveyn: Dugum, derinlik: number, aday: Dugum | null): TemplateResult {
    const cocuklar = ebeveyn.cocuklar.filter((c) => !GIZLI.has(c.etiket));
    return html`${[...cocuklar].reverse().map((c) => this.#satir(ebeveyn, c, derinlik, aday))}`;
  }

  #satir(ebeveyn: Dugum, d: Dugum, derinlik: number, aday: Dugum | null): TemplateResult {
    const id = d.oznitelikler.get('id');
    const secili = this.secim.icindeMi(d);
    const gizli = this.gizliMi(d);
    // Artboard butonu: zaten artboard ise (kaldır) ya da geçerli aday ise (yap).
    const artboardGoster = d.artboard || d === aday;
    return html`
      <div
        class="satir ${secili ? 'secili' : ''}"
        style="padding-left:${0.3 + derinlik * 0.85}rem"
        @click=${() => this.secim.sec(d)}
      >
        <span class="ad">${d.etiket} ${id ? html`<code>#${id}</code>` : ''}</span>
        <span class="ikonlar">
          ${artboardGoster
            ? html`<button
                class=${d.artboard ? 'etkin' : ''}
                title=${d.artboard ? t('katmanlar.artboardKaldir') : t('katmanlar.artboardYap')}
                @click=${(e: Event) => { e.stopPropagation(); this.artboardDegistir(d); }}
              >${ARTBOARD_IKON}</button>`
            : ''}
          <button title=${t('katmanlar.one')} @click=${(e: Event) => { e.stopPropagation(); this.siraDegistir(ebeveyn, d, 1); }}>▲</button>
          <button title=${t('katmanlar.arkaya')} @click=${(e: Event) => { e.stopPropagation(); this.siraDegistir(ebeveyn, d, -1); }}>▼</button>
          <button title=${t('katmanlar.goster')} @click=${(e: Event) => { e.stopPropagation(); this.gorunurlukDegistir(d); }}>${gizli ? GOZ_KAPALI : GOZ}</button>
          <button title=${t('katmanlar.kilit')} @click=${(e: Event) => { e.stopPropagation(); this.kilitDegistir(d); }}>${d.kilitli ? KILITLI : KILITSIZ}</button>
        </span>
      </div>
      ${d.etiket === 'g' ? this.#agac(d, derinlik + 1, aday) : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'katmanlar-paneli': KatmanlarPaneli;
  }
}

// Registry'ye kaydol (İlke 5) — sağ bölge (denetçi ile tanımlar arasında).
panelKayitDefteri.kaydet({
  id: 'katmanlar',
  baslik: 'Katmanlar',
  bolge: 'sag',
  ikon: svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M9 2 16 6 9 10 2 6Z"/><path d="M2.4 9.4 9 13.2 15.6 9.4"/><path d="M2.4 12.6 9 16.4 15.6 12.6"/></svg>`,
  olustur: ({ depo, secim, gecmis }) => {
    const panel = new KatmanlarPaneli();
    panel.depo = depo;
    panel.secim = secim;
    panel.gecmis = gecmis;
    return panel;
  },
});
