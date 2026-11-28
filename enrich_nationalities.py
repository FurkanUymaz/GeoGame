import csv
import json
import re
import unicodedata
from pathlib import Path

COUNTRY_TO_ISO3 = {
    "turkey": "TUR",
    "turkiye": "TUR",
    "spain": "ESP",
    "germany": "GER",
    "france": "FRA",
    "italy": "ITA",
    "england": "ENG",
    "scotland": "SCO",
    "wales": "WAL",
    "northern ireland": "NIR",
    "united kingdom": "GBR",
    "brazil": "BRA",
    "argentina": "ARG",
    "portugal": "POR",
    "netherlands": "NED",
    "belgium": "BEL",
    "croatia": "CRO",
    "serbia": "SRB",
    "switzerland": "SUI",
    "austria": "AUT",
    "poland": "POL",
    "denmark": "DEN",
    "sweden": "SWE",
    "norway": "NOR",
    "finland": "FIN",
    "iceland": "ISL",
    "czech republic": "CZE",
    "czechia": "CZE",
    "slovakia": "SVK",
    "slovenia": "SVN",
    "hungary": "HUN",
    "romania": "ROU",
    "bulgaria": "BUL",
    "greece": "GRE",
    "ukraine": "UKR",
    "russia": "RUS",
    "belarus": "BLR",
    "georgia": "GEO",
    "armenia": "ARM",
    "azerbaijan": "AZE",
    "kazakhstan": "KAZ",
    "uzbekistan": "UZB",
    "bosnia-herzegovina": "BIH",
    "bosnia and herzegovina": "BIH",
    "north macedonia": "MKD",
    "macedonia": "MKD",
    "albania": "ALB",
    "kosovo": "KVX",
    "montenegro": "MNE",
    "ireland": "IRL",
    "republic of ireland": "IRL",
    "luxembourg": "LUX",
    "cyprus": "CYP",
    "malta": "MLT",
    "israel": "ISR",
    "estonia": "EST",
    "latvia": "LVA",
    "lithuania": "LTU",
    "moldova": "MDA",
    "uruguay": "URU",
    "colombia": "COL",
    "chile": "CHI",
    "peru": "PER",
    "ecuador": "ECU",
    "venezuela": "VEN",
    "paraguay": "PAR",
    "bolivia": "BOL",
    "mexico": "MEX",
    "united states": "USA",
    "canada": "CAN",
    "costa rica": "CRC",
    "panama": "PAN",
    "honduras": "HON",
    "jamaica": "JAM",
    "trinidad and tobago": "TRI",
    "haiti": "HAI",
    "curacao": "CUW",
    "suriname": "SUR",
    "guatemala": "GUA",
    "el salvador": "SLV",
    "nicaragua": "NCA",
    "dominican republic": "DOM",
    "cuba": "CUB",
    "morocco": "MAR",
    "algeria": "ALG",
    "tunisia": "TUN",
    "egypt": "EGY",
    "libya": "LBY",
    "senegal": "SEN",
    "nigeria": "NGA",
    "cameroon": "CMR",
    "ghana": "GHA",
    "cote d'ivoire": "CIV",
    "ivory coast": "CIV",
    "mali": "MLI",
    "burkina faso": "BFA",
    "guinea": "GUI",
    "guinea-bissau": "GNB",
    "equatorial guinea": "EQG",
    "dr congo": "COD",
    "democratic republic of the congo": "COD",
    "congo": "CGO",
    "republic of the congo": "CGO",
    "gabon": "GAB",
    "angola": "ANG",
    "zambia": "ZAM",
    "zimbabwe": "ZIM",
    "south africa": "RSA",
    "cape verde": "CPV",
    "cabo verde": "CPV",
    "gambia": "GAM",
    "the gambia": "GAM",
    "togo": "TOG",
    "benin": "BEN",
    "niger": "NIG",
    "mauritania": "MTN",
    "sierra leone": "SLE",
    "liberia": "LBR",
    "madagascar": "MAD",
    "comoros": "COM",
    "mozambique": "MOZ",
    "uganda": "UGA",
    "kenya": "KEN",
    "tanzania": "TAN",
    "burundi": "BDI",
    "rwanda": "RWA",
    "central african republic": "CTA",
    "chad": "CHA",
    "sudan": "SDN",
    "south sudan": "SSD",
    "ethiopia": "ETH",
    "eritrea": "ERI",
    "somalia": "SOM",
    "namibia": "NAM",
    "botswana": "BOT",
    "malawi": "MWI",
    "mauritius": "MRI",
    "seychelles": "SEY",
    "sao tome and principe": "STP",
    "japan": "JPN",
    "korea, south": "KOR",
    "south korea": "KOR",
    "korea, north": "PRK",
    "north korea": "PRK",
    "china": "CHN",
    "iran": "IRN",
    "iraq": "IRQ",
    "saudi arabia": "KSA",
    "united arab emirates": "UAE",
    "qatar": "QAT",
    "kuwait": "KUW",
    "bahrain": "BHR",
    "oman": "OMA",
    "jordan": "JOR",
    "syria": "SYR",
    "lebanon": "LBN",
    "palestine": "PLE",
    "yemen": "YEM",
    "australia": "AUS",
    "new zealand": "NZL",
    "india": "IND",
    "thailand": "THA",
    "vietnam": "VIE",
    "indonesia": "IDN",
    "malaysia": "MAS",
    "singapore": "SGP",
    "philippines": "PHI",
    "tajikistan": "TJK",
    "turkmenistan": "TKM",
    "kyrgyzstan": "KGZ",
    "afghanistan": "AFG",
    "pakistan": "PAK",
    "bangladesh": "BAN",
    "sri lanka": "SRI",
    "nepal": "NEP",
    "hong kong": "HKG",
    "chinese taipei": "TPE",
    "taiwan": "TPE",
    "guam": "GUM",
    "fiji": "FIJ",
    "papua new guinea": "PNG",
    "new caledonia": "NCL",
    "tahiti": "TAH",
}


