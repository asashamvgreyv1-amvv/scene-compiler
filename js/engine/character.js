/* Scene Compiler — characters & wardrobe.
 *  SC.wardrobe : one source of truth for what everyone is wearing. Every auto-generated phrase that
 *                mentions clothing is checked against it, so "western outfit" or "no costume" changes
 *                the whole prompt instead of one sentence.
 *    W.SEXUAL_RE = /\b(sexy|sexual|sex|seductive|sensual|erotic|nude|naked|nudity|topless|bottomless|lingerie|underwear|bra|bralette|bikini|thong|cleavage|provocative|busty|lewd|nsfw|porn\w*|revealing|skimpy|bodycon|stilettos?|slip dress|flirtatious|smoldering|blowjob|cum\w*|piss\w*|orgasm\w*|fetish\w*|genitals?|nipples?|masturbat\w*|intercourse|aroused|spread legs)\b/i;
 *  SC.cast     : turns builder characters (+ keyword hints) into noun phrases and description sentences.
 *  Safety      : if any character is under 12, innerwear, body-part sizing, clothing removal and
 *                sexualised keywords are ignored.
 *    const isMinorText = (t) => /\b(child|kid|teen|teenage|teenager|baby|toddler|minor|pre-teen|preteen|school ?girl|school ?boy)\b/i.test(t || '');
 *    const MINOR_NOUN = /^(girl|boy|child|kid|baby|teenager|teen|toddler)$/;
 */
