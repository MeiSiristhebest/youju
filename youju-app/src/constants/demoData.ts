import type { Source } from '../types'

export const DEMO_SOURCES: Record<string, Source[]> = {
  job: [
    {
      id: 'demo_job_1',
      name: 'HR 微信聊天记录',
      type: 'chat',
      content: `HR: 您好，恭喜您通过面试！
HR: 我们这边薪资是15K，试用期三个月，试用期工资80%
HR: 五险一金都是全额缴纳的
HR: 入职时间大概在下周一
HR: 另外还有年终奖，大概是2-3个月工资
我: 好的，谢谢！那有加班费吗？
HR: 有的，加班费按1.5倍计算
HR: 还有餐补每月500元`,
      meta: '微信聊天',
    },
    {
      id: 'demo_job_2',
      name: '正式 Offer 邮件',
      type: 'doc',
      content: `尊敬的候选人：

恭喜您被我司正式录用！

职位：软件工程师
入职日期：2026年7月15日
薪资待遇：
- 基本工资：14K/月
- 试用期：三个月，试用期工资80%
- 五险一金：按最低标准缴纳
- 年终奖：视公司业绩而定

其他福利：
- 餐补：每月300元
- 年度体检

请于入职当天携带身份证、学历证书等相关材料。`,
      meta: '邮件',
    },
    {
      id: 'demo_job_3',
      name: '劳动合同',
      type: 'contract',
      content: `劳动合同

甲方：XX科技有限公司
乙方：[姓名]

一、合同期限
本合同期限为三年，自2026年7月15日起至2029年7月14日止。

二、劳动报酬
1. 乙方基本工资为13K/月
2. 工资支付日为每月15日
3. 试用期工资按约定工资的80%执行
4. 加班费按国家规定执行

三、社会保险
甲方按照国家规定为乙方缴纳社会保险。

四、其他
本合同未尽事宜，按国家法律法规执行。`,
      meta: '合同',
    },
  ],
  rent: [
    {
      id: 'demo_rent_1',
      name: '中介微信承诺',
      type: 'chat',
      content: `中介: 这套房子特别好，南北通透
中介: 租金每月3500元，押一付三
中介: 物业费包含在租金里
中介: 可以养宠物的，没问题
中介: 家电都是全新的，冰箱空调洗衣机都有
中介: 随时可以入住
中介: 小区环境很好，有游泳池和健身房
我: 那水电费怎么算？
中介: 水电气自理，民用水电`,
      meta: '微信聊天',
    },
    {
      id: 'demo_rent_2',
      name: '房屋租赁合同',
      type: 'contract',
      content: `房屋租赁合同

甲方（出租方）：XXX
乙方（承租方）：XXX

一、房屋基本情况
地址：XX小区XX栋XX室

二、租赁期限
自2026年7月1日起至2027年6月30日止

三、租金及支付方式
1. 租金：每月3600元
2. 押金：7200元（押二付一）
3. 支付方式：押二付一

四、其他费用
1. 物业费：每月200元，由乙方承担
2. 水电气费用由乙方自理
3. 严禁饲养宠物

五、房屋设施
配备基础家具及空调，冰箱洗衣机需承租方自备

六、违约责任
任何一方违约需支付一个月租金作为违约金。`,
      meta: '合同',
    },
  ],
  homework: [
    {
      id: 'demo_hw_1',
      name: '作业要求说明',
      type: 'doc',
      content: `课程作业提交要求

课程名称：数据结构与算法
作业名称：期末大作业

提交要求：
1. 实现至少5种排序算法（冒泡、选择、插入、快速、归并）
2. 每种算法需要包含时间复杂度分析
3. 需要有完整的测试用例
4. 代码需要有详细注释
5. 提交格式：PDF报告 + 源代码
6. 截止日期：2026年7月10日
7. 需要包含算法对比表格

评分标准：
- 算法正确性：40%
- 代码质量：30%
- 报告质量：30%`,
      meta: '课程要求',
    },
    {
      id: 'demo_hw_2',
      name: '学生提交内容',
      type: 'doc',
      content: `数据结构与算法课程作业

实现的算法：
1. 冒泡排序
2. 选择排序
3. 插入排序
4. 快速排序

算法说明：
- 冒泡排序：时间复杂度 O(n²)
- 选择排序：时间复杂度 O(n²)
- 插入排序：时间复杂度 O(n²)
- 快速排序：平均时间复杂度 O(nlogn)

测试用例：
已包含基本测试用例

源代码：
详见附件

注：由于时间原因，归并排序未完成实现。`,
      meta: '学生作业',
    },
  ],
}

