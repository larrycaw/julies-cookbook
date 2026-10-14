import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const root=process.cwd();
const engineRoot=dirname(require.resolve('tesseract.js/package.json'));
const engineRequire=createRequire(join(engineRoot,'package.json'));
const coreRoot=dirname(engineRequire.resolve('tesseract.js-core/package.json'));
const dest=resolve(root,'public/ocr');
await rm(dest,{recursive:true,force:true});
await mkdir(join(dest,'core'),{recursive:true});
await mkdir(join(dest,'lang'),{recursive:true});
await copyFile(join(engineRoot,'dist/worker.min.js'),join(dest,'worker.min.js'));
await copyFile(join(engineRoot,'dist/worker.min.js.LICENSE.txt'),join(dest,'worker.LICENSE.txt'));
// The browser selects among these self-contained LSTM engines by SIMD support.
for(const file of await readdir(coreRoot)){if(file.endsWith('-lstm.wasm.js'))await copyFile(join(coreRoot,file),join(dest,'core',file));}
for(const lang of ['nor','eng']){
 const pkg=dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`));
 await copyFile(join(pkg,'4.0.0',`${lang}.traineddata.gz`),join(dest,'lang',`${lang}.traineddata.gz`));
}
console.log('OCR engine, worker, and Norwegian/English language files copied.');
