export default {
  name: 'youju-server',
  nodeFunctions: {
    runtime: 'nodejs18',
    timeout: 30,
    memory: 512,
  },
  routes: [
    {
      pattern: '/api/*',
      function: 'api',
    },
  ],
  env: [
    'DATABASE_URL',
    'AI_API_KEY',
    'AI_BASE_URL',
    'AI_MODEL',
    'AI_MAX_CONCURRENCY',
    'JWT_SECRET',
    'ANALYSIS_CACHE_TTL_MS',
    'ANALYSIS_CACHE_MAX_ENTRIES',
    'ENABLE_SCENARIO_PREHEAT',
    'ENABLE_BACKGROUND_JOBS',
  ],
}
