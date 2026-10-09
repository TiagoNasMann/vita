import { createServer } from 'node:http';
import { readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { openDatabase } from './sqlite.mjs';
import { routeRequest, seedDatabase, convertVolumeToMl } from './core.mjs';
await import('../scripts/generate-assets.mjs');
const { default: assets } = await import('./assets.generated.mjs');
import data from './seed-data.json' with { type: 'json' };
mkdirSync('.data', { recursive: true });
const db = openDatabase(process.env.VITA_DB_PATH || '.data/vita.sqlite');
db.sqlite.exec('CREATE TABLE IF NOT EXISTS _vita_migrations(name TEXT PRIMARY KEY)');
for (const name of readdirSync('drizzle').filter(x => x.endsWith('.sql')).sort()) {
    if (!db.sqlite.prepare('SELECT name FROM _vita_migrations WHERE name=?').get(name)) {
        db.sqlite.exec('BEGIN IMMEDIATE');
        try {
            db.sqlite.exec(readFileSync('drizzle/' + name, 'utf8'));
            db.sqlite.prepare('INSERT INTO _vita_migrations(name) VALUES (?)').run(name);
            db.sqlite.exec('COMMIT');
        }
        catch (e) {
            db.sqlite.exec('ROLLBACK');
            throw e;
        }
    }
}
await seedDatabase(db, data);
await convertVolumeToMl(db);
const port = Number(process.env.PORT || 4173);
const server = createServer(async (req, res) => { try {
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        res.writeHead(400);
        res.end();
        return;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 12000) {
            res.writeHead(413);
            res.end();
            return;
        }
        chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined)
            headers.set(k, Array.isArray(v) ? v.join(',') : v);
    }
    headers.set('x-vita-local-ip', req.socket.remoteAddress || 'unknown');
    const request = new Request(url, { method: req.method, headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) });
    const response = await routeRequest(request, db, {}, assets, data);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
}
catch (e) {
    console.error('Vita local error', e.name);
    res.writeHead(500);
    res.end('Não foi possível concluir.');
} });
server.listen(port, '127.0.0.1', () => console.log(`Vita B2B: http://localhost:${port}\nBanco local: .data/vita.sqlite — seis empresas fictícias`));
for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => server.close(() => { db.sqlite.close(); process.exit(0); }));
