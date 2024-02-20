/**
 * @module Types
 */
import type { Model } from './models'
import type { MigrationContext } from './migration'
import type { BetweenFilter } from './query'

export type DisconnectedDB = {
  connected: false
}

export type ConnectedDB = {
  connected: true
  session: IDBDatabase
  name: string
  version: number
}

/** { @inheritDoc W-ORM.db } */
export type DB = DisconnectedDB | ConnectedDB

export type InitResponse = {
  session: IDBDatabase
  upgraded: boolean
}

/** {@inheritDoc W-ORM.Field } */
export type FieldOptions<T> = {
  primaryKey: boolean
  unique: boolean
  nullable: boolean
  default?: T | (() => T)
  type: () => T
  index: boolean
}

/** {@inheritDoc W-ORM.TablesMetadata } */
export type TableMetadata = {
  extends?: string
  fields: TableFieldsMetadata
  abstract?: boolean
  hasChild: boolean
  tableName: string
  indexes: ParsedIndexes
}

/** {@inheritDoc W-ORM.TablesMetadata } */
export type TableFieldsMetadata = {
  [fieldName: string]: FieldOptions<unknown>
}

/** The user defined fields as a string list */
export type ModelFields<T extends Model> = Omit<T, keyof Model>
export type ModelFieldKey<T extends Model> = string & keyof ModelFields<T>

export type Filter<T extends Model> = {
  [P in keyof T]?:
  | T[P]
  | BetweenFilter<T[P]>
  | ((instance: T[P]) => boolean)
  | undefined;
}

export type SimpleFilter<T extends Model> = {
  key: ModelFieldKey<T>
  value: unknown
}

export type OrderBy<T extends Model> =
  | ModelFieldKey<T>
  | `-${ModelFieldKey<T>}`

export type TransactionCallback<T> = (tx: IDBTransaction) => Promise<T>

export type TransactionOrMode = IDBTransaction | IDBTransactionMode

export type CursorCallback = (
  value: IDBCursorWithValue,
  tx: IDBTransaction,
) => Promise<boolean | void>

export type ForEachCallback<T> = (
  instance: T,
  tx: IDBTransaction,
) => boolean | void | Promise<boolean | void>

export type TableDefinition = Record<string, Partial<FieldOptions<unknown>>>

export type Constructor<T> = Function & { prototype: T }

export type Migration = (migration: MigrationContext) => Promise<void>

/**
 * A list of migrations to be executed.
 * The key is the target version number, and the value is the migration callback.
 * Eg. `{ 2: (migration) => { ... } }` will execute the migration callback when the current database version is smaller than 2.
 *
 * Because of this a key of `1` will only be executed on the first migration, this can be used to populate the database with initial data.
 *
 * A migration callback receives a {@link W-ORM.MigrationContext} object as its only argument.
 * This object contains a transaction to be used for the migration.
 *
 * It is expected for the callback to create Model classes that represent the table's state in between these two versions.
 * The fields aren't actually used by W-ORM in this scenario, and only serve to improve the typing within the migration.
 * The {@link W-ORM.Model} methods can be then used to manipulate the data.
 * It is very important to use the transaction provided by the migration context, otherwise the migration will hang forever.
 *
 * @example
 * ```ts
 * const migrations: MigrationList = {
 *    2: async (migration) => {
 *      class Test extends Model {
 *        id!: number
 *        name!: string
 *      }
 *
 *      await Test.forEach(async (instance, tx) => {
 *        instance.name = `${instance.id} name`
 *        await instance.save(tx)
 *      }, migration.tx)
 *
 *      const test = await Test.get(69, migration.tx)
 *      await test?.delete(migration.tx)
 *    },
 *  }
 * ```
 */
export type MigrationList = Record<number, Migration>

/**
 * Indexes are a feature of IndexedDB that allow for faster queries if used properly.
 *
 * @example
 * ```ts
 * // 1st use case, multi-field ordering:
 * //  An index can be created with multiple fields, when using that index the results will be ordered by the fields in the index.
 *
 * @Table({
 *   indexes: {
 *     nameAge: {
 *       fields: ['name', 'age'],
 *     },
 *   },
 * })
 * class Test extends Model {
 *   id!: number
 *   name!: string
 *   age!: number
 * }
 *
 * // The results will be ordered by name and then by age
 * await Test.withIndex('nameAge').all()
 *
 * // 2nd use case, unique fields:
 * //  An index can be created with the `unique` option, this will enforce that the field, or combination of fields is unique.
 * @Table({
 *   indexes: {
 *     uniqueName: { fields: ['firstName', 'lastName'], unique: true },
 *  }
 * })
 * class Test2 extends Model {
 *   id!: number
 *   firstName!: string
 *   lastName!: string
 * }
 *
 * await Test2.create({ firstName: 'John', lastName: 'Doe', id: 1 })
 * // This will fail
 * await Test2.create({ firstName: 'John', lastName: 'Doe', id: 2 })
 *
 * // 3rd use case, multi-field filtering:
 * //  An index with multiple fields can also be used to speed up filtering.
 * @Table({
 *   indexes: {
 *     nameAge: {
 *       fields: ['name', 'age'],
 *     },
 *   },
 * })
 * class Test3 extends Model {
 *  id!: number
 *  name!: string
 *  age!: number
 * }
 * // Looking for people named John that are 30 years old
 * await Test3.withIndex('nameAge', Between(['John', 30], ['John', 30])).all()
 * // The alternative will only use the name index and check the age for each result
 * await Test3.filter({ name: 'John', age: 30 }).all()
 * // "Between" can also be used for ranges, eg. looking for people named John that are between 30 and 40 years old
 * await Test3.withIndex('nameAge', Between(['John', 30], ['John', 40])).all()
 *
 * // 4th use case, filter + ordering:
 * //  You can combine all this information and use the first field(s) for filtering and leaving the rest for ordering.

 * // Looking for people named John, ordered by age
 * await Test3.withIndex('nameAge', Between(['John', BetweenFilter.minKey], ['John', BetweenFilter.maxKey])).all()
 * ```
 *
 * @see {@link W-ORM.Between} for more information about the `Between` filter
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#using_an_index
 */
export type Index = {
  unique: boolean
  multiEntry: boolean
  fields: string[]
}

export type Indexes = {
  [indexName: string]: Index | string
}

export type ParsedIndexes = {
  [indexName: string]: Index
}

export type TableOptions = {
  name?: string
  abstract?: boolean
  indexes?: Indexes
}
