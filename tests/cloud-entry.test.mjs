import test from 'node:test';
import assert from 'node:assert/strict';
import entry from '../api/entry.mjs';

test('Vercel: páginas públicas funcionam sem banco provisionado', async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
        const landing = await entry.fetch(new Request('https://vita.example/api/entry?__vita_path='));
        assert.equal(landing.status, 200);
        assert.match(await landing.text(), /Vita/i);
        const login = await entry.fetch(new Request('https://vita.example/api/entry?__vita_path=login.html'));
        assert.equal(login.status, 200);
        const panel = await entry.fetch(new Request('https://vita.example/api/entry?__vita_path=painel.html'));
        assert.equal(panel.status, 302);
        assert.equal(panel.headers.get('location'), '/login.html');
        const denied = await entry.fetch(new Request('https://vita.example/api/entry?__vita_path=api/me'));
        assert.equal(denied.status, 401);
    } finally {
        if (original === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = original;
    }
});