def normalize_text(value: str) -> str:
    nfkd = unicodedata.normalize("NFKD", value or "")
    ascii_only = "".join(ch for ch in nfkd if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", ascii_only).strip().lower()


def map_country_to_code(raw_country: str) -> str:
    cleaned = normalize_text(raw_country)
    if not cleaned:
        return ""
    if cleaned in COUNTRY_TO_ISO3:
        return COUNTRY_TO_ISO3[cleaned]
    return raw_country.strip().upper()


def load_citizenships_from_csv(csv_path: Path) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    by_id: dict[str, set[str]] = {}
    by_name: dict[str, set[str]] = {}

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            raw_citizenship = (row.get("country_of_citizenship") or "").strip()
            if not raw_citizenship:
                raw_citizenship = (row.get("country_of_birth") or "").strip()

            codes = set()
            for part in re.split(r"[,;/|]", raw_citizenship):
                code = map_country_to_code(part)
                if code:
                    codes.add(code)

            if not codes:
                continue

            pid = (row.get("player_id") or "").strip()
            if pid:
                by_id.setdefault(pid, set()).update(codes)

            full_name = (row.get("name") or "").strip()
            if not full_name:
                first = (row.get("first_name") or "").strip()
                last = (row.get("last_name") or "").strip()
                full_name = f"{first} {last}".strip()

            norm_name = normalize_text(full_name)
            if norm_name:
                by_name.setdefault(norm_name, set()).update(codes)

    return by_id, by_name


def find_balanced_array(source: str, start_bracket_idx: int) -> int:
    depth = 0
    in_string = False
    quote_char = ""
    escaped = False
    for idx in range(start_bracket_idx, len(source)):
        ch = source[idx]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote_char:
                in_string = False
        else:
            if ch in ('"', "'"):
                in_string = True
                quote_char = ch
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    return idx
    raise ValueError("Unbalanced array brackets in data.js")


def js_to_json_text(raw_js: str) -> str:
    out = []
    i = 0
    n = len(raw_js)
    in_string = False
    quote_char = ""

    while i < n:
        ch = raw_js[i]
        if in_string:
            if ch == "\\":
                if i + 1 < n:
                    nxt = raw_js[i + 1]
                    if quote_char == "'" and nxt == "'":
                        out.append("'")
                    elif quote_char == "'" and nxt == '"':
                        out.append('\\"')
                    else:
                        out.append(ch + nxt)
                    i += 2
                    continue
            if ch == quote_char:
                in_string = False
                out.append('"')
            elif quote_char == "'" and ch == '"':
                out.append('\\"')
            else:
                out.append(ch)
            i += 1
        else:
            if ch == "/" and i + 1 < n and raw_js[i + 1] == "/":
                while i < n and raw_js[i] != "\n":
                    i += 1
                continue
            if ch == "/" and i + 1 < n and raw_js[i + 1] == "*":
                i += 2
                while i + 1 < n and not (raw_js[i] == "*" and raw_js[i + 1] == "/"):
                    i += 1
                i += 2
                continue
            if ch in ('"', "'"):
                in_string = True
                quote_char = ch
                out.append('"')
                i += 1
            else:
                out.append(ch)
                i += 1

    normalized = "".join(out)
    normalized = re.sub(r'([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:', r'\1"\2":', normalized)
    normalized = re.sub(r",\s*([\]}])", r"\1", normalized)
    return normalized


def locate_players_array(content: str) -> tuple[int, int, list[dict]]:
    for match in re.finditer(r"\[", content):
        start_idx = match.start()
        try:
            end_idx = find_balanced_array(content, start_idx)
        except ValueError:
            continue
        snippet = content[start_idx : end_idx + 1]
        if "clubs" not in snippet or "name" not in snippet:
            continue
        try:
            parsed = json.loads(js_to_json_text(snippet))
        except Exception:
            continue
        if (
            isinstance(parsed, list)
            and len(parsed) > 0
            and all(isinstance(item, dict) and "name" in item and "clubs" in item for item in parsed)
        ):
            return start_idx, end_idx, parsed
    raise ValueError("Could not locate players array in data.js")


def serialize_players(players: list[dict]) -> str:
    lines = ["["]
    for idx, player in enumerate(players):
        comma = "," if idx < len(players) - 1 else ""
        ordered = {}
        for k, v in player.items():
            if k == "clubs":
                ordered["nationalities"] = player.get("nationalities", [])
            if k != "nationalities":
                ordered[k] = v
        if "nationalities" not in ordered:
            ordered["nationalities"] = player.get("nationalities", [])
        lines.append(f"  {json.dumps(ordered, ensure_ascii=False)}{comma}")
    lines.append("]")
    return "\n".join(lines)


def main() -> None:
    csv_path = Path("players.csv")
    data_path = Path("data.js")
    if not csv_path.exists():
        raise FileNotFoundError("players.csv not found")
    if not data_path.exists():
        raise FileNotFoundError("data.js not found")

    by_id, by_name = load_citizenships_from_csv(csv_path)
    content = data_path.read_text(encoding="utf-8")
    array_start, array_end, players = locate_players_array(content)

    matched_count = 0
    for player in players:
        existing = set(player.get("nationalities", []))
        pid = str(player.get("id") or player.get("player_id") or "").strip()
        fetched = set()
        if pid and pid in by_id:
            fetched.update(by_id[pid])
        else:
            norm_name = normalize_text(player.get("name", ""))
            if norm_name in by_name:
                fetched.update(by_name[norm_name])
        merged = sorted(existing | fetched)
        player["nationalities"] = merged
        if merged:
            matched_count += 1

    updated_array = serialize_players(players)
    updated_content = content[:array_start] + updated_array + content[array_end + 1 :]
    data_path.write_text(updated_content, encoding="utf-8")

    print(f"Completed in offline mode. Matched {matched_count}/{len(players)} players.")


if __name__ == "__main__":
    main()