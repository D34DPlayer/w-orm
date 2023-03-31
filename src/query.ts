import type { Model, ModelWithoutPrototype } from './models'
import { objectStore } from './connection'

export type Filter<T extends Model> = Record<keyof ModelWithoutPrototype<T>, any>
export type OrderBy<T extends Model> = (string & keyof ModelWithoutPrototype<T>) |
                                      `-${string & keyof ModelWithoutPrototype<T>}`

type X<T extends Model> = {
  [K in keyof T as `-${string & K}`]: T[K];
}

export class Query<T extends Model> {
  private filters = {} as Filter<T>
  private _orderBy?: string & keyof ModelWithoutPrototype<T>
  private reverse = false

  constructor(private TargetModel: { new(): T }) {}

  filter(filters: Filter<T>): Query<T> {
    Object.assign(this.filters, filters)
    return this
  }

  orderBy(field: OrderBy<T>): Query<T> {
    if (field.startsWith('-'))
      this.reverse = true

    this._orderBy = field.slice(1) as string & keyof ModelWithoutPrototype<T>
    return this
  }

  _getCursor() {
    const store = objectStore(this.TargetModel.name)
    if (this._orderBy) {
      const index = store.index(this._orderBy)

      return index.openCursor(undefined, this.reverse ? 'prev' : 'next')
    }
    else {
      return store.openCursor()
    }
  }

  async first(): Promise<T | null> {
    const cursor = this._getCursor()
    return new Promise<T | null>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve(null)
        }
        else {
          const instance = new this.TargetModel()
          Object.assign(instance, cursor.result.value)
          resolve(instance)
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }

  async all(): Promise<T[]> {
    const cursor = this._getCursor()
    const result: T[] = []
    return new Promise<T[]>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve(result)
        }
        else {
          const instance = new this.TargetModel()
          Object.assign(instance, cursor.result.value)
          result.push(instance)
          cursor.result.continue()
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }

  async count(): Promise<number> {
    const cursor = this._getCursor()
    let count = 0
    return new Promise<number>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve(count)
        }
        else {
          count++
          cursor.result.continue()
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }

  async delete(): Promise<void> {
    const cursor = this._getCursor()
    return new Promise<void>((resolve, reject) => {
      cursor.onsuccess = () => {
        if (!cursor.result) {
          resolve()
        }
        else {
          cursor.result.delete()
          cursor.result.continue()
        }
      }
      cursor.onerror = (event) => {
        reject(event)
      }
    })
  }
}
