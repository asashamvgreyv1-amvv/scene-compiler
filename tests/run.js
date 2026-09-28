// Node harness: loads the browser scripts into a sandbox, compiles a battery of
// keyword inputs across targets, checks for grammar/template defects and writes samples.
// Usage: node tests/run.js [--print] [--only "keywords"]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'js/engine/util.js', 'js/engine/lexicon.js',
  'js/kb/beings.js', 'js/kb/things.js', 'js/kb/places.js', 'js/kb/regions.js', 'js/kb/atmosphere.js',
  'js/kb/moods.js', 'js/kb/camera.js', 'js/kb/styles.js', 'js/kb/modifiers.js', 'js/kb/actions.js', 'js/kb/rules.js', 'js/kb/wardrobe.js',
  'js/engine/parse.js', 'js/engine/character.js', 'js/engine/infer.js', 'js/engine/render.js', 'js/builder/options.js',
];
const ctx = vm.createContext({ console });
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const SC = ctx.SC;
SC.buildIndex();

const INPUTS = [
  'Indian woman, rain, Mumbai, cinematic, walking',
  'rocket launch sunset',
  'lonely guy looking back while leaving childhood home',
  'cat astronaut floating in space, watercolor',
  'samurai, cherry blossoms, duel, dawn',
  'chai wala Delhi street night',
  'dragon over castle, storm, epic',
  'old fisherman mending nets at harbor, golden hour, film photography',
  'perfume bottle, marble, luxury, studio',
  'ramen, steam, overhead',
  'tiger stalking through jungle, mist',
  'couple dancing on rooftop, city lights, romantic, night',
  'cyberpunk hacker, neon alley, rain',
  'misty pine forest at dawn',
  'little girl with red balloon in park, pixar',
  'holi festival, crowd, colors, slow motion',
  'astronaut on mars, dust storm',
  'monk meditating in himalayas, snow',
  'vintage car, havana, sunset',
  'ballerina, stage, spotlight, dramatic',
  'owl on branch, moonlight',
  'whale underwater, sunbeams',
  'kid flying kite on beach, goa',
  'robot reading book in library, cozy',
  'woman in kitchen cooking, morning, window light',
  'xylophone quantum glowing jellyfish',
  'ocen wavess stormy',
  'Diwali, family, balcony, diyas, night',
  'wolf howling at full moon, snow, 85mm',
  'motorcycle racing desert highway, drone',
  'grandmother knitting by fireplace, winter, cozy',
  'two kids playing cricket in a village lane, afternoon',
  'steampunk airship above victorian london, fog',
  'bride and groom, wedding, jaipur palace, golden hour',
  'abandoned hospital corridor, horror, flickering fluorescent',
  'sneakers, product shot, neon, black background',
  'a scientist in a lab looking at glowing liquid',
  'girl reading book under banyan tree, monsoon, ghibli',
  'man in red hoodie skateboarding, tokyo, night, 35mm, low angle',
  'ganesh chaturthi procession, mumbai, dhol, crowd',
  'lone lighthouse on cliff, stormy sea, night, long exposure',
  'hummingbird drinking nectar from hibiscus, macro',
  'viking longship in fjord, dawn, mist, epic',
  'cyberpunk street food vendor, rain, neon, blade runner',
  'woman wearing yellow saree on rooftop, kite festival, jaipur',
  'astronaut horse riding on mars',
  'sad clown sitting alone in empty circus tent',
  'coffee cup on wooden table, morning light, flat lay',
  'kathakali dancer performing, temple, firelight, kerala',
  'city skyline timelapse from day to night',
];
const TARGETS = [
  { mode: 'image', target: 'natural' }, { mode: 'image', target: 'sdxl' }, { mode: 'image', target: 'midjourney' },
  { mode: 'video', target: 'prose', audio: true }, { mode: 'video', target: 'timeline' }, { mode: 'video', target: 'compact' },
];

