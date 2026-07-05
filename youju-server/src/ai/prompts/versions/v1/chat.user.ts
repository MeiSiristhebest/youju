export function buildChatUserPrompt(content: string, contextSourceIds?: string[]): string {
  const trimmed = content.trim()
  if (contextSourceIds && contextSourceIds.length > 0) {
    const ids = contextSourceIds.join(', ')
    return `${trimmed}（请在以下素材范围内检索：[${ids}]）`
  }
  return trimmed
}

export default buildChatUserPrompt
