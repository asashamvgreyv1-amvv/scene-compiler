/* Scene Compiler — knowledge-base registry + phrase index.
 *
 * Every KB entry is a plain object registered under a category. Shared fields:
 *   syn   'a|b|c'           alternate phrases that map to this entry
 *   tags  'x y z'           facts this entry asserts (rules match on tags)
 *   bias  {slot: ...}       votes for slots (see infer.js for slot names)
 *   add   {slot: [...]}     same as bias; kept separate only for readability
 *   ban   {slot: 'a, b'}    values this entry makes impossible
 * Slot values are either 'key:weight, key:weight' strings or arrays of
 * phrases / [phrase, weight] pairs.
 */
(function () {
  const SC = (globalThis.SC = globalThis.SC || {});
  const U = SC.u;
  SC.kb = SC.kb || {};
  SC.rules = SC.rules || [];

  SC.def = function (cat, map) {
    const bucket = (SC.kb[cat] = SC.kb[cat] || {});
    for (const id of Object.keys(map)) {
      const e = map[id];
      e.id = id;
      e.cat = cat;
      if (!e.n) e.n = id;
      bucket[id] = e;
    }
  };
  SC.defRules = (list) => SC.rules.push(...list);
  SC.get = (cat, id) => (SC.kb[cat] || {})[id];

  const NOUNS = new Set(['person', 'animal', 'thing', 'place', 'garment', 'wgen']);
  // When one phrase maps to several entries, the earlier category wins.
  const PRI = ['wstyle', 'style', 'genre', 'mood', 'weather', 'time', 'event', 'season', 'light', 'palette', 'shot', 'angle',
    'move', 'pace', 'lens', 'dof', 'comp', 'region', 'dem', 'wgen', 'garment', 'place', 'person', 'animal', 'thing', 'action', 'color', 'mod'];

  SC.buildIndex = function () {
    const idx = new Map();
    const direct = new Set();
    let maxLen = 1;
    const add = (k, e) => {
      k = k.toLowerCase().trim();
      if (!k) return;
      maxLen = Math.max(maxLen, k.split(' ').length);
      if (!idx.has(k)) idx.set(k, []);
      const l = idx.get(k);
      if (!l.includes(e)) l.push(e);
    };
    for (const cat of Object.keys(SC.kb)) {
      for (const e of Object.values(SC.kb[cat])) {
        const keys = [e.id, ...(e.syn ? e.syn.split('|') : [])].map((s) => s.trim().toLowerCase()).filter(Boolean);
        for (const k of keys) {
          add(k, e);
          direct.add(k);
          if (NOUNS.has(cat)) add(U.plural(k), e);
          if (cat === 'action') {
            const [h, ...rest] = k.split(' ');
            const tail = rest.length ? ' ' + rest.join(' ') : '';
            const f = U.verbForms(h);
            [f.s, f.ing, f.ed].forEach((x) => add(x + tail, e));
          }
        }
        if (cat === 'region' && e.dem) {
          const d = { cat: 'dem', id: 'dem:' + e.id, region: e, n: e.dem.split('|')[0] };
          e.dem.split('|').forEach((x) => add(x, d));
        }
      }
    }
    SC.index = idx;
    SC.maxPhrase = maxLen;
    SC.fuzzyKeys = [...direct].filter((k) => k.length >= 4 && !/[\s\-']/.test(k));
  };

  SC.lookup = (phrase) => {
    const idx = SC.index;
    if (idx.has(phrase)) return idx.get(phrase);
    const ws = phrase.split(' ');
    const last = ws.pop();
    for (const s of U.singulars(last)) {
      const k = [...ws, s].join(' ');
      if (idx.has(k)) return idx.get(k);
    }
    if (phrase.includes('-')) {
      const k = phrase.replace(/-/g, ' ');
      if (idx.has(k)) return idx.get(k);
    }
    return null;
  };

  SC.choose = (entries, word, hint) => {
    if (entries.length === 1) return entries[0];
    if (/ing$/.test(word)) {
      const a = entries.find((e) => e.cat === 'action');
      if (a) return a;
    }
    if (hint) {
      const h = entries.find((e) => e.cat === hint);
      if (h) return h;
    }
    return entries.slice().sort((a, b) => PRI.indexOf(a.cat) - PRI.indexOf(b.cat))[0];
  };

  SC.fuzzy = (w) => {
    if (w.length < 4 || /\d/.test(w)) return null;
    const short = w.length === 4; // 4-letter words: only fix a dropped letter (ocen → ocean), never a swap (lone → love)
    const max = w.length >= 8 ? 2 : 1;
    let best = null;
    for (const k of SC.fuzzyKeys) {
      if (k[0] !== w[0]) continue;
      if (Math.abs(k.length - w.length) > max) continue;
      if (short && k.length !== 5) continue;
      const d = U.lev(w, k, max);
      let pre = 0;
      while (pre < k.length && k[pre] === w[pre]) pre++;
      if (d <= max && (!best || d < best.d || (d === best.d && pre > best.pre))) best = { k, d, pre };
    }
    return best ? { key: best.k, entries: SC.index.get(best.k) } : null;
  };
})();
