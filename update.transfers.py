import csv
import io
import json
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

CLUB_ALIASES = {
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
    "leeds united": "leeds",
    "besiktas jk": "besiktas",
    "fenerbahce sk": "fenerbahce",
    "galatasaray sk": "galatasaray",
    "trabzonspor kulubu": "trabzonspor"
}

STOP_WORDS = {
    "fc", "sk", "jk", "cf", "ac", "as", "sc", "ss", "fk", "afc", "cfc", "sfc",
    "bk", "ik", "if", "nk", "gnk", "hnk", "ogc", "rc", "rcd", "cd", "ud", "sd",
    "ca", "se", "cr", "ec", "vfb", "vfl", "tsg", "sv", "fsv", "bsc", "hsv",
    "ksc", "msv", "rb", "spvgg", "1", "kulubu", "jimnastik", "futbol", "sportif"
}


def normalize_text(value):
    cleaned = str(value or "").replace("\u200b", "").replace("\ufeff", "").lower()
    cleaned = unicodedata.normalize("NFD", cleaned)
    cleaned = "".join(ch for ch in cleaned if unicodedata.category(ch) != "Mn")
    replacements = str.maketrans({"ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c"})
    cleaned = cleaned.translate(replacements)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def normalize_club_key(club_name):
    cleaned = normalize_text(club_name)
    cleaned = re.sub(r"\([^)]*\)", " ", cleaned)
    cleaned = re.sub(r"[.'’\-_/()&]", " ", cleaned)
    tokens = [tok for tok in cleaned.split() if tok not in STOP_WORDS]
    key = " ".join(tokens).strip()
    return CLUB_ALIASES.get(key, key)


def load_data_js(file_path):
    raw_text = file_path.read_text(encoding="utf-8").strip()
    match = re.match(r"^((?:const|let|var|window\.)\s*FOOTBALL_DB\s*=\s*)", raw_text)
    if not match:
        raise ValueError("FOOTBALL_DB declaration not found in data.js")
    prefix = match.group(1)
    json_body = raw_text[len(prefix):].rstrip(";").strip()
    return prefix, json.loads(json_body)


def save_data_js(file_path, prefix, db):
    serialized = json.dumps(db, ensure_ascii=False, indent=2)
    file_path.write_text(f"{prefix}{serialized};\n", encoding="utf-8")


def build_club_lookup(db):
    lookup = {}
    for info in db.get("countries", {}).values():
        for club in info.get("clubs", []):
            key = normalize_club_key(club)
            if key and key not in lookup:
                lookup[key] = club
    return lookup


def fetch_wikidata_transfers():
    sparql_query = """
    SELECT DISTINCT ?playerLabel ?clubLabel WHERE {
      ?player wdt:P106 wd:Q937857 .
      ?player p:P54 ?stmt .
      ?stmt ps:P54 ?club .
      ?stmt pq:P580 ?start .
      FILTER(?start >= "2025-07-01T00:00:00Z"^^xsd:dateTime)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    """
    encoded_query = urllib.parse.urlencode({"query": sparql_query, "format": "json"})
    url = f"https://query.wikidata.org/sparql?{encoded_query}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GeoGameTransferSync/1.0 (https://github.com/FurkanUymaz/GeoGame)"}
    )
    records = []
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            for row in payload.get("results", {}).get("bindings", []):
                player_name = row.get("playerLabel", {}).get("value", "")
                club_name = row.get("clubLabel", {}).get("value", "")
                if player_name and club_name and not player_name.startswith("Q"):
                    records.append((player_name, club_name))
    except Exception as exc:
        print(f"Wikidata fetch warning: {exc}")
    return records


def fetch_github_transfermarkt_csv():
    url = "https://raw.githubusercontent.com/salimt/football-datasets/main/datalake/transfermarkt/player_transfers/player_transfers.csv"
    req = urllib.request.Request(url, headers={"User-Agent": "GeoGameTransferSync/1.0"})
    records = []
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
            reader = csv.DictReader(io.StringIO(content))
            for row in reader:
                season = str(row.get("transfer_season") or row.get("season") or "").strip()
                t_date = str(row.get("transfer_date") or "").strip()
                if season in {"25/26", "26/27", "2025/2026", "2026/2027"} or t_date >= "2025-07-01":
                    p_name = row.get("player_name") or row.get("name") or ""
                    to_club = row.get("to_club_name") or row.get("team_name") or ""
                    if p_name and to_club:
                        records.append((p_name, to_club))
    except Exception as exc:
        print(f"Transfermarkt CSV fetch warning: {exc}")
    return records


def sync_transfers():
    data_path = Path("data.js")
    if not data_path.exists():
        raise FileNotFoundError("data.js not found in current directory")

    prefix, db = load_data_js(data_path)
    club_lookup = build_club_lookup(db)

    players_by_norm = {}
    for entry in db.get("players", []):
        norm_name = normalize_text(entry.get("name", "")).replace("-", " ").replace("'", " ")
        norm_name = re.sub(r"\s+", " ", norm_name).strip()
        if norm_name:
            players_by_norm[norm_name] = entry

    print("Fetching 2025/26 and 2026/27 transfer records...")
    raw_transfers = []
    raw_transfers.extend(fetch_wikidata_transfers())
    raw_transfers.extend(fetch_github_transfermarkt_csv())
    print(f"Total raw transfer rows retrieved: {len(raw_transfers)}")

    updated_players = 0
    added_links = 0

    for raw_player, raw_club in raw_transfers:
        club_key = normalize_club_key(raw_club)
        official_club = club_lookup.get(club_key)
        if not official_club:
            continue

        norm_player = normalize_text(raw_player).replace("-", " ").replace("'", " ")
        norm_player = re.sub(r"\s+", " ", norm_player).strip()
        if not norm_player:
            continue

        if norm_player in players_by_norm:
            player_obj = players_by_norm[norm_player]
            existing_keys = {normalize_club_key(c) for c in player_obj["clubs"]}
            if club_key not in existing_keys:
                player_obj["clubs"].append(official_club)
                added_links += 1
                updated_players += 1

    save_data_js(data_path, prefix, db)
    print(f"Sync complete. Added {added_links} new club links across {updated_players} players.")


if __name__ == "__main__":
    sync_transfers()