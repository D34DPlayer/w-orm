import { Field, Model, init } from '../src'

enum UserRole {
  Admin = 'admin',
  Moderator = 'moderator',
  Guest = 'guest',
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

test('Test example usage', async () => {
  await init('test', 1).catch(console.error)

  const inst = await User.create({
    username: 'test',
    balance: 2,
  })
  expect(inst.username).toBe('test')
  
  const inst2 = await User.get(inst.id)

  expect(inst2).not.toBe(null)
  expect(inst2).toEqual(inst)

  await inst.delete()

  const inst3 = await User.get(inst.id)
  expect(inst3).toBe(null)
})
