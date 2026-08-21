const DB_NAME = "menu-famille";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      if (!db.objectStoreNames.contains("members")) db.createObjectStore("members", { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains("weeklyPattern")) db.createObjectStore("weeklyPattern", { keyPath: "id" });
      if (!db.objectStoreNames.contains("recipes")) db.createObjectStore("recipes", { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains("purchases")) db.createObjectStore("purchases", { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains("menu")) db.createObjectStore("menu", { keyPath: "id" });
      if (!db.objectStoreNames.contains("shoppingList")) db.createObjectStore("shoppingList", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

export async function dbGetAll(storeName) {
  const store = await tx(storeName, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(storeName, key) {
  const store = await tx(storeName, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(storeName, value) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName, key) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearAll() {
  const db = await openDb();
  const names = Array.from(db.objectStoreNames);
  await Promise.all(
    names.map(
      (name) =>
        new Promise((resolve, reject) => {
          const req = db.transaction(name, "readwrite").objectStore(name).clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    )
  );
}

export async function getSetting(key) {
  const row = await dbGet("settings", key);
  return row ? row.value : undefined;
}

export async function setSetting(key, value) {
  return dbPut("settings", { key, value });
}
