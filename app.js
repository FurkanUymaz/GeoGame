const GITHUB_REPO_URL = "https://github.com/FurkanUymaz/geogame";
const AI_ACCURACY_RATE = 0.65;
const AI_PLAYER_NAME = "Atlas AI";

const state = {
  gameMode: "friend",
  gridMode: "club_vs_club",
  players: {
    X: "",
    O: ""
  },
  difficulty: "medium",
  horizontalCountry: null,
  horizontalNations: [],
  verticalCountry: null,
  colClubs: [],
  colNations: [],
  rowClubs: [],
  board: Array(3).fill(null).map(() => Array(3).fill(null)),
  usedPlayers: new Set(),
  turn: "X",
  scores: { X: 0, O: 0 },
  gameOver: false,
  isAiThinking: false,
  aiTimer: null,
  activeCell: null,
  hoveredCountry: null,
  countryScreenCoords: {},
  worldGeoFeatures: null,
  geoLoadAttempted: false,
  autocompleteMatches: [],
  highlightedIndex: -1,
  mapView: {
    zoom: 1,
    targetZoom: 1,
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    minZoom: 1,
    maxZoom: 8,
    isDragging: false,
    hasMoved: false,
    dragStartX: 0,
    dragStartY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    activeRegion: "world",
    pulsePhase: 0,
    needsRender: true
  }
};

const AVATAR_STORAGE_KEY = "geogame_player_avatars_v1";
const AVATAR_CACHE_LIMIT = 1500;
const playerAvatarCache = new Map();
let avatarDebounceTimer = null;

function loadAvatarCache() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw);
    if (Array.isArray(entries)) {
      entries.forEach(([key, val]) => {
        if (typeof key === "string") {
          playerAvatarCache.set(key, val);
        }
      });
    }
  } catch (err) {
  }
}

function persistAvatarCache() {
  try {
    while (playerAvatarCache.size > AVATAR_CACHE_LIMIT) {
      const oldestKey = playerAvatarCache.keys().next().value;
      playerAvatarCache.delete(oldestKey);
    }
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(Array.from(playerAvatarCache.entries())));
  } catch (err) {
  }
}

function getPlayerInitials(playerName) {
  const parts = String(playerName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function applyAvatarImage(wrapElement, imageUrl, playerName) {
  if (!wrapElement || !imageUrl) return;
  const img = document.createElement("img");
  img.className = "player-avatar-img";
  img.src = imageUrl;
  img.alt = playerName;
  img.loading = "lazy";
  img.decoding = "async";
  img.onerror = () => {
    playerAvatarCache.set(playerName, null);
    persistAvatarCache();
    wrapElement.textContent = getPlayerInitials(playerName);
  };
  wrapElement.textContent = "";
  wrapElement.appendChild(img);
}

function createPlayerAvatarElement(playerName) {
  const wrap = document.createElement("span");
  wrap.className = "player-avatar-wrap";
  wrap.dataset.avatarPlayer = playerName;
  const cachedUrl = playerAvatarCache.get(playerName);
  if (cachedUrl) {
    applyAvatarImage(wrap, cachedUrl, playerName);
  } else {
    wrap.textContent = getPlayerInitials(playerName);
  }
  return wrap;
}

async function fetchSearchAvatarFromWiki(lang, queryText) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: queryText,
    gsrlimit: "1",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "96"
  });
  try {
    const response = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json();
    const pages = Object.values(data?.query?.pages || {});
    return pages[0]?.thumbnail?.source || null;
  } catch (err) {
    return null;
  }
}

async function fetchFallbackFootballerAvatar(playerName) {
  const enUrl = await fetchSearchAvatarFromWiki("en", `${playerName} footballer`);
  if (enUrl) return enUrl;
  return fetchSearchAvatarFromWiki("tr", `${playerName} futbolcu`);
}

async function fetchBatchPlayerAvatars(playerNames) {
  const uniqueNames = Array.from(new Set(playerNames)).filter((name) => !playerAvatarCache.has(name));
  if (uniqueNames.length === 0) return;

  const batch = uniqueNames.slice(0, 20);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    redirects: "1",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "96",
    titles: batch.join("|")
  });

  const unresolved = [];

  try {
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      const query = data?.query || {};
      const normMap = new Map((query.normalized || []).map((item) => [item.from, item.to]));
      const redirMap = new Map((query.redirects || []).map((item) => [item.from, item.to]));
      const thumbByTitle = new Map();

      Object.values(query.pages || {}).forEach((page) => {
        if (page?.title && page?.thumbnail?.source) {
          thumbByTitle.set(page.title, page.thumbnail.source);
        }
      });

      batch.forEach((origName) => {
        let resolved = normMap.get(origName) || origName;
        for (let step = 0; step < 5; step += 1) {
          if (redirMap.has(resolved)) {
            resolved = redirMap.get(resolved);
          } else {
            break;
          }
        }
        const thumbUrl = thumbByTitle.get(resolved) || null;
        if (thumbUrl) {
          playerAvatarCache.set(origName, thumbUrl);
        } else {
          unresolved.push(origName);
        }
      });
    }
  } catch (err) {
  }

  for (const name of unresolved.slice(0, 5)) {
    const fallbackUrl = await fetchFallbackFootballerAvatar(name);
    playerAvatarCache.set(name, fallbackUrl);
  }

  unresolved.slice(5).forEach((name) => {
    if (!playerAvatarCache.has(name)) {
      playerAvatarCache.set(name, null);
    }
  });

  persistAvatarCache();

  document.querySelectorAll("[data-avatar-player]").forEach((el) => {
    const targetName = el.dataset.avatarPlayer;
    const url = playerAvatarCache.get(targetName);
    if (url && !el.querySelector("img")) {
      applyAvatarImage(el, url, targetName);
    }
  });
}

function hydrateDropdownAvatars(playerNames) {
  clearTimeout(avatarDebounceTimer);
  avatarDebounceTimer = setTimeout(() => {
    fetchBatchPlayerAvatars(playerNames);
  }, 120);
}

loadAvatarCache();

const REGION_PRESETS = {
  world: { lat: 18, lng: 12, zoom: 1.0 },
  europe: { lat: 48.5, lng: 12.5, zoom: 3.5 },
  americas: { lat: -5.0, lng: -68.0, zoom: 1.85 },
  asia: { lat: 12.0, lng: 112.0, zoom: 2.15 }
};

const DIFFICULTY_META = {
  easy: { label: "Easy", desc: "Top Clubs & Major Nations" },
  medium: { label: "Medium", desc: "Balanced Mix" },
  hard: { label: "Hard", desc: "Lesser-Known Clubs & Nations" }
};

const MAJOR_FOOTBALL_NATIONS = new Set([
  "TUR", "BRA", "ARG", "FRA", "ESP", "GER", "ITA", "ENG", "POR", "NED",
  "BEL", "CRO", "URU", "COL", "SEN", "MAR", "NGA", "SRB", "SUI", "DEN",
  "SWE", "NOR", "POL", "AUT", "USA", "MEX", "JPN", "KOR", "CIV", "GHA",
  "CMR", "ALG", "EGY", "UKR", "CZE", "SCO", "GRE", "CHI", "PER", "ECU"
]);

const EXTRA_NATION_CATALOG = {
  TUR: { name: "Turkey", lat: 39.0, lng: 35.2 },
  ENG: { name: "England", lat: 52.5, lng: -1.5 },
  SCO: { name: "Scotland", lat: 56.5, lng: -4.2 },
  WAL: { name: "Wales", lat: 52.1, lng: -3.8 },
  NIR: { name: "Northern Ireland", lat: 54.6, lng: -6.7 },
  IRL: { name: "Republic of Ireland", lat: 53.4, lng: -8.0 },
  ESP: { name: "Spain", lat: 40.4, lng: -3.7 },
  ITA: { name: "Italy", lat: 42.8, lng: 12.5 },
  GER: { name: "Germany", lat: 51.1, lng: 10.4 },
  FRA: { name: "France", lat: 46.6, lng: 2.2 },
  NED: { name: "Netherlands", lat: 52.1, lng: 5.3 },
  POR: { name: "Portugal", lat: 39.5, lng: -8.0 },
  BEL: { name: "Belgium", lat: 50.8, lng: 4.5 },
  RUS: { name: "Russia", lat: 55.7, lng: 37.6 },
  UKR: { name: "Ukraine", lat: 49.0, lng: 31.4 },
  GRE: { name: "Greece", lat: 39.0, lng: 22.0 },
  AUT: { name: "Austria", lat: 47.5, lng: 14.5 },
  SUI: { name: "Switzerland", lat: 46.8, lng: 8.2 },
  DEN: { name: "Denmark", lat: 56.0, lng: 9.5 },
  NOR: { name: "Norway", lat: 60.5, lng: 8.5 },
  SWE: { name: "Sweden", lat: 60.1, lng: 18.6 },
  FIN: { name: "Finland", lat: 62.0, lng: 25.7 },
  ISL: { name: "Iceland", lat: 64.9, lng: -19.0 },
  POL: { name: "Poland", lat: 52.0, lng: 19.1 },
  CZE: { name: "Czech Republic", lat: 49.8, lng: 15.5 },
  SVK: { name: "Slovakia", lat: 48.7, lng: 19.7 },
  SVN: { name: "Slovenia", lat: 46.1, lng: 14.8 },
  HUN: { name: "Hungary", lat: 47.2, lng: 19.5 },
  ROU: { name: "Romania", lat: 45.9, lng: 24.9 },
  BUL: { name: "Bulgaria", lat: 42.7, lng: 25.5 },
  CRO: { name: "Croatia", lat: 45.1, lng: 15.2 },
  SRB: { name: "Serbia", lat: 44.0, lng: 21.0 },
  BIH: { name: "Bosnia and Herzegovina", lat: 43.9, lng: 17.7 },
  MNE: { name: "Montenegro", lat: 42.7, lng: 19.3 },
  MKD: { name: "North Macedonia", lat: 41.6, lng: 21.7 },
  ALB: { name: "Albania", lat: 41.1, lng: 20.1 },
  KVX: { name: "Kosovo", lat: 42.6, lng: 20.9 },
  CYP: { name: "Cyprus", lat: 35.1, lng: 33.4 },
  GEO: { name: "Georgia", lat: 42.3, lng: 43.3 },
  ARM: { name: "Armenia", lat: 40.1, lng: 45.0 },
  AZE: { name: "Azerbaijan", lat: 40.4, lng: 47.6 },
  KAZ: { name: "Kazakhstan", lat: 48.0, lng: 66.9 },
  UZB: { name: "Uzbekistan", lat: 41.3, lng: 64.5 },
  EST: { name: "Estonia", lat: 58.6, lng: 25.0 },
  LVA: { name: "Latvia", lat: 56.9, lng: 24.6 },
  LTU: { name: "Lithuania", lat: 55.2, lng: 23.9 },
  BLR: { name: "Belarus", lat: 53.7, lng: 27.9 },
  MDA: { name: "Moldova", lat: 47.0, lng: 28.8 },
  ISR: { name: "Israel", lat: 31.5, lng: 34.8 },
  USA: { name: "United States", lat: 38.9, lng: -97.0 },
  CAN: { name: "Canada", lat: 56.1, lng: -106.3 },
  MEX: { name: "Mexico", lat: 23.6, lng: -102.5 },
  CRC: { name: "Costa Rica", lat: 9.7, lng: -83.8 },
  PAN: { name: "Panama", lat: 8.5, lng: -80.8 },
  HON: { name: "Honduras", lat: 15.2, lng: -86.2 },
  JAM: { name: "Jamaica", lat: 18.1, lng: -77.3 },
  BRA: { name: "Brazil", lat: -14.2, lng: -51.9 },
  ARG: { name: "Argentina", lat: -34.6, lng: -63.6 },
  COL: { name: "Colombia", lat: 4.6, lng: -74.3 },
  CHI: { name: "Chile", lat: -35.6, lng: -71.5 },
  PER: { name: "Peru", lat: -9.2, lng: -75.0 },
  ECU: { name: "Ecuador", lat: -1.8, lng: -78.2 },
  URU: { name: "Uruguay", lat: -32.5, lng: -55.8 },
  PAR: { name: "Paraguay", lat: -23.4, lng: -58.4 },
  VEN: { name: "Venezuela", lat: 6.4, lng: -66.6 },
  BOL: { name: "Bolivia", lat: -16.3, lng: -63.6 },
  MAR: { name: "Morocco", lat: 31.8, lng: -7.1 },
  ALG: { name: "Algeria", lat: 28.0, lng: 1.7 },
  TUN: { name: "Tunisia", lat: 33.9, lng: 9.5 },
  EGY: { name: "Egypt", lat: 26.8, lng: 30.8 },
  SEN: { name: "Senegal", lat: 14.5, lng: -14.5 },
  NGA: { name: "Nigeria", lat: 9.1, lng: 8.7 },
  CMR: { name: "Cameroon", lat: 7.4, lng: 12.4 },
  GHA: { name: "Ghana", lat: 7.9, lng: -1.0 },
  CIV: { name: "Ivory Coast", lat: 7.5, lng: -5.5 },
  MLI: { name: "Mali", lat: 17.6, lng: -4.0 },
  BFA: { name: "Burkina Faso", lat: 12.2, lng: -1.6 },
  GUI: { name: "Guinea", lat: 9.9, lng: -9.7 },
  COD: { name: "DR Congo", lat: -4.0, lng: 21.8 },
  GAB: { name: "Gabon", lat: -0.8, lng: 11.6 },
  ANG: { name: "Angola", lat: -11.2, lng: 17.9 },
  ZAM: { name: "Zambia", lat: -13.1, lng: 27.8 },
  RSA: { name: "South Africa", lat: -30.6, lng: 22.9 },
  CPV: { name: "Cape Verde", lat: 16.0, lng: -24.0 },
  GAM: { name: "The Gambia", lat: 13.4, lng: -15.3 },
  JPN: { name: "Japan", lat: 36.2, lng: 138.3 },
  KOR: { name: "South Korea", lat: 35.9, lng: 127.8 },
  CHN: { name: "China", lat: 35.9, lng: 104.2 },
  IRN: { name: "Iran", lat: 32.4, lng: 53.7 },
  IRQ: { name: "Iraq", lat: 33.2, lng: 43.7 },
  KSA: { name: "Saudi Arabia", lat: 23.9, lng: 45.1 },
  UAE: { name: "United Arab Emirates", lat: 23.4, lng: 53.8 },
  QAT: { name: "Qatar", lat: 25.3, lng: 51.2 },
  AUS: { name: "Australia", lat: -25.3, lng: 133.8 },
  NZL: { name: "New Zealand", lat: -40.9, lng: 174.9 }
};

const TIER1_CLUB_KEYWORDS = [
  "galatasaray", "fenerbahce", "besiktas", "trabzonspor",
  "bayern", "dortmund", "leverkusen", "leipzig", "frankfurt", "schalke",
  "real madrid", "barcelona", "atletico", "sevilla", "valencia", "villarreal", "real sociedad", "athletic",
  "manchester united", "manchester city", "liverpool", "arsenal", "chelsea", "tottenham", "newcastle", "aston villa", "west ham",
  "juventus", "inter", "milan", "napoli", "roma", "lazio", "atalanta", "fiorentina",
  "paris saint-germain", "psg", "marseille", "lyon", "monaco", "lille",
  "ajax", "psv", "feyenoord",
  "benfica", "porto", "sporting",
  "celtic", "rangers", "club brugge", "anderlecht",
  "shakhtar", "dynamo kyiv", "zenit", "cska", "spartak",
  "olympiacos", "panathinaikos", "paok", "aek",
  "salzburg", "basel", "young boys", "copenhagen",
  "boca juniors", "river plate", "flamengo", "palmeiras", "sao paulo", "corinthians", "santos",
  "al-hilal", "al-nassr", "al-ittihad", "al-ahli",
  "inter miami", "la galaxy"
];

const TIER2_CLUB_KEYWORDS = [
  "basaksehir", "adana demirspor", "antalyaspor", "konyaspor",
  "stuttgart", "werder bremen", "wolfsburg", "monchengladbach", "freiburg", "hoffenheim",
  "betis", "celta", "osasuna", "girona", "mallorca",
  "everton", "leicester", "brighton", "crystal palace", "fulham", "wolverhampton",
  "torino", "bologna", "udinese", "genoa", "sassuolo",
  "nice", "rennes", "lens", "nantes",
  "az alkmaar", "twente", "utrecht",
  "braga", "guimaraes", "genk", "standard", "gent",
  "rapid", "sturm", "midtjylland", "brondby"
];

const CLUB_ALIASES = {
  "inter milan": "inter",
  "internazionale": "inter",
  "internazionale milano": "inter",
  "paris saint germain": "psg",
  "paris sg": "psg",
  "manchester utd": "manchester united",
  "man utd": "manchester united",
  "man city": "manchester city",
  "tottenham hotspur": "tottenham",
  "spurs": "tottenham",
  "wolverhampton wanderers": "wolverhampton",
  "wolves": "wolverhampton",
  "athletic bilbao": "athletic club",
  "atletico de madrid": "atletico madrid",
  "real betis balompie": "real betis",
  "bayern munchen": "bayern munich",
  "borussia monchengladbach": "monchengladbach",
  "bayer 04 leverkusen": "bayer leverkusen",
  "dortmund": "borussia dortmund",
  "bvb": "borussia dortmund",
  "schalke 04": "schalke",
  "mainz 05": "mainz",
  "hannover 96": "hannover",
  "sporting cp": "sporting",
  "sporting lisbon": "sporting",
  "feyenoord rotterdam": "feyenoord",
  "psv eindhoven": "psv",
  "istanbul basaksehir": "basaksehir",
  "brighton hove albion": "brighton",
  "west bromwich albion": "west brom",
  "west ham united": "west ham",
  "newcastle united": "newcastle",
  "leicester city": "leicester",
  "leeds united": "leeds"
};

