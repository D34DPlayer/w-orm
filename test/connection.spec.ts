import { assert, describe, it } from 'vitest'

import { db, deleteDB, disconnect, init } from '../src/connection'

describe('DB Tests', () => {
  it('should be disconnected by default', () => {
    assert(!db.connected)
  })
  it('should connect to the database', async () => {
    await init('test', 1)
    assert(db.connected)
  })
  it('should disconnect from the database', async () => {
    await init('test', 1)
    disconnect()
    assert(!db.connected)
  })
  it('should\'t connect to the database twice', async () => {
    await init('test', 1)
    await init('test', 1)
    assert(db.connected)

    disconnect()
  })
})

describe('Migrations', () => {
  it('should only happen when asked', async () => {
    const databases = await globalThis.indexedDB.databases()
    assert.lengthOf(databases, 0)
  })
  it('should happen when new version', async () => {
    const initResp = await init('test', 1)
    assert(initResp.upgraded)
  })
  it('shouldn\'t happen with same version', async () => {
    await init('test', 1)
    disconnect()

    const initResp = await init('test', 1)
    assert(!initResp.upgraded)
  })
})

describe('Delete DB', () => {
  it('should delete the database', async () => {
    await init('test', 1)
    disconnect()
    await deleteDB('test')
    const databases = await globalThis.indexedDB.databases()
    assert.lengthOf(databases, 0)
  })
  it('shouldn\'t delete the database if it doesn\'t exist', async () => {
    await deleteDB('test')
    const databases = await globalThis.indexedDB.databases()
    assert.lengthOf(databases, 0)
  })
})
