/**
 * @module Types
 */
import type { Model } from './models'

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
}

/** {@inheritDoc W-ORM.TablesMetadata } */
export interface TableMetadata {
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
