import type { Constructor, FieldOptions, TableDefinition } from './types'
import { _addFieldToMetadata, _handleTableData } from './metadata'
import { ModelError, WormError } from './errors'
import type { Model } from './models'

/**
 * Describes a field on a model.
 *
 * Multiple options can be passed to the decorator:
 *  - `primaryKey`: Whether the field is the primary key of the model,
 *                  if multiple fields are marked as primary key, their combination will be the key.
 *  - `unique`: Whether the field has an unique constraint. This will be enforced by the database.
 *  - `nullable`: Whether the field can be null, primary keys cannot be nullable.
 *  - `default`: The default value of the field, it can be a value or a function that returns the value.
 *  - `type`: The type of the field, it is automatically inferred with typescript.
 *
 * @default
 * ```js
 * {
 *   primaryKey: false,
 *   unique: false,
 *   nullable: !primaryKey,
 * }
 * ```
 *
 * @example
 * ```ts
 * class User extends Model {
 *   @Field({ primaryKey: true })
 *   id: number
 *   @Field({ unique: true })
 *   username: string
 *   @Field({ default: 0 })
 *   balance: number
 *   @Field({ default: () => new Date() })
 *   createdAt: Date
 * }
 * ```
 * @param options
 */
export function Field<T>(options: Partial<FieldOptions<T>> = {}): PropertyDecorator {
  return function (object, propertyName) {
    if (typeof propertyName === 'symbol')
      throw new WormError('Field decorator doesn\'t support symbols')

    // Use "emitDecoratorMetadata" to get the type of the field
    let t: () => T
    try {
      t = (Reflect.getMetadata('design:type', object, propertyName) || Object) as () => T
    }
    catch {
      t = Object
    }

    if (options.primaryKey && options.nullable)
      throw new ModelError('Primary key cannot be nullable')

    // Merge options with default values
    const newOptions: FieldOptions<T> = {
      primaryKey: false,
      unique: false,
      nullable: !options.primaryKey,
      type: t,
      ...options,
    }

    _handleTableData(object)
    _addFieldToMetadata(object.constructor.name, propertyName, newOptions)
  }
}

/**
 * Create a new model from a definition.
 * @param name - The name of the model
 * @param definition - The definition of the model
 * @returns - The new model
 */
export function defineModel<T extends Model>(modelClass: Constructor<T>, definition: TableDefinition) {
  for (const field in definition) {
    const fieldOpts = definition[field]
    Field(fieldOpts)(modelClass.prototype as T, field)
  }
}