export const DEMO_RESULTS: Record<string, any> = {
  job: {
    meta: {
      sourceIds: ['demo_job_1', 'demo_job_2', 'demo_job_3'],
      isIncremental: true,
      newRiskCount: 2,
      durationMs: 4800,
      isMock: true,
    },
    incrementalMeta: {
      affectedSteps: ['要素提取', '冲突检测', '结果校验'],
      recomputedSteps: ['冲突检测', '结果校验'],
      reusedSteps: ['场景识别', '材料解析', '维度提取'],
      change: {
        added: ['补充协议邮件'],
        removed: [],
        modified: ['HR 微信聊天记录'],
      },
      isIncremental: true,
      isFullRecompute: false,
      newRiskCount: 2,
    },
    summary: { critical: 2, warning: 2, info: 1 },
    risks: [
      {
        id: 'risk_1',
        title: '薪资承诺不一致',
        description: 'HR口头承诺薪资15K，但正式Offer写的是14K，劳动合同写的是13K，三者不一致',
        level: 'critical',
        type: 'conflict',
        dimension: '薪资',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件', '劳动合同'],
        evidence: [
          { sourceName: 'HR 微信聊天记录', quote: '我们这边薪资是15K' },
          { sourceName: '正式 Offer 邮件', quote: '基本工资：14K/月' },
          { sourceName: '劳动合同', quote: '乙方基本工资为13K/月' },
        ],
      },
      {
        id: 'risk_2',
        title: '五险一金缴纳标准不一致',
        description: 'HR口头承诺全额缴纳五险一金，但Offer写明按最低标准缴纳',
        level: 'critical',
        type: 'conflict',
        dimension: '福利',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
        evidence: [
          { sourceName: 'HR 微信聊天记录', quote: '五险一金都是全额缴纳的' },
          { sourceName: '正式 Offer 邮件', quote: '五险一金：按最低标准缴纳' },
        ],
      },
      {
        id: 'risk_3',
        title: '年终奖承诺未写入合同',
        description: 'HR口头承诺有2-3个月年终奖，但合同中未提及年终奖相关内容',
        level: 'warning',
        type: 'promise',
        dimension: '奖金',
        sources: ['HR 微信聊天记录', '劳动合同'],
        evidence: [{ sourceName: 'HR 微信聊天记录', quote: '还有年终奖，大概是2-3个月工资' }],
      },
      {
        id: 'risk_4',
        title: '餐补金额不一致',
        description: 'HR口头承诺餐补500元/月，但Offer写的是300元/月',
        level: 'warning',
        type: 'conflict',
        dimension: '福利',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
        evidence: [
          { sourceName: 'HR 微信聊天记录', quote: '还有餐补每月500元' },
          { sourceName: '正式 Offer 邮件', quote: '餐补：每月300元' },
        ],
      },
      {
        id: 'risk_5',
        title: '加班费未明确写入合同',
        description: 'HR口头承诺加班费按1.5倍计算，但合同只写按国家规定执行',
        level: 'info',
        type: 'promise',
        dimension: '加班',
        sources: ['HR 微信聊天记录', '劳动合同'],
        evidence: [{ sourceName: 'HR 微信聊天记录', quote: '加班费按1.5倍计算' }],
      },
    ],
    riskRelations: {
      associations: [
        {
          sourceName: 'HR 微信聊天记录',
          sourceType: 'chat',
          riskIds: ['risk_1', 'risk_2', 'risk_3', 'risk_4', 'risk_5'],
          riskCount: 5,
          isConflict: true,
        },
        {
          sourceName: '正式 Offer 邮件',
          sourceType: 'doc',
          riskIds: ['risk_1', 'risk_2', 'risk_4'],
          riskCount: 3,
          isConflict: true,
        },
        {
          sourceName: '劳动合同',
          sourceType: 'contract',
          riskIds: ['risk_1', 'risk_3', 'risk_5'],
          riskCount: 3,
          isConflict: false,
        },
      ],
      relatedRiskIds: {
        risk_1: ['risk_2', 'risk_4'],
        risk_2: ['risk_1', 'risk_4'],
        risk_3: ['risk_5'],
        risk_4: ['risk_1', 'risk_2'],
        risk_5: ['risk_3'],
      },
      conflictPairs: [
        { risk1Id: 'risk_1', risk2Id: 'risk_2', reason: '同一份聊天记录与Offer存在多处不一致' },
      ],
    },
    alignedVersion:
      '综合各材料，建议确认以下事项：\n1. 薪资标准以合同为准还是以口头承诺为准\n2. 五险一金缴纳基数确认\n3. 年终奖是否写入合同',
    checklist: [
      {
        id: 'check_1',
        text: '确认最终薪资数额',
        checked: false,
        riskType: 'conflict',
        dimension: '薪资',
        hasDraft: true,
      },
      {
        id: 'check_2',
        text: '确认五险一金缴纳基数',
        checked: false,
        riskType: 'conflict',
        dimension: '福利',
        hasDraft: true,
      },
      {
        id: 'check_3',
        text: '要求将年终奖写入合同',
        checked: false,
        riskType: 'promise',
        dimension: '奖金',
        hasDraft: true,
      },
      {
        id: 'check_4',
        text: '确认餐补金额',
        checked: false,
        riskType: 'conflict',
        dimension: '福利',
        hasDraft: false,
      },
      {
        id: 'check_5',
        text: '确认加班费计算方式',
        checked: false,
        riskType: 'promise',
        dimension: '加班',
        hasDraft: false,
      },
    ],
    extractedEntities: {
      dates: [
        { value: '2026年7月15日', source: '正式 Offer 邮件' },
        { value: '下周一', source: 'HR 微信聊天记录' },
      ],
      amounts: [
        { value: '15K', source: 'HR 微信聊天记录' },
        { value: '14K', source: '正式 Offer 邮件' },
        { value: '13K', source: '劳动合同' },
        { value: '2-3个月', source: 'HR 微信聊天记录' },
        { value: '500元', source: 'HR 微信聊天记录' },
        { value: '300元', source: '正式 Offer 邮件' },
      ],
      terms: [],
      promises: [
        { value: '全额缴纳五险一金', source: 'HR 微信聊天记录' },
        { value: '年终奖2-3个月', source: 'HR 微信聊天记录' },
        { value: '加班费1.5倍', source: 'HR 微信聊天记录' },
      ],
    },
    reasoningTrace: [
      {
        title: '场景识别',
        description: '识别到这是一个求职Offer确认场景，包含微信聊天、邮件和合同三种材料',
      },
      { title: '材料解析', description: '从三份材料中提取了薪资、福利、奖金等关键信息' },
      { title: '维度提取', description: '确定了薪资、福利、奖金、加班等需要对比的维度' },
      {
        title: '要素提取',
        description: '从各材料中提取了薪资数额、五险一金标准、年终奖承诺等要素',
      },
      {
        title: '冲突检测',
        description: '发现薪资数额在三份材料中不一致，五险一金缴纳标准也存在矛盾',
      },
      {
        title: '结果校验',
        description: '验证了每个冲突点的证据链，确认HR口头承诺与书面文件存在多处不一致',
      },
      { title: '报告生成', description: '整理分析结果，生成风险清单和检查清单' },
    ],
    debugInfo: {
      model: 'gpt-4',
      tokenPrompt: 3200,
      tokenCompletion: 1500,
      tokenTotal: 4700,
    },
    preferences: {
      riskWeights: {
        dimensionWeights: { salary: 85, benefit: 72, bonus: 68, overtime: 55, term: 45 },
        typeWeights: { conflict: 90, promise: 75, missing: 60, info: 30 },
        totalChecks: 42,
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      draftStyle: {
        formality: 65,
        friendliness: 70,
        conciseness: 55,
        directness: 60,
        totalCopies: 28,
        totalEdits: 15,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        preferredTone: '专业友好型',
      },
    },
  },
  rent: {
    meta: { sourceIds: ['demo_rent_1', 'demo_rent_2'], durationMs: 3200, isMock: true },
    incrementalMeta: {
      affectedSteps: ['冲突检测', '结果校验'],
      recomputedSteps: ['冲突检测', '结果校验'],
      reusedSteps: ['场景识别', '材料解析', '维度提取', '要素提取'],
      change: { added: [], removed: [], modified: ['房屋租赁合同'] },
      isIncremental: true,
      isFullRecompute: false,
      newRiskCount: 1,
    },
    summary: { critical: 2, warning: 2, info: 1 },
    risks: [
      {
        id: 'risk_1',
        title: '租金金额不一致',
        description: '中介口头承诺租金3500元/月，但合同写的是3600元/月',
        level: 'critical',
        type: 'conflict',
        dimension: '租金',
        sources: ['中介微信承诺', '房屋租赁合同'],
        evidence: [
          { sourceName: '中介微信承诺', quote: '租金每月3500元' },
          { sourceName: '房屋租赁合同', quote: '租金：每月3600元' },
        ],
      },
      {
        id: 'risk_2',
        title: '押金方式不一致',
        description: '中介说押一付三，但合同写的是押二付一',
        level: 'critical',
        type: 'conflict',
        dimension: '押金',
        sources: ['中介微信承诺', '房屋租赁合同'],
        evidence: [
          { sourceName: '中介微信承诺', quote: '押一付三' },
          { sourceName: '房屋租赁合同', quote: '押二付一' },
        ],
      },
      {
        id: 'risk_3',
        title: '宠物政策不一致',
        description: '中介说可以养宠物，但合同明确禁止饲养宠物',
        level: 'warning',
        type: 'conflict',
        dimension: '规则',
        sources: ['中介微信承诺', '房屋租赁合同'],
        evidence: [
          { sourceName: '中介微信承诺', quote: '可以养宠物的，没问题' },
          { sourceName: '房屋租赁合同', quote: '严禁饲养宠物' },
        ],
      },
      {
        id: 'risk_4',
        title: '物业费未包含在租金中',
        description: '中介说物业费包含在租金里，但合同要求另行支付200元/月',
        level: 'warning',
        type: 'conflict',
        dimension: '费用',
        sources: ['中介微信承诺', '房屋租赁合同'],
        evidence: [
          { sourceName: '中介微信承诺', quote: '物业费包含在租金里' },
          { sourceName: '房屋租赁合同', quote: '物业费：每月200元，由乙方承担' },
        ],
      },
      {
        id: 'risk_5',
        title: '家电配置不足',
        description: '中介说家电都是全新的，但合同只配备空调，冰箱洗衣机需自备',
        level: 'info',
        type: 'conflict',
        dimension: '设施',
        sources: ['中介微信承诺', '房屋租赁合同'],
        evidence: [
          { sourceName: '中介微信承诺', quote: '家电都是全新的，冰箱空调洗衣机都有' },
          { sourceName: '房屋租赁合同', quote: '配备基础家具及空调，冰箱洗衣机需承租方自备' },
        ],
      },
    ],
    riskRelations: {
      associations: [
        {
          sourceName: '中介微信承诺',
          sourceType: 'chat',
          riskIds: ['risk_1', 'risk_2', 'risk_3', 'risk_4', 'risk_5'],
          riskCount: 5,
          isConflict: true,
        },
        {
          sourceName: '房屋租赁合同',
          sourceType: 'contract',
          riskIds: ['risk_1', 'risk_2', 'risk_3', 'risk_4', 'risk_5'],
          riskCount: 5,
          isConflict: false,
        },
      ],
      relatedRiskIds: {
        risk_1: ['risk_2', 'risk_4'],
        risk_2: ['risk_1'],
        risk_3: ['risk_5'],
        risk_4: ['risk_1'],
        risk_5: ['risk_3'],
      },
      conflictPairs: [{ risk1Id: 'risk_1', risk2Id: 'risk_2', reason: '租金与押金条款紧密相关' }],
    },
    alignedVersion:
      '综合各材料，建议确认以下事项：\n1. 租金最终金额\n2. 押金支付方式\n3. 宠物饲养政策\n4. 物业费承担方式\n5. 家电配置清单',
    checklist: [
      {
        id: 'check_1',
        text: '确认租金最终金额',
        checked: false,
        riskType: 'conflict',
        dimension: '租金',
      },
      {
        id: 'check_2',
        text: '确认押金支付方式',
        checked: false,
        riskType: 'conflict',
        dimension: '押金',
      },
      {
        id: 'check_3',
        text: '确认宠物饲养政策',
        checked: false,
        riskType: 'conflict',
        dimension: '规则',
      },
      {
        id: 'check_4',
        text: '确认物业费承担方式',
        checked: false,
        riskType: 'conflict',
        dimension: '费用',
      },
      {
        id: 'check_5',
        text: '确认家电配置清单',
        checked: false,
        riskType: 'conflict',
        dimension: '设施',
      },
    ],
    extractedEntities: {
      dates: [],
      amounts: [
        { value: '3500元', source: '中介微信承诺' },
        { value: '3600元', source: '房屋租赁合同' },
        { value: '200元', source: '房屋租赁合同' },
        { value: '7200元', source: '房屋租赁合同' },
      ],
      terms: [],
      promises: [],
    },
    reasoningTrace: [
      {
        title: '场景识别',
        description: '识别到这是一个租房签约场景，包含中介微信聊天和租赁合同两种材料',
      },
      { title: '材料解析', description: '从两份材料中提取了租金、押金、费用、设施等关键信息' },
      { title: '维度提取', description: '确定了租金、押金、规则、费用、设施等需要对比的维度' },
      {
        title: '要素提取',
        description: '从各材料中提取了租金数额、押金方式、宠物政策、物业费承担、家电配置等要素',
      },
      {
        title: '冲突检测',
        description: '发现租金金额、押金方式、宠物政策、物业费承担等多处不一致',
      },
      {
        title: '结果校验',
        description: '验证了每个冲突点的证据链，确认中介口头承诺与合同条款存在多处矛盾',
      },
      { title: '报告生成', description: '整理分析结果，生成风险清单和检查清单' },
    ],
    debugInfo: {
      model: 'gpt-4',
      tokenPrompt: 2800,
      tokenCompletion: 1200,
      tokenTotal: 4000,
    },
  },
  homework: {
    meta: { sourceIds: ['demo_hw_1', 'demo_hw_2'], durationMs: 2400, isMock: true },
    incrementalMeta: {
      affectedSteps: ['要素提取', '冲突检测'],
      recomputedSteps: ['要素提取', '冲突检测'],
      reusedSteps: ['场景识别', '材料解析', '维度提取', '结果校验'],
      change: { added: ['学生补充说明'], removed: [], modified: [] },
      isIncremental: true,
      isFullRecompute: false,
      newRiskCount: 0,
    },
    summary: { critical: 1, warning: 1, info: 1 },
    risks: [
      {
        id: 'risk_1',
        title: '算法数量不足',
        description: '作业要求实现至少5种排序算法，但学生只实现了4种，缺少归并排序',
        level: 'critical',
        type: 'missing',
        dimension: '内容',
        sources: ['作业要求说明', '学生提交内容'],
        evidence: [
          {
            sourceName: '作业要求说明',
            quote: '实现至少5种排序算法（冒泡、选择、插入、快速、归并）',
          },
          { sourceName: '学生提交内容', quote: '由于时间原因，归并排序未完成实现' },
        ],
      },
      {
        id: 'risk_2',
        title: '缺少算法对比表格',
        description: '作业要求包含算法对比表格，但学生提交内容中未包含',
        level: 'warning',
        type: 'missing',
        dimension: '格式',
        sources: ['作业要求说明', '学生提交内容'],
        evidence: [{ sourceName: '作业要求说明', quote: '需要包含算法对比表格' }],
      },
      {
        id: 'risk_3',
        title: '测试用例不够详细',
        description: '作业要求有完整的测试用例，但学生只说明"已包含基本测试用例"',
        level: 'info',
        type: 'missing',
        dimension: '内容',
        sources: ['作业要求说明', '学生提交内容'],
        evidence: [
          { sourceName: '作业要求说明', quote: '需要有完整的测试用例' },
          { sourceName: '学生提交内容', quote: '已包含基本测试用例' },
        ],
      },
    ],
    riskRelations: {
      associations: [
        {
          sourceName: '作业要求说明',
          sourceType: 'doc',
          riskIds: ['risk_1', 'risk_2', 'risk_3'],
          riskCount: 3,
          isConflict: false,
        },
        {
          sourceName: '学生提交内容',
          sourceType: 'doc',
          riskIds: ['risk_1', 'risk_2', 'risk_3'],
          riskCount: 3,
          isConflict: false,
        },
      ],
      relatedRiskIds: {
        risk_1: ['risk_3'],
        risk_2: ['risk_1'],
        risk_3: ['risk_1'],
      },
      conflictPairs: [],
    },
    alignedVersion:
      '综合各材料，建议补充以下内容：\n1. 补充归并排序的实现\n2. 添加算法对比表格\n3. 完善测试用例',
    checklist: [
      {
        id: 'check_1',
        text: '补充归并排序实现',
        checked: false,
        riskType: 'missing',
        dimension: '内容',
      },
      {
        id: 'check_2',
        text: '添加算法对比表格',
        checked: false,
        riskType: 'missing',
        dimension: '格式',
      },
      {
        id: 'check_3',
        text: '完善测试用例',
        checked: false,
        riskType: 'missing',
        dimension: '内容',
      },
    ],
    extractedEntities: {
      dates: [{ value: '2026年7月10日', source: '作业要求说明' }],
      amounts: [
        { value: '5种', source: '作业要求说明' },
        { value: '4种', source: '学生提交内容' },
      ],
      terms: [],
      promises: [],
    },
    reasoningTrace: [
      {
        title: '场景识别',
        description: '识别到这是一个作业提交检查场景，包含作业要求和学生提交内容两种材料',
      },
      { title: '材料解析', description: '从两份材料中提取了作业要求和学生实际提交的内容' },
      { title: '维度提取', description: '确定了内容完整性、格式要求、测试用例等需要检查的维度' },
      { title: '要素提取', description: '提取了算法数量、测试用例、报告格式等关键要素' },
      { title: '冲突检测', description: '发现算法数量不足、缺少对比表格、测试用例不够详细等问题' },
      { title: '结果校验', description: '验证了每个问题的证据链，确认学生提交内容与要求存在差异' },
      { title: '报告生成', description: '整理分析结果，生成风险清单和检查清单' },
    ],
    debugInfo: {
      model: 'gpt-4',
      tokenPrompt: 2500,
      tokenCompletion: 800,
      tokenTotal: 3300,
    },
  },
}

export const DEMO_INCREMENTAL_FLOW = {
  initialSources: ['demo_job_1', 'demo_job_2'],
  initialResult: {
    meta: {
      sourceIds: ['demo_job_1', 'demo_job_2'],
      isIncremental: false,
      durationMs: 3500,
      isMock: true,
    },
    summary: { critical: 2, warning: 2, info: 1 },
    risks: [
      {
        id: 'risk_1',
        title: '薪资承诺不一致',
        description: 'HR口头承诺薪资15K，但正式Offer写的是14K',
        level: 'critical',
        type: 'conflict',
        dimension: '薪资',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
        evidence: [
          { sourceName: 'HR 微信聊天记录', quote: '我们这边薪资是15K' },
          { sourceName: '正式 Offer 邮件', quote: '基本工资：14K/月' },
        ],
      },
      {
        id: 'risk_2',
        title: '五险一金缴纳标准不一致',
        description: 'HR口头承诺全额缴纳五险一金，但Offer写明按最低标准缴纳',
        level: 'critical',
        type: 'conflict',
        dimension: '福利',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
        evidence: [
          { sourceName: 'HR 微信聊天记录', quote: '五险一金都是全额缴纳的' },
          { sourceName: '正式 Offer 邮件', quote: '五险一金：按最低标准缴纳' },
        ],
      },
      {
        id: 'risk_3',
        title: '年终奖承诺未写入',
        description: 'HR口头承诺有2-3个月年终奖，但Offer中未提及',
        level: 'warning',
        type: 'promise',
        dimension: '奖金',
        sources: ['HR 微信聊天记录'],
        evidence: [{ sourceName: 'HR 微信聊天记录', quote: '还有年终奖，大概是2-3个月工资' }],
      },
      {
        id: 'risk_4',
        title: '餐补金额不一致',
        description: 'HR口头承诺餐补500元/月，但Offer写的是300元/月',
        level: 'warning',
        type: 'conflict',
        dimension: '福利',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
        evidence: [
          { sourceName: 'HR 微信聊天记录', quote: '还有餐补每月500元' },
          { sourceName: '正式 Offer 邮件', quote: '餐补：每月300元' },
        ],
      },
    ],
    checklist: [
      {
        id: 'check_1',
        text: '确认薪资数额',
        checked: false,
        riskType: 'conflict',
        dimension: '薪资',
      },
      {
        id: 'check_2',
        text: '确认五险一金缴纳基数',
        checked: false,
        riskType: 'conflict',
        dimension: '福利',
      },
      {
        id: 'check_3',
        text: '确认年终奖政策',
        checked: false,
        riskType: 'promise',
        dimension: '奖金',
      },
      {
        id: 'check_4',
        text: '确认餐补金额',
        checked: false,
        riskType: 'conflict',
        dimension: '福利',
      },
    ],
  },
  addedSource: 'demo_job_3',
  incrementalResult: DEMO_RESULTS.job,
  prediction: {
    isIncremental: true,
    estimatedAffectedRiskCount: 3,
    estimatedNewRiskCount: 2,
    estimatedRecomputedSteps: ['要素提取', '冲突检测', '结果校验'],
    estimatedTimeSavingPercent: 57,
  },
  timeComparison: {
    fullAnalysisTime: 6500,
    incrementalAnalysisTime: 2800,
    timeSavedPercent: 57,
  },
}

export const DEMO_CACHE_HIT_DATA = {
  cacheKey: 'job_demo_job_1_demo_job_2_demo_job_3_hash123',
  cachedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  cacheDurationMs: 15,
  fullDurationMs: 4800,
  timeSavedPercent: 99,
}

export const DEMO_HISTORY = [
  {
    id: 'demo_task_001',
    title: '求职 Offer 确认',
    scenarioType: 'job',
    sourceCount: 3,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isIncremental: true,
    cacheHit: false,
    durationMs: 4800,
  },
  {
    id: 'demo_task_002',
    title: '租房签约核对',
    scenarioType: 'rent',
    sourceCount: 2,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isIncremental: false,
    cacheHit: true,
    durationMs: 25,
  },
  {
    id: 'demo_task_003',
    title: '算法作业提交检查',
    scenarioType: 'homework',
    sourceCount: 2,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isIncremental: true,
    cacheHit: false,
    durationMs: 2400,
  },
]

export const DEMO_SYS_STATS = {
  cost: {
    totalTokens: 128450,
    promptTokens: 89320,
    completionTokens: 39130,
    estimatedCost: 0.2568,
  },
  stepPerformance: [
    { step: '场景识别', avgDurationMs: 850, avgTokens: 1200 },
    { step: '材料解析', avgDurationMs: 2100, avgTokens: 3500 },
    { step: '维度提取', avgDurationMs: 1200, avgTokens: 1800 },
    { step: '要素提取', avgDurationMs: 1800, avgTokens: 2800 },
    { step: '冲突检测', avgDurationMs: 2500, avgTokens: 4200 },
    { step: '结果校验', avgDurationMs: 950, avgTokens: 1500 },
    { step: '报告生成', avgDurationMs: 650, avgTokens: 900 },
  ],
  knowledgeBase: {
    scenarioCount: 12,
    dimensionCount: 48,
    topDimensions: [
      { name: '薪资', count: 156 },
      { name: '福利', count: 128 },
      { name: '期限', count: 95 },
      { name: '金额', count: 87 },
      { name: '违约', count: 72 },
    ],
  },
  incrementalStats: {
    totalIncrementalAnalyses: 156,
    totalFullAnalyses: 89,
    averageTimeSavingPercent: 45,
    cacheHitRate: 0.68,
    averageCacheDurationMs: 23,
  },
}
