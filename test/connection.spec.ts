import { assert } from 'chai'

import { db, disconnect, init } from '../src/connection'

describe('DB Tests', () => {
  it('should be disconnected by default', () => {
    assert(!db.connected)
  })
  it('should connect to the database', async () => {
    await init('test', 1)
    assert(db.connected)
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
