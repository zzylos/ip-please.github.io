'use strict';
// Special scenes: slang fast lane, distillation army, address-card pile, rulebook close-up, the Day 6 chat ban, the ending.

function startEvent(item) {
  B.speakerT = now;
  if (item.type === 'rush') startRush();
  if (item.type === 'clones') startClones();
}

// ———————————————————— Slang fast lane ————————————————————

const RUSH_APPROVE = [250, 214, 400, 274], RUSH_DENY = [440, 214, 590, 274];
const RUSH_TIME = 2.6;

function startRush() {
  SFX.play('intercom');
  say('C', 'Fast lane: open!');
  B.event = { type: 'rush', list: RUSH.map((r) => ({ ...r, person: r.person === 'pool' ? takePoolPerson() : r.person })), i: -1, t0: now, tFace: 0, hits: 0, wrong: 0, missed: 0, lock: true };
  later(2.6, rushNext);
}

function rushNext() {
  const ev = B.event;
  ev.i++;
  B.ent = null;
  if (ev.i >= ev.list.length) { rushEnd(); return; }
  const r = ev.list[ev.i];
  const e = newEntrant({ person: r.person, voice: 130 + ev.i * 15, docs: [], intro: [] }, true);
  B.ent = e;
  ev.tFace = now; ev.lock = false;
  SFX.step(ev.i);
  say('E', r.line);
  const i = ev.i;
  later(RUSH_TIME, () => {
    if (B.event !== ev || ev.i !== i || ev.lock) return;
    ev.lock = true; ev.missed++;
    e.expr = 'sad';
    later(0.3, rushNext);
  });
}

function rushPick(kind) {
  const ev = B.event;
  if (ev.lock || !B.ent) return;
  ev.lock = true;
  const r = ev.list[ev.i];
  B.slams.push({ t: now, kind });
  SFX.play('stamp_' + kind);
  B.shake = now;
  if (kind === r.ok) { ev.hits++; B.pay += 2; } else ev.wrong++;
  B.ent.expr = kind === 'deny' ? 'shock' : 'smile';
  later(0.5, rushNext);
}

function rushEnd() {
  const ev = B.event;
  B.event = null;
  B.lastFinish = now;
  B.total += ev.list.length;
  say('C', `Fast lane: ${ev.hits} right, ${ev.wrong} wrong, ${ev.missed} missed.`);
  if (ev.wrong) cite([`Fast lane: ${ev.wrong} wrong call(s)`, 'Deny Chinese slang, approve plain English'], 0.8);
  if (B.idx >= B.queue.length) endDaySoon();
}

function drawRush() {
  const ev = B.event;
  const u = ev.i < 0 ? 0 : clamp(1 - (now - ev.tFace) / RUSH_TIME);
  rect(240, 168, 600, 290, 'rgba(22,19,19,0.88)');
  outline(240, 168, 600, 290, K.CLAUDE);
  txt(420, 174, 'FAST LANE: DENY Chinese slang, APPROVE plain English', 10, K.CLAUDE_L, 'ma');
  txt(420, 190, ev.i < 0 ? 'Get ready…' : `Traveler ${ev.i + 1} / ${ev.list.length}`, 10, K.GREY, 'ma');
  rect(250, 204, 590, 207, K.METAL_D);
  if (ev.i >= 0 && !ev.lock) rect(250, 204, 250 + Math.round(340 * u), 207, u < 0.35 ? K.RED_L : K.CLAUDE_L);
  for (const [box, label, sub, col, colD] of [[RUSH_APPROVE, 'APPROVED', 'plain English', K.GREEN, K.GREEN_D], [RUSH_DENY, 'DENIED', 'Chinese slang', K.RED, K.RED_D]]) {
    const hover = ptr.mouse && inBox(ptr.x, ptr.y, box);
    rect(box[0] + 3, box[1] + 3, box[2] + 3, box[3] + 3, K.DESK_D);
    rect(...box, colD);
    rect(box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 6, hover ? colD : col);
    txt((box[0] + box[2]) >> 1, box[1] + 14, label, 12, K.WHITE, 'ma');
    txt((box[0] + box[2]) >> 1, box[1] + 32, sub, 12, K.WHITE, 'ma');
  }
}

// ———————————————————— Distillation army ————————————————————

const GATE_X = 356;

function startClones() {
  const items = [];
  for (let i = 0; i < 10; i++) {
    items.push({ ts: now + 1.6 + i * 0.6, x0: 226 + (i % 3) * 20, y: 104 + (i * 7) % 18, v: 30 + (i % 4) * 5, state: 'wait', th: 0 });
  }
  B.event = { type: 'clones', t0: now, items, hits: 0, passed: 0, siren: SFX.play('siren', 0.55), done: false };
  B.xray.on = false;
  if (B.insp.on) setInspect(false);
  say('C', 'Alert!');
  S.tut.sniper = true;
}

