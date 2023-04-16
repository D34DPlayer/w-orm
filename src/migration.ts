import type { Migration, MigrationList } from './types'

type MigrationItem = [number, Migration]

export class MigrationContext {
  private migrations: MigrationItem[]

  constructor(public db: IDBDatabase, public tx: IDBTransaction, migrations: MigrationList) {
    this.migrations = Object.entries(migrations)
      .map(([version, migration]) => [parseInt(version), migration])

    this.migrations.sort(([a], [b]) => a - b)
  }

  public async runMigrations(oldVersion: number, newVersion: number | null) {
    // If the database is deleted, newVersion is null
    if (newVersion === null)
      return

    const migrations = this.migrations.filter(([version]) => version > oldVersion && version <= newVersion)
    for (const [_, migration] of migrations)
      await migration(this)
  }

  get tables(): string[] {
    return Array.from(this.db.objectStoreNames)
  }

  public deleteTable(name: string) {
    this.db.deleteObjectStore(name)
  }
}
