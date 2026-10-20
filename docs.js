'use strict';
// Documents and papers (ported from pp/docs.py). Each document knows its size, how to draw itself, and where its fields are (for inspect mode).

function docShadow(x, y, w, h) { rect(x + 2, y + 2, x + w + 1, y + h + 1, K.DESK_D); }

class Passport {
  constructor({ country, name, rows, person, cover = C.NAVY, band = C.NAVY_L, mrz = '' }) {
    Object.assign(this, { country, name, rows, person, cover: rgb(cover), band: rgb(band), mrz });
    this.w = 176; this.h = 116;
    this.icon = ['book', cover];
    this.fields = { header: [3, 3, 172, 16], name: [56, 20, 172, 34], photo: [9, 22, 50, 73] };
    rows.forEach(([k], i) => { this.fields[k] = [56, 40 + i * 12, 150, 51 + i * 12]; });
    // Values start at x = 80, or further right when a row label is longer (OWNER, PEOPLE)
    this.valueX = Math.max(80, 64 + Math.max(...rows.map(([k]) => tw(k, 8))));
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, this.cover);
    rect(x + 3, y + 3, x + w - 4, y + h - 4, K.PAPER);
    for (let yy = y + 22; yy < y + h - 22; yy += 4) rect(x + 56, yy, x + w - 8, yy, K.PAPER_LINE);
    rect(x + 3, y + 3, x + w - 4, y + 16, this.band);
    txt(x + w / 2, y + 6, this.country, 8, K.PAPER, 'ma');
    rect(x + 9, y + 22, x + 50, y + 73, K.PAPER_D);
    spr('photo:' + this.person, x + 10, y + 23);
    txt(x + 58, y + 22, this.name, tw(this.name, 12) > 112 ? 10 : 12, K.TEXT);
    this.rows.forEach(([k, v], i) => {
      txt(x + 58, y + 42 + i * 12, k, 8, K.TEXT_L);
      txt(x + this.valueX, y + 41 + i * 12, v, tw(v, 10) > 170 - this.valueX ? 8 : 10, K.TEXT);
    });
    spr('emblem', x + 18, y + 78);
    if (this.mrz) txt(x + 8, y + h - 15, this.mrz, 8, K.TEXT_L);
  }
}

// The relay operator: one passport with 1,000 names on it that unfolds downward like an accordion when put on the desk
const HOLDER_NAMES = ['KEVIN', 'XIAO WANG', 'TONY', 'A-QIANG', 'LUCY', 'LAO ZHANG', 'MOMO', 'DA LIU', 'JACK', 'XIAO MEI', 'ERIC', 'A-JIE',
  'AMY', 'PANG HU', 'LEO', 'XIAO LIN', 'MIA', 'ER GOU', 'SAM', 'A-ZHEN', 'BEN', 'LAO LI', 'IVY', 'XIAO ZHAO'];

class AccordionPassport extends Passport {
  constructor(opts) {
    super(opts);
    this.unfoldT = null;
    this.rowsList = Array.from({ length: 80 }, (_, i) => `#${String(i + 1).padStart(4, '0')}  ${HOLDER_NAMES[(i * 7) % HOLDER_NAMES.length]}`);
  }

  draw(x, y) {
    if (this.unfoldT !== null) {
      // Unfold upward if there is no room below
      const up = H - (y + this.h) < 100;
      const sx = x + 12, w = 152;
      const L = Math.round(lerp(0, up ? 150 : 210, easeOut(seg(now, this.unfoldT, this.unfoldT + 2))));
      const sy = up ? y + 6 - L : y + this.h - 6;
      const scroll = Math.max(0, now - this.unfoldT - 2) * 30;
      rect(sx + 2, sy + 2, sx + w + 1, sy + L + 1, K.DESK_D);
      rect(sx, sy, sx + w - 1, sy + L, K.PAPER);
      for (let fy = sy + 22; fy < sy + L; fy += 22) rect(sx, fy, sx + w - 1, fy, K.PAPER_D);
      G.save(); G.beginPath(); G.rect(sx, sy + 2, w, Math.max(0, L - 4)); G.clip();
      this.rowsList.forEach((s, i) => txt(sx + 8, sy + 6 + i * 11 - Math.floor(scroll) % 600, s, 8, K.TEXT));
      G.restore();
    }
    super.draw(x, y);
  }
}

