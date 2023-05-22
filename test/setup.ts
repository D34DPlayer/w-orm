import { beforeEach } from 'vitest'

import { deleteDB, disconnect } from '../src/connection'
import { _resetMetadata } from '../src/metadata'

import 'reflect-metadata'
import 'fake-indexeddb/auto'

beforeEach(async () => {
  if (globalThis.indexedDB) {
    disconnect()
    _resetMetadata()
    await deleteDB('test')
  }
  else {
    throw new Error('indexedDB is undefined')
  }
})
