import { addFieldToMetadata } from './metadata'

export interface FieldOptions<T> {
  primaryKey: boolean
  unique: boolean
  default?: T | (() => T)
  type: () => T
}

export function Field<T>(options: Partial<FieldOptions<T>> = {}): PropertyDecorator {
  return function (object, propertyName) {
    if (typeof propertyName !== 'string')
      throw new Error('Field decorator can only be used on fields')

    const type = Reflect.getMetadata('design:type', object, propertyName) as () => T

    const newOptions: FieldOptions<T> = {
      primaryKey: false,
      unique: false,
      type,
      ...options,
    }

    addFieldToMetadata<T>(object.constructor.name, propertyName, newOptions)
  }
}
