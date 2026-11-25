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
  mapView: {
    zoom: 1,
    targetZoom: 1,
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    minZoom: 1,
    maxZoom: 7.5,
    isDragging: false,
    hasMoved: false,
    dragStartX: 0,
    dragStartY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    activeRegion: "world",
    pulsePhase: 0
  }
};

const REGION_PRESETS = {
  world: { lat: 20, lng: 10, zoom: 1.0 },
  europe: { lat: 48.5, lng: 13.0, zoom: 3.4 },
  americas: { lat: -5.0, lng: -68.0, zoom: 1.85 },
  asia: { lat: 12.0, lng: 112.0, zoom: 2.15 }
};

const normalizeText = (str) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
};

const playerIndex = FOOTBALL_DB.players.map((p) => ({
  name: p.name,
  normalized: normalizeText(p.name),
  clubs: new Set(p.clubs)
}));

function getCommonPlayers(clubA, clubB) {
  return playerIndex.filter((p) => p.clubs.has(clubA) && p.clubs.has(clubB));
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
  const horizClubs = FOOTBALL_DB.countries[horizCode].clubs;
  const vertClubs = FOOTBALL_DB.countries[vertCode].clubs;

  for (let attempt = 0; attempt < 1500; attempt++) {
    const pickedCols = shuffle(horizClubs).slice(0, 3);
    const pickedRows = shuffle(vertClubs).slice(0, 3);

    let allCellsValid = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (pickedRows[r] === pickedCols[c]) {
          allCellsValid = false;
          break;
        }
        if (getCommonPlayers(pickedRows[r], pickedCols[c]).length === 0) {
          allCellsValid = false;
          break;
        }
      }
      if (!allCellsValid) break;
    }

    if (allCellsValid) {
      return { cols: pickedCols, rows: pickedRows };
    }
  }
  return null;
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
    drawWorldMap();
  } else if (stageName === "game") {
    btnBackNames.classList.remove("hidden");
    btnBackMap.classList.remove("hidden");
    btnNewGrid.classList.remove("hidden");
  }

  updateTurnBanner();
}

function latLngToBase(lat, lng, width, height) {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
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
  const w = canvas.width;
  const h = canvas.height;
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

  updateZoomBadge();
  updateRegionButtons("");
}

function focusOnCoords(lat, lng, targetZoom) {
  const canvas = document.getElementById("world-canvas");
  if (!canvas) return;
  const w = canvas.width;
  const h = canvas.height;
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

function drawRoundedLabel(ctx, text, x, y, bgColor, borderColor, textColor) {
  ctx.font = "700 11px -apple-system, BlinkMacSystemFont, sans-serif";
  const metrics = ctx.measureText(text);
  const padX = 7;
  const boxW = metrics.width + padX * 2;
  const boxH = 19;
  const rx = x - boxW * 0.5;
  const ry = y - boxH * 0.5;
  const radius = 5;

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
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const z = state.mapView.zoom;

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
    const p1 = projectPoint(90, lon, w, h);
    const p2 = projectPoint(-90, lon, w, h);
    ctx.strokeStyle = lon === 0 ? "rgba(56, 189, 248, 0.14)" : "rgba(148, 163, 184, 0.08)";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 75; lat += gridStep) {
    const p1 = projectPoint(lat, -180, w, h);
    const p2 = projectPoint(lat, 180, w, h);
    ctx.strokeStyle = lat === 0 ? "rgba(16, 185, 129, 0.16)" : "rgba(148, 163, 184, 0.08)";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  if (Array.isArray(FOOTBALL_DB.continents)) {
    FOOTBALL_DB.continents.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lng, lat], idx) => {
        const pt = projectPoint(lat, lng, w, h);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#172338";
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "#33486b";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });
  }

  if (state.horizontalCountry && state.verticalCountry) {
    const hInfo = FOOTBALL_DB.countries[state.horizontalCountry];
    const vInfo = FOOTBALL_DB.countries[state.verticalCountry];
    const pH = projectPoint(hInfo.lat, hInfo.lng, w, h);
    const pV = projectPoint(vInfo.lat, vInfo.lng, w, h);

    const midX = (pH.x + pV.x) * 0.5;
    const midY = (pH.y + pV.y) * 0.5 - Math.min(90, Math.hypot(pV.x - pH.x, pV.y - pH.y) * 0.25);

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
  const placedLabels = [];

  entries.sort(([codeA], [codeB]) => {
    const score = (c) => {
      if (c === state.hoveredCountry) return 4;
      if (c === state.horizontalCountry || c === state.verticalCountry) return 3;
      return 1;
    };
    return score(codeA) - score(codeB);
  });

  entries.forEach(([code, info]) => {
    const pt = projectPoint(info.lat, info.lng, w, h);
    state.countryScreenCoords[code] = pt;

    const isH = code === state.horizontalCountry;
    const isV = code === state.verticalCountry;
    const isHover = code === state.hoveredCountry;

    let fillColor = "#10b981";
    let baseRadius = Math.min(9.5, 6.2 + (z - 1) * 0.8);

    if (isH) {
      fillColor = "#38bdf8";
      baseRadius += 3;
    } else if (isV) {
      fillColor = "#f59e0b";
      baseRadius += 3;
    } else if (isHover) {
      fillColor = "#34d399";
      baseRadius += 2.2;
    }

    const pulse = (isH || isV || isHover) ? Math.sin(state.mapView.pulsePhase * 4) * 3.5 : 0;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseRadius + 6 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = isH
      ? "rgba(56, 189, 248, 0.22)"
      : isV
        ? "rgba(245, 158, 11, 0.22)"
        : isHover
          ? "rgba(52, 211, 153, 0.28)"
          : "rgba(16, 185, 129, 0.16)";
    ctx.fill();

    if (isH || isV) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, baseRadius + 10 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = isH ? "rgba(56, 189, 248, 0.55)" : "rgba(245, 158, 11, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f8fafc";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, baseRadius * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = "#06101f";
    ctx.fill();

    const labelY = pt.y - baseRadius - 14;
    const labelText = isH ? `H · ${info.name}` : isV ? `V · ${info.name}` : info.name;
    const estWidth = labelText.length * 6.5 + 14;
    const estHeight = 20;

    const overlaps = placedLabels.some(
      (box) => Math.abs(box.x - pt.x) < (box.w + estWidth) * 0.52 && Math.abs(box.y - labelY) < estHeight
    );

    if (isH || isV || isHover || z >= 2.2 || !overlaps) {
      placedLabels.push({ x: pt.x, y: labelY, w: estWidth });
      const bg = isH
        ? "rgba(8, 47, 73, 0.92)"
        : isV
          ? "rgba(69, 26, 3, 0.92)"
          : isHover
            ? "rgba(6, 78, 59, 0.95)"
            : "rgba(9, 14, 26, 0.84)";
      const border = isH ? "#38bdf8" : isV ? "#f59e0b" : isHover ? "#34d399" : "rgba(148, 163, 184, 0.3)";
      const txtCol = isH ? "#bae6fd" : isV ? "#fde68a" : "#f1f5f9";
      drawRoundedLabel(ctx, labelText, pt.x, labelY, bg, border, txtCol);
    }
  });
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

    if (Math.abs(dz) > 0.0005 || Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      mv.zoom += dz * lerp;
      mv.offsetX += dx * lerp;
      mv.offsetY += dy * lerp;
    } else {
      mv.zoom = mv.targetZoom;
      mv.offsetX = mv.targetOffsetX;
      mv.offsetY = mv.targetOffsetY;
    }

    drawWorldMap();
  }

  requestAnimationFrame(animateMapLoop);
}