const SUPPLEMENTAL_PLAYERS = [
  { name: "Salih Özcan", nationalities: ["TUR", "GER"], clubs: ["1. FC Koln", "Holstein Kiel", "Borussia Dortmund", "VfL Wolfsburg", "Besiktas"] },
  { name: "Aral Şimşir", nationalities: ["TUR", "DEN"], clubs: ["FC Midtjylland", "Jerv", "Lillestrom"] },
  { name: "Orkun Kökçü", nationalities: ["TUR", "NED"], clubs: ["Feyenoord", "Benfica", "Besiktas"] },
  { name: "Tammy Abraham", nationalities: ["ENG"], clubs: ["Chelsea", "Bristol City", "Swansea City", "Aston Villa", "Roma", "AC Milan", "Besiktas"] },
  { name: "Wilfred Ndidi", nationalities: ["NGA"], clubs: ["Genk", "Leicester City", "Besiktas"] },
  { name: "İlkay Gündoğan", nationalities: ["GER"], clubs: ["VfL Bochum", "1. FC Nurnberg", "Borussia Dortmund", "Manchester City", "Barcelona", "Galatasaray"] },
  { name: "Leroy Sané", nationalities: ["GER", "FRA"], clubs: ["Schalke 04", "Manchester City", "Bayern Munich", "Galatasaray"] },
  { name: "Uğurcan Çakır", nationalities: ["TUR"], clubs: ["Trabzonspor", "Galatasaray"] },
  { name: "Kerem Aktürkoğlu", nationalities: ["TUR"], clubs: ["Galatasaray", "Benfica", "Fenerbahce"] },
  { name: "Jhon Durán", nationalities: ["COL"], clubs: ["Envigado", "Chicago Fire", "Aston Villa", "Al-Nassr", "Fenerbahce"] },
  { name: "Nélson Semedo", nationalities: ["POR"], clubs: ["Benfica", "Barcelona", "Wolverhampton Wanderers", "Fenerbahce"] },
  { name: "Marco Asensio", nationalities: ["ESP", "NED"], clubs: ["Mallorca", "Real Madrid", "Espanyol", "Paris Saint-Germain", "Aston Villa", "Fenerbahce"] },
  { name: "Ederson", nationalities: ["BRA", "POR"], clubs: ["Rio Ave", "Benfica", "Manchester City", "Fenerbahce"] },
  { name: "Nuri Şahin", nationalities: ["TUR", "GER"], clubs: ["Borussia Dortmund", "Feyenoord", "Real Madrid", "Liverpool", "Werder Bremen", "Antalyaspor"] },
  { name: "Shinji Kagawa", nationalities: ["JPN"], clubs: ["Cerezo Osaka", "Borussia Dortmund", "Manchester United", "Besiktas", "Real Zaragoza", "PAOK", "Sint-Truiden"] },
  { name: "Emre Can", nationalities: ["GER"], clubs: ["Bayern Munich", "Bayer Leverkusen", "Liverpool", "Juventus", "Borussia Dortmund"] },
  { name: "Andreas Beck", nationalities: ["GER"], clubs: ["VfB Stuttgart", "Hoffenheim", "Besiktas", "Eupen"] },
  { name: "Fabian Ernst", nationalities: ["GER"], clubs: ["Hannover 96", "Hamburger SV", "Werder Bremen", "Schalke 04", "Besiktas", "Kasimpasa"] },
  { name: "Roberto Hilbert", nationalities: ["GER"], clubs: ["Greuther Furth", "VfB Stuttgart", "Besiktas", "Bayer Leverkusen"] },
  { name: "Loris Karius", nationalities: ["GER"], clubs: ["Mainz 05", "Liverpool", "Besiktas", "Union Berlin", "Newcastle United", "Schalke 04"] },
  { name: "Can Uzun", nationalities: ["TUR", "GER"], clubs: ["1. FC Nurnberg", "Eintracht Frankfurt"] },
  { name: "Kenan Yıldız", nationalities: ["TUR", "GER"], clubs: ["Juventus"] },
  { name: "Deniz Undav", nationalities: ["GER"], clubs: ["Union Saint-Gilloise", "Brighton & Hove Albion", "VfB Stuttgart"] },
  { name: "Atakan Karazor", nationalities: ["TUR", "GER"], clubs: ["Holstein Kiel", "VfB Stuttgart"] },
  { name: "Eren Dinkçi", nationalities: ["TUR", "GER"], clubs: ["Werder Bremen", "1. FC Heidenheim", "SC Freiburg"] },
  { name: "Ozan Kabak", nationalities: ["TUR"], clubs: ["Galatasaray", "VfB Stuttgart", "Schalke 04", "Liverpool", "Norwich City", "Hoffenheim"] },
  { name: "Kaan Ayhan", nationalities: ["TUR", "GER"], clubs: ["Schalke 04", "Eintracht Frankfurt", "Fortuna Dusseldorf", "Sassuolo", "Galatasaray"] },
  { name: "Kerem Demirbay", nationalities: ["GER", "TUR"], clubs: ["Hamburger SV", "1. FC Kaiserslautern", "Fortuna Dusseldorf", "Hoffenheim", "Bayer Leverkusen", "Galatasaray"] },
  { name: "Mert Müldür", nationalities: ["TUR", "AUT"], clubs: ["Rapid Wien", "Sassuolo", "Fenerbahce"] },
  { name: "Zeki Çelik", nationalities: ["TUR"], clubs: ["Istanbulspor", "Lille", "Roma"] },
  { name: "Merih Demiral", nationalities: ["TUR"], clubs: ["Sporting CP", "Alanyaspor", "Sassuolo", "Juventus", "Atalanta", "Al-Ahli"] },
  { name: "Enes Ünal", nationalities: ["TUR"], clubs: ["Bursaspor", "Manchester City", "Genk", "NAC Breda", "Twente", "Villarreal", "Levante", "Real Valladolid", "Getafe", "Bournemouth"] },
  { name: "Yusuf Yazıcı", nationalities: ["TUR"], clubs: ["Trabzonspor", "Lille", "CSKA Moscow", "Olympiacos"] },
  { name: "Okay Yokuşlu", nationalities: ["TUR"], clubs: ["Altay", "Kayserispor", "Trabzonspor", "Celta Vigo", "West Bromwich Albion", "Getafe"] },
  { name: "Salih Uçan", nationalities: ["TUR"], clubs: ["Bucaspor", "Fenerbahce", "Roma", "Sion", "Empoli", "Alanyaspor", "Besiktas"] },
  { name: "Semih Kılıçsoy", nationalities: ["TUR"], clubs: ["Besiktas"] },
  { name: "Barış Alper Yılmaz", nationalities: ["TUR"], clubs: ["Galatasaray"] },
  { name: "Yunus Akgün", nationalities: ["TUR"], clubs: ["Galatasaray", "Adana Demirspor", "Leicester City"] },
  { name: "Abdülkerim Bardakcı", nationalities: ["TUR"], clubs: ["Konyaspor", "Galatasaray"] },
  { name: "İsmail Yüksek", nationalities: ["TUR"], clubs: ["Fenerbahce"] },
  { name: "Mert Günok", nationalities: ["TUR"], clubs: ["Fenerbahce", "Bursaspor", "Istanbul Basaksehir", "Besiktas"] },
  { name: "Cenk Tosun", nationalities: ["TUR", "GER"], clubs: ["Eintracht Frankfurt", "Gaziantepspor", "Besiktas", "Everton", "Crystal Palace", "Fenerbahce"] },
  { name: "Rıdvan Yılmaz", nationalities: ["TUR"], clubs: ["Besiktas", "Rangers"] },
  { name: "Emirhan İlkhan", nationalities: ["TUR"], clubs: ["Besiktas", "Torino", "Sampdoria", "Istanbul Basaksehir"] },
  { name: "Altay Bayındır", nationalities: ["TUR"], clubs: ["Ankaragucu", "Fenerbahce", "Manchester United"] },
  { name: "Robin van Persie", nationalities: ["NED"], clubs: ["Feyenoord", "Arsenal", "Manchester United", "Fenerbahce"] },
  { name: "Mesut Özil", nationalities: ["GER"], clubs: ["Schalke 04", "Werder Bremen", "Real Madrid", "Arsenal", "Fenerbahce", "Istanbul Basaksehir"] },
  { name: "Nicolas Anelka", nationalities: ["FRA"], clubs: ["Paris Saint-Germain", "Arsenal", "Real Madrid", "Liverpool", "Manchester City", "Fenerbahce", "Bolton Wanderers", "Chelsea", "Juventus", "West Bromwich Albion"] },
  { name: "Didier Drogba", nationalities: ["CIV"], clubs: ["Marseille", "Chelsea", "Galatasaray"] },
  { name: "Wesley Sneijder", nationalities: ["NED"], clubs: ["Ajax", "Real Madrid", "Inter", "Galatasaray", "Nice"] },
  { name: "Lukas Podolski", nationalities: ["GER", "POL"], clubs: ["1. FC Koln", "Bayern Munich", "Arsenal", "Inter", "Galatasaray", "Antalyaspor"] },
  { name: "Lucas Torreira", nationalities: ["URU", "ESP"], clubs: ["Sampdoria", "Arsenal", "Atletico Madrid", "Fiorentina", "Galatasaray"] },
  { name: "Mohamed Elneny", nationalities: ["EGY"], clubs: ["Basel", "Arsenal", "Besiktas"] },
  { name: "Alex Oxlade-Chamberlain", nationalities: ["ENG"], clubs: ["Southampton", "Arsenal", "Liverpool", "Besiktas"] },
  { name: "Michy Batshuayi", nationalities: ["BEL"], clubs: ["Standard Liege", "Marseille", "Chelsea", "Borussia Dortmund", "Valencia", "Crystal Palace", "Besiktas", "Fenerbahce", "Galatasaray", "Eintracht Frankfurt"] },
  { name: "Fred", nationalities: ["BRA"], clubs: ["Internacional", "Shakhtar Donetsk", "Manchester United", "Fenerbahce"] },
  { name: "Edin Džeko", nationalities: ["BIH"], clubs: ["VfL Wolfsburg", "Manchester City", "Roma", "Inter", "Fenerbahce"] },
  { name: "Dušan Tadić", nationalities: ["SRB"], clubs: ["Groningen", "Twente", "Southampton", "Ajax", "Fenerbahce"] },
  { name: "Mauro Icardi", nationalities: ["ARG", "ITA"], clubs: ["Sampdoria", "Inter", "Paris Saint-Germain", "Galatasaray"] },
  { name: "Dries Mertens", nationalities: ["BEL"], clubs: ["Utrecht", "PSV", "Napoli", "Galatasaray"] },
  { name: "Hakim Ziyech", nationalities: ["MAR", "NED"], clubs: ["Heerenveen", "Twente", "Ajax", "Chelsea", "Galatasaray"] },
  { name: "Wilfried Zaha", nationalities: ["CIV", "ENG"], clubs: ["Crystal Palace", "Manchester United", "Cardiff City", "Galatasaray", "Lyon"] },
  { name: "Davinson Sánchez", nationalities: ["COL"], clubs: ["Atletico Nacional", "Ajax", "Tottenham Hotspur", "Galatasaray"] },
  { name: "Tanguy Ndombele", nationalities: ["FRA"], clubs: ["Amiens", "Lyon", "Tottenham Hotspur", "Napoli", "Galatasaray", "Nice"] },
  { name: "Serge Aurier", nationalities: ["CIV", "FRA"], clubs: ["Lens", "Toulouse", "Paris Saint-Germain", "Tottenham Hotspur", "Villarreal", "Nottingham Forest", "Galatasaray"] },
  { name: "Cédric Bakambu", nationalities: ["COD", "FRA"], clubs: ["Sochaux", "Bursaspor", "Villarreal", "Marseille", "Olympiacos", "Galatasaray", "Real Betis"] },
  { name: "Juan Mata", nationalities: ["ESP"], clubs: ["Valencia", "Chelsea", "Manchester United", "Galatasaray"] },
  { name: "Victor Osimhen", nationalities: ["NGA"], clubs: ["VfL Wolfsburg", "Charleroi", "Lille", "Napoli", "Galatasaray"] },
  { name: "Álvaro Morata", nationalities: ["ESP"], clubs: ["Real Madrid", "Juventus", "Chelsea", "Atletico Madrid", "AC Milan", "Galatasaray"] },
  { name: "Milan Škriniar", nationalities: ["SVK"], clubs: ["Sampdoria", "Inter", "Paris Saint-Germain", "Fenerbahce"] },
  { name: "Allan Saint-Maximin", nationalities: ["FRA"], clubs: ["Saint-Etienne", "Monaco", "Nice", "Newcastle United", "Al-Ahli", "Fenerbahce"] },
  { name: "Sofyan Amrabat", nationalities: ["MAR", "NED"], clubs: ["Utrecht", "Feyenoord", "Club Brugge", "Hellas Verona", "Fiorentina", "Manchester United", "Fenerbahce"] },
  { name: "Çağlar Söyüncü", nationalities: ["TUR"], clubs: ["SC Freiburg", "Leicester City", "Atletico Madrid", "Fenerbahce"] },
  { name: "Cengiz Ünder", nationalities: ["TUR"], clubs: ["Istanbul Basaksehir", "Roma", "Leicester City", "Marseille", "Fenerbahce"] },
  { name: "İrfan Can Kahveci", nationalities: ["TUR"], clubs: ["Genclerbirligi", "Istanbul Basaksehir", "Fenerbahce"] },
  { name: "Ferdi Kadıoğlu", nationalities: ["TUR", "NED"], clubs: ["NEC Nijmegen", "Fenerbahce", "Brighton & Hove Albion"] },
  { name: "Arda Güler", nationalities: ["TUR"], clubs: ["Fenerbahce", "Real Madrid"] },
  { name: "Kim Min-jae", nationalities: ["KOR"], clubs: ["Fenerbahce", "Napoli", "Bayern Munich"] },
  { name: "Sacha Boey", nationalities: ["FRA", "CMR"], clubs: ["Rennes", "Galatasaray", "Bayern Munich"] },
  { name: "Dirk Kuyt", nationalities: ["NED"], clubs: ["Utrecht", "Feyenoord", "Liverpool", "Fenerbahce"] },
  { name: "Roberto Carlos", nationalities: ["BRA", "ESP"], clubs: ["Palmeiras", "Inter", "Real Madrid", "Fenerbahce", "Corinthians"] },
  { name: "Raul Meireles", nationalities: ["POR"], clubs: ["Boavista", "Porto", "Liverpool", "Chelsea", "Fenerbahce"] },
  { name: "Nani", nationalities: ["POR"], clubs: ["Sporting CP", "Manchester United", "Fenerbahce", "Valencia", "Lazio"] },
  { name: "Simon Kjær", nationalities: ["DEN"], clubs: ["Palermo", "VfL Wolfsburg", "Roma", "Lille", "Fenerbahce", "Sevilla", "Atalanta", "AC Milan"] },
  { name: "Moussa Sow", nationalities: ["SEN", "FRA"], clubs: ["Rennes", "Lille", "Fenerbahce"] },
  { name: "Ricardo Quaresma", nationalities: ["POR"], clubs: ["Sporting CP", "Barcelona", "Porto", "Inter", "Chelsea", "Besiktas"] },
  { name: "Pepe", nationalities: ["POR", "BRA"], clubs: ["Maritimo", "Porto", "Real Madrid", "Besiktas"] },
  { name: "Guti", nationalities: ["ESP"], clubs: ["Real Madrid", "Besiktas"] },
  { name: "Anderson Talisca", nationalities: ["BRA"], clubs: ["Bahia", "Benfica", "Besiktas", "Al-Nassr", "Fenerbahce"] },
  { name: "Vincent Aboubakar", nationalities: ["CMR"], clubs: ["Valenciennes", "Lorient", "Porto", "Besiktas", "Al-Nassr"] },
  { name: "Gedson Fernandes", nationalities: ["POR"], clubs: ["Benfica", "Tottenham Hotspur", "Galatasaray", "Rizespor", "Besiktas"] },
  { name: "Dele Alli", nationalities: ["ENG"], clubs: ["Milton Keynes Dons", "Tottenham Hotspur", "Everton", "Besiktas"] },
  { name: "Eric Bailly", nationalities: ["CIV"], clubs: ["Espanyol", "Villarreal", "Manchester United", "Marseille", "Besiktas"] },
  { name: "Rachid Ghezzal", nationalities: ["ALG", "FRA"], clubs: ["Lyon", "Monaco", "Leicester City", "Fiorentina", "Besiktas", "Rizespor"] },
  { name: "Ciro Immobile", nationalities: ["ITA"], clubs: ["Juventus", "Torino", "Borussia Dortmund", "Sevilla", "Lazio", "Besiktas"] },
  { name: "Rafa Silva", nationalities: ["POR"], clubs: ["Braga", "Benfica", "Besiktas"] },
  { name: "Mario Gómez", nationalities: ["GER", "ESP"], clubs: ["VfB Stuttgart", "Bayern Munich", "Fiorentina", "Besiktas", "VfL Wolfsburg"] },
  { name: "Demba Ba", nationalities: ["SEN", "FRA"], clubs: ["Hoffenheim", "West Ham United", "Newcastle United", "Chelsea", "Besiktas", "Istanbul Basaksehir"] },
  { name: "Atiba Hutchinson", nationalities: ["CAN"], clubs: ["FC Copenhagen", "PSV", "Besiktas"] },
  { name: "Ryan Babel", nationalities: ["NED"], clubs: ["Ajax", "Liverpool", "Hoffenheim", "Kasimpasa", "Besiktas", "Fulham", "Galatasaray"] },
  { name: "Fernando Muslera", nationalities: ["URU", "ARG"], clubs: ["Lazio", "Galatasaray"] },
  { name: "Felipe Melo", nationalities: ["BRA", "ESP"], clubs: ["Flamengo", "Cruzeiro", "Gremio", "Mallorca", "Racing Santander", "Almeria", "Fiorentina", "Juventus", "Galatasaray", "Inter", "Palmeiras"] },
  { name: "Radamel Falcao", nationalities: ["COL"], clubs: ["River Plate", "Porto", "Atletico Madrid", "Monaco", "Manchester United", "Chelsea", "Galatasaray", "Rayo Vallecano"] },
  { name: "Bafétimbi Gomis", nationalities: ["FRA", "SEN"], clubs: ["Saint-Etienne", "Lyon", "Swansea City", "Marseille", "Galatasaray", "Al-Hilal"] },
  { name: "Steven Nzonzi", nationalities: ["FRA"], clubs: ["Blackburn Rovers", "Stoke City", "Sevilla", "Roma", "Galatasaray", "Rennes", "Konyaspor"] },
  { name: "Mariano", nationalities: ["BRA"], clubs: ["Fluminense", "Bordeaux", "Sevilla", "Galatasaray", "Atletico Mineiro"] },
  { name: "Fernando Reges", nationalities: ["BRA", "POR"], clubs: ["Porto", "Manchester City", "Galatasaray", "Sevilla"] },
  { name: "Badou Ndiaye", nationalities: ["SEN"], clubs: ["Osmanlispor", "Galatasaray", "Stoke City", "Trabzonspor", "Adana Demirspor"] },
  { name: "Henry Onyekuru", nationalities: ["NGA"], clubs: ["Eupen", "Anderlecht", "Everton", "Galatasaray", "Monaco", "Olympiacos", "Adana Demirspor"] },
  { name: "Mario Lemina", nationalities: ["GAB", "FRA"], clubs: ["Lorient", "Marseille", "Juventus", "Southampton", "Galatasaray", "Fulham", "Nice", "Wolverhampton Wanderers"] },
  { name: "Gabriel Sara", nationalities: ["BRA"], clubs: ["Sao Paulo", "Norwich City", "Galatasaray"] },
  { name: "Marek Hamšík", nationalities: ["SVK"], clubs: ["Brescia", "Napoli", "Trabzonspor"] },
  { name: "Anthony Nwakaeme", nationalities: ["NGA"], clubs: ["Hapoel Beer Sheva", "Trabzonspor"] },
  { name: "Alexander Sørloth", nationalities: ["NOR"], clubs: ["Rosenborg", "Groningen", "Midtjylland", "Crystal Palace", "Gent", "Trabzonspor", "RB Leipzig", "Real Sociedad", "Villarreal", "Atletico Madrid"] },
  { name: "Andreas Cornelius", nationalities: ["DEN"], clubs: ["FC Copenhagen", "Cardiff City", "Atalanta", "Bordeaux", "Parma", "Trabzonspor"] },
  { name: "José Sosa", nationalities: ["ARG", "ITA"], clubs: ["Estudiantes", "Bayern Munich", "Napoli", "Metalist Kharkiv", "Atletico Madrid", "Besiktas", "AC Milan", "Trabzonspor", "Fenerbahce"] },
  { name: "Burak Yılmaz", nationalities: ["TUR"], clubs: ["Besiktas", "Fenerbahce", "Trabzonspor", "Galatasaray", "Lille", "Fortuna Sittard"] },
  { name: "Arda Turan", nationalities: ["TUR"], clubs: ["Galatasaray", "Atletico Madrid", "Barcelona", "Istanbul Basaksehir"] },
  { name: "Emre Belözoğlu", nationalities: ["TUR"], clubs: ["Galatasaray", "Inter", "Newcastle United", "Fenerbahce", "Atletico Madrid", "Istanbul Basaksehir"] },
  { name: "Okan Buruk", nationalities: ["TUR"], clubs: ["Galatasaray", "Inter", "Besiktas", "Istanbul Basaksehir"] },
  { name: "Tugay Kerimoğlu", nationalities: ["TUR"], clubs: ["Galatasaray", "Rangers", "Blackburn Rovers"] },
  { name: "Hakan Şükür", nationalities: ["TUR"], clubs: ["Galatasaray", "Torino", "Inter", "Parma", "Blackburn Rovers"] },
  { name: "Nihat Kahveci", nationalities: ["TUR"], clubs: ["Besiktas", "Real Sociedad", "Villarreal"] },
  { name: "Tuncay Şanlı", nationalities: ["TUR"], clubs: ["Fenerbahce", "Middlesbrough", "Stoke City", "VfL Wolfsburg", "Bolton Wanderers", "Bursaspor"] },
  { name: "Mehmet Topal", nationalities: ["TUR"], clubs: ["Galatasaray", "Valencia", "Fenerbahce", "Istanbul Basaksehir", "Besiktas"] },
  { name: "Caner Erkin", nationalities: ["TUR"], clubs: ["CSKA Moscow", "Galatasaray", "Fenerbahce", "Inter", "Besiktas"] },
  { name: "Gökhan Gönül", nationalities: ["TUR"], clubs: ["Fenerbahce", "Besiktas"] },
  { name: "Selçuk İnan", nationalities: ["TUR"], clubs: ["Trabzonspor", "Galatasaray"] },
  { name: "Volkan Demirel", nationalities: ["TUR"], clubs: ["Fenerbahce"] },
  { name: "Alex de Souza", nationalities: ["BRA"], clubs: ["Coritiba", "Palmeiras", "Cruzeiro", "Parma", "Fenerbahce"] }
];

