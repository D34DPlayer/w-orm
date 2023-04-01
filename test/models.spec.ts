import { assert } from 'chai'

import { Model } from '../src/models'
import { _objectStore, init } from '../src/connection'
import { Field } from '../src/fields'

describe('Models', () => {
  describe('create', () => {
    it('should create a new instance of a model', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      await Test.create({ id: 1 })

      await new Promise((resolve, reject) => {
        const store = _objectStore('Test')
        const itemsReq = store.getAll()
        itemsReq.onsuccess = () => {
          assert.deepEqual(itemsReq.result, [{ id: 1 }])
          resolve(itemsReq.result)
        }
        itemsReq.onerror = () => {
          reject(itemsReq.error)
        }
        itemsReq.transaction?.commit()
      })
    })
    it('should respect a nullable field', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ nullable: true })
        nullable?: string
      }

      await init('test', 1)

      const test = await Test.create({ id: 1 })
      assert.isUndefined(test.nullable)
    })
    it('should respect a non-nullable field', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ nullable: false })
        nonNullable!: string
      }

      await init('test', 1)

      await Test.create({ id: 1 }).then(() => {
        assert.fail('Should not be able to create a non-nullable field without a value')
      }).catch((err: Error) => {
        assert.match(err.message, /not nullable/)
      })
    })
    it('should use default values', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ default: 'test' })
        test!: string
      }

      await init('test', 1)

      await Test.create({ id: 1 })

      await new Promise((resolve, reject) => {
        const store = _objectStore('Test')
        const itemsReq = store.getAll()
        itemsReq.onsuccess = () => {
          assert.deepEqual(itemsReq.result, [{ id: 1, test: 'test' }])
          resolve(itemsReq.result)
        }
        itemsReq.onerror = () => {
          reject(itemsReq.error)
        }
        itemsReq.transaction?.commit()
      })
    })
    it('should use default generators', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ default: () => 'test' })
        test!: string
      }

      await init('test', 1)

      await Test.create({ id: 1 })

      await new Promise((resolve, reject) => {
        const store = _objectStore('Test')
        const itemsReq = store.getAll()
        itemsReq.onsuccess = () => {
          assert.deepEqual(itemsReq.result, [{ id: 1, test: 'test' }])
          resolve(itemsReq.result)
        }
        itemsReq.onerror = () => {
          reject(itemsReq.error)
        }
        itemsReq.transaction?.commit()
      })
    })
  })
})
