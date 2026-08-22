const SUPABASE_URL = "https://nswairpcyonfwcwvtpvc.supabase.co";
const SUPABASE_KEY = "sb_publishable_loh-Pw3roTrt_cPbCO3ADA_yk0zo1Wo";

const TABLES = {
  members: "members",
  weeklyPattern: "weekly_pattern",
  recipes: "recipes",
  purchases: "purchases",
  menu: "menu",
  shoppingList: "shopping_list",
};

function tableName(store) {
  return TABLES[store] || store;
}

function baseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur base en ligne (${res.status}): ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function dbGetAll(store) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName(store)}?select=*`, {
    headers: baseHeaders(),
  });
  const rows = await handle(res);
  return rows || [];
}

export async function dbGet(store, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName(store)}?id=eq.${encodeURIComponent(key)}&select=*`, {
    headers: baseHeaders(),
  });
  const rows = await handle(res);
  return rows && rows[0];
}

async function insertRow(store, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName(store)}`, {
    method: "POST",
    headers: baseHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(value),
  });
  const rows = await handle(res);
  return rows && rows[0];
}

export async function dbPut(store, value) {
  if (value.id === undefined || value.id === null) {
    // Nouvelle ligne, id auto-généré par la base (colonne identity)
    return insertRow(store, value);
  }

  // Mise à jour d'une ligne existante : PATCH par id (jamais d'insert avec id
  // explicite, car les colonnes identity refusent une valeur imposée).
  const { id, ...rest } = value;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName(store)}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: baseHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(rest),
  });
  const rows = await handle(res);
  if (rows && rows.length) return rows[0];

  // Aucune ligne existante avec cet id (ex: premier enregistrement de
  // weeklyPattern/menu/shoppingList dont l'id texte est fixe) -> on l'insère.
  return insertRow(store, value);
}

export async function dbDelete(store, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName(store)}?id=eq.${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: baseHeaders(),
  });
  await handle(res);
}

export async function dbClearAllCloud() {
  await Promise.all(
    Object.keys(TABLES).map((store) =>
      fetch(`${SUPABASE_URL}/rest/v1/${tableName(store)}?id=not.is.null`, {
        method: "DELETE",
        headers: baseHeaders(),
      })
    )
  );
}
