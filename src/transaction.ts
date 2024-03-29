import type {
  Constructor,
  TransactionCallback,
  TransactionOrMode,
} from './types'
import { db } from './connection'
import { ConnectionError, WormError } from './errors'
import type { Model } from './models'
import { TablesMetadata } from './metadata'

export function _objectStore(
  storeName: string,
  tx?: IDBTransaction,
): IDBObjectStore
export function _objectStore(
  storeName: string,
  mode?: IDBTransactionMode,
): IDBObjectStore
export function _objectStore(
  storeName: string,
  txOrMode?: TransactionOrMode,
): IDBObjectStore

/**
 * Utility function to get an object store from the global database connection
 * @param storeName The name of the object store
 * @param mode The transaction mode
 * @returns { IDBObjectStore } - The object store
 * @internal
 */
export function _objectStore(
  storeName: string,
  txOrMode?: TransactionOrMode,
): IDBObjectStore {
  if (storeName in TablesMetadata)
    storeName = TablesMetadata[storeName].tableName

  if (!db.connected)
    throw new ConnectionError('Database is not connected')
  if (txOrMode instanceof IDBTransaction) {
    return txOrMode.objectStore(storeName)
  }
  else {
    const mode = txOrMode || 'readonly'
    return db.session.transaction(storeName, mode).objectStore(storeName)
  }
}

/**
 * Starts a db transaction. The tables concerned need to be passed as an array.
 * Depending on the result of the transactionCallback, the transaction will be committed or aborted.
 *
 * Because of a limitation in the IndexedDB API, the transaction will be automatically committed
 * if we wait for any non transactional operation. (e.g. fetching some data from the network).
 *
 * This means, that even though the transactionCallback is async, it should not await any non transactional operation.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
 *
 * @example
 * ```ts
 * await Transaction('readwrite', [User], async (tx) => {
 *  const newUser = await User.create({ name: 'John Doe' }, tx)
 *  const getUser = await User.get(newUser.id, tx)
 *
 *  // Any error thrown in the callback will abort the transaction, this will rollback any changes made
 *  throw new Error('rollback')
 *  // If no error is thrown, the transaction will be committed
 * })
 * ```
 *
 * @param mode - The transaction mode
 * @param models - The models to use in the transaction
 * @param transactionCallback - The callback to execute in the transaction
 * @returns - The result of the transactionCallback
 */
export async function Transaction<T>(
  mode: IDBTransactionMode,
  models: Constructor<Model>[],
  transactionCallback: TransactionCallback<T>,
): Promise<T> {
  if (!db.connected)
    throw new ConnectionError('Database is not connected')
  const stores = models.map(model => model.name)

  const transaction = db.session.transaction(stores, mode)
  const transactionPromise = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })

  let callbackDone = false
  const callbackPromise = transactionCallback(transaction)
    .then((x) => {
      callbackDone = true
      transaction.commit()
      return x
    })
    .catch((error: Error) => {
      callbackDone = true
      transaction.abort()
      throw error
    })

  const res = await Promise.race([callbackPromise, transactionPromise])

  if (!callbackDone) {
    // If the callback is still pending, it means that it's waiting for a non transactional operation.
    // We can't prevent it to continue using the transaction, so we have to throw an error.
    throw new WormError(
      'The transaction committed, but the callback is still pending. Make sure to not await any non transactional operation in it.',
    )
  }

  // The callback is done, so it has to be its result
  return res as T
}
