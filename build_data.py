import csv
import json
import re
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

COUNTRY_COORDS = {
    "TR1": ("TUR", "Turkey", "Süper Lig", 39.2, 35.2),
    "GB1": ("ENG", "England", "Premier League", 52.6, -1.8),
    "ES1": ("ESP", "Spain", "La Liga", 40.2, -3.7),
    "IT1": ("ITA", "Italy", "Serie A", 42.6, 12.5),
    "L1": ("GER", "Germany", "Bundesliga", 51.2, 10.4),
    "FR1": ("FRA", "France", "Ligue 1", 46.6, 2.3),
    "NL1": ("NED", "Netherlands", "Eredivisie", 52.2, 5.3),
    "PO1": ("POR", "Portugal", "Liga Portugal", 39.6, -8.1),
    "BE1": ("BEL", "Belgium", "Pro League", 50.5, 4.5),
    "RU1": ("RUS", "Russia", "Premier Liga", 55.7, 37.6),
    "UKR1": ("UKR", "Ukraine", "Premier Liga", 50.4, 30.5),
    "GR1": ("GRE", "Greece", "Super League 1", 37.9, 23.7),
    "SC1": ("SCO", "Scotland", "Premiership", 56.4, -4.2),
    "A1": ("AUT", "Austria", "Bundesliga", 47.5, 14.5),
    "C1": ("SUI", "Switzerland", "Super League", 46.8, 8.2),
    "DK1": ("DEN", "Denmark", "Superliga", 56.0, 9.5),
    "NO1": ("NOR", "Norway", "Eliteserien", 60.5, 8.5),
    "SE1": ("SWE", "Sweden", "Allsvenskan", 60.1, 14.8),
    "PL1": ("POL", "Poland", "Ekstraklasa", 52.0, 19.1),
    "TS1": ("CZE", "Czech Republic", "Chance Liga", 49.8, 15.5),
    "RO1": ("ROU", "Romania", "SuperLiga", 45.9, 24.9),
    "KR1": ("CRO", "Croatia", "HNL", 45.1, 15.2),
    "SER1": ("SRB", "Serbia", "SuperLiga", 44.0, 20.9),
    "CDR1": ("CYP", "Cyprus", "Cyprus League", 35.1, 33.4),
    "MLS1": ("USA", "United States", "MLS", 39.8, -98.5),
    "BRA1": ("BRA", "Brazil", "Série A", -14.2, -51.9),
    "ARG1": ("ARG", "Argentina", "Liga Profesional", -34.6, -64.0),
    "AR1N": ("ARG", "Argentina", "Liga Profesional", -34.6, -64.0),
    "MEX1": ("MEX", "Mexico", "Liga MX", 23.6, -102.5),
    "COL1": ("COL", "Colombia", "Liga BetPlay", 4.5, -74.2),
    "CL1": ("CHI", "Chile", "Campeonato Nacional", -33.4, -70.6),
    "PE1": ("PER", "Peru", "Liga 1", -9.1, -75.0),
    "EC1": ("ECU", "Ecuador", "LigaPro", -1.8, -78.1),
    "URU1": ("URU", "Uruguay", "Primera División", -32.5, -55.7),
    "SA1": ("KSA", "Saudi Arabia", "Saudi Pro League", 24.5, 45.0),
    "UAE1": ("UAE", "United Arab Emirates", "Pro League", 24.4, 54.4),
    "QSL": ("QAT", "Qatar", "Stars League", 25.3, 51.1),
    "JAP1": ("JPN", "Japan", "J1 League", 36.2, 138.2),
    "J1": ("JPN", "Japan", "J1 League", 36.2, 138.2),
    "RSK1": ("KOR", "South Korea", "K League 1", 36.5, 127.8),
    "K1": ("KOR", "South Korea", "K League 1", 36.5, 127.8),
    "CSL": ("CHN", "China", "Super League", 35.8, 104.1),
    "AUS1": ("AUS", "Australia", "A-League Men", -25.2, 133.7),
    "ZAF1": ("RSA", "South Africa", "Betway Premiership", -30.5, 22.9),
    "EGY1": ("EGY", "Egypt", "Premier League", 26.8, 30.8),
    "MAR1": ("MAR", "Morocco", "Botola Pro", 31.7, -7.0),
    "TUN1": ("TUN", "Tunisia", "Ligue I", 33.8, 9.5),
    "DZ1": ("ALG", "Algeria", "Ligue 1", 28.0, 1.6)
}

