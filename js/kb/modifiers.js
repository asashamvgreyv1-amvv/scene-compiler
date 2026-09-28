/* KB — adjectives that attach to the following noun.
 * fields: ord (op|size|age|shape|cond|color|origin|mat) controls English adjective order,
 *   ph (rendered form), plus optional tags/bias/add that ripple into the scene.
 */
(function () {
  const SC = globalThis.SC;
  const M = (ord, extra) => Object.assign({ ord }, extra || {});
  SC.def('mod', {
    // size
    tiny: M('size', { syn: 'miniature|mini|teeny|minuscule', bias: { shot: 'macro:2' }, tags: 'small' }),
    small: M('size', { syn: 'little' }),
    lone: M('op', { syn: 'solitary lone|lonesome single', tags: 'lonely' }),
    giant: M('size', { syn: 'huge|massive|enormous|colossal|gigantic|towering|immense|titanic|monumental', bias: { angle: 'low angle:3, worms-eye:1', shot: 'wide shot:2' }, tags: 'big' }),
    tall: M('size', { syn: 'lanky|towering tall' }),
    // opinion / look
    beautiful: M('op', { syn: 'pretty|gorgeous|stunning|lovely|attractive|handsome' }),
    cute: M('op', { syn: 'adorable|kawaii|chibi', tags: 'cute', bias: { palette: 'pastel:1' } }),
    majestic: M('op', { syn: 'regal|noble|proud' }),
    fierce: M('op', { syn: 'ferocious|savage|menacing', bias: { angle: 'low angle:2' } }),
    mysterious_: M('op', { n: 'shadowy', syn: 'shadowy|hooded figure', ph: 'shadowy' }),
    muscular: M('op', { syn: 'buff|athletic|strong|brawny' }),
    slender: M('op', { syn: 'slim|thin|skinny|lean|petite' }),
    chubby: M('op', { syn: 'plump|chunky|fat|round' }),
    fluffy: M('op', { syn: 'furry|fuzzy|shaggy', add: { texture: ['soft, fluffy fur rendered strand by strand'] } }),
    bearded: M('op', { syn: 'with beard|with a beard|grizzled' }),
    tattooed: M('op', { syn: 'inked|tattoos' }),
    freckled: M('op', { syn: 'freckles' }),
    'curly-haired': M('op', { syn: 'curly|curly hair' }),
    'long-haired': M('op', { syn: 'long hair' }),
    bald: M('op', { syn: 'shaved head|shaven' }),
    blonde: M('op', { syn: 'blond|golden-haired|fair-haired' }),
    redhead: M('op', { syn: 'red-haired|ginger', ph: 'red-haired' }),
    'dark-skinned': M('op', { syn: 'dusky|brown-skinned|dark skinned|brown skin' }),
    barefoot: M('op', {}),
    hooded: M('op', { syn: 'cloaked' }),
    masked: M('op', {}),
    armored: M('op', { syn: 'armoured' }),
    winged: M('op', { syn: 'with wings', tags: 'fantasy' }),
    horned: M('op', { tags: 'fantasy' }),
    wild: M('op', { syn: 'untamed|feral' }),
    ornate: M('op', { syn: 'intricate|elaborate|decorated|embellished|baroque', add: { detail: ['intricate ornamental detailing'] } }),
    elegant_: M('op', { n: 'sleek', syn: 'sleek|streamlined', ph: 'sleek' }),
    // age
    young: M('age', { syn: 'youthful' }),
    old: M('age', { syn: 'elderly|aged|aging|ageing|senior' }),
    ancient: M('age', { syn: 'age-old|primeval|primordial|prehistoric', tags: 'historic', add: { texture: ['weathered, time-worn surfaces'] } }),
    newborn: M('age', {}),
    // condition
    abandoned: M('cond', { syn: 'deserted|derelict|forsaken|empty|forgotten', tags: 'decay', add: { env: ['peeling paint and scattered debris'], atmo: ['dust motes drifting in stale air'] }, bias: { palette: 'muted:2, desaturated:1' } }),
    ruined: M('cond', { syn: 'crumbling|collapsed|destroyed|decaying|dilapidated|broken-down', tags: 'decay', add: { texture: ['cracked, crumbling surfaces'] } }),
    overgrown: M('cond', { syn: 'moss-covered|mossy|vine-covered|reclaimed by nature', tags: 'overgrown', add: { env: ['vines and moss reclaiming every surface'] } }),
    rusty: M('cond', { syn: 'rusted|corroded|weathered|worn|battered|beat-up', add: { texture: ['flaking rust and weathered paint'] } }),
    broken: M('cond', { syn: 'shattered|cracked|damaged|smashed', add: { detail: ['shards and fragments scattered nearby'] } }),
    pristine: M('cond', { syn: 'spotless|immaculate|brand new|shiny|polished|glossy', add: { texture: ['immaculate, glossy surfaces'] } }),
    wet: M('cond', { syn: 'soaked|drenched|dripping|soaking', tags: 'wet', add: { texture: ['glistening wet surfaces'] } }),
    muddy: M('cond', { syn: 'dirty|filthy|grimy|dusty', tags: 'gritty' }),
    frozen: M('cond', { syn: 'icy|frost-covered|iced', tags: 'cold', add: { texture: ['frost crystals and glassy ice'] }, bias: { palette: 'ice:2' } }),
    burning: M('cond', { syn: 'on fire|flaming|blazing|fiery|ablaze', tags: 'fire', add: { light: ['flickering orange firelight'], atmo: ['rising smoke and drifting embers'] } }),
    glowing: M('cond', { syn: 'luminous|radiant|shining|incandescent|lit-up|light-up', tags: 'glow', add: { light: ['a soft self-illuminated glow'] } }),
    floating: M('cond', { syn: 'levitating|hovering|weightless|suspended|flying', tags: 'surreal' }),
    melting: M('cond', { syn: 'dripping wax', tags: 'surreal' }),
    haunted: M('cond', { syn: 'cursed|possessed', tags: 'horror', bias: { time: 'night:2' } }),
    enchanted: M('cond', { syn: 'magical|magic|mystical|arcane|spellbound', tags: 'magic fantasy', add: { atmo: ['sparkling motes of magical light'] } }),
    futuristic: M('cond', { syn: 'high-tech|advanced|sci-fi style', tags: 'scifi' }),
    robotic: M('cond', { syn: 'mechanical|cybernetic|bionic|android-like|clockwork', tags: 'scifi robot', add: { texture: ['machined metal panels and exposed servos'] } }),
    holographic: M('cond', { syn: 'hologram-like|iridescent|prismatic|opalescent', tags: 'scifi glow', add: { texture: ['shifting iridescent sheen'] } }),
    translucent: M('cond', { syn: 'transparent|see-through|ghostly|sheer', add: { texture: ['light passing softly through translucent forms'] } }),
    colorful: M('cond', { syn: 'multicolored|multicoloured|rainbow-colored|vivid-colored|bright-colored', bias: { palette: 'vibrant:2' } }),
    lush: M('cond', { syn: 'verdant|green|leafy|blooming|flowering', tags: 'green' }),
    empty_: M('cond', { n: 'desolate', syn: 'desolate|barren|bleak|lifeless', ph: 'desolate', tags: 'lonely' }),
    busy_: M('cond', { n: 'bustling', syn: 'bustling|crowded|packed|thronging|lively', ph: 'bustling', tags: 'crowd', add: { env: ['crowds of people moving through the background'] } }),
    // material
    golden: M('mat', { syn: 'gold-plated|gilded|made of gold', add: { texture: ['polished gold with warm reflections'] } }),
    silver_: M('mat', { n: 'silvery', syn: 'silvery|chrome|chromed|metallic|steel|iron|metal', ph: 'metallic', add: { texture: ['brushed metal with crisp reflections'] } }),
    wooden: M('mat', { syn: 'wood|timber|carved wood', add: { texture: ['warm wood grain'] } }),
    stone: M('mat', { syn: 'marble|granite|carved stone|rock', add: { texture: ['cool, carved stone texture'] } }),
    glass: M('mat', { syn: 'crystal|crystalline|glass-like', add: { texture: ['refractive glass with caustic highlights'] } }),
    paper_: M('mat', { n: 'paper', syn: 'origami-like|cardboard', ph: 'paper', tags: 'craft' }),
    porcelain: M('mat', { syn: 'ceramic|china', add: { texture: ['smooth glazed porcelain'] } }),
    neon_: M('mat', { n: 'neon', syn: 'neon-colored|neon-lit', ph: 'neon', tags: 'neon' }),
    velvet: M('mat', { syn: 'silk|silken|satin|leather|lace', add: { texture: ['rich fabric texture'] } }),
    woolen: M('mat', { syn: 'knitted|wool|woollen|knit', tags: 'cozy' }),
  });
  // clean up helper ids (mysterious_, elegant_ ...) so they render correctly
  for (const e of Object.values(SC.kb.mod)) {
    if (!e.ph) e.ph = e.id.replace(/_$/, '');
  }
})();
