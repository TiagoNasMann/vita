import bcrypt from 'bcryptjs';
const encoder = new TextEncoder();
export const BLOOD = ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+'];
export const COMPONENTS = ['Concentrado de hemácias', 'Plasma', 'Concentrado de plaquetas'];
const now = () => Date.now();
const id = () => crypto.randomUUID();
const hex = b => Array.from(new Uint8Array(b), v => v.toString(16).padStart(2, '0')).join('');
export const digest = async (value) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, msg) => { throw new HttpError(status, msg); };
const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const query = (db, sql, ...args) => db.prepare(sql).bind(...args);
const first = (db, sql, ...args) => query(db, sql, ...args).first();
const all = async (db, sql, ...args) => (await query(db, sql, ...args).all()).results;
const run = (db, sql, ...args) => query(db, sql, ...args).run();
const string = (v, max = 2000) => typeof v === 'string' && v.trim().length <= max ? v.trim() : fail(400, 'Verifique os campos informados.');
const volume = (value, allowZero = false) => { if (typeof value !== 'number' || !Number.isFinite(value) || value < (allowZero ? 0 : 0.001) || value > 1000 || Math.abs(value * 1000 - Math.round(value * 1000)) > 0.000001)
    fail(400, 'Informe o volume em litros, com até três casas decimais.'); return Math.round(value * 1000); };
