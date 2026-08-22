import { h, mount, RECIPE_TYPES, RECIPE_TYPE_LABELS } from "../utils.js";
import { dbGetAll, dbPut, dbDelete } from "../cloud.js";

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

function recipeForm(existing, onSave, onCancel) {
  const nameInput = h("input", { type: "text", class: "text-input", placeholder: "Nom de la recette", value: existing?.name || "" });
  const typeSelect = h(
    "select",
    { class: "text-input" },
    RECIPE_TYPES.map((t) => h("option", { value: t, selected: (existing?.type || "plat_complet") === t ? "selected" : null }, RECIPE_TYPE_LABELS[t]))
  );
  const ingredientsInput = h("input", {
    type: "text",
    class: "text-input",
    placeholder: "Ingrédients séparés par des virgules",
    value: (existing?.ingredients || []).map((i) => i.name).join(", "),
  });

  const saveBtn = h(
    "button",
    {
      class: "btn-primary",
      onclick: async () => {
        if (!nameInput.value.trim()) return;
        await dbPut("recipes", {
          ...(existing || { frequency: 1, source: "manual" }),
          name: nameInput.value.trim(),
          type: typeSelect.value,
          ingredients: parseIngredientsInput(ingredientsInput.value),
        });
        onSave();
      },
    },
    existing ? "Mettre à jour" : "Ajouter la recette"
  );

  const children = [
    h("h2", {}, existing ? `Modifier "${existing.name}"` : "Ajout manuel"),
    h("label", {}, "Nom"),
    nameInput,
    h("label", {}, "Type de plat"),
    typeSelect,
    h("label", {}, "Ingrédients"),
    ingredientsInput,
    saveBtn,
  ];

  if (existing && onCancel) {
    children.push(h("button", { class: "btn-secondary", onclick: onCancel }, "Annuler"));
  }

  return h("div", { class: "card" }, children);
}

async function renderList(container, refresh, onEdit) {
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
            h("span", { class: "badge" }, RECIPE_TYPE_LABELS[r.type] || RECIPE_TYPE_LABELS.plat_complet),
            h("span", { class: "badge" }, `×${r.frequency || 1}`),
          ]),
          h("p", { class: "hint" }, ingredientsToText(r.ingredients) || "Pas d'ingrédients détaillés"),
          h("div", {}, [
            h("button", { class: "btn-link", onclick: () => onEdit(r) }, "Modifier"),
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
          ]),
        ])
      )
    )
  );
}

export async function render(container) {
  const listEl = h("div");
  const formEl = h("div");

  function showAddForm() {
    mount(formEl, recipeForm(null, refresh));
  }

  function showEditForm(recipe) {
    mount(formEl, recipeForm(recipe, refresh, showAddForm));
  }

  async function refresh() {
    await renderList(listEl, refresh, showEditForm);
    showAddForm();
  }

  mount(
    container,
    h("section", { class: "screen" }, [h("h1", {}, "Recettes habituelles"), formEl, listEl])
  );

  await refresh();
}
