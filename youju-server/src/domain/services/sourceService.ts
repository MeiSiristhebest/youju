import type { SourceRepository } from '../ports/repositories.js'
import type { Source, SourceType } from '../types.js'

let _sourceRepo: SourceRepository | null = null

export function setSourceRepository(repo: SourceRepository): void {
  _sourceRepo = repo
}

function getSourceRepo(): SourceRepository {
  if (!_sourceRepo) {
    throw new Error('SourceRepository not set.')
  }
  return _sourceRepo
}

export async function createSource(
  userId: number | null,
  sessionId: string | null,
  type: string,
  name: string,
  content: string,
  meta?: string,
): Promise<Source> {
  const result = await getSourceRepo().createSource(userId, sessionId, type, name, content, meta)
  return {
    id: result.id,
    type: result.type as SourceType,
    name: result.name,
    content: result.content,
    meta: result.meta || undefined,
  }
}

export async function listSources(
  userId: number | null,
  sessionId?: string | null,
): Promise<Source[]> {
  const sources = await getSourceRepo().getSourcesByUser(userId, sessionId)
  return sources.map((s) => ({
    id: s.id,
    type: s.type as SourceType,
    name: s.name,
    content: s.content,
    meta: s.meta || undefined,
  }))
}

export async function getSource(id: string): Promise<Source | null> {
  const source = await getSourceRepo().getSourceById(id)
  if (!source) return null
  return {
    id: source.id,
    type: source.type as SourceType,
    name: source.name,
    content: source.content,
    meta: source.meta || undefined,
  }
}

export async function deleteSource(
  userId: number | null,
  sessionId: string | null,
  id: string,
): Promise<boolean> {
  return getSourceRepo().deleteSource(userId, sessionId, id)
}