const ISO3_TO_GAME_CODES = {
  TUR: ["TUR"],
  GBR: ["ENG", "SCO", "WAL", "NIR"],
  IRL: ["IRL"],
  ESP: ["ESP"],
  ITA: ["ITA"],
  DEU: ["GER"],
  FRA: ["FRA"],
  NLD: ["NED"],
  PRT: ["POR"],
  BEL: ["BEL"],
  RUS: ["RUS"],
  UKR: ["UKR"],
  GRC: ["GRE"],
  AUT: ["AUT"],
  CHE: ["SUI"],
  DNK: ["DEN"],
  NOR: ["NOR"],
  SWE: ["SWE"],
  FIN: ["FIN"],
  ISL: ["ISL"],
  POL: ["POL"],
  CZE: ["CZE"],
  SVK: ["SVK"],
  SVN: ["SVN"],
  HUN: ["HUN"],
  ROU: ["ROU"],
  BGR: ["BUL"],
  HRV: ["CRO"],
  SRB: ["SRB"],
  BIH: ["BIH"],
  MNE: ["MNE"],
  MKD: ["MKD"],
  ALB: ["ALB"],
  KOS: ["KVX"],
  CYP: ["CYP"],
  GEO: ["GEO"],
  ARM: ["ARM"],
  AZE: ["AZE"],
  KAZ: ["KAZ"],
  UZB: ["UZB"],
  EST: ["EST"],
  LVA: ["LVA"],
  LTU: ["LTU"],
  BLR: ["BLR"],
  MDA: ["MDA"],
  ISR: ["ISR"],
  USA: ["USA"],
  CAN: ["CAN"],
  MEX: ["MEX"],
  CRI: ["CRC"],
  PAN: ["PAN"],
  HND: ["HON"],
  JAM: ["JAM"],
  BRA: ["BRA"],
  ARG: ["ARG"],
  COL: ["COL"],
  CHL: ["CHI"],
  PER: ["PER"],
  ECU: ["ECU"],
  URY: ["URU"],
  PRY: ["PAR"],
  VEN: ["VEN"],
  BOL: ["BOL"],
  MAR: ["MAR"],
  DZA: ["ALG"],
  TUN: ["TUN"],
  EGY: ["EGY"],
  SEN: ["SEN"],
  NGA: ["NGA"],
  CMR: ["CMR"],
  GHA: ["GHA"],
  CIV: ["CIV"],
  MLI: ["MLI"],
  BFA: ["BFA"],
  GIN: ["GUI"],
  COD: ["COD"],
  GAB: ["GAB"],
  AGO: ["ANG"],
  ZMB: ["ZAM"],
  ZAF: ["RSA"],
  CPV: ["CPV"],
  GMB: ["GAM"],
  JPN: ["JPN"],
  KOR: ["KOR"],
  CHN: ["CHN"],
  IRN: ["IRN"],
  IRQ: ["IRQ"],
  SAU: ["KSA"],
  ARE: ["UAE"],
  QAT: ["QAT"],
  AUS: ["AUS"],
  NZL: ["NZL"]
};

const NAME_TO_GAME_CODES = {
  "turkey": ["TUR"],
  "turkiye": ["TUR"],
  "united kingdom": ["ENG", "SCO", "WAL", "NIR"],
  "ireland": ["IRL"],
  "republic of ireland": ["IRL"],
  "spain": ["ESP"],
  "italy": ["ITA"],
  "germany": ["GER"],
  "france": ["FRA"],
  "netherlands": ["NED"],
  "portugal": ["POR"],
  "belgium": ["BEL"],
  "russia": ["RUS"],
  "ukraine": ["UKR"],
  "greece": ["GRE"],
  "austria": ["AUT"],
  "switzerland": ["SUI"],
  "denmark": ["DEN"],
  "norway": ["NOR"],
  "sweden": ["SWE"],
  "finland": ["FIN"],
  "iceland": ["ISL"],
  "poland": ["POL"],
  "czech republic": ["CZE"],
  "czechia": ["CZE"],
  "slovakia": ["SVK"],
  "slovenia": ["SVN"],
  "hungary": ["HUN"],
  "romania": ["ROU"],
  "bulgaria": ["BUL"],
  "croatia": ["CRO"],
  "serbia": ["SRB"],
  "bosnia and herzegovina": ["BIH"],
  "bosnia-herzegovina": ["BIH"],
  "montenegro": ["MNE"],
  "north macedonia": ["MKD"],
  "macedonia": ["MKD"],
  "albania": ["ALB"],
  "kosovo": ["KVX"],
  "cyprus": ["CYP"],
  "georgia": ["GEO"],
  "armenia": ["ARM"],
  "azerbaijan": ["AZE"],
  "kazakhstan": ["KAZ"],
  "uzbekistan": ["UZB"],
  "estonia": ["EST"],
  "latvia": ["LVA"],
  "lithuania": ["LTU"],
  "belarus": ["BLR"],
  "moldova": ["MDA"],
  "israel": ["ISR"],
  "united states of america": ["USA"],
  "united states": ["USA"],
  "canada": ["CAN"],
  "mexico": ["MEX"],
  "costa rica": ["CRC"],
  "panama": ["PAN"],
  "honduras": ["HON"],
  "jamaica": ["JAM"],
  "brazil": ["BRA"],
  "argentina": ["ARG"],
  "colombia": ["COL"],
  "chile": ["CHI"],
  "peru": ["PER"],
  "ecuador": ["ECU"],
  "uruguay": ["URU"],
  "paraguay": ["PAR"],
  "venezuela": ["VEN"],
  "bolivia": ["BOL"],
  "morocco": ["MAR"],
  "algeria": ["ALG"],
  "tunisia": ["TUN"],
  "egypt": ["EGY"],
  "senegal": ["SEN"],
  "nigeria": ["NGA"],
  "cameroon": ["CMR"],
  "ghana": ["GHA"],
  "ivory coast": ["CIV"],
  "cote d'ivoire": ["CIV"],
  "mali": ["MLI"],
  "burkina faso": ["BFA"],
  "guinea": ["GUI"],
  "democratic republic of the congo": ["COD"],
  "dr congo": ["COD"],
  "gabon": ["GAB"],
  "angola": ["ANG"],
  "zambia": ["ZAM"],
  "south africa": ["RSA"],
  "cape verde": ["CPV"],
  "gambia": ["GAM"],
  "the gambia": ["GAM"],
  "japan": ["JPN"],
  "south korea": ["KOR"],
  "korea, republic of": ["KOR"],
  "china": ["CHN"],
  "iran": ["IRN"],
  "iraq": ["IRQ"],
  "saudi arabia": ["KSA"],
  "united arab emirates": ["UAE"],
  "qatar": ["QAT"],
  "australia": ["AUS"],
  "new zealand": ["NZL"]
};

const normalizeText = (str) => {
  return String(str || "")
    .replace(/[\u200b-\u200f\ufeff]/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
};

function normalizeClubKey(clubName) {
  let cleaned = normalizeText(clubName)
    .replace(/[.'’\-_/()&]/g, " ")
    .replace(/\b(fc|sk|jk|cf|ac|as|sc|ss|fk|afc|cfc|sfc|bk|ik|if|nk|gnk|hnk|ogc|rc|rcd|cd|ud|sd|ca|se|cr|ec|vfb|vfl|tsg|sv|fsv|bsc|hsv|ksc|msv|rb|spvgg|1)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (CLUB_ALIASES[cleaned]) {
    cleaned = CLUB_ALIASES[cleaned];
  }
  return cleaned;
}

const clubToCountryCode = new Map();
const officialClubByKey = new Map();
for (const [code, info] of Object.entries(FOOTBALL_DB.countries)) {
  for (const club of info.clubs) {
    const key = normalizeClubKey(club);
    clubToCountryCode.set(key, code);
    if (!officialClubByKey.has(key)) {
      officialClubByKey.set(key, club);
    }
  }
}

function upsertPlayerEntry(map, displayName, clubs, nationalities) {
  const normName = normalizeText(displayName).replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
  if (!normName) return;
  if (!map.has(normName)) {
    map.set(normName, {
      name: displayName,
      normalized: normName,
      clubKeys: new Set(),
      rawClubs: new Set(),
      nationCodes: new Set()
    });
  }
  const entry = map.get(normName);
  for (const c of clubs || []) {
    const key = normalizeClubKey(c);
    if (key) {
      entry.clubKeys.add(key);
      entry.rawClubs.add(officialClubByKey.get(key) || c);
    }
  }
  const rawNations = Array.isArray(nationalities)
    ? nationalities
    : nationalities
      ? [nationalities]
      : [];
  for (const nat of rawNations) {
    const code = String(nat || "").trim().toUpperCase();
    if (code) {
      entry.nationCodes.add(code);
    }
  }
}

const mergedPlayersMap = new Map();
for (const p of FOOTBALL_DB.players) {
  upsertPlayerEntry(mergedPlayersMap, p.name, p.clubs, p.nationalities || p.nationality);
}

for (const item of SUPPLEMENTAL_PLAYERS) {
  upsertPlayerEntry(mergedPlayersMap, item.name, item.clubs, item.nationalities);
}

const playerIndex = Array.from(mergedPlayersMap.values());

const nationPlayerCounts = new Map();
for (const p of playerIndex) {
  for (const nat of p.nationCodes) {
    nationPlayerCounts.set(nat, (nationPlayerCounts.get(nat) || 0) + 1);
  }
}

const NATIONS_DB = {};
for (const [code, info] of Object.entries(FOOTBALL_DB.countries)) {
  NATIONS_DB[code] = {
    name: info.name,
    lat: info.lat,
    lng: info.lng,
    league: info.league || "",
    playerCount: nationPlayerCounts.get(code) || 0
  };
}
for (const [code, info] of Object.entries(EXTRA_NATION_CATALOG)) {
  const count = nationPlayerCounts.get(code) || 0;
  if (!NATIONS_DB[code] && count > 0) {
    NATIONS_DB[code] = {
      name: info.name,
      lat: info.lat,
      lng: info.lng,
      league: "",
      playerCount: count
    };
  }
}

function getNationName(code) {
  return (NATIONS_DB[code] && NATIONS_DB[code].name) || (FOOTBALL_DB.countries[code] && FOOTBALL_DB.countries[code].name) || code;
}

function hasActiveLeague(code) {
  const info = FOOTBALL_DB.countries[code];
  return Boolean(info && Array.isArray(info.clubs) && info.clubs.length >= 3);
}

function hasActiveNation(code) {
  const info = NATIONS_DB[code];
  return Boolean(info && info.playerCount >= 3);
}

function isNationSelectionPhase() {
  return state.gridMode === "nation_vs_league" && state.horizontalNations.length < 3;
}

function getActiveMapCatalog() {
  if (isNationSelectionPhase()) {
    return NATIONS_DB;
  }
  return FOOTBALL_DB.countries;
}

function isCodeSelectableOnMap(code) {
  if (isNationSelectionPhase()) {
    return hasActiveNation(code);
  }
  return hasActiveLeague(code);
}

function resolveFeatureGameCodes(feature) {
  const props = feature.properties || {};
  const candidates = [
    props.ISO_A3,
    props.ADM0_A3,
    props.iso_a3,
    props.adm0_a3,
    feature.id
  ];
  for (const rawIso of candidates) {
    if (!rawIso) continue;
    const iso = String(rawIso).toUpperCase().trim();
    if (ISO3_TO_GAME_CODES[iso]) {
      return ISO3_TO_GAME_CODES[iso];
    }
  }
  const nameCandidates = [props.ADMIN, props.NAME, props.NAME_LONG, props.name];
  for (const rawName of nameCandidates) {
    if (!rawName) continue;
    const norm = normalizeText(rawName);
    if (NAME_TO_GAME_CODES[norm]) {
      return NAME_TO_GAME_CODES[norm];
    }
  }
  return [];
}

function getActiveCodesForFeature(rawCodes) {
  if (!Array.isArray(rawCodes) || rawCodes.length === 0) return [];
  return rawCodes.filter((code) => isCodeSelectableOnMap(code));
}

function getPolygonRingCentroid(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return { lng: 0, lat: 0 };
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lng: sumLng / ring.length, lat: sumLat / ring.length };
}

function isPolygonNearCountry(polyRings, gameCodes) {
  if (!gameCodes || gameCodes.length === 0) return false;
  const catalog = getActiveMapCatalog();
  const centroid = getPolygonRingCentroid(polyRings[0]);
  return gameCodes.some((code) => {
    const info = catalog[code] || NATIONS_DB[code] || FOOTBALL_DB.countries[code];
    if (!info) return false;
    return Math.hypot(centroid.lng - info.lng, centroid.lat - info.lat) < 42;
  });
}

function isPointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInPolygonRings(lng, lat, rings) {
  if (!Array.isArray(rings) || rings.length === 0) return false;
  if (!isPointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(lng, lat, rings[i])) return false;
  }
  return true;
}

async function loadWorldGeoJson() {
  if (state.geoLoadAttempted) return;
  state.geoLoadAttempted = true;

  const sources = [
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
  ];

  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const geojson = await response.json();
      if (geojson && Array.isArray(geojson.features) && geojson.features.length > 0) {
        state.worldGeoFeatures = geojson.features
          .filter((f) => {
            const name = normalizeText((f.properties && (f.properties.ADMIN || f.properties.NAME || f.properties.name)) || "");
            return name !== "antarctica";
          })
          .map((f) => ({
            geometry: f.geometry,
            rawCodes: resolveFeatureGameCodes(f)
          }));
        state.mapView.needsRender = true;
        drawWorldMap();
        return;
      }
    } catch (err) {
    }
  }
}

const clubCrossReach = new Map();
const clubRosterCount = new Map();
for (const p of playerIndex) {
  const playerClubKeys = Array.from(p.clubKeys);
  const distinctCountries = new Set(
    playerClubKeys.map((k) => clubToCountryCode.get(k)).filter(Boolean)
  ).size;
  const careerSpan = playerClubKeys.length;
  for (const key of playerClubKeys) {
    clubRosterCount.set(key, (clubRosterCount.get(key) || 0) + 1);
    if (distinctCountries > 1) {
      clubCrossReach.set(key, (clubCrossReach.get(key) || 0) + distinctCountries * 3 + careerSpan);
    }
  }
}

function getClubPrestigeScore(clubName) {
  const norm = normalizeText(clubName);
  const key = normalizeClubKey(clubName);
  let tierBonus = 0;
  if (TIER1_CLUB_KEYWORDS.some((kw) => norm.includes(kw))) {
    tierBonus = 2000;
  } else if (TIER2_CLUB_KEYWORDS.some((kw) => norm.includes(kw))) {
    tierBonus = 900;
  }
  const reach = clubCrossReach.get(key) || 0;
  const roster = Math.max(1, clubRosterCount.get(key) || 1);
  const normalizedReach = reach / Math.sqrt(roster);
  return tierBonus + normalizedReach;
}

const countryRankedClubs = new Map();
const countryClubRankIndex = new Map();

for (const [code, info] of Object.entries(FOOTBALL_DB.countries)) {
  const ranked = [...info.clubs].sort((a, b) => {
    const scoreA = getClubPrestigeScore(a);
    const scoreB = getClubPrestigeScore(b);
    return scoreB !== scoreA ? scoreB - scoreA : a.localeCompare(b);
  });
  countryRankedClubs.set(code, ranked);
  ranked.forEach((club, idx) => {
    countryClubRankIndex.set(club, idx);
  });
}

const pairCache = new Map();
const clubNationCache = new Map();

