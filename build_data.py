import csv
import json
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

TARGET_LEAGUES = {
    "TR1": ("TUR", "Turkey", "Süper Lig", 39.0, 35.0),
    "GB1": ("ENG", "England", "Premier League", 52.8, -1.5),
    "ES1": ("ESP", "Spain", "La Liga", 40.2, -3.7),
    "IT1": ("ITA", "Italy", "Serie A", 42.8, 12.5),
    "L1": ("GER", "Germany", "Bundesliga", 51.1, 10.4),
    "FR1": ("FRA", "France", "Ligue 1", 46.6, 2.2),
    "NL1": ("NED", "Netherlands", "Eredivisie", 52.1, 5.3),
    "PO1": ("POR", "Portugal", "Liga Portugal", 39.4, -8.2),
    "BE1": ("BEL", "Belgium", "Jupiler Pro League", 50.5, 4.5),
    "RU1": ("RUS", "Russia", "Premier Liga", 55.7, 37.6)
}

def build_database(clubs_csv, appearances_csv, players_csv, output_js):
    club_id_to_info = {}
    countries_dict = {}

    for comp_id, (code, name, league_name, lat, lng) in TARGET_LEAGUES.items():
        countries_dict[code] = {
            "name": name,
            "league": league_name,
            "lat": lat,
            "lng": lng,
            "clubs": []
        }

    with open(clubs_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            comp_id = row.get("domestic_competition_id")
            if comp_id in TARGET_LEAGUES:
                club_id = row["club_id"]
                club_name = row["name"].strip()
                code = TARGET_LEAGUES[comp_id][0]
                club_id_to_info[club_id] = (code, club_name)
                if club_name not in countries_dict[code]["clubs"]:
                    countries_dict[code]["clubs"].append(club_name)

    player_id_to_name = {}
    with open(players_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            player_id_to_name[row["player_id"]] = row["name"].strip()

    player_clubs = defaultdict(set)
    with open(appearances_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row["player_id"]
            cid = row["player_club_id"]
            if cid in club_id_to_info and pid in player_id_to_name:
                player_clubs[player_id_to_name[pid]].add(club_id_to_info[cid][1])

    players_list = [
        {"name": pname, "clubs": sorted(list(clubs))}
        for pname, clubs in player_clubs.items()
        if len(clubs) >= 2
    ]

    db_payload = {
        "project": "GeoGame",
        "countries": countries_dict,
        "players": players_list
    }

    with open(output_js, mode="w", encoding="utf-8") as out:
        out.write("const FOOTBALL_DB = ")
        json.dump(db_payload, out, ensure_ascii=False)
        out.write(";\n")

if __name__ == "__main__":
    build_database(
        BASE_DIR / "clubs.csv",
        BASE_DIR / "appearances.csv",
        BASE_DIR / "players.csv",
        BASE_DIR / "data.js"
    )