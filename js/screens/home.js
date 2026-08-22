import { h, mount, DAY_LABELS, MEAL_LABELS } from "../utils.js";
import { dbGetAll, dbGet, dbPut } from "../cloud.js";
import { generateWeeklyMenu } from "../claude.js";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

async function renderCurrentMenuPreview(container) {
  const menu = await dbGet("menu", "current");
  if (!menu || !menu.slots || !menu.slots.length) {
    mount(container, h("p", { class: "hint" }, "Aucun menu généré pour l'instant."));
    return;
  }
  const preview = menu.slots.slice(0, 4).map((s) =>
    h("div", { class: "slot-preview" }, `${DAY_LABELS[s.day] || s.day} · ${MEAL_LABELS[s.meal] || s.meal} — ${s.recipeName}`)
  );
  const genDate = formatDate(menu.generatedAt);
  mount(
    container,
    h("div", {}, [
      genDate ? h("p", { class: "hint" }, `Générée le ${genDate}`) : null,
      ...preview,
      h("a", { href: "#/menu", class: "btn-link" }, "Voir le menu complet →"),
    ])
  );
}

async function renderShoppingListPreview(container) {
  const list = await dbGet("shoppingList", "current");
  if (!list || !list.items || !list.items.length) {
    mount(container, h("p", { class: "hint" }, "Aucune liste de courses pour l'instant."));
    return;
  }
  const genDate = formatDate(list.generatedAt);
  const checkedCount = list.items.filter((i) => i.checked).length;
  mount(
    container,
    h("div", {}, [
      genDate ? h("p", { class: "hint" }, `Générée le ${genDate}`) : null,
      h("p", {}, `${checkedCount} / ${list.items.length} articles cochés`),
      h("a", { href: "#/shopping-list", class: "btn-link" }, "Voir la liste de courses →"),
    ])
  );
}

export async function render(container) {
  const menuPreviewEl = h("div");
  const shoppingPreviewEl = h("div");
  const genStatusEl = h("pre", { class: "error-box" });

  await Promise.all([renderCurrentMenuPreview(menuPreviewEl), renderShoppingListPreview(shoppingPreviewEl)]);

  const generateBtn = h(
    "button",
    {
      class: "btn-primary btn-large",
      onclick: async () => {
        generateBtn.disabled = true;
        genStatusEl.textContent = "Génération du menu de la semaine (peut prendre quelques secondes)...";
        try {
          const [recipes, members, weeklyPattern] = await Promise.all([
            dbGetAll("recipes"),
            dbGetAll("members"),
            dbGet("weeklyPattern", "default"),
          ]);

          const result = await generateWeeklyMenu({
            recipes,
            weeklyPattern: weeklyPattern || { grid: {} },
            members,
          });

          await dbPut("menu", { id: "current", slots: result.slots || [], generatedAt: new Date().toISOString() });

          genStatusEl.textContent = "Menu généré !";
          location.hash = "#/menu";
        } catch (err) {
          genStatusEl.textContent = "Erreur : " + err.message;
        } finally {
          generateBtn.disabled = false;
        }
      },
    },
    "🍽️ Générer le menu de la semaine"
  );

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Menu Famille"),
      h("div", { class: "card" }, [
        h("h2", {}, "Nouveau menu"),
        h("p", { class: "hint" }, "Génère un menu complet de la semaine à partir de tes recettes habituelles et des contraintes du foyer."),
        generateBtn,
        genStatusEl,
      ]),
      h("div", { class: "card" }, [h("h2", {}, "Menu en cours"), menuPreviewEl]),
      h("div", { class: "card" }, [h("h2", {}, "Liste de courses"), shoppingPreviewEl]),
      h("div", { class: "card shortcuts" }, [
        h("h2", {}, "Ajouter des données"),
        h("a", { href: "#/add-receipt", class: "btn-secondary" }, "🧾 Ajouter un ticket de courses"),
        h("a", { href: "#/add-meal", class: "btn-secondary" }, "🍽️ Ajouter une photo de repas"),
      ]),
    ])
  );
}
