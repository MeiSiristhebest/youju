import { create } from 'zustand'

/**
 * 对话草稿 store：用于在命令面板选中"预设问题"后，
 * 将问题文本暂存，待 ChatPanel / ChatInput 挂载时消费填入输入框。
 * Task 18 接入 ChatInput 时通过订阅 pendingQuestion 实现自动填入。
 */
interface ChatDraftState {
  /** 待填入输入框的问题；消费后应清空 */
  pendingQuestion: string | null
  setPendingQuestion: (question: string | null) => void
}

export const useChatDraftStore = create<ChatDraftState>((set) => ({
  pendingQuestion: null,
  setPendingQuestion: (pendingQuestion) => set({ pendingQuestion }),
}))
