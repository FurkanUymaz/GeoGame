import json
import re
import time
import unicodedata
import urllib.error
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

WIKI_TITLE_OVERRIDES = {
    "inter": ["Inter Milan"],
    "milan": ["AC Milan"],
    "psg": ["Paris Saint-Germain F.C."],
    "sporting": ["Sporting CP"],
    "athletic club": ["Athletic Bilbao"],
    "bayer leverkusen": ["Bayer 04 Leverkusen"],
    "borussia dortmund": ["Borussia Dortmund"],
    "monchengladbach": ["Borussia Mönchengladbach"],
    "bayern munich": ["FC Bayern Munich"],
    "fenerbahce": ["Fenerbahçe S.K. (football)"],
    "galatasaray": ["Galatasaray S.K. (football)"],
    "besiktas": ["Beşiktaş J.K."],
    "trabzonspor": ["Trabzonspor"],
    "basaksehir": ["İstanbul Başakşehir F.K."],
    "arsenal": ["Arsenal F.C."],
    "chelsea": ["Chelsea F.C."],
    "liverpool": ["Liverpool F.C."],
    "manchester united": ["Manchester United F.C."],
    "manchester city": ["Manchester City F.C."],
    "tottenham": ["Tottenham Hotspur F.C."],
    "newcastle": ["Newcastle United F.C."],
    "west ham": ["West Ham United F.C."],
    "aston villa": ["Aston Villa F.C."],
    "everton": ["Everton F.C."],
    "fulham": ["Fulham F.C."],
    "brighton": ["Brighton & Hove Albion F.C."],
    "wolverhampton": ["Wolverhampton Wanderers F.C."],
    "leicester": ["Leicester City F.C."],
    "real madrid": ["Real Madrid CF"],
    "barcelona": ["FC Barcelona"],
    "atletico madrid": ["Atlético Madrid"],
    "sevilla": ["Sevilla FC"],
    "valencia": ["Valencia CF"],
    "villarreal": ["Villarreal CF"],
    "real sociedad": ["Real Sociedad"],
    "real betis": ["Real Betis"],
    "juventus": ["Juventus FC"],
    "napoli": ["SSC Napoli"],
    "roma": ["AS Roma"],
    "lazio": ["SS Lazio"],
    "atalanta": ["Atalanta BC"],
    "fiorentina": ["ACF Fiorentina"],
    "ajax": ["AFC Ajax"],
    "psv": ["PSV Eindhoven"],
    "feyenoord": ["Feyenoord"],
    "benfica": ["S.L. Benfica"],
    "porto": ["FC Porto"]
}

STOP_WORDS = {
    "fc", "sk", "jk", "cf", "ac", "as", "sc", "ss", "fk", "afc", "cfc", "sfc",
    "bk", "ik", "if", "nk", "gnk", "hnk", "ogc", "rc", "rcd", "cd", "ud", "sd",
    "ca", "se", "cr", "ec", "vfb", "vfl", "tsg", "sv", "fsv", "bsc", "hsv",
    "ksc", "msv", "rb", "spvgg", "1", "kulubu", "jimnastik", "futbol", "sportif",
    "associazione", "sportiva", "calcio", "1893", "1903", "1905", "1907"
}

USER_AGENT = "GeoGameTransferSync/2.0 (https://github.com/FurkanUymaz/GeoGame)"


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


def normalize_player_key(player_name):
    cleaned = normalize_text(player_name).replace("-", " ").replace("'", " ").replace("’", " ")
    return re.sub(r"\s+", " ", cleaned).strip()


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
    official_clubs = []
    for info in db.get("countries", {}).values():
        for club in info.get("clubs", []):
            key = normalize_club_key(club)
            if key and key not in lookup:
                lookup[key] = club
                official_clubs.append(club)
    return lookup, official_clubs


def http_get_json(url, timeout=30, retries=3):
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code in {429, 500, 502, 503, 504} and attempt < retries - 1:
                time.sleep(2.0 * (attempt + 1))
                continue
            raise
        except Exception:
            if attempt < retries - 1:
                time.sleep(2.0 * (attempt + 1))
                continue
            raise
    return {}


