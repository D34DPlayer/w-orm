/**
 * @module Types
 */
import type { Model } from './models'
import type { MigrationContext } from './migration'
import type { BetweenFilter } from './query'

export interface DisconnectedDB {
  connected: false
}

export interface ConnectedDB {
  connected: true
  session: IDBDatabase
  name: string
  version: number
}

/** { @inheritDoc W-ORM.db } */
export type DB = DisconnectedDB | ConnectedDB

export interface InitResponse {
  session: IDBDatabase
  upgraded: boolean
}

/** {@inheritDoc W-ORM.Field } */
export interface FieldOptions<T> {
  primaryKey: boolean
  unique: boolean
  nullable: boolean
  default?: T | (() => T)
  type: () => T
  index: boolean
}

/** {@inheritDoc W-ORM.TablesMetadata } */
export interface TableMetadata {
  extends?: string
  fields: TableFieldsMetadata
  abstract?: boolean
  hasChild: boolean
  tableName: string
  indexes: ParsedIndexes
}

/** {@inheritDoc W-ORM.TablesMetadata } */
export interface TableFieldsMetadata {
  [fieldName: string]: FieldOptions<unknown>
}

/** The user defined fields as a string list */
export type ModelFields<T extends Model> = Omit<T, keyof Model>
export type ModelFieldKey<T extends Model> = string & keyof ModelFields<T>

export type Filter<T extends Model> = {
  [P in keyof T]?:
  T[P] |
  BetweenFilter<T[P]> |
  ((instance: T[P]) => boolean) |
  undefined
}

export interface SimpleFilter<T extends Model> {
  key: ModelFieldKey<T>
  value: unknown
}

export type OrderBy<T extends Model> = (ModelFieldKey<T>) | `-${ModelFieldKey<T>}`

export type TransactionCallback<T> = (tx: IDBTransaction) => Promise<T>

export type TransactionOrMode = IDBTransaction | IDBTransactionMode

export type CursorCallback = (value: IDBCursorWithValue, tx: IDBTransaction) => Promise<boolean | void>

export type ForEachCallback<T> = (instance: T, tx: IDBTransaction) => boolean | void | Promise<boolean | void>

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

export interface Index {
  unique: boolean
  multiEntry: boolean
  fields: string[]
}

export interface Indexes {
  [indexName: string]: Index | string
}

export interface ParsedIndexes {
  [indexName: string]: Index
}

export interface TableOptions {
  name?: string
  abstract?: boolean
  indexes?: Indexes
}