function getCommonPlayers(clubA, clubB) {
  const keyA = normalizeClubKey(clubA);
  const keyB = normalizeClubKey(clubB);
  if (!keyA || !keyB || keyA === keyB) return [];
  const cacheKey = keyA < keyB ? `${keyA}|||${keyB}` : `${keyB}|||${keyA}`;
  if (pairCache.has(cacheKey)) {
    return pairCache.get(cacheKey);
  }
  const matches = playerIndex.filter((p) => p.clubKeys.has(keyA) && p.clubKeys.has(keyB));
  pairCache.set(cacheKey, matches);
  return matches;
}

function getClubNationPlayers(clubName, nationCode) {
  const clubKey = normalizeClubKey(clubName);
  const natKey = String(nationCode || "").trim().toUpperCase();
  if (!clubKey || !natKey) return [];
  const cacheKey = `${clubKey}@@@${natKey}`;
  if (clubNationCache.has(cacheKey)) {
    return clubNationCache.get(cacheKey);
  }
  const matches = playerIndex.filter((p) => p.clubKeys.has(clubKey) && p.nationCodes.has(natKey));
  clubNationCache.set(cacheKey, matches);
  return matches;
}

function getCellValidPlayers(r, c) {
  if (state.gridMode === "nation_vs_league") {
    return getClubNationPlayers(state.rowClubs[r], state.colNations[c]);
  }
  return getCommonPlayers(state.rowClubs[r], state.colClubs[c]);
}

function canAssignNineDistinctPlayersForCells(cellLists) {
  if (!Array.isArray(cellLists) || cellLists.length !== 9) return false;
  const sorted = [...cellLists].sort((a, b) => a.length - b.length);
  const used = new Set();

  function matchCell(idx) {
    if (idx === sorted.length) return true;
    for (const playerKey of sorted[idx]) {
      if (used.has(playerKey)) continue;
      used.add(playerKey);
      if (matchCell(idx + 1)) return true;
      used.delete(playerKey);
    }
    return false;
  }

  return matchCell(0);
}

function canAssignNineDistinctPlayers(cols, rows, minCommonRequired) {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const players = getCommonPlayers(rows[r], cols[c]);
      if (!players || players.length < minCommonRequired) {
        return false;
      }
      cells.push(players.map((p) => p.normalized));
    }
  }
  return canAssignNineDistinctPlayersForCells(cells);
}

function canAssignNineDistinctNationPlayers(colNations, rowClubs, minRequired) {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const players = getClubNationPlayers(rowClubs[r], colNations[c]);
      if (!players || players.length < minRequired) {
        return false;
      }
      cells.push(players.map((p) => p.normalized));
    }
  }
  return canAssignNineDistinctPlayersForCells(cells);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTierClubPools(code, difficulty) {
  const ranked = countryRankedClubs.get(code) || FOOTBALL_DB.countries[code].clubs;
  const n = ranked.length;

  if (difficulty === "easy") {
    const topCount = Math.min(n, Math.max(6, Math.ceil(n * 0.35)));
    const midCount = Math.min(n, Math.max(topCount, Math.ceil(n * 0.65)));
    return {
      primary: ranked.slice(0, topCount),
      secondary: ranked.slice(0, midCount),
      all: ranked
    };
  }

  if (difficulty === "hard") {
    const bottomCount = Math.min(n, Math.max(6, Math.ceil(n * 0.55)));
    const widerCount = Math.min(n, Math.max(bottomCount, Math.ceil(n * 0.80)));
    return {
      primary: ranked.slice(n - bottomCount),
      secondary: ranked.slice(n - widerCount),
      all: [...ranked].reverse()
    };
  }

  const start = Math.min(2, Math.floor(n * 0.12));
  const end = Math.min(n, Math.max(start + 8, Math.ceil(n * 0.80)));
  return {
    primary: ranked.slice(start, end),
    secondary: ranked.slice(0, Math.min(n, Math.ceil(n * 0.90))),
    all: ranked
  };
}

function scoreCandidateGrid(cols, rows, difficulty) {
  let minCellCommon = Infinity;
  let totalCommon = 0;

  for (const r of rows) {
    for (const c of cols) {
      const cnt = getCommonPlayers(r, c).length;
      if (cnt < minCellCommon) minCellCommon = cnt;
      totalCommon += Math.min(cnt, 14);
    }
  }

  const totalRank = [...cols, ...rows].reduce(
    (acc, club) => acc + (countryClubRankIndex.get(club) ?? 10),
    0
  );

  if (difficulty === "easy") {
    return minCellCommon * 20 + totalCommon * 8 - totalRank * 45;
  }
  if (difficulty === "hard") {
    return totalRank * 22 - minCellCommon * 18 - totalCommon * 3;
  }
  return minCellCommon * 14 + totalCommon * 3 - Math.abs(totalRank - 34) * 5;
}

function searchBestGridInPools(horizPool, vertPool, minCommonRequired, difficulty) {
  const horizClubs = shuffle(horizPool);
  const vertClubs = shuffle(vertPool);

  const validRowsForCol = new Map();
  for (const hClub of horizClubs) {
    const validRows = vertClubs.filter(
      (vClub) => getCommonPlayers(hClub, vClub).length >= minCommonRequired
    );
    if (validRows.length >= 3) {
      validRowsForCol.set(hClub, validRows);
    }
  }

  const candidateCols = horizClubs.filter((c) => validRowsForCol.has(c));
  if (candidateCols.length < 3) return null;

  const pickedCols = [];
  const rowCounts = new Map();
  const candidates = [];
  const maxCandidates = 150;

  function backtrack(startIdx) {
    if (candidates.length >= maxCandidates) return;

    if (pickedCols.length === 3) {
      const viableRows = vertClubs.filter((r) => (rowCounts.get(r) || 0) === 3);
      if (viableRows.length >= 3) {
        const chosenRows = shuffle(viableRows).slice(0, 3);
        const chosenCols = [...pickedCols];
        if (canAssignNineDistinctPlayers(chosenCols, chosenRows, minCommonRequired)) {
          candidates.push({
            cols: chosenCols,
            rows: chosenRows,
            score: scoreCandidateGrid(chosenCols, chosenRows, difficulty)
          });
        }
      }
      return;
    }

    for (let i = startIdx; i <= candidateCols.length - (3 - pickedCols.length); i++) {
      if (candidates.length >= maxCandidates) return;
      const colClub = candidateCols[i];
      const rows = validRowsForCol.get(colClub);
      pickedCols.push(colClub);
      for (const r of rows) {
        rowCounts.set(r, (rowCounts.get(r) || 0) + 1);
      }

      backtrack(i + 1);

      pickedCols.pop();
      for (const r of rows) {
        rowCounts.set(r, rowCounts.get(r) - 1);
      }
    }
  }

  backtrack(0);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const topSlice = candidates.slice(0, Math.min(3, candidates.length));
  return topSlice[Math.floor(Math.random() * topSlice.length)];
}

function generateSolvableGrid(horizCode, vertCode, difficulty = state.difficulty) {
  const hPools = getTierClubPools(horizCode, difficulty);
  const vPools = getTierClubPools(vertCode, difficulty);

  const attempts =
    difficulty === "easy"
      ? [
          [hPools.primary, vPools.primary, 1],
          [hPools.secondary, vPools.secondary, 1],
          [hPools.all, vPools.all, 1]
        ]
      : difficulty === "hard"
        ? [
            [hPools.primary, vPools.primary, 1],
            [hPools.secondary, vPools.secondary, 1],
            [hPools.all, vPools.all, 1]
          ]
        : [
            [hPools.primary, vPools.primary, 2],
            [hPools.primary, vPools.primary, 1],
            [hPools.secondary, vPools.secondary, 1],
            [hPools.all, vPools.all, 1]
          ];

  for (const [hPool, vPool, minCommon] of attempts) {
    const found = searchBestGridInPools(hPool, vPool, minCommon, difficulty);
    if (found) return found;
  }

  return null;
}

function scoreNationLeagueCandidate(nations, clubs, difficulty) {
  let minCellCount = Infinity;
  let totalMatches = 0;

  for (const club of clubs) {
    for (const nat of nations) {
      const cnt = getClubNationPlayers(club, nat).length;
      if (cnt < minCellCount) minCellCount = cnt;
      totalMatches += Math.min(cnt, 15);
    }
  }

  const totalRank = clubs.reduce(
    (acc, club) => acc + (countryClubRankIndex.get(club) ?? 10),
    0
  );

  if (difficulty === "easy") {
    return minCellCount * 22 + totalMatches * 8 - totalRank * 40;
  }
  if (difficulty === "hard") {
    return totalRank * 22 - minCellCount * 16 - totalMatches * 3;
  }
  return minCellCount * 15 + totalMatches * 4 - Math.abs(totalRank - 28) * 5;
}

function generateNationVsLeagueGrid(nations, leagueCountryCode, difficulty = state.difficulty) {
  if (!Array.isArray(nations) || nations.length !== 3 || !hasActiveLeague(leagueCountryCode)) {
    return null;
  }

  const vPools = getTierClubPools(leagueCountryCode, difficulty);
  const attempts =
    difficulty === "easy"
      ? [
          [vPools.primary, 1],
          [vPools.secondary, 1],
          [vPools.all, 1]
        ]
      : difficulty === "hard"
        ? [
            [vPools.primary, 1],
            [vPools.secondary, 1],
            [vPools.all, 1]
          ]
        : [
            [vPools.primary, 2],
            [vPools.primary, 1],
            [vPools.secondary, 1],
            [vPools.all, 1]
          ];

  for (const [clubPool, minCount] of attempts) {
    const eligibleClubs = shuffle(clubPool).filter((club) =>
      nations.every((nat) => getClubNationPlayers(club, nat).length >= minCount)
    );
    if (eligibleClubs.length < 3) continue;

    const candidates = [];
    const maxTries = 80;
    for (let t = 0; t < maxTries; t++) {
      const picked = shuffle(eligibleClubs).slice(0, 3);
      if (canAssignNineDistinctNationPlayers(nations, picked, minCount)) {
        candidates.push({
          nations: [...nations],
          rows: picked,
          score: scoreNationLeagueCandidate(nations, picked, difficulty)
        });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const top = candidates.slice(0, Math.min(3, candidates.length));
      return top[Math.floor(Math.random() * top.length)];
    }
  }

  return null;
}

function autoFillRemainingAxes() {
  if (state.gridMode === "club_vs_club") {
    const activeCodes = shuffle(Object.keys(FOOTBALL_DB.countries).filter((c) => hasActiveLeague(c)));
    if (activeCodes.length < 2) return;

    if (!state.horizontalCountry && state.verticalCountry) {
      for (const cand of activeCodes) {
        if (cand === state.verticalCountry) continue;
        if (generateSolvableGrid(cand, state.verticalCountry, state.difficulty)) {
          state.horizontalCountry = cand;
          break;
        }
      }
    } else if (state.horizontalCountry && !state.verticalCountry) {
      for (const cand of activeCodes) {
        if (cand === state.horizontalCountry) continue;
        if (generateSolvableGrid(state.horizontalCountry, cand, state.difficulty)) {
          state.verticalCountry = cand;
          break;
        }
      }
    } else if (!state.horizontalCountry && !state.verticalCountry) {
      for (const hCand of activeCodes) {
        for (const vCand of activeCodes) {
          if (hCand === vCand) continue;
          if (generateSolvableGrid(hCand, vCand, state.difficulty)) {
            state.horizontalCountry = hCand;
            state.verticalCountry = vCand;
            break;
          }
        }
        if (state.horizontalCountry && state.verticalCountry) break;
      }
    }

    state.mapView.needsRender = true;
    updateCountrySelectionUI();
    return;
  }

  const allNations = Object.keys(NATIONS_DB).filter((c) => hasActiveNation(c));
  const majorNations = allNations.filter((c) => MAJOR_FOOTBALL_NATIONS.has(c));
  const minorNations = allNations.filter((c) => !MAJOR_FOOTBALL_NATIONS.has(c));

  let orderedNations;
  if (state.difficulty === "easy") {
    orderedNations = [...shuffle(majorNations), ...shuffle(minorNations)];
  } else if (state.difficulty === "hard") {
    orderedNations = [...shuffle(minorNations), ...shuffle(majorNations)];
  } else {
    orderedNations = shuffle(allNations);
  }

  const leagueCodes = shuffle(Object.keys(FOOTBALL_DB.countries).filter((c) => hasActiveLeague(c)));
  const targetLeagues = state.verticalCountry && hasActiveLeague(state.verticalCountry)
    ? [state.verticalCountry]
    : leagueCodes;

  const baseNations = [...state.horizontalNations];
  const neededCount = Math.max(0, 3 - baseNations.length);

  for (const leagueCode of targetLeagues) {
    if (neededCount === 0) {
      if (generateNationVsLeagueGrid(baseNations, leagueCode, state.difficulty)) {
        state.verticalCountry = leagueCode;
        break;
      }
      continue;
    }

    const viableForLeague = orderedNations.filter(
      (nat) => !baseNations.includes(nat) && (NATIONS_DB[nat]?.playerCount || 0) >= 8
    );

    let foundCombo = null;
    for (let attempt = 0; attempt < 90; attempt++) {
      const sample = shuffle(viableForLeague).slice(0, neededCount);
      if (sample.length < neededCount) break;
      const candidateNations = [...baseNations, ...sample];
      if (generateNationVsLeagueGrid(candidateNations, leagueCode, state.difficulty)) {
        foundCombo = candidateNations;
        break;
      }
    }

    if (foundCombo) {
      state.horizontalNations = foundCombo;
      state.verticalCountry = leagueCode;
      break;
    }
  }

  state.mapView.needsRender = true;
  updateCountrySelectionUI();
}

function setGridMode(mode) {
  const nextMode = mode === "nation_vs_league" ? "nation_vs_league" : "club_vs_club";
  if (state.gridMode === nextMode) return;

  state.gridMode = nextMode;
  state.horizontalCountry = null;
  state.horizontalNations = [];
  state.verticalCountry = null;
  state.hoveredCountry = null;
  state.mapView.needsRender = true;

  document.querySelectorAll(".grid-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.gridMode === nextMode);
  });

  const searchInput = document.getElementById("country-search-input");
  if (searchInput) {
    searchInput.value = "";
  }

  updateCountrySelectionUI();
}

function injectMapLayoutFixes() {
  if (document.getElementById("geogame-layout-fix")) return;
  const style = document.createElement("style");
  style.id = "geogame-layout-fix";
  style.textContent = `
    #map-tooltip {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      background: rgba(9, 15, 29, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 9px;
      padding: 8px 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
      color: #f8fafc;
      font-size: 13px;
      line-height: 1.4;
    }
    #map-tooltip .tt-title {
      font-weight: 800;
      font-size: 14px;
      color: #ffffff;
    }
    #map-tooltip .tt-league {
      color: #7dd3fc;
      font-weight: 600;
    }
    #map-tooltip .tt-clubs {
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
      color: #cbd5e1;
      font-variant-numeric: tabular-nums;
    }
    .player-option-item {
      display: flex !important;
      align-items: center;
      gap: 11px;
      padding: 8px 12px !important;
      cursor: pointer;
    }
    .player-option-item.highlighted {
      background: rgba(56, 189, 248, 0.22) !important;
      color: #f8fafc !important;
    }
    .player-avatar-wrap {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.32);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.4px;
      color: #e2e8f0;
      user-select: none;
    }
    .player-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }
    .player-option-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .btn-end-match {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 15px;
      border-radius: 9px;
      border: 1px solid rgba(244, 63, 94, 0.48);
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.24), rgba(159, 18, 57, 0.36));
      color: #fda4af;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 0.18s ease;
      box-shadow: 0 4px 14px rgba(225, 29, 72, 0.16);
    }
    .btn-end-match:hover {
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.38), rgba(159, 18, 57, 0.5));
      border-color: #fb7185;
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(225, 29, 72, 0.28);
    }
    .btn-end-match.hidden {
      display: none !important;
    }
    #stage-players.premium-lobby-stage {
      display: none;
      width: 100%;
      min-height: calc(100vh - 64px);
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    #stage-players.premium-lobby-stage.active {
      display: flex;
    }
    .premium-lobby-shell {
      position: relative;
      width: 100%;
      max-width: 780px;
      background: radial-gradient(circle at 18% 0%, rgba(56, 189, 248, 0.11), transparent 46%),
                  radial-gradient(circle at 82% 100%, rgba(245, 158, 11, 0.11), transparent 46%),
                  linear-gradient(180deg, rgba(13, 22, 39, 0.96), rgba(8, 14, 27, 0.98));
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 22px;
      padding: 32px 34px 30px;
      box-shadow: 0 28px 70px rgba(2, 6, 23, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }
    .premium-lobby-header {
      text-align: center;
      margin-bottom: 22px;
    }
    .premium-lobby-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(52, 211, 153, 0.28);
      color: #34d399;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .premium-lobby-eyebrow::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
    }
    .premium-lobby-title {
      margin: 0 0 6px;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #f8fafc;
    }
    .premium-lobby-subtitle {
      margin: 0;
      font-size: 14.5px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .mode-selector-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 22px;
    }
    @media (max-width: 560px) {
      .mode-selector-grid {
        grid-template-columns: 1fr;
      }
    }
    .mode-option-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 15px;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.22);
      color: #cbd5e1;
      text-align: left;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .mode-option-card:hover {
      border-color: rgba(56, 189, 248, 0.48);
      background: rgba(20, 31, 54, 0.88);
    }
    .mode-option-card.active {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(14, 165, 233, 0.16));
      border-color: #34d399;
      box-shadow: 0 10px 24px rgba(16, 185, 129, 0.15);
      color: #f8fafc;
    }
    .mode-option-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.24);
      color: #38bdf8;
    }
    .mode-option-card.active .mode-option-icon {
      background: rgba(16, 185, 129, 0.22);
      border-color: rgba(52, 211, 153, 0.5);
      color: #34d399;
    }
    .mode-option-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .mode-option-title {
      font-size: 14.5px;
      font-weight: 800;
      color: #f8fafc;
    }
    .mode-option-desc {
      font-size: 12.5px;
      color: #94a3b8;
    }
    .premium-duel-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
    }
    @media (max-width: 680px) {
      .premium-duel-grid {
        grid-template-columns: 1fr;
      }
      .premium-vs-column {
        flex-direction: row !important;
        justify-content: center;
      }
      .premium-lobby-shell {
        padding: 24px 18px 22px;
      }
    }
    .premium-player-card {
      position: relative;
      border-radius: 16px;
      padding: 18px 18px 16px;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.18);
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .premium-player-card.side-x {
      border-top: 2px solid rgba(56, 189, 248, 0.55);
    }
    .premium-player-card.side-x:focus-within {
      border-color: rgba(56, 189, 248, 0.75);
      box-shadow: 0 12px 30px rgba(56, 189, 248, 0.14);
      transform: translateY(-2px);
    }
    .premium-player-card.side-o {
      border-top: 2px solid rgba(245, 158, 11, 0.55);
    }
    .premium-player-card.side-o:focus-within {
      border-color: rgba(245, 158, 11, 0.75);
      box-shadow: 0 12px 30px rgba(245, 158, 11, 0.14);
      transform: translateY(-2px);
    }
    .premium-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .premium-crest {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      font-weight: 900;
    }
    .side-x .premium-crest {
      background: rgba(56, 189, 248, 0.16);
      border: 1px solid rgba(56, 189, 248, 0.45);
      color: #38bdf8;
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.2);
    }
    .side-o .premium-crest {
      background: rgba(245, 158, 11, 0.16);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fbbf24;
      box-shadow: 0 0 18px rgba(245, 158, 11, 0.2);
    }
    .premium-side-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 4px 9px;
      border-radius: 6px;
    }
    .side-x .premium-side-tag {
      background: rgba(56, 189, 248, 0.12);
      color: #7dd3fc;
    }
    .side-o .premium-side-tag {
      background: rgba(245, 158, 11, 0.12);
      color: #fcd34d;
    }
    .premium-field-label {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: #cbd5e1;
      margin-bottom: 7px;
    }
    .premium-player-card input {
      width: 100% !important;
      height: 44px !important;
      padding: 0 14px !important;
      border-radius: 10px !important;
      border: 1px solid rgba(148, 163, 184, 0.26) !important;
      background: rgba(6, 11, 22, 0.88) !important;
      color: #f8fafc !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      outline: none !important;
      transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
    }
    .premium-player-card input.input-invalid {
      border-color: #fb7185 !important;
      box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.22) !important;
    }
    .premium-player-card input:disabled {
      opacity: 0.85 !important;
      color: #fcd34d !important;
      border-color: rgba(245, 158, 11, 0.35) !important;
      cursor: not-allowed !important;
    }
    .side-x input:focus:not(.input-invalid) {
      border-color: #38bdf8 !important;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18) !important;
    }
    .side-o input:focus:not(.input-invalid) {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18) !important;
    }
    .premium-vs-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .premium-vs-badge {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.28);
      color: #e2e8f0;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
    }
    .premium-swap-btn {
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(30, 41, 59, 0.75);
      color: #cbd5e1;
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .premium-swap-btn:hover {
      color: #f8fafc;
      border-color: rgba(56, 189, 248, 0.45);
      background: rgba(56, 189, 248, 0.14);
    }
    .lobby-validation-msg {
      min-height: 22px;
      margin-bottom: 10px;
      text-align: center;
      font-size: 13.5px;
      font-weight: 700;
      color: #fda4af;
    }
    .premium-lobby-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .premium-start-btn {
      width: 100% !important;
      max-width: 360px !important;
      height: 48px !important;
      border: none !important;
      border-radius: 12px !important;
      background: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%) !important;
      color: #04101d !important;
      font-size: 15.5px !important;
      font-weight: 800 !important;
      letter-spacing: 0.02em !important;
      cursor: pointer !important;
      box-shadow: 0 12px 28px rgba(16, 185, 129, 0.26) !important;
      transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease !important;
    }
    .premium-start-btn:hover {
      transform: translateY(-2px) !important;
      filter: brightness(1.06) !important;
      box-shadow: 0 16px 34px rgba(14, 165, 233, 0.34) !important;
    }
    .premium-lobby-hint {
      font-size: 12.5px;
      color: #94a3b8;
    }
    .end-match-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(3, 7, 18, 0.78);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .end-match-overlay.hidden {
      display: none !important;
    }
    .end-match-dialog {
      width: 100%;
      max-width: 400px;
      background: linear-gradient(180deg, #0f172a, #090f1d);
      border: 1px solid rgba(244, 63, 94, 0.35);
      border-radius: 16px;
      padding: 24px 22px 20px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.72);
      text-align: center;
    }
    .end-match-dialog h3 {
      margin: 0 0 8px;
      font-size: 19px;
      font-weight: 800;
      color: #f8fafc;
    }
    .end-match-dialog p {
      margin: 0 0 20px;
      font-size: 13.5px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .end-match-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .end-match-actions button {
      flex: 1;
      height: 40px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-cancel-end {
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.25);
      color: #e2e8f0;
    }
    .btn-cancel-end:hover {
      background: rgba(51, 65, 85, 0.9);
    }
    .btn-confirm-end {
      background: linear-gradient(135deg, #e11d48, #be123c);
      border: 1px solid rgba(251, 113, 133, 0.5);
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(225, 29, 72, 0.3);
    }
    .btn-confirm-end:hover {
      filter: brightness(1.08);
    }
  `;
  document.head.appendChild(style);
}

