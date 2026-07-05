import type { ShareRepository } from '../ports/repositories.js'
import type { Share, Task } from '../types.js'

export class ShareService {
  constructor(private readonly shareRepo: ShareRepository) {}

  async createShare(
    userId: number | null,
    sessionId: string | null,
    taskId: string,
    title: string,
    snapshotData: unknown,
    expiresAt?: string,
  ): Promise<Share & { url: string }> {
    return this.shareRepo.createShare(userId, sessionId, taskId, title, snapshotData, expiresAt)
  }

  async getShareByToken(
    token: string,
  ): Promise<(Share & { task: Task | null; result: unknown }) | null> {
    return this.shareRepo.getShareByToken(token)
  }

  async getShare(
    userId: number | null,
    sessionId: string | null,
    id: string,
  ): Promise<Share | null> {
    return this.shareRepo.getShareById(userId, sessionId, id)
  }

  async listShares(userId: number | null, sessionId: string | null): Promise<Share[]> {
    return this.shareRepo.getSharesByUser(userId, sessionId)
  }

  async deleteShare(userId: number | null, sessionId: string | null, id: string): Promise<boolean> {
    return this.shareRepo.deleteShare(userId, sessionId, id)
  }

  async getSharesByTask(taskId: string): Promise<Share[]> {
    return this.shareRepo.getSharesByTask(taskId)
  }
}
