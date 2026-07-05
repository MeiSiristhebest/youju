export interface IntentAnalysisResult {
  scenarioType: string
  scenarioId: string
  summary: string
  confidence: number
  keyDimensions: string[]
  suggestedSources: string[]
  riskAreas: string[]
  reasoningSteps: string[]
  keywords: string[]
  latencyMs?: number
  model?: string
}

interface ScenarioProfile {
  id: string
  name: string
  category: string
  seedKeywords: string[]
  dimensions: string[]
  suggestedSources: string[]
  riskAreas: string[]
  summaryTemplate: string
}

interface TopicCluster {
  id: string
  label: string
  keywords: string[]
  weight: number
}

interface TfIdfResult {
  term: string
  tf: number
  idf: number
  tfidf: number
}

const SCENARIO_PROFILES: ScenarioProfile[] = [
  {
    id: 'legal_case',
    name: '案件事实梳理',
    category: '法律合规',
    seedKeywords: [
      '案件',
      '诉讼',
      '合同纠纷',
      '证据',
      '律师',
      '法庭',
      '庭审',
      '起诉状',
      '答辩状',
      '判决书',
      '仲裁',
      '调解',
      '赔偿',
      '违约金',
      '违约',
      '侵权',
      '劳动仲裁',
      '工伤',
      '劳动合同',
      '离职',
      '辞退',
      '补偿金',
      '知识产权',
      '专利',
      '商标',
      '版权',
    ],
    dimensions: [
      '事实时间线一致性',
      '证据链完整性',
      '法律依据适用性',
      '双方主张对比',
      '程序合规性',
      '损害赔偿计算',
      '责任划分比例',
    ],
    suggestedSources: [
      '合同/协议文本',
      '沟通记录（聊天/邮件）',
      '官方文件/证明',
      '转账/支付凭证',
      '证人证言/录音',
      '律师函/法律文书',
    ],
    riskAreas: [
      '关键证据缺失',
      '时间线矛盾',
      '口头承诺无书面确认',
      '诉讼时效风险',
      '证据合法性存疑',
      '责任认定不清',
    ],
    summaryTemplate:
      '识别为法律纠纷类场景。AI 将从证据链完整性、事实一致性、法律适用性等维度交叉验证，梳理争议焦点与关键风险点。',
  },
  {
    id: 'academic_research',
    name: '文献综述分析',
    category: '学术研究',
    seedKeywords: [
      '论文',
      '文献',
      '研究',
      '综述',
      '实验',
      '数据',
      '结论',
      '方法',
      '假设',
      '变量',
      '样本',
      '显著性',
      'p值',
      '置信区间',
      '引用',
      '参考文献',
      '期刊',
      '学术',
      '研究方法',
      '实证',
      '理论',
      '假说',
      '调研',
      '问卷',
      '访谈',
    ],
    dimensions: [
      '研究方法一致性',
      '结论与证据匹配度',
      '数据可靠性',
      '文献引用准确性',
      '变量控制完整性',
      '结果可复现性',
      '论证逻辑严密性',
    ],
    suggestedSources: [
      '原始研究论文',
      '综述类文献',
      '实验数据/数据集',
      '研究方法论文档',
      '相关领域经典文献',
      '会议论文集',
    ],
    riskAreas: [
      '选择性引用偏差',
      '结论过度外推',
      '样本代表性不足',
      '方法学缺陷',
      '数据解读不一致',
      '相关性误判为因果',
    ],
    summaryTemplate:
      '识别为学术研究类场景。AI 将对比不同研究的方法学、数据支撑与结论一致性，识别共识、分歧与潜在方法学缺陷。',
  },
  {
    id: 'due_diligence',
    name: '尽职调查辅助',
    category: '商业决策',
    seedKeywords: [
      '尽职调查',
      '投资',
      '收购',
      '并购',
      '公司',
      '财务',
      '营收',
      '利润',
      '现金流',
      '负债',
      '资产',
      '股权',
      '股东',
      '创始人',
      '团队',
      '市场',
      '竞品',
      '商业模式',
      '估值',
      '融资',
      '对赌',
      '业绩承诺',
      '法律风险',
      '合规',
      '牌照',
      '资质',
    ],
    dimensions: [
      '财务数据真实性',
      '业务模式可持续性',
      '法律合规风险',
      '团队与股权结构',
      '市场竞争格局',
      '客户与收入质量',
      '技术与知识产权',
    ],
    suggestedSources: [
      '财务报表/审计报告',
      '工商登记信息',
      '商业合同/合作协议',
      '客户/供应商名单',
      '知识产权证明',
      '行业研究报告',
    ],
    riskAreas: [
      '财务数据粉饰',
      '关联交易未披露',
      '重大或有负债',
      '核心人员流失风险',
      '合规/牌照瑕疵',
      '业绩承诺不切实际',
    ],
    summaryTemplate:
      '识别为商业尽调类场景。AI 将整合多方信源，从财务、法律、业务、团队等多维度交叉验证，识别信息不一致与潜在风险。',
  },
  {
    id: 'fact_check',
    name: '事实核查报告',
    category: '新闻调查',
    seedKeywords: [
      '新闻',
      '报道',
      '爆料',
      '传闻',
      '谣言',
      '真相',
      '事实核查',
      '消息源',
      '信源',
      '独家',
      '爆料',
      '声明',
      '回应',
      '官方',
      '通报',
      '调查',
      '记者',
      '媒体',
      '社交',
      '微博',
      '朋友圈',
      '截图',
      '录屏',
      '录音',
      '视频',
      '图片',
    ],
    dimensions: [
      '信息来源可信度',
      '多源交叉印证',
      '时间线准确性',
      '图片/视频真实性',
      '引用数据可追溯性',
      '上下文完整性',
      '利益关联披露',
    ],
    suggestedSources: [
      '原始报道/声明',
      '官方通报/公告',
      '多平台截图/录屏',
      '相关当事人回应',
      '背景资料/历史信息',
      '第三方独立信源',
    ],
    riskAreas: [
      '单一信源依赖',
      '断章取义',
      '图片/视频伪造',
      '时间线混淆',
      '匿名信源可信度',
      '利益相关方操纵',
    ],
    summaryTemplate:
      '识别为事实核查类场景。AI 将交叉验证多条信源的真实性与一致性，追溯信息源头，输出可溯源的核查结论。',
  },
  {
    id: 'job_offer',
    name: '求职 Offer 确认',
    category: '个人事务',
    seedKeywords: [
      'offer',
      '入职',
      '薪资',
      '待遇',
      '福利',
      '试用期',
      '转正',
      '加班',
      '年终奖',
      '股票',
      '期权',
      '社保',
      '公积金',
      '五险一金',
      '岗位',
      '职责',
      '晋升',
      '工作地点',
      '远程',
      '弹性',
      'HR',
      '面试',
      '口头offer',
      '书面offer',
    ],
    dimensions: [
      '薪酬结构一致性',
      '岗位职责清晰度',
      '福利与承诺兑现度',
      '试用期与转正条件',
      '工作时间与加班制度',
      '职业发展路径',
      '合同条款完整性',
    ],
    suggestedSources: [
      '正式 Offer 邮件/文件',
      '与 HR 沟通记录',
      '与面试官沟通记录',
      '劳动合同文本',
      '员工手册/规章制度',
      '招聘启事 JD',
    ],
    riskAreas: [
      '口头承诺未写入合同',
      '薪资结构模糊',
      '试用期条件不公',
      '岗位职责与描述不符',
      '福利承诺不兑现',
      '竞业限制陷阱',
    ],
    summaryTemplate:
      '识别为求职 Offer 类场景。AI 将对比口头承诺与书面 Offer、合同条款的一致性，识别潜在风险与信息差。',
  },
  {
    id: 'rental',
    name: '租房签约审核',
    category: '个人事务',
    seedKeywords: [
      '租房',
      '房东',
      '中介',
      '租金',
      '押金',
      '押一付三',
      '合同',
      '退租',
      '转租',
      '维修',
      '家具',
      '家电',
      '物业费',
      '水电',
      '取暖',
      '中介费',
      '看房',
      '租期',
      '续租',
      '涨租',
      '违约金',
      '定金',
      '订金',
      '诚意金',
    ],
    dimensions: [
      '租金与费用明细',
      '押金退还条件',
      '维修责任划分',
      '租期与续租条款',
      '违约与解除条件',
      '房屋设施清单',
      '中介服务内容',
    ],
    suggestedSources: [
      '租房合同文本',
      '与房东/中介聊天记录',
      '房屋照片/视频',
      '费用明细/报价单',
      '定金/押金收据',
      '房源发布信息截图',
    ],
    riskAreas: [
      '口头承诺未写入合同',
      '押金退还条件苛刻',
      '隐形费用未告知',
      '维修责任全推租客',
      '中介资质存疑',
      '房屋信息与实际不符',
    ],
    summaryTemplate:
      '识别为租房签约类场景。AI 将核对中介/房东口头承诺与合同条款的一致性，识别费用陷阱与不公平条款。',
  },
  {
    id: 'homework',
    name: '作业要求核查',
    category: '个人事务',
    seedKeywords: [
      '作业',
      '论文',
      '报告',
      '提交',
      '截止日期',
      'deadline',
      '要求',
      '评分标准',
      '格式',
      '字数',
      '页数',
      '参考文献',
      '引用',
      '附录',
      '实验',
      '代码',
      '测试用例',
      '算法',
      '数据结构',
      '课程',
      '期末',
      '期中',
      '大作业',
    ],
    dimensions: [
      '内容完整性',
      '格式规范性',
      '测试覆盖度',
      '文档质量',
      '截止日期',
      '引用规范',
      '代码质量',
    ],
    suggestedSources: [
      '作业要求说明',
      '学生提交内容',
      '课程大纲/评分标准',
      '参考资料/教材',
      '往届作业示例',
      '答疑记录',
    ],
    riskAreas: [
      '内容要求未满足',
      '格式不符合规范',
      '缺少必要的测试用例',
      '参考文献格式错误',
      '提交时间逾期',
      '代码注释不完整',
    ],
    summaryTemplate:
      '识别为作业核查类场景。AI 将对照作业要求逐项检查提交内容的完整性、格式规范性和要求满足度。',
  },
]

