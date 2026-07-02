import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTaskStore } from '../../stores/useTaskStore'
import type { TaskRecord } from '../../types'

const mockTasks: TaskRecord[] = [
  {
    id: 'task-1',
    title: '任务1',
    scenarioType: 'contract',
    sourceCount: 3,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    title: '任务2',
    scenarioType: 'loan',
    sourceCount: 2,
    createdAt: '2024-01-02T00:00:00Z',
  },
]

describe('useTaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState(useTaskStore.getInitialState())
  })

  afterEach(() => {
    useTaskStore.setState(useTaskStore.getInitialState())
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useTaskStore.getState()
      expect(state.taskHistory).toEqual([])
      expect(state.showHistory).toBe(false)
      expect(state.savingTask).toBe(false)
      expect(state.taskSaved).toBe(false)
    })
  })

  describe('setter 方法', () => {
    it('setTaskHistory 应该正确设置任务历史', () => {
      useTaskStore.getState().setTaskHistory(mockTasks)
      expect(useTaskStore.getState().taskHistory).toEqual(mockTasks)
    })

    it('setTaskHistory 空数组应该清空历史', () => {
      useTaskStore.getState().setTaskHistory(mockTasks)
      useTaskStore.getState().setTaskHistory([])
      expect(useTaskStore.getState().taskHistory).toEqual([])
    })

    it('addTask 应该添加任务到列表开头', () => {
      useTaskStore.getState().addTask(mockTasks[0])
      expect(useTaskStore.getState().taskHistory.length).toBe(1)
      expect(useTaskStore.getState().taskHistory[0]).toEqual(mockTasks[0])
    })

    it('addTask 新任务应该在列表最前面', () => {
      useTaskStore.getState().addTask(mockTasks[0])
      useTaskStore.getState().addTask(mockTasks[1])
      expect(useTaskStore.getState().taskHistory[0].id).toBe('task-2')
      expect(useTaskStore.getState().taskHistory[1].id).toBe('task-1')
    })

    it('removeTask 应该删除指定任务', () => {
      useTaskStore.getState().setTaskHistory(mockTasks)
      useTaskStore.getState().removeTask('task-1')
      expect(useTaskStore.getState().taskHistory.length).toBe(1)
      expect(useTaskStore.getState().taskHistory[0].id).toBe('task-2')
    })

    it('removeTask 不存在的 id 不改变列表', () => {
      useTaskStore.getState().setTaskHistory(mockTasks)
      useTaskStore.getState().removeTask('non-existent')
      expect(useTaskStore.getState().taskHistory).toEqual(mockTasks)
    })

    it('removeTask 空列表时不报错', () => {
      useTaskStore.getState().removeTask('task-1')
      expect(useTaskStore.getState().taskHistory).toEqual([])
    })

    it('setShowHistory 应该正确设置历史显示状态', () => {
      useTaskStore.getState().setShowHistory(true)
      expect(useTaskStore.getState().showHistory).toBe(true)
    })

    it('setSavingTask 应该正确设置保存任务状态', () => {
      useTaskStore.getState().setSavingTask(true)
      expect(useTaskStore.getState().savingTask).toBe(true)
    })

    it('setTaskSaved 应该正确设置任务已保存状态', () => {
      useTaskStore.getState().setTaskSaved(true)
      expect(useTaskStore.getState().taskSaved).toBe(true)
    })
  })
})
