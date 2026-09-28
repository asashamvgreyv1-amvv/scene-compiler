# Scene Compiler

Keywords in, detailed image and video prompts out, using no AI at all. It is a
deterministic, rule-based "visual scene compiler" that runs entirely in the browser.

```
"lonely guy looking back while leaving childhood home"
        │
        ▼  parse      typed mentions: mood · person · action · while · action · place
        ▼  infer      weighted votes + ~75 relationship rules → a full scene spec
        ▼  render     target-specific natural language (Flux / SDXL / MJ / Veo / Kling / Wan)
        ▼
"A richly detailed photograph depicting a lonely man looking back over his shoulder
 while leaving his modest childhood home at dusk. He wears …"
```

## Run it

Open `index.html` in a browser; there are no dependencies and no build step. If your browser
blocks local scripts, serve the folder instead:

```bash
node serve.js 8765
```

Then open http://localhost:8765.

## How it works

| Stage | File | What it does |
|---|---|---|
| Lexicon | `js/engine/lexicon.js` | Indexes every concept plus its synonyms, plurals and verb forms (~8,000 phrases) |
| Parser | `js/engine/parse.js` | Longest-phrase matching, typo tolerance, plurals, numbers, and cue words (`in/under/by` → setting, `with` → companion/prop, `wearing`/garments → wardrobe, `while` → secondary action). Compound settings ("village lane") merge. Unknown words are kept verbatim as elements, actions (`-ing`) or modifiers. |
| Inference | `js/engine/infer.js` | Every concept casts weighted votes into slots (time, key light, shot, lens, palette, wardrobe, camera move…). Your keywords vote at weight 100 so they always win; inferred defaults compete by weight with a seeded tie-break. Forward-chained rules fire on tag combinations (`rain + urban + night` → neon reflections in puddles; `rain + india` → monsoon). |
| Render | `js/engine/render.js` | Grammar-aware sentence templates (articles, pronouns, verb agreement, adjective order) produce prose, SD tag lists, Midjourney params, or timed video beats. |
| Knowledge base | `js/kb/*.js` | ~1,000 concepts: people/roles, animals, objects, food, places, 60 regions (India-rich), time, weather, festivals, moods, 45 styles, genres/eras, camera, lighting, palettes, actions, plus rules |

**Accuracy guarantee:** every keyword you type ends up in the prompt. Recognised concepts are
rendered explicitly, and anything the knowledge base doesn't know is carried through verbatim.
A final check appends anything that would otherwise be dropped.

**Determinism:** the same keywords, seed and settings always produce the same prompt. The ↻ buttons
in the Scene spec panel reroll one inferred choice at a time; choices locked by your keywords (🔒)
never move.

## Character & scene builder

- **Characters:** add up to 8 women and men. Each character has its own sections: Identity (age slider, bracket dropdown and range buttons; ethnicity; profession; fantasy race), Face (face-shape sketches, skin-tone swatches including fantasy tones, eyes, brows, nose, lips, makeup, facial hair, marks), Hair, Body (build, height and per-part sizing), Wardrobe (style, full outfit/costume, top, bottom, outerwear, innerwear, footwear, headwear, accessories, jewellery, colours), Expression & pose (including fantasy poses), and Fantasy extras (wings, horns, auras).
- **Scene:** setting, time, weather, festival, lighting, mood, art style, genre, shot, angle, lens, composition, palette, and camera move and pace for video.
- Every dropdown is searchable, and its first choice is **Type your own**. Accessories, jewellery, makeup, skin details, fantasy features and effects allow several choices.
- Leaving a field empty lets the engine infer it. If your keywords supply a value, the empty field shows it as “↳ Mexican · from keywords”; pick something to override it.
- Keywords and builder choices merge. Builder scene choices replace conflicting keywords. Keyword roles and origins ("Indian", "astronaut") flow into the cast when those fields are empty.

## Wardrobe consistency & negation

All clothing is resolved once per character, and every other clothing reference in the prompt is checked against it:
weather effects on fabric, motion ("her kurta sways"), poses, role details ("scuffed fabric on the suit"), video consistency lines and SD tags.

- `western outfit`, `streetwear`, `traditional`, `business formal` and so on set the wardrobe style. Regional or festival clothing yields to it, and traditional garment words disappear from the rest of the prompt.
- `no costume` gives plain everyday clothes and drops costume pieces, props and role gear.
- `no apparel` / `no clothing` removes every clothing reference and describes an adult as a tasteful fine-art figure study.
- `no rain`, `without people`, `no umbrella` and the like remove that concept everywhere and add it to the negative prompt.

