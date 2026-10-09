import { seedDatabase } from '../server/core.mjs';
import { cloudDatabase } from '../server/postgres.mjs';
import data from '../server/seed-data.json' with { type: 'json' };
const seeded = await seedDatabase(cloudDatabase(), data);
console.log(seeded ? 'Six fictitious companies created.' : 'Demo already initialized.');
process.exit(0);
