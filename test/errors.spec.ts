import { assert } from 'chai'
import { Transaction, _objectStore } from '../src/transaction'

describe('Connection Errors', () => {
  it('should fail at _objectStore', async () => {
    assert.throws(() => {
      _objectStore('notFound', 'readwrite')
    }, /not connected/)
  })
  it('should fail at Transaction', (done) => {
    Transaction('readwrite', async () => {
    // ...
    }).then(() => {
      done(new Error('Should have failed'))
    }).catch((err: Error) => {
      assert.match(err.message, /not connected/)
      done()
    })
  })
})