(function () {
  const SC = globalThis.SC;
  const U = SC.u;

  // ---------------------------------------------------------------- wardrobe
  const W = (SC.wardrobe = {});
  const EXTRA_GARMENTS = ('armor armour robe robes cloak suit spacesuit visor helmet uniform sleeve sleeves collar hood cape boots kurta saree sari ' +
    'dupatta kimono hakama obi turban veil apron shroud habit tunic coat jacket scarf beanie dress gown skirt shirt overalls wetsuit tutu sherwani ' +
    'lehenga chaps hat fedora hoodie jeans trousers pants blazer lapel lapels jersey gloves goggles tiara sash stole shawl pallu hem costume ' +
    'garb chainmail smock scrubs coat trunks pajamas pyjamas lungi dhoti mundu safa ghagra choli odhni kilt sporran toga chiton').split(' ');
  let GSET = null;
  const garments = () => {
    if (!GSET) GSET = new Set(Object.keys(SC.kb.garment || {}).concat(EXTRA_GARMENTS).map((x) => x.toLowerCase()));
    return GSET;
  };
  const CLOTH_RE = /\b(cloth|clothing|clothes|fabric|fabrics|outfit|garment|garments|attire|costume|wardrobe|dressed|hem|sleeves?|collar|pockets?|buttons?|embroider\w*)\b/i;
  const TRAD_RE = /\b(kurta|saree|sari|dupatta|lehenga|sherwani|dhoti|mundu|kimono|yukata|hakama|obi|hanbok|qipao|cheongsam|ao dai|abaya|thobe|kaftan|salwar|churidar|ghagra|choli|odhni|safa|turban|angrakha|zari|kasavu|bandhgala|pheran|agbada|ankara|kente)\b/i;
  W.SEXUAL_RE = /\b(anal|asshole|unattractive|repulsion)\b/i;

  function garmentWords(text) {
    const set = garments();
    const out = [];
    String(text).toLowerCase().split(/[^a-z-]+/).forEach((w) => {
      if (!w) return;
      const s = w.replace(/(es|s)$/, '');
      if (set.has(w)) out.push(w);
      else if (set.has(s)) out.push(s);
    });
    return out;
  }
  W.garmentWords = garmentWords;

  /** state: { mode: 'dressed'|'none', text: all worn text (lowercase), keep: user text (lowercase), western: bool } */
  W.consistent = function (phrase, state) {
    if (!state || !phrase) return true;
    const low = String(phrase).toLowerCase();
    const gw = garmentWords(low);
    if (state.mode === 'none') return !gw.length && !CLOTH_RE.test(low);
    if (state.western && TRAD_RE.test(low) && !TRAD_RE.test(state.text)) return false;
    return gw.every((g) => state.text.includes(g) || state.keep.includes(g));
  };
  W.filter = (list, state) => (list || []).filter((p) => W.consistent(p, state));

  W.NONE_SENTENCE = '{sub} [be] unclothed, presented as a tasteful fine-art figure study with modesty preserved through pose, framing and shadow';

  W.styleEntry = function (label) {
    if (!label) return null;
    const low = String(label).toLowerCase().trim();
    const kb = SC.kb.wstyle || {};
    if (kb[low]) return kb[low];
    for (const e of Object.values(kb)) {
      if (e.id.toLowerCase() === low || (e.syn && e.syn.split('|').includes(low))) return e;
    }
    return null;
  };

  // traditional clothing from the character's own culture
  const TRAD = {
    punjabi: ['a vibrant salwar suit with a phulkari-embroidered dupatta', 'a crisp kurta with a Patiala salwar and a bright turban'],
    bengali: ['a white Tant saree with a red border', 'a white dhoti and a silk panjabi kurta'],
    tamil: ['a rich Kanjeevaram silk saree with temple jewelry', 'a white veshti with a silk angavastram'],
    malayali: ['a cream kasavu saree with a gold border', 'a white mundu with a gold kasavu border'],
    'south indian': ['a rich Kanjeevaram silk saree', 'a white veshti and silk shirt'],
    gujarati: ['a mirror-work chaniya choli', 'a kediyu top with a flared churidar and a bandhani turban'],
    marathi: ['a nine-yard Nauvari saree with a nath nose ring', 'a white kurta, dhoti and a Pheta turban'],
    rajasthani: ['a mirror-worked ghagra with a bright odhni', 'an angrakha with a vivid saffron safa turban'],
    kashmiri: ['an embroidered pheran with a silver-threaded headscarf', 'a woolen pheran and a karakul cap'],
    'northeast indian': ['a hand-woven mekhela chador', 'a hand-woven gamosa over a traditional shirt'],
    'north indian': ['a silk salwar kameez with a dupatta', 'a silk kurta with churidar and a Nehru jacket'],
    indian: ['a silk saree with a contrasting blouse', 'a silk kurta with churidar and a Nehru jacket'],
    pakistani: ['an embroidered shalwar kameez with a chiffon dupatta', 'a starched shalwar kameez with a waistcoat'],
    bangladeshi: ['a Jamdani saree', 'a panjabi kurta and lungi'],
    nepali: ['a gunyu cholo wrap blouse and skirt', 'a daura suruwal with a Dhaka topi cap'],
    'sri lankan': ['an Osariya-draped saree', 'a white sarong with a crisp shirt'],
    tibetan: ['a chuba robe with a striped pangden apron', 'a heavy chuba robe with a sash'],
    japanese: ['a silk kimono with an obi sash', 'a dark kimono with a hakama'],
    korean: ['a flowing hanbok', 'a hanbok with a long vest'],
    chinese: ['an embroidered silk qipao', 'a silk changshan'],
    vietnamese: ['a flowing ao dai', 'an ao dai with a khan dong turban'],
    filipino: ['a Maria Clara gown with butterfly sleeves', 'an embroidered barong tagalog'],
    thai: ['a silk chut thai with a draped sabai', 'a silk suea phraratchathan shirt with a chong kraben'],
    indonesian: ['a batik kebaya', 'a batik shirt with a peci cap'],
    malaysian: ['a baju kurung', 'a baju melayu with a songkok'],
    arab: ['an embroidered abaya with a silk headscarf', 'a white thobe and ghutra'],
    persian: ['an embroidered Qajar-style dress with a sheer chador', 'a long embroidered coat with a sash'],
    turkish: ['an embroidered kaftan with a fez-inspired headpiece', 'a salvar and embroidered vest'],
    egyptian: ['an embroidered galabeya', 'a flowing galabeya'],
    moroccan: ['an ornate takchita kaftan', 'a hooded djellaba'],
    nigerian: ['a vibrant Ankara iro and buba with a gele headwrap', 'a flowing agbada in Ankara print'],
    ghanaian: ['a Kente-cloth dress', 'a toga-style Kente cloth draped over one shoulder'],
    kenyan: ['a bright kanga wrap', 'a checked shuka'],
    maasai: ['a red shuka with layered beaded collars', 'a red shuka with beaded jewelry'],
    ethiopian: ['a white habesha kemis with embroidered tibeb borders', 'a white gabi shawl over a tunic'],
    somali: ['a flowing dirac with a garbasaar shawl', 'a macawis sarong and shirt'],
    mexican: ['an embroidered huipil blouse with a full skirt', 'a charro suit with a sombrero'],
    peruvian: ['a pollera skirt with a woven lliclla shawl', 'a woven poncho and chullo hat'],
    scottish: ['a tartan arisaid wrap', 'a tartan kilt with a sporran'],
    irish: ['an embroidered Celtic dance dress', 'a woolen báinín sweater and flat cap'],
    greek: ['an embroidered folk dress with a headscarf', 'a fustanella kilt with an embroidered vest'],
    russian: ['a sarafan with a kokoshnik headdress', 'a belted kosovorotka shirt'],
    scandinavian: ['a bunad with silver brooches', 'a bunad with embroidered vest'],
    polynesian: ['a floral pareo with a flower crown', 'a lavalava wrap with a shell necklace'],
    maori: ['a woven korowai cloak', 'a woven korowai cloak'],
  };
  W.traditional = function (g, ethnicity, region) {
    const eLow = String(ethnicity || '').toLowerCase();
    const tk = Object.keys(TRAD).sort((a, b) => b.length - a.length).find((k) => eLow.includes(k));
    if (tk) return TRAD[tk][g === 'm' ? 1 : 0];
    let r = null;
    if (ethnicity) {
      const words = String(ethnicity).toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length && !r; i++) {
        const es = SC.lookup(words.slice(i).join(' '));
        const d = es && es.find((e) => e.cat === 'dem' || e.cat === 'region');
        if (d) r = d.region || d;
      }
    }
    r = r || region;
    if (r && r.wear) return typeof r.wear === 'object' ? r.wear[g] || r.wear.f : r.wear;
    if (ethnicity) return `traditional ${ethnicity} attire`;
    return g === 'f' ? 'traditional attire from her culture' : 'traditional attire from his culture';
  };

  // ---------------------------------------------------------------- ages
  const TENS = ['pre teens', 'late teens', 'twenties', 'thirties', 'forties', 'fifties', 'sixties', 'seventies', 'eighties', 'nineties'];
  W.agePhrase = function (age, pos) {
    if (age == null || isNaN(age) || age < 12) return '';
    if (age < 20) return `in ${pos} late teens`;
    if (age >= 100) return 'over a hundred years old';
    const t = Math.floor(age / 10);
    const u = age % 10;
    if (t >= 6) return `in ${pos} ${TENS[t]}`;
    return `in ${pos} ${u <= 3 ? 'early' : u <= 6 ? 'mid-' : 'late'}${u <= 3 || u > 6 ? ' ' : ''}${TENS[t]}`.replace('mid- ', 'mid-');
  };

  // ---------------------------------------------------------------- cast
  const C = (SC.cast = {});
  const GENDERED_ROLE = /\b(queen|king|goddess|god|princess|prince|sorceress|maharani|bitch|sexslave|maharaja|geisha|whore|slut|diva|golddigger|prostitute|sexworker|pornstar|priestess|courtesan|lord|lady|witch|wizard|fisherman|businessman|businesswoman|actress|waitress|monk|nun|bride|groom|mother|father)\b/i;
  const PRONOUNS = {
    f: { sub: 'she', obj: 'her', pos: 'her', self: 'herself' },
    m: { sub: 'he', obj: 'him', pos: 'his', self: 'himself' },
  };
  const PLURAL_P = { sub: 'they', obj: 'them', pos: 'their', self: 'themselves', plural: true };
  const NUMW = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };
  const ORDW = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  const val = (x) => (x == null ? '' : Array.isArray(x) ? U.list(x.map((y) => String(y).trim()).filter(Boolean)) : String(x).trim());
  const isMinorText = (t) => /\b(child|kid|toddler)\b/i.test(t || '');
  const MINOR_NOUN = /^(child|kid|toddler)$/;
  const PLURAL_NOUN = { woman: 'women', man: 'men', person: 'people', child: 'children' };
  const pluralize = (n) => { const ws = n.split(' '); const l = ws.pop(); return ws.concat([PLURAL_NOUN[l] || U.plural(l)]).join(' '); };

  function lookupPerson(text) {
    if (!text) return null;
    const low = text.toLowerCase();
    const es = SC.lookup(low) || SC.lookup(low.split(' ').pop());
    return es ? es.find((e) => e.cat === 'person') || null : null;
  }
  function pickG(v, g) {
    if (!v) return null;
    if (typeof v === 'object') return v[g] || v.n || v.f || v.m;
    return v;
  }

  C.isMinor = (c) => {
    const age = c.age === '' || c.age == null ? null : +c.age;
    if (age != null) return age < 12;
    return isMinorText(c.ageText) || MINOR_NOUN.test(String(c.noun || ''));
  };

  // where a supporting character stands relative to the lead
  const POS_PH = { left: 'to {pos} left', right: 'to {pos} right', behind: 'behind {obj}', front: 'in front of {obj}', beside: 'beside {obj}', around: 'around {obj}', flank: 'at {pos} side', center: 'at the center of the frame', background: 'in the background', foreground: 'in the foreground' };
  C.posPhrase = (pos, leadP) => (POS_PH[pos] ? U.fill(POS_PH[pos], leadP || { pos: 'the lead’s', obj: 'the lead' }) : '');

  /**
   * env: { kw: { style(entry), western, wear, wearIndex, none, plain, age }, region, eventWear, outWear, school, minorAny }
   */
  C.build = function (cast, env) {
    const kw = env.kw || {};
    const chars = cast.map((c, i) => prep(c, i));
    const counts = {};
    chars.forEach((ch) => (counts[ch.key] = (counts[ch.key] || 0) + 1));
    const seen = {};
    chars.forEach((ch) => {
      seen[ch.key] = (seen[ch.key] || 0) + 1;
      const many = ch.count > 1;
      const base = many ? `${!ch.vague && NUMW[ch.count] ? NUMW[ch.count] + ' ' : ''}${ch.keyPl}` : ch.key;
      ch.ref = counts[ch.key] > 1 ? `the ${ORDW[seen[ch.key] - 1] || 'next'} ${many ? ch.keyPl : ch.key}` : `the ${base}`;
      if (many) {
        ch.P = Object.assign({ S: ch.ref }, PLURAL_P);
        ch.P1 = Object.assign({ S: 'one', plural: false }, ch.g === 'n' ? { sub: 'one', obj: 'them', pos: 'their', self: 'themselves' } : PRONOUNS[ch.g]);
      } else if (ch.g === 'n') ch.P = { S: ch.ref, sub: ch.ref, obj: 'them', pos: 'their', self: 'themselves', plural: false };
      else ch.P = Object.assign({ S: ch.ref, plural: false }, PRONOUNS[ch.g]);
    });
    return chars;

    function prep(c, i) {
      const g = c.gender === 'm' ? 'm' : c.gender === 'n' ? 'n' : 'f';
      const count = Math.max(1, +c.count || 1);
      const many = count > 1;
      const pr = many ? PLURAL_P : g === 'n' ? { pos: 'their' } : PRONOUNS[g];
      let age = c.age === '' || c.age == null ? null : +c.age;
      if (age == null && i === 0 && kw.age != null) age = kw.age;
      const ageText = val(c.ageText);
      const nounIn = String(c.noun || '').toLowerCase();
      const minor = age != null ? age < 12 : isMinorText(ageText) || MINOR_NOUN.test(nounIn);
      let noun;
      if (minor) {
        if (age != null && age <= 2) noun = g === 'm' ? 'baby boy' : g === 'f' ? 'baby girl' : 'baby';
        else if ((age != null && age >= 13) || nounIn === 'teenager') noun = g === 'm' ? 'teenage boy' : g === 'f' ? 'teenage girl' : 'teenager';
        else noun = g === 'm' ? 'boy' : g === 'f' ? 'girl' : 'child';
      } else if (/^(mother|father)$/.test(nounIn)) noun = nounIn;
      else noun = g === 'f' ? 'woman' : g === 'm' ? 'man' : 'person';
      const elderly = /^old (man|woman)$/.test(nounIn) && age == null;
      const adult = !minor && (MINOR_NOUN.test(nounIn) || /\b(kid|baby)/.test(c.rawNoun || '') || env.school || env.minorAny);
      const prof = val(c.profession);
      const profE = c.profEntry || lookupPerson(prof);
      const eth = val(c.ethnicity);
      const race = val(c.race) && !/^human$/i.test(val(c.race)) ? val(c.race) : '';
      const descriptors = (c.descriptors || []).filter((d) => !(minor && W.SEXUAL_RE.test(d)) && !/^(adult|elderly)$/i.test(d));
      const agePh = minor ? '' : W.agePhrase(age, pr.pos);
      const minorAge = minor && age != null && age > 2 && !many ? `${age}-year-old` : '';
      const head = prof && !minor ? prof : noun;
      const words = [minorAge, adult ? 'adult' : '', elderly ? 'elderly' : ''].concat(descriptors, [eth, race]);
      if (prof && !minor && !agePh && !GENDERED_ROLE.test(prof) && g !== 'n') words.push(g === 'f' ? 'female' : 'male');
      words.push(many ? pluralize(head) : head);
      let np = words.filter(Boolean).join(' ');
      np = many ? `${!c.vague && NUMW[count] ? NUMW[count] + ' ' : count > 10 ? 'a group of ' : ''}${np}` : U.a(np);
      if (agePh) np += ' ' + agePh;
      if (ageText) np += ', ' + ageText + ',';
      if (minor && prof) np += ' dressed as ' + U.a(prof);
      const key = head.split(' ').pop();

      // ---------- wardrobe ----------
      const piece = (k) => { const x = val(c[k]); return minor && W.SEXUAL_RE.test(x) ? '' : x; };
      const inner = minor ? '' : piece('innerwear');
      const hasPieces = ['outfit', 'top', 'bottom', 'outerwear', 'footwear'].some((k) => piece(k)) || !!inner;
      const kwWear = val(c.wear) || (i === kw.wearIndex && kw.wear ? kw.wear : '');
      let styleE = W.styleEntry(c.wardrobeStyle) || (c.wardrobeStyle ? null : kw.style);
      const customStyle = c.wardrobeStyle && !W.styleEntry(c.wardrobeStyle) ? val(c.wardrobeStyle) : '';
      if (styleE && styleE.adult && minor) styleE = W.styleEntry('summer resort wear');
      let mode = 'dressed';
      let core = '';
      let auto = false;
      if (kw.none && !minor && !hasPieces && !kwWear && !c.wardrobeStyle) mode = 'none';
      else if (hasPieces) {
        const top = piece('top'), bottom = piece('bottom');
        core = piece('outfit') || (top && bottom ? `${top} with ${bottom}` : top || bottom);
        if (!core && (kwWear || styleE)) core = kwWear || pickG(styleE.wear, g);
        if (piece('outerwear')) core = core ? `${piece('outerwear')} over ${core}` : piece('outerwear');
        if (inner) core += `, layered with ${inner}`;
      } else if (kwWear) core = kwWear;
      else if (customStyle) core = U.a(`${customStyle} outfit`);
      else if (styleE) core = styleE.trad ? W.traditional(g === 'n' ? 'f' : g, eth, env.region) : pickG(styleE.wear, g);
      else if (profE && profE.wear && !kw.plain) core = pickG(profE.wear, g);
      else if (env.eventWear && !kw.western) core = pickG(env.eventWear, g);
      else if (env.region && env.region.wear && !kw.western && i === 0) core = pickG(env.region.wear, g);
      else if (env.outWear) core = pickG(env.outWear, g);
      else {
        auto = true;
        core = kw.plain ? 'simple everyday clothes with no costume elements' : i === 0 ? 'a simple, contemporary outfit in natural fabrics' : 'contemporary smart-casual clothing';
      }
      const color = piece('outfitColor');
      if (core && color) core += ' ' + color;
      const foot = piece('footwear');
      const extras = [piece('accessories'), piece('jewelry')].filter((x) => x && !/^no jewelry$/i.test(x));

      // ---------- body ----------
      let bodyType = piece('bodyType');
      if (minor && /curvy|hourglass|bust|pregnant|plus-size|bodybuilder|full figure|figure/i.test(bodyType)) bodyType = '';
      const intimate = minor || mode === 'none';
      const parts = [bodyType, piece('shoulders'), g === 'm' ? piece('chest') : intimate ? '' : piece('bust'), intimate ? '' : piece('waist'), intimate ? '' : piece('hips'), piece('arms'), piece('legs'), piece('muscle'), piece('hands')].filter(Boolean);

      const ch = {
        c, i, g, count, vague: !!c.vague, age, minor, adult, noun, np, key, keyPl: pluralize(key), prof, profE, eth, race, mode, core, autoWear: auto, foot, extras, bodyType,
        head: piece('headwear'), parts, height: piece('height'),
        expr: piece('expression'), pose: piece('pose'), gaze: piece('gaze'), prop: piece('prop'), position: val(c.position),
        fantasy: [piece('fantasy')].filter(Boolean), aura: piece('aura'),
        look: profE && !kw.plain ? U.arr(profE.look) : [],
        hasFace: ['faceShape', 'skin', 'eyeShape', 'eyeColor', 'brows', 'nose', 'lips'].some((k) => piece(k)),
        acts: [], memberInfo: null,
      };
      ch.outfitText = mode === 'none' ? '' : [core, foot, ch.head].concat(extras).filter(Boolean).join(' ');
      return ch;
    }
  };

  // Description sentences for one character (or one group of identical characters).
  C.sentences = function (ch, opts) {
    opts = opts || {};
    const P = ch.P;
    const many = ch.count > 1;
    const V = (b) => U.conj(b, many);
    const Ref = U.cap(ch.ref);
    const Sub = U.cap(P.sub);
    const c = ch.c;
    const out = [];
    const v = (k) => { const x = val(c[k]); return ch.minor && W.SEXUAL_RE.test(x) ? '' : x; };
    let first = !opts.pronounFirst;
    const who = () => { const w = first ? Ref : Sub; first = false; return w; };
    const poss = () => { const w = first ? `${Ref}'s` : U.cap(P.pos); first = false; return many ? U.cap(P.pos) : w; };

    // face
    const eyes = [v('eyeShape'), v('eyeColor')].filter(Boolean).join(' ');
    const face = [v('faceShape') ? U.a(v('faceShape')) + ' face' : '', v('skin') ? v('skin') + ' skin' : '', eyes ? eyes + ' eyes' : '', v('brows'), v('nose'), v('lips')].filter(Boolean);
    if (!ch.hasFace && opts.defaults) {
      if (ch.eth) face.push(`realistic ${ch.eth} features`);
      if (opts.photo && face.length) face.push('natural skin texture');
    }
    const fh = v('facialHair') === 'clean-shaven' ? 'a clean-shaven jaw' : v('facialHair');
    const withs = [v('makeup'), ch.g === 'm' || v('facialHair') ? fh : '', v('skinDetails')].filter(Boolean);
    if (face.length) out.push(`${who()} ${V('have')} ${U.list(face)}` + (withs.length ? `, with ${U.list(withs)}` : ''));
    else if (withs.length) out.push(`${who()} ${V('have')} ${U.list(withs)}`);
    if (ch.look.length && !opts.short) out.push(`${who()} ${V('have')} ${U.list(ch.look.slice(0, 2))}`);

    // hair
    const hs = v('hairStyle'), hc = v('hairColor');
    if (hs || hc) {
      if (/completely bald/i.test(hs)) out.push(`${who()} ${V('be')} completely bald`);
      else if (/shaved head|turban-covered/i.test(hs)) out.push(`${who()} ${V('have')} ${hs}`);
      else if (hs && /\bhair\b/i.test(hs)) out.push(`${who()} ${V('have')} ${hs}` + (hc ? ` in ${hc}` : ''));
      else if (hs) out.push(`${poss()} ${hc ? hc + ' ' : ''}hair is styled in ${hs}`);
      else out.push(`${poss()} hair is ${hc}`);
    }

    // body
    if (ch.height && ch.parts.length) out.push(`${who()} ${V('be')} ${ch.height}, with ${U.list(ch.parts)}`);
    else if (ch.height) out.push(`${who()} ${V('be')} ${ch.height}`);
    else if (ch.parts.length) out.push(`${who()} ${V('have')} ${U.list(ch.parts)}`);

    // wardrobe
    if (ch.mode === 'none') out.push(U.fill(W.NONE_SENTENCE, Object.assign({}, P, { sub: who() })));
    else if (ch.core && !(opts.skipAutoWear && ch.autoWear)) {
      const w = who();
      let t = many && /^(a|an) /i.test(ch.core) ? `${w} ${V('be')} each dressed in ${ch.core}` : `${w} ${V('wear')} ${ch.core}`;
      if (ch.foot) t += /barefoot/i.test(ch.foot) ? ` and ${many ? 'go' : 'goes'} barefoot` : ` and ${ch.foot}`;
      if (ch.head) t += `, topped with ${ch.head}`;
      if (ch.extras.length) t += `, accessorized with ${U.list(opts.short ? ch.extras.slice(0, 2) : ch.extras)}`;
      out.push(t);
    }

    // fantasy
    if (ch.fantasy.length || ch.aura) {
      if (ch.fantasy.length) out.push(`${who()} ${V('have')} ${U.list(ch.fantasy)}` + (ch.aura ? `, surrounded by ${ch.aura}` : ''));
      else out.push(`${who()} ${V('be')} surrounded by ${ch.aura}`);
    }

    // pose, gaze, prop, expression
    if (!opts.noPose) {
      const doing = [ch.pose, ch.gaze, ch.prop ? 'holding ' + ch.prop : ''].filter(Boolean);
      const expr = ch.expr || (opts.defaults && opts.defaultExpr) || '';
      if (doing.length) out.push(`${who()} ${V('be')} ${U.list(doing)}` + (expr ? `, with ${expr}` : ''));
      else if (expr) out.push(`${who()} ${V('have')} ${expr}`);
    }
    return out.map((s) => U.sentence(U.fill(s, P)));
  };

  // "Three adult Black men in their thirties are positioned around her. One stands tall to her left, another …"
  C.supportLines = function (ch, leadP, opts) {
    opts = opts || {};
    const out = [];
    const many = ch.count > 1;
    const NP = U.cap(ch.np);
    const mInfo = ch.memberInfo || [];
    const memberHas = mInfo.some((m) => m.pos || m.acts.length || m.wear);
    const groupAct = ch.acts[0];
    const posPh = C.posPhrase(ch.position, leadP);
    if (many && memberHas) {
      const around = mInfo.some((m) => m.pos && !/background|foreground|center/.test(m.pos));
      out.push(`${NP} are ${around ? `positioned around ${leadP.obj}` : groupAct ? groupAct.ing : 'part of the scene'}`);
      const ORD = ch.count === 2 ? ['one', 'the other'] : ['one', 'another', 'the third', 'the fourth', 'the fifth', 'the sixth', 'the seventh', 'the eighth'];
      let lastDo = groupAct ? groupAct.doP : null;
      const parts = mInfo.map((mb, k) => {
        const a = mb.acts[0];
        if (a) lastDo = a.doP;
        const verb = lastDo ? U.fill(lastDo, Object.assign({}, ch.P1 || {}, { plural: false, o: a ? a.oNP : '' })) : mb.pos ? 'stands' : '';
        const where = C.posPhrase(mb.pos, leadP);
        const wear = mb.wear ? `, wearing ${mb.wear}` : '';
        return verb || where ? `${ORD[k] || 'another'} ${[verb, where].filter(Boolean).join(' ')}${wear}` : '';
      }).filter(Boolean);
      if (parts.length) out.push(U.list(parts));
    } else {
      const doing = [groupAct ? groupAct.ing : '', posPh].filter(Boolean).join(' ');
      out.push(`${NP} ${U.conj('be', many)} ${doing || (many ? 'also in the scene' : 'also in the scene')}`);
    }
    return out.map((s) => U.sentence(U.fill(s, ch.P)));
  };

  C.tags = function (ch) {
    const c = ch.c;
    const v = (k) => { const x = val(c[k]); return ch.minor && W.SEXUAL_RE.test(x) ? '' : x; };
    const t = [ch.np.replace(/^(a|an) /, '')];
    ['faceShape', 'skin', 'eyeColor', 'hairColor', 'hairStyle', 'bodyType', 'facialHair', 'makeup'].forEach((k) => {
      if (k === 'bodyType') { if (ch.bodyType) t.push(ch.bodyType); return; }
      if (!v(k)) return;
      if (k === 'faceShape') t.push(v(k) + ' face');
      else if (k === 'skin') t.push(v(k) + ' skin');
      else if (k === 'eyeColor') t.push(v(k) + ' eyes');
      else if (k === 'hairColor') t.push(v(k) + ' hair');
      else t.push(v(k));
    });
    ch.acts.forEach((a) => t.push(a.ing));
    if (ch.mode !== 'none' && ch.core) t.push('wearing ' + [ch.core, ch.foot, ch.head].filter(Boolean).join(', '));
    t.push(...ch.fantasy);
    if (ch.aura) t.push(ch.aura);
    if (ch.expr) t.push(ch.expr);
    if (ch.pose) t.push(ch.pose);
    return t.map((x) => U.fill(x, ch.P));
  };
})();
