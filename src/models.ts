import { TablesMetadata } from "./metadata"

export class Model {
  static create<T extends Model>(this: {new(): T}, values?: Omit<Partial<T>, keyof Model>): T {
    const instance = Object.create(this.prototype) as T
    Object.assign(instance, values)

    const tableDef = TablesMetadata[this.name]
    if (!tableDef)
      throw new Error(`Table definition for ${this.name} not found`)

    for (const [field, fieldOpts] of Object.entries(tableDef)) {
      // Check if field is defined
      if (instance[(field as keyof T)] === undefined) {
        // Check if field has a default value
        if (fieldOpts.default !== undefined)
          // Check if default value is a generator
          if (fieldOpts.default instanceof Function) {
            instance[(field as keyof T)] = fieldOpts.default()
          } else {
            instance[(field as keyof T)] = fieldOpts.default
          }
        else
          if (!fieldOpts.nullable)
            throw new Error(`Field ${field} is not nullable`)
      }
    }

    return instance
  }
}
