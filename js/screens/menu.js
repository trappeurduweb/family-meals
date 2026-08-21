import { h, mount, DAYS, DAY_LABELS, MEALS, MEAL_LABELS } from "../utils.js";
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
      const nameInput = h("input", {
        type: "text",
        class: "text-input",
        value: slot.recipeName,
        oninput: async (e) => {
          slot.recipeName = e.target.value;
          await dbPut("menu", menu);
        },
      });
      dayCard.appendChild(
        h("div", { class: "menu-slot" }, [
          h("span", { class: "meal-label" }, MEAL_LABELS[meal]),
          nameInput,
          slot.isNewSuggestion ? h("span", { class: "badge" }, "Nouveauté") : null,
          slot.isLeftoverOf ? h("span", { class: "badge" }, "Restes") : null,
        ])
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
        await dbPut("shoppingList", { id: "current", items, generatedAt: new Date().toISOString() });
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
