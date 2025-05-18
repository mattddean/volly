import { Pool, type Client as PgClient } from "pg"; // using 'pg' package for node-postgres
import { drizzle, type NodePgClient } from "drizzle-orm/node-postgres";
import { eq, and, type SQL } from "drizzle-orm";
import type { TableAdapter, QueryBuilder } from "../../../../types";
import { getIdColumn } from "./utils";

/**
 * adapter for a drizzle table using node-postgres
 */
export class PostgresTableAdapter<T extends Record<string, any>>
  implements TableAdapter
{
  constructor(
    private db: NodePgClient,
    private table: Record<string, any>,
  ) {}

  /**
   * insert a new record
   */
  async insert(data: Partial<T>): Promise<T> {
    const result = await this.db.insert(this.table).values(data).returning();
    return result[0] as T;
  }

  /**
   * update a record by id
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const idColumn = getIdColumn(this.table);
    const result = await this.db
      .update(this.table)
      .set(data)
      .where(eq(this.table[idColumn], id))
      .returning();

    if (result.length === 0) {
      throw new Error(
        `Record with id ${id} not found in table ${this.table.name || "unknown"}`,
      );
    }
    return result[0] as T;
  }

  /**
   * update with a specific condition
   */
  async updateWhere(
    condition: Record<string, any>,
    data: Partial<T>,
  ): Promise<{ affectedRows: number; row?: T }> {
    // build combined condition
    let whereClause: SQL | undefined;

    for (const [key, value] of Object.entries(condition)) {
      if (!whereClause) {
        whereClause = eq(this.table[key], value);
      } else {
        whereClause = and(whereClause, eq(this.table[key], value));
      }
    }

    if (!whereClause) {
      throw new Error("updateWhere requires at least one condition");
    }

    const result = await this.db
      .update(this.table)
      .set(data)
      .where(whereClause)
      .returning();

    return {
      affectedRows: result.length,
      row: result.length > 0 ? (result[0] as T) : undefined,
    };
  }

  /**
   * delete a record by id
   */
  async delete(id: string): Promise<void> {
    const idColumn = getIdColumn(this.table);
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table[idColumn], id))
      .returning();
    if (result.rowCount === 0) {
      console.warn(
        `No record found with id ${id} to delete from table ${this.table.name || "unknown"}`,
      );
    }
  }

  /**
   * query builder with filter
   */
  where(filter: Record<string, any>): QueryBuilder {
    // build filter clauses
    const clauses: SQL[] = [];

    for (const [key, value] of Object.entries(filter)) {
      clauses.push(eq(this.table[key], value));
    }

    // build and return a query builder
    return {
      toArray: async (): Promise<T[]> => {
        if (clauses.length === 0) {
          return this.db.select().from(this.table) as Promise<T[]>;
        }

        let whereClause = clauses[0];
        for (let i = 1; i < clauses.length; i++) {
          whereClause = and(whereClause, clauses[i]);
        }

        return this.db.select().from(this.table).where(whereClause) as Promise<
          T[]
        >;
      },

      first: async (): Promise<T | undefined> => {
        const results = await this.where(filter).toArray();
        return results[0];
      },
    };
  }

  /**
   * get a record by id
   */
  async get(id: string): Promise<T | undefined> {
    const idColumn = getIdColumn(this.table);
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table[idColumn], id));

    return result.length > 0 ? (result[0] as T) : undefined;
  }

  /**
   * find multiple records with options
   */
  async findMany(options?: {
    where?: Record<string, any>;
    orderBy?: Record<string, "asc" | "desc">;
  }): Promise<T[]> {
    let query = this.db.select().from(this.table) as any; // Drizzle select query type

    // apply where clauses if provided
    if (options?.where) {
      let whereClause: SQL | undefined;

      for (const [key, value] of Object.entries(options.where)) {
        if (!whereClause) {
          whereClause = eq(this.table[key], value);
        } else {
          whereClause = and(whereClause, eq(this.table[key], value));
        }
      }

      if (whereClause) {
        query = query.where(whereClause);
      }
    }

    // apply order by if provided
    if (options?.orderBy) {
      const orderByClauses: SQL[] = [];
      for (const [key, direction] of Object.entries(options.orderBy)) {
        const column = this.table[key];
        if (column) {
          orderByClauses.push(
            direction === "asc" ? column.asc() : column.desc(),
          );
        }
      }
      if (orderByClauses.length > 0) {
        query = query.orderBy(...orderByClauses);
      }
    }

    return query.execute() as Promise<T[]>;
  }
}

/**
 * create a postgres database adapter for drizzle-orm using node-postgres
 */
export async function createPostgresAdapter(
  connectionString: string,
  schema: Record<string, any>,
) {
  // create a connection pool
  const pool = new Pool({
    connectionString,
  });

  // connect and create the drizzle client
  const client = await pool.connect();
  const db = drizzle(client);

  // create proxy tables object
  const tables: Record<string, PostgresTableAdapter<any>> = {};

  // create adapters for each table in the schema
  for (const [tableName, tableSchema] of Object.entries(schema)) {
    tables[tableName] = new PostgresTableAdapter(db, tableSchema);
  }

  return {
    db,
    pool,
    client, // original pg client from pool
    tables,
    // helper to release client when done
    release: () => client.release(),
  };
}
