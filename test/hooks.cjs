/** @type {import('mocha').RootHookObject} */
exports.mochaHooks = {
  beforeAll(done) {
    require('reflect-metadata')
    require('fake-indexeddb/auto')
    done()
  },
  afterEach(done) {
    if (globalThis.indexedDB) {
      const { disconnect } = require('../src/connection')
      disconnect()

      const { _resetMetadata } = require('../src/metadata')
      _resetMetadata()

      const req = globalThis.indexedDB.deleteDatabase('test')
      req.onsuccess = () => done()
      req.onerror = () => {
        throw new Error('indexedDB.deleteDatabase failed')
      }
    }
    else {
      throw new Error('indexedDB is undefined')
    }
  },
}