let cachedFriendNameO = "";

function clearLobbyValidationState() {
  const inputX = document.getElementById("input-player-x");
  const inputO = document.getElementById("input-player-o");
  const msgEl = document.getElementById("lobby-validation-msg");
  if (inputX) inputX.classList.remove("input-invalid");
  if (inputO) inputO.classList.remove("input-invalid");
  if (msgEl) msgEl.textContent = "";
}

function validatePlayerLineup() {
  const inputX = document.getElementById("input-player-x");
  const inputO = document.getElementById("input-player-o");
  const msgEl = document.getElementById("lobby-validation-msg");

  clearLobbyValidationState();

  const rawX = inputX ? inputX.value.trim() : "";
  const rawO = inputO ? inputO.value.trim() : "";

  if (!rawX) {
    if (inputX) {
      inputX.classList.add("input-invalid");
      inputX.focus();
    }
    if (msgEl) {
      msgEl.textContent = "Please enter a username for Player X.";
    }
    return false;
  }

  if (state.gameMode === "friend") {
    if (!rawO) {
      if (inputO) {
        inputO.classList.add("input-invalid");
        inputO.focus();
      }
      if (msgEl) {
        msgEl.textContent = "Please enter a username for Player O.";
      }
      return false;
    }

    if (normalizeText(rawX) === normalizeText(rawO)) {
      if (inputX) inputX.classList.add("input-invalid");
      if (inputO) {
        inputO.classList.add("input-invalid");
        inputO.focus();
      }
      if (msgEl) {
        msgEl.textContent = "Player X and Player O must have different usernames.";
      }
      return false;
    }
  } else {
    if (normalizeText(rawX) === normalizeText(AI_PLAYER_NAME)) {
      if (inputX) {
        inputX.classList.add("input-invalid");
        inputX.focus();
      }
      if (msgEl) {
        msgEl.textContent = "Player X username cannot match Atlas AI.";
      }
      return false;
    }
  }

  return true;
}

function setLobbyGameMode(mode) {
  state.gameMode = mode === "ai" ? "ai" : "friend";
  const isAi = state.gameMode === "ai";

  clearLobbyValidationState();

  document.querySelectorAll(".mode-option-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.mode === state.gameMode);
  });

  const inputO = document.getElementById("input-player-o");
  const tagO = document.getElementById("lobby-tag-o");
  const labelO = document.getElementById("lobby-label-o");
  const swapBtn = document.getElementById("btn-swap-players");
  const subtitle = document.getElementById("lobby-subtitle-text");

  if (inputO) {
    if (isAi) {
      if (inputO.value && inputO.value !== AI_PLAYER_NAME) {
        cachedFriendNameO = inputO.value;
      }
      inputO.value = AI_PLAYER_NAME;
      inputO.disabled = true;
    } else {
      inputO.disabled = false;
      inputO.value = cachedFriendNameO;
      inputO.placeholder = "Enter Player O name";
    }
  }

  if (tagO) {
    tagO.textContent = isAi ? "AI Opponent · 65% Hit" : "Second Turn · Away";
  }
  if (labelO) {
    labelO.textContent = isAi ? "AI Opponent" : "Player O Name";
  }
  if (swapBtn) {
    swapBtn.classList.toggle("hidden", isAi);
  }
  if (subtitle) {
    subtitle.textContent = isAi
      ? "Enter your unique username before choosing modes and leagues on the world map."
      : "Enter two distinct usernames before selecting modes and leagues on the world map.";
  }
}

function enhancePlayerLobbyUI() {
  const stagePlayers = document.getElementById("stage-players");
  const inputX = document.getElementById("input-player-x");
  const inputO = document.getElementById("input-player-o");
  const btnStartMap = document.getElementById("btn-start-map");

  if (!stagePlayers || !inputX || !inputO || !btnStartMap) return;
  if (stagePlayers.dataset.premiumEnhanced === "true") return;

  stagePlayers.dataset.premiumEnhanced = "true";
  stagePlayers.classList.add("premium-lobby-stage");

  inputX.placeholder = "Enter Player X name";
  inputO.placeholder = "Enter Player O name";
  inputX.setAttribute("autocomplete", "off");
  inputO.setAttribute("autocomplete", "off");

  btnStartMap.classList.add("premium-start-btn");
  btnStartMap.textContent = "Continue to World Map";

  const shell = document.createElement("div");
  shell.className = "premium-lobby-shell";

  const header = document.createElement("div");
  header.className = "premium-lobby-header";
  header.innerHTML = `
    <div class="premium-lobby-eyebrow">Matchday Setup</div>
    <h1 class="premium-lobby-title">Atlas XI</h1>
    <p id="lobby-subtitle-text" class="premium-lobby-subtitle">Enter two distinct usernames before selecting modes and leagues on the world map.</p>
  `;

  const modeGrid = document.createElement("div");
  modeGrid.className = "mode-selector-grid";
  modeGrid.innerHTML = `
    <button type="button" class="mode-option-card active" data-mode="friend">
      <span class="mode-option-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </span>
      <span class="mode-option-text">
        <span class="mode-option-title">Play vs Friend</span>
        <span class="mode-option-desc">Local 1v1 pass-and-play duel</span>
      </span>
    </button>
    <button type="button" class="mode-option-card" data-mode="ai">
      <span class="mode-option-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="14" rx="3"/>
          <path d="M8 21h8"/>
          <path d="M12 18v3"/>
          <circle cx="9" cy="11" r="1.3" fill="currentColor"/>
          <circle cx="15" cy="11" r="1.3" fill="currentColor"/>
        </svg>
      </span>
      <span class="mode-option-text">
        <span class="mode-option-title">Play vs AI</span>
        <span class="mode-option-desc">Solo match against Atlas AI</span>
      </span>
    </button>
  `;

  modeGrid.querySelectorAll(".mode-option-card").forEach((card) => {
    card.addEventListener("click", () => {
      setLobbyGameMode(card.dataset.mode);
    });
  });

  const duelGrid = document.createElement("div");
  duelGrid.className = "premium-duel-grid";

  const cardX = document.createElement("div");
  cardX.className = "premium-player-card side-x";
  cardX.innerHTML = `
    <div class="premium-card-top">
      <span class="premium-crest">X</span>
      <span class="premium-side-tag">First Turn · Home</span>
    </div>
    <label class="premium-field-label" for="input-player-x">Player X Name</label>
  `;
  cardX.appendChild(inputX);

  const vsCol = document.createElement("div");
  vsCol.className = "premium-vs-column";
  const vsBadge = document.createElement("div");
  vsBadge.className = "premium-vs-badge";
  vsBadge.textContent = "VS";

  const swapBtn = document.createElement("button");
  swapBtn.id = "btn-swap-players";
  swapBtn.type = "button";
  swapBtn.className = "premium-swap-btn";
  swapBtn.title = "Swap Player Names";
  swapBtn.textContent = "Swap";
  swapBtn.addEventListener("click", () => {
    if (state.gameMode === "ai") return;
    clearLobbyValidationState();
    const temp = inputX.value;
    inputX.value = inputO.value;
    inputO.value = temp;
  });

  vsCol.appendChild(vsBadge);
  vsCol.appendChild(swapBtn);

  const cardO = document.createElement("div");
  cardO.className = "premium-player-card side-o";
  cardO.innerHTML = `
    <div class="premium-card-top">
      <span class="premium-crest">O</span>
      <span id="lobby-tag-o" class="premium-side-tag">Second Turn · Away</span>
    </div>
    <label id="lobby-label-o" class="premium-field-label" for="input-player-o">Player O Name</label>
  `;
  cardO.appendChild(inputO);

  duelGrid.appendChild(cardX);
  duelGrid.appendChild(vsCol);
  duelGrid.appendChild(cardO);

  const validationMsg = document.createElement("div");
  validationMsg.id = "lobby-validation-msg";
  validationMsg.className = "lobby-validation-msg";
  validationMsg.setAttribute("role", "alert");

  const footer = document.createElement("div");
  footer.className = "premium-lobby-footer";
  footer.appendChild(btnStartMap);

  const hint = document.createElement("div");
  hint.className = "premium-lobby-hint";
  hint.textContent = "Unique usernames required · Press Enter to advance";
  footer.appendChild(hint);

  shell.appendChild(header);
  shell.appendChild(modeGrid);
  shell.appendChild(duelGrid);
  shell.appendChild(validationMsg);
  shell.appendChild(footer);

  stagePlayers.innerHTML = "";
  stagePlayers.appendChild(shell);

  inputX.addEventListener("input", clearLobbyValidationState);
  inputO.addEventListener("input", clearLobbyValidationState);

  inputX.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (state.gameMode === "ai") {
        btnStartMap.click();
      } else if (!inputO.value.trim()) {
        inputO.focus();
      } else {
        btnStartMap.click();
      }
    }
  });

  inputO.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnStartMap.click();
    }
  });
}

function clearPendingAiTurn() {
  if (state.aiTimer !== null) {
    clearTimeout(state.aiTimer);
    state.aiTimer = null;
  }
  state.isAiThinking = false;
  const btnSkip = document.getElementById("btn-skip");
  if (btnSkip) {
    btnSkip.disabled = false;
  }
}

