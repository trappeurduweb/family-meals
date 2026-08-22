export const DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
export const DAY_LABELS = { lun: "Lundi", mar: "Mardi", mer: "Mercredi", jeu: "Jeudi", ven: "Vendredi", sam: "Samedi", dim: "Dimanche" };
export const MEALS = ["dejeuner", "diner"];
export const MEAL_LABELS = { dejeuner: "Déjeuner", diner: "Dîner" };

export const AISLES = ["fruits_legumes", "cremerie", "viande_poisson", "epicerie", "surgele", "boulangerie", "autre"];
export const AISLE_LABELS = {
  fruits_legumes: "Fruits & légumes",
  cremerie: "Crémerie",
  viande_poisson: "Viande & poisson",
  epicerie: "Épicerie",
  surgele: "Surgelés",
  boulangerie: "Boulangerie",
  autre: "Autre",
};

export const DIETS = ["aucun", "vegetarien", "vegan", "sans_porc", "sans_gluten", "autre"];
export const DIET_LABELS = {
  aucun: "Aucun",
  vegetarien: "Végétarien",
  vegan: "Vegan",
  sans_porc: "Sans porc",
  sans_gluten: "Sans gluten",
  autre: "Autre",
};

export const PORTIONS = ["enfant", "ado", "adulte"];
export const PORTION_LABELS = { enfant: "Enfant", ado: "Ado", adulte: "Adulte" };

export const RECIPE_TYPES = ["proteine", "accompagnement", "plat_complet"];
export const RECIPE_TYPE_LABELS = {
  proteine: "Protéine",
  accompagnement: "Accompagnement",
  plat_complet: "Plat complet",
};

const WEEKDAY_EN_TO_KEY = { Mon: "lun", Tue: "mar", Wed: "mer", Thu: "jeu", Fri: "ven", Sat: "sam", Sun: "dim" };

function getParisNowParts() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday").value;
  const hour = Number(parts.find((p) => p.type === "hour").value);
  return { dayKey: WEEKDAY_EN_TO_KEY[weekday], hour };
}

function getParisTodayDate() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
  return new Date(fmt.format(new Date()) + "T12:00:00");
}

// Construit la liste ordonnée des prochains créneaux (jour, repas), en
// commençant par le prochain repas réel (avant midi -> déjeuner du jour,
// après midi -> dîner du jour, heure de Paris), et en tournant sur une
// semaine complète (14 créneaux par défaut).
export function getUpcomingSlots(count = 14) {
  const { dayKey, hour } = getParisNowParts();
  const startDayIndex = DAYS.indexOf(dayKey);
  const startMealIndex = hour < 12 ? 0 : 1;
  const startDate = getParisTodayDate();

  const slots = [];
  let dayOffset = 0;
  let mealIndex = startMealIndex;
  for (let i = 0; i < count; i++) {
    const dayIndex = (startDayIndex + dayOffset) % DAYS.length;
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    slots.push({ day: DAYS[dayIndex], meal: MEALS[mealIndex], date: date.toISOString().slice(0, 10) });
    mealIndex++;
    if (mealIndex >= MEALS.length) {
      mealIndex = 0;
      dayOffset++;
    }
  }
  return slots;
}

// Ne garde que les créneaux où au moins une personne du foyer est présente
// (d'après le planning récurrent). Si le créneau n'a jamais été configuré,
// tout le monde est considéré présent par défaut (même logique que l'écran Foyer).
export function filterSlotsByPresence(slots, weeklyPattern, memberIds) {
  const grid = (weeklyPattern && weeklyPattern.grid) || {};
  return slots.filter(({ day, meal }) => {
    const key = `${day}_${meal}`;
    const present = grid[key] !== undefined ? grid[key] : memberIds;
    return present && present.length > 0;
  });
}

export function formatSlotDate(iso) {
  if (!iso) return null;
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === "class") el.className = value;
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined) el.setAttribute(key, value);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function mount(container, ...nodes) {
  clear(container);
  for (const n of nodes) container.appendChild(n);
}
