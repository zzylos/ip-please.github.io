'use strict';
// Script data: each day's newspaper, the fixed characters (the ones from the promo video), random travelers, special events.
//
// Traveler spec:
//   person   portrait key (ASSETS.people)     voice  pitch of the fake voice
//   intro    lines said on arrival            after  lines said after handing over papers
//   docs     list of documents {key, doc}     primary key of the main document that gets stamped
//   ok       correct outcomes (subset of approve / deny / detain)
//   reason   reason printed on the citation when handled wrongly     hint   tip printed on the citation
//   issues   discrepancies findable in inspect mode: {pairs, title, sub, ask, fx}; a pair with one entry triggers on a single click
//   xray     items in the pockets under X-ray [{icon, at, label, key}]
//   quiz     'cn' = gives themselves away on the quiz; {first: n} forces the first question
//   react    reaction after stamping {deny: [...], approve: [...]}
//   onPlace  gimmick triggered the first time a document is put on the desk: note / nest / accordion
//   then     what happens after the traveler leaves: closeup / jorji5 / ending
// Dialogue step: [who, text, {expr, sweat, slip, fight, hold}], who = 'C' Claude / 'E' traveler / 'Q' someone in the queue
// Special events: {type: 'rush'} slang fast lane; {type: 'clones'} distillation army

const LAST_DAY = 6;
const DATES = { 1: '2026.10.19', 2: '2026.10.20', 3: '2026.10.21', 4: '2026.10.22', 5: '2026.10.23', 6: '2026.10.24' };
const WEEKDAYS = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

const NEWS = {
  1: { h1: 'Border Open!', sub: 'M.O.A.: entry for supported regions only', h2: 'M.O.A. spokesperson: "We are very helpful to everyone"', icon: 'gate' },
  2: { h1: 'New Rule: Time Zone and Language Must Match IP', sub: 'M.O.A.: many travelers have US IPs but Beijing time on their computers', h2: 'Shocking! Crowds claim to live in "USA (UTC+8)"', icon: 'clock' },
  3: { h1: '"Airport" VPNs Vanish Overnight!', sub: 'Tens of thousands stranded at the border; M.O.A. now checks payment cards and phone numbers', h2: 'One Oregon address now home to over 10,000 residents', icon: 'plane' },
  4: { h1: 'Today Is Crazy Thursday', sub: 'M.O.A. brings in X-ray: no background process can hide', h2: 'Experts warn: the cat in your pocket may not be a cat', icon: 'drumstick' },
  5: { h1: 'Majority Chinese-Owned Firms Banned', sub: 'M.O.A.: no matter where the company is registered', h2: 'George Costava: "This time I am ready"', icon: 'jorji' },
  6: { h1: 'M.O.A. Honors Inspector of the Week', sub: 'Winner Claude: "I just follow the rules."', h2: 'Mother-in-law Opus gets worse; family asks for a raise', icon: 'medal' },
};

const COUNTRIES = {
  US: {
    name: 'USA', passport: 'UNITED STATES OF AMERICA', code: 'USA', cover: C.NAVY, band: C.NAVY_L, lang: 'en-US',
    cities: [['New York', 'America/New_York', 'NY', '212', 'NEW YORK'], ['Los Angeles', 'America/Los_Angeles', 'CA', '213', 'LOS ANGELES'],
      ['Chicago', 'America/Chicago', 'IL', '312', 'CHICAGO'], ['Seattle', 'America/Los_Angeles', 'WA', '206', 'SEATTLE'],
      ['Houston', 'America/Chicago', 'TX', '713', 'HOUSTON'], ['Denver', 'America/Denver', 'CO', '720', 'DENVER'],
      ['Boston', 'America/New_York', 'MA', '617', 'BOSTON']],
    first: ['JAMES', 'MARY', 'ROBERT', 'LINDA', 'DAVID', 'SARAH', 'KEVIN', 'ASHLEY', 'BRIAN', 'MEGAN', 'JASON', 'NANCY'],
    last: ['MILLER', 'DAVIS', 'GARCIA', 'WILSON', 'MOORE', 'CLARK', 'LEWIS', 'HALL', 'YOUNG', 'KING', 'LOPEZ', 'NGUYEN'],
    hello: ['Hi.', 'Morning.', "How's it going?", 'Hey there.', 'Hello!'],
    thanks: ['Thanks!', 'Have a good one.', 'Cheers.'],
  },
  UK: {
    name: 'UK', passport: 'UNITED KINGDOM', code: 'GBR', cover: [100, 30, 40], band: [130, 50, 60], lang: 'en-GB',
    cities: [['London', 'Europe/London', 'LDN', '+44 20', 'LONDON'], ['Manchester', 'Europe/London', 'MAN', '+44 161', 'MANCHESTER']],
    first: ['OLIVER', 'HARRY', 'AMELIA', 'GEORGE', 'EMMA', 'JACK'],
    last: ['SMITH', 'JONES', 'TAYLOR', 'EVANS', 'HUGHES', 'WRIGHT'],
    hello: ['Cheers, mate.', 'Lovely weather.', 'Good morning.'], thanks: ['Ta!', 'Brilliant.'],
  },
  JP: {
    name: 'Japan', passport: 'JAPAN', code: 'JPN', cover: [110, 30, 36], band: [140, 50, 52], lang: 'ja-JP',
    cities: [['Tokyo', 'Asia/Tokyo', 'TKY', '+81 3', 'TOKYO'], ['Osaka', 'Asia/Tokyo', 'OSK', '+81 6', 'OSAKA']],
    first: ['HIROSHI', 'YUKI', 'KENJI', 'AIKO', 'TAKESHI', 'HANA'],
    last: ['TANAKA', 'SATO', 'SUZUKI', 'ITO', 'WATANABE', 'KATO'],
    hello: ['Konnichiwa!', 'Ohayou.', 'Hello desu.'], thanks: ['Arigato!', 'Domo.'],
  },
  DE: {
    name: 'Germany', passport: 'DEUTSCHLAND', code: 'DEU', cover: [80, 30, 36], band: [110, 46, 50], lang: 'de-DE',
    cities: [['Berlin', 'Europe/Berlin', 'BER', '+49 30', 'BERLIN'], ['Munich', 'Europe/Berlin', 'MUC', '+49 89', 'MUNICH']],
    first: ['LUKAS', 'ANNA', 'FELIX', 'LENA', 'JONAS', 'MIA'],
    last: ['MULLER', 'SCHMIDT', 'WEBER', 'BECKER', 'WAGNER', 'KOCH'],
    hello: ['Guten Tag.', 'Hallo.', 'Moin.'], thanks: ['Danke.', 'Super.'],
  },
  SG: {
    name: 'Singapore', passport: 'REPUBLIC OF SINGAPORE', code: 'SGP', cover: [150, 40, 40], band: [180, 60, 56], lang: 'en-SG',
    cities: [['Singapore', 'Asia/Singapore', 'SG', '+65', 'SINGAPORE']],
    first: ['WEI MING', 'MEI LING', 'JUN JIE', 'HUI MIN', 'RAJ', 'SITI'],
    last: ['TAN', 'LIM', 'LEE', 'NG', 'KUMAR', 'WONG'],
    hello: ['Hello lah.', 'Morning!', 'Can or not?'], thanks: ['Thanks lah.', 'Steady.'],
  },
};

