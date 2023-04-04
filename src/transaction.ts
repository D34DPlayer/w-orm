import type { TransactionCallback } from './types'
import { db } from './connection'

/**
 * Utility function to get an object store from the global database connection
 * @param storeName The name of the object store
 * @param mode The transaction mode
 * @returns { IDBObjectStore } - The object store
 * @internal
 */
export function _objectStore(storeName: string, transaction?: IDBTransaction): IDBObjectStore
export function _objectStore(storeName: string, mode?: IDBTransactionMode): IDBObjectStore
export function _objectStore(storeName: string, modeOrTransaction?: IDBTransactionMode | IDBTransaction): IDBObjectStore
export function _objectStore(storeName: string, modeOrTransaction?: IDBTransactionMode | IDBTransaction): IDBObjectStore {
  if (!db.connected)
    throw new Error('Database is not connected')
  if (modeOrTransaction instanceof IDBTransaction) {
    return modeOrTransaction.objectStore(storeName)
  }
  else {
    const mode = modeOrTransaction || 'readonly'
    return db.session.transaction(storeName, mode).objectStore(storeName)
  }
}

export async function Transaction(mode: IDBTransactionMode, transactionCallback: TransactionCallback): Promise<void> {
  if (!db.connected)
    throw new Error('Database is not connected')
  const stores = Array.from(db.session.objectStoreNames)

  const transaction = db.session.transaction(stores, mode)
  const transactionPromise = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  const callbackPromise = transactionCallback(transaction)
    .then(() => transaction.commit())
    .catch((error: Error) => {
      transaction.abort()
      throw error
    })

  await Promise.all([callbackPromise, transactionPromise])
}
