const state = {
  players: {
    X: "Player 1",
    O: "Player 2"
  },
  difficulty: "medium",
  horizontalCountry: null,
  verticalCountry: null,
  colClubs: [],
  rowClubs: [],
  board: Array(3).fill(null).map(() => Array(3).fill(null)),
  usedPlayers: new Set(),
  turn: "X",
  scores: { X: 0, O: 0 },
  gameOver: false,
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

const REGION_PRESETS = {
  world: { lat: 18, lng: 12, zoom: 1.0 },
  europe: { lat: 48.5, lng: 12.5, zoom: 3.5 },
  americas: { lat: -5.0, lng: -68.0, zoom: 1.85 },
  asia: { lat: 12.0, lng: 112.0, zoom: 2.15 }
};

const DIFFICULTY_META = {
  easy: { label: "Easy", desc: "Top Clubs & Many Shared Players" },
  medium: { label: "Medium", desc: "Balanced Mix" },
  hard: { label: "Hard", desc: "Lesser-Known Clubs" }
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
  { name: "Salih Özcan", clubs: ["1. FC Koln", "Holstein Kiel", "Borussia Dortmund", "VfL Wolfsburg", "Besiktas"] },
  { name: "Aral Şimşir", clubs: ["FC Midtjylland", "Jerv", "Lillestrom"] },
  { name: "Orkun Kökçü", clubs: ["Feyenoord", "Benfica", "Besiktas"] },
  { name: "Tammy Abraham", clubs: ["Chelsea", "Bristol City", "Swansea City", "Aston Villa", "Roma", "AC Milan", "Besiktas"] },
  { name: "Wilfred Ndidi", clubs: ["Genk", "Leicester City", "Besiktas"] },
  { name: "İlkay Gündoğan", clubs: ["VfL Bochum", "1. FC Nurnberg", "Borussia Dortmund", "Manchester City", "Barcelona", "Galatasaray"] },
  { name: "Leroy Sané", clubs: ["Schalke 04", "Manchester City", "Bayern Munich", "Galatasaray"] },
  { name: "Uğurcan Çakır", clubs: ["Trabzonspor", "Galatasaray"] },
  { name: "Kerem Aktürkoğlu", clubs: ["Galatasaray", "Benfica", "Fenerbahce"] },
  { name: "Jhon Durán", clubs: ["Envigado", "Chicago Fire", "Aston Villa", "Al-Nassr", "Fenerbahce"] },
  { name: "Nélson Semedo", clubs: ["Benfica", "Barcelona", "Wolverhampton Wanderers", "Fenerbahce"] },
  { name: "Marco Asensio", clubs: ["Mallorca", "Real Madrid", "Espanyol", "Paris Saint-Germain", "Aston Villa", "Fenerbahce"] },
  { name: "Ederson", clubs: ["Rio Ave", "Benfica", "Manchester City", "Fenerbahce"] },
  { name: "Nuri Şahin", clubs: ["Borussia Dortmund", "Feyenoord", "Real Madrid", "Liverpool", "Werder Bremen", "Antalyaspor"] },
  { name: "Shinji Kagawa", clubs: ["Cerezo Osaka", "Borussia Dortmund", "Manchester United", "Besiktas", "Real Zaragoza", "PAOK", "Sint-Truiden"] },
  { name: "Emre Can", clubs: ["Bayern Munich", "Bayer Leverkusen", "Liverpool", "Juventus", "Borussia Dortmund"] },
  { name: "Andreas Beck", clubs: ["VfB Stuttgart", "Hoffenheim", "Besiktas", "Eupen"] },
  { name: "Fabian Ernst", clubs: ["Hannover 96", "Hamburger SV", "Werder Bremen", "Schalke 04", "Besiktas", "Kasimpasa"] },
  { name: "Roberto Hilbert", clubs: ["Greuther Furth", "VfB Stuttgart", "Besiktas", "Bayer Leverkusen"] },
  { name: "Loris Karius", clubs: ["Mainz 05", "Liverpool", "Besiktas", "Union Berlin", "Newcastle United", "Schalke 04"] },
  { name: "Can Uzun", clubs: ["1. FC Nurnberg", "Eintracht Frankfurt"] },
  { name: "Kenan Yıldız", clubs: ["Juventus"] },
  { name: "Deniz Undav", clubs: ["Union Saint-Gilloise", "Brighton & Hove Albion", "VfB Stuttgart"] },
  { name: "Atakan Karazor", clubs: ["Holstein Kiel", "VfB Stuttgart"] },
  { name: "Eren Dinkçi", clubs: ["Werder Bremen", "1. FC Heidenheim", "SC Freiburg"] },
  { name: "Ozan Kabak", clubs: ["Galatasaray", "VfB Stuttgart", "Schalke 04", "Liverpool", "Norwich City", "Hoffenheim"] },
  { name: "Kaan Ayhan", clubs: ["Schalke 04", "Eintracht Frankfurt", "Fortuna Dusseldorf", "Sassuolo", "Galatasaray"] },
  { name: "Kerem Demirbay", clubs: ["Hamburger SV", "1. FC Kaiserslautern", "Fortuna Dusseldorf", "Hoffenheim", "Bayer Leverkusen", "Galatasaray"] },
  { name: "Mert Müldür", clubs: ["Rapid Wien", "Sassuolo", "Fenerbahce"] },
  { name: "Zeki Çelik", clubs: ["Istanbulspor", "Lille", "Roma"] },
  { name: "Merih Demiral", clubs: ["Sporting CP", "Alanyaspor", "Sassuolo", "Juventus", "Atalanta", "Al-Ahli"] },
  { name: "Enes Ünal", clubs: ["Bursaspor", "Manchester City", "Genk", "NAC Breda", "Twente", "Villarreal", "Levante", "Real Valladolid", "Getafe", "Bournemouth"] },
  { name: "Yusuf Yazıcı", clubs: ["Trabzonspor", "Lille", "CSKA Moscow", "Olympiacos"] },
  { name: "Okay Yokuşlu", clubs: ["Altay", "Kayserispor", "Trabzonspor", "Celta Vigo", "West Bromwich Albion", "Getafe"] },
  { name: "Salih Uçan", clubs: ["Bucaspor", "Fenerbahce", "Roma", "Sion", "Empoli", "Alanyaspor", "Besiktas"] },
  { name: "Semih Kılıçsoy", clubs: ["Besiktas"] },
  { name: "Barış Alper Yılmaz", clubs: ["Galatasaray"] },
  { name: "Yunus Akgün", clubs: ["Galatasaray", "Adana Demirspor", "Leicester City"] },
  { name: "Abdülkerim Bardakcı", clubs: ["Konyaspor", "Galatasaray"] },
  { name: "İsmail Yüksek", clubs: ["Fenerbahce"] },
  { name: "Mert Günok", clubs: ["Fenerbahce", "Bursaspor", "Istanbul Basaksehir", "Besiktas"] },
  { name: "Cenk Tosun", clubs: ["Eintracht Frankfurt", "Gaziantepspor", "Besiktas", "Everton", "Crystal Palace", "Fenerbahce"] },
  { name: "Rıdvan Yılmaz", clubs: ["Besiktas", "Rangers"] },
  { name: "Emirhan İlkhan", clubs: ["Besiktas", "Torino", "Sampdoria", "Istanbul Basaksehir"] },
  { name: "Altay Bayındır", clubs: ["Ankaragucu", "Fenerbahce", "Manchester United"] },
  { name: "Robin van Persie", clubs: ["Feyenoord", "Arsenal", "Manchester United", "Fenerbahce"] },
  { name: "Mesut Özil", clubs: ["Schalke 04", "Werder Bremen", "Real Madrid", "Arsenal", "Fenerbahce", "Istanbul Basaksehir"] },
  { name: "Nicolas Anelka", clubs: ["Paris Saint-Germain", "Arsenal", "Real Madrid", "Liverpool", "Manchester City", "Fenerbahce", "Bolton Wanderers", "Chelsea", "Juventus", "West Bromwich Albion"] },
  { name: "Didier Drogba", clubs: ["Marseille", "Chelsea", "Galatasaray"] },
  { name: "Wesley Sneijder", clubs: ["Ajax", "Real Madrid", "Inter", "Galatasaray", "Nice"] },
  { name: "Lukas Podolski", clubs: ["1. FC Koln", "Bayern Munich", "Arsenal", "Inter", "Galatasaray", "Antalyaspor"] },
  { name: "Lucas Torreira", clubs: ["Sampdoria", "Arsenal", "Atletico Madrid", "Fiorentina", "Galatasaray"] },
  { name: "Mohamed Elneny", clubs: ["Basel", "Arsenal", "Besiktas"] },
  { name: "Alex Oxlade-Chamberlain", clubs: ["Southampton", "Arsenal", "Liverpool", "Besiktas"] },
  { name: "Michy Batshuayi", clubs: ["Standard Liege", "Marseille", "Chelsea", "Borussia Dortmund", "Valencia", "Crystal Palace", "Besiktas", "Fenerbahce", "Galatasaray", "Eintracht Frankfurt"] },
  { name: "Fred", clubs: ["Internacional", "Shakhtar Donetsk", "Manchester United", "Fenerbahce"] },
  { name: "Edin Džeko", clubs: ["VfL Wolfsburg", "Manchester City", "Roma", "Inter", "Fenerbahce"] },
  { name: "Dušan Tadić", clubs: ["Groningen", "Twente", "Southampton", "Ajax", "Fenerbahce"] },
  { name: "Mauro Icardi", clubs: ["Sampdoria", "Inter", "Paris Saint-Germain", "Galatasaray"] },
  { name: "Dries Mertens", clubs: ["Utrecht", "PSV", "Napoli", "Galatasaray"] },
  { name: "Hakim Ziyech", clubs: ["Heerenveen", "Twente", "Ajax", "Chelsea", "Galatasaray"] },
  { name: "Wilfried Zaha", clubs: ["Crystal Palace", "Manchester United", "Cardiff City", "Galatasaray", "Lyon"] },
  { name: "Davinson Sánchez", clubs: ["Atletico Nacional", "Ajax", "Tottenham Hotspur", "Galatasaray"] },
  { name: "Tanguy Ndombele", clubs: ["Amiens", "Lyon", "Tottenham Hotspur", "Napoli", "Galatasaray", "Nice"] },
  { name: "Serge Aurier", clubs: ["Lens", "Toulouse", "Paris Saint-Germain", "Tottenham Hotspur", "Villarreal", "Nottingham Forest", "Galatasaray"] },
  { name: "Cédric Bakambu", clubs: ["Sochaux", "Bursaspor", "Villarreal", "Marseille", "Olympiacos", "Galatasaray", "Real Betis"] },
  { name: "Juan Mata", clubs: ["Valencia", "Chelsea", "Manchester United", "Galatasaray"] },
  { name: "Victor Osimhen", clubs: ["VfL Wolfsburg", "Charleroi", "Lille", "Napoli", "Galatasaray"] },
  { name: "Álvaro Morata", clubs: ["Real Madrid", "Juventus", "Chelsea", "Atletico Madrid", "AC Milan", "Galatasaray"] },
  { name: "Milan Škriniar", clubs: ["Sampdoria", "Inter", "Paris Saint-Germain", "Fenerbahce"] },
  { name: "Allan Saint-Maximin", clubs: ["Saint-Etienne", "Monaco", "Nice", "Newcastle United", "Al-Ahli", "Fenerbahce"] },
  { name: "Sofyan Amrabat", clubs: ["Utrecht", "Feyenoord", "Club Brugge", "Hellas Verona", "Fiorentina", "Manchester United", "Fenerbahce"] },
  { name: "Çağlar Söyüncü", clubs: ["SC Freiburg", "Leicester City", "Atletico Madrid", "Fenerbahce"] },
  { name: "Cengiz Ünder", clubs: ["Istanbul Basaksehir", "Roma", "Leicester City", "Marseille", "Fenerbahce"] },
  { name: "İrfan Can Kahveci", clubs: ["Genclerbirligi", "Istanbul Basaksehir", "Fenerbahce"] },
  { name: "Ferdi Kadıoğlu", clubs: ["NEC Nijmegen", "Fenerbahce", "Brighton & Hove Albion"] },
  { name: "Arda Güler", clubs: ["Fenerbahce", "Real Madrid"] },
  { name: "Kim Min-jae", clubs: ["Fenerbahce", "Napoli", "Bayern Munich"] },
  { name: "Sacha Boey", clubs: ["Rennes", "Galatasaray", "Bayern Munich"] },
  { name: "Dirk Kuyt", clubs: ["Utrecht", "Feyenoord", "Liverpool", "Fenerbahce"] },
  { name: "Roberto Carlos", clubs: ["Palmeiras", "Inter", "Real Madrid", "Fenerbahce", "Corinthians"] },
  { name: "Raul Meireles", clubs: ["Boavista", "Porto", "Liverpool", "Chelsea", "Fenerbahce"] },
  { name: "Nani", clubs: ["Sporting CP", "Manchester United", "Fenerbahce", "Valencia", "Lazio"] },
  { name: "Simon Kjær", clubs: ["Palermo", "VfL Wolfsburg", "Roma", "Lille", "Fenerbahce", "Sevilla", "Atalanta", "AC Milan"] },
  { name: "Moussa Sow", clubs: ["Rennes", "Lille", "Fenerbahce"] },
  { name: "Ricardo Quaresma", clubs: ["Sporting CP", "Barcelona", "Porto", "Inter", "Chelsea", "Besiktas"] },
  { name: "Pepe", clubs: ["Maritimo", "Porto", "Real Madrid", "Besiktas"] },
  { name: "Guti", clubs: ["Real Madrid", "Besiktas"] },
  { name: "Anderson Talisca", clubs: ["Bahia", "Benfica", "Besiktas", "Al-Nassr", "Fenerbahce"] },
  { name: "Vincent Aboubakar", clubs: ["Valenciennes", "Lorient", "Porto", "Besiktas", "Al-Nassr"] },
  { name: "Gedson Fernandes", clubs: ["Benfica", "Tottenham Hotspur", "Galatasaray", "Rizespor", "Besiktas"] },
  { name: "Dele Alli", clubs: ["Milton Keynes Dons", "Tottenham Hotspur", "Everton", "Besiktas"] },
  { name: "Eric Bailly", clubs: ["Espanyol", "Villarreal", "Manchester United", "Marseille", "Besiktas"] },
  { name: "Rachid Ghezzal", clubs: ["Lyon", "Monaco", "Leicester City", "Fiorentina", "Besiktas", "Rizespor"] },
  { name: "Ciro Immobile", clubs: ["Juventus", "Torino", "Borussia Dortmund", "Sevilla", "Lazio", "Besiktas"] },
  { name: "Rafa Silva", clubs: ["Braga", "Benfica", "Besiktas"] },
  { name: "Mario Gómez", clubs: ["VfB Stuttgart", "Bayern Munich", "Fiorentina", "Besiktas", "VfL Wolfsburg"] },
  { name: "Demba Ba", clubs: ["Hoffenheim", "West Ham United", "Newcastle United", "Chelsea", "Besiktas", "Istanbul Basaksehir"] },
  { name: "Atiba Hutchinson", clubs: ["FC Copenhagen", "PSV", "Besiktas"] },
  { name: "Ryan Babel", clubs: ["Ajax", "Liverpool", "Hoffenheim", "Kasimpasa", "Besiktas", "Fulham", "Galatasaray"] },
  { name: "Fernando Muslera", clubs: ["Lazio", "Galatasaray"] },
  { name: "Felipe Melo", clubs: ["Flamengo", "Cruzeiro", "Gremio", "Mallorca", "Racing Santander", "Almeria", "Fiorentina", "Juventus", "Galatasaray", "Inter", "Palmeiras"] },
  { name: "Radamel Falcao", clubs: ["River Plate", "Porto", "Atletico Madrid", "Monaco", "Manchester United", "Chelsea", "Galatasaray", "Rayo Vallecano"] },
  { name: "Bafétimbi Gomis", clubs: ["Saint-Etienne", "Lyon", "Swansea City", "Marseille", "Galatasaray", "Al-Hilal"] },
  { name: "Steven Nzonzi", clubs: ["Blackburn Rovers", "Stoke City", "Sevilla", "Roma", "Galatasaray", "Rennes", "Konyaspor"] },
  { name: "Mariano", clubs: ["Fluminense", "Bordeaux", "Sevilla", "Galatasaray", "Atletico Mineiro"] },
  { name: "Fernando Reges", clubs: ["Porto", "Manchester City", "Galatasaray", "Sevilla"] },
  { name: "Badou Ndiaye", clubs: ["Osmanlispor", "Galatasaray", "Stoke City", "Trabzonspor", "Adana Demirspor"] },
  { name: "Henry Onyekuru", clubs: ["Eupen", "Anderlecht", "Everton", "Galatasaray", "Monaco", "Olympiacos", "Adana Demirspor"] },
  { name: "Mario Lemina", clubs: ["Lorient", "Marseille", "Juventus", "Southampton", "Galatasaray", "Fulham", "Nice", "Wolverhampton Wanderers"] },
  { name: "Gabriel Sara", clubs: ["Sao Paulo", "Norwich City", "Galatasaray"] },
  { name: "Marek Hamšík", clubs: ["Brescia", "Napoli", "Trabzonspor"] },
  { name: "Anthony Nwakaeme", clubs: ["Hapoel Beer Sheva", "Trabzonspor"] },
  { name: "Alexander Sørloth", clubs: ["Rosenborg", "Groningen", "Midtjylland", "Crystal Palace", "Gent", "Trabzonspor", "RB Leipzig", "Real Sociedad", "Villarreal", "Atletico Madrid"] },
  { name: "Andreas Cornelius", clubs: ["FC Copenhagen", "Cardiff City", "Atalanta", "Bordeaux", "Parma", "Trabzonspor"] },
  { name: "José Sosa", clubs: ["Estudiantes", "Bayern Munich", "Napoli", "Metalist Kharkiv", "Atletico Madrid", "Besiktas", "AC Milan", "Trabzonspor", "Fenerbahce"] },
  { name: "Burak Yılmaz", clubs: ["Besiktas", "Fenerbahce", "Trabzonspor", "Galatasaray", "Lille", "Fortuna Sittard"] },
  { name: "Arda Turan", clubs: ["Galatasaray", "Atletico Madrid", "Barcelona", "Istanbul Basaksehir"] },
  { name: "Emre Belözoğlu", clubs: ["Galatasaray", "Inter", "Newcastle United", "Fenerbahce", "Atletico Madrid", "Istanbul Basaksehir"] },
  { name: "Okan Buruk", clubs: ["Galatasaray", "Inter", "Besiktas", "Istanbul Basaksehir"] },
  { name: "Tugay Kerimoğlu", clubs: ["Galatasaray", "Rangers", "Blackburn Rovers"] },
  { name: "Hakan Şükür", clubs: ["Galatasaray", "Torino", "Inter", "Parma", "Blackburn Rovers"] },
  { name: "Nihat Kahveci", clubs: ["Besiktas", "Real Sociedad", "Villarreal"] },
  { name: "Tuncay Şanlı", clubs: ["Fenerbahce", "Middlesbrough", "Stoke City", "VfL Wolfsburg", "Bolton Wanderers", "Bursaspor"] },
  { name: "Mehmet Topal", clubs: ["Galatasaray", "Valencia", "Fenerbahce", "Istanbul Basaksehir", "Besiktas"] },
  { name: "Caner Erkin", clubs: ["CSKA Moscow", "Galatasaray", "Fenerbahce", "Inter", "Besiktas"] },
  { name: "Gökhan Gönül", clubs: ["Fenerbahce", "Besiktas"] },
  { name: "Selçuk İnan", clubs: ["Trabzonspor", "Galatasaray"] },
  { name: "Volkan Demirel", clubs: ["Fenerbahce"] },
  { name: "Alex de Souza", clubs: ["Coritiba", "Palmeiras", "Cruzeiro", "Parma", "Fenerbahce"] }
];

const ISO3_TO_GAME_CODES = {
  TUR: ["TUR"],
  GBR: ["ENG", "SCO"],
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
  POL: ["POL"],
  CZE: ["CZE"],
  ROU: ["ROU"],
  HRV: ["CRO"],
  SRB: ["SRB"],
  CYP: ["CYP"],
  USA: ["USA"],
  BRA: ["BRA"],
  ARG: ["ARG"],
  MEX: ["MEX"],
  COL: ["COL"],
  CHL: ["CHI"],
  PER: ["PER"],
  ECU: ["ECU"],
  URY: ["URU"],
  SAU: ["KSA"],
  ARE: ["UAE"],
  QAT: ["QAT"],
  JPN: ["JPN"],
  KOR: ["KOR"],
  CHN: ["CHN"],
  AUS: ["AUS"],
  ZAF: ["RSA"],
  EGY: ["EGY"],
  MAR: ["MAR"],
  TUN: ["TUN"],
  DZA: ["ALG"]
};

const NAME_TO_GAME_CODES = {
  "turkey": ["TUR"],
  "turkiye": ["TUR"],
  "united kingdom": ["ENG", "SCO"],
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
  "poland": ["POL"],
  "czech republic": ["CZE"],
  "czechia": ["CZE"],
  "romania": ["ROU"],
  "croatia": ["CRO"],
  "serbia": ["SRB"],
  "cyprus": ["CYP"],
  "united states of america": ["USA"],
  "united states": ["USA"],
  "brazil": ["BRA"],
  "argentina": ["ARG"],
  "mexico": ["MEX"],
  "colombia": ["COL"],
  "chile": ["CHI"],
  "peru": ["PER"],
  "ecuador": ["ECU"],
  "uruguay": ["URU"],
  "saudi arabia": ["KSA"],
  "united arab emirates": ["UAE"],
  "qatar": ["QAT"],
  "japan": ["JPN"],
  "south korea": ["KOR"],
  "korea, republic of": ["KOR"],
  "china": ["CHN"],
  "australia": ["AUS"],
  "south africa": ["RSA"],
  "egypt": ["EGY"],
  "morocco": ["MAR"],
  "tunisia": ["TUN"],
  "algeria": ["ALG"]
};

function injectMapLayoutFixes() {
  if (document.getElementById("geogame-layout-fix")) return;
  const style = document.createElement("style");
  style.id = "geogame-layout-fix";
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body { max-width: 100%; overflow-x: hidden; }
    #stage-map { width: 100%; max-width: 100%; overflow-x: hidden; }
    #stage-map > div:first-child,
    .map-header,
    .map-top-bar,
    .selection-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      max-width: 100%;
    }
    .map-pills,
    .selection-pills,
    .map-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      max-width: 100%;
    }
    .pill {
      white-space: nowrap;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #world-canvas {
      display: block;
      width: 100%;
      max-width: 100%;
    }
    #map-tooltip {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      background: rgba(9, 15, 29, 0.94);
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 8px;
      padding: 7px 11px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
      color: #f1f5f9;
      font-size: 12px;
      line-height: 1.35;
    }
    #map-tooltip .tt-clubs {
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
      color: #cbd5e1;
      font-variant-numeric: tabular-nums;
    }
    .difficulty-group {
      display: inline-flex;
      align-items: center;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 8px;
      padding: 3px;
      gap: 3px;
    }
    .difficulty-btn {
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .difficulty-btn:hover {
      color: #f8fafc;
      background: rgba(148, 163, 184, 0.12);
    }
    .difficulty-btn.active[data-diff="easy"] {
      background: rgba(16, 185, 129, 0.22);
      color: #34d399;
      box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.45);
    }
    .difficulty-btn.active[data-diff="medium"] {
      background: rgba(56, 189, 248, 0.22);
      color: #38bdf8;
      box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.45);
    }
    .difficulty-btn.active[data-diff="hard"] {
      background: rgba(245, 158, 11, 0.22);
      color: #fbbf24;
      box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.45);
    }
    .btn-end-match {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid rgba(244, 63, 94, 0.45);
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.22), rgba(159, 18, 57, 0.34));
      color: #fda4af;
      font-size: 12.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 0.18s ease;
      box-shadow: 0 4px 14px rgba(225, 29, 72, 0.16);
    }
    .btn-end-match:hover {
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.36), rgba(159, 18, 57, 0.48));
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
      min-height: calc(100vh - 96px);
      align-items: center;
      justify-content: center;
      padding: 28px 16px;
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
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 22px;
      padding: 36px 34px 32px;
      box-shadow: 0 28px 70px rgba(2, 6, 23, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }
    .premium-lobby-header {
      text-align: center;
      margin-bottom: 30px;
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
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      margin-bottom: 12px;
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
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #f8fafc;
    }
    .premium-lobby-subtitle {
      margin: 0;
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .premium-duel-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
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
        padding: 26px 20px 24px;
      }
    }
    .premium-player-card {
      position: relative;
      border-radius: 16px;
      padding: 20px 18px 18px;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
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
      margin-bottom: 14px;
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
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      padding: 4px 9px;
      border-radius: 6px;
    }
    .side-x .premium-side-tag {
      background: rgba(56, 189, 248, 0.1);
      color: #7dd3fc;
    }
    .side-o .premium-side-tag {
      background: rgba(245, 158, 11, 0.1);
      color: #fcd34d;
    }
    .premium-field-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 7px;
    }
    .premium-player-card input {
      width: 100% !important;
      height: 44px !important;
      padding: 0 14px !important;
      border-radius: 10px !important;
      border: 1px solid rgba(148, 163, 184, 0.24) !important;
      background: rgba(6, 11, 22, 0.85) !important;
      color: #f8fafc !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      outline: none !important;
      transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
    }
    .side-x input:focus {
      border-color: #38bdf8 !important;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18) !important;
    }
    .side-o input:focus {
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
      border: 1px solid rgba(148, 163, 184, 0.26);
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
    }
    .premium-swap-btn {
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(30, 41, 59, 0.7);
      color: #94a3b8;
      border-radius: 8px;
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .premium-swap-btn:hover {
      color: #f8fafc;
      border-color: rgba(56, 189, 248, 0.45);
      background: rgba(56, 189, 248, 0.14);
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
      font-size: 15px !important;
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
      font-size: 12px;
      color: #64748b;
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
      font-size: 13px;
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
    <h2 class="premium-lobby-title">Player Lineup</h2>
    <p class="premium-lobby-subtitle">Enter both player names before selecting leagues on the world map.</p>
  `;

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
  swapBtn.type = "button";
  swapBtn.className = "premium-swap-btn";
  swapBtn.title = "Swap Player Names";
  swapBtn.textContent = "Swap";
  swapBtn.addEventListener("click", () => {
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
      <span class="premium-side-tag">Second Turn · Away</span>
    </div>
    <label class="premium-field-label" for="input-player-o">Player O Name</label>
  `;
  cardO.appendChild(inputO);

  duelGrid.appendChild(cardX);
  duelGrid.appendChild(vsCol);
  duelGrid.appendChild(cardO);

  const footer = document.createElement("div");
  footer.className = "premium-lobby-footer";
  footer.appendChild(btnStartMap);

  const hint = document.createElement("div");
  hint.className = "premium-lobby-hint";
  hint.textContent = "Press Enter to advance";
  footer.appendChild(hint);

  shell.appendChild(header);
  shell.appendChild(duelGrid);
  shell.appendChild(footer);

  stagePlayers.innerHTML = "";
  stagePlayers.appendChild(shell);

  inputX.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputO.focus();
      inputO.select();
    }
  });

  inputO.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnStartMap.click();
    }
  });
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

