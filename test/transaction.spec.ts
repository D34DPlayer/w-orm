import { assert } from 'chai'

import { init } from '../src/connection'
import { Transaction } from '../src/transaction'
import { Field } from '../src/fields'
import { Model } from '../src/models'

describe('Transactions', () => {
  it('should be able to create a transaction', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      balance!: number
    }

    await init('test', 1)

    await Transaction('readwrite', async (tx) => {
      const test1 = await Test.create({ id: 1, balance: 100 }, tx)
      const test2 = await Test.create({ id: 2, balance: 50 }, tx)
      const test3 = await Test.create({ id: 3, balance: 300 }, tx)

      const obtainedTests = await Test.all(tx)
      assert.sameDeepMembers(obtainedTests, [test2, test1, test3])
    })
  })
  it('should commit by default', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      balance!: number
    }

    await init('test', 1)

    await Transaction('readwrite', async (tx) => {
      const test1 = await Test.create({ id: 1, balance: 100 }, tx)
    })

    const obtainedTests = await Test.all()
    assert.lengthOf(obtainedTests, 1)
  })
  it('should be able to rollback', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      balance!: number
    }

    await init('test', 1)

    await Transaction('readwrite', async (tx) => {
      await Test.create({ id: 1, balance: 100 }, tx)
      const obtainedTests = await Test.all(tx)
      assert.lengthOf(obtainedTests, 1)

      throw new Error('rollback')
    }).then(() => assert.fail('Should have thrown an error'))
      .catch((err: Error) => assert.match(err.message, /rollback/))

    const obtainedTests = await Test.all()
    assert.lengthOf(obtainedTests, 0)
  })
})
