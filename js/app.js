import { h, mount } from "./utils.js";

const TABS = [
  { route: "home", icon: "🏠", label: "Accueil" },
  { route: "recipes", icon: "📖", label: "Recettes" },
  { route: "household", icon: "👨‍👩‍👧", label: "Foyer" },
  { route: "settings", icon: "⚙️", label: "Réglages" },
];

const SCREEN_MODULES = {
  home: () => import("./screens/home.js"),
  recipes: () => import("./screens/recipes.js"),
  household: () => import("./screens/household.js"),
  settings: () => import("./screens/settings.js"),
  menu: () => import("./screens/menu.js"),
  "shopping-list": () => import("./screens/shopping-list.js"),
  "add-receipt": () => import("./screens/add-receipt.js"),
  "add-meal": () => import("./screens/add-meal.js"),
};

function currentRoute() {
  const hash = location.hash.replace(/^#\//, "");
  return hash || "home";
}

function renderTabBar(active) {
  const tabBar = document.getElementById("tab-bar");
  tabBar.innerHTML = "";
  for (const tab of TABS) {
    const isActive = tab.route === active;
    tabBar.appendChild(
      h(
        "a",
        { href: `#/${tab.route}`, class: isActive ? "tab active" : "tab" },
        [h("span", { class: "tab-icon" }, tab.icon), h("span", { class: "tab-label" }, tab.label)]
      )
    );
  }
}

async function renderScreen() {
  const route = currentRoute();
  const isMainTab = TABS.some((t) => t.route === route);
  renderTabBar(isMainTab ? route : null);

  const app = document.getElementById("app");
  mount(app, h("div", { class: "loading" }, "Chargement..."));

  const loader = SCREEN_MODULES[route] || SCREEN_MODULES.home;
  try {
    const mod = await loader();
    await mod.render(app);
  } catch (err) {
    mount(app, h("div", { class: "screen" }, [h("h1", {}, "Erreur"), h("p", {}, String(err && err.message ? err.message : err))]));
  }
}

window.addEventListener("hashchange", renderScreen);
window.addEventListener("DOMContentLoaded", () => {
  renderScreen();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
});