function setupEndMatchControls() {
  const btnBackMap = document.getElementById("btn-back-map");
  const navContainer = btnBackMap ? btnBackMap.parentElement : null;

  if (navContainer && !document.getElementById("btn-end-match")) {
    const endBtn = document.createElement("button");
    endBtn.id = "btn-end-match";
    endBtn.type = "button";
    endBtn.className = "btn-end-match hidden";
    endBtn.textContent = "End Match";
    endBtn.addEventListener("click", handleEndMatchRequest);
    navContainer.appendChild(endBtn);
  }

  if (!document.getElementById("end-match-modal")) {
    const overlay = document.createElement("div");
    overlay.id = "end-match-modal";
    overlay.className = "end-match-overlay hidden";
    overlay.innerHTML = `
      <div class="end-match-dialog">
        <h3>End Current Match?</h3>
        <p>The active board and current series score will be closed and you will return to the World Map.</p>
        <div class="end-match-actions">
          <button type="button" id="btn-cancel-end-match" class="btn-cancel-end">Continue Match</button>
          <button type="button" id="btn-confirm-end-match" class="btn-confirm-end">End Match</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("btn-cancel-end-match").addEventListener("click", () => {
      overlay.classList.add("hidden");
    });

    document.getElementById("btn-confirm-end-match").addEventListener("click", () => {
      overlay.classList.add("hidden");
      executeEndMatch();
    });
  }

  window.addEventListener("popstate", () => {
    const activeStage = document.querySelector(".stage.active");
    if (activeStage && activeStage.id === "stage-game") {
      window.history.pushState({ inGame: true }, "");
    }
  });
}

function handleEndMatchRequest() {
  if (state.gameOver) {
    executeEndMatch();
    return;
  }
  const modal = document.getElementById("end-match-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function executeEndMatch() {
  clearPendingAiTurn();
  closeGuessModal();
  state.scores = { X: 0, O: 0 };
  state.gameOver = false;
  state.board = Array(3).fill(null).map(() => Array(3).fill(null));
  state.usedPlayers.clear();

  const scoreXEl = document.getElementById("score-x");
  const scoreOEl = document.getElementById("score-o");
  if (scoreXEl) scoreXEl.textContent = "0";
  if (scoreOEl) scoreOEl.textContent = "0";

  showStage("map");
  updateCountrySelectionUI();
}

function setDifficulty(newDiff) {
  if (!DIFFICULTY_META[newDiff]) return;
  state.difficulty = newDiff;
  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.diff === newDiff);
  });

  const activeStage = document.querySelector(".stage.active");
  if (activeStage && activeStage.id === "stage-game") {
    const diffMeta = DIFFICULTY_META[newDiff];
    setStatus(`Difficulty set to ${diffMeta.label}. Applies on next round.`);
  }
}

function bindDifficultyControls() {
  document.querySelectorAll("#difficulty-selector .difficulty-btn").forEach((btn) => {
    btn.addEventListener("click", () => setDifficulty(btn.dataset.diff));
  });
}

function showStage(stageName) {
  if (stageName !== "game") {
    clearPendingAiTurn();
  }

  document.querySelectorAll(".stage").forEach((el) => el.classList.remove("active"));
  document.getElementById(`stage-${stageName}`).classList.add("active");

  const btnBackNames = document.getElementById("btn-back-names");
  const btnBackMap = document.getElementById("btn-back-map");
  const btnNewGrid = document.getElementById("btn-new-grid");
  const btnEndMatch = document.getElementById("btn-end-match");

  btnBackNames.classList.add("hidden");
  btnBackNames.style.display = "none";
  btnBackMap.classList.add("hidden");
  btnBackMap.style.display = "none";
  btnNewGrid.classList.add("hidden");
  btnNewGrid.style.display = "none";

  if (btnEndMatch) {
    btnEndMatch.classList.add("hidden");
  }

  if (stageName === "map") {
    btnBackNames.classList.remove("hidden");
    btnBackNames.style.display = "";
    renderCountrySidebar();
    requestAnimationFrame(() => {
      syncCanvasResolution();
      state.mapView.needsRender = true;
      drawWorldMap();
    });
  } else if (stageName === "game") {
    window.history.pushState({ inGame: true }, "");
    if (btnEndMatch) {
      btnEndMatch.classList.remove("hidden");
    }
    if (state.gameOver) {
      btnNewGrid.classList.remove("hidden");
      btnNewGrid.style.display = "";
    }
  }

  updateTurnBanner();
}

function getLogicalCanvasSize(canvas) {
  const dpr = canvas._dpr || 1;
  return {
    w: canvas.width / dpr,
    h: canvas.height / dpr
  };
}

function syncCanvasResolution() {
  const canvas = document.getElementById("world-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH || canvas._dpr !== dpr) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas._dpr = dpr;
    state.mapView.needsRender = true;
  }
}

function latLngToBase(lat, lng, width, height) {
  const clampedLat = Math.max(-62, Math.min(84, lat));
  const x = ((lng + 180) / 360) * width;
  const y = ((84 - clampedLat) / 146) * height;
  return { x, y };
}

function screenToLatLng(screenX, screenY, width, height) {
  const cx = width * 0.5;
  const cy = height * 0.5;
  const z = state.mapView.zoom;
  const baseX = (screenX - cx - state.mapView.offsetX) / z + cx;
  const baseY = (screenY - cy - state.mapView.offsetY) / z + cy;
  const lng = (baseX / width) * 360 - 180;
  const lat = 84 - (baseY / height) * 146;
  return {
    lat: Math.max(-90, Math.min(90, lat)),
    lng: Math.max(-180, Math.min(180, lng))
  };
}

function formatGeographicCoords(lat, lng) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `Lat ${Math.abs(lat).toFixed(2)}° ${latDir}, Lng ${Math.abs(lng).toFixed(2)}° ${lngDir}`;
}

function clampMapOffsets(offsetX, offsetY, zoom, width, height) {
  if (zoom <= 1) {
    return { x: 0, y: 0 };
  }
  const maxOffsetX = width * (zoom - 1) * 0.5;
  const maxOffsetY = height * (zoom - 1) * 0.5;
  return {
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY))
  };
}

function projectPoint(lat, lng, width, height) {
  const base = latLngToBase(lat, lng, width, height);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const z = state.mapView.zoom;
  return {
    x: (base.x - cx) * z + cx + state.mapView.offsetX,
    y: (base.y - cy) * z + cy + state.mapView.offsetY
  };
}

function setMapZoomAt(newZoom, pivotX, pivotY, smooth = true) {
  const canvas = document.getElementById("world-canvas");
  if (!canvas) return;
  const { w, h } = getLogicalCanvasSize(canvas);
  const mv = state.mapView;

  const clampedZoom = Math.max(mv.minZoom, Math.min(mv.maxZoom, newZoom));
  const currentZoom = smooth ? mv.targetZoom : mv.zoom;
  const currentOx = smooth ? mv.targetOffsetX : mv.offsetX;
  const currentOy = smooth ? mv.targetOffsetY : mv.offsetY;

  const cx = w * 0.5;
  const cy = h * 0.5;

  const worldX = (pivotX - cx - currentOx) / currentZoom + cx;
  const worldY = (pivotY - cy - currentOy) / currentZoom + cy;

  const rawOx = pivotX - cx - (worldX - cx) * clampedZoom;
  const rawOy = pivotY - cy - (worldY - cy) * clampedZoom;
  const clamped = clampMapOffsets(rawOx, rawOy, clampedZoom, w, h);

  mv.targetZoom = clampedZoom;
  mv.targetOffsetX = clamped.x;
  mv.targetOffsetY = clamped.y;

  if (!smooth) {
    mv.zoom = clampedZoom;
    mv.offsetX = clamped.x;
    mv.offsetY = clamped.y;
  }

  mv.needsRender = true;
  updateZoomBadge();
  updateRegionButtons("");
}

function focusOnCoords(lat, lng, targetZoom) {
  const canvas = document.getElementById("world-canvas");
  if (!canvas) return;
  const { w, h } = getLogicalCanvasSize(canvas);
  const mv = state.mapView;

  const z = Math.max(mv.minZoom, Math.min(mv.maxZoom, targetZoom));
  const base = latLngToBase(lat, lng, w, h);
  const cx = w * 0.5;
  const cy = h * 0.5;

  const rawOx = -(base.x - cx) * z;
  const rawOy = -(base.y - cy) * z;
  const clamped = clampMapOffsets(rawOx, rawOy, z, w, h);

  mv.targetZoom = z;
  mv.targetOffsetX = clamped.x;
  mv.targetOffsetY = clamped.y;
  mv.needsRender = true;
  updateZoomBadge();
}

function updateZoomBadge() {
  const badge = document.getElementById("zoom-level-badge");
  if (badge) {
    badge.textContent = `${state.mapView.targetZoom.toFixed(1)}x`;
  }
}

function updateRegionButtons(activeRegion) {
  state.mapView.activeRegion = activeRegion;
  document.querySelectorAll(".region-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.region === activeRegion);
  });
}

function traceGeoPolygon(ctx, rings, w, h) {
  rings.forEach((ring) => {
    ring.forEach(([lng, lat], idx) => {
      const pt = projectPoint(lat, lng, w, h);
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
  });
}

function isCodeSelectedHorizontal(code) {
  if (state.gridMode === "nation_vs_league") {
    return state.horizontalNations.includes(code);
  }
  return state.horizontalCountry === code;
}

function paintCountryPolygon(ctx, rings, rawCodes, w, h) {
  const activeCodes = getActiveCodesForFeature(rawCodes);
  const nearSelectable = isPolygonNearCountry(rings, activeCodes);
  const scopedCodes = nearSelectable ? activeCodes : [];

  const isH = scopedCodes.some((c) => isCodeSelectedHorizontal(c));
  const isV = Boolean(state.verticalCountry && scopedCodes.includes(state.verticalCountry));
  const isHover = Boolean(state.hoveredCountry && scopedCodes.includes(state.hoveredCountry));
  const hasOption = scopedCodes.length > 0;

  ctx.beginPath();
  traceGeoPolygon(ctx, rings, w, h);

  if (isH) {
    ctx.fillStyle = "rgba(56, 189, 248, 0.36)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.6;
  } else if (isV) {
    ctx.fillStyle = "rgba(245, 158, 11, 0.36)";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.6;
  } else if (isHover) {
    ctx.fillStyle = "rgba(16, 185, 129, 0.34)";
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 1.6;
  } else if (hasOption) {
    ctx.fillStyle = "#16243d";
    ctx.strokeStyle = "#2d466e";
    ctx.lineWidth = 1.05;
  } else {
    ctx.fillStyle = "#0c1424";
    ctx.strokeStyle = "#18243b";
    ctx.lineWidth = 0.85;
  }

  ctx.fill("evenodd");
  ctx.stroke();
}

function drawRoundedLabel(ctx, text, x, y, bgColor, borderColor, textColor, fontSize = 11) {
  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 6;
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + 7;
  const rx = x - boxW * 0.5;
  const ry = y - boxH * 0.5;
  const radius = 4;

  ctx.beginPath();
  ctx.moveTo(rx + radius, ry);
  ctx.lineTo(rx + boxW - radius, ry);
  ctx.quadraticCurveTo(rx + boxW, ry, rx + boxW, ry + radius);
  ctx.lineTo(rx + boxW, ry + boxH - radius);
  ctx.quadraticCurveTo(rx + boxW, ry + boxH, rx + boxW - radius, ry + boxH);
  ctx.lineTo(rx + radius, ry + boxH);
  ctx.quadraticCurveTo(rx, ry + boxH, rx, ry + boxH - radius);
  ctx.lineTo(rx, ry + radius);
  ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5);
}

function drawWorldMap() {
  const canvas = document.getElementById("world-canvas");
  if (!canvas) return;
  syncCanvasResolution();

  const ctx = canvas.getContext("2d");
  const dpr = canvas._dpr || 1;
  const { w, h } = getLogicalCanvasSize(canvas);
  if (w === 0 || h === 0) return;
  const z = state.mapView.zoom;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const oceanGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 40, w * 0.5, h * 0.5, w * 0.72);
  oceanGrad.addColorStop(0, "#0b1933");
  oceanGrad.addColorStop(0.65, "#071124");
  oceanGrad.addColorStop(1, "#040914");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  const gridStep = z >= 2.5 ? 10 : z >= 1.6 ? 15 : 30;
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += gridStep) {
    const p1 = projectPoint(84, lon, w, h);
    const p2 = projectPoint(-62, lon, w, h);
    ctx.strokeStyle = lon === 0 ? "rgba(56, 189, 248, 0.16)" : "rgba(148, 163, 184, 0.07)";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 80; lat += gridStep) {
    const p1 = projectPoint(lat, -180, w, h);
    const p2 = projectPoint(lat, 180, w, h);
    ctx.strokeStyle = lat === 0 ? "rgba(16, 185, 129, 0.18)" : "rgba(148, 163, 184, 0.07)";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  if (Array.isArray(state.worldGeoFeatures) && state.worldGeoFeatures.length > 0) {
    state.worldGeoFeatures.forEach((feat) => {
      const geom = feat.geometry;
      if (!geom) return;

      if (geom.type === "Polygon") {
        paintCountryPolygon(ctx, geom.coordinates, feat.rawCodes, w, h);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach((poly) => {
          paintCountryPolygon(ctx, poly, feat.rawCodes, w, h);
        });
      }
    });
  } else if (Array.isArray(FOOTBALL_DB.continents)) {
    FOOTBALL_DB.continents.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lng, lat], idx) => {
        const pt = projectPoint(lat, lng, w, h);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = "#111b2e";
      ctx.fill();
      ctx.strokeStyle = "#22324d";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }

  const hCodes = state.gridMode === "nation_vs_league"
    ? state.horizontalNations
    : state.horizontalCountry
      ? [state.horizontalCountry]
      : [];

  if (hCodes.length > 0 && state.verticalCountry) {
    const vInfo = FOOTBALL_DB.countries[state.verticalCountry];
    if (vInfo) {
      const pV = projectPoint(vInfo.lat, vInfo.lng, w, h);
      hCodes.forEach((hCode) => {
        const hInfo = NATIONS_DB[hCode] || FOOTBALL_DB.countries[hCode];
        if (!hInfo || hCode === state.verticalCountry) return;
        const pH = projectPoint(hInfo.lat, hInfo.lng, w, h);
        const midX = (pH.x + pV.x) * 0.5;
        const midY = (pH.y + pV.y) * 0.5 - Math.min(85, Math.hypot(pV.x - pH.x, pV.y - pH.y) * 0.24);

        const arcGrad = ctx.createLinearGradient(pH.x, pH.y, pV.x, pV.y);
        arcGrad.addColorStop(0, "#38bdf8");
        arcGrad.addColorStop(0.5, "#10b981");
        arcGrad.addColorStop(1, "#f59e0b");

        ctx.save();
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -state.mapView.pulsePhase * 18;
        ctx.strokeStyle = arcGrad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(pH.x, pH.y);
        ctx.quadraticCurveTo(midX, midY, pV.x, pV.y);
        ctx.stroke();
        ctx.restore();
      });
    }
  }

  const combinedCatalog = {};
  const baseCatalog = getActiveMapCatalog();
  for (const [code, info] of Object.entries(baseCatalog)) {
    if (isCodeSelectableOnMap(code)) {
      combinedCatalog[code] = info;
    }
  }
  for (const hCode of hCodes) {
    if (!combinedCatalog[hCode] && (NATIONS_DB[hCode] || FOOTBALL_DB.countries[hCode])) {
      combinedCatalog[hCode] = NATIONS_DB[hCode] || FOOTBALL_DB.countries[hCode];
    }
  }
  if (state.verticalCountry && !combinedCatalog[state.verticalCountry] && FOOTBALL_DB.countries[state.verticalCountry]) {
    combinedCatalog[state.verticalCountry] = FOOTBALL_DB.countries[state.verticalCountry];
  }

  state.countryScreenCoords = {};
  const entries = Object.entries(combinedCatalog);
  entries.sort(([codeA], [codeB]) => {
    const score = (c) => {
      if (c === state.hoveredCountry) return 4;
      if (isCodeSelectedHorizontal(c) || c === state.verticalCountry) return 3;
      return 1;
    };
    return score(codeA) - score(codeB);
  });

  const pinNodes = [];

  entries.forEach(([code, info]) => {
    const pt = projectPoint(info.lat, info.lng, w, h);
    state.countryScreenCoords[code] = pt;

    const isH = isCodeSelectedHorizontal(code);
    const isV = code === state.verticalCountry;
    const isHover = code === state.hoveredCountry;

    let fillColor = "#10b981";
    let baseRadius = Math.min(7.5, 4.1 + (z - 1) * 0.65);

    if (isH) {
      fillColor = "#38bdf8";
      baseRadius += 2.6;
    } else if (isV) {
      fillColor = "#f59e0b";
      baseRadius += 2.6;
    } else if (isHover) {
      fillColor = "#34d399";
      baseRadius += 2.0;
    }

    const pulse = (isH || isV || isHover) ? Math.sin(state.mapView.pulsePhase * 4) * 2.8 : 0;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseRadius + 4 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = isH
      ? "rgba(56, 189, 248, 0.25)"
      : isV
        ? "rgba(245, 158, 11, 0.25)"
        : isHover
          ? "rgba(52, 211, 153, 0.30)"
          : "rgba(16, 185, 129, 0.16)";
    ctx.fill();

    if (isH || isV) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, baseRadius + 8 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = isH ? "rgba(56, 189, 248, 0.65)" : "rgba(245, 158, 11, 0.65)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#f8fafc";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseRadius * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = "#06101f";
    ctx.fill();

    pinNodes.push({
      code,
      info,
      pt,
      baseRadius,
      isH,
      isV,
      isHover,
      priority: isHover ? 4 : (isH || isV) ? 3 : 1
    });
  });

  const placedLabels = [];
  const labelOrder = [...pinNodes].sort((a, b) => b.priority - a.priority);

  labelOrder.forEach((node) => {
    const { info, pt, baseRadius, isH, isV, isHover } = node;
    const isPriority = isH || isV || isHover;
    const labelText = isH ? `H · ${info.name}` : isV ? `V · ${info.name}` : info.name;
    const fontSize = isPriority ? 11.5 : 10.5;
    const estWidth = labelText.length * 6.3 + 12;
    const estHeight = fontSize + 7;

    const candidates = [
      { x: pt.x, y: pt.y - baseRadius - 12 },
      { x: pt.x, y: pt.y + baseRadius + 12 },
      { x: pt.x + baseRadius + estWidth * 0.5 + 6, y: pt.y },
      { x: pt.x - baseRadius - estWidth * 0.5 - 6, y: pt.y }
    ];

    let chosenPos = null;
    for (const cand of candidates) {
      if (cand.x - estWidth * 0.5 < 6 || cand.x + estWidth * 0.5 > w - 6) continue;
      if (cand.y - estHeight * 0.5 < 6 || cand.y + estHeight * 0.5 > h - 6) continue;

      const hitsLabel = placedLabels.some(
        (box) => Math.abs(box.x - cand.x) < (box.w + estWidth) * 0.52 && Math.abs(box.y - cand.y) < (box.h + estHeight) * 0.56
      );
      const hitsPin = pinNodes.some(
        (other) => Math.abs(other.pt.x - cand.x) < estWidth * 0.5 + other.baseRadius + 2 &&
                   Math.abs(other.pt.y - cand.y) < estHeight * 0.5 + other.baseRadius + 2
      );

      if (!hitsLabel && !hitsPin) {
        chosenPos = cand;
        break;
      }
    }

    if (!chosenPos && isPriority) {
      chosenPos = {
        x: Math.max(estWidth * 0.5 + 8, Math.min(w - estWidth * 0.5 - 8, pt.x)),
        y: Math.max(estHeight * 0.5 + 8, pt.y - baseRadius - 13)
      };
    }

    if (chosenPos) {
      placedLabels.push({ x: chosenPos.x, y: chosenPos.y, w: estWidth, h: estHeight });
      const bg = isH
        ? "rgba(8, 47, 73, 0.94)"
        : isV
          ? "rgba(69, 26, 3, 0.94)"
          : isHover
            ? "rgba(6, 78, 59, 0.96)"
            : "rgba(9, 14, 26, 0.86)";
      const border = isH ? "#38bdf8" : isV ? "#f59e0b" : isHover ? "#34d399" : "rgba(148, 163, 184, 0.28)";
      const txtCol = isH ? "#bae6fd" : isV ? "#fde68a" : "#f1f5f9";
      drawRoundedLabel(ctx, labelText, chosenPos.x, chosenPos.y, bg, border, txtCol, fontSize);
    }
  });

  ctx.restore();
  state.mapView.needsRender = false;
}

function animateMapLoop(timestamp) {
  const mv = state.mapView;
  mv.pulsePhase = timestamp * 0.001;

  const activeStage = document.querySelector(".stage.active");
  if (activeStage && activeStage.id === "stage-map") {
    const lerp = 0.18;
    const dz = mv.targetZoom - mv.zoom;
    const dx = mv.targetOffsetX - mv.offsetX;
    const dy = mv.targetOffsetY - mv.offsetY;

    const isInterpolating = Math.abs(dz) > 0.0005 || Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05;
    const hasPulse = Boolean(
      state.horizontalCountry ||
      state.horizontalNations.length > 0 ||
      state.verticalCountry ||
      state.hoveredCountry
    );

    if (isInterpolating) {
      mv.zoom += dz * lerp;
      mv.offsetX += dx * lerp;
      mv.offsetY += dy * lerp;
      mv.needsRender = true;
    } else if (mv.zoom !== mv.targetZoom || mv.offsetX !== mv.targetOffsetX || mv.offsetY !== mv.targetOffsetY) {
      mv.zoom = mv.targetZoom;
      mv.offsetX = mv.targetOffsetX;
      mv.offsetY = mv.targetOffsetY;
      mv.needsRender = true;
    }

    if (mv.needsRender || hasPulse) {
      drawWorldMap();
    }
  }

  requestAnimationFrame(animateMapLoop);
}

function getHoveredCountryCode(clientX, clientY) {
  const canvas = document.getElementById("world-canvas");
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let closestPinCode = null;
  let closestPinDist = 11;

  for (const [code, pt] of Object.entries(state.countryScreenCoords)) {
    const dist = Math.hypot(x - pt.x, y - pt.y);
    if (dist <= closestPinDist) {
      closestPinDist = dist;
      closestPinCode = code;
    }
  }
  if (closestPinCode) return closestPinCode;

  if (Array.isArray(state.worldGeoFeatures) && state.worldGeoFeatures.length > 0) {
    const { w, h } = getLogicalCanvasSize(canvas);
    const { lat, lng } = screenToLatLng(x, y, w, h);

    for (const feat of state.worldGeoFeatures) {
      const activeCodes = getActiveCodesForFeature(feat.rawCodes);
      if (activeCodes.length === 0 || !feat.geometry) continue;
      const geom = feat.geometry;
      let hit = false;

      if (geom.type === "Polygon") {
        if (
          isPolygonNearCountry(geom.coordinates, activeCodes) &&
          isPointInPolygonRings(lng, lat, geom.coordinates)
        ) {
          hit = true;
        }
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          if (
            isPolygonNearCountry(poly, activeCodes) &&
            isPointInPolygonRings(lng, lat, poly)
          ) {
            hit = true;
            break;
          }
        }
      }

      if (hit) {
        if (activeCodes.length === 1) {
          return activeCodes[0];
        }
        let bestCode = activeCodes[0];
        let bestDist = Infinity;
        for (const code of activeCodes) {
          const pt = state.countryScreenCoords[code];
          if (!pt) continue;
          const d = Math.hypot(x - pt.x, y - pt.y);
          if (d < bestDist) {
            bestDist = d;
            bestCode = code;
          }
        }
        return bestCode;
      }
    }
  }

  return null;
}

function toggleCountrySelection(code) {
  if (!code) return;

  if (state.gridMode === "nation_vs_league") {
    const existingIdx = state.horizontalNations.indexOf(code);
    if (existingIdx !== -1) {
      state.horizontalNations.splice(existingIdx, 1);
      state.mapView.needsRender = true;
      updateCountrySelectionUI();
      return;
    }

    if (state.verticalCountry === code && state.horizontalNations.length === 3) {
      state.verticalCountry = null;
      state.mapView.needsRender = true;
      updateCountrySelectionUI();
      return;
    }

    if (state.horizontalNations.length < 3) {
      if (hasActiveNation(code)) {
        state.horizontalNations.push(code);
      }
    } else if (hasActiveLeague(code)) {
      state.verticalCountry = code;
    }

    state.mapView.needsRender = true;
    updateCountrySelectionUI();
    return;
  }

  if (!hasActiveLeague(code)) return;

  if (!state.horizontalCountry) {
    state.horizontalCountry = code;
  } else if (!state.verticalCountry && code !== state.horizontalCountry) {
    state.verticalCountry = code;
  } else if (code === state.horizontalCountry) {
    state.horizontalCountry = null;
  } else if (code === state.verticalCountry) {
    state.verticalCountry = null;
  } else {
    state.horizontalCountry = code;
    state.verticalCountry = null;
  }

  state.mapView.needsRender = true;
  updateCountrySelectionUI();
}

function renderCountrySidebar() {
  const listEl = document.getElementById("country-list");
  const countEl = document.getElementById("drawer-count");
  const titleEl = document.getElementById("drawer-title");
  const searchInput = document.getElementById("country-search-input");
  if (!listEl) return;

  const isNationStep = isNationSelectionPhase();
  if (titleEl) {
    if (state.gridMode === "nation_vs_league") {
      titleEl.textContent = isNationStep ? "Nationalities (Step 1 of 2)" : "Leagues (Step 2 of 2)";
    } else {
      titleEl.textContent = "Leagues & Countries";
    }
  }
  if (searchInput) {
    searchInput.placeholder = isNationStep
      ? "Search nationality or country..."
      : "Search country or league...";
  }

  const query = normalizeText(searchInput ? searchInput.value : "");
  const catalog = getActiveMapCatalog();
  const sortedEntries = Object.entries(catalog)
    .filter(([code]) => isCodeSelectableOnMap(code))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const filtered = sortedEntries.filter(([code, info]) => {
    if (!query) return true;
    return (
      normalizeText(info.name).includes(query) ||
      normalizeText(info.league || "").includes(query) ||
      normalizeText(info.confederation || "").includes(query) ||
      code.toLowerCase().includes(query)
    );
  });

  if (countEl) {
    countEl.textContent = filtered.length;
  }

  listEl.innerHTML = "";
  filtered.forEach(([code, info]) => {
    const li = document.createElement("li");
    li.className = "country-item";
    let tagText = isNationStep
      ? `${info.playerCount} players`
      : `${info.clubs.length} clubs`;
    const subLabel = isNationStep
      ? `FIFA / ISO: ${code}`
      : info.league;

    if (isCodeSelectedHorizontal(code)) {
      li.classList.add("selected-h");
      if (state.gridMode === "nation_vs_league") {
        const slot = state.horizontalNations.indexOf(code) + 1;
        tagText = `NATION #${slot}`;
      } else {
        tagText = "HORIZONTAL";
      }
    } else if (code === state.verticalCountry) {
      li.classList.add("selected-v");
      tagText = state.gridMode === "nation_vs_league" ? "LEAGUE" : "VERTICAL";
    }

    li.innerHTML = `
      <div class="country-item-info">
        <span class="country-item-name">${info.name}</span>
        <span class="country-item-league">${subLabel}</span>
      </div>
      <span class="country-item-tag">${tagText}</span>
    `;

    li.addEventListener("mouseenter", () => {
      state.hoveredCountry = code;
      state.mapView.needsRender = true;
    });

    li.addEventListener("mouseleave", () => {
      if (state.hoveredCountry === code) {
        state.hoveredCountry = null;
        state.mapView.needsRender = true;
      }
    });

    li.addEventListener("click", () => {
      toggleCountrySelection(code);
      focusOnCoords(info.lat, info.lng, Math.max(state.mapView.targetZoom, 2.5));
      updateRegionButtons("");
    });

    listEl.appendChild(li);
  });
}

