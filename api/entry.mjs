import { routeRequest } from '../server/core.mjs';
import { cloudDatabase } from '../server/postgres.mjs';
import assets from '../server/assets.generated.mjs';
import data from '../server/seed-data.json' with { type: 'json' };

// Public pages remain available while the database is being provisioned.
const database = {
    prepare(...args) { return cloudDatabase().prepare(...args); },
    batch(...args) { return cloudDatabase().batch(...args); }
};

export default {
    async fetch(request) {
        const headers = new Headers(request.headers);
        // Vercel supplies the real client address; discard the local-only override.
        headers.delete('x-vita-local-ip');
        headers.delete('cf-connecting-ip');
        headers.set('x-vita-local-ip', request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown');
        const url = new URL(request.url);
        const routedPath = url.searchParams.get('__vita_path');
        if (routedPath !== null) {
            url.pathname = '/' + routedPath.replace(/^\/+/, '');
            url.searchParams.delete('__vita_path');
        }
        const trustedRequest = new Request(url, { method: request.method, headers,
            ...(request.method === 'GET' || request.method === 'HEAD' ? {} : { body: request.body, duplex: 'half' }) });
        try {
            return await routeRequest(trustedRequest, database, {}, assets, data);
        } catch (error) {
            console.error('Vita cloud failure', error.name);
            return new Response(JSON.stringify({ error: 'Serviço temporariamente indisponível.' }), {
                status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }
    }
};