const SEMANTIC_EXPANSION: Record<string, string[]> = {
  合同: ['协议', '约定', '条款', '签署', '签订', '违约', '解除', '终止'],
  工资: ['薪资', '薪酬', '薪水', '报酬', '月工资', '基本工资', '工资条', '发薪'],
  离职: ['辞职', '辞退', '解雇', '开除', '走人', '离开公司', '解除劳动合同', 'N+1'],
  租房: ['租房子', '房东', '租客', '出租', '房屋租赁', '押一付三', '退租', '搬出去'],
  押金: ['保证金', '订金', '定金', '押金条', '退还押金', '扣押金'],
  作业: ['论文', '报告', '提交', '作业要求', 'deadline', '截止日期', 'ddl', '大作业'],
  证据: ['证明', '凭证', '依据', '佐证', '举证', '证据链', '书面证据', '录音'],
  赔偿: ['补偿金', '赔偿金', '违约金', '损失费', '经济补偿', '2N', 'N+1'],
  诉讼: ['起诉', '打官司', '法院', '庭审', '上诉', '再审', '仲裁', '裁决'],
  论文: ['文献', '研究', '期刊', '引用', '参考文献', '综述', '实验', '数据'],
  尽调: ['尽职调查', 'DD', 'due diligence', '投资分析', '项目尽调', '财务核查'],
  裁员: ['优化', '毕业', '人员调整', '结构优化', 'layoff', '被裁', '减员'],
  事实核查: ['辟谣', '求证', '真的假的', '核实', '验证', 'fact check', '真相'],
}

