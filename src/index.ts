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
  console.log(TablesMetadata)
}

main().catch(console.error)
