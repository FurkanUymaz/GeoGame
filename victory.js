(function () {
    const WIN_LINES = [
      [[0, 0], [0, 1], [0, 2]],
      [[1, 0], [1, 1], [1, 2]],
      [[2, 0], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1]],
      [[0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 1], [2, 2]],
      [[0, 2], [1, 1], [2, 0]]
    ];
  
    const VICTORY_CSS = `
      .tic-tac-grid {
        position: relative;
      }
  
      .grid-strike-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 25;
        overflow: visible;
      }
  
      .strike-path-glow {
        fill: none;
        stroke-width: 14;
        stroke-linecap: round;
        opacity: 0.34;
      }
  
      .strike-path-main {
        fill: none;
        stroke-width: 5.5;
        stroke-linecap: round;
        stroke-dasharray: 1200;
        stroke-dashoffset: 1200;
        animation: atlasStrikeDraw 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
  
      .strike-path-secondary {
        fill: none;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-dasharray: 1200;
        stroke-dashoffset: 1200;
        opacity: 0.85;
        animation: atlasStrikeDraw 0.72s 0.08s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
  
      @keyframes atlasStrikeDraw {
        to {
          stroke-dashoffset: 0;
        }
      }
  
      .grid-cell.winner-pop {
        animation: atlasWinnerCellPop 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        z-index: 10;
      }
  
      .grid-cell.winner-pop.claimed-x {
        box-shadow: 0 0 28px rgba(56, 189, 248, 0.55), inset 0 0 16px rgba(56, 189, 248, 0.25);
      }
  
      .grid-cell.winner-pop.claimed-o {
        box-shadow: 0 0 28px rgba(245, 158, 11, 0.55), inset 0 0 16px rgba(245, 158, 11, 0.25);
      }
  
      .grid-cell.dimmed-loser {
        opacity: 0.52;
        transition: opacity 0.35s ease;
      }
  
      @keyframes atlasWinnerCellPop {
        0% {
          transform: scale(0.95);
        }
        55% {
          transform: scale(1.05);
        }
        100% {
          transform: scale(1);
        }
      }
  
      .score-card {
        position: relative;
      }
  
      .score-plus-one {
        position: absolute;
        right: 12px;
        top: -6px;
        font-family: "Caveat", cursive, sans-serif;
        font-size: 28px;
        font-weight: 700;
        pointer-events: none;
        animation: atlasScoreFloat 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
  
      .score-plus-one.side-x {
        color: #38bdf8;
        text-shadow: 0 2px 10px rgba(56, 189, 248, 0.6);
      }
  
      .score-plus-one.side-o {
        color: #fbbf24;
        text-shadow: 0 2px 10px rgba(245, 158, 11, 0.6);
      }
  
      @keyframes atlasScoreFloat {
        0% {
          opacity: 0;
          transform: translateY(8px) scale(0.7);
        }
        25% {
          opacity: 1;
          transform: translateY(-6px) scale(1.15);
        }
        100% {
          opacity: 0;
          transform: translateY(-28px) scale(1);
        }
      }
  
      #atlas-confetti-canvas {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147482500;
      }
  
      .match-result-banner {
        margin: 0 auto 18px;
        padding: 16px 22px;
        border-radius: 16px 6px 18px 8px / 8px 16px 6px 18px;
        background:
          repeating-linear-gradient(
            0deg,
            rgba(148, 163, 184, 0.04) 0px,
            rgba(148, 163, 184, 0.04) 1px,
            transparent 1px,
            transparent 24px
          ),
          linear-gradient(155deg, #101c33 0%, #070e1c 100%);
        border: 2px solid rgba(248, 250, 252, 0.8);
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.65), 4px 5px 0 rgba(250, 204, 21, 0.35);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        animation: atlasBannerDrop 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
  
      .match-result-banner.hidden {
        display: none !important;
      }
  
      .match-result-banner.win-x {
        border-color: #38bdf8;
        box-shadow: 0 18px 44px rgba(56, 189, 248, 0.24), 4px 5px 0 rgba(56, 189, 248, 0.45);
      }
  
      .match-result-banner.win-o {
        border-color: #f59e0b;
        box-shadow: 0 18px 44px rgba(245, 158, 11, 0.24), 4px 5px 0 rgba(245, 158, 11, 0.45);
      }
  
      @keyframes atlasBannerDrop {
        0% {
          opacity: 0;
          transform: translateY(-12px) scale(0.97);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
  
      .result-banner-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
  
      .result-badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
  
      .result-ft-tag {
        display: inline-block;
        padding: 1px 10px;
        border-radius: 999px;
        background: rgba(250, 204, 21, 0.16);
        border: 1px solid rgba(250, 204, 21, 0.55);
        color: #fde047;
        font-family: "Caveat", cursive, sans-serif;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
  
      .result-headline {
        margin: 0;
        font-family: "Caveat", cursive, sans-serif;
        font-size: 33px;
        font-weight: 700;
        line-height: 1.05;
        color: #f8fafc;
      }
  
      .win-x .result-headline {
        color: #7dd3fc;
      }
  
      .win-o .result-headline {
        color: #fcd34d;
      }
  
      .result-subline {
        margin: 0;
        font-family: "Patrick Hand", cursive, sans-serif;
        font-size: 17px;
        color: #cbd5e1;
      }
  
      .result-banner-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 9px;
      }
  
      .btn-result-sound {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(15, 23, 42, 0.9);
        color: #f8fafc;
        font-size: 16px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
  
      .btn-result-sound:hover {
        border-color: #fde047;
      }
  
      .btn-possible-answers {
        padding: 8px 15px;
        border-radius: 10px;
        border: 1.5px dashed rgba(52, 211, 153, 0.65);
        background: rgba(16, 185, 129, 0.14);
        color: #6ee7b7;
        font-family: "Patrick Hand", cursive, sans-serif;
        font-size: 18px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
  
      .btn-possible-answers:hover,
      .btn-possible-answers.active {
        background: rgba(16, 185, 129, 0.28);
        border-color: #34d399;
        color: #ffffff;
      }
  
      .btn-result-rematch {
        padding: 8px 18px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #fde047, #f59e0b);
        color: #091120;
        font-family: "Caveat", cursive, sans-serif;
        font-size: 22px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
        transition: transform 0.14s ease;
      }
  
      .btn-result-rematch:hover {
        transform: translateY(-1px);
      }
  
      .grid-cell.showing-answers {
        align-items: stretch;
        justify-content: flex-start;
        padding: 8px;
        opacity: 1 !important;
        cursor: default;
      }
  
      .cell-answers-panel {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
        text-align: left;
      }
  
      .cell-answers-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        padding-bottom: 4px;
        border-bottom: 1px dashed rgba(148, 163, 184, 0.32);
        font-size: 11px;
        font-weight: 800;
        color: #6ee7b7;
      }
  
      .cell-answers-claimed-tag {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        background: rgba(56, 189, 248, 0.2);
        color: #7dd3fc;
      }
  
      .cell-answers-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 76px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
  
      .cell-answers-list li {
        font-size: 11.5px;
        line-height: 1.25;
        color: #e2e8f0;
        padding: 2px 5px;
        border-radius: 4px;
        background: rgba(15, 23, 42, 0.72);
      }
  
      .cell-answers-list li.is-used-answer {
        background: rgba(250, 204, 21, 0.2);
        color: #fde047;
        font-weight: 700;
      }
    `;
  
    const victoryState = {
      roundEnded: false,
      winnerSide: null,
      winningLine: null,
      showingAnswers: false,
      soundMuted: false,
      cachedCellHtml: {},
      confettiParticles: [],
      confettiAnimId: null
    };
  
    let bannerEl = null;
    let strikeSvgEl = null;
    let confettiCanvasEl = null;
  
    function injectVictoryStyles() {
      if (document.getElementById("atlas-victory-inline-styles")) return;
      const style = document.createElement("style");
      style.id = "atlas-victory-inline-styles";
      style.textContent = VICTORY_CSS;
      document.head.appendChild(style);
    }
  
    function normalizeText(val) {
      return String(val || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }
  
    function playStadiumAudio(outcome) {
      if (victoryState.soundMuted) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
  
      try {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
  
        const blowWhistle = (startTime, duration, freqA, freqB) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = "triangle";
          osc2.type = "sine";
          osc1.frequency.setValueAtTime(freqA, startTime);
          osc2.frequency.setValueAtTime(freqB, startTime);
  
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(34, startTime);
          lfoGain.gain.setValueAtTime(55, startTime);
          lfo.connect(lfoGain);
          lfoGain.connect(osc1.frequency);
  
          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.03);
          gain.gain.setValueAtTime(0.14, startTime + duration - 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
  
          osc1.start(startTime);
          osc2.start(startTime);
          lfo.start(startTime);
          osc1.stop(startTime + duration);
          osc2.stop(startTime + duration);
          lfo.stop(startTime + duration);
        };
  
        if (outcome === "win") {
          blowWhistle(now + 0.02, 0.22, 2850, 2940);
          blowWhistle(now + 0.30, 0.48, 2820, 2910);
  
          const bufferSize = ctx.sampleRate * 1.4;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i += 1) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;
  
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(680, now + 0.25);
          filter.Q.setValueAtTime(0.75, now + 0.25);
  
          const crowdGain = ctx.createGain();
          crowdGain.gain.setValueAtTime(0.001, now + 0.22);
          crowdGain.gain.exponentialRampToValueAtTime(0.16, now + 0.55);
          crowdGain.gain.exponentialRampToValueAtTime(0.001, now + 1.58);
  
          noise.connect(filter);
          filter.connect(crowdGain);
          crowdGain.connect(ctx.destination);
          noise.start(now + 0.22);
          noise.stop(now + 1.6);
        } else {
          blowWhistle(now + 0.02, 0.36, 2760, 2840);
        }
      } catch (err) {
      }
    }
  
    function launchConfetti(winnerSide) {
      if (!confettiCanvasEl) {
        confettiCanvasEl = document.createElement("canvas");
        confettiCanvasEl.id = "atlas-confetti-canvas";
        document.body.appendChild(confettiCanvasEl);
      }
  
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      confettiCanvasEl.width = vw * dpr;
      confettiCanvasEl.height = vh * dpr;
      const ctx = confettiCanvasEl.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
      const palette = winnerSide === "X"
        ? ["#38bdf8", "#7dd3fc", "#0284c7", "#f8fafc", "#34d399"]
        : ["#f59e0b", "#fcd34d", "#fde047", "#f8fafc", "#fb923c"];
  
      const particles = [];
      const origins = [
        { x: vw * 0.22, y: vh * 0.45 },
        { x: vw * 0.50, y: vh * 0.38 },
        { x: vw * 0.78, y: vh * 0.45 }
      ];
  
      origins.forEach((origin) => {
        for (let i = 0; i < 42; i += 1) {
          const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 2.1;
          const speed = 5 + Math.random() * 11;
          particles.push({
            x: origin.x + (Math.random() - 0.5) * 40,
            y: origin.y + (Math.random() - 0.5) * 30,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            w: 6 + Math.random() * 6,
            h: 4 + Math.random() * 5,
            color: palette[Math.floor(Math.random() * palette.length)],
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.24,
            alpha: 1
          });
        }
      });
  
      victoryState.confettiParticles = particles;
      if (victoryState.confettiAnimId) {
        cancelAnimationFrame(victoryState.confettiAnimId);
      }
  
      function step() {
        ctx.clearRect(0, 0, vw, vh);
        let alive = 0;
  
        for (const p of victoryState.confettiParticles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.26;
          p.vx *= 0.985;
          p.rot += p.vRot;
          if (p.y > vh * 0.75) {
            p.alpha -= 0.025;
          }
          if (p.alpha <= 0 || p.y > vh + 30) continue;
          alive += 1;
  
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
          ctx.restore();
        }
  
        if (alive > 0) {
          victoryState.confettiAnimId = requestAnimationFrame(step);
        } else {
          ctx.clearRect(0, 0, vw, vh);
          victoryState.confettiAnimId = null;
        }
      }
  
      victoryState.confettiAnimId = requestAnimationFrame(step);
    }
  
    function drawWinningStrikeLine(lineCoords, winnerSide) {
      const gridEl = document.querySelector(".tic-tac-grid");
      if (!gridEl || !lineCoords || lineCoords.length < 3) return;
  
      if (strikeSvgEl) {
        strikeSvgEl.remove();
        strikeSvgEl = null;
      }
  
      const firstCell = document.getElementById(`cell-${lineCoords[0][0]}-${lineCoords[0][1]}`);
      const lastCell = document.getElementById(`cell-${lineCoords[2][0]}-${lineCoords[2][1]}`);
      if (!firstCell || !lastCell) return;
  
      const gridRect = gridEl.getBoundingClientRect();
      const r1 = firstCell.getBoundingClientRect();
      const r2 = lastCell.getBoundingClientRect();
  
      const x1 = r1.left - gridRect.left + r1.width * 0.5;
      const y1 = r1.top - gridRect.top + r1.height * 0.5;
      const x2 = r2.left - gridRect.left + r2.width * 0.5;
      const y2 = r2.top - gridRect.top + r2.height * 0.5;
  
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const extend = 22;
  
      const sx = x1 - ux * extend;
      const sy = y1 - uy * extend;
      const ex = x2 + ux * extend;
      const ey = y2 + uy * extend;
  
      const mx = (sx + ex) * 0.5 - uy * 5;
      const my = (sy + ey) * 0.5 + ux * 5;
  
      const strokeColor = winnerSide === "X" ? "#38bdf8" : "#f59e0b";
      const ns = "http://www.w3.org/2000/svg";
      strikeSvgEl = document.createElementNS(ns, "svg");
      strikeSvgEl.setAttribute("class", "grid-strike-svg");
  
      const dMain = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      const dSecond = `M ${(sx - uy * 3).toFixed(1)} ${(sy + ux * 3).toFixed(1)} Q ${(mx + uy * 4).toFixed(1)} ${(my - ux * 4).toFixed(1)} ${(ex - uy * 2).toFixed(1)} ${(ey + ux * 2).toFixed(1)}`;
  
      const glowPath = document.createElementNS(ns, "path");
      glowPath.setAttribute("class", "strike-path-glow");
      glowPath.setAttribute("stroke", strokeColor);
      glowPath.setAttribute("d", dMain);
  
      const mainPath = document.createElementNS(ns, "path");
      mainPath.setAttribute("class", "strike-path-main");
      mainPath.setAttribute("stroke", strokeColor);
      mainPath.setAttribute("d", dMain);
  
      const secPath = document.createElementNS(ns, "path");
      secPath.setAttribute("class", "strike-path-secondary");
      secPath.setAttribute("stroke", "#f8fafc");
      secPath.setAttribute("d", dSecond);
  
      strikeSvgEl.appendChild(glowPath);
      strikeSvgEl.appendChild(mainPath);
      strikeSvgEl.appendChild(secPath);
      gridEl.appendChild(strikeSvgEl);
    }
  
    function popScoreIncrement(winnerSide) {
      const card = document.getElementById(winnerSide === "X" ? "card-x" : "card-o");
      if (!card) return;
      const badge = document.createElement("span");
      badge.className = `score-plus-one ${winnerSide === "X" ? "side-x" : "side-o"}`;
      badge.textContent = "+1";
      card.appendChild(badge);
      setTimeout(() => badge.remove(), 1350);
    }
  
    function extractHeaderLabel(headerEl) {
      if (!headerEl) return "";
      const clone = headerEl.cloneNode(true);
      const badges = clone.querySelectorAll(".club-badge");
      badges.forEach((b) => b.remove());
      return clone.textContent.trim();
    }
  
    function getGlobalPlayerPool() {
      if (typeof PLAYERS !== "undefined" && Array.isArray(PLAYERS)) return PLAYERS;
      if (typeof FOOTBALLERS !== "undefined" && Array.isArray(FOOTBALLERS)) return FOOTBALLERS;
      if (typeof PLAYER_DATA !== "undefined" && Array.isArray(PLAYER_DATA)) return PLAYER_DATA;
      if (typeof ALL_PLAYERS !== "undefined" && Array.isArray(ALL_PLAYERS)) return ALL_PLAYERS;
  
      for (const key of Object.keys(window)) {
        const val = window[key];
        if (Array.isArray(val) && val.length > 20 && val[0] && typeof val[0] === "object") {
          if ("clubs" in val[0] && ("nationality" in val[0] || "nation" in val[0] || "country" in val[0])) {
            return val;
          }
        }
      }
      return [];
    }
  
    function getGlobalClubLookup() {
      const lookup = new Map();
      const sources = [];
      if (typeof CLUBS !== "undefined") sources.push(CLUBS);
      if (typeof ALL_CLUBS !== "undefined") sources.push(ALL_CLUBS);
      if (typeof TEAMS !== "undefined") sources.push(TEAMS);
  
      sources.forEach((src) => {
        if (Array.isArray(src)) {
          src.forEach((club) => {
            if (!club) return;
            const keys = [club.id, club.name, club.shortName, ...(club.aliases || [])].filter(Boolean);
            const normKeys = keys.map(normalizeText);
            normKeys.forEach((k) => lookup.set(k, new Set(normKeys)));
          });
        } else if (src && typeof src === "object") {
          Object.entries(src).forEach(([id, club]) => {
            const name = typeof club === "string" ? club : club && club.name;
            const keys = [id, name].filter(Boolean).map(normalizeText);
            keys.forEach((k) => lookup.set(k, new Set(keys)));
          });
        }
      });
  
      if (typeof COUNTRIES !== "undefined" && Array.isArray(COUNTRIES)) {
        COUNTRIES.forEach((country) => {
          if (!country) return;
          if (Array.isArray(country.clubs)) {
            country.clubs.forEach((club) => {
              const keys = [club.id, club.name, club.shortName, ...(club.aliases || [])].filter(Boolean).map(normalizeText);
              keys.forEach((k) => lookup.set(k, new Set(keys)));
            });
          }
        });
      }
  
      return lookup;
    }
  
    function getGlobalNationLookup() {
      const lookup = new Map();
      if (typeof COUNTRIES !== "undefined" && Array.isArray(COUNTRIES)) {
        COUNTRIES.forEach((c) => {
          if (!c) return;
          const keys = [c.id, c.code, c.name, c.nationality, ...(c.aliases || [])].filter(Boolean).map(normalizeText);
          keys.forEach((k) => lookup.set(k, new Set(keys)));
        });
      }
      return lookup;
    }
  
    function playerMatchesClub(player, targetClubNorm, clubLookup) {
      const acceptedSet = clubLookup.get(targetClubNorm) || new Set([targetClubNorm]);
      const rawClubs = Array.isArray(player.clubs)
        ? player.clubs
        : Array.isArray(player.teams)
          ? player.teams
          : [];
  
      return rawClubs.some((entry) => {
        const val = typeof entry === "string" ? entry : entry && (entry.id || entry.name || entry.club);
        const norm = normalizeText(val);
        if (!norm) return false;
        if (acceptedSet.has(norm)) return true;
        const entrySet = clubLookup.get(norm);
        if (entrySet) {
          for (const k of acceptedSet) {
            if (entrySet.has(k)) return true;
          }
        }
        return false;
      });
    }
  
    function playerMatchesNation(player, targetNationNorm, nationLookup) {
      const acceptedSet = nationLookup.get(targetNationNorm) || new Set([targetNationNorm]);
      const rawNations = Array.isArray(player.nationalities)
        ? player.nationalities
        : [player.nationality || player.nation || player.country].filter(Boolean);
  
      return rawNations.some((entry) => {
        const norm = normalizeText(entry);
        if (!norm) return false;
        if (acceptedSet.has(norm)) return true;
        const entrySet = nationLookup.get(norm);
        if (entrySet) {
          for (const k of acceptedSet) {
            if (entrySet.has(k)) return true;
          }
        }
        return false;
      });
    }
  
    function computeValidAnswersForCell(r, c) {
      if (typeof getValidPlayersForCell === "function") {
        const direct = getValidPlayersForCell(r, c);
        if (Array.isArray(direct)) {
          return direct.map((p) => (typeof p === "string" ? p : p.name)).filter(Boolean);
        }
      }
  
      const rowHeader = document.getElementById(`row-${r}`);
      const colHeader = document.getElementById(`col-${c}`);
      const rowLabel = extractHeaderLabel(rowHeader);
      const colLabel = extractHeaderLabel(colHeader);
  
      const rowNorm = normalizeText(rowLabel);
      const colNorm = normalizeText(colLabel);
      if (!rowNorm || !colNorm) return [];
  
      const players = getGlobalPlayerPool();
      const clubLookup = getGlobalClubLookup();
      const nationLookup = getGlobalNationLookup();
  
      const isNationMode = (typeof state !== "undefined" && state.gridMode === "nation_vs_league")
        || (colHeader && colHeader.classList.contains("nation-header"))
        || (rowHeader && rowHeader.classList.contains("nation-header"));
  
      const matches = [];
      for (const p of players) {
        if (!p) continue;
        const pName = p.name || p.playerName || p.fullName;
        if (!pName) continue;
  
        let ok = false;
        if (isNationMode) {
          const colIsNation = colHeader && colHeader.classList.contains("nation-header");
          if (colIsNation) {
            ok = playerMatchesNation(p, colNorm, nationLookup) && playerMatchesClub(p, rowNorm, clubLookup);
          } else {
            ok = playerMatchesNation(p, rowNorm, nationLookup) && playerMatchesClub(p, colNorm, clubLookup);
          }
        } else {
          ok = playerMatchesClub(p, rowNorm, clubLookup) && playerMatchesClub(p, colNorm, clubLookup);
        }
  
        if (ok) {
          matches.push(pName);
        }
      }
  
      return Array.from(new Set(matches)).sort((a, b) => a.localeCompare(b));
    }
  
    function togglePossibleAnswers() {
      victoryState.showingAnswers = !victoryState.showingAnswers;
  
      const toggleBtn = document.getElementById("btn-toggle-possible-answers");
      if (toggleBtn) {
        toggleBtn.classList.toggle("active", victoryState.showingAnswers);
        toggleBtn.textContent = victoryState.showingAnswers ? "Hide Possible Answers" : "Show Possible Answers";
      }
  
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          const key = `${r}-${c}`;
          const cell = document.getElementById(`cell-${key}`);
          if (!cell) continue;
  
          if (victoryState.showingAnswers) {
            if (!(key in victoryState.cachedCellHtml)) {
              victoryState.cachedCellHtml[key] = cell.innerHTML;
            }
            const claimedPlayerEl = cell.querySelector(".cell-player");
            const claimedMarkEl = cell.querySelector(".cell-mark");
            const claimedName = claimedPlayerEl ? claimedPlayerEl.textContent.trim() : "";
            const claimedMark = claimedMarkEl ? claimedMarkEl.textContent.trim() : "";
            const claimedNorm = normalizeText(claimedName);
  
            const validNames = computeValidAnswersForCell(r, c);
            if (claimedName && !validNames.some((n) => normalizeText(n) === claimedNorm)) {
              validNames.unshift(claimedName);
            }
  
            const listItemsHtml = validNames.length > 0
              ? validNames.map((name) => {
                  const isUsed = claimedNorm && normalizeText(name) === claimedNorm;
                  return `<li class="${isUsed ? "is-used-answer" : ""}">${name}</li>`;
                }).join("")
              : "<li>No additional records</li>";
  
            cell.classList.add("showing-answers");
            cell.innerHTML = `
              <div class="cell-answers-panel">
                <div class="cell-answers-header">
                  <span>${validNames.length} Valid</span>
                  ${claimedMark ? `<span class="cell-answers-claimed-tag">${claimedMark}</span>` : ""}
                </div>
                <ul class="cell-answers-list">${listItemsHtml}</ul>
              </div>
            `;
          } else {
            cell.classList.remove("showing-answers");
            if (key in victoryState.cachedCellHtml) {
              cell.innerHTML = victoryState.cachedCellHtml[key];
            }
          }
        }
      }
    }
  
    function ensureBannerDOM() {
      if (bannerEl) return bannerEl;
      const gameContainer = document.querySelector("#stage-game .game-container");
      const gridEl = document.querySelector("#stage-game .tic-tac-grid");
      if (!gameContainer || !gridEl) return null;
  
      bannerEl = document.createElement("div");
      bannerEl.id = "match-result-banner";
      bannerEl.className = "match-result-banner hidden";
      gameContainer.insertBefore(bannerEl, gridEl);
      return bannerEl;
    }
  
    function renderMatchBanner(winnerSide) {
      const el = ensureBannerDOM();
      if (!el) return;
  
      const nameX = (document.getElementById("label-player-x")?.textContent || "Player X").trim();
      const nameO = (document.getElementById("label-player-o")?.textContent || "Player O").trim();
      const scoreX = (document.getElementById("score-x")?.textContent || "0").trim();
      const scoreO = (document.getElementById("score-o")?.textContent || "0").trim();
  
      el.classList.remove("hidden", "win-x", "win-o");
      if (winnerSide === "X") el.classList.add("win-x");
      if (winnerSide === "O") el.classList.add("win-o");
  
      const headline = winnerSide === "X"
        ? `${nameX} Wins the Round!`
        : winnerSide === "O"
          ? `${nameO} Wins the Round!`
          : "Full Time — Match Drawn!";
  
      const subline = `Series Score: ${nameX} ${scoreX} – ${scoreO} ${nameO}`;
  
      el.innerHTML = `
        <div class="result-banner-info">
          <div class="result-badge-row">
            <span class="result-ft-tag">FULL TIME</span>
          </div>
          <h3 class="result-headline">${headline}</h3>
          <p class="result-subline">${subline}</p>
        </div>
        <div class="result-banner-actions">
          <button type="button" id="btn-toggle-sound" class="btn-result-sound" title="Toggle Stadium Sound">
            ${victoryState.soundMuted ? "🔇" : "🔊"}
          </button>
          <button type="button" id="btn-toggle-possible-answers" class="btn-possible-answers">
            Show Possible Answers
          </button>
          <button type="button" id="btn-banner-rematch" class="btn-result-rematch">
            New Grid →
          </button>
        </div>
      `;
  
      const soundBtn = document.getElementById("btn-toggle-sound");
      if (soundBtn) {
        soundBtn.addEventListener("click", () => {
          victoryState.soundMuted = !victoryState.soundMuted;
          soundBtn.textContent = victoryState.soundMuted ? "🔇" : "🔊";
        });
      }
  
      const answersBtn = document.getElementById("btn-toggle-possible-answers");
      if (answersBtn) {
        answersBtn.addEventListener("click", togglePossibleAnswers);
      }
  
      const rematchBtn = document.getElementById("btn-banner-rematch");
      if (rematchBtn) {
        rematchBtn.addEventListener("click", () => {
          resetVictoryState();
          const navNewGrid = document.getElementById("btn-new-grid");
          if (navNewGrid) {
            navNewGrid.click();
          } else if (typeof startNewRound === "function") {
            startNewRound();
          }
        });
      }
    }
  
    function resetVictoryState() {
      victoryState.roundEnded = false;
      victoryState.winnerSide = null;
      victoryState.winningLine = null;
      victoryState.showingAnswers = false;
      victoryState.cachedCellHtml = {};
  
      if (bannerEl) {
        bannerEl.classList.add("hidden");
      }
      if (strikeSvgEl) {
        strikeSvgEl.remove();
        strikeSvgEl = null;
      }
  
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          const cell = document.getElementById(`cell-${r}-${c}`);
          if (cell) {
            cell.classList.remove("winner-pop", "dimmed-loser", "showing-answers");
            if (cell.querySelector(".cell-answers-panel")) {
              cell.innerHTML = "";
            }
          }
        }
      }
    }
  
    function detectBoardOutcome() {
      const board = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ];
      let claimedCount = 0;
  
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          const cell = document.getElementById(`cell-${r}-${c}`);
          if (!cell) continue;
          if (cell.classList.contains("claimed-x")) {
            board[r][c] = "X";
            claimedCount += 1;
          } else if (cell.classList.contains("claimed-o")) {
            board[r][c] = "O";
            claimedCount += 1;
          }
        }
      }
  
      for (const line of WIN_LINES) {
        const [a, b, d] = line;
        const side = board[a[0]][a[1]];
        if (side && side === board[b[0]][b[1]] && side === board[d[0]][d[1]]) {
          return { ended: true, winner: side, line };
        }
      }
  
      if (claimedCount === 9) {
        return { ended: true, winner: null, line: null };
      }
  
      return { ended: false, winner: null, line: null };
    }
  
    function triggerVictorySequence(outcome) {
      victoryState.roundEnded = true;
      victoryState.winnerSide = outcome.winner;
      victoryState.winningLine = outcome.line;
  
      if (outcome.winner && outcome.line) {
        const winSet = new Set(outcome.line.map(([r, c]) => `${r}-${c}`));
        for (let r = 0; r < 3; r += 1) {
          for (let c = 0; c < 3; c += 1) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (!cell) continue;
            if (winSet.has(`${r}-${c}`)) {
              cell.classList.add("winner-pop");
            } else {
              cell.classList.add("dimmed-loser");
            }
          }
        }
  
        drawWinningStrikeLine(outcome.line, outcome.winner);
        popScoreIncrement(outcome.winner);
        launchConfetti(outcome.winner);
        playStadiumAudio("win");
      } else {
        playStadiumAudio("draw");
      }
  
      renderMatchBanner(outcome.winner);
    }
  
    function evaluateGridState() {
      const outcome = detectBoardOutcome();
      if (!outcome.ended) {
        if (victoryState.roundEnded || victoryState.showingAnswers) {
          resetVictoryState();
        }
        return;
      }
  
      if (!victoryState.roundEnded) {
        setTimeout(() => {
          const recheck = detectBoardOutcome();
          if (recheck.ended && !victoryState.roundEnded) {
            triggerVictorySequence(recheck);
          }
        }, 90);
      }
    }
  
    function bindRoundResetTriggers() {
      const resetSelectors = [
        "#btn-new-grid",
        "#btn-enter-game",
        "#btn-back-map",
        "#btn-back-names",
        ".difficulty-btn",
        ".grid-mode-btn"
      ];
  
      document.addEventListener("click", (e) => {
        const target = e.target;
        if (!target || typeof target.closest !== "function") return;
        for (const sel of resetSelectors) {
          if (target.closest(sel)) {
            resetVictoryState();
            break;
          }
        }
      }, true);
    }
  
    function initVictoryEffects() {
      injectVictoryStyles();
      ensureBannerDOM();
      bindRoundResetTriggers();
  
      const gridEl = document.querySelector(".tic-tac-grid");
      if (gridEl) {
        const observer = new MutationObserver(() => {
          evaluateGridState();
        });
        observer.observe(gridEl, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["class"]
        });
      }
  
      window.addEventListener("resize", () => {
        if (victoryState.roundEnded && victoryState.winnerSide && victoryState.winningLine) {
          drawWinningStrikeLine(victoryState.winningLine, victoryState.winnerSide);
        }
      });
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initVictoryEffects);
    } else {
      initVictoryEffects();
    }
  })();