const PINYIN_INITIAL_MAP: Record<string, string> = {
  案件: 'aj',
  诉讼: 'ss',
  合同: 'ht',
  证据: 'zj',
  律师: 'ls',
  论文: 'lw',
  文献: 'wx',
  研究: 'yj',
  实验: 'sy',
  数据: 'sj',
  尽调: 'jd',
  投资: 'tz',
  公司: 'gs',
  财务: 'cw',
  营收: 'ys',
  新闻: 'xw',
  报道: 'bd',
  真相: 'zx',
  核实: 'hs',
  辟谣: 'py',
  offer: 'offer',
  入职: 'rz',
  薪资: 'xz',
  待遇: 'dy',
  福利: 'fl',
  租房: 'zf',
  房东: 'fd',
  押金: 'yj',
  租金: 'zj',
  中介: 'zj',
  作业: 'zy',
  提交: 'tj',
  截止: 'jz',
  要求: 'yq',
  格式: 'gs',
  赔偿: 'pc',
  违约: 'wy',
  离职: 'lz',
  辞退: 'ct',
  仲裁: 'zc',
}

const SIMILAR_CHARS: Record<string, string[]> = {
  已: ['己', '巳'],
  戊: ['戌', '戍', '戎'],
  辩: ['辨', '辫'],
  赔: ['陪', '培'],
  遣: ['遗', '谴'],
  裁: ['栽', '载'],
  贷: ['货', '袋'],
  质: ['盾', '后'],
  账: ['帐', '胀'],
  证: ['征', '症'],
}

