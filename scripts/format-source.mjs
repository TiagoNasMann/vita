import ts from 'typescript';
import {readFile,writeFile,readdir} from 'node:fs/promises';
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
for(const directory of ['server','web','tests'])for(const name of await readdir(directory)){if(!/\.(mjs|js)$/.test(name)||name==='assets.generated.mjs')continue;const path=directory+'/'+name;const file=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);await writeFile(path,printer.printFile(file));}
