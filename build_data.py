import csv
import json
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
    "J1": ("JPN", "Japan", "J1 League", 36.2, 138.2),
    "K1": ("KOR", "South Korea", "K League 1", 36.5, 127.8),
    "CSL": ("CHN", "China", "Super League", 35.8, 104.1),
    "AUS1": ("AUS", "Australia", "A-League Men", -25.2, 133.7),
    "ZAF1": ("RSA", "South Africa", "Betway Premiership", -30.5, 22.9),
    "EGY1": ("EGY", "Egypt", "Premier League", 26.8, 30.8),
    "MAR1": ("MAR", "Morocco", "Botola Pro", 31.7, -7.0),
    "TUN1": ("TUN", "Tunisia", "Ligue I", 33.8, 9.5),
    "DZ1": ("ALG", "Algeria", "Ligue 1", 28.0, 1.6)
}

def build_full_database(clubs_csv, appearances_csv, players_csv, competitions_csv, output_js):
    comp_meta = {}
    if competitions_csv.exists():
        with open(competitions_csv, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                cid = row.get("competition_id", "").strip()
                ctype = row.get("type", "").strip().lower()
                if cid and ctype in ("domestic_league", "first_tier", ""):
                    comp_meta[cid] = {
                        "name": row.get("country_name") or row.get("name") or cid,
                        "league": row.get("name") or cid
                    }

    countries_dict = {}
    club_id_to_info = {}

    for comp_id, (code, name, league, lat, lng) in COUNTRY_COORDS.items():
        countries_dict[code] = {
            "name": name,
            "league": league,
            "lat": lat,
            "lng": lng,
            "clubs": []
        }

    with open(clubs_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            comp_id = row.get("domestic_competition_id", "").strip()
            club_id = row.get("club_id", "").strip()
            club_name = row.get("name", "").strip()
            if not club_id or not club_name:
                continue

            if comp_id in COUNTRY_COORDS:
                code = COUNTRY_COORDS[comp_id][0]
            elif comp_id in comp_meta:
                code = comp_id.upper()
                if code not in countries_dict:
                    countries_dict[code] = {
                        "name": comp_meta[comp_id]["name"],
                        "league": comp_meta[comp_id]["league"],
                        "lat": 0.0,
                        "lng": 0.0,
                        "clubs": []
                    }
            else:
                continue

            club_id_to_info[club_id] = (code, club_name)
            if club_name not in countries_dict[code]["clubs"]:
                countries_dict[code]["clubs"].append(club_name)

    player_id_to_name = {}
    with open(players_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = row.get("player_id", "").strip()
            pname = row.get("name", "").strip()
            if pid and pname:
                player_id_to_name[pid] = pname

    player_clubs = defaultdict(set)
    with open(appearances_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = row.get("player_id", "").strip()
            cid = row.get("player_club_id", "").strip()
            if cid in club_id_to_info and pid in player_id_to_name:
                player_clubs[player_id_to_name[pid]].add(club_id_to_info[cid][1])

    players_list = [
        {"name": pname, "clubs": sorted(list(clubs))}
        for pname, clubs in player_clubs.items()
        if len(clubs) >= 2
    ]

    continents = []
    data_js_path = BASE_DIR / "data.js"
    if data_js_path.exists():
        raw_txt = data_js_path.read_text(encoding="utf-8")
        marker = "const FOOTBALL_DB = "
        if marker in raw_txt:
            try:
                existing = json.loads(raw_txt.split(marker, 1)[1].strip().rstrip(";"))
                continents = existing.get("continents", [])
            except Exception:
                continents = []

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

if __name__ == "__main__":
    build_full_database(
        BASE_DIR / "clubs.csv",
        BASE_DIR / "appearances.csv",
        BASE_DIR / "players.csv",
        BASE_DIR / "competitions.csv",
        BASE_DIR / "data.js"
    )