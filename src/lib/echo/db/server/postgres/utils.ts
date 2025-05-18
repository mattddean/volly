import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * find the primary key column in a drizzle table schema
 */
export function getIdColumn(table: Record<string, any>): string {
  // first check if the table has columns property
  if (!table || typeof table !== "object" || !Object.keys(table).length) {
    return "id"; // default to 'id' if no table schema provided
  }

  // try to find columns property
  const columns = table.$columns || table.columns || table;

  // look for a column with primary key constraint
  for (const [colName, column] of Object.entries(columns)) {
    // check for primaryKey property
    if (
      column &&
      typeof column === "object" &&
      // different ways primary key might be indicated in the schema
      ((column as AnyPgColumn).primaryKey === true ||
        (column as any).primary === true ||
        ((column as any).constraints &&
          Array.isArray((column as any).constraints) &&
          (column as any).constraints.some(
            (c: any) => c && typeof c === "object" && c.primary === true,
          )))
    ) {
      return colName;
    }
  }

  // if "id" column exists, use that as a convention
  if ("id" in columns) {
    return "id";
  }

  // return first column name as last resort
  const firstColName = Object.keys(columns)[0];
  if (firstColName) {
    return firstColName;
  }

  // absolute fallback
  return "id";
}
