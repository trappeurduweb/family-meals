import {
  h,
  mount,
  DAYS,
  DAY_LABELS,
  MEAL_LABELS,
  SHOPPING_TIME_SLOTS,
  SHOPPING_TIME_SLOT_LABELS,
  shoppingSlotToMeal,
  getSlotsStartingAt,
  filterSlotsByPresence,
  formatSlotDate,
  getParisTodayDayKey,
} from "../utils.js";
import { dbGetAll, dbGet, dbPut } from "../cloud.js";
import { generateWeeklyMenu } from "../claude.js";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

function slotDishesLabel(slot) {
  if (slot.dishes && slot.dishes.length) return slot.dishes.map((d) => d.recipeName).join(" + ");
  return slot.recipeName || "";
}

async function renderCurrentMenuPreview(container) {
  const menu = await dbGet("menu", "current");
  if (!menu || !menu.slots || !menu.slots.length) {
    mount(container, h("p", { class: "hint" }, "Aucun menu généré pour l'instant."));
    return;
  }
  const preview = menu.slots.slice(0, 4).map((s) => {
    const label = s.date ? formatSlotDate(s.date) : DAY_LABELS[s.day] || s.day;
    return h("div", { class: "slot-preview" }, `${label} · ${MEAL_LABELS[s.meal] || s.meal} — ${slotDishesLabel(s)}`);
  });
  const genDate = formatDate(menu.generated_at);
  mount(
    container,
    h("div", {}, [
      genDate ? h("p", { class: "hint" }, `Générée le ${genDate}`) : null,
      ...preview,
      h("a", { href: "#/menu", class: "btn-link" }, "Voir le menu complet →"),
    ])
  );
}

async function renderShoppingListPreview(container) {
  const list = await dbGet("shoppingList", "current");
  if (!list || !list.items || !list.items.length) {
    mount(container, h("p", { class: "hint" }, "Aucune liste de courses pour l'instant."));
    return;
  }
  const genDate = formatDate(list.generated_at);
  const checkedCount = list.items.filter((i) => i.checked).length;
  mount(
    container,
    h("div", {}, [
      genDate ? h("p", { class: "hint" }, `Générée le ${genDate}`) : null,
      h("p", {}, `${checkedCount} / ${list.items.length} articles cochés`),
      h("a", { href: "#/shopping-list", class: "btn-link" }, "Voir la liste de courses →"),
    ])
  );
}

export async function render(container) {
  const menuPreviewEl = h("div");
  const shoppingPreviewEl = h("div");
  const genStatusEl = h("pre", { class: "error-box" });

  await Promise.all([renderCurrentMenuPreview(menuPreviewEl), renderShoppingListPreview(shoppingPreviewEl)]);

  const daySelect = h(
    "select",
    { class: "text-input" },
    DAYS.map((d) => h("option", { value: d, selected: d === getParisTodayDayKey() ? "selected" : null }, DAY_LABELS[d]))
  );
  const timeSelect = h(
    "select",
    { class: "text-input" },
    SHOPPING_TIME_SLOTS.map((t) => h("option", { value: t }, SHOPPING_TIME_SLOT_LABELS[t]))
  );

  const generateBtn = h(
    "button",
    {
      class: "btn-primary btn-large",
      onclick: async () => {
        generateBtn.disabled = true;
        genStatusEl.textContent = "";
        try {
          const [recipes, members, weeklyPattern] = await Promise.all([
            dbGetAll("recipes"),
            dbGetAll("members"),
            dbGet("weeklyPattern", "default"),
          ]);

          const startMeal = shoppingSlotToMeal(timeSelect.value);
          const memberIds = members.map((m) => m.id);
          const targetSlots = filterSlotsByPresence(
            getSlotsStartingAt(daySelect.value, startMeal, 14),
            weeklyPattern || { grid: {} },
            memberIds
          );

          if (!targetSlots.length) {
            genStatusEl.textContent = "Personne du foyer n'est prévu à la maison pour un repas sur cette période : aucun menu à générer.";
            return;
          }

          genStatusEl.textContent = "Génération du menu (peut prendre quelques secondes)...";

          const result = await generateWeeklyMenu({
            recipes,
            weeklyPattern: weeklyPattern || { grid: {} },
            members,
            targetSlots: targetSlots.map(({ day, meal }) => ({ day, meal })),
          });

          const byKey = new Map((result.slots || []).map((s) => [`${s.day}_${s.meal}`, s]));
          const orderedSlots = targetSlots
            .map((t) => {
              const match = byKey.get(`${t.day}_${t.meal}`);
              return match ? { ...match, date: t.date } : null;
            })
            .filter(Boolean);

          await dbPut("menu", { id: "current", slots: orderedSlots, generated_at: new Date().toISOString() });

          genStatusEl.textContent = "Menu généré !";
          location.hash = "#/menu";
        } catch (err) {
          genStatusEl.textContent = "Erreur : " + err.message;
        } finally {
          generateBtn.disabled = false;
        }
      },
    },
    "🍽️ Générer le menu"
  );

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Menu Famille"),
      h("div", { class: "card" }, [
        h("h2", {}, "Nouveau menu"),
        h("p", { class: "hint" }, "Quand comptes-tu faire les courses ? Le menu démarrera à partir de ce moment-là."),
        h("label", {}, "Jour des courses"),
        daySelect,
        h("label", {}, "Moment"),
        timeSelect,
        h("p", { class: "hint" }, "Matin → le menu commence au déjeuner de ce jour. Après-midi → il commence au dîner."),
        generateBtn,
        genStatusEl,
      ]),
      h("div", { class: "card" }, [h("h2", {}, "Menu en cours"), menuPreviewEl]),
      h("div", { class: "card" }, [h("h2", {}, "Liste de courses"), shoppingPreviewEl]),
      h("div", { class: "card shortcuts" }, [
        h("h2", {}, "Ajouter des données"),
        h("a", { href: "#/add-receipt", class: "btn-secondary" }, "🧾 Ajouter un ticket de courses"),
        h("a", { href: "#/add-meal", class: "btn-secondary" }, "🍽️ Ajouter une photo de repas"),
      ]),
    ])
  );
}
