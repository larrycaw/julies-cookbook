export const categories = ["Middag", "Frokost & lunsj", "Bakst", "Dessert", "Småretter", "Drikke"] as const;
export type Ingredient = { amount: string; unit: string; name: string };
export type RecipeData = {
  title: string; description: string; category: string; servings: number; minutes: number;
  ingredients: Ingredient[]; steps: string[]; images: string[]; notes: string;
  sourceUrl: string; favorite: boolean;
};
export type Recipe = RecipeData & { id: string; version: number; updatedAt: string; example?: boolean };
export type ShoppingItem = Ingredient & { id: string; checked: boolean; source: string };

const fractions: Record<string, number> = { "½": .5, "¼": .25, "¾": .75, "⅓": 1/3, "⅔": 2/3, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875 };
export function quantity(value: string): number | null {
  const raw = value.trim().replace(",", ".");
  if (!raw) return null;
  const unicode = raw.match(/^(\d+\s*)?([½¼¾⅓⅔⅛⅜⅝⅞])$/);
  if (unicode) return Number(unicode[1] || 0) + fractions[unicode[2]];
  const frac = raw.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (frac) return +frac[3] === 0 ? null : +(frac[1] || 0) + +frac[2] / +frac[3];
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
export function formatAmount(n: number): string {
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2, useGrouping: false }).format(n);
}
export function scaleAmount(value: string, factor: number): string {
  if (factor === 1) return value;
  const n = quantity(value);
  if (n !== null) return formatAmount(n * factor);
  const range = value.trim().split(/\s*[–-]\s*/);
  if (range.length === 2) {
    const [a, b] = range.map(quantity);
    if (a !== null && b !== null) return `${formatAmount(a * factor)}–${formatAmount(b * factor)}`;
  }
  return value;
}
export function parseIngredient(line: string): Ingredient {
  const clean = cleanText(line).replace(/^[•*\-]\s*/, "").trim();
  const amountMatch = clean.match(/^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d*[½¼¾⅓⅔⅛⅜⅝⅞]|\d+(?:[.,]\d+)?)(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?)\s*(.*)$/);
  if (!amountMatch) return { amount: "", unit: "", name: clean };
  const [, amount, rest] = amountMatch;
  const unitMatch = rest.match(/^(kg|g|mg|l|dl|cl|ml|ss|ts|stk\.?|fedd|boks(?:er)?|pk|pakke(?:r)?|klype(?:r)?|neve(?:r)?|cup(?:s)?|tbsp|tsp|oz|lb)\b\.?\s*(.*)$/i);
  return { amount: amount.trim(), unit: unitMatch?.[1].replace(/\.$/, "") || "", name: (unitMatch?.[2] || rest).trim() };
}
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, " ").replace(/&#(\d+);/g, (_, n) => {
    const code = +n; return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  }).replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, x:string) => (({amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" "} as Record<string,string>)[x] || " ")).replace(/\s+/g, " ").trim();
}
export const blankRecipe = (): RecipeData => ({ title: "", description: "", category: "Middag", servings: 2, minutes: 30, ingredients: [{amount:"",unit:"",name:""}], steps:[""], images:[], notes:"", sourceUrl:"", favorite:false });

export function parseRecipeText(text: string): RecipeData {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const data = blankRecipe();
  data.title = (lines[0] || "Ny oppskrift").slice(0,150);
  let section: "intro" | "ingredients" | "steps" = "intro";
  const ingredients: Ingredient[] = [], steps: string[] = [], intro: string[] = [];
  for (const line of lines.slice(1)) {
    if (/^(ingredienser|ingredients|du trenger|dette trenger du)\s*:?(?:\s+\d.*)?$/i.test(line)) { section="ingredients";continue; }
    if (/^(fremgangsmåte|framgangsmåte|slik gjør du|slik lager du(?:.*)|tilberedning|instructions|method|directions)\s*:?$/i.test(line)) { section="steps";continue; }
    const portion = line.match(/(\d+)\s*(porsjoner|personer|servings)/i);
    if (portion && section === "intro") { data.servings=Math.min(100,Math.max(1,+portion[1])); continue; }
    if (section==="ingredients") ingredients.push(parseIngredient(line));
    else if (section==="steps") steps.push(line.replace(/^\d+[.)]\s*/, ""));
    else intro.push(line);
  }
  data.ingredients=ingredients.length ? ingredients.slice(0,100) : [{amount:"",unit:"",name:""}];
  data.steps=steps.length ? steps.slice(0,80) : [""];
  data.description=intro.join(" ").slice(0,1000);
  data.notes = ingredients.length || steps.length ? "" : "Tekst fra import – fordel den i ingredienser og steg:\n\n" + text.slice(0,7000);
  return data;
}

