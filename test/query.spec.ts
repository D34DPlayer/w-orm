import { assert } from 'chai'

import { init } from '../src/connection'
import { Model } from '../src/models'
import { Field } from '../src/fields'
import { BetweenFilter, Query } from '../src/query'

describe('Query builder', () => {
  it('should return all when no filters are applied', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, name: 'test1' })
    const test2 = await Test.create({ id: 2, name: 'test2' })
    const test3 = await Test.create({ id: 3, name: 'test3' })

    const obtainedTests = await (new Query(Test)).all()
    assert.sameDeepMembers(obtainedTests, [test1, test2, test3])
  })
  it('should count all when no filters are applied', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1' })
    await Test.create({ id: 2, name: 'test2' })
    await Test.create({ id: 3, name: 'test3' })

    const count = await (new Query(Test)).count()
    assert.equal(count, 3)
  })
  it('should be able to filter by a single field', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, name: 'test1' })
    const test2 = await Test.create({ id: 2, name: 'test1' })
    await Test.create({ id: 3, name: 'test3' })
    await Test.create({ id: 4, name: 'test3' })

    const obtainedTests = await Test.filter({ name: 'test1' }).all()
    assert.sameDeepMembers(obtainedTests, [test1, test2])
  })
  it('should be able to filter by multiple fields', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, name: 'test1', age: 10 })
    const test2 = await Test.create({ id: 2, name: 'test1', age: 10 })
    await Test.create({ id: 3, name: 'test3', age: 10 })
    await Test.create({ id: 4, name: 'test3', age: 10 })

    const obtainedTests = await Test.filter({ name: 'test1', age: 10 }).all()
    assert.sameDeepMembers(obtainedTests, [test1, test2])
  })
  it('should be able to count with a filter', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 10 })
    await Test.create({ id: 3, name: 'test3', age: 10 })
    await Test.create({ id: 4, name: 'test3', age: 10 })

    const count = await Test.filter({ name: 'test1', age: 10 }).count()
    assert.equal(count, 2)
  })
  it('should be able to filter by a single field with a custom operator', async () => {
    enum TestEnum {
      test1,
      test2,
      test3,
    }

    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      enum!: TestEnum
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, enum: TestEnum.test1 })
    const test2 = await Test.create({ id: 2, enum: TestEnum.test1 })
    await Test.create({ id: 3, enum: TestEnum.test2 })
    await Test.create({ id: 4, enum: TestEnum.test3 })

    const obtainedTests = await Test.filter({ enum: t => t === TestEnum.test1 }).all()

    assert.sameDeepMembers(obtainedTests, [test1, test2])
  })
  it('should order by a single field', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      balance!: number
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, balance: 100 })
    const test2 = await Test.create({ id: 2, balance: 50 })
    const test3 = await Test.create({ id: 3, balance: 300 })

    const obtainedTests = await Test.orderBy('balance').all()

    assert.deepEqual(obtainedTests, [test2, test1, test3])
  })
  it('should support reverse ordering', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      balance!: number
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, balance: 100 })
    const test2 = await Test.create({ id: 2, balance: 50 })
    const test3 = await Test.create({ id: 3, balance: 300 })

    const obtainedTests = await Test.orderBy('-balance').all()

    assert.deepEqual(obtainedTests, [test3, test1, test2])
  })
  it('should support reverse ordering via the reverse method', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      balance!: number
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, balance: 100 })
    const test2 = await Test.create({ id: 2, balance: 50 })
    const test3 = await Test.create({ id: 3, balance: 300 })

    const obtainedTests = await Test.orderBy('balance').reverse().all()

    assert.deepEqual(obtainedTests, [test3, test1, test2])
  })
  it('should allow resetting filters', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, name: 'test1', age: 10 })
    const test2 = await Test.create({ id: 2, name: 'test1', age: 10 })
    const test3 = await Test.create({ id: 3, name: 'test3', age: 10 })
    const test4 = await Test.create({ id: 4, name: 'test3', age: 10 })

    const obtainedTests = await Test.filter({ name: 'test1', age: 10 }).resetFilters().all()
    assert.sameDeepMembers(obtainedTests, [test1, test2, test3, test4])
  })
  it('should return the first result', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    const test2 = await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test3', age: 30 })

    const obtainedTest = await Test.filter({ name: 'test1' }).orderBy('-age').first()
    assert.deepEqual(obtainedTest, test2)
  })
  it('should return null if no results are found', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test3', age: 30 })

    const obtainedTest = await Test.filter({ name: 'test4' }).first()
    assert.isNull(obtainedTest)
  })
  it('should allow deleting all results', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    const test3 = await Test.create({ id: 3, name: 'test3', age: 30 })
    await Test.create({ id: 4, name: 'test4', age: 10 })

    await Test.filter({ age: t => t < 25 }).delete()

    const obtainedTests = await Test.all()
    assert.sameDeepMembers(obtainedTests, [test3])
  })
  it('should allow filtering with a limit', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, name: 'test1', age: 10 })
    const test2 = await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test3', age: 30 })
    await Test.create({ id: 4, name: 'test4', age: 10 })

    const obtainedTests = await Test.filter({ age: t => t < 25 }).orderBy('id').limit(2).all()
    assert.sameDeepMembers(obtainedTests, [test1, test2])
  })
  it('should allow filtering with an offset', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    const test2 = await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test3', age: 30 })
    const test4 = await Test.create({ id: 4, name: 'test4', age: 10 })

    const obtainedTests = await Test.filter({ age: t => t < 25 }).orderBy('id').offset(1).all()
    assert.sameDeepMembers(obtainedTests, [test2, test4])
  })
  it('should allow setting a limit and an offset', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test3', age: 30 })
    const test4 = await Test.create({ id: 4, name: 'test4', age: 10 })
    await Test.create({ id: 5, name: 'test4', age: 10 })

    const obtainedTests = await Test.orderBy('id').offset(3).limit(1).all()
    assert.sameDeepMembers(obtainedTests, [test4])
  })
  it('should allow updating all results', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test1', age: 30 })

    await Test.filter({ age: t => t < 25 }).update({ name: 'test2' })

    await Test.filter({ name: 'test1' }).delete()

    const obtainedTests = await Test.all()
    assert.lengthOf(obtainedTests, 2)
  })
  it('should allow looping over all results', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test1', age: 30 })

    const results = [] as number[]
    await Test.filter({ age: t => t < 25 }).orderBy('-age').forEach(async (instance) => {
      results.push(instance.age)
    })

    assert.sameDeepMembers(results, [20, 10])
  })
  it('should allow looping with complex usage', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test1', age: 30 })

    await Test.filter({ age: t => t < 25 }).orderBy('-age').forEach(async (t, tx) => {
      t.update({ name: 'test2' })
      await t.save(tx)
    }, 'readwrite')

    const amount = await Test.filter({ name: 'test2' }).count()
    assert.equal(amount, 2)
  })
  it('should allow ending a loop early', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test1', age: 30 })
    await Test.create({ id: 4, name: 'test1', age: 40 })

    let count = 0
    await Test.forEach(async () => {
      return count++ === 1
    })

    assert(count === 2)
  })
  it('should allow cloning a query', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string

      @Field()
      age!: number
    }

    await init('test', 1)

    await Test.create({ id: 1, name: 'test1', age: 10 })
    await Test.create({ id: 2, name: 'test1', age: 20 })
    await Test.create({ id: 3, name: 'test2', age: 30 })

    // Regular pagination
    const userPage = Test.orderBy('id').offset(10).limit(10)

    // Filtered pagination
    const page1Query = userPage.clone().filter({ name: 'test1' })
    const page2Query = userPage.clone().filter({ name: 'test2' })

    const [page2, page1] = await Promise.all([page2Query.all(), page1Query.all()])

    assert.lengthOf(page1, 2)
    assert.lengthOf(page2, 1)
  })
  it('should allow range filters', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, name: 'test1' })
    const test2 = await Test.create({ id: 2, name: 'test2' })
    const test3 = await Test.create({ id: 3, name: 'test3' })
    const test4 = await Test.create({ id: 4, name: 'test4' })

    let obtainedTests = await Test.filter({ id: new BetweenFilter(1, 2) }).all()
    assert.sameDeepMembers(obtainedTests, [test1, test2])

    obtainedTests = await Test.filter({ id: new BetweenFilter(2, 3, true, false) }).all()
    assert.sameDeepMembers(obtainedTests, [test3])

    obtainedTests = await Test.filter({ id: new BetweenFilter(3, 4, true, true) }).all()
    assert.lengthOf(obtainedTests, 0)

    obtainedTests = await Test.filter({ id: new BetweenFilter(1, null, true, false) }).all()
    assert.sameDeepMembers(obtainedTests, [test2, test3, test4])

    obtainedTests = await Test.filter({ id: new BetweenFilter(null, 3, false, true) }).all()
    assert.sameDeepMembers(obtainedTests, [test1, test2])
  })
  it('should allow range filters without indexing', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      @Field()
      name!: string
    }

    await init('test', 1)

    const test1 = await Test.create({ id: 1, name: 'test1' })
    const test2 = await Test.create({ id: 2, name: 'test2' })
    const test3 = await Test.create({ id: 3, name: 'test3' })
    const test4 = await Test.create({ id: 4, name: 'test4' })

    let obtainedTests = await Test.filter({ id: new BetweenFilter(1, 2) }).orderBy('name').all()
    assert.sameDeepMembers(obtainedTests, [test1, test2])

    obtainedTests = await Test.filter({ id: new BetweenFilter(2, 3, true, false) }).orderBy('name').all()
    assert.sameDeepMembers(obtainedTests, [test3])

    obtainedTests = await Test.filter({ id: new BetweenFilter(3, 4, true, true) }).orderBy('name').all()
    assert.lengthOf(obtainedTests, 0)

    obtainedTests = await Test.filter({ id: new BetweenFilter(1, null, true, false) }).orderBy('name').all()
    assert.sameDeepMembers(obtainedTests, [test2, test3, test4])

    obtainedTests = await Test.filter({ id: new BetweenFilter(null, 3, false, true) }).orderBy('name').all()
    assert.sameDeepMembers(obtainedTests, [test1, test2])
  })
})
