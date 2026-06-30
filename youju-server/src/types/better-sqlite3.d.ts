declare module 'better-sqlite3' {
  class Database {
    constructor(path: string, options?: any)
    prepare(sql: string): Statement
    exec(sql: string): void
    pragma(option: string): void
    close(): void
  }

  interface Statement {
    run(...params: any[]): RunResult
    get(...params: any[]): any
    all(...params: any[]): any[]
  }

  interface RunResult {
    changes: number
    lastInsertRowid: number | bigint
  }

  export default Database
}
