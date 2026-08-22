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

export const SHOPPING_TIME_SLOTS = ["matin", "aprem"];
export const SHOPPING_TIME_SLOT_LABELS = { matin: "Matin", aprem: "Après-midi" };
const SHOPPING_TIME_SLOT_TO_MEAL = { matin: "dejeuner", aprem: "diner" };

export function shoppingSlotToMeal(timeSlot) {
  return SHOPPING_TIME_SLOT_TO_MEAL[timeSlot] || "dejeuner";
}

const WEEKDAY_EN_TO_KEY = { Mon: "lun", Tue: "mar", Wed: "mer", Thu: "jeu", Fri: "ven", Sat: "sam", Sun: "dim" };

export function getParisTodayDayKey() {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" });
  return WEEKDAY_EN_TO_KEY[fmt.format(new Date())];
}

function getParisTodayDate() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
  return new Date(fmt.format(new Date()) + "T12:00:00");
}

// Construit la liste ordonnée des créneaux (jour, repas) en partant du jour
// de courses choisi par l'utilisateur (prochaine occurrence de ce jour de la
// semaine à partir d'aujourd'hui) et du repas correspondant au moment choisi
// (matin -> déjeuner du jour, après-midi -> dîner du jour), puis en tournant
// sur une semaine complète (14 créneaux par défaut).
export function getSlotsStartingAt(dayKey, meal, count = 14) {
  const todayIndex = DAYS.indexOf(getParisTodayDayKey());
  const startDayIndex = DAYS.indexOf(dayKey);
  const offsetToStart = (startDayIndex - todayIndex + DAYS.length) % DAYS.length;
  const baseDate = getParisTodayDate();
  const startMealIndex = MEALS.indexOf(meal);

  const slots = [];
  let dIdx = startDayIndex;
  let mIdx = startMealIndex;
  let offset = offsetToStart;
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offset);
    slots.push({ day: DAYS[dIdx], meal: MEALS[mIdx], date: date.toISOString().slice(0, 10) });
    mIdx++;
    if (mIdx >= MEALS.length) {
      mIdx = 0;
      dIdx = (dIdx + 1) % DAYS.length;
      offset++;
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
