import { h, mount, DAYS, DAY_LABELS, MEALS, MEAL_LABELS, RECIPE_TYPE_LABELS } from "../utils.js";
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

  const slotByKey = new Map(menu.slots.map((s) => [`${s.day}_${s.meal}`, s]));

  const grid = h("div", { class: "menu-grid" });
  for (const day of DAYS) {
    const dayCard = h("div", { class: "menu-day" }, [h("h3", {}, DAY_LABELS[day])]);
    for (const meal of MEALS) {
      const slot = slotByKey.get(`${day}_${meal}`);
      if (!slot) continue;

      const dishes = getDishes(slot);
      slot.dishes = dishes;

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
        h("div", { class: "menu-slot" }, [h("span", { class: "meal-label" }, MEAL_LABELS[meal]), ...dishRows])
      );
    }
    grid.appendChild(dayCard);
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
