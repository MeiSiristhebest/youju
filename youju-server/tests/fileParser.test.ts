import { describe, expect, it } from 'vitest'
import { detectFileType, getFileTypeLabel } from '../src/infrastructure/fileParser/types.js'

describe('文件类型检测', () => {
  describe('detectFileType', () => {
    it('通过扩展名检测 PDF', () => {
      expect(detectFileType('document.pdf')).toBe('pdf')
      expect(detectFileType('DOCUMENT.PDF')).toBe('pdf')
    })

    it('通过扩展名检测 Word 文档', () => {
      expect(detectFileType('report.docx')).toBe('docx')
      expect(detectFileType('old.doc')).toBe('doc')
    })

    it('通过扩展名检测 PPT 和 Excel', () => {
      expect(detectFileType('slides.pptx')).toBe('pptx')
      expect(detectFileType('slides.ppt')).toBe('pptx')
      expect(detectFileType('data.xlsx')).toBe('xlsx')
      expect(detectFileType('data.xls')).toBe('xlsx')
    })

    it('通过扩展名检测 OpenDocument 格式', () => {
      expect(detectFileType('doc.odt')).toBe('odt')
      expect(detectFileType('pres.odp')).toBe('pptx')
      expect(detectFileType('sheet.ods')).toBe('xlsx')
    })

    it('通过扩展名检测 RTF', () => {
      expect(detectFileType('rich.rtf')).toBe('rtf')
    })

    it('通过扩展名检测文本格式', () => {
      expect(detectFileType('notes.txt')).toBe('txt')
      expect(detectFileType('readme.md')).toBe('md')
      expect(detectFileType('readme.markdown')).toBe('md')
      expect(detectFileType('page.html')).toBe('html')
      expect(detectFileType('page.htm')).toBe('html')
      expect(detectFileType('page.xhtml')).toBe('html')
      expect(detectFileType('data.json')).toBe('json')
      expect(detectFileType('data.csv')).toBe('csv')
    })

    it('通过扩展名检测图片', () => {
      expect(detectFileType('photo.png')).toBe('image')
      expect(detectFileType('photo.jpg')).toBe('image')
      expect(detectFileType('photo.jpeg')).toBe('image')
      expect(detectFileType('photo.gif')).toBe('image')
      expect(detectFileType('photo.bmp')).toBe('image')
      expect(detectFileType('photo.webp')).toBe('image')
    })

    it('通过 mimeType 检测（无扩展名时）', () => {
      expect(detectFileType('noext', 'application/pdf')).toBe('pdf')
      expect(
        detectFileType(
          'noext',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).toBe('docx')
      expect(detectFileType('noext', 'application/vnd.ms-powerpoint')).toBe('pptx')
      expect(detectFileType('noext', 'application/vnd.ms-excel')).toBe('xlsx')
      expect(detectFileType('noext', 'text/plain')).toBe('txt')
      expect(detectFileType('noext', 'text/html')).toBe('html')
      expect(detectFileType('noext', 'application/json')).toBe('json')
      expect(detectFileType('noext', 'text/csv')).toBe('csv')
      expect(detectFileType('noext', 'image/png')).toBe('image')
      expect(detectFileType('noext', 'application/rtf')).toBe('rtf')
    })

    it('扩展名优先于 mimeType', () => {
      expect(detectFileType('file.pdf', 'text/plain')).toBe('pdf')
    })

    it('未知格式返回 unknown', () => {
      expect(detectFileType('file.xyz')).toBe('unknown')
      expect(detectFileType('noext')).toBe('unknown')
      expect(detectFileType('noext', 'application/octet-stream')).toBe('unknown')
    })
  })

  describe('getFileTypeLabel', () => {
    it('返回可读的中文标签', () => {
      expect(getFileTypeLabel('pdf')).toBe('PDF')
      expect(getFileTypeLabel('docx')).toBe('Word 文档')
      expect(getFileTypeLabel('doc')).toBe('Word 旧版')
      expect(getFileTypeLabel('pptx')).toBe('PPT 演示文稿')
      expect(getFileTypeLabel('xlsx')).toBe('Excel 表格')
      expect(getFileTypeLabel('odt')).toBe('OpenDocument 文档')
      expect(getFileTypeLabel('rtf')).toBe('RTF 富文本')
      expect(getFileTypeLabel('txt')).toBe('纯文本')
      expect(getFileTypeLabel('md')).toBe('Markdown')
      expect(getFileTypeLabel('html')).toBe('HTML')
      expect(getFileTypeLabel('json')).toBe('JSON')
      expect(getFileTypeLabel('csv')).toBe('CSV')
      expect(getFileTypeLabel('image')).toBe('图片')
      expect(getFileTypeLabel('unknown')).toBe('未知格式')
    })
  })
})