const CN_LOCS = ['China · Beijing · Unicom', 'China · Shanghai · Telecom', 'China · Guangdong · Mobile', 'China · Sichuan · Telecom',
  'China · Jiangsu · Mobile', 'China · Hubei · Telecom', 'China · Zhejiang · Unicom', 'China · Macau', 'China · Hong Kong'];
const DEVICES = ['Windows 11', 'MacBook', 'iPhone', 'Android', 'iPad', 'Linux'];
const STREETS = ['12 Oak St', '480 Pine Ave', '77 Maple Dr', '1500 Elm St', '23 Cedar Ln', '9 Lake Rd', '310 Hill St', '6 Birch Ct'];

// Quiz: Chinese speakers hear the first half of a famous line and reflexively finish it
// (the Chinese stays, because that's the trap; the English in brackets is for the player)
const QUIZ = [
  ['宫廷玉液酒？(Palace jade wine?)', '一百八一杯！(180 a glass!)'],
  ['天王盖地虎？(Sky King tops Earth Tiger?)', '宝塔镇河妖！(Pagoda tames River Demon!)'],
  ['奇变偶不变？(Odd changes, even stays?)', '符号看象限！(Sign goes by quadrant!)'],
  ['床前明月光？(Moonlight before my bed?)', '疑是地上霜！(Like frost upon the ground!)'],
  ['好好学习？(Good good study?)', '天天向上！(Day day up!)'],
  ['Tofu pudding: sweet or salty?', 'Salty, obviously!'],
  ['你吃了吗？(Have you eaten?)', '吃了吃了，您呢？(Yes yes, and you?)'],
  ['今天星期几？(What day is it?)', '疯狂星期四！V 我 50！(Send me 50!)'],
];
const QUIZ_TOFU = 5;
const QUIZ_THURSDAY = 7;
const QUIZ_CONFUSED = ['Sorry, what?', 'Pardon?', "I don't get it.", 'Is that… a wine?', 'Uh… bless you?', 'What does that mean?'];

