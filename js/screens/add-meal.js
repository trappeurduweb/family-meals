import { h, mount, RECIPE_TYPES, RECIPE_TYPE_LABELS } from "../utils.js";
import { analyzeMealPhoto, fileToBase64 } from "../claude.js";
import { dbGetAll, dbPut } from "../cloud.js";

export async function render(container) {
  const fileInput = h("input", { type: "file", accept: "image/*", capture: "environment" });
  const preview = h("div", { class: "photo-preview" });
  const resultEl = h("div");
  const statusEl = h("p", { class: "hint" });

  let current = null;

  function renderForm() {
    const nameInput = h("input", { type: "text", class: "text-input", value: current.name });
    const typeSelect = h(
      "select",
      { class: "text-input" },
      RECIPE_TYPES.map((t) => h("option", { value: t, selected: (current.type || "plat_complet") === t ? "selected" : null }, RECIPE_TYPE_LABELS[t]))
    );
    const ingredientsInput = h("input", {
      type: "text",
      class: "text-input",
      value: (current.ingredients || []).map((i) => i.name).join(", "),
    });

    const saveBtn = h(
      "button",
      {
        class: "btn-primary",
        onclick: async () => {
          const name = nameInput.value.trim();
          if (!name) return;
          const ingredients = ingredientsInput.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => ({ name: s, qty: 1, unit: "" }));

          const recipes = await dbGetAll("recipes");
          const existing = recipes.find((r) => r.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            existing.frequency = (existing.frequency || 1) + 1;
            existing.ingredients = ingredients;
            existing.type = typeSelect.value;
            await dbPut("recipes", existing);
          } else {
            await dbPut("recipes", { name, type: typeSelect.value, ingredients, frequency: 1, source: "photo" });
          }
          statusEl.textContent = "Recette ajoutée à la bibliothèque.";
          resultEl.innerHTML = "";
        },
      },
      "Ajouter à la bibliothèque"
    );

    mount(
      resultEl,
      h("div", { class: "card" }, [
        h("h2", {}, "Plat détecté — valide ou corrige"),
        h("label", {}, "Nom du plat"),
        nameInput,
        h("label", {}, "Type de plat"),
        typeSelect,
        h("label", {}, "Ingrédients"),
        ingredientsInput,
        saveBtn,
      ])
    );
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    mount(preview, h("img", { src: URL.createObjectURL(file), class: "preview-img" }));
    statusEl.textContent = "Analyse en cours...";
    try {
      const base64 = await fileToBase64(file);
      current = await analyzeMealPhoto(base64, file.type || "image/jpeg");
      statusEl.textContent = "";
      renderForm();
    } catch (err) {
      statusEl.textContent = "Erreur : " + err.message;
    }
  });

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Ajouter une photo de repas"),
      h("div", { class: "card" }, [h("p", {}, "Prends une photo du plat que vous avez mangé."), fileInput, preview, statusEl]),
      resultEl,
    ])
  );
}
