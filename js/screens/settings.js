import { h, mount } from "../utils.js";
import { getSetting, setSetting, dbClearAll } from "../db.js";
import { dbClearAllCloud } from "../cloud.js";

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

  const resetLocalBtn = h(
    "button",
    {
      class: "btn-danger",
      onclick: async () => {
        if (!confirm("Oublier la clé API Claude sur cet appareil ?")) return;
        await dbClearAll();
        location.hash = "#/settings";
        location.reload();
      },
    },
    "Oublier la clé API sur cet appareil"
  );

  const resetCloudBtn = h(
    "button",
    {
      class: "btn-danger",
      onclick: async () => {
        if (!confirm("Effacer TOUTES les données partagées de la famille (membres, planning, recettes, historique, menu) ? Cette action est irréversible pour tout le monde.")) return;
        await dbClearAllCloud();
        alert("Données partagées effacées.");
        location.hash = "#/home";
      },
    },
    "Effacer toutes les données partagées de la famille"
  );

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Réglages"),
      h("div", { class: "card" }, [
        h("h2", {}, "Clé API Claude"),
        h(
          "p",
          { class: "hint" },
          "Nécessaire pour analyser tes photos (tickets, frigo, plats) et générer le menu. Stockée uniquement sur cet appareil — jamais envoyée à la base partagée. Chaque membre du foyer doit renseigner sa propre clé."
        ),
        input,
        saveBtn,
        status,
      ]),
      h("div", { class: "card" }, [
        h("h2", {}, "Données de cet appareil"),
        h("p", { class: "hint" }, "Concerne uniquement la clé API stockée ici."),
        resetLocalBtn,
      ]),
      h("div", { class: "card" }, [
        h("h2", {}, "Données partagées de la famille"),
        h(
          "p",
          { class: "hint" },
          "Foyer, recettes, historique d'achats et menu sont stockés en ligne (base partagée, accessible sans protection à quiconque a le lien de l'app)."
        ),
        resetCloudBtn,
      ]),
    ])
  );
}
