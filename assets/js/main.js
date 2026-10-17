import { initScrollStory } from "./scroll-story.js?v=20260726b";
import { getLanguage, initLanguageSwitcher } from "./i18n.js?v=20261017a";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function initHeader() {
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-scroll-progress]");
  if (!header) return;
  let queued = false;
  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    if (progress) {
      const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, window.scrollY / available)})`;
    }
    queued = false;
  };
  const requestUpdate = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
}

function initReveals() {
  const elements = document.querySelectorAll(".reveal");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
  elements.forEach((element) => observer.observe(element));
}

function initNavigation() {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#primary-nav");
  if (!header || !toggle || !nav) return;

  const setOpen = (open) => {
    const english = getLanguage() === "en";
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open
      ? (english ? "Close menu" : "Chiudi il menu")
      : (english ? "Open menu" : "Apri il menu"));
    document.body.classList.toggle("menu-open", open);
    document.querySelector("main")?.toggleAttribute("inert", open);
    document.querySelector("footer")?.toggleAttribute("inert", open);
    if (open) requestAnimationFrame(() => nav.querySelector("a")?.focus());
  };

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  const links = [...nav.querySelectorAll('a[href^="#"]')].filter((link) => link.hash !== "#accesso");
  const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => {
      if (link.hash === `#${visible.target.id}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-28% 0px -62%", threshold: [0, .15, .5] });
  sections.forEach((section) => observer.observe(section));
}

function switchPanels(button, buttons, panels, buttonKey, panelKey) {
  const target = button.dataset[buttonKey];
  buttons.forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => {
    const active = panel.dataset[panelKey] === target;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
}

function initJournalTabs() {
  const buttons = [...document.querySelectorAll("[data-journal-tab]")];
  const panels = [...document.querySelectorAll("[data-journal-panel]")];
  buttons.forEach((button) => button.addEventListener("click", () => {
    switchPanels(button, buttons, panels, "journalTab", "journalPanel");
  }));
  buttons.forEach((button, index) => button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
    buttons[nextIndex].click();
  }));
}

function initAnalysisFlow() {
  const points = [...document.querySelectorAll("[data-analysis-point]")];
  const panels = [...document.querySelectorAll("[data-analysis-panel]")];
  const label = document.querySelector("[data-analysis-label]");
  if (!points.length || !("IntersectionObserver" in window)) return;
  const names = {
    it: { dashboard: "Dashboard", core: "Metriche principali", growth: "Crescita e drawdown", calendar: "Calendario" },
    en: { dashboard: "Dashboard", core: "Core metrics", growth: "Growth and drawdown", calendar: "Calendar" },
  };
  const activate = (target) => {
    points.forEach((point) => point.classList.toggle("is-active", point.dataset.analysisPoint === target));
    panels.forEach((panel) => {
      const active = panel.dataset.analysisPanel === target;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    if (label) label.textContent = names[getLanguage()][target] || target;
  };
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) activate(visible.target.dataset.analysisPoint);
  }, { rootMargin: "-35% 0px -45%", threshold: [0, .25, .6] });
  points.forEach((point) => observer.observe(point));
  window.addEventListener("tapesense:languagechange", () => {
    const active = points.find((point) => point.classList.contains("is-active")) || points[0];
    if (active) activate(active.dataset.analysisPoint);
  });
}