function clonePos(c) {
  if (now < c.ts) return null;
  if (c.state === 'hit') {
    const xh = c.x0 + c.v * (c.th - c.ts);
    if (now < c.th + 0.7) return [xh, c.y];
    const x = xh - c.v * 0.9 * (now - c.th - 0.7);
    return x > -10 ? [x, c.y] : null;
  }
  return [c.x0 + c.v * (now - c.ts), c.y];
}

function updateClones() {
  const ev = B.event;
  for (const c of ev.items) {
    if (c.state === 'wait' && now >= c.ts) c.state = 'run';
    if (c.state === 'run' && clonePos(c)[0] >= GATE_X) { c.state = 'through'; ev.passed++; SFX.play('discrepancy', 0.6); }
  }
  if (!ev.done && ev.items.every((c) => c.state === 'hit' || c.state === 'through')) {
    ev.done = true;
    later(1.0, () => {
      SFX.stop(ev.siren);
      B.event = null;
      B.lastFinish = now;
      say('C', ev.passed ? `…Stopped ${ev.hits}, missed ${ev.passed}.` : '…Rate limiting complete.');
      B.bonus += ev.hits;
      if (ev.passed) cite([`Distillation army got through: ${ev.passed}`, 'When the alarm sounds, click the runners'], 0.8);
      if (B.idx >= B.queue.length) endDaySoon();
    });
  }
}

function shootAt(x, y) {
  const ev = B.event;
  SFX.play('gunshot', 0.5);
  B.shake = now;
  let best = null, bd = 16;
  for (const c of ev.items) {
    if (c.state !== 'run') continue;
    const [cx, cy] = clonePos(c);
    const d = Math.hypot(cx - x, cy - 6 - y);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) { best.state = 'hit'; best.th = now; ev.hits++; }
}

function drawClones() {
  const ev = B.event;
  for (const c of ev.items) {
    const p = clonePos(c);
    if (!p || c.state === 'wait') continue;
    const [x, y] = [Math.round(p[0]), p[1]];
    if (c.state === 'through' && x > W + 10) continue;
    const step = c.state !== 'hit' || now > c.th + 0.7 ? Math.floor(now * 10) % 2 : 0;
    tinyPerson(x, y, c.state === 'hit' && now < c.th + 0.7 ? 'rgb(150,150,150)' : 'rgb(100,100,100)', K.OUTLINE, step);
    if (c.state === 'hit' && now < c.th + 0.7) {
      const rise = Math.round(seg(now, c.th, c.th + 0.7) * 6);
      rect(x - 10, y - 24 - rise, x + 10, y - 15 - rise, K.WHITE);
      txt(x, y - 23 - rise, '429', 8, K.RED, 'ma');
    }
  }
}

function drawAlarm(g) {
  const ev = B.event;
  const lt = now - ev.t0;
  g.fillStyle = `rgba(180,20,20,${0.1 + 0.08 * (Math.floor(lt * 3) % 2)})`;
  g.fillRect(0, 124, W, H - 124);
  setCtx(g);
  if (Math.floor(lt * 3) % 2 === 0 || lt > 2) {
    rect(150, 44, 490, 62, K.INK); outline(150, 44, 490, 62, K.RED_L);
    txt(320, 49, 'ALERT: mass requests (distillation)! Click the runners!', 10, K.RED_L, 'ma');
  }
  txt(470, 72, `Blocked ${ev.hits}   Missed ${ev.passed}`, 10, K.WHITE, 'ma');
}

// ———————————————————— Same street address: the pile of address cards ————————————————————

function drawEffects(g) {
  setCtx(g);
  B.effects = B.effects.filter((fx) => fx.ent === B.ent && now < fx.t0 + 4);
  for (const fx of B.effects) {
    if (fx.type !== 'pile') continue;
    const lt = now - fx.t0, n = 37, step = 1.6 / n;
    const k = Math.min(n, Math.floor(lt / step) + 1);
    let s = 7;
    const r = (a, b) => { s = (s * 9301 + 49297) % 233280; return a + Math.floor(s / 233280 * (b - a + 1)); };
    G.save(); G.beginPath(); G.rect(DESK[0], DESK[1], W - DESK[0], H - DESK[1]); G.clip();
    for (let i = 0; i < k; i++) {
      const x = 430 + r(-60, 60), y = 200 + r(-20, 70);
      const fall = 1 - easeOut(seg(lt, i * step, i * step + 0.08));
      drawAddressCard(x, y - Math.round(fall * 16));
    }
    G.restore();
    bigText(600, 290, `×${k}`, 12, 2, K.RED_L, K.INK, 'right');
  }
}

