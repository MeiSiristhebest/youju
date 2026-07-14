export function buildChatUserPrompt(content: string, contextSourceIds?: string[]): string {
  const trimmed = content.trim()
  if (contextSourceIds && contextSourceIds.length > 0) {
    const ids = contextSourceIds.join(', ')
    return `<user_question>
${trimmed}
</user_question>
<context_scope>请在以下素材范围内检索：[${ids}]</context_scope>`
  }
  return `<user_question>
${trimmed}
</user_question>`
}
