import { h, mount, DAYS, DAY_LABELS, MEALS, MEAL_LABELS, DIETS, DIET_LABELS, PORTIONS, PORTION_LABELS } from "../utils.js";
import { dbGetAll, dbPut, dbDelete, dbGet } from "../cloud.js";

function slotKey(day, meal) {
  return `${day}_${meal}`;
}

function memberForm(existing, onSave) {
  const name = h("input", { type: "text", class: "text-input", placeholder: "Prénom", value: existing?.name || "" });
  const diet = h(
    "select",
    { class: "text-input" },
    DIETS.map((d) => h("option", { value: d, selected: existing?.diet === d ? "selected" : null }, DIET_LABELS[d]))
  );
  const dislikes = h("input", {
    type: "text",
    class: "text-input",
    placeholder: "Aliments non aimés (séparés par des virgules)",
    value: (existing?.dislikes || []).join(", "),
  });
  const portion = h(
    "select",
    { class: "text-input" },
    PORTIONS.map((p) => h("option", { value: p, selected: existing?.portion === p ? "selected" : null }, PORTION_LABELS[p]))
  );

  const saveBtn = h(
    "button",
    {
      class: "btn-primary",
      onclick: async () => {
        if (!name.value.trim()) return;
        const member = {
          ...(existing || {}),
          name: name.value.trim(),
          diet: diet.value,
          dislikes: dislikes.value.split(",").map((s) => s.trim()).filter(Boolean),
          portion: portion.value,
        };
        await dbPut("members", member);
        onSave();
      },
    },
    existing ? "Mettre à jour" : "Ajouter"
  );

  return h("div", { class: "card" }, [
    h("h3", {}, existing ? `Modifier ${existing.name}` : "Ajouter un membre"),
    h("label", {}, "Prénom"),
    name,
    h("label", {}, "Régime alimentaire"),
    diet,
    h("label", {}, "Aliments non aimés"),
    dislikes,
    h("label", {}, "Portion"),
    portion,
    saveBtn,
  ]);
}

async function renderMembersList(container, refresh) {
  const members = await dbGetAll("members");
  const list = h(
    "div",
    { class: "member-list" },
    members.map((m) =>
      h("div", { class: "member-row" }, [
        h("div", {}, [h("strong", {}, m.name), h("span", { class: "hint" }, ` — ${m.diet}, ${m.portion}`)]),
        h(
          "button",
          {
            class: "btn-link-danger",
            onclick: async () => {
              await dbDelete("members", m.id);
              refresh();
            },
          },
          "Supprimer"
        ),
      ])
    )
  );
  mount(container, list.childElementCount ? list : h("p", { class: "hint" }, "Aucun membre pour l'instant."));
}

async function renderWeeklyPattern(container, members) {
  let pattern = await dbGet("weeklyPattern", "default");
  if (!pattern) pattern = { id: "default", grid: {} };

  const table = h("table", { class: "pattern-table" });
  const headRow = h("tr", {}, [h("th", {}, ""), ...MEALS.map((m) => h("th", {}, MEAL_LABELS[m]))]);
  table.appendChild(h("thead", {}, headRow));
  const tbody = h("tbody");

  for (const day of DAYS) {
    const cells = [h("td", {}, DAY_LABELS[day])];
    for (const meal of MEALS) {
      const key = slotKey(day, meal);
      const present = new Set(pattern.grid[key] || members.map((m) => m.id));
      const cell = h(
        "td",
        {},
        members.map((m) => {
          const checked = present.has(m.id);
          const cb = h("input", { type: "checkbox", checked: checked ? "checked" : null });
          cb.checked = checked;
          cb.addEventListener("change", async () => {
            const set = new Set(pattern.grid[key] || members.map((mm) => mm.id));
            if (cb.checked) set.add(m.id);
            else set.delete(m.id);
            pattern.grid[key] = Array.from(set);
            await dbPut("weeklyPattern", pattern);
          });
          return h("label", { class: "member-check" }, [cb, m.name]);
        })
      );
      cells.push(cell);
    }
    tbody.appendChild(h("tr", {}, cells));
  }
  table.appendChild(tbody);

  mount(container, h("div", { class: "card" }, [h("h2", {}, "Planning récurrent hebdomadaire"), h("p", { class: "hint" }, "Décoche une personne absente à un repas."), table]));
}

export async function render(container) {
  const membersListEl = h("div");
  const formEl = h("div");
  const patternEl = h("div");

  async function refresh() {
    await renderMembersList(membersListEl, refresh);
    const members = await dbGetAll("members");
    mount(formEl, memberForm(null, refresh));
    await renderWeeklyPattern(patternEl, members);
  }

  mount(
    container,
    h("section", { class: "screen" }, [
      h("h1", {}, "Foyer"),
      h("div", { class: "card" }, [h("h2", {}, "Membres"), membersListEl]),
      formEl,
      patternEl,
    ])
  );

  await refresh();
}
