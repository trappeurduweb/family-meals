import { h, mount } from "../utils.js";
import { getSetting, setSetting, dbClearAll } from "../db.js";

export async function render(container) {
  const currentKey = (await getSetting("apiKey")) || "";

  const input = h("input", {
    type: "password",
    id: "api-key-input",
    placeholder: "sk-ant-...",
    value: currentKey,
    class: "text-input",
  });

  const status = h("p", { class: "hint" }, currentKey ? "Clé enregistrée sur ce téléphone." : "Aucune clé enregistrée.");

  const saveBtn = h(
    "button",
    {
      class: "btn-primary",
      onclick: async () => {
        await setSetting("apiKey", input.value.trim());
        status.textContent = "Clé enregistrée.";
      },
    },
    "Enregistrer la clé"
  );

  const resetBtn = h(
    "button",
    {
      class: "btn-danger",
      onclick: async () => {
        if (!confirm("Supprimer toutes les données locales (foyer, recettes, historique, menu) ? La clé API sera aussi effacée.")) return;
        await dbClearAll();
        location.hash = "#/settings";
        location.reload();
      },
    },
    "Réinitialiser toutes les données locales"
  );

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Réglages"),
      h("div", { class: "card" }, [
        h("h2", {}, "Clé API Claude"),
        h("p", { class: "hint" }, "Nécessaire pour analyser tes photos (tickets, frigo, plats) et générer le menu. Stockée uniquement sur ce téléphone."),
        input,
        saveBtn,
        status,
      ]),
      h("div", { class: "card" }, [
        h("h2", {}, "Données"),
        h("p", { class: "hint" }, "Tout est stocké localement dans ce navigateur. Effacer les données Safari ou changer de téléphone fera perdre l'historique."),
        resetBtn,
      ]),
    ])
  );
}
