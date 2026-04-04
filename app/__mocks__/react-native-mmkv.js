const stores = new Map();

function getStore(id = 'default') {
  if (!stores.has(id)) {
    stores.set(id, new Map());
  }
  return stores.get(id);
}

function cloneValue(value) {
  return typeof value === 'string' ? value : JSON.parse(JSON.stringify(value));
}

function createMMKV(options = {}) {
  const store = getStore(options.id);
  return {
    set(key, value) {
      store.set(key, cloneValue(value));
    },
    getString(key) {
      const value = store.get(key);
      return typeof value === 'string' ? value : value == null ? undefined : String(value);
    },
    remove(key) {
      store.delete(key);
    },
    clearAll() {
      store.clear();
    },
    getAllKeys() {
      return Array.from(store.keys());
    },
  };
}

module.exports = { createMMKV };
