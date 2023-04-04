import type { Filter, ModelFieldKey, OrderBy } from './types'
import type { Model } from './models'
import { _objectStore } from './transaction'

export class Query<T extends Model> {
  /** The filters to apply to the query */
  private filters = {} as Filter<T>
  /** The field to order the query by */
  private _orderBy?: ModelFieldKey<T>
  /** Whether to reverse the order of the query */
  private _reverse = false
  /** Maximum amount of items to return */
  private _limit?: number
  /** Amount of items to skip */
  private _skip?: number

  /**
   * A query builder for the models.
   *
   * A query is lazy, meaning that it will not execute until you call one of the methods.
   *
   * A query is linked to a model, meaning that you can only query the model that you created the query from.
   *
   * @see {@link Model}: {@link Model.filter} and {@link Model.orderBy} for how queries are usually created
   *
   * @typeParam T - The model to query
   * @param TargetModel - The model to query
   */
  public constructor(private TargetModel: { new(): T }) {}

  /**
   * Update the filters of the query.
   * This will not reset the filters, but will merge the new filters with the old ones.
   * @param filters - The new filters to apply to the query
   * @returns - The query itself, to allow chaining
   */
  public filter(filters: Filter<T>): Query<T> {
    Object.assign(this.filters, filters)
    return this
  }

  /**
   * Reset the filters of the query.
   * @returns - The query itself, to allow chaining
   */
  public resetFilters(): Query<T> {
    this.filters = {} as Filter<T>
    return this
  }

  /**
   * Update the field used to order the query.
   * @param field - The field to order the query by, prepend with `-` to reverse the order
   * @returns - The query itself, to allow chaining
   */
  public orderBy(field: OrderBy<T>): Query<T> {
    if (field.startsWith('-')) {
      this._reverse = true
      this._orderBy = field.slice(1) as ModelFieldKey<T>
    }
    else {
      this._reverse = false
      this._orderBy = field as ModelFieldKey<T>
    }
    return this
  }

  /**
   * Change the order of the query.
   * @returns - The query itself, to allow chaining
   */
  public reverse(): Query<T> {
    this._reverse = !this._reverse
    return this
  }

  /**
   * Checks if the given instance fits the filters of the query.
   * @param instance - The instance to check
   * @returns - Whether the instance fits the filters
   */
  private _fitsFilters(instance: T): boolean {
    for (const [key, value] of Object.entries(this.filters)) {
      if (typeof value === 'function') {
        // If the value is a function, we call it with the instance's value
        if (!value(instance[key as keyof T]))
          return false
        continue
      }
      else {
        // If the value is not a function, we compare it with the instance's value
        if (instance[key as keyof T] !== value as T[keyof T])
          return false
      }
    }
    return true
  }

  /**
   * Utility function to get the cursor of the query.
   * @returns
   */
  private _getCursor(transactionOrMode: IDBTransactionMode | IDBTransaction = 'readonly'): IDBRequest<IDBCursorWithValue | null> {
    const store = _objectStore(this.TargetModel.name, transactionOrMode)
    if (this._orderBy) {
      const index = store.index(this._orderBy)

      return index.openCursor(undefined, this._reverse ? 'prev' : 'next')
    }
    else {
      return store.openCursor(undefined, this._reverse ? 'prev' : 'next')
    }
  }

  /**
   * Executes the query and returns the first result.
   * @returns - The first result of the query, or null if no result was found
   */
  async first(transaction?: IDBTransaction): Promise<T | null> {
    const cursor = this._getCursor(transaction)
    return new Promise<T | null>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve(null)
        }
        else {
          if (this._fitsFilters(cursor.result.value as T)) {
            const instance = new this.TargetModel()
            Object.assign(instance, cursor.result.value)
            resolve(instance)
          }
          else { cursor.result.continue() }
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }

  /**
   * Executes the query and returns all the results.
   * @returns - All the results of the query
   */
  async all(transaction?: IDBTransaction): Promise<T[]> {
    const cursor = this._getCursor(transaction)
    const result: T[] = []
    return new Promise<T[]>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve(result)
        }
        else {
          if (this._fitsFilters(cursor.result.value as T)) {
            const instance = new this.TargetModel()
            Object.assign(instance, cursor.result.value)
            result.push(instance)
          }
          cursor.result.continue()
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }

  /**
   * Executes the query and returns the number of results.
   * @returns - The amount of results of the query
   */
  async count(transaction?: IDBTransaction): Promise<number> {
    const cursor = this._getCursor(transaction)
    let count = 0
    return new Promise<number>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve(count)
        }
        else {
          if (this._fitsFilters(cursor.result.value as T))
            count++

          cursor.result.continue()
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }

  /**
   * Executes the query and deletes all the results.
   * @returns - The amount of results deleted
   */
  async delete(transaction?: IDBTransaction): Promise<number> {
    const cursor = this._getCursor(transaction || 'readwrite')
    let amount = 0
    return new Promise<number>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve(amount)
        }
        else {
          if (this._fitsFilters(cursor.result.value as T)) {
            amount += 1
            cursor.result.delete()
          }
          cursor.result.continue()
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }
}
