import * as connection from './connection'
import * as errors from './errors'
import * as fields from './fields'
import * as metadata from './metadata'
import * as models from './models'
import * as query from './query'
import * as transaction from './transaction'

Object.defineProperty(globalThis, 'WORM', {
  value: { ...connection, ...errors, ...fields, ...metadata, ...models, ...query, ...transaction },
})
