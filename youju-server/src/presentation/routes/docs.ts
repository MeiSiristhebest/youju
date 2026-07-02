import express from 'express'
import { createOpenAPISpec } from '../docs/openapiSpec.js'

const router = express.Router()

// OpenAPI JSON 端点
router.get('/openapi.json', (_req, res) => {
  res.json(createOpenAPISpec())
})

// Swagger UI 页面（使用 CDN，无需安装包）
router.get('/docs', (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>有据 API 文档</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { background-color: #1a1a2e; }
    .swagger-ui .topbar .topbar-wrapper a { color: #e0e0e0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
        docExpansion: 'list',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      })
    }
  </script>
</body>
</html>`
  res.type('text/html').send(html)
})

export default router
