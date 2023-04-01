import type { FieldOptions, TableMetadata } from './types'
import { db } from './connection'

/**
 * Global object storing the tables and their fields definitions.
 * It is populated by all the {@link Field} decorators used in the application.
 *
 * It should be treated as read-only, even though it is not.
 *
 * @readonly
 * @category Global objects
 */
export const TablesMetadata: Record<string, TableMetadata> = {}

export function _addFieldToMetadata<T>(tableName: string, fieldName: string, options: FieldOptions<T>) {
  if (!TablesMetadata[tableName])
    TablesMetadata[tableName] = {}
  TablesMetadata[tableName][fieldName] = options
}

/**
 * Extract the primary keys of a table from its metadata.
 * @param tableName The table's name
 * @returns {string[]} The primary keys of the table
 */
export function getPrimaryKeys(tableName: string): string[] {
  const table = TablesMetadata[tableName]
  if (!table)
    return []

  const primaryKeys = []
  for (const fieldName in table) {
    const field = table[fieldName]
    if (field.primaryKey)
      primaryKeys.push(fieldName)
  }
  return primaryKeys
}

/**
 * Uses the metadata to create the tables in the database.
 * This function is called automatically when the database is upgraded and
 * will only work within an upgrade context.
 * @throws {Error} Error if the database is not connected
 * @internal
 */
export function createTables(): void {
  if (!db.connected)
    throw new Error('Database is not connected')
  for (const tableName in TablesMetadata) {
    const table = TablesMetadata[tableName]
    const primaryKeys = getPrimaryKeys(tableName)
    const store = db.session.createObjectStore(tableName, { keyPath: primaryKeys })
    for (const fieldName in table) {
      const field = table[fieldName]
      store.createIndex(fieldName, fieldName, { unique: field.unique })
    }
  }
}