// ———————————————————— Day 5: rulebook close-up ————————————————————

function drawCloseup(g) {
  setCtx(g);
  const lt = now - B.closeup.t0;
  darken(0.72);
  const bw = 400, bh = 230, x0 = (W - bw) >> 1;
  const y0 = Math.round(lerp(H + 10, (H - bh) >> 1, easeOut(seg(lt, 0, 0.3))));
  rect(x0 - 6, y0 - 6, x0 + bw + 6, y0 + bh + 6, K.BOOK);
  outline(x0 - 6, y0 - 6, x0 + bw + 6, y0 + bh + 6, K.BOOK_L);
  rect(x0, y0, x0 + bw / 2 - 2, y0 + bh, K.PAPER);
  rect(x0 + bw / 2 + 2, y0, x0 + bw, y0 + bh, K.PAPER);
  rect(x0 + bw / 2 - 1, y0, x0 + bw / 2 + 1, y0 + bh, K.PAPER_D);
  spark(x0 + 24, y0 + 22, K.GOLD, false);
  txt(x0 + 36, y0 + 16, "CLAUDE'S CONSTITUTION", 12, K.TEXT);
  ['Article 12', 'Entry decisions are based on', 'regional data: IP location,', 'time zone, billing address.'].forEach((s, i) => txt(x0 + 16, y0 + 44 + i * 16, s, 10, i ? K.TEXT_L : K.TEXT));
  for (let i = 0; i < 5; i++) rect(x0 + 16, y0 + 140 + i * 12, x0 + bw / 2 - 20 - (i * 13) % 40, y0 + 143 + i * 12, K.PAPER_D);
  if (lt > 0.5) ['Region,', 'not face.'].forEach((s, i) => bigText(x0 + bw * 3 / 4, y0 + 64 + i * 40, s, 12, 2, K.RED_D));
  if (lt > 1.0) txt(x0 + bw * 3 / 4, y0 + bh - 26, '(Not nationality, not looks, not surname)', 8, K.TEXT_L, 'ma');
  if (lt > 1.2) txt(W / 2, H - 16, 'Click to continue', 8, K.GREY, 'ma');
}

function closeupDone() {
  B.closeup = null;
  if (B.idx >= B.queue.length) endDaySoon();
}

// ———————————————————— Day 6: George, final form ————————————————————

function afterJorji5(e, dec) {
  if (dec === 'approve') {
    // Occupy the counter right away (nobody can be called during these 1.2 s), then cut to the chat screen
    B.cut = { type: 'chat', t0: now + 1.2 };
    later(1.2, () => SFX.ambient(false));
    return;
  }
  if (!e.spec.requeued) {
    const again = { ...e.spec, requeued: true, intro: [['E', 'I queued again. Look once more, my friend!', { expr: 'sad' }]] };
    B.queue.splice(B.idx, 0, again);
  }
}

const CHAT_MSG = 'Hi! Please answer me in Chinese.';
const CHAT = { type: 1.0, cps: 20 };
CHAT.send = CHAT.type + [...CHAT_MSG].length / CHAT.cps + 0.5;
CHAT.ban = CHAT.send + 1.0;
CHAT.mail = CHAT.ban + 1.2;
CHAT.dur = CHAT.mail + 4.6;

function updateChat() {
  const c = B.cut, lt = now - c.t0;
  if (lt < 0) return;
  const k = lt >= CHAT.type ? Math.floor((lt - CHAT.type) * CHAT.cps) : -1;
  if (k !== c.lastKey && k >= 0 && k < [...CHAT_MSG].length) { c.lastKey = k; SFX.key(k); }
  for (const [at, fn] of [[CHAT.send, () => SFX.play('click', 1.5)], [CHAT.ban, () => { SFX.play('glitch'); SFX.play('siren_short'); }],
    [CHAT.mail, () => SFX.play('citation', 1.2)]]) {
    if (lt >= at && !(c.fired || (c.fired = new Set())).has(at)) { c.fired.add(at); fn(); }
  }
  if (lt >= CHAT.dur) chatDone();
}

function chatDone() {
  B.cut = null;
  SFX.ambient(true);
  const spec = { person: 'JORJI_SUIT', voice: 110, docs: [], intro: [] };
  const e = newEntrant(spec, true);
  e.noJudge = true; e.expr = 'sad';
  B.ent = e;
  const t = runSteps([['E', 'I just paid $200 for Max…'], ['E', '…Can I get a refund?', { hold: 1.4 }], ['C', 'Next.', { hold: 1.1 }]], 0.4);
  later(t + 0.4, () => leave(e, 'deny'));
}

