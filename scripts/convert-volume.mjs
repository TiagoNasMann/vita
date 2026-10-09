import {openDatabase} from '../server/sqlite.mjs';
import {convertVolumeToMl} from '../server/core.mjs';
const db=openDatabase(process.env.VITA_DB_PATH||'.data/vita.sqlite');
try{const changed=await convertVolumeToMl(db);console.log(changed?'Volumes demonstrativos convertidos para armazenamento em mL.':'Volumes já estão em mL.');}finally{db.sqlite.close();}
