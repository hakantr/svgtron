import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/** Açık menüde gösterilen tek bir öğe. */
export interface MenuGorunumOgesi {
  /** Görünen etiket (çevrilmiş). */
  readonly etiket: string;
  /** Üzerine gelince gösterilen ipucu (örn. son dosyanın TAM yolu). */
  readonly ipucu?: string;
  /** İşaretli mi (örn. etkin dil). */
  readonly secili?: boolean;
  /** Varsa alt menü öğeleri (kademeli/cascade menü). */
  readonly altOgeler?: MenuGorunumOgesi[];
  /** Seçilince çalışır (alt menüsü olan öğelerde gerekmez). */
  calistir?(): void | Promise<void>;
}

/**
 * Bir menünün öğelerini çizen, DOĞAL davranan açılır kutu (Tasarım Kararı TK-1).
 *
 * - Zemin üst çubukla aynıdır; üzerine gelinen/odaklanılan öğe yalnızca **hafif
 *   zeminle** vurgulanır (açılır liste içinde alt-çizgi YOK — TK-1).
 * - Üst öğeye bağ, kabuktaki aktif grup butonunun altındaki vurgu çizgisiyle
 *   kurulur (bu bileşende değil).
 * - Alt menüsü olan öğe hover ile açılır; başka öğeye geçince kapanır.
 * - Yaprak öğe seçilince menü ÖNCE kapanır (`kapat`), sonra eylem çalışır —
 *   async eylemlerde (dosya penceresi) menü açık kalmaz.
 */
@customElement("uygulama-menusu")
export class UygulamaMenusu extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-width: 200px;
      background: var(--yuzey);
      border: 1px solid var(--kenarlik);
      border-top: none;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.32);
      -webkit-app-region: no-drag;
      color: var(--metin);
      font-size: 0.85rem;
      padding: 0.25rem 0;
    }
    .oge {
      position: relative;
    }
    button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      padding: 0.4rem 0.85rem;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    button:hover,
    button.odak {
      background: var(--yuzey-hover);
    }
    .iz {
      color: var(--metin-soluk);
    }
    .alt-katman {
      position: absolute;
      top: -0.25rem;
      left: 100%;
      z-index: 1;
    }
    .bos {
      padding: 0.4rem 0.85rem;
      color: var(--metin-soluk);
    }
  `;

  /** Çizilecek öğeler (üst menü tarafından atanır). */
  @property({ attribute: false })
  ogeler: MenuGorunumOgesi[] = [];

  /** Klavye ile odaklanan öğe indisi (-1 = yok). */
  @property({ type: Number })
  odakIndis = -1;

  /** Şu an alt menüsü açık olan öğe (yoksa null). */
  @state() private acikAlt: MenuGorunumOgesi | null = null;

  private sec(oge: MenuGorunumOgesi): void {
    if (oge.altOgeler) {
      this.acikAlt = oge; // alt menülü öğe: tıklayınca da açık tut
      return;
    }
    // Önce menüyü kapat (async eylemde menü açık kalmasın), sonra çalıştır.
    this.dispatchEvent(
      new CustomEvent("kapat", { bubbles: true, composed: true }),
    );
    void oge.calistir?.();
  }

  private uzerineGel(oge: MenuGorunumOgesi): void {
    this.acikAlt = oge.altOgeler ? oge : null;
  }

  override render() {
    if (this.ogeler.length === 0) {
      return html`<div class="bos">—</div>`;
    }
    return html`
      ${this.ogeler.map(
        (oge, indis) => html`
          <div class="oge">
            <button
              class=${indis === this.odakIndis ? "odak" : ""}
              title=${oge.ipucu ?? oge.etiket}
              aria-label=${oge.ipucu ?? oge.etiket}
              @mouseenter=${() => this.uzerineGel(oge)}
              @click=${() => this.sec(oge)}
            >
              <span>${oge.etiket}</span>
              ${oge.altOgeler
                ? html`<span class="iz">▸</span>`
                : oge.secili
                  ? html`<span class="iz">✓</span>`
                  : ""}
            </button>
            ${oge.altOgeler && this.acikAlt === oge
              ? html`
                  <div class="alt-katman">
                    <uygulama-menusu .ogeler=${oge.altOgeler}></uygulama-menusu>
                  </div>
                `
              : ""}
          </div>
        `,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "uygulama-menusu": UygulamaMenusu;
  }
}
