(function () {
    const TUTORIAL_SEEN_KEY = "atlas_xi_tutorial_seen_v3";
  
    const TUTORIAL_STEPS = [
      {
        stage: "players",
        selector: ".mode-selector-grid",
        fallbackSelector: "#stage-players",
        title: "1. Choose Your Match Format",
        body: "Pick <strong>Play vs Friend</strong> for a local 1v1 pass-and-play duel, or challenge <strong>Atlas AI</strong> solo."
      },
      {
        stage: "players",
        selector: ".premium-duel-grid",
        fallbackSelector: "#stage-players",
        title: "2. Enter Manager Names",
        body: "Type two distinct usernames for <strong>Player X</strong> (starts first) and <strong>Player O</strong>. Use Swap to flip sides."
      },
      {
        stage: "players",
        selector: "#difficulty-selector",
        fallbackSelector: ".topbar-right",
        title: "3. Set Squad Difficulty",
        body: "<strong>Easy</strong> picks world-famous giants with many shared stars. <strong>Hard</strong> tests deeper club & nation trivia."
      },
      {
        stage: "map",
        selector: "#grid-mode-selector",
        fallbackSelector: ".map-top-bar",
        title: "4. Club × Club or Nationality × League",
        body: "Switch grid rules here! Play classic <strong>Club × Club</strong> matchups or pit <strong>3 Nationalities</strong> against <strong>1 League</strong>."
      },
      {
        stage: "map",
        selector: ".map-workspace",
        fallbackSelector: "#stage-map",
        title: "5. Scout the World Map",
        body: "Click countries on the map—or search the list on the right—to set your axes. Need a quick board? Hit <strong>Auto-Fill Remaining</strong>!"
      },
      {
        stage: "game",
        selector: ".tic-tac-grid",
        fallbackSelector: "#stage-game",
        title: "6. Fill Cells with Shared Stars",
        body: "Click any cell and name a footballer who fits <strong>both</strong> the row and column. Connect <strong>3 in a row</strong> to win the round!"
      },
      {
        stage: "game",
        selector: ".scoreboard",
        fallbackSelector: "#stage-game",
        title: "7. Watch Turns & Wrong Guesses",
        body: "Each footballer can only be used <strong>once</strong> per round. A wrong guess or pass hands the turn straight to your rival."
      }
    ];
  
    const TUTORIAL_CSS = `
      .btn-tutorial-trigger {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 6px 13px;
        border-radius: 9px;
        border: 1.5px dashed rgba(250, 204, 21, 0.65);
        background: rgba(250, 204, 21, 0.12);
        color: #fde047;
        font-family: "Patrick Hand", "Caveat", cursive, sans-serif;
        font-size: 17px;
        font-weight: 700;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
      }
  
      .btn-tutorial-trigger:hover {
        background: rgba(250, 204, 21, 0.22);
        border-color: #fde047;
        transform: translateY(-1px) rotate(-1deg);
        box-shadow: 0 6px 18px rgba(250, 204, 21, 0.22);
      }
  
      .tutorial-q-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 19px;
        height: 19px;
        border-radius: 50%;
        border: 1.5px solid #fde047;
        font-size: 13px;
        line-height: 1;
      }
  
      #sketch-tutorial-root {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483000;
        pointer-events: auto;
      }
  
      #sketch-tutorial-root.hidden {
        display: none !important;
      }
  
      .sketch-tutorial-svg {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        display: block;
        pointer-events: auto;
      }
  
      .sketch-stroke-primary {
        fill: none;
        stroke: #fde047;
        stroke-width: 2.8;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.55));
      }
  
      .sketch-stroke-secondary {
        fill: none;
        stroke: rgba(248, 250, 252, 0.78);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
  
      .sketch-arrow-line {
        fill: none;
        stroke: #fde047;
        stroke-width: 2.6;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.75));
      }
  
      .sketch-note-card {
        position: fixed;
        z-index: 2147483005;
        width: min(375px, calc(100vw - 28px));
        padding: 18px 22px 16px;
        background:
          repeating-linear-gradient(
            0deg,
            rgba(148, 163, 184, 0.05) 0px,
            rgba(148, 163, 184, 0.05) 1px,
            transparent 1px,
            transparent 26px
          ),
          linear-gradient(165deg, #111d35 0%, #081020 100%);
        border: 2px solid rgba(248, 250, 252, 0.85);
        border-radius: 18px 6px 20px 8px / 8px 18px 6px 20px;
        box-shadow:
          0 24px 60px rgba(0, 0, 0, 0.85),
          5px 6px 0 rgba(250, 204, 21, 0.42);
        color: #f8fafc;
        transform: rotate(-1.1deg);
        transition: top 0.22s ease, left 0.22s ease;
      }
  
      .sketch-note-card::before {
        content: "";
        position: absolute;
        inset: 4px;
        border: 1.3px dashed rgba(250, 204, 21, 0.48);
        border-radius: 14px 4px 16px 6px / 6px 14px 4px 16px;
        pointer-events: none;
      }
  
      .sketch-note-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 6px;
      }
  
      .sketch-step-badge {
        display: inline-block;
        padding: 1px 11px;
        border: 1.5px solid #38bdf8;
        border-radius: 12px 4px 10px 4px;
        background: rgba(56, 189, 248, 0.16);
        color: #7dd3fc;
        font-family: "Caveat", cursive, sans-serif;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.03em;
      }
  
      .sketch-skip-btn {
        border: none;
        background: transparent;
        color: #94a3b8;
        font-family: "Patrick Hand", cursive, sans-serif;
        font-size: 16px;
        text-decoration: underline wavy rgba(148, 163, 184, 0.55);
        cursor: pointer;
        padding: 2px 4px;
      }
  
      .sketch-skip-btn:hover {
        color: #fda4af;
      }
  
      .sketch-note-title {
        margin: 0 0 6px;
        font-family: "Caveat", cursive, sans-serif;
        font-size: 31px;
        font-weight: 700;
        line-height: 1.08;
        color: #fde047;
        text-shadow: 0 2px 10px rgba(250, 204, 21, 0.25);
      }
  
      .sketch-note-body {
        margin: 0 0 15px;
        font-family: "Patrick Hand", cursive, sans-serif;
        font-size: 19.5px;
        line-height: 1.36;
        color: #f1f5f9;
      }
  
      .sketch-note-body strong {
        color: #7dd3fc;
        font-weight: 400;
        border-bottom: 1.5px dashed rgba(125, 211, 252, 0.7);
      }
  
      .sketch-note-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
  
      .sketch-dots {
        display: flex;
        align-items: center;
        gap: 6px;
      }
  
      .sketch-dot {
        width: 9px;
        height: 9px;
        border-radius: 50% 40% 60% 45%;
        border: 1.5px solid rgba(248, 250, 252, 0.6);
        background: transparent;
        transition: transform 0.15s ease, background 0.15s ease;
      }
  
      .sketch-dot.active {
        background: #fde047;
        border-color: #fde047;
        transform: scale(1.25);
      }
  
      .sketch-btn-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
  
      .sketch-btn {
        padding: 5px 15px;
        font-family: "Caveat", cursive, sans-serif;
        font-size: 21px;
        font-weight: 700;
        border-radius: 12px 4px 12px 4px;
        cursor: pointer;
        transition: transform 0.14s ease, background 0.14s ease;
      }
  
      .sketch-btn:hover {
        transform: translateY(-1px) rotate(0.8deg);
      }
  
      .sketch-btn-prev {
        background: rgba(30, 41, 59, 0.9);
        border: 1.5px solid rgba(248, 250, 252, 0.5);
        color: #e2e8f0;
      }
  
      .sketch-btn-next {
        background: #fde047;
        border: 2px solid #fef08a;
        color: #091120;
        box-shadow: 2px 3px 0 rgba(250, 204, 21, 0.4);
      }
    `;
  
    const tutorialState = {
      active: false,
      stepIndex: 0,
      startedFromStage: "players",
      injectedDemoNames: false,
      injectedDemoAxes: false
    };
  
    let rootEl = null;
    let svgEl = null;
    let maskHoleEl = null;
    let primaryFrameEl = null;
    let secondaryFrameEl = null;
    let arrowLineEl = null;
    let arrowHeadEl = null;
    let cardEl = null;
  
    function injectTutorialAssets() {
      if (!document.getElementById("atlas-sketch-fonts")) {
        const fontLink = document.createElement("link");
        fontLink.id = "atlas-sketch-fonts";
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&display=swap";
        document.head.appendChild(fontLink);
      }
  
      if (!document.getElementById("atlas-tutorial-inline-styles")) {
        const styleTag = document.createElement("style");
        styleTag.id = "atlas-tutorial-inline-styles";
        styleTag.textContent = TUTORIAL_CSS;
        document.head.appendChild(styleTag);
      }
    }
  
    function buildSketchRectPath(x, y, w, h, seedOffset) {
      const o = 7;
      const w1 = Math.sin(seedOffset + 1.1) * 2.5;
      const w2 = Math.cos(seedOffset + 2.3) * 2.5;
      const w3 = Math.sin(seedOffset + 3.7) * 2.5;
      const w4 = Math.cos(seedOffset + 4.9) * 2.5;
  
      const top = `M ${(x - o).toFixed(1)} ${(y + w1).toFixed(1)} Q ${(x + w * 0.5).toFixed(1)} ${(y - w2).toFixed(1)} ${(x + w + o).toFixed(1)} ${(y - w1).toFixed(1)}`;
      const right = `M ${(x + w - w2).toFixed(1)} ${(y - o).toFixed(1)} Q ${(x + w + w3).toFixed(1)} ${(y + h * 0.5).toFixed(1)} ${(x + w + w1).toFixed(1)} ${(y + h + o).toFixed(1)}`;
      const bottom = `M ${(x + w + o).toFixed(1)} ${(y + h - w3).toFixed(1)} Q ${(x + w * 0.5).toFixed(1)} ${(y + h + w4).toFixed(1)} ${(x - o).toFixed(1)} ${(y + h + w2).toFixed(1)}`;
      const left = `M ${(x + w4).toFixed(1)} ${(y + h + o).toFixed(1)} Q ${(x - w1).toFixed(1)} ${(y + h * 0.5).toFixed(1)} ${(x - w3).toFixed(1)} ${(y - o).toFixed(1)}`;
  
      return `${top} ${right} ${bottom} ${left}`;
    }
  
    function buildSketchArrowPaths(fromPt, toPt) {
      const dx = toPt.x - fromPt.x;
      const dy = toPt.y - fromPt.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / dist;
      const ny = dx / dist;
      const bend = Math.min(34, dist * 0.18);
  
      const cx = (fromPt.x + toPt.x) * 0.5 + nx * bend;
      const cy = (fromPt.y + toPt.y) * 0.5 + ny * bend;
  
      const linePath = `M ${fromPt.x.toFixed(1)} ${fromPt.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${toPt.x.toFixed(1)} ${toPt.y.toFixed(1)}`;
  
      const angle = Math.atan2(toPt.y - cy, toPt.x - cx);
      const headLen = 14;
      const spread = 0.48;
  
      const x1 = toPt.x - headLen * Math.cos(angle - spread);
      const y1 = toPt.y - headLen * Math.sin(angle - spread);
      const x2 = toPt.x - headLen * Math.cos(angle + spread);
      const y2 = toPt.y - headLen * Math.sin(angle + spread);
  
      const headPath = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${toPt.x.toFixed(1)} ${toPt.y.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  
      return { linePath, headPath };
    }
  
    function ensureOverlayDOM() {
      injectTutorialAssets();
      if (rootEl) return;
  
      rootEl = document.createElement("div");
      rootEl.id = "sketch-tutorial-root";
      rootEl.className = "hidden";
  
      const ns = "http://www.w3.org/2000/svg";
      svgEl = document.createElementNS(ns, "svg");
      svgEl.setAttribute("class", "sketch-tutorial-svg");
  
      const defs = document.createElementNS(ns, "defs");
      const mask = document.createElementNS(ns, "mask");
      mask.setAttribute("id", "atlas-sketch-spotlight-mask");
  
      const maskBg = document.createElementNS(ns, "rect");
      maskBg.setAttribute("x", "0");
      maskBg.setAttribute("y", "0");
      maskBg.setAttribute("width", "100%");
      maskBg.setAttribute("height", "100%");
      maskBg.setAttribute("fill", "white");
  
      maskHoleEl = document.createElementNS(ns, "rect");
      maskHoleEl.setAttribute("rx", "14");
      maskHoleEl.setAttribute("ry", "14");
      maskHoleEl.setAttribute("fill", "black");
  
      mask.appendChild(maskBg);
      mask.appendChild(maskHoleEl);
      defs.appendChild(mask);
  
      const backdropRect = document.createElementNS(ns, "rect");
      backdropRect.setAttribute("x", "0");
      backdropRect.setAttribute("y", "0");
      backdropRect.setAttribute("width", "100%");
      backdropRect.setAttribute("height", "100%");
      backdropRect.setAttribute("fill", "rgba(3, 7, 18, 0.76)");
      backdropRect.setAttribute("mask", "url(#atlas-sketch-spotlight-mask)");
  
      secondaryFrameEl = document.createElementNS(ns, "path");
      secondaryFrameEl.setAttribute("class", "sketch-stroke-secondary");
  
      primaryFrameEl = document.createElementNS(ns, "path");
      primaryFrameEl.setAttribute("class", "sketch-stroke-primary");
  
      arrowLineEl = document.createElementNS(ns, "path");
      arrowLineEl.setAttribute("class", "sketch-arrow-line");
  
      arrowHeadEl = document.createElementNS(ns, "path");
      arrowHeadEl.setAttribute("class", "sketch-arrow-line");
  
      svgEl.appendChild(defs);
      svgEl.appendChild(backdropRect);
      svgEl.appendChild(secondaryFrameEl);
      svgEl.appendChild(primaryFrameEl);
      svgEl.appendChild(arrowLineEl);
      svgEl.appendChild(arrowHeadEl);
  
      cardEl = document.createElement("aside");
      cardEl.className = "sketch-note-card";
      cardEl.setAttribute("role", "dialog");
      cardEl.setAttribute("aria-live", "polite");
  
      rootEl.appendChild(svgEl);
      rootEl.appendChild(cardEl);
      document.body.appendChild(rootEl);
    }
  
    function ensureStageForStep(step) {
      const activeStage = document.querySelector(".stage.active");
      const currentId = activeStage ? activeStage.id : "stage-players";
  
      if (step.stage === "players" && currentId !== "stage-players") {
        if (typeof showStage === "function") {
          showStage("players");
        }
        return;
      }
  
      if (step.stage === "map" && currentId !== "stage-map") {
        const inputX = document.getElementById("input-player-x");
        const inputO = document.getElementById("input-player-o");
        if (inputX && !inputX.value.trim()) {
          inputX.value = "Manager X";
          tutorialState.injectedDemoNames = true;
        }
        if (inputO && !inputO.value.trim()) {
          inputO.value = "Manager O";
          tutorialState.injectedDemoNames = true;
        }
        if (typeof state !== "undefined") {
          state.players.X = inputX ? inputX.value.trim() : "Manager X";
          state.players.O = inputO ? inputO.value.trim() : "Manager O";
          const lblX = document.getElementById("label-player-x");
          const lblO = document.getElementById("label-player-o");
          if (lblX) lblX.textContent = state.players.X;
          if (lblO) lblO.textContent = state.players.O;
        }
        if (typeof showStage === "function") {
          showStage("map");
        }
        if (typeof updateCountrySelectionUI === "function") {
          updateCountrySelectionUI();
        }
        return;
      }
  
      if (step.stage === "game" && currentId !== "stage-game") {
        if (typeof state !== "undefined") {
          const needsAxes = state.gridMode === "nation_vs_league"
            ? state.horizontalNations.length !== 3 || !state.verticalCountry
            : !state.horizontalCountry || !state.verticalCountry;
  
          if (needsAxes && typeof autoFillRemainingAxes === "function") {
            autoFillRemainingAxes();
            tutorialState.injectedDemoAxes = true;
          }
          if (typeof startNewRound === "function") {
            startNewRound();
          }
        }
        if (typeof showStage === "function") {
          showStage("game");
        }
      }
    }
  
    function findTargetElement(step) {
      const primary = document.querySelector(step.selector);
      if (primary) {
        const r = primary.getBoundingClientRect();
        if (r.width > 12 && r.height > 12) return primary;
      }
      if (step.fallbackSelector) {
        const fallback = document.querySelector(step.fallbackSelector);
        if (fallback) return fallback;
      }
      return document.querySelector(".stage.active") || document.body;
    }
  
    function computeCardAndArrowLayout(holeRect, cardRect) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 16;
      const gap = 30;
  
      const placements = [
        {
          left: holeRect.left + holeRect.width * 0.5 - cardRect.width * 0.5,
          top: holeRect.bottom + gap
        },
        {
          left: holeRect.left + holeRect.width * 0.5 - cardRect.width * 0.5,
          top: holeRect.top - cardRect.height - gap
        },
        {
          left: holeRect.right + gap,
          top: holeRect.top + holeRect.height * 0.5 - cardRect.height * 0.5
        },
        {
          left: holeRect.left - cardRect.width - gap,
          top: holeRect.top + holeRect.height * 0.5 - cardRect.height * 0.5
        }
      ];
  
      let chosen = null;
      for (const p of placements) {
        const clampedLeft = Math.max(margin, Math.min(vw - cardRect.width - margin, p.left));
        const clampedTop = Math.max(margin, Math.min(vh - cardRect.height - margin, p.top));
  
        const overlapsX = clampedLeft < holeRect.right + 12 && clampedLeft + cardRect.width > holeRect.left - 12;
        const overlapsY = clampedTop < holeRect.bottom + 12 && clampedTop + cardRect.height > holeRect.top - 12;
  
        if (!overlapsX || !overlapsY) {
          chosen = { left: clampedLeft, top: clampedTop };
          break;
        }
      }
  
      if (!chosen) {
        chosen = {
          left: Math.max(margin, vw - cardRect.width - margin),
          top: Math.max(margin, vh - cardRect.height - margin)
        };
      }
  
      const cardCenter = {
        x: chosen.left + cardRect.width * 0.5,
        y: chosen.top + cardRect.height * 0.5
      };
      const holeCenter = {
        x: holeRect.left + holeRect.width * 0.5,
        y: holeRect.top + holeRect.height * 0.5
      };
  
      let fromPt;
      let toPt;
  
      if (chosen.top >= holeRect.bottom) {
        fromPt = { x: cardCenter.x, y: chosen.top - 4 };
        toPt = {
          x: Math.max(holeRect.left + 16, Math.min(holeRect.right - 16, cardCenter.x)),
          y: holeRect.bottom + 8
        };
      } else if (chosen.top + cardRect.height <= holeRect.top) {
        fromPt = { x: cardCenter.x, y: chosen.top + cardRect.height + 4 };
        toPt = {
          x: Math.max(holeRect.left + 16, Math.min(holeRect.right - 16, cardCenter.x)),
          y: holeRect.top - 8
        };
      } else if (chosen.left >= holeRect.right) {
        fromPt = { x: chosen.left - 4, y: cardCenter.y };
        toPt = {
          x: holeRect.right + 8,
          y: Math.max(holeRect.top + 16, Math.min(holeRect.bottom - 16, cardCenter.y))
        };
      } else {
        fromPt = { x: chosen.left + cardRect.width + 4, y: cardCenter.y };
        toPt = {
          x: holeRect.left - 8,
          y: Math.max(holeRect.top + 16, Math.min(holeRect.bottom - 16, cardCenter.y))
        };
      }
  
      if (Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y) < 16) {
        toPt = holeCenter;
      }
  
      return { left: chosen.left, top: chosen.top, fromPt, toPt };
    }
  
    function renderCurrentStep() {
      if (!tutorialState.active) return;
      ensureOverlayDOM();
  
      const step = TUTORIAL_STEPS[tutorialState.stepIndex];
      if (!step) {
        closeTutorial(true);
        return;
      }
  
      ensureStageForStep(step);
  
      requestAnimationFrame(() => {
        const targetEl = findTargetElement(step);
        const rawRect = targetEl.getBoundingClientRect();
        const pad = 10;
        const hx = Math.max(6, rawRect.left - pad);
        const hy = Math.max(6, rawRect.top - pad);
        const hw = Math.min(window.innerWidth - hx - 6, rawRect.width + pad * 2);
        const hh = Math.min(window.innerHeight - hy - 6, rawRect.height + pad * 2);
  
        maskHoleEl.setAttribute("x", hx.toFixed(1));
        maskHoleEl.setAttribute("y", hy.toFixed(1));
        maskHoleEl.setAttribute("width", Math.max(16, hw).toFixed(1));
        maskHoleEl.setAttribute("height", Math.max(16, hh).toFixed(1));
  
        primaryFrameEl.setAttribute("d", buildSketchRectPath(hx, hy, hw, hh, tutorialState.stepIndex * 1.7));
        secondaryFrameEl.setAttribute("d", buildSketchRectPath(hx - 2.5, hy + 2.5, hw + 5, hh - 4, tutorialState.stepIndex * 2.9 + 0.8));
  
        const isFirst = tutorialState.stepIndex === 0;
        const isLast = tutorialState.stepIndex === TUTORIAL_STEPS.length - 1;
        const dotsHtml = TUTORIAL_STEPS.map((_, idx) =>
          `<span class="sketch-dot${idx === tutorialState.stepIndex ? " active" : ""}"></span>`
        ).join("");
  
        cardEl.innerHTML = `
          <div class="sketch-note-top">
            <span class="sketch-step-badge">Note ${tutorialState.stepIndex + 1} / ${TUTORIAL_STEPS.length}</span>
            <button type="button" class="sketch-skip-btn" id="sketch-btn-skip">Skip Guide</button>
          </div>
          <h3 class="sketch-note-title">${step.title}</h3>
          <p class="sketch-note-body">${step.body}</p>
          <div class="sketch-note-actions">
            <div class="sketch-dots">${dotsHtml}</div>
            <div class="sketch-btn-group">
              ${!isFirst ? '<button type="button" class="sketch-btn sketch-btn-prev" id="sketch-btn-prev">← Back</button>' : ""}
              <button type="button" class="sketch-btn sketch-btn-next" id="sketch-btn-next">${isLast ? "Let's Play!" : "Next →"}</button>
            </div>
          </div>
        `;
  
        const cardRect = cardEl.getBoundingClientRect();
        const holeRect = { left: hx, top: hy, right: hx + hw, bottom: hy + hh, width: hw, height: hh };
        const layout = computeCardAndArrowLayout(holeRect, cardRect);
  
        cardEl.style.left = `${layout.left}px`;
        cardEl.style.top = `${layout.top}px`;
  
        const arrows = buildSketchArrowPaths(layout.fromPt, layout.toPt);
        arrowLineEl.setAttribute("d", arrows.linePath);
        arrowHeadEl.setAttribute("d", arrows.headPath);
  
        const skipBtn = document.getElementById("sketch-btn-skip");
        const prevBtn = document.getElementById("sketch-btn-prev");
        const nextBtn = document.getElementById("sketch-btn-next");
  
        if (skipBtn) {
          skipBtn.addEventListener("click", () => closeTutorial(true));
        }
        if (prevBtn) {
          prevBtn.addEventListener("click", () => {
            if (tutorialState.stepIndex > 0) {
              tutorialState.stepIndex -= 1;
              renderCurrentStep();
            }
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            if (tutorialState.stepIndex < TUTORIAL_STEPS.length - 1) {
              tutorialState.stepIndex += 1;
              renderCurrentStep();
            } else {
              closeTutorial(true);
            }
          });
        }
      });
    }
  
    function openTutorial() {
      ensureOverlayDOM();
  
      const activeStage = document.querySelector(".stage.active");
      const activeId = activeStage ? activeStage.id : "stage-players";
      tutorialState.startedFromStage = activeId;
      tutorialState.injectedDemoNames = false;
      tutorialState.injectedDemoAxes = false;
  
      if (activeId === "stage-game") {
        tutorialState.stepIndex = 5;
      } else if (activeId === "stage-map") {
        tutorialState.stepIndex = 3;
      } else {
        tutorialState.stepIndex = 0;
      }
  
      tutorialState.active = true;
      rootEl.classList.remove("hidden");
      renderCurrentStep();
    }
  
    function closeTutorial(markSeen) {
      if (!tutorialState.active) return;
      tutorialState.active = false;
  
      if (rootEl) {
        rootEl.classList.add("hidden");
      }
  
      if (markSeen) {
        try {
          localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
        } catch (err) {
        }
      }
  
      if (tutorialState.startedFromStage === "stage-players") {
        if (tutorialState.injectedDemoAxes && typeof state !== "undefined") {
          state.horizontalCountry = null;
          state.horizontalNations = [];
          state.verticalCountry = null;
        }
        if (tutorialState.injectedDemoNames) {
          const inputX = document.getElementById("input-player-x");
          const inputO = document.getElementById("input-player-o");
          if (inputX && inputX.value === "Manager X") inputX.value = "";
          if (inputO && inputO.value === "Manager O") inputO.value = "";
        }
        if (typeof showStage === "function") {
          showStage("players");
        }
      } else if (tutorialState.startedFromStage === "stage-map") {
        if (tutorialState.injectedDemoAxes && typeof state !== "undefined") {
          state.horizontalCountry = null;
          state.horizontalNations = [];
          state.verticalCountry = null;
        }
        if (typeof showStage === "function") {
          showStage("map");
        }
        if (typeof updateCountrySelectionUI === "function") {
          updateCountrySelectionUI();
        }
      }
    }
  
    function initTutorial() {
      injectTutorialAssets();
  
      const triggerBtn = document.getElementById("btn-open-tutorial");
      if (triggerBtn) {
        triggerBtn.addEventListener("click", openTutorial);
      }
  
      window.addEventListener("resize", () => {
        if (tutorialState.active) {
          renderCurrentStep();
        }
      });
  
      document.addEventListener("keydown", (e) => {
        if (!tutorialState.active) return;
        if (e.key === "Escape") {
          e.preventDefault();
          closeTutorial(true);
        } else if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          if (tutorialState.stepIndex < TUTORIAL_STEPS.length - 1) {
            tutorialState.stepIndex += 1;
            renderCurrentStep();
          } else {
            closeTutorial(true);
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (tutorialState.stepIndex > 0) {
            tutorialState.stepIndex -= 1;
            renderCurrentStep();
          }
        }
      });
  
      let alreadySeen = false;
      try {
        alreadySeen = localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";
      } catch (err) {
      }
  
      if (!alreadySeen) {
        setTimeout(openTutorial, 450);
      }
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initTutorial);
    } else {
      initTutorial();
    }
  })();