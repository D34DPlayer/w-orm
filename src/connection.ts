import { createTables } from './metadata.js'

interface DisconnectedDB {
  connected: false
}

interface ConnectedDB {
  connected: true
  session: IDBDatabase
  name: string
  version: number
}

type DB = DisconnectedDB | ConnectedDB

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

export async function init(dbName: string, version: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (db.connected)
      resolve(db.session)

    const request = indexedDB.open(dbName, version)

    request.onerror = (event) => {
      reject(event)
    }

    request.onsuccess = (_) => {
      _updateDB(request.result, dbName, version)
      resolve(request.result)
    }

    request.onupgradeneeded = (_) => {
      _updateDB(request.result, dbName, version)
      console.warn('Database upgrade needed')
      createTables()
      resolve(request.result)
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

class DBTransaction {
  private transaction: IDBTransaction
  constructor(private mode: IDBTransactionMode, objectStoreName: string) {
    if (!db.connected)
      throw new Error('Database is not connected')

    this.transaction = db.session.transaction([objectStoreName], mode)
  }
}
