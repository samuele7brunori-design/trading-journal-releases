const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const phase = (progress, start, end) => clamp((progress - start) / (end - start));
const ease = (value) => 1 - Math.pow(1 - value, 4);

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createRecords(count) {
  const random = seededRandom(12072026);
  const setups = ["ORB", "VWAP", "PB", "REV"];
  return Array.from({ length: count }, (_, index) => {
    const outcome = random() > .43 ? 1 : -1;
    return {
      chaosX: .08 + random() * .84,
      chaosY: .13 + random() * .74,
      rotation: (random() - .5) * 1.8,
      width: 7 + random() * 20,
      column: index % 9,
      row: Math.floor(index / 9),
      outcome,
      alpha: .3 + random() * .62,
      setup: setups[Math.floor(random() * setups.length)],
      pnl: Math.round((18 + random() * 240) * outcome),
    };
  });
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export function initScrollStory({ reduceMotion }) {
  const section = document.querySelector("[data-scroll-story]");
  const canvas = document.querySelector("[data-story-canvas]");
  if (!section || !canvas || reduceMotion.matches) return;
  const context = canvas.getContext("2d", { alpha: true });
  const screen = section.querySelector(".story-screen");
  const steps = [...section.querySelectorAll("[data-story-step]")];
  const counter = section.querySelector("[data-story-count]");
  const progressLine = section.querySelector("[data-story-progress]");
  const records = createRecords(126);
  let width = 0;
  let height = 0;
  let ratio = 1;
  let queued = false;
  let active = true;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(getProgress());
  }

  function getProgress() {
    const rect = section.getBoundingClientRect();
    return clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
  }

  function drawHeaders(left, top, gridWidth, tableAlpha, compact) {
    const labels = compact
      ? [[.04, "DATA"], [.28, "SETUP"], [.58, "ESITO"], [.79, "P&L"]]
      : [[.03, "DATA"], [.18, "MERCATO"], [.36, "SETUP"], [.55, "DIREZIONE"], [.73, "ESITO"], [.87, "P&L"]];
    context.save();
    context.globalAlpha = tableAlpha;
    context.fillStyle = "oklch(66% 0.014 130)";
    context.font = `${compact ? 8 : 9}px Geologica, system-ui, sans-serif`;
    context.textBaseline = "middle";
    labels.forEach(([position, label]) => context.fillText(label, left + gridWidth * position, top - 16));
    context.restore();
  }

  function draw(progress) {
    context.clearRect(0, 0, width, height);
    const organize = ease(phase(progress, .05, .43));
    const classify = ease(phase(progress, .35, .62));
    const analyze = ease(phase(progress, .55, .8));
    const dissolve = 1 - ease(phase(progress, .78, .94));
    const compact = width < 720;
    const columns = compact ? 7 : 9;
    const rows = compact ? 10 : 14;
    const visibleRecords = columns * rows;
    const gridWidth = Math.min(width * (compact ? .9 : .62), 820);
    const gridHeight = Math.min(height * (compact ? .36 : .48), 410);
    const left = width * .5 - gridWidth * .5;
    const top = height * (compact ? .38 : .3);
    const columnWidth = gridWidth / columns;
    const rowHeight = gridHeight / rows;
    const tableAlpha = ease(phase(progress, .13, .35)) * dissolve;

    context.save();
    context.globalAlpha = tableAlpha;
    context.fillStyle = "oklch(17% 0.014 145 / .8)";
    roundedRect(context, left - 14, top - 34, gridWidth + 28, gridHeight + 48, 5);
    context.fill();
    context.strokeStyle = "oklch(34% 0.014 145 / .72)";
    context.lineWidth = 1;
    context.stroke();
    for (let row = 0; row <= rows; row += 1) {
      context.beginPath();
      context.moveTo(left, top + row * rowHeight);
      context.lineTo(left + gridWidth, top + row * rowHeight);
      context.strokeStyle = `oklch(39% 0.012 145 / ${.22 + classify * .12})`;
      context.stroke();
    }
    context.restore();
    drawHeaders(left, top, gridWidth, tableAlpha, compact);

    records.slice(0, visibleRecords).forEach((record, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const targetX = left + (column + .5) * columnWidth;
      const targetY = top + (row + .52) * rowHeight;
      const startX = record.chaosX * width;
      const startY = record.chaosY * height;
      const x = startX + (targetX - startX) * organize;
      const y = startY + (targetY - startY) * organize;
      const rotation = record.rotation * (1 - organize);
      const classification = classify * (column >= columns - 2 ? 1 : .28);
      const tone = record.outcome > 0
        ? `oklch(76% 0.16 145 / ${record.alpha * classification})`
        : `oklch(67% 0.19 25 / ${record.alpha * classification})`;

      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.fillStyle = classification > .04 ? tone : `oklch(75% 0.014 130 / ${record.alpha * dissolve})`;
      const lineWidth = Math.min(columnWidth * .64, record.width + 13 * organize);
      roundedRect(context, -lineWidth / 2, -1.4, lineWidth, 2.8, 1.4);
      context.fill();
      context.restore();

      if (organize > .82 && row < rows && (column === 2 || column === columns - 1)) {
        context.save();
        context.globalAlpha = phase(organize, .82, 1) * dissolve * .72;
        context.fillStyle = classification > .05 ? tone : "oklch(73% .012 130)";
        context.font = `${compact ? 7 : 8}px Geologica, system-ui, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(column === 2 ? record.setup : `${record.pnl > 0 ? "+" : ""}${record.pnl}`, targetX, targetY);
        context.restore();
      }
    });

    if (classify > .05 && classify < .98) {
      const scanY = top + gridHeight * classify;
      const scanGradient = context.createLinearGradient(left, 0, left + gridWidth, 0);
      scanGradient.addColorStop(0, "oklch(88% .19 125 / 0)");
      scanGradient.addColorStop(.5, "oklch(88% .19 125 / .72)");
      scanGradient.addColorStop(1, "oklch(88% .19 125 / 0)");
      context.fillStyle = scanGradient;
      context.fillRect(left, scanY, gridWidth, 1);
    }

    if (analyze > .02) {
      const chartTop = top + gridHeight * .2;
      const chartHeight = gridHeight * .55;
      const points = 52;
      context.save();
      context.globalAlpha = analyze * dissolve;
      context.beginPath();
      for (let index = 0; index < points; index += 1) {
        const x = left + (index / (points - 1)) * gridWidth;
        const drift = index * 1.35 + Math.sin(index * .62) * 11 + Math.sin(index * .17) * 18;
        const y = chartTop + chartHeight - drift * analyze;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = `oklch(88% .19 125 / ${.35 + analyze * .65})`;
      context.lineWidth = 2;
      context.stroke();
      context.lineTo(left + gridWidth, top + gridHeight);
      context.lineTo(left, top + gridHeight);
      context.closePath();
      const fill = context.createLinearGradient(0, chartTop, 0, top + gridHeight);
      fill.addColorStop(0, "oklch(88% .19 125 / .11)");
      fill.addColorStop(1, "oklch(88% .19 125 / 0)");
      context.fillStyle = fill;
      context.fill();
      context.restore();
    }

    const reveal = ease(phase(progress, .78, .98));
    if (screen) {
      screen.style.opacity = String(reveal);
      screen.style.transform = `translate(-50%, ${-44 + reveal * -6}%) scale(${.9 + reveal * .1})`;
      const inset = 48 * (1 - reveal);
      screen.style.clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}%)`;
    }
    if (progressLine) progressLine.style.transform = `scaleX(${progress})`;
    const active = Math.min(3, Math.floor(progress * 4.15));
    steps.forEach((step, index) => step.classList.toggle("is-active", index === active));
    if (counter) counter.textContent = String(Math.max(1, Math.round(progress * 125 + 1))).padStart(3, "0");
  }

  function update() {
    draw(getProgress());
    queued = false;
  }

  function requestUpdate() {
    if (!active) return;
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) requestUpdate();
    }, { rootMargin: "100% 0px" });
    visibilityObserver.observe(section);
  }
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  steps[0]?.classList.add("is-active");
  resize();
}