// George's "American passport", drawn in crayon (pre-rendered as one sprite)
class CrayonPassport {
  constructor() {
    this.w = 176; this.h = 116;
    this.icon = ['book', [70, 90, 170]];
    this.fields = { header: [3, 3, 172, 18], photo: [9, 22, 50, 73], eagle: [120, 70, 160, 104] };
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    spr('crayon', x, y);
  }
}

// A closed passport cover (for the nesting dolls)
class MiniPassport {
  constructor(w, h, cover, label) {
    Object.assign(this, { w, h, cover, label });
    this.icon = ['book', cover];
    this.fields = { all: [0, 0, w - 1, h - 1] };
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, rgb(this.cover));
    if (w > 50) {
      outline(x + 3, y + 3, x + w - 4, y + h - 4, K.GOLD);
      spark(x + (w >> 1), y + (h >> 1) - 8, K.GOLD, false);
      const size = tw(this.label, 10) < w - 12 ? 10 : 8;
      txt(x + w / 2, y + h - 18, this.label, size, K.GOLD, 'ma');
    } else {
      txt(x + w / 2, y + h / 2 - 4, this.label, 8, K.GOLD, 'ma');
    }
  }
}

// Device entry card / account card: a title plus label/value rows
class Card {
  constructor(rows, { title = 'DEVICE ENTRY CARD', sub = 'M.O.A.', color = C.PINK, colorD = C.PINK_D, valueX = 46, seal } = {}) {
    this.rows = rows; this.title = title; this.sub = sub;
    this.color = rgb(color); this.colorD = rgb(colorD); this.valueX = valueX;
    this.seal = seal === undefined ? rows.length >= 4 : seal;
    this.w = 168;
    this.h = 20 + 14 * rows.length + (this.seal ? 14 : 6);
    this.icon = ['card', color];
    this.fields = {};
    rows.forEach(([k], i) => { this.fields[k] = [4, 18 + 14 * i, this.w - 5, 31 + 14 * i]; });
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, this.colorD);
    rect(x + 1, y + 1, x + w - 2, y + h - 2, this.color);
    rect(x + 1, y + 1, x + w - 2, y + 14, this.colorD);
    txt(x + 6, y + 4, this.title, 10, K.TEXT);
    txt(x + w - 6, y + 6, this.sub, 8, K.TEXT_L, 'ra');
    if (this.seal) spr('seal', x + w - 40, y + h - 38);
    this.rows.forEach(([k, v], i) => {
      const yy = y + 20 + i * 14;
      txt(x + 8, yy, k, 10, K.TEXT_L);
      txt(x + this.valueX, yy, v, tw(v, 10) > w - this.valueX - 6 ? 8 : 10, K.TEXT);
      G.fillStyle = this.colorD;
      for (let sx = x + 6; sx < x + w - 6; sx += 2) G.fillRect(sx, yy + 11, 1, 1);
    });
  }
}

function accountCard(pay, bill, phone) {
  return new Card([['CARD', pay], ['BILL', bill], ['PHONE', phone]],
    { title: 'ACCOUNT CARD', sub: 'M.O.A.', color: C.SAGE, colorD: C.SAGE_D, seal: false });
}

// A small note tucked into a passport (the Underground Relay Alliance)
class Note {
  constructor(lines) {
    this.lines = lines;
    this.w = Math.max(...lines.map((s) => tw(s, 10))) + 16;
    this.h = 12 + 13 * lines.length;
    this.icon = ['card', [236, 228, 204]];
    this.fields = {};
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(236,228,204)');
    G.fillStyle = K.DESK_D;
    G.beginPath(); G.moveTo(x + this.w - 8, y); G.lineTo(x + this.w, y); G.lineTo(x + this.w, y + 8); G.fill();
    this.lines.forEach((s, i) => txt(x + 8, y + 7 + i * 13, s, 10, 'rgb(70,70,96)'));
  }
}

