import type { FieldOptions, TableMetadata } from './types'
import { db } from './connection'
import type { Model } from './models'

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

/**
 * Helper function to add a field to the metadata.
 * @param tableName - The table's name
 * @param fieldName - The field's name
 * @param options - The field's options
 * @internal
 */
export function _addFieldToMetadata<T>(tableName: string, fieldName: string, options: FieldOptions<T>) {
  if (!TablesMetadata[tableName])
    throw new Error(`Table ${tableName} is not defined`)
  TablesMetadata[tableName].fields[fieldName] = options
}

/**
 * Helper function to reset the metadata.
 * @internal
 */
export function _resetMetadata() {
  for (const tableName in TablesMetadata)
    delete TablesMetadata[tableName]
}

export function _handleTableData<T>(instance: T) {
  if (!instance)
    return

  const tableName = instance.constructor.name

  if (tableName in TablesMetadata)
    return

  const parentName = (Object.getPrototypeOf(instance.constructor) as typeof Model).name

  if (parentName !== 'Model') {
    const parentMetadata = TablesMetadata[parentName]

    if (!parentMetadata)
      throw new Error(`Parent table ${parentName} is not defined`)

    TablesMetadata[tableName] = {
      fields: { ...parentMetadata.fields },
      abstract: false,
      extends: parentName,
    }

    parentMetadata.abstract = true
  }
  else {
    TablesMetadata[tableName] = {
      fields: {},
      abstract: false,
    }
  }
}

/**
 * Extract the primary keys of a table from its metadata.
 * @param tableName The table's name
 * @returns {string[]} The primary keys of the table
 */
export function getPrimaryKeys(tableName: string): string[] {
  const tableFields = TablesMetadata[tableName]?.fields
  if (!tableFields)
    return []

  const primaryKeys = []
  for (const fieldName in tableFields) {
    const field = tableFields[fieldName]
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
    if (TablesMetadata[tableName].abstract)
      continue

    const tableFields = TablesMetadata[tableName].fields
    const primaryKeys = getPrimaryKeys(tableName)
    const store = db.session.createObjectStore(tableName, { keyPath: primaryKeys })
    for (const fieldName in tableFields) {
      const field = tableFields[fieldName]
      store.createIndex(fieldName, fieldName, { unique: field.unique })
    }
  }
}
