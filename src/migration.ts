import type { Migration, MigrationList } from './types'

export type MigrationItem = [number, Migration]

/**
 * Context passed to migrations.
 * @see {@link Types.MigrationList}: For more information on migrations
 */
export class MigrationContext {
  private migrations: MigrationItem[]

  /**
   * Should be created during a version change transaction.
   * @param db - The database connection
   * @param tx - The transaction
   * @param migrations - The migrations to run
   */
  constructor(
    public db: IDBDatabase,
    public tx: IDBTransaction,
    migrations: MigrationList,
  ) {
    this.migrations = Object.entries(migrations).map(([version, migration]) => [
      parseInt(version),
      migration,
    ])

    this.migrations.sort(([a], [b]) => a - b)
  }

  /**
   * Runs the migrations between the old and new version.
   * @param oldVersion - The old version
   * @param newVersion - The new version
   */
  public async runMigrations(oldVersion: number, newVersion: number | null) {
    // If the database is deleted, newVersion is null
    if (newVersion === null)
      return

    const migrations = this.migrations.filter(
      ([version]) => version > oldVersion && version <= newVersion,
    )
    for (const [_, migration] of migrations) await migration(this)
  }

  /**
   * List of tables currently in the database.
   */
  get tables(): string[] {
    return Array.from(this.db.objectStoreNames)
  }

  /**
   * Deletes a table from the database.
   * @param name - The table's name
   */
  public deleteTable(name: string) {
    this.db.deleteObjectStore(name)
  }
}
