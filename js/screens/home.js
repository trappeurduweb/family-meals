import { h, mount, DAY_LABELS, MEAL_LABELS } from "../utils.js";
import { dbGetAll, dbGet, dbPut } from "../cloud.js";
import { analyzeFridgePhoto, generateWeeklyMenu, fileToBase64 } from "../claude.js";

async function renderCurrentMenuPreview(container) {
  const menu = await dbGet("menu", "current");
  if (!menu || !menu.slots || !menu.slots.length) {
    mount(container, h("p", { class: "hint" }, "Aucun menu généré pour l'instant."));
    return;
  }
  const preview = menu.slots.slice(0, 4).map((s) =>
    h("div", { class: "slot-preview" }, `${DAY_LABELS[s.day] || s.day} · ${MEAL_LABELS[s.meal] || s.meal} — ${s.recipeName}`)
  );
  mount(
    container,
    h("div", {}, [
      ...preview,
      h("a", { href: "#/menu", class: "btn-link" }, "Voir le menu complet →"),
    ])
  );
}

export async function render(container) {
  const menuPreviewEl = h("div");
  const genStatusEl = h("p", { class: "hint" });
  const fridgeInput = h("input", { type: "file", accept: "image/*", capture: "environment", style: "display:none" });
  const genSection = h("div");

  await renderCurrentMenuPreview(menuPreviewEl);

  fridgeInput.addEventListener("change", async () => {
    const file = fridgeInput.files[0];
    if (!file) return;
    genStatusEl.textContent = "Analyse du frigo en cours...";
    try {
      const base64 = await fileToBase64(file);
      const fridgeStock = await analyzeFridgePhoto(base64, file.type || "image/jpeg");

      genStatusEl.textContent = "Génération du menu de la semaine (peut prendre quelques secondes)...";
      const [recipes, purchases, members, weeklyPattern] = await Promise.all([
        dbGetAll("recipes"),
        dbGetAll("purchases"),
        dbGetAll("members"),
        dbGet("weeklyPattern", "default"),
      ]);
      const recentPurchases = purchases.slice(-10);

      const result = await generateWeeklyMenu({
        recipes,
        purchaseHistory: recentPurchases,
        fridgeStock,
        weeklyPattern: weeklyPattern || { grid: {} },
        members,
      });

      await dbPut("menu", { id: "current", slots: result.slots || [], generatedAt: new Date().toISOString() });
      await dbPut("shoppingList", { id: "current", items: [], generatedAt: null });

      genStatusEl.textContent = "Menu généré !";
      location.hash = "#/menu";
    } catch (err) {
      genStatusEl.textContent = "Erreur : " + err.message;
    }
  });

  const generateBtn = h(
    "button",
    {
      class: "btn-primary btn-large",
      onclick: () => fridgeInput.click(),
    },
    "📷 Générer le menu de la semaine"
  );

  mount(
    genSection,
    h("div", { class: "card" }, [
      h("h2", {}, "Nouveau menu"),
      h("p", { class: "hint" }, "Prends une photo de ton frigo pour démarrer."),
      generateBtn,
      fridgeInput,
      genStatusEl,
    ])
  );

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Menu Famille"),
      genSection,
      h("div", { class: "card" }, [h("h2", {}, "Menu en cours"), menuPreviewEl]),
      h("div", { class: "card shortcuts" }, [
        h("h2", {}, "Ajouter des données"),
        h("a", { href: "#/add-receipt", class: "btn-secondary" }, "🧾 Ajouter un ticket de courses"),
        h("a", { href: "#/add-meal", class: "btn-secondary" }, "🍽️ Ajouter une photo de repas"),
      ]),
    ])
  );
}