function instructionSteps(value: unknown): string[] {
  if (typeof value === "string") return value.split(/\n+/).map(cleanText).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(instructionSteps);
  if (value && typeof value === "object") {
    const v = value as Record<string,unknown>;
    if (v.itemListElement) return instructionSteps(v.itemListElement);
    if (typeof v.text === "string") return [cleanText(v.text)];
    if (typeof v.name === "string") return [cleanText(v.name)];
  }
  return [];
}
function findRecipe(value: unknown, depth=0): Record<string,any> | null {
  if (depth > 12 || !value || typeof value !== "object") return null;
  if (Array.isArray(value)) { for (const child of value) { const found=findRecipe(child,depth+1); if(found)return found; } return null; }
  const obj=value as Record<string,any>;
  if ([obj["@type"]].flat().some(type => typeof type === "string" && /(?:^|\/)Recipe$/.test(type))) return obj;
  for (const key of ["@graph","mainEntity","mainEntityOfPage","itemListElement","item"]) { const found=findRecipe(obj[key],depth+1); if(found)return found; }
  return null;
}
function minutesFromISO(value: unknown): number {
  if(typeof value!=="string")return 0;
  const match=value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  return match ? +(match[1]||0)*1440 + +(match[2]||0)*60 + +(match[3]||0) : 0;
}
export function recipeFromHtml(html: string, sourceUrl: string): RecipeData | null {
  const blocks=html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for(const block of blocks){
    let obj: Record<string,any>|null=null;
    try{obj=findRecipe(JSON.parse(block[1].trim()));}catch{continue;}
    if(!obj)continue;
    const base=blankRecipe();
    base.title=cleanText(obj.name).slice(0,150) || "Importert oppskrift";
    base.description=cleanText(obj.description).slice(0,1000);
    base.servings=Math.min(100,Math.max(1,parseInt(String(Array.isArray(obj.recipeYield)?obj.recipeYield[0]:obj.recipeYield),10)||2));
    base.minutes=Math.min(10080,minutesFromISO(obj.totalTime)||(minutesFromISO(obj.prepTime)+minutesFromISO(obj.cookTime))||30);
    base.ingredients=Array.isArray(obj.recipeIngredient)?obj.recipeIngredient.slice(0,100).map((v:unknown)=>parseIngredient(cleanText(v))):base.ingredients;
    base.steps=instructionSteps(obj.recipeInstructions).slice(0,80);
    if(!base.steps.length)base.steps=[""];
    base.sourceUrl=sourceUrl;
    return base;
  }
  return null;
}

export const importHosts = ["matprat.no","matstart.no","tine.no","meny.no","godt.no","trinesmatblogg.no","detsoteliv.no","nrk.no","coop.no","oda.com","rema.no","kiwi.no","mills.no","gilde.no","prior.no","oppskrift.no","bbcgoodfood.com","allrecipes.com","foodnetwork.com","loveandlemons.com","seriouseats.com","recipetineats.com"];
export function supportedImportUrl(value: string): URL {
  let url: URL;try {url=new URL(value);}catch{throw new Error("Skriv inn en gyldig nettadresse med https://.");}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=="https:" || url.username || url.password || (url.port && url.port!=="443") || !importHosts.some(h=>host===h||host===`www.${h}`))
    throw new Error("Denne nettsiden støttes ikke ennå. Lim inn oppskriftsteksten, eller bruk bildeimport.");
  url.hash=""; return url;
}

export function groupShopping(items: ShoppingItem[]) {
  const groups=new Map<string, {key:string;name:string;unit:string;amount:string;checked:boolean;ids:string[];sources:string[];raw:ShoppingItem[]}>();
  for(const item of items){
    const key=item.name.trim().toLocaleLowerCase("nb")+"|"+item.unit.trim().toLocaleLowerCase("nb");
    const existing=groups.get(key);
    if(existing){existing.raw.push(item);existing.ids.push(item.id);existing.checked=existing.checked&&item.checked;if(!existing.sources.includes(item.source)&&item.source)existing.sources.push(item.source);}
    else groups.set(key,{key,name:item.name,unit:item.unit,amount:item.amount,checked:item.checked,ids:[item.id],sources:item.source?[item.source]:[],raw:[item]});
  }
  for(const group of groups.values()){
    const nums=group.raw.map(r=>quantity(r.amount));
    group.amount=nums.every(n=>n!==null)?formatAmount(nums.reduce<number>((sum,n)=>sum+(n??0),0)):group.raw.map(r=>r.amount).filter(Boolean).join(" + ");
  }
  return Array.from(groups.values());
}