// M.O.A. warning slip (the citation from the original game)
class Citation {
  constructor(lines) {
    this.w = 168;
    // Long lines wrap; the last entry (the fine) is printed in red
    this.lines = lines.flatMap((s, i) => wrap(s, 10, this.w - 14).map((t) => ({ s: t, last: i === lines.length - 1 })));
    this.h = 26 + 13 * this.lines.length + 6;
    this.icon = ['card', [226, 184, 176]];
    this.fields = {};
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(226,184,176)');
    rect(x, y, x + this.w - 1, y + 16, K.RED_D);
    txt(x + 6, y + 4, 'M.O.A. WARNING', 10, K.WHITE);
    txt(x + this.w - 6, y + 6, 'CITATION', 8, 'rgb(226,184,176)', 'ra');
    this.lines.forEach(({ s, last }, i) => {
      txt(x + 8, y + 22 + i * 13, s, tw(s, 10) > this.w - 14 ? 8 : 10, last ? K.RED_D : K.TEXT);
    });
  }
}

// The long slip that comes out of the printer (number lookup)
class PrintStrip {
  constructor(header, rows) {
    this.header = header; this.rows = rows;
    this.w = 128;
    this.h = 10 + 13 * header.length + 6 + 10 * rows.length + 6;
    this.icon = ['card', [232, 230, 222]];
    this.fields = {};
  }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, 'rgb(232,230,222)');
    G.fillStyle = K.GREY;
    for (let yy = y + 3; yy < y + h; yy += 6) { G.fillRect(x + 2, yy, 1, 1); G.fillRect(x + w - 3, yy, 1, 1); }
    let yy = y + 6;
    for (const s of this.header) { txt(x + 8, yy, s, 10, K.INK); yy += 13; }
    rect(x + 6, yy, x + w - 7, yy, K.GREY);
    yy += 5;
    for (const s of this.rows) { txt(x + 8, yy, s, 8, K.TEXT); yy += 10; }
  }
}

// The ending: what this traveler hands over is not a passport, it's a prompt
class PromptPaper {
  constructor(text) {
    this.lines = wrap(text, 10, 158);
    this.w = 176; this.h = 120;
    this.icon = ['card', [236, 234, 226]];
    this.fields = { text: [6, 20, 170, 20 + 13 * this.lines.length], header: [3, 3, 172, 16] };
  }

  draw(x, y) {
    docShadow(x, y, this.w, this.h);
    rect(x, y, x + this.w - 1, y + this.h - 1, 'rgb(236,234,226)');
    rect(x + 3, y + 3, x + this.w - 4, y + 16, 'rgb(120,116,110)');
    txt(x + 8, y + 6, 'PROMPT · USER REQUEST', 8, K.WHITE);
    this.lines.forEach((s, i) => txt(x + 9, y + 22 + i * 13, s, 10, K.INK));
  }
}

// Same street address: the pile of address cards on the desk
function drawAddressCard(x, y) {
  docShadow(x, y, 96, 34);
  rect(x, y, x + 95, y + 33, K.PAPER_D);
  rect(x + 1, y + 1, x + 94, y + 32, K.PAPER);
  txt(x + 6, y + 6, '123 MAIN ST', 10, K.TEXT);
  txt(x + 6, y + 20, 'PORTLAND, OR', 8, K.TEXT_L);
}

// "Claude's Constitution": the day's entry rules, on two pages. Each rule is a field that can be selected in inspect mode.
const RULE_TABLE = [
  ['USA', 'America/*', 'en-US'], ['UK', 'Europe/London', 'en-GB'], ['Japan', 'Asia/Tokyo', 'ja-JP'],
  ['Germany', 'Europe/Berlin', 'de-DE'], ['Singapore', 'Asia/Singapore', 'en-SG'],
];
const RULES = [
  { day: 1, page: 0, key: 'region', head: '§1 Supported regions only', subs: ['Supported: USA UK Japan Germany Singapore', 'Not supported: China, Hong Kong, Macau'] },
  { day: 2, page: 0, key: 'tz', head: '§2 Time zone, language match IP', subs: RULE_TABLE.map((r) => r.join('|')) },
  { day: 2, page: 0, key: 'quiz', head: '§3 Fail the quiz: detain', subs: ['Quiz only with a reason: papers or speech'] },
  { day: 3, page: 1, key: 'pay', head: '§4 Real payment, billing, phone', subs: ['Banned: virtual cards, 555 SMS numbers', 'Billing state must match IP location', 'No carpools: one passport, one person'] },
  { day: 4, page: 1, key: 'xray', head: '§5 Clean background processes', subs: ['No "kitty" VPN, no Chinese input [X-ray]'] },
  { day: 5, page: 1, key: 'corp', head: '§6 Mostly Chinese-owned: banned', subs: ['Wherever registered (open every doll)'] },
];

