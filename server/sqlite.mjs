import { DatabaseSync } from 'node:sqlite';
export function openDatabase(path) { const sqlite = new DatabaseSync(path); sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;'); return { sqlite, prepare(sql) { let values = []; const statement = () => sqlite.prepare(sql); const result = () => { const stmt = statement(); if (stmt.columns().length) {
        const results = stmt.all(...values);
        const changes = sqlite.prepare('SELECT changes() n').get().n;
        return { results, success: true, meta: { changes } };
    } const r = stmt.run(...values); return { results: [], success: true, meta: { changes: Number(r.changes) } }; }; return { bind(...args) { values = args; return this; }, async first() { return statement().get(...values) || null; }, async all() { return result(); }, async run() { return result(); }, _execute: result }; }, async batch(statements) { sqlite.exec('BEGIN IMMEDIATE'); try {
        const results = statements.map(s => s._execute());
        sqlite.exec('COMMIT');
        return results;
    }
    catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
    } } }; }
