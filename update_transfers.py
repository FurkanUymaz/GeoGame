import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TARGET_COUNTRY_CODES = {"TUR", "ENG", "ESP", "GER", "ITA", "FRA"}

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
    "inter": "Inter Milan",
    "milan": "AC Milan",
    "psg": "Paris Saint-Germain F.C.",
    "athletic club": "Athletic Bilbao",
    "bayer leverkusen": "Bayer 04 Leverkusen",
    "borussia dortmund": "Borussia Dortmund",
    "monchengladbach": "Borussia Mönchengladbach",
    "bayern munich": "FC Bayern Munich",
    "fenerbahce": "Fenerbahçe S.K. (football)",
    "galatasaray": "Galatasaray S.K. (football)",
    "besiktas": "Beşiktaş J.K.",
    "trabzonspor": "Trabzonspor",
    "basaksehir": "İstanbul Başakşehir F.K.",
    "kasimpasa": "Kasımpaşa S.K.",
    "sivasspor": "Sivasspor",
    "alanyaspor": "Alanyaspor",
    "antalyaspor": "Antalyaspor",
    "konyaspor": "Konyaspor",
    "kayserispor": "Kayserispor",
    "gaziantep": "Gaziantep F.K.",
    "hatayspor": "Hatayspor",
    "adana demirspor": "Adana Demirspor",
    "samsunspor": "Samsunspor",
    "caykur rizespor": "Çaykur Rizespor",
    "rizespor": "Çaykur Rizespor",
    "eyupspor": "Eyüpspor",
    "goztepe": "Göztepe S.K.",
    "bodrum": "Bodrum F.K.",
    "arsenal": "Arsenal F.C.",
    "chelsea": "Chelsea F.C.",
    "liverpool": "Liverpool F.C.",
    "manchester united": "Manchester United F.C.",
    "manchester city": "Manchester City F.C.",
    "tottenham": "Tottenham Hotspur F.C.",
    "newcastle": "Newcastle United F.C.",
    "west ham": "West Ham United F.C.",
    "aston villa": "Aston Villa F.C.",
    "everton": "Everton F.C.",
    "fulham": "Fulham F.C.",
    "brighton": "Brighton & Hove Albion F.C.",
    "wolverhampton": "Wolverhampton Wanderers F.C.",
    "leicester": "Leicester City F.C.",
    "nottingham forest": "Nottingham Forest F.C.",
    "crystal palace": "Crystal Palace F.C.",
    "brentford": "Brentford F.C.",
    "bournemouth": "AFC Bournemouth",
    "southampton": "Southampton F.C.",
    "ipswich town": "Ipswich Town F.C.",
    "real madrid": "Real Madrid CF",
    "barcelona": "FC Barcelona",
    "atletico madrid": "Atlético Madrid",
    "sevilla": "Sevilla FC",
    "valencia": "Valencia CF",
    "villarreal": "Villarreal CF",
    "real sociedad": "Real Sociedad",
    "real betis": "Real Betis",
    "girona": "Girona FC",
    "celta vigo": "RC Celta de Vigo",
    "osasuna": "CA Osasuna",
    "mallorca": "RCD Mallorca",
    "getafe": "Getafe CF",
    "rayo vallecano": "Rayo Vallecano",
    "juventus": "Juventus FC",
    "napoli": "SSC Napoli",
    "roma": "AS Roma",
    "lazio": "SS Lazio",
    "atalanta": "Atalanta BC",
    "fiorentina": "ACF Fiorentina",
    "bologna": "Bologna FC 1909",
    "torino": "Torino FC",
    "udinese": "Udinese Calcio",
    "genoa": "Genoa CFC",
    "monaco": "AS Monaco FC",
    "marseille": "Olympique de Marseille",
    "lyon": "Olympique Lyonnais",
    "lille": "Lille OSC",
    "nice": "OGC Nice",
    "rennes": "Stade Rennais F.C.",
    "lens": "RC Lens"
}