function updateCountrySelectionUI() {
  const pillH = document.getElementById("pill-horizontal");
  const pillV = document.getElementById("pill-vertical");
  const inst = document.getElementById("map-instruction");
  const btnEnter = document.getElementById("btn-enter-game");
  const btnAutoFill = document.getElementById("btn-autofill-axes");

  if (state.gridMode === "nation_vs_league") {
    const pickedCount = state.horizontalNations.length;
    if (pickedCount > 0) {
      const names = state.horizontalNations.map((c) => getNationName(c)).join(", ");
      pillH.textContent = `Nations (${pickedCount}/3): ${names}`;
      pillH.className = "pill horizontal";
    } else {
      pillH.textContent = "Nations (0/3): None";
      pillH.className = "pill empty";
    }

    if (state.verticalCountry && FOOTBALL_DB.countries[state.verticalCountry]) {
      const v = FOOTBALL_DB.countries[state.verticalCountry];
      pillV.textContent = `League: ${v.name} (${v.league})`;
      pillV.className = "pill vertical";
    } else {
      pillV.textContent = "League: None";
      pillV.className = "pill empty";
    }

    if (pickedCount < 3) {
      const rem = 3 - pickedCount;
      inst.textContent = `Select ${rem} more ${rem === 1 ? "nationality" : "nationalities"} for Columns (or Auto-Fill).`;
      btnEnter.disabled = true;
    } else if (!state.verticalCountry) {
      inst.textContent = "Select 1 league country for Rows (or Auto-Fill).";
      btnEnter.disabled = true;
    } else {
      inst.textContent = "Ready. Click Start Game.";
      btnEnter.disabled = false;
    }

    if (btnAutoFill) {
      btnAutoFill.classList.remove("hidden");
      btnAutoFill.disabled = pickedCount === 3 && Boolean(state.verticalCountry);
    }
  } else {
    if (state.horizontalCountry && FOOTBALL_DB.countries[state.horizontalCountry]) {
      const h = FOOTBALL_DB.countries[state.horizontalCountry];
      pillH.textContent = `Horizontal: ${h.name}`;
      pillH.className = "pill horizontal";
    } else {
      pillH.textContent = "Horizontal: None";
      pillH.className = "pill empty";
    }

    if (state.verticalCountry && FOOTBALL_DB.countries[state.verticalCountry]) {
      const v = FOOTBALL_DB.countries[state.verticalCountry];
      pillV.textContent = `Vertical: ${v.name}`;
      pillV.className = "pill vertical";
    } else {
      pillV.textContent = "Vertical: None";
      pillV.className = "pill empty";
    }

    if (!state.horizontalCountry) {
      inst.textContent = "Select one country for Horizontal axis.";
      btnEnter.disabled = true;
    } else if (!state.verticalCountry) {
      inst.textContent = "Select a second country for Vertical axis.";
      btnEnter.disabled = true;
    } else {
      inst.textContent = "Ready. Click Start Game.";
      btnEnter.disabled = false;
    }

    if (btnAutoFill) {
      btnAutoFill.classList.remove("hidden");
      btnAutoFill.disabled = Boolean(state.horizontalCountry && state.verticalCountry);
    }
  }

  renderCountrySidebar();
  drawWorldMap();
}

function startNewRound() {
  clearPendingAiTurn();

  const diffMeta = DIFFICULTY_META[state.difficulty] || DIFFICULTY_META.medium;
  const modeTag = state.gameMode === "ai" ? " · vs Atlas AI" : "";

  if (state.gridMode === "nation_vs_league") {
    if (state.horizontalNations.length !== 3 || !state.verticalCountry) return;
    const vCountry = FOOTBALL_DB.countries[state.verticalCountry];
    const nationNames = state.horizontalNations.map((c) => getNationName(c)).join(" · ");

    document.getElementById("meta-horizontal").textContent = `Nationalities: ${nationNames}`;
    document.getElementById("meta-vertical").textContent = `League: ${vCountry.name} (${vCountry.league}) · ${diffMeta.label}${modeTag}`;

    const grid = generateNationVsLeagueGrid(state.horizontalNations, state.verticalCountry, state.difficulty);
    if (!grid) {
      setStatus("No full 3x3 solvable intersection found for these nationalities and league. Try Auto-Fill or another league.");
      return;
    }

    state.colNations = grid.nations;
    state.colClubs = [];
    state.rowClubs = grid.rows;

    for (let i = 0; i < 3; i++) {
      const colEl = document.getElementById(`col-${i}`);
      colEl.classList.add("nation-header");
      colEl.innerHTML = `${getNationName(state.colNations[i])}<span class="club-badge">${state.colNations[i]} · Nationality</span>`;

      const rowEl = document.getElementById(`row-${i}`);
      rowEl.classList.remove("nation-header");
      rowEl.innerHTML = `${state.rowClubs[i]}<span class="club-badge">${vCountry.league}</span>`;
    }
  } else {
    if (!state.horizontalCountry || !state.verticalCountry) return;
    const hCountry = FOOTBALL_DB.countries[state.horizontalCountry];
    const vCountry = FOOTBALL_DB.countries[state.verticalCountry];

    document.getElementById("meta-horizontal").textContent = `Horizontal: ${hCountry.name} (${hCountry.league})`;
    document.getElementById("meta-vertical").textContent = `Vertical: ${vCountry.name} (${vCountry.league}) · ${diffMeta.label}${modeTag}`;

    const grid = generateSolvableGrid(state.horizontalCountry, state.verticalCountry, state.difficulty);
    if (!grid) {
      setStatus("No full 3x3 solvable intersection found for this pair. Try another country pair.");
      return;
    }

    state.colClubs = grid.cols;
    state.colNations = [];
    state.rowClubs = grid.rows;

    for (let i = 0; i < 3; i++) {
      const colEl = document.getElementById(`col-${i}`);
      colEl.classList.remove("nation-header");
      colEl.innerHTML = `${state.colClubs[i]}<span class="club-badge">${hCountry.league}</span>`;

      const rowEl = document.getElementById(`row-${i}`);
      rowEl.classList.remove("nation-header");
      rowEl.innerHTML = `${state.rowClubs[i]}<span class="club-badge">${vCountry.league}</span>`;
    }
  }

  state.board = Array(3).fill(null).map(() => Array(3).fill(null));
  state.usedPlayers.clear();
  state.turn = "X";
  state.gameOver = false;

  const btnNewGrid = document.getElementById("btn-new-grid");
  if (btnNewGrid) {
    btnNewGrid.classList.add("hidden");
    btnNewGrid.style.display = "none";
  }

  document.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.className = "grid-cell";
    cell.innerHTML = "";
  });

  updateTurnBanner();
  setStatus(`[${diffMeta.label}] ${state.players.X} (X) starts. Pick a cell.`);
}

function updateTurnBanner() {
  const banner = document.getElementById("turn-indicator");
  const cardX = document.getElementById("card-x");
  const cardO = document.getElementById("card-o");

  cardX.classList.remove("active-x");
  cardO.classList.remove("active-o");

  const activeStage = document.querySelector(".stage.active");
  if (!activeStage || activeStage.id === "stage-players") {
    banner.textContent = "Player Setup";
    banner.className = "turn-banner";
    return;
  }

  if (activeStage.id === "stage-map") {
    banner.textContent = state.gridMode === "nation_vs_league" ? "Nationality × League" : "Club × Club";
    banner.className = "turn-banner";
    return;
  }

  if (state.gameOver) {
    banner.className = "turn-banner";
    return;
  }

  if (state.turn === "X") {
    banner.textContent = `${state.players.X} (X) Turn`;
    banner.className = "turn-banner turn-x";
    cardX.classList.add("active-x");
  } else {
    banner.textContent = state.gameMode === "ai" ? `${AI_PLAYER_NAME} (O) Thinking...` : `${state.players.O} (O) Turn`;
    banner.className = "turn-banner turn-o";
    cardO.classList.add("active-o");
  }
}

function setStatus(msg) {
  document.getElementById("status-message").textContent = msg;
}

function getCellMatchupLabel(r, c) {
  const rowClub = state.rowClubs[r];
  if (state.gridMode === "nation_vs_league") {
    const colNat = getNationName(state.colNations[c]);
    return `${rowClub} × ${colNat}`;
  }
  return `${rowClub} × ${state.colClubs[c]}`;
}

function inspectCellSolutions(r, c) {
  const valid = getCellValidPlayers(r, c);
  const label = getCellMatchupLabel(r, c);
  const sample = valid.slice(0, 6).map((p) => p.name).join(", ");
  const extra = valid.length > 6 ? ` (+${valid.length - 6} more)` : "";
  setStatus(`${label} (${valid.length}): ${sample}${extra}`);
}

function openGuessModal(r, c) {
  if (state.gameOver) {
    inspectCellSolutions(r, c);
    return;
  }
  if (state.isAiThinking || (state.gameMode === "ai" && state.turn === "O")) {
    return;
  }
  if (state.board[r][c] !== null) return;
  state.activeCell = { r, c };
  state.autocompleteMatches = [];
  state.highlightedIndex = -1;

  document.getElementById("modal-matchup").textContent = getCellMatchupLabel(r, c);
  const input = document.getElementById("player-input");
  input.value = "";
  document.getElementById("autocomplete-list").innerHTML = "";
  document.getElementById("modal-feedback").textContent = "";
  document.getElementById("modal-feedback").className = "modal-feedback";

  document.getElementById("guess-modal").classList.remove("hidden");
  input.focus();
}

function closeGuessModal() {
  document.getElementById("guess-modal").classList.add("hidden");
  state.activeCell = null;
  state.autocompleteMatches = [];
  state.highlightedIndex = -1;
}

function renderAutocompleteItems() {
  const input = document.getElementById("player-input");
  const list = document.getElementById("autocomplete-list");
  list.innerHTML = "";

  state.autocompleteMatches.forEach((p, idx) => {
    const li = document.createElement("li");
    li.className = "player-option-item";
    if (idx === state.highlightedIndex) {
      li.classList.add("highlighted");
    }

    const avatarEl = createPlayerAvatarElement(p.name);
    const nameSpan = document.createElement("span");
    nameSpan.className = "player-option-name";
    nameSpan.textContent = p.name;

    li.appendChild(avatarEl);
    li.appendChild(nameSpan);

    li.addEventListener("click", () => {
      input.value = p.name;
      state.autocompleteMatches = [];
      state.highlightedIndex = -1;
      list.innerHTML = "";
      submitGuess();
    });
    list.appendChild(li);
  });

  if (state.autocompleteMatches.length > 0) {
    hydrateDropdownAvatars(state.autocompleteMatches.map((p) => p.name));
  }
}

function handleAutocomplete() {
  const input = document.getElementById("player-input");
  const list = document.getElementById("autocomplete-list");
  const query = normalizeText(input.value).replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
  state.autocompleteMatches = [];
  state.highlightedIndex = -1;
  list.innerHTML = "";

  if (query.length < 2) return;

  const prefixMatches = [];
  const substringMatches = [];

  for (const p of playerIndex) {
    if (state.usedPlayers.has(p.normalized)) continue;
    if (p.normalized.startsWith(query)) {
      prefixMatches.push(p);
    } else if (p.normalized.includes(query)) {
      substringMatches.push(p);
    }
  }

  state.autocompleteMatches = [...prefixMatches, ...substringMatches].slice(0, 8);

  if (state.autocompleteMatches.length === 1) {
    state.highlightedIndex = 0;
  }

  renderAutocompleteItems();
}

function submitGuess() {
  if (!state.activeCell) return;
  if (state.isAiThinking || (state.gameMode === "ai" && state.turn === "O")) return;

  const { r, c } = state.activeCell;
  const input = document.getElementById("player-input");
  const feedback = document.getElementById("modal-feedback");

  if (state.highlightedIndex >= 0 && state.autocompleteMatches[state.highlightedIndex]) {
    input.value = state.autocompleteMatches[state.highlightedIndex].name;
    state.autocompleteMatches = [];
    state.highlightedIndex = -1;
    document.getElementById("autocomplete-list").innerHTML = "";
  }

  const normalizedGuess = normalizeText(input.value).replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
  if (!normalizedGuess) return;

  const matchedPlayer = playerIndex.find((p) => p.normalized === normalizedGuess);

  if (!matchedPlayer) {
    feedback.textContent = "Player not found in database. Pick a name from suggestions.";
    feedback.className = "modal-feedback error";
    return;
  }

  if (state.usedPlayers.has(matchedPlayer.normalized) || state.usedPlayers.has(matchedPlayer.name)) {
    feedback.textContent = `${matchedPlayer.name} already used in this round.`;
    feedback.className = "modal-feedback error";
    return;
  }

  const rowClub = state.rowClubs[r];
  const rowClubKey = normalizeClubKey(rowClub);
  let isMatch = false;
  let successStatus = "";
  let failFeedback = "";

  if (state.gridMode === "nation_vs_league") {
    const colNatCode = state.colNations[c];
    const colNatName = getNationName(colNatCode);
    isMatch = matchedPlayer.clubKeys.has(rowClubKey) && matchedPlayer.nationCodes.has(colNatCode);
    successStatus = `Valid! ${matchedPlayer.name} (${colNatName}) played for ${rowClub}.`;
    const listedNats = Array.from(matchedPlayer.nationCodes).join(", ") || "None";
    const listedClubs = Array.from(matchedPlayer.rawClubs).slice(0, 4).join(", ");
    failFeedback = `${matchedPlayer.name} does not match ${rowClub} × ${colNatName} (Nationality: ${listedNats}; Clubs: ${listedClubs}). Turn lost!`;
  } else {
    const colClub = state.colClubs[c];
    const colClubKey = normalizeClubKey(colClub);
    isMatch = matchedPlayer.clubKeys.has(rowClubKey) && matchedPlayer.clubKeys.has(colClubKey);
    successStatus = `Valid! ${matchedPlayer.name} played for both clubs.`;
    const knownClubs = Array.from(matchedPlayer.rawClubs).slice(0, 6).join(", ");
    failFeedback = knownClubs
      ? `${matchedPlayer.name} did not play for both clubs (Listed: ${knownClubs}). Turn lost!`
      : `${matchedPlayer.name} did not play for both clubs. Turn lost!`;
  }

  if (isMatch) {
    state.board[r][c] = { mark: state.turn, player: matchedPlayer.name };
    state.usedPlayers.add(matchedPlayer.normalized);
    state.usedPlayers.add(matchedPlayer.name);

    const cellEl = document.getElementById(`cell-${r}-${c}`);
    cellEl.classList.add("claimed", state.turn === "X" ? "claimed-x" : "claimed-o");
    cellEl.innerHTML = `
      <span class="cell-mark">${state.turn}</span>
      <span class="cell-player">${matchedPlayer.name}</span>
    `;

    closeGuessModal();

    const winLine = checkWinner(state.turn);
    if (winLine) {
      handleWin(state.turn, winLine);
    } else if (isBoardFull()) {
      state.gameOver = true;
      document.getElementById("turn-indicator").textContent = "Draw";
      const btnNewGrid = document.getElementById("btn-new-grid");
      if (btnNewGrid) {
        btnNewGrid.classList.remove("hidden");
        btnNewGrid.style.display = "";
      }
      setStatus("Board full. Match drawn! Click any cell to inspect valid players.");
    } else {
      switchTurn(successStatus);
    }
  } else {
    feedback.textContent = failFeedback;
    feedback.className = "modal-feedback error";
    setTimeout(() => {
      closeGuessModal();
      switchTurn(`Invalid guess (${matchedPlayer.name}). Turn passed.`);
    }, 1150);
  }
}

