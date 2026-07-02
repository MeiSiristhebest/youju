import type { ShareRepository } from '../ports/repositories.js'
import type { Share, Task } from '../types.js'

let _shareRepo: ShareRepository | null = null

export function setShareRepository(repo: ShareRepository): void {
  _shareRepo = repo
}

function getShareRepo(): ShareRepository {
  if (!_shareRepo) {
    throw new Error('ShareRepository not set.')
  }
  return _shareRepo
}

export async function createShare(
  userId: number | null,
  sessionId: string | null,
  taskId: string,
  title: string,
  snapshotData: unknown,
  expiresAt?: string,
): Promise<Share & { url: string }> {
  return getShareRepo().createShare(userId, sessionId, taskId, title, snapshotData, expiresAt)
}

export async function getShareByToken(
  token: string,
): Promise<(Share & { task: Task | null; result: unknown }) | null> {
  return getShareRepo().getShareByToken(token)
}

export async function getShare(
  userId: number | null,
  sessionId: string | null,
  id: string,
): Promise<Share | null> {
  return getShareRepo().getShareById(userId, sessionId, id)
}

export async function listShares(
  userId: number | null,
  sessionId: string | null,
): Promise<Share[]> {
  return getShareRepo().getSharesByUser(userId, sessionId)
}

export async function deleteShare(
  userId: number | null,
  sessionId: string | null,
  id: string,
): Promise<boolean> {
  return getShareRepo().deleteShare(userId, sessionId, id)
}

export async function getSharesByTask(taskId: string): Promise<Share[]> {
  return getShareRepo().getSharesByTask(taskId)
}