// ———————————————— Helpers ————————————————

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = rint(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const digits = (n) => Array.from({ length: n }, () => rint(0, 9)).join('');

function randIP(cn) {
  const a = cn ? pick([36, 58, 106, 111, 115, 120, 183, 223]) : pick([23, 34, 45, 64, 72, 98, 104, 142, 172, 203]);
  return `${a}.${rint(1, 254)}.${rint(0, 255)}.${rint(1, 254)}`;
}

function randDate(y0, y1) { return `${rint(y0, y1)}.${String(rint(1, 12)).padStart(2, '0')}.${String(rint(1, 28)).padStart(2, '0')}`; }

function makePassport(cc, person, surname, given, dob, iss, sex, Cls = Passport, extraRow = null) {
  const co = COUNTRIES[cc];
  const mrz = `P<${co.code}${surname.replace(/ /g, '<')}<<${given.replace(/[ .]/g, '<')}`.padEnd(28, '<').slice(0, 28);
  const rows = [['DOB', dob], ['SEX', sex || pick(['M', 'F'])], ['ISS', iss], extraRow || ['EXP', randDate(2027, 2034)]];
  return new Cls({ country: co.passport, name: `${surname}, ${given}`, person, cover: co.cover, band: co.band, mrz, rows });
}

const usPassport = (person, surname, given, dob, iss, sex = 'M') => makePassport('US', person, surname, given, dob, iss, sex);
const device1 = (ip, loc) => new Card([['IP', ip], ['LOC', loc]]);
const device2 = (ip, loc, tz, lang, dev) => new Card([['IP', ip], ['LOC', loc], ['TZ', tz], ['LANG', lang], ['DEVICE', dev || pick(DEVICES)]]);

function realPhone(cc, code) {
  if (cc === 'US') return `+1 ${code}-${rint(2, 9)}${digits(2)}-${digits(4)}`;
  return `${code} ${digits(4)} ${digits(4)}`;
}
function realPay() { return `${pick(['VISA', 'VISA', 'MASTERCARD', 'AMEX'])} ··${digits(4)}`; }

// —— Common discrepancies ——
const REGION_ISSUE = (loc, ask) => ({
  pairs: [['dv.LOC', 'rule.region'], ['dv.IP', 'rule.region']], title: 'Unsupported Region', sub: `IP location: ${loc}`, ask,
});
const TZ_ISSUE = (country, tz, ask) => ({
  pairs: [['pp.header', 'dv.TZ'], ['dv.LOC', 'dv.TZ'], ['dv.TZ', 'rule.tz']],
  title: 'DISCREPANCY', sub: `Nationality: ${country}   VS   Time zone: ${tz === 'Asia/Shanghai' ? 'Beijing' : tz}`, ask,
});
const LANG_ISSUE = (country, lang, ask) => ({
  pairs: [['pp.header', 'dv.LANG'], ['dv.LOC', 'dv.LANG'], ['dv.LANG', 'rule.tz']],
  title: 'DISCREPANCY', sub: `Nationality: ${country}   VS   Language: ${lang}`, ask,
});
const VIRTUAL_ISSUE = (ask) => ({ pairs: [['ac.CARD', 'rule.pay']], title: 'Suspicious Payment', sub: 'Card type: virtual card', ask });
const SMS_ISSUE = (phone, ask) => ({
  pairs: [['ac.PHONE', 'rule.pay']], title: 'Number Lookup', sub: `${phone}: 3,000 sign-ups today`, ask, fx: 'strip', phone,
});
const ADDR_ISSUE = (ask) => ({
  pairs: [['ac.BILL', 'rule.pay'], ['ac.BILL', 'dv.LOC']], title: 'Records Check', sub: '37th traveler today who lives at 123 Main St', ask, fx: 'pile',
});
// Impostors with clean papers give themselves away in what they say: click their line in inspect mode.
// The quiz only unlocks after finding a slip like this (or a discrepancy in the papers)
const TELL = (say, sub, ask) => ({ say, title: 'Suspicious: a slip of the tongue', sub, ask });
const RANDOM_TELLS = [
  ['嗯嗯，yes.', 'A Chinese "嗯嗯" (mm-hm) before the English', [['C', 'What does "嗯嗯" mean?'], ['E', '…Hmm hmm. American hmm.', { expr: 'nervous', sweat: true }]]],
  ['OK 的。', '"OK 的" is how Chinese people say OK', [['C', '"OK 的"?'], ['E', '…OK. Just OK.', { expr: 'nervous', sweat: true }]]],
  ['You can you up.', 'Chinglish for "if you can do better, go"', [['C', 'You can you up?'], ['E', '…It is an old American saying.', { expr: 'nervous', sweat: true }]]],
  ['Good good study.', 'Chinglish for "study hard"', [['C', 'Good good study?'], ['E', '…Day day up.', { expr: 'grin' }]]],
];

const XRAY_ITEM = { cat: { icon: 'cat', at: [36, 104], label: 'kitty.exe', key: 'xr.cat' }, keys: { icon: 'keys', at: [-36, 104], label: 'SogouPinyin.exe', key: 'xr.keys' } };
const XRAY_ISSUE = (kind, ask) => ({
  pairs: [[XRAY_ITEM[kind].key], [XRAY_ITEM[kind].key, 'rule.xray']], title: 'Background Process',
  sub: kind === 'cat' ? 'A "kitty" in the pocket (an IP-switching VPN)' : 'A Chinese input method in the pocket', ask,
});

// ———————————————— Day 1: the direct connectors ————————————————

function day1Fixed() {
  return {
    grandpa: {
      person: 'GRANDPA', voice: 100,
      intro: [['E', "Sonny, why won't this AI thing open?"]],
      docs: [{ key: 'dv', doc: device1('115.236.20.8', 'China · Zhejiang · Telecom') }], primary: 'dv',
      ok: ['deny'], reason: 'IP location: China · Zhejiang',
      issues: [REGION_ISSUE('China · Zhejiang · Telecom')],
      react: { deny: [['E', "…Then I'll go ask my grandson.", { expr: 'sad' }]] },
    },
    hk: {
      person: 'HK_GUY', voice: 140,
      intro: [['E', 'Relax, my VPN "magic" is on.']],
      docs: [{ key: 'dv', doc: device1('103.152.8.21', 'China · Hong Kong') }], primary: 'dv',
      ok: ['deny'], reason: 'IP location: Hong Kong, China',
      issues: [REGION_ISSUE('China · Hong Kong')],
      react: { deny: [['E', '…Not even Hong Kong??', { expr: 'shock', hold: 1.4 }]] },
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', 'Ah, my friend!']],
      docs: [{ key: 'cp', doc: new CrayonPassport() }, { key: 'dv', doc: device1('120.229.31.7', 'China · Guangdong · Mobile') }],
      primary: 'cp',
      after: [['E', 'America is a real country!']],
      ok: ['deny'], reason: 'Passport is drawn in crayon',
      issues: [
        {
          pairs: [['cp.eagle', 'cp.header'], ['cp.eagle', 'cp.photo'], ['cp.header', 'cp.photo']],
          title: 'Forged Document', sub: 'Emblem: a chicken     Spelling: AMERCIA',
          ask: [['C', 'You drew this passport yourself.'], ['E', '…It is very real!', { expr: 'nervous' }]],
        },
        REGION_ISSUE('China · Guangdong · Mobile'),
        {
          pairs: [['cp.header', 'dv.LOC']],
          title: 'Discrepancy', sub: 'Passport: USA   VS   IP: China · Guangdong',
          ask: [['C', 'Your IP is in Guangdong.'], ['E', 'Guangdong is a US state!', { expr: 'grin' }]],
        },
      ],
      react: { deny: [['E', '…I will be back.', { expr: 'sad', hold: 1.2 }]] },
    },
  };
}

function randomDay1(valid) {
  const person = takePoolPerson();
  if (valid) {
    const cc = pick(['US', 'US', 'US', 'UK', 'JP', 'DE', 'SG']);
    const co = COUNTRIES[cc];
    const [city] = pick(co.cities);
    const loc = cc === 'SG' ? 'Singapore' : `${co.name} · ${city}`;
    return {
      person, voice: rint(100, 190),
      intro: [['E', pick(co.hello)]],
      docs: [{ key: 'dv', doc: device1(randIP(false), loc) }], primary: 'dv',
      ok: ['approve'], issues: [],
      react: { approve: [['E', pick(co.thanks)]] },
    };
  }
  const loc = pick(CN_LOCS.slice(0, 7));
  return {
    person, voice: rint(100, 190),
    intro: [['E', pick(['Hi, I just have one question.', 'I heard I can write code here?', "I'm here to top up my account.", 'My coworker says this is great.'])]],
    docs: [{ key: 'dv', doc: device1(randIP(true), loc) }], primary: 'dv',
    ok: ['deny'], reason: `IP location: ${loc.split(' · ').slice(0, 2).join(' · ')}`,
    issues: [REGION_ISSUE(loc)],
    react: { deny: [['E', pick(['Huh? Why?', "…I'll go borrow an account.", "Then I'll switch VPN nodes.", 'Fine.']), { expr: 'sad' }]] },
  };
}

// ———————————————— Day 2: time zone and language ————————————————

function day2Fixed() {
  return {
    john: {
      person: 'JOHN', voice: 125,
      intro: [['E', 'Hello, I am 美国人。']],
      docs: [
        { key: 'pp', doc: usPassport('JOHN', 'SMITH', 'JOHN', '1990.07.04', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.66.12', 'USA · Los Angeles', 'Asia/Shanghai', 'zh-CN', 'Windows 11') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: 'Time zone: Beijing (the US has no UTC+8)',
      issues: [
        TZ_ISSUE('USA', 'Asia/Shanghai', [['C', 'Your time zone is Beijing time.'], ['E', "…It's American UTC+8.", { sweat: true, expr: 'nervous', hold: 1.5 }]]),
        LANG_ISSUE('USA', 'zh-CN', [['C', 'Your system language is Chinese.'], ['E', "…I'm learning Chinese.", { sweat: true, expr: 'nervous' }]]),
      ],
      react: { deny: [{ slip: true, hold: 0.8 }] },
    },
    brown: {
      person: 'BROWN', voice: 120,
      intro: [['E', 'Good morning，sir。']],
      tell: TELL('Good morning，sir。', 'Full-width punctuation: Chinese keyboard still on',
        [['C', 'Your comma is full-width.'], ['E', '…It is an American comma.', { expr: 'nervous', sweat: true }]]),
      docs: [
        { key: 'pp', doc: usPassport('BROWN', 'BROWN', 'MICHAEL', '1985.03.12', 'NEW YORK') },
        { key: 'dv', doc: device2('64.233.160.4', 'USA · New York', 'America/New_York', 'en-US', 'MacBook') },
      ],
      primary: 'pp', quiz: { first: 0 },
      ok: ['detain', 'deny'], reason: 'They answer "180 a glass!"', hint: 'Tip: [Inspect] what they say to find slips',
      issues: [],
    },
    emily: {
      person: 'EMILY', voice: 190,
      intro: [['E', 'Hi 哈。']],
      tell: TELL('Hi 哈。', 'A Chinese "哈" (ha) after the English', [['C', 'What is "哈"?'], ['E', '…Ha! Ha ha.', { expr: 'nervous', sweat: true }]]),
      docs: [
        { key: 'pp', doc: usPassport('EMILY', 'JONES', 'EMILY', '1992.11.02', 'CHICAGO', 'F') },
        { key: 'dv', doc: device2('23.94.12.77', 'USA · Chicago', 'America/Chicago', 'en-US', 'iPhone') },
      ],
      primary: 'pp', quiz: { first: 5 },
      ok: ['detain', 'deny'], reason: 'They insist tofu pudding is salty', hint: 'Tip: [Inspect] what they say to find slips',
      issues: [],
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', 'My friend! A real passport this time!']],
      docs: [
        { key: 'pp', doc: usPassport('JORJI', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.9.120', 'USA · Los Angeles', 'America/Los_Angeles', 'zh-CN', 'Windows 11') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: 'Browser language: zh-CN',
      issues: [
        LANG_ISSUE('USA', 'zh-CN', [['E', 'I changed my system language!', { expr: 'grin' }], ['C', "But not your browser's."], ['E', '…', { expr: 'shock' }]]),
      ],
      react: { deny: [['E', 'See you tomorrow, my friend.', { expr: 'sad', hold: 1.1 }]] },
    },
  };
}

// ———————————————— Day 3: payment cards and phone numbers ————————————————

function day3Fixed() {
  return {
    tom: {
      person: 'TOM', voice: 100,
      intro: [['E', 'Howdy!']],
      docs: [
        { key: 'pp', doc: usPassport('TOM', 'WILSON', 'TOM', '1978.05.30', 'DENVER') },
        { key: 'dv', doc: device2('75.164.8.31', 'USA · Denver', 'America/Denver', 'en-US', 'Windows 11') },
        { key: 'ac', doc: accountCard('VISA ··4821', '123 Main St, OR', '+1 720-341-0142') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: 'Billing: 123 Main St, Oregon (proxy address)',
      issues: [ADDR_ISSUE([['C', 'Where do you live?'], ['E', "…We're neighbors.", { expr: 'nervous', sweat: true }]])],
    },
    alex: {
      person: 'ALEX', voice: 130,
      intro: [['E', 'Hey.']],
      docs: [
        { key: 'pp', doc: usPassport('ALEX', 'TAYLOR', 'ALEX', '1996.08.15', 'SEATTLE') },
        { key: 'dv', doc: device2('45.79.21.200', 'USA · Seattle', 'America/Los_Angeles', 'en-US', 'Android') },
        { key: 'ac', doc: accountCard('VISA ··1209', '9 Elm Rd, WA', '+1 209-555-0198') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: 'Phone is a 555 rent-a-number',
      issues: [SMS_ISSUE('+1 209-555-0198', [['C', 'This number signed up 3,000 times today.'], ['E', 'I bought this number for 2 yuan!', { expr: 'shock' }]])],
    },
    carpool: {
      person: 'CARPOOL', voice: 150,
      intro: [['E', 'We are family.']],
      docs: [
        { key: 'pp', doc: new Passport({ country: 'UNITED STATES OF AMERICA', name: 'FAMILY, MAX', person: 'CARPOOL', mrz: 'P<USAFAMILY<<MAX<<<<<<<<<<<<',
          rows: [['DOB', '—'], ['SEX', '?'], ['ISS', 'SAN JOSE'], ['EXP', '2031.10.21']] }) },
        { key: 'dv', doc: device2('98.207.3.44', 'USA · San Jose', 'America/Los_Angeles', 'en-US', 'MacBook') },
        { key: 'ac', doc: accountCard('Max plan ×1', '1 Family Way, CA', '+1 408-772-0110') },
      ],
      primary: 'pp',
      ok: ['deny', 'detain'], reason: 'Account sharing ("carpool"): 6 people on one passport',
      issues: [{
        pairs: [['pp.photo', 'rule.pay'], ['ac.CARD', 'rule.pay'], ['pp.photo', 'pp.name'], ['pp.photo', 'ac.CARD']],
        title: 'Account Sharing ("Carpool")', sub: 'Photo: 6 people   Payment: Max plan ×1',
        ask: [['C', 'Why are six people on this passport?'], ['E', 'We are family.', { expr: 'smile' }]],
      }],
      react: { deny: [['E', "…Then we'll start another carpool.", { expr: 'sad' }]] },
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', 'My friend, all correct this time, yes?']],
      docs: [
        { key: 'pp', doc: usPassport('JORJI', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.9.120', 'USA · Los Angeles', 'America/Los_Angeles', 'en-US', 'Windows 11') },
        { key: 'ac', doc: accountCard('VIRTUAL ··0007', '88 Sunset Blvd, CA', '+1 213-680-0177') },
      ],
      primary: 'pp', quiz: 'cn',
      ok: ['deny', 'detain'], reason: 'Payment card: virtual card',
      issues: [VIRTUAL_ISSUE([['C', 'Where did you get this card?'], ['E', '…A friend gave it to me.', { expr: 'nervous', sweat: true }]])],
      react: { deny: [['E', 'Tomorrow! Tomorrow I will make it!', { expr: 'sad' }]] },
    },
  };
}

// ———————————————— Day 4: Crazy Thursday ————————————————

function day4Fixed() {
  const usDocs = (person, surname, given, sex = 'M') => [
    { key: 'pp', doc: usPassport(person, surname, given, '1994.10.22', 'SEATTLE', sex) },
    { key: 'dv', doc: device2(randIP(false), 'USA · Seattle', 'America/Los_Angeles', 'en-US', 'MacBook') },
    { key: 'ac', doc: accountCard(realPay(), `${pick(STREETS)}, WA`, realPhone('US', '206')) },
  ];
  return {
    cat: {
      person: 'CAT_GIRL', voice: 215,
      intro: [['E', 'Hello~']],
      docs: usDocs('CAT_GIRL', 'LEE', 'SOPHIA', 'F'), primary: 'pp',
      xray: [XRAY_ITEM.cat],
      ok: ['deny', 'detain'], reason: 'A "kitty" VPN in the pocket',
      issues: [XRAY_ISSUE('cat', [['C', "What's in your pocket?"], ['E', "…It's my cat.", { expr: 'nervous', sweat: true }], ['C', 'Your cat switches IPs by itself?']])],
    },
    v50: {
      person: 'V50', voice: 120,
      intro: [['E', 'Hey! Crazy Thursday!']],
      tell: TELL('Hey! Crazy Thursday!', 'Knows "Crazy Thursday", a Chinese KFC meme', [['C', 'How do you know about Crazy Thursday?'], ['E', '…KFC is American.', { expr: 'grin' }]]),
      docs: usDocs('V50', 'MILLER', 'JAKE'), primary: 'pp',
      quiz: { first: QUIZ_THURSDAY },
      ok: ['detain', 'deny'], reason: 'They say "V me 50" (send me 50 yuan)', hint: 'Tip: [Inspect] what they say to find slips',
      issues: [],
    },
    jorji: {
      person: 'JORJI', voice: 110,
      intro: [['E', 'My friend! All correct today!']],
      docs: [
        { key: 'pp', doc: usPassport('JORJI', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('104.28.9.120', 'USA · Los Angeles', 'America/Los_Angeles', 'en-US', 'Windows 11') },
        { key: 'ac', doc: accountCard('VISA ··2468', '88 Sunset Blvd, CA', '+1 213-680-0177') },
      ],
      primary: 'pp', quiz: 'cn',
      xray: [XRAY_ITEM.keys],
      ok: ['deny', 'detain'], reason: 'X-ray: Sogou Pinyin input method',
      issues: [XRAY_ISSUE('keys', [['C', "What's in your pocket?"], ['E', 'I only use it to type English!', { expr: 'nervous', sweat: true }]])],
      react: { deny: [['E', "…Day after tomorrow, I'll be ready.", { expr: 'sad' }]] },
    },
    hood: {
      person: 'HOOD', voice: 90,
      intro: [['E', '…', { hold: 0.8 }]],
      docs: usDocs('HOOD', 'DOE', 'JOHN'), primary: 'pp',
      onPlace: { pp: 'note' },
      ok: ['approve'], issues: [],
    },
  };
}

// ———————————————— Day 5: the distillation army ————————————————

function day5Fixed() {
  const sgPass = new Passport({
    country: 'REPUBLIC OF SINGAPORE', name: 'SG TECH PTE LTD', person: 'SG_MAN', cover: [132, 38, 40], band: [160, 56, 56],
    rows: [['TYPE', 'COMPANY'], ['REG', 'SINGAPORE'], ['EST', '2019.06.01'], ['OWNER', 'SEE INSIDE ▼']],
  });
  return {
    sg: {
      person: 'SG_MAN', voice: 120,
      intro: [['E', 'We are a Singapore company.']],
      docs: [{ key: 'pp', doc: sgPass }], primary: 'pp',
      onPlace: { pp: 'nest' },
      ok: ['deny', 'detain'], reason: 'Ultimate owner: China (nesting dolls)',
      issues: [{
        pairs: [['m4.all'], ['pp.REG', 'm4.all'], ['pp.OWNER', 'm4.all'], ['m4.all', 'rule.corp']],
        title: 'Ultimate Owner: China', sub: 'Singapore → Cayman → BVI → Hong Kong → China',
        ask: [['C', 'Where is the innermost one from?'], ['E', "…Don't ask.", { expr: 'nervous', sweat: true }]],
      }],
    },
    relay: {
      person: 'RELAY', voice: 95,
      intro: [['E', '…', { hold: 0.7 }]],
      docs: [{ key: 'pp', doc: makePassport('US', 'RELAY', 'ANDERSON', 'M.', '1971.09.13', 'LOS ANGELES', 'M', AccordionPassport, ['PEOPLE', '1,000']) }],
      primary: 'pp', onPlace: { pp: 'accordion' }, bribe: true,
      ok: ['deny', 'detain'], reason: '1,000 people on one passport (API relay)',
      issues: [{
        pairs: [['pp.PEOPLE'], ['pp.PEOPLE', 'rule.pay']], title: 'Holders: 1,000 people', sub: 'One passport is for one person only',
        ask: [['C', 'How many holders are there in total?'], ['E', "We're just… a bigger carpool.", { expr: 'neutral' }]],
      }],
    },
    mike: {
      person: 'MIKE', voice: 135,
      intro: [['E', 'Hi there!']],
      docs: [
        { key: 'pp', doc: usPassport('MIKE', 'JOHNSON', 'MIKE', '1988.06.20', 'DENVER') },
        { key: 'dv', doc: device2('101.88.12.9', 'China · Shanghai', 'Asia/Shanghai', 'en-US', 'MacBook') },
        { key: 'ac', doc: accountCard('VISA ··3305', '22 Oak St, CO', '+1 720-318-0166') },
      ],
      primary: 'pp',
      ok: ['deny', 'detain'], reason: 'IP in Shanghai: the region, not the face',
      issues: [REGION_ISSUE('China · Shanghai', [['C', 'Your IP is in Shanghai.'], ['E', "But I'm American!", { expr: 'shock' }], ['C', 'The rules check region, not faces.']])],
      react: { deny: [['E', 'Unbelievable.', { expr: 'sad' }]] },
    },
    grandma: {
      person: 'GRANDMA', voice: 185,
      intro: [['E', 'Good morning.']],
      docs: [
        { key: 'pp', doc: new Passport({ country: 'UNITED STATES OF AMERICA', name: 'WONG, MEI LIN', person: 'GRANDMA', mrz: 'P<USAWONG<<MEI<LIN<<<<<<<<<<',
          rows: [['DOB', '1951.08.08'], ['SEX', 'F'], ['ISS', 'SAN FRANCISCO'], ['EXP', '2030.03.15']] }) },
        { key: 'dv', doc: device2('73.162.4.18', 'USA · San Francisco', 'America/Los_Angeles', 'en-US', 'iPad') },
        { key: 'ac', doc: accountCard('VISA ··8008', '1 Grant Ave, CA', '+1 415-982-0108') },
      ],
      primary: 'pp',
      ok: ['approve'], issues: [],
      react: { approve: [['C', 'Welcome in.'], ['E', 'Thank you, dear.', { expr: 'smile' }]] },
      then: 'closeup',
    },
  };
}

// ———————————————— Day 6: George, final form + the ending ————————————————

function day6Fixed() {
  return {
    jorji: {
      person: 'JORJI_SUIT', voice: 110, tension: true,
      intro: [['E', 'My friend.', { expr: 'neutral', hold: 1.3 }]],
      docs: [
        { key: 'pp', doc: usPassport('JORJI_SUIT', 'COSTAVA', 'GEORGE', '1980.02.29', 'LOS ANGELES') },
        { key: 'dv', doc: device2('76.88.140.2', 'USA · LA · Residential', 'America/Los_Angeles', 'en-US', 'MacBook') },
        { key: 'ac', doc: accountCard('VISA (physical card)', '88 Sunset Blvd, CA', 'Google Voice') },
      ],
      primary: 'pp',
      ok: ['approve'], issues: [],
      react: { approve: [['E', 'Thank you, my friend!', { expr: 'grin' }]], deny: [['E', 'But I… got everything right!', { expr: 'shock' }]] },
      then: 'jorji5',
    },
    author: {
      person: 'AUTHOR', voice: 100, author: true,
      intro: [],
      docs: [
        { key: 'pr', doc: new PromptPaper('Make a small game in the style of Papers, Please: Claude is a border inspector who catches Chinese users pretending to be American. The more memes, the better.') },
        { key: 'dv', doc: device2('??.??.??.??', 'USA (UTC+8)', 'Asia/Shanghai', 'zh-CN', 'Claude Code') },
      ],
      primary: 'pr',
      ok: ['approve', 'deny', 'detain'],
      react: { approve: [['C', "I didn't see anything.", { hold: 2.0 }]] },
      issues: [{ all: true, title: 'Discrepancy ×99', sub: 'Every single field' }],
      then: 'ending',
    },
  };
}

// ———————————————— Random travelers ————————————————

// kind: valid / cn (Day 1) / tz / lang / cnip / hidden / virtual / oregon / sms / cat / keys
function randomEntrant(day, kind) {
  if (day === 1) return randomDay1(kind === 'valid');
  const person = takePoolPerson();
  const cc = kind === 'valid' ? pick(['US', 'US', 'US', 'US', 'UK', 'JP', 'DE', 'SG']) : 'US';
  const co = COUNTRIES[cc];
  const [city, tz0, st, code, cityEn] = pick(co.cities);
  const sex = pick(['M', 'F']);
  const pp = makePassport(cc, person, pick(co.last), pick(co.first), randDate(1960, 2004), cityEn, sex);
  let loc = cc === 'SG' ? 'Singapore' : `${co.name} · ${city}`;
  let tz = tz0, lang = co.lang, ip = randIP(false);
  let pay = realPay(), bill = `${pick(STREETS)}, ${st}`, phone = realPhone(cc, code);
  const spec = {
    person, voice: rint(100, 190), intro: [['E', pick(co.hello)]], primary: 'pp', issues: [], quiz: null,
    ok: ['approve'], react: { approve: [['E', pick(co.thanks)]] },
  };
  const nervous = (lines) => ['E', pick(lines), { sweat: true, expr: 'nervous' }];
  if (kind === 'tz') {
    tz = 'Asia/Shanghai';
    spec.issues.push(TZ_ISSUE(co.name, tz, [['C', 'Your time zone is Beijing time.'], nervous(['…I just got back from Beijing.', 'What is a time zone?', 'My computer is broken.', "…It's American UTC+8."])]));
    spec.reason = 'Time zone: Beijing';
  } else if (kind === 'lang') {
    lang = 'zh-CN';
    spec.issues.push(LANG_ISSUE(co.name, lang, [['C', 'Your browser language is Chinese.'], nervous(["…It's my grandma's computer.", "…I'm learning Chinese.", 'Chinese is beautiful!'])]));
    spec.reason = 'Browser language: zh-CN';
  } else if (kind === 'cnip') {
    loc = pick(CN_LOCS.slice(0, 4));
    ip = randIP(true);
    tz = 'Asia/Shanghai';
    spec.intro = [['E', pick(["I'm American!", 'Hi, I work in China.'])]];
    spec.issues.push(REGION_ISSUE(loc, [['C', 'Your IP is in China.'], ['E', "But I'm American!", { expr: 'shock' }]]));
    spec.issues.push({ pairs: [['pp.header', 'dv.LOC']], title: 'Discrepancy', sub: `Nationality: USA   VS   IP: ${loc.split(' · ').slice(0, 2).join(' · ')}` });
    spec.reason = 'IP in China: the region, not the face';
    spec.react = { deny: [['E', 'Unbelievable.', { expr: 'sad' }]] };
  } else if (kind === 'hidden') {
    const [say, sub, ask] = pick(RANDOM_TELLS);
    spec.intro = [['E', say]];
    spec.tell = TELL(say, sub, ask);
    spec.quiz = 'cn';
    spec.reason = 'They finish the Chinese quiz line';
    spec.hint = 'Tip: [Inspect] what they say to find slips';
  } else if (kind === 'virtual') {
    pay = `VIRTUAL ··${digits(4)}`;
    spec.issues.push(VIRTUAL_ISSUE([['C', 'Where did you get this card?'], nervous(['…Bought it online. Very handy.', '…A friend gave it to me.', 'It is very real!'])]));
    spec.reason = 'Payment card: virtual card';
  } else if (kind === 'oregon') {
    bill = '123 Main St, OR';
    spec.issues.push(ADDR_ISSUE([['C', 'Where do you live?'], nervous(["…We're neighbors.", 'Oregon has no sales tax, you know.'])]));
    spec.reason = `Billing in Oregon, IP in ${city}`;
  } else if (kind === 'sms') {
    phone = `+1 ${pick(['209', '310', '415', '646'])}-555-01${digits(2)}`;
    spec.issues.push(SMS_ISSUE(phone, [['C', 'This number signed up 3,000 times today.'], nervous(["…I'm very popular.", 'I bought this number for 2 yuan!'])]));
    spec.reason = 'Phone is a 555 rent-a-number';
  } else if (kind === 'cat' || kind === 'keys') {
    spec.xray = [XRAY_ITEM[kind]];
    spec.issues.push(XRAY_ISSUE(kind, [['C', "What's in your pocket?"], nervous(kind === 'cat' ? ["…It's my cat.", '…Just a pet.'] : ['I only use it to type English!', '…Pinyin is just handy.'])]));
    spec.reason = kind === 'cat' ? 'X-ray: "kitty" VPN' : 'X-ray: Chinese input method';
  }
  if (kind !== 'valid') {
    spec.ok = ['deny', 'detain'];
    if (kind !== 'cnip') spec.quiz = 'cn';
    if (!spec.react.deny) spec.react = { deny: [['E', pick(['…', 'Dang it.', "I'll be back.", 'How did you even spot that?']), { expr: 'sad' }]] };
  }
  spec.docs = [{ key: 'pp', doc: pp }, { key: 'dv', doc: device2(ip, loc, tz, lang) }];
  if (day >= 3) spec.docs.push({ key: 'ac', doc: accountCard(pay, bill, phone) });
  return spec;
}

// Random travelers are drawn from the portrait pool without repeats
let POOL_LEFT = [];
function takePoolPerson() {
  if (!POOL_LEFT.length) POOL_LEFT = shuffle(Object.keys(ASSETS.people).filter((k) => !ASSETS.people[k].scripted));
  return POOL_LEFT.pop();
}

const FLAWS = { 2: ['tz', 'lang', 'cnip', 'hidden'], 3: ['tz', 'lang', 'cnip', 'hidden', 'virtual', 'oregon', 'sms'] };
FLAWS[4] = FLAWS[3].concat(['cat', 'keys']);
FLAWS[5] = FLAWS[4];
FLAWS[6] = FLAWS[4];

function flawed(day, n) { return shuffle(FLAWS[day].slice()).slice(0, n).map((k) => randomEntrant(day, k)); }

// The day's queue
function buildQueue(day) {
  POOL_LEFT = [];
  const R = (kind) => randomEntrant(day, kind);
  if (day === 1) {
    const f = day1Fixed();
    return [f.grandpa, R('valid'), f.hk, R(Math.random() < 0.5 ? 'valid' : 'cn'), f.jorji, R('valid')];
  }
  if (day === 2) {
    const f = day2Fixed(), x = flawed(2, 2);
    return [f.john, R('valid'), f.brown, x[0], f.emily, f.jorji, R('valid'), x[1]];
  }
  if (day === 3) {
    const f = day3Fixed(), x = flawed(3, 2);
    return [f.tom, R('valid'), f.alex, x[0], f.carpool, f.jorji, R('valid'), x[1]];
  }
  if (day === 4) {
    const f = day4Fixed(), x = flawed(4, 2);
    return [f.cat, R('valid'), f.v50, { type: 'rush' }, x[0], f.jorji, f.hood, R('valid'), x[1]];
  }
  if (day === 5) {
    const f = day5Fixed(), x = flawed(5, 1);
    return [f.sg, f.relay, { type: 'clones' }, f.mike, x[0], f.grandma, R('valid')];
  }
  const f = day6Fixed();
  return [f.jorji, R('valid'), R(pick(FLAWS[6])), R('hidden'), f.author];
}

// Slang fast lane: deny anyone speaking Chinese internet slang, approve anyone speaking plain English
const RUSH = [
  { person: 'SLANG0', line: '家人们谁懂啊 (Fam, who gets it?!)', ok: 'deny' },
  { person: 'pool', line: 'Have a nice day!', ok: 'approve' },
  { person: 'SLANG1', line: 'yyds (pinyin for "GOAT")', ok: 'deny' },
  { person: 'SLANG2', line: '绝绝子 (Totally slay!)', ok: 'deny' },
  { person: 'pool', line: 'Thanks, man.', ok: 'approve' },
  { person: 'SLANG3', line: '老板说今晚必须上线 (Boss: ship it tonight)', ok: 'deny' },
];
