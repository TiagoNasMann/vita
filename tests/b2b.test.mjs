import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { openDatabase } from '../server/sqlite.mjs';
import { handleApi, routeRequest, seedDatabase } from '../server/core.mjs';
import seed from '../server/seed-data.json' with { type: 'json' };
function database() { const db = openDatabase(':memory:'); for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')))
    db.sqlite.exec(readFileSync('drizzle/' + file, 'utf8')); return db; }
const credentials = [['admin@hemocentro-aurora.example.com', 'VitaDemo!Aurora2026'], ['admin@hemocentro-horizonte.example.com', 'VitaDemo!Horizonte2026'], ['admin@hemocentro-essencia.example.com', 'VitaDemo!Essencia2026'], ['admin@hospital-vida-nova.example.com', 'VitaDemo!VidaNova2026'], ['admin@hospital-sao-horizonte.example.com', 'VitaDemo!SaoHorizonte2026'], ['admin@hospital-integra.example.com', 'VitaDemo!Integra2026']];
function req(path, body, cookie = '', origin = 'http://localhost:4173') { return new Request('http://localhost:4173' + path, { method: body === undefined ? 'GET' : 'POST', headers: { origin, 'content-type': 'application/json', cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
async function login(db, index) { const response = await handleApi(req('/api/login', { email: credentials[index][0], password: credentials[index][1] }), db, {}, seed); assert.equal(response.status, 200); return response.headers.get('set-cookie').split(';')[0]; }
async function call(db, path, body, cookie) { const response = await handleApi(req(path, body, cookie), db, {}, seed); return { status: response.status, data: await response.json() }; }
const demand = { center_id: 'HC-001', component: 'Concentrado de hemácias', blood_type: 'O−', quantity_l: 2, priority: 'routine', needed_by: '2099-12-01', note: 'Cenário fictício Pitch Day' };
test('as seis contas autenticam e senhas são hashes no banco', async () => { const db = database(); try {
    await seedDatabase(db, seed);
    for (let i = 0; i < 6; i++) {
        const cookie = await login(db, i);
        const me = await call(db, '/api/me', undefined, cookie);
        assert.equal(me.data.user.email, credentials[i][0]);
        assert.ok(!('password_hash' in me.data.user));
    }
    const rows = db.sqlite.prepare('SELECT password_hash FROM users').all();
    assert.ok(rows.every(u => u.password_hash.startsWith('$2b$12$')));
    assert.equal(db.sqlite.prepare('SELECT count(*) n FROM companies').get().n, 6);
}
finally {
    db.sqlite.close();
} });
test('senha incorreta, CSRF e acesso anônimo são rejeitados', async () => { const db = database(); try {
    await seedDatabase(db, seed);
    assert.equal((await call(db, '/api/login', { email: credentials[0][0], password: 'incorreta' })).status, 401);
    assert.equal((await call(db, '/api/me')).status, 401);
    assert.equal((await handleApi(req('/api/login', { email: credentials[0][0], password: credentials[0][1] }, '', 'https://outro.example.com'), db, {}, seed)).status, 403);
    const spoofed = new Request('http://localhost:4173/api/me', { headers: { 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': credentials[0][0] } });
    assert.equal((await handleApi(spoofed, db, {}, seed)).status, 401);
    const response = await routeRequest(req('/painel.html'), db, {}, {}, seed);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login.html');
}
finally {
    db.sqlite.close();
} });
test('pedido, conversa e histórico são visíveis somente às duas empresas', async () => { const db = database(); try {
    await seedDatabase(db, seed);
    const hospital = await login(db, 3), center = await login(db, 0), outsider = await login(db, 2);
    const created = await call(db, '/api/requests', demand, hospital);
    assert.equal(created.status, 201);
    const requestId = created.data.id;
    assert.equal((await call(db, '/api/requests/' + requestId, undefined, outsider)).status, 404);
    assert.equal((await call(db, '/api/requests/' + requestId + '/messages', { body: 'Tentativa externa' }, outsider)).status, 404);
    assert.equal((await call(db, '/api/requests/' + requestId + '/messages', { body: 'Pedido fictício, podem confirmar?' }, hospital)).status, 201);
    const seen = await call(db, '/api/requests/' + requestId, undefined, center);
    assert.equal(seen.data.messages[0].body, 'Pedido fictício, podem confirmar?');
    assert.equal(seen.data.events[0].action, 'sent');
    const overview = await call(db, '/api/overview', undefined, outsider);
    assert.equal(overview.data.requests.length, 0);
    assert.equal((await call(db, '/api/requests/' + requestId + '/status', { status: 'accepted' }, hospital)).status, 409);
}
finally {
    db.sqlite.close();
} });
test('convite exige aceite da outra empresa e autoriza novos pedidos', async () => { const db = database(); try {
    await seedDatabase(db, seed);
    const hospital = await login(db, 3), center = await login(db, 2);
    assert.equal((await call(db, '/api/requests', { ...demand, center_id: 'HC-003' }, hospital)).status, 403);
    const connection = await call(db, '/api/connections', { company_id: 'HC-003' }, hospital);
    assert.equal(connection.status, 201);
    assert.equal((await call(db, '/api/connections/' + connection.data.id, { status: 'accepted' }, hospital)).status, 409);
    assert.equal((await call(db, '/api/connections/' + connection.data.id, { status: 'accepted' }, center)).status, 200);
    assert.equal((await call(db, '/api/requests', { ...demand, center_id: 'HC-003' }, hospital)).status, 201);
    const stocks = await call(db, '/api/overview', undefined, hospital);
    assert.ok(stocks.data.stocks.some(s => s.company_id === 'HC-003'));
}
finally {
    db.sqlite.close();
} });
test('reservas concorrentes não consomem a mesma unidade e cancelamento libera', async () => { const db = database(); try {
    await seedDatabase(db, seed);
    const hospital = await login(db, 3), center = await login(db, 0);
    await call(db, '/api/stocks', { component: demand.component, blood_type: demand.blood_type, available_l: 1 }, center);
    const a = (await call(db, '/api/requests', { ...demand, quantity_l: 1 }, hospital)).data.id;
    const b = (await call(db, '/api/requests', { ...demand, quantity_l: 1 }, hospital)).data.id;
    const outcomes = await Promise.all([call(db, '/api/requests/' + a + '/status', { status: 'accepted' }, center), call(db, '/api/requests/' + b + '/status', { status: 'accepted' }, center)]);
    assert.deepEqual(outcomes.map(o => o.status).sort(), [200, 409]);
    const stock = db.sqlite.prepare('SELECT available,reserved FROM stocks WHERE company_id=? AND component=? AND blood_type=?').get('HC-001', demand.component, demand.blood_type);
    assert.equal(stock.available, 0);
    assert.equal(stock.reserved, 1000);
    const accepted = outcomes[0].status === 200 ? a : b;
    assert.equal((await call(db, '/api/requests/' + accepted + '/status', { status: 'cancelled', note: 'Cancelamento demonstrativo' }, hospital)).status, 200);
    const released = db.sqlite.prepare('SELECT available,reserved FROM stocks WHERE company_id=? AND component=? AND blood_type=?').get('HC-001', demand.component, demand.blood_type);
    assert.equal(released.available, 1000);
    assert.equal(released.reserved, 0);
}
finally {
    db.sqlite.close();
} });
test('envio e recebimento completam o ciclo sem permitir consumo duplicado', async () => { const db = database(); try {
    await seedDatabase(db, seed);
    const hospital = await login(db, 3), center = await login(db, 0);
    const requestId = (await call(db, '/api/requests', demand, hospital)).data.id;
    assert.equal((await call(db, '/api/requests/' + requestId + '/status', { status: 'received' }, hospital)).status, 409);
    for (const [status, actor] of [['accepted', center], ['dispatched', center], ['received', hospital]])
        assert.equal((await call(db, '/api/requests/' + requestId + '/status', { status }, actor)).status, 200);
    assert.equal((await call(db, '/api/requests/' + requestId + '/status', { status: 'received' }, hospital)).status, 409);
    const stock = db.sqlite.prepare('SELECT available,reserved FROM stocks WHERE company_id=? AND component=? AND blood_type=?').get('HC-001', demand.component, demand.blood_type);
    assert.equal(stock.available, 8000);
    assert.equal(stock.reserved, 0);
    const detail = await call(db, '/api/requests/' + requestId, undefined, center);
    assert.deepEqual(detail.data.events.map(e => e.action), ['sent', 'accepted', 'dispatched', 'received']);
}
finally {
    db.sqlite.close();
} });
test('logout invalida sessão e limitação bloqueia excesso de tentativas', async () => { const db = database(); try {
    await seedDatabase(db, seed);
    const cookie = await login(db, 0);
    await call(db, '/api/logout', {}, cookie);
    assert.equal((await call(db, '/api/me', undefined, cookie)).status, 401);
    await db.prepare('INSERT INTO auth_limits(key,count,reset_at) VALUES (?,?,?)').bind('email:' + await (await import('../server/core.mjs')).digest(credentials[0][0]), 10, Date.now() + 900000).run();
    assert.equal((await call(db, '/api/login', { email: credentials[0][0], password: credentials[0][1] })).status, 429);
}
finally {
    db.sqlite.close();
} });
