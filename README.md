# W(eb)-ORM

[![codecov](https://codecov.io/gh/D34DPlayer/w-orm/branch/main/graph/badge.svg?token=Y9OI2FEWVA)](https://codecov.io/gh/D34DPlayer/w-orm)

[**Documentation**](https://d34dplayer.github.io/w-orm)

[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is in theory every developer's dream, having a full database built-in into your browser is amazing. However, if you have tried using it, it'll feel lacking compared to an actual SQL database, or even a document database.

This package's objective is to hide away this ugly truth and expose it with a nice ORM, so that you can forget this is far from being a fully fledged DB.

## Overview

A table can be simply created as follows:
```ts
import { Field, Model } from 'w-orm'

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
   `npm install w-orm reflect-metadata`

2. reflect-metadata needs to be imported somewhere in the global space of your app (eg. index.ts):
    `import "reflect-metadata"`

3. Finally the following needs to be enabled in your `tsconfig.json`
  ```json
  {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
   ```
