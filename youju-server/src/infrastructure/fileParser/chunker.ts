import { randomUUID } from 'node:crypto'

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

const DEFAULT_PARENT_SIZE = 1024
const DEFAULT_CHILD_SIZE = 256
const DEFAULT_OVERLAP = 0.15
const CHARS_PER_TOKEN = 4

const SEPARATORS = ['\n\n', '\n', '。', '！', '？', '；', '，', ' ', '']

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN
}

interface Heading {
  level: number
  title: string
  matchStart: number
  contentStart: number
}

interface Section {
  headingPath: string
  content: string
  startOffset: number
  endOffset: number
}

function extractHeadings(text: string): Heading[] {
  const headings: Heading[] = []
  const regex = /^(#{1,6})\s+(.+?)$/gm
  let match: RegExpExecArray | null
  match = regex.exec(text)
  while (match !== null) {
    const level = match[1].length
    const title = match[2].trim()
    const matchStart = match.index ?? 0
    const lineEnd = text.indexOf('\n', matchStart)
    const contentStart = lineEnd === -1 ? text.length : lineEnd + 1
    headings.push({ level, title, matchStart, contentStart })
    match = regex.exec(text)
  }
  return headings
}

function splitByHeadings(text: string): Section[] {
  const headings = extractHeadings(text)

  if (headings.length === 0) {
    return [
      {
        headingPath: '',
        content: text,
        startOffset: 0,
        endOffset: text.length,
      },
    ]
  }

  const sections: Section[] = []

  if (headings[0].matchStart > 0) {
    const preContent = text.substring(0, headings[0].matchStart)
    if (preContent.trim()) {
      sections.push({
        headingPath: '',
        content: preContent,
        startOffset: 0,
        endOffset: headings[0].matchStart,
      })
    }
  }

  const stack: { level: number; title: string }[] = []

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]
    const nextStart = i + 1 < headings.length ? headings[i + 1].matchStart : text.length

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }
    stack.push({ level: heading.level, title: heading.title })

    const headingPath = stack.map((h) => `${'#'.repeat(h.level)} ${h.title}`).join(' > ')

    const content = text.substring(heading.contentStart, nextStart)

    sections.push({
      headingPath,
      content,
      startOffset: heading.contentStart,
      endOffset: nextStart,
    })
  }

  return sections
}

function findBestSplitBefore(text: string, targetPos: number, minPos: number): number {
  for (const sep of SEPARATORS) {
    if (sep === '') continue

    const searchRegion = text.substring(minPos, targetPos)
    const idx = searchRegion.lastIndexOf(sep)
    if (idx !== -1) {
      return minPos + idx + sep.length
    }
  }
  return targetPos
}

interface LocalChunk {
  start: number
  end: number
}

function splitTextWithOffsets(text: string, maxChars: number, overlapChars: number): LocalChunk[] {
  const chunks: LocalChunk[] = []

  if (text.length === 0) return chunks
  if (text.length <= maxChars) {
    return [{ start: 0, end: text.length }]
  }

  let pos = 0
  let iterations = 0
  const maxIterations = text.length + 10

  while (pos < text.length && iterations < maxIterations) {
    iterations++
    let end = pos + maxChars

    if (end >= text.length) {
      chunks.push({ start: pos, end: text.length })
      break
    }

    const minEnd = pos + Math.floor(maxChars * 0.5)
    end = findBestSplitBefore(text, end, minEnd)

    if (end <= pos) {
      end = pos + maxChars
    }

    chunks.push({ start: pos, end })

    const nextPos = end - overlapChars
    if (nextPos <= pos) {
      pos = end
    } else {
      pos = nextPos
    }
  }

  return chunks
}

export function chunkDocument(
  text: string,
  options?: ChunkDocumentOptions,
): { parents: ChunkResult[]; children: ChunkResult[] } {
  const parentSize = options?.parentChunkSize ?? DEFAULT_PARENT_SIZE
  const childSize = options?.childChunkSize ?? DEFAULT_CHILD_SIZE
  const overlap = options?.overlap ?? DEFAULT_OVERLAP

  const parentMaxChars = tokensToChars(parentSize)
  const childMaxChars = tokensToChars(childSize)
  const parentOverlapChars = Math.floor(parentMaxChars * overlap)
  const childOverlapChars = Math.floor(childMaxChars * overlap)

  const sections = splitByHeadings(text)

  const parents: ChunkResult[] = []
  const children: ChunkResult[] = []
  let parentIndex = 0

  for (const section of sections) {
    const parentChunks = splitTextWithOffsets(section.content, parentMaxChars, parentOverlapChars)

    for (const pc of parentChunks) {
      let childIndexInParent = 0
      const parentId = randomUUID()
      const parentContent = section.content.substring(pc.start, pc.end)
      const parentAbsStart = section.startOffset + pc.start
      const parentAbsEnd = section.startOffset + pc.end

      const parentChunk: ChunkResult = {
        id: parentId,
        content: parentContent,
        charOffsetStart: parentAbsStart,
        charOffsetEnd: parentAbsEnd,
        headingPath: section.headingPath,
        tokenCount: estimateTokenCount(parentContent),
        parentChunkId: null,
        chunkIndex: parentIndex,
      }
      parents.push(parentChunk)
      parentIndex++

      if (parentContent.length === 0) continue

      const childChunks = splitTextWithOffsets(parentContent, childMaxChars, childOverlapChars)

      for (const cc of childChunks) {
        const childContent = parentContent.substring(cc.start, cc.end)
        if (childContent.length === 0) continue

        children.push({
          id: randomUUID(),
          content: childContent,
          charOffsetStart: parentAbsStart + cc.start,
          charOffsetEnd: parentAbsStart + cc.end,
          headingPath: section.headingPath,
          tokenCount: estimateTokenCount(childContent),
          parentChunkId: parentId,
          chunkIndex: childIndexInParent,
        })
        childIndexInParent++
      }
    }
  }

  return { parents, children }
}
