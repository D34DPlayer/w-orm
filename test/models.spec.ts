import { assert } from 'chai'

import { Model } from '../src/models'
import { init } from '../src/connection'
import { Field } from '../src/fields'
import { _objectStore } from '../src/transaction'

describe('Models', () => {
  describe('create', () => {
    it('should create a new instance of a model', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const test = await Test.create({ id: 1 })

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

      const expectedTest = new Test()
      expectedTest.id = 1
      assert.deepEqual(test, expectedTest)
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
  describe('get', () => {
    it('should get an instance of a model', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const createdTest = await Test.create({ id: 1 })

      const obtainedTest = await Test.get(1)
      assert.instanceOf(obtainedTest, Test)
      assert.deepEqual(createdTest, obtainedTest)
    })
    it('should return null if the model does not exist', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const obtainedTest = await Test.get(1)
      assert.isNull(obtainedTest)
    })
  })
  describe('all', () => {
    it('should get all instances of a model', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const createdTest1 = await Test.create({ id: 1 })
      const createdTest2 = await Test.create({ id: 2 })
      const createdTest3 = await Test.create({ id: 3 })

      const obtainedTests = await Test.all()

      assert.sameDeepMembers(obtainedTests, [createdTest1, createdTest2, createdTest3])
    })
    it('should return an empty array if there are no instances', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const obtainedTests = await Test.all()

      assert.deepEqual(obtainedTests, [])
    })
  })
  describe('count', () => {
    it('should count all instances of a model', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      await Test.create({ id: 1 })
      await Test.create({ id: 2 })
      await Test.create({ id: 3 })

      const count = await Test.count()
      assert.equal(count, 3)
    })
    it('should return 0 if there are no instances', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const count = await Test.count()
      assert.equal(count, 0)
    })
  })
  // filter is tested in the query tests
  // orderBy is tested in the query tests
  describe('keys', () => {
    it('should get the key of an instance', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const createdTest = await Test.create({ id: 1 })

      assert.deepEqual(createdTest.keys, [1])
    })
    it('should get the keys of an instance with a composite key', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ primaryKey: true })
        id2!: number
      }

      await init('test', 1)

      const createdTest = await Test.create({ id: 1, id2: 2 })

      assert.deepEqual(createdTest.keys, [1, 2])
    })
    it('can be used to get an instance', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field({ primaryKey: true })
        id2!: number
      }

      await init('test', 1)

      const createdTest = await Test.create({ id: 1, id2: 2 })

      const obtainedTest = await Test.get(createdTest.keys)
      assert.deepEqual(createdTest, obtainedTest)
    })
  })
  describe('delete', () => {
    it('should delete an instance', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number
      }

      await init('test', 1)

      const createdTest = await Test.create({ id: 1 })

      await createdTest.delete()

      const obtainedTest = await Test.get(1)
      assert.isNull(obtainedTest)
    })
  })
  describe('save', () => {
    it('should save an instance', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field()
        test!: string
      }

      await init('test', 1)

      const createdTest = await Test.create({ id: 1, test: 'test' })
      createdTest.test = 'test2'

      let obtainedTest = await Test.get(1)
      assert.notDeepEqual(obtainedTest, createdTest)

      await createdTest.save()

      obtainedTest = await Test.get(1)
      assert.deepEqual(obtainedTest, createdTest)
    })
  })
  describe('update', () => {
    it('should update an instance', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        @Field()
        test!: string
      }

      await init('test', 1)

      const createdTest = await Test.create({ id: 1, test: 'test' })

      createdTest.update({ test: 'test2' })

      assert.deepEqual(createdTest, { id: 1, test: 'test2' } as Test)
    })
  })
})