function getHoveredCountryCode(clientX, clientY) {
  const canvas = document.getElementById("world-canvas");
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  let closestCode = null;
  let closestDist = 20;

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
    });

    li.addEventListener("mouseleave", () => {
      if (state.hoveredCountry === code) {
        state.hoveredCountry = null;
      }
    });

    li.addEventListener("click", () => {
      toggleCountrySelection(code);
      focusOnCoords(info.lat, info.lng, Math.max(state.mapView.targetZoom, 2.4));
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
    pillH.textContent = `Horizontal: ${h.name} (${h.league})`;
    pillH.className = "pill horizontal";
  } else {
    pillH.textContent = "Horizontal: None";
    pillH.className = "pill empty";
  }

  if (state.verticalCountry) {
    const v = FOOTBALL_DB.countries[state.verticalCountry];
    pillV.textContent = `Vertical: ${v.name} (${v.league})`;
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

  const grid = generateSolvableGrid(state.horizontalCountry, state.verticalCountry);
  if (!grid) {
    setStatus("No full 3x3 solvable intersection found for this pair. Try another country pair or New Grid.");
    return;
  }

  state.colClubs = grid.cols;
  state.rowClubs = grid.rows;
  state.board = Array(3).fill(null).map(() => Array(3).fill(null));
  state.usedPlayers.clear();
  state.turn = "X";
  state.gameOver = false;

  const hCountry = FOOTBALL_DB.countries[state.horizontalCountry];
  const vCountry = FOOTBALL_DB.countries[state.verticalCountry];

  document.getElementById("meta-horizontal").textContent = `Horizontal: ${hCountry.name} (${hCountry.league})`;
  document.getElementById("meta-vertical").textContent = `Vertical: ${vCountry.name} (${vCountry.league})`;

  for (let i = 0; i < 3; i++) {
    document.getElementById(`col-${i}`).innerHTML = `${state.colClubs[i]}<span class="club-badge">${hCountry.league}</span>`;
    document.getElementById(`row-${i}`).innerHTML = `${state.rowClubs[i]}<span class="club-badge">${vCountry.league}</span>`;
  }

  document.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.className = "grid-cell";
    cell.innerHTML = "";
  });

  updateTurnBanner();
  setStatus(`${state.players.X} (X) starts. Pick a cell.`);
}