const integer = (v, min = 1, max = 10000) => Number.isInteger(v) && v >= min && v <= max ? v : fail(400, 'Quantidade inválida.');
const selection = (v, options) => options.includes(v) ? v : fail(400, 'Opção inválida.');
const cookie = (request, token, expiry = 28800) => `vita_session=${token}; Path=/; Max-Age=${expiry}; HttpOnly; SameSite=Strict${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
async function body(request) { if (!request.headers.get('content-type')?.startsWith('application/json'))
    fail(415, 'Envie os dados em JSON.'); const text = await request.text(); if (text.length > 10000)
    fail(413, 'Conteúdo muito grande.'); try {
    return JSON.parse(text);
}
catch {
    fail(400, 'Dados inválidos.');
} }
function mutationOrigin(request) { const origin = request.headers.get('origin'); if (origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site')
    fail(403, 'Origem não autorizada.'); }
async function userFor(request, db) { const match = request.headers.get('cookie')?.match(/(?:^|;\s*)vita_session=([a-f0-9]{64})(?:;|$)/); if (!match)
    return null; return first(db, `SELECT u.id,u.name,u.email,u.role,u.company_id,c.name company_name,c.kind,c.city FROM sessions s JOIN users u ON u.id=s.user_id JOIN companies c ON c.id=u.company_id WHERE s.hash=? AND s.expires_at>? AND u.active=1`, await digest(match[1]), now()); }
const operator = user => { if (!['admin', 'operator'].includes(user.role))
    fail(403, 'Seu perfil não permite esta ação.'); };
const auditQuery = (db, user, action, target) => query(db, 'INSERT INTO audit(id,company_id,user_id,action,target_id,created_at) VALUES (?,?,?,?,?,?)', id(), user.company_id, user.id, action, target, now());
const eventQuery = (db, user, requestId, action, note = '') => query(db, 'INSERT INTO events(id,request_id,user_id,action,note,created_at,sequence) SELECT ?,?,?,?,?,?,COALESCE((SELECT MAX(sequence) FROM events),0)+1', id(), requestId, user.id, action, note, now());
async function ownRequest(db, user, requestId) { const row = await first(db, 'SELECT * FROM requests WHERE id=? AND (hospital_id=? OR center_id=?)', requestId, user.company_id, user.company_id); if (!row)
    fail(404, 'Solicitação não encontrada.'); return row; }
export async function seedDatabase(db, data) { if (await first(db, "SELECT value FROM setup WHERE key='demo_seed'"))
    return false; const statements = []; for (const c of data.companies)
    statements.push(query(db, 'INSERT OR IGNORE INTO companies(id,name,kind,city) VALUES (?,?,?,?)', c.id, c.name, c.kind, c.city)); for (const u of data.users)
    statements.push(query(db, 'INSERT OR IGNORE INTO users(id,company_id,name,email,password_hash,role,active) VALUES (?,?,?,?,?,?,1)', u.id, u.company_id, u.name, u.email, u.password_hash, u.role)); for (const [hospital, center] of data.connections)
    statements.push(query(db, 'INSERT OR IGNORE INTO connections(id,hospital_id,center_id,requested_by,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', `${hospital}-${center}`, hospital, center, center, 'accepted', now(), now())); for (const c of data.companies.filter(c => c.kind === 'hemocentro'))
    for (let i = 0; i < BLOOD.length; i++)
        for (const component of COMPONENTS)
            statements.push(query(db, 'INSERT OR IGNORE INTO stocks(id,company_id,component,blood_type,available,reserved,updated_at) VALUES (?,?,?,?,?,0,?)', `${c.id}-${component}-${BLOOD[i]}`, c.id, component, BLOOD[i], (10 + i * 4) * 1000, now())); statements.push(query(db, "INSERT INTO setup(key,value) VALUES ('demo_seed','1')")); statements.push(query(db, "INSERT OR IGNORE INTO setup(key,value) VALUES ('volume_unit','ml')")); await db.batch(statements); return true; }
export async function convertVolumeToMl(db) { if (await first(db, "SELECT value FROM setup WHERE key='volume_unit'"))
    return false; await db.batch([query(db, 'UPDATE stocks SET available=available*1000,reserved=reserved*1000'), query(db, 'UPDATE requests SET quantity=quantity*1000'), query(db, "INSERT INTO setup(key,value) VALUES ('volume_unit','ml')")]); return true; }
async function login(request, db, data) { const input = await body(request); const email = string(input.email, 254).toLowerCase(); const password = typeof input.password === 'string' && input.password.length <= 128 ? input.password : fail(400, 'E-mail ou senha inválidos.'); const time = now(); const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-vita-local-ip') || 'unknown'; const keys = [['email:' + await digest(email), 10], ['ip:' + await digest(ip), 30]]; const results = await db.batch(keys.map(([key]) => query(db, `INSERT INTO auth_limits(key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count,reset_at`, key, time + 900000, time, time))); if (results.some((r, i) => r.results[0].count > keys[i][1]))
    fail(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.'); const found = await first(db, 'SELECT * FROM users WHERE email=? AND active=1', email); const hash = found?.password_hash || data.users[0].password_hash; const valid = await bcrypt.compare(password, hash); if (!found || !valid)
    fail(401, 'E-mail ou senha inválidos.'); const token = random(); await db.batch([query(db, 'DELETE FROM sessions WHERE expires_at<=?', time), query(db, 'INSERT INTO sessions(hash,user_id,expires_at) VALUES (?,?,?)', await digest(token), found.id, time + 28800000), query(db, 'DELETE FROM auth_limits WHERE key=?', keys[0][0])]); return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, token) }); }
export async function handleApi(request, db, env = {}, data) {
    try {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        if (method === 'POST')
            mutationOrigin(request);
        if (path === '/api/setup' && method === 'POST') {
            if (!env.VITA_SETUP_KEY || request.headers.get('x-vita-setup') !== env.VITA_SETUP_KEY)
                fail(404, 'Não encontrado.');
            return json({ seeded: await seedDatabase(db, data) });
        }
        if (path === '/api/login' && method === 'POST')
            return await login(request, db, data);
        const user = await userFor(request, db);
        if (!user)
            fail(401, 'Entre com seu e-mail e senha.');
        if (path === '/api/me' && method === 'GET')
            return json({ user });
        if (path === '/api/logout' && method === 'POST') {
            const token = request.headers.get('cookie')?.match(/vita_session=([a-f0-9]{64})/)?.[1];
            if (token)
                await run(db, 'DELETE FROM sessions WHERE hash=?', await digest(token));
            return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
        }
        if (path === '/api/overview' && method === 'GET') {
            const requests = await all(db, `SELECT r.*,h.name hospital_name,c.name center_name FROM requests r JOIN companies h ON h.id=r.hospital_id JOIN companies c ON c.id=r.center_id WHERE r.hospital_id=? OR r.center_id=? ORDER BY r.created_at DESC LIMIT 200`, user.company_id, user.company_id);
            const connections = await all(db, `SELECT x.*,h.name hospital_name,c.name center_name FROM connections x JOIN companies h ON h.id=x.hospital_id JOIN companies c ON c.id=x.center_id WHERE x.hospital_id=? OR x.center_id=? ORDER BY x.updated_at DESC`, user.company_id, user.company_id);
            const stocks = await all(db, `SELECT s.*,c.name company_name FROM stocks s JOIN companies c ON c.id=s.company_id WHERE s.company_id=? OR EXISTS(SELECT 1 FROM connections x WHERE x.center_id=s.company_id AND x.hospital_id=? AND x.status='accepted') ORDER BY c.name,s.component,s.blood_type`, user.company_id, user.company_id);
            return json({ user, requests, connections, stocks });
        }
        if (path === '/api/companies' && method === 'GET') {
            return json({ companies: await all(db, 'SELECT id,name,kind,city FROM companies WHERE id<>? AND kind<>? ORDER BY name', user.company_id, user.kind) });
        }
        if (path === '/api/connections' && method === 'POST') {
            operator(user);
            const input = await body(request);
            const other = await first(db, 'SELECT * FROM companies WHERE id=?', string(input.company_id, 60));
            if (!other || other.kind === user.kind)
                fail(400, 'Selecione uma instituição do outro tipo.');
            const hospital = user.kind === 'hospital' ? user.company_id : other.id;
            const center = user.kind === 'hemocentro' ? user.company_id : other.id;
            const existing = await first(db, 'SELECT * FROM connections WHERE hospital_id=? AND center_id=?', hospital, center);
            if (existing && existing.status !== 'rejected')
                fail(409, 'Já existe uma conexão ou convite para essa empresa.');
            const connectionId = existing?.id || id();
            if (existing) {
                const result = await run(db, "UPDATE connections SET status='pending',requested_by=?,updated_at=? WHERE id=? AND status='rejected'", user.company_id, now(), connectionId);
                if (!result.meta.changes)
                    fail(409, 'Conexão já atualizada.');
            }
            else
                await run(db, "INSERT INTO connections(id,hospital_id,center_id,requested_by,status,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?)", connectionId, hospital, center, user.company_id, now(), now());
            await db.batch([auditQuery(db, user, 'connection_requested', connectionId)]);
            return json({ id: connectionId }, 201);
        }
        let match = path.match(/^\/api\/connections\/([^/]+)$/);
        if (match && method === 'POST') {
            operator(user);
            const input = await body(request);
            const status = selection(input.status, ['accepted', 'rejected']);
            const result = await run(db, "UPDATE connections SET status=?,updated_at=? WHERE id=? AND status='pending' AND requested_by<>? AND (hospital_id=? OR center_id=?)", status, now(), match[1], user.company_id, user.company_id, user.company_id);
            if (!result.meta.changes)
                fail(409, 'Convite indisponível para resposta.');
            await db.batch([auditQuery(db, user, 'connection_' + status, match[1])]);
            return json({ ok: true });
        }
        if (path === '/api/requests' && method === 'POST') {
            operator(user);
            if (user.kind !== 'hospital')
                fail(403, 'Apenas hospitais criam solicitações.');
            const input = await body(request);
            const center = string(input.center_id, 60);
            if (!await first(db, "SELECT id FROM connections WHERE hospital_id=? AND center_id=? AND status='accepted'", user.company_id, center))
                fail(403, 'É necessário ter uma conexão aceita com o hemocentro.');
            const component = selection(input.component, COMPONENTS);
            const blood = selection(input.blood_type, BLOOD);
            const quantity = volume(input.quantity_l);
            const priority = selection(input.priority, ['routine', 'priority']);
            const date = string(input.needed_by, 20);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T23:59:59Z')) || Date.parse(date + 'T23:59:59Z') < now())
                fail(400, 'Informe uma data válida, atual ou futura.');
            const note = string(input.note || '', 1000);
            const requestId = id();
            const time = now();
            await db.batch([query(db, "INSERT INTO requests(id,hospital_id,center_id,created_by,component,blood_type,quantity,priority,needed_by,note,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'sent',?,?)", requestId, user.company_id, center, user.id, component, blood, quantity, priority, date, note, time, time), eventQuery(db, user, requestId, 'sent', note), auditQuery(db, user, 'request_created', requestId)]);
            return json({ id: requestId }, 201);
        }
        match = path.match(/^\/api\/requests\/([^/]+)$/);
        if (match && method === 'GET') {
            const row = await ownRequest(db, user, match[1]);
            const messages = await all(db, 'SELECT m.id,m.body,m.created_at,u.name author,c.name company_name FROM messages m JOIN users u ON u.id=m.user_id JOIN companies c ON c.id=u.company_id WHERE m.request_id=? ORDER BY m.sequence,m.created_at,m.id LIMIT 200', row.id);
            const events = await all(db, 'SELECT e.action,e.note,e.created_at,u.name author,c.name company_name FROM events e JOIN users u ON u.id=e.user_id JOIN companies c ON c.id=u.company_id WHERE e.request_id=? ORDER BY e.sequence,e.created_at,e.id LIMIT 200', row.id);
            return json({ request: row, messages, events });
        }
        match = path.match(/^\/api\/requests\/([^/]+)\/messages$/);
        if (match && method === 'POST') {
            operator(user);
            const row = await ownRequest(db, user, match[1]);
            const input = await body(request);
            const message = string(input.body, 2000);
            if (!message)
                fail(400, 'Escreva uma mensagem.');
            await db.batch([query(db, 'INSERT INTO messages(id,request_id,user_id,body,created_at,sequence) SELECT ?,?,?,?,?,COALESCE((SELECT MAX(sequence) FROM messages),0)+1', id(), row.id, user.id, message, now()), auditQuery(db, user, 'message_created', row.id)]);
            return json({ ok: true }, 201);
        }
        match = path.match(/^\/api\/requests\/([^/]+)\/status$/);
        if (match && method === 'POST') {
            operator(user);
            const row = await ownRequest(db, user, match[1]);
            const input = await body(request);
            const target = selection(input.status, ['accepted', 'rejected', 'dispatched', 'received', 'cancelled']);
            const isCenter = user.company_id === row.center_id;
            const allowed = { accepted: isCenter && row.status === 'sent', rejected: isCenter && row.status === 'sent', dispatched: isCenter && row.status === 'accepted', received: !isCenter && row.status === 'dispatched', cancelled: ['sent', 'accepted'].includes(row.status) };
            if (!allowed[target])
                fail(409, 'Esta transição não está disponível.');
            const note = string(input.note || '', 1000);
            if (['rejected', 'cancelled'].includes(target) && !note)
                fail(400, 'Informe o motivo.');
            const time = now();
            const statements = [];
            const stockArgs = [row.center_id, row.component, row.blood_type];
            if (target === 'accepted') {
                statements.push(query(db, `UPDATE stocks SET available=available-?,reserved=reserved+?,updated_at=? WHERE company_id=? AND component=? AND blood_type=? AND available>=? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND status=?)`, row.quantity, row.quantity, time, ...stockArgs, row.quantity, row.id, row.status));
            }
            else if (target === 'received' || (target === 'cancelled' && row.status === 'accepted')) {
                statements.push(query(db, `UPDATE stocks SET available=available+?,reserved=reserved-?,updated_at=? WHERE company_id=? AND component=? AND blood_type=? AND reserved>=? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND status=?)`, target === 'cancelled' ? row.quantity : 0, row.quantity, time, ...stockArgs, row.quantity, row.id, row.status));
            }
            const conditional = statements.length ? ' AND changes()=1' : '';
            const updateIndex = statements.length;
            statements.push(query(db, `UPDATE requests SET status=?,updated_at=? WHERE id=? AND status=?${conditional}`, target, time, row.id, row.status));
            statements.push(query(db, 'INSERT INTO events(id,request_id,user_id,action,note,created_at,sequence) SELECT ?,?,?,?,?,?,COALESCE((SELECT MAX(sequence) FROM events),0)+1 WHERE changes()=1', id(), row.id, user.id, target, note, time));
            statements.push(query(db, 'INSERT INTO audit(id,company_id,user_id,action,target_id,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1', id(), user.company_id, user.id, 'request_' + target, row.id, time));
            const results = await db.batch(statements);
            if (results[updateIndex].meta.changes !== 1)
                fail(409, 'Pedido atualizado por outra pessoa ou estoque insuficiente. Atualize o painel.');
            return json({ ok: true });
        }
        if (path === '/api/stocks' && method === 'POST') {
            operator(user);
            if (user.kind !== 'hemocentro')
                fail(403, 'Apenas hemocentros atualizam estoques.');
            const input = await body(request);
            const component = selection(input.component, COMPONENTS);
            const blood = selection(input.blood_type, BLOOD);
            const quantity = volume(input.available_l, true);
            const stockId = `${user.company_id}-${component}-${blood}`;
            await db.batch([query(db, `INSERT INTO stocks(id,company_id,component,blood_type,available,reserved,updated_at) VALUES (?,?,?,?,?,0,?) ON CONFLICT(company_id,component,blood_type) DO UPDATE SET available=excluded.available,updated_at=excluded.updated_at`, stockId, user.company_id, component, blood, quantity, now()), auditQuery(db, user, 'stock_updated', stockId)]);
            return json({ ok: true });
        }
        fail(404, 'Não encontrado.');
    }
    catch (error) {
        if (error instanceof HttpError)
            return json({ error: error.message }, error.status);
        console.error('Vita API failure', error.name);
        return json({ error: 'Não foi possível concluir a operação.' }, 500);
    }
}
export async function routeRequest(request, db, env, assets, data) { const path = new URL(request.url).pathname; if (path.startsWith('/api/'))
    return handleApi(request, db, env, data); if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response('Método não permitido', { status: 405 }); if (path === '/painel.html' && !await userFor(request, db))
    return new Response(null, { status: 302, headers: { Location: '/login.html', 'Cache-Control': 'no-store' } }); const name = path === '/' ? 'index.html' : path.slice(1); const asset = assets[name]; if (!asset)
    return new Response('Página não encontrada', { status: 404 }); const content = asset.binary ? Uint8Array.from(atob(asset.body), c => c.charCodeAt(0)) : asset.body; return new Response(request.method === 'HEAD' ? null : content, { headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" } }); }
