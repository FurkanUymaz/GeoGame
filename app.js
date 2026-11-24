const state = {
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
    mapMarkers: {}
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
  
    for (let attempt = 0; attempt < 500; attempt++) {
      const pickedCols = shuffle(horizClubs).slice(0, 3);
      const pickedRows = shuffle(vertClubs).slice(0, 3);
  
      let allCellsValid = true;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (pickedRows[r] === pickedCols[c]) {
            allCellsValid = false;
            break;
          }
          const matches = getCommonPlayers(pickedRows[r], pickedCols[c]);
          if (matches.length === 0) {
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
  
  function initMap() {
    const map = L.map("world-map", {
      center: [32, 12],
      zoom: 2,
      minZoom: 2,
      maxZoom: 6
    });
  
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(map);
  
    Object.entries(FOOTBALL_DB.countries).forEach(([code, info]) => {
      const marker = L.circleMarker([info.lat, info.lng], {
        radius: 12,
        fillColor: "#10b981",
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(map);
  
      marker.bindTooltip(`<strong>${info.name}</strong><br>${info.league}`, {
        direction: "top"
      });
  
      marker.on("click", () => handleCountrySelect(code));
      state.mapMarkers[code] = marker;
    });
  }
  
  function updateMapStyles() {
    Object.entries(state.mapMarkers).forEach(([code, marker]) => {
      if (code === state.horizontalCountry) {
        marker.setStyle({ fillColor: "#38bdf8", radius: 15 });
      } else if (code === state.verticalCountry) {
        marker.setStyle({ fillColor: "#f59e0b", radius: 15 });
      } else {
        marker.setStyle({ fillColor: "#10b981", radius: 12 });
      }
    });
  
    const pillH = document.getElementById("pill-horizontal");
    const pillV = document.getElementById("pill-vertical");
  
    if (state.horizontalCountry) {
      const c = FOOTBALL_DB.countries[state.horizontalCountry];
      pillH.textContent = `Horizontal: ${c.name} (${c.league})`;
      pillH.className = "pill horizontal";
    } else {
      pillH.textContent = "Horizontal: None";
      pillH.className = "pill empty";
    }
  
    if (state.verticalCountry) {
      const c = FOOTBALL_DB.countries[state.verticalCountry];
      pillV.textContent = `Vertical: ${c.name} (${c.league})`;
      pillV.className = "pill vertical";
    } else {
      pillV.textContent = "Vertical: None";
      pillV.className = "pill empty";
    }
  }
  
  function handleCountrySelect(code) {
    if (!state.horizontalCountry) {
      state.horizontalCountry = code;
      updateMapStyles();
      setStatus(`Selected ${FOOTBALL_DB.countries[code].name} for Horizontal axis. Now select a country for Vertical axis.`);
      return;
    }
  
    if (!state.verticalCountry) {
      if (code === state.horizontalCountry) {
        setStatus("Please select a different country for the Vertical axis.");
        return;
      }
      state.verticalCountry = code;
      updateMapStyles();
      document.getElementById("btn-new-grid").disabled = false;
      startNewRound();
      return;
    }
  
    state.horizontalCountry = code;
    state.verticalCountry = null;
    updateMapStyles();
    document.getElementById("btn-new-grid").disabled = true;
    document.getElementById("grid-wrapper").classList.add("disabled");
    setStatus(`Reset selection. ${FOOTBALL_DB.countries[code].name} set to Horizontal. Pick Vertical country.`);
  }
  
  function startNewRound() {
    const grid = generateSolvableGrid(state.horizontalCountry, state.verticalCountry);
    if (!grid) {
      setStatus("Could not find enough overlapping players between these two leagues. Try another pair.");
      return;
    }
  
    state.colClubs = grid.cols;
    state.rowClubs = grid.rows;
    state.board = Array(3).fill(null).map(() => Array(3).fill(null));
    state.usedPlayers.clear();
    state.turn = "X";
    state.gameOver = false;
  
    const hLeague = FOOTBALL_DB.countries[state.horizontalCountry].league;
    const vLeague = FOOTBALL_DB.countries[state.verticalCountry].league;
  
    for (let i = 0; i < 3; i++) {
      document.getElementById(`col-${i}`).innerHTML = `${state.colClubs[i]}<span class="club-badge">${hLeague}</span>`;
      document.getElementById(`row-${i}`).innerHTML = `${state.rowClubs[i]}<span class="club-badge">${vLeague}</span>`;
    }
  
    document.querySelectorAll(".grid-cell").forEach((cell) => {
      cell.className = "grid-cell";
      cell.innerHTML = "";
    });
  
    document.getElementById("grid-wrapper").classList.remove("disabled");
    updateTurnUI();
    setStatus("Match started! Click any cell and name a player who played for both clubs.");
  }
  
  function updateTurnUI() {
    const banner = document.getElementById("turn-indicator");
    const cardX = document.getElementById("card-x");
    const cardO = document.getElementById("card-o");
  
    cardX.classList.remove("active-x");
    cardO.classList.remove("active-o");
  
    if (state.gameOver) {
      banner.className = "turn-banner";
      return;
    }
  
    if (state.turn === "X") {
      banner.textContent = "Player 1 (X) Turn";
      banner.className = "turn-banner turn-x";
      cardX.classList.add("active-x");
    } else {
      banner.textContent = "Player 2 (O) Turn";
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
      .slice(0, 7);
  
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
      feedback.textContent = "Player not found in database. Turn passes to opponent!";
      feedback.className = "modal-feedback error";
      setTimeout(() => {
        closeGuessModal();
        switchTurn("Unknown player! Turn passed.");
      }, 900);
      return;
    }
  
    if (state.usedPlayers.has(matchedPlayer.name)) {
      feedback.textContent = `${matchedPlayer.name} has already been used on this board!`;
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
        document.getElementById("turn-indicator").textContent = "Match Drawn!";
        setStatus("Board full! It's a draw. Click 'New Grid' to play again.");
      } else {
        switchTurn(`Correct! ${matchedPlayer.name} played for both clubs.`);
      }
    } else {
      feedback.textContent = `Wrong! ${matchedPlayer.name} did not play for both clubs. Turn lost!`;
      feedback.className = "modal-feedback error";
      setTimeout(() => {
        closeGuessModal();
        switchTurn(`Wrong guess (${matchedPlayer.name})! Turn passed.`);
      }, 1000);
    }
  }
  
  function switchTurn(prefixMsg) {
    state.turn = state.turn === "X" ? "O" : "X";
    updateTurnUI();
    setStatus(`${prefixMsg} Now Player ${state.turn === "X" ? "1 (X)" : "2 (O)"}'s turn.`);
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
  
    const banner = document.getElementById("turn-indicator");
    banner.textContent = `Player ${mark === "X" ? "1 (X)" : "2 (O)"} Wins!`;
    banner.className = "turn-banner";
    setStatus(`Victory for ${mark}! Click 'New Grid' for another round or pick new countries on the map.`);
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    initMap();
  
    document.querySelectorAll(".grid-cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        openGuessModal(r, c);
      });
    });
  
    document.getElementById("btn-new-grid").addEventListener("click", startNewRound);
  
    document.getElementById("btn-reset-map").addEventListener("click", () => {
      state.horizontalCountry = null;
      state.verticalCountry = null;
      state.gameOver = false;
      updateMapStyles();
      document.getElementById("btn-new-grid").disabled = true;
      document.getElementById("grid-wrapper").classList.add("disabled");
      setStatus("Selection cleared. Click two countries on the world map.");
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