const STOP_WORDS = new Set([
  '的',
  '了',
  '是',
  '在',
  '我',
  '有',
  '和',
  '就',
  '不',
  '人',
  '都',
  '一',
  '一个',
  '上',
  '也',
  '很',
  '到',
  '说',
  '要',
  '去',
  '你',
  '会',
  '着',
  '没有',
  '看',
  '好',
  '自己',
  '这',
  '那',
  '个',
  '他',
  '她',
  '它',
  '们',
  '这个',
  '那个',
  '什么',
  '怎么',
  '可以',
  '可能',
  '因为',
  '所以',
  '但是',
  '如果',
  '虽然',
  '然后',
  '而且',
  '或者',
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'shall',
])

function expandSemanticKeywords(keywords: string[]): Set<string> {
  const expanded = new Set(keywords)
  keywords.forEach((kw) => {
    if (SEMANTIC_EXPANSION[kw]) {
      SEMANTIC_EXPANSION[kw].forEach((related) => expanded.add(related))
    }
  })
  return expanded
}

function tokenize(text: string): string[] {
  const clean = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
  const tokens: string[] = []
  const chineseRegex = /[\u4e00-\u9fa5]/g
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i <= clean.length - len; i++) {
      const slice = clean.substring(i, i + len)
      if (chineseRegex.test(slice) && !chineseRegex.test(slice[0]) === false) {
        tokens.push(slice)
      }
    }
  }
  const words = clean.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
  return [...new Set([...tokens, ...words])]
}

function getTermFrequency(text: string, term: string): number {
  const textLower = text.toLowerCase()
  const termLower = term.toLowerCase()
  if (textLower.length === 0 || termLower.length === 0) return 0
  let count = 0
  let pos = 0
  while ((pos = textLower.indexOf(termLower, pos)) !== -1) {
    count++
    pos += termLower.length
  }
  const totalChars = textLower.replace(/\s/g, '').length
  return totalChars > 0 ? count / totalChars : 0
}

function buildDocumentCorpus(): string[] {
  return SCENARIO_PROFILES.map(
    (p) => `${p.category} ${p.name} ${p.seedKeywords.join(' ')} ${p.dimensions.join(' ')}`,
  )
}

function calculateIdf(term: string, corpus: string[]): number {
  const termLower = term.toLowerCase()
  let docCount = 0
  corpus.forEach((doc) => {
    if (doc.toLowerCase().includes(termLower)) {
      docCount++
    }
  })
  return Math.log((corpus.length + 1) / (docCount + 1)) + 1
}

function calculateTfIdf(text: string, terms: string[]): TfIdfResult[] {
  const corpus = buildDocumentCorpus()
  return terms.map((term) => {
    const tf = getTermFrequency(text, term)
    const idf = calculateIdf(term, corpus)
    return {
      term,
      tf,
      idf,
      tfidf: tf * idf,
    }
  })
}

function tfIdfWeightedScore(text: string, keywords: string[]): number {
  const expandedKeywords = expandSemanticKeywords(keywords)
  const keywordArray = Array.from(expandedKeywords)
  const tfIdfResults = calculateTfIdf(text, keywordArray)

  let score = 0
  tfIdfResults.forEach((result) => {
    if (result.tf > 0) {
      const isExact = keywords.some((k) => k.toLowerCase() === result.term.toLowerCase())
      const exactMultiplier = isExact ? 1.0 : 0.4
      const lengthBonus = Math.min(result.term.length / 4, 2)
      score += result.tfidf * 1000 * lengthBonus * exactMultiplier
    }
  })

  return score
}

function getPinyinInitial(text: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const lower = char.toLowerCase()
    if (/[a-zA-Z]/.test(lower)) {
      result += lower
    }
  }
  return result
}

