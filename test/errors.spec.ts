import { assert, describe, it } from 'vitest'

import { Transaction, _objectStore } from '../src/transaction'
import { Model } from '../src/models'
import { Field } from '../src/fields'

describe('Connection Errors', () => {
  it('should fail at _objectStore', async () => {
    assert.throws(() => {
      _objectStore('notFound', 'readwrite')
    }, /not connected/)
  })
  it('should fail at Transaction', async () => {
    class Test extends Model {
      @Field({ primaryKey: true })
      id!: number
    }

    await new Promise<void>((resolve, reject) => {
      Transaction('readwrite', [Test], async () => {
        // ...
      })
        .then(() => {
          reject(new Error('Should have failed'))
        })
        .catch((err: Error) => {
          assert.match(err.message, /not connected/)
          resolve()
        })
    })
  })
})
