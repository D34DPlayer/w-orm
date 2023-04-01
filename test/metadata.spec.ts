import { assert } from 'chai'

import { init } from '../src/connection'
import { Field } from '../src/fields'
import { Model } from '../src/models'
import { getPrimaryKeys } from '../src/metadata'

describe('Metadata', () => {
  describe('getPrimaryKeys', () => {
    it('should return an empty array if the table does not exist', () => {
      const primaryKeys = getPrimaryKeys('doesNotExist')
      assert.deepEqual(primaryKeys, [])
    })
    it('should return an array of primary keys', async () => {
      class Test extends Model {
        @Field({ primaryKey: true })
        id1!: number

        @Field({ primaryKey: true })
        id2!: number
      }

      await init('test', 1)

      const primaryKeys = getPrimaryKeys('Test')
      assert.sameMembers(primaryKeys, ['id1', 'id2'])
    })
  })
})
