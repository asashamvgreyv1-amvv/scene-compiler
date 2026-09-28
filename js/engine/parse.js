/* Scene Compiler — keyword parser.
 * Turns free keyword text into typed "mentions" using longest-phrase matching
 * against the KB index, light morphology (plurals / verb forms), typo tolerance,
 * and a handful of grammatical cues (with / in / wearing / while / numbers).
 */
(function () {
  const SC = globalThis.SC;
  const U = SC.u;

  const NEG = new Set('no without not zero minus excluding except nothing never nor sans avoid'.split(' '));
  const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12,
    dozen: 12, dozens: 12, pair: 2, several: 3, few: 3, many: 6, multiple: 3, both: 2, hundreds: 20, group: 4, trio: 3, duo: 2 };
  const ROLE = {
    with: 'with', alongside: 'with', beside: 'with', accompanied: 'with', and: 'and', plus: 'and',
    in: 'place', inside: 'place', at: 'place', on: 'place', near: 'place', under: 'place', beneath: 'place',
    above: 'place', over: 'place', across: 'place', through: 'place', along: 'place', into: 'place', around: 'place',
    amid: 'place', among: 'place', within: 'place', outside: 'place', behind: 'place', atop: 'place', onto: 'place',
    by: 'place', from: 'from', wearing: 'wear', dressed: 'wear', wears: 'wear', clad: 'wear', while: 'while', as: 'as',
    during: 'during', like: 'like',
  };
  const STOP = new Set(('a an the of to is are was be very really just some his her their its my our your this that ' +
    'these those who which what where it he she they them him by for then so also into up down out off there here ' +
    'image picture photo of scene shot video clip showing show shows featuring feature light lighting background foreground frame ' +
    'herself himself themselves itself setting settings environment someone one\'s each').split(' '));
  // where people stand relative to the lead ("on one side", "behind her", "to his left")
  const POSN = [
    ['on one side', 'left'], ['on the other side', 'right'], ['on either side', 'flank'], ['on both sides', 'flank'],
    ['on her left', 'left'], ['on his left', 'left'], ['to her left', 'left'], ['to his left', 'left'], ['on the left', 'left'], ['to the left', 'left'], ['at left', 'left'],
    ['on her right', 'right'], ['on his right', 'right'], ['to her right', 'right'], ['to his right', 'right'], ['on the right', 'right'], ['to the right', 'right'], ['at right', 'right'],
    ['behind her', 'behind'], ['behind him', 'behind'], ['behind them', 'behind'], ['right behind her', 'behind'], ['at the back', 'behind'],
    ['in front of her', 'front'], ['in front of him', 'front'], ['in front of them', 'front'], ['in front', 'front'],
    ['beside her', 'beside'], ['beside him', 'beside'], ['next to her', 'beside'], ['next to him', 'beside'], ['by her side', 'beside'], ['by his side', 'beside'],
    ['around her', 'around'], ['around him', 'around'], ['surrounding her', 'around'], ['surrounding him', 'around'],
    ['in the center', 'center'], ['in the centre', 'center'], ['in the middle', 'center'],
    ['in the background', 'background'], ['in the foreground', 'foreground'],
  ].map(([p, v]) => [p.split(' '), v]).sort((a, b) => b[0].length - a[0].length);
  const MEMBER = { other: null, another: null, first: 0, second: 1, third: 2, fourth: 3, fifth: 4, last: -1, remaining: null, rest: null };
  const PRON = { she: 'f', he: 'm', they: 'p' };
  const MASS = new Set('nectar honey milk juice oil paint ink blood rice soup wine beer gold silver sand mud clay dough flour sugar salt ash lava smoke steam foam water glitter moss hay straw grass snow ice rain coffee tea chai'.split(' '));
  const QUALITY = new Set('4k 8k 16k hd uhd hdr highres high-res masterpiece detailed hyperdetailed hyper-detailed ultra-detailed sharp crisp award-winning trending'.split(' '));
  const INDOOR_HINT = /(room|hall|house|shop|store|office|studio|kitchen|bar|lab|library|cafe|diner|lobby|cell|chamber|garage|attic|basement|temple|church|salon|gym|mall|hut|cabin|tent|corridor)$/;
  const CASUAL = new Set('guy guys dude dudes bloke gal gals kid kids doggo pupper kitty bunny pup lad fellow someone human individual figure ladies lady gentleman gentlemen folks people man men woman women female male'.split(' '));
  const NOUN_ING = new Set('building clothing ceiling pudding sibling darling railing awning icing offering drawing dwelling clearing landing ending bedding stuffing dumpling earring string sling duckling sapling seedling viking herring lining wedding evening morning something nothing anything everything pudding stocking'.split(' '));
  const ADJ_SUFFIX = /(ful|ous|ive|less|ish|ic|al|ible|able|esque|like|ed|y)$/;

  function isNounEntry(e) {
    return e && ['person', 'animal', 'thing', 'place'].includes(e.cat);
  }

  SC.parse = function (input, opts) {
    opts = opts || {};
    const literal = new Set((opts.literal || []).map((s) => s.toLowerCase()));
    const text = String(input || '')
      .replace(/[“”"(){}\[\]]/g, ' ')
      .replace(/&/g, ' and ')
      .replace(/\s+\+\s+/g, ', ');
    const groups = text.split(/[,;\n|.]+(?!\d)|\s-\s/).map((g) => g.trim()).filter(Boolean);

    const mentions = [];
    const corrections = [];
    let order = 0;

    groups.forEach((g, gi) => {
      const origWords = g.split(/\s+/).map((w) => w.replace(/^[^\w/:'-]+|[^\w/:'-]+$/g, '')).filter(Boolean);
      const words = origWords.map((w) => w.toLowerCase());
      let pending = []; // modifiers waiting for a noun
      let ctxRole = null;
      let count = null;
      let lastAction = null;
      let whileNext = false;
      let lastNoun = null;
      let ctxPrep = null;
      let negNext = false;

      const push = (m) => {
        m.gi = gi;
        m.order = order++;
        mentions.push(m);
        return m;
      };
      const attachNoun = (m) => {
        // compound settings: "village lane", "hospital corridor" → one place, head noun last
        const prev = mentions[mentions.length - 1];
        if (m.cat === 'place' && prev && prev === lastNoun && prev.cat === 'place' && prev.gi === gi && !m.role && !ctxRole && !pending.length) {
          prev.extra = (prev.extra || []).concat([prev.entry]);
          prev.entry = m.entry;
          prev.raw = prev.raw + ' ' + m.raw;
          prev.dn = prev.raw.toLowerCase();
          return;
        }
        m.mods = pending.filter((p) => !p.moodOnly || m.cat === 'person' || m.cat === 'animal');
        if (m.cat === 'person') m.mods = m.mods.map((p) => (p.entry && p.entry.cat === 'color' && /^(black|white|brown)$/.test(p.entry.id) ? { entry: { cat: 'dem', id: 'dem:' + p.entry.id, n: U.cap(p.entry.id) }, raw: p.raw, dem: true } : p));
        pending = [];
        if (count) m.count = count;
        count = null;
        const oprep = lastAction && !lastAction.objM && lastAction.entry.oprep && ctxPrep && lastAction.entry.oprep.split(' ').includes(ctxPrep);
        if (oprep && m.cat === 'thing') { m.role = 'obj'; m.objPrep = ctxPrep; lastAction.objM = m; }
        else if (ctxRole && ctxRole !== 'and') { m.role = ctxRole; if (ctxRole === 'place') m.prep = ctxPrep; }
        else if (lastAction && !lastAction.objM && lastAction.entry.obj) {
          const want = lastAction.entry.obj;
          if (want === m.cat || (want === 'any' && m.cat !== 'place') || (want === 'thing' && m.cat === 'animal')) {
            m.role = 'obj';
            lastAction.objM = m;
          }
        }
        ctxRole = null;
        lastNoun = m;
        const rawL = String(m.raw || '').toLowerCase();
        const n = String(m.entry.n || '').toLowerCase();
        if (['person', 'animal', 'thing'].includes(m.cat) && !m.generic && !m.entry.plural && !m.entry.mass && rawL !== n && /s$/.test(rawL) && !/s$/.test(n)) m.pl = true;
        if (!m.generic && rawL !== n && !CASUAL.has(rawL) && !/[^a-z\s'-]/.test(rawL)) {
          let dn = rawL;
          if (m.pl) { const ws = dn.split(' '); const s1 = U.singulars(ws.pop())[0]; dn = s1 ? ws.concat([s1]).join(' ') : null; }
          if (dn && (dn.split(' ').length > 1 || m.cat !== 'place') && dn.length > 2) m.dn = dn;
        }
        if (m.generic && /[^su]s$/.test(rawL) && !/(ss|us|is)$/.test(rawL)) m.pl = true;
        push(m);
      };

      let i = 0;
      while (i < words.length) {
        let w = words[i];
        if (/^\d+-k$/.test(w)) w = words[i] = w.replace('-', '');

        // positions relative to the lead: "on one side", "behind her"
        const pos = POSN.find(([ph]) => ph.every((x, k) => words[i + k] === x) && !(ph.length === 1 && isNounEntry(SC.lookup(words[i + 1] || '') && SC.choose(SC.lookup(words[i + 1]), words[i + 1]))));
        if (pos) { push({ cat: 'posn', entry: { id: pos[1], cat: 'posn', n: pos[0].join(' ') }, raw: origWords.slice(i, i + pos[0].length).join(' ') }); i += pos[0].length; ctxRole = null; continue; }
        if (PRON[w]) { push({ cat: 'pron', entry: { id: w, cat: 'pron', n: w, g: PRON[w] }, raw: origWords[i] }); i++; continue; }
        const nextIsNoun = () => { const es = SC.lookup(words[i + 1] || ''); return !!(es && isNounEntry(SC.choose(es, words[i + 1]))); };
        if ((w in MEMBER && !nextIsNoun()) || (w === 'one' && !nextIsNoun() && !(mentions.length && mentions[mentions.length - 1].cat === 'member' && mentions[mentions.length - 1].gi === gi))) {
          push({ cat: 'member', entry: { id: w, cat: 'member', n: w, idx: w === 'one' ? null : MEMBER[w] }, raw: origWords[i] });
          i++;
          continue;
        }

        // negation: "no rain", "without people", "no western costume"
        if (NEG.has(w) && !(w === 'no' && /^(one|man|woman)$/.test(words[i + 1] || ''))) { negNext = true; i++; continue; }
        // ages: "25 year old", "25-year-old", "30s", "aged 40", "in her 20s"
        let ageM = /^(\d{1,2})-?(years?-old|yrs?-old|yo|y\/o)$/.exec(w);
        if (!ageM && /^\d{1,2}$/.test(w) && /^(years?|yrs?|yo)$/.test(words[i + 1] || '')) ageM = [w, w];
        if (ageM) { ctxRole = null; push({ cat: 'age', entry: { id: 'age', cat: 'age', n: ageM[1], v: +ageM[1] }, raw: origWords[i] }); i += ageM[0] === w && /^\d{1,2}$/.test(w) ? (words[i + 2] === 'old' ? 3 : 2) : 1; continue; }
        const dec = /^(\d)0'?s$/.exec(w);
        if (dec && +dec[1] >= 1) { ctxRole = null; push({ cat: 'age', entry: { id: 'age', cat: 'age', n: w, v: +dec[1] * 10 + 4 }, raw: origWords[i] }); i++; continue; }
        if (w === 'aged' && /^\d{1,2}$/.test(words[i + 1] || '')) { push({ cat: 'age', entry: { id: 'age', cat: 'age', n: words[i + 1], v: +words[i + 1] }, raw: 'aged ' + words[i + 1] }); i += 2; continue; }
        // explicit technical tokens
        if (/^\d{1,3}mm$/.test(w)) { push({ cat: 'lens', entry: { id: w, cat: 'lens', n: w, ph: w }, raw: origWords[i] }); i++; continue; }
        if (/^f\/\d+(\.\d+)?$/.test(w)) { push({ cat: 'ap', entry: { id: w, cat: 'ap', n: w, ph: w }, raw: origWords[i] }); i++; continue; }
        if (/^\d{1,2}:\d{1,2}$/.test(w)) { push({ cat: 'aspect', entry: { id: w, cat: 'aspect', n: w }, raw: w }); i++; continue; }
        const dur = /^(\d{1,2})(s|sec|secs|second|seconds)$/.exec(w) || (/^\d{1,2}$/.test(w) && /^(s|sec|secs|seconds?)$/.test(words[i + 1] || '') ? [w, w] : null);
        if (dur) { push({ cat: 'duration', entry: { id: 'dur', cat: 'duration', n: dur[1] + 's', v: +dur[1] }, raw: dur[0] }); i += /^\d{1,2}$/.test(w) ? 2 : 1; continue; }
        if (QUALITY.has(w)) { push({ cat: 'quality', entry: { id: w, cat: 'quality', n: w }, raw: origWords[i] }); i++; continue; }

        // longest phrase match
        let m = null;
        if (!literal.has(w)) {
          for (let len = Math.min(SC.maxPhrase, words.length - i); len >= 1; len--) {
            const phrase = words.slice(i, i + len).join(' ');
            if (len === 1 && (STOP.has(phrase) || ROLE[phrase] || NUM[phrase]) && !['couple', 'group'].includes(phrase)) break;
            const entries = SC.lookup(phrase);
            if (entries) { m = { entries, len, phrase }; break; }
          }
        }
        if (!m) {
          if (NUM[w] && !(w === 'group' && words[i + 1] !== 'of')) { count = NUM[w]; i++; if (words[i] === 'of') i++; continue; }
          if (/^\d{1,3}$/.test(w)) { count = +w; i++; continue; }
          if (ROLE[w]) {
            const r = ROLE[w];
            if (r === 'wear') {
              // capture free outfit text until the next structural word
              let j = i + 1;
              if (words[j] === 'in') j++;
              const start = j;
              const isAct = (x) => (/ing$/.test(x) && x.length > 4 && !NOUN_ING.has(x)) || ((SC.lookup(x) || []).some((e) => e.cat === 'action') && !(SC.lookup(x) || []).some((e) => e.cat === 'garment'));
              while (j < words.length && !['with', 'while', 'in', 'at', 'on', 'holding', 'near', 'and', 'she', 'he', 'they'].includes(words[j]) && !NEG.has(words[j]) && !isAct(words[j])) j++;
              const outfit = origWords.slice(start, j).join(' ');
              const lowO = outfit.toLowerCase();
              const withArt = /^(a|an|the|his|her|their|my)\s/.test(lowO) || /s$/.test(lowO) ? outfit : U.a(outfit);
              if (outfit) push({ cat: 'wear', entry: { id: 'wear', cat: 'wear', n: withArt }, raw: outfit, target: lastNoun });
              i = j;
              continue;
            }
            if (r === 'while') whileNext = true;
            else if (r === 'and' || r === 'during' || r === 'like') { /* no-op: order already implies grouping */ }
            else { ctxRole = r; ctxPrep = w; }
            i++;
            continue;
          }
          if (STOP.has(w)) { i++; continue; }
          if (!literal.has(w)) {
            const fz = SC.fuzzy(w);
            if (fz) {
              m = { entries: fz.entries, len: 1, phrase: fz.key };
              corrections.push({ from: origWords[i], to: fz.key });
            }
          }
        }

        if (m) {
          const hint = ctxRole === 'place' ? 'place' : null;
          let e = SC.choose(m.entries, words[i + m.len - 1], hint);
          // "western" means clothing unless the input is clearly about the Wild West
          if (m.phrase === 'western' && /cowboy|saloon|wild west|gunslinger|outlaw|sheriff|revolver|frontier/i.test(text)) e = m.entries.find((x) => x.cat === 'genre') || e;
          const raw = origWords.slice(i, i + m.len).join(' ');
          i += m.len;
          if (negNext) { push({ cat: 'neg', entry: e, raw }); negNext = false; continue; }
          handle(e, raw, m.phrase);
          continue;
        }

        // ---- unknown word ----
        const nextKnown = (() => {
          const nx = words[i + 1];
          if (!nx) return null;
          const es = SC.lookup(nx);
          return es ? SC.choose(es, nx) : null;
        })();
        if (/ly$/.test(w) && w.length > 4) {
          const adv = { cat: 'adverb', entry: { id: w, cat: 'adverb', n: w }, raw: origWords[i] };
          if (lastAction) (lastAction.adv = lastAction.adv || []).push(w);
          else push(adv);
          i++;
          continue;
        }
        if (/ing$/.test(w) && w.length > 5 && !NOUN_ING.has(w)) {
          const base = w.replace(/ing$/, '');
          const e = { id: w, cat: 'action', n: w, ing: w, do: '[be] ' + w, kind: 'generic', generic: true, base, obj: 'thing' };
          lastAction = push({ cat: 'action', entry: e, raw: origWords[i], secondary: whileNext, generic: true });
          whileNext = false;
          i++;
          continue;
        }
        if (isNounEntry(nextKnown) || (ADJ_SUFFIX.test(w) && w.length > 5 && !/(ing|tion|sion|ness|ment|ship|er|or|ist|ity)$/.test(w))) {
          pending.push({ entry: { id: w, cat: 'mod', ord: 'op', ph: origWords[i] }, generic: true });
          i++;
          continue;
        }
        // unknown noun (compound consecutive unknown words)
        let j = i + 1;
        while (j < words.length && !STOP.has(words[j]) && !ROLE[words[j]] && !NUM[words[j]] && !NEG.has(words[j]) && !SC.lookup(words[j]) && !(/ing$/.test(words[j]) && words[j].length > 5)) j++;
        const phrase = origWords.slice(i, j).join(' ');
        const low = phrase.toLowerCase();
        if (negNext) { push({ cat: 'neg', entry: { id: low, cat: 'neg', n: low, generic: true }, raw: phrase }); negNext = false; i = j; continue; }
        const cat = ctxRole === 'place' ? 'place' : 'thing';
        const entry = cat === 'place'
          ? { id: low, cat: 'place', n: low, generic: true, io: INDOOR_HINT.test(low) ? 'in' : 'out', prep: 'in' }
          : { id: low, cat: 'thing', n: low, generic: true, mass: MASS.has(low.split(' ').pop()) ? 1 : undefined };
        attachNoun({ cat, entry, raw: phrase, generic: true });
        i = j;
      }

      // group end: dangling modifiers attach to the last noun of this group, else become scene-level
      if (pending.length) {
        const real = pending.filter((p) => !p.moodOnly);
        if (lastNoun) lastNoun.mods = (lastNoun.mods || []).concat(real);
        else real.forEach((p) => push({ cat: p.dem ? 'dem' : p.entry.cat === 'color' ? 'color' : 'mod', entry: p.entry, raw: p.raw || p.entry.ph || p.entry.n, free: true, generic: p.generic }));
        pending = [];
      }

      function handle(e, raw, key) {
        switch (e.cat) {
          case 'mod':
          case 'color':
            pending.push({ entry: e, raw });
            return;
          case 'dem':
            pending.push({ entry: e, raw, dem: true });
            return;
          case 'garment': {
            const words = pending.filter((p) => !p.moodOnly).map((p) => p.raw || p.entry.ph || p.entry.n).concat([e.n === e.id ? raw : e.n]);
            const text = words.join(' ').toLowerCase();
            pending = pending.filter((p) => p.moodOnly);
            ctxRole = null;
            push({ cat: 'wear', entry: { id: 'wear', cat: 'wear', n: e.plural || /s$/.test(raw) ? text : U.a(text) }, raw: text });
            return;
          }
          case 'wstyle':
            push({ cat: 'wstyle', entry: e, raw });
            pending = pending.filter((p) => p.moodOnly);
            return;
          case 'wgen':
            push({ cat: 'wgen', entry: e, raw });
            return;
          case 'region': {
            const m = push({ cat: 'region', entry: e, raw });
            if (ctxRole === 'place') { m.prep = ctxPrep; ctxRole = null; }
            return;
          }
          case 'mood':
            push({ cat: 'mood', entry: e, raw });
            if (e.desc) pending.push({ entry: e, raw, moodOnly: true });
            return;
          case 'person':
          case 'animal':
          case 'thing':
          case 'place':
            attachNoun({ cat: e.cat, entry: e, raw, key });
            return;
          case 'action': {
            const m = push({ cat: 'action', entry: e, raw, key, secondary: whileNext });
            whileNext = false;
            lastAction = m;
            ctxRole = null;
            return;
          }
          default:
            push({ cat: e.cat, entry: e, raw });
        }
      }
    });

    // Standalone demonyms (e.g. "Japanese" with no noun) become a region hint.
    return { mentions, corrections, groups };
  };
})();
