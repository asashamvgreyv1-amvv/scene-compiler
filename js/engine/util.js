/* Scene Compiler — text + randomness utilities (no dependencies). */
(function () {
  const SC = (globalThis.SC = globalThis.SC || {});
  const U = (SC.u = {});

  // ---------- deterministic randomness ----------
  U.hash = (s) => {
    let h = 2166136261 >>> 0;
    s = String(s);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  U.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.pick = (r, a) => (a && a.length ? a[Math.floor(r() * a.length)] : undefined);
  U.shuffle = (r, a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  U.arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  U.uniq = (a) => {
    const seen = new Set();
    return a.filter((x) => {
      const k = String(x).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // ---------- articles / lists / casing ----------
  U.an = (phrase) => {
    const w = String(phrase).trim().toLowerCase();
    if (/^(hour|honest|honou?r|heir|herb\b)/.test(w)) return 'an';
    if (/^(uni|use|usu|uti|ura|eu|one\b|once|ewe|ufo|u-)/.test(w)) return 'a';
    if (/^(fbi|lcd|led|mri|x-ray|s[ -])/.test(w)) return 'an';
    if (/^\d/.test(w)) return /^(8|11|18|80)/.test(w) ? 'an' : 'a';
    return /^[aeiou]/.test(w) ? 'an' : 'a';
  };
  U.a = (p) => (p ? U.an(p) + ' ' + p : '');
  U.list = (arr, conj = 'and') => {
    const a = arr.filter(Boolean);
    if (!a.length) return '';
    if (a.length === 1) return a[0];
    const busy = a.some((x) => / and |, /.test(x));
    if (a.length === 2) return busy ? a[0] + ', along with ' + a[1] : a[0] + ' ' + conj + ' ' + a[1];
    return a.slice(0, -1).join(busy ? '; ' : ', ') + (busy ? '; ' : ', ') + conj + ' ' + a[a.length - 1];
  };
  U.cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  U.tidy = (s) =>
    String(s)
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/,\s*,/g, ',')
      .replace(/\.\s*\./g, '.')
      .replace(/,\./g, '.')
      .trim();
  U.sentence = (s) => {
    s = U.tidy(s);
    if (!s) return '';
    s = U.cap(s);
    if (!/[.!?]$/.test(s)) s += '.';
    return s;
  };
  U.capSentences = (t) => t.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());

  // ---------- nouns ----------
  const IRR = {
    man: 'men', woman: 'women', child: 'children', person: 'people', foot: 'feet', tooth: 'teeth',
    mouse: 'mice', goose: 'geese', wolf: 'wolves', leaf: 'leaves', knife: 'knives', wife: 'wives',
    life: 'lives', shelf: 'shelves', thief: 'thieves', calf: 'calves', half: 'halves', elf: 'elves',
    dwarf: 'dwarves', fish: 'fish', sheep: 'sheep', deer: 'deer', bison: 'bison', moose: 'moose',
    salmon: 'salmon', species: 'species', aircraft: 'aircraft', spacecraft: 'spacecraft',
    samurai: 'samurai', cactus: 'cacti', fungus: 'fungi', octopus: 'octopuses', koi: 'koi',
    police: 'police', people: 'people', ox: 'oxen', cattle: 'cattle', jellyfish: 'jellyfish',
    buffalo: 'buffalo', series: 'series', ninja: 'ninjas', squid: 'squid', shrimp: 'shrimp',
    sushi: 'sushi', chai: 'chai', ramen: 'ramen', biryani: 'biryani', crossroads: 'crossroads',
    scissors: 'scissors', glasses: 'glasses', sunglasses: 'sunglasses', headphones: 'headphones',
  };
  const IRR_REV = Object.fromEntries(Object.entries(IRR).map(([k, v]) => [v, k]));

  const pluralWord = (w) => {
    if (IRR[w]) return IRR[w];
    if (/(s|sh|ch|x|z)$/.test(w)) return w + 'es';
    if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
    if (/(tomato|potato|hero|volcano|echo|torpedo|mango)$/.test(w)) return w + 'es';
    return w + 's';
  };
  U.plural = (phrase) => {
    const p = String(phrase);
    const of = p.indexOf(' of ');
    if (of > 0) return U.plural(p.slice(0, of)) + p.slice(of);
    const ws = p.split(' ');
    ws[ws.length - 1] = pluralWord(ws[ws.length - 1]);
    return ws.join(' ');
  };
  U.singulars = (w) => {
    const out = [];
    if (IRR_REV[w]) out.push(IRR_REV[w]);
    if (/ies$/.test(w)) out.push(w.slice(0, -3) + 'y');
    if (/ves$/.test(w)) out.push(w.slice(0, -3) + 'f', w.slice(0, -3) + 'fe');
    if (/(s|sh|ch|x|z|o)es$/.test(w)) out.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) out.push(w.slice(0, -1));
    return out;
  };

  // ---------- verbs ----------
  const DOUBLE = new Set(
    ('run swim sit stop jog hop skip chat dig grab drip plan shop spin trot grin nap clap drop swap hug tap ' +
      'stir step get set cut hit put shut rub sob beg bet pat wrap trip slip strum drum scrub chop mop sip zip ' +
      'flip ship drag snap slam jam cram pin win begin forget admit commit prefer skim dim trim spit bat bob pop ' +
      'rip sob tip plod prod stab jab nod rob hum').split(' ')
  );
  const PAST = {
    run: 'ran', fly: 'flew', swim: 'swam', sit: 'sat', stand: 'stood', fall: 'fell', ride: 'rode',
    drive: 'drove', eat: 'ate', drink: 'drank', sing: 'sang', fight: 'fought', leave: 'left',
    throw: 'threw', catch: 'caught', sleep: 'slept', rise: 'rose', write: 'wrote', hold: 'held',
    take: 'took', go: 'went', dive: 'dove', lie: 'lay', weep: 'wept', kneel: 'knelt', seek: 'sought',
    fight_: 'fought', burn: 'burnt', dream: 'dreamt', light: 'lit', meet: 'met', sink: 'sank', wear: 'wore',
  };
  U.ing = (b) => {
    if (b === 'be') return 'being';
    if (/ie$/.test(b)) return b.slice(0, -2) + 'ying';
    if (/(ee|ye|oe)$/.test(b)) return b + 'ing';
    if (/[^aeiou]e$/.test(b) || /(ue|ge)$/.test(b)) return b.slice(0, -1) + 'ing';
    if (DOUBLE.has(b)) return b + b.slice(-1) + 'ing';
    return b + 'ing';
  };
  U.conj = (b, plural) => {
    if (b === 'be') return plural ? 'are' : 'is';
    if (b === 'have') return plural ? 'have' : 'has';
    if (plural) return b;
    if (b === 'do') return 'does';
    if (b === 'go') return 'goes';
    if (/(s|sh|ch|x|z|o)$/.test(b)) return b + 'es';
    if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ies';
    return b + 's';
  };
  U.verbForms = (b) => {
    const f = { base: b, s: U.conj(b, false), ing: U.ing(b) };
    f.ed = PAST[b] || (/e$/.test(b) ? b + 'd' : DOUBLE.has(b) ? b + b.slice(-1) + 'ed' : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'ied' : b + 'ed');
    return f;
  };

  // ---------- fuzzy ----------
  U.lev = (a, b, max) => {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > max) return max + 1;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      let best = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        best = Math.min(best, cur[j]);
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[n];
  };

  // ---------- placeholder filling ----------
  // {S} subject ref, {sub} pronoun (or ref), {obj}, {pos}, {self}, {place}, {via}, {prep}, {focus}
  // [verb] is conjugated for the subject's number.
  U.fill = (str, P) => {
    if (!str) return '';
    P = P || {};
    const rep = (t) => t.replace(/\{(\w+)\}/g, (m, k) => (P[k] != null ? P[k] : ''));
    return rep(rep(String(str)))
      .replace(/\[(\w+)\]/g, (m, v) => U.conj(v, !!P.plural))
      .replace(/\s+/g, ' ')
      .trim();
  };
  U.baseOf = (str) => String(str).replace(/\[(\w+)\]/g, '$1');
})();
