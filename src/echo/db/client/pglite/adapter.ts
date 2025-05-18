import type { QueryBuilder, TableAdapter } from "@echo/types";
import { PGlite } from "@electric-sql/pglite";
import { and, eq, type SQL } from "drizzle-orm";
import { type DrizzleClient, drizzle } from "drizzle-orm/pglite";
import { getIdColumn } from "./utils";

/**
 * adapter for a drizzle table using pglite
 */
export class PgLiteTableAdapter<T extends Record<string, any>>
  implements TableAdapter
{
  constructor(
    private db: DrizzleClient,
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
      row: result[0] as T,
    };
  }

  /**
   * delete a record by id
   */
  async delete(id: string): Promise<void> {
    const idColumn = getIdColumn(this.table);
    await this.db.delete(this.table).where(eq(this.table[idColumn], id));
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
        // if no filter, return all records
        if (clauses.length === 0) {
          return this.db.select().from(this.table) as Promise<T[]>;
        }

        // build the combined filter
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

    return result[0] as T;
  }

  /**
   * find multiple records with options
   */
  async findMany(options?: {
    where?: Record<string, any>;
    orderBy?: Record<string, "asc" | "desc">;
  }): Promise<T[]> {
    let query = this.db.select().from(this.table);

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
    // (drizzle doesn't have a direct orderBy method that matches our interface,
    // so we'd need to implement this with the actual SQL ordering methods)
    if (options?.orderBy) {
      for (const [key, direction] of Object.entries(options.orderBy)) {
        // This is simplified - in a real implementation we'd need to map to
        // the actual Drizzle orderBy methods
        if (direction === "asc") {
          query = query.orderBy(this.table[key]);
        } else {
          query = query.orderBy(this.table[key], "desc");
        }
      }
    }

    return query as Promise<T[]>;
  }
}

/**
 * create a pglite database adapter for drizzle-orm
 */
export function createPgLiteAdapter(
  dbUrl: string,
  schema: Record<string, any>,
) {
  // create the pglite instance
  const pglite = new PGlite({
    url: dbUrl,
  });

  // create the drizzle client
  const db = drizzle(pglite);

  // create proxy tables object
  const tables: Record<string, PgLiteTableAdapter<any>> = {};

  // create adapters for each table in the schema
  for (const [tableName, tableSchema] of Object.entries(schema)) {
    tables[tableName] = new PgLiteTableAdapter(db, tableSchema);
  }

  return {
    db,
    pglite,
    tables,
  };
}