function hasActiveLeague(code) {
  const info = FOOTBALL_DB.countries[code];
  return Boolean(info && Array.isArray(info.clubs) && info.clubs.length >= 3);
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
      const active = ISO3_TO_GAME_CODES[iso].filter((code) => hasActiveLeague(code));
      if (active.length > 0) return active;
    }
  }
  const nameCandidates = [props.ADMIN, props.NAME, props.NAME_LONG, props.name];
  for (const rawName of nameCandidates) {
    if (!rawName) continue;
    const norm = normalizeText(rawName);
    if (NAME_TO_GAME_CODES[norm]) {
      const active = NAME_TO_GAME_CODES[norm].filter((code) => hasActiveLeague(code));
      if (active.length > 0) return active;
    }
  }
  return [];
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
  const centroid = getPolygonRingCentroid(polyRings[0]);
  return gameCodes.some((code) => {
    const info = FOOTBALL_DB.countries[code];
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
            gameCodes: resolveFeatureGameCodes(f)
          }));
        state.mapView.needsRender = true;
        drawWorldMap();
        return;
      }
    } catch (err) {
    }
  }
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

function upsertPlayerEntry(map, displayName, clubs) {
  const normName = normalizeText(displayName).replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
  if (!normName) return;
  if (!map.has(normName)) {
    map.set(normName, {
      name: displayName,
      normalized: normName,
      clubKeys: new Set(),
      rawClubs: new Set()
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
}

const mergedPlayersMap = new Map();
for (const p of FOOTBALL_DB.players) {
  upsertPlayerEntry(mergedPlayersMap, p.name, p.clubs);
}

for (const item of SUPPLEMENTAL_PLAYERS) {
  upsertPlayerEntry(mergedPlayersMap, item.name, item.clubs);
}

const playerIndex = Array.from(mergedPlayersMap.values());

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

  cells.sort((a, b) => a.length - b.length);
  const used = new Set();

  function matchCell(idx) {
    if (idx === cells.length) return true;
    for (const playerKey of cells[idx]) {
      if (used.has(playerKey)) continue;
      used.add(playerKey);
      if (matchCell(idx + 1)) return true;
      used.delete(playerKey);
    }
    return false;
  }

  return matchCell(0);
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

function createDifficultySelectorElement() {
  const wrapper = document.createElement("div");
  wrapper.className = "difficulty-group";
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", "Club Difficulty");

  Object.entries(DIFFICULTY_META).forEach(([key, meta]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "difficulty-btn";
    btn.dataset.diff = key;
    btn.textContent = meta.label;
    btn.title = meta.desc;
    if (key === state.difficulty) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => setDifficulty(key));
    wrapper.appendChild(btn);
  });

  return wrapper;
}

function mountDifficultyControls() {
  const btnEnterGame = document.getElementById("btn-enter-game");
  if (btnEnterGame && btnEnterGame.parentElement && !btnEnterGame.parentElement.querySelector(".difficulty-group")) {
    btnEnterGame.parentElement.insertBefore(createDifficultySelectorElement(), btnEnterGame);
  }

  const btnNewGrid = document.getElementById("btn-new-grid");
  if (btnNewGrid && btnNewGrid.parentElement && !btnNewGrid.parentElement.querySelector(".difficulty-group")) {
    btnNewGrid.parentElement.insertBefore(createDifficultySelectorElement(), btnNewGrid);
  }
}

function showStage(stageName) {
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
    syncCanvasResolution();
    state.mapView.needsRender = true;
    drawWorldMap();
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

function paintCountryPolygon(ctx, rings, gameCodes, w, h) {
  const nearLeague = isPolygonNearCountry(rings, gameCodes);
  const activeCodes = nearLeague ? gameCodes : [];

  const isH = Boolean(state.horizontalCountry && activeCodes.includes(state.horizontalCountry));
  const isV = Boolean(state.verticalCountry && activeCodes.includes(state.verticalCountry));
  const isHover = Boolean(state.hoveredCountry && activeCodes.includes(state.hoveredCountry));
  const hasLeague = activeCodes.length > 0;

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
  } else if (hasLeague) {
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

function drawRoundedLabel(ctx, text, x, y, bgColor, borderColor, textColor, fontSize = 10.5) {
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
        paintCountryPolygon(ctx, geom.coordinates, feat.gameCodes, w, h);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach((poly) => {
          paintCountryPolygon(ctx, poly, feat.gameCodes, w, h);
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

  if (state.horizontalCountry && state.verticalCountry) {
    const hInfo = FOOTBALL_DB.countries[state.horizontalCountry];
    const vInfo = FOOTBALL_DB.countries[state.verticalCountry];
    const pH = projectPoint(hInfo.lat, hInfo.lng, w, h);
    const pV = projectPoint(vInfo.lat, vInfo.lng, w, h);

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
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(pH.x, pH.y);
    ctx.quadraticCurveTo(midX, midY, pV.x, pV.y);
    ctx.stroke();
    ctx.restore();
  }

  const entries = Object.entries(FOOTBALL_DB.countries).filter(([code]) => hasActiveLeague(code));
  entries.sort(([codeA], [codeB]) => {
    const score = (c) => {
      if (c === state.hoveredCountry) return 4;
      if (c === state.horizontalCountry || c === state.verticalCountry) return 3;
      return 1;
    };
    return score(codeA) - score(codeB);
  });

  const pinNodes = [];

  entries.forEach(([code, info]) => {
    const pt = projectPoint(info.lat, info.lng, w, h);
    state.countryScreenCoords[code] = pt;

    const isH = code === state.horizontalCountry;
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
    const fontSize = isPriority ? 11 : 10;
    const estWidth = labelText.length * 6.1 + 12;
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
    const hasPulse = Boolean(state.horizontalCountry || state.verticalCountry || state.hoveredCountry);

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
    if (!hasActiveLeague(code)) continue;
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
      if (!feat.gameCodes || feat.gameCodes.length === 0 || !feat.geometry) continue;
      const geom = feat.geometry;
      let hit = false;

      if (geom.type === "Polygon") {
        if (
          isPolygonNearCountry(geom.coordinates, feat.gameCodes) &&
          isPointInPolygonRings(lng, lat, geom.coordinates)
        ) {
          hit = true;
        }
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          if (
            isPolygonNearCountry(poly, feat.gameCodes) &&
            isPointInPolygonRings(lng, lat, poly)
          ) {
            hit = true;
            break;
          }
        }
      }

      if (hit) {
        if (feat.gameCodes.length === 1) {
          return feat.gameCodes[0];
        }
        let bestCode = feat.gameCodes[0];
        let bestDist = Infinity;
        for (const code of feat.gameCodes) {
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
  if (!code || !hasActiveLeague(code)) return;

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
  const searchInput = document.getElementById("country-search-input");
  if (!listEl) return;

  const query = normalizeText(searchInput ? searchInput.value : "");
  const sortedEntries = Object.entries(FOOTBALL_DB.countries)
    .filter(([code]) => hasActiveLeague(code))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const filtered = sortedEntries.filter(([code, info]) => {
    if (!query) return true;
    return (
      normalizeText(info.name).includes(query) ||
      normalizeText(info.league).includes(query) ||
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
    let tagText = `${info.clubs.length} clubs`;

    if (code === state.horizontalCountry) {
      li.classList.add("selected-h");
      tagText = "HORIZONTAL";
    } else if (code === state.verticalCountry) {
      li.classList.add("selected-v");
      tagText = "VERTICAL";
    }

    li.innerHTML = `
      <div class="country-item-info">
        <span class="country-item-name">${info.name}</span>
        <span class="country-item-league">${info.league}</span>
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

  if (state.horizontalCountry) {
    const h = FOOTBALL_DB.countries[state.horizontalCountry];
    pillH.textContent = `Horizontal: ${h.name}`;
    pillH.className = "pill horizontal";
  } else {
    pillH.textContent = "Horizontal: None";
    pillH.className = "pill empty";
  }

  if (state.verticalCountry) {
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

  renderCountrySidebar();
  drawWorldMap();
}

function startNewRound() {
  if (!state.horizontalCountry || !state.verticalCountry) return;

  const hCountry = FOOTBALL_DB.countries[state.horizontalCountry];
  const vCountry = FOOTBALL_DB.countries[state.verticalCountry];
  const diffMeta = DIFFICULTY_META[state.difficulty] || DIFFICULTY_META.medium;

  document.getElementById("meta-horizontal").textContent = `Horizontal: ${hCountry.name} (${hCountry.league})`;
  document.getElementById("meta-vertical").textContent = `Vertical: ${vCountry.name} (${vCountry.league}) · ${diffMeta.label}`;

  const grid = generateSolvableGrid(state.horizontalCountry, state.verticalCountry, state.difficulty);
  if (!grid) {
    setStatus("No full 3x3 solvable intersection found for this pair. Try another country pair.");
    return;
  }

  state.colClubs = grid.cols;
  state.rowClubs = grid.rows;
  state.board = Array(3).fill(null).map(() => Array(3).fill(null));
  state.usedPlayers.clear();
  state.turn = "X";
  state.gameOver = false;

  const btnNewGrid = document.getElementById("btn-new-grid");
  if (btnNewGrid) {
    btnNewGrid.classList.add("hidden");
    btnNewGrid.style.display = "none";
  }

  for (let i = 0; i < 3; i++) {
    document.getElementById(`col-${i}`).innerHTML = `${state.colClubs[i]}<span class="club-badge">${hCountry.league}</span>`;
    document.getElementById(`row-${i}`).innerHTML = `${state.rowClubs[i]}<span class="club-badge">${vCountry.league}</span>`;
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
    banner.textContent = "World Map";
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
    banner.textContent = `${state.players.O} (O) Turn`;
    banner.className = "turn-banner turn-o";
    cardO.classList.add("active-o");
  }
}

function setStatus(msg) {
  document.getElementById("status-message").textContent = msg;
}

function inspectCellSolutions(r, c) {
  const rowClub = state.rowClubs[r];
  const colClub = state.colClubs[c];
  if (!rowClub || !colClub) return;

  const valid = getCommonPlayers(rowClub, colClub);
  const sample = valid.slice(0, 6).map((p) => p.name).join(", ");
  const extra = valid.length > 6 ? ` (+${valid.length - 6} more)` : "";
  setStatus(`${rowClub} × ${colClub} (${valid.length}): ${sample}${extra}`);
}

function openGuessModal(r, c) {
  if (state.gameOver) {
    inspectCellSolutions(r, c);
    return;
  }
  if (state.board[r][c] !== null) return;
  state.activeCell = { r, c };
  state.autocompleteMatches = [];
  state.highlightedIndex = -1;

  const rowClub = state.rowClubs[r];
  const colClub = state.colClubs[c];

  document.getElementById("modal-matchup").textContent = `${rowClub} × ${colClub}`;
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
    li.textContent = p.name;
    if (idx === state.highlightedIndex) {
      li.style.background = "rgba(56, 189, 248, 0.22)";
      li.style.color = "#f8fafc";
    }
    li.addEventListener("click", () => {
      input.value = p.name;
      state.autocompleteMatches = [];
      state.highlightedIndex = -1;
      list.innerHTML = "";
      submitGuess();
    });
    list.appendChild(li);
  });
}

function handleAutocomplete() {
  const input = document.getElementById("player-input");
  const list = document.getElementById("autocomplete-list");
  const query = normalizeText(input.value).replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
  state.autocompleteMatches = [];
  state.highlightedIndex = -1;
  list.innerHTML = "";

  if (query.length < 2) return;

  state.autocompleteMatches = playerIndex
    .filter((p) => !state.usedPlayers.has(p.normalized) && p.normalized.includes(query))
    .slice(0, 8);

  if (state.autocompleteMatches.length === 1) {
    state.highlightedIndex = 0;
  }

  renderAutocompleteItems();
}

function submitGuess() {
  if (!state.activeCell) return;
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
  const colClub = state.colClubs[c];
  const rowClubKey = normalizeClubKey(rowClub);
  const colClubKey = normalizeClubKey(colClub);

  if (matchedPlayer.clubKeys.has(rowClubKey) && matchedPlayer.clubKeys.has(colClubKey)) {
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
      switchTurn(`Valid! ${matchedPlayer.name} played for both clubs.`);
    }
  } else {
    const knownClubs = Array.from(matchedPlayer.rawClubs).slice(0, 6).join(", ");
    feedback.textContent = knownClubs
      ? `${matchedPlayer.name} did not play for both clubs (Listed: ${knownClubs}). Turn lost!`
      : `${matchedPlayer.name} did not play for both clubs. Turn lost!`;
    feedback.className = "modal-feedback error";
    setTimeout(() => {
      closeGuessModal();
      switchTurn(`Invalid guess (${matchedPlayer.name}). Turn passed.`);
    }, 1150);
  }
}

function switchTurn(prefixMsg) {
  state.turn = state.turn === "X" ? "O" : "X";
  updateTurnBanner();
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
  mountDifficultyControls();
  loadWorldGeoJson();
  renderCountrySidebar();
  syncCanvasResolution();
  drawWorldMap();
  requestAnimationFrame(animateMapLoop);

  window.addEventListener("resize", () => {
    syncCanvasResolution();
    const activeStage = document.querySelector(".stage.active");
    if (activeStage && activeStage.id === "stage-map") {
      drawWorldMap();
    }
  });

  document.getElementById("btn-start-map").addEventListener("click", () => {
    const px = document.getElementById("input-player-x").value.trim() || "Player 1";
    const po = document.getElementById("input-player-o").value.trim() || "Player 2";
    state.players.X = px;
    state.players.O = po;
    document.getElementById("label-player-x").textContent = px;
    document.getElementById("label-player-o").textContent = po;
    showStage("map");
    updateCountrySelectionUI();
  });

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
    state.verticalCountry = null;
    state.mapView.needsRender = true;
    updateCountrySelectionUI();
  });

  document.getElementById("btn-enter-game").addEventListener("click", () => {
    if (!state.horizontalCountry || !state.verticalCountry) return;
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

    const ttWidth = 210;
    const posX = e.clientX + ttWidth > window.innerWidth ? e.clientX - ttWidth : e.clientX + 14;
    const posY = e.clientY + 68 > window.innerHeight ? e.clientY - 56 : e.clientY + 14;

    if (code) {
      const info = FOOTBALL_DB.countries[code];
      let roleLabel = "Click to assign axis";
      if (code === state.horizontalCountry) roleLabel = "Assigned: Horizontal Axis";
      if (code === state.verticalCountry) roleLabel = "Assigned: Vertical Axis";

      tooltip.innerHTML = `
        <div class="tt-title">${info.name}</div>
        <div class="tt-league">${info.league}</div>
        <div class="tt-clubs">${info.clubs.length} clubs &bull; ${roleLabel}</div>
      `;
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
    if (!state.gameOver) {
      switchTurn("Turn passed.");
    }
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