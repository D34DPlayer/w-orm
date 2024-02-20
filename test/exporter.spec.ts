import { assert, describe, it } from 'vitest'

import { Model } from '../src/models'
import { init } from '../src/connection'
import { Field } from '../src/fields'
import { Transaction } from '../src/transaction'
import {
  exportDatabase,
  exportDatabaseToBlob,
  exportTable,
  importDatabase,
  importTable,
} from '../src/exporter'
import { ConnectionError } from '../src/errors'

function getNodeVersion(): number {
  // eg. v16.18.1
  return parseInt(process.version.split('.')[0].slice(1))
}

describe('DB Exporter', () => {
  it('fails when no connection has been established', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number
    }

    await exportTable(Test.name)
      .then(() => assert.fail('Should have failed'))
      .catch((e) => {
        assert.isTrue(e instanceof ConnectionError)
      })
    await exportDatabase()
      .then(() => assert.fail('Should have failed'))
      .catch((e) => {
        assert.isTrue(e instanceof ConnectionError)
      })
    await importTable(Test.name, [])
      .then(() => assert.fail('Should have failed'))
      .catch((e) => {
        assert.isTrue(e instanceof ConnectionError)
      })
    await importDatabase({ Test: [] })
      .then(() => assert.fail('Should have failed'))
      .catch((e) => {
        assert.isTrue(e instanceof ConnectionError)
      })
  })
  it('should be able to export a single table', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      tags: string[] = []
    }

    await init('test', 1)

    const test = await Test.create({ id: 1, tags: ['a', 'b'] })
    const test2 = await Test.create({ id: 2, tags: ['c', 'd'] })

    const exported = await exportTable(Test.name)
    assert.deepEqual(exported, [test, test2])
  })

  it('should be able to export multiple tables', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      tags: string[] = []
    }

    class Test2 extends Model {
      @Field({ primaryKey: true })
      id!: number

      username!: string
    }

    await init('test', 1)

    const test = await Test.create({ id: 1, tags: ['a', 'b'] })
    const test2 = await Test.create({ id: 2, tags: ['c', 'd'] })
    const test3 = await Test2.create({ id: 1, username: 'test' })
    const test4 = await Test2.create({ id: 2, username: 'test2' })

    const exported = await exportDatabase()
    assert.deepEqual(exported, {
      Test: [test, test2],
      Test2: [test3, test4],
    })
  })

  it.skipIf(getNodeVersion() < 18)(
    'should be able to export to a JSON Blob',
    async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id!: number

        random!: number
      }

      await init('test', 1)
      await Transaction('readwrite', [Test], async (tx) => {
        const promises: Promise<Test>[] = []
        for (let i = 0; i < 10000; i++)
          promises.push(Test.create({ id: i, random: Math.random() }, tx))

        await Promise.all(promises)
      })

      const exported = await exportDatabaseToBlob()
      assert.isTrue(exported instanceof Blob)
    },
  )

  it('should be able to import a single table', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      tags: string[] = []
    }

    await init('test', 1)

    const data = [
      { id: 1, tags: ['a', 'b'] },
      { id: 2, tags: ['c', 'd'] },
    ]

    await importTable(Test.name, data)

    const tests = await Test.all()

    assert.deepEqual(tests, data)
  })

  it('should be able to import multiple tables', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number

      tags: string[] = []
    }

    class Test2 extends Model {
      @Field({ primaryKey: true })
      id!: number

      username!: string
    }

    await init('test', 1)

    const data = {
      Test: [
        { id: 1, tags: ['a', 'b'] },
        { id: 2, tags: ['c', 'd'] },
      ],
      Test2: [
        { id: 1, username: 'test' },
        { id: 2, username: 'test2' },
      ],
    }

    await importDatabase(data)

    const tests = await Test.all()
    const tests2 = await Test2.all()

    assert.deepEqual(tests, data.Test)
    assert.deepEqual(tests2, data.Test2)
  })
})
