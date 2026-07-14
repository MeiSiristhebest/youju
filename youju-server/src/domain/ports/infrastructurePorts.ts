export interface ModeCheckerPort {
  isMockMode(overrideKey?: string, isDemo?: boolean): boolean
}

export interface JwtPort {
  generateToken(userId: number): Promise<string>
  verifyToken(token: string): Promise<number | null>
}

export interface ChunkResult {
  id: string
  content: string
  charOffsetStart: number
  charOffsetEnd: number
  headingPath: string
  tokenCount: number
  parentChunkId: string | null
  chunkIndex: number
}

export interface ChunkDocumentOptions {
  parentChunkSize?: number
  childChunkSize?: number
  overlap?: number
}

export interface DocumentChunkerPort {
  chunkDocument(
    text: string,
    options?: ChunkDocumentOptions,
  ): { parents: ChunkResult[]; children: ChunkResult[] }
}
