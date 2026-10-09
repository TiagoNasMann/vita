import { env } from 'cloudflare:workers';
import { routeRequest } from '../../server/core.mjs';
import assets from '../../server/assets.generated.mjs';
import data from '../../server/seed-data.json';
export const dynamic='force-dynamic';
export async function GET(request:Request){return routeRequest(request,env.DB,env,assets,data);}
export async function POST(request:Request){return routeRequest(request,env.DB,env,assets,data);}
export async function HEAD(request:Request){return routeRequest(request,env.DB,env,assets,data);}