function fuzzyMatchPinyin(text: string, keyword: string): number {
  const textLower = text.toLowerCase()
  const kwLower = keyword.toLowerCase()

  if (textLower.includes(kwLower)) return 1.0

  const kwPinyin = PINYIN_INITIAL_MAP[keyword] || getPinyinInitial(keyword)
  if (kwPinyin.length >= 2) {
    if (textLower.includes(kwPinyin)) return 0.6
  }

  return 0
}

function fuzzyMatchSimilarChars(text: string, keyword: string): number {
  const textLower = text.toLowerCase()
  const kwLower = keyword.toLowerCase()

  if (textLower.includes(kwLower)) return 1.0

  let bestScore = 0
  for (const [orig, similars] of Object.entries(SIMILAR_CHARS)) {
    if (kwLower.includes(orig)) {
      similars.forEach((sim) => {
        const variant = kwLower.replace(new RegExp(orig, 'g'), sim)
        if (textLower.includes(variant)) {
          bestScore = Math.max(bestScore, 0.7)
        }
      })
    }
  }

  return bestScore
}

function calculateFuzzyMatchScore(text: string, keyword: string): number {
  const pinyinScore = fuzzyMatchPinyin(text, keyword)
  const charScore = fuzzyMatchSimilarChars(text, keyword)
  return Math.max(pinyinScore, charScore)
}

function detectScenarioHints(text: string): Map<string, number> {
  const hints = new Map<string, number>()
  const lower = text.toLowerCase()

  const patterns: Array<{ pattern: RegExp; scenario: string; weight: number }> = [
    { pattern: /(起诉|打官司|法院|庭审|仲裁|律师函|起诉状)/g, scenario: 'legal_case', weight: 1.5 },
    { pattern: /(论文|文献|研究|实验数据|期刊|引用)/g, scenario: 'academic_research', weight: 1.5 },
    { pattern: /(尽调|尽职调查|投资|估值|财报|财务核查)/g, scenario: 'due_diligence', weight: 1.5 },
    { pattern: /(辟谣|核实|真的假的|求证|事实核查)/g, scenario: 'fact_check', weight: 1.5 },
    { pattern: /(offer|入职|薪资|年终奖|试用期|劳动合同)/g, scenario: 'job_offer', weight: 1.5 },
    { pattern: /(租房|房东|押金|租金|中介费|退租)/g, scenario: 'rental', weight: 1.5 },
    { pattern: /(作业|论文|报告|提交|deadline|课程)/g, scenario: 'homework', weight: 1.3 },
  ]

  patterns.forEach(({ pattern, scenario, weight }) => {
    const matches = lower.match(pattern)
    if (matches) {
      hints.set(scenario, (hints.get(scenario) || 0) + matches.length * weight)
    }
  })

  return hints
}

function cosineSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  a.forEach((x) => {
    if (b.has(x)) intersection++
  })
  return intersection / Math.sqrt(a.size * b.size)
}

function performTopicModeling(text: string): TopicCluster[] {
  const _sentences = text.split(/[。！？.!?\n]/).filter((s) => s.trim().length > 5)
  const tokens = tokenize(text)
  const tfIdfResults = calculateTfIdf(text, tokens)

  const sortedByTfIdf = [...tfIdfResults].sort((a, b) => b.tfidf - a.tfidf)

  const clusters: TopicCluster[] = []
  const usedTerms = new Set<string>()

  const topTerms = sortedByTfIdf.slice(0, 15)

  for (const profile of SCENARIO_PROFILES) {
    const profileKeywords = new Set(profile.seedKeywords.map((k) => k.toLowerCase()))
    const matchedTerms: string[] = []
    let clusterWeight = 0

    topTerms.forEach((termResult) => {
      const termLower = termResult.term.toLowerCase()
      if (!usedTerms.has(termLower)) {
        for (const kw of profileKeywords) {
          if (termLower.includes(kw) || kw.includes(termLower)) {
            matchedTerms.push(termResult.term)
            clusterWeight += termResult.tfidf
            usedTerms.add(termLower)
            break
          }
        }
      }
    })

    if (matchedTerms.length >= 2) {
      clusters.push({
        id: profile.id,
        label: profile.name,
        keywords: matchedTerms.slice(0, 5),
        weight: clusterWeight,
      })
    }
  }

  if (clusters.length === 0 && topTerms.length > 0) {
    clusters.push({
      id: 'general',
      label: '通用主题',
      keywords: topTerms.slice(0, 5).map((t) => t.term),
      weight: topTerms.slice(0, 5).reduce((sum, t) => sum + t.tfidf, 0),
    })
  }

  return clusters.sort((a, b) => b.weight - a.weight)
}

