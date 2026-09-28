/* Scene Compiler — UI wiring. */
(function () {
  const SC = globalThis.SC;
  const U = SC.u;
  const $ = (id) => document.getElementById(id);
  SC.buildIndex();

  const TARGETS = {
    image: [
      { v: 'natural', label: 'Natural', hint: 'Flux · GPT-Image · Imagen · DALL·E · Draw Things' },
      { v: 'sdxl', label: 'SD tags', hint: 'SDXL · SD 1.5 · Pony · ComfyUI CLIP' },
      { v: 'midjourney', label: 'Midjourney', hint: 'Midjourney v7 / Niji' },
    ],
    video: [
      { v: 'prose', label: 'Prose', hint: 'Veo · Sora · Runway Gen-4' },
      { v: 'timeline', label: 'Timeline', hint: 'Kling · Runway · shot lists' },
      { v: 'compact', label: 'Compact', hint: 'Wan · LTX · Hunyuan (local)' },
    ],
  };
  const EXAMPLES = [
    'Indian woman, rain, Mumbai, cinematic, walking',
    'rocket launch sunset',
    'lonely guy looking back while leaving childhood home',
    'cat astronaut floating in space, watercolor',
    'old fisherman mending nets at harbor, golden hour, film photography',
    'chai wala, Delhi street, night',
    'dragon over castle, storm, epic',
    'holi festival, crowd, slow motion',
    'perfume bottle, marble, luxury',
    'tiger stalking through jungle, mist',
  ];
  const CHIP = {
    person: ['subject', 'subject'], animal: ['subject', 'subject'], thing: ['object', 'subject'], place: ['setting', 'place'],
    region: ['region', 'place'], dem: ['origin', 'place'], action: ['action', 'action'], time: ['time', 'time'],
    weather: ['weather', 'weather'], season: ['season', 'weather'], event: ['event', 'weather'], mood: ['mood', 'mood'],
    style: ['style', 'style'], genre: ['genre', 'style'], shot: ['shot', 'camera'], angle: ['angle', 'camera'],
    move: ['camera move', 'camera'], pace: ['pace', 'camera'], lens: ['lens', 'camera'], ap: ['aperture', 'camera'],
    dof: ['focus', 'camera'], comp: ['composition', 'camera'], light: ['lighting', 'light'], palette: ['palette', 'color'],
    color: ['color', 'color'], mod: ['detail', 'other'], wear: ['outfit', 'subject'], duration: ['duration', 'camera'],
    aspect: ['aspect', 'camera'], quality: ['quality', 'other'], adverb: ['manner', 'action'],
    neg: ['excluded', 'neg'], wstyle: ['wardrobe', 'subject'], wgen: ['wardrobe', 'subject'], age: ['age', 'subject'], castHint: ['person', 'subject'], pron: ['refers to', 'subject'], posn: ['position', 'camera'], member: ['member', 'subject'],
  };

  // ---------- state ----------
  const DEFAULT = { input: '', mode: 'image', target: { image: 'natural', video: 'prose' }, detail: 2, aspect: 'auto', duration: 8, audio: true, seed: 7, bumps: {}, literal: [], build: { cast: [], scene: {}, active: 0, open: { identity: true } } };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sc:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sc:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  const state = Object.assign({}, DEFAULT, store.get('state', {}));
  state.target = Object.assign({}, DEFAULT.target, state.target);
  state.bumps = {};
  state.build = Object.assign({}, DEFAULT.build, state.build);
  let last = null;
  let builder = null;

  const opts = (seed) => ({
    mode: state.mode, target: state.target[state.mode], detail: state.detail, aspect: state.aspect,
    duration: state.mode === 'video' ? state.duration : undefined, audio: state.audio,
    seed: seed || state.seed, bumps: seed ? {} : state.bumps, literal: state.literal,
    cast: builder ? builder.cast() : [], scene: builder ? builder.scene() : {}, i2v: state.mode === 'video' && !!state.i2v,
  });
  // tell the builder what the keywords are supplying, so empty fields don't look ignored
  const SCENE_CAT = { place: 'background', region: 'background', time: 'time', weather: 'weather', event: 'event', season: 'event', light: 'light', mood: 'mood', style: 'style', genre: 'genre', shot: 'shot', angle: 'angle', lens: 'lens', comp: 'comp', palette: 'palette', move: 'move', pace: 'pace' };
  function pushHints(r) {
    if (!builder) return;
    const bc = builder.cast();
    const chars = (r && r.spec.subject && r.spec.subject.cast) || [];
    const inherited = bc.map((b, i) => {
      const ch = chars[i];
      if (!ch || !ch.c._fig) return {};
      const h = {};
      if (!b.ethnicity && ch.eth) h.ethnicity = ch.eth;
      if (!b.profession && ch.prof) h.profession = ch.prof;
      if ((b.age === undefined || b.age === '') && ch.age != null) h.age = ch.age;
      if (!b.outfit && ch.c.wear) h.outfit = ch.c.wear;
      if (!b.position && ch.c.position) h.position = ch.c.position;
      return h;
    });
    const extra = chars.slice(bc.length).map((ch) => ch.np);
    const scene = {};
    ((r && r.parsed.mentions) || []).forEach((m) => { const k = SCENE_CAT[m.cat]; if (k && !scene[k]) scene[k] = m.raw; });
    builder.setHints(inherited, scene, bc.length ? extra : []);
  }
  const hasBuild = () => builder && (builder.cast().length || Object.keys(builder.scene()).length);

  // ---------- render ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  function renderChips(r) {
    const el = $('chips');
    if (!r) { el.innerHTML = ''; return; }
    const out = [];
    const fixes = new Map(r.parsed.corrections.map((c) => [c.to, c.from]));
    r.parsed.mentions.forEach((m) => {
      const [label, color] = CHIP[m.cat] || ['keyword', 'other'];
      const unknown = m.generic;
      const tag = unknown ? (m.cat === 'action' ? 'action' : m.cat === 'place' ? 'setting' : m.cat === 'mod' ? 'detail' : 'element') : label;
      const shown = m.cat === 'wear' ? m.entry.n : m.raw;
      const from = [...fixes.entries()].find(([to]) => to === (m.raw || '').toLowerCase() || (m.entry.id === to));
      const extra = (m.mods || []).map((p) => p.raw || (p.entry && p.entry.n)).filter(Boolean);
      const text = m.cat === 'neg' ? 'no ' + shown : (extra.length ? extra.join(' ') + ' ' : '') + shown;
      if (from) {
        out.push(`<span class="chip fix" style="--c:var(--c-${color})" data-lit="${esc(from[1])}" title="Interpreted '${esc(from[1])}' as '${esc(from[0])}'. Click to keep your word as typed."><b>${tag}</b>${esc(from[1])} → ${esc(from[0])}</span>`);
      } else {
        out.push(`<span class="chip${unknown ? ' unknown' : ''}" style="--c:var(--c-${color})" title="${unknown ? 'Not in the knowledge base, kept exactly as typed' : 'Recognised as ' + label}"><b>${tag}</b>${esc(text)}</span>`);
      }
    });
    el.innerHTML = out.join('');
  }

  function row(k, v, slot, locked) {
    const val = v ? esc(v) : '<span class="none">—</span>';
    const btn = !slot ? '<span></span>' : locked ? '<span class="lock" title="Set by your keywords">🔒</span>' : `<button class="b" data-slot="${slot}" title="Reroll this choice">↻</button>`;
    return `<div class="srow"><span class="k">${k}</span><span class="v${v ? '' : ' none'}">${val}</span>${btn}</div>`;
  }

  function renderSpec(r) {
    const s = r.spec;
    const L = s.locked || {};
    const sub = s.subject;
    const rows = [];
    rows.push(row('Subject', sub ? sub.np + (sub.companions.length ? ' + ' + sub.companions.join(', ') : '') : 'landscape / environment', null));
    if (sub && sub.cast) sub.cast.forEach((ch) => rows.push(row(U.cap(ch.ref.replace(/^the /, '')), ch.mode === 'none' ? 'no clothing described' : [ch.core, ch.foot].filter(Boolean).join(', '), null)));
    else if (sub && sub.wearNone) rows.push(row('Wardrobe', 'no clothing described', null));
    else if (sub && sub.outfits) rows.push(row('Wardrobe', sub.outfits.map((o) => o.ref.replace(/^the /, '') + ': ' + o.outfit).join(' · '), null));
    else if (sub && sub.outfit) rows.push(row('Wardrobe', sub.outfit, 'outfit', L.outfit));
    if (s.negWords && s.negWords.length) rows.push(row('Excluded', s.negWords.join(', '), null));
    if (sub && sub.expr) rows.push(row('Expression', sub.expr, 'expr', L.expr));
    rows.push(row('Action', s.action ? s.action.ing + (s.action2 ? ' while ' + s.action2.ing : '') : '', null));
    rows.push(row('Setting', s.place ? (s.place.isObj ? s.place.np : s.place.prep + ' ' + s.place.np) : '', 'place', L.place));
    rows.push(row('Time', s.time ? s.time.at.replace(/^(at|during|in) /, '') : '', 'time', L.time));
    rows.push(row('Weather', s.weathers.map((w) => w.id).concat(s.seasons.map((x) => x.id), s.events.map((x) => x.id)).join(', '), null));
    rows.push(row('Lighting', U.fill(s.key || '', s.P), 'key', L.key));
    rows.push(row('Shot', s.shot.ph.replace(/^(a|an) /, ''), 'shot', L.shot));
    rows.push(row('Angle', s.angle.ph.replace(/^(a|an) /, ''), 'angle', L.angle));
    if (['photo', 'film', '3d'].includes(s.medium)) rows.push(row('Lens', [s.lens, s.ap].filter(Boolean).join(' · '), 'lens', L.lens));
    rows.push(row('Composition', s.comp.ph, 'comp', L.comp));
    rows.push(row('Palette', s.palette ? s.palette.ph : '', 'palette', L.palette));
    rows.push(row('Mood', s.moodAdj.join('; '), null));
    rows.push(row('Style', s.style.id + ' · ' + (s.mode === 'video' ? s.vleadPick : s.leadPick), 'style', false));
    if (s.mode === 'video') {
      rows.push(row('Camera move', s.move.ph, 'move', L.move));
      rows.push(row('Pace', s.pace ? s.pace.ph : '', 'pace', L.pace));
    }
    rows.push(row('Details', s.env.slice(0, 3).join('; '), 'env', false));
    $('specRows').innerHTML = rows.join('');
  }

  function renderOut(r) {
    const t = TARGETS[state.mode].find((x) => x.v === state.target[state.mode]);
    $('outTitle').textContent = (state.mode === 'video' ? 'Video prompt' : 'Image prompt') + ' · ' + t.label;
    $('outTitle').title = t.hint;
    if (!r) {
      $('prompt').innerHTML = '<span class="ph">Type a few keywords on the left. Try one of the examples.</span>';
      $('negative').textContent = '';
      $('meta').textContent = '';
      $('json').textContent = '';
      $('specRows').innerHTML = '';
      $('notes').hidden = true;
      $('audioWrap').hidden = true;
      return;
    }
    $('prompt').textContent = r.prompt;
    const notes = r.spec.notes || [];
    $('notes').hidden = !notes.length;
    $('notes').textContent = notes.join(' ');
    $('negative').textContent = r.negative;
    $('audioWrap').hidden = !r.audio;
    $('audioText').textContent = r.audio || '';
    $('meta').textContent = `${r.words} words · ${r.spec.aspect}` + (state.mode === 'video' ? ` · ${r.spec.duration}s` : '') + ` · seed ${state.seed}`;
    const s = r.spec;
    $('json').textContent = JSON.stringify({
      input: state.input, mode: s.mode, target: state.target[state.mode], seed: s.seed, style: s.style.id, medium: s.medium,
      subject: s.subject && { text: s.subject.np, kind: s.subject.kind, outfit: s.subject.outfit, expression: s.subject.expr },
      action: s.action && s.action.ing, setting: s.place && s.place.np, time: s.time && s.time.id, weather: s.weathers.map((w) => w.id),
      lighting: { key: U.fill(s.key || '', s.P), accents: s.lightAcc }, camera: { shot: s.shot.id, angle: s.angle.id, lens: s.lens, aperture: s.ap, dof: s.dof, move: s.mode === 'video' ? s.move.id : undefined, pace: s.mode === 'video' && s.pace ? s.pace.id : undefined },
      composition: s.comp.id, palette: s.palette && s.palette.id, mood: s.moodAdj, environment: s.env, details: s.detail, aspect: s.aspect,
      duration: s.mode === 'video' ? s.duration : undefined, prompt: r.prompt, negative: r.negative,
    }, null, 2);
  }

  function compile() {
    const text = state.input.trim();
    if (!text && !hasBuild()) { last = null; renderChips(null); renderOut(null); return; }
    try {
      last = SC.compile(text, opts());
    } catch (e) {
      console.error(e);
      $('prompt').textContent = 'Something went wrong compiling this input: ' + e.message;
      return;
    }
    renderChips(last);
    renderSpec(last);
    renderOut(last);
    pushHints(last);
  }

  function syncControls() {
    document.body.className = state.mode;
    $('targetSeg').innerHTML = TARGETS[state.mode].map((t) => `<button data-v="${t.v}" title="${t.hint}">${t.label}</button>`).join('');
    setSeg('modeSeg', state.mode);
    setSeg('targetSeg', state.target[state.mode]);
    setSeg('detailSeg', String(state.detail));
    $('aspect').value = state.aspect;
    $('duration').value = String(state.duration);
    $('audio').checked = !!state.audio;
    $('i2v').checked = !!state.i2v;
    $('seed').value = state.seed;
  }
  function setSeg(id, v) { $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); }

  function save() { store.set('state', { input: state.input, mode: state.mode, target: state.target, detail: state.detail, aspect: state.aspect, duration: state.duration, audio: state.audio, i2v: state.i2v, seed: state.seed, literal: state.literal, build: Object.assign({}, state.build, { inherited: undefined, sceneHints: undefined, extraPeople: undefined, _hintKey: undefined }) }); }
  function update() { save(); compile(); }

  function toast(msg, action, ms) {
    const t = $('toast');
    t.innerHTML = esc(msg) + (action ? ` <button class="toast-a">${esc(action.label)}</button>` : '');
    t.classList.toggle('act', !!action);
    if (action) t.querySelector('.toast-a').onclick = () => { t.classList.remove('show'); action.run(); };
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), ms || 1400);
  }

  // complete reset: keywords, characters, scene, settings, seed, rerolls (history and theme are kept)
  function applyState(snap) {
    const b = state.build;
    Object.keys(b).forEach((k) => delete b[k]);
    Object.assign(b, JSON.parse(JSON.stringify(snap.build)));
    Object.keys(snap).forEach((k) => { if (k !== 'build') state[k] = JSON.parse(JSON.stringify(snap[k])); });
    $('kw').value = state.input;
    $('vars').innerHTML = '<p class="empty">Same keywords, different seeds: alternate lighting, framing, and details.</p>';
    syncControls();
    builder.render();
    update();
  }
  function resetAll() {
    const before = JSON.parse(JSON.stringify(Object.assign({}, state, { build: Object.assign({}, state.build, { inherited: undefined, sceneHints: undefined, extraPeople: undefined, _hintKey: undefined }) })));
    applyState(DEFAULT);
    $('kw').focus();
    toast('Everything reset', { label: 'Undo', run: () => { applyState(before); toast('Restored'); } }, 6000);
  }
  async function copy(text, what) {
    try { await navigator.clipboard.writeText(text); toast(what + ' copied'); } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(what + ' copied'); } catch (e2) { toast('Copy failed, select the text manually'); }
      ta.remove();
    }
  }

  function pushHistory() {
    const text = state.input.trim();
    if (!text) return;
    const h = store.get('history', []).filter((x) => x !== text);
    h.unshift(text);
    store.set('history', h.slice(0, 15));
    renderHistory();
  }
  function renderHistory() {
    const h = store.get('history', []);
    $('hist').innerHTML = h.length ? h.map((x) => `<button data-q="${esc(x)}">${esc(x)}</button>`).join('') : '<p class="empty">Prompts you copy show up here.</p>';
  }

  // ---------- events ----------
  let deb;
  $('kw').addEventListener('input', (e) => {
    state.input = e.target.value;
    state.bumps = {};
    clearTimeout(deb);
    deb = setTimeout(update, 110);
  });
  $('modeSeg').addEventListener('click', (e) => { const v = e.target.dataset.v; if (!v) return; state.mode = v; syncControls(); builder.render(); update(); });
  $('targetSeg').addEventListener('click', (e) => { const v = e.target.dataset.v; if (!v) return; state.target[state.mode] = v; setSeg('targetSeg', v); update(); });
  $('detailSeg').addEventListener('click', (e) => { const v = e.target.dataset.v; if (!v) return; state.detail = +v; setSeg('detailSeg', v); update(); });
  $('aspect').addEventListener('change', (e) => { state.aspect = e.target.value; update(); });
  $('duration').addEventListener('change', (e) => { state.duration = +e.target.value; update(); });
  $('audio').addEventListener('change', (e) => { state.audio = e.target.checked; update(); });
  $('i2v').addEventListener('change', (e) => { state.i2v = e.target.checked; update(); });
  $('seed').addEventListener('change', (e) => { state.seed = Math.max(1, Math.min(99999, +e.target.value || 1)); state.bumps = {}; update(); });
  $('dice').addEventListener('click', () => { state.seed = 1 + Math.floor(Math.random() * 99999); state.bumps = {}; $('seed').value = state.seed; update(); });
  $('rephrase').addEventListener('click', () => { state.bumps.phrasing = (state.bumps.phrasing || 0) + 1; state.bumps.style = (state.bumps.style || 0) + 1; compile(); });
  $('specRows').addEventListener('click', (e) => {
    const slot = e.target.dataset && e.target.dataset.slot;
    if (!slot) return;
    state.bumps[slot] = (state.bumps[slot] || 0) + 1;
    compile();
  });
  $('chips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip.fix');
    if (!c) return;
    state.literal = U.uniq(state.literal.concat([c.dataset.lit]));
    update();
    toast(`Keeping “${c.dataset.lit}” as typed`);
  });
  $('examples').innerHTML = EXAMPLES.map((x) => `<button data-q="${esc(x)}">${esc(x)}</button>`).join('');
  const loadQ = (e) => {
    const q = e.target.closest('button') && e.target.closest('button').dataset.q;
    if (!q) return;
    state.input = q; state.bumps = {}; $('kw').value = q; update();
  };
  $('examples').addEventListener('click', loadQ);
  $('hist').addEventListener('click', loadQ);
  $('copyBtn').addEventListener('click', () => { if (last) { copy(last.prompt, 'Prompt'); pushHistory(); } });
  $('copyNeg').addEventListener('click', () => last && copy(last.negative, 'Negative prompt'));
  $('copyAudio').addEventListener('click', () => last && last.audio && copy(last.audio, 'Audio prompt'));
  $('varBtn').addEventListener('click', () => {
    if (!state.input.trim() && !hasBuild()) return;
    const seeds = [0, 1, 2].map((i) => ((state.seed * 7 + 1013 * (i + 1)) % 99999) + 1);
    $('vars').innerHTML = seeds.map((sd) => {
      const r = SC.compile(state.input, opts(sd));
      return `<div class="var"><div class="vh"><span>seed ${sd} · ${r.words} words</span><span><button class="ghost sm" data-use="${sd}">Use</button> <button class="ghost sm" data-copy="${sd}">Copy</button></span></div><div class="vt">${esc(r.prompt)}</div></div>`;
    }).join('');
  });
  $('vars').addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset.copy) copy(SC.compile(state.input, opts(+t.dataset.copy)).prompt, 'Variation');
    else if (t.dataset.use) { state.seed = +t.dataset.use; state.bumps = {}; $('seed').value = state.seed; update(); toast('Seed ' + state.seed + ' applied'); }
    else { const v = t.closest('.var'); if (v) v.classList.toggle('open'); }
  });
  $('resetBtn').addEventListener('click', resetAll);
  $('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && last) { copy(last.prompt, 'Prompt'); pushHistory(); }
  });

  // ---------- boot ----------
  const theme = store.get('theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  if (!state.input && !state.build.cast.length) state.input = EXAMPLES[0];
  $('kw').value = state.input;
  syncControls();
  let bdeb;
  builder = SC.Builder({ state: state.build, castEl: $('castBox'), sceneEl: $('sceneBox'), onChange: () => { state.bumps = {}; clearTimeout(bdeb); bdeb = setTimeout(update, 60); } });
  renderHistory();
  compile();
})();
