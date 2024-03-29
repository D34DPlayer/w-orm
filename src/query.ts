import type {
  CursorCallback,
  Filter,
  ForEachCallback,
  ModelFieldKey,
  ModelFields,
  OrderBy,
  SimpleFilter,
  TransactionOrMode,
} from './types'
import type { Model } from './models'
import { _objectStore } from './transaction'
import { WormError } from './errors'
import { _getIndexableFields } from './metadata'

export class BetweenFilter<T> {
  /** The minimum key for IDB */
  static minKey = -Infinity
  /** The "maximum" key for IDB */
  static maxKey = [[]]

  /**
   * A filter that checks if a value is between two values.
   * @param lower - The lower bound of the filter
   * @param upper - The upper bound of the filter
   * @param lowerOpen - Whether the lower bound is open
   * @param upperOpen - Whether the upper bound is open
   * @typeParam T - The type of the value to filter
   * @example
   * ```ts
   * // Get all users with an age between 20 and 30
   * const query = User.filter({ age: new BetweenFilter(20, 30) })
   * // Get all users with an age between 20 and 30, excluding 20 and 30
   * const query = User.filter({ age: new BetweenFilter(20, 30, true, true) })
   * ```
   */
  constructor(
    public lower: T | null,
    public upper: T | null,
    public lowerOpen = false,
    public upperOpen = false,
  ) {}

  /**
   * Recursively replaces the null values with the default value.
   * @param val - The value to replace
   * @param defaultVal - The default value to replace with
   * @returns - The value with the default values replaced
   */
  private withDefault(val: unknown, defaultVal: unknown): unknown {
    if (val === undefined || val === null)
      return defaultVal
    if (Array.isArray(val))
      return val.map(v => this.withDefault(v, defaultVal))
    return val
  }

  /**
   * Returns the IDBKeyRange for this filter.
   * @returns - The IDBKeyRange for this filter
   */
  public keyRange(): IDBKeyRange {
    const lower: unknown = this.withDefault(this.lower, BetweenFilter.minKey)
    const upper: unknown = this.withDefault(this.upper, BetweenFilter.maxKey)

    return IDBKeyRange.bound(lower, upper, this.lowerOpen, this.upperOpen)
  }

  /**
   * Checks if a value fits the filter.
   * @param value - The value to check
   * @returns - Whether the value fits the filter
   */
  public fits(value: T): boolean {
    let lowerCmp = false
    if (this.lower === null || this.lower === undefined)
      lowerCmp = true
    else if (this.lowerOpen)
      lowerCmp = value > this.lower
    else lowerCmp = value >= this.lower

    let upperCmp = false
    if (this.upper === null || this.upper === undefined)
      upperCmp = true
    else if (this.upperOpen)
      upperCmp = value < this.upper
    else upperCmp = value <= this.upper

    return lowerCmp && upperCmp
  }
}

/**
 * A filter that checks if a value is between two values.
 * @param lower - The lower bound of the filter
 * @param upper - The upper bound of the filter
 * @param lowerOpen - Whether the lower bound is open
 * @param upperOpen - Whether the upper bound is open
 * @typeParam T - The type of the value to filter
 * @example
 * ```ts
 * // Get all users with an age between 20 and 30
 * const query = User.filter({ age: BetweenFilter(20, 30) })
 * // Get all users with an age between 20 and 30, excluding 20 and 30
 * const query = User.filter({ age: BetweenFilter(20, 30, true, true) })
 * // It is also used for custom indexes
 * const query = User.withIndex('age', Between(10, 10))
 * ```
 */
export function Between<T>(
  lower: T | null,
  upper: T | null,
  lowerOpen = false,
  upperOpen = false,
): BetweenFilter<T> {
  return new BetweenFilter(lower, upper, lowerOpen, upperOpen)
}

export class Query<T extends Model> {
  /** The filters to apply to the query */
  private filters = {} as Filter<T>
  /** The field to order the query by */
  private _orderBy?: ModelFieldKey<T>
  /** Index to use */
  private _index?: string
  /** Index query */
  private _indexQuery?: BetweenFilter<unknown>
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
  public constructor(private TargetModel: { new (): T }) {}