function initDepthScene() {
  const scene = document.querySelector("[data-depth-scene]");
  if (!scene || reduceMotion.matches) return;
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  let queued = false;
  let pointerX = 0;
  let pointerY = 0;

  const render = () => {
    const bounds = scene.getBoundingClientRect();
    const center = bounds.top + bounds.height / 2;
    const scrollPhase = clamp((center - window.innerHeight / 2) / window.innerHeight, -1.2, 1.2);
    scene.style.setProperty("--depth-x", `${pointerX * 5.5}deg`);
    scene.style.setProperty("--depth-y", `${2.4 - pointerY * 4.2}deg`);
    scene.style.setProperty("--depth-scroll", `${scrollPhase * -18}px`);
    scene.style.setProperty("--chip-y-left", `${scrollPhase * 22}px`);
    scene.style.setProperty("--chip-y-right", `${scrollPhase * -30}px`);
    scene.style.setProperty("--glare-x", `${50 + pointerX * 42}%`);
    scene.style.setProperty("--glare-y", `${22 + pointerY * 34}%`);
    queued = false;
  };
  const requestRender = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  };
  const reset = () => {
    pointerX = 0;
    pointerY = 0;
    requestRender();
  };
  if (hasFinePointer) {
    scene.addEventListener("pointermove", (event) => {
      const bounds = scene.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - .5;
      pointerY = (event.clientY - bounds.top) / bounds.height - .5;
      requestRender();
    }, { passive: true });
    scene.addEventListener("pointerleave", reset);
  }
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
  render();
}

function initScrollDepth() {
  const panels = [...document.querySelectorAll("[data-scroll-depth]")];
  if (!panels.length || reduceMotion.matches) return;
  let queued = false;
  const render = () => {
    const compact = window.innerWidth < 768;
    panels.forEach((panel) => {
      const bounds = panel.getBoundingClientRect();
      if (bounds.bottom < -window.innerHeight || bounds.top > window.innerHeight * 2) return;
      const phase = clamp((bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight, -1, 1);
      panel.style.setProperty("--panel-tilt", compact ? "0deg" : `${phase * -3.8}deg`);
      panel.style.setProperty("--panel-lift", `${phase * -10}px`);
    });
    queued = false;
  };
  const requestRender = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  };
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
  render();
}

function initVideoGuides() {
  const buttons = [...document.querySelectorAll("[data-youtube-id]")];
  const directLinks = {
    ivkgzrEYIP4: "https://youtu.be/ivkgzrEYIP4?si=F_b4xIBFq9xwbiH8",
    bXxB9k85VNA: "https://youtu.be/bXxB9k85VNA?si=JAusqk6XZeBiKLBx",
  };
  const titles = {
    it: {
      ivkgzrEYIP4: "Video guida: installare TapeSense",
      bXxB9k85VNA: "Video guida: importare, aggiungere ed esportare dati",
    },
    en: {
      ivkgzrEYIP4: "Video guide: installing TapeSense",
      bXxB9k85VNA: "Video guide: importing, adding and exporting data",
    },
  };
  const localPreview = window.location.protocol === "file:";
  const updateLocalPreviewCopy = () => {
    if (!localPreview) return;
    buttons.forEach((button) => {
      const note = button.querySelector("small");
      if (note) {
        note.textContent = getLanguage() === "en"
          ? "Local preview: the video opens on YouTube"
          : "Anteprima locale: il video si apre su YouTube";
      }
    });
  };
  buttons.forEach((button) => button.addEventListener("click", () => {
    const videoId = button.dataset.youtubeId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
    if (localPreview) {
      window.open(directLinks[videoId], "_blank", "noopener,noreferrer");
      return;
    }
    const iframe = document.createElement("iframe");
    const origin = encodeURIComponent(window.location.origin);
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&origin=${origin}`;
    iframe.title = titles[getLanguage()][videoId];
    iframe.dataset.videoId = videoId;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    button.replaceWith(iframe);
  }));
  window.addEventListener("tapesense:languagechange", () => {
    updateLocalPreviewCopy();
    document.querySelectorAll("iframe[data-video-id]").forEach((iframe) => {
      iframe.title = titles[getLanguage()][iframe.dataset.videoId];
    });
  });
  updateLocalPreviewCopy();
}

document.querySelectorAll("[data-year]").forEach((item) => { item.textContent = String(new Date().getFullYear()); });
initLanguageSwitcher();
initHeader();
initNavigation();
initReveals();
initJournalTabs();
initAnalysisFlow();
initDepthScene();
initScrollDepth();
initVideoGuides();
initScrollStory({ reduceMotion });
