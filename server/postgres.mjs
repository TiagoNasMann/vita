import pg from 'pg';
pg.types.setTypeParser(20, value => Number(value));

// Keep the tested application queries shared with the local SQLite runtime.
export function postgresQuery(source, previousChanges = 0) {
    let sql = source.replace(/changes\(\)/g, String(previousChanges));
    const ignore = /^INSERT OR IGNORE INTO /i.test(sql);
    sql = sql.replace(/^INSERT OR IGNORE INTO /i, 'INSERT INTO ');
    if (ignore) sql += ' ON CONFLICT DO NOTHING';
    if (sql.startsWith('INSERT INTO auth_limits')) {
        sql = sql.replaceAll('WHEN reset_at<=', 'WHEN auth_limits.reset_at<=')
            .replace('ELSE count+1', 'ELSE auth_limits.count+1')
            .replace('ELSE reset_at END', 'ELSE auth_limits.reset_at END');
    }
    let parameter = 0;
    return sql.replace(/\?/g, () => '$' + (++parameter));
}

export function databaseFromPool(pool) {
    async function execute(connection, statement, previousChanges = 0) {
        const result = await connection.query(postgresQuery(statement.sql, previousChanges), statement.values);
        return { results: result.rows, success: true, meta: { changes: result.rowCount || 0 } };
    }
    const db = {
        prepare(sql) {
            const statement = { sql, values: [], bind(...values) { this.values = values; return this; },
                async first() { return (await execute(pool, this)).results[0] || null; },
                async all() { return execute(pool, this); },
                async run() { return (await db.batch([this]))[0]; }
            };
            return statement;
        },
        async batch(statements) {
            const connection = await pool.connect();
            try {
                await connection.query('BEGIN');
                // Serialize demo mutations across all serverless instances. Guards in
                // each UPDATE still reject stale request transitions.
                await connection.query('SELECT pg_advisory_xact_lock(867482001)');
                let changes = 0;
                const results = [];
                for (const statement of statements) {
                    const result = await execute(connection, statement, changes);
                    changes = result.meta.changes;
                    results.push(result);
                }
                await connection.query('COMMIT');
                return results;
            } catch (error) {
                await connection.query('ROLLBACK');
                throw error;
            } finally { connection.release(); }
        }
    };
    return db;
}

let database;
export function cloudDatabase() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    if (!database) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL,
            max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000,
            ssl: { rejectUnauthorized: true },
            application_name: 'vita-pitchday', options: '-c search_path=vita'
        });
        database = databaseFromPool(pool);
    }
    return database;
}
