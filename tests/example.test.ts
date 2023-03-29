import 'reflect-metadata'
import 'fake-indexeddb/auto'
import { test, expect } from '@jest/globals'
import { Model, Field, deleteDB, init, TablesMetadata } from '../src'

enum UserRole {
    Admin,
    Moderator,
    Guest,
}

class User extends Model {
  @Field({ primaryKey: true, default: () => crypto.randomUUID() })
  id!: string

  @Field({ unique: true })
  username!: string

  @Field({ default: UserRole.Guest })
  role!: UserRole

  @Field({ nullable: true })
  email?: boolean

  @Field({ default: 0 })
  balance!: number
}


test("Test example usage", async () => {
  await deleteDB('test').catch(console.error)
  const db = await init('test', 1).catch(console.error)
  console.log(TablesMetadata)

  const inst = User.create({
    username: 'test',
    balance: 2,
  })
  expect(inst.username).toBe('test')
})
