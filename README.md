# W(eb)-ORM

[![codecov](https://codecov.io/gh/D34DPlayer/w-orm/branch/main/graph/badge.svg?token=Y9OI2FEWVA)](https://codecov.io/gh/D34DPlayer/w-orm)

[**Documentation**](https://d34dplayer.github.io/w-orm)

[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is in theory every developer's dream, having a full database built-in into your browser is amazing. However, if you have tried using it, it'll feel lacking compared to an actual SQL database, or even a document database.

This package's objective is to hide away this ugly truth and expose it with a nice ORM, so that you can forget this is far from being a fully fledged DB.

## Overview

A table can be simply created as follows:
```ts
import { Field, Model } from '@d34d/w-orm'

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
```

And can be interacted with as follows:
```ts
// With typing support!
const user = await User.create({
  username: 'Joe',
  balance: 42,
})

const allUsers = await User.orderBy('id').all()

const otherUser = await User.filter({
  username: 'Carlos',
}).first()

const allAdmins = await User.filter({
  role: UserRole.Admin,
}).all()

// Filters are more powerful than just checking values
const everyoneInDebt = await User.filter({
  balance: (b) => b < -1
}).all()

await otherUser.remove()
```

## Installation

1. Install the npm package:
   `npm install @d34d/w-orm reflect-metadata`

2. reflect-metadata needs to be imported somewhere in the global space of your app (eg. index.ts):
    `import "reflect-metadata"`

3. Finally the following needs to be enabled in your `tsconfig.json`
  ```json
  {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
   ```

## Table definition

Tables are defined as classes extending the `Model` class and using the `Field` decorator:

```ts
class User extends Model {
  // Primary key and generator function
  @Field({ primaryKey: true, default: () => crypto.randomUUID() })
  id!: string
  // Unique constraint
  @Field({ unique: true })
  username!: string
  // Static default (equivalent to `() => "guest"`)
  @Field({ default: "guest" })
  role!: string
  // nullable field, any other field will throw an error if not defined
  @Field({ nullable: true })
  email?: boolean
} 
```

A `Field` has the following parameters:
- `primaryKey`: Whether the field is the primary key of the model, if multiple fields are marked as primary key, their combination will be the key.
  > **Important note**: A limitation in IndexedDB makes it so the primary key can't be changed once the table is created and W-ORM will throw an error, a way to circumvent this is explained in [migrations](#migration-system).
- `unique`: Whether the field has an unique constraint. This will be enforced by the database.
- `nullable`: Whether the field can be `null`/`undefined`, primary keys cannot be nullable.
- `default`: The default value of the field, it can be a value or a function that returns the value.
- `index`: Whether the field should be indexed, it is recommended to keep it unless the type isn't indexable (eg. a Blob).

More info in the [API documentation](https://w-orm.d34d.one/dev/?page=W-ORM.Function.Field).

## Query system
All queries start from your `Model` class:

```ts
// Get with primary key
const table = await User.get(1)
// Get all
const allTables = await User.all()
// Get with filter
const tables = await User.filter({ name: 'John' }).first()
// Get with advanced filter (user provided function)
const tables2 = await User.filter({ name: (n) => n.includes('Ruiz') }).first()
// Get with filter and order
const tables3 = await User.filter({ name: 'John' }).orderBy('-name').first()
// Create a new entry
const newUser = await User.create({ name: 'John' })
// Update an entry
newUser.name = 'Jane'
// or with typing support
newUser.update({
name: 'Jane'
})
// Commit changes
await newUser.save()
// Delete an entry
await newUser.delete()
```

More info in the [API documentation](https://w-orm.d34d.one/dev/?page=W-ORM.Class.Model).

## Transactions

Sometimes DB operations are meant to be executed as a "bundle", so that they either all pass or fail together.

Transactions allow us to implement this, with automatic rollbacks on error. And even if you don't need this, there are performance benefits to using transactions.

The tables that a transaction will interact with need to be explicitly defined, as write transactions will lock those until the transaction is over.

```ts
await Transaction('readwrite', [User], async (tx) => {
  const newUser = await User.create({ name: 'John Doe' }, tx)
  const getUser = await User.get(newUser.id, tx)

  // Any error thrown in the callback will abort the transaction, this will rollback any changes made
  throw new Error('rollback')
  // If no error is thrown, the transaction will be committed
})
```

> **Important note**: Because of a limitation in the IndexedDB API, the transaction will be automatically committed if we wait for any non-transactional operation. (e.g. fetching some data from the network).

More info in the [API documentation](https://w-orm.d34d.one/dev/?page=W-ORM.Function.Transaction).

## Migration system

Sometimes, changes to the way existing data is stored are required for an update, to cope with this W-ORM provides an intuitive migration system.

Migrations are defined as list of functions to be executed, depending on the current and target DB versions.
The key is the target version number, and the value is the migration callback.

Eg. `{ 2: (migration) => { ... } }` will execute the migration callback when the current database version is smaller than 2.

A migration callback receives a 
`MigrationContext` object as its only argument.
This object contains a transaction to be used for the migration.

It is expected for the callback to create Model classes that represent the table's state in between these two versions.
The fields aren't actually used by W-ORM in this scenario, and only serve to improve the typing within the migration.

The `Model` methods can be then used to manipulate the data.
It is very important to use the transaction provided by the migration context, otherwise the migration will hang forever.

```ts
const migrations: MigrationList = {
  2: async (migration) => {
    class User extends Model {
      id!: number
      name!: string
    }

    const users = await User.all()
    for (const user of users) {
      user.name = `${user.id} name`
      await user.save(migration.tx)
    }
    // Or with the `forEach method`
    await User.forEach(async (instance, tx) => {
      instance.name = `${instance.id} name`
      await instance.save(tx)
    }, migration.tx)

    const specificUser = await User.get(69, migration.tx)
    await specificUser?.delete(migration.tx)
  },
}
```

More info in the [API documentation](https://w-orm.d34d.one/dev/?page=Types.TypeAlias.MigrationList).
