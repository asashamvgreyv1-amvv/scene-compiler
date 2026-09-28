/* Scene Compiler — renderers. Scene spec → prompts per target model.
 *
 * Every format follows the same order:
 *   1. quality / medium lead + the lead subject and what they are doing
 *   2. lead subject details (face, hair, body, wardrobe, expression, pose)
 *   3. supporting subjects (who, where they stand relative to the lead, what they wear)
 *   4. scene (setting, sky, atmosphere, who is the visual focus)
 *   5. specifics (props, action realism, fine details)
 *   6. camera, composition, light and colour
 *   7. technical quality
 *
 * Image targets: natural (Flux / GPT-Image / Imagen / DALL·E), sdxl (weighted tags), midjourney
 * Video targets: prose (Veo / Sora / Runway), timeline (Kling / Runway shot list), compact (Wan / LTX / Hunyuan)
 */
(function () {
  const SC = globalThis.SC;
  const U = SC.u;
  const S = U.sentence;
  const PHOTO = new Set(['photo', 'film']);

  const pick = (spec, slot, arr) => U.pick(spec.rng(slot), arr);
  const shotPh = (spec) => (spec.shot.id === 'full shot' && !(spec.subject && /person|animal/.test(spec.subject.kind)) ? 'a full shot' : spec.shot.ph);
  const fillP = (spec, s) => U.fill(s, Object.assign({}, spec.P, spec.action ? spec.action.PP : {}));
  const noArt = (s) => String(s || '').replace(/^(a|an|the)\s+/i, '');
  const para = (arr) => arr.filter(Boolean).join(' ').trim();
  const lim = (spec, a, b, c) => [a, b, c][spec.level - 1];

  // ------------------------------------------------------------------ shared pieces
  const isPhoto = (spec) => PHOTO.has(spec.medium);
  const cast = (spec) => (spec.subject && spec.subject.cast) || null;
  const lead = (spec) => (cast(spec) ? cast(spec)[0] : null);
  const hasPeople = (spec) => !!(spec.subject && spec.subject.kind === 'person');
  const peopleCount = (spec) => (cast(spec) ? cast(spec).reduce((a, c) => a + c.count, 0) : hasPeople(spec) ? (spec.P.plural ? 2 : 1) : 0);
  const resolution = (spec) => {
    const q = spec.qualityWords.find((x) => /^(4k|8k|16k|uhd|hd)$/.test(x));
    return q ? q.toUpperCase().replace('UHD', '4K UHD') : null;
  };
  const ultra = (spec) => spec.styleMentions.some((x) => /ultra|hyper/.test(x.raw)) || spec.qualityWords.some((q) => /^(8k|16k|hyperdetailed|hyper-detailed|ultra-detailed)$/.test(q));

  // "Ultra-realistic cinematic photograph", or the style's own varied lead when nothing was asked for
  function qualityLead(spec, video) {
    const sm = spec.styleMentions;
    if (!sm.length && !spec.qualityWords.length) return video ? `${U.a(spec.duration + '-second ' + spec.vleadPick)}` : spec.leadPick;
    const styles = sm.map((x) => x.e);
    if (!styles.includes(spec.style)) styles.unshift(spec.style);
    const primary = styles.find((e) => e.id !== 'cinematic') || styles[0];
    let adjs = U.uniq(styles.map((e) => e.adj).filter(Boolean));
    if (ultra(spec) && isPhoto(spec)) adjs = ['ultra-realistic'].concat(adjs.filter((a) => !/realistic/.test(a)));
    else if (!sm.length && isPhoto(spec)) adjs = ['highly detailed'].concat(adjs);
    const noun = video ? `${spec.duration}-second video` : primary.noun;
    return U.cap(adjs.join(' ') + ' ' + noun);
  }

  function placePhrase(spec) {
    if (!spec.place || spec.place.isObj) return '';
    return spec.place.prep + ' ' + spec.place.np;
  }
  function timePhrase(spec) {
    const parts = [];
    const ev = spec.events.find((e) => e.ph);
    if (ev) parts.push(ev.ph);
    if (spec.time && spec.time2 && spec.time2 !== spec.time) parts.push(`as ${spec.time.noun} slowly gives way to ${spec.time2.noun}`);
    else if (spec.time && !(ev && /night|eve\b/i.test(ev.ph) && !spec.time.day)) parts.push(ev && /^during/.test(ev.ph) ? spec.time.at.replace(/^during( the)?/, 'at') : spec.time.at);
    const se = spec.seasons.find((e) => e.ph);
    if (se && !(se.id === 'summer' && spec.time && !spec.time.day)) parts.push(se.ph);
    return parts.join(' ');
  }

  // what the lead is: "an adult Mexican woman in her mid-twenties, kneeling on the floor of a quiet classroom while recording herself on a smartphone"
  function leadCore(spec, opts) {
    opts = opts || {};
    const s = spec.subject;
    const where = placePhrase(spec);
    const when = timePhrase(spec);
    if (!s) {
      const bits = [spec.place ? spec.place.np : 'an evocative, atmospheric scene', spec.action ? spec.action.ing : '', when];
      return bits.filter(Boolean).join(' ') + (spec.weatherClause && !opts.noClause ? ', ' + spec.weatherClause : '');
    }
    const who = s.cast ? s.cast[0].np : s.np;
    const A = spec.action, A2 = spec.action2;
    const extra = [];
    if (!s.cast && s.props && s.props.length && s.kind === 'person') extra.push((A ? 'with ' : 'holding ') + U.list(s.props));
    if (spec.coreElements.length) extra.push('with ' + U.list(spec.coreElements));
    let t;
    if (A) t = `${who}, ${[A.ing, where, A2 ? 'while ' + A2.ing : '', extra.join(' '), when].filter(Boolean).join(' ')}`;
    else t = [who, extra.join(' '), where, when].filter(Boolean).join(' ');
    if (spec.weatherClause && !opts.noClause) t += ', ' + spec.weatherClause;
    return t;
  }

  // ------------------------------------------------------------------ sections
  function leadDetails(spec, opts) {
    opts = opts || {};
    const s = spec.subject;
    if (!s) return [];
    const P = spec.P;
    const Sub = U.cap(P.sub);
    const out = [];
    const det = spec.subjDet.slice(0, opts.short ? 1 : 3);
    if (s.cast) {
      const ch = s.cast[0];
      out.push(...SC.cast.sentences(ch, { short: opts.short, pronounFirst: true, defaults: true, photo: isPhoto(spec), defaultExpr: s.expr || s.exprMood || (isPhoto(spec) && !opts.short ? 'a natural, unforced expression' : null) }));
      if (det.length) out.push(S(`${Sub} ${U.conj('have', P.plural)} ${U.list(det)}`));
      const sameVerb = spec.action && spec.action.pose && spec.action.pose.split(' ')[0] === spec.action.ing.split(' ')[0];
      if (opts.pose && !ch.pose && spec.action && spec.action.pose && !sameVerb) out.push(S(`${Sub} ${U.conj('be', P.plural)} ${spec.action.pose}`));
      return out.map((x) => fillP(spec, x));
    }
    if (s.kind === 'person' && s.wearNone) {
      out.push(S(U.fill(SC.wardrobe.NONE_SENTENCE, Object.assign({}, P, { sub: Sub }))));
      const withs = U.uniq(s.look.concat(det, s.expr ? [s.expr] : [])).slice(0, opts.short ? 2 : 3);
      if (withs.length) out.push(S(`${Sub} ${U.conj('have', P.plural)} ${U.list(withs)}`));
    } else if (s.kind === 'person' && s.outfits) {
      out.push(S(s.outfits.map((o, i) => `${i === 0 ? U.cap(o.ref) : o.ref} wears ${o.outfit}`).join(', and ')));
      const withs = U.uniq(s.look.concat(det, s.expr ? [s.expr] : [])).slice(0, 3);
      if (withs.length) out.push(S(`They share ${U.list(withs)}`));
    } else if (s.kind === 'person') {
      const withs = U.uniq(s.look.concat(det, s.expr ? [s.expr] : [])).slice(0, opts.short ? 2 : 4);
      if (s.outfit) out.push(S(`${Sub} ${U.conj('wear', P.plural)} ${s.outfit}` + (withs.length ? `, with ${U.list(withs)}` : '')));
      else if (withs.length) out.push(S(`${Sub} ${U.conj('have', P.plural)} ${U.list(withs)}`));
    } else {
      const look = s.look.slice(0, opts.short ? 1 : 2);
      const verb = s.kind === 'animal' ? 'have' : 'feature';
      if (s.outfit) out.push(S(`${Sub} ${U.conj('wear', P.plural)} ${s.outfit}`));
      const bits = U.uniq(look.concat(det));
      if (bits.length) out.push(S(`${Sub} ${U.conj(verb, P.plural)} ${U.list(bits)}`));
    }
    if (opts.pose && spec.action && spec.action.pose) out.push(S(`${Sub} ${U.conj('be', P.plural)} ${spec.action.pose}`));
    return out.map((x) => fillP(spec, x));
  }

  function supportSection(spec, opts) {
    opts = opts || {};
    const s = spec.subject;
    const out = [];
    if (!s) return out;
    if (s.cast) {
      const ld = s.cast[0];
      s.cast.slice(1).forEach((ch) => {
        out.push(...SC.cast.supportLines(ch, ld.P));
        out.push(...SC.cast.sentences(ch, { short: opts.short, pronounFirst: true }));
        const bare = !ch.hasFace && !ch.parts.length && !ch.expr && !ch.c.hairStyle;
        if (bare && isPhoto(spec)) out.push(S(`${U.cap(ch.P.sub)} ${U.conj('have', ch.count > 1)} realistic proportions, natural facial features and ${ch.count > 1 ? 'relaxed, neutral expressions' : 'a relaxed, neutral expression'}`));
      });
      const noPos = s.cast.length >= 2 && s.cast.length <= 3 && s.cast.every((ch) => ch.count === 1 && !ch.position) && spec.mode === 'image';
      if (noPos) {
        const pos = s.cast.length === 2 ? ['on the left', 'on the right'] : ['on the left', 'in the center', 'on the right'];
        out.push(S('In the frame, ' + s.cast.map((ch, i) => `${ch.ref} stands ${pos[i]}`).join(', ')));
      }
    }
    if (s.companions && s.companions.length) out.push(S(`${U.cap(s.cast ? s.cast[0].P.sub : spec.P.sub)} ${U.conj('be', spec.P.plural)} accompanied by ${U.list(s.companions)}`));
    return out.map((x) => fillP(spec, x));
  }

  function sceneSection(spec, opts) {
    const out = [];
    const env = spec.env.slice(0, opts.envN);
    const placeNoun = spec.place ? noArt(spec.place.short).replace(/^(rain-soaked|snow-covered|misty|fog-shrouded|storm-lashed|sunlit|windswept|monsoon-drenched|grey|drizzle-damp|frost-covered|sun-scorched|dust-choked|smog-choked|cloud-shadowed|snow-blasted|hail-battered) /, '') : '';
    if (env.length) {
      const tpl = spec.place && spec.place.entry
        ? [`The ${placeNoun} features ${U.list(env)}`, `The ${placeNoun} is filled with ${U.list(env)}`]
        : spec.subject ? [`The surroundings feature ${U.list(env)}`, `In the background: ${U.list(env)}`] : [`The scene features ${U.list(env)}`, `Across the frame: ${U.list(env)}`];
      out.push(S(pick(spec, 'env', tpl)));
    }
    if (opts.sky && spec.sky.length) out.push(S(spec.sky[0]));
    const atmo = spec.atmo.map((a) => a.replace(/ in (the|stale) air$/, ''));
    if (opts.atmo && atmo.length) out.push(S(`The air carries ${U.list(atmo)}`));
    const cs = cast(spec);
    if (cs && cs.length > 1) {
      const others = U.list(cs.slice(1).map((c) => c.ref));
      const framed = cs.slice(1).some((c) => (c.memberInfo || []).some((m) => m.pos) || c.position);
      out.push(S(`${U.cap(cs[0].ref)} is the primary visual subject, with ${others} ${framed ? `creating balanced spatial framing around ${cs[0].P.obj}` : 'placed naturally within the scene'}`));
    }
    return out.map((x) => fillP(spec, x));
  }

  function heldObjects(spec) {
    const objs = [];
    [spec.action, spec.action2].forEach((x) => x && x.objE && objs.push(x.objE));
    (spec.props || []).forEach((e) => objs.push(e));
    const seen = new Set();
    return objs.filter((e) => e && (e.type === 'hold' || e.type === 'product') && !seen.has(e.id) && seen.add(e.id));
  }

  function specifics(spec, opts) {
    const out = [];
    const ld = lead(spec);
    const P = ld ? ld.P : spec.P;
    if (spec.subject && spec.subject.kind === 'person' && !opts.video) {
      heldObjects(spec).forEach((e) => out.push(S(`The ${e.n} is clearly visible in ${P.pos} hand${e.real ? ', ' + e.real : ', rendered at a believable scale with realistic materials'}`)));
    }
    [spec.action, spec.action2].forEach((x) => x && x.e.real && out.push(S(U.fill(x.e.real, Object.assign({}, P, x.PP)))));
    if (spec.detail.length && opts.details) out.push(S(pick(spec, 'detail', [`Fine details include ${U.list(spec.detail)}`, `Small details sell the moment: ${U.list(spec.detail)}`])));
    if (spec.texture.length && opts.details) out.push(S(`Surfaces show ${U.list(spec.texture)}`));
    return out.map((x) => fillP(spec, x));
  }

  function realismList(spec) {
    const L = spec.level;
    if (!isPhoto(spec)) return spec.tech.slice(0, lim(spec, 1, 2, 3)).concat(L >= 2 ? ['consistent stylization', 'clean, confident forms'] : []);
    const items = [];
    const s = spec.subject;
    if (hasPeople(spec)) {
      items.push('highly detailed human anatomy', 'physically accurate proportions', 'realistic hands and fingers');
      if (L >= 2) items.push('natural skin pores', 'individual hair strands');
      if (!spec.wardrobeNone) items.push('realistic fabric fibers with subtle natural wrinkles');
    } else if (s && s.kind === 'animal') {
      items.push('anatomically accurate proportions', `realistic ${/feather/.test(s.entry.coat || '') ? 'feather' : /scale/.test(s.entry.coat || '') ? 'scale' : 'fur'} texture`);
    } else if (s) items.push('true-to-life materials', 'accurate surface texture');
    else items.push('natural geology and vegetation', 'realistic atmospheric perspective');
    items.push('physically accurate lighting and shadows', 'realistic reflections');
    if (L >= 2) items.push('natural depth of field');
    return items;
  }

  function lightSentence(spec, n) {
    const key = fillP(spec, spec.key || 'soft natural light');
    const acc = spec.lightAcc.filter((a) => a.toLowerCase() !== key.toLowerCase()).slice(0, n).map((a) => fillP(spec, a));
    if (!acc.length) return S(`Lit by ${key}`);
    return S(`Lit by ${key}, with ${U.list(acc)}`);
  }

  function cameraSection(spec, opts) {
    const out = [];
    const m = spec.medium;
    const cin = spec.styleMentions.some((x) => x.e.id === 'cinematic') || m === 'film';
    const lensPh = spec.lens ? U.a(spec.lens + ' lens') : null;
    if (PHOTO.has(m)) {
      let t = `${cin ? 'Cinematic framing' : 'Framing'} built on ${spec.comp.ph}, captured as ${shotPh(spec)} from ${spec.angle.ph}`;
      if (lensPh) t += `, shot on ${lensPh}` + (spec.ap && !opts.short ? ` at ${spec.ap}` : '');
      if (spec.dof && !opts.short) t += `, with ${spec.dof}`;
      out.push(S(t));
    } else if (m === '3d') out.push(S(`Framing built on ${spec.comp.ph}, rendered as ${shotPh(spec)} from ${spec.angle.ph}` + (lensPh && !opts.short ? ` through a virtual ${spec.lens} lens` : '')));
    else out.push(S(`Framing built on ${spec.comp.ph}, drawn as ${shotPh(spec)} seen from ${spec.angle.ph}`));
    out.push(lightSentence(spec, opts.short ? 0 : 2));
    const col = [];
    if (spec.palette) col.push(`a palette of ${spec.palette.ph}`);
    if (spec.accents.length) col.push(`accents of ${U.list(spec.accents)}`);
    if (cin && PHOTO.has(m)) col.push('cinematic contrast and restrained, professional color grading');
    let ct = col.length ? U.cap(U.list(col)) : '';
    if (spec.moodAdj.length) ct += (ct ? ', with a mood that feels ' : 'The mood feels ') + U.list(spec.moodAdj);
    if (ct) out.push(S(ct));
    if (!opts.short && spec.style.cam && PHOTO.has(m) && spec.level >= 3) out.push(S(spec.style.cam));
    return out.map((x) => fillP(spec, x));
  }

  function quality(spec) {
    const living = spec.subject && /person|animal/.test(spec.subject.kind);
    const skin = hasPeople(spec);
    return spec.quality.filter((q) => (living || !/anatomy/.test(q)) && (skin || !/skin/.test(q)));
  }

  function technicalList(spec, video) {
    const L = spec.level;
    const res = resolution(spec);
    if (!isPhoto(spec)) return U.uniq(quality(spec).concat([res || 'high resolution', 'consistent style throughout', 'clean, readable composition']));
    const film = spec.medium === 'film' || spec.styleMentions.some((x) => x.e.id === 'cinematic');
    const items = [res || 'high resolution', 'ultra-high detail'];
    items.push(video ? 'premium cinema-camera quality' : film ? 'professional cinema photography' : 'professional photography');
    if (res || ultra(spec) || spec.qualityWords.includes('hdr')) items.push('HDR with realistic dynamic range');
    if (L >= 2) items.push('physically accurate materials', 'natural imperfections');
    if (L >= 2 && spec.place && spec.place.entry) items.push(`an authentic ${spec.place.entry.n} atmosphere`);
    items.push('sharp primary subject', 'no artificial CGI appearance');
    if (L >= 3) items.push('realistic optical characteristics');
    return items;
  }

  function mustCheck(spec, text) {
    const low = text.toLowerCase();
    const missing = spec.must.filter((m) => !m.alts.some((a) => low.includes(a)));
    if (!missing.length) return text;
    return text + ' ' + S(`The scene also clearly includes ${U.list(missing.map((m) => U.a(m.raw)))}`);
  }

  // ------------------------------------------------------------------ negative prompt (contextual)
  function negative(spec, video) {
    const photo = isPhoto(spec);
    const s = spec.subject;
    const people = hasPeople(spec);
    const total = peopleCount(spec);
    const objs = heldObjects(spec).concat([spec.action, spec.action2].filter((x) => x && x.objE && !x.objE.type).map((x) => x.objE));
    const n = [];
    n.push(...(spec.negWords || []));
    if (spec.minor) n.push('dressed', 'fully covered', 'old');
    if (spec.wstate && spec.wstate.western) n.push('traditional ethnic clothing');
    if (photo) n.push('cartoon', 'anime', 'illustration', 'painting', 'CGI', '3D render', 'videogame graphics');
    n.push(...spec.neg.filter((x) => !(photo && /photograph|photoreal/i.test(x))));
    if (photo && people) n.push('plastic skin', 'waxy skin', 'airbrushed skin', 'excessive beauty retouching', 'artificial face', 'doll-like appearance');
    if (people) {
      n.push('unrealistic body proportions', 'distorted anatomy', 'malformed limbs', 'extra arms', 'extra legs', 'extra fingers', 'missing fingers', 'fused fingers', 'deformed hands', 'malformed feet', 'floating limbs', 'disconnected limbs', 'unnatural poses', 'broken joints', 'twisted torso', 'asymmetrical eyes', 'crossed eyes', 'distorted facial features', 'blurry face');
      if (total > 1) n.push('duplicated people', 'duplicate faces', 'merged bodies', 'extra people', 'missing people');
    }
    if (s && s.kind === 'animal') n.push('extra legs', 'malformed anatomy', 'fused limbs', 'wrong number of eyes');
    heldObjects(spec).forEach((e) => (e.neg ? n.push(...e.neg.split(/,\s*/)) : n.push(`distorted ${e.n}`, `floating ${e.n}`)));
    if (people && !spec.wardrobeNone) {
      n.push('malformed clothing');
      (spec.wstate ? U.uniq(SC.wardrobe.garmentWords(spec.wstate.text)).slice(0, 2) : []).forEach((g) => n.push(`warped ${g}`));
      n.push('impossible fabric folds');
    }
    if (photo) n.push('oversharpening', 'excessive HDR', 'oversaturated colors', 'crushed shadows', 'blown highlights', 'flat lighting', 'fake depth of field', 'unrealistic shadows', 'incorrect reflections');
    n.push('text artifacts', 'illegible text', 'watermark', 'logo', 'signature');
    if (people) n.push('cropped head', 'cropped feet', 'cut-off body', 'out of frame', 'awkward composition');
    if (photo && !/fisheye/.test(spec.lens || '')) n.push('fisheye distortion', people ? 'wide-angle body distortion' : '');
    if (photo) n.push('uncanny valley', 'AI-generated appearance');
    else n.push('blurry', 'low resolution', 'jpeg artifacts');
    if (video) {
      n.push('flickering', 'frame-to-frame inconsistency');
      if (people) n.push('identity drift', 'face morphing', 'changing faces', 'changing hairstyles', spec.wardrobeNone ? '' : 'changing clothing', 'changing body proportions');
      if (total > 1) n.push('disappearing people', 'teleportation', 'sudden position changes');
      if (people) n.push('rubbery motion', 'sliding feet', 'unnatural movement', 'frozen face', 'dead eyes', 'blinking artifacts', 'mouth deformation', 'face warping', 'skin flickering', 'texture crawling', spec.wardrobeNone ? '' : 'clothing morphing');
      heldObjects(spec).forEach((e) => n.push(`${e.n} deformation`, `${e.n} disappearing`, `fingers passing through the ${e.n}`));
      n.push('background morphing', 'unstable geometry');
      if (spec.placeIndoor) n.push('moving furniture', 'shifting walls');
      if (spec.move && spec.move.id !== 'handheld') n.push('camera shake');
      n.push('excessive motion blur', 'ghosting', 'double images', 'temporal artifacts', 'frame interpolation artifacts', 'unnatural physics');
      if (photo) n.push('animation', 'animated look', '3D animation', 'cartoon style', 'stylized', 'painterly', 'video game look', 'smooth plastic surfaces', 'low frame rate', 'choppy motion', 'jerky movement', spec.pace && /lapse/.test(spec.pace.id) ? '' : 'sped-up motion');
    }
    void objs;
    return U.uniq(n.filter(Boolean)).join(', ');
  }

  // ------------------------------------------------------------------ IMAGE
  function imageNatural(spec) {
    const L = spec.level;
    const short = L === 1;
    const P1 = para([S(`${qualityLead(spec)} of ${leadCore(spec)}`)].concat(leadDetails(spec, { short, pose: true })));
    const P2 = para(supportSection(spec, { short }));
    const P3 = para(sceneSection(spec, { envN: lim(spec, 2, 3, 5), sky: !short, atmo: !short }));
    const P4 = para(specifics(spec, { details: !short }));
    const P5 = short ? '' : S(U.cap(realismList(spec).join(', ')));
    const P6 = para(cameraSection(spec, { short }));
    const P7 = S(U.cap(technicalList(spec).slice(0, lim(spec, 5, 9, 12)).join(', ')));
    const text = U.capSentences([P1, P2, P3, P4, P5, P6, P7].filter(Boolean).join('\n\n'));
    return { prompt: mustCheck(spec, text), negative: negative(spec, false) };
  }

  function imageSDXL(spec) {
    const t = [];
    const w = (x, n) => `(${x}:${n})`;
    const photo = isPhoto(spec);
    // 1. quality first
    if (!photo) t.push('masterpiece', 'best quality');
    t.push(qualityLead(spec).toLowerCase().replace(/^(a|an) /, ''));
    if (resolution(spec)) t.push(resolution(spec));
    t.push('highly detailed', ...spec.sd);
    // 2–3. lead, then supporting subjects
    const cs = cast(spec);
    if (cs) {
      const ld = cs[0];
      const lt = SC.cast.tags(ld);
      if (spec.action) lt.splice(1, 0, spec.action.ing + (spec.action2 ? ' while ' + spec.action2.ing : ''));
      t.push(w(U.uniq(lt).join(', '), 1.2));
      cs.slice(1).forEach((ch) => {
        const st = SC.cast.tags(ch);
        (ch.memberInfo || []).forEach((m) => m.pos && st.push(`one ${SC.cast.posPhrase(m.pos, ld.P)}`));
        if (ch.position) st.push(SC.cast.posPhrase(ch.position, ld.P));
        t.push(w(U.uniq(st).join(', '), 1.1));
      });
    } else if (spec.subject) {
      const lt = [noArt(spec.subject.np)];
      if (spec.action) lt.push(spec.action.ing + (spec.action2 ? ' while ' + spec.action2.ing : ''));
      if (spec.subject.outfit) lt.push('wearing ' + spec.subject.outfit);
      if (spec.subject.outfits) spec.subject.outfits.forEach((x) => lt.push(`${noArt(x.ref)} wearing ${x.outfit}`));
      if (spec.subject.expr) lt.push(spec.subject.expr);
      t.push(w(lt.join(', '), 1.2));
      spec.subject.companions.forEach((c) => t.push(c));
    }
    // 4. scene
    if (spec.place && !spec.place.isObj) t.push(spec.subject ? noArt(spec.place.np) : w(noArt(spec.place.np), 1.2));
    if (spec.time) t.push(spec.time.id);
    spec.weathers.forEach((x) => t.push(x.id));
    spec.env.slice(0, 3).forEach((x) => t.push(x));
    // 5–6. specifics, camera & light
    spec.detail.slice(0, 2).forEach((x) => t.push(x));
    t.push(noArt(shotPh(spec)), noArt(spec.angle.ph));
    if (photo && spec.lens) t.push(spec.lens + ' lens', spec.dof ? (/shallow|bokeh|thin/.test(spec.dof) ? 'shallow depth of field' : /deep/.test(spec.dof) ? 'deep focus' : '') : '');
    t.push(fillP(spec, spec.key || 'natural light'));
    spec.lightAcc.slice(0, 1).forEach((x) => t.push(fillP(spec, x)));
    if (spec.palette) t.push(spec.palette.ph);
    spec.moodAdj.forEach((x) => t.push(x + ' mood'));
    // 7. technical tail
    if (photo) t.push(...(hasPeople(spec) ? ['natural skin texture', 'detailed hands'] : []), 'sharp focus', 'realistic lighting');
    t.push(...quality(spec).slice(0, 3));
    let prompt = U.uniq(t.filter(Boolean).map((x) => fillP(spec, String(x).trim()))).join(', ');
    prompt = mustCheck(spec, prompt).replace(/\. The scene also clearly includes /, ', ').replace(/\.$/, '');
    return { prompt, negative: negative(spec, false) };
  }

  function imageMJ(spec) {
    const out = [S(`${qualityLead(spec)} of ${leadCore(spec)}`)];
    out.push(...leadDetails(spec, { short: true }).slice(0, 3));
    out.push(...supportSection(spec, { short: true }).slice(0, 3));
    out.push(...sceneSection(spec, { envN: 2 }).slice(0, 1));
    out.push(...cameraSection(spec, { short: true }));
    if (spec.tech.length && !isPhoto(spec)) out.push(S(U.cap(U.list(spec.tech.slice(0, 2)))));
    out.push(S(U.cap(technicalList(spec).slice(0, 4).join(', '))));
    const text = mustCheck(spec, U.capSentences(out.join(' ')));
    const mj = spec.style.mj || '';
    const params = [`--ar ${spec.aspect}`];
    if (/--niji/.test(mj)) params.push(mj);
    else params.push(...[mj, '--v 7'].filter(Boolean));
    const noList = ['text', 'watermark', 'logo'].concat(hasPeople(spec) ? ['extra fingers', 'distorted hands'] : [], peopleCount(spec) > 1 ? ['duplicate people'] : []);
    params.push('--no ' + noList.join(', '));
    return { prompt: text + ' ' + params.join(' '), negative: negative(spec, false) };
  }

  // ------------------------------------------------------------------ VIDEO
  const GEN_V = {
    loco: ['{do} {along}', '[keep] moving at a steady, natural pace', '[continue] onward, moving deeper into the frame'],
    flight: ['{do} {along}', '[bank] gently, riding the air', '[glide] onward into the distance'],
    swim: ['{do} {along}', '[glide] forward with smooth strokes', '[drift] slowly toward the light'],
    still: ['{do} {at}', '[shift] slightly, breathing slowly', '[settle] back into stillness'],
    gesture: ['{do}', '[hold] the moment', '[relax] as the moment passes'],
    interact: ['{do} {at}', '[stay] absorbed in the moment', '[pause], glancing up briefly'],
    work: ['{do} {at}', '[work] with practiced, rhythmic movements', '[pause] to consider the result'],
    dance: ['{do} {at}', '[move] fluidly with the rhythm', '[finish] in a poised final pose'],
    fight: ['{do}', '[strike] and [parry] in a flurry of motion', '[stand] braced, breathing hard'],
    event: ['{do}', 'the moment builds in intensity', 'the motion slowly settles'],
    vehicle: ['{do} {along}', '[hold] its line through the curve, engine roaring', '[speed] away toward the horizon, dust and air trailing behind'],
    generic: ['{do} {at}', '[keep] going, {ing}', '[continue], {ing} as the moment unfolds'],
  };

  function actionPreds(spec) {
    const A = spec.action;
    const s = spec.subject;
    const P = spec.P;
    if (A && A.beats && (!s || s.kind === 'thing')) return { full: true, list: A.beats.map((b) => U.fill(b, Object.assign({}, P, A.PP))) };
    let v;
    const PP = Object.assign({}, P, { do: A ? A.doP : '', ing: A ? A.ing : '' }, A ? { o: A.oNP } : {});
    if (A) v = A.v || GEN_V[A.kind] || GEN_V.generic;
    const A2 = spec.action2;
    if (A && A2 && A.kind === 'still' && A2.v) {
      const P2 = Object.assign({}, P, { do: A2.doP, ing: A2.ing, o: A2.oNP });
      return { full: false, list: [`${P.S} ${U.fill(v[0], PP)} while ${A2.ing}`, `${P.sub} ${U.fill(A2.v[1], P2)}`, `${P.sub} ${U.fill(A2.v[2], P2)}`] };
    }
    else if (s) {
      const still = s.kind === 'thing' && s.entry.type === 'veh' ? { doP: '[move] steadily', kind: 'loco' } : { doP: s.kind === 'thing' ? '[stand] prominently' : '[stand] quietly', kind: 'still' };
      PP.do = still.doP;
      v = GEN_V[still.kind];
      if (s.kind === 'thing') v = [v[0], '[catch] the shifting light', '[remain] the steady focal point of the frame'];
    } else return { full: true, list: [] };
    const list = v.map((p, i) => (i === 0 ? P.S : P.sub) + ' ' + U.fill(p, PP));
    if (spec.action2) list[0] += ' while ' + spec.action2.ing;
    return { full: false, list };
  }

  function beats(spec) {
    const D = spec.duration;
    const n = D <= 6 ? 2 : D <= 10 ? 3 : 4;
    const cam = spec.move;
    const P = spec.P;
    const cf = (s) => U.fill(s, P);
    const preds = actionPreds(spec).list;
    const motion = spec.motion.slice();
    const smo = spec.smotion.slice();
    const acts = preds.length ? preds : motion.splice(0, 3);
    const idle = spec.subject && spec.subject.kind === 'person' ? `${P.sub} ${U.conj('breathe', P.plural)} naturally, with small, realistic shifts of weight and posture` : spec.subject ? `${P.S} ${U.conj('stay', P.plural)} steady as the light shifts subtly across ${P.obj}` : 'the environment continues its slow, natural movement';
    while (acts.length < 3) acts.push(acts.length ? idle : 'the environment continues its slow, natural movement');
    const segs = [];
    const withWhile = (a, m) => (m ? `${a}, while ${m}` : a);
    if (acts.length > 3) {
      for (let i = 0; i < n; i++) {
        const from = Math.round((i * acts.length) / n);
        const to = Math.round(((i + 1) * acts.length) / n);
        const seg = [];
        if (i === 0) seg.push(cf(cam.start));
        seg.push(...acts.slice(from, Math.max(to, from + 1)));
        if (i === n - 1) seg.push(cf(cam.end));
        else if (i === Math.floor(n / 2)) seg.push(cf(cam.mid));
        segs.push(seg);
      }
    } else if (n === 2) {
      segs.push([cf(cam.start), withWhile(acts[0], motion[0])], [acts[1], cf(cam.end)]);
    } else if (n === 3) {
      segs.push([cf(cam.start), acts[0]], [withWhile(acts[1], motion[0]), cf(cam.mid)], [acts[2], cf(cam.end)]);
    } else if (n === 4) {
      segs.push([cf(cam.start), acts[0]], [withWhile(acts[1], motion[0])], [withWhile(cf(cam.mid), smo[0] || motion[1])], [acts[2], cf(cam.end)]);
    } else {
      segs.push([cf(cam.start), acts[0]], [withWhile(acts[1], motion[0])], [withWhile(cf(cam.mid), smo[0])], [U.cap(motion[1] || motion[0] || 'the environment keeps moving naturally around the frame')], [acts[2], cf(cam.end)]);
    }
    const bounds = [];
    for (let i = 0; i <= n; i++) bounds.push(Math.round((D * i) / n));
    return segs.map((seg, i) => ({ from: bounds[i], to: bounds[i + 1], text: seg.filter(Boolean).map((x) => S(x)).join(' ') }));
  }

  // subtle, image-to-video style motion for the lead
  function leadMotion(spec) {
    const s = spec.subject;
    const P = spec.P;
    const out = [];
    if (!s) return spec.motion.slice(0, 3).map((m) => S(m));
    const A = spec.action, A2 = spec.action2;
    const Ref = U.cap(P.S);
    const where = placePhrase(spec) ? ' ' + placePhrase(spec) : '';
    if (A) out.push(S(`${Ref} ${U.conj('remain', P.plural)} ${A.ing}${where}${A2 ? ` and ${U.conj('continue', P.plural)} ${A2.ing}` : ''}`));
    else out.push(S(`${Ref} ${U.conj('remain', P.plural)} in place${where}`));
    const micro = s.kind === 'person' ? ['gentle breathing', 'natural blinking', 'a slight shift of posture'] : s.kind === 'animal' ? ['gentle breathing', 'small twitches of the ears and tail', 'natural shifts of weight'] : ['subtle shifts in light across its surfaces'];
    spec.smotion.slice(0, 2).forEach((m) => micro.push(fillP(spec, m)));
    out.push(S(`${U.cap(P.sub)} ${U.conj('make', P.plural)} subtle, realistic movements: ${U.list(micro)}`));
    return out;
  }

  function supportMotion(spec) {
    const cs = cast(spec);
    if (!cs || cs.length < 2) return [];
    const ld = cs[0];
    const out = [];
    cs.slice(1).forEach((ch) => {
      out.push(...SC.cast.supportLines(ch, ld.P).map((x) => x.replace(/\bare positioned\b/, 'remain positioned')));
      out.push(S(`${U.cap(ch.P.sub)} ${U.conj('make', ch.count > 1)} only subtle natural movements such as breathing, slight posture adjustments and small head movements`));
    });
    out.push(S('Their positions remain consistent throughout the shot'));
    return out;
  }

  function cameraLine(spec) {
    const cs = cast(spec);
    let t = `${U.cap(spec.move.ph)}, framed as ${shotPh(spec)} from ${spec.angle.ph}`;
    if (isPhoto(spec) && spec.lens) t += `, on ${U.a(spec.lens + ' lens')}`;
    if (cs && cs.length > 1) t += `, keeping ${cs[0].ref} as the primary subject while ${U.list(cs.slice(1).map((c) => c.ref))} stay visible`;
    let out = S(t);
    if (spec.pace && spec.pace.id !== 'real-time') out += ' ' + S(`The footage plays in ${spec.pace.ph}`);
    return fillP(spec, out);
  }

  function propStability(spec) {
    if (!hasPeople(spec)) return [];
    const ld = lead(spec);
    const P = ld ? ld.P : spec.P;
    const out = heldObjects(spec).map((e) => S(`The ${e.n} stays correctly held in ${P.pos} hand throughout, fingers keeping anatomically correct contact with it`));
    if (out.length) out.push(S('No sudden movements'));
    return out;
  }

  function consistencyLine(spec) {
    const s = spec.subject;
    if (!s) return S('One continuous take with stable geometry, no cuts and no morphing');
    const cs = cast(spec);
    const outfit = s.wearNone ? '' : ', outfit';
    if (cs && (cs.length > 1 || cs[0].count > 1)) return S(`Every character keeps the same face, hairstyle${outfit} and proportions throughout; one continuous take with no cuts and no morphing`);
    const what = s.kind === 'person' ? (spec.P.plural ? `consistent faces${outfit ? ', outfits' : ''} and proportions` : `the same face, hairstyle${outfit} and proportions`) : s.kind === 'animal' ? 'the same markings and proportions' : 'the same shape, materials and details';
    return S(`${U.cap(spec.P.S)} ${U.conj('keep', spec.P.plural)} ${what} throughout; one continuous take with no cuts and no morphing`);
  }

  function motionRealism(spec) {
    const people = hasPeople(spec);
    const items = people ? ['realistic human motion', 'realistic facial micro-expressions', 'natural blinking'] : ['physically grounded motion with natural weight and momentum'];
    if (people && !spec.wardrobeNone) items.push('physically accurate cloth movement');
    if (people) items.push('subtle hair movement', 'realistic skin texture');
    items.push('natural shadows', 'realistic reflections', 'natural motion blur', 'a steady 24fps cadence');
    return S(U.cap(items.join(', ')));
  }

  function videoTech(spec, opts) {
    const bits = isPhoto(spec)
      ? ['photorealistic live-action appearance'].concat(technicalList(spec, true).slice(0, spec.level >= 2 ? 6 : 4), spec.level >= 2 ? ['natural color science', 'subtle filmic contrast'] : [])
      : technicalList(spec, true);
    const out = [S(U.cap(U.uniq(bits).join(', ')))];
    if (isPhoto(spec) && spec.level >= 2) out.push(S('The scene should feel like a professionally filmed live-action sequence rather than an AI-generated video'));
    return out;
  }

  // ------------------------------------------------------------------ AUDIO
  const MUSIC = {
    event: { diwali: 'warm sitar and tabla with soft temple bells', holi: 'energetic dhol beats with playful folk vocals', 'ganesh chaturthi': 'thundering dhol-tasha drums', 'durga puja': 'rhythmic dhak drums', eid: 'gentle oud and soft percussion', wedding: 'celebratory shehnai and dhol', christmas: 'a gentle orchestral carol with sleigh bells', halloween: 'an eerie music-box melody', 'new year': 'upbeat pop building to a countdown', 'lunar new year': 'traditional drums, gongs and cymbals', carnival: 'a lively brass band', birthday: 'cheerful acoustic guitar', 'kite festival': 'bright folk percussion', funeral: 'a slow, solemn cello', protest: 'distant chanting drums' },
    genre: { cyberpunk: 'dark, pulsing synthwave', scifi: 'an atmospheric electronic score', fantasy: 'a sweeping orchestral theme with soft choir', 'dark fantasy': 'brooding low strings and distant choir', horror: 'low droning strings with sparse, dissonant stingers', western: 'a lonesome whistled melody over twangy guitar', bollywood: 'a lush Bollywood orchestral song', mughal: 'sarangi and tabla in a slow classical raga', medieval: 'lute and hurdy-gurdy', steampunk: 'clockwork percussion and brass', '1980s': 'retro synth-pop', '1920s': 'scratchy jazz-age ragtime', 'post-apocalyptic': 'sparse, haunting ambient drones', gothic: 'a slow pipe-organ motif', military: 'a restrained snare-and-brass march', mythological: 'a grand orchestral score with chanting voices', 'space opera': 'a soaring orchestral space theme' },
    mood: { lonely: 'a slow, sparse solo piano', sad: 'a slow, sparse solo piano', melancholic: 'a wistful solo cello', romantic: 'soft piano with warm strings', epic: 'a rising orchestral swell with deep percussion', determined: 'a building, driving orchestral pulse', hopeful: 'a gentle, uplifting piano and strings', eerie: 'low ambient drones', mysterious: 'low ambient drones with a faint, curious motif', ominous: 'deep, slow bass drones', tense: 'pulsing low strings', happy: 'light, upbeat acoustic guitar', playful: 'bouncy pizzicato strings', peaceful: 'gentle ambient pads', contemplative: 'gentle ambient pads with sparse piano', cozy: 'soft lo-fi jazz', energetic: 'a driving electronic beat', chaotic: 'frenetic percussion', nostalgic: 'a warm, slightly faded piano melody', dreamy: 'ethereal pads and soft chimes', elegant: 'a refined string quartet', gritty: 'raw, minimal percussion', angry: 'aggressive low percussion', fearful: 'tense, trembling strings', somber: 'a slow, solemn cello', surprised: 'a light, wondering celesta motif', shy: 'a delicate music-box melody', tired: 'slow, hazy ambient guitar' },
  };
  const SFX = { record: 'a faint tap on the phone screen', cook: 'a sizzling pan and a knife on a chopping board', read: 'soft page turns', drink: 'a quiet sip and the clink of a cup', write: 'a pen scratching on paper', launch: 'a deep rocket rumble building to a thunderous roar', explode: 'a deep blast followed by falling debris', fight: 'swift whooshes and muffled impacts', 'fly kite': 'kite paper fluttering and string snapping taut', paint: 'brush bristles on canvas', celebrate: 'claps and cheers', walk: 'natural footsteps', run: 'quick footsteps and breathing', dance: 'footsteps and the rustle of fabric', ride: 'rhythmic hoofbeats or engine hum', drive: 'a steady engine hum', swim: 'muffled underwater bubbles', fly: 'rushing wind', kneel: 'the soft rustle of clothing', sit: 'the soft creak of a seat', hug: 'the rustle of clothing', text: 'the soft tap of a phone screen', photograph: 'a camera shutter click', 'cast spell': 'a rising magical hum and crackle', burn: 'crackling flames', crash: 'a heavy crash and scattering debris' };
  const KIND_SFX = { loco: 'natural footsteps', dance: 'footsteps and the rustle of fabric', fight: 'swift whooshes and impacts', flight: 'rushing wind', swim: 'muffled water movement', work: 'the small sounds of the task', vehicle: 'a steady engine hum' };
  const TONE = { happy: 'bright, cheerful', playful: 'teasing, playful', romantic: 'soft, intimate', sad: 'quiet, emotional', lonely: 'quiet, subdued', melancholic: 'quiet, wistful', tense: 'low, urgent', fearful: 'shaky, frightened', angry: 'sharp, angry', epic: 'strong, resolute', determined: 'strong, resolute', mysterious: 'hushed, secretive', cozy: 'warm, relaxed', energetic: 'excited', elegant: 'poised, calm' };
  const CHEER = { diwali: 'Happy Diwali!', holi: 'Holi hai!', 'ganesh chaturthi': 'Ganpati Bappa Morya!', 'new year': 'Happy New Year!', birthday: 'Happy birthday!', eid: 'Eid Mubarak!', christmas: 'Merry Christmas!', 'lunar new year': 'Happy New Year!', wedding: 'Congratulations!' };

  function audioPlan(spec) {
    const neg = (spec.negWords || []).join(' ');
    const s = spec.subject;
    const A = spec.action, A2 = spec.action2;
    const moodId = spec.moods[0] && spec.moods[0].id;
    const ev = spec.events[0];
    const place = spec.place && spec.place.entry ? spec.place.entry.n : '';
    const speaker = s && s.kind === 'person' ? (s.cast ? s.cast[0].ref : spec.P.S) : null;
    const plural = s && spec.P.plural;
    const out = {};
    // dialogue
    let line = null;
    const acts = [A, A2].filter(Boolean).map((x) => x.e.id);
    if (/dialogue|talking|speech|voice|words/.test(neg)) out.dialogue = 'none';
    else if (!speaker) out.dialogue = null;
    else if (ev && CHEER[ev.id] && (acts.includes('celebrate') || !acts.length)) line = CHEER[ev.id];
    else if (acts.includes('record')) line = `Hey everyone, quick check-in from ${place ? 'the ' + place : 'here'} today.`;
    else if (acts.includes('text')) line = 'Yeah, I’m on my way. Give me five minutes.';
    else if (acts.includes('cook')) line = 'Almost ready. Just a little more salt.';
    else if (acts.includes('fly kite')) line = 'Kai po che!';
    else if (acts.includes('hug') || acts.includes('kiss') || (moodId === 'romantic' && plural)) line = 'I missed you.';
    else if (acts.includes('celebrate')) line = 'This is amazing!';
    if (out.dialogue === undefined && speaker) {
      const small = s && (s.entry.id === 'couple' || (s.cast && s.cast.reduce((n, c) => n + c.count, 0) <= 3));
      const who = plural ? (small ? `One of ${speaker}` : `Several voices in ${speaker}`) : U.cap(speaker);
      if (line) out.dialogue = `${who} (${TONE[moodId] || 'natural, casual'} tone${plural && !small ? '' : ', lip-synced'}): “${line}”`;
      else if (acts.some((a) => ['sing'].includes(a))) out.dialogue = `${U.cap(speaker)} sings a short, soft melody, lip-synced`;
      else if (plural || (s.cast && s.cast.length > 1)) out.dialogue = 'Soft, indistinct conversation; no clear words';
      else out.dialogue = 'No dialogue; natural breathing and quiet movement sounds only';
    }
    // music
    const diegetic = acts.includes('play') || acts.includes('sing');
    if (/music|song|soundtrack|score/.test(neg)) out.music = 'none';
    else if (diegetic) out.music = acts.includes('sing') ? 'the live singing voice only, no backing track' : `live ${A && A.oNP ? noArt(A.oNP) : 'instrument'} playing in the scene, no added score`;
    else if (spec.style && /documentary|street photography/.test(spec.style.id)) out.music = 'no music; natural sound only';
    else out.music = (ev && MUSIC.event[ev.id]) || (spec.genres[0] && MUSIC.genre[spec.genres[0].id]) || (moodId && MUSIC.mood[moodId]) || (s && s.kind === 'person' ? 'a subtle, understated cinematic score kept low' : 'a gentle ambient score kept low');
    // ambience & effects
    const amb = spec.sound.slice(0, 3);
    out.ambience = amb.length ? U.list(amb) : spec.placeIndoor ? 'quiet, natural room tone' : 'soft, natural outdoor ambience';
    const CALL = A && A.e.id === 'roar' ? (/howl/.test(A.ing) ? 'a long, echoing howl' : /bark/.test(A.ing) ? 'sharp barking' : /growl|snarl/.test(A.ing) ? 'a low growl' : 'a deep, rumbling roar') : null;
    const fx = U.uniq([CALL].concat(acts.map((a) => SFX[a])).concat(A && !SFX[A.e.id] ? [KIND_SFX[A.kind]] : []).filter(Boolean));
    out.sfx = fx.length ? U.list(fx) : null;
    out.mix = `${out.dialogue && !/^(No dialogue|none|Soft, indistinct)/.test(out.dialogue) ? 'dialogue clear and upfront, ' : ''}ambience natural, music ${out.music === 'none' || /^no music/.test(out.music || '') ? 'absent' : 'low and unobtrusive'}; clean, undistorted audio with no abrupt cuts`;
    return out;
  }

  function audioText(spec, form) {
    const a = audioPlan(spec);
    const parts = [];
    if (a.dialogue && a.dialogue !== 'none') parts.push(['Dialogue', a.dialogue]);
    if (a.dialogue === 'none') parts.push(['Dialogue', 'none']);
    parts.push(['Music', a.music]);
    parts.push(['Ambience', a.ambience]);
    if (a.sfx) parts.push(['Sound effects', a.sfx]);
    parts.push(['Mix', a.mix]);
    const fin = (v) => (/[”"!?]$/.test(v) ? U.cap(v) : U.sentence(v));
    if (form === 'lines') return parts.map(([k, v]) => `${k}: ${fin(v)}`);
    return 'Audio. ' + parts.map(([k, v]) => `${k}: ${fin(v)}`).join(' ');
  }
  SC.audioText = audioText;

  function videoProse(spec, opts) {
    const L = spec.level;
    const short = L === 1;
    const out = [];
    // 1. quality + lead
    if (spec.i2v) out.push(para([S(`Create ${U.a(qualityLead(spec, true).toLowerCase().replace(/^(a|an) /, ''))} based on the reference image, featuring ${leadCore(spec, { noClause: true })}`)].concat(leadMotion(spec))));
    else {
      out.push(para([S(`${qualityLead(spec, true)} of ${leadCore(spec)}`)].concat(leadDetails(spec, { short }))));
      const bs = beats(spec);
      const tr = ['In the opening moments, ', 'Then ', 'Next, ', 'After that, ', 'In the final seconds, '];
      out.push(bs.map((b, i) => (i === bs.length - 1 ? tr[4] : tr[Math.min(i, 3)]) + b.text.charAt(0).toLowerCase() + b.text.slice(1)).join(' '));
    }
    // 2. supporting subjects
    out.push(para(spec.i2v ? supportMotion(spec) : supportSection(spec, { short })));
    // 3. scene
    const scene = sceneSection(spec, { envN: lim(spec, 2, 3, 4), sky: !short, atmo: L >= 3 });
    if (spec.i2v && spec.place && spec.place.entry) scene.push(S(`The ${noArt(spec.place.short)} remains physically stable, with background objects staying in their original positions`));
    if (spec.motion.length) scene.push(S(`Environmental motion: ${U.list(spec.motion.slice(0, L + 1))}`));
    scene.push(lightSentence(spec, short ? 0 : 2));
    out.push(para(scene.map((x) => fillP(spec, x))));
    // 4. specifics
    out.push(para(propStability(spec).concat(specifics(spec, { details: false, video: true }))));
    // 5. camera
    out.push(S('Camera: ' + cameraLine(spec).replace(/\.$/, '')));
    // 6. realism + technical
    out.push(para([motionRealism(spec), consistencyLine(spec)]));
    out.push(para(videoTech(spec, opts)));
    if (opts.audio !== false) out.push(audioText(spec));
    const text = U.capSentences(out.filter(Boolean).join('\n\n'));
    return { prompt: mustCheck(spec, text), negative: negative(spec, true) };
  }

  // Shot plan for Kling / Runway / Veo, written to pull the model toward real, smooth, camera-filmed footage
  function videoTimeline(spec, opts) {
    const pad = (x) => '00:' + String(x).padStart(2, '0');
    const photo = isPhoto(spec);
    const lines = [];
    if (photo) {
      const lensTxt = spec.lens ? `a ${spec.lens} spherical cinema prime` : 'spherical cinema prime lenses';
      lines.push(`[Format] Photorealistic live-action video, ${spec.duration} seconds, ${spec.aspect}, 24 fps. Real people in a real location, filmed on an ARRI Alexa 35 cinema camera with ${lensTxt} and a 180-degree shutter for natural motion blur. ${ultra(spec) ? 'Ultra-realistic' : 'True-to-life'} detail throughout; this is real camera footage, not animation, not CGI and not a cartoon.${spec.i2v ? ' Animate the reference image faithfully, keeping every detail of it.' : ''}`);
    } else lines.push(`[Format] ${qualityLead(spec, true)}, ${spec.aspect}, with the same ${spec.style.id} look held consistently in every frame.${spec.i2v ? ' Animate the reference image faithfully.' : ''}`);
    lines.push(`[Scene] ${S(leadCore(spec))}`);
    const ld = leadDetails(spec, {});
    if (ld.length) lines.push(`[Lead subject] ${ld.join(' ')}`);
    const sup = supportSection(spec, {});
    if (sup.length) lines.push(`[Supporting] ${sup.join(' ')}`);
    const sc = sceneSection(spec, { envN: 4, sky: true, atmo: true });
    if (sc.length) lines.push(`[Setting] ${sc.join(' ')}`);
    lines.push(`[Camera] ${cameraLine(spec).replace(/\.$/, '')}. One continuous, stabilized take with no cuts; camera movement is slow and deliberate.`);
    beats(spec).forEach((b) => lines.push(`[${pad(b.from)}–${pad(b.to)}] ${b.text}`));
    const mo = spec.motion.concat(spec.subject ? spec.smotion : []).slice(0, 4);
    lines.push(`[Motion & physics] ${hasPeople(spec) ? 'Movements are slow, small and natural, at real-time speed; bodies keep realistic weight, balance and contact with the ground, and hair and fabric react to motion and air. ' : 'Everything moves at real-world speed with believable weight and momentum. '}${mo.length ? S(U.cap(U.list(mo))) : ''}`);
    const sp = propStability(spec).concat(specifics(spec, { details: false, video: true }));
    if (sp.length) lines.push(`[Details] ${sp.join(' ')}`);
    const look = [lightSentence(spec, 2)];
    if (spec.palette) look.push(S(`A palette of ${spec.palette.ph}`));
    if (photo) look.push(S('Natural color science, soft filmic contrast, fine organic film grain, true-to-life skin tones and no oversaturation'));
    lines.push(`[Lighting & color] ${look.join(' ')}`);
    lines.push(`[Realism] ${motionRealism(spec)} ${photo ? S('Real skin texture with pores and fine hair, physically accurate reflections and shadows, and natural lens depth of field') : ''}`);
    lines.push(`[Consistency] ${consistencyLine(spec)}`);
    if (opts.audio !== false) audioText(spec, 'lines').forEach((l) => lines.push(`[Audio] ${l}`));
    const text = lines.map((l) => l.replace(/^(\[[^\]]+\]) (.*)$/, (m, tag, body) => tag + ' ' + U.capSentences(fillP(spec, body)))).join('\n');
    return { prompt: mustCheck(spec, text), negative: negative(spec, true) };
  }

  function videoCompact(spec, opts) {
    const preds = actionPreds(spec).list.slice(0, 3);
    const out = [];
    out.push(S(`${qualityLead(spec, true)} of ${leadCore(spec)}`));
    out.push(...leadDetails(spec, { short: true }).slice(0, 2));
    if (preds.length && !spec.i2v) out.push(preds.map((p) => S(p)).join(' '));
    if (spec.i2v) out.push(...leadMotion(spec).slice(1));
    out.push(...supportSection(spec, { short: true }).slice(0, 2));
    if (spec.motion.length) out.push(S(U.cap(U.list(spec.motion.slice(0, 2)))));
    out.push(S(`${U.cap(spec.move.ph)}, ${noArt(shotPh(spec))}, ${spec.angle.ph}`));
    out.push(lightSentence(spec, 1));
    if (spec.palette) out.push(S(U.cap(spec.palette.ph)));
    out.push(S(U.cap(technicalList(spec, true).slice(0, 3).concat(['smooth natural motion', 'temporally consistent']).join(', '))));
    let text = U.capSentences(fillP(spec, out.join(' ')));
    if (opts && opts.audio !== false) text += '\n\n' + audioText(spec);
    return { prompt: mustCheck(spec, text), negative: negative(spec, true) };
  }

  SC.render = function (spec, opts) {
    opts = opts || {};
    const t = opts.target || (spec.mode === 'video' ? 'prose' : 'natural');
    let r;
    if (spec.mode === 'video') r = t === 'timeline' ? videoTimeline(spec, opts) : t === 'compact' ? videoCompact(spec, opts) : videoProse(spec, opts);
    else r = t === 'sdxl' ? imageSDXL(spec) : t === 'midjourney' ? imageMJ(spec) : imageNatural(spec);
    if (!spec.subject) {
      r.prompt = r.prompt.replace(/separation between subject and background/g, 'separation between foreground and background').replace(/\bthe subject(?!'s)\b/g, 'the focal point').replace(/the subject's/g, "the focal point's");
    }
    if (spec.mode !== 'video') r.audio = audioText(spec);
    r.prompt = r.prompt.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/ ([,.;:])/g, '$1').replace(/\.\./g, '.').trim();
    return r;
  };

  // Builder scene fields are parsed like keywords, and replace keyword mentions of the same kind.
  const REPLACE = { place: ['place', 'region'], region: ['place', 'region'], time: ['time'], weather: ['weather'], style: ['style'], genre: ['genre'], light: ['light'], mood: ['mood'],
    shot: ['shot'], angle: ['angle'], lens: ['lens'], comp: ['comp'], palette: ['palette'], move: ['move'], pace: ['pace'], event: ['event'], season: ['season'] };
  SC.mergeScene = function (parsed, scene) {
    const fields = Object.keys(scene || {}).filter((k) => String(scene[k] || '').trim());
    if (!fields.length) return parsed;
    const forced = [];
    fields.forEach((k) => {
      const p = SC.parse(String(scene[k]));
      p.mentions.forEach((m) => { m.forced = k; m.gi = 1000 + forced.length; m.order = 100000 + forced.length; forced.push(m); });
    });
    const kill = new Set();
    forced.forEach((m) => (REPLACE[m.cat] || []).forEach((c) => kill.add(c)));
    const kept = parsed.mentions.filter((m) => !kill.has(m.cat));
    return Object.assign({}, parsed, { mentions: kept.concat(forced) });
  };

  SC.compile = function (input, opts) {
    opts = opts || {};
    if (!SC.index) SC.buildIndex();
    let parsed = SC.parse(input, { literal: opts.literal });
    parsed = SC.mergeScene(parsed, opts.scene);
    const cast = (opts.cast || []).filter(Boolean);
    const keepText = Object.values(opts.scene || {}).concat(cast.map((c) => Object.values(c).join(' '))).join(' ');
    const spec = SC.infer(parsed, Object.assign({}, opts, { cast, keepText }));
    const out = SC.render(spec, opts);
    return Object.assign(out, { spec, parsed, words: out.prompt.split(/\s+/).filter(Boolean).length });
  };
})();
