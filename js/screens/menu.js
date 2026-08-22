import { h, mount, DAY_LABELS, MEAL_LABELS, RECIPE_TYPE_LABELS, formatSlotDate } from "../utils.js";
import { dbGet, dbPut } from "../cloud.js";

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
  const menu = await dbGet("menu", "current");

  if (!menu || !menu.slots || !menu.slots.length) {
    mount(
      container,
      h("section", { class: "screen" }, [h("h1", {}, "Menu de la semaine"), h("p", { class: "hint" }, "Aucun menu généré. Retourne à l'accueil pour en générer un.")])
    );
    return;
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
      const nameInput = h("input", {
        type: "text",
        class: "text-input",
        value: dish.recipeName,
        oninput: async (e) => {
          dish.recipeName = e.target.value;
          await dbPut("menu", menu);
        },
      });
      return h("div", { class: "menu-dish-row" }, [
        h("span", { class: "badge badge-type" }, RECIPE_TYPE_LABELS[dish.type] || RECIPE_TYPE_LABELS.plat_complet),
        nameInput,
        dish.isNewSuggestion ? h("span", { class: "badge" }, "Nouveauté") : null,
        dish.isLeftoverOf ? h("span", { class: "badge" }, "Restes") : null,
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
