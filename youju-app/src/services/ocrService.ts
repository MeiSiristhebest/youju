let workerPromise: Promise<any> | null = null
let activeLogger: ((m: any) => void) | null = null

async function initWorker() {
  const Tesseract = await import('tesseract.js')
  // Tesseract.js v5+ API: 语言作为第一参数传入 createWorker，不再需要 loadLanguage/initialize
  // 第二参数为 OEM（默认 1），第三参数为 options（包括 logger）
  const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
    logger: (m: any) => {
      if (activeLogger) {
        activeLogger(m)
      }
    },
  })
  return worker
}

export class OcrService {
  private worker: any = null

  /**
   * 预热 Worker，在后台悄悄拉取语言包并初始化引擎，避免点击识别时才开始漫长等待
   */
  async preheat(): Promise<void> {
    try {
      await this.getOrCreateWorker()
      console.log('[OCR] Tesseract Worker 预热完成，已就绪')
    } catch (e) {
      console.error('[OCR] Tesseract Worker 预热失败:', e)
    }
  }

  private async getOrCreateWorker(loggerCallback?: (m: any) => void): Promise<any> {
    if (loggerCallback) {
      activeLogger = loggerCallback
    }

    if (this.worker) {
      return this.worker
    }

    if (workerPromise) {
      return workerPromise
    }

    workerPromise = initWorker()
      .then((w) => {
        this.worker = w
        workerPromise = null
        return w
      })
      .catch((err) => {
        workerPromise = null
        activeLogger = null
        throw err
      })

    return workerPromise
  }

  /**
   * 执行截图文本 OCR 识别
   */
  async recognize(
    file: File,
    onProgress?: (status: string, progress: number) => void,
  ): Promise<{ text: string; confidence: number }> {
    const worker = await this.getOrCreateWorker((m: any) => {
      if (onProgress && m) {
        onProgress(m.status, m.progress || 0)
      }
    })

    const { data } = await worker.recognize(file)

    // 识别完后将进度 Logger 清空，防范内存泄露
    activeLogger = null

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
    }
  }

  /**
   * 在系统退出或卸载时彻底关闭 Worker 释放资源
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
    activeLogger = null
    workerPromise = null
  }
}

export const ocrService = new OcrService()
