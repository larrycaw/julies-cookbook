import test from 'node:test';
import assert from 'node:assert/strict';
import { quantity,scaleAmount,parseIngredient,parseRecipeText,recipeFromHtml,supportedImportUrl,groupShopping } from '../lib/recipes.ts';

test('Norwegian decimal amounts, fractions, ranges and unchanged nonnumeric amounts',()=>{
 assert.equal(quantity('1,5'),1.5);assert.equal(quantity('1 1/2'),1.5);assert.equal(quantity('½'),.5);assert.equal(quantity('2½'),2.5);assert.equal(quantity('1/0'),null);
 assert.equal(scaleAmount('150',2),'300');assert.equal(scaleAmount('½',3),'1,5');assert.equal(scaleAmount('1–2',2),'2–4');assert.equal(scaleAmount('etter smak',3),'etter smak');assert.equal(scaleAmount('800',2),'1600');
});
test('Ingredient parsing preserves unknown quantities and detects units',()=>{
 assert.deepEqual(parseIngredient('1 1/2 dl melk'),{amount:'1 1/2',unit:'dl',name:'melk'});
 assert.deepEqual(parseIngredient('200g hvetemel'),{amount:'200',unit:'g',name:'hvetemel'});
 assert.deepEqual(parseIngredient('½ ts salt'),{amount:'½',unit:'ts',name:'salt'});
 assert.deepEqual(parseIngredient('2 egg'),{amount:'2',unit:'',name:'egg'});
 assert.deepEqual(parseIngredient('Salt og pepper'),{amount:'',unit:'',name:'Salt og pepper'});
});
test('OCR/plain text import creates a reviewable draft without discarding unknown layouts',()=>{
 const draft=parseRecipeText('Pasta\n4 porsjoner\nIngredienser\n200 g pasta\n1 dl fløte\nSlik gjør du\n1. Kok pastaen.\n2. Bland.');
 assert.equal(draft.title,'Pasta');assert.equal(draft.servings,4);assert.equal(draft.ingredients[0].name,'pasta');assert.deepEqual(draft.steps,['Kok pastaen.','Bland.']);
 const unknown=parseRecipeText('Familieoppskrift\nDette er en ukjent layout\nmed flere linjer');assert.match(unknown.notes,/ukjent layout/);
});
test('JSON-LD imports nested Recipe, HowToSection, time and yields',()=>{
 const html='<html><script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':['Thing','Recipe'],name:'Pasta &amp; ost',recipeYield:'4 porsjoner',totalTime:'PT1H15M',recipeIngredient:['200 g pasta'],recipeInstructions:[{'@type':'HowToSection',itemListElement:[{'@type':'HowToStep',text:'<p>Kok pasta.</p>'}]}]}]})+'</script></html>';
 const recipe=recipeFromHtml(html,'https://matprat.no/pasta');assert.equal(recipe?.title,'Pasta & ost');assert.equal(recipe?.servings,4);assert.equal(recipe?.minutes,75);assert.deepEqual(recipe?.steps,['Kok pasta.']);assert.equal(recipe?.sourceUrl,'https://matprat.no/pasta');
 assert.equal(recipeFromHtml('<html>ingen oppskrift</html>','https://matprat.no'),null);
});
test('Web import bounds outbound targets, including credentials, ports and lookalikes',()=>{
 assert.equal(supportedImportUrl('https://www.matprat.no/oppskrifter#x').href,'https://www.matprat.no/oppskrifter');
 for(const u of ['http://matprat.no','https://localhost/x','https://127.0.0.1/','https://169.254.169.254/','https://matprat.no.attacker.com/','https://user:pass@matprat.no/','https://matprat.no:8000/','https://anything.matprat.no/'])assert.throws(()=>supportedImportUrl(u));
});
test('Shopping combines identical units, preserves differing units and checked status',()=>{
 const rows=[{id:'1',name:'Melk',unit:'dl',amount:'1,5',checked:true,source:'Pasta'},{id:'2',name:'melk',unit:'dl',amount:'½',checked:false,source:'Pannekaker'},{id:'3',name:'melk',unit:'l',amount:'1',checked:false,source:''}];
 const groups=groupShopping(rows);assert.equal(groups.length,2);assert.equal(groups[0].amount,'2');assert.equal(groups[0].checked,false);assert.deepEqual(groups[0].ids,['1','2']);assert.equal(groups[1].amount,'1');
});
