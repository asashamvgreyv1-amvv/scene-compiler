/* Scene Compiler — option catalogue for the character & scene builder.
 * Every value is written as a prompt-ready phrase for the slot it fills
 * (see js/engine/character.js for the sentence each slot lands in).
 * Lists are either flat arrays or { Group: [...] } maps. Gendered lists use { f: ..., m: ..., both: ... }.
 * {pos} / {sub} placeholders are filled with the character's pronouns.
 */
(function () {
  const SC = (globalThis.SC = globalThis.SC || {});

  const O = {};

  O.age = {
    brackets: [
      ['Baby (0–1)', 1], ['Toddler (2–3)', 3], ['Child (4–8)', 6], ['Pre-teen (9–12)', 11], ['Teen (13–17)', 15],
      ['Young adult (18–24)', 21], ['Late twenties', 28], ['Thirties', 34], ['Forties', 44], ['Fifties', 54],
      ['Sixties', 64], ['Seventies', 74], ['Eighties and older', 84], ['Ageless / immortal-looking', 30],
    ],
    ranges: [['18–25', 22], ['25–35', 30], ['35–45', 40], ['45–60', 52], ['60+', 68]],
  };

  O.ethnicity = {
    'South Asian': ['Indian', 'North Indian', 'South Indian', 'Punjabi', 'Bengali', 'Gujarati', 'Marathi', 'Tamil', 'Malayali', 'Kashmiri', 'Rajasthani', 'Northeast Indian', 'Pakistani', 'Bangladeshi', 'Sri Lankan', 'Nepali'],
    'East Asian': ['Japanese', 'Korean', 'Chinese', 'Taiwanese', 'Mongolian', 'Tibetan'],
    'Southeast Asian': ['Filipino', 'Thai', 'Vietnamese', 'Indonesian', 'Malaysian', 'Burmese', 'Cambodian'],
    'Middle Eastern & Central Asian': ['Arab', 'Persian', 'Turkish', 'Lebanese', 'Egyptian', 'Moroccan', 'Kurdish', 'Afghan', 'Kazakh'],
    African: ['Nigerian', 'Ghanaian', 'Kenyan', 'Ethiopian', 'Somali', 'Senegalese', 'South African', 'Congolese', 'Maasai', 'Black'],
    'The Americas': ['African American', 'Afro-Caribbean', 'Afro-Brazilian', 'Mexican', 'Brazilian', 'Colombian', 'Argentinian', 'Peruvian', 'Indigenous American', 'Inuit'],
    European: ['White', 'Scandinavian', 'British', 'Irish', 'French', 'Italian', 'Spanish', 'Greek', 'German', 'Slavic', 'Russian', 'Eastern European', 'Mediterranean'],
    Oceania: ['Pacific Islander', 'Polynesian', 'Maori', 'Aboriginal Australian'],
    Mixed: ['mixed-race', 'Eurasian', 'Afro-Asian', 'racially ambiguous'],
  };

  O.race = {
    'Human': ['human'],
    'Fantasy races': ['elven', 'high-elven', 'dark-elven', 'fae', 'dwarven', 'half-orc', 'orcish', 'tiefling', 'celestial', 'nymph-like', 'siren-like', 'giant-blooded'],
    'Undead & dark': ['vampiric', 'lich-like', 'ghostly', 'demonic', 'fallen-angel', 'werewolf', 'undead'],
    'Divine & mythic': ['angelic', 'godlike', 'demigod', 'Asura-inspired', 'Deva-inspired', 'naga', 'yaksha-inspired', 'kitsune-inspired'],
    'Sci-fi': ['cyborg', 'android', 'synthetic', 'alien', 'bio-engineered', 'holographic', 'robotic'],
    'Hybrid': ['feline-hybrid', 'lupine-hybrid', 'draconic', 'avian', 'merfolk', 'insectoid'],
  };

  O.profession = {
    'Fun Stuff': ['pornstar', 'sexslave', 'whore', 'onlyfans celebrity', 'Escort', 'Porn Star', 'Webcam Model', 'Stripper','Swinger', 'Dominatrix', 'BDSM Performer', 'Nude Model', 'Adult Film Actress', 'Sex Therapist', 'Sexuality Educator', 'Sexologist', 'Sex Coach', 'Sex Blogger'],
    'Entertainment & media': ['actor', 'singer', 'dancer', 'musician', 'TV presenter', 'news anchor', 'journalist', 'comedian', 'magician', 'model', 'influencer', 'streamer', 'podcaster', 'radio host', 'TV presenter', 'news anchor', 'journalist'],
    'Everyday': ['student', 'Mother', 'Housewife','office worker', 'teacher', 'shopkeeper', 'barista', 'waiter', 'delivery rider', 'cab driver', 'farmer', 'fisherman', 'street vendor', 'chai seller', 'tailor', 'mechanic', 'construction worker', 'homemaker', 'librarian', 'gardener', 'baker'],
    'Professional': ['doctor', 'Hostess', 'Waitress','Bartender','Maid','Cleaner', 'surgeon', 'nurse', 'scientist', 'Receptionist', 'Secretary','software engineer', 'architect', 'lawyer', 'judge', 'CEO', 'banker', 'journalist', 'news anchor', 'professor', 'pilot', 'flight attendant', 'police officer', 'detective', 'firefighter', 'soldier', 'astronaut', 'diplomat', 'politician'],
    'Creative & performing': ['artist', 'painter', 'photographer', 'filmmaker', 'fashion designer', 'fashion model', 'actor', 'singer', 'rock guitarist', 'DJ', 'classical dancer', 'ballet dancer', 'street dancer', 'poet', 'tattoo artist', 'chef', 'influencer', 'streamer'],
    'Sport & adventure': ['athlete', 'boxer', 'Sports Fan','Cheerleader', 'wrestler', 'cricketer', 'footballer', 'tennis player', 'yoga instructor', 'surfer', 'rock climber', 'mountaineer', 'explorer', 'archaeologist', 'race car driver', 'martial artist'],
    'Historic': ['samurai', 'ninja', 'knight', 'viking', 'gladiator', 'pharaoh', 'maharaja', 'maharani', 'queen', 'king', 'prince', 'princess', 'geisha', 'courtesan', 'pirate captain', 'cowboy', 'musketeer', 'Mughal noble', 'Rajput warrior'],
    'Fantasy': ['wizard', 'sorceress', 'witch', 'necromancer', 'paladin', 'ranger', 'rogue', 'bard', 'druid', 'monk', 'assassin', 'bounty hunter', 'dragon rider', 'elven archer', 'battle mage', 'high priestess', 'oracle', 'alchemist', 'shaman', 'demon hunter'],
    'Sci-fi': ['space marine', 'starship captain', 'android pilot', 'cyberpunk hacker', 'netrunner', 'mech pilot', 'bounty hunter of the outer rim', 'galactic senator', 'cyborg mercenary', 'xenobiologist'],
    'Mythic & divine': ['goddess', 'god', 'warrior goddess', 'celestial being', 'angel', 'fallen angel', 'demon lord', 'forest spirit', 'sea goddess', 'sun deity'],
  };

  O.faceShape = ['oval', 'round', 'square', 'heart-shaped', 'diamond-shaped', 'oblong', 'triangular', 'rectangular', 'long', 'soft, rounded', 'sharply angular', 'high-cheekboned'];

  O.skin = [
    { n: 'porcelain', c: '#f6e3d6' }, { n: 'fair', c: '#efd2bc' }, { n: 'light, rosy', c: '#e9c2a6' }, { n: 'light beige', c: '#e2b894' },
    { n: 'warm beige', c: '#d4a27c' }, { n: 'golden olive', c: '#c69a6d' }, { n: 'olive', c: '#b58a5e' }, { n: 'wheatish', c: '#b37d52' },
    { n: 'warm tan', c: '#a36b45' }, { n: 'caramel', c: '#8f5a37' }, { n: 'warm brown', c: '#7a4a2e' }, { n: 'deep brown', c: '#5f3a24' },
    { n: 'rich dark brown', c: '#4a2c1b' }, { n: 'ebony', c: '#352013' },
    { n: 'pale blue', c: '#a9c6e8', f: 1 }, { n: 'soft lavender', c: '#c3b2e4', f: 1 }, { n: 'jade green', c: '#8fc3a2', f: 1 }, { n: 'ashen grey', c: '#9d9d9f', f: 1 },
    { n: 'shimmering gold', c: '#d8b45a', f: 1 }, { n: 'metallic silver', c: '#c9ccd1', f: 1 }, { n: 'deep crimson', c: '#8e2c33', f: 1 }, { n: 'obsidian black with glowing veins', c: '#1d1b22', f: 1 },
  ];

  O.eyeShape = ['almond-shaped', 'round', 'hooded', 'monolid', 'upturned', 'downturned', 'deep-set', 'wide-set', 'close-set', 'large, doe-like', 'narrow', 'feline, cat-eye'];
  O.eyeColor = {
    Natural: ['dark brown', 'warm brown', 'amber', 'hazel', 'green', 'grey-green', 'grey', 'blue', 'ice blue', 'near-black'],
    Fantasy: ['glowing violet', 'molten gold', 'silver', 'crimson', 'luminous emerald', 'pure white, pupil-less', 'starfield-black', 'heterochromatic blue and brown', 'reptilian slit-pupil yellow', 'electric cyan'],
  };
  O.brows = ['thick, straight brows', 'softly arched brows', 'high, dramatic arches', 'bushy, untamed brows', 'thin, groomed brows', 'bold, feathered brows', 'sparse, light brows', 'a single scarred brow'];
  O.nose = ['a straight, narrow nose', 'a small button nose', 'a strong aquiline nose', 'a broad nose', 'a softly rounded nose', 'a sharp, pointed nose', 'a slightly upturned nose', 'a nose with a gentle bump on the bridge', 'a pierced nose with a small stud', 'a nose ring (nath)'];
  O.lips = ['full lips', 'thin lips', 'a defined cupid’s bow', 'wide lips', 'small, rosebud lips', 'naturally pouty lips', 'a crooked half-smile', 'chapped, weathered lips'];
  O.makeup = {
    f: ['no makeup, natural skin', 'soft natural makeup', 'dewy glass-skin makeup', 'a bold red lip', 'smoky eye makeup', 'winged eyeliner', 'kohl-lined eyes', 'glitter eyeshadow', 'bridal makeup with a bindi', 'goth makeup with dark lips', 'editorial graphic eyeliner', 'ethereal fantasy makeup with gemstones', 'war paint across the cheeks', 'tribal face paint'],
    m: ['no makeup, natural skin', 'subtle grooming', 'kohl-lined eyes', 'war paint across the cheeks', 'tribal face paint', 'stage makeup', 'glam rock eyeliner', 'a tilak on the forehead'],
  };
  O.facialHair = ['clean-shaven', 'light stubble', 'heavy stubble', 'a neatly trimmed short beard', 'a full, thick beard', 'a long, flowing beard', 'a goatee', 'a handlebar moustache', 'a thick moustache', 'a pencil moustache', 'mutton chops', 'a braided warrior beard', 'a salt-and-pepper beard', 'a grey beard'];
  O.skinDetails = ['light freckles across the nose', 'a scatter of beauty marks', 'a faint scar across one cheek', 'a battle scar over one eye', 'vitiligo patches', 'deep laugh lines', 'weathered, sun-lined skin', 'dimples', 'visible pores and natural texture', 'intricate henna on the hands', 'sleeve tattoos', 'a neck tattoo', 'glowing runic tattoos', 'bioluminescent freckles', 'scales along the cheekbones'];

  O.hairStyle = {
    f: {
      Long: ['long, loose waves', 'long, sleek straight hair', 'long, voluminous curls', 'a long single braid', 'a waist-length braid with jasmine flowers', 'long hair swept over one shoulder', 'long layered hair with curtain bangs'],
      'Mid & short': ['a shoulder-length bob', 'a sharp chin-length bob', 'a textured lob', 'a pixie cut', 'a curly afro', 'short natural coils', 'a buzz cut'],
      Updos: ['a messy bun', 'a sleek high ponytail', 'a low chignon', 'a braided crown', 'space buns', 'a top knot', 'a traditional bun with a gajra'],
      'Braids & textured': ['box braids', 'cornrows', 'dreadlocks', 'twists', 'a fishtail braid', 'Dutch braids', 'bantu knots'],
      Fantasy: ['impossibly long, floating hair', 'hair made of flowing flames', 'hair braided with gold rings and beads', 'hair woven with vines and flowers', 'starlit hair that glitters like the night sky', 'a shaved side with a long braid'],
    },
    m: {
      Short: ['a short textured crop', 'a buzz cut', 'a crew cut', 'a classic side part', 'a slicked-back undercut', 'a high-top fade', 'short natural curls', 'a caesar cut'],
      'Medium & long': ['a tousled quiff', 'shoulder-length waves', 'long straight hair', 'a man bun', 'a top knot', 'long flowing hair', 'curly mid-length hair'],
      'Textured': ['dreadlocks', 'cornrows', 'twists', 'an afro', 'box braids'],
      'Distinct': ['a shaved head', 'completely bald', 'a receding hairline', 'a mohawk', 'a mullet', 'a samurai chonmage topknot', 'a warrior braid', 'a turban-covered head'],
      Fantasy: ['silver hair swept back like a blade', 'hair of living shadow', 'a flaming mane', 'long hair braided with runes and bones'],
    },
  };
  O.hairColor = {
    Natural: ['jet black', 'soft black', 'dark brown', 'chestnut brown', 'light brown', 'auburn', 'copper red', 'strawberry blonde', 'honey blonde', 'golden blonde', 'platinum blonde', 'ash blonde', 'salt-and-pepper', 'silver grey', 'snow white'],
    Dyed: ['balayage caramel', 'ombre brown to blonde', 'rose gold', 'pastel pink', 'lavender', 'electric blue', 'teal', 'emerald green', 'cherry red', 'jet black with blue sheen', 'split-dyed black and white'],
    Fantasy: ['iridescent opal', 'molten gold', 'starlight silver', 'flame-tipped crimson', 'deep ocean blue with glowing tips'],
  };

  O.bodyType = {
    f: ['a slim build', 'a petite, delicate frame', 'a slender, willowy figure', 'an athletic, toned build', 'a muscular, powerful build', 'a curvy hourglass figure', 'a soft, curvy figure', 'a pear-shaped figure', 'a plus-size, full figure', 'an average build', 'a lean dancer’s body', 'a statuesque, tall frame', 'a strong, sturdy frame', 'a pregnant belly'],
    m: ['a slim build', 'a lean, wiry build', 'an average build', 'an athletic, toned build', 'a muscular, broad-shouldered build', 'a bodybuilder’s physique', 'a stocky, powerful build', 'a heavyset build', 'a plus-size, big-bellied frame', 'a tall, lanky frame', 'a swimmer’s V-shaped build', 'a dad-bod, soft build', 'a battle-hardened warrior’s physique'],
  };
  O.height = ['petite', 'short', 'of average height', 'tall', 'very tall', 'towering, giant-like'];
  O.parts = {
    shoulders: ['narrow shoulders', 'sloping shoulders', 'average shoulders', 'broad shoulders', 'very broad, powerful shoulders'],
    chest_m: ['a slim chest', 'a lean, defined chest', 'a broad, muscular chest', 'a barrel chest'],
    bust_f: ['a small tight breast', 'a modest tight breast', 'tight breast', 'a medium round tight breast', 'a full breas'],
    waist: ['a very slim waist', 'a slim waist', 'a defined waist', 'a straight waist', 'a soft waist', 'a thick, strong midsection'],
    hips: ['narrow hips', 'straight hips', 'rounded hips', 'wide, curvy hips'],
    arms: ['slender arms', 'toned arms', 'muscular arms', 'thick, powerful arms', 'long, graceful arms'],
    legs: ['long, slender legs', 'long legs', 'toned legs', 'muscular, athletic legs', 'short, sturdy legs', 'thick, powerful legs'],
    muscle: ['no visible muscle definition', 'a lightly toned physique', 'athletic muscle definition', 'sharply defined abs and arms', 'heavy, dense musculature'],
    hands: ['delicate hands', 'slender fingers', 'strong, calloused hands', 'weathered working hands', 'clawed hands'],
  };

  O.wardrobeStyle = {
    'Everyday': ['western casual', 'smart casual', 'minimalist', 'streetwear', 'athleisure', 'preppy', 'bohemian', 'vintage-inspired', 'grunge', 'punk', 'goth', 'cottagecore', 'Y2K', 'workwear'],
    'Formal': ['business formal', 'black tie / evening wear', 'cocktail', 'wedding guest', 'red carpet couture'],
    'Cultural': ['traditional (from their culture)', 'Indian ethnic', 'Indo-western fusion', 'Japanese traditional', 'Korean hanbok', 'Chinese traditional', 'Middle Eastern traditional', 'West African traditional', 'Scottish Highland'],
    'Costume & genre': ['fantasy adventurer', 'royal / regal', 'medieval', 'Victorian', 'steampunk', 'cyberpunk techwear', 'sci-fi uniform', 'post-apocalyptic scavenger', 'pirate', 'superhero suit', 'samurai armor', 'Greek / Roman classical', 'Bollywood glamour', 'cosplay'],
    'Seasonal & activity': ['winter layers', 'summer resort wear', 'beachwear', 'rainwear', 'gym wear', 'hiking gear', 'sleepwear / loungewear'],
  };

  O.outfit = {
    f: {
      'Dresses & gowns': ['a flowing floral sundress', 'a little black dress', 'an emerald silk evening gown', 'a sequined cocktail dress', 'a satin slip dress', 'a white linen maxi dress', 'a bodycon midi dress', 'a vintage polka-dot swing dress', 'a tulle ball gown', 'a wrap dress in rust tones'],
      'Indian & South Asian': ['a silk Kanjeevaram saree', 'a chiffon saree with a sleeveless blouse', 'a Banarasi silk saree', 'an embroidered bridal lehenga', 'a pastel anarkali suit', 'a cotton kurta with palazzo pants', 'a salwar kameez with a dupatta', 'a Kerala kasavu saree', 'a mirror-work ghagra choli', 'a sharara set', 'an Indo-western cape gown'],
      'Other cultures': ['a silk kimono with an obi', 'a summer yukata', 'a Korean hanbok', 'a red qipao (cheongsam)', 'a Vietnamese ao dai', 'an embroidered abaya', 'a kaftan', 'a Kente-print dress', 'a Mexican embroidered huipil', 'a flamenco dress'],
      'Suits & sets': ['a tailored pantsuit', 'a power suit with wide lapels', 'a matching knit co-ord set', 'a tracksuit', 'overalls'],
      Fantasy: ['Underboob Crop Top & Mini-Skirt Set', 'Plunging Deep V-Neck Bodysuit', 'High-Cut Halter Mini Dress', 'Cutout Faux-Leather Rave Teddy', 'Extreme High-Leg Bodysuit', 'Sheer Mesh Bodysuit', 'Strappy Metallic Festival Set', 'Plunging Tie-Front Top Set', 'Strappy Linked Bunny Bodysuit', 'Deep-V French Maid Costume', 'Side-Tie Micro-Bikini', 'Backless Bodycon Mini Dress', 'O-Ring Cutout Teddy', 'Vinyl Wet-Look Catsuit', 'Lace-Up Front Plunge Dress', 'Micro-Mesh Fishnet Bodystocking', 'Cage-Style Strappy Romper', 'Deep Cowl-Neck Satin Slip', 'Open-Back High-Slit Gown', 'Asymmetrical Cutout Monokini'],
      'Sci-fi': ['a sleek white bodysuit with glowing seams', 'cyberpunk techwear with LED trim', 'a starship officer’s uniform', 'a space suit', 'power armor'],
    },
    m: {
      'Suits & formal': ['a tailored navy suit', 'a charcoal three-piece suit', 'a black tuxedo', 'a linen suit', 'a double-breasted pinstripe suit'],
      'Indian & South Asian': ['a silk sherwani', 'a cotton kurta pajama', 'a Nehru jacket over a kurta', 'a white dhoti and angavastram', 'a Pathani suit', 'a bandhgala suit', 'a Kerala mundu', 'a Rajasthani angrakha with a safa turban'],
      'Other cultures': ['a black montsuki kimono with hakama', 'a Korean hanbok', 'a Chinese changshan', 'a white thobe', 'an embroidered dashiki', 'a Scottish kilt outfit', 'a Mexican charro suit', 'a Maasai shuka'],
      'Casual sets': ['a tracksuit', 'workwear overalls', 'a denim-on-denim outfit', 'a linen shirt and trousers'],
      Fantasy: ['battle-worn knight’s plate armor', 'a hooded ranger’s cloak and leathers', 'a wizard’s star-embroidered robes', 'a dark lord’s spiked black armor', 'a samurai’s lacquered armor', 'a Viking warrior’s furs and chainmail', 'a celestial god’s golden armor', 'a pirate captain’s long coat', 'a demon hunter’s trench coat with silver buckles', 'a Rajput warrior’s armor with a curved talwar'],
      'Sci-fi': ['a space marine’s power armor', 'cyberpunk techwear with LED trim', 'a starship captain’s uniform', 'a sleek black stealth suit', 'a space suit'],
    },
  };
  O.top = {
    f: { Casual: ['Underboob Crop Top','Micro Triangle Bikini Top', 'Underboob Keyhole Crop Top', 'Sheer Fishnet Long Sleeve Crop', 'Extreme Plunging Cowl Neck', 'Strappy Cage Harness Top', 'Metallic Underwire Demi Bra Top', 'Chiffon Tie-Front Flared Sleeve Top', 'Asymmetrical Single-Shoulder Slash Top', 'Clear Vinyl Halter Top', 'Backless Criss-Cross Wrap Top', 'Open-Front Buckled Bralette', 'Sheer Mesh Corset Crop', 'Lace-Up Deep V-Neck Tank', 'Slashed Shredded Punk Crop', 'Metallic Chainmail Halter', 'Rhinestone Mesh Illusion Top', 'Ultra-Short Bandeau Tube Top', 'Cutout Sweetheart Bustier', 'Sheer Floral Lace Bralette Top', 'Holographic Criss-Cross Crop Top',   'a lace teddy', 'a silk chemise', 'a sheer babydoll', 'a leather harness set', 'a corset with garters', 'a satin robe with lace trim', 'a bondage-inspired lingerie set', 'a strappy cage bra and panty set', 'a latex catsuit', 'a fishnet bodysuit', 'a white ribbed tank top', 'an oversized graphic tee', 'a cropped hoodie', 'a striped Breton top', 'a chunky knit sweater', 'a cropped cardigan', 'a denim shirt', 'an off-shoulder top'], Dressy: ['a silk blouse', 'a satin camisole top', 'a lace corset top', 'a halter-neck top', 'a sheer organza blouse', 'a puff-sleeve blouse', 'a one-shoulder top'], Ethnic: ['an embroidered short kurti', 'a silk saree blouse', 'a crop choli with mirror work', 'a chikankari kurta'], Sport: ['a sports bra top', 'a fitted athletic tank', 'a rash guard'] },
    m: { Casual: ['a plain white t-shirt', 'a black crew-neck tee', 'a graphic tee', 'a flannel shirt', 'a henley', 'a hoodie', 'a chunky knit sweater', 'a polo shirt', 'a denim shirt', 'a linen shirt with rolled sleeves'], Dressy: ['a crisp white dress shirt', 'a black turtleneck', 'a silk shirt', 'a waistcoat over a shirt'], Ethnic: ['a short cotton kurta', 'a chikankari kurta', 'a silk kurta'], Sport: ['a compression tee', 'a sleeveless gym tank', 'a football jersey', 'a cricket jersey'] },
  };
  O.bottom = {
    f: { Pants: ['Micro G-String Thong', 'Extreme High-Cut Bikini Bottoms', 'Sheer Mesh Booty Shorts', 'Lace-Up Side Cheeky Shorts', 'Strappy Cage Booty Shorts', 'Crotchless Lace Panties', 'Faux-Leather High-Waisted Thong', 'Metallic Cheeky Hot Pants', 'Open-Back Ruched Booty Shorts', 'Fishnet Leggings with Cutouts', 'Clear Vinyl Micro Skirt', 'Double-Strap Thong Bottoms', 'Chaps-Style Cutout Pants', 'Rhinestone Mesh Fishnet Bottoms', 'Tie-Side Micro Bikini Bottoms', 'Asymmetrical Slash Cutout Leggings', 'Low-Rise V-Front G-String', 'Sheer Floral Lace Boyshorts', 'Holographic Cutout Skirt', 'O-Ring Linked Bikini Bottoms', 'Mini-Skirt', 'high-waisted blue jeans', 'black skinny jeans', 'wide-leg trousers', 'tailored cigarette pants', 'cargo pants', 'leather pants', 'palazzo pants', 'yoga leggings', 'joggers', 'denim shorts'], Skirts: ['a pleated midi skirt', 'a denim mini skirt', 'a satin slip skirt', 'a flowing maxi skirt', 'a pencil skirt', 'a tiered boho skirt', 'a tulle skirt', 'a leather skirt'], Ethnic: ['a silk lehenga skirt', 'a churidar', 'a sharara', 'a dhoti-style pant'] },
    m: { Pants: ['dark slim jeans', 'light-wash straight jeans', 'chinos', 'tailored trousers', 'cargo pants', 'joggers', 'leather trousers', 'linen drawstring pants', 'shorts', 'board shorts'], Ethnic: ['a white dhoti', 'churidar pants', 'a lungi', 'Pathani salwar'], Fantasy: ['leather breeches', 'armored greaves', 'a warrior’s kilt'] },
  };
  O.outerwear = {
    f: ['a camel trench coat', 'a cropped denim jacket', 'a black leather biker jacket', 'an oversized blazer', 'a puffer jacket', 'a long wool coat', 'a faux-fur coat', 'a knitted shawl', 'a sheer dupatta draped over one shoulder', 'a hooded cloak', 'a velvet cape', 'a raincoat'],
    m: ['a leather jacket', 'a denim jacket', 'a navy blazer', 'a trench coat', 'a bomber jacket', 'a puffer jacket', 'a wool overcoat', 'a Nehru jacket', 'a hooded cloak', 'a long duster coat', 'a raincoat', 'a varsity jacket'],
  };
  O.innerwear = {
    f: ['Micro Triangle Bikini Top', 'Underboob Keyhole Crop Top', 'Sheer Fishnet Long Sleeve Crop', 'Extreme Plunging Cowl Neck', 'Strappy Cage Harness Top', 'Metallic Underwire Demi Bra Top', 'Chiffon Tie-Front Flared Sleeve Top', 'Asymmetrical Single-Shoulder Slash Top', 'Clear Vinyl Halter Top', 'Backless Criss-Cross Wrap Top', 'Open-Front Buckled Bralette', 'Sheer Mesh Corset Crop', 'Lace-Up Deep V-Neck Tank', 'Slashed Shredded Punk Crop', 'Metallic Chainmail Halter', 'Rhinestone Mesh Illusion Top', 'Ultra-Short Bandeau Tube Top', 'Cutout Sweetheart Bustier', 'Sheer Floral Lace Bralette Top', 'Holographic Criss-Cross Crop Top','a lace bralette peeking out', 'a visible sports bra', 'a silk camisole layer', 'a bandeau', 'a corset', 'a bodysuit', 'thermal base layers'],
    m: ['a white undershirt', 'a ribbed tank vest', 'thermal base layers', 'a compression layer'],
  };
  O.footwear = {
    f: ['white leather sneakers', 'black ankle boots', 'knee-high boots', 'strappy heels', 'stilettos', 'ballet flats', 'Kolhapuri chappals', 'embroidered juttis', 'sandals', 'combat boots', 'platform sneakers', 'barefoot', 'ice skates', 'armored greaves and boots'],
    m: ['white sneakers', 'high-top sneakers', 'leather oxfords', 'Chelsea boots', 'combat boots', 'loafers', 'Kolhapuri chappals', 'mojaris', 'sandals', 'hiking boots', 'running shoes', 'barefoot', 'armored boots'],
  };
  O.headwear = {
    f: ['a wide-brimmed straw hat', 'a beret', 'a baseball cap', 'a knit beanie', 'a silk headscarf', 'a hijab', 'a floral crown', 'a jeweled maang tikka', 'a tiara', 'a veil', 'a witch’s pointed hat', 'an elven circlet', 'cat-ear headphones'],
    m: ['a baseball cap', 'a fedora', 'a flat cap', 'a knit beanie', 'a turban', 'a safa (Rajasthani turban)', 'a kufi cap', 'a cowboy hat', 'a bandana', 'a crown', 'a knight’s helmet', 'a samurai kabuto', 'a hood'],
  };
  O.accessories = ['a leather crossbody bag', 'a designer handbag', 'a backpack', 'round sunglasses', 'aviator sunglasses', 'wire-rimmed glasses', 'a silk scarf', 'a leather belt', 'a wristwatch', 'fingerless gloves', 'an umbrella', 'a sword at the hip', 'a quiver of arrows', 'a magic staff', 'a spellbook', 'a lantern', 'a camera around the neck', 'headphones around the neck', 'a cybernetic arm', 'a holographic wrist display'];
  O.jewelry = {
    f: ['delicate gold hoop earrings', 'statement jhumkas', 'a pearl necklace', 'layered gold chains', 'a diamond pendant', 'stacked glass bangles', 'a nose ring (nath)', 'toe rings and anklets', 'a temple jewelry set', 'a kundan choker', 'silver rings on every finger', 'an ear cuff', 'no jewelry'],
    m: ['a thin gold chain', 'a silver ring', 'a beaded bracelet', 'a signet ring', 'an ear stud', 'rudraksha beads', 'a kada (steel bangle)', 'a pendant on a leather cord', 'no jewelry'],
  };
  O.outfitColor = ['in all black', 'in crisp white', 'in soft neutrals', 'in earth tones', 'in pastel shades', 'in jewel tones', 'in bold primary colors', 'in monochrome red', 'in navy and gold', 'in saffron and crimson', 'in emerald and gold', 'in denim blue', 'in metallic silver', 'in neon accents'];

  O.expression = {
    'Positive': ['a warm, genuine smile', 'a soft, closed-lip smile', 'a confident half-smile', 'a joyful open-mouthed laugh', 'a shy, bashful smile', 'a playful wink', 'a dreamy, faraway look', 'a serene, peaceful expression', 'a proud, triumphant expression', 'a flirtatious glance'],
    'Neutral & intense': ['a calm, neutral expression', 'a thoughtful, pensive look', 'an intense, piercing stare', 'a determined, focused expression', 'a stoic, unreadable face', 'a mysterious, knowing look', 'a smoldering gaze', 'a raised, skeptical eyebrow', 'a curious, wide-eyed look'],
    'Negative': ['a melancholic, sad expression', 'tears streaming down the cheeks', 'an angry scowl', 'a furious snarl', 'a fearful, startled expression', 'a disgusted grimace', 'an exhausted, weary look', 'a heartbroken expression', 'a nervous, anxious look', 'a haunted, hollow stare'],
    Fantasy: ['eyes glowing with arcane light', 'a vampiric smile revealing fangs', 'a demonic grin with blazing eyes', 'a divine, beatific calm with a radiant halo', 'a berserker’s battle roar', 'a trance-like stare with swirling irises', 'a sly fox-spirit smirk', 'a cold, regal disdain', 'tears of liquid gold', 'a feral, wolfish snarl'],
  };
  O.pose = {
    Standing: ['standing tall with {pos} arms crossed', 'standing with weight shifted onto one hip', 'standing with hands in {pos} pockets', 'leaning casually against a wall', 'standing in a confident power pose, hands on hips', 'standing in profile, looking over {pos} shoulder', 'walking toward the camera mid-stride', 'twirling, clothing flaring outward'],
    Sitting: ['sitting cross-legged on the ground', 'sitting on a chair, legs crossed', 'perched on a ledge, legs dangling', 'sitting with knees hugged to {pos} chest', 'lounging back on {pos} elbows', 'kneeling on one knee', 'sitting sideways on a windowsill'],
    Lying: ['lying on {pos} back, arms spread', 'reclining on one elbow', 'curled up asleep', 'lying on {pos} stomach, chin in {pos} hands'],
    Action: ['running at full sprint', 'jumping mid-air', 'mid-dance, one arm raised', 'throwing a punch', 'drawing a sword', 'drawing a bow, arrow nocked', 'crouched low, ready to strike', 'climbing a wall', 'riding a motorcycle', 'reaching toward the viewer'],
    Portrait: ['facing the camera head-on', 'in a three-quarter view', 'chin resting on {pos} hand', 'hand lightly touching {pos} face', 'glancing back over {pos} shoulder', 'head tilted slightly, eyes closed'],
    Fantasy: ['levitating a foot above the ground, arms outstretched', 'casting a spell, glowing runes swirling around {pos} hands', 'wings fully unfurled mid-flight', 'kneeling before a glowing sword planted in the ground', 'summoning fire from {pos} open palm', 'meditating while floating, surrounded by orbiting stones', 'riding a dragon, gripping its spines', 'emerging from swirling shadows', 'standing on water as ripples glow beneath {pos} feet', 'holding a crackling orb of lightning', 'transforming mid-shift, half-beast', 'seated on an obsidian throne'],
  };
  O.gaze = ['looking directly into the camera', 'gazing off to the side', 'looking up toward the sky', 'looking down, eyes lowered', 'eyes closed', 'looking over {pos} shoulder at the viewer', 'staring into the distance'];
  O.prop = ['a cup of chai', 'a steaming coffee mug', 'a book', 'a smartphone', 'a bouquet of flowers', 'a guitar', 'a microphone', 'a camera', 'an umbrella', 'a sword', 'a katana', 'a bow', 'a magic staff', 'a glowing crystal', 'a lantern', 'a spellbook', 'a skull', 'a rose', 'a diya (oil lamp)', 'a flute', 'a paintbrush', 'a laptop', 'a basketball', 'a cricket bat'];
  O.fantasy = ['large white feathered wings', 'black raven wings', 'translucent butterfly wings', 'leathery dragon wings', 'curling ram horns', 'small demonic horns', 'a delicate antler crown', 'pointed elven ears', 'a fox tail', 'a scaled tail', 'fangs', 'a glowing halo', 'third-eye marking on the forehead', 'multiple arms like a Hindu deity', 'glowing circuitry under the skin', 'a mechanical cybernetic arm', 'gills along the neck', 'feathers woven into the hair'];
  O.aura = ['a faint glowing aura', 'swirling golden light', 'crackling purple lightning', 'drifting embers and flames', 'swirling frost and snowflakes', 'floating petals', 'orbiting runes of light', 'a cloud of shadowy smoke', 'glowing fireflies', 'rising water droplets', 'floating musical notes', 'holographic glitch fragments'];

  // ---------- scene ----------
  O.scene = {
    background: {
      'Studio': ['seamless studio backdrop', 'white background', 'black background', 'gradient background', 'photo studio with softbox lights'],
      'Everyday India': ['Mumbai street', 'Delhi market', 'Varanasi ghat', 'Jaipur palace', 'Kerala backwaters', 'Himalayan monastery', 'tea plantation', 'village lane', 'railway station', 'chai stall', 'temple courtyard', 'Goa beach'],
      'Urban': ['city street', 'neon-lit alley', 'rooftop', 'cafe', 'bar', 'nightclub', 'subway station', 'luxury penthouse', 'hotel lobby', 'office', 'library', 'bookstore', 'art gallery', 'gym', 'fashion runway', 'red carpet', 'parking garage'],
      'Home': ['bedroom', 'living room', 'kitchen', 'balcony', 'attic', 'childhood home', 'cabin'],
      'Nature': ['forest', 'jungle', 'bamboo forest', 'beach', 'ocean', 'lake', 'waterfall', 'mountain peak', 'desert dunes', 'meadow', 'sunflower field', 'cherry blossom garden', 'snowy tundra', 'cave', 'volcano', 'coral reef', 'underwater'],
      'Historic': ['castle', 'palace', 'ancient ruins', 'temple', 'cathedral', 'colosseum', 'throne room', 'medieval village', 'battlefield'],
      'Fantasy': ['enchanted forest', 'crystal cave', 'dragon lair', 'elven city', 'floating islands', 'sky castle', 'underwater palace', 'haunted mansion', 'wizard tower', 'celestial heaven', 'underworld', 'dreamscape'],
      'Sci-fi': ['cyberpunk city', 'space station deck', 'spaceship cockpit', 'outer space', 'surface of Mars', 'alien planet', 'lunar surface', 'futuristic laboratory', 'post-apocalyptic wasteland'],
    },
  };

  SC.OPT = O;
})();
