import { h, mount } from "../utils.js";
import { dbGetAll, dbPut, dbDelete } from "../db.js";

function ingredientsToText(ingredients) {
  return (ingredients || []).map((i) => `${i.name} (${i.qty || ""}${i.unit || ""})`).join(", ");
}

function parseIngredientsInput(text) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ name: s, qty: 1, unit: "" }));
}

async function renderList(container, refresh) {
  const recipes = await dbGetAll("recipes");
  recipes.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

  if (!recipes.length) {
    mount(container, h("p", { class: "hint" }, "Aucune recette pour l'instant. Ajoute une photo de repas ou une recette manuelle."));
    return;
  }

  mount(
    container,
    h(
      "div",
      { class: "recipe-list" },
      recipes.map((r) =>
        h("div", { class: "card" }, [
          h("div", { class: "recipe-row" }, [
            h("strong", {}, r.name),
            h("span", { class: "badge" }, `×${r.frequency || 1}`),
          ]),
          h("p", { class: "hint" }, ingredientsToText(r.ingredients) || "Pas d'ingrédients détaillés"),
          h(
            "button",
            {
              class: "btn-link-danger",
              onclick: async () => {
                if (!confirm(`Supprimer la recette "${r.name}" ?`)) return;
                await dbDelete("recipes", r.id);
                refresh();
              },
            },
            "Supprimer"
          ),
        ])
      )
    )
  );
}

export async function render(container) {
  const listEl = h("div");

  const nameInput = h("input", { type: "text", class: "text-input", placeholder: "Nom de la recette" });
  const ingredientsInput = h("input", { type: "text", class: "text-input", placeholder: "Ingrédients séparés par des virgules" });

  async function refresh() {
    await renderList(listEl, refresh);
  }

  const addBtn = h(
    "button",
    {
      class: "btn-primary",
      onclick: async () => {
        if (!nameInput.value.trim()) return;
        await dbPut("recipes", {
          name: nameInput.value.trim(),
          ingredients: parseIngredientsInput(ingredientsInput.value),
          frequency: 1,
          source: "manual",
        });
        nameInput.value = "";
        ingredientsInput.value = "";
        refresh();
      },
    },
    "Ajouter la recette"
  );

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Recettes habituelles"),
      h("div", { class: "card" }, [h("h2", {}, "Ajout manuel"), nameInput, ingredientsInput, addBtn]),
      listEl,
    ])
  );

  await refresh();
}
