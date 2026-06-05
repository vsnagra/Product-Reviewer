export interface SoundEffectDefinition {
  id: string; // The exact filename
  name: string; // Human readable name
  tags: string[]; // Keywords to match
}

export const SOUND_EFFECTS: SoundEffectDefinition[] = [
  {
    id: "Crowd Laugh.mp3",
    name: "Crowd Laugh",
    tags: ["chuckle", "giggle", "guffaw", "hilarity", "humor", "audience", "reaction", "joke", "comedy", "amusing", "titter", "snicker", "roaring", "burst", "joyful", "merriment", "mirth", "funny", "sitcom", "theater", "group", "collective", "entertainment", "standup", "smile", "chortle", "crack-up", "howling", "hysterical", "belly-laugh"]
  },
  {
    id: "Whistle Human.wav",
    name: "Whistle Human",
    tags: ["lips", "blow", "signal", "call", "tune", "melody", "pucker", "attention", "alert", "breath", "sound", "mouth", "human", "bird-call", "wolf-whistle", "summoning", "cheerful", "casual", "street", "hailing", "taxi", "pitch", "tone", "vibrating", "air", "sharp", "loud", "person", "melodic", "whistling"]
  },
  {
    id: "Whistle Instrument.wav",
    name: "Whistle Instrument",
    tags: ["flute", "recorder", "pipe", "tin", "metal", "woodwind", "musical", "pitch", "slide", "shrill", "high", "melody", "song", "folk", "celtic", "whistle", "penny", "player", "vibration", "performance", "studio", "orchestra", "note", "composition", "sound", "breeze", "clear", "acoustic", "air", "blow"]
  },
  {
    id: "Crowd Party Cheer.wav",
    name: "Crowd Party Cheer",
    tags: ["celebration", "applause", "shouting", "gathering", "festive", "excitement", "joy", "hurrah", "yelling", "applause", "clapping", "music", "loud", "voices", "social", "event", "club", "bar", "midnight", "countdown", "toast", "happy", "energetic", "party", "atmosphere", "vibe", "group", "rowdy", "thrilled", "success"]
  },
  {
    id: "Sword Fight.wav",
    name: "Sword Fight",
    tags: ["clash", "metal", "steel", "blade", "duel", "combat", "fencing", "parry", "strike", "defense", "attack", "armor", "knight", "medieval", "spark", "hitting", "ring", "clang", "sharpness", "battle", "warrior", "action", "martial", "fencing", "weapon", "scrap", "melee", "fight", "conflict", "iron"]
  },
  {
    id: "Heavy Breating.wav",
    name: "Heavy Breathing",
    tags: ["pant", "gasp", "exhaustion", "tired", "workout", "sprint", "fear", "panic", "air", "lungs", "breath", "pulse", "inhale", "exhale", "laboring", "exertion", "intense", "chase", "hide", "silent", "mouth", "throat", "hyperventilate", "rhythmic", "struggle", "adrenaline", "fatigue", "asthma", "sigh", "out-of-breath"]
  },
  {
    id: "Heartbeat.wav",
    name: "Heartbeat",
    tags: ["pulse", "rhythmic", "chest", "pump", "blood", "life", "thumping", "drum", "steady", "anxiety", "adrenaline", "heart", "medical", "stethoscope", "vital", "pace", "organ", "beat", "throb", "interior", "internal", "biological", "sound", "suspense", "tension", "alive", "fear", "health", "cardio", "pressure"]
  },
  {
    id: "Typing.wav",
    name: "Typing",
    tags: ["keyboard", "buttons", "click", "clack", "office", "computer", "writing", "work", "desktop", "laptop", "input", "letters", "speed", "mechanical", "qwerty", "tapping", "keys", "data", "secretary", "coding", "email", "message", "technology", "digital", "press", "rhythm", "sounds", "workstation", "terminal", "rapid"]
  },
  {
    id: "Coins.wav",
    name: "Coins",
    tags: ["money", "gold", "silver", "treasure", "pay", "riches"]
  },
  {
    id: "Chain.wav",
    name: "Chain",
    tags: ["metal", "links", "rattle", "heavy", "iron", "shackles", "lock", "bondage", "pull", "drag", "anchor", "clank", "prison", "dungeon", "rust", "industrial", "swing", "secure", "metallic", "clatter", "bond", "tied", "fence", "gate", "hoist", "mechanism", "gear", "restraint", "steel", "dragging"]
  },
  {
    id: "Whip - Tripple.wav",
    name: "Whip - Triple",
    tags: ["crack", "leather", "snap", "lash", "flick", "speed", "sting", "strike", "fast", "air", "triple", "consecutive", "impact", "force", "sound", "sting", "cowpoke", "rider", "tamer", "weapon", "lashing", "sharp", "pop", "breeze", "rapid", "sequence", "motion", "hit", "swing", "rhythmic"]
  },
  {
    id: "Water - Bubbles.wav",
    name: "Water - Bubbles",
    tags: ["liquid", "air", "popping", "boiling", "brewing", "underwater", "gas", "fizz", "carbonation", "soda", "tank", "aquarium", "oxygen", "sphere", "floating", "rising", "gentle", "gurgle", "foam", "suds", "soap", "wash", "chemical", "science", "vat", "potion", "stew", "simmering", "release", "wet"]
  },
  {
    id: "Ocean - Waves.wav",
    name: "Ocean - Waves",
    tags: ["sea", "water", "surf", "beach", "coast", "shore", "crashing", "spray", "tide", "saline", "salt", "blue", "rhythmic", "splashing", "foam", "horizon", "vacation", "marine", "nature", "power", "washing", "roar", "swell", "breaker", "aquatic", "island", "tropical", "cove", "mist", "ebb"]
  },
  {
    id: "Liquid - Pour.wav",
    name: "Liquid - Pour",
    tags: ["water", "glass", "drink", "bottle", "stream", "flow", "splashing", "wet", "vessel", "pitcher", "thirst", "filling", "container", "beverage", "fluid", "kitchen", "tap", "fountain", "waterfall", "spill", "steady", "splash", "dripping", "sound", "hydration", "movement", "drain", "cup", "mug", "carafe"]
  },
  {
    id: "Liquid - Spash.wav",
    name: "Liquid - Splash",
    tags: ["splash", "water", "drop", "impact", "puddle", "wet", "rippling", "dive", "jump", "basin", "liquid", "bucket", "spilling", "surface", "wave", "movement", "aquatic", "bath", "sink", "plunge", "falling", "rain", "pool", "lake", "river", "moisture", "saturation", "fountain", "mist", "droplet"]
  },
  {
    id: "Run - Men.wav",
    name: "Run - Men",
    tags: ["footsteps", "pavement", "ground", "race", "sprint", "chase", "group", "team", "heavy", "movement", "shoes", "grass", "dirt", "speed", "escape", "hunting", "jogging", "athletes", "soldiers", "rhythm", "thud", "collective", "hurry", "panic", "rush", "exercise", "fitness", "pursuit", "boots", "sneakers"]
  },
  {
    id: "Run - Man.wav",
    name: "Run - Man",
    tags: ["footstep", "individual", "sole", "running", "jogging", "panting", "pavement", "concrete", "chase", "solo", "athlete", "speed", "hurry", "escape", "path", "trail", "street", "sneakers", "boots", "impact", "rhythm", "fast", "motion", "sprint", "exercise", "pursuit", "singular", "gait", "pace", "journey"]
  },
  {
    id: "Walk - Soft Surface.wav",
    name: "Walk - Soft Surface",
    tags: ["footsteps", "carpet", "grass", "sand", "mud", "muffled", "quiet", "stealth", "slow", "stroll", "padding", "house", "indoor", "nature", "garden", "forest", "floor", "surface", "walking", "gentle", "soft", "weight", "pressure", "movement", "pace", "stride", "sneakers", "socks", "barefoot", "approach"]
  },
  {
    id: "Walk - Man Hard Surface.wav",
    name: "Walk - Man Hard Surface",
    tags: ["footsteps", "boots", "shoes", "concrete", "tile", "wood", "loud", "echo", "hallway", "stone", "pavement", "street", "corridor", "individual", "rhythmic", "gait", "stride", "clack", "heel", "leather", "solid", "firm", "pace", "approach", "departure", "city", "sidewalk", "industrial", "weight", "sound"]
  },
  {
    id: "Rain.wav",
    name: "Rain",
    tags: ["storm", "precipitation", "drizzle", "shower", "downpour", "thunder", "umbrella"]
  },
  {
    id: "Thud.mp3",
    name: "Thud",
    tags: ["heavy", "fall", "drop", "ground", "impact", "weight", "blunt", "hit", "sound", "floor", "carpet", "solid", "dull", "accident", "crash", "luggage", "body", "box", "item", "landing", "collision", "shock", "bass", "loud", "sudden", "object", "gravity", "thump", "knock", "jolt"]
  },
  {
    id: "Playing Cards.wav",
    name: "Playing Cards",
    tags: ["shuffling", "deck", "poker", "casino", "game", "gambling", "table", "deal", "hand", "bridge", "snap", "flick", "paper", "plastic", "suit", "king", "queen", "ace", "betting", "pastime", "cardboard", "sliding", "stack", "discard", "draw", "trick", "magician", "hobby", "social", "competition"]
  },
  {
    id: "Sword Sound.mp3",
    name: "Sword Sound",
    tags: ["metal", "steel", "blade", "unsheathe", "draw", "sharp", "ring", "weapon", "edge", "knight", "sword", "warrior", "fight", "duel", "slice", "metal", "swipe", "swing", "clash", "shimmering", "knightly", "medieval", "iron", "scrape", "scabbard", "holster", "gleaming", "silver", "armory", "battle"]
  },
  {
    id: "Crowd.wav",
    name: "Crowd",
    tags: ["people", "many", "group", "gathering", "voices", "murmur", "chatter", "noise", "background", "atmosphere", "stadium", "city", "market", "public", "square", "assembly", "audience", "bustle", "collective", "hubbub", "hum", "ambient", "conversation", "mingling", "hall", "terminal", "station", "plaza", "social", "masses"]
  },
  {
    id: "Wood Creaking.mp3",
    name: "Wood Creaking",
    tags: ["old", "door", "floor", "house", "antique", "ship", "mast", "stairs", "wood", "pressure", "age", "scary", "horror", "tension", "weight", "hinge", "timber", "structural", "cracking", "moaning", "groaning", "movement", "floorboards", "attic", "basement", "cabin", "rustic", "slow", "friction", "squeak"]
  },
  {
    id: "Storm.wav",
    name: "Storm",
    tags: ["thunder", "lightning", "wind", "rain", "tempest", "dark", "clouds", "weather", "nature", "power", "roar", "flashes", "heavy", "atmosphere", "danger", "rumble", "sky", "cyclone", "hurricane", "gale", "outdoors", "wet", "grey", "pressure", "warning", "force", "environment", "strike", "electricity", "chaos"]
  },
  {
    id: "Wind - Strong Gusts.wav",
    name: "Wind - Strong Gusts",
    tags: ["air", "blow", "breeze", "gale", "storm", "blast", "howling", "whistling", "weather", "nature", "movement", "force", "cold", "winter", "trees", "swaying", "leaves", "outdoor", "ambient", "gusty", "pressure", "whistling", "rustle", "desert", "mountains", "canyon", "rush", "surge", "draft", "sweep"]
  },
  {
    id: "Harbor.wav",
    name: "Harbor",
    tags: ["sea", "water", "boat", "ship", "dock", "pier", "port", "ocean", "ropes", "creaking", "seagulls", "waves", "maritime", "nautical", "wood", "floating", "anchor", "bay", "marina", "sailors", "adventure", "journey", "metal", "chain", "breeze", "splashing", "shipping", "trade", "horizon", "landing"]
  },
  {
    id: "Waves - Boat Ship.wav",
    name: "Waves - Boat Ship",
    tags: ["water", "splash", "bow", "hull", "sea", "ocean", "maritime", "sailing", "movement", "vessel", "deck", "wood", "metal", "rhythm", "engine", "journey", "navigation", "voyage", "cargo", "waves", "crashing", "surf", "blue", "salt", "horizon", "adventure", "transport", "ferry", "yacht", "wake"]
  },
  {
    id: "River.wav",
    name: "River",
    tags: ["stream", "flow", "water", "nature", "forest", "running", "liquid", "stones", "rocks", "splashing", "babbling", "brook", "current", "freshwater", "wild", "mountains", "valley", "outdoor", "serenity", "continuous", "moving", "ripple", "cascade", "fishing", "aquatic", "bank", "bed", "ecosystem", "environment", "channel"]
  },
  {
    id: "Wind.wav",
    name: "Wind",
    tags: ["air", "breeze", "rustle", "blow", "draft", "nature", "outdoor", "atmospheric", "ambient", "soft", "gentle", "movement", "leaves", "trees", "flow", "weather", "sky", "meadow", "calm", "sigh", "ventilation", "background", "quiet", "invisible", "drift", "current", "whisper", "subtle", "element", "environment"]
  },
  {
    id: "Paper.wav",
    name: "Paper",
    tags: ["sheet", "document", "writing", "crinkle", "rustle", "flipping", "book", "page", "office", "reading", "folder", "parchment", "stationary", "student", "library", "turning", "stack", "handling", "shuffle", "flat", "texture", "light", "dry", "pulp", "school", "notes", "report", "white", "physical", "manual"]
  },
  {
    id: "Fire - Sound Long Ambience.wav",
    name: "Fire - Sound Long Ambience",
    tags: ["burning", "crackle", "flames", "heat", "wood", "campfire", "hearth", "fireplace", "sparks", "warmth", "orange", "red", "glow", "logs", "smoke", "dry", "outdoor", "interior", "cozy", "spit", "snapping", "light", "timber", "ash", "ember", "flicker", "roar", "forest", "fuel", "steady"]
  },
  {
    id: "Fire - Blaze.mp3",
    name: "Fire - Blaze",
    tags: ["roaring", "heat", "intense", "inferno", "flames", "hot", "destruction", "power", "loud", "burning", "house", "building", "forest", "wind", "oxygen", "consuming", "orange", "fire", "flare", "ignition", "danger", "emergency", "loud", "crackling", "smoke", "ash", "embers", "light", "energy", "rapid"]
  },
  {
    id: "Battle - Modern War.wav",
    name: "Battle - Modern War",
    tags: ["guns", "shots", "bullets", "rifles", "automatic", "fire", "artillery", "combat", "soldiers", "military", "army", "city", "ruins", "explosions", "shouting", "radio", "equipment", "metal", "shouting", "orders", "chaos", "noise", "technology", "defense", "attack", "field", "gravel", "impact", "whistle", "barrage"]
  },
  {
    id: "Explosion.mp3",
    name: "Explosion",
    tags: ["blast", "boom", "bang", "shockwave", "debris", "destruction", "loud", "sudden", "impact", "fire", "smoke", "dust", "artillery", "bomb", "grenade", "heavy", "force", "pressure", "crash", "noise", "burst", "erupt", "shatter", "collapse", "dynamic", "audio", "peak", "power", "rumble", "detonation"]
  },
  {
    id: "Horse - Sounds.wav",
    name: "Horse - Sounds",
    tags: ["animal", "whinny", "snort", "breath", "neigh", "stable", "farm", "field", "rider", "saddle", "leather", "hay", "livestock", "mammal", "ears", "hoof", "hair", "nature", "ranch", "biology", "vocalization", "organic", "brown", "black", "white", "gallop", "walk", "trot", "farmyard", "hoofbeat"]
  },
  {
    id: "Horse - Gallup Run.wav",
    name: "Horse - Gallup Run",
    tags: ["hoofbeat", "rhythm", "speed", "ground", "dirt", "grass", "race", "fast", "movement", "animal", "horse", "rider", "chase", "flight", "power", "steady", "thud", "impact", "hooves", "trot", "sprint", "meadow", "trail", "prairie", "carriage", "cowboy", "cavalry", "boots", "dust", "stampede"]
  },
  {
    id: "Carriage.wav",
    name: "Carriage",
    tags: ["wheels", "wood", "road", "stone", "gravel", "horse", "hitch", "pull", "travel", "old", "historical", "victorian", "journey", "transport", "carriage", "coach", "street", "rhythmic", "clatter", "jingle", "harness", "leather", "motion", "driver", "passengers", "road", "cobblestone", "rattle", "squeak", "arrive"]
  },
  {
    id: "Battle - Swords.wav",
    name: "Battle - Swords",
    tags: ["clash", "steel", "metal", "shouting", "screams", "chaos", "armor", "hits", "strikes", "combat", "medieval", "war", "field", "army", "soldiers", "blood", "blades", "clanging", "melee", "defense", "weapon", "iron", "shield", "death", "glory", "historical", "intense", "mass", "fighting", "ring"]
  },
  {
    id: "Battle - Men Getting Ready.mp3",
    name: "Battle - Men Getting Ready",
    tags: ["armor", "metal", "clinking", "buckles", "leather", "swords", "scabbard", "soldiers", "murmuring", "preparation", "camp", "equipment", "strapping", "boots", "walking", "heavy", "tense", "breathing", "sharpening", "orders", "movement", "group", "army", "units", "battalion", "steel", "gear", "voices", "quiet", "before"]
  },
  {
    id: "Whip.mp3",
    name: "Whip",
    tags: ["crack", "snap", "leather", "flick", "sting", "air", "motion", "lash", "strike", "single", "hit", "sharp", "loud", "impact", "pop", "speed", "weapon", "swing", "cowboy", "rider", "tamer", "training", "punishment", "force", "motion", "trail", "sound", "audio", "effect", "signal"]
  },
  {
    id: "Axe-Wood2.mp3",
    name: "Axe Wood 2",
    tags: ["axe", "wood", "chop", "cut", "timber", "strike", "tree"]
  },
  {
    id: "Cry-Child-Female.mp3",
    name: "Cry Child Female",
    tags: ["cry", "child", "female", "weep", "sob", "sad", "girl"]
  },
  {
    id: "Fail.mp3",
    name: "Fail",
    tags: ["fail", "lose", "error", "wrong", "mistake", "game", "negative"]
  },
  {
    id: "Funny Sound.mp3",
    name: "Funny Sound",
    tags: ["funny", "comedy", "joke", "laugh", "silly", "humor", "quirky"]
  },
  {
    id: "Happy .mp3",
    name: "Happy",
    tags: ["happy", "joy", "cheerful", "smile", "upbeat", "positive", "glad"]
  },
  {
    id: "Hope.mp3",
    name: "Hope",
    tags: ["hope", "optimism", "bright", "future", "uplifting", "positive"]
  },
  {
    id: "Sad.mp3",
    name: "Sad",
    tags: ["sad", "sorrow", "depressed", "melancholy", "down", "emotional"]
  },
  {
    id: "Saw-Wood.mp3",
    name: "Saw Wood",
    tags: ["saw", "wood", "cut", "carpenter", "tool", "timber", "building"]
  },
  {
    id: "Saw-wood2.mp3",
    name: "Saw Wood 2",
    tags: ["saw", "wood", "cut", "carpenter", "tool", "timber", "building"]
  },
  {
    id: "Scheme .mp3",
    name: "Scheme",
    tags: ["scheme", "plot", "plan", "sneaky", "villain", "devious", "secret"]
  },
  {
    id: "Soldier.mp3",
    name: "Soldier",
    tags: ["soldier", "army", "military", "march", "war", "troop", "infantry"]
  },
  {
    id: "Suspense Sound.mp3",
    name: "Suspense Sound",
    tags: ["suspense", "tension", "thriller", "scary", "mystery", "dark", "build"]
  }
].sort((a, b) => a.name.localeCompare(b.name));

export function identifySoundEffectForPage(pageText: string, imagePrompt: string, availableSfx: SoundEffectDefinition[] = SOUND_EFFECTS): string | undefined {
  const combinedText = `${pageText} ${imagePrompt}`.toLowerCase();
  // simple tokenization: match words
  const words = combinedText.match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);

  let bestMatchId: string | undefined = undefined;
  let maxScore = 0;

  for (const sfx of availableSfx) {
    let score = 0;
    for (const tag of sfx.tags) {
      if (uniqueWords.has(tag.toLowerCase())) {
        score++;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatchId = sfx.id;
    }
  }

  return bestMatchId;
}