**Under-18 safeguard:** if any character is under 18 (by age, bracket, or words like girl/boy/child/teen), innerwear, bust/waist/hip sizing, curvy body types, clothing removal and suggestive words (from keywords or builder fields) are ignored, and the negative prompt says so.

## Prompt structure

Every format (natural, SD tags, Midjourney, and the three video formats) is written in the same order:

1. **Quality and medium first**, built from your words: `ultra realistic, cinematic, 4k` → "Ultra-realistic cinematic photograph…"
2. **The lead subject** and what they're doing, then their face, hair, body, wardrobe, expression and pose
3. **Supporting subjects**, with where each one stands relative to the lead
4. **The scene**: setting, sky, atmosphere, and who is the visual focus
5. **Specifics**: props and how they're held, action realism, fine details
6. **Camera, composition, light and colour**
7. **Technical quality**: resolution, dynamic range, "no artificial CGI appearance"

Negative prompts are contextual. They cover people, groups (duplicated or missing people), each prop ("distorted smartphone"), clothing, lighting and framing, plus temporal artefacts for video. The video **image-to-video** toggle writes the prompt as subtle motion on a stable scene, for animating a reference image.

**Who's who in free keywords.** `mexican girl in 20s, 3 black men in 30s, she is kneeling…, 1 man standing tall on one side, other on the other side, one behind her` is understood per person:
- ages attach to the nearest person;
- "she" refers back to the woman;
- "1 man", "other" and "one" are members of the group of three, each with their own position;
- an adult age turns "girl" into "adult woman".

## Output targets

- **Image:** Natural prose (Flux, GPT-Image, Imagen, Draw Things), SD tags with weights (SDXL / ComfyUI), Midjourney (`--ar`, `--style raw` / `--niji`, `--no`)
- **Video:** Prose (Veo, Sora, Runway), Timeline with timestamps (Kling, Runway, shot lists), Compact (Wan, LTX, Hunyuan)
- Negative prompt for every target; Scene JSON for scripting.

## Extending the knowledge base

Add an entry to the relevant `js/kb/*.js` file. For example, a new place:

```js
'stepwell': O({ syn: 'baori|vav|step well', prep: 'in', via: 'down', adj: ['ancient', 'geometric'],
  env: ['descending flights of symmetrical stone steps', 'carved pillared galleries'],
  light: ['a shaft of daylight falling to the water far below'],
  motion: ['ripples cross the green water below'], sound: ['echoing footsteps'], tags: 'india historic' }),
```

A new relationship rule goes in `js/kb/rules.js`:

```js
{ if: 'stepwell night', add: { light: ['oil lamps flickering on every landing'] } },
```

Then run the regression suite:

```bash
node tests/run.js
```

It compiles 50 inputs × 6 targets × 3 detail levels plus 150 random builder casts (`--fuzz` for 600), checks the under-18 safeguard, flags template leaks, article/agreement errors
and repeated words, and writes every output to `tests/samples.md`. To see one input:

```bash
node tests/show.js video timeline 2 "wolf howling at full moon, snow"
```

## Limits

Anything outside the knowledge base still reaches the prompt, but only literally: the engine won't
know that a *longship* floats. Idioms and complex sentences get keyword-level understanding, not a
full grammatical parse. The fastest way to improve results for your own subjects is to add entries
to `js/kb/`.

## Using it on an iPhone

- **Private link (easiest):** https://claude.ai/artifact/4YVvEQ2iyNoVw5T4wNNSFv. Open it in Safari while signed in to claude.ai. To update it after changes, run `node build.js` and republish `dist/artifact.html` from Claude Code.
- **Over your Wi-Fi:** run `node serve.js` on the Mac, find the Mac's address with `ipconfig getifaddr en0`, then open `http://<that address>:8765` in Safari on the phone. Share → **Add to Home Screen** makes it open like an app.

## Versions and caching

`node build.js` stamps every script and stylesheet with `?v=<version>` and shows that version in the footer, so browsers can't run stale files. If the footer version doesn't match the latest build, hard-refresh (Cmd+Shift+R). It also writes `dist/scene-compiler.html`, the whole app in one file.

UI test for every filter: load the app, then in the browser console run
`s=document.createElement('script');s.src='tests/ui-test.js';s.onload=()=>runUITests().then(console.log);document.body.append(s)`
(1,710 checks; it expects 0 failures).
