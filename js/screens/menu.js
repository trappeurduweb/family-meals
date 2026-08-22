import { h, mount, DAY_LABELS, MEAL_LABELS, RECIPE_TYPE_LABELS, formatSlotDate } from "../utils.js";
import { dbGet, dbGetAll, dbPut } from "../cloud.js";

function aggregateShoppingList(slots) {
  const byKey = new Map();
  for (const slot of slots) {
    for (const ing of slot.ingredients || []) {
      const key = `${ing.name.toLowerCase()}_${ing.unit || ""}`;
      if (byKey.has(key)) {
        byKey.get(key).qty += Number(ing.qty) || 0;
      } else {
        byKey.set(key, { name: ing.name, qty: Number(ing.qty) || 0, unit: ing.unit || "", aisle: ing.aisle || "autre", checked: false });
      }
    }
  }
  return Array.from(byKey.values());
}

function getDishes(slot) {
  if (slot.dishes && slot.dishes.length) return slot.dishes;
  // Compatibilité avec un menu généré avant l'ajout des types de plat.
  if (slot.recipeName) {
    return [{ recipeName: slot.recipeName, type: "plat_complet", isNewSuggestion: slot.isNewSuggestion, isLeftoverOf: slot.isLeftoverOf }];
  }
  return [];
}

export async function render(container) {
  const [menu, recipes] = await Promise.all([dbGet("menu", "current"), dbGetAll("recipes")]);

  if (!menu || !menu.slots || !menu.slots.length) {
    mount(
      container,
      h("section", { class: "screen" }, [h("h1", {}, "Menu de la semaine"), h("p", { class: "hint" }, "Aucun menu généré. Retourne à l'accueil pour en générer un.")])
    );
    return;
  }

  const recipesByType = new Map();
  for (const r of recipes) {
    const type = r.type || "plat_complet";
    if (!recipesByType.has(type)) recipesByType.set(type, []);
    recipesByType.get(type).push(r);
  }

  async function validateDish(slot, dish) {
    const isSingleDish = slot.dishes.length === 1;
    await dbPut("recipes", {
      name: dish.recipeName,
      type: dish.type,
      ingredients: isSingleDish ? slot.ingredients || [] : [],
      frequency: 1,
      source: "menu_suggestion",
    });
    dish.isNewSuggestion = false;
    await dbPut("menu", menu);
    await render(container);
  }

  const grid = h("div", { class: "menu-grid" });
  let dayCard = null;
  let currentDayKey = null;

  for (const slot of menu.slots) {
    const dishes = getDishes(slot);
    slot.dishes = dishes;

    // Regroupe par date réelle quand elle est connue (un même jour de semaine
    // peut apparaître deux fois si le menu boucle sur plus de 7 jours), sinon
    // par nom de jour (compatibilité avec un ancien menu sans date).
    const dayKey = slot.date || slot.day;
    if (dayKey !== currentDayKey) {
      currentDayKey = dayKey;
      const label = slot.date ? formatSlotDate(slot.date) : DAY_LABELS[slot.day] || slot.day;
      dayCard = h("div", { class: "menu-day" }, [h("h3", {}, label)]);
      grid.appendChild(dayCard);
    }

    const dishRows = dishes.map((dish) => {
      const options = [];
      if (dish.isNewSuggestion) {
        options.push({ value: dish.recipeName, label: `${dish.recipeName} (nouveauté IA, non enregistrée)` });
      }
      for (const r of recipesByType.get(dish.type) || []) {
        if (dish.isNewSuggestion && r.name === dish.recipeName) continue;
        options.push({ value: r.name, label: r.name });
      }
      if (!dish.isNewSuggestion && !options.some((o) => o.value === dish.recipeName)) {
        // Recette du menu introuvable dans la bibliothèque (ex: recette supprimée depuis) : on la garde sélectionnable.
        options.unshift({ value: dish.recipeName, label: `${dish.recipeName} (introuvable dans les recettes)` });
      }

      const select = h(
        "select",
        {
          class: "text-input",
          onchange: async (e) => {
            dish.recipeName = e.target.value;
            dish.isNewSuggestion = false;
            await dbPut("menu", menu);
          },
        },
        options.map((o) => h("option", { value: o.value, selected: o.value === dish.recipeName ? "selected" : null }, o.label))
      );

      const validateBtn = dish.isNewSuggestion
        ? h("button", { class: "btn-link", onclick: () => validateDish(slot, dish) }, "Ajouter aux recettes")
        : null;

      return h("div", { class: "menu-dish-row" }, [
        h("span", { class: "badge badge-type" }, RECIPE_TYPE_LABELS[dish.type] || RECIPE_TYPE_LABELS.plat_complet),
        select,
        dish.isNewSuggestion ? h("span", { class: "badge" }, "Nouveauté") : null,
        dish.isLeftoverOf ? h("span", { class: "badge" }, "Restes") : null,
        validateBtn,
      ]);
    });

    dayCard.appendChild(
      h("div", { class: "menu-slot" }, [h("span", { class: "meal-label" }, MEAL_LABELS[slot.meal] || slot.meal), ...dishRows])
    );
  }

  const shoppingBtn = h(
    "button",
    {
      class: "btn-primary btn-large",
      onclick: async () => {
        const items = aggregateShoppingList(menu.slots);
        await dbPut("shoppingList", { id: "current", items, generated_at: new Date().toISOString() });
        location.hash = "#/shopping-list";
      },
    },
    "🛒 Générer la liste de courses"
  );

  mount(
    container,
    h("section", { class: "screen" }, [h("h1", {}, "Menu de la semaine"), grid, shoppingBtn])
  );
}
