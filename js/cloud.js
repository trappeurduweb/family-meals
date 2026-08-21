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

export async function dbPut(store, value) {
  const isUpsert = value.id !== undefined && value.id !== null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName(store)}`, {
    method: "POST",
    headers: baseHeaders({
      Prefer: isUpsert ? "resolution=merge-duplicates,return=representation" : "return=representation",
    }),
    body: JSON.stringify(value),
  });
  const rows = await handle(res);
  return rows && rows[0];
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
