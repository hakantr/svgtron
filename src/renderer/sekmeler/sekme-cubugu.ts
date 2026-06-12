import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { sekmeYoneticisi } from './sekme-yoneticisi';
import { dilYonetici, t } from '../diller/dil';

/**
 * Sekme çubuğu (çoklu belge) — Tuval'in üstünde açık belgeleri listeler. Aktif
 * sekme vurgulanır; tıklayınca o belgeye geçilir (tüm kontroller aktif sekmede
 * çalışır). Her sekmede dosya adı, kaydedilmemiş-değişiklik noktası ve kapat (×).
 *
 * Görünüm durumudur (İlke 9). Kapatma kaydetme sorusu gerektirebildiğinden kabuğa
 * `sekme-kapat` olayıyla devredilir; "+" ise `sekme-yeni` olayı yollar.
 */
@customElement('sekme-cubugu')
export class SekmeCubugu extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      align-items: stretch;
      gap: 2px;
      padding: 4px 4px 0;
      background: var(--yuzey);
      border-bottom: 1px solid var(--kenarlik);
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .sekme {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      max-width: 200px;
      padding: 0.3rem 0.5rem 0.3rem 0.7rem;
      border: 1px solid var(--kenarlik);
      border-bottom: none;
      border-radius: 7px 7px 0 0;
      background: transparent;
      color: var(--metin-soluk);
      font-size: 0.8rem;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
    }
    .sekme:hover {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    .sekme.aktif {
      background: var(--zemin);
      color: var(--metin);
      border-color: var(--kenarlik);
    }
    .ad {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nokta {
      width: 7px;
      height: 7px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--vurgu, #4a90e2);
    }
    .kapat {
      display: grid;
      place-items: center;
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      font-size: 0.9rem;
      line-height: 1;
      cursor: pointer;
    }
    .kapat:hover {
      background: rgba(127, 127, 127, 0.3);
    }
    .yeni {
      display: grid;
      place-items: center;
      width: 28px;
      flex: 0 0 auto;
      align-self: center;
      margin-left: 2px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--metin-soluk);
      font-size: 1rem;
      cursor: pointer;
    }
    .yeni:hover {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
  `;

  #sekmeCoz?: () => void;
  #belgeCoz?: () => void;
  #dilCoz?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#sekmeCoz = sekmeYoneticisi.dinle(() => this.requestUpdate());
    // Aktif belgenin değişimi (komut → kaydedilmemiş işaret, ad) → çubuğu tazele.
    this.#belgeCoz = sekmeYoneticisi.belge.dinle(() => this.requestUpdate());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#sekmeCoz?.();
    this.#belgeCoz?.();
    this.#dilCoz?.();
    super.disconnectedCallback();
  }

  #kapat(indis: number, olay: Event): void {
    olay.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('sekme-kapat', { detail: indis, bubbles: true, composed: true }),
    );
  }

  override render() {
    const aktif = sekmeYoneticisi.aktifIndis;
    return html`
      ${sekmeYoneticisi.sekmeler.map((s, i) => {
        const ad = s.belge.kaynak?.ad ?? t('sekme.adsiz');
        return html`
          <div
            class="sekme ${i === aktif ? 'aktif' : ''}"
            title=${s.belge.kaynak?.yol ?? ad}
            @click=${() => sekmeYoneticisi.aktifSec(i)}
          >
            ${s.belge.degisti ? html`<span class="nokta" title=${t('sekme.degisti')}></span>` : ''}
            <span class="ad">${ad}</span>
            <button class="kapat" title=${t('sekme.kapat')} @click=${(e: Event) => this.#kapat(i, e)}>
              ×
            </button>
          </div>
        `;
      })}
      <button
        class="yeni"
        title=${t('sekme.yeni')}
        @click=${() =>
          this.dispatchEvent(new CustomEvent('sekme-yeni', { bubbles: true, composed: true }))}
      >
        +
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sekme-cubugu': SekmeCubugu;
  }
}
