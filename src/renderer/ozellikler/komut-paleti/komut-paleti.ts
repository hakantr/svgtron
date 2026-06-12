import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { panelKayitDefteri } from '../../../cekirdek/registry/panel-registry';
import { menuKayitDefteri, type MenuBaglami } from '../../../cekirdek/registry/menu-registry';
import type { BelgeDeposu } from '../../../cekirdek/belge/belge-deposu';
import type { SecimDeposu } from '../../../cekirdek/secim/secim-deposu';
import type { KomutGecmisi } from '../../../cekirdek/komutlar/komut-gecmisi';
import { aracKayitDefteri, aracDeposu } from '../../araclar/arac';
import { dilYonetici, t } from '../../diller/dil';
import { bildirimServisi } from '../../kabuk/bildirim-servisi';
import { komutPaletiDeposu } from './komut-paleti-deposu';

/** Palette'te aranıp çalıştırılabilen tek bir eylem. */
interface PaletEylem {
  readonly id: string;
  readonly etiket: string;
  readonly ipucu: string;
  calistir(): void | Promise<void>;
}

const trKucuk = (s: string): string => s.toLocaleLowerCase('tr');

/**
 * Komut Paleti (CLAUDE.md §11.3) — Ctrl/Cmd+K ile açılır; tüm kayıtlı araçları ve
 * menü eylemlerini arayıp çalıştırır. **Görünüm durumudur** (undo'ya girmez); bir
 * eylemi tetiklediğinde o eylem kendi Command'ını üretir (İlke 9).
 *
 * Eylemler registry'lerden toplanır (İlke 5) — palette hiçbir özelliği bilmez,
 * yalnız `arac`/`menu` kayıt defterlerini okur. Yeni araç/menü ögesi otomatik
 * olarak palette'te belirir; bu dosya değişmez.
 *
 * Panel registry'sine kaydolur ama tam-ekran `position: fixed` bindirme olarak
 * çizilir → kabuk/bölge düzeni değişmez (İlke 5).
 */
