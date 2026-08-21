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
