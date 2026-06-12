/**
 * SVG `path` `d` ayrıştırıcı/yazıcı (AGENTS.md İlke 1 — Electron'dan habersiz, saf).
 *
 * Düğüm aracı için `d` dizesini **mutlak, normalize** segmentlere çevirir:
 * - Bağıl komutlar mutlağa çevrilir.
 * - `H`/`V` → `L`; `S` → `C` (önceki kontrolü yansıtarak); `T` → `Q` (yansıtarak).
 * - `C`/`Q`/`A`/`M`/`L`/`Z` korunur (geometri birebir; yay yaklaşımı YOK).
 *
 * Böylece düzenleme tek tip (segment) üzerinden yapılır ve geri yazım kayıpsızdır
 * (yalnız temsil mutlağa normalize olur — geometri aynıdır, tek Command).
 */

export interface Nokta {
  x: number;
  y: number;
}

export type Segment =
  | { tip: "M"; p: Nokta }
  | { tip: "L"; p: Nokta }
  | { tip: "C"; c1: Nokta; c2: Nokta; p: Nokta }
  | { tip: "Q"; c: Nokta; p: Nokta }
  | {
      tip: "A";
      rx: number;
      ry: number;
      donus: number;
      buyukYay: boolean;
      suzme: boolean;
      p: Nokta;
    }
  | { tip: "Z" };

/** Sayı/komut/bayrak okuyan basit tarayıcı (SVG path dilbilgisi). */
class Tarayici {
  private i = 0;
  constructor(private readonly s: string) {}

  private ayiricilariGec(): void {
    while (this.i < this.s.length) {
      const c = this.s[this.i]!;
      if (
        c === " " ||
        c === "," ||
        c === "\t" ||
        c === "\n" ||
        c === "\r" ||
        c === "\f"
      )
        this.i++;
      else break;
    }
  }

  /** Daha okunacak (ayırıcı-dışı) içerik var mı? */
  daha(): boolean {
    this.ayiricilariGec();
    return this.i < this.s.length;
  }

  /** Sıradaki karakter bir komut harfiyse onu tüketip döndürür; değilse null. */
  komut(): string | null {
    this.ayiricilariGec();
    const c = this.s[this.i];
    if (c && /[a-zA-Z]/.test(c)) {
      this.i++;
      return c;
    }
    return null;
  }

  /** Sıradaki sayıyı okur (işaret/ondalık/üs dâhil). */
  sayi(): number {
    this.ayiricilariGec();
    const kalan = this.s.slice(this.i);
    const m = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(kalan);
    if (!m)
      throw new Error(
        `Geçersiz path sayısı @${this.i}: "${kalan.slice(0, 12)}"`,
      );
    this.i += m[0].length;
    return parseFloat(m[0]);
  }

  /** Yay bayrağı: tek karakter '0' veya '1' (ayırıcısız olabilir). */
  bayrak(): boolean {
    this.ayiricilariGec();
    const c = this.s[this.i];
    if (c !== "0" && c !== "1")
      throw new Error(`Geçersiz yay bayrağı @${this.i}: "${c}"`);
    this.i++;
    return c === "1";
  }
}

/** Bir noktayı bir merkez etrafında yansıtır (S/T kontrol türetimi). */
function yansit(kontrol: Nokta, merkez: Nokta): Nokta {
  return { x: 2 * merkez.x - kontrol.x, y: 2 * merkez.y - kontrol.y };
}