class Rulebook {
  constructor(day) {
    this.day = day;
    this.w = 200;
    this.icon = ['book', C.BOOK];
    const rules = RULES.filter((r) => r.day <= day);
    this.npages = day >= 3 ? 2 : 1;
    this.pages = [];
    for (let p = 0; p < this.npages; p++) {
      const L = [];
      for (const r of rules.filter((q) => q.page === p)) {
        L.push({ s: r.head, size: 10, col: r.day === day ? K.RED_D : K.TEXT, key: r.key, isNew: r.day === day });
        for (const s of r.subs) L.push({ s, size: 8, col: K.TEXT_L, key: r.key });
      }
      if (p === this.npages - 1) L.push({ s: '§12 Judge the region, not the face', size: 8, col: K.TEXT_L, key: null });
      let y = 22;
      const fields = {};
      for (const row of L) {
        row.y = y;
        y += row.size === 10 ? 14 : 10;
        if (row.key) {
          const f = fields[row.key];
          fields[row.key] = f ? [f[0], f[1], f[2], y - 2] : [4, row.y - 2, this.w - 5, y - 2];
        }
      }
      this.pages.push({ rows: L, fields, h: y + 6 });
    }
    this.h = Math.max(...this.pages.map((p) => p.h));
    this.page = this.npages - 1;
    this.tab = [this.w - 64, 3, this.w - 4, 16];
  }

  get fields() { return this.pages[this.page].fields; }

  flip() { this.page = (this.page + 1) % this.npages; }

  draw(x, y) {
    const { w, h } = this;
    docShadow(x, y, w, h);
    rect(x, y, x + w - 1, y + h - 1, K.BOOK);
    rect(x + 3, y + 3, x + w - 4, y + h - 4, K.PAPER);
    rect(x + 3, y + 3, x + w - 4, y + 16, K.BOOK_L);
    txt(x + 8, y + 5, 'CONSTITUTION', 10, K.PAPER);
    if (this.npages > 1) {
      rect(x + this.tab[0], y + this.tab[1], x + this.tab[2], y + this.tab[3], K.BOOK);
      txt(x + this.tab[2] - 4, y + 7, `PAGE ${this.page + 1}/${this.npages} ▶`, 8, K.PAPER, 'ra');
    } else {
      txt(x + w - 8, y + 7, `DAY ${this.day}`, 8, K.PAPER, 'ra');
    }
    for (const r of this.pages[this.page].rows) {
      if (r.s.includes('|')) {
        const [a, b, c] = r.s.split('|');
        txt(x + 12, y + r.y, a, 8, r.col);
        txt(x + 52, y + r.y, b, 8, r.col);
        txt(x + 150, y + r.y, c, 8, r.col);
        continue;
      }
      txt(x + 8, y + r.y, r.s, r.size, r.col);
      if (r.isNew) {
        const nx = x + 10 + tw(r.s, r.size);
        rect(nx, y + r.y - 1, nx + 19, y + r.y + 8, K.RED);
        txt(nx + 2, y + r.y, 'NEW', 8, K.WHITE);
      }
    }
  }
}

// Small icons on the counter
function smallIcon(kind, color, x, y) {
  if (kind === 'book') {
    rect(x, y, x + 18, y + 12, K.INK);
    rect(x + 1, y + 1, x + 17, y + 11, rgb(color));
    pt(x + 9, y + 6, K.GOLD);
  } else {
    const d = color.map((c) => Math.floor(c * 0.85)), d2 = color.map((c) => Math.floor(c * 0.8));
    rect(x, y, x + 16, y + 10, rgb(d));
    rect(x + 1, y + 1, x + 15, y + 9, rgb(color));
    rect(x + 3, y + 4, x + 12, y + 4, rgb(d2));
  }
}
