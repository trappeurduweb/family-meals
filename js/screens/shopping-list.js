import { h, mount, AISLES, AISLE_LABELS } from "../utils.js";
import { dbGet, dbPut } from "../db.js";

export async function render(container) {
  const list = await dbGet("shoppingList", "current");

  if (!list || !list.items || !list.items.length) {
    mount(
      container,
      h("section", { class: "screen" }, [
        h("h1", {}, "Liste de courses"),
        h("p", { class: "hint" }, "Aucune liste générée. Génère-la depuis l'écran Menu."),
      ])
    );
    return;
  }

  const byAisle = new Map();
  for (const item of list.items) {
    const aisle = item.aisle || "autre";
    if (!byAisle.has(aisle)) byAisle.set(aisle, []);
    byAisle.get(aisle).push(item);
  }

  const sections = AISLES.filter((a) => byAisle.has(a)).map((aisle) => {
    const rows = byAisle.get(aisle).map((item) => {
      const cb = h("input", { type: "checkbox" });
      cb.checked = !!item.checked;
      const label = h("label", { class: item.checked ? "shopping-item checked" : "shopping-item" }, [
        cb,
        `${item.name}${item.qty ? ` — ${item.qty}${item.unit || ""}` : ""}`,
      ]);
      cb.addEventListener("change", async () => {
        item.checked = cb.checked;
        label.className = cb.checked ? "shopping-item checked" : "shopping-item";
        await dbPut("shoppingList", list);
      });
      return label;
    });
    return h("div", { class: "card" }, [h("h2", {}, AISLE_LABELS[aisle]), ...rows]);
  });

  mount(container, h("section", { class: "screen" }, [h("h1", {}, "Liste de courses"), ...sections]));
}