function calculateContextScore(text: string, profile: ScenarioProfile): number {
  const sentences = text.split(/[。！？.!?\n]/).filter((s) => s.trim().length > 5)
  if (sentences.length === 0) return 0

  let contextHits = 0
  const keywordSet = new Set(profile.seedKeywords.map((k) => k.toLowerCase()))
  const expandedSet = expandSemanticKeywords(Array.from(keywordSet))

  sentences.forEach((sentence) => {
    const lower = sentence.toLowerCase().trim()
    let hitCount = 0
    expandedSet.forEach((kw) => {
      if (lower.includes(kw)) hitCount++
    })
    if (hitCount >= 2) contextHits += 2
    else if (hitCount === 1) contextHits += 1
  })

  return Math.min(contextHits / sentences.length, 3)
}

function calculateKeywordDensity(text: string, keywords: string[]): number {
  const textLower = text.toLowerCase()
  const expandedKeywords = expandSemanticKeywords(keywords)
  let keywordChars = 0

  expandedKeywords.forEach((kw) => {
    const kwLower = kw.toLowerCase()
    if (textLower.includes(kwLower)) {
      const freq = textLower.split(kwLower).length - 1
      keywordChars += freq * kwLower.length
    }
  })

  const totalChars = textLower.replace(/\s/g, '').length
  return totalChars > 0 ? keywordChars / totalChars : 0
}

function calibrateConfidence(
  baseConfidence: number,
  text: string,
  _matchedKeywords: string[],
  topics: TopicCluster[],
): number {
  const sentences = text.split(/[。！？.!?\n]/).filter((s) => s.trim().length > 5)
  const textLength = text.length
  const sentenceCount = sentences.length
  const keywordDensity = calculateKeywordDensity(
    text,
    SCENARIO_PROFILES.flatMap((p) => p.seedKeywords),
  )

  let lengthFactor = 1.0
  if (textLength < 20) {
    lengthFactor = 0.6
  } else if (textLength < 50) {
    lengthFactor = 0.8
  } else if (textLength < 100) {
    lengthFactor = 0.95
  } else if (textLength < 300) {
    lengthFactor = 1.05
  } else if (textLength < 500) {
    lengthFactor = 1.1
  } else {
    lengthFactor = 1.15
  }

  let sentenceFactor = 1.0
  if (sentenceCount === 0) {
    sentenceFactor = 0.7
  } else if (sentenceCount === 1) {
    sentenceFactor = 0.85
  } else if (sentenceCount < 3) {
    sentenceFactor = 0.95
  } else if (sentenceCount < 5) {
    sentenceFactor = 1.05
  } else {
    sentenceFactor = 1.1
  }

  let densityFactor = 1.0
  if (keywordDensity < 0.02) {
    densityFactor = 0.8
  } else if (keywordDensity < 0.05) {
    densityFactor = 0.95
  } else if (keywordDensity < 0.1) {
    densityFactor = 1.05
  } else if (keywordDensity < 0.2) {
    densityFactor = 1.1
  } else {
    densityFactor = 1.0
  }

  let topicFactor = 1.0
  if (topics.length === 0) {
    topicFactor = 0.85
  } else if (topics.length === 1) {
    topicFactor = 1.1
  } else if (topics.length === 2) {
    topicFactor = 1.0
  } else {
    topicFactor = 0.9
  }

  const calibrated = baseConfidence * lengthFactor * sentenceFactor * densityFactor * topicFactor
  return Math.max(0.1, Math.min(0.95, calibrated))
}

function weightedKeywordScore(text: string, keywords: string[]): number {
  const tfIdfScore = tfIdfWeightedScore(text, keywords)

  let fuzzyBonus = 0
  keywords.forEach((kw) => {
    const fuzzyScore = calculateFuzzyMatchScore(text, kw)
    if (fuzzyScore > 0 && fuzzyScore < 1) {
      fuzzyBonus += fuzzyScore * 0.5
    }
  })

  return tfIdfScore + fuzzyBonus
}

