/* KB — camera, composition, lighting keywords, palettes, colours. */
(function () {
  const SC = globalThis.SC;

  SC.def('shot', {
    'extreme close-up': { syn: 'extreme closeup|ecu|detail shot|extreme close up|eyes close-up', ph: 'an extreme close-up', lens: '100mm macro', ap: 'f/2.8', dof: 'a razor-thin plane of focus', scale: 0 },
    'close-up': { syn: 'closeup|close up|headshot|head shot|face close-up|tight shot', ph: 'a close-up', lens: '85mm', ap: 'f/1.8', dof: 'a shallow depth of field that melts the background into soft bokeh', scale: 1 },
    'medium close-up': { syn: 'mcu|bust shot|chest-up|chest up|head and shoulders', ph: 'a medium close-up', lens: '85mm', ap: 'f/2', dof: 'a shallow depth of field with a softly blurred background', scale: 2 },
    'medium shot': { syn: 'medium|mid shot|midshot|waist-up|waist up|half body|half-body', ph: 'a medium shot', lens: '50mm', ap: 'f/2.2', dof: 'gentle separation between subject and background', scale: 3 },
    'full shot': { syn: 'full body|full-body|full length|full-length|head to toe|cowboy shot|full figure', ph: 'a full-body shot', lens: '35mm', ap: 'f/2.8', dof: 'a moderate depth of field that keeps the surroundings legible', scale: 4 },
    'wide shot': { syn: 'wide|long shot|ws|wide angle shot|wide view', ph: 'a wide shot', lens: '24mm', ap: 'f/5.6', dof: 'deep focus from foreground to background', scale: 5 },
    'extreme wide shot': { syn: 'extreme wide|establishing shot|establishing|panorama|panoramic|ultra wide|epic wide', ph: 'an extreme wide establishing shot', lens: '16mm', ap: 'f/8', dof: 'deep focus across the entire frame', scale: 6 },
    macro: { syn: 'macro shot|macro photography|extreme macro|macro lens', ph: 'a macro shot', lens: '100mm macro', ap: 'f/4', dof: 'a paper-thin focus plane with everything else dissolving into smooth blur', scale: 0 },
  });

  SC.def('angle', {
    'eye level': { syn: 'eye-level|straight on|straight-on|front view|frontal', ph: 'eye level' },
    'low angle': { syn: 'low-angle|from below|looking up|hero angle|heroic angle', ph: 'a low angle looking up' },
    'high angle': { syn: 'high-angle|from above|looking down', ph: 'a high angle looking down' },
    'birds-eye': { syn: "bird's eye|birds eye|bird's-eye view|birds eye view|overhead|top-down|top down|flat lay|flatlay|top view", ph: 'directly overhead in a top-down view' },
    'worms-eye': { syn: "worm's eye|worms eye|worm's-eye view|ground level|ground-level", ph: "a worm's-eye view at ground level" },
    'dutch angle': { syn: 'dutch|tilted|canted|dutch tilt|tilted angle', ph: 'a tilted dutch angle' },
    'over-the-shoulder': { syn: 'over the shoulder|ots', ph: "just over the subject's shoulder" },
    pov: { syn: 'first person|first-person|point of view|point-of-view|pov shot', ph: 'a first-person point of view' },
    aerial: { syn: 'drone|drone shot|aerial view|aerial shot|from the air|drone view|aerial photography', ph: 'a high aerial vantage point' },
    profile: { syn: 'side view|side profile|side-on|in profile', ph: 'a side-on profile angle' },
  });

  // Video camera moves. start/mid/end are clauses; {focus} = subject ref or place.
  SC.def('move', {
    static: { syn: 'locked off|locked-off|still camera|tripod|fixed camera|static shot|static camera', ph: 'a locked-off static camera', start: 'the camera holds perfectly still on {focus}', mid: 'the frame stays locked, letting the motion play out within it', end: 'the static frame lingers on {focus}' },
    'slow push-in': { syn: 'push in|push-in|dolly in|dolly-in|move in|slow zoom in|creep in', ph: 'a slow, steady push-in', start: 'the camera starts on a wider frame and begins a slow push-in toward {focus}', mid: 'the push-in continues, tightening the frame around {focus}', end: 'the camera comes to rest in a close, intimate framing of {focus}' },
    'pull-back': { syn: 'pull back|pull-out|pull out|dolly out|dolly-out|reveal|reveal shot', ph: 'a slow pull-back reveal', start: 'the camera opens close on {focus}', mid: 'the camera slowly pulls back, revealing more of the surroundings', end: 'the pull-back ends on a wide frame where {focus} sits small within the scene' },
    tracking: { syn: 'tracking shot|track|follow|following|follow shot|follow cam|trucking shot|side tracking', ph: 'a smooth lateral tracking shot', start: 'the camera glides alongside {focus} at matching speed', mid: 'the camera keeps pace, holding {focus} steady in frame as the background slides past', end: 'the camera eases off and lets {focus} move ahead' },
    dolly: { syn: 'dolly shot|slider|slider shot|gimbal|steadicam', ph: 'a smooth gimbal-stabilized dolly move', start: 'the camera glides forward smoothly on a gimbal toward {focus}', mid: 'the move continues in one fluid path, parallax shifting between foreground and background', end: 'the camera settles into a balanced frame on {focus}' },
    pan: { syn: 'panning|pan shot|slow pan|pan across|sweeping pan', ph: 'a slow horizontal pan', start: 'the camera begins framed on one side of the scene', mid: 'it pans steadily across the scene, bringing {focus} into view', end: 'the pan settles with {focus} framed on the third line' },
    'tilt-up': { syn: 'tilt up|tilt|tilting up|tilt-down|tilt down', ph: 'a slow upward tilt', start: 'the camera starts low, near the ground', mid: 'it tilts steadily upward to follow {focus}', end: 'the tilt finishes on the open sky above {focus}' },
    orbit: { syn: 'orbiting|arc shot|arc|360|circling|orbit shot|360 shot|rotating', ph: 'a slow orbiting arc around the subject', start: 'the camera begins a slow arc around {focus}', mid: 'the orbit continues, the background rotating smoothly behind {focus}', end: 'the orbit completes a half-circle and settles on {focus}' },
    'crane-up': { syn: 'crane|crane shot|jib|boom up|rising shot|crane up|pedestal up', ph: 'a rising crane shot', start: 'the camera starts at head height close to {focus}', mid: 'it rises smoothly on a crane, the scene opening up beneath', end: 'the crane move peaks in a high, sweeping view of {focus} and the surroundings' },
    handheld: { syn: 'hand-held|shaky cam|shaky|documentary style|handheld camera|cinema verite', ph: 'a handheld camera with subtle organic sway', start: 'a handheld camera moves in close to {focus}', mid: 'the camera sways and breathes naturally, reacting to the action', end: 'the handheld frame steadies on {focus}' },
    'aerial flyover': { syn: 'flyover|fly over|drone flyover|aerial tracking|drone tracking|flythrough|fly-through', ph: 'a sweeping aerial drone move', start: 'a drone glides in high above the scene', mid: 'it descends and sweeps toward {focus}', end: 'the drone banks and rises, leaving {focus} small within the landscape' },
    fpv: { syn: 'fpv drone|fpv shot|drone dive', ph: 'a fast, fluid FPV drone move', start: 'an FPV drone dives into the scene at speed', mid: 'it weaves close past {focus}', end: 'it bursts upward into open air, revealing the full scene' },
    zoom: { syn: 'slow zoom|zoom in|crash zoom|optical zoom|zoom out', ph: 'a slow optical zoom-in', start: 'the shot opens wide on the scene', mid: 'a slow optical zoom compresses the perspective toward {focus}', end: 'the zoom settles in a tight telephoto framing of {focus}' },
    'rack focus': { syn: 'focus pull|rack-focus|pull focus|focus shift', ph: 'a rack focus from foreground to subject', start: 'the frame opens with focus on a foreground detail and {focus} soft behind it', mid: 'focus racks smoothly onto {focus}', end: 'focus holds crisp on {focus}' },
    'whip pan': { syn: 'whip-pan|swish pan|whip', ph: 'an energetic whip pan', start: 'the camera snaps into frame with a fast whip pan', mid: 'it whips again to catch {focus} mid-action', end: 'the frame lands and holds on {focus}' },
  });

  SC.def('pace', {
    'real-time': { syn: 'realtime|real time|normal speed|live action speed', ph: 'natural real-time speed' },
    'slow motion': { syn: 'slow-motion|slowmo|slow-mo|slo-mo|slomo|high speed|high-speed|super slow motion', ph: 'smooth slow motion, as if shot at 120fps' },
    timelapse: { syn: 'time-lapse|time lapse|timelapses', ph: 'a time-lapse that compresses hours into seconds' },
    hyperlapse: { syn: 'hyper-lapse|hyper lapse', ph: 'a moving hyperlapse' },
  });

  SC.def('lens', {
    'wide-angle lens': { syn: 'wide angle|wide-angle|wide lens|ultra wide lens|ultrawide', ph: '16mm wide-angle' },
    'telephoto lens': { syn: 'telephoto|tele lens|zoom lens|long lens', ph: '200mm telephoto' },
    'fisheye lens': { syn: 'fisheye|fish eye|fish-eye', ph: '8mm fisheye' },
    'anamorphic lens': { syn: 'anamorphic|anamorphic flare|cinemascope', ph: '40mm anamorphic', add: { light: ['horizontal anamorphic lens flares'] } },
    'tilt-shift lens': { syn: 'tilt-shift|tilt shift|miniature effect', ph: 'tilt-shift', add: { texture: ['a tilt-shift miniature effect with blurred top and bottom edges'] } },
  });

  SC.def('dof', {
    bokeh: { syn: 'creamy bokeh|background blur|blurred background|shallow depth of field|shallow dof|shallow focus', ph: 'a very shallow depth of field with creamy, circular bokeh' },
    'deep focus': { syn: 'everything in focus|deep depth of field|sharp throughout', ph: 'deep focus with everything crisp from foreground to horizon' },
    'motion blur': { syn: 'long exposure|light trails|light-trails|blurred motion', ph: 'long-exposure motion blur streaking moving elements', add: { detail: ['silky motion trails from moving lights'] } },
  });

  SC.def('comp', {
    'rule-of-thirds': { syn: 'rule of thirds|thirds|off-center|off center', ph: 'a rule-of-thirds layout that places the subject off-center' },
    centered: { syn: 'centred|central composition|centered composition|center frame|centre frame', ph: 'a centered, frontal composition' },
    symmetry: { syn: 'symmetrical|symmetric|symmetrical composition|wes anderson symmetry|perfect symmetry', ph: 'a strictly symmetrical composition' },
    'negative-space': { syn: 'negative space|minimal composition|minimalist composition|empty space', ph: 'generous negative space around a small, isolated subject' },
    'leading-lines': { syn: 'leading lines|converging lines|vanishing point', ph: 'strong leading lines that draw the eye toward the subject' },
    'frame-within-frame': { syn: 'frame within frame|frame within a frame|natural frame|framed by', ph: 'natural framing elements that enclose the subject' },
    diagonal: { syn: 'diagonal composition|dynamic composition|diagonals', ph: 'dynamic diagonal lines that add energy and movement' },
    'layered-depth': { syn: 'layered composition|foreground interest|depth layers|layered depth', ph: 'layered depth with a distinct foreground, midground and background' },
    'golden-ratio': { syn: 'golden ratio|golden spiral|fibonacci|fibonacci spiral', ph: 'a golden-spiral composition leading the eye to the subject' },
    'tight-crop': { syn: 'tight crop|cropped|close crop|fill the frame', ph: 'a tight, intimate crop that fills the frame' },
  });

  SC.def('palette', {
    warm: { syn: 'warm tones|warm colors|warm colours|warm palette|warm tone', ph: 'warm ambers, soft oranges and honeyed highlights' },
    cool: { syn: 'cool tones|cool colors|cool colours|cold tones|cool palette|cold colors', ph: 'cool blues and steely cyans' },
    'teal-orange': { syn: 'teal and orange|orange and teal|teal orange|blockbuster grade', ph: 'cinematic teal shadows against warm orange highlights' },
    muted: { syn: 'muted colors|muted colours|muted tones|subdued|subtle colors|low saturation', ph: 'muted, restrained earth tones' },
    desaturated: { syn: 'washed out|faded|bleached|desaturated colors|bleach bypass', ph: 'faded, low-saturation color with lifted blacks' },
    vibrant: { syn: 'colors|colours|vivid|colorful|colourful|saturated|bold colors|bright colors|vivid colors|vibrant colors|rich colors', ph: 'rich, vivid saturated color' },
    pastel: { syn: 'pastel colors|pastels|soft colors|pastel colours|soft pastel', ph: 'soft pastel pinks, mint and powder blue' },
    monochrome: { syn: 'monochromatic|single color|one color|tonal', ph: 'a restrained monochromatic palette' },
    bw: { n: 'black and white', syn: 'black and white|black-and-white|b&w|black & white|grayscale|greyscale|monochrome photo|bnw', ph: 'rich black-and-white tonality with deep blacks and silvery highlights', tags: 'bw' },
    earthy: { syn: 'earth tones|earthy tones|natural tones|earthy colors|terracotta', ph: 'earthy ochres, olive greens and warm browns' },
    'neon colors': { syn: 'neon colours|fluorescent colors|electric colors|neon palette', ph: 'electric magenta, cyan and violet neon hues' },
    golden: { syn: 'gold tones|golden tones|gilded|gold and black', ph: 'glowing golds and deep bronzes' },
    'moody-blue': { syn: 'moody blue|moody blues|moody colors|moody tones|moody grade', ph: 'deep moody blues and slate greys with a single warm accent' },
    sepia: { syn: 'sepia tone|sepia toned|sepia-toned|antique tones', ph: 'warm sepia tones like an aged photograph' },
    jewel: { syn: 'jewel tones|gemstone colors|rich jewel tones', ph: 'saturated jewel tones of emerald, sapphire and ruby' },
    'high-contrast': { syn: 'high contrast|contrasty|punchy contrast|hard contrast', ph: 'bold, high-contrast color with inky shadows' },
    'lavender-haze': { syn: 'lavender tones|dreamy colors|soft purple', ph: 'soft, hazy lavenders and blush tones' },
    'crimson-black': { syn: 'red and black|blood red|crimson and black', ph: 'blood-red accents against charcoal black' },
    ice: { syn: 'icy colors|icy tones|frozen palette|icy blue', ph: 'icy whites, pale blues and silver' },
    forest: { syn: 'forest greens|green tones|emerald tones|lush greens', ph: 'deep emerald greens and mossy browns' },
    sunset: { syn: 'sunset colors|sunset palette|sunset tones', ph: 'apricot, rose and violet sunset hues' },
    'night-blue': { syn: 'night tones|nocturne', ph: 'deep indigo shadows cut with sodium-orange light' },
    candy: { syn: 'candy colors|candy colours|bubblegum|sugary colors', ph: 'playful candy pinks, lemon yellows and sky blues' },
  });

  SC.def('light', {
    neon: { syn: 'neon lights|neon lighting|neon glow|neon-lit|neon lit|neon light', ph: 'saturated neon light in magenta and cyan', bias: { palette: 'neon colors:4', time: 'night:3' }, tags: 'neon' },
    candlelight: { syn: 'candle light|candlelit|candle-lit|candle glow', ph: 'flickering warm candlelight', bias: { palette: 'warm:3' }, tags: 'glow intimate' },
    firelight: { syn: 'firelit|fire light|fire-lit|bonfire light|campfire light|firelight glow', ph: 'dancing orange firelight', bias: { palette: 'warm:3', time: 'night:3, dusk:2' }, tags: 'fire glow' },
    moonlight: { syn: 'moonlit|moon light|moon-lit|moonlight glow', ph: 'cool silver moonlight', bias: { time: 'night:5', palette: 'cool:2' }, tags: 'night' },
    backlit: { syn: 'backlight|backlighting|back lit|back-lit|contre-jour|contre jour', ph: 'strong backlighting that rims the subject in light' },
    'rim light': { syn: 'rim lighting|rimlight|rim-lit|edge light|edge lighting|hair light', ph: "a crisp rim light tracing the subject's outline" },
    'soft light': { syn: 'soft lighting|diffused light|diffused lighting|diffused|soft lit|gentle light', ph: 'soft, diffused light with gentle shadow falloff' },
    'hard light': { syn: 'harsh light|hard lighting|harsh shadows|harsh lighting|direct sunlight|hard shadows', ph: 'hard, direct light carving crisp shadows' },
    'studio lighting': { syn: 'studio light|softbox|softbox lighting|three-point lighting|beauty lighting|beauty dish', ph: 'controlled studio lighting with a large softbox key and subtle fill' },
    'low-key': { syn: 'low key|chiaroscuro|dramatic lighting|dramatic light|dark lighting|moody lighting', ph: 'dramatic low-key chiaroscuro lighting with deep shadows' },
    'high-key': { syn: 'high key|bright and airy|airy|light and airy', ph: 'bright, airy high-key lighting' },
    volumetric: { syn: 'god rays|volumetric lighting|volumetric light|light rays|sunbeams|sun rays|crepuscular rays|light shafts|shafts of light|rays of light', ph: 'volumetric shafts of light cutting through the air', add: { atmo: ['fine particles glowing in the light shafts'] } },
    bioluminescent: { syn: 'bioluminescence|glowing plants|bio-luminescent', ph: 'eerie bioluminescent glow in blues and teals', tags: 'glow magic' },
    'golden light': { syn: 'warm light|golden glow|sunlit glow|warm lighting|warm glow', ph: 'warm golden light', bias: { palette: 'golden:2' } },
    spotlight: { syn: 'spot light|single spotlight|stage light|stage lighting|spotlit', ph: 'a single hard spotlight isolating the subject from the darkness' },
    fluorescent: { syn: 'fluorescent light|fluorescent lighting|flickering fluorescent|tube light|tubelight', ph: 'cold, flickering fluorescent tube light', bias: { palette: 'desaturated:1' } },
    rembrandt: { syn: 'rembrandt lighting|rembrandt light', ph: 'classic Rembrandt lighting with a small triangle of light on the shadowed cheek' },
    silhouette: { syn: 'silhouetted|silhouettes|in silhouette', ph: 'strong backlight rendering the subject as a crisp silhouette' },
    'natural light': { syn: 'natural lighting|daylight|available light|ambient light', ph: 'clean, natural daylight' },
    'window light': { syn: 'window lighting|light from window|light through window|sunlight through window', ph: 'soft, directional window light' },
    'lantern light': { syn: 'lanternlight|lamplight|lamp light|lamp-lit|lamplit', ph: 'warm pools of lantern and lamp light', bias: { palette: 'warm:2' } },
    streetlight: { syn: 'street lights|streetlights|street lamps|street lamp light|sodium light|sodium lights', ph: 'pools of sodium-vapor streetlight', bias: { time: 'night:3' } },
    glow: { syn: 'glowing light|ethereal glow|soft glow|luminous glow|halo', ph: 'a soft, ethereal glow' },
    blacklight: { syn: 'uv light|ultraviolet|black light|uv', ph: 'vivid ultraviolet blacklight' },
    'split lighting': { syn: 'split light|half lit face|half-lit', ph: 'split lighting that divides the face into light and shadow' },
    'cinematic lighting': { syn: 'cinematic light|film lighting|movie lighting', ph: 'motivated cinematic lighting with a strong key and deep contrast' },
    'lens flare': { syn: 'lens flares|flare|sun flare', ph: 'warm sunlight with soft lens flare', add: { light: ['soft lens flare blooming across the frame'] } },
    'colored gels': { syn: 'gel lighting|colored lighting|coloured lighting|rgb lighting|red and blue light|red light|blue light', ph: 'bold colored gel lighting in contrasting hues' },
  });

  // Colours attach to the next noun ("red car") or, standalone, become palette accents.
  const C = {};
  ('red crimson scarlet maroon burgundy pink magenta fuchsia purple violet lavender lilac blue navy azure cobalt cyan teal turquoise aqua ' +
    'green emerald olive mint sage lime yellow mustard lemon orange amber peach coral saffron gold silver bronze copper white ivory cream ' +
    'beige black charcoal grey gray brown chocolate tan rust indigo').split(' ').forEach((c) => (C[c] = { ph: c, ord: 'color' }));
  C.gray.ph = 'grey';
  SC.def('color', C);
})();
