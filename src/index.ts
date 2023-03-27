import { deleteDB, init } from './connection.js'
import { Model } from './models.js'
import { Field } from './fields.js'

class ExampleModel extends Model {
  @Field({ primaryKey: true })
  name!: string

  @Field({ primaryKey: false, default: true })
  test!: boolean

  @Field({ primaryKey: false, default: 0 })
  amount!: number
}

async function main() {
  await deleteDB('test').catch(console.error)
  const db = await init('test', 1).catch(console.error)
}

main().catch(console.error)
