import type { AnalysisDimension, Source } from '../types'

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
      status: 'ready',
      parsedSummary: {
        docType: '微信聊天记录',
        parties: ['HR', '候选人'],
        keyDates: ['下周一（预计入职）'],
        summary:
          'HR口头承诺薪资15K、全额五险一金、2-3个月年终奖、1.5倍加班费、500元餐补，试用期三个月工资80%。',
      },
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
      status: 'ready',
      parsedSummary: {
        docType: '正式录用Offer',
        parties: ['XX科技有限公司', '候选人'],
        keyDates: ['2026年7月15日（入职）'],
        summary:
          'Offer写明基本工资14K/月，五险一金按最低标准缴纳，年终奖视业绩而定，餐补300元/月，试用期三个月工资80%。',
      },
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
      status: 'ready',
      parsedSummary: {
        docType: '劳动合同',
        parties: ['XX科技有限公司（甲方）', '员工（乙方）'],
        keyDates: [
          '2026年7月15日（合同起始）',
          '2029年7月14日（合同终止）',
          '每月15日（工资支付）',
        ],
        summary:
          '劳动合同期限三年，基本工资13K/月，试用期工资80%，加班费按国家规定执行，社会保险按国家规定缴纳。',
      },
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
      status: 'ready',
      parsedSummary: {
        docType: '微信聊天记录',
        parties: ['中介', '租客'],
        keyDates: ['随时可入住'],
        summary:
          '中介口头承诺租金3500元/月押一付三，物业费包含，可养宠物，家电全新（冰箱空调洗衣机），小区有泳池健身房，水电气民用水电自理。',
      },
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
      status: 'ready',
      parsedSummary: {
        docType: '房屋租赁合同',
        parties: ['出租方（甲方）', '承租方（乙方）'],
        keyDates: ['2026年7月1日（起租）', '2027年6月30日（到期）'],
        summary:
          '合同租金3600元/月，押二付一，物业费200元/月乙方承担，严禁养宠物，仅配基础家具及空调，冰箱洗衣机自备，违约金为一个月租金。',
      },
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
      status: 'ready',
      parsedSummary: {
        docType: '课程作业要求',
        parties: ['授课教师', '修课学生'],
        keyDates: ['2026年7月10日（截止日期）'],
        summary:
          '数据结构与算法期末大作业，要求实现至少5种排序算法，含时间复杂度分析、完整测试用例、详细注释，提交PDF报告+源代码，需包含算法对比表格。',
      },
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
      status: 'ready',
      parsedSummary: {
        docType: '学生作业提交',
        parties: ['学生'],
        keyDates: [],
        summary:
          '学生提交了4种排序算法（冒泡、选择、插入、快速），含基本测试用例，缺少归并排序实现和算法对比表格。',
      },
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
        confidence: 95,
        status: 'pending',
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '我们这边薪资是15K',
            highlightedText: '15K',
            confidence: 98,
          },
          {
            sourceName: '正式 Offer 邮件',
            sourceType: 'doc',
            sourceId: 'demo_job_2',
            quote: '基本工资：14K/月',
            highlightedText: '14K/月',
            confidence: 99,
          },
          {
            sourceName: '劳动合同',
            sourceType: 'contract',
            sourceId: 'demo_job_3',
            quote: '乙方基本工资为13K/月',
            highlightedText: '13K/月',
            confidence: 99,
          },
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
        confidence: 92,
        status: 'processing',
        notes: '已发邮件给HR确认五险一金缴纳基数，等待回复中。建议在入职前要求HR提供书面确认。',
        notesUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '五险一金都是全额缴纳的',
            highlightedText: '全额缴纳',
            confidence: 95,
          },
          {
            sourceName: '正式 Offer 邮件',
            sourceType: 'doc',
            sourceId: 'demo_job_2',
            quote: '五险一金：按最低标准缴纳',
            highlightedText: '最低标准缴纳',
            confidence: 98,
          },
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
        confidence: 78,
        status: 'resolved',
        notes:
          'HR确认年终奖根据公司业绩发放，平均水平为2-3个月。虽未写入合同，但属于公司常规操作，风险可接受。',
        notesUpdatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '还有年终奖，大概是2-3个月工资',
            highlightedText: '2-3个月工资',
            confidence: 90,
          },
        ],
      },
      {
        id: 'risk_4',
        title: '餐补金额不一致',
        description: 'HR口头承诺餐补500元/月，但Offer写的是300元/月',
        level: 'warning',
        type: 'conflict',
        dimension: '福利',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
        confidence: 88,
        status: 'pending',
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '还有餐补每月500元',
            highlightedText: '500元',
            confidence: 92,
          },
          {
            sourceName: '正式 Offer 邮件',
            sourceType: 'doc',
            sourceId: 'demo_job_2',
            quote: '餐补：每月300元',
            highlightedText: '300元',
            confidence: 97,
          },
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
        confidence: 65,
        status: 'ignored',
        notes: '国家规定加班费就是1.5倍，合同写法合规，无需担心。',
        notesUpdatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '加班费按1.5倍计算',
            highlightedText: '1.5倍',
            confidence: 85,
          },
        ],
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
    dimensions: [
      {
        id: 'dim_salary',
        name: '薪资',
        description: '工资待遇、基本工资、绩效工资等',
        weight: 5,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 0,
      },
      {
        id: 'dim_benefit',
        name: '福利',
        description: '五险一金、餐补、交通补贴等',
        weight: 4,
        enabled: true,
        riskCount: 2,
        isCustom: false,
        order: 1,
      },
      {
        id: 'dim_bonus',
        name: '奖金',
        description: '年终奖、季度奖、项目奖金等',
        weight: 3,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 2,
      },
      {
        id: 'dim_overtime',
        name: '加班',
        description: '加班费、加班时长、调休等',
        weight: 2,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 3,
      },
      {
        id: 'dim_term',
        name: '期限',
        description: '合同期限、试用期、试用期工资等',
        weight: 3,
        enabled: true,
        riskCount: 0,
        isCustom: false,
        order: 4,
      },
      {
        id: 'dim_content',
        name: '工作内容',
        description: '岗位职责、工作地点、工作时间等',
        weight: 2,
        enabled: false,
        riskCount: 0,
        isCustom: false,
        order: 5,
      },
    ] as AnalysisDimension[],
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
        details:
          '分析输入材料的类型和内容特征：\n1. 检测到微信聊天记录格式 → 判定为口头沟通材料\n2. 检测到邮件格式的Offer → 判定为准官方书面材料\n3. 检测到劳动合同文本 → 判定为法律书面材料\n\n综合判断：求职Offer确认场景，需要重点对比薪资、福利、期限等关键条款。',
        status: 'completed',
        durationMs: 850,
        tokenUsage: 1200,
      },
      {
        title: '材料解析',
        description: '从三份材料中提取了薪资、福利、奖金等关键信息',
        details:
          '使用NLP技术从每份材料中提取结构化信息：\n\n【HR微信聊天记录】\n- 薪资：15K\n- 试用期：3个月，80%工资\n- 五险一金：全额缴纳\n- 年终奖：2-3个月\n- 加班费：1.5倍\n- 餐补：500元/月\n\n【正式Offer邮件】\n- 薪资：14K\n- 试用期：3个月，80%工资\n- 五险一金：最低标准\n- 年终奖：视业绩而定\n- 餐补：300元/月\n\n【劳动合同】\n- 薪资：13K\n- 试用期：3个月，80%工资\n- 五险一金：按国家规定\n- 加班费：按国家规定',
        status: 'completed',
        durationMs: 2100,
        tokenUsage: 3500,
      },
      {
        title: '维度提取',
        description: '确定了薪资、福利、奖金、加班等需要对比的维度',
        details:
          '基于求职场景的知识图谱，提取以下对比维度：\n\n核心维度（高权重）：\n- 薪资待遇 → 权重：0.25\n- 社会保险 → 权重：0.20\n\n重要维度（中权重）：\n- 奖金福利 → 权重：0.15\n- 工作时间 → 权重：0.12\n- 合同期限 → 权重：0.10\n\n一般维度（低权重）：\n- 其他福利 → 权重：0.08\n- 违约责任 → 权重：0.05\n- 争议解决 → 权重：0.05',
        status: 'completed',
        durationMs: 1200,
        tokenUsage: 1800,
      },
      {
        title: '要素提取',
        description: '从各材料中提取了薪资数额、五险一金标准、年终奖承诺等要素',
        details:
          '按维度对各材料的要素进行标准化提取：\n\n【薪资维度】\n- 微信：15K/月（基本工资）\n- Offer：14K/月（基本工资）\n- 合同：13K/月（基本工资）\n\n【社保维度】\n- 微信：全额缴纳五险一金\n- Offer：按最低标准缴纳\n- 合同：按国家规定缴纳\n\n【奖金维度】\n- 微信：年终奖2-3个月工资\n- Offer：视公司业绩而定\n- 合同：未提及\n\n【加班维度】\n- 微信：加班费1.5倍计算\n- Offer：未提及\n- 合同：按国家规定执行',
        status: 'completed',
        durationMs: 1800,
        tokenUsage: 2800,
      },
      {
        title: '冲突检测',
        description: '发现薪资数额在三份材料中不一致，五险一金缴纳标准也存在矛盾',
        details:
          '跨材料对比检测冲突：\n\n🔴 严重冲突（2个）：\n1. 薪资数额不一致\n   - 微信(15K) vs Offer(14K) vs 合同(13K)\n   - 置信度：95%\n   - 影响程度：高\n\n2. 五险一金缴纳标准矛盾\n   - 微信(全额) vs Offer(最低标准)\n   - 置信度：92%\n   - 影响程度：高\n\n🟡 中等冲突（2个）：\n3. 餐补金额不一致\n   - 微信(500元) vs Offer(300元)\n   - 置信度：88%\n   - 影响程度：中\n\n4. 年终奖承诺差异\n   - 微信(2-3个月) vs Offer(视业绩)\n   - 置信度：78%\n   - 影响程度：中\n\n🟢 轻微提示（1个）：\n5. 加班费标准不明确\n   - 微信(1.5倍) vs 合同(按国家规定)\n   - 置信度：65%\n   - 影响程度：低',
        status: 'completed',
        durationMs: 2500,
        tokenUsage: 4200,
      },
      {
        title: '结果校验',
        description: '验证了每个冲突点的证据链，确认HR口头承诺与书面文件存在多处不一致',
        details:
          '交叉验证与置信度评估：\n\n【证据链验证】\n- 每个风险点均有2份以上材料支撑\n- 证据来源类型多样（聊天记录+邮件+合同）\n- 关键数值和表述在原文中可直接定位\n\n【置信度计算】\n- 证据数量权重：35%\n- 证据质量权重：30%（合同>邮件>聊天）\n- 表述明确度权重：25%\n- 一致性程度权重：10%\n\n【总体评估】\n- 高置信度风险（≥80%）：3个\n- 中置信度风险（50-80%）：2个\n- 低置信度风险（<50%）：0个\n\n分析结果可靠，建议用户重点关注薪资和社保问题。',
        status: 'completed',
        durationMs: 950,
        tokenUsage: 1500,
      },
      {
        title: '报告生成',
        description: '整理分析结果，生成风险清单和检查清单',
        details:
          '按照用户偏好的格式生成最终报告：\n\n- 风险清单按严重程度排序\n- 每个风险包含：标题、描述、等级、证据\n- 生成对应的检查清单和建议动作\n- 输出统一版本参照文本\n- 附：关键要素提取结果汇总',
        status: 'completed',
        durationMs: 650,
        tokenUsage: 900,
      },
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
        confidence: 94,
        evidence: [
          {
            sourceName: '中介微信承诺',
            sourceType: 'chat',
            sourceId: 'demo_rent_1',
            quote: '租金每月3500元',
            highlightedText: '3500元',
            confidence: 95,
          },
          {
            sourceName: '房屋租赁合同',
            sourceType: 'contract',
            sourceId: 'demo_rent_2',
            quote: '租金：每月3600元',
            highlightedText: '3600元',
            confidence: 99,
          },
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
        confidence: 93,
        evidence: [
          {
            sourceName: '中介微信承诺',
            sourceType: 'chat',
            sourceId: 'demo_rent_1',
            quote: '押一付三',
            highlightedText: '押一付三',
            confidence: 92,
          },
          {
            sourceName: '房屋租赁合同',
            sourceType: 'contract',
            sourceId: 'demo_rent_2',
            quote: '押二付一',
            highlightedText: '押二付一',
            confidence: 98,
          },
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
        confidence: 90,
        evidence: [
          {
            sourceName: '中介微信承诺',
            sourceType: 'chat',
            sourceId: 'demo_rent_1',
            quote: '可以养宠物的，没问题',
            highlightedText: '可以养宠物',
            confidence: 88,
          },
          {
            sourceName: '房屋租赁合同',
            sourceType: 'contract',
            sourceId: 'demo_rent_2',
            quote: '严禁饲养宠物',
            highlightedText: '严禁饲养宠物',
            confidence: 97,
          },
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
        confidence: 87,
        evidence: [
          {
            sourceName: '中介微信承诺',
            sourceType: 'chat',
            sourceId: 'demo_rent_1',
            quote: '物业费包含在租金里',
            highlightedText: '包含在租金里',
            confidence: 85,
          },
          {
            sourceName: '房屋租赁合同',
            sourceType: 'contract',
            sourceId: 'demo_rent_2',
            quote: '物业费：每月200元，由乙方承担',
            highlightedText: '由乙方承担',
            confidence: 96,
          },
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
        confidence: 75,
        evidence: [
          {
            sourceName: '中介微信承诺',
            sourceType: 'chat',
            sourceId: 'demo_rent_1',
            quote: '家电都是全新的，冰箱空调洗衣机都有',
            highlightedText: '冰箱空调洗衣机都有',
            confidence: 80,
          },
          {
            sourceName: '房屋租赁合同',
            sourceType: 'contract',
            sourceId: 'demo_rent_2',
            quote: '配备基础家具及空调，冰箱洗衣机需承租方自备',
            highlightedText: '冰箱洗衣机需承租方自备',
            confidence: 95,
          },
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
    dimensions: [
      {
        id: 'dim_rent',
        name: '租金',
        description: '租金金额、支付方式、涨租条款等',
        weight: 5,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 0,
      },
      {
        id: 'dim_deposit',
        name: '押金',
        description: '押金金额、退还条件、扣减规则等',
        weight: 4,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 1,
      },
      {
        id: 'dim_rule',
        name: '规则',
        description: '宠物政策、转租规定、装修限制等',
        weight: 3,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 2,
      },
      {
        id: 'dim_fee',
        name: '费用',
        description: '物业费、水电费、取暖费等',
        weight: 3,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 3,
      },
      {
        id: 'dim_facility',
        name: '设施',
        description: '家具家电、维修责任、配套设施等',
        weight: 2,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 4,
      },
      {
        id: 'dim_term',
        name: '期限',
        description: '租赁期限、续约条款、退租规则等',
        weight: 2,
        enabled: false,
        riskCount: 0,
        isCustom: false,
        order: 5,
      },
    ] as AnalysisDimension[],
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
        confidence: 96,
        evidence: [
          {
            sourceName: '作业要求说明',
            sourceType: 'doc',
            sourceId: 'demo_hw_1',
            quote: '实现至少5种排序算法（冒泡、选择、插入、快速、归并）',
            highlightedText: '至少5种',
            confidence: 98,
          },
          {
            sourceName: '学生提交内容',
            sourceType: 'doc',
            sourceId: 'demo_hw_2',
            quote: '由于时间原因，归并排序未完成实现',
            highlightedText: '归并排序未完成实现',
            confidence: 95,
          },
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
        confidence: 85,
        evidence: [
          {
            sourceName: '作业要求说明',
            sourceType: 'doc',
            sourceId: 'demo_hw_1',
            quote: '需要包含算法对比表格',
            highlightedText: '算法对比表格',
            confidence: 92,
          },
        ],
      },
      {
        id: 'risk_3',
        title: '测试用例不够详细',
        description: '作业要求有完整的测试用例，但学生只说明"已包含基本测试用例"',
        level: 'info',
        type: 'missing',
        dimension: '内容',
        sources: ['作业要求说明', '学生提交内容'],
        confidence: 70,
        evidence: [
          {
            sourceName: '作业要求说明',
            sourceType: 'doc',
            sourceId: 'demo_hw_1',
            quote: '需要有完整的测试用例',
            highlightedText: '完整的测试用例',
            confidence: 88,
          },
          {
            sourceName: '学生提交内容',
            sourceType: 'doc',
            sourceId: 'demo_hw_2',
            quote: '已包含基本测试用例',
            highlightedText: '基本测试用例',
            confidence: 75,
          },
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
    dimensions: [
      {
        id: 'dim_content',
        name: '内容',
        description: '算法实现、功能完整性、代码质量等',
        weight: 5,
        enabled: true,
        riskCount: 2,
        isCustom: false,
        order: 0,
      },
      {
        id: 'dim_format',
        name: '格式',
        description: '提交格式、报告结构、排版规范等',
        weight: 3,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 1,
      },
      {
        id: 'dim_test',
        name: '测试',
        description: '测试用例完整性、覆盖率、测试质量等',
        weight: 4,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 2,
      },
      {
        id: 'dim_doc',
        name: '文档',
        description: '代码注释、说明文档、算法分析等',
        weight: 2,
        enabled: false,
        riskCount: 0,
        isCustom: false,
        order: 3,
      },
      {
        id: 'dim_deadline',
        name: '截止日期',
        description: '提交时间、延期政策等',
        weight: 3,
        enabled: false,
        riskCount: 0,
        isCustom: false,
        order: 4,
      },
    ] as AnalysisDimension[],
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
        confidence: 90,
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '我们这边薪资是15K',
            highlightedText: '15K',
            confidence: 95,
          },
          {
            sourceName: '正式 Offer 邮件',
            sourceType: 'doc',
            sourceId: 'demo_job_2',
            quote: '基本工资：14K/月',
            highlightedText: '14K/月',
            confidence: 98,
          },
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
        confidence: 88,
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '五险一金都是全额缴纳的',
            highlightedText: '全额缴纳',
            confidence: 92,
          },
          {
            sourceName: '正式 Offer 邮件',
            sourceType: 'doc',
            sourceId: 'demo_job_2',
            quote: '五险一金：按最低标准缴纳',
            highlightedText: '最低标准缴纳',
            confidence: 97,
          },
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
        confidence: 72,
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '还有年终奖，大概是2-3个月工资',
            highlightedText: '2-3个月工资',
            confidence: 85,
          },
        ],
      },
      {
        id: 'risk_4',
        title: '餐补金额不一致',
        description: 'HR口头承诺餐补500元/月，但Offer写的是300元/月',
        level: 'warning',
        type: 'conflict',
        dimension: '福利',
        sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
        confidence: 85,
        evidence: [
          {
            sourceName: 'HR 微信聊天记录',
            sourceType: 'chat',
            sourceId: 'demo_job_1',
            quote: '还有餐补每月500元',
            highlightedText: '500元',
            confidence: 90,
          },
          {
            sourceName: '正式 Offer 邮件',
            sourceType: 'doc',
            sourceId: 'demo_job_2',
            quote: '餐补：每月300元',
            highlightedText: '300元',
            confidence: 96,
          },
        ],
      },
    ],
    dimensions: [
      {
        id: 'dim_salary',
        name: '薪资',
        description: '工资待遇、基本工资、绩效工资等',
        weight: 5,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 0,
      },
      {
        id: 'dim_benefit',
        name: '福利',
        description: '五险一金、餐补、交通补贴等',
        weight: 4,
        enabled: true,
        riskCount: 2,
        isCustom: false,
        order: 1,
      },
      {
        id: 'dim_bonus',
        name: '奖金',
        description: '年终奖、季度奖、项目奖金等',
        weight: 3,
        enabled: true,
        riskCount: 1,
        isCustom: false,
        order: 2,
      },
      {
        id: 'dim_overtime',
        name: '加班',
        description: '加班费、加班时长、调休等',
        weight: 2,
        enabled: true,
        riskCount: 0,
        isCustom: false,
        order: 3,
      },
      {
        id: 'dim_term',
        name: '期限',
        description: '合同期限、试用期、试用期工资等',
        weight: 3,
        enabled: true,
        riskCount: 0,
        isCustom: false,
        order: 4,
      },
    ] as AnalysisDimension[],
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

export const DEMO_HISTORY_SNAPSHOTS = [
  {
    id: 'demo_snap_001',
    title: '求职 Offer 确认 - v1',
    scenarioType: 'job',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    durationMs: 3500,
    sourceCount: 2,
    sourceIds: ['demo_job_1', 'demo_job_2'],
    result: {
      meta: {
        sourceIds: ['demo_job_1', 'demo_job_2'],
        isIncremental: false,
        durationMs: 3500,
        isMock: true,
        sourceCount: 2,
      },
      summary: { critical: 2, warning: 2, info: 0, total: 4 },
      risks: [
        {
          id: 'risk_1',
          title: '薪资承诺不一致',
          description: 'HR口头承诺薪资15K，但正式Offer写的是14K',
          level: 'critical',
          type: 'conflict',
          dimension: '薪资',
          sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
          confidence: 90,
          evidence: [
            {
              sourceName: 'HR 微信聊天记录',
              sourceType: 'chat',
              sourceId: 'demo_job_1',
              quote: '我们这边薪资是15K',
              highlightedText: '15K',
              confidence: 95,
            },
            {
              sourceName: '正式 Offer 邮件',
              sourceType: 'doc',
              sourceId: 'demo_job_2',
              quote: '基本工资：14K/月',
              highlightedText: '14K/月',
              confidence: 98,
            },
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
          confidence: 88,
          evidence: [
            {
              sourceName: 'HR 微信聊天记录',
              sourceType: 'chat',
              sourceId: 'demo_job_1',
              quote: '五险一金都是全额缴纳的',
              highlightedText: '全额缴纳',
              confidence: 92,
            },
            {
              sourceName: '正式 Offer 邮件',
              sourceType: 'doc',
              sourceId: 'demo_job_2',
              quote: '五险一金：按最低标准缴纳',
              highlightedText: '最低标准缴纳',
              confidence: 97,
            },
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
          confidence: 72,
          evidence: [
            {
              sourceName: 'HR 微信聊天记录',
              sourceType: 'chat',
              sourceId: 'demo_job_1',
              quote: '还有年终奖，大概是2-3个月工资',
              highlightedText: '2-3个月工资',
              confidence: 85,
            },
          ],
        },
        {
          id: 'risk_4',
          title: '餐补金额不一致',
          description: 'HR口头承诺餐补500元/月，但Offer写的是300元/月',
          level: 'warning',
          type: 'conflict',
          dimension: '福利',
          sources: ['HR 微信聊天记录', '正式 Offer 邮件'],
          confidence: 85,
          evidence: [
            {
              sourceName: 'HR 微信聊天记录',
              sourceType: 'chat',
              sourceId: 'demo_job_1',
              quote: '还有餐补每月500元',
              highlightedText: '500元',
              confidence: 90,
            },
            {
              sourceName: '正式 Offer 邮件',
              sourceType: 'doc',
              sourceId: 'demo_job_2',
              quote: '餐补：每月300元',
              highlightedText: '300元',
              confidence: 96,
            },
          ],
        },
      ],
      checklist: [],
      alignedVersion: '',
      riskRelations: {
        associations: [],
        relatedRiskIds: {},
        conflictPairs: [],
      },
      reasoningTrace: [],
      extractedEntities: { dates: [], amounts: [], terms: [], promises: [] },
    },
  },
  {
    id: 'demo_snap_002',
    title: '求职 Offer 确认 - v2',
    scenarioType: 'job',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    durationMs: 2800,
    sourceCount: 3,
    sourceIds: ['demo_job_1', 'demo_job_2', 'demo_job_3'],
    result: DEMO_RESULTS.job,
  },
  {
    id: 'demo_snap_003',
    title: '求职 Offer 确认 - v3',
    scenarioType: 'job',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    durationMs: 2200,
    sourceCount: 3,
    sourceIds: ['demo_job_1', 'demo_job_2', 'demo_job_3'],
    result: {
      ...DEMO_RESULTS.job,
      meta: {
        ...DEMO_RESULTS.job.meta,
        durationMs: 2200,
        isMock: true,
      },
      summary: { critical: 2, warning: 3, info: 1, total: 6 },
      risks: [
        ...DEMO_RESULTS.job.risks.slice(0, 3),
        {
          ...DEMO_RESULTS.job.risks[3],
          level: 'info' as const,
          confidence: 75,
          description: '餐补金额有差异，但差距不大，建议确认',
        },
        {
          ...DEMO_RESULTS.job.risks[4],
          level: 'warning' as const,
          confidence: 70,
        },
        {
          id: 'risk_6',
          title: '试用期时长需确认',
          description: '三份材料均约定试用期三个月，需确认是否符合法律规定',
          level: 'info',
          type: 'info',
          dimension: '期限',
          sources: ['HR 微信聊天记录', '正式 Offer 邮件', '劳动合同'],
          confidence: 60,
          evidence: [
            {
              sourceName: '劳动合同',
              sourceType: 'contract',
              sourceId: 'demo_job_3',
              quote: '试用期：三个月',
              highlightedText: '三个月',
              confidence: 99,
            },
          ],
        },
      ],
    },
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
