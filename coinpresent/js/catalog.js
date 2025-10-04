import { localCoinCatalog } from "./localCatalog.js";
import { downloadDataset, uploadDataset } from "./storage.js";

let catalog = [...localCoinCatalog];

export async function initializeCatalog() {
  try {
    const remoteCatalog = await downloadDataset("2eur-catalog.json");
    if (Array.isArray(remoteCatalog)) {
      catalog = mergeCatalogs(localCoinCatalog, remoteCatalog);
      console.info(
        `Loaded ${catalog.length} coin types from Supabase datasets bucket.`
      );
    }
  } catch (error) {
    console.warn("Falling back to local catalog.", error.message);
  }
}

export function getCatalog() {
  return catalog;
}

export async function refreshCatalogFromRemote() {
  const remoteCatalog = await downloadDataset("2eur-catalog.json");
  if (Array.isArray(remoteCatalog)) {
    catalog = mergeCatalogs(localCoinCatalog, remoteCatalog);
  }
  return catalog;
}

export async function pushCatalogUpdate(updatedCatalog) {
  catalog = mergeCatalogs(localCoinCatalog, updatedCatalog);
  await uploadDataset("2eur-catalog.json", catalog);
  return catalog;
}

function mergeCatalogs(base, incoming) {
  const keyed = new Map();

  for (const entry of base) {
    keyed.set(generateKey(entry), entry);
  }

  for (const entry of incoming) {
    keyed.set(generateKey(entry), { ...keyed.get(generateKey(entry)), ...entry });
  }

  return Array.from(keyed.values()).sort((a, b) => {
    if (a.country === b.country) {
      return a.year - b.year;
    }
    return a.country.localeCompare(b.country);
  });
}

function generateKey({ country, year, denomination, theme }) {
  return `${country}-${year}-${denomination}-${theme}`.toLowerCase();
}