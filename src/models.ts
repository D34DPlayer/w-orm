import { TablesMetadata } from './metadata'
import { objectStore } from './connection'

export class Model {
  static async create<T extends Model>(this: { new(): T }, values?: Omit<Partial<T>, keyof Model>): Promise<T> {
    const instance = new this()
    Object.assign(instance, values)

    const tableDef = TablesMetadata[this.name]
    if (!tableDef)
      throw new Error(`Table definition for ${this.name} not found`)

    for (const [field, fieldOpts] of Object.entries(tableDef)) {
      // Check if field is defined
      if (instance[(field as keyof T)] === undefined) {
        // Check if field has a default value
        if (fieldOpts.default !== undefined) {
          // Check if default value is a generator
          if (fieldOpts.default instanceof Function)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            instance[(field as keyof T)] = fieldOpts.default()
          else
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            instance[(field as keyof T)] = fieldOpts.default
        }
        else
        if (!fieldOpts.nullable) {
          throw new Error(`Field ${field} is not nullable`)
        }
      }
    }

    // Save instance to database
    const store = objectStore(this.name, 'readwrite')

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

  static async get<T extends Model>(this: { new(): T }, key: IDBValidKey): Promise<T> {
    const store = objectStore(this.name)
    return new Promise((resolve, reject) => {
      const request = store.get(Array.isArray(key) ? key : [key])
      request.onerror = (_) => {
        reject(request.error)
      }
      request.onsuccess = (_) => {
        const instance = new this()
        Object.assign(instance, request.result)
        resolve(instance)
      }

      request.transaction?.commit()
    })
  }
}
