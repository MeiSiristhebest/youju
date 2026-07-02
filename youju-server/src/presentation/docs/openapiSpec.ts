// OpenAPI 3.0 规范 — 手动维护，基于 Zod schemas 定义
// 访问 /api/docs 查看 Swagger UI，/api/openapi.json 获取原始 JSON

export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    description: string
    version: string
    contact?: { name: string; email: string }
  }
  servers: Array<{ url: string; description: string }>
  tags: Array<{ name: string; description: string }>
  paths: Record<string, any>
  components: {
    securitySchemes: Record<string, any>
    schemas: Record<string, any>
    responses: Record<string, any>
  }
}

export function createOpenAPISpec(): OpenAPISpec {
  return {
    openapi: '3.0.3',
    info: {
      title: '有据 (YouJu) API',
      description: 'AI 驱动的材料对比分析平台 — 提供风险检测、话术生成、证据溯源等能力',
      version: '1.0.0',
      contact: { name: 'YouJu Team', email: 'support@youju.app' },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
      { url: '/api', description: '兼容路径' },
    ],
    tags: [
      { name: '认证', description: '用户登录、注册、Token 管理' },
      { name: '素材', description: '材料输入：文本、文件上传、URL 抓取' },
      { name: '分析', description: 'AI 风险分析、增量分析、流水线管理' },
      { name: '任务', description: '分析任务的创建、查询、管理' },
      { name: '分享', description: '分析报告分享链接管理' },
      { name: '偏好', description: '用户偏好设置与反馈记录' },
      { name: '场景', description: '预设场景管理' },
      { name: '运维', description: '健康检查、数据库运维、统计' },
    ],
    paths: {
      // ============================================================
      // 认证
      // ============================================================
      '/auth/wechat': {
        post: {
          tags: ['认证'],
          summary: '微信登录（Mock）',
          description: '通过微信 code 登录，返回 JWT token 和用户信息',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthWechatInput' },
              },
            },
          },
          responses: {
            '200': {
              description: '登录成功',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
              },
            },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
      },
      '/user/info': {
        get: {
          tags: ['认证'],
          summary: '获取当前用户信息',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: '用户信息',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/UserInfoResponse' } },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // ============================================================
      // 素材
      // ============================================================
      '/sources/text': {
        post: {
          tags: ['素材'],
          summary: '创建文本素材',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SourceTextInput' } },
            },
          },
          responses: {
            '200': {
              description: '创建成功',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/SourceResponse' } },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/sources/parse': {
        post: {
          tags: ['素材'],
          summary: '解析文件预览（不存储）',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': { schema: { $ref: '#/components/schemas/FileUpload' } },
            },
          },
          responses: {
            '200': {
              description: '解析成功',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ParseResult' } },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/sources/upload': {
        post: {
          tags: ['素材'],
          summary: '上传文件素材',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': { schema: { $ref: '#/components/schemas/FileUpload' } },
            },
          },
          responses: {
            '200': {
              description: '上传成功',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/SourceResponse' } },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/sources/url': {
        post: {
          tags: ['素材'],
          summary: 'URL 抓取素材',
          description: '抓取网页内容并创建素材，内置 SSRF 防护',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SourceUrlInput' } },
            },
          },
          responses: {
            '200': {
              description: '抓取成功',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/SourceResponse' } },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
      },
      '/sources': {
        get: {
          tags: ['素材'],
          summary: '获取素材列表',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          responses: {
            '200': {
              description: '素材列表',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Source' } },
                },
              },
            },
          },
        },
      },
      '/sources/{id}': {
        delete: {
          tags: ['素材'],
          summary: '删除素材',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: '删除成功' },
          },
        },
      },

      // ============================================================
      // 分析
      // ============================================================
      '/analyze': {
        post: {
          tags: ['分析'],
          summary: '执行 AI 风险分析',
          description:
            '对指定素材执行 7 步 AI 分析流水线：场景发现 → 输入解析 → 维度发现 → 跨源提取 → 差异检测 → 自检循环 → 最终输出',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AnalyzeInput' } },
            },
          },
          responses: {
            '200': {
              description: '分析完成',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AnalysisResult' } },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
      },
      '/analyze/incremental': {
        post: {
          tags: ['分析'],
          summary: '增量分析',
          description: '基于已有结果，仅分析新增/变更的素材',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          responses: {
            '200': { description: '增量分析完成' },
          },
        },
      },
      '/analyze/cache-stats': {
        get: {
          tags: ['分析'],
          summary: '分析缓存统计',
          responses: { '200': { description: '缓存统计信息' } },
        },
      },
      '/analyze/cache': {
        delete: {
          tags: ['分析'],
          summary: '清除分析缓存',
          responses: { '200': { description: '缓存已清除' } },
        },
      },
      '/analyze/task/{taskId}': {
        get: {
          tags: ['分析'],
          summary: '获取异步分析任务状态',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: '任务状态' } },
        },
      },

      // ============================================================
      // 任务
      // ============================================================
      '/tasks': {
        get: {
          tags: ['任务'],
          summary: '获取任务列表',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          responses: {
            '200': {
              description: '任务列表',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/TaskSummary' } },
                },
              },
            },
          },
        },
        post: {
          tags: ['任务'],
          summary: '创建分析任务',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TaskCreateInput' } },
            },
          },
          responses: {
            '200': { description: '创建成功' },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/tasks/{id}': {
        get: {
          tags: ['任务'],
          summary: '获取任务详情',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: '任务详情' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['任务'],
          summary: '删除任务',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: '删除成功' } },
        },
      },
      '/tasks/{id}/checklist': {
        get: {
          tags: ['任务'],
          summary: '获取清单状态',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: '清单状态' } },
        },
        put: {
          tags: ['任务'],
          summary: '更新清单状态',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ChecklistUpdateInput' } },
            },
          },
          responses: {
            '200': { description: '更新成功' },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/report/{taskId}': {
        get: {
          tags: ['任务'],
          summary: '获取分析报告',
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: '分析报告',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AnalysisResult' } },
              },
            },
          },
        },
      },

      // ============================================================
      // 分享
      // ============================================================
      '/share/{taskId}': {
        post: {
          tags: ['分享'],
          summary: '创建分享链接',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ShareCreateInput' } },
            },
          },
          responses: { '200': { description: '分享链接创建成功' } },
        },
        delete: {
          tags: ['分享'],
          summary: '删除分享链接',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ShareDeleteInput' } },
            },
          },
          responses: { '200': { description: '删除成功' } },
        },
      },
      '/share/token/{token}': {
        get: {
          tags: ['分享'],
          summary: '通过 token 获取分享内容',
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: '分享内容' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/share/task/{taskId}': {
        get: {
          tags: ['分享'],
          summary: '获取任务的所有分享',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: '分享列表' } },
        },
      },

      // ============================================================
      // 偏好
      // ============================================================
      '/preferences': {
        get: {
          tags: ['偏好'],
          summary: '获取用户偏好',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          responses: { '200': { description: '偏好设置' } },
        },
      },
      '/preferences/checklist-action': {
        post: {
          tags: ['偏好'],
          summary: '记录清单操作偏好',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChecklistPreferenceInput' },
              },
            },
          },
          responses: {
            '200': { description: '记录成功' },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/preferences/draft-copy': {
        post: {
          tags: ['偏好'],
          summary: '记录话术复制偏好',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DraftCopyInput' } },
            },
          },
          responses: { '200': { description: '记录成功' } },
        },
      },
      '/preferences/draft-edit': {
        post: {
          tags: ['偏好'],
          summary: '记录话术编辑偏好',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DraftEditInput' } },
            },
          },
          responses: { '200': { description: '记录成功' } },
        },
      },
      '/preferences/risk-feedback': {
        post: {
          tags: ['偏好'],
          summary: '记录风险反馈',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RiskFeedbackInput' } },
            },
          },
          responses: {
            '200': { description: '反馈成功' },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },

      // ============================================================
      // 场景
      // ============================================================
      '/scenarios': {
        get: {
          tags: ['场景'],
          summary: '获取预设场景列表',
          responses: { '200': { description: '场景列表' } },
        },
      },
      '/scenarios/{id}/init': {
        post: {
          tags: ['场景'],
          summary: '初始化预设场景',
          security: [{ BearerAuth: [] }, { SessionAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: '场景已初始化' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ============================================================
      // 运维
      // ============================================================
      '/health': {
        get: {
          tags: ['运维'],
          summary: '健康检查',
          responses: { '200': { description: '服务状态' } },
        },
      },
      '/admin/stats': {
        get: {
          tags: ['运维'],
          summary: '系统统计',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: '统计数据' } },
        },
      },
      '/admin/db-stats': {
        get: {
          tags: ['运维'],
          summary: '数据库统计',
          responses: { '200': { description: '数据库统计' } },
        },
      },
      '/admin/backups': {
        get: {
          tags: ['运维'],
          summary: '列出备份',
          responses: { '200': { description: '备份列表' } },
        },
        post: {
          tags: ['运维'],
          summary: '手动备份',
          responses: { '200': { description: '备份成功' } },
        },
      },
      '/admin/backups/restore': {
        post: {
          tags: ['运维'],
          summary: '从备份恢复',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { filename: { type: 'string' } },
                  required: ['filename'],
                },
              },
            },
          },
          responses: { '200': { description: '恢复成功' } },
        },
      },
      '/admin/backups/rotate': {
        post: {
          tags: ['运维'],
          summary: '轮转备份',
          responses: { '200': { description: '轮转完成' } },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token，通过 Authorization: Bearer <token> 传递',
        },
        SessionAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Session-Id',
          description: '匿名会话 ID，用于未登录用户的数据隔离',
        },
      },
      responses: {
        BadRequest: {
          description: '请求参数错误',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        ValidationError: {
          description: '参数验证失败',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
            },
          },
        },
        Unauthorized: {
          description: '未授权访问',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        NotFound: {
          description: '资源不存在',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
          },
        },
        RateLimited: {
          description: '请求频率超限',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RateLimitResponse' } },
          },
        },
      },
      schemas: {
        AuthWechatInput: {
          type: 'object',
          properties: { code: { type: 'string', maxLength: 200, description: '微信授权 code' } },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 200 },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'JWT token' },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        UserInfoResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 200 },
            data: { $ref: '#/components/schemas/User' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nickname: { type: 'string' },
            avatar: { type: 'string', format: 'uri' },
          },
        },
        SourceTextInput: {
          type: 'object',
          required: ['type', 'name', 'content'],
          properties: {
            type: { type: 'string', maxLength: 50, description: '素材类型（doc/web/text...）' },
            name: { type: 'string', maxLength: 200, description: '素材名称' },
            content: { type: 'string', maxLength: 500000, description: '素材内容' },
          },
        },
        SourceUrlInput: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', format: 'uri', description: '要抓取的 URL' },
            type: { type: 'string', default: 'web' },
            name: { type: 'string', maxLength: 200 },
          },
        },
        FileUpload: {
          type: 'object',
          required: ['file'],
          properties: {
            file: { type: 'string', format: 'binary', description: '上传的文件' },
            type: { type: 'string' },
            name: { type: 'string' },
          },
        },
        Source: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            name: { type: 'string' },
            content: { type: 'string' },
            meta: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SourceResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 200 },
            data: {
              allOf: [
                { $ref: '#/components/schemas/Source' },
                { type: 'object', properties: { sourceId: { type: 'string' } } },
              ],
            },
          },
        },
        ParseResult: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 200 },
            data: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                fileType: { type: 'string' },
                fileTypeLabel: { type: 'string' },
                meta: { type: 'object' },
              },
            },
          },
        },
        AnalyzeInput: {
          type: 'object',
          properties: {
            sourceIds: {
              type: 'array',
              items: { type: 'string' },
              description: '指定分析的素材 ID 列表',
            },
            scenarioType: { type: 'string', default: 'custom', description: '场景类型' },
            taskId: { type: 'string', description: '关联的任务 ID' },
            incremental: { type: 'boolean', description: '是否增量分析' },
          },
        },
        AnalysisResult: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 200 },
            data: {
              type: 'object',
              properties: {
                summary: {
                  type: 'object',
                  properties: {
                    critical: { type: 'integer' },
                    warning: { type: 'integer' },
                    info: { type: 'integer' },
                    total: { type: 'integer' },
                  },
                },
                risks: { type: 'array', items: { $ref: '#/components/schemas/Risk' } },
                checklist: { type: 'array', items: { $ref: '#/components/schemas/ChecklistItem' } },
                alignedVersion: { type: 'string' },
                extractedEntities: { type: 'object' },
              },
            },
          },
        },
        Risk: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            level: { type: 'string', enum: ['critical', 'warning', 'info'] },
            type: { type: 'string', enum: ['conflict', 'promise', 'missing'] },
            description: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            evidence: { type: 'array', items: { type: 'object' } },
            suggestion: { type: 'string' },
          },
        },
        ChecklistItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            checked: { type: 'boolean' },
            riskId: { type: 'string' },
          },
        },
        TaskCreateInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', maxLength: 200 },
            scenarioType: { type: 'string', maxLength: 50 },
            sourceIds: { type: 'array', items: { type: 'string' }, default: [] },
          },
        },
        TaskSummary: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            scenarioType: { type: 'string' },
            sourceCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ChecklistUpdateInput: {
          type: 'object',
          required: ['checkedItems'],
          properties: {
            checkedItems: { type: 'array', items: { type: 'string' } },
          },
        },
        ShareCreateInput: {
          type: 'object',
          properties: {
            expiresInDays: { type: 'integer', minimum: 1, maximum: 30, default: 7 },
          },
        },
        ShareDeleteInput: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', maxLength: 100 },
          },
        },
        ChecklistPreferenceInput: {
          type: 'object',
          required: ['riskType', 'checked'],
          properties: {
            riskType: { type: 'string', maxLength: 50 },
            dimension: { type: 'string', maxLength: 200 },
            checked: { type: 'boolean' },
          },
        },
        DraftCopyInput: {
          type: 'object',
          required: ['riskType'],
          properties: { riskType: { type: 'string', maxLength: 50 } },
        },
        DraftEditInput: {
          type: 'object',
          properties: { editCount: { type: 'integer', minimum: 1, maximum: 1000, default: 1 } },
        },
        RiskFeedbackInput: {
          type: 'object',
          required: ['riskId', 'riskType', 'isAccurate'],
          properties: {
            riskId: { type: 'string', maxLength: 100 },
            riskType: { type: 'string', enum: ['critical', 'warning', 'info'] },
            isAccurate: { type: 'boolean' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 400 },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: '参数验证失败' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      code: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        RateLimitResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 429 },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'RATE_LIMITED' },
                message: { type: 'string', example: '请求过于频繁，请稍后再试' },
                details: {
                  type: 'object',
                  properties: { retryAfter: { type: 'integer' } },
                },
              },
            },
          },
        },
      },
    },
  }
}
