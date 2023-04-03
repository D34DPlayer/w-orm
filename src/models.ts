import type { Filter, ModelFields, OrderBy } from './types'
import { TablesMetadata, getPrimaryKeys } from './metadata'
import { _objectStore } from './connection'
import { Query } from './query'

/**
 * Base class for all models.
 *
 * @see {@link Field} for more information about fields
 * @see {@link Query} for more information about querying the database
 *
 * @example
 * Create a new model:
 * ```ts
 * import { Model, Field } from '@d34d/w-orm'
 *
 * class NewTable extends Model {
 *  @Field({ primaryKey: true })
 *  id: number
 *  @Field()
 *  name: string
 * }
 * ```
 * Query the database:
 * ```ts
 * // Get with primary key
 * const table = await NewTable.get(1)
 * // Get all
 * const allTables = await NewTable.all()
 * // Get with filter
 * const tables = await NewTable.filter({ name: 'John' }).first()
 * // Get with advanced filter
 * const tables2 = await NewTable.filter({ name: (n) => n.includes('Ruiz') }).first()
 * // Get with filter and order
 * const tables3 = await NewTable.filter({ name: 'John' }).orderBy('-name').first()
 * // Create a new entry
 * const newTable = await NewTable.create({ name: 'John' })
 * // Update an entry
 * newTable.name = 'Jane'
 * await newTable.save()
 * // Delete an entry
 * await newTable.delete()
 * ```
 */
export abstract class Model {
  /**
   * Create a new model instance.
   * @param values - The values to initialize the model with
   * @returns - The new model instance
   */
  public static async create<T extends Model>(this: { new(): T }, values?: Partial<ModelFields<T>>): Promise<T> {
    const instance = new this()
    Object.assign(instance, values)

    const tableDef = TablesMetadata[this.name]
    if (!tableDef)
      throw new Error(`Table definition for ${this.name} not found`)

    for (const [field, fieldOpts] of Object.entries(tableDef.fields)) {
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
        reject(request.error)
      }
      request.onsuccess = (_) => {
        resolve(instance)
      }
    })
  }

  /**
   * Get a model instance by its primary key.
   * @param key - The primary key of the model
   * @returns - The model instance or null if not found
   */
  public static async get<T extends Model>(this: { new(): T }, key: IDBValidKey): Promise<T | null> {
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
    })
  }

  /**
   * Get all model instances.
   * @returns - The model instances
   */
  public static async all<T extends Model>(this: { new(): T }): Promise<T[]> {
    return (new Query(this)).all()
  }

  /**
   * Get how many model instances there are.
   * @returns - The number of model instances
   */
  public static async count<T extends Model>(this: { new(): T }): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const store = _objectStore(this.name)
      const request = store.count()
      request.onerror = (_) => {
        reject(request.error)
      }
      request.onsuccess = (_) => {
        resolve(request.result)
      }
    })
  }

  /**
   * Start a query for this model with a filter.
   * @param filters - The filters to apply
   * @returns - The new query
   */
  public static filter<T extends Model>(this: { new(): T }, filters: Filter<T>): Query<T> {
    return (new Query(this)).filter(filters)
  }

  /**
   * Start a query for this model with an order.
   * @param orderBy - The field to order by, prepend a `-` to reverse the order
   * @returns - The new query
   */
  public static orderBy<T extends Model>(this: { new(): T }, orderBy: OrderBy<T>): Query<T> {
    return (new Query(this)).orderBy(orderBy)
  }

  /**
   * Get the primary keys of this instance.
   */
  public get keys(): IDBValidKey[] {
    const tableKeys = getPrimaryKeys(this.constructor.name)
    const keys = tableKeys.map(key => this[key as keyof this] as IDBValidKey)

    return keys
  }

  /**
   * Delete this instance from the database.
   */
  public async delete(): Promise<void> {
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

  /**
   * Save this instance's changes to the database.
   */
  public async save(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = _objectStore(this.constructor.name, 'readwrite')
      const request = store.put(this)

      request.onerror = (_) => {
        reject(request.error)
      }
      request.onsuccess = (_) => {
        resolve()
      }
    })
  }
}
