import { db } from './connection'
import { ConnectionError } from './errors'

/**
 * Export a table from the database
 * This is equivalent to calling Table.all() but without wrapping the result in the table class.
 *
 * @param table - The name of the table to export
 * @returns An array containing the data from the table
 */
export async function exportTable(table: string): Promise<unknown[]> {
  if (!db.connected)
    throw new ConnectionError('Database not connected')

  const transaction = db.session.transaction(table, 'readonly')

  const store = transaction.objectStore(table)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onerror = (event) => {
      reject(event)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

/**
 * Import data into a table
 * @param table - The name of the table to import into
 * @param entries - The data to import
 * @param tx - An optional transaction to use
 * @returns The number of entries imported
 */
export async function importTable(
  table: string,
  entries: unknown[],
  tx?: IDBTransaction,
): Promise<number> {
  if (!db.connected)
    throw new ConnectionError('Database not connected')

  if (!tx)
    tx = db.session.transaction(table, 'readwrite')

  const store = tx.objectStore(table)
  const promises = []
  for (const entry of entries) {
    promises.push(
      new Promise<boolean>((resolve, reject) => {
        const request = store.put(entry)
        request.onerror = (event) => {
          reject(event)
        }
        request.onsuccess = () => {
          resolve(true)
        }
      }),
    )
  }

  return Promise.all(promises).then(x => x.length)
}

/**
 * Export the entire database.
 * @param blacklist - An array of table names to exclude from the export
 * @returns An object containing the data from each table in the database
 */
export async function exportDatabase(
  blacklist: string[] = [],
): Promise<Record<string, unknown[]>> {
  if (!db.connected)
    throw new ConnectionError('Database not connected')

  const exportData: Record<string, unknown[]> = {}
  const tables = Array.from(db.session.objectStoreNames).filter(
    table => !blacklist.includes(table),
  )

  for (const table of tables) exportData[table] = await exportTable(table)

  return exportData
}

/**
 * Import data into the database. The tables are expected to exist.
 *
 * @param data - An object containing the data to import
 * @returns An object containing the number of entries imported into each table
 */
export async function importDatabase(
  data: Record<string, unknown[]>,
): Promise<Record<string, number>> {
  if (!db.connected)
    throw new ConnectionError('Database not connected')

  const tx = db.session.transaction(
    Array.from(db.session.objectStoreNames),
    'readwrite',
  )

  const promises = []
  for (const table in data)
    promises.push(importTable(table, data[table], tx).then(n => [table, n]))

  return Promise.all(promises).then(
    results => Object.fromEntries(results) as Record<string, number>,
  )
}

/**
 * Convert an object to a Blob.
 * In node.js, blobs are only available >=18.
 *
 * @param object - The object to convert
 * @returns A Blob containing the JSON representation of the object
 */
function objectToBlob(object: unknown): Blob {
  const str = JSON.stringify(object, null, 2)
  return new Blob([str], { type: 'application/json' })
}

/**
 * Export the entire database to a Blob.
 * This can then be used to save the database to disk.
 */
export function exportDatabaseToBlob(blacklist?: string[]): Promise<Blob> {
  return exportDatabase(blacklist).then(objectToBlob)
}
