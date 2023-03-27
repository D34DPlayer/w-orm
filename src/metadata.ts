import type { FieldOptions } from './fields'
import { db } from './connection'

interface TableMetadata {
  [fieldName: string]: FieldOptions<any>
}

export const TablesMetadata: Record<string, TableMetadata> = {}

export function addFieldToMetadata<T>(tableName: string, fieldName: string, options: FieldOptions<T>) {
  if (!TablesMetadata[tableName])
    TablesMetadata[tableName] = {}
  TablesMetadata[tableName][fieldName] = options
}

function getPrimaryKeys(tableName: string) {
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

export function createTables() {
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