@customElement('komut-paleti')
export class KomutPaleti extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: none;
      pointer-events: none;
    }
    :host([acik]) {
      display: block;
      pointer-events: auto;
    }
    .perde {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.32);
    }
    .kutu {
      position: absolute;
      top: 46px; /* Üst Çubuğun hemen altından açılır (titlebar arama kutusu) */
      left: 50%;
      transform: translateX(-50%);
      width: min(560px, 92vw);
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      background: var(--yuzey, #fff);
      color: var(--metin);
      border: 1px solid var(--kenarlik);
      border-radius: 10px;
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }
    .giris {
      font: inherit;
      font-size: 1rem;
      padding: 0.8rem 0.9rem;
      border: 0;
      border-bottom: 1px solid var(--kenarlik);
      background: transparent;
      color: var(--metin);
      outline: none;
    }
    .liste {
      list-style: none;
      margin: 0;
      padding: 0.3rem;
      overflow-y: auto;
    }
    .oge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      padding: 0.5rem 0.6rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .oge.sec {
      background: var(--vurgu, #4a90e2);
      color: var(--vurgu-metin, #fff);
    }
    .oge .ipucu {
      font-size: 0.74rem;
      opacity: 0.7;
    }
    .bos {
      padding: 1rem 0.9rem;
      color: var(--metin-soluk);
      font-size: 0.85rem;
    }
  `;

  depo!: BelgeDeposu;
  secim!: SecimDeposu;
  gecmis!: KomutGecmisi;

  @state() private acik = false;
  @state() private sorgu = '';
  @state() private indis = 0;
  @query('.giris') private giris?: HTMLInputElement;

  #dilCoz?: () => void;

  /** Menü eylemleri için bağlam (PanelBaglami'de hataBildir yok; servise yönlendirilir). */
  get #menuBaglami(): MenuBaglami {
    return {
      depo: this.depo,
      secim: this.secim,
      gecmis: this.gecmis,
      hataBildir: (m) => bildirimServisi.bildir(m, 'hata'),
    };
  }

  #depoCoz?: () => void;
  /** Açılmadan önceki odak — Esc/kapanışta geri verilir (§11.3, 11.a). */
  #oncekiOdak: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.#kisayol, true);
    this.#dilCoz = dilYonetici.dinle(() => this.requestUpdate());
    // Aç/kapat tek kaynaktan: titlebar arama kutusu da Ctrl+K de bu depoyu yazar.
    this.#depoCoz = komutPaletiDeposu.dinle(() => this.#senkron());
  }
  override disconnectedCallback(): void {
    window.removeEventListener('keydown', this.#kisayol, true);
    this.#dilCoz?.();
    this.#depoCoz?.();
    super.disconnectedCallback();
  }

  /** Ctrl/Cmd+K: aç/kapat (global, yakalama fazında) — depo üzerinden. */
  readonly #kisayol = (olay: KeyboardEvent): void => {
    if ((olay.ctrlKey || olay.metaKey) && trKucuk(olay.key) === 'k') {
      olay.preventDefault();
      komutPaletiDeposu.degistir();
    }
  };

  /** Tüm kayıtlı araç + menü eylemleri (registry'den; İlke 5). */
  private eylemler(): PaletEylem[] {
    const araclar: PaletEylem[] = aracKayitDefteri.hepsi().map((a) => ({
      id: `arac:${a.id}`,
      etiket: t(a.etiketAnahtari),
      ipucu: t('komutpalet.arac'),
      calistir: () => aracDeposu.ayarla(a.id),
    }));
    const menuler: PaletEylem[] = menuKayitDefteri.gruplar().flatMap((g) =>
      g.ogeler.map((oge) => ({
        id: `menu:${oge.id}`,
        etiket: t(oge.etiketAnahtari),
        ipucu: t(`menu.grup.${g.grup}`),
        calistir: () => oge.calistir(this.#menuBaglami),
      })),
    );
    return [...araclar, ...menuler];
  }

  private suzulmus(): PaletEylem[] {
    const q = trKucuk(this.sorgu.trim());
    const hepsi = this.eylemler();
    if (!q) return hepsi;
    return hepsi.filter((e) => trKucuk(e.etiket).includes(q) || trKucuk(e.ipucu).includes(q));
  }

  /** Depo durumunu uygular: aç→odağı kaydet+girişe odaklan; kapat→odağı geri ver. */
  #senkron(): void {
    const yeni = komutPaletiDeposu.acikMi;
    if (yeni === this.acik) return;
    if (yeni) {
      this.#oncekiOdak = (document.activeElement as HTMLElement) ?? null;
      this.acik = true;
      this.sorgu = '';
      this.indis = 0;
      this.toggleAttribute('acik', true);
      void this.updateComplete.then(() => this.giris?.focus());
    } else {
      this.acik = false;
      this.toggleAttribute('acik', false);
      const odak = this.#oncekiOdak;
      this.#oncekiOdak = null;
      odak?.focus?.();
    }
    this.requestUpdate();
  }

  private kapat(): void {
    komutPaletiDeposu.ayarla(false);
  }

  private async sec(eylem: PaletEylem | undefined): Promise<void> {
    if (!eylem) return;
    this.kapat();
    await eylem.calistir();
  }

  private girisKlavye(olay: KeyboardEvent): void {
    const liste = this.suzulmus();
    switch (olay.key) {
      case 'Escape':
        olay.preventDefault();
        this.kapat();
        break;
      case 'ArrowDown':
        olay.preventDefault();
        this.indis = Math.min(this.indis + 1, liste.length - 1);
        break;
      case 'ArrowUp':
        olay.preventDefault();
        this.indis = Math.max(this.indis - 1, 0);
        break;
      case 'Enter':
        olay.preventDefault();
        void this.sec(liste[this.indis]);
        break;
    }
  }

  private girisDegisti(olay: Event): void {
    this.sorgu = (olay.target as HTMLInputElement).value;
    this.indis = 0;
  }

  override render() {
    if (!this.acik) return html``;
    const liste = this.suzulmus();
    return html`
      <div class="perde" @pointerdown=${() => this.kapat()}></div>
      <div class="kutu" role="dialog" aria-modal="true">
        <input
          class="giris"
          type="text"
          placeholder=${t('komutpalet.ara')}
          .value=${this.sorgu}
          @input=${this.girisDegisti}
          @keydown=${this.girisKlavye}
        />
        ${liste.length === 0
          ? html`<div class="bos">${t('komutpalet.bos')}</div>`
          : html`
              <ul class="liste">
                ${liste.map(
                  (e, i) => html`
                    <li
                      class="oge ${i === this.indis ? 'sec' : ''}"
                      @pointerenter=${() => (this.indis = i)}
                      @click=${() => this.sec(e)}
                    >
                      <span class="etiket">${e.etiket}</span>
                      <span class="ipucu">${e.ipucu}</span>
                    </li>
                  `,
                )}
              </ul>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'komut-paleti': KomutPaleti;
  }
}

panelKayitDefteri.kaydet({
  id: 'komut-paleti',
  baslik: 'Komut Paleti',
  bolge: 'merkez',
  olustur: ({ depo, secim, gecmis }) => {
    const p = new KomutPaleti();
    p.depo = depo;
    p.secim = secim;
    p.gecmis = gecmis;
    return p;
  },
});
