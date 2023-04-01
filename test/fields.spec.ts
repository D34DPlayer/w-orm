import { assert } from 'chai'

import { _objectStore, db, init } from '../src/connection'
import { Model } from '../src/models'
import { Field } from '../src/fields'

describe('Field options', () => {
  it('should be able to set a field as primary key', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number
    }

    await init('test', 1)
    assert(db.connected)

    const store = _objectStore('Test')
    assert.isArray(store.keyPath)
    assert.equal(store.keyPath[0], 'id')
    assert.lengthOf(store.keyPath, 1)
  })
  it('should support multiple primary keys', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field({ primaryKey: true })
      id2!: number
    }

    await init('test', 1)
    assert(db.connected)

    const store = _objectStore('Test')
    assert.isArray(store.keyPath)
    assert.sameMembers((store.keyPath as string[]), ['id', 'id2'])
  })
  it('should set a unique field constraint', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field({ unique: true })
      unique!: string
    }

    await init('test', 1)
    assert(db.connected)

    const store = _objectStore('Test')
    const index = store.index('unique')
    assert.isTrue(index.unique)
  })
  it('should\'t allow a primary key field to be nullable', () => {
    assert.throws(() => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ primaryKey: true, nullable: true })
        unique!: string
      }

      return Test
    }, /cannot be nullable/)
  })
  it('should\'t support Symbols', () => {
    assert.throws(() => {
      const sym = Symbol('test')
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ primaryKey: true })
        [sym]!: symbol
      }

      return Test
    }, /symbols/)
  })
  // Nullable is tested within model creation
  // Default is tested within model creation
})
