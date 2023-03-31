import { createTables } from './metadata'

export interface DisconnectedDB {
  connected: false
}

export interface ConnectedDB {
  connected: true
  session: IDBDatabase
  name: string
  version: number
}

export type DB = DisconnectedDB | ConnectedDB

// TODO: Add support for multiple databases
export const db: DB = {
  connected: false,
}

function _updateDB(_db: IDBDatabase, dbName: string, version: number) {
  Object.assign(db, {
    session: _db,
    connected: true,
    name: dbName,
    version,
  })
}

export interface InitResponse {
  session: IDBDatabase
  upgraded: boolean
}

export async function init(dbName: string, version: number) {
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
      console.debug('Database upgrade needed')
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

export async function deleteDB(dbName: string) {
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

export function _objectStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  if (!db.connected)
    throw new Error('Database is not connected')
  return db.session.transaction(storeName, mode).objectStore(storeName)
}

export function disconnect() {
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
