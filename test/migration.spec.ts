import { assert } from 'chai'
import { db, disconnect, init } from '../src/connection'
import { defineModel } from '../src/fields'
import { Model } from '../src/models'
import { _resetMetadata } from '../src/metadata'
import type { MigrationList } from '../src/types'
import { _objectStore } from '../src/transaction'

describe('Migration system', () => {
  it('should be able to add a new field', async () => {
    // #region First version
    class Test1 extends Model {
      id!: number
    }
    Object.defineProperty(Test1, 'name', { value: 'Test' })
    defineModel(Test1, {
      id: { primaryKey: true },
    })

    await init('test', 1)
    assert(db.connected)

    await Test1.create({ id: 1 })
    await Test1.create({ id: 2 })

    assert.sameDeepMembers(await Test1.all(), [
      { id: 1 },
      { id: 2 },
    ] as Test1[])

    // Simulate a page reload
    disconnect()
    _resetMetadata()
    // #endregion First version

    // #region Second version
    // Define migrations
    const migrations: MigrationList = {
      2: async (migration) => {
        class Test extends Model {
          id!: number
          name!: string
        }

        await Test.forEach(async (instance, tx) => {
          instance.name = `${instance.id} name`
          await instance.save(tx)
        }, migration.tx)
      },
    }

    // Second version
    class Test2 extends Model {
      id!: number
      name!: string
    }
    Object.defineProperty(Test2, 'name', { value: 'Test' })
    defineModel(Test2, {
      id: { primaryKey: true },
      name: { nullable: false },
    })

    await init('test', 2, migrations)

    assert.sameDeepMembers(await Test2.all(), [
      { id: 1, name: '1 name' },
      { id: 2, name: '2 name' },
    ] as Test2[])
    // #endregion Second version
  })
  it('should be able to remove a field', async () => {
    class Test1 extends Model {
      id!: number
      name!: string
    }
    Object.defineProperty(Test1, 'name', { value: 'Test' })
    defineModel(Test1, {
      id: { primaryKey: true },
      name: { nullable: false },
    })

    await init('test', 1)

    await Test1.create({ id: 1, name: '1 name' })
    await Test1.create({ id: 2, name: '2 name' })

    assert.sameDeepMembers(await Test1.all(), [
      { id: 1, name: '1 name' },
      { id: 2, name: '2 name' },
    ] as Test1[])

    // Simulate a page reload
    disconnect()
    _resetMetadata()

    // Second version
    class Test2 extends Model {
      id!: number
    }
    Object.defineProperty(Test2, 'name', { value: 'Test' })
    defineModel(Test2, {
      id: { primaryKey: true },
    })

    await init('test', 2)

    const store = _objectStore('Test')
    assert(!store.indexNames.contains('name'))
  })
})
