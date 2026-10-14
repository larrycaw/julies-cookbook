import { createWorker } from 'tesseract.js';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { parseRecipeText } from '../lib/recipes.ts';
const worker=await createWorker(['nor','eng'],1,{langPath:resolve('public/ocr/lang'),cacheMethod:'none'});
try{const {data}=await worker.recognize(resolve('tests/fixtures/recipe.png'));const recipe=parseRecipeText(data.text);assert.match(recipe.title,/Kremet pasta/);assert.equal(recipe.servings,2);assert.equal(recipe.ingredients[0].amount,'200');assert.equal(recipe.ingredients[0].name,'pasta');assert.equal(recipe.steps.length,2);console.log('PASS: Norwegian/English OCR reads recipe fixture, quantities and steps. Confidence:',data.confidence);}finally{await worker.terminate();}
