// EXAMPLE USAGE
import 'reflect-metadata'
import { deleteDB, init } from './connection'
import { Model } from './models'
import { Field } from './fields'
import { TablesMetadata } from './metadata'

export * from './connection'
export * from './fields'
export * from './models'
export * from './metadata'

class ExampleModel extends Model {
  @Field({ primaryKey: true, default: () => crypto.randomUUID() })
  id!: string

  @Field({ unique: true })
  name!: string

  @Field({ primaryKey: false, default: true })
  test!: boolean

  @Field({ primaryKey: false, default: () => 69 })
  amount!: number
}

async function main() {
  await deleteDB('test').catch(console.error)
  const db = await init('test', 1).catch(console.error)
  console.log(TablesMetadata)

  const inst = ExampleModel.create({
    name: 'test',
    amount: 2,
  })
  console.log(inst)
}

main().catch(console.error)
