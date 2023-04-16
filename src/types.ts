/**
 * @module Types
 */
import type { Model } from './models'
import type { MigrationContext } from './migration'

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
  abstract: boolean
}

/** {@inheritDoc W-ORM.TablesMetadata } */
export interface TableFieldsMetadata {
  [fieldName: string]: FieldOptions<unknown>
}

/** The user defined fields and their types */
export type ModelFields<T extends Model> = Omit<T, keyof Model>

/** The user defined fields as a string list */
export type ModelFieldKey<T extends Model> = string & keyof ModelFields<T>

export type Filter<T extends Model> = {
  [P in keyof ModelFields<T>]?:
  ModelFields<T>[P] |
  ((instance: ModelFields<T>[P]) => boolean) |
  undefined
}

export type OrderBy<T extends Model> = (ModelFieldKey<T>) | `-${ModelFieldKey<T>}`

export type TransactionCallback = (tx: IDBTransaction) => Promise<void>

export type TransactionOrMode = IDBTransaction | IDBTransactionMode

export type CursorCallback = (value: IDBCursorWithValue, tx: IDBTransaction) => Promise<boolean | void>

export type ForEachCallback<T> = (instance: T, tx: IDBTransaction) => boolean | void | Promise<boolean | void>

export type TableDefinition = Record<string, Partial<FieldOptions<unknown>>>

export type Constructor<T> = Function & { prototype: T }

export type Migration = (migration: MigrationContext) => Promise<void>

export type MigrationList = Record<number, Migration>
