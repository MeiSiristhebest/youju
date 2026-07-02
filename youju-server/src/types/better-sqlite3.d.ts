declare module 'better-sqlite3' {
  class Database {
    constructor(path: string, options?: DatabaseOptions)
    prepare(sql: string): Statement
    exec(sql: string): void
    pragma(option: string, options?: { simple?: boolean }): any
    close(): void
    /** 在线备份（不阻塞读写） */
    backup(destination: string, options?: BackupOptions): Promise<BackupMetadata>
    transaction(fn: (...args: any[]) => any): (...args: any[]) => any
  }

  interface DatabaseOptions {
    readonly?: boolean
    fileMustExist?: boolean
    timeout?: number
    verbose?: (...args: any[]) => void
  }

  interface BackupOptions {
    progress?: (info: { totalPages: number; remainingPages: number }) => void
    rate?: number
    source?: string
  }

  interface BackupMetadata {
    totalPages: number
    remainingPages: number
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
