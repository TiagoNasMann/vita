import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { databaseFromPool } from '../server/postgres.mjs';
import { handleApi, seedDatabase } from '../server/core.mjs';
import seed from '../server/seed-data.json' with { type: 'json' };

async function database() {
    const engine = new PGlite();
    await engine.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
    await engine.exec(await readFile('supabase/migrations/202610090001_vita_b2b.sql', 'utf8'));
    await engine.exec('SET search_path TO vita;');
    let queue = Promise.resolve();
    async function acquire() {
        const previous = queue;
        let release;
        queue = new Promise(resolve => { release = resolve; });
        await previous;
        return release;
    }
    async function query(sql, values = []) {
        const result = await engine.query(sql, values);
        return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
    }
    const pool = {
        async connect() { const release = await acquire(); return { query, release }; },
        async query(sql, values) { const release = await acquire(); try { return await query(sql, values); } finally { release(); } }
    };
    return { db: databaseFromPool(pool), close: () => engine.close(), engine };
}
const origin = 'https://vita-test.vercel.app';
async function call(db, path, input, cookie = '', requestOrigin = origin) {
    const response = await handleApi(new Request(origin + path, {
        method: input === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', origin: requestOrigin, cookie },
        ...(input === undefined ? {} : { body: JSON.stringify(input) })
    }), db, {}, seed);
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(db, email, password) {
    const result = await call(db, '/api/login', { email, password });
    assert.equal(result.status, 200);
    return result.cookie;
}
const demand = { center_id: 'HC-001', component: 'Concentrado de hemácias', blood_type: 'O−', quantity_l: 2.5,
    priority: 'routine', needed_by: '2099-12-01', note: 'Demonstração online' };

test('PostgreSQL: contas, isolamento, conversa e ciclo completo de volume', async () => {
    const { db, close } = await database();
    try {
        assert.equal(await seedDatabase(db, seed), true);
        assert.equal(await seedDatabase(db, seed), false);
        const hospital = await login(db, 'admin@hospital-vida-nova.example.com', 'VitaDemo!VidaNova2026');
        const center = await login(db, 'admin@hemocentro-aurora.example.com', 'VitaDemo!Aurora2026');
        const outsider = await login(db, 'admin@hemocentro-essencia.example.com', 'VitaDemo!Essencia2026');
        assert.equal((await call(db, '/api/overview', undefined, hospital)).status, 200);
        const created = await call(db, '/api/requests', demand, hospital);
        assert.equal(created.status, 201);
        const path = '/api/requests/' + created.data.id;
        assert.equal((await call(db, path, undefined, outsider)).status, 404);
        assert.equal((await call(db, path + '/messages', { body: '2,5 L fictícios' }, hospital)).status, 201);
        for (const [status, actor] of [['accepted', center], ['dispatched', center], ['received', hospital]]) {
            assert.equal((await call(db, path + '/status', { status }, actor)).status, 200);
        }
        const detail = await call(db, path, undefined, hospital);
        assert.equal(detail.data.request.quantity, 2500);
        assert.equal(detail.data.messages[0].body, '2,5 L fictícios');
        assert.deepEqual(detail.data.events.map(e => e.action), ['sent', 'accepted', 'dispatched', 'received']);
        const stock = await db.prepare('SELECT available,reserved FROM stocks WHERE company_id=? AND component=? AND blood_type=?')
            .bind('HC-001', demand.component, demand.blood_type).first();
        assert.equal(stock.available, 7500);
        assert.equal(stock.reserved, 0);
        assert.equal((await call(db, path + '/status', { status: 'received' }, hospital)).status, 409);
        assert.equal((await call(db, '/api/logout', {}, hospital)).status, 200);
        assert.equal((await call(db, '/api/me', undefined, hospital)).status, 401);
    } finally { await close(); }
});

test('PostgreSQL: concorrência, cancelamento e limite de autenticação', async () => {
    const { db, close } = await database();
    try {
        await seedDatabase(db, seed);
        const hospital = await login(db, 'admin@hospital-vida-nova.example.com', 'VitaDemo!VidaNova2026');
        const center = await login(db, 'admin@hemocentro-aurora.example.com', 'VitaDemo!Aurora2026');
        await call(db, '/api/stocks', { component: demand.component, blood_type: demand.blood_type, available_l: 2.5 }, center);
        const a = (await call(db, '/api/requests', demand, hospital)).data.id;
        const b = (await call(db, '/api/requests', demand, hospital)).data.id;
        const paths = [a,b].map(id => '/api/requests/' + id + '/status');
        const results = await Promise.all(paths.map(path => call(db, path, { status: 'accepted' }, center)));
        assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
        assert.equal((await call(db, paths[results.findIndex(r => r.status === 200)], { status: 'cancelled', note: 'Teste demonstrativo' }, hospital)).status, 200);
        const stock = await db.prepare('SELECT available,reserved FROM stocks WHERE company_id=? AND component=? AND blood_type=?')
            .bind('HC-001', demand.component, demand.blood_type).first();
        assert.deepEqual(stock, { available: 2500, reserved: 0 });
        assert.equal((await call(db, '/api/login', { email: 'x@example.com', password: 'x' }, '', 'https://other.example.com')).status, 403);
        for(let i=0;i<10;i++) assert.equal((await call(db, '/api/login', { email: 'x@example.com', password: 'x' })).status,401);
        assert.equal((await call(db, '/api/login', { email: 'x@example.com', password: 'x' })).status,429);
    } finally { await close(); }
});