def resolve_club_qids(official_clubs):
    title_to_club = {}
    all_titles = []

    for club in official_clubs:
        key = normalize_club_key(club)
        candidates = list(WIKI_TITLE_OVERRIDES.get(key, []))
        candidates.extend([club, f"{club} F.C.", f"{club} S.K."])
        for title in candidates:
            if title not in title_to_club:
                title_to_club[title] = club
                all_titles.append(title)

    qid_to_club = {}
    chunk_size = 40

    for idx in range(0, len(all_titles), chunk_size):
        chunk = all_titles[idx:idx + chunk_size]
        params = urllib.parse.urlencode({
            "action": "query",
            "prop": "pageprops",
            "ppprop": "wikibase_item",
            "redirects": "1",
            "titles": "|".join(chunk),
            "format": "json"
        })
        url = f"https://en.wikipedia.org/w/api.php?{params}"
        try:
            data = http_get_json(url, timeout=25, retries=3)
        except Exception as exc:
            print(f"Wikipedia lookup warning: {exc}")
            continue

        query_obj = data.get("query", {})
        normalized_map = {item["from"]: item["to"] for item in query_obj.get("normalized", [])}
        redirect_map = {item["from"]: item["to"] for item in query_obj.get("redirects", [])}

        page_title_to_qid = {}
        for page in query_obj.get("pages", {}).values():
            qid = page.get("pageprops", {}).get("wikibase_item")
            title = page.get("title")
            if qid and title:
                page_title_to_qid[title] = qid

        for orig_title in chunk:
            resolved = normalized_map.get(orig_title, orig_title)
            for _ in range(5):
                if resolved in redirect_map:
                    resolved = redirect_map[resolved]
                else:
                    break
            qid = page_title_to_qid.get(resolved)
            if qid and qid not in qid_to_club:
                qid_to_club[qid] = title_to_club[orig_title]

        time.sleep(0.15)

    return qid_to_club


def fetch_squads_for_qids(qid_to_club):
    qids = list(qid_to_club.keys())
    batch_size = 20
    total_batches = (len(qids) + batch_size - 1) // batch_size
    records = []

    for batch_idx in range(total_batches):
        batch = qids[batch_idx * batch_size:(batch_idx + 1) * batch_size]
        values_clause = " ".join(f"wd:{qid}" for qid in batch)
        sparql = f"""
        SELECT DISTINCT ?playerLabel ?club WHERE {{
          VALUES ?club {{ {values_clause} }}
          ?player p:P54 ?stmt .
          ?stmt ps:P54 ?club .
          {{
            FILTER NOT EXISTS {{ ?stmt pq:P582 ?end }}
          }} UNION {{
            ?stmt pq:P580 ?start .
            FILTER(?start >= "2025-07-01T00:00:00Z"^^xsd:dateTime)
          }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,tr,es,de,fr,it,pt". }}
        }}
        """
        encoded = urllib.parse.urlencode({"query": sparql, "format": "json"})
        url = f"https://query.wikidata.org/sparql?{encoded}"

        try:
            payload = http_get_json(url, timeout=35, retries=3)
            rows = payload.get("results", {}).get("bindings", [])
            batch_count = 0
            for row in rows:
                p_name = row.get("playerLabel", {}).get("value", "").strip()
                club_uri = row.get("club", {}).get("value", "")
                club_qid = club_uri.rsplit("/", 1)[-1]
                official_club = qid_to_club.get(club_qid)
                if p_name and official_club and not re.match(r"^Q\d+$", p_name):
                    records.append((p_name, official_club))
                    batch_count += 1
            print(f"Batch {batch_idx + 1}/{total_batches}: retrieved {batch_count} active squad/transfer entries.")
        except Exception as exc:
            print(f"Batch {batch_idx + 1}/{total_batches} warning: {exc}")

        time.sleep(0.45)

    return records


def sync_transfers():
    data_path = Path("data.js")
    if not data_path.exists():
        raise FileNotFoundError("data.js not found in current directory")

    prefix, db = load_data_js(data_path)
    club_lookup, official_clubs = build_club_lookup(db)

    print(f"Resolving {len(official_clubs)} clubs to Wikidata IDs...")
    qid_to_club = resolve_club_qids(official_clubs)
    print(f"Matched {len(qid_to_club)} club entities.")

    records = fetch_squads_for_qids(qid_to_club)
    print(f"Total player-club records retrieved: {len(records)}")

    players_by_norm = {}
    for entry in db.get("players", []):
        norm_name = normalize_player_key(entry.get("name", ""))
        if norm_name:
            players_by_norm[norm_name] = entry

    updated_existing_players = set()
    added_links = 0
    new_players_added = 0

    for raw_player, official_club in records:
        norm_player = normalize_player_key(raw_player)
        if not norm_player:
            continue
        club_key = normalize_club_key(official_club)
        canonical_club = club_lookup.get(club_key, official_club)

        if norm_player in players_by_norm:
            player_obj = players_by_norm[norm_player]
            existing_keys = {normalize_club_key(c) for c in player_obj["clubs"]}
            if club_key not in existing_keys:
                player_obj["clubs"].append(canonical_club)
                added_links += 1
                updated_existing_players.add(norm_player)
        else:
            new_entry = {"name": raw_player, "clubs": [canonical_club]}
            db["players"].append(new_entry)
            players_by_norm[norm_player] = new_entry
            added_links += 1
            new_players_added += 1

    save_data_js(data_path, prefix, db)
    print(
        f"Sync complete. Added {added_links} club links "
        f"({len(updated_existing_players)} existing players updated, {new_players_added} new players added)."
    )


if __name__ == "__main__":
    sync_transfers()