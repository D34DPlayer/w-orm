import { TablesMetadata, getPrimaryKeys } from './metadata'
import { _objectStore } from './connection'
import type { Filter, OrderBy } from './query'
import { Query } from './query'

/** The user defined fields and their types */
export type ModelFields<T extends Model> = Omit<T, keyof Model>

/** The user defined fields as a string list */
export type ModelFieldKey<T extends Model> = string & keyof ModelFields<T>

export class Model {
  static async create<T extends Model>(this: { new(): T }, values?: Partial<ModelFields<T>>): Promise<T> {
    const instance = new this()
    Object.assign(instance, values)

    const tableDef = TablesMetadata[this.name]
    if (!tableDef)
      throw new Error(`Table definition for ${this.name} not found`)

    for (const [field, fieldOpts] of Object.entries(tableDef)) {
      // Check if field is defined
      if (instance[(field as keyof T)] === undefined) {
        // Check if field has a default value
        if (fieldOpts.default !== undefined && fieldOpts.default !== null) {
          // Check if default value is a generator
          if (fieldOpts.default instanceof Function)
            instance[(field as keyof T)] = fieldOpts.default() as T[keyof T]
          else
            instance[(field as keyof T)] = fieldOpts.default as T[keyof T]
        }
        else
        if (!fieldOpts.nullable) {
          throw new Error(`Field ${field} is not nullable`)
        }
      }
    }

    // Save instance to database
    const store = _objectStore(this.name, 'readwrite')

    return new Promise((resolve, reject) => {
      const request = store.add(instance)
      request.onerror = (_) => {
        reject(instance)
      }
      if (request.transaction) {
        request.transaction.oncomplete = (_) => {
          resolve(instance)
        }
      }
      else {
        throw new Error('Transaction not found')
      }
    })
  }

  static async get<T extends Model>(this: { new(): T }, key: IDBValidKey): Promise<T | null> {
    const store = _objectStore(this.name)
    return new Promise((resolve, reject) => {
      const request = store.get(Array.isArray(key) ? key : [key])
      request.onerror = (_) => {
        reject(request.error)
      }
      request.onsuccess = (_) => {
        if (!request.result) {
          resolve(null)
        }
        else {
          const instance = new this()
          Object.assign(instance, request.result)
          resolve(instance)
        }
      }

      request.transaction?.commit()
    })
  }

  static async all<T extends Model>(this: { new(): T }): Promise<T[]> {
    return (new Query(this)).all()
  }

  static filter<T extends Model>(this: { new(): T }, filters: Filter<T>): Query<T> {
    return (new Query(this)).filter(filters)
  }

  static orderBy<T extends Model>(this: { new(): T }, orderBy: OrderBy<T>): Query<T> {
    return (new Query(this)).orderBy(orderBy)
  }

  get keys(): IDBValidKey[] {
    const tableKeys = getPrimaryKeys(this.constructor.name)
    const keys = tableKeys.map(key => this[key as keyof this] as IDBValidKey)

    return keys
  }

  async delete(): Promise<void> {
    const store = _objectStore(this.constructor.name, 'readwrite')
    const request = store.delete(this.keys)
    return new Promise((resolve, reject) => {
      request.onerror = (_) => {
        reject(request.error)
      }
      request.onsuccess = (_) => {
        resolve()
      }
    })
  }
}