const BAD = [
  [/undefined|null|NaN|\[object/, 'template leak'],
  [/\{[a-zA-Z]+\}|\[[a-z]+\]/, 'unfilled placeholder'],
  [/\b(a|an) (a|an|the)\b/i, 'double article'],
  [/\ba [aeiou]\w/i, 'a+vowel'],
  [/\ban [bcdfgjklmnpqrstvwxz]\w/i, 'an+consonant'],
  [/ ,|,,|\.\.|, \./, 'punctuation'],
  [/\b(\w+) \1\b/i, 'repeated word'],
  [/\b(she|he|it) (walk|wear|have|stand|sit|run|keep|continue)\b/i, 'agreement'],
  [/\bthey (walks|wears|has|stands|sits|runs|keeps|continues|is)\b/i, 'agreement'],
];
const OK_A_VOWEL = /\ba (one|uni|use|usu|eu|u-)/i;

const args = process.argv.slice(2);
const print = args.includes('--print');
const onlyIdx = args.indexOf('--only');
const inputs = onlyIdx >= 0 ? [args[onlyIdx + 1]] : INPUTS;
let issues = 0;
let md = '# Scene Compiler — sample outputs\n\n';
for (const input of inputs) {
  md += `## \`${input}\`\n\n`;
  for (const t of TARGETS) {
    for (const detail of [1, 2, 3]) {
      if (detail !== 2 && !(t.target === 'natural' || t.target === 'prose')) continue;
      let r;
      try {
        r = SC.compile(input, Object.assign({ seed: 7, detail }, t));
      } catch (e) {
        issues++;
        console.log(`CRASH [${t.target} d${detail}] ${input}\n  ${e.stack.split('\n').slice(0, 3).join('\n  ')}`);
        continue;
      }
      for (const [re, name] of BAD) {
        const m = r.prompt.match(re);
        if (m && !(name === 'a+vowel' && OK_A_VOWEL.test(m[0]))) {
          issues++;
          const i = r.prompt.indexOf(m[0]);
          console.log(`ISSUE ${name} [${t.target} d${detail}] ${input}\n  …${r.prompt.slice(Math.max(0, i - 60), i + 60).replace(/\n/g, ' ')}…`);
        }
      }
      if (detail === 2) {
        md += `**${t.mode} / ${t.target}** (${r.words} words)\n\n\`\`\`\n${r.prompt}\n\`\`\`\n\n`;
        if (print) console.log(`\n=== ${input} [${t.mode}/${t.target}] ===\n${r.prompt}`);
      }
    }
  }
  const r = SC.compile(input, { seed: 7, detail: 2 });
  md += `Negative: \`${r.negative}\`\n\n`;
}
// ---------- builder fuzz: random casts + scene fields ----------
const O = SC.OPT;
const flat = (v, g) => { if (!v) return []; if (!Array.isArray(v) && (v.f || v.m)) v = v[g] || v.f; if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : x.n)); return Object.values(v).flat().map((x) => (typeof x === 'string' ? x : x.n)); };
const FIELDS = { ethnicity: 'ethnicity', profession: 'profession', race: 'race', faceShape: 'faceShape', skin: 'skin', eyeShape: 'eyeShape', eyeColor: 'eyeColor', brows: 'brows', nose: 'nose', lips: 'lips', makeup: 'makeup', facialHair: 'facialHair', skinDetails: 'skinDetails', hairStyle: 'hairStyle', hairColor: 'hairColor', bodyType: 'bodyType', height: 'height', wardrobeStyle: 'wardrobeStyle', outfit: 'outfit', top: 'top', bottom: 'bottom', outerwear: 'outerwear', innerwear: 'innerwear', footwear: 'footwear', headwear: 'headwear', accessories: 'accessories', jewelry: 'jewelry', outfitColor: 'outfitColor', expression: 'expression', pose: 'pose', gaze: 'gaze', prop: 'prop', fantasy: 'fantasy', aura: 'aura' };
const PARTS = { shoulders: 'shoulders', chest: 'chest_m', bust: 'bust_f', waist: 'waist', hips: 'hips', arms: 'arms', legs: 'legs', muscle: 'muscle', hands: 'hands' };
const rnd = SC.u.rng(12345);
const pickR = (a) => a[Math.floor(rnd() * a.length)];
let fuzzIssues = 0;
const fuzzN = args.includes('--fuzz') ? 600 : 150;
for (let n = 0; n < fuzzN; n++) {
  const cast = [];
  const k = 1 + Math.floor(rnd() * 3);
  for (let j = 0; j < k; j++) {
    const g = rnd() < 0.5 ? 'f' : 'm';
    const c = { gender: g };
    if (rnd() < 0.7) c.age = Math.floor(rnd() * 90) + 1;
    Object.keys(FIELDS).forEach((f) => { if (rnd() < 0.35) { const opts = flat(O[FIELDS[f]], g); if (opts.length) c[f] = pickR(opts); } });
    Object.keys(PARTS).forEach((f) => { if (rnd() < 0.25) c[f] = pickR(O.parts[PARTS[f]]); });
    cast.push(c);
  }
  const scene = {};
  if (rnd() < 0.5) scene.place = pickR(Object.values(O.scene.background).flat());
  if (rnd() < 0.3) scene.time = pickR(Object.keys(SC.kb.time));
  if (rnd() < 0.3) scene.style = pickR(Object.keys(SC.kb.style));
  const kw = rnd() < 0.5 ? pickR(INPUTS) : pickR(['', 'no costume', 'western outfit', 'no apparel', 'rain, no people', 'dancing, night', 'walking on beach']);
  const t = pickR(TARGETS);
  let r;
  try { r = SC.compile(kw, Object.assign({ seed: n, detail: 1 + (n % 3), cast, scene }, t)); }
  catch (e) { fuzzIssues++; console.log('FUZZ CRASH', JSON.stringify({ kw, cast, scene }).slice(0, 400), e.stack.split('\n').slice(0, 3).join(' | ')); continue; }
  for (const [re, name] of BAD) {
    const m = r.prompt.match(re);
    if (m && !(name === 'a+vowel' && OK_A_VOWEL.test(r.prompt.slice(r.prompt.indexOf(m[0]), r.prompt.indexOf(m[0]) + 12)))) {
      fuzzIssues++;
      const i = r.prompt.indexOf(m[0]);
      if (fuzzIssues < 25) console.log(`FUZZ ${name} '${m[0]}' [${t.target}] …${r.prompt.slice(Math.max(0, i - 70), i + 60).replace(/\n/g, ' ')}…`);
    }
  }
  // safety: minors never get innerwear, body-part sizing or a no-clothing description
  (r.spec.subject && r.spec.subject.cast || []).filter((ch) => ch.minor).forEach((ch) => {
    const own = SC.cast.sentences(ch).join(' ') + ' ' + SC.cast.tags(ch).join(' ');
    if (/\b(unclothed|figure study|bust|bralette|lingerie|camisole layer|hourglass|curvy|flirtatious|smoldering|stilettos)\b/i.test(own)) {
      fuzzIssues++;
      console.log('FUZZ SAFETY', own.slice(0, 300));
    }
  });
}
issues += fuzzIssues;
console.log(`builder fuzz: ${fuzzN} random casts — ${fuzzIssues} issue(s)`);

fs.writeFileSync(path.join(__dirname, 'samples.md'), md);
console.log(`\n${inputs.length} inputs × targets checked — ${issues} issue(s). Samples → tests/samples.md`);
process.exitCode = issues ? 1 : 0;