/** `d` dizesini mutlak, normalize segment listesine çevirir. */
export function yoluAyristir(d: string): Segment[] {
  const segs: Segment[] = [];
  const tr = new Tarayici(d);
  let cur: Nokta = { x: 0, y: 0 };
  let basla: Nokta = { x: 0, y: 0 };
  let sonKomut = "";
  let sonKontrol: Nokta | null = null;
  let komut = "";

  while (tr.daha()) {
    const yeni = tr.komut();
    if (yeni) {
      komut = yeni;
    } else {
      if (!komut) break;
      // Z/z argümansızdır: yeni komut harfi yokken başıboş bir token gelirse
      // hiçbir karakter tüketilmez → sonsuz döngü olur. Burada güvenle dur.
      if (komut.toUpperCase() === "Z") break;
      // örtük tekrar: M→L, m→l; diğerleri aynı komutu sürdürür.
      if (komut === "M") komut = "L";
      else if (komut === "m") komut = "l";
    }
    const bagil = komut >= "a";
    const buyuk = komut.toUpperCase();
    const P = (x: number, y: number): Nokta =>
      bagil ? { x: cur.x + x, y: cur.y + y } : { x, y };

    switch (buyuk) {
      case "M": {
        const p = P(tr.sayi(), tr.sayi());
        segs.push({ tip: "M", p });
        cur = p;
        basla = p;
        sonKontrol = null;
        sonKomut = "M";
        break;
      }
      case "L": {
        const p = P(tr.sayi(), tr.sayi());
        segs.push({ tip: "L", p });
        cur = p;
        sonKontrol = null;
        sonKomut = "L";
        break;
      }
      case "H": {
        const x = tr.sayi();
        const p: Nokta = { x: bagil ? cur.x + x : x, y: cur.y };
        segs.push({ tip: "L", p });
        cur = p;
        sonKontrol = null;
        sonKomut = "L";
        break;
      }
      case "V": {
        const y = tr.sayi();
        const p: Nokta = { x: cur.x, y: bagil ? cur.y + y : y };
        segs.push({ tip: "L", p });
        cur = p;
        sonKontrol = null;
        sonKomut = "L";
        break;
      }
      case "C": {
        const c1 = P(tr.sayi(), tr.sayi());
        const c2 = P(tr.sayi(), tr.sayi());
        const p = P(tr.sayi(), tr.sayi());
        segs.push({ tip: "C", c1, c2, p });
        cur = p;
        sonKontrol = c2;
        sonKomut = "C";
        break;
      }
      case "S": {
        const c2 = P(tr.sayi(), tr.sayi());
        const p = P(tr.sayi(), tr.sayi());
        // S yalnızca önceki komut kübik (C/S) ise yansıtır; aksi halde c1 = cur.
        const c1: Nokta =
          sonKomut === "C" && sonKontrol ? yansit(sonKontrol, cur) : cur;
        segs.push({ tip: "C", c1, c2, p });
        cur = p;
        sonKontrol = c2;
        sonKomut = "C";
        break;
      }
      case "Q": {
        const c = P(tr.sayi(), tr.sayi());
        const p = P(tr.sayi(), tr.sayi());
        segs.push({ tip: "Q", c, p });
        cur = p;
        sonKontrol = c;
        sonKomut = "Q";
        break;
      }
      case "T": {
        const p = P(tr.sayi(), tr.sayi());
        // T yalnızca önceki komut kuadratik (Q/T) ise yansıtır; aksi halde c = cur.
        const c: Nokta =
          sonKomut === "Q" && sonKontrol ? yansit(sonKontrol, cur) : cur;
        segs.push({ tip: "Q", c, p });
        cur = p;
        sonKontrol = c;
        sonKomut = "Q";
        break;
      }
      case "A": {
        const rx = tr.sayi();
        const ry = tr.sayi();
        const donus = tr.sayi();
        const buyukYay = tr.bayrak();
        const suzme = tr.bayrak();
        const x = tr.sayi();
        const y = tr.sayi();
        const p: Nokta = bagil ? { x: cur.x + x, y: cur.y + y } : { x, y };
        segs.push({ tip: "A", rx, ry, donus, buyukYay, suzme, p });
        cur = p;
        sonKontrol = null;
        sonKomut = "A";
        break;
      }
      case "Z": {
        segs.push({ tip: "Z" });
        cur = basla;
        sonKontrol = null;
        sonKomut = "Z";
        break;
      }
      default:
        throw new Error(`Bilinmeyen path komutu: "${komut}"`);
    }
  }
  return segs;
}

/** Sayıyı yuvarlar (3 ondalık) — `donusum.say` ile aynı politika. */
function yuvarla(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Segment listesini mutlak `d` dizesine yazar. */
export function yoluYaz(segs: readonly Segment[]): string {
  const v = yuvarla;
  const parcalar: string[] = [];
  for (const s of segs) {
    switch (s.tip) {
      case "M":
        parcalar.push(`M ${v(s.p.x)} ${v(s.p.y)}`);
        break;
      case "L":
        parcalar.push(`L ${v(s.p.x)} ${v(s.p.y)}`);
        break;
      case "C":
        parcalar.push(
          `C ${v(s.c1.x)} ${v(s.c1.y)} ${v(s.c2.x)} ${v(s.c2.y)} ${v(s.p.x)} ${v(s.p.y)}`,
        );
        break;
      case "Q":
        parcalar.push(`Q ${v(s.c.x)} ${v(s.c.y)} ${v(s.p.x)} ${v(s.p.y)}`);
        break;
      case "A":
        parcalar.push(
          `A ${v(s.rx)} ${v(s.ry)} ${v(s.donus)} ${s.buyukYay ? 1 : 0} ${s.suzme ? 1 : 0} ${v(s.p.x)} ${v(s.p.y)}`,
        );
        break;
      case "Z":
        parcalar.push("Z");
        break;
    }
  }
  return parcalar.join(" ");
}
