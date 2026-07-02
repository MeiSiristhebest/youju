import { z } from 'zod'

export const sourceTextSchema = z.object({
  type: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(500_000),
})

export const sourceUrlSchema = z.object({
  url: z.string().url(),
  type: z.string().min(1).max(50).default('web'),
  name: z.string().max(200).optional(),
})

export const sourceUploadSchema = z.object({
  type: z.string().min(1).max(50).optional(),
  name: z.string().max(200).optional(),
})

export const analyzeSchema = z.object({
  sourceIds: z.array(z.string()).optional(),
  scenarioType: z.string().min(1).max(50).default('custom'),
  taskId: z.string().optional(),
  incremental: z.boolean().optional(),
})

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  scenarioType: z.string().min(1).max(50).optional(),
  sourceIds: z.array(z.string()).default([]),
})

export const checklistUpdateSchema = z.object({
  checkedItems: z.array(z.string()),
})

export const authWechatSchema = z.object({
  code: z.string().max(200).optional(),
})

export const shareCreateSchema = z.object({
  expiresInDays: z.number().int().min(1).max(30).optional(),
})

export const shareDeleteSchema = z.object({
  token: z.string().min(1).max(100),
})

export const riskFeedbackSchema = z.object({
  riskId: z.string().min(1).max(100),
  riskType: z.enum(['critical', 'warning', 'info']),
  isAccurate: z.boolean(),
})

export const checklistPreferenceSchema = z.object({
  riskType: z.string().min(1).max(50),
  dimension: z.string().max(200).optional(),
  checked: z.boolean(),
})

export const draftCopySchema = z.object({
  riskType: z.string().min(1).max(50),
})

export const draftEditSchema = z.object({
  editCount: z.number().int().min(1).max(1000).default(1),
})

export type SourceTextInput = z.infer<typeof sourceTextSchema>
export type SourceUrlInput = z.infer<typeof sourceUrlSchema>
export type AnalyzeInput = z.infer<typeof analyzeSchema>
export type TaskCreateInput = z.infer<typeof taskCreateSchema>
export type ChecklistUpdateInput = z.infer<typeof checklistUpdateSchema>
export type AuthWechatInput = z.infer<typeof authWechatSchema>
export type ShareCreateInput = z.infer<typeof shareCreateSchema>
export type ShareDeleteInput = z.infer<typeof shareDeleteSchema>
