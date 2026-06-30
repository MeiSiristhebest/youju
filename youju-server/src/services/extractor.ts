// ponytail: simple web content extractor
import * as cheerio from 'cheerio'

export async function extractFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; YoujuBot/1.0)'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  // Remove script, style, nav, footer
  $('script, style, nav, footer, header, aside').remove()

  // Get main content
  const text = $('main, article, .content, #content, body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()

  return text.substring(0, 5000) // ponytail: limit length
}