STOP_WORDS = {
    "fc", "sk", "jk", "cf", "ac", "as", "sc", "ss", "fk", "afc", "cfc", "sfc",
    "bk", "ik", "if", "nk", "gnk", "hnk", "ogc", "rc", "rcd", "cd", "ud", "sd",
    "ca", "se", "cr", "ec", "vfb", "vfl", "tsg", "sv", "fsv", "bsc", "hsv",
    "ksc", "msv", "rb", "spvgg", "1", "kulubu", "jimnastik", "futbol", "sportif",
    "associazione", "sportiva", "calcio", "1893", "1903", "1905", "1907"
}

USER_AGENT = "GeoGameSquadSync/4.0 (https://github.com/FurkanUymaz/GeoGame)"


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
    cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", str(player_name or ""))
    cleaned = normalize_text(cleaned).replace("-", " ").replace("'", " ").replace("’", " ")
    return re.sub(r"\s+", " ", cleaned).strip()


def clean_display_name(raw_name):
    cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", str(raw_name or "")).strip()
    return re.sub(r"\s+", " ", cleaned)


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


def build_club_lookups(db):
    all_club_lookup = {}
    target_clubs = []
    seen_target_keys = set()

    for code, info in db.get("countries", {}).items():
        upper_code = str(code).upper().strip()
        for club in info.get("clubs", []):
            key = normalize_club_key(club)
            if not key:
                continue
            if key not in all_club_lookup:
                all_club_lookup[key] = club
            if upper_code in TARGET_COUNTRY_CODES and key not in seen_target_keys:
                seen_target_keys.add(key)
                target_clubs.append(club)

    return all_club_lookup, target_clubs


def wiki_api_get(params, retries=3):
    params["format"] = "json"
    url = f"https://en.wikipedia.org/w/api.php?{urllib.parse.urlencode(params)}"
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code in {429, 500, 502, 503, 504} and attempt < retries - 1:
                time.sleep(1.2 * (attempt + 1))
                continue
            return {}
        except Exception:
            if attempt < retries - 1:
                time.sleep(1.2 * (attempt + 1))
                continue
            return {}
    return {}


def resolve_club_wiki_pages(target_clubs):
    club_to_title = {}
    unresolved = []

    for club in target_clubs:
        key = normalize_club_key(club)
        if key in WIKI_TITLE_OVERRIDES:
            club_to_title[club] = WIKI_TITLE_OVERRIDES[key]
        else:
            unresolved.append(club)

    candidate_to_club = {}
    all_candidates = []
    for club in unresolved:
        for cand in [club, f"{club} F.C.", f"{club} FC", f"{club} S.K.", f"{club} SK"]:
            if cand not in candidate_to_club:
                candidate_to_club[cand] = club
                all_candidates.append(cand)

    for idx in range(0, len(all_candidates), 45):
        batch = all_candidates[idx:idx + 45]
        data = wiki_api_get({
            "action": "query",
            "titles": "|".join(batch),
            "redirects": "1"
        })
        query_obj = data.get("query", {})
        norm_map = {item["from"]: item["to"] for item in query_obj.get("normalized", [])}
        redir_map = {item["from"]: item["to"] for item in query_obj.get("redirects", [])}
        existing_titles = {
            page["title"]
            for page in query_obj.get("pages", {}).values()
            if "missing" not in page and page.get("title")
        }

        for cand in batch:
            club = candidate_to_club[cand]
            if club in club_to_title:
                continue
            resolved = norm_map.get(cand, cand)
            for _ in range(5):
                if resolved in redir_map:
                    resolved = redir_map[resolved]
                else:
                    break
            if resolved in existing_titles:
                club_to_title[club] = resolved

    for club in unresolved:
        if club in club_to_title:
            continue
        search_data = wiki_api_get({
            "action": "query",
            "list": "search",
            "srsearch": f'"{club}" football club',
            "srlimit": "1"
        })
        hits = search_data.get("query", {}).get("search", [])
        if hits:
            club_to_title[club] = hits[0]["title"]

    return club_to_title


