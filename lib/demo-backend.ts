import type { CookbookBackend } from "./backend";
import type { Recipe, ShoppingItem } from "./recipes";

// A disposable preview. It never connects to real accounts or persists data.
export function createDemoBackend(): CookbookBackend & { dispose(): void } {
  const recipes = new Map<string, Recipe>();
  const shopping = new Map<string, ShoppingItem>();
  const batches = new Set<string>();
  const photos = new Set<string>();
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  return {
    async listRecipes() { return structuredClone([...recipes.values()]); },
    async saveRecipe(input, create) {
      const previous = recipes.get(input.id);
      if (create && previous) {
        const { version: ignored, ...incoming } = input;
        const { version, updatedAt, ...saved } = previous;
        if (JSON.stringify(incoming) === JSON.stringify(saved)) return structuredClone(previous);
        throw new Error("Oppskriften finnes allerede. Last kokeboken på nytt.");
      }
      if (!create && (!previous || previous.version !== input.version))
        throw new Error("Oppskriften er endret. Lukk utkastet og åpne den nyeste versjonen.");
      const recipe = { ...input, version: (previous?.version ?? 0) + 1, updatedAt: new Date().toISOString() };
      recipes.set(input.id, recipe);
      notify();
      return structuredClone(recipe);
    },
    async deleteRecipe(id, version) {
      const previous = recipes.get(id);
      if (previous && previous.version !== version) throw new Error("Oppskriften er endret. Last den på nytt før sletting.");
      recipes.delete(id);
      notify();
    },
    async listShopping() { return structuredClone([...shopping.values()]); },
    async addShopping(batch) {
      if (batches.has(batch.batchId)) return;
      for (const item of batch.items) shopping.set(item.id, { ...item, source: batch.source, checked: false });
      batches.add(batch.batchId);
      notify();
    },
    async checkShopping(ids, checked) {
      for (const id of ids) { const item = shopping.get(id); if (item) shopping.set(id, { ...item, checked }); }
      notify();
    },
    async deleteShopping(selection) {
      for (const [id, item] of shopping)
        if (selection.ids?.includes(id) || (selection.checkedOnly && item.checked)) shopping.delete(id);
      notify();
    },
    async uploadPhoto(blob) { const url = URL.createObjectURL(blob); photos.add(url); return url; },
    async importRecipe() { throw new Error("Nettimport åpner når kokeboken er tilkoblet. Bruk tekst eller bilde i forhåndsvisningen."); },
    subscribe(onChange) { listeners.add(onChange); return () => { listeners.delete(onChange); }; },
    dispose() { for (const url of photos) URL.revokeObjectURL(url); recipes.clear(); shopping.clear(); batches.clear(); listeners.clear(); },
  };
}
