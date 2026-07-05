import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DEMO_HISTORY } from '../constants/demoData'
import { taskApi } from '../services/taskApi'
import { useSourceStore, useTaskStore } from '../stores'
import type { TaskRecord } from '../types'

export const useTasks = () => {
  const queryClient = useQueryClient()
  const { showHistory, setShowHistory, savingTask } = useTaskStore()
  const { isDemo } = useSourceStore()

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (isDemo) {
        const sorted = [...DEMO_HISTORY].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        return sorted as TaskRecord[]
      }
      return taskApi.getTasks()
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  })

  const createTaskMutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => {
      if (isDemo) {
        return Promise.resolve()
      }
      return taskApi.deleteTask(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  })

  const updateChecklistMutation = useMutation({
    mutationFn: (params: { taskId: string; checkedItems: string[] }) => {
      if (isDemo) {
        return Promise.resolve()
      }
      return taskApi.updateChecklist(params.taskId, params.checkedItems)
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  })

  const getTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.getTask(taskId),
  })

  const getTask = async (taskId: string) => {
    if (!taskId) return null
    try {
      return await getTaskMutation.mutateAsync(taskId)
    } catch (error) {
      console.error('Failed to get task:', error)
      return null
    }
  }

  return {
    tasks: tasksQuery.data || [],
    tasksLoading: tasksQuery.isLoading,
    tasksError: tasksQuery.error,
    showHistory,
    setShowHistory,
    savingTask,
    createTask: createTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    updateChecklist: updateChecklistMutation.mutate,
    getTask,
    getTaskAsync: getTaskMutation.mutateAsync,
    isGettingTask: getTaskMutation.isPending,
    getTaskError: getTaskMutation.error,
    refetchTasks: tasksQuery.refetch,
  }
}

export const useTask = (taskId: string | null) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null
      return taskApi.getTask(taskId)
    },
    enabled: !!taskId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  })
}