def extract_players_from_wikitext(wikitext):
    found = []
    seen = set()

    squad_tpl_pattern = re.compile(
        r"\{\{\s*(?:football squad player|fs player|nat fs player|football squad2 player|fs2 player)[^{}]*?\bname\s*=\s*(?:'{2,3})?\s*\[\[([^|\]]+)(?:\|([^\]]+))?\]\]",
        re.IGNORECASE | re.DOTALL
    )
    for match in squad_tpl_pattern.finditer(wikitext):
        wiki_title = match.group(1).strip()
        display = clean_display_name(match.group(2) or wiki_title)
        if wiki_title and display and wiki_title not in seen:
            seen.add(wiki_title)
            found.append((wiki_title, display))

    sortname_pattern = re.compile(
        r"\{\{\s*(?:football squad player|fs player|nat fs player|football squad2 player|fs2 player)[^{}]*?\bname\s*=\s*\{\{\s*sortname\s*\|\s*([^|{}]+)\|\s*([^|{}]+)(?:\|\s*([^|{}]+))?\}\}",
        re.IGNORECASE | re.DOTALL
    )
    for match in sortname_pattern.finditer(wikitext):
        first = match.group(1).strip()
        last = match.group(2).strip()
        target = (match.group(3) or f"{first} {last}").strip()
        display = clean_display_name(f"{first} {last}")
        if target and display and target not in seen:
            seen.add(target)
            found.append((target, display))

    if not found:
        flag_row_pattern = re.compile(
            r"\{\{\s*flagicon\s*\|[^}]+\}\}\s*(?:'{2,3})?\s*\[\[([^|\]]+)(?:\|([^\]]+))?\]\]",
            re.IGNORECASE
        )
        for match in flag_row_pattern.finditer(wikitext):
            wiki_title = match.group(1).strip()
            display = clean_display_name(match.group(2) or wiki_title)
            if wiki_title and display and ":" not in wiki_title and wiki_title not in seen:
                seen.add(wiki_title)
                found.append((wiki_title, display))

    return found


def fetch_club_current_squad(page_title):
    sec_data = wiki_api_get({
        "action": "parse",
        "page": page_title,
        "prop": "sections"
    })
    sections = sec_data.get("parse", {}).get("sections", [])
    target_indices = []

    for sec in sections:
        heading = normalize_text(re.sub(r"<[^>]+>", "", sec.get("line", "")))
        if heading in {
            "current squad",
            "first team squad",
            "first-team squad",
            "first team",
            "first-team",
            "senior squad",
            "squad",
            "players"
        }:
            target_indices.append(sec["index"])

    if not target_indices:
        for sec in sections:
            heading = normalize_text(re.sub(r"<[^>]+>", "", sec.get("line", "")))
            if "squad" in heading and "reserve" not in heading and "women" not in heading and "youth" not in heading:
                target_indices.append(sec["index"])

    players = []
    seen_titles = set()

    for sec_idx in target_indices[:2]:
        wt_data = wiki_api_get({
            "action": "parse",
            "page": page_title,
            "section": sec_idx,
            "prop": "wikitext"
        })
        wikitext = wt_data.get("parse", {}).get("wikitext", {}).get("*", "")
        for wiki_title, display in extract_players_from_wikitext(wikitext):
            if wiki_title not in seen_titles:
                seen_titles.add(wiki_title)
                players.append((wiki_title, display))
        if players:
            break

    return players


def fetch_infobox_clubs_for_new_players(wiki_titles, all_club_lookup):
    career_by_title = {}
    unique_titles = list(dict.fromkeys(wiki_titles))

    for idx in range(0, len(unique_titles), 40):
        batch = unique_titles[idx:idx + 40]
        data = wiki_api_get({
            "action": "query",
            "prop": "revisions",
            "rvprop": "content",
            "rvsection": "0",
            "redirects": "1",
            "titles": "|".join(batch)
        })
        query_obj = data.get("query", {})
        norm_map = {item["from"]: item["to"] for item in query_obj.get("normalized", [])}
        redir_map = {item["from"]: item["to"] for item in query_obj.get("redirects", [])}
        page_content = {}

        for page in query_obj.get("pages", {}).values():
            title = page.get("title")
            revs = page.get("revisions", [])
            if title and revs:
                page_content[title] = revs[0].get("*", "")

        for orig_title in batch:
            resolved = norm_map.get(orig_title, orig_title)
            for _ in range(5):
                if resolved in redir_map:
                    resolved = redir_map[resolved]
                else:
                    break
            wikitext = page_content.get(resolved, "")
            if not wikitext:
                continue

            matched_clubs = []
            seen_keys = set()
            for line in wikitext.splitlines():
                if not re.match(r"^\s*\|\s*clubs\d+\s*=", line):
                    continue
                val = line.split("=", 1)[1]
                links = re.findall(r"\[\[([^|\]]+)(?:\|([^\]]+))?\]\]", val)
                raw_names = [lbl or tgt for tgt, lbl in links] if links else [re.sub(r"[→\[\]{}']", "", val)]
                for raw_c in raw_names:
                    c_key = normalize_club_key(raw_c)
                    official = all_club_lookup.get(c_key)
                    if official and c_key not in seen_keys:
                        seen_keys.add(c_key)
                        matched_clubs.append(official)

            career_by_title[orig_title] = matched_clubs

    return career_by_title


