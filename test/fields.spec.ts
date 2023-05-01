import { assert } from 'chai'

import { db, init } from '../src/connection'
import { Model } from '../src/models'
import { Field, Table, defineModel } from '../src/fields'
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
    it('should allow not creating an index', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ index: false })
        test!: string
      }

      await init('test', 1)

      const store = _objectStore('Test')

      assert(store.indexNames.contains('id'))
      assert(!store.indexNames.contains('test'))
    })
    it('should be able to infer the default value', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field()
        test: string = 'test'
      }

      await init('test', 1)

      const test = await Test.create({ id: 1 })

      assert.equal(test.test, 'test')
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
    it('should allow not creating an index', async () => {
      class Test extends Model {
        id!: number
        test!: string
      }
      defineModel(Test, {
        id: { primaryKey: true },
        test: { index: false },
      })

      await init('test', 1)

      const store = _objectStore('Test')

      assert(store.indexNames.contains('id'))
      assert(!store.indexNames.contains('test'))
    })
  })
  describe('Table decorator', () => {
    it('allows overriding the table name', async () => {
      @Table({ name: 'tableName' })
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const store = _objectStore('tableName')
      assert.equal(store.name, 'tableName')
    })
    it('allows defining abstract models', async () => {
      // This one would be abstract by default
      @Table({ abstract: false })
      class BaseModel extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      @Table({ abstract: true })
      class Test extends BaseModel {
        @Field()
        test!: string
      }

      await init('test', 1)

      const store = _objectStore('BaseModel')
      assert.equal(store.name, 'BaseModel')

      assert.throws(() => _objectStore('Test'), /No objectStore named Test/)
    })
    it('allows defining a compound index', async () => {
      @Table({
        indexes: {
          test: 'id+name',
        },
      })
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field()
        name!: string
      }

      await init('test', 1)

      const store = _objectStore('Test')
      const index = store.index('test')
      assert.sameOrderedMembers(Array.from(index.keyPath), ['id', 'name'])
    })
    it('allows defining a multiEntry index', async () => {
      @Table({
        indexes: {
          test: '*tags',
        },
      })
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ index: false })
        tags!: string
      }

      await init('test', 1)

      const store = _objectStore('Test')
      const index = store.index('test')
      assert.isTrue(index.multiEntry)
      assert.equal(index.keyPath, 'tags')
    })
    it('allows defining a unique compound index', async () => {
      @Table({
        indexes: {
          test: '&id+name',
        },
      })
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field()
        name!: string
      }

      await init('test', 1)

      const store = _objectStore('Test')
      const index = store.index('test')
      assert.isTrue(index.unique)
      assert.sameOrderedMembers(Array.from(index.keyPath), ['id', 'name'])
    })
  })
})
