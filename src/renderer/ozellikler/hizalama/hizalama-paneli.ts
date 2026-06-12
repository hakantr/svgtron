import { LitElement, html, css, svg, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { BelgeDeposu } from '../../../cekirdek/belge/belge-deposu';
import type { SecimDeposu } from '../../../cekirdek/secim/secim-deposu';
import type { KomutGecmisi } from '../../../cekirdek/komutlar/komut-gecmisi';
import { panelKayitDefteri } from '../../../cekirdek/registry/panel-registry';
import { menuKayitDefteri, type MenuBaglami } from '../../../cekirdek/registry/menu-registry';
import { dilYonetici, t } from '../../diller/dil';
import { bildirimServisi } from '../../kabuk/bildirim-servisi';
import { hizala, type HizalaModu } from './hizalama';
import { hizalaReferans, type HizalaReferans } from './hizala-referans';

const I = (d: TemplateResult) => svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor">${d}</svg>`;

/** Yol (boole/düzenleme) eylemleri için menü-id → simge. */
const YOL_IKON: Record<string, TemplateResult> = {
  'yol.birlesim': svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor"><circle cx="7" cy="9" r="4.6"/><circle cx="11" cy="9" r="4.6"/></svg>`,
  'yol.fark': svg`<svg viewBox="0 0 18 18" width="16" height="16"><circle cx="7" cy="9" r="4.6" fill="currentColor"/><circle cx="11" cy="9" r="4.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`,
  'yol.kesisim': svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="9" r="4.6"/><circle cx="11" cy="9" r="4.6"/><ellipse cx="9" cy="9" rx="1.5" ry="3.4" fill="currentColor" stroke="none"/></svg>`,
  'yol.disla': svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="9" r="4.6"/><circle cx="11" cy="9" r="4.6"/></svg>`,
  'yol.tersCevir': svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h8.4l-2.2-2.2M3 6l2.2 2.2"/><path d="M15 12H6.6l2.2 2.2M15 12l-2.2-2.2"/></svg>`,
  'yol.basitlestir': svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 12c3-8 5 4 8-2s4-1.5 6-3.5"/><circle cx="2" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="6.5" r="1.3" fill="currentColor" stroke="none"/></svg>`,
};

const IKON: Record<HizalaModu, TemplateResult> = {
  sol: I(svg`<rect x="1" y="2" width="1.4" height="14"/><rect x="3.5" y="4" width="9" height="3" rx="1"/><rect x="3.5" y="11" width="6" height="3" rx="1"/>`),
  'yatay-merkez': I(svg`<rect x="8.3" y="2" width="1.4" height="14"/><rect x="4" y="4" width="10" height="3" rx="1"/><rect x="5.5" y="11" width="7" height="3" rx="1"/>`),
  sag: I(svg`<rect x="15.6" y="2" width="1.4" height="14"/><rect x="5.5" y="4" width="9" height="3" rx="1"/><rect x="8.5" y="11" width="6" height="3" rx="1"/>`),
  ust: I(svg`<rect x="2" y="1" width="14" height="1.4"/><rect x="4" y="3.5" width="3" height="9" rx="1"/><rect x="11" y="3.5" width="3" height="6" rx="1"/>`),
  'dikey-orta': I(svg`<rect x="2" y="8.3" width="14" height="1.4"/><rect x="4" y="4" width="3" height="10" rx="1"/><rect x="11" y="5.5" width="3" height="7" rx="1"/>`),
  alt: I(svg`<rect x="2" y="15.6" width="14" height="1.4"/><rect x="4" y="5.5" width="3" height="9" rx="1"/><rect x="11" y="8.5" width="3" height="6" rx="1"/>`),
  'dagit-yatay': I(svg`<rect x="1" y="6" width="3" height="6" rx="1"/><rect x="7.5" y="6" width="3" height="6" rx="1"/><rect x="14" y="6" width="3" height="6" rx="1"/>`),
  'dagit-dikey': I(svg`<rect x="6" y="1" width="6" height="3" rx="1"/><rect x="6" y="7.5" width="6" height="3" rx="1"/><rect x="6" y="14" width="6" height="3" rx="1"/>`),
};

const MODLAR: HizalaModu[] = ['sol', 'yatay-merkez', 'sag', 'ust', 'dikey-orta', 'alt', 'dagit-yatay', 'dagit-dikey'];

/** Referans tercihi seçenekleri (§9.2). */
const REFERANSLAR: HizalaReferans[] = ['son-secilen', 'anahtar', 'secim', 'belge'];

/**
 * Hizalama paneli (§9.2) — ≥2 nesne seçiliyken hizala/dağıt düğmeleri. Sonuç tek
 * Command (İlke 2). 2'den az seçimde gizlenir.
 */
@customElement('hizalama-paneli')
export class HizalamaPaneli extends LitElement {
  static override styles = css`
    :host {
      display: block;
      flex: 0 0 auto;
      color: var(--metin);
    }
    .satir {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      padding: 0.35rem 0.5rem;
      border-bottom: 1px solid var(--kenarlik);
    }
    .ayrac {
      width: 1px;
      align-self: stretch;
      margin: 0 3px;
      background: var(--kenarlik);
    }
    button {
      display: grid;
      place-items: center;
      width: 26px;
      height: 24px;
      border: 1px solid transparent;
      border-radius: 5px;
      background: transparent;
      color: var(--metin-soluk);
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .referans {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.5rem;
      border-bottom: 1px solid var(--kenarlik);
    }
    .referans label {
      font-size: 0.72rem;
      color: var(--metin-soluk);
      white-space: nowrap;
    }
    .referans select {
      flex: 1;
      min-width: 0;
      font: inherit;
      font-size: 0.76rem;
      color: var(--metin);
      background: var(--yuzey-2);
      border: 1px solid var(--kenarlik);
      border-radius: 5px;
      padding: 0.16rem 0.3rem;
      cursor: pointer;
    }
  `;

  depo!: BelgeDeposu;
  secim!: SecimDeposu;
  gecmis!: KomutGecmisi;

  #secimCoz?: () => void;
  #dilCoz?: () => void;
  #refCoz?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#secimCoz = this.secim.dinle(() => this.requestUpdate());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
    this.#refCoz = hizalaReferans.dinle(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#secimCoz?.();
    this.#dilCoz?.();
    this.#refCoz?.();
    super.disconnectedCallback();
  }

  private uygula(mod: HizalaModu): void {
    const belge = this.depo.belge;
    if (!belge) return;
    const k = hizala(belge, this.secim, mod);
    if (k) this.gecmis.calistir(k);
  }

  /** Yol eylemleri için menü bağlamı (hatalar/uyarılar toast'a gider, TK-14). */
  get #menuBaglami(): MenuBaglami {
    return {
      depo: this.depo,
      secim: this.secim,
      gecmis: this.gecmis,
      hataBildir: (m) => bildirimServisi.bildir(m, 'hata'),
    };
  }

  /** Menü registry'sindeki 'yol' grubu ögeleri (yeni eklenen otomatik belirir). */
  #yolOgeleri() {
    return menuKayitDefteri.gruplar().find((g) => g.grup === 'yol')?.ogeler ?? [];
  }

  override render() {
    const n = this.secim.secililer.length;
    // Yol (boole/birleştir/kırpma...) işlemleri yol geometrisi üzerinde çalışır;
    // bir GRUP seçiliyken anlamsızdır → pasif (kullanıcı isteği).
    const grupVar = this.secim.secililer.some((d) => d.etiket === 'g');
    const yol = this.#yolOgeleri();
    return html`
      <div class="referans" title=${t('hizala.referans.ipucu')}>
        <label>${t('hizala.referans')}</label>
        <select
          .value=${hizalaReferans.mod}
          @change=${(e: Event) =>
            hizalaReferans.ayarla((e.target as HTMLSelectElement).value as HizalaReferans)}
        >
          ${REFERANSLAR.map(
            (r) => html`<option value=${r} ?selected=${hizalaReferans.mod === r}>
              ${t(`hizala.ref.${r}`)}
            </option>`,
          )}
        </select>
      </div>
      <div class="satir">
        ${MODLAR.map(
          (mod, i) => html`
            ${i === 3 || i === 6 ? html`<span class="ayrac"></span>` : ''}
            <button
              title=${t(`hizala.${mod}`)}
              ?disabled=${n < 2 || (mod.startsWith('dagit') && n < 3)}
              @click=${() => this.uygula(mod)}
            >
              ${IKON[mod]}
            </button>
          `,
        )}
      </div>
      ${yol.length
        ? html`<div class="satir">
            ${yol.map(
              (oge) => html`
                <button
                  title=${t(oge.etiketAnahtari)}
                  ?disabled=${n < 1 || grupVar}
                  @click=${() => void oge.calistir(this.#menuBaglami)}
                >
                  ${YOL_IKON[oge.id] ??
                  svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor"><circle cx="9" cy="9" r="3"/></svg>`}
                </button>
              `,
            )}
          </div>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hizalama-paneli': HizalamaPaneli;
  }
}

panelKayitDefteri.kaydet({
  id: 'hizalama',
  baslik: 'Hizalama',
  bolge: 'sag',
  ikon: svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor"><rect x="2" y="2" width="1.4" height="14"/><rect x="4.5" y="4" width="9" height="3" rx="1"/><rect x="4.5" y="11" width="6" height="3" rx="1"/></svg>`,
  olustur: ({ depo, secim, gecmis }) => {
    const panel = new HizalamaPaneli();
    panel.depo = depo;
    panel.secim = secim;
    panel.gecmis = gecmis;
    return panel;
  },
});
