declare module 'pdf-parse' {
  interface PDFData {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: unknown
    text: string
  }

  interface PDFOptions {
    pagerender?: (pageData: { getTextContent: () => Promise<{ items: unknown[] }> }) => Promise<string>
    max?: number
    version?: string
  }

  function pdf(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>

  export = pdf
}