function updateTurnBanner() {
  const banner = document.getElementById("turn-indicator");
  const cardX = document.getElementById("card-x");
  const cardO = document.getElementById("card-o");

  cardX.classList.remove("active-x");
  cardO.classList.remove("active-o");

  const activeStage = document.querySelector(".stage.active");
  if (!activeStage || activeStage.id === "stage-players") {
    banner.textContent = "Enter Player Names";
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

function openGuessModal(r, c) {
  if (state.gameOver || state.board[r][c] !== null) return;
  state.activeCell = { r, c };

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
}

function handleAutocomplete() {
  const input = document.getElementById("player-input");
  const list = document.getElementById("autocomplete-list");
  const query = normalizeText(input.value);
  list.innerHTML = "";

  if (query.length < 2) return;

  const matches = playerIndex
    .filter((p) => p.normalized.includes(query))
    .slice(0, 8);

  matches.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.name;
    li.addEventListener("click", () => {
      input.value = p.name;
      list.innerHTML = "";
      submitGuess();
    });
    list.appendChild(li);
  });
}

function submitGuess() {
  if (!state.activeCell) return;
  const { r, c } = state.activeCell;
  const rawInput = document.getElementById("player-input").value;
  const normalizedGuess = normalizeText(rawInput);
  const feedback = document.getElementById("modal-feedback");

  if (!normalizedGuess) return;

  const matchedPlayer = playerIndex.find((p) => p.normalized === normalizedGuess);

  if (!matchedPlayer) {
    feedback.textContent = "Player not found. Turn passes!";
    feedback.className = "modal-feedback error";
    setTimeout(() => {
      closeGuessModal();
      switchTurn("Player not found. Turn passed.");
    }, 850);
    return;
  }

  if (state.usedPlayers.has(matchedPlayer.name)) {
    feedback.textContent = `${matchedPlayer.name} already used.`;
    feedback.className = "modal-feedback error";
    return;
  }

  const rowClub = state.rowClubs[r];
  const colClub = state.colClubs[c];

  if (matchedPlayer.clubs.has(rowClub) && matchedPlayer.clubs.has(colClub)) {
    state.board[r][c] = { mark: state.turn, player: matchedPlayer.name };
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
      setStatus("Board full. Match drawn!");
    } else {
      switchTurn(`Valid! ${matchedPlayer.name} played for both clubs.`);
    }
  } else {
    feedback.textContent = `${matchedPlayer.name} did not play for both clubs. Turn lost!`;
    feedback.className = "modal-feedback error";
    setTimeout(() => {
      closeGuessModal();
      switchTurn(`Invalid guess (${matchedPlayer.name}). Turn passed.`);
    }, 950);
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

  const winnerName = mark === "X" ? state.players.X : state.players.O;
  const banner = document.getElementById("turn-indicator");
  banner.textContent = `${winnerName} (${mark}) Wins!`;
  banner.className = "turn-banner";
  setStatus(`${winnerName} won the round!`);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCountrySidebar();
  drawWorldMap();
  requestAnimationFrame(animateMapLoop);

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
    showStage("map");
    updateCountrySelectionUI();
  });

  document.getElementById("btn-clear-countries").addEventListener("click", () => {
    state.horizontalCountry = null;
    state.verticalCountry = null;
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
    setMapZoomAt(mv.targetZoom * 1.4, canvas.width * 0.5, canvas.height * 0.5, true);
  });

  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    setMapZoomAt(mv.targetZoom / 1.4, canvas.width * 0.5, canvas.height * 0.5, true);
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pivotX = (e.clientX - rect.left) * scaleX;
    const pivotY = (e.clientY - rect.top) * scaleY;
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    setMapZoomAt(mv.targetZoom * factor, pivotX, pivotY, true);
  }, { passive: false });

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

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const rawOx = mv.startOffsetX + dxScreen * scaleX;
    const rawOy = mv.startOffsetY + dyScreen * scaleY;
    const clamped = clampMapOffsets(rawOx, rawOy, mv.targetZoom, canvas.width, canvas.height);

    mv.targetOffsetX = clamped.x;
    mv.targetOffsetY = clamped.y;
    mv.offsetX = clamped.x;
    mv.offsetY = clamped.y;
    updateRegionButtons("");
  });

  window.addEventListener("mouseup", () => {
    if (!mv.isDragging) return;
    mv.isDragging = false;
    canvas.classList.remove("dragging");
  });

  canvas.addEventListener("mousemove", (e) => {
    if (mv.isDragging) {
      tooltip.classList.add("hidden");
      return;
    }

    const code = getHoveredCountryCode(e.clientX, e.clientY);
    state.hoveredCountry = code;
    canvas.classList.toggle("hovering-pin", Boolean(code));

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
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
      tooltip.classList.remove("hidden");
    } else {
      tooltip.classList.add("hidden");
    }
  });

  canvas.addEventListener("mouseleave", () => {
    state.hoveredCountry = null;
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
    if (e.key === "Enter") submitGuess();
    if (e.key === "Escape") closeGuessModal();
  });
  document.getElementById("btn-submit-guess").addEventListener("click", submitGuess);
});