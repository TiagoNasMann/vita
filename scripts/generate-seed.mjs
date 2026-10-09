import bcrypt from 'bcryptjs';
import {writeFile,readFile} from 'node:fs/promises';
const companies=[['HC-001','Hemocentro Aurora','hemocentro','Uberlândia / MG','Aurora','hemocentro-aurora'],['HC-002','Hemocentro Horizonte','hemocentro','Araguari / MG','Horizonte','hemocentro-horizonte'],['HC-003','Hemocentro Essência','hemocentro','Uberaba / MG','Essencia','hemocentro-essencia'],['HP-001','Hospital Vida Nova','hospital','Uberlândia / MG','VidaNova','hospital-vida-nova'],['HP-002','Hospital São Horizonte','hospital','Araguari / MG','SaoHorizonte','hospital-sao-horizonte'],['HP-003','Hospital Integra','hospital','Uberaba / MG','Integra','hospital-integra']];
const data={companies:companies.map(([id,name,kind,city])=>({id,name,kind,city})),users:[],connections:[['HP-001','HC-001'],['HP-003','HC-001'],['HP-002','HC-002'],['HP-001','HC-002'],['HP-003','HC-003'],['HP-002','HC-003']]};
for(const [id,name,,,suffix,domain] of companies)data.users.push({id:'USER-'+id,company_id:id,name:'Administrador '+name,email:'admin@'+domain+'.example.com',password_hash:await bcrypt.hash('VitaDemo!'+suffix+'2026',12),role:'admin'});
await writeFile('server/seed-data.json',JSON.stringify(data,null,2)+'\n');
console.log('Seed com seis empresas e hashes de senha gerado.');