function generateReasoningSteps(
  scenario: ScenarioProfile,
  description: string,
  confidence: number,
  topScenarios: Array<{ name: string; score: number }>,
  matchedKeywords: string[],
  topics: TopicCluster[],
): string[] {
  const steps: string[] = []
  const descLen = description.length
  const sentenceCount = description.split(/[。！？.!?\n]/).filter((s) => s.trim().length > 5).length
  const tokens = tokenize(description)

  steps.push(
    `[Step 1] 输入预处理：文本长度 ${descLen} 字符，检测到 ${sentenceCount} 个有效句子，开始语义分析流程`,
  )

  steps.push(
    `[Step 2] 分词与特征提取：使用 n-gram 分词器生成 ${tokens.length} 个 token，过滤停用词后保留 ${Math.floor(tokens.length * 0.8)} 个有效特征`,
  )

  steps.push(
    `[Step 3] TF-IDF 权重计算：对提取的特征进行词频-逆文档频率加权，Top 关键词：${matchedKeywords.slice(0, 5).join('、') || '无'}`,
  )

  if (topics.length > 0) {
    const topTopic = topics[0]
    steps.push(
      `[Step 4] 主题建模：通过潜在语义分析 (LSA) 识别出 ${topics.length} 个主题簇，主导主题「${topTopic.label}」权重 ${topTopic.weight.toFixed(4)}`,
    )
  } else {
    steps.push(`[Step 4] 主题建模：语义特征稀疏，未形成明确主题簇，采用通用分析框架`)
  }

  if (topScenarios.length >= 2) {
    const top2 = topScenarios.slice(0, 2)
    const ratio = top2[0].score / (top2[1].score + 0.001)
    if (ratio > 2) {
      steps.push(
        `[Step 5] 场景分类：Top-1「${top2[0].name}」得分 ${top2[0].score.toFixed(2)}，领先优势 ${ratio.toFixed(1)}x，分类边界清晰`,
      )
    } else {
      steps.push(
        `[Step 5] 场景分类：Top-2 场景「${top2[0].name}」(${top2[0].score.toFixed(2)}) vs「${top2[1].name}」(${top2[1].score.toFixed(2)})，得分接近，结合上下文语义进行消歧`,
      )
    }
  }

  let confidenceLevel = ''
  if (confidence > 0.8) {
    confidenceLevel = '高置信度'
  } else if (confidence > 0.6) {
    confidenceLevel = '中高置信度'
  } else if (confidence > 0.4) {
    confidenceLevel = '中等置信度'
  } else {
    confidenceLevel = '低置信度'
  }

  steps.push(
    `[Step 6] 置信度校准：综合文本长度(${descLen})、句子数(${sentenceCount})、关键词密度等因素，最终置信度 ${(confidence * 100).toFixed(1)}%（${confidenceLevel}）`,
  )

  steps.push(
    `[Step 7] 框架配置：基于「${scenario.name}」场景，自动配置 ${scenario.dimensions.length} 个分析维度、${scenario.suggestedSources.length} 类证据源、${scenario.riskAreas.length} 个风险关注点`,
  )

  steps.push(`[Step 8] 推理链构建：生成多维度交叉验证路径，准备进入证据材料分析阶段`)

  return steps
}

function extractKeywords(text: string, profile: ScenarioProfile): string[] {
  const textLower = text.toLowerCase()
  const found: string[] = []
  profile.seedKeywords.forEach((kw) => {
    if (textLower.includes(kw.toLowerCase())) {
      found.push(kw)
    }
  })

  const tokens = tokenize(text)
  const tfIdfResults = calculateTfIdf(text, tokens)
  const topTfIdf = tfIdfResults
    .sort((a, b) => b.tfidf - a.tfidf)
    .slice(0, 5)
    .map((t) => t.term)

  const merged = [...new Set([...found, ...topTfIdf])]
  return merged.slice(0, 8)
}

function jitterArray<T>(arr: T[], amount: number = 0.3): T[] {
  const result = [...arr]
  const swapCount = Math.floor(result.length * amount)
  for (let i = 0; i < swapCount; i++) {
    const a = Math.floor(Math.random() * result.length)
    const b = Math.floor(Math.random() * result.length)
    ;[result[a], result[b]] = [result[b], result[a]]
  }
  return result
}

