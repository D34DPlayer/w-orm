import type {
  FieldOptions,
  Index,
  ParsedIndexes,
  TableMetadata,
  TableOptions,
} from './types'
import type { Model } from './models'
import { ModelError, WormError } from './errors'

/**
 * Global object storing the tables and their fields definitions.
 * It is populated by all the {@link W-ORM.Field} decorators used in the application, or by calling {@link W-ORM.defineModel}
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
export function _addFieldToMetadata<T>(
  tableName: string,
  fieldName: string,
  options: FieldOptions<T>,
) {
  if (!TablesMetadata[tableName])
    throw new WormError(`Table ${tableName} is not defined`)
  TablesMetadata[tableName].fields[fieldName] = options
}

/**
 * Helper function to reset the metadata.
 * @internal
 */
export function _resetMetadata() {
  for (const tableName in TablesMetadata) delete TablesMetadata[tableName]
}

/**
 * Helper function to setup a table's metadata.
 * @param instance - The decorator's target
 * @internal
 */
export function _handleTableData<T>(instance: T) {
  if (!instance)
    return

  const modelClassName = instance.constructor.name

  if (modelClassName in TablesMetadata)
    return

  TablesMetadata[modelClassName] = {
    fields: {},
    hasChild: false,
    indexes: {},
    tableName: modelClassName,
  }

  const parentName = (
    Object.getPrototypeOf(instance.constructor) as typeof Model
  ).name

  if (parentName in TablesMetadata) {
    const parentMetadata = TablesMetadata[parentName]

    if (!parentMetadata)
      throw new WormError(`Parent table ${parentName} is not defined`)

    Object.assign(TablesMetadata[modelClassName], {
      fields: { ...parentMetadata.fields },
      extends: parentName,
      indexes: { ...parentMetadata.indexes },
    })

    parentMetadata.hasChild = true
  }
}

/**
 * @internal
 */
export function _overrideTableData<T>(
  instance: T,
  tableOptions: TableOptions = {},
) {
  if (!instance)
    return

  const modelClassName = instance.constructor.name

  if (!(modelClassName in TablesMetadata))
    _handleTableData(instance)

  Object.assign(TablesMetadata[modelClassName], {
    tableName: tableOptions.name || modelClassName,
    abstract: tableOptions.abstract,
  })

  if (tableOptions.indexes) {
    const parsedIndexes: ParsedIndexes = {}
    for (const indexName in tableOptions.indexes)
      parsedIndexes[indexName] = _parseIndex(tableOptions.indexes[indexName])
    Object.assign(TablesMetadata[modelClassName].indexes, parsedIndexes)
  }
}

/**
 * Extract the primary keys of a table from its metadata.
 * @param modelName The class name of the table
 * @returns {string[]} The primary keys of the table
 */
