const state = {
  players: {
    X: "Player 1",
    O: "Player 2"
  },
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
  `;
  document.head.appendChild(style);
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

const playerIndex = FOOTBALL_DB.players.map((p) => ({
  name: p.name,
  normalized: normalizeText(p.name),
  clubs: new Set(p.clubs)
}));

const pairCache = new Map();

function getCommonPlayers(clubA, clubB) {
  if (clubA === clubB) return [];
  const key = clubA < clubB ? `${clubA}|||${clubB}` : `${clubB}|||${clubA}`;
  if (pairCache.has(key)) {
    return pairCache.get(key);
  }
  const matches = playerIndex.filter((p) => p.clubs.has(clubA) && p.clubs.has(clubB));
  pairCache.set(key, matches);
  return matches;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateSolvableGrid(horizCode, vertCode) {
  const horizClubs = shuffle(FOOTBALL_DB.countries[horizCode].clubs);
  const vertClubs = shuffle(FOOTBALL_DB.countries[vertCode].clubs);

  const validRowsForCol = new Map();
  for (const hClub of horizClubs) {
    const validRows = vertClubs.filter((vClub) => getCommonPlayers(hClub, vClub).length > 0);
    if (validRows.length >= 3) {
      validRowsForCol.set(hClub, validRows);
    }
  }

  const candidateCols = horizClubs.filter((c) => validRowsForCol.has(c));
  if (candidateCols.length < 3) return null;

  const pickedCols = [];
  const rowCounts = new Map();

  function backtrack(startIdx) {
    if (pickedCols.length === 3) {
      const viableRows = vertClubs.filter((r) => (rowCounts.get(r) || 0) === 3);
      if (viableRows.length >= 3) {
        return {
          cols: [...pickedCols],
          rows: shuffle(viableRows).slice(0, 3)
        };
      }
      return null;
    }

    for (let i = startIdx; i <= candidateCols.length - (3 - pickedCols.length); i++) {
      const colClub = candidateCols[i];
      const rows = validRowsForCol.get(colClub);
      pickedCols.push(colClub);
      for (const r of rows) {
        rowCounts.set(r, (rowCounts.get(r) || 0) + 1);
      }

      const result = backtrack(i + 1);
      if (result) return result;

      pickedCols.pop();
      for (const r of rows) {
        rowCounts.set(r, rowCounts.get(r) - 1);
      }
    }
    return null;
  }

  return backtrack(0);
}

function showStage(stageName) {
  document.querySelectorAll(".stage").forEach((el) => el.classList.remove("active"));
  document.getElementById(`stage-${stageName}`).classList.add("active");

  const btnBackNames = document.getElementById("btn-back-names");
  const btnBackMap = document.getElementById("btn-back-map");
  const btnNewGrid = document.getElementById("btn-new-grid");

  btnBackNames.classList.add("hidden");
  btnBackMap.classList.add("hidden");
  btnNewGrid.classList.add("hidden");

  if (stageName === "map") {
    btnBackNames.classList.remove("hidden");
    renderCountrySidebar();
    syncCanvasResolution();
    state.mapView.needsRender = true;
    drawWorldMap();
  } else if (stageName === "game") {
    btnBackNames.classList.remove("hidden");
    btnBackMap.classList.remove("hidden");
    btnNewGrid.classList.remove("hidden");
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

      const isH = Boolean(state.horizontalCountry && feat.gameCodes.includes(state.horizontalCountry));
      const isV = Boolean(state.verticalCountry && feat.gameCodes.includes(state.verticalCountry));
      const isHover = Boolean(state.hoveredCountry && feat.gameCodes.includes(state.hoveredCountry));
      const hasLeague = feat.gameCodes.length > 0;

      ctx.beginPath();
      if (geom.type === "Polygon") {
        traceGeoPolygon(ctx, geom.coordinates, w, h);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach((poly) => traceGeoPolygon(ctx, poly, w, h));
      }

      if (isH) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.34)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.6;
      } else if (isV) {
        ctx.fillStyle = "rgba(245, 158, 11, 0.34)";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.6;
      } else if (isHover) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.32)";
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 1.5;
      } else if (hasLeague) {
        ctx.fillStyle = "#192842";
        ctx.strokeStyle = "#334b73";
        ctx.lineWidth = 1.05;
      } else {
        ctx.fillStyle = "#111b2e";
        ctx.strokeStyle = "#22324d";
        ctx.lineWidth = 0.85;
      }

      ctx.fill("evenodd");
      ctx.stroke();
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
      ctx.fillStyle = "#172338";
      ctx.fill();
      ctx.strokeStyle = "#33486b";
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

  const entries = Object.entries(FOOTBALL_DB.countries);
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
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let closestCode = null;
  let closestDist = 18;

  for (const [code, pt] of Object.entries(state.countryScreenCoords)) {
    const dist = Math.hypot(x - pt.x, y - pt.y);
    if (dist <= closestDist) {
      closestDist = dist;
      closestCode = code;
    }
  }
  return closestCode;
}

function toggleCountrySelection(code) {
  if (!code || !FOOTBALL_DB.countries[code]) return;

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
  const sortedEntries = Object.entries(FOOTBALL_DB.countries).sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  );

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

  document.getElementById("meta-horizontal").textContent = `Horizontal: ${hCountry.name} (${hCountry.league})`;
  document.getElementById("meta-vertical").textContent = `Vertical: ${vCountry.name} (${vCountry.league})`;

  const grid = generateSolvableGrid(state.horizontal