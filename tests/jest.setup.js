require('reflect-metadata')
require('fake-indexeddb/auto')

Object.defineProperty(globalThis, 'crypto', {
    value: require('crypto').webcrypto
})
