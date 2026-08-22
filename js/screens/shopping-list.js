import { h, mount, AISLES, AISLE_LABELS } from "../utils.js";
import { dbGet, dbPut } from "../cloud.js";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

export async function render(container) {
  let list = await dbGet("shoppingList", "current");
  if (!list) list = { id: "current", items: [] };
  if (!list.items) list.items = [];

  async function save() {
    await dbPut("shoppingList", list);
  }

  function renderScreen() {
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

        const qtyInput = h("input", { type: "number", class: "text-input small", value: item.qty ?? "" });
        const unitInput = h("input", { type: "text", class: "text-input small", value: item.unit || "", placeholder: "unité" });

        const row = h("div", { class: item.checked ? "shopping-item checked" : "shopping-item" }, [
          cb,
          h("span", { class: "shopping-item-name" }, item.name),
          qtyInput,
          unitInput,
          h(
            "button",
            {
              class: "btn-link-danger",
              onclick: async () => {
                list.items.splice(list.items.indexOf(item), 1);
                await save();
                renderScreen();
              },
            },
            "✕"
          ),
        ]);

        cb.addEventListener("change", async () => {
          item.checked = cb.checked;
          row.className = cb.checked ? "shopping-item checked" : "shopping-item";
          await save();
        });
        qtyInput.addEventListener("change", async () => {
          item.qty = qtyInput.value === "" ? "" : Number(qtyInput.value);
          await save();
        });
        unitInput.addEventListener("change", async () => {
          item.unit = unitInput.value;
          await save();
        });

        return row;
      });
      return h("div", { class: "card" }, [h("h2", {}, AISLE_LABELS[aisle]), ...rows]);
    });

    const addName = h("input", { type: "text", class: "text-input", placeholder: "Nom de l'article" });
    const addQty = h("input", { type: "number", class: "text-input small", placeholder: "Qté" });
    const addUnit = h("input", { type: "text", class: "text-input small", placeholder: "Unité" });
    const addAisle = h(
      "select",
      { class: "text-input" },
      AISLES.map((a) => h("option", { value: a }, AISLE_LABELS[a]))
    );
    const addBtn = h(
      "button",
      {
        class: "btn-primary",
        onclick: async () => {
          if (!addName.value.trim()) return;
          list.items.push({
            name: addName.value.trim(),
            qty: addQty.value === "" ? "" : Number(addQty.value),
            unit: addUnit.value.trim(),
            aisle: addAisle.value,
            checked: false,
          });
          await save();
          renderScreen();
        },
      },
      "Ajouter l'article"
    );

    const addCard = h("div", { class: "card" }, [
      h("h2", {}, "Ajouter un article"),
      addName,
      addQty,
      addUnit,
      addAisle,
      addBtn,
    ]);

    const genDate = formatDate(list.generated_at);
    const dateHint = genDate ? h("p", { class: "hint" }, `Générée le ${genDate}`) : null;

    if (!list.items.length) {
      mount(
        container,
        h("section", { class: "screen" }, [
          h("h1", {}, "Liste de courses"),
          dateHint,
          h("p", { class: "hint" }, "Liste vide. Génère-la depuis l'écran Menu, ou ajoute un article manuellement."),
          addCard,
        ])
      );
      return;
    }

    mount(container, h("section", { class: "screen" }, [h("h1", {}, "Liste de courses"), dateHint, ...sections, addCard]));
  }

  renderScreen();
}
