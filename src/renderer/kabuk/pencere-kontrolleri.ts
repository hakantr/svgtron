import { LitElement, html, css, svg } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { dilYonetici, t } from '../diller/dil';

/**
 * Özel pencere kontrol tuşları (çerçevesiz pencere).
 *
 * Yalnızca Windows/Linux'ta kullanılır; macOS'ta yerel trafik-ışıkları görünür
 * kaldığı için kabuk bu bileşeni macOS'ta yerleştirmez. Tuşlar köprü üzerinden
 * (İlke 4) ana sürece komut iletir; pencere nesnesine doğrudan erişmez.
 */
@customElement('pencere-kontrolleri')
export class PencereKontrolleri extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      -webkit-app-region: no-drag;
      height: 100%;
    }
    button {
      width: 44px;
      height: 100%;
      display: grid;
      place-items: center;
      border: 0;
      background: transparent;
      color: var(--metin-soluk);
      cursor: pointer;
      transition:
        background 0.12s ease,
        color 0.12s ease;
    }
    button:hover {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    button.kapat:hover {
      background: #e81123;
      color: #fff;
    }
    svg {
      width: 10px;
      height: 10px;
    }
  `;

  @state() private kaplandi = false;

  #dilCoz?: () => void;
  #durumCoz?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
    this.#durumCoz = window.api.pencereDurumunaAbone((k) => (this.kaplandi = k));
    void window.api.pencereKaplandiMi().then((k) => (this.kaplandi = k));
  }

  override disconnectedCallback(): void {
    this.#dilCoz?.();
    this.#durumCoz?.();
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <button
        title=${t('pencere.simgelestir')}
        @click=${() => window.api.pencereSimgelestir()}
      >
        ${svg`<svg viewBox="0 0 10 10"><path d="M0 5 h10" stroke="currentColor" stroke-width="1" /></svg>`}
      </button>

      <button
        title=${this.kaplandi ? t('pencere.geriAl') : t('pencere.kapla')}
        @click=${() => window.api.pencereBuyutGeriAl()}
      >
        ${this.kaplandi
          ? svg`<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1">
              <rect x="0.5" y="2.5" width="6" height="6" />
              <path d="M2.5 2.5 V0.5 H8.5 V6.5 H6.5" />
            </svg>`
          : svg`<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>`}
      </button>

      <button
        class="kapat"
        title=${t('pencere.kapat')}
        @click=${() => window.api.pencereKapat()}
      >
        ${svg`<svg viewBox="0 0 10 10" stroke="currentColor" stroke-width="1"><path d="M0 0 L10 10 M10 0 L0 10" /></svg>`}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pencere-kontrolleri': PencereKontrolleri;
  }
}
