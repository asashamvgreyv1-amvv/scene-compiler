/* Scene Compiler — inference engine.
 * Parsed mentions (+ optional builder cast) → weighted votes → forward-chained rules → resolved scene spec.
 * Deterministic for a given (input, seed, bumps, cast).
 */
(function () {
  const SC = globalThis.SC;
  const U = SC.u;

  // Scalar slots resolve to a single value; everything else is a list.
  const SCALAR = new Set(['style', 'place', 'time', 'shot', 'angle', 'lens', 'ap', 'dof', 'comp', 'palette', 'key', 'move', 'pace', 'outfit', 'outfitOut', 'expr']);
  const ORD = ['op', 'size', 'age', 'shape', 'cond', 'color', 'origin', 'mat'];
  const NUMW = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'several', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 12: 'a dozen', 20: 'dozens of' };

  class Ctx {
    constructor(seed, bumps) {
      this.seed = seed >>> 0;
      this.bumps = bumps || {};
      this.c = {};
      this.l = {};
      this.tags = new Set();
      this.bans = {};
      this.applied = new Set();
      this.firedRules = new Set();
      this.locked = {};
    }
    rng(slot, salt) {
      return U.rng((U.hash(slot) ^ Math.imul(this.seed + 1, 2654435761) ^ (salt || 0)) >>> 0);
    }
    tag(s) {
      if (!s) return;
      String(s).split(/\s+/).forEach((t) => t && this.tags.add(t.toLowerCase()));
    }
    has(t) { return this.tags.has(t); }
    vote(slot, v, w) {
      if (v == null || v === '' || !(w > 0)) return;
      const key = typeof v === 'object' ? v.id || JSON.stringify(v) : String(v).toLowerCase();
      const store = SCALAR.has(slot) ? (this.c[slot] = this.c[slot] || new Map()) : (this.l[slot] = this.l[slot] || new Map());
      const cur = store.get(key);
      if (SCALAR.has(slot)) store.set(key, { v, w: (cur ? cur.w : 0) + w });
      else if (!cur || cur.w < w) store.set(key, { v, w });
    }
    ban(slot, list) {
      const b = (this.bans[slot] = this.bans[slot] || new Set());
      String(list).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).forEach((x) => b.add(x));
    }
    banned(slot, v) {
      const b = this.bans[slot];
      if (!b) return false;
      if (b.has('all')) return true;
      const key = typeof v === 'object' ? v.id : String(v).toLowerCase();
      return b.has(String(key).toLowerCase());
    }
    cands(slot) {
      const m = this.c[slot];
      return m ? [...m.values()].filter((x) => x.w > 0 && !this.banned(slot, x.v)) : [];
    }
    resolve(slot) {
      let arr = this.cands(slot);
      if (!arr.length) return null;
      const r = this.rng(slot);
      arr = arr.map((x) => ({ v: x.v, w: x.w, s: x.w >= 100 ? x.w * 10 : x.w * (0.7 + 0.6 * r()) })).sort((a, b) => b.s - a.s);
      if (arr[0].w >= 100) { this.locked[slot] = true; return arr[0].v; }
      const bump = this.bumps[slot] || 0;
      return arr[bump % arr.length].v;
    }
    list(slot, n, bumpSlot, keep) {
      const m = this.l[slot];
      if (!m || n <= 0) return [];
      const r = this.rng(slot, (this.bumps[bumpSlot || slot] || 0) * 7919);
      const arr = [...m.values()].filter((x) => !this.banned(slot, x.v) && (!keep || keep(x.v)))
        .map((x) => ({ v: x.v, s: x.w * (0.55 + 0.9 * r()) }))
        .sort((a, b) => b.s - a.s);
      return U.uniq(arr.map((x) => x.v)).slice(0, n);
    }
  }

  // ---------- contribution helpers ----------
  function parseVotes(val) {
    if (val == null) return [];
    if (typeof val === 'string') {
      if (/:\s*-?[\d.]+\s*(,|$)/.test(val)) {
        return val.split(',').map((p) => {
          const i = p.lastIndexOf(':');
          return [p.slice(0, i).trim(), parseFloat(p.slice(i + 1))];
        });
      }
      return [[val, 2]];
    }
    if (Array.isArray(val)) return val.map((x) => (Array.isArray(x) ? x : [x, 2]));
    return [[val, 2]];
  }
  function contribute(ctx, obj, scale) {
    if (!obj) return;
    for (const slot of Object.keys(obj)) for (const [v, w] of parseVotes(obj[slot])) ctx.vote(slot, v, w * (scale || 1));
  }
  function listInto(ctx, slot, arr, w) {
    U.arr(arr).forEach((x) => (Array.isArray(x) ? ctx.vote(slot, x[0], x[1]) : ctx.vote(slot, x, w)));
  }
  function keyInto(ctx, arr, w, mult) {
    U.arr(arr).forEach((x) => (Array.isArray(x) ? ctx.vote('key', x[0], x[1] * (mult || 1)) : ctx.vote('key', x, w)));
  }
  function applyBans(ctx, ban) {
    if (ban) for (const s of Object.keys(ban)) ctx.ban(s, ban[s]);
  }

  // Apply the generic + category-specific fields of an entry.
  function applyEntry(ctx, e, scale, info) {
    if (!e || ctx.applied.has(e)) return;
    ctx.applied.add(e);
    scale = scale || 1;
    ctx.tag(e.tags);
    if (e.id && !/\s/.test(e.id)) ctx.tag(e.id);
    ctx.tag(e.cat);
    contribute(ctx, e.bias, scale);
    contribute(ctx, e.add, scale);
    applyBans(ctx, e.ban);
    const W = 3 * scale;
    switch (e.cat) {
      case 'place':
        listInto(ctx, 'env', e.env, W);
        listInto(ctx, 'atmo', e.atmo, W * 0.8);
        listInto(ctx, 'motion', e.motion, W);
        listInto(ctx, 'sound', e.sound, W);
        keyInto(ctx, e.light, 3);
        break;
      case 'weather':
        listInto(ctx, 'env', e.env, 4);
        listInto(ctx, 'sky', e.sky, 5);
        listInto(ctx, 'atmo', e.atmo, 4);
        listInto(ctx, 'motion', e.motion, 5);
        listInto(ctx, 'smotion', e.smotion, 4);
        listInto(ctx, 'sound', e.sound, 5);
        keyInto(ctx, e.light, 4, 1.6);
        if (info && info.kind === 'person') listInto(ctx, 'subj', e.subj, 4);
        if (info && info.kind === 'animal' && /fur|coat|wool|hair|fuzz/.test(info.coat || '')) listInto(ctx, 'subj', e.fur, 4);
        if (e.wear) ctx.vote('outfitOut', e.wear, 4);
        break;
      case 'season':
      case 'event':
        listInto(ctx, e.cat === 'event' ? 'env' : 'envOut', e.env, e.cat === 'event' ? 6 : 4);
        listInto(ctx, 'motion', e.motion, 4);
        listInto(ctx, 'sound', e.sound, 4);
        keyInto(ctx, e.light, 3);
        if (e.wear) ctx.vote(e.cat === 'event' ? 'outfit' : 'outfitOut', e.wear, e.cat === 'event' ? 6 : 3);
        break;
      case 'mood':
        keyInto(ctx, e.key, 2);
        U.arr(e.expr).forEach((x, i) => ctx.vote('expr', x, 4 - i * 0.5));
        listInto(ctx, 'posture', e.posture, 3);
        break;
      case 'genre':
        listInto(ctx, 'env', e.env, 4);
        listInto(ctx, 'detail', e.detail, 3);
        keyInto(ctx, e.key, 3);
        if (e.wear) ctx.vote('outfit', e.wear, 5);
        break;
      case 'style':
        listInto(ctx, 'tech', e.tech, 3);
        listInto(ctx, 'quality', e.quality, 3);
        listInto(ctx, 'neg', e.neg, 3);
        listInto(ctx, 'sd', e.sd, 3);
        break;
      case 'thing':
        if (e.light) { ctx.vote('light', e.light, 4); ctx.vote('key', e.light, 1.5); }
        if (e.type) ctx.tag(e.type === 'veh' ? 'vehicle' : e.type);
        if (e.hab && info && info.main) contribute(ctx, { place: e.hab });
        if (!e.hab && info && info.main && e.type === 'plant') contribute(ctx, { place: 'meadow:1.5' });
        break;
      case 'person':
      case 'animal':
        if (e.hab && info && info.main) contribute(ctx, { place: e.hab });
        break;
      case 'action':
        if (e.hab) contribute(ctx, { place: e.hab });
        if (!info || info.kind === 'person' || info.kind === 'animal') listInto(ctx, 'smotion', e.smo, 3);
        break;
      case 'lens':
        if (e.ph) ctx.vote('lens', e.ph, 100);
        break;
      case 'dof':
        ctx.vote('dof', e.ph, 100);
        break;
    }
  }

  function runRules(ctx) {
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 4) {
      changed = false;
      SC.rules.forEach((r, i) => {
        if (ctx.firedRules.has(i)) return;
        const need = r.if.split(/\s+/);
        if (!need.every((t) => ctx.has(t))) return;
        if (r.not && r.not.split(/\s+/).some((t) => ctx.has(t))) return;
        ctx.firedRules.add(i);
        const s = r.w || 1.5;
        contribute(ctx, r.add, s / 2);
        contribute(ctx, r.bias, 1);
        applyBans(ctx, r.ban);
        if (r.tags) { ctx.tag(r.tags); changed = true; }
      });
    }
  }

  // ---------- noun phrases ----------
  function modWords(mods) {
    const out = [];
    (mods || []).forEach((p) => {
      const e = p.entry;
      if (!e) return;
      if (p.dem || e.cat === 'dem') out.push({ ord: 'origin', w: U.cap(e.n) });
      else if (e.cat === 'mood') { if (e.desc) out.push({ ord: 'op', w: e.desc }); }
      else if (e.cat === 'color') out.push({ ord: 'color', w: e.ph });
      else out.push({ ord: e.ord || 'op', w: e.ph || e.n });
    });
    out.sort((a, b) => ORD.indexOf(a.ord) - ORD.indexOf(b.ord));
    return U.uniq(out.map((x) => x.w));
  }

  function unitNoun(u) {
    const e = u.e;
    const n = u.dn || e.n;
    if (e.plural || e.mass || e.generic) return n;
    return u.count > 1 || u.pl ? (u.dn ? U.plural(n) : e.pl || U.plural(n)) : n;
  }
  const isPlural = (u) => u.count > 1 || !!u.pl || !!u.e.plural;

  function unitNP(u, withArticle) {
    const words = modWords(u.mods);
    if (u.genreAdj && !words.includes(u.genreAdj)) words.unshift(u.genreAdj);
    if (u.genderWord && u.g && u.g !== 'n' && !u.e.gen) words.push(u.g === 'f' ? 'female' : 'male');
    if (u.age != null && u.age < 12 && u.age > 2) words.unshift(`${u.age}-year-old`);
    const noun = unitNoun(u);
    let np = words.concat([noun]).join(' ');
    if (u.costume) np += ' dressed as ' + U.a(u.costume.n);
    if (!withArticle) return np;
    let out;
    if (u.count > 1) out = (NUMW[u.count] || 'a group of') + ' ' + np;
    else if (u.pl || u.e.plural || u.e.mass) out = np;
    else out = U.a(np);
    if (u.age != null && u.age >= 12 && u.kind === 'person' && !isPlural(u)) {
      const g = u.g || u.e.g;
      out += ' ' + SC.wardrobe.agePhrase(u.age, g === 'f' ? 'her' : g === 'm' ? 'his' : 'their');
    }
    return out;
  }

  function unitRef(u) {
    const e = u.e;
    if (e.ref) return e.ref;
    if (e.id === 'friends') return 'the friends';
    const noun = unitNoun(u);
    return 'the ' + (noun.split(' ').length > 2 ? noun.split(' ').slice(-1)[0] : noun);
  }

  function pronouns(units) {
    const u = units[0];
    const plural = units.length > 1 || isPlural(u) || !!u.e.grp;
    const ref = units.length > 1 ? (units.length === 2 ? 'the pair' : 'the group') : unitRef(u);
    if (plural) return { S: ref, sub: 'they', obj: 'them', pos: 'their', self: 'themselves', plural: true };
    if (u.kind === 'person') {
      const g = u.g || u.e.g || 'n';
      if (g === 'f') return { S: ref, sub: 'she', obj: 'her', pos: 'her', self: 'herself', plural: false };
      if (g === 'm') return { S: ref, sub: 'he', obj: 'him', pos: 'his', self: 'himself', plural: false };
      return { S: ref, sub: ref, obj: 'them', pos: 'their', self: 'themselves', plural: false };
    }
    return { S: ref, sub: 'it', obj: 'it', pos: 'its', self: 'itself', plural: false };
  }

  function pickGendered(v, g, rng) {
    if (v == null) return null;
    if (Array.isArray(v)) v = U.pick(rng, v);
    if (typeof v === 'object') return v[g] || v.n || v.f || v.m || null;
    return v;
  }

  // Who is who in free keywords: "mexican girl in 20s, 3 black men in 30s, she is kneeling…,
  // 1 man standing tall on one side, other on the other side, one behind her".
  // Every action / outfit / age / position is attached to the person it belongs to.
  const MINOR_NOUNS = ['child', 'baby'];
  function keywordFigures(M) {
    const persons = M.filter((m) => m.cat === 'person' && m.role !== 'obj');
    if (!persons.length || persons.some((m) => m.entry.grp)) return null;
    const figs = [];
    let cur = null;
    let mi = -1;
    const pendingAge = {};
    const gOf = (e) => (e.g === 'f' || e.g === 'm' ? e.g : 'n');
    const next = (f) => { f.cursor = Math.min((f.cursor == null ? -1 : f.cursor) + 1, f.c.count - 1); return f.cursor; };
    const last = (pred) => { for (let k = figs.length - 1; k >= 0; k--) if (pred(figs[k])) return figs[k]; return null; };
    const newFig = (m) => {
      const e = m.entry;
      const count = m.count || (m.pl ? 2 : 1);
      const dem = (m.mods || []).find((p) => p.dem);
      const f = {
        m, lastOrder: m.order, acts: [], members: [], cursor: null,
        c: { gender: gOf(e), count, vague: !m.count && !!m.pl, noun: e.gen ? e.id : '', profession: e.gen ? '' : e.n, profEntry: e.gen ? null : e,
          descriptors: modWords((m.mods || []).filter((p) => !p.dem)), ethnicity: dem ? U.cap(dem.entry.n) : '', rawNoun: String(m.raw || '').toLowerCase() },
      };
      for (let k = 0; k < count; k++) f.members.push({ acts: [], pos: null, wear: null });
      if (pendingAge[m.gi] != null) { f.c.age = pendingAge[m.gi]; delete pendingAge[m.gi]; }
      return f;
    };
    M.forEach((m) => {
      if (m.cat === 'person' && m.role !== 'obj') {
        const e = m.entry;
        const prev = figs[figs.length - 1];
        if (prev && prev.m.gi === m.gi && prev.lastOrder === m.order - 1 && prev.c.count === 1 && (m.count || 1) === 1) {
          const A = prev.m.entry;
          if (A.gen && !e.gen) { prev.c.profession = e.n; prev.c.profEntry = e; prev.lastOrder = m.order; return; }
          if (!A.gen && e.gen && gOf(e) !== 'n') { prev.c.gender = gOf(e); prev.lastOrder = m.order; return; }
        }
        const grp = last((f) => f.c.count > 1 && f.c.gender === gOf(e) && (e.gen ? !f.c.profession : f.c.profession === e.n));
        if (grp && (m.count || 1) === 1 && !m.pl) { cur = grp; mi = next(grp); return; }
        const f = newFig(m);
        figs.push(f);
        cur = f;
        mi = -1;
        return;
      }
      switch (m.cat) {
        case 'pron': {
          const g = m.entry.g;
          const t = g === 'p' ? last((f) => f.c.count > 1) : last((f) => f.c.gender === g && f.c.count === 1) || last((f) => f.c.gender === g);
          if (t) { cur = t; mi = -1; }
          return;
        }
        case 'member': {
          const t = cur && cur.c.count > 1 ? cur : last((f) => f.c.count > 1);
          if (!t) return;
          cur = t;
          const idx = m.entry.idx;
          mi = idx == null ? next(t) : idx < 0 ? t.c.count - 1 : Math.min(idx, t.c.count - 1);
          t.cursor = mi;
          return;
        }
        case 'age': {
          const f = last((x) => x.m.gi === m.gi);
          if (f) { if (f.c.age == null) f.c.age = m.entry.v; } else pendingAge[m.gi] = m.entry.v;
          return;
        }
        case 'action':
          if (!cur) return;
          m.fig = cur;
          if (mi >= 0 && cur.members[mi]) cur.members[mi].acts.push(m); else cur.acts.push(m);
          return;
        case 'wear':
          if (!cur) return;
          m.fig = cur;
          if (mi >= 0 && cur.members[mi]) cur.members[mi].wear = m.entry.n; else cur.c.wear = m.entry.n;
          return;
        case 'posn':
          if (!cur) return;
          if (mi >= 0 && cur.members[mi]) cur.members[mi].pos = m.entry.id;
          else if (cur !== figs[0]) cur.c.position = m.entry.id;
          return;
      }
    });
    return figs;
  }
  const figIsMinor = (f) => (f.c.age != null ? f.c.age < 12 : MINOR_NOUNS.includes(f.m.entry.id));
  function figToCast(f) {
    const c = Object.assign({}, f.c);
    Object.keys(c).forEach((k) => (c[k] === '' || c[k] == null) && delete c[k]);
    c._fig = f;
    return c;
  }
  // builder characters stay authoritative; keyword people fill their empty fields (matched by gender) or are added
  function mergeCasts(builder, kw) {
    const used = new Set();
    const out = builder.map((b) => {
      const k = kw.find((x) => !used.has(x) && (x.gender === b.gender || x.gender === 'n') && (x.count || 1) === 1);
      if (!k) return b;
      used.add(k);
      return Object.assign({}, k, b, { gender: b.gender });
    });
    kw.filter((x) => !used.has(x)).forEach((x) => out.push(x));
    return out;
  }

  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ---------- main ----------
  SC.infer = function (parsed, opts) {
    const o = Object.assign({ mode: 'image', seed: 1, detail: 2, bumps: {} }, opts || {});
    const ctx = new Ctx(o.seed, o.bumps);
    const M = parsed.mentions.slice();
    const of = (cat) => M.filter((m) => m.cat === cat);
    const notes = [];
    const W = SC.wardrobe;
    const builderCast = (o.cast || []).filter(Boolean);
    const kwFigs = keywordFigures(M);
    let cast = builderCast;
    if (kwFigs && kwFigs.length) cast = builderCast.length ? mergeCasts(builderCast, kwFigs.map(figToCast)) : kwFigs.map(figToCast);

    // ---- 0. safety, negation, wardrobe intent ----
    const minor = (kwFigs ? kwFigs.some(figIsMinor) : M.some((m) => m.cat === 'person' && MINOR_NOUNS.includes(m.entry.id)) || of('age').some((m) => m.entry.v < 12)) || cast.some((c) => SC.cast.isMinor(c));
    if (minor) {
      let dropped = 0;
      for (let k = M.length - 1; k >= 0; k--) {
        const m = M[k];
        const txt = [m.raw, m.entry && (m.entry.ph || m.entry.n)].join(' ');
        if (W.SEXUAL_RE.test(txt)) { M.splice(k, 1); dropped++; }
        else if (m.mods) m.mods = m.mods.filter((p) => !W.SEXUAL_RE.test(p.raw || (p.entry && (p.entry.ph || p.entry.n)) || ''));
      }
      notes.push('A character is under 12, so innerwear, body-part sizing, clothing removal and suggestive terms' + (dropped ? ` (${dropped} keyword${dropped > 1 ? 's' : ''} removed)` : '') + ' are ignored.');
    }
    const negWords = new Set();
    const negShown = [];
    let noneWear = false, plainWear = false, negWestern = false;
    const PEOPLE_WORDS = 'people person persons human humans crowd crowds pedestrian pedestrians commuter commuters vendor vendors spectator spectators passers-by shopper shoppers revelers guests patrons figure figures tourists worshippers photographers onlookers bathers neighbours voices chatter laughter'.split(' ');
    const NEG_SLOT = { time: 'time', place: 'place', style: 'style', shot: 'shot', angle: 'angle', move: 'move', pace: 'pace', comp: 'comp', palette: 'palette', weather: 'weather', genre: 'genre' };
    of('neg').forEach((n) => {
      const e = n.entry;
      if (e.cat === 'wgen') {
        if (e.kind === 'all') { if (!minor) noneWear = true; }
        else if (e.kind === 'costume') plainWear = true;
        else negWords.add('jewelry').add('jewellery').add('accessories');
        return;
      }
      if (e.cat === 'wstyle') { if (e.western) negWestern = true; return; }
      const words = [n.raw, e.id, e.n, e.ph].concat(e.syn && !e.generic ? e.syn.split('|') : []).filter(Boolean).map((x) => String(x).toLowerCase().trim());
      words.forEach((x) => { negWords.add(x); negWords.add(U.plural(x)); U.singulars(x).forEach((y) => negWords.add(y)); });
      if (words.some((x) => /^(people|person|humans?|crowds?|anyone|nobody|figures?)$/.test(x))) PEOPLE_WORDS.forEach((x) => negWords.add(x));
      negShown.push(String(n.raw).toLowerCase());
      if (NEG_SLOT[e.cat]) ctx.ban(NEG_SLOT[e.cat], e.id);
      if (e.cat === 'light') ctx.ban('key', e.ph);
    });
    const negRe = negWords.size ? new RegExp('\\b(' + [...negWords].filter((x) => x.length > 1).map(esc).join('|') + ')\\b', 'i') : null;
    const notNeg = (s) => !negRe || !negRe.test(s);
    const kwStyleE = negWestern ? W.styleEntry('traditional (from their culture)') : (of('wstyle')[0] || {}).entry || null;
    const kwWestern = !!(kwStyleE && kwStyleE.western);
    const kwAge = of('age').length ? of('age')[0].entry.v : null;
    const wearM = of('wear')[0];

    // everyone who is a person now lives in `cast`; keyword person mentions become hints only
    const kwHint = {};
    if (cast.length) M.forEach((m) => { if (m.cat === 'person' && m.role !== 'obj') m.cat = 'castHint'; });

    // ---- 1. subjects ----
    const beings = M.filter((m) => m.cat === 'person' || m.cat === 'animal');
    const used = new Set();
    const units = [];
    for (let k = 0; k < beings.length; k++) {
      const m = beings[k];
      if (used.has(m)) continue;
      used.add(m);
      const next = beings[k + 1];
      let u = { m, e: m.entry, kind: m.cat, mods: (m.mods || []).slice(), count: m.count || 1, pl: m.pl, dn: m.dn, role: m.role, gi: m.gi };
      const adj = next && !used.has(next) && next.gi === m.gi && next.order === m.order + 1 && (!next.role || next.role === 'as');
      if (adj) {
        const A = m.entry, B = next.entry;
        if (m.cat === 'person' && next.cat === 'person' && A.gen && !B.gen && !A.grp) {
          u.e = B; u.g = A.g; u.genderWord = true; u.mods.push(...(next.mods || [])); used.add(next); u.m2 = next;
        } else if (m.cat === 'person' && next.cat === 'person' && !A.gen && B.gen && !B.grp) {
          u.g = B.g; u.genderWord = true; used.add(next); u.m2 = next;
        } else if (m.cat === 'animal' && next.cat === 'person' && !B.gen) {
          u.costume = B; used.add(next); u.m2 = next;
        } else if (m.cat === 'person' && next.cat === 'animal' && M.some((x) => x.cat === 'action' && x.entry.id === 'ride' && !x.objM)) {
          const ride = M.find((x) => x.cat === 'action' && x.entry.id === 'ride');
          next.role = 'obj';
          ride.objM = next;
          used.add(next);
        } else if (m.cat === 'person' && !A.gen && next.cat === 'animal') {
          u = { m: next, e: B, kind: 'animal', mods: (next.mods || []).concat(m.mods || []), count: next.count || 1, pl: next.pl, dn: next.dn, role: m.role, costume: A, gi: m.gi, m2: m };
          used.add(next);
        }
      }
      units.push(u);
    }
    const primaries = units.filter((u) => u.role !== 'with' && u.role !== 'obj');
    const companions = units.filter((u) => u.role === 'with');
    let group = [];
    if (primaries.length) {
      group = [primaries[0]];
      primaries.slice(1).forEach((u) => (u.gi === primaries[0].gi || group.length < 3 ? group.push(u) : companions.push(u)));
    } else if (units.length && units[0].role !== 'obj') group = [units[0]];
    let castUnit = null;
    if (cast.length) {
      companions.push(...group);
      castUnit = { m: null, e: { id: 'cast', cat: 'person', n: 'person', g: cast.length === 1 ? (cast[0].gender === 'm' ? 'm' : 'f') : 'p', gen: 1, tags: '' }, kind: 'person', mods: [], count: 1, gi: 0, cast: true };
      group = [castUnit];
    }
    const objUnits = units.filter((u) => u.role === 'obj' && !group.includes(u) && !companions.includes(u));

    const things = of('thing');
    let heroThing = null;
    if (!group.length) heroThing = things.find((t) => t.role !== 'obj' && t.role !== 'with' && t.role !== 'place') || things.find((t) => t.role !== 'obj') || null;
    const props = [];
    const elements = [];
    things.forEach((t) => {
      if (t === heroThing || t.role === 'obj') return;
      const type = t.entry.type;
      if (group.length && (t.role === 'with' || t.role === 'hold' || type === 'hold') && props.length < 2 && group[0].kind === 'person') props.push(t);
      else elements.push(t);
    });

    const main = group[0] || null;
    if (main && kwAge != null && !main.cast && !kwFigs) main.age = kwAge;
    const genreAdj = (of('genre')[0] || { entry: {} }).entry.adj || null;
    if (main && genreAdj && !main.cast) main.genreAdj = genreAdj;
    const subjKind = main ? main.kind : heroThing ? 'thing' : null;
    if (subjKind) ctx.tag(subjKind);
    if (group.length > 1 || cast.length > 1 || (main && (main.count > 1 || main.e.grp))) ctx.tag('group');
    if (main && main.e.grp) ctx.tag('crowd');
    const subjEntry = main ? main.e : heroThing ? heroThing.entry : null;

    // ---- 2. explicit mentions ----
    const explicitStyle = of('style')[0];
    const places = of('place');
    const regions = of('region');
    const dems = of('dem');
    const moods = of('mood');
    const weathers = of('weather').map((m) => m.entry);
    const actions = of('action');
    const info = { kind: subjKind, main: true, coat: subjEntry && subjEntry.coat };

    if (explicitStyle) ctx.vote('style', explicitStyle.entry.id, 100);
    of('style').slice(1).forEach((m) => listInto(ctx, 'tech', m.entry.tech, 3));
    of('time').forEach((m, i) => ctx.vote('time', m.entry.id, 100 - i));
    ['shot', 'angle', 'comp', 'palette', 'move', 'pace'].forEach((c) => of(c).forEach((m, i) => ctx.vote(c, m.entry.id, 100 - i)));
    of('lens').forEach((m) => ctx.vote('lens', m.entry.ph, 100));
    of('ap').forEach((m) => ctx.vote('ap', m.entry.ph, 100));
    of('light').forEach((m, i) => (i === 0 ? ctx.vote('key', m.entry.ph, 100) : ctx.vote('light', m.entry.ph, 8)));
    of('color').forEach((m) => ctx.vote('accent', m.entry.ph, 5));
    places.forEach((m, i) => ctx.vote('place', m.entry, 100 - i));
    if (regions.length) {
      const r = regions[0].entry;
      if (r.set) ctx.vote('place', r.set, 10);
      ctx.tag(r.tags);
      ctx.tag(r.id);
    } else if (dems.length) {
      ctx.tag(dems[0].entry.region.tags);
    }
    if (wearM) ctx.vote('outfit', wearM.entry.n, 150);
    of('quality').forEach(() => ctx.vote('quality', 'ultra-detailed', 4));

    // subject entries
    if (main && !main.cast) {
      applyEntry(ctx, main.e, 1, info);
      if (main.costume) applyEntry(ctx, main.costume, 0.5, {});
      (main.mods || []).forEach((p) => p.entry && p.entry.cat === 'mod' && applyEntry(ctx, p.entry, 1));
      if (!plainWear) {
        if (main.e.wear) ctx.vote('outfit', main.e.wear, 8);
        if (main.e.wearIn) Object.keys(main.e.wearIn).forEach((k) => ctx.has(k) && ctx.vote('outfit', main.e.wearIn[k], 9));
        if (main.costume && main.costume.wear) ctx.vote('outfit', main.costume.wear, 9);
      }
      const g0 = main.g || main.e.g || 'n';
      if (kwStyleE && !(kwStyleE.adult && minor)) {
        const dem0 = (main.mods.find((p) => p.dem) || { entry: {} }).entry.n || '';
        ctx.vote('outfit', kwStyleE.trad ? W.traditional(g0 === 'm' ? 'm' : 'f', dem0, regions[0] && regions[0].entry) : kwStyleE.wear, 100);
      }
      if (plainWear) ctx.vote('outfit', 'simple everyday clothes with no costume elements', 100);
    }
    if (cast.length) {
      cast.forEach((c, i) => {
        const pe = c.profEntry ? [c.profEntry] : c.profession && SC.lookup(String(c.profession).toLowerCase());
        const e = pe && pe.find((x) => x.cat === 'person');
        if (e) applyEntry(ctx, e, i === 0 ? 1 : 0.6, i === 0 ? info : {});
        (c._fig ? c._fig.m.mods || [] : []).forEach((p) => p.entry && p.entry.cat === 'mod' && applyEntry(ctx, p.entry, 0.8));
      });
    }
    group.slice(1).concat(companions).forEach((u) => { ctx.tag(u.e.tags); ctx.tag(u.kind); });
    if (heroThing) applyEntry(ctx, heroThing.entry, 1, info);
    things.filter((t) => t.role === 'place' && t.entry.hab).forEach((t) => contribute(ctx, { place: t.entry.hab }));
    things.forEach((t) => { applyEntry(ctx, t.entry, 0.7, {}); (t.mods || []).forEach((p) => p.entry && p.entry.cat === 'mod' && applyEntry(ctx, p.entry, 0.7)); });
    places.forEach((m) => (m.mods || []).forEach((p) => p.entry && p.entry.cat === 'mod' && applyEntry(ctx, p.entry, 0.8)));
    of('mod').forEach((m) => applyEntry(ctx, m.entry, 1));
    moods.forEach((m) => applyEntry(ctx, m.entry, 1));
    weathers.forEach((e) => applyEntry(ctx, e, 1, info));
    of('season').forEach((m) => applyEntry(ctx, m.entry, 1));
    of('event').forEach((m) => applyEntry(ctx, m.entry, 1));
    of('genre').forEach((m) => applyEntry(ctx, m.entry, 1));
    actions.forEach((m) => applyEntry(ctx, m.entry, 1, info));
    ['light', 'lens', 'dof', 'palette', 'comp', 'move', 'shot', 'angle', 'pace'].forEach((c) => of(c).forEach((m) => applyEntry(ctx, m.entry, 1)));
    if (of('palette').some((m) => m.entry.id === 'bw')) ctx.tag('bw');

    runRules(ctx);

    // ---- 3. style ----
    ctx.vote('style', o.mode === 'video' ? 'cinematic' : 'photoreal', 1);
    if (subjEntry && subjEntry.cat === 'thing' && subjEntry.type === 'product') ctx.vote('style', 'product photography', 1.5);
    if (subjEntry && subjEntry.cat === 'thing' && subjEntry.type === 'food') ctx.vote('style', 'food photography', 1.5);
    const styleId = ctx.resolve('style');
    const style = SC.get('style', styleId) || SC.get('style', 'photoreal');
    applyEntry(ctx, style, 1);
    ctx.tag('medium-' + style.medium);
    runRules(ctx);

    // ---- 4. place ----
    const placeV = ctx.resolve('place');
    const place = placeV ? (typeof placeV === 'object' ? placeV : SC.get('place', placeV)) : null;
    const placeMention = place ? places.find((m) => m.entry === place) : null;
    if (place) {
      applyEntry(ctx, place, placeMention ? 1 : 0.8);
      ctx.tag(place.io === 'in' ? 'indoor' : 'outdoor');
    } else {
      ctx.tag(weathers.length || of('time').length ? 'outdoor' : 'noplace');
    }
    const outdoor = ctx.has('outdoor');
    if (outdoor || ctx.has('noplace')) {
      ctx.cands('outfitOut').forEach((x) => ctx.vote('outfit', x.v, x.w));
      ctx.list('envOut', 4).forEach((x) => ctx.vote('env', x, 4));
    }
    if (placeMention && placeMention.extra) placeMention.extra.forEach((x) => applyEntry(ctx, x, 0.6));
    const region = regions.length ? regions[0].entry : null;
    if (region) {
      const urban = place && /(urban|street|market|transit|road)/.test(place.tags || '');
      if (!place || place.io === 'out') {
        if (urban || !place) listInto(ctx, 'env', region.env, 4.5);
        if (!urban && (!place || /nature/.test(place.tags || ''))) listInto(ctx, 'env', region.nat, 4.5);
      } else listInto(ctx, 'env', U.arr(region.env).slice(0, 1), 1);
      listInto(ctx, 'sound', region.sound, 3);
      if (region.wear && !kwStyleE) ctx.vote('outfit', region.wear, 3);
    } else if (!kwStyleE && (dems.length || (main && main.mods.some((p) => p.dem)))) {
      const d = dems[0] || main.mods.find((p) => p.dem);
      const r = d.entry.region;
      if (r && r.wear) ctx.vote('outfit', r.wear, 2);
    }
    runRules(ctx);

    // ---- 5. time ----
    const explicitTime = of('time').length > 0;
    if (!ctx.has('space') && !ctx.has('underwater')) {
      if (outdoor || ctx.has('noplace')) {
        [['golden hour', 0.6], ['afternoon', 0.5], ['morning', 0.45], ['blue hour', 0.3], ['dusk', 0.3], ['sunset', 0.3]].forEach(([k, w]) => ctx.vote('time', k, w));
      }
    }
    let time = null;
    const bestTimeW = ctx.cands('time').reduce((m, x) => Math.max(m, x.w), 0);
    if (explicitTime || (outdoor && bestTimeW > 0) || bestTimeW >= 1.5 || (ctx.has('noplace') && bestTimeW >= 0.6 && subjKind !== 'thing')) {
      const tv = ctx.resolve('time');
      time = tv ? SC.get('time', tv) : null;
    }
    if (ctx.has('studio') && !explicitTime) time = null;
    if (time) {
      applyEntry(ctx, time, 1);
      ctx.tag(time.day ? 'day' : 'night');
      if (time.deep) ctx.tag('deepnight');
      if (outdoor) listInto(ctx, 'sky', time.sky, 3);
      const L = time.light || {};
      const urban = ctx.has('urban');
      const keys = outdoor || ctx.has('noplace') ? (urban && L.urban ? L.urban : L.out) : L.in || L.out;
      U.arr(keys).forEach((k) => ctx.vote('key', k, 3));
    }
    runRules(ctx);

    // ---- 6. lighting ----
    ctx.vote('key', outdoor || ctx.has('noplace') ? 'soft, natural ambient light' : 'soft, motivated practical light', 0.6);
    let key = ctx.resolve('key');
    if (key && !notNeg(key)) key = outdoor ? 'soft, natural ambient light' : 'soft, motivated practical light';

    // ---- 7. camera ----
    const assigned = new Set();
    cast.forEach((c) => c._fig && [c._fig.acts].concat(c._fig.members.map((x) => x.acts)).flat().forEach((a) => assigned.add(a)));
    const leadActs = cast.length ? (cast[0]._fig ? cast[0]._fig.acts : []).concat(actions.filter((a) => !assigned.has(a))) : actions;
    let act = leadActs.find((a) => !a.secondary) || leadActs[0] || null;
    const evAct = of('event').map((m) => m.entry.act).find(Boolean);
    if (!act && evAct && (subjKind === 'person' || !subjKind)) {
      act = { cat: 'action', entry: SC.get('action', evAct), implied: true };
      applyEntry(ctx, act.entry, 1, info);
    }
    const act2 = leadActs.find((a) => a !== act) || null;
    const aKind = act && act.entry ? act.entry.kind : null;
    if (subjKind === 'person') {
      if (group.length > 1 || cast.length > 1 || main.count > 1 || main.e.grp) ctx.vote('shot', 'full shot', 1.5);
      else { ctx.vote('shot', 'medium shot', 1.5); ctx.vote('shot', 'medium close-up', 0.8); }
    } else if (subjKind === 'animal') ctx.vote('shot', ctx.has('small') ? 'close-up' : 'medium shot', 1.2);
    else if (subjKind === 'thing') ctx.vote('shot', ['veh', 'arch', 'fx', 'plant'].includes(subjEntry.type) ? 'wide shot' : subjEntry.type === 'sky' ? 'extreme wide shot' : 'medium shot', 1.5);
    else if (place && place.io === 'in') ctx.vote('shot', 'wide shot', 2);
    else { ctx.vote('shot', 'extreme wide shot', 2); ctx.vote('shot', 'wide shot', 1.5); }
    if (aKind === 'loco' || aKind === 'dance' || aKind === 'fight') ctx.vote('shot', 'full shot', 1.8);
    if (aKind === 'gesture') ctx.vote('shot', 'medium close-up', 1.5);
    if (aKind === 'event' || aKind === 'flight') ctx.vote('shot', 'wide shot', 2);
    if (outdoor && /(mountain|desert|ocean|valley|arctic|savanna|meadow)/.test(place ? place.id : '')) ctx.vote('shot', 'wide shot', 1.2);
    const shot = SC.get('shot', ctx.resolve('shot')) || SC.get('shot', 'medium shot');
    ctx.vote('angle', 'eye level', 1);
    const angle = SC.get('angle', ctx.resolve('angle')) || SC.get('angle', 'eye level');
    ctx.vote('lens', shot.lens, 3);
    if (angle.id === 'aerial') ctx.vote('lens', '24mm', 4);
    const lens = ctx.resolve('lens');
    ctx.vote('ap', shot.ap, 3);
    const ap = ctx.resolve('ap');
    ctx.vote('dof', shot.dof, 3);
    let dof = ctx.resolve('dof');
    if (dof && SC.get('dof', dof)) dof = SC.get('dof', dof).ph;
    ctx.vote('comp', 'rule-of-thirds', 1);
    if (cast.some((c) => c._fig && c._fig.members.some((m) => m.pos))) ctx.vote('comp', 'centered', 2.5);
    if (/(street|road|corridor|bridge|railway)/.test(place ? place.id : '')) ctx.vote('comp', 'leading-lines', 1.2);
    ctx.vote('comp', 'layered-depth', 0.6);
    const comp = SC.get('comp', ctx.resolve('comp')) || SC.get('comp', 'rule-of-thirds');

    // ---- 8. colour ----
    const palV = ctx.resolve('palette');
    const palette = palV ? SC.get('palette', palV) : null;
    const accents = ctx.list('accent', 3);

    // ---- 9. video ----
    if (aKind === 'loco') ctx.vote('move', 'tracking', 1);
    if (angle.id === 'aerial') ctx.vote('move', 'aerial flyover', 6);
    ctx.vote('move', 'slow push-in', 0.9);
    ctx.vote('move', 'dolly', 0.6);
    ctx.vote('move', subjKind ? 'orbit' : 'aerial flyover', subjKind ? 0.3 : 1.5);
    const move = SC.get('move', ctx.resolve('move')) || SC.get('move', 'slow push-in');
    ctx.vote('pace', 'real-time', 1);
    const pace = SC.get('pace', ctx.resolve('pace'));

    // ---- 10. subject appearance ----
    const rngS = ctx.rng('outfit', (o.bumps.outfit || 0) * 31);
    const evWear = kwWestern || plainWear ? null : of('event').map((m) => m.entry.wear).find(Boolean) || null;
    const outW = outdoor ? ctx.cands('outfitOut').sort((a, b) => b.w - a.w)[0] : null;
    let subject = null;
    if (cast.length) {
      const school = ['school', 'classroom', 'student', 'college', 'university', 'campus'].some((t) => ctx.has(t)) || /school|uniform|student|campus/.test((M.map((m) => m.raw).join(' ') + ' ' + (o.keepText || '')).toLowerCase());
      const chars = SC.cast.build(cast, {
        kw: { style: kwStyleE, western: kwWestern, wear: wearM && !wearM.fig ? wearM.entry.n : null, wearIndex: 0, none: noneWear, plain: plainWear, age: kwFigs ? null : kwAge },
        region, eventWear: evWear, outWear: outW && outW.v, school, minorAny: minor,
      });
      chars.forEach((ch, i) => { ch.fig = cast[i]._fig || null; });
      const P0 = Object.assign({}, chars[0].P);
      subject = {
        np: U.list(chars.map((c) => c.np)), P: P0, kind: 'person', entry: castUnit.e, units: group, outfit: null, outfits: null, expr: null, look: [], gear: null,
        companions: companions.map((u) => unitNP(u, true)), props: props.map((t) => unitNP({ e: t.entry, mods: t.mods, count: t.count || 1, pl: t.pl, dn: t.dn }, true)), cast: chars,
        exprMood: ctx.resolve('expr'),
        wearNone: chars.every((c) => c.mode === 'none'),
      };
    } else if (main || heroThing) {
      const hu = heroThing ? { e: heroThing.entry, mods: heroThing.mods, count: heroThing.count || 1, pl: heroThing.pl, dn: heroThing.dn, kind: 'thing', genreAdj } : null;
      const P0 = main ? pronouns(group) : pronouns([hu]);
      const np = main ? U.list(group.map((u) => unitNP(u, true))) : unitNP(hu, true);
      const look = [];
      let outfit = null;
      let outfits = null;
      let expr = null;
      let wearNone = false;
      const isPerson = main && main.kind === 'person';
      if (isPerson && noneWear && !wearM && !kwStyleE) {
        wearNone = true;
        expr = ctx.resolve('expr');
      } else if (isPerson && group.length === 1 && P0.plural) {
        const safe = ctx.cands('outfit').filter((x) => x.w >= 100 || (x.w >= 5 && x.w < 8) || x.v === main.e.wear).sort((a, b) => b.w - a.w)[0];
        outfit = safe ? pickGendered(safe.v, 'n', rngS) : 'a colorful mix of everyday clothing';
        expr = ctx.resolve('expr');
      } else if (isPerson && group.length === 1) {
        ctx.vote('outfit', { f: 'a simple, contemporary outfit in natural fabrics', m: 'a simple, contemporary outfit in natural fabrics', n: 'a simple, contemporary outfit in natural fabrics' }, 0.5);
        outfit = pickGendered(ctx.resolve('outfit'), main.g || main.e.g || 'n', rngS);
        expr = ctx.resolve('expr');
      } else if (isPerson && group.length <= 3 && group.every((u) => u.kind === 'person' && !isPlural(u) && !u.e.grp)) {
        const explicitW = ctx.cands('outfit').filter((x) => x.w >= 100).sort((a, b) => b.w - a.w)[0];
        outfits = group.map((u) => {
          const g = u.g || u.e.g || 'n';
          const wIn = u.e.wearIn && Object.keys(u.e.wearIn).find((k) => ctx.has(k));
          const w = explicitW ? explicitW.v : wIn ? u.e.wearIn[wIn] : u.e.wear || evWear || (region && region.wear) || (outW && outW.v) || { f: 'a simple, elegant outfit', m: 'a simple, well-cut outfit', n: 'a simple, contemporary outfit' };
          return { ref: unitRef(u), outfit: pickGendered(w, g, rngS) };
        });
        expr = ctx.resolve('expr');
      } else if (isPerson) {
        const ov = ctx.cands('outfit').filter((x) => x.w >= 3 && (x.w < 8 || x.w >= 100));
        if (ov.length) outfit = pickGendered(ov.sort((a, b) => b.w - a.w)[0].v, 'n', rngS);
        if (!outfit) outfit = 'coordinated contemporary outfits in natural fabrics';
        expr = ctx.resolve('expr');
      } else if (main && main.costume) {
        outfit = pickGendered(main.costume.wear, 'n', rngS);
      }
      const src = main ? main.e : heroThing.entry;
      U.arr(src.look).forEach((l) => look.push(l));
      if (main && main.costume) U.arr(main.costume.look).forEach((l) => look.push(l));
      const gear = main && main.e.gear && !props.length && !plainWear ? main.e.gear : null;
      subject = {
        np, P: P0, kind: subjKind, entry: src, units: group, outfit, outfits, expr, look, gear, wearNone,
        companions: companions.map((u) => unitNP(u, true)),
        props: props.map((t) => unitNP({ e: t.entry, mods: t.mods, count: t.count || 1, pl: t.pl, dn: t.dn }, true)),
      };
    }
    const P = subject ? subject.P : { S: '', sub: '', obj: '', pos: 'the', self: '', plural: false };
    const P0L = P;

    // one wardrobe state that every clothing-related phrase must agree with
    const keepText = (M.map((m) => m.raw || '').join(' ') + ' ' + (o.keepText || '')).toLowerCase();
    let wstate = null;
    if (subject && subjKind === 'person') {
      const texts = subject.cast ? subject.cast.map((c) => c.outfitText) : [subject.outfit, subject.gear].concat((subject.outfits || []).map((x) => x.outfit));
      wstate = { mode: subject.wearNone ? 'none' : 'dressed', text: texts.filter(Boolean).join(' ').toLowerCase(), keep: keepText, western: kwWestern };
    } else if (subject && main && main.costume) {
      wstate = { mode: 'dressed', text: String(subject.outfit || '').toLowerCase(), keep: keepText, western: kwWestern };
    }
    const wearOK = (s) => !wstate || W.consistent(s, wstate);
    if (subject) subject.look = subject.look.filter((l) => wearOK(l) && notNeg(l));

    // ---- 11. place phrases ----
    let placeInfo = null;
    const weatherAdjE = weathers.find((w) => w.adj);
    const placeIsObj = placeMention && placeMention.role === 'obj';
    if (place) {
      const rngP = ctx.rng('placeadj', (o.bumps.place || 0) * 13);
      const desc = o.detail >= 2 && place.adj && !(placeMention && placeMention.mods && placeMention.mods.length) ? U.pick(rngP, place.adj) : null;
      const wAdj = outdoor && weatherAdjE && !ctx.banned('weatherAdj', 'x') && place.art !== '' ? weatherAdjE.adj : null;
      const userMods = placeMention ? modWords(placeMention.mods) : [];
      const rAdj = region && !region.np && region.adj && !region.post && place.id !== 'outer space' ? region.adj : null;
      const adjs = [];
      if (!subject && genreAdj) adjs.push(genreAdj);
      if (desc && !userMods.length && !(!subject && genreAdj)) adjs.push(desc);
      userMods.forEach((w) => adjs.push(w));
      if (wAdj && !adjs.includes(wAdj)) adjs.push(wAdj);
      let core = adjs.length > 1 ? adjs.slice(0, -1).join(', ') + ', ' + adjs[adjs.length - 1] : adjs.join('');
      const pn = (placeMention && placeMention.dn) || place.n;
      core = (core ? core + ' ' : '') + (rAdj ? rAdj + ' ' : '') + pn;
      let np;
      if (region && region.np && !placeMention) np = region.np;
      else if (place.art === 'the') np = 'the ' + core;
      else if (place.art === '') np = core;
      else if (place.art === 'pos') np = (subject && subjKind === 'person' ? P.pos : 'a') + ' ' + core;
      else np = U.a(core);
      if (region && region.post && !(region.np && !placeMention)) np += ' ' + region.post;
      const short = place.short || (place.art === '' ? pn : 'the ' + (wAdj ? wAdj + ' ' : '') + pn);
      const loco = act && act.entry && ['loco', 'flight', 'swim'].includes(act.entry.kind);
      const regionPrep = !placeMention && regions[0] && regions[0].prep && !['in', 'at'].includes(regions[0].prep) ? regions[0].prep : null;
      let prep = (placeMention && placeMention.prep) || regionPrep || (loco ? place.via : place.prep) || 'in';
      if (act && act.entry && act.entry.iprep && place.io === 'in' && ['in', 'at', 'inside'].includes(prep)) prep = act.entry.iprep;
      placeInfo = { entry: place, np, short, prep, staticPrep: place.prep || 'in', via: place.via || 'through', io: place.io, isObj: !!placeIsObj };
    } else if (region) {
      placeInfo = { entry: null, np: region.post ? region.post.replace(/^in /, '') : region.n.replace(/\b\w/g, (c) => c.toUpperCase()), short: region.adj || region.n, prep: 'in', staticPrep: 'in', via: 'through', io: 'out' };
    }
    // things introduced with a preposition ("under a banyan tree", "by the fireplace") anchor the subject
    const anchors = elements.filter((t) => t.role === 'place' && t.prep);
    if (anchors.length && subject) {
      const a = anchors[0];
      const anp = unitNP({ e: a.entry, mods: a.mods, count: a.count || 1, pl: a.pl, dn: a.dn }, true);
      const aph = a.prep + ' ' + anp;
      if (placeInfo && !placeInfo.isObj) placeInfo.np += (/(^| )(in|at|on|inside)$/.test(placeInfo.prep) ? ' ' : ', ') + aph;
      else if (!placeInfo) placeInfo = { entry: null, np: anp, short: 'the ' + (a.dn || a.entry.n), prep: a.prep, staticPrep: a.prep, via: a.prep, io: ctx.has('indoor') ? 'in' : 'out', anchorOnly: true };
      elements.splice(elements.indexOf(a), 1);
      if (U.arr(a.entry.look).length) ctx.vote('detail', U.arr(a.entry.look)[0], 5);
    }
    const coreEls = elements.filter((t) => (t.role !== 'from' && t.entry.type !== 'sky' && t.entry.type !== 'fx') || t.generic).slice(0, 2);
    P.place = placeInfo ? placeInfo.short : '';
    P.along = placeInfo && !placeInfo.isObj ? placeInfo.via + ' ' + placeInfo.short : '';
    P.at = placeInfo && !placeInfo.isObj ? placeInfo.staticPrep + ' ' + placeInfo.short : '';
    P.focus = subject ? P.S : placeInfo ? placeInfo.short : 'the scene';

    // ---- 12. actions ----
    function buildAction(a, PX) {
      if (!a || !a.entry) return null;
      const P = PX || P0L;
      const e = a.entry;
      let oNP = '';
      if (a.objM) {
        const om = a.objM;
        if (om.cat === 'place') oNP = placeInfo && om.entry === place ? placeInfo.np : U.a(om.entry.n);
        else oNP = unitNP({ e: om.entry, mods: om.mods, count: om.count || 1, pl: om.pl, dn: om.dn, kind: om.cat }, true);
      } else if (e.obj === 'place' && placeInfo && placeIsObj) oNP = placeInfo.np;
      else if (e.defObj) oNP = e.defObj;
      else if (e.obj && props.length && /\{o\}/.test(e.ing || '')) oNP = subject.props.shift() || '';
      const PP = Object.assign({}, P, { o: oNP });
      const objAct = a.objM && a.objM.entry.act;
      let ing = U.fill(oNP && e.oing ? e.oing : e.ing || U.ing(e.n), PP);
      if (oNP && !/\{o\}/.test(e.ing || '') && !ing.includes(oNP)) ing += ' ' + oNP;
      const adv = U.arr(a.adv);
      if (adv.length) ing += ' ' + adv.join(' and ');
      let doP = oNP && e.odo ? e.odo : e.do || '[' + e.n + ']';
      let v = oNP && e.odo ? null : e.v;
      if (objAct && objAct.v) v = objAct.v;
      // user said "howling"/"drinking" while the concept is "roar"/"sip": keep their verb
      const key0 = (a.key || '').split(' ');
      const baseKey = [e.id].concat(e.syn ? e.syn.split('|') : []).find((s) => { const f = U.verbForms(s.split(' ')[0]); return [f.base, f.s, f.ing, f.ed].includes(key0[0]); });
      const userVerb = baseKey && baseKey.split(' ')[0];
      if (!e.generic && userVerb && userVerb !== e.id.split(' ')[0] && key0.length === 1 && /^\w+ing\b/.test(ing) && !(oNP && e.oing)) {
        ing = ing.replace(/^\w+ing\b/, U.ing(userVerb));
        doP = doP.replace(/^\[\w+\]/, '[' + userVerb + ']');
        v = null;
      }
      const froms = things.filter((t) => t.role === 'from' && t.gi === a.gi);
      if (froms.length) ing += ' from ' + U.list(froms.map((t) => unitNP({ e: t.entry, mods: t.mods, count: t.count || 1, pl: t.pl, dn: t.dn }, true)));
      const animalSubj = subjKind === 'animal' && ['interact', 'work', 'gesture', 'fight'].includes(e.kind) && !['roar', 'graze', 'perch', 'hunt'].includes(e.id);
      if (animalSubj) v = ['{do} {at}', '[move] with quick, precise motions', '[pause], alert and watchful'];
      const nonLiving = subjKind === 'thing';
      const veh = nonLiving && subjEntry && subjEntry.type === 'veh';
      if (nonLiving && e.kind !== 'event') v = null;
      let pose = animalSubj ? null : nonLiving && e.kind !== 'event' ? (veh ? 'captured at speed, the background streaked with motion blur' : null) : objAct && objAct.pose ? U.fill(objAct.pose, PP) : oNP && e.oing ? null : e.pose ? U.fill(e.pose, PP) : null;
      if (pose && !wearOK(pose)) pose = null;
      return { e, objE: a.objM && a.objM.entry, ing: ing.trim(), oNP, PP, doP, kind: veh && e.kind === 'loco' ? 'vehicle' : e.kind || 'generic', pose, v, beats: e.beats, energy: e.energy || 1 };
    }
    const A1 = buildAction(act);
    const A2 = buildAction(act2);
    if (subject && subject.cast) {
      subject.cast.forEach((ch, i) => {
        const own = i === 0 ? [] : ch.fig ? ch.fig.acts : [];
        ch.acts = own.map((a) => buildAction(a, ch.P)).filter(Boolean);
        if (ch.fig && ch.c.count > 1) {
          const PM = Object.assign({}, ch.P1 || ch.P, { plural: false });
          ch.memberInfo = ch.fig.members.map((mb) => ({ pos: mb.pos, wear: mb.wear, acts: mb.acts.map((a) => buildAction(a, PM)).filter(Boolean) }));
        }
      });
    }
    const moodAdv = moods.map((m) => m.entry.adv).find(Boolean);
    if (A1 && moodAdv && !P.plural && subjKind === 'person' && !A2 && !/\s/.test(A1.ing)) A1.ing += ' ' + moodAdv;

    // ---- 13. elements (extra nouns) ----
    const coreNP = coreEls.map((t) => unitNP({ e: t.entry, mods: t.mods, count: t.count || 1, pl: t.pl, dn: t.dn }, true));
    elements.filter((t) => !(t.role === 'from' && A1 && A1.ing.includes(' from '))).forEach((t) => {
      const eu = { e: t.entry, mods: t.mods, count: t.count || 1, pl: t.pl, dn: t.dn };
      const np = unitNP(eu, true);
      if (t.entry.type === 'sky') ctx.vote('sky', np + (isPlural(eu) ? ' fill the sky' : ' hangs in the sky'), 9);
      else if (!(subject && coreEls.includes(t))) ctx.vote('env', np, 9);
      if (U.arr(t.entry.look).length) ctx.vote('detail', U.arr(t.entry.look)[0], 5);
    });
    places.filter((m) => m.entry !== place && m.role !== 'obj').forEach((m) => {
      const pe = m.entry;
      ctx.vote('env', (pe.art === 'the' ? 'the ' : pe.art === '' ? '' : U.an(pe.n) + ' ') + pe.n + ' stretching into the background', 9);
      listInto(ctx, 'env', U.arr(pe.env).slice(0, 1), 2);
    });
    // free material modifiers ("perfume, marble") describe a surface in the scene
    of('mod').filter((m) => m.free && !m.generic && m.entry.ord === 'mat').forEach((m) => ctx.vote('env', 'a polished ' + String(m.raw).toLowerCase() + ' surface beneath', 9));
    objUnits.forEach((u) => ctx.vote('env', unitNP(u, true), 6));
    if (subject && subject.gear) ctx.vote('subj', subject.gear + ' in hand', 4);
    if (main && main.kind === 'person') ctx.list('posture', 1).forEach((p) => ctx.vote('subj', U.fill(p, P), 3));

    // ---- 14. counts per detail level ----
    const L = o.detail || 2;
    const N = {
      env: [2, 3, 5][L - 1], sky: 1, atmo: [1, 1, 2][L - 1], light: [1, 2, 3][L - 1], detail: [1, 3, 5][L - 1], subj: [1, 2, 3][L - 1],
      texture: [0, 1, 2][L - 1], tech: [1, 2, 3][L - 1], quality: [3, 5, 7][L - 1], motion: [2, 3, 4][L - 1], smotion: [1, 2, 3][L - 1], sound: [2, 3, 4][L - 1],
    };
    const SUBJ_LISTS = new Set(['subj', 'smotion']);
    const subjNoun = subjEntry && subjEntry.cat === 'thing' ? new RegExp('\\b' + esc(subjEntry.n.split(' ').pop()) + '\\b', 'i') : null;
    const lists = {};
    Object.keys(N).forEach((k) => {
      const keep = (s) => (subject || !/subject|\{(pos|sub|obj|S)\}/.test(s)) && notNeg(U.fill(s, P)) && (!SUBJ_LISTS.has(k) || wearOK(U.fill(s, P))) && !(k === 'env' && subjNoun && subjNoun.test(s));
      lists[k] = ctx.list(k, N[k], k === 'env' || k === 'detail' ? 'env' : k, keep).map((s) => U.fill(s, P));
    });
    lists.neg = ctx.list('neg', 10);
    lists.sd = ctx.list('sd', 5);

    // ---- 15. mood line ----
    const moodAdj = moods.length ? [moods[0].entry.adj].concat(moods.slice(1, 3).map((m) => m.entry.desc || m.entry.id)).filter(Boolean) : [];
    of('mod').filter((m) => m.generic).forEach((m) => moodAdj.push(m.entry.ph));

    // ---- 16. aspect ----
    let aspect = o.aspect && o.aspect !== 'auto' ? o.aspect : of('aspect')[0] ? of('aspect')[0].entry.n : null;
    if (!aspect) {
      if (o.mode === 'video') aspect = '16:9';
      else if (subjEntry && /(rocket|lighthouse|tower|waterfall|statue|perfume)/.test(subjEntry.id)) aspect = '2:3';
      else if (shot.scale >= 5) aspect = '16:9';
      else if (cast.length > 2) aspect = '3:2';
      else if (subjKind === 'person' && shot.scale <= 3) aspect = '4:5';
      else if (subjKind === 'person' && shot.scale === 4) aspect = '2:3';
      else if (subjEntry && ['food', 'product'].includes(subjEntry.type)) aspect = '4:5';
      else aspect = '3:2';
    }
    const dur = of('duration')[0];
    const duration = o.duration || (dur ? Math.min(20, Math.max(3, dur.entry.v)) : 8);

    // ---- 17. surface words that must appear (accuracy guarantee) ----
    const must = [];
    const SKIP_MUST = new Set(['quality', 'duration', 'aspect', 'adverb', 'wear', 'lens', 'ap', 'neg', 'wstyle', 'wgen', 'age', 'castHint', 'garment', 'pron', 'member', 'posn']);
    const SKIP_KNOWN = new Set(['action', 'mod', 'color', 'dem', 'shot', 'angle', 'move', 'pace', 'comp', 'dof', 'light', 'palette', 'region', 'mood', 'genre', 'style']);
    M.forEach((m) => {
      if (SKIP_MUST.has(m.cat)) return;
      if (m.generic) { if (notNeg(m.raw)) must.push({ raw: m.raw, alts: [m.raw.toLowerCase()] }); return; }
      if (SKIP_KNOWN.has(m.cat)) return;
      const e = m.entry;
      const alts = [m.raw, e.id, e.n].concat(e.syn ? e.syn.split('|') : []).filter(Boolean).map((x) => String(x).toLowerCase());
      alts.slice().forEach((a) => { const w = a.split(' ').pop(); if (w.length > 3) alts.push(w.replace(/(ies|es|s)$/, '')); });
      must.push({ raw: e.n || m.raw, alts });
    });

    const spec = {
      mode: o.mode, level: L, seed: o.seed,
      style, medium: style.medium, subject, action: A1, action2: A2, place: placeInfo, region, time,
      weathers, weatherClause: outdoor || !place ? (weathers.find((w) => w.clause) || {}).clause || null : null,
      key, lightAcc: lists.light, sky: outdoor || !place ? lists.sky : [], env: lists.env, atmo: lists.atmo, detail: lists.detail,
      subjDet: lists.subj, texture: lists.texture, tech: lists.tech, quality: lists.quality, neg: lists.neg, sd: lists.sd,
      shot, angle, lens, ap, dof, comp, palette, accents, moods: moods.map((m) => m.entry), moodAdj,
      move, pace, motion: lists.motion, smotion: lists.smotion, sound: lists.sound,
      aspect, duration, must, tags: [...ctx.tags], notes, locked: ctx.locked,
      events: of('event').map((m) => m.entry), seasons: of('season').map((m) => m.entry), genres: of('genre').map((m) => m.entry),
      P, coreElements: subject ? coreNP : [],
      time2: of('time').length > 1 ? SC.get('time', of('time')[of('time').length - 1].entry.id) : null,
      negWords: negShown, minor, wardrobeNone: !!(subject && subject.wearNone), wstate,
      qualityWords: of('quality').map((m) => String(m.entry.id).toLowerCase()), styleMentions: of('style').map((m) => ({ e: m.entry, raw: String(m.raw).toLowerCase() })),
      i2v: !!o.i2v, props: props.map((t) => t.entry), actObjs: [A1, A2].filter((x) => x && x.objE).map((x) => x.objE),
      placeIndoor: !!(place && place.io === 'in'), explicitStyle: !!explicitStyle,
    };
    spec.leadPick = U.pick(ctx.rng('lead', (o.bumps.style || 0) * 5), style.lead || ['An image']);
    spec.vleadPick = U.pick(ctx.rng('vlead', (o.bumps.style || 0) * 5), style.vlead || ['cinematic shot']);
    spec.rng = (slot) => ctx.rng('tpl-' + slot, (o.bumps.phrasing || 0) * 101);
    return spec;
  };

  SC._internal = { Ctx, unitNP, pronouns, modWords };
})();
