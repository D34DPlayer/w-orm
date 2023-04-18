import type { Filter, ForEachCallback, OrderBy } from './types'
import { TablesMetadata, getPrimaryKeys } from './metadata'
import { _objectStore } from './transaction'
import { Query } from './query'
import { ModelError } from './errors'

/**
 * Base class for all models.
 * All DB operations allow providing a transaction to be used.
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
export abstract class Model implements Record<string, any> {
  /** Allows setting extra elements in a model, since this is allowed by IDB */
  [x: string]: any

  /**
   * Create a new model instance.
   * @param values - The values to initialize the model with
   * @returns - The new model instance
   */
  public static async create<T extends Model>(this: { new(): T }, values: Partial<T>, tx?: IDBTransaction): Promise<T> {
    const instance = new this()
    Object.assign(instance, values)

    const tableDef = TablesMetadata[this.name] || {
      fields: {},
    }

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
          throw new ModelError(`Field ${field} is not nullable`)
        }
      }
    }

    // Save instance to database
    const store = _objectStore(this.name, tx || 'readwrite')

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
  public static async get<T extends Model>(this: { new(): T }, key: IDBValidKey, tx?: IDBTransaction): Promise<T | null> {
    const store = _objectStore(this.name, tx)
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
  public static async all<T extends Model>(this: { new(): T }, tx?: IDBTransaction): Promise<T[]> {
    return (new Query(this)).all(tx)
  }

  /**
   * Loop through all model instances.
   * @see {@link Query.forEach} for more information
   *
   * @param callback - The callback to call for each model instance
   * @example
   * ```ts
   * // Simple loop
   * await User.forEach((user) => {
   *  console.log(user.name)
   * })
   * // Loop with async callback
   * await User.forEach(async (user, tx) => {
   *   await user.delete(tx)
   * })
   * ```
   */
  public static async forEach<T extends Model>(this: { new(): T }, callback: ForEachCallback<T>, tx?: IDBTransaction): Promise<void> {
    return (new Query(this)).forEach(callback, tx)
  }

  /**
   * Get how many model instances there are.
   * @returns - The number of model instances
   */
  public static async count<T extends Model>(this: { new(): T }, tx?: IDBTransaction): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const store = _objectStore(this.name, tx)
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
   * @see {@link Query.filter} for more information
   *
   * @param filters - The filters to apply
   * @returns - The new query
   */
  public static filter<T extends Model>(this: { new(): T }, filters: Filter<T>): Query<T> {
    return (new Query(this)).filter(filters)
  }

  /**
   * Start a query for this model with an order.
   * @see {@link Query.orderBy} for more information
   *
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
  public async delete(tx?: IDBTransaction): Promise<void> {
    const store = _objectStore(this.constructor.name, tx || 'readwrite')
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
  public async save(tx?: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = _objectStore(this.constructor.name, tx || 'readwrite')
      const request = store.put(this)

      request.onerror = (_) => {
        reject(request.error)
      }
      request.onsuccess = (_) => {
        resolve()
      }
    })
  }

  /**
   * Update this instance's fields. This will not save the changes to the database.
   * @param values - The values to update
   */
  public update(values: Partial<this>): void {
    Object.assign(this, values)
  }

  /**
   * Deletes all the rows in the table.
   */
  public static clear(tx?: IDBTransaction): void {
    const store = _objectStore(this.name, tx || 'readwrite')
    store.clear()
  }

  /**
   * Get all the primary keys of the table.
   * @returns - A list with all the primary keys
   */
  public static async keys(tx?: IDBTransaction): Promise<IDBValidKey[]> {
    const store = _objectStore(this.name, tx)
    const request = store.getAllKeys()

    return new Promise((resolve, reject) => {
      request.onerror = (_) => {
        reject(request.error)
      }
      request.onsuccess = (_) => {
        resolve(request.result)
      }
    })
  }
}
