import { h, mount, AISLES, AISLE_LABELS } from "../utils.js";
import { analyzeReceiptPhoto, fileToBase64 } from "../claude.js";
import { dbPut } from "../db.js";

export async function render(container) {
  const fileInput = h("input", { type: "file", accept: "image/*", capture: "environment" });
  const preview = h("div", { class: "photo-preview" });
  const resultEl = h("div");
  const statusEl = h("p", { class: "hint" });

  let currentItems = [];

  function renderItemsForm() {
    const rows = currentItems.map((item, idx) =>
      h("div", { class: "item-row" }, [
        h("input", {
          type: "text",
          class: "text-input",
          value: item.name,
          oninput: (e) => (currentItems[idx].name = e.target.value),
        }),
        h("input", {
          type: "number",
          class: "text-input small",
          value: item.qty,
          oninput: (e) => (currentItems[idx].qty = Number(e.target.value) || 0),
        }),
        h(
          "select",
          { class: "text-input small" },
          AISLES.map((a) =>
            h("option", { value: a, selected: item.category === a ? "selected" : null }, AISLE_LABELS[a])
          )
        ),
        h(
          "button",
          {
            class: "btn-link-danger",
            onclick: () => {
              currentItems.splice(idx, 1);
              renderItemsForm();
            },
          },
          "✕"
        ),
      ])
    );

    const saveBtn = h(
      "button",
      {
        class: "btn-primary",
        onclick: async () => {
          await dbPut("purchases", { date: new Date().toISOString().slice(0, 10), items: currentItems });
          statusEl.textContent = "Ticket enregistré dans l'historique d'achats.";
          resultEl.innerHTML = "";
          currentItems = [];
        },
      },
      "Enregistrer dans l'historique"
    );

    mount(resultEl, h("div", { class: "card" }, [h("h2", {}, "Articles détectés — valide ou corrige"), ...rows, saveBtn]));
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    mount(preview, h("img", { src: URL.createObjectURL(file), class: "preview-img" }));
    statusEl.textContent = "Analyse en cours...";
    try {
      const base64 = await fileToBase64(file);
      const result = await analyzeReceiptPhoto(base64, file.type || "image/jpeg");
      currentItems = (result.items || []).map((i) => ({ ...i, category: i.category || "autre" }));
      statusEl.textContent = "";
      renderItemsForm();
    } catch (err) {
      statusEl.textContent = "Erreur : " + err.message;
    }
  });

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Ajouter un ticket de courses"),
      h("div", { class: "card" }, [h("p", {}, "Prends une photo de ton ticket de caisse."), fileInput, preview, statusEl]),
      resultEl,
    ])
  );
}
