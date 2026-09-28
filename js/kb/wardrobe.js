/* KB — wardrobe styles ("western outfit", "streetwear", "Indian ethnic") and general clothing words.
 * wstyle fields: wear {f, m, n}, trad (dress from the character's own culture), tags
 * wgen: generic clothing nouns; "no apparel" / "no costume" negate them (see character.js)
 */
(function () {
  const SC = globalThis.SC;
  const W = (f, m, extra) => Object.assign({ wear: { f, m, n: m } }, extra || {});

  SC.def('wstyle', {
    'western casual': W('a fitted white t-shirt, high-waisted blue jeans and white sneakers', 'a plain crew-neck t-shirt, dark slim jeans and white sneakers',
      { syn: 'western|western wear|western clothes|western clothing|western outfit|western outfits|western costume|western attire|western dress|western style clothes|casual western|modern clothes|modern clothing|modern outfit|contemporary clothes|jeans and t-shirt|casual|casual wear|casual clothes|casual outfit', western: 1 }),
    'smart casual': W('a tucked-in silk blouse, tailored trousers and loafers', 'an open-collar oxford shirt, chinos and suede loafers', { syn: 'smart casual outfit|smart-casual', western: 1 }),
    minimalist: W('a clean-lined neutral knit and wide-leg trousers', 'a monochrome knit sweater and tapered trousers', { syn: 'minimalist fashion|minimal outfit|quiet luxury', western: 1 }),
    streetwear: W('an oversized hoodie, cargo pants and chunky sneakers', 'an oversized graphic hoodie, cargo pants and high-top sneakers', { syn: 'street wear|street style|hypebeast|urban wear', western: 1 }),
    athleisure: W('matching leggings, a cropped zip-up and running shoes', 'a zip-up track jacket, joggers and running shoes', { syn: 'sportswear|activewear|gym wear|gym clothes|workout clothes|sporty outfit|gym outfit', western: 1 }),
    preppy: W('a cable-knit sweater over a collared shirt with a pleated skirt', 'a cable-knit sweater over an oxford shirt with chinos', { syn: 'preppy style|ivy league', western: 1 }),
    bohemian: W('a flowing tiered skirt, a peasant blouse and layered bangles', 'a loose linen shirt, beaded necklaces and relaxed trousers', { syn: 'boho|boho chic|hippie', western: 1 }),
    'vintage-inspired': W('a 1950s tea dress with a cinched waist', 'a high-waisted pleated trouser and suspenders with a crisp shirt', { syn: 'vintage fashion|retro outfit|vintage clothes', western: 1 }),
    grunge: W('a ripped band tee, flannel shirt tied at the waist and combat boots', 'a worn flannel over a band tee, ripped jeans and combat boots', { syn: 'grunge style', western: 1 }),
    punk: W('a studded leather jacket, tartan skirt and fishnets', 'a studded leather jacket, ripped black jeans and boots', { syn: 'punk rock|punk style', western: 1 }),
    goth: W('a black lace dress, a velvet choker and platform boots', 'a long black coat, a black shirt and silver rings', { syn: 'gothic fashion|goth style|goth outfit', western: 1 }),
    cottagecore: W('a puff-sleeve floral prairie dress', 'a linen shirt, suspenders and corduroy trousers', { syn: 'cottage core|prairie style', western: 1 }),
    y2k: W('a baby tee, low-rise flared jeans and tinted sunglasses', 'a baggy jersey, wide jeans and chunky sneakers', { n: 'Y2K', syn: 'y2k fashion|2000s fashion', western: 1 }),
    workwear: W('a canvas chore jacket, sturdy work trousers and boots', 'a canvas chore jacket, sturdy work trousers and boots', { syn: 'utility wear|work clothes', western: 1 }),
    'business formal': W('a tailored charcoal pantsuit with a silk blouse', 'a tailored charcoal suit, white shirt and silk tie', { syn: 'business attire|office wear|corporate attire|formal suit|business suit|formals|office outfit', western: 1 }),
    'black tie / evening wear': W('a floor-length satin evening gown', 'a classic black tuxedo with a bow tie', { syn: 'black tie|evening wear|formal wear|evening gown|gala outfit', western: 1 }),
    cocktail: W('a sleek sequined cocktail dress', 'a slim velvet dinner jacket over a black shirt', { syn: 'cocktail attire|party wear|party outfit', western: 1 }),
    'wedding guest': W('a pastel chiffon midi dress', 'a light grey summer suit', { syn: 'wedding guest outfit' }),
    'red carpet couture': W('a dramatic couture gown with a sweeping train', 'a sharply tailored couture tuxedo', { syn: 'couture|haute couture|red carpet look' }),
    'traditional (from their culture)': W('traditional attire from her culture', 'traditional attire from his culture', { syn: 'traditional|traditional wear|traditional clothes|traditional clothing|traditional outfit|traditional costume|traditional attire|traditional dress|ethnic|ethnic wear|ethnic clothes|ethnic outfit|cultural attire|cultural dress|native dress', trad: 1 }),
    'Indian ethnic': W('a silk saree with a contrasting blouse', 'a silk kurta with churidar and a Nehru jacket', { syn: 'indian ethnic wear|indian traditional|indian outfit|indian clothes|desi outfit|desi wear|indian wear|ethnic indian', trad: 1, region: 'india' }),
    'Indo-western fusion': W('an Indo-western cape gown with embroidered borders', 'an asymmetric kurta with slim trousers', { syn: 'indo western|indo-western|fusion wear|fusion outfit' }),
    'Japanese traditional': W('a silk kimono with an obi sash', 'a dark kimono with a hakama', { syn: 'kimono style|japanese traditional wear', trad: 1 }),
    'Korean hanbok': W('a flowing pastel hanbok', 'a hanbok with a long vest', { syn: 'hanbok' }),
    'Chinese traditional': W('an embroidered silk qipao', 'a silk changshan', { syn: 'hanfu|qipao|cheongsam|chinese traditional wear', trad: 1 }),
    'Middle Eastern traditional': W('an embroidered abaya with a silk headscarf', 'a white thobe and ghutra', { syn: 'arabic dress|thobe|abaya' }),
    'West African traditional': W('a vibrant Ankara-print dress with a gele headwrap', 'a vibrant agbada robe in Ankara print', { syn: 'ankara|agbada|kente' }),
    'Scottish Highland': W('a tartan wool skirt and a knit shawl', 'a tartan kilt with a sporran', { syn: 'kilt|highland dress' }),
    'fantasy adventurer': W('a fitted leather corset, a hooded traveling cloak and tall boots', 'weathered leathers, a hooded traveling cloak and tall boots', { syn: 'fantasy outfit|fantasy costume|adventurer outfit|rpg outfit|dnd outfit' }),
    'royal / regal': W('a jewel-encrusted royal gown and a delicate crown', 'regal embroidered robes and a jeweled crown', { syn: 'royal outfit|regal outfit|royal attire|regal attire' }),
    medieval: W('a laced linen kirtle and a wool cloak', 'a linen tunic, leather belt and wool cloak', { syn: 'medieval outfit|medieval clothes|medieval costume' }),
    victorian: W('a high-collared Victorian gown with a bustle', 'a frock coat, waistcoat and cravat', { syn: 'victorian outfit|victorian clothes|victorian costume' }),
    steampunk: W('a steampunk corset, bustle skirt and brass goggles', 'a waistcoat, leather harness and brass goggles', { syn: 'steampunk outfit|steampunk costume' }),
    'cyberpunk techwear': W('reflective techwear with glowing LED trim', 'a black techwear jacket with glowing LED trim', { syn: 'techwear|cyberpunk outfit|cyberpunk clothes|cyberpunk costume' }),
    'sci-fi uniform': W('a sleek fitted starship uniform', 'a sleek fitted starship uniform', { syn: 'sci-fi outfit|scifi outfit|space uniform|futuristic outfit|futuristic clothes' }),
    'post-apocalyptic scavenger': W('patched scavenged layers and a dust-caked respirator', 'patched scavenged layers and a dust-caked respirator', { syn: 'wasteland outfit|apocalypse outfit' }),
    pirate: W('a pirate’s corset, billowing shirt and tricorn hat', 'a pirate’s long coat, billowing shirt and tricorn hat', { syn: 'pirate outfit|pirate costume' }),
    'superhero suit': W('a sleek superhero suit with a flowing cape', 'a sleek armored superhero suit with a cape', { syn: 'superhero costume|superhero outfit' }),
    'samurai armor': W('lacquered samurai armor', 'lacquered samurai armor with twin swords', { syn: 'samurai outfit|samurai costume' }),
    'Greek / Roman classical': W('a draped white chiton with gold armlets', 'a draped toga with a laurel wreath', { syn: 'toga|greek costume|roman costume|greek goddess outfit' }),
    'Bollywood glamour': W('a shimmering sequined saree with a flowing pallu', 'a velvet sherwani with a silk stole', { syn: 'bollywood outfit|bollywood costume|filmi outfit' }),
    cosplay: W('a detailed anime-inspired cosplay costume', 'a detailed anime-inspired cosplay costume', { syn: 'cosplay costume|anime costume' }),
    'winter layers': W('a long wool coat, a chunky scarf and knit beanie', 'a heavy wool overcoat, a scarf and knit beanie', { syn: 'winter clothes|winter wear|winter outfit|warm clothes' }),
    'summer resort wear': W('a breezy linen co-ord and a straw hat', 'an open linen shirt, linen shorts and espadrilles', { syn: 'resort wear|vacation outfit|summer clothes|summer outfit' }),
    beachwear: W('a sarong wrap over a swimsuit', 'swim shorts and an open linen shirt', { syn: 'beach wear|beach outfit|swimwear|swim wear', adult: 1 }),
    rainwear: W('a glossy yellow raincoat and rubber boots', 'a hooded rain jacket and waterproof boots', { syn: 'rain gear|rain clothes' }),
    'hiking gear': W('a technical shell jacket, hiking pants and boots', 'a technical shell jacket, hiking pants and boots', { syn: 'trekking gear|outdoor gear' }),
    'sleepwear / loungewear': W('soft cotton pajamas', 'soft cotton pajamas', { syn: 'sleepwear|loungewear|pajamas outfit|pyjamas outfit|nightwear' }),
  });

  // generic clothing words; meaningful mostly when negated ("no costume", "without clothing")
  SC.def('wgen', {
    apparel: { syn: 'clothing|clothes|garments|garment|attire|wardrobe|dressing', kind: 'all' },
    costume: { syn: 'costumes|outfit|outfits|costume elements|cosplay elements', kind: 'costume' },
    accessories: { syn: 'accessory|jewelry|jewellery|ornaments', kind: 'accessories' },
  });
})();
