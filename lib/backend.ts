import type { Recipe, RecipeData, ShoppingItem } from "./recipes";

// The Pages client needs a remote adapter for identity, records and uploads.
// Nothing is stored locally or exposed before that adapter grants access.
export interface CookbookBackend {
  listRecipes(): Promise<Recipe[]>;
  saveRecipe(recipe: RecipeData & { id: string; version: number | null }, create: boolean): Promise<Recipe>;
  deleteRecipe(id: string, version: number): Promise<void>;
  listShopping(): Promise<ShoppingItem[]>;
  addShopping(batch: { batchId: string; source: string; items: Omit<ShoppingItem, "source" | "checked">[] }): Promise<void>;
  checkShopping(ids: string[], checked: boolean): Promise<void>;
  deleteShopping(selection: { ids?: string[]; checkedOnly?: boolean }): Promise<void>;
  uploadPhoto(blob: Blob): Promise<string>;
  importRecipe(url: string): Promise<RecipeData>;
  subscribe(onChange: () => void, onError: (error: Error) => void): () => void;
}

let backend: CookbookBackend | null = null;
export function setBackend(value: CookbookBackend | null) { backend = value; }
export function getBackend(): CookbookBackend {
  if (!backend) throw new Error("Kokeboken er ikke tilkoblet ennå.");
  return backend;
}

export async function api(path: string, method = "GET", body?: any): Promise<any> {
  const service = getBackend();
  if (path === "/api/recipes" && method === "GET") return { recipes: await service.listRecipes() };
  if (path === "/api/recipes" && method === "POST") return { recipe: await service.saveRecipe(body, true) };
  if (path.startsWith("/api/recipes/")) {
    const id = path.slice("/api/recipes/".length);
    if (method === "PATCH") return { recipe: await service.saveRecipe({ ...body, id }, false) };
    if (method === "DELETE") { await service.deleteRecipe(id, body.version); return {}; }
  }
  if (path === "/api/shopping") {
    if (method === "GET") return { items: await service.listShopping() };
    if (method === "POST") await service.addShopping(body);
    else if (method === "PATCH") await service.checkShopping(body.ids, body.checked);
    else if (method === "DELETE") await service.deleteShopping(body);
    else throw new Error("Ukjent handling.");
    return {};
  }
  if (path === "/api/import" && method === "POST") return { recipe: await service.importRecipe(body.url) };
  throw new Error("Ukjent handling.");
}