def sync_transfers():
    data_path = Path("data.js")
    if not data_path.exists():
        raise FileNotFoundError("data.js not found in current directory")

    prefix, db = load_data_js(data_path)
    all_club_lookup, target_clubs = build_club_lookups(db)

    print(f"Resolving Wikipedia pages for {len(target_clubs)} clubs (Big 5 + Turkey)...")
    club_to_title = resolve_club_wiki_pages(target_clubs)
    print(f"Resolved {len(club_to_title)} club pages. Fetching current squads...")

    players_by_norm = {}
    for entry in db.get("players", []):
        norm_name = normalize_player_key(entry.get("name", ""))
        if norm_name:
            players_by_norm[norm_name] = entry

    squad_links = []
    new_player_titles = []

    total_clubs = len(club_to_title)
    for idx, (official_club, wiki_page) in enumerate(club_to_title.items(), start=1):
        squad = fetch_club_current_squad(wiki_page)
        for wiki_title, display_name in squad:
            squad_links.append((wiki_title, display_name, official_club))
            norm_disp = normalize_player_key(display_name)
            norm_wiki = normalize_player_key(wiki_title)
            if norm_disp not in players_by_norm and norm_wiki not in players_by_norm:
                new_player_titles.append(wiki_title)
        if idx % 15 == 0 or idx == total_clubs:
            print(f"Processed {idx}/{total_clubs} clubs ({len(squad_links)} squad slots scanned)...")

    print(f"Fetching career histories for {len(set(new_player_titles))} newly added players...")
    new_careers = fetch_infobox_clubs_for_new_players(new_player_titles, all_club_lookup)

    updated_existing = set()
    added_links = 0
    new_players_added = 0
    sample_updates = []

    for wiki_title, display_name, official_club in squad_links:
        norm_disp = normalize_player_key(display_name)
        norm_wiki = normalize_player_key(wiki_title)
        club_key = normalize_club_key(official_club)

        target_entry = players_by_norm.get(norm_disp) or players_by_norm.get(norm_wiki)
        if target_entry:
            existing_keys = {normalize_club_key(c) for c in target_entry["clubs"]}
            if club_key not in existing_keys:
                target_entry["clubs"].append(official_club)
                added_links += 1
                updated_existing.add(target_entry["name"])
                if len(sample_updates) < 15:
                    sample_updates.append(f"{target_entry['name']} -> {official_club}")
        else:
            career = list(new_careers.get(wiki_title, []))
            career_keys = {normalize_club_key(c) for c in career}
            if club_key not in career_keys:
                career.append(official_club)
            new_entry = {"name": display_name, "clubs": career}
            db["players"].append(new_entry)
            players_by_norm[norm_disp] = new_entry
            added_links += len(career)
            new_players_added += 1
            if len(sample_updates) < 15:
                sample_updates.append(f"{display_name} -> {official_club}")

    save_data_js(data_path, prefix, db)
    print(
        f"Sync complete. Added {added_links} club links "
        f"({len(updated_existing)} existing players updated, {new_players_added} new players added)."
    )
    if sample_updates:
        print("Sample updates:", ", ".join(sample_updates))


if __name__ == "__main__":
    sync_transfers()