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
    countryScreenCoords: {}
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
  
    for (let attempt = 0; attempt < 900; attempt++) {
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
      drawWorldMap();
    } else if (stageName === "game") {
      btnBackNames.classList.remove("hidden");
      btnBackMap.classList.remove("hidden");
      btnNewGrid.classList.remove("hidden");
    }
  
    updateTurnBanner();
  }
  
  function latLngToCanvas(lat, lng, width, height) {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  }
  
  function drawWorldMap() {
    const canvas = document.getElementById("world-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
  
    ctx.clearRect(0, 0, w, h);
  
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#071021");
    bgGrad.addColorStop(1, "#0b1930");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
  
    ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
    ctx.lineWidth = 1;
    for (let lon = -150; lon <= 180; lon += 30) {
      const p1 = latLngToCanvas(90, lon, w, h);
      const p2 = latLngToCanvas(-90, lon, w, h);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const p1 = latLngToCanvas(lat, -180, w, h);
      const p2 = latLngToCanvas(lat, 180, w, h);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  
    FOOTBALL_DB.continents.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lng, lat], idx) => {
        const pt = latLngToCanvas(lat, lng, w, h);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.strokeStyle = "#3b4d6b";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  
    Object.entries(FOOTBALL_DB.countries).forEach(([code, info]) => {
      const pt = latLngToCanvas(info.lat, info.lng, w, h);
      state.countryScreenCoords[code] = pt;
  
      let fillColor = "#10b981";
      let radius = 8;
  
      if (code === state.horizontalCountry) {
        fillColor = "#38bdf8";
        radius = 11;
      } else if (code === state.verticalCountry) {
        fillColor = "#f59e0b";
        radius = 11;
      } else if (state.hoveredCountry === code) {
        radius = 10;
      }
  
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = `${fillColor}33`;
      ctx.fill();
  
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f8fafc";
      ctx.stroke();
  
      ctx.font = "700 11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(info.name, pt.x, pt.y - radius - 8);
    });
  }
  
  function getHoveredCountryCode(clientX, clientY) {
    const canvas = document.getElementById("world-canvas");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
  
    for (const [code, pt] of Object.entries(state.countryScreenCoords)) {
      const dx = x - pt.x;
      const dy = y - pt.y;
      if (Math.hypot(dx, dy) <= 16) {
        return code;
      }
    }
    return null;
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
      inst.textContent = "Click a highlighted country for the Horizontal axis.";
      btnEnter.disabled = true;
    } else if (!state.verticalCountry) {
      inst.textContent = "Now click a second country for the Vertical axis.";
      btnEnter.disabled = true;
    } else {
      inst.textContent = "Both countries selected. Click 'Start Match' to open the board.";
      btnEnter.disabled = false;
    }
  
    drawWorldMap();
  }
  
  function handleMapClick(e) {
    const code = getHoveredCountryCode(e.clientX, e.clientY);
    if (!code) return;
  
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
  
  function startNewRound() {
    if (!state.horizontalCountry || !state.verticalCountry) return;
  
    const grid = generateSolvableGrid(state.horizontalCountry, state.verticalCountry);
    if (!grid) {
      setStatus("No full 3x3 solvable intersection found for this pair. Try 'New Grid' or another country pair.");
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
    setStatus(`${state.players.X} (X) starts. Pick an intersection cell.`);
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
      banner.textContent = "World Map Selection";
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
      feedback.textContent = "Player not in database. Turn passes!";
      feedback.className = "modal-feedback error";
      setTimeout(() => {
        closeGuessModal();
        switchTurn("Player not found. Turn passed.");
      }, 850);
      return;
    }
  
    if (state.usedPlayers.has(matchedPlayer.name)) {
      feedback.textContent = `${matchedPlayer.name} is already placed on the board.`;
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
        document.getElementById("turn-indicator").textContent = "Draw Game";
        setStatus("All cells filled. Match drawn!");
      } else {
        switchTurn(`Valid! ${matchedPlayer.name} played for both clubs.`);
      }
    } else {
      feedback.textContent = `Invalid match for ${matchedPlayer.name}. Turn lost!`;
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
    setStatus(`${prefixMsg} ${nextName} (${state.turn}) to play.`);
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
    setStatus(`${winnerName} completed three in a row! Click 'New Grid' to play again.`);
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    drawWorldMap();
  
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
  
    canvas.addEventListener("mousemove", (e) => {
      const code = getHoveredCountryCode(e.clientX, e.clientY);
      if (code !== state.hoveredCountry) {
        state.hoveredCountry = code;
        drawWorldMap();
      }
      if (code) {
        const info = FOOTBALL_DB.countries[code];
        tooltip.innerHTML = `<strong>${info.name}</strong><br>${info.league}`;
        tooltip.style.left = `${e.clientX + 14}px`;
        tooltip.style.top = `${e.clientY + 14}px`;
        tooltip.classList.remove("hidden");
      } else {
        tooltip.classList.add("hidden");
      }
    });
  
    canvas.addEventListener("mouseleave", () => {
      state.hoveredCountry = null;
      tooltip.classList.add("hidden");
      drawWorldMap();
    });
  
    canvas.addEventListener("click", handleMapClick);
  
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