CLUB_NAME_OVERRIDES = {
    'Футбольный клуб "Локомотив" Москва': "Lokomotiv Moscow",
    "AO FK Zenit Sankt-Peterburg": "Zenit St. Petersburg",
    "Panthessalonikios Athlitikos Omilos Konstantinoupoliton": "PAOK",
    "Olympiakos Syndesmos Filathlon Peiraios": "Olympiacos",
    "Athlitiki Enosi Konstantinoupoleos": "AEK Athens",
    "Panathinaikos Athlitikos Omilos": "Panathinaikos",
    "APS Atromitos Athinon": "Atromitos",
    "APO Levadiakos Football Club": "Levadiakos",
    "Athlitiki Enosi Larisas": "AE Larisa",
    "Omilos Filathlon Irakliou FC": "OFI Crete",
    "A.G.S Asteras Tripolis": "Asteras Tripolis",
    "Volou Neos Podosferikos Syllogos": "Volos NPS",
    "Athlitiki Enosi Kifisias": "AE Kifisia",
    "Beşiktaş Jimnastik Kulübü": "Beşiktaş",
    "Gençlerbirliği Spor Kulübü": "Gençlerbirliği",
    "Associazione Sportiva Roma": "AS Roma",
    "Società Sportiva Lazio S.p.A.": "SS Lazio",
    "Bologna Football Club 1909": "Bologna FC",
    "1. Fußballclub Heidenheim 1846": "1. FC Heidenheim",
    "Sportklub Puntigamer Sturm Graz": "Sturm Graz",
    "Fußballclub Red Bull Salzburg": "Red Bull Salzburg",
    "Sportclub Rheindorf Altach": "SCR Altach",
    "Football Club Lausanne-Sport": "Lausanne-Sport",
    "Foundation Coorperation Hana Financial Group Inc. Football Club": "Daejeon Hana Citizen",
    "Jeju SK Football Club": "Jeju United",
    "Ulsan Hyundai Football Club": "Ulsan HD",
    "Morski Związkowy Klub Sportowy Arka Gdynia Spółka Akcyjna": "Arka Gdynia",
    "Termalica Bruk-Bet Nieciecza Klub Sportowy": "Bruk-Bet Termalica",
    "Motor Lublin Spółka Akcyjna": "Motor Lublin",
    "GKS GieKSa Katowice Spółka Akcyjna": "GKS Katowice",
    "Asociación de Fomento Deportivo Riestra Barrio Colón": "Deportivo Riestra",
    "Racing Club Asociación Civil de Avellaneda": "Racing Club",
    "Club Atlético Independiente de Avellaneda": "Independiente",
    "Club Atlético San Lorenzo de Almagro": "San Lorenzo",
    "Idrottsföreningen Kamraterna Göteborg": "IFK Göteborg",
    "Idrottsföreningen Brommapojkarna": "IF Brommapojkarna",
    "Idrottsföreningen Elfsborg": "IF Elfsborg",
    "Mjällby Almänna Idrottsförening": "Mjällby AIF",
    "Allmänna Idrottsklubben": "AIK",
    "Göteborgs Atlet- och Idrottssällskap": "GAIS",
    "Club Internacional de Fútbol Miami": "Inter Miami CF",
    "Al-Hilal Saudi Football Club": "Al-Hilal",
    "Al-Ahli Saudi Football Club": "Al-Ahli",
    "Al-Nassr Football Club": "Al-Nassr",
    "Al-Ittihad Football Club": "Al-Ittihad",
    "Al-Ettifaq Football Club": "Al-Ettifaq",
    "Al-Taawoun Football Club": "Al-Taawoun",
    "Al-Qadsiah Saudi Football Club": "Al-Qadsiah",
    "Al-Riyadh Saudi Club": "Al-Riyadh",
    "Al-Khaleej Club (Saihat)": "Al-Khaleej"
}

FALLBACK_CONTINENTS = [
    [[-168, 66], [-140, 70], [-125, 70], [-95, 72], [-80, 65], [-65, 53], [-55, 47], [-70, 41], [-81, 25], [-97, 26], [-88, 18], [-84, 10], [-78, 8], [-92, 15], [-105, 20], [-117, 32], [-124, 48], [-136, 58], [-152, 60], [-168, 66]],
    [[-52, 60], [-44, 60], [-20, 70], [-22, 82], [-58, 82], [-68, 76], [-52, 60]],
    [[-80, 10], [-62, 10], [-50, 0], [-35, -6], [-38, -15], [-48, -28], [-58, -38], [-66, -54], [-74, -52], [-72, -36], [-71, -18], [-81, -5], [-80, 10]],
    [[-10, 51], [-6, 58], [0, 58], [2, 51], [-5, 50], [-10, 51]],
    [[-10, 36], [-9, 43], [-4, 48], [2, 51], [8, 54], [10, 58], [5, 61], [15, 69], [28, 71], [40, 67], [55, 70], [60, 55], [50, 45], [40, 43], [28, 41], [24, 37], [16, 38], [12, 44], [5, 43], [0, 39], [-10, 36]],
    [[-17, 15], [-13, 28], [-6, 35], [10, 37], [25, 32], [33, 31], [43, 12], [51, 12], [41, -2], [39, -15], [33, -26], [20, -35], [15, -28], [12, -6], [9, 4], [2, 6], [-8, 5], [-17, 15]],
    [[44, -25], [49, -13], [50, -24], [44, -25]],
    [[28, 41], [40, 43], [52, 38], [60, 55], [80, 72], [115, 73], [145, 70], [175, 66], [160, 55], [142, 52], [135, 35], [122, 31], [118, 22], [108, 16], [103, 2], [98, 16], [88, 22], [78, 8], [72, 20], [62, 25], [56, 26], [48, 30], [36, 36], [28, 41]],
    [[130, 31], [141, 35], [145, 44], [140, 43], [136, 36], [130, 31]],
    [[96, 5], [106, -6], [118, -8], [128, -4], [118, 4], [108, 2], [96, 5]],
    [[114, -22], [122, -17], [131, -12], [142, -11], [150, -22], [153, -28], [148, -38], [138, -35], [130, -32], [115, -34], [114, -22]],
    [[167, -46], [174, -41], [178, -37], [173, -35], [170, -43], [167, -46]]
]

