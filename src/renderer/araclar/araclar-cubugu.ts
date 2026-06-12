import { LitElement, html, css, svg } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { panelKayitDefteri } from '../../cekirdek/registry/panel-registry';
import { aracKayitDefteri, aracDeposu } from './arac';
import { dilYonetici, t } from '../diller/dil';

/** Ok tıklamasında kaydırma miktarı (px ≈ birkaç araç). */
const KAYDIRMA_ADIMI = 150;

const OK_YUKARI = svg`<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10 8 6l4 4"/></svg>`;
const OK_ASAGI = svg`<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`;

/**
 * Araçlar çubuğu (SOL bölge, §9.1/9.2) — registry'deki araçları TEK SÜTUN, sıkışık
 * dikey liste olarak gösterir; aktif araç vurgulanır (İlke 5). Yeni araç = yeni kayıt.
 *
 * Pencere yüksekliği yetmezse ikinci sütuna GEÇMEZ (kullanıcı isteği): liste dikey
 * KAYDIRILABİLİR olur. Taşma yönünde alt/üst **kaydırma oku** belirir (tıkla → kaydır);
 * fare tekerleği de listeyi kaydırır (native `overflow`). Scrollbar gizlenir (oklar var).
 */
@customElement('araclar-cubugu')
export class AraclarCubugu extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
      position: relative; /* oklar absolute overlay (liste yüksekliğini etkilemesin) */
    }
    /* Kaydırma okları — liste ÜZERİNE absolute overlay; görünür/gizli olmaları
       listenin yüksekliğini DEĞİŞTİRMEZ (aksi halde ResizeObserver geri-beslemesi
       sınır durumunda titreşim yaratırdı — inceleme bulgusu). */
    .ok {
      position: absolute;
      left: 4px;
      right: 4px;
      z-index: 1;
      display: grid;
      place-items: center;
      height: 16px;
      border: 0;
      border-radius: 5px;
      background: var(--yuzey);
      color: var(--metin-soluk);
      cursor: pointer;
    }
    .ok.ust {
      top: 2px;
      box-shadow: 0 3px 5px rgba(0, 0, 0, 0.16);
    }
    .ok.alt {
      bottom: 2px;
      box-shadow: 0 -3px 5px rgba(0, 0, 0, 0.16);
    }
    .ok:hover {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    .ok[hidden] {
      display: none;
    }
    /* Kaydırılabilir araç listesi — sıkışık tek sütun; scrollbar gizli (oklar var). */
    .liste {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: 4px 5px;
      scrollbar-width: none;
    }
    .liste::-webkit-scrollbar {
      display: none;
    }
    button.arac {
      flex: 0 0 auto;
      width: 24px;
      height: 24px;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--metin-soluk);
      cursor: pointer;
      transition: background 0.12s ease;
    }
    /* İkon tam ortalansın: block (inline-SVG baseline boşluğunu kaldırır) + sabit
       boyut; taşma görünür ki kırpılıp kaymış görünmesin. */
    button.arac svg {
      display: block;
      width: 16px;
      height: 16px;
      overflow: visible;
    }
    button.arac:hover {
      background: var(--yuzey-hover);
      color: var(--metin);
    }
    button.arac.etkin {
      background: var(--vurgu);
      color: var(--vurgu-metin);
    }
  `;

  /** Üst/alt yönde kaydırma okları görünür mü (o yönde taşma var mı)? */
  @state() private ustOk = false;
  @state() private altOk = false;
  @query('.liste') private liste?: HTMLElement;

  #aracCoz?: () => void;
  #dilCoz?: () => void;
  #gozlemci?: ResizeObserver;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#aracCoz = aracDeposu.dinle(() => this.requestUpdate());
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
  }

  override firstUpdated(): void {
    // Liste/host boyutu değişince (pencere yüksekliği) ok durumunu tazele. (İlk ok
    // durumu, aynı boyama döngüsünde çalışan updated() tarafından kurulur.)
    this.#gozlemci = new ResizeObserver(() => this.#okDurum());
    if (this.liste) this.#gozlemci.observe(this.liste);
  }

  override disconnectedCallback(): void {
    this.#aracCoz?.();
    this.#dilCoz?.();
    this.#gozlemci?.disconnect();
    super.disconnectedCallback();
  }

  override updated(): void {
    this.#okDurum();
  }

  /** Kaydırma konumuna göre üst/alt ok görünürlüğünü günceller. */
  #okDurum(): void {
    const el = this.liste;
    if (!el) return;
    // 2px tolerans: sub-piksel / zoom (110-125%) yuvarlama farkında uçta titremesin.
    const ust = el.scrollTop > 2;
    const alt = Math.ceil(el.scrollTop + el.clientHeight) < el.scrollHeight - 2;
    if (ust !== this.ustOk) this.ustOk = ust;
    if (alt !== this.altOk) this.altOk = alt;
  }

  /** Listeyi yön'e doğru bir adım kaydırır (yumuşak). */
  #kaydir(yon: 1 | -1): void {
    this.liste?.scrollBy({ top: yon * KAYDIRMA_ADIMI, behavior: 'smooth' });
  }

  override render() {
    return html`
      <button
        class="ok ust"
        ?hidden=${!this.ustOk}
        title=${t('araclar.yukariKaydir')}
        aria-label=${t('araclar.yukariKaydir')}
        @click=${() => this.#kaydir(-1)}
      >
        ${OK_YUKARI}
      </button>
      <div class="liste" @scroll=${() => this.#okDurum()}>
        ${aracKayitDefteri.hepsi().map(
          (arac) => html`
            <button
              class="arac ${aracDeposu.aktifId === arac.id ? 'etkin' : ''}"
              title=${t(arac.etiketAnahtari)}
              aria-label=${t(arac.etiketAnahtari)}
              @click=${() => aracDeposu.ayarla(arac.id)}
            >
              ${arac.ikon}
            </button>
          `,
        )}
      </div>
      <button
        class="ok alt"
        ?hidden=${!this.altOk}
        title=${t('araclar.asagiKaydir')}
        aria-label=${t('araclar.asagiKaydir')}
        @click=${() => this.#kaydir(1)}
      >
        ${OK_ASAGI}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'araclar-cubugu': AraclarCubugu;
  }
}

// Registry'ye kaydol (İlke 5) — sol bölge (Araçlar).
panelKayitDefteri.kaydet({
  id: 'araclar',
  baslik: 'Araçlar',
  bolge: 'sol',
  olustur: () => new AraclarCubugu(),
});
