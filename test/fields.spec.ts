import { assert } from 'chai'

import { db, init } from '../src/connection'
import { Model } from '../src/models'
import { Field, defineModel } from '../src/fields'
import { _objectStore } from '../src/transaction'

describe('Fields', () => {
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
    it('should support inheritance', async () => {
      abstract class BaseModel extends Model {
        @Field({ primaryKey: true, default: () => Date.now() })
        id!: number

        @Field({ default: 1 })
        version!: number
      }

      class Test extends BaseModel {
        @Field({ primaryKey: true })
        test!: string
      }

      await init('test', 1)

      const store = _objectStore('Test')
      assert.sameMembers((store.keyPath as string[]), ['id', 'test'])
    })
  })
  describe('Define table helper', () => {
    it('should be able to set a field as primary key', async () => {
      class Test extends Model {
        id!: number
      }
      defineModel(Test, {
        id: { primaryKey: true },
      })

      await init('test', 1)
      assert(db.connected)

      const store = _objectStore('Test')
      assert.isArray(store.keyPath)
      assert.equal(store.keyPath[0], 'id')
      assert.lengthOf(store.keyPath, 1)
    })
    it('should support multiple primary keys', async () => {
      class Test extends Model {
        id!: number
        id2!: number
      }
      defineModel(Test, {
        id: { primaryKey: true },
        id2: { primaryKey: true },
      })

      await init('test', 1)
      assert(db.connected)

      const store = _objectStore('Test')
      assert.isArray(store.keyPath)
      assert.sameMembers((store.keyPath as string[]), ['id', 'id2'])
    })
    it('should set a unique field constraint', async () => {
      class Test extends Model {
        id!: number
        unique!: string
      }
      defineModel(Test, {
        id: { primaryKey: true },
        unique: { unique: true },
      })

      await init('test', 1)
      assert(db.connected)

      const store = _objectStore('Test')
      const index = store.index('unique')
      assert.isTrue(index.unique)
    })
    it('should\'t allow a primary key field to be nullable', () => {
      assert.throws(() => {
        class Test extends Model {
          id!: number
          unique!: string
        }
        defineModel(Test, {
          id: { primaryKey: true },
          unique: { primaryKey: true, nullable: true },
        })

        return Test
      }, /cannot be nullable/)
    })
    it('should support inheritance', async () => {
      abstract class BaseModel extends Model {
        id!: number
        version!: number
      }
      defineModel(BaseModel, {
        id: { primaryKey: true, default: () => Date.now() },
        version: { default: 1 },
      })

      class Test extends BaseModel {
        test!: string
      }
      defineModel(Test, {
        test: { primaryKey: true },
      })

      await init('test', 1)

      const store = _objectStore('Test')
      assert.sameMembers((store.keyPath as string[]), ['id', 'test'])
    })
  })
})
