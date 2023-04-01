import type { DB, InitResponse } from './types'
import { createTables } from './metadata'

// TODO: Support multiple connections
/**
 * Global database connection, disconnected by default
 * @type {DB}
 * @category Global objects
 */
export const db: DB = {
  connected: false,
}

/**
 * Utility function to store the database connection
 * @param _db - Database connection
 * @param dbName - Database name
 * @param version - Database version
 * @internal
 */
function _updateDB(_db: IDBDatabase, dbName: string, version: number) {
  Object.assign(db, {
    session: _db,
    connected: true,
    name: dbName,
    version,
  })
}

/**
 * Starts a new global database connection.
 * Three scenarios are possible:
 * 1. There's already a connection, we reuse it
 * 2. There's no version bump, a new connection is created
 * 3. There's a version bump, a new connection is created and tables created
 *
 * @example
 * ```js
 * const initResp = await init('my-db', 1)
 * if (initResp.upgraded) {
 *  console.log("Database was upgraded")
 * }
 * ```
 * @param dbName - The database name
 * @param version - The database version, a version bump will trigger an upgrade
 * @returns {Promise<InitResponse>} - The database connection and whether an upgrade was performed
 */
export async function init(dbName: string, version: number): Promise<InitResponse> {
  return new Promise<InitResponse>((resolve, reject) => {
    if (db.connected) {
      resolve({
        session: db.session,
        upgraded: false,
      })
    }

    const request = indexedDB.open(dbName, version)

    request.onerror = (event) => {
      reject(event)
    }

    request.onsuccess = (_) => {
      _updateDB(request.result, dbName, version)
      resolve({
        session: request.result,
        upgraded: false,
      })
    }

    request.onupgradeneeded = (_) => {
      _updateDB(request.result, dbName, version)
      createTables()
      if (request.transaction) {
        request.transaction.oncomplete = () => {
          resolve({
            session: request.result,
            upgraded: true,
          })
        }
      }
      else {
        resolve({
          session: request.result,
          upgraded: true,
        })
      }
    }
  })
}

/**
 * Deletes a specific database, use with caution.
 * Any open connection needs to be closed or this will hang indefinitely.
 * @param dbName - The database name
 * @returns {Promise<Event>} - A promise that resolves to the delete event
 */
export async function deleteDB(dbName: string): Promise<Event> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName)

    request.onerror = (event) => {
      reject(event)
    }

    request.onsuccess = (event) => {
      resolve(event)
    }
  })
}

/**
 * Utility function to get an object store from the global database connection
 * @param storeName The name of the object store
 * @param mode The transaction mode
 * @returns { IDBObjectStore } - The object store
 * @internal
 */
export function _objectStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
  if (!db.connected)
    throw new Error('Database is not connected')
  return db.session.transaction(storeName, mode).objectStore(storeName)
}

/**
 * Closes the global database connection
 */
export function disconnect(): void {
  if (!db.connected)
    return
  db.session.close()
  Object.assign(db, {
    connected: false,
    session: undefined,
    name: undefined,
    version: undefined,
  })
}