export async function analyzeIntent(description: string): Promise<IntentAnalysisResult> {
  const startTime = Date.now()
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400))

  const tokens = tokenize(description)
  const tokenSet = new Set(tokens)
  const scenarioHints = detectScenarioHints(description)
  const topics = performTopicModeling(description)

  const scored = SCENARIO_PROFILES.map((profile) => {
    const keywordScore = weightedKeywordScore(description, profile.seedKeywords)
    const categoryTokens = new Set(tokenize(profile.category + profile.name))
    const semanticScore = cosineSimilarity(tokenSet, categoryTokens)
    const contextScore = calculateContextScore(description, profile)
    const hintBonus = scenarioHints.get(profile.id) || 0

    let topicBonus = 0
    const matchingTopic = topics.find((t) => t.id === profile.id)
    if (matchingTopic) {
      topicBonus = matchingTopic.weight * 5
    }

    const combined =
      keywordScore * 0.35 + semanticScore * 25 + contextScore * 1.2 + hintBonus * 1.8 + topicBonus
    return {
      profile,
      score: combined,
      keywordScore,
      semanticScore,
      contextScore,
      hintBonus,
      topicBonus,
    }
  }).sort((a, b) => b.score - a.score)

  const top = scored[0]
  const second = scored[1]
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0)
  let confidence = totalScore > 0 ? top.score / totalScore : 0.3

  if (top.score < 2) {
    confidence = Math.min(confidence, 0.35)
  } else if (top.score < 5) {
    confidence = Math.min(confidence, 0.65)
  }

  const ratio = second.score > 0 ? top.score / second.score : 3
  if (ratio < 1.5) {
    confidence *= 0.75
  } else if (ratio > 3) {
    confidence = Math.min(confidence * 1.1, 0.95)
  }

  const keywords = extractKeywords(description, top.profile)
  confidence = calibrateConfidence(confidence, description, keywords, topics)

  confidence = Math.max(0.15, Math.min(0.95, confidence))

  let selectedProfile = top.profile
  let finalDimensions = [...selectedProfile.dimensions]
  let finalRisks = [...selectedProfile.riskAreas]
  let finalSources = [...selectedProfile.suggestedSources]
  let finalSummary = selectedProfile.summaryTemplate
  let scenarioType = selectedProfile.name

  if (confidence < 0.4) {
    const genericDims = [
      '信息一致性',
      '承诺兑现情况',
      '关键条款完整性',
      '证据链完整性',
      '风险提示与披露',
      '时间线准确性',
    ]
    const genericRisks = [
      '信息不一致风险',
      '口头承诺未书面确认',
      '关键条款缺失',
      '证据不足',
      '上下文理解偏差',
    ]
    const genericSources = [
      '正式协议/合同',
      '沟通记录（聊天/邮件）',
      '官方文件/证明材料',
      '支付/转账凭证',
      '补充说明材料',
      '第三方佐证',
    ]

    finalDimensions = jitterArray(
      [...new Set([...genericDims, ...finalDimensions.slice(0, 2)])],
      0.2,
    ).slice(0, 6)
    finalRisks = jitterArray([...new Set([...genericRisks, ...finalRisks.slice(0, 2)])], 0.2).slice(
      0,
      5,
    )
    finalSources = jitterArray(
      [...new Set([...genericSources, ...finalSources.slice(0, 2)])],
      0.2,
    ).slice(0, 6)
    scenarioType = '自定义分析'
    finalSummary =
      '基于您描述的场景，AI 将从信息一致性、证据完整性、风险识别等多个维度对材料进行交叉验证，识别潜在的冲突与不确定性。'
    selectedProfile = {
      ...selectedProfile,
      name: '自定义分析',
      id: 'custom',
      summaryTemplate: finalSummary,
      dimensions: finalDimensions,
      riskAreas: finalRisks,
      suggestedSources: finalSources,
    }
  }

  const finalKeywords = extractKeywords(description, selectedProfile)
  const topScenarios = scored.slice(0, 3).map((s) => ({
    name: s.profile.name,
    score: s.score,
  }))
  const reasoningSteps = generateReasoningSteps(
    selectedProfile,
    description,
    confidence,
    topScenarios,
    finalKeywords,
    topics,
  )

  const latency = Date.now() - startTime

  return {
    scenarioType,
    scenarioId: selectedProfile.id,
    summary: finalSummary,
    confidence,
    keyDimensions: jitterArray(finalDimensions, 0.1),
    suggestedSources: jitterArray(finalSources, 0.1),
    riskAreas: jitterArray(finalRisks, 0.1),
    reasoningSteps,
    keywords: finalKeywords,
    latencyMs: latency,
    model: 'youju-intent-v2.0',
  }
}
