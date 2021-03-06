import { DisposableComposition } from "dispose";
import * as pg from "pg";

let key = new Date().valueOf();

export class PgContext extends DisposableComposition {
    public static async create(
        sql: string,
        poolConfig: pg.PoolConfig = {},
    ): Promise<PgContext> {
        const context = new PgContext(
            sql,
            poolConfig,
        );
        await context.initialize();
        return context;
    }

    public pool!: pg.Pool;
    public readonly databaseName = `${this.poolConfig.database || ""}_${(++key).toString(36)}`;

    protected constructor(
        private sql: string,
        private poolConfig: pg.PoolConfig = {},
    ) {
        super();
    }

    private async initialize() {
        await this.setupDatabase();
        this.registerDisposable({ dispose: () => this.teardownDatabase() });

        await this.setupPool();
        this.registerDisposable({ dispose: () => this.teardownPool() });

        await this.applySql();
    }

    private async setupDatabase() {
        const { databaseName, poolConfig } = this;
        const adminPool = new pg.Pool(poolConfig);
        try {
            await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}";`);
            await adminPool.query(`CREATE DATABASE "${databaseName}";`);
        }
        finally {
            await adminPool.end();
        }
    }

    private async teardownDatabase() {
        const { databaseName, poolConfig } = this;
        const adminPool = new pg.Pool(poolConfig);
        try {
            await adminPool.query(`DROP DATABASE "${databaseName}";`);
        }
        finally {
            await adminPool.end();
        }
    }

    private async setupPool() {
        const { databaseName, poolConfig } = this;
        this.pool = new pg.Pool({ ...poolConfig, ...{ database: databaseName } });
    }

    private async teardownPool() {
        const { pool } = this;
        await pool.end();
    }

    private async applySql() {
        const { pool, sql } = this;
        await pool.query(sql);
    }
}
