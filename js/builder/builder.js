/* Scene Compiler — character & scene builder UI.
 * Searchable pickers (first choice is always "Type your own"), face-shape sketches, skin-tone swatches,
 * an age slider + bracket dropdown + range buttons, and per-character sections for women and men.
 */
(function () {
  const SC = globalThis.SC;
  const U = SC.u;
  const O = SC.OPT;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const titleCase = (s) => String(s).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // ------------------------------------------------------------------ field catalogue
  // src: key in SC.OPT (gendered lists resolve per character), or a function returning options
  const ADULT = 'adult';
  const SECTIONS = [
    { id: 'identity', title: 'Identity', fields: [
      { k: 'age', label: 'Age', special: 'age' },
      { k: 'ethnicity', label: 'Ethnicity / origin', src: 'ethnicity' },
      { k: 'profession', label: 'Profession / role', src: 'profession' },
      { k: 'race', label: 'Fantasy race / species', src: 'race' },
    ] },
    { id: 'face', title: 'Face', fields: [
      { k: 'faceShape', label: 'Face shape', special: 'face' },
      { k: 'skin', label: 'Skin tone', special: 'skin' },
      { k: 'eyeShape', label: 'Eye shape', src: 'eyeShape' },
      { k: 'eyeColor', label: 'Eye colour', src: 'eyeColor' },
      { k: 'brows', label: 'Eyebrows', src: 'brows' },
      { k: 'nose', label: 'Nose', src: 'nose' },
      { k: 'lips', label: 'Lips', src: 'lips' },
      { k: 'makeup', label: 'Makeup / face paint', src: 'makeup', multi: 1 },
      { k: 'facialHair', label: 'Facial hair', src: 'facialHair', only: 'm' },
      { k: 'skinDetails', label: 'Skin details & marks', src: 'skinDetails', multi: 1 },
    ] },
    { id: 'hair', title: 'Hair', fields: [
      { k: 'hairStyle', label: 'Hairstyle', src: 'hairStyle' },
      { k: 'hairColor', label: 'Hair colour', src: 'hairColor' },
    ] },
    { id: 'body', title: 'Body & physique', fields: [
      { k: 'bodyType', label: 'Body type', src: 'bodyType' },
      { k: 'height', label: 'Height', src: 'height' },
      { k: 'shoulders', label: 'Shoulders', src: () => O.parts.shoulders },
      { k: 'chest', label: 'Chest', src: () => O.parts.chest_m, only: 'm' },
      { k: 'bust', label: 'Bust', src: () => O.parts.bust_f, only: 'f', gate: ADULT },
      { k: 'waist', label: 'Waist', src: () => O.parts.waist, gate: ADULT },
      { k: 'hips', label: 'Hips', src: () => O.parts.hips, gate: ADULT },
      { k: 'arms', label: 'Arms', src: () => O.parts.arms },
      { k: 'legs', label: 'Legs', src: () => O.parts.legs },
      { k: 'muscle', label: 'Muscle definition', src: () => O.parts.muscle },
      { k: 'hands', label: 'Hands', src: () => O.parts.hands },
    ] },
    { id: 'wardrobe', title: 'Wardrobe', fields: [
      { k: 'wardrobeStyle', label: 'Style', src: 'wardrobeStyle' },
      { k: 'outfit', label: 'Full outfit / costume', src: 'outfit' },
      { k: 'top', label: 'Top', src: 'top' },
      { k: 'bottom', label: 'Bottom', src: 'bottom' },
      { k: 'outerwear', label: 'Outerwear / layer', src: 'outerwear' },
      { k: 'innerwear', label: 'Innerwear (visible layer)', src: 'innerwear', gate: ADULT },
      { k: 'footwear', label: 'Footwear', src: 'footwear' },
      { k: 'headwear', label: 'Headwear', src: 'headwear' },
      { k: 'accessories', label: 'Accessories', src: 'accessories', multi: 1 },
      { k: 'jewelry', label: 'Jewellery', src: 'jewelry', multi: 1 },
      { k: 'outfitColor', label: 'Colour scheme', src: 'outfitColor' },
    ] },
    { id: 'pose', title: 'Expression & pose', fields: [
      { k: 'expression', label: 'Expression', src: 'expression' },
      { k: 'pose', label: 'Pose', src: 'pose' },
      { k: 'gaze', label: 'Gaze', src: 'gaze' },
      { k: 'prop', label: 'Holding', src: 'prop' },
      { k: 'position', label: 'Position (vs. lead)', src: () => ['on the left', 'on the right', 'behind the lead', 'in front of the lead', 'beside the lead', 'around the lead', 'in the background', 'in the foreground', 'at the center'].map((x) => ({ v: ({ 'on the left': 'left', 'on the right': 'right', 'behind the lead': 'behind', 'in front of the lead': 'front', 'beside the lead': 'beside', 'around the lead': 'around', 'in the background': 'background', 'in the foreground': 'foreground', 'at the center': 'center' })[x], label: x })) },
    ] },
    { id: 'fantasy', title: 'Fantasy extras', fields: [
      { k: 'fantasy', label: 'Features', src: 'fantasy', multi: 1 },
      { k: 'aura', label: 'Aura / effects', src: 'aura', multi: 1 },
    ] },
  ];

  const kbList = (cat, filter) => Object.keys(SC.kb[cat] || {}).filter((id) => !/_$/.test(id) && (!filter || filter(SC.kb[cat][id]))).map((id) => ({ v: id, label: titleCase(SC.kb[cat][id].n || id) }));
  const SCENE_FIELDS = [
    { k: 'background', label: 'Background / setting', src: () => Object.assign({}, O.scene.background, { 'Everything else': kbList('place') }) },
    { k: 'time', label: 'Time of day', src: () => kbList('time') },
    { k: 'weather', label: 'Weather', src: () => kbList('weather') },
    { k: 'event', label: 'Season / festival', src: () => ({ Seasons: kbList('season'), 'Festivals & events': kbList('event') }) },
    { k: 'light', label: 'Lighting', src: () => kbList('light') },
    { k: 'mood', label: 'Mood', src: () => kbList('mood') },
    { k: 'style', label: 'Art style', src: () => {
      const g = {};
      const names = { photo: 'Photography', film: 'Cinematic', illus: 'Illustration', paint: 'Painting', '3d': '3D & CGI', pixel: 'Pixel', craft: 'Handmade' };
      Object.values(SC.kb.style).forEach((e) => ((g[names[e.medium] || 'Other'] = g[names[e.medium] || 'Other'] || []).push({ v: e.id, label: titleCase(e.id) })));
      return g;
    } },
    { k: 'genre', label: 'Genre / era', src: () => kbList('genre') },
    { k: 'shot', label: 'Shot size', src: () => kbList('shot') },
    { k: 'angle', label: 'Camera angle', src: () => kbList('angle') },
    { k: 'lens', label: 'Lens', src: () => ['14mm', '24mm', '35mm', '50mm', '85mm', '135mm', '200mm'].map((x) => ({ v: x, label: x })).concat(kbList('lens')) },
    { k: 'comp', label: 'Composition', src: () => kbList('comp') },
    { k: 'palette', label: 'Colour palette', src: () => kbList('palette') },
    { k: 'move', label: 'Camera move (video)', src: () => kbList('move'), video: 1 },
    { k: 'pace', label: 'Pace (video)', src: () => kbList('pace'), video: 1 },
  ];

  // normalise to [{ g: group|null, items: [{v, label, c?}] }]
  function normalize(src, g) {
    let v = typeof src === 'function' ? src() : O[src];
    if (v && !Array.isArray(v) && (v.f || v.m)) v = v[g] || v.f;
    const toItem = (x) => (typeof x === 'string' ? { v: x, label: x } : x.n ? { v: x.n, label: x.n, c: x.c } : x);
    if (Array.isArray(v)) return [{ g: null, items: v.map(toItem) }];
    return Object.keys(v || {}).map((k) => ({ g: k, items: v[k].map(toItem) }));
  }

  // ------------------------------------------------------------------ popover picker
  const pop = document.createElement('div');
  pop.className = 'pop';
  pop.hidden = true;
  pop.innerHTML = '<div class="pop-h"><input class="pop-q" type="search" placeholder="Search…" /><button type="button" class="pop-x" aria-label="Close" title="Close">✕</button></div><div class="pop-l"></div>';
  document.body.appendChild(pop);
  const popQ = pop.querySelector('.pop-q');
  const popL = pop.querySelector('.pop-l');
  let popCtx = null;

  const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  function openPicker(anchor, groups, current, onPick, label, multi) {
    const id = (anchor.closest('[id]') || {}).id + ':' + (anchor.dataset.k || anchor.dataset.face || anchor.dataset.skin || label);
    // tapping the same field again closes its list
    if (!pop.hidden && popCtx && popCtx.id === id) { closePicker(); return; }
    popCtx = { id, groups, onPick, custom: false, label, multi: !!multi, sel: multi ? [].concat(current || []) : null };
    document.querySelectorAll('.pk-b.open').forEach((b) => b.classList.remove('open'));
    anchor.classList.add('open');
    popQ.value = '';
    popQ.placeholder = `Search ${label.toLowerCase()}…`;
    renderPop();
    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const mobile = innerWidth < 640;
    const w = mobile ? innerWidth - 16 : Math.max(r.width, 300);
    pop.style.width = w + 'px';
    pop.style.left = (mobile ? 8 : Math.min(r.left, innerWidth - w - 10)) + scrollX + 'px';
    const h = Math.min(420, innerHeight * 0.7);
    const below = innerHeight - r.bottom;
    pop.style.top = (below > h + 8 || below > r.top ? r.bottom + 4 : Math.max(8, r.top - h - 4)) + scrollY + 'px';
    popL.scrollTop = 0;
    // on phones, don't pop the keyboard open; the search box is one tap away
    if (finePointer()) popQ.focus();
  }
  function closePicker() {
    pop.hidden = true;
    popCtx = null;
    document.querySelectorAll('.pk-b.open').forEach((b) => b.classList.remove('open'));
    if (document.activeElement && pop.contains(document.activeElement)) document.activeElement.blur();
  }
  addEventListener('orientationchange', closePicker);

  function renderPop() {
    if (!popCtx) return;
    const q = popQ.value.trim().toLowerCase();
    let html = '';
    if (popCtx.custom) {
      html = `<div class="pop-custom"><textarea class="pop-t" rows="2" placeholder="Describe it in your own words…">${esc(popQ.value)}</textarea><button class="primary pop-use">Use this</button></div>`;
    } else {
      html += `<button class="pop-i own" data-own="1">✎ Type your own${q ? `: “${esc(popQ.value.trim())}”` : '…'}</button>`;
      if (popCtx.multi) html += `<div class="pop-multi">${popCtx.sel.length ? `${popCtx.sel.length} selected · click one to add or remove it` : 'Multi-select: reopen to add more'}</div>`;
      html += '<button class="pop-i none" data-clear="1">Clear (let the engine decide)</button>';
      if (popCtx.multi) popCtx.sel.filter((x) => !popCtx.groups.some((g) => g.items.some((it) => it.v === x))).forEach((x) => { html += `<button class="pop-i on" data-v="${esc(x)}">✓ ${esc(x)}</button>`; });
      let n = 0;
      popCtx.groups.forEach((grp) => {
        const items = grp.items.filter((it) => !q || it.label.toLowerCase().includes(q) || String(it.v).toLowerCase().includes(q));
        if (!items.length) return;
        if (grp.g) html += `<div class="pop-g">${esc(grp.g)}</div>`;
        items.forEach((it) => { n++; const on = popCtx.multi && popCtx.sel.includes(it.v); html += `<button class="pop-i${on ? ' on' : ''}" data-v="${esc(it.v)}">${popCtx.multi ? `<span class="ck">${on ? '✓' : ''}</span>` : ''}${it.c ? `<i class="sw" style="background:${it.c}"></i>` : ''}${esc(it.label)}</button>`; });
      });
      if (!n) html += '<div class="pop-empty">No match. Use “Type your own” above.</div>';
    }
    popL.innerHTML = html;
    if (popCtx.custom) setTimeout(() => { const t = popL.querySelector('.pop-t'); t.focus(); t.selectionStart = t.value.length; }, 0);
  }
  popQ.addEventListener('input', () => { if (popCtx && !popCtx.custom) renderPop(); });
  function choose(v) {
    if (!popCtx) return;
    if (popCtx.multi) {
      const i = popCtx.sel.indexOf(v);
      if (i >= 0) popCtx.sel.splice(i, 1); else if (v) popCtx.sel.push(v);
      const cb = popCtx.onPick;
      const sel = popCtx.sel.slice();
      closePicker();
      cb(sel);
    } else { const cb = popCtx.onPick; closePicker(); cb(v); }
  }
  popQ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && popCtx) {
      e.preventDefault();
      const first = popL.querySelector('.pop-i[data-v]:not(.on)') || popL.querySelector('.pop-i[data-v]');
      if (popQ.value.trim() && (!first || !first.textContent.toLowerCase().includes(popQ.value.trim().toLowerCase()))) choose(popQ.value.trim());
      else if (first) choose(first.dataset.v);
    }
    if (e.key === 'Escape') closePicker();
  });
  popL.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !popCtx) return;
    if (b.dataset.own) {
      if (popQ.value.trim()) { choose(popQ.value.trim()); return; }
      popCtx.custom = true; renderPop(); return;
    }
    if (b.dataset.done) { closePicker(); return; }
    if (b.classList.contains('pop-use')) { choose(popL.querySelector('.pop-t').value.trim()); return; }
    if (b.dataset.clear) { const cb = popCtx.onPick; closePicker(); cb(popCtx && popCtx.multi ? [] : ''); return; }
    if (b.dataset.v != null) choose(b.dataset.v);
  });
  popL.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('pop-t') && !e.shiftKey) { e.preventDefault(); choose(e.target.value.trim()); }
    if (e.key === 'Escape') closePicker();
  });
  pop.querySelector('.pop-x').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); closePicker(); });
  pop.querySelector('.pop-x').addEventListener('click', closePicker);
  document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.pk-b, .tile.own, .swb.own')) closePicker(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) closePicker(); });

  // ------------------------------------------------------------------ face sketches
  const FACE_PATHS = {
    oval: '<ellipse cx="20" cy="24" rx="12.5" ry="18"/>',
    round: '<ellipse cx="20" cy="25" rx="15" ry="16"/>',
    square: '<path d="M7 11Q7 5 13 5H27Q33 5 33 11V33Q33 42 26 43H14Q7 42 7 33Z"/>',
    'heart-shaped': '<path d="M5.5 15Q5.5 5 20 5Q34.5 5 34.5 15Q34.5 27 26 36Q22 43 20 43Q18 43 14 36Q5.5 27 5.5 15Z"/>',
    'diamond-shaped': '<path d="M20 4Q28 9 33.5 21Q30 34 20 44Q10 34 6.5 21Q12 9 20 4Z"/>',
    oblong: '<path d="M10 10Q10 3 20 3Q30 3 30 10V36Q30 45 20 45Q10 45 10 36Z"/>',
    triangular: '<path d="M13 6Q20 3 27 6Q33 20 34.5 32Q33 43 20 44Q7 43 5.5 32Q7 20 13 6Z"/>',
    rectangular: '<path d="M8 9Q8 4 13 4H27Q32 4 32 9V38Q32 44 26 44H14Q8 44 8 38Z"/>',
    long: '<ellipse cx="20" cy="24" rx="10" ry="21"/>',
    'soft, rounded': '<ellipse cx="20" cy="25" rx="14" ry="17"/>',
    'sharply angular': '<path d="M12 5H28L34 18L29 36L20 44L11 36L6 18Z"/>',
    'high-cheekboned': '<path d="M11 6Q20 2 29 6Q35.5 16 33.5 24Q30 34 20 44Q10 34 6.5 24Q4.5 16 11 6Z"/>',
  };
  const FEATURES = '<g class="ft"><path d="M13.5 21h4M22.5 21h4"/><path d="M20 23v6l-1.5 1"/><path d="M16.5 34q3.5 2 7 0"/></g>';
  const faceSvg = (k) => `<svg viewBox="0 0 40 48" aria-hidden="true"><g class="fo">${FACE_PATHS[k] || FACE_PATHS.oval}</g>${FEATURES}</svg>`;

  // ------------------------------------------------------------------ builder
  const FIELD_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.k)).concat(['ageText']);
  const newChar = (gender) => ({ id: Math.random().toString(36).slice(2, 8), gender, age: '' });

  SC.Builder = function (opts) {
    const state = opts.state; // { cast: [], scene: {}, active: 0, open: {} }
    const onChange = opts.onChange;
    const castEl = opts.castEl;
    const sceneEl = opts.sceneEl;
    state.cast = state.cast || [];
    state.scene = state.scene || {};
    state.open = state.open || { identity: true };

    function changed() { onChange(); render(); }
    let rs;
    // re-render the builder without closing an open multi-select popover
    function renderSoon() { clearTimeout(rs); rs = setTimeout(() => { const open = !pop.hidden; render(); if (open) pop.hidden = false; }, 30); }

    function counts() {
      return { f: state.cast.filter((c) => c.gender === 'f').length, m: state.cast.filter((c) => c.gender === 'm').length };
    }
    function charLabel(c) {
      const same = state.cast.filter((x) => x.gender === c.gender);
      const n = same.indexOf(c) + 1;
      const base = c.gender === 'f' ? 'Woman' : 'Man';
      return c.profession ? `${U.cap(c.profession)} (${base.charAt(0)}${n})` : `${base} ${n}`;
    }
    const isMinor = (c) => SC.cast.isMinor(c);

    function pickerHTML(f, raw, disabled, note, hint) {
      const val = Array.isArray(raw) ? raw.join(', ') : raw ? (f.src && typeof f.src === 'function' && f.k === 'position' ? (f.src().find((x) => x.v === raw) || { label: raw }).label : raw) : '';
      const shown = val ? esc(val) : hint ? `<span class="ph inh">↳ ${esc(hint)} <em>from keywords</em></span>` : '<span class="ph">Any</span>';
      return `<div class="pk${val ? ' set' : ''}${!val && hint ? ' inh' : ''}${disabled ? ' off' : ''}" data-k="${f.k}">
        <span class="pk-l">${esc(f.label)}${f.multi ? ' <em>· multi</em>' : ''}</span>
        <div class="pk-row"><button class="pk-b" data-k="${f.k}" ${disabled ? 'disabled' : ''} title="${esc(note || val || (hint ? hint + ' (from your keywords). Pick something here to override it.' : 'Choose…'))}">${shown}</button>${val && !disabled ? `<button class="pk-c" data-clear="${f.k}" aria-label="Clear ${esc(f.label)}">✕</button>` : ''}</div>
        ${note ? `<span class="pk-n">${esc(note)}</span>` : ''}
      </div>`;
    }

    function ageHTML(c) {
      const age = c.age === '' || c.age == null ? '' : +c.age;
      const inh = (state.inherited || [])[state.active] || {};
      const shown = c.ageText ? c.ageText : age === '' ? (inh.age != null ? `${inh.age} (from keywords)` : 'Any age') : `${age} years`;
      return `<div class="age">
        <div class="age-top"><span class="pk-l">Age</span><span class="age-v">${esc(shown)}</span></div>
        <input type="range" min="0" max="100" value="${age === '' ? 30 : age}" class="age-r${age === '' ? ' unset' : ''}" aria-label="Age" />
        <div class="age-row">
          <button class="pk-b age-dd" data-k="ageBracket">${c.ageText ? esc(c.ageText) : '<span class="ph">Age bracket…</span>'}</button>
          <div class="age-chips">${O.age.ranges.map(([l, v]) => `<button class="chipbtn${!c.ageText && age !== '' && Math.abs(age - v) <= 2 ? ' on' : ''}" data-age="${v}">${l}</button>`).join('')}<button class="chipbtn" data-age="">Any</button></div>
        </div>
      </div>`;
    }

    function faceHTML(c) {
      const v = c.faceShape || '';
      const custom = v && !O.faceShape.includes(v);
      return `<div class="tiles-f"><span class="pk-l">Face shape</span><div class="tiles">
        <button class="tile own${custom ? ' on' : ''}" data-face="__own" title="Type your own">✎<span>${custom ? esc(v) : 'Type your own'}</span></button>
        ${O.faceShape.map((k) => `<button class="tile${v === k ? ' on' : ''}" data-face="${esc(k)}" title="${esc(k)}">${faceSvg(k)}<span>${esc(k)}</span></button>`).join('')}
      </div></div>`;
    }

    function skinHTML(c) {
      const v = c.skin || '';
      const custom = v && !O.skin.some((s) => s.n === v);
      const sw = (s) => `<button class="swb${v === s.n ? ' on' : ''}" data-skin="${esc(s.n)}" title="${esc(s.n)}" style="--sw:${s.c}"><span>${esc(s.n)}</span></button>`;
      return `<div class="tiles-f"><span class="pk-l">Skin tone ${v ? `<em>· ${esc(v)}</em>` : ''}</span>
        <div class="swatches">
          <button class="swb own${custom ? ' on' : ''}" data-skin="__own" title="Type your own">✎</button>
          ${O.skin.filter((s) => !s.f).map(sw).join('')}
        </div>
        <div class="swatches fant"><span class="mini">Fantasy</span>${O.skin.filter((s) => s.f).map(sw).join('')}</div>
      </div>`;
    }

    function sectionHTML(c, sec) {
      const minor = isMinor(c);
      const fields = sec.fields.filter((f) => !f.only || f.only === c.gender);
      const setCount = fields.filter((f) => (f.k === 'age' ? c.age !== '' && c.age != null || c.ageText : c[f.k])).length;
      const open = !!state.open[sec.id];
      const body = fields.map((f) => {
        if (f.special === 'age') return ageHTML(c);
        if (f.special === 'face') return faceHTML(c);
        if (f.special === 'skin') return skinHTML(c);
        const off = f.gate === ADULT && minor;
        const inh = ((state.inherited || [])[state.active] || {})[f.k];
        return pickerHTML(f, c[f.k], off, off ? 'Not available for characters under 18' : '', inh);
      }).join('');
      return `<details class="sec" data-sec="${sec.id}" ${open ? 'open' : ''}><summary><span>${sec.title}</span>${setCount ? `<b class="cnt">${setCount}</b><button class="linkbtn" data-clearsec="${sec.id}">Clear section</button>` : ''}</summary><div class="grid2">${body}</div></details>`;
    }

    // listed options show their friendly label; anything typed by hand shows exactly as typed
    function sceneLabel(f, v) {
      const hit = normalize(f.src).flatMap((g) => g.items).find((it) => String(it.v) === String(v));
      return hit ? hit.label : v;
    }

    function render() {
      const keepY = scrollY;
      renderInner();
      if (Math.abs(scrollY - keepY) > 1) scrollTo(scrollX, keepY);
    }
    function renderInner() {
      const n = counts();
      const active = state.cast[state.active] || state.cast[0];
      if (active) state.active = state.cast.indexOf(active);
      castEl.innerHTML = `
        <div class="cast-h">
          <div class="ctr"><span>♀ Women</span><button class="ghost sm" data-add="f" data-d="-1" aria-label="Remove a woman">−</button><b>${n.f}</b><button class="ghost sm" data-add="f" data-d="1" aria-label="Add a woman">+</button></div>
          <div class="ctr"><span>♂ Men</span><button class="ghost sm" data-add="m" data-d="-1" aria-label="Remove a man">−</button><b>${n.m}</b><button class="ghost sm" data-add="m" data-d="1" aria-label="Add a man">+</button></div>
          ${state.cast.length ? '<button class="linkbtn" data-act="clearAll">Clear all characters</button>' : ''}
        </div>
        ${(state.extraPeople || []).length ? `<p class="kwpeople">From your keywords, also in the scene: ${state.extraPeople.map((x) => `<b>${esc(x)}</b>`).join(', ')}. Add a character here to customise them.</p>` : ''}
        ${state.cast.length ? `<div class="ctabs">${state.cast.map((c, i) => `<button class="ctab ${c.gender}${i === state.active ? ' on' : ''}" data-tab="${i}">${esc(charLabel(c))}${isMinor(c) ? ' <em>u18</em>' : ''}</button>`).join('')}</div>
        <div class="cedit">
          <div class="cedit-acts"><button class="ghost sm" data-act="dup">Duplicate</button><button class="ghost sm" data-act="reset">Reset</button><button class="ghost sm" data-act="swap">Switch to ${active.gender === 'f' ? 'man' : 'woman'}</button><button class="ghost sm danger" data-act="del">Remove</button></div>
          ${SECTIONS.map((s) => sectionHTML(active, s)).join('')}
        </div>` : '<p class="empty">No characters yet. Add women or men above, or just describe people in your keywords.</p>'}`;
      const video = document.body.classList.contains('video');
      const setN = SCENE_FIELDS.filter((f) => state.scene[f.k]).length;
      sceneEl.innerHTML = `<div class="grid2">${SCENE_FIELDS.filter((f) => !f.video || video).map((f) => pickerHTML(f, state.scene[f.k] ? sceneLabel(f, state.scene[f.k]) : '', false, '', (state.sceneHints || {})[f.k])).join('')}</div>
        ${setN ? '<button class="ghost sm" data-act="clearScene">Clear scene choices</button>' : ''}`;
      sceneEl.closest('details') && (sceneEl.closest('details').querySelector('.cnt-s').textContent = setN ? setN : '');
      castEl.closest('details') && (castEl.closest('details').querySelector('.cnt-s').textContent = state.cast.length ? state.cast.length : '');
    }

    // ---------- events ----------
    castEl.addEventListener('click', (e) => {
      const t = e.target.closest('button, [data-age]');
      if (!t) return;
      const c = state.cast[state.active];
      if (t.dataset.add) {
        const g = t.dataset.add;
        if (+t.dataset.d > 0) { if (state.cast.length >= 8) return; state.cast.push(newChar(g)); state.active = state.cast.length - 1; }
        else { const idx = state.cast.map((x) => x.gender).lastIndexOf(g); if (idx >= 0) state.cast.splice(idx, 1); state.active = Math.max(0, Math.min(state.active, state.cast.length - 1)); }
        return changed();
      }
      if (t.dataset.tab) { state.active = +t.dataset.tab; return render(); }
      if (t.dataset.act === 'clearAll') { state.cast = []; state.active = 0; return changed(); }
      if (t.dataset.clearsec) {
        e.preventDefault();
        const cc = state.cast[state.active];
        const sec = SECTIONS.find((x) => x.id === t.dataset.clearsec);
        sec.fields.forEach((f) => { delete cc[f.k]; if (f.k === 'age') { cc.age = ''; delete cc.ageText; } });
        return changed();
      }
      if (!c) return;
      if (t.dataset.act === 'dup') { if (state.cast.length >= 8) return; const d = JSON.parse(JSON.stringify(c)); d.id = newChar('f').id; state.cast.splice(state.active + 1, 0, d); state.active++; return changed(); }
      if (t.dataset.act === 'reset') { state.cast[state.active] = newChar(c.gender); return changed(); }
      if (t.dataset.act === 'swap') { c.gender = c.gender === 'f' ? 'm' : 'f'; ['facialHair', 'chest', 'bust'].forEach((k) => delete c[k]); return changed(); }
      if (t.dataset.act === 'del') { state.cast.splice(state.active, 1); state.active = Math.max(0, state.active - 1); return changed(); }
      if (t.dataset.clear) { delete c[t.dataset.clear]; return changed(); }
      if (t.dataset.age != null) { c.age = t.dataset.age === '' ? '' : +t.dataset.age; delete c.ageText; return changed(); }
      if (t.dataset.face) {
        if (t.dataset.face === '__own') return openPicker(t, [{ g: null, items: [] }], c.faceShape, (v) => { if (v) c.faceShape = v; else delete c.faceShape; changed(); }, 'Face shape');
        c.faceShape = c.faceShape === t.dataset.face ? '' : t.dataset.face; return changed();
      }
      if (t.dataset.skin) {
        if (t.dataset.skin === '__own') return openPicker(t, normalize('skin'), c.skin, (v) => { if (v) c.skin = v; else delete c.skin; changed(); }, 'Skin tone');
        c.skin = c.skin === t.dataset.skin ? '' : t.dataset.skin; return changed();
      }
      if (t.classList.contains('pk-b')) {
        const k = t.dataset.k;
        if (k === 'ageBracket') {
          const groups = [{ g: null, items: O.age.brackets.map(([l]) => ({ v: l, label: l })) }];
          return openPicker(t, groups, c.ageText, (v) => {
            const br = O.age.brackets.find(([l]) => l === v);
            if (!v) { delete c.ageText; }
            else if (br && !/ageless/i.test(v)) { c.age = br[1]; delete c.ageText; }
            else { c.ageText = br ? 'ageless, immortal-looking' : v; }
            changed();
          }, 'Age');
        }
        const f = SECTIONS.flatMap((s) => s.fields).find((x) => x.k === k);
        return openPicker(t, normalize(f.src, c.gender), c[k], (v, keepOpen) => {
          if (Array.isArray(v) ? v.length : v) c[k] = v; else delete c[k];
          changed();
        }, f.label, f.multi);
      }
    });
    castEl.addEventListener('input', (e) => {
      if (!e.target.classList.contains('age-r')) return;
      const c = state.cast[state.active];
      c.age = +e.target.value;
      delete c.ageText;
      e.target.classList.remove('unset');
      castEl.querySelector('.age-v').textContent = c.age + ' years';
      onChange();
    });
    castEl.addEventListener('change', (e) => { if (e.target.classList.contains('age-r')) render(); });
    castEl.addEventListener('toggle', (e) => { const d = e.target; if (d.dataset && d.dataset.sec) state.open[d.dataset.sec] = d.open; }, true);

    sceneEl.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.act === 'clearScene') { state.scene = {}; return changed(); }
      if (t.dataset.clear) { delete state.scene[t.dataset.clear]; return changed(); }
      if (t.classList.contains('pk-b')) {
        const f = SCENE_FIELDS.find((x) => x.k === t.dataset.k);
        return openPicker(t, normalize(f.src), state.scene[f.k], (v) => { if (v) state.scene[f.k] = v; else delete state.scene[f.k]; changed(); }, f.label);
      }
    });

    render();
    return {
      render,
      setHints(inherited, sceneHints, extraPeople) {
        const key = JSON.stringify([inherited, sceneHints, extraPeople]);
        if (key === state._hintKey) return;
        state._hintKey = key;
        state.inherited = inherited;
        state.sceneHints = sceneHints;
        state.extraPeople = extraPeople;
        if (pop.hidden) render();
      },
      cast: () => state.cast.map((c) => { const o = {}; ['gender'].concat(FIELD_KEYS).forEach((k) => { if (c[k] !== undefined && c[k] !== '') o[k] = c[k]; }); return o; }),
      scene: () => {
        const video = document.body.classList.contains('video');
        const o = {};
        SCENE_FIELDS.forEach((f) => { if (state.scene[f.k] && (!f.video || video)) o[f.k === 'background' ? 'place' : f.k] = state.scene[f.k]; });
        return o;
      },
    };
  };
})();
