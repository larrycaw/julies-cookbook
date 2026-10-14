import test from "node:test";
import assert from "node:assert/strict";
import { api, setBackend } from "../lib/backend.ts";
import { createDemoBackend } from "../lib/demo-backend.ts";
import { blankRecipe } from "../lib/recipes.ts";

test("Pages refuses data operations before a backend grants access", async () => {
  setBackend(null);
  await assert.rejects(api("/api/recipes"), /ikke tilkoblet/);
});

test("adapter preserves recipe conflicts, retry IDs and shopping batch IDs", async () => {
  const backend = createDemoBackend();
  setBackend(backend);
  try {
    const input = { ...blankRecipe(), id: "recipe-1", version: null, title: "Pasta", ingredients: [{ amount: "200", unit: "g", name: "pasta" }], steps: ["Kok pasta."] };
    const first = await api("/api/recipes", "POST", input);
    const retry = await api("/api/recipes", "POST", input);
    assert.equal(retry.recipe.version, 1);
    assert.equal((await api("/api/recipes")).recipes.length, 1);
    const update = await api("/api/recipes/recipe-1", "PATCH", { ...first.recipe, id: "wrong-id", title: "Ny pasta" });
    assert.equal(update.recipe.id, "recipe-1");
    await assert.rejects(api("/api/recipes/recipe-1", "PATCH", first.recipe), /endret/);
    await assert.rejects(api("/api/recipes/recipe-1", "DELETE", { version: 1 }), /endret/);
    const batch = { batchId: "batch-1", source: "Pasta", items: [{ id: "item-1", name: "pasta", unit: "g", amount: "200" }] };
    await api("/api/shopping", "POST", batch);
    await api("/api/shopping", "POST", batch);
    assert.equal((await api("/api/shopping")).items.length, 1);
    await api("/api/shopping", "PATCH", { ids: ["item-1"], checked: true });
    await api("/api/shopping", "DELETE", { checkedOnly: true });
    assert.deepEqual((await api("/api/shopping")).items, []);
    await assert.rejects(api("/api/unknown"), /Ukjent/);
  } finally { backend.dispose(); setBackend(null); }
});
