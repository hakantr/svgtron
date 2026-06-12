import { LitElement, html, css, svg } from "lit";
import { customElement } from "lit/decorators.js";
import type { KomutGecmisi } from "../../../cekirdek/komutlar/komut-gecmisi";
import { panelKayitDefteri } from "../../../cekirdek/registry/panel-registry";
import { dilYonetici, t } from "../../diller/dil";

/**
 * Geçmiş paneli (AGENTS.md §11.3) — birleşik geçmişin görsel zaman çizelgesi.
 * Her satır ya bir DÜZENLEME adımı (belge Command'ı, İlke 2) ya da bir SEÇİM adımı
 * (§9.6 d) olabilir; seçim adımları soluk/italik gösterilerek ayrılır. Tıklamak o
 * duruma gider (geri/ileri al). Geri-alınmış adımlar ayrıca soluk gösterilir.
 *
 * Görünüm durumudur (İlke 9): panel belgeyi değiştirmez, yalnız geçmişte gezer;
 * gerçek değişiklik yine Command/seçim katmanında olur.
 */
@customElement("gecmis-paneli")
export class GecmisPaneli extends LitElement {
  static override styles = css`
    :host {
      /* Sağ ray'da tek panel açık (Y7) → tüm sağ içerik alanını DOLDUR. */
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      color: var(--metin);
    }
    .baslik {
      flex: 0 0 auto;
      padding: 0.45rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--metin-soluk);
      border-bottom: 1px solid var(--kenarlik);
    }
    .liste {
      list-style: none;
      margin: 0;
      padding: 0 0.35rem 0.4rem;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.5rem;
      border-radius: 5px;
      font-size: 0.82rem;
      cursor: pointer;
    }
    li:hover {
      background: var(--yuzey-hover);
    }
    li.aktif {
      background: var(--vurgu, #4a90e2);
      color: var(--vurgu-metin, #fff);
    }
    li.ileri {
      opacity: 0.45;
    }
    li.secim:not(.aktif) {
      color: var(--metin-soluk);
      font-style: italic;
    }
    .nokta {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.6;
      flex: 0 0 auto;
    }
    .bos {
      padding: 0.4rem 0.7rem 0.6rem;
      color: var(--metin-soluk);
      font-size: 0.8rem;
    }
  `;

  gecmis!: KomutGecmisi;

  #gecmisCoz?: () => void;
  #dilCoz?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#gecmisCoz = this.gecmis.dinle(() => this.requestUpdate());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#gecmisCoz?.();
    this.#dilCoz?.();
    super.disconnectedCallback();
  }

  private git(hedef: number): void {
    this.gecmis.konumaGit(hedef);
  }

  override render() {
    const girisler = this.gecmis.girisler();
    const konum = this.gecmis.konum;
    return html`
      <div class="baslik">${t("gecmis.baslik")}</div>
      ${girisler.length === 0
        ? html`<div class="bos">${t("gecmis.bos")}</div>`
        : html`
            <ul class="liste">
              <li
                class=${konum === 0 ? "aktif" : ""}
                @click=${() => this.git(0)}
              >
                <span class="nokta"></span>${t("gecmis.baslangic")}
              </li>
              ${girisler.map(
                (g, i) => html`
                  <li
                    class="${g.uygulandi ? "" : "ileri"} ${konum === i + 1
                      ? "aktif"
                      : ""} ${g.tur === "secim" ? "secim" : ""}"
                    @click=${() => this.git(i + 1)}
                  >
                    <span class="nokta"></span>${g.etiket}
                  </li>
                `,
              )}
            </ul>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "gecmis-paneli": GecmisPaneli;
  }
}

panelKayitDefteri.kaydet({
  id: "gecmis",
  baslik: "Geçmiş",
  bolge: "sag",
  ikon: svg`<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 9a5.6 5.6 0 1 1 1.7 4"/><path d="M2.8 12.9 3.2 9.3 6.8 9.7"/><path d="M9 5.6V9l2.3 1.4"/></svg>`,
  olustur: ({ gecmis }) => {
    const panel = new GecmisPaneli();
    panel.gecmis = gecmis;
    return panel;
  },
});