export function getPrimaryKeys(modelName: string): string[] {
  const tableFields = TablesMetadata[modelName]?.fields
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
export function createTables(session: IDBDatabase, tx: IDBTransaction): void {
  for (const modelName in TablesMetadata) {
    const metadata = TablesMetadata[modelName]
    if (
      metadata.abstract
      || (metadata.abstract === undefined && metadata.hasChild)
    )
      continue

    const tableName = metadata.tableName
    const tableFields = metadata.fields
    const extraIndexes = metadata.indexes
    const primaryKeys = getPrimaryKeys(modelName)

    let store: IDBObjectStore
    if (session.objectStoreNames.contains(tableName)) {
      store = tx.objectStore(tableName)
      const currentKeys = Array.isArray(store.keyPath)
        ? store.keyPath
        : [store.keyPath]

      if (!_compareArrays(currentKeys, primaryKeys)) {
        throw new ModelError(
          `Table ${tableName} has a different primary key than the one in the database.`,
        )
      }
    }
    else {
      store = session.createObjectStore(tableName, { keyPath: primaryKeys })
    }

    const oldIndexes = new Set(store.indexNames)
    const newIndexes = new Set(
      Object.keys(tableFields).filter(
        fieldName => tableFields[fieldName].index,
      ),
    )
    for (const indexName in extraIndexes) newIndexes.add(indexName)

    for (const oldIndex of oldIndexes) {
      if (!newIndexes.has(oldIndex))
        store.deleteIndex(oldIndex)
    }

    for (const newIndex of newIndexes) {
      let indexDef: Index
      if (newIndex in tableFields) {
        const field = tableFields[newIndex]
        indexDef = {
          fields: [newIndex],
          unique: field.unique,
          multiEntry: false,
        }
      }
      else {
        indexDef = extraIndexes[newIndex]
      }

      _createIndex(oldIndexes, store, newIndex, indexDef)
    }
  }
}

/**
 * Creates a new index in the database, while overwriting the old one if it exists.
 * @param oldIndexes - The old indexes of the table
 * @param store - The object store of the table
 * @param newIndex - The name of the new index
 * @param indexDef - The definition of the new index
 * @internal
 */
function _createIndex(
  oldIndexes: Set<string>,
  store: IDBObjectStore,
  newIndex: string,
  indexDef: Index,
) {
  if (oldIndexes.has(newIndex)) {
    const oldIndex = store.index(newIndex)
    if (!_compareIndex(oldIndex, indexDef))
      store.deleteIndex(newIndex)
    else return
  }

  const keyPath
    = indexDef.fields.length > 1 ? indexDef.fields : indexDef.fields[0]

  store.createIndex(newIndex, keyPath, {
    unique: indexDef.unique,
    multiEntry: indexDef.multiEntry,
  })
}

/**
 * Compares an index with a field's options.
 * @param index - The index to compare
 * @param field - The field's options
 * @returns - True if the index and the field's options are the same
 * @internal
 */
export function _compareIndex(index: IDBIndex, field: Index): boolean {
  return (
    index.unique === field.unique
    && index.multiEntry === field.multiEntry
    && _compareArrays(Array.from(index.keyPath), field.fields)
  )
}

/**
 * Compares two arrays.
 * @param a - The first array
 * @param b - The second array
 * @returns - True if the arrays are the same
 * @internal
 */
export function _compareArrays(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length)
    return false

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i])
      return false
  }

  return true
}

/**
 * Returns the fields that are indexable for a table.
 * @param tableName - The table's name
 * @returns - The indexable fields
 * @internal
 */
export function _getIndexableFields(tableName: string): string[] {
  const tableFields = TablesMetadata[tableName]?.fields
  if (!tableFields)
    return []

  const indexableFields = []
  for (const fieldName in tableFields) {
    const field = tableFields[fieldName]
    if (field.index)
      indexableFields.push(fieldName)
  }
  return indexableFields
}

/**
 * Parses an index string into an object.
 *
 * The index string can be in the following formats:
 * - `fieldName`: A single field index
 * - `fieldName1+fieldName2+...`: A compound index
 * - `&fieldName`: A unique index
 * - `*fieldName`: A multiEntry index
 *
 * The index string can also be an object with the following properties:
 * - `fields`: The fields of the index
 * - `unique`: Whether the index is unique
 * - `multiEntry`: Whether the index is multiEntry
 *
 * A multiEntry index can only have one field because of IndexedDB limitations.
 *
 * @param index - The index string
 * @returns - The parsed index
 */
function _parseIndex(index: Index | string): Index {
  if (typeof index === 'object')
    return index

  if (index.startsWith('&*') || index.startsWith('*&'))
    throw new WormError('MultiEntry indexes cannot be unique')

  const resp = {
    fields: [] as string[],
    unique: false,
    multiEntry: false,
  }
  if (index.startsWith('&')) {
    resp.unique = true
    index = index.slice(1)
  }
  else if (index.startsWith('*')) {
    resp.multiEntry = true
    index = index.slice(1)
  }

  resp.fields = index.split('+').map(field => field.trim())

  if (resp.multiEntry && resp.fields.length > 1)
    throw new WormError('MultiEntry indexes can only have one field')

  return resp
}