  /**
   * Update the filters of the query.
   * This will not reset the filters, but will merge the new filters with the old ones.
   *
   * For ranges, it is recommended to use a {@link BetweenFilter} for performance reasons.
   *
   * @param filters - The new filters to apply to the query
   * @returns - The query itself, to allow chaining
   *
   * @example
   * ```
   * // Get all users with the name "John" and the age 20
   * const query = User.filter({ name: 'John' }).filter({ age: 20 })
   * ```
   */
  public filter(filters: Filter<T>): Query<T> {
    Object.assign(this.filters, filters)
    return this
  }

  /**
   * Reset the filters of the query.
   * @returns - The query itself, to allow chaining
   *
   * @example
   * ```ts
   * // Get all users with the name "John"
   * const query = User.filter({ name: 'John' })
   * // Get all users
   * query.resetFilters()
   */
  public resetFilters(): Query<T> {
    this.filters = {} as Filter<T>
    return this
  }

  /**
   * Update the field used to order the query.
   *
   * Given that this uses the index under the hood, you have to choose between using this or {@link withIndex};
   * up to you to benchmark which one is faster.
   *
   * @param field - The field to order the query by, prepend with `-` to reverse the order
   * @returns - The query itself, to allow chaining
   *
   * @example
   * ```ts
   * // Get all users ordered by their name ascending
   * const query = User.orderBy('name')
   * // Get all users ordered by their name descending
   * const query = User.orderBy('-name')
   */
  public orderBy(field: OrderBy<T>): Query<T> {
    if (this._index) {
      throw new WormError(
        'Cannot order by field when using an index: order it manually, or use `resetIndex` instead',
      )
    }

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
   *
   * @example
   * ```ts
   * // Get all users ordered by their name ascending
   * const query = User.orderBy('name')
   * // Get all users ordered by their name descending
   * query.reverse()
   * ```
   */
  public reverse(): Query<T> {
    this._reverse = !this._reverse
    return this
  }

  /**
   * Add a limit to the query.
   * This means that the query will only return a maximum of `limit` items.
   * @param limit - The maximum amount of items to return
   * @returns - The query itself, to allow chaining
   *
   * @example
   * ```ts
   * // Get the first 10 users
   * const query = User.limit(10)
   * ```
   */
  public limit(limit: number): Query<T> {
    this._limit = limit
    return this
  }

  /**
   * Add an offset to the query.
   * This means that the query will skip the first `offset` items.
   * @param offset - The amount of items to skip
   * @returns - The query itself, to allow chaining
   *
   * @example
   * ```ts
   * // Get all users except the second page of 10 users
   * const query = User.limit(10).offset(10)
   * ```
   */
  public offset(offset: number): Query<T> {
    this._skip = offset
    return this
  }

  /**
   * Define the index to use for the query, with an optional filter query.
   * Given that the orderBy also uses the index, only one can be used at once,
   * up to you to benchmark which one is faster.
   * @param index - The index to use
   * @param query - The query to use on the index
   * @returns
   */
  public withIndex(
    index: ModelFieldKey<T> | string,
    query?: BetweenFilter<unknown>,
  ): Query<T> {
    if (this._orderBy) {
      throw new WormError(
        'Cannot order by field when using an index: order it manually or don\'t use an index',
      )
    }

    this._index = index
    if (query)
      this._indexQuery = query
    return this
  }

  public resetIndex(): Query<T> {
    this._index = undefined
    this._indexQuery = undefined
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (!value(instance[key as keyof T]))
          return false
        continue
      }
      else if (value instanceof BetweenFilter) {
        // If the value is a BetweenFilter, we check if the instance's value is between the filter's values
        if (!value.fits(instance[key as keyof T]))
          return false
      }
      else {
        // If the value is not a function, we compare it with the instance's value
        if (instance[key as keyof T] !== (value as T[keyof T]))
          return false
      }
    }
    return true
  }

  /**
   * Get the appropriate key range for the given simple filter.
   * If the filter is a BetweenFilter, it will return the key range of the filter.
   * Otherwise, it will return a key range with just the value.
   * @param value - The value of the simple filter
   * @returns - The key range for the simple filter
   */
  private _getKeyRange(value: unknown): IDBKeyRange {
    if (value instanceof BetweenFilter)
      return value.keyRange()

    return IDBKeyRange.only(value)
  }

  /**
   * Utility function to get the cursor of the query.
   * If the query has an order, it will use the index of the order.
   * Otherwise, if the query has a simple filter, it will use the index of the filter + add a query.
   * @returns
   */
  private _getCursor(
    txOrMode: TransactionOrMode = 'readonly',
  ): IDBRequest<IDBCursorWithValue | null> {
    const store = _objectStore(this.TargetModel.name, txOrMode)

    if (this._index) {
      const index = store.index(this._index)

      return index.openCursor(
        this._indexQuery?.keyRange(),
        this._reverse ? 'prev' : 'next',
      )
    }

    if (this._orderBy) {
      const index = store.index(this._orderBy)

      return index.openCursor(undefined, this._reverse ? 'prev' : 'next')
    }

    const simpleFilter = this._findSimpleFilter()

    if (simpleFilter) {
      const index = store.index(simpleFilter.key)

      return index.openCursor(
        this._getKeyRange(simpleFilter.value),
        this._reverse ? 'prev' : 'next',
      )
    }

    return store.openCursor(undefined, this._reverse ? 'prev' : 'next')
  }

  /**
   * Look for a simple filter in the query's filters.
   * @returns - The first simple filter found, or null if none was found
   */
  private _findSimpleFilter(): SimpleFilter<T> | null {
    const indexableFields = _getIndexableFields(this.TargetModel.name)
    for (const [key, value] of Object.entries(this.filters)) {
      if (typeof value !== 'function' && indexableFields.includes(key)) {
        return {
          key: key as ModelFieldKey<T>,
          value: value as ModelFields<T>[ModelFieldKey<T>],
        }
      }
    }
    return null
  }

  /**
   * Utility function to handle a cursor's cycle.
   * This implement the limit, offset and filter.
   * @param valueCallback - The callback to call for each value
   * @param txOrMode - The transaction or mode to use
   * @returns - A promise that resolves when the cursor is done
   */
  private _cursorLogic(
    valueCallback: CursorCallback,
    txOrMode?: TransactionOrMode,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = this._getCursor(txOrMode)
      let matches = 0
      let skipped = 0

      request.onsuccess = async () => {
        if (!request.transaction) {
          reject(new WormError('No transaction found'))
          return
        }
        // Done iterating
        if (!request.result) {
          resolve()
          return
        }
        // If we have a limit, we check if we have reached it
        if (matches - skipped === this._limit) {
          resolve()
          return
        }
        // Apply the filters
        if (this._fitsFilters(request.result.value as T)) {
          // If we have an offset, we wait until we have reached it
          if (!this._skip || matches >= this._skip) {
            if (await valueCallback(request.result, request.transaction)) {
              resolve()
              return
            }
          }
          else {
            skipped += 1
          }

          matches += 1
        }

        request.result.continue()
      }
      request.onerror = (event) => {
        reject(event)
      }
    })
  }

  /**
   * Executes the query and returns the first result.
   * @returns - The first result of the query, or null if no result was found
   *
   * @example
   * ```ts
   * // Get the first user with the name "John"
   * const query = User.filter({ name: 'John' }).first()
   */
  async first(tx?: IDBTransaction): Promise<T | null> {
    let result: T | null = null

    await this._cursorLogic((cursor) => {
      const instance = new this.TargetModel()
      Object.assign(instance, cursor.value)
      result = instance
      return Promise.resolve(true)
    }, tx)

    return result
  }

  /**
   * Executes the query and returns all the results.
   * @returns - All the results of the query
   *
   * @example
   * ```ts
   * // Get all users with the name "John"
   * const users = await User.filter({ name: 'John' }).all()
   * ```
   */
  async all(tx?: IDBTransaction): Promise<T[]> {
    const result: T[] = []

    await this._cursorLogic((cursor) => {
      const instance = new this.TargetModel()
      Object.assign(instance, cursor.value)
      result.push(instance)
      return Promise.resolve(false)
    }, tx)

    return result
  }

  /**
   * Executes the query and returns the number of results.
   * @returns - The amount of results of the query
   *
   * @example
   * ```ts
   * // Get the amount of users with the name "John"
   * const amount = await User.filter({ name: 'John' }).count()
   * ```
   */
  async count(tx?: IDBTransaction): Promise<number> {
    let count = 0

    await this._cursorLogic(() => {
      count += 1
      return Promise.resolve(false)
    }, tx)

    return count
  }

  /**
   * Executes the query and deletes all the results.
   * @returns - The amount of results deleted
   *
   * @example
   * ```ts
   * // Delete all users with the name "John"
   * const amount = await User.filter({ name: 'John' }).delete()
   * ```
   */
  async delete(tx?: IDBTransaction): Promise<number> {
    let amount = 0

    await this._cursorLogic((cursor) => {
      cursor.delete()
      amount += 1
      return Promise.resolve(false)
    }, tx || 'readwrite')

    return amount
  }

  /**
   * Executes the query and updates all the results.
   * @param updates - The updates to apply to the results
   * @returns - The amount of results updated
   *
   * @example
   * ```ts
   * // Update all users with the name "John" to have the name "Jane"
   * const amount = await User.filter({ name: 'John' }).update({ name: 'Jane' })
   * ```
   */
  async update(updates: Partial<T>, tx?: IDBTransaction): Promise<number> {
    let amount = 0

    await this._cursorLogic((cursor) => {
      Object.assign(cursor.value, updates)
      cursor.update(cursor.value)
      amount += 1
      return Promise.resolve(false)
    }, tx || 'readwrite')

    return amount
  }

  /**
   * Loops over the results of the query.
   * This is useful if you want to do something with each result, but don't want to wait for all the results to be fetched.
   * This is also useful if you want to modify the database while iterating over the results.
   * Any operation should use the same transaction as the one passed to the callback.
   *
   * If the callback returns true, the loop will stop.
   *
   * @see {Transaction}: For some limitations of this system
   *
   * @param callback - The callback to call for each result
   * @param txOrMode - The transaction or mode to use, make sure to use 'readwrite' if you want to modify the database
   *
   * @example
   * ```ts
   * // Log all users with the name "John"
   * await User.filter({ name: 'John' }).forEach((user) => {
   *   console.log(user)
   * })
   * // Log all users with the name "John" and delete them
   * await User.filter({ name: 'John' }).forEach(async (user, tx) => {
   *   console.log(user)
   *  await user.delete(tx)
   * })
   * ```
   */
  async forEach(
    callback: ForEachCallback<T>,
    txOrMode: TransactionOrMode = 'readonly',
  ): Promise<void> {
    await this._cursorLogic(async (cursor, tx) => {
      const instance = new this.TargetModel()
      Object.assign(instance, cursor.value)
      return callback(instance, tx)
    }, txOrMode)
  }

  /**
   * Creates a copy of the current query.
   * This allows a query to branch off into multiple queries.
   * @returns - The cloned query
   *
   * @example
   * ```ts
   * // Regular pagination
   * const userPage = User.orderBy('id').offset(10).limit(10)
   *
   * // Filtered pagination
   * const johnPage = userPage.clone().filter({ name: 'John' })
   * const janePage = userPage.clone().filter({ name: 'Jane' })
   * ```
   */
  clone(): Query<T> {
    const newQuery = new Query(this.TargetModel)
    newQuery.filters = Object.create(this.filters) as Filter<T>

    return newQuery
  }
}
