import type { DocumentChunkerPort } from '../../domain/ports/infrastructurePorts.js'
import { chunkDocument } from './chunker.js'

export const documentChunkerAdapter: DocumentChunkerPort = {
  chunkDocument: (text, options) => chunkDocument(text, options),
}
