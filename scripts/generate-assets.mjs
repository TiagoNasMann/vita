import {readFile,writeFile,readdir} from 'node:fs/promises';
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'application/javascript; charset=utf-8',png:'image/png',svg:'image/svg+xml'};
const assets={};for(const name of await readdir('web')){const ext=name.split('.').pop();if(!types[ext])continue;const bytes=await readFile('web/'+name);assets[name]={type:types[ext],body:ext==='png'?bytes.toString('base64'):bytes.toString(),binary:ext==='png'};}
await writeFile('server/assets.generated.mjs','export default '+JSON.stringify(assets)+';\n');