function pickWrongPlayerForAi(r, c) {
  const rowClubKey = normalizeClubKey(state.rowClubs[r]);
  const partialMatches = [];

  if (state.gridMode === "nation_vs_league") {
    const colNatCode = state.colNations[c];
    for (const p of playerIndex) {
      if (state.usedPlayers.has(p.normalized) || state.usedPlayers.has(p.name)) continue;
      const inClub = p.clubKeys.has(rowClubKey);
      const inNat = p.nationCodes.has(colNatCode);
      if (inClub !== inNat) {
        partialMatches.push(p);
      }
    }
    if (partialMatches.length > 0) {
      return partialMatches[Math.floor(Math.random() * partialMatches.length)];
    }
    for (let i = 0; i < 40; i++) {
      const candidate = playerIndex[Math.floor(Math.random() * playerIndex.length)];
      if (!candidate.clubKeys.has(rowClubKey) || !candidate.nationCodes.has(colNatCode)) {
        return candidate;
      }
    }
    return playerIndex[0];
  }

  const colClubKey = normalizeClubKey(state.colClubs[c]);
  for (const p of playerIndex) {
    if (state.usedPlayers.has(p.normalized) || state.usedPlayers.has(p.name)) continue;
    const inRow = p.clubKeys.has(rowClubKey);
    const inCol = p.clubKeys.has(colClubKey);
    if (inRow !== inCol) {
      partialMatches.push(p);
    }
  }
  if (partialMatches.length > 0) {
    return partialMatches[Math.floor(Math.random() * partialMatches.length)];
  }
  for (let i = 0; i < 40; i++) {
    const candidate = playerIndex[Math.floor(Math.random() * playerIndex.length)];
    if (!candidate.clubKeys.has(rowClubKey) || !candidate.clubKeys.has(colClubKey)) {
      return candidate;
    }
  }
  return playerIndex[0];
}

function scheduleAiTurn(prefixMsg) {
  clearPendingAiTurn();
  state.isAiThinking = true;

  const btnSkip = document.getElementById("btn-skip");
  if (btnSkip) {
    btnSkip.disabled = true;
  }

  setStatus(`${prefixMsg} ${AI_PLAYER_NAME} (O) is selecting a block...`);

  const thinkDelay = 950 + Math.floor(Math.random() * 650);
  state.aiTimer = setTimeout(() => {
    state.aiTimer = null;
    state.isAiThinking = false;
    if (btnSkip) {
      btnSkip.disabled = false;
    }
    executeAiTurn();
  }, thinkDelay);
}

function executeAiTurn() {
  if (state.gameOver || state.gameMode !== "ai" || state.turn !== "O") return;

  const emptyCells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (state.board[r][c] === null) {
        emptyCells.push({ r, c });
      }
    }
  }
  if (emptyCells.length === 0) return;

  const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const { r, c } = chosen;
  const matchupLabel = getCellMatchupLabel(r, c);

  const validCandidates = getCellValidPlayers(r, c).filter(
    (p) => !state.usedPlayers.has(p.normalized) && !state.usedPlayers.has(p.name)
  );

  const isHit = Math.random() < AI_ACCURACY_RATE && validCandidates.length > 0;

  if (isHit) {
    const picked = validCandidates[Math.floor(Math.random() * validCandidates.length)];
    state.board[r][c] = { mark: "O", player: picked.name };
    state.usedPlayers.add(picked.normalized);
    state.usedPlayers.add(picked.name);

    const cellEl = document.getElementById(`cell-${r}-${c}`);
    if (cellEl) {
      cellEl.classList.add("claimed", "claimed-o");
      cellEl.innerHTML = `
        <span class="cell-mark">O</span>
        <span class="cell-player">${picked.name}</span>
      `;
    }

    const winLine = checkWinner("O");
    if (winLine) {
      handleWin("O", winLine);
    } else if (isBoardFull()) {
      state.gameOver = true;
      document.getElementById("turn-indicator").textContent = "Draw";
      const btnNewGrid = document.getElementById("btn-new-grid");
      if (btnNewGrid) {
        btnNewGrid.classList.remove("hidden");
        btnNewGrid.style.display = "";
      }
      setStatus("Board full. Match drawn! Click any cell to inspect valid players.");
    } else {
      switchTurn(`${AI_PLAYER_NAME} matched ${picked.name} (${matchupLabel}).`);
    }
  } else {
    const wrongPlayer = pickWrongPlayerForAi(r, c);
    const cellEl = document.getElementById(`cell-${r}-${c}`);
    if (cellEl) {
      cellEl.classList.add("ai-miss-flash");
      setTimeout(() => {
        cellEl.classList.remove("ai-miss-flash");
      }, 900);
    }
    switchTurn(`${AI_PLAYER_NAME} guessed ${wrongPlayer.name} for ${matchupLabel} — Missed!`);
  }
}

function switchTurn(prefixMsg) {
  state.turn = state.turn === "X" ? "O" : "X";
  updateTurnBanner();

  if (state.gameMode === "ai" && state.turn === "O" && !state.gameOver) {
    scheduleAiTurn(prefixMsg);
    return;
  }

  const nextName = state.turn === "X" ? state.players.X : state.players.O;
  setStatus(`${prefixMsg} ${nextName} (${state.turn}) turn.`);
}

function checkWinner(mark) {
  const b = state.board;
  const lines = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]]
  ];

  for (const line of lines) {
    if (line.every(([r, c]) => b[r][c] && b[r][c].mark === mark)) {
      return line;
    }
  }
  return null;
}

function isBoardFull() {
  return state.board.every((row) => row.every((cell) => cell !== null));
}

function handleWin(mark, winLine) {
  clearPendingAiTurn();
  state.gameOver = true;
  state.scores[mark]++;
  document.getElementById(`score-${mark.toLowerCase()}`).textContent = state.scores[mark];

  winLine.forEach(([r, c]) => {
    document.getElementById(`cell-${r}-${c}`).classList.add("winner-cell");
  });

  const btnNewGrid = document.getElementById("btn-new-grid");
  if (btnNewGrid) {
    btnNewGrid.classList.remove("hidden");
    btnNewGrid.style.display = "";
  }

  const winnerName = mark === "X" ? state.players.X : state.players.O;
  const banner = document.getElementById("turn-indicator");
  banner.textContent = `${winnerName} (${mark}) Wins!`;
  banner.className = "turn-banner";
  setStatus(`${winnerName} won the round! Click any cell to inspect valid players.`);
}

document.addEventListener("DOMContentLoaded", () => {
  injectMapLayoutFixes();
  enhancePlayerLobbyUI();
  setupEndMatchControls();
  bindDifficultyControls();
  loadWorldGeoJson();
  renderCountrySidebar();
  syncCanvasResolution();
  drawWorldMap();
  requestAnimationFrame(animateMapLoop);

  const canvasPanel = document.querySelector(".map-canvas-panel");
  if (canvasPanel && typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      syncCanvasResolution();
      const activeStage = document.querySelector(".stage.active");
      if (activeStage && activeStage.id === "stage-map") {
        drawWorldMap();
      }
    });
    observer.observe(canvasPanel);
  }

  window.addEventListener("resize", () => {
    syncCanvasResolution();
    const activeStage = document.querySelector(".stage.active");
    if (activeStage && activeStage.id === "stage-map") {
      drawWorldMap();
    }
  });

  document.getElementById("btn-start-map").addEventListener("click", () => {
    if (!validatePlayerLineup()) return;

    const px = document.getElementById("input-player-x").value.trim();
    const po = state.gameMode === "ai"
      ? AI_PLAYER_NAME
      : document.getElementById("input-player-o").value.trim();
    state.players.X = px;
    state.players.O = po;
    document.getElementById("label-player-x").textContent = px;
    document.getElementById("label-player-o").textContent = po;
    showStage("map");
    updateCountrySelectionUI();
  });

  document.querySelectorAll("#grid-mode-selector .grid-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setGridMode(btn.dataset.gridMode);
    });
  });

  document.getElementById("btn-autofill-axes").addEventListener("click", autoFillRemainingAxes);

  document.getElementById("btn-back-names").addEventListener("click", () => {
    showStage("players");
  });

  document.getElementById("btn-back-map").addEventListener("click", () => {
    const activeStage = document.querySelector(".stage.active");
    if (activeStage && activeStage.id === "stage-game") return;
    showStage("map");
    updateCountrySelectionUI();
  });

  document.getElementById("btn-clear-countries").addEventListener("click", () => {
    state.horizontalCountry = null;
    state.horizontalNations = [];
    state.verticalCountry = null;
    state.mapView.needsRender = true;
    updateCountrySelectionUI();
  });

  document.getElementById("btn-enter-game").addEventListener("click", () => {
    if (state.gridMode === "nation_vs_league") {
      if (state.horizontalNations.length !== 3 || !state.verticalCountry) return;
    } else {
      if (!state.horizontalCountry || !state.verticalCountry) return;
    }
    startNewRound();
    showStage("game");
  });

  document.getElementById("btn-new-grid").addEventListener("click", startNewRound);

  const canvas = document.getElementById("world-canvas");
  const tooltip = document.getElementById("map-tooltip");
  const mv = state.mapView;

  document.getElementById("btn-zoom-in").addEventListener("click", () => {
    const { w, h } = getLogicalCanvasSize(canvas);
    setMapZoomAt(mv.targetZoom * 1.4, w * 0.5, h * 0.5, true);
  });

  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    const { w, h } = getLogicalCanvasSize(canvas);
    setMapZoomAt(mv.targetZoom / 1.4, w * 0.5, h * 0.5, true);
  });

  document.getElementById("btn-zoom-reset").addEventListener("click", () => {
    const preset = REGION_PRESETS.world;
    focusOnCoords(preset.lat, preset.lng, preset.zoom);
    updateRegionButtons("world");
  });

  document.querySelectorAll(".region-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const regionKey = btn.dataset.region;
      const preset = REGION_PRESETS[regionKey];
      if (!preset) return;
      focusOnCoords(preset.lat, preset.lng, preset.zoom);
      updateRegionButtons(regionKey);
    });
  });

  document.getElementById("country-search-input").addEventListener("input", renderCountrySidebar);

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const pivotX = e.clientX - rect.left;
    const pivotY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    setMapZoomAt(mv.targetZoom * factor, pivotX, pivotY, true);
  }, { passive: false });

  canvas.addEventListener("dblclick", (e) => {
    const rect = canvas.getBoundingClientRect();
    const pivotX = e.clientX - rect.left;
    const pivotY = e.clientY - rect.top;
    setMapZoomAt(mv.targetZoom * 1.65, pivotX, pivotY, true);
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    mv.isDragging = true;
    mv.hasMoved = false;
    mv.dragStartX = e.clientX;
    mv.dragStartY = e.clientY;
    mv.startOffsetX = mv.targetOffsetX;
    mv.startOffsetY = mv.targetOffsetY;
    canvas.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!mv.isDragging) return;
    const dxScreen = e.clientX - mv.dragStartX;
    const dyScreen = e.clientY - mv.dragStartY;
    if (Math.hypot(dxScreen, dyScreen) > 4) {
      mv.hasMoved = true;
    }

    const { w, h } = getLogicalCanvasSize(canvas);
    const rawOx = mv.startOffsetX + dxScreen;
    const rawOy = mv.startOffsetY + dyScreen;
    const clamped = clampMapOffsets(rawOx, rawOy, mv.targetZoom, w, h);

    mv.targetOffsetX = clamped.x;
    mv.targetOffsetY = clamped.y;
    mv.offsetX = clamped.x;
    mv.offsetY = clamped.y;
    mv.needsRender = true;
    updateRegionButtons("");
  });

  window.addEventListener("mouseup", () => {
    if (!mv.isDragging) return;
    mv.isDragging = false;
    canvas.classList.remove("dragging");
  });

  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      mv.isDragging = true;
      mv.hasMoved = false;
      mv.dragStartX = t.clientX;
      mv.dragStartY = t.clientY;
      mv.startOffsetX = mv.targetOffsetX;
      mv.startOffsetY = mv.targetOffsetY;
    } else if (e.touches.length === 2) {
      mv.isDragging = false;
      const [t1, t2] = e.touches;
      mv.pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      mv.pinchStartZoom = mv.targetZoom;
    }
  }, { passive: true });

  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && mv.isDragging) {
      const t = e.touches[0];
      const dxScreen = t.clientX - mv.dragStartX;
      const dyScreen = t.clientY - mv.dragStartY;
      if (Math.hypot(dxScreen, dyScreen) > 4) {
        mv.hasMoved = true;
      }
      const { w, h } = getLogicalCanvasSize(canvas);
      const clamped = clampMapOffsets(mv.startOffsetX + dxScreen, mv.startOffsetY + dyScreen, mv.targetZoom, w, h);
      mv.targetOffsetX = clamped.x;
      mv.targetOffsetY = clamped.y;
      mv.offsetX = clamped.x;
      mv.offsetY = clamped.y;
      mv.needsRender = true;
    } else if (e.touches.length === 2 && mv.pinchStartDist > 0) {
      e.preventDefault();
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const rect = canvas.getBoundingClientRect();
      const midX = (t1.clientX + t2.clientX) * 0.5 - rect.left;
      const midY = (t1.clientY + t2.clientY) * 0.5 - rect.top;
      setMapZoomAt(mv.pinchStartZoom * (dist / mv.pinchStartDist), midX, midY, false);
    }
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    mv.isDragging = false;
    mv.pinchStartDist = 0;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (mv.isDragging) {
      tooltip.classList.add("hidden");
      return;
    }

    const code = getHoveredCountryCode(e.clientX, e.clientY);
    if (state.hoveredCountry !== code) {
      state.hoveredCountry = code;
      mv.needsRender = true;
    }
    canvas.classList.toggle("hovering-pin", Boolean(code));

    const ttWidth = 230;
    const posX = e.clientX + ttWidth > window.innerWidth ? e.clientX - ttWidth : e.clientX + 14;
    const posY = e.clientY + 72 > window.innerHeight ? e.clientY - 60 : e.clientY + 14;

    if (code) {
      const isNationStep = isNationSelectionPhase();
      const nationInfo = NATIONS_DB[code];
      const leagueInfo = FOOTBALL_DB.countries[code];

      if (state.gridMode === "nation_vs_league") {
        const displayName = (nationInfo && nationInfo.name) || (leagueInfo && leagueInfo.name) || code;
        let roleLabel = isNationStep ? "Click to add Nationality" : "Click to assign League";
        if (isCodeSelectedHorizontal(code)) roleLabel = "Assigned: Nationality Column";
        if (code === state.verticalCountry) roleLabel = "Assigned: League Row";

        const subLine = isNationStep
          ? `Nationality (${code})`
          : leagueInfo
            ? leagueInfo.league
            : `Nationality (${code})`;
        const countLine = isNationStep
          ? `${nationInfo ? nationInfo.playerCount : 0} players`
          : leagueInfo
            ? `${leagueInfo.clubs.length} clubs`
            : "";

        tooltip.innerHTML = `
          <div class="tt-title">${displayName}</div>
          <div class="tt-league">${subLine}</div>
          <div class="tt-clubs">${countLine}${countLine ? " &bull; " : ""}${roleLabel}</div>
        `;
      } else if (leagueInfo) {
        let roleLabel = "Click to assign axis";
        if (code === state.horizontalCountry) roleLabel = "Assigned: Horizontal Axis";
        if (code === state.verticalCountry) roleLabel = "Assigned: Vertical Axis";

        tooltip.innerHTML = `
          <div class="tt-title">${leagueInfo.name}</div>
          <div class="tt-league">${leagueInfo.league}</div>
          <div class="tt-clubs">${leagueInfo.clubs.length} clubs &bull; ${roleLabel}</div>
        `;
      }

      tooltip.style.left = `${posX}px`;
      tooltip.style.top = `${posY}px`;
      tooltip.classList.remove("hidden");
    } else {
      const rect = canvas.getBoundingClientRect();
      const { w, h } = getLogicalCanvasSize(canvas);
      const coords = screenToLatLng(e.clientX - rect.left, e.clientY - rect.top, w, h);
      tooltip.innerHTML = `
        <div class="tt-clubs">${formatGeographicCoords(coords.lat, coords.lng)}</div>
      `;
      tooltip.style.left = `${posX}px`;
      tooltip.style.top = `${posY}px`;
      tooltip.classList.remove("hidden");
    }
  });

  canvas.addEventListener("mouseleave", () => {
    state.hoveredCountry = null;
    mv.needsRender = true;
    canvas.classList.remove("hovering-pin");
    tooltip.classList.add("hidden");
  });

  canvas.addEventListener("click", (e) => {
    if (mv.hasMoved) return;
    const code = getHoveredCountryCode(e.clientX, e.clientY);
    if (code) {
      toggleCountrySelection(code);
    }
  });

  document.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);
      openGuessModal(r, c);
    });
  });

  document.getElementById("btn-skip").addEventListener("click", () => {
    if (state.gameOver || state.isAiThinking) return;
    if (state.gameMode === "ai" && state.turn === "O") return;
    switchTurn("Turn passed.");
  });

  document.getElementById("btn-close-modal").addEventListener("click", closeGuessModal);
  document.getElementById("player-input").addEventListener("input", handleAutocomplete);
  document.getElementById("player-input").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && state.autocompleteMatches.length > 0) {
      e.preventDefault();
      state.highlightedIndex = (state.highlightedIndex + 1) % state.autocompleteMatches.length;
      renderAutocompleteItems();
    } else if (e.key === "ArrowUp" && state.autocompleteMatches.length > 0) {
      e.preventDefault();
      state.highlightedIndex =
        (state.highlightedIndex - 1 + state.autocompleteMatches.length) % state.autocompleteMatches.length;
      renderAutocompleteItems();
    } else if (e.key === "Enter") {
      e.preventDefault();
      submitGuess();
    } else if (e.key === "Escape") {
      closeGuessModal();
    }
  });
  document.getElementById("btn-submit-guess").addEventListener("click", submitGuess);
});