CONTROL_CHARS_RE = re.compile(r"[\u200b-\u200f\ufeff]")
DEFUNCT_TAG_RE = re.compile(r"\s*\(\s*-?\s*\d{4}(?:\s*-\s*\d{4})?\s*\)")

def sanitize_text(value):
    cleaned = CONTROL_CHARS_RE.sub("", value or "")
    return " ".join(cleaned.split()).strip()

def clean_club_name(raw_name):
    normalized = sanitize_text(raw_name)
    if normalized in CLUB_NAME_OVERRIDES:
        return CLUB_NAME_OVERRIDES[normalized]
    stripped = DEFUNCT_TAG_RE.sub("", normalized).strip()
    if stripped in CLUB_NAME_OVERRIDES:
        return CLUB_NAME_OVERRIDES[stripped]
    return stripped

def build_full_database(clubs_csv, appearances_csv, players_csv, competitions_csv, output_js):
    comp_confederations = {}
    if competitions_csv.exists():
        with open(competitions_csv, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                comp_id = sanitize_text(row.get("competition_id", ""))
                confed = sanitize_text(row.get("confederation", ""))
                if comp_id and confed:
                    comp_confederations[comp_id] = confed.upper()

    countries_dict = {}
    club_id_to_info = {}

    for comp_id, (code, name, league, lat, lng) in COUNTRY_COORDS.items():
        if code not in countries_dict:
            countries_dict[code] = {
                "name": name,
                "league": league,
                "confederation": comp_confederations.get(comp_id, ""),
                "lat": lat,
                "lng": lng,
                "clubs": []
            }
        elif not countries_dict[code]["confederation"] and comp_id in comp_confederations:
            countries_dict[code]["confederation"] = comp_confederations[comp_id]

    with open(clubs_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            comp_id = sanitize_text(row.get("domestic_competition_id", ""))
            club_id = sanitize_text(row.get("club_id", ""))
            raw_club_name = row.get("pretty_name") or row.get("name") or ""
            club_name = clean_club_name(raw_club_name)
            if not club_id or not club_name or comp_id not in COUNTRY_COORDS:
                continue

            code = COUNTRY_COORDS[comp_id][0]
            club_id_to_info[club_id] = (code, club_name)
            if club_name not in countries_dict[code]["clubs"]:
                countries_dict[code]["clubs"].append(club_name)

    countries_dict = {
        code: {**info, "clubs": sorted(info["clubs"])}
        for code, info in countries_dict.items()
        if len(info["clubs"]) >= 3
    }

    player_id_to_name = {}
    with open(players_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = sanitize_text(row.get("player_id", ""))
            pname = sanitize_text(row.get("name", ""))
            if pid and pname:
                player_id_to_name[pid] = pname

    player_clubs = defaultdict(set)
    with open(appearances_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = sanitize_text(row.get("player_id", ""))
            cid = sanitize_text(row.get("player_club_id", ""))
            if cid in club_id_to_info and pid in player_id_to_name:
                player_clubs[player_id_to_name[pid]].add(club_id_to_info[cid][1])

    players_list = [
        {"name": pname, "clubs": sorted(list(clubs))}
        for pname, clubs in sorted(player_clubs.items())
        if len(clubs) >= 2
    ]

    continents = []
    for candidate in [BASE_DIR / "data.js", BASE_DIR / "data_2.js"]:
        if candidate.exists():
            raw_txt = candidate.read_text(encoding="utf-8")
            marker = "const FOOTBALL_DB = "
            if marker in raw_txt:
                try:
                    existing = json.loads(raw_txt.split(marker, 1)[1].strip().rstrip(";"))
                    if existing.get("continents") and len(existing["continents"]) > len(FALLBACK_CONTINENTS):
                        continents = existing["continents"]
                        break
                except Exception:
                    pass

    if not continents:
        continents = FALLBACK_CONTINENTS

    payload = {
        "project": "GeoGame",
        "continents": continents,
        "countries": countries_dict,
        "players": players_list
    }

    with open(output_js, mode="w", encoding="utf-8") as out:
        out.write("const FOOTBALL_DB = ")
        json.dump(payload, out, ensure_ascii=False)
        out.write(";\n")

    print(f"Done: {len(countries_dict)} countries, {len(players_list)} multi-club players written to {output_js.name}")

if __name__ == "__main__":
    build_full_database(
        BASE_DIR / "clubs.csv",
        BASE_DIR / "appearances.csv",
        BASE_DIR / "players.csv",
        BASE_DIR / "competitions.csv",
        BASE_DIR / "data.js"
    )