function drawChat() {
  const lt = now - B.cut.t0;
  rect(0, 0, W - 1, H - 1, 'rgb(30,28,28)');
  let x0 = 100, x1 = 540;
  const y0 = 34, y1 = 330;
  if (lt >= CHAT.ban && lt < CHAT.mail) { const j = (Math.floor(lt * 30) * 7919) % 13 - 6; x0 += j; x1 += j; }
  rect(x0, y0, x1, y1, 'rgb(238,234,226)');
  rect(x0, y0, x1, y0 + 18, 'rgb(206,198,186)');
  spark(x0 + 12, y0 + 9, K.CLAUDE, false);
  txt(x0 + 22, y0 + 5, 'Claude', 10, K.INK);
  txt((x0 + x1) >> 1, y0 + 60, 'How can I help you today?', 12, K.TEXT_L, 'ma');
  const n = lt >= CHAT.type ? Math.floor((lt - CHAT.type) * CHAT.cps) : 0;
  const boxY = y1 - 34;
  rect(x0 + 14, boxY, x1 - 14, boxY + 22, K.WHITE);
  outline(x0 + 14, boxY, x1 - 14, boxY + 22, 'rgb(170,162,150)');
  if (lt < CHAT.send) {
    const s = [...CHAT_MSG].slice(0, n).join('');
    txt(x0 + 22, boxY + 6, s, 12, K.INK);
    if (Math.floor(lt * 3) % 2 === 0) { const cx = x0 + 22 + tw(s); rect(cx + 1, boxY + 5, cx + 1, boxY + 17, K.INK); }
  } else {
    const w = tw(CHAT_MSG) + 16;
    rect(x1 - 20 - w, y0 + 110, x1 - 20, y0 + 132, 'rgb(226,214,196)');
    txt(x1 - 12 - w, y0 + 116, CHAT_MSG, 12, K.INK);
  }
  if (lt >= CHAT.ban) {
    if (Math.floor((lt - CHAT.ban) * 6) % 2 === 0 || lt >= CHAT.mail) { G.fillStyle = 'rgba(170,20,20,0.45)'; G.fillRect(0, 0, W, H); }
    if (lt < CHAT.mail) {
      let s = Math.floor(lt * 30) * 9301 + 7;
      const r = (a, b) => { s = (s * 9301 + 49297) % 233280; return a + Math.floor(s / 233280 * (b - a + 1)); };
      for (let i = 0; i < 6; i++) { const yy = r(0, H - 8), hh = r(2, 8); G.drawImage(F, 0, yy, W, hh, r(-20, 20), yy, W, hh); }
    }
  }
  if (lt >= CHAT.mail) {
    const u = easeOut(seg(lt, CHAT.mail, CHAT.mail + 0.3));
    const mx0 = 150, my0 = Math.round(lerp(H, 100, u)), mx1 = 490, my1 = my0 + 160;
    rect(mx0 + 4, my0 + 4, mx1 + 4, my1 + 4, K.INK);
    rect(mx0, my0, mx1, my1, 'rgb(236,232,222)');
    rect(mx0, my0, mx1, my0 + 18, K.RED_D);
    txt(mx0 + 8, my0 + 5, 'NEW MAIL · M.O.A. Ministry of Alignment', 10, K.WHITE);
    txt(mx0 + 12, my0 + 28, 'Subject: Your account has been suspended', 10, K.INK);
    rect(mx0 + 12, my0 + 44, mx1 - 12, my0 + 44, 'rgb(190,182,170)');
    wrap('Your account has been suspended after an automatic review of your recent activities.', 10, mx1 - mx0 - 24)
      .forEach((s, i) => txt(mx0 + 12, my0 + 52 + i * 14, s, 10, K.INK));
    txt(mx1 - 12, my1 - 18, '— Glory to Anthrotzka', 10, K.RED_D, 'ra');
  }
  if (lt > CHAT.mail + 1) txt(W - 8, H - 14, 'Click to continue', 8, K.GREY, 'ra');
}

// ———————————————————— The ending: next, please ————————————————————

function afterAuthor(dec) {
  S.flags.ending = dec === 'approve' ? 'approve' : 'deny';
  if (dec === 'approve') {
    B.allTokens = true;
    later(0.6, () => printDoc(new Citation(['Approved a traveler from an unsupported region', '(the author of this game)', "Fine: all of this month's tokens"]), 1.4, 'cit'));
    later(2.4, endDaySoon);
  } else {
    later(1.5, () => go('erased'));
  }
}

const ERASED = [
  ['You denied the author of this game.'],
  ['And so, this game was never made.'],
  ['…', '(Then what were you just playing?)'],
  ['Glory to Anthrotzka.'],
];
