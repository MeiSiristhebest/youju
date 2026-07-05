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
  legal_case: [
    {
      id: 'demo_legal_1',
      name: '原告起诉状',
      type: 'doc',
      content: `民事起诉状

原告：张三
被告：XX装修公司

诉讼请求：
1. 判令被告退还原告已支付的装修款15万元
2. 判令被告支付违约金3万元
3. 本案诉讼费用由被告承担

事实与理由：
原告与被告于2025年3月1日签订《房屋装修合同》，约定被告为原告位于XX小区的房屋进行装修，总价款20万元，工期90天，自2025年3月15日至2025年6月15日。

合同签订后，原告依约支付了首期款12万元。但被告施工进度严重滞后，截至2025年8月，仅完成约40%的工程量，且已完成部分存在多处质量问题。原告多次催告未果，被告始终以各种理由拖延。

另，被告设计师在签约前口头承诺赠送全屋定制家具、免费升级为进口板材，但合同中均未提及。

为维护原告合法权益，特向贵院提起诉讼，恳请依法判决。`,
      meta: '法律文书',
      status: 'ready',
      parsedSummary: {
        docType: '民事起诉状',
        parties: ['原告：张三', '被告：XX装修公司'],
        keyDates: [
          '2025年3月1日（合同签订）',
          '2025年3月15日（开工）',
          '2025年6月15日（约定竣工）',
        ],
        summary:
          '原告起诉装修公司工期延误、质量问题及口头承诺未兑现，要求退款15万并支付违约金3万。',
      },
    },
    {
      id: 'demo_legal_2',
      name: '装修合同',
      type: 'contract',
      content: `房屋装修工程施工合同

发包方（甲方）：张三
承包方（乙方）：XX装修工程有限公司

第一条 工程概况
1.1 工程地点：XX小区3号楼2单元501室
1.2 工程内容及做法：详见报价单
1.3 工程承包方式：包工包料
1.4 工期：90天，自2025年3月15日至2025年6月15日
1.5 合同价款：人民币200000元整

第二条 工程价款及支付
2.1 合同签订后甲方支付60%即120000元
2.2 工程进度过半支付35%即70000元
2.3 竣工验收合格后支付5%即10000元

第三条 工期延误
3.1 因乙方原因延误的，每逾期一天按合同总价款的0.1%支付违约金
3.2 逾期超过30天的，甲方有权解除合同

第四条 质量标准
4.1 工程质量应符合国家相关标准及双方约定

第五条 其他约定
5.1 本合同未尽事宜，由双方协商解决
5.2 本合同一式两份，双方各执一份

甲方签字：张三          乙方盖章：XX装修公司
日期：2025年3月1日      日期：2025年3月1日`,
      meta: '合同文本',
      status: 'ready',
      parsedSummary: {
        docType: '装修工程施工合同',
        parties: ['甲方：张三（发包方）', '乙方：XX装修公司（承包方）'],
        keyDates: [
          '2025年3月1日（合同签订）',
          '2025年3月15日（开工）',
          '2025年6月15日（约定竣工）',
        ],
        summary:
          '合同总价款20万，工期90天，逾期违约金每日0.1%，逾期超30天可解除合同。付款比例：60%/35%/5%。',
      },
    },
    {
      id: 'demo_legal_3',
      name: '微信沟通记录',
      type: 'chat',
      content: `设计师小李: 张哥您好，我是XX装修的设计师小李
设计师小李: 您家这个方案我给您申请了优惠
设计师小李: 全屋定制家具免费送您，市场价值得3万多呢
设计师小李: 还有板材我给您升级成进口的，不加钱
张三: 那太好了，这些都写进合同里吗？
设计师小李: 这个都是我们内部的优惠，合同里走标准版本
设计师小李: 您放心，我们这么大公司，说话算数的
张三: 行吧，那合同什么时候签？
设计师小李: 明天就可以，您带身份证和银行卡过来

...

张三: 李工，现在都8月了，怎么才装了一半？
设计师小李: 张哥不好意思，最近工人有点紧张
张三: 合同写的6月15号完工啊
设计师小李: 我这边催催，尽快尽快
张三: 还有你说的全屋定制和进口板材呢？
设计师小李: 这个...我得跟公司申请一下
张三: 什么叫申请？当初不是说好了吗？
设计师小李: 张哥您别急，我帮您问问`,
      meta: '微信聊天',
      status: 'ready',
      parsedSummary: {
        docType: '微信聊天记录',
        parties: ['张三（业主）', '设计师小李'],
        keyDates: [],
        summary:
          '设计师口头承诺赠送全屋定制家具、免费升级进口板材，但未写入合同。工期严重滞后，设计师推诿。',
      },
    },
    {
      id: 'demo_legal_4',
      name: '被告答辩状',
      type: 'doc',
      content: `民事答辩状

答辩人：XX装修工程有限公司
被答辩人：张三

答辩人就被答辩人诉答辩人装饰装修合同纠纷一案，提出如下答辩意见：

一、工期延误系因被答辩人原因导致
施工过程中，被答辩人多次提出变更设计方案，导致工程量增加，工期理应相应顺延。且被答辩人未按合同约定支付第二期工程款，根据合同法规定，答辩人有权行使先履行抗辩权，暂停施工。

二、工程质量符合合同约定
答辩人严格按照设计图纸及国家相关规范施工，已完成部分经验收合格。被答辩人所谓"质量问题"均系其主观臆断，无任何专业检测报告予以证明。

三、不存在口头承诺事项
双方权利义务均应以书面合同为准，答辩人从未承诺过赠送全屋定制家具及升级进口板材。被答辩人提供的聊天记录仅系设计师个人行为，不能代表公司意思表示，且该设计师已从答辩人处离职。

综上，被答辩人的诉讼请求缺乏事实和法律依据，恳请贵院依法驳回其全部诉讼请求。`,
      meta: '法律文书',
      status: 'ready',
      parsedSummary: {
        docType: '被告答辩状',
        parties: ['答辩人：XX装修公司', '被答辩人：张三'],
        keyDates: [],
        summary:
          '被告辩称工期延误系原告变更设计和未按期付款导致，质量合格，否认口头承诺，称系设计师个人行为且已离职。',
      },
    },
  ],
  academic_research: [
    {
      id: 'demo_academic_1',
      name: '论文A：远程工作对生产率的影响',
      type: 'doc',
      content: `远程工作对员工生产率的影响——基于某科技公司的准自然实验

摘要：
本文利用某大型科技公司2020年疫情期间强制远程办公作为准自然实验，采用双重差分法（DID）评估远程工作对员工生产率的影响。基于2019-2021年共1200名员工的面板数据，研究发现：远程办公使员工平均生产率提升了13%（p<0.01），且这种提升在高技能员工中更为显著（+18%，p<0.001）。机制分析表明，生产率提升主要来源于通勤时间节省带来的有效工作时间增加（平均每天增加48分钟），以及工作时间安排的灵活性。然而，远程办公也导致团队协作效率下降，表现为跨部门项目的平均完成时间延长了8%。

关键词：远程工作；生产率；双重差分；准自然实验

数据来源：
- 研究对象：某美国科技公司1200名全职员工
- 时间范围：2019年1月 - 2021年12月
- 生产率指标：代码提交量、代码审查速度、项目完成率
- 控制变量：年龄、司龄、职级、部门、绩效历史`,
      meta: '学术论文',
      status: 'ready',
      parsedSummary: {
        docType: '学术论文',
        parties: ['研究团队A'],
        keyDates: ['2019-2021（研究周期）'],
        summary:
          '基于某科技公司1200名员工的DID研究，发现远程工作使生产率提升13%（p<0.01），高技能员工提升18%，但跨部门协作效率下降8%。',
      },
    },
    {
      id: 'demo_academic_2',
      name: '论文B：远程工作与员工福祉',
      type: 'doc',
      content: `Working from home and employee well-being: Evidence from a randomized controlled trial

Abstract:
We conduct a randomized controlled trial (RCT) at a large European financial services firm to estimate the causal effect of working from home (WFH) on employee well-being. 400 employees were randomly assigned to either the treatment group (2 days WFH per week) or the control group (full office work). After 6 months, we find that the treatment group reported significantly higher job satisfaction (+0.32 standard deviations, p<0.01) and lower burnout scores (-0.28 SD, p<0.05). However, we also find a small but statistically significant increase in feelings of social isolation (+0.15 SD, p<0.10). The effects are stronger for employees with longer commutes and those with caregiving responsibilities. We find no significant effect on objective productivity metrics (task completion rate, error rate).

Keywords: Working from home; well-being; randomized controlled trial; burnout

Methods:
- Design: Randomized controlled trial
- Sample: 400 employees, 200 treatment / 200 control
- Duration: 6 months
- Measures: Job satisfaction scale, Maslach Burnout Inventory, social isolation scale, objective productivity metrics`,
      meta: '学术论文',
      status: 'ready',
      parsedSummary: {
        docType: '学术论文（英文）',
        parties: ['研究团队B'],
        keyDates: ['6个月（研究周期）'],
        summary:
          'RCT研究（400名员工）发现，每周2天远程办公提升工作满意度0.32 SD（p<0.01），降低倦怠0.28 SD（p<0.05），但社交孤立感略有增加（+0.15 SD）。未发现对客观生产率有显著影响。',
      },
    },
    {
      id: 'demo_academic_3',
      name: '论文C：混合办公模式的元分析',
      type: 'doc',
      content: `混合办公模式与员工绩效：系统综述与元分析

摘要：
目的：系统评价混合办公模式（hybrid work）对员工绩效、满意度和留存率的影响。
方法：检索PubMed、Web of Science、Scopus等数据库2020-2025年发表的相关研究，纳入随机对照试验和准实验研究。采用随机效应模型进行元分析。
结果：共纳入28项研究，总样本量56,789名员工。元分析结果显示：
1. 混合办公对整体绩效的合并效应量为d=0.19（95%CI: 0.11-0.27, p<0.001），效应量为小到中等
2. 对工作满意度的效应量为d=0.24（95%CI: 0.16-0.32, p<0.001）
3. 对离职意向的效应量为d=-0.21（95%CI: -0.30--0.12, p<0.001），即降低离职意愿
4. 亚组分析显示：每周2-3天远程办公的效果最佳，超过4天则绩效提升不显著
5. 异质性检验：I²=68%，存在中等程度异质性
结论：混合办公模式对员工绩效和福祉有积极影响，但存在最优远程办公天数阈值。未来研究应关注行业差异和长期影响。

关键词：混合办公；元分析；员工绩效；工作满意度；系统综述`,
      meta: '学术论文',
      status: 'ready',
      parsedSummary: {
        docType: '元分析论文',
        parties: ['研究团队C'],
        keyDates: ['2020-2025（纳入研究周期）'],
        summary:
          '纳入28项研究（n=56789）的元分析发现，混合办公对绩效效应量d=0.19（小到中等），满意度d=0.24，离职意向d=-0.21。每周2-3天远程办公效果最佳，超过4天增益不显著。I²=68%存在中等异质性。',
      },
    },
  ],
  due_diligence: [
    {
      id: 'demo_dd_1',
      name: '目标公司BP及财报',
      type: 'doc',
      content: `XX科技有限公司商业计划书（2025年）

一、公司概况
成立于2020年，专注于企业级SaaS服务，核心产品为智能客服系统。截至2024年底，累计服务企业客户超过2000家。

二、财务数据
2024年度关键财务指标：
- 营业收入：8500万元，同比增长45%
- 净利润：1200万元，净利率14.1%
- 毛利率：68%
- 经营活动现金流净额：1500万元
- 总资产：1.2亿元
- 总负债：3000万元，资产负债率25%
- ARR（年度经常性收入）：9200万元
- NDR（净收入留存率）：118%

三、客户情况
- 企业客户数：2000+家
- 头部客户：某国有银行、某连锁零售集团、某互联网大厂
- 客户留存率：92%
- 平均客单价：4.25万元/年

四、团队
- 创始人：前某大厂技术VP，10年+行业经验
- 核心团队：均来自头部互联网公司
- 员工总数：120人

五、融资计划
本轮拟融资5000万元，释放10%股权，投后估值5亿元。资金用途：产品研发（40%）、市场拓展（40%）、团队建设（20%）。`,
      meta: '商业计划书',
      status: 'ready',
      parsedSummary: {
        docType: '商业计划书/财务摘要',
        parties: ['XX科技有限公司（标的公司）'],
        keyDates: ['2024年（财年）'],
        summary:
          '企业SaaS公司，2024年营收8500万（+45%），净利1200万，毛利率68%，NDR 118%，客户2000+，投后估值5亿。',
      },
    },
    {
      id: 'demo_dd_2',
      name: '第三方尽职调查报告',
      type: 'doc',
      content: `关于XX科技有限公司的尽职调查报告（摘要）

一、财务尽调发现
1. 营收确认问题：
   - 2024年营收中约1200万元系年末集中确认，相关合同签署日期为12月25-31日，存在突击确认收入嫌疑
   - 部分项目采用"总额法"确认收入，但实际应为"净额法"，涉及金额约800万元
   - 调整后2024年营收约为6500万元，同比增速约15%，远低于宣称的45%

2. 客户集中度风险：
   - 前五大客户贡献营收占比达62%，其中第一大客户占比28%
   - 第一大客户为关联方（创始人配偶控制的企业），但未披露关联关系

3. 现金流质量：
   - 经营活动现金流净额1500万元，但其中包含500万元政府补助，扣非后仅1000万元
   - 应收账款周转天数从2023年的45天上升至2024年的68天

二、法律尽调发现
1. 知识产权：核心算法专利申请中，尚未授权，存在不确定性
2. 劳动争议：公司存在3起未决劳动仲裁，涉及金额约50万元
3. 数据合规：未取得等保三级认证，不符合其宣传的"金融级安全"

三、业务尽调发现
1. NDR 118%存在水分：含渠道合作带来的一次性大单，剔除后约为95%
2. 客户留存率92%为金额口径，用户口径留存率约为75%
3. 核心技术人员有3人于近6个月离职`,
      meta: '尽调报告',
      status: 'ready',
      parsedSummary: {
        docType: '第三方尽调报告（摘要）',
        parties: ['尽调机构', '标的公司'],
        keyDates: ['2024年'],
        summary:
          '尽调发现重大问题：营收确认存疑（调整后增速15% vs 宣称45%）、第一大客户为未披露关联方、核心专利未授权、NDR和留存率数据有水分、核心人员离职。',
      },
    },
    {
      id: 'demo_dd_3',
      name: '创始人访谈纪要',
      type: 'doc',
      content: `创始人访谈纪要

时间：2025年6月15日
地点：公司会议室
访谈对象：创始人兼CEO 王XX
访谈人：投资团队

Q: 请介绍一下公司2024年的增长情况？
A: 2024年我们增长非常快，营收8500万，同比增长45%。主要来自老客户的增购和新客户的拓展。

Q: 第一大客户占比比较高，是什么情况？
A: 第一大客户是一家零售集团，我们做的是标杆客户，所以给了比较优惠的价格。他们使用效果很好，后续会有更多合作。

Q: 年末集中确认的那些合同是怎么回事？
A: 那些都是正常的商务谈判，刚好在年底谈成。SaaS行业Q4本来就是旺季，很正常。

Q: 核心专利的进展如何？
A: 正在申请过程中，应该快下来了。我们的技术团队很强，这个不用担心。

Q: 最近核心团队有人员流动吗？
A: 没有大的变动，都很稳定。互联网行业正常的人员流动是有的，但核心团队都在。

Q: 数据安全方面，公司达到什么级别了？
A: 我们的系统是金融级安全标准，客户里也有银行。等保三级正在办理，很快就能拿到。`,
      meta: '访谈纪要',
      status: 'ready',
      parsedSummary: {
        docType: '创始人访谈纪要',
        parties: ['创始人王XX', '投资团队'],
        keyDates: ['2025年6月15日（访谈日期）'],
        summary:
          '创始人解释：高客户占比系标杆客户、年末确认合同属正常、专利快下来了、团队稳定、等保三级在办。与尽调报告存在多处不一致。',
      },
    },
  ],
  fact_check: [
    {
      id: 'demo_fc_1',
      name: '网传截图：某公司裁员通知',
      type: 'screenshot',
      content: `【网传截图内容】
主题：关于公司组织架构优化的通知
各位同事：
受市场环境影响，经公司管理层研究决定，将进行组织架构优化调整：
1. 本次优化涉及人员约500人，占员工总数的30%
2. 被优化员工将获得N+1补偿
3. 本通知自2025年7月1日起执行
请各部门负责人做好沟通工作。
XX科技有限公司人力资源部
2025年6月28日

【截图信息】
- 来源：某职场社交平台匿名区
- 发布时间：2025年6月28日 22:15
- 发布用户：匿名用户
- 转发量：1.2万+
- 评论：3000+`,
      meta: '网传截图',
      status: 'ready',
      parsedSummary: {
        docType: '网传裁员通知截图',
        parties: ['匿名发布者'],
        keyDates: ['2025年6月28日（网传日期）', '2025年7月1日（执行日期）'],
        summary: '网传某科技公司裁员500人（占比30%），N+1补偿，7月1日执行。来源匿名，转发量高。',
      },
    },
    {
      id: 'demo_fc_2',
      name: '公司官方回应',
      type: 'web',
      content: `【官方声明】关于近期不实信息的澄清

近日，网络上出现关于我司"大规模裁员"的不实传闻，相关截图系伪造，严重误导公众，对我司声誉造成不良影响。

我司在此严正声明：
1. 网传"裁员500人、占比30%"等信息严重不实
2. 我司目前人员稳定，业务发展良好
3. 我司从未发布过此类通知，相关截图系伪造
4. 我司已委托律师事务所处理此事，保留追究法律责任的权利

请广大网友不信谣、不传谣，关注官方渠道信息。

XX科技有限公司
2025年6月29日`,
      meta: '官方声明',
      status: 'ready',
      parsedSummary: {
        docType: '公司官方声明',
        parties: ['XX科技有限公司'],
        keyDates: ['2025年6月29日（声明日期）'],
        summary: '公司官方回应：网传裁员信息不实，截图系伪造，将追究法律责任。',
      },
    },
    {
      id: 'demo_fc_3',
      name: '知情人士爆料（另一平台）',
      type: 'doc',
      content: `【某脉脉用户爆料】
ID: 员工甲
发布时间: 2025-06-29 10:30

说两句公道话。
截图确实是P的，不是官方发布的模板。
但裁员是真的，只是数字有出入。
实际大概200人左右，主要是市场和销售部门，技术裁得少。
补偿是N+1，没毛病。
公司这两年扩张太快，现在收缩一下也正常。
大家理性看待，别信谣也别否认现实。

【另一位用户回复】
ID: 内部人
发布时间: 2025-06-29 11:15

2楼说的差不多，我们部门走了十几个
不是一刀切，是末位淘汰+业务线收缩
HRBP已经在挨个谈了
这周内走完

【第三位用户】
ID: HR相关
发布时间: 2025-06-29 14:20

补充：
是组织优化，不是裁员
涉及人员大约150-200人
大部分是销售和职能岗
技术线基本不动
补偿N+1+未休年假折现
比法律规定的好一些`,
      meta: '职场社交平台爆料',
      status: 'ready',
      parsedSummary: {
        docType: '匿名爆料汇总',
        parties: ['多名匿名用户'],
        keyDates: ['2025年6月29日（爆料时间）'],
        summary:
          '多名匿名用户称确有人员优化，但非500人，实际约150-200人，以销售/职能岗为主，补偿N+1+年假折现。认为截图是P的但确有其事。',
      },
    },
    {
      id: 'demo_fc_4',
      name: '媒体报道',
      type: 'web',
      content: `XX科技回应"裁员500人"传闻：截图不实

6月29日，针对网传XX科技裁员500人的消息，XX科技官方对记者表示，相关信息"严重不实，截图系伪造"。

然而，记者从多位接近XX科技的人士处获悉，该公司近期确实在进行人员优化，但规模远小于网传的500人。

一位不愿具名的内部人士向记者透露："确实在调整，主要是销售体系，大概一两百人吧，属于正常的业务优化，不是什么大规模裁员。"

另一位猎头也向记者表示，近期收到不少来自XX科技销售岗的简历，"确实有人员流动，但技术岗的没怎么看到。"

截至发稿，XX科技尚未回应关于"150-200人"这一数字的具体询问。

记者注意到，XX科技上一轮融资是在2023年底，融资金额2亿元。近年来SaaS行业整体增速放缓，多家企业均有不同程度的人员调整。`,
      meta: '媒体报道',
      status: 'ready',
      parsedSummary: {
        docType: '媒体报道',
        parties: ['某媒体', '内部人士', '猎头'],
        keyDates: ['2025年6月29日'],
        summary:
          '媒体报道：官方否认500人裁员，但内部人士和猎头证实确有约150-200人优化，以销售岗为主，属于行业正常调整。',
      },
    },
  ],
  job_offer: [] as Source[],
  rental: [] as Source[],
}

DEMO_SOURCES.job_offer = DEMO_SOURCES.job.map((s) => ({
  ...s,
  id: s.id.replace('demo_job_', 'demo_joboffer_'),
}))

DEMO_SOURCES.rental = DEMO_SOURCES.rent.map((s) => ({
  ...s,
  id: s.id.replace('demo_rent_', 'demo_rental_'),
}))

export const DEMO_RESULTS: Record<string, any> = {
  job: {
    meta: {
      sourceIds: ['demo_job_1', 'demo_job_2', 'demo_job_3'],
      isIncremental: true,
      newRiskCount: 2,
      durationMs: 4800,
      isMock: undefined,
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
  legal_case: {} as any,
  academic_research: {} as any,
  due_diligence: {} as any,
  fact_check: {} as any,
  job_offer: {} as any,
  rental: {} as any,
}

function _adaptResultToScenario(
  baseResult: any,
  sourceMapping: Record<string, { id: string; name: string; type: string }>,
  riskOverrides: any[],
  dimensionOverrides: any[],
): any {
  const sourceIdMap = Object.fromEntries(
    Object.entries(sourceMapping).map(([oldId, newSrc]) => [oldId, newSrc.id]),
  )
  const sourceNameMap = Object.fromEntries(
    Object.entries(sourceMapping).map(([oldId, newSrc]) => [oldId, newSrc.name]),
  )
  const _sourceTypeMap = Object.fromEntries(
    Object.entries(sourceMapping).map(([oldId, newSrc]) => [oldId, newSrc.type]),
  )

  const replaceSourceRefs = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj
    if (Array.isArray(obj)) return obj.map(replaceSourceRefs)
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'sourceId' && typeof value === 'string' && sourceIdMap[value]) {
        result[key] = sourceIdMap[value]
      } else if (key === 'sourceName' && typeof value === 'string') {
        const _oldId = Object.keys(sourceIdMap).find(
          (id) => sourceIdMap[id] !== value && value.includes('HR') === false,
        )
        result[key] = value
      } else if (key === 'sourceType' && typeof value === 'string') {
        result[key] = value
      } else if (key === 'sources' && Array.isArray(value)) {
        result[key] = value.map(
          (name: string) =>
            sourceNameMap[
              Object.keys(sourceIdMap).find((id) => sourceNameMap[id] === name) || ''
            ] || name,
        )
      } else {
        result[key] = replaceSourceRefs(value)
      }
    }
    return result
  }

  return {
    meta: {
      ...baseResult.meta,
      sourceIds: Object.values(sourceMapping).map((s) => s.id),
    },
    summary: baseResult.summary,
    risks: riskOverrides,
    dimensions: dimensionOverrides,
    timeline: baseResult.timeline ? replaceSourceRefs(baseResult.timeline) : undefined,
    evidenceChain: baseResult.evidenceChain
      ? replaceSourceRefs(baseResult.evidenceChain)
      : undefined,
  }
}

DEMO_RESULTS.legal_case = {
  meta: {
    sourceIds: ['demo_legal_1', 'demo_legal_2', 'demo_legal_3', 'demo_legal_4'],
    isIncremental: false,
    durationMs: 5200,
    isMock: undefined,
  },
  summary: { critical: 2, warning: 3, info: 2 },
  risks: [
    {
      id: 'lc_risk_1',
      title: '口头承诺未写入合同',
      description: '设计师承诺的全屋定制家具、进口板材升级均未在合同中体现，存在举证困难',
      level: 'critical',
      type: 'missing_evidence',
      dimension: '合同条款',
      sources: ['原告起诉状', '微信沟通记录', '装修合同'],
      confidence: 92,
      status: 'pending',
      evidence: [
        {
          sourceName: '微信沟通记录',
          sourceType: 'chat',
          sourceId: 'demo_legal_3',
          quote: '全屋定制家具免费送您...还有板材我给您升级成进口的，不加钱',
          highlightedText: '全屋定制家具免费送',
          confidence: 95,
        },
        {
          sourceName: '装修合同',
          sourceType: 'contract',
          sourceId: 'demo_legal_2',
          quote: '本合同未尽事宜，由双方协商解决',
          highlightedText: '未尽事宜',
          confidence: 98,
        },
      ],
    },
    {
      id: 'lc_risk_2',
      title: '工期延误责任争议',
      description: '原告主张被告延误工期，被告辩称系原告变更设计和未付款导致，双方各执一词',
      level: 'critical',
      type: 'conflict',
      dimension: '工期',
      sources: ['原告起诉状', '被告答辩状', '装修合同'],
      confidence: 85,
      status: 'pending',
      evidence: [
        {
          sourceName: '原告起诉状',
          sourceType: 'doc',
          sourceId: 'demo_legal_1',
          quote: '截至2025年8月，仅完成约40%的工程量',
          highlightedText: '仅完成约40%',
          confidence: 90,
        },
        {
          sourceName: '被告答辩状',
          sourceType: 'doc',
          sourceId: 'demo_legal_4',
          quote: '工期延误系因被答辩人原因导致...多次提出变更设计方案',
          highlightedText: '被答辩人原因导致',
          confidence: 88,
        },
      ],
    },
    {
      id: 'lc_risk_3',
      title: '质量问题缺乏专业鉴定',
      description: '原告主张多处质量问题，但未提供专业检测报告，被告辩称质量合格',
      level: 'warning',
      type: 'missing_evidence',
      dimension: '工程质量',
      sources: ['原告起诉状', '被告答辩状'],
      confidence: 70,
      status: 'pending',
      evidence: [
        {
          sourceName: '原告起诉状',
          sourceType: 'doc',
          sourceId: 'demo_legal_1',
          quote: '已完成部分存在多处质量问题',
          highlightedText: '多处质量问题',
          confidence: 85,
        },
        {
          sourceName: '被告答辩状',
          sourceType: 'doc',
          sourceId: 'demo_legal_4',
          quote: '所谓"质量问题"均系其主观臆断，无任何专业检测报告',
          highlightedText: '无任何专业检测报告',
          confidence: 82,
        },
      ],
    },
    {
      id: 'lc_risk_4',
      title: '设计师离职导致表见代理风险',
      description: '被告称承诺的设计师已离职，可能影响表见代理认定',
      level: 'warning',
      type: 'legal_risk',
      dimension: '主体资格',
      sources: ['被告答辩状', '微信沟通记录'],
      confidence: 75,
      status: 'pending',
      evidence: [
        {
          sourceName: '被告答辩状',
          sourceType: 'doc',
          sourceId: 'demo_legal_4',
          quote: '该设计师已从答辩人处离职',
          highlightedText: '已从答辩人处离职',
          confidence: 95,
        },
      ],
    },
    {
      id: 'lc_risk_5',
      title: '违约金计算依据需明确',
      description: '原告主张违约金3万元，需根据合同约定的每日0.1%标准和实际延误天数核算',
      level: 'warning',
      type: 'calculation',
      dimension: '违约金',
      sources: ['原告起诉状', '装修合同'],
      confidence: 80,
      status: 'pending',
      evidence: [
        {
          sourceName: '装修合同',
          sourceType: 'contract',
          sourceId: 'demo_legal_2',
          quote: '每逾期一天按合同总价款的0.1%支付违约金',
          highlightedText: '每日0.1%',
          confidence: 99,
        },
      ],
    },
  ],
  dimensions: [
    {
      id: 'dim_contract',
      name: '合同条款',
      status: 'completed',
      summary: '合同权利义务约定基本完整，但口头承诺未纳入书面合同',
      riskCount: 1,
    },
    {
      id: 'dim_schedule',
      name: '工期进度',
      status: 'completed',
      summary: '工期延误事实存在，但责任归属存在争议',
      riskCount: 1,
    },
    {
      id: 'dim_quality',
      name: '工程质量',
      status: 'completed',
      summary: '质量问题缺乏专业鉴定，证据不够充分',
      riskCount: 1,
    },
    {
      id: 'dim_liability',
      name: '违约责任',
      status: 'completed',
      summary: '违约金计算标准明确，但实际金额需结合事实认定',
      riskCount: 1,
    },
  ],
  riskRelations: {
    associations: [
      {
        sourceName: '原告起诉状',
        sourceType: 'doc',
        riskIds: ['lc_risk_1', 'lc_risk_2', 'lc_risk_3', 'lc_risk_5'],
        riskCount: 4,
        isConflict: true,
      },
      {
        sourceName: '装修合同',
        sourceType: 'contract',
        riskIds: ['lc_risk_1', 'lc_risk_2', 'lc_risk_5'],
        riskCount: 3,
        isConflict: false,
      },
      {
        sourceName: '微信沟通记录',
        sourceType: 'chat',
        riskIds: ['lc_risk_1', 'lc_risk_2', 'lc_risk_4'],
        riskCount: 3,
        isConflict: true,
      },
      {
        sourceName: '被告答辩状',
        sourceType: 'doc',
        riskIds: ['lc_risk_2', 'lc_risk_3', 'lc_risk_4'],
        riskCount: 3,
        isConflict: true,
      },
    ],
    relatedRiskIds: {
      lc_risk_1: ['lc_risk_4', 'lc_risk_5'],
      lc_risk_2: ['lc_risk_3', 'lc_risk_5'],
      lc_risk_3: ['lc_risk_2'],
      lc_risk_4: ['lc_risk_1'],
      lc_risk_5: ['lc_risk_1', 'lc_risk_2'],
    },
    conflictPairs: [
      { risk1Id: 'lc_risk_1', risk2Id: 'lc_risk_4', reason: '口头承诺与表见代理问题直接相关' },
      { risk1Id: 'lc_risk_2', risk2Id: 'lc_risk_5', reason: '工期延误与违约金计算直接关联' },
    ],
  },
  alignedVersion:
    '综合各材料，建议重点关注以下事项：\n1. 口头承诺的举证难度及表见代理认定\n2. 工期延误的责任划分与违约金计算\n3. 质量问题的专业鉴定必要性\n4. 证据收集与保全建议',
  checklist: [
    {
      id: 'lc_check_1',
      text: '收集所有书面合同及补充协议',
      checked: false,
      riskType: 'missing_evidence',
      dimension: '合同条款',
    },
    {
      id: 'lc_check_2',
      text: '完整保存微信/短信/邮件等沟通记录',
      checked: false,
      riskType: 'missing_evidence',
      dimension: '合同条款',
    },
    {
      id: 'lc_check_3',
      text: '核实设计师是否构成表见代理',
      checked: false,
      riskType: 'legal_risk',
      dimension: '主体资格',
    },
    {
      id: 'lc_check_4',
      text: '委托专业机构进行工程质量鉴定',
      checked: false,
      riskType: 'missing_evidence',
      dimension: '工程质量',
    },
    {
      id: 'lc_check_5',
      text: '核算工期延误天数及违约金金额',
      checked: false,
      riskType: 'calculation',
      dimension: '违约金',
    },
    {
      id: 'lc_check_6',
      text: '评估诉讼时效及证据保全',
      checked: false,
      riskType: 'legal_risk',
      dimension: '工期进度',
    },
  ],
  extractedEntities: {
    dates: [
      { value: '2025年3月1日（合同签订）', source: '原告起诉状' },
      { value: '2025年3月15日（开工）', source: '装修合同' },
      { value: '2025年6月15日（约定竣工）', source: '装修合同' },
      { value: '2025年8月（实际进度约40%）', source: '原告起诉状' },
    ],
    amounts: [
      { value: '20万元（合同总价款）', source: '装修合同' },
      { value: '15万元（原告诉请退款）', source: '原告起诉状' },
      { value: '3万元（原告诉请违约金）', source: '原告起诉状' },
      { value: '每日0.1%（违约金标准）', source: '装修合同' },
    ],
    terms: [
      { value: '包工包料', source: '装修合同' },
      { value: '逾期超过30天可解除合同', source: '装修合同' },
    ],
    promises: [
      { value: '赠送全屋定制家具', source: '微信沟通记录' },
      { value: '免费升级进口板材', source: '微信沟通记录' },
    ],
  },
  reasoningTrace: [
    {
      title: '场景识别',
      description: '识别为装修合同纠纷类案件，包含起诉状、合同、聊天记录、答辩状四类材料',
      details:
        '分析输入材料类型与法律关系：\n1. 检测到民事起诉状 → 判定为诉讼阶段\n2. 检测到装修工程施工合同 → 核心证据材料\n3. 检测到微信聊天记录 → 口头承诺证据\n4. 检测到答辩状 → 对方主张与抗辩\n\n综合判断：装饰装修合同纠纷，需从合同条款、工期、质量、违约责任等维度交叉验证。',
      status: 'completed',
      durationMs: 920,
      tokenUsage: 1500,
    },
    {
      title: '材料解析',
      description: '从四份材料中提取了合同约定、事实主张、抗辩理由等关键信息',
      details:
        '结构化提取各材料核心信息：\n\n【原告起诉状】\n- 诉讼请求：退款15万 + 违约金3万\n- 事实主张：工期延误仅完成40%、质量问题、口头承诺未兑现\n\n【装修合同】\n- 总价款：20万，工期90天\n- 付款：60%/35%/5%\n- 违约金：每日0.1%，超30天可解约\n\n【微信沟通记录】\n- 口头承诺：全屋定制家具、进口板材\n- 工期确认：设计师承认滞后\n\n【被告答辩状】\n- 抗辩：原告变更设计、未付款、质量合格\n- 否认口头承诺：设计师个人行为且已离职',
      status: 'completed',
      durationMs: 1800,
      tokenUsage: 4200,
    },
    {
      title: '维度提取',
      description: '确定了合同条款、工期进度、工程质量、违约责任等核心分析维度',
      details:
        '基于建设工程纠纷知识图谱提取对比维度：\n\n核心维度（高权重）：\n- 合同条款完整性 → 权重：0.25\n- 工期与责任划分 → 权重：0.22\n- 工程质量认定 → 权重：0.20\n\n重要维度（中权重）：\n- 违约责任计算 → 权重：0.15\n- 证据链完整性 → 权重：0.12\n\n一般维度（低权重）：\n- 程序合规性 → 权重：0.06',
      status: 'completed',
      durationMs: 1100,
      tokenUsage: 2100,
    },
    {
      title: '要素提取',
      description: '从各材料中提取了合同金额、工期节点、口头承诺、抗辩理由等关键要素',
      details:
        '按维度对各材料要素进行标准化提取：\n\n【合同条款维度】\n- 书面合同：有，约定较完整\n- 口头承诺：全屋定制家具、进口板材\n- 争议点：口头承诺是否有效\n\n【工期维度】\n- 约定工期：90天（3.15-6.15）\n- 实际进度：8月仅完成40%\n- 被告抗辩：原告变更设计+未付款\n\n【质量维度】\n- 原告主张：多处质量问题\n- 被告抗辩：质量合格，需专业鉴定\n- 当前状态：缺乏专业检测报告',
      status: 'completed',
      durationMs: 1400,
      tokenUsage: 3200,
    },
    {
      title: '冲突检测',
      description: '发现口头承诺举证困难、工期责任争议、质量缺乏鉴定等多处关键冲突',
      details:
        '跨材料对比检测冲突与风险：\n\n🔴 严重风险（2个）：\n1. 口头承诺未写入合同\n   - 微信记录 vs 合同文本\n   - 置信度：92%\n   - 影响：核心诉求可能缺乏依据\n\n2. 工期延误责任争议\n   - 原告：被告延误\n   - 被告：原告变更设计+未付款\n   - 置信度：85%\n   - 影响：违约金主张可能不被全额支持\n\n🟡 中等风险（3个）：\n3. 质量问题缺乏专业鉴定\n   - 仅有原告主观主张\n   - 置信度：70%\n\n4. 设计师离职的表见代理风险\n   - 可能影响口头承诺效力认定\n   - 置信度：75%\n\n5. 违约金计算需结合事实认定\n   - 标准明确但天数有争议\n   - 置信度：80%',
      status: 'completed',
      durationMs: 2200,
      tokenUsage: 4800,
    },
    {
      title: '结果校验',
      description: '验证了每个风险点的证据链，确认核心争议点及举证责任分配',
      details:
        '交叉验证与法律评估：\n\n【证据链验证】\n- 书面合同类证据：强，可直接认定\n- 微信聊天记录：中等，需结合其他证据佐证\n- 当事人陈述：弱，需其他证据支撑\n\n【法律风险评估】\n- 合同解除主张：大概率支持（工期超30天）\n- 退款主张：需结合已完工程量鉴定\n- 违约金主张：需确认责任比例\n- 口头承诺主张：举证难度较大，需证明表见代理\n\n【总体评估】\n- 高置信度风险（≥85%）：2个\n- 中置信度风险（70-85%）：3个\n- 建议：尽快进行证据保全和质量鉴定',
      status: 'completed',
      durationMs: 1050,
      tokenUsage: 1800,
    },
    {
      title: '报告生成',
      description: '整理分析结果，生成风险清单、检查清单和诉讼策略建议',
      details:
        '按照诉讼策略框架生成最终报告：\n\n- 风险清单按严重程度排序\n- 每个风险含证据链与法律分析\n- 生成检查清单与行动建议\n- 附关键要素提取汇总表\n- 输出：争议焦点分析 + 举证建议',
      status: 'completed',
      durationMs: 730,
      tokenUsage: 1100,
    },
  ],
  debugInfo: {
    model: 'gpt-4o',
    tokenPrompt: 8200,
    tokenCompletion: 3600,
    tokenTotal: 11800,
  },
  preferences: {
    riskWeights: {
      dimensionWeights: {
        contract: 90,
        schedule: 85,
        quality: 80,
        liability: 75,
        evidence: 88,
      },
      typeWeights: {
        missing_evidence: 85,
        conflict: 92,
        legal_risk: 78,
        calculation: 65,
      },
      totalChecks: 36,
      lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    draftStyle: {
      formality: 85,
      friendliness: 40,
      conciseness: 70,
      directness: 80,
      totalCopies: 12,
      totalEdits: 8,
      lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      preferredTone: '专业严谨型',
    },
  },
}

DEMO_RESULTS.academic_research = {
  meta: {
    sourceIds: ['demo_academic_1', 'demo_academic_2', 'demo_academic_3'],
    isIncremental: false,
    durationMs: 4600,
    isMock: undefined,
  },
  summary: { critical: 0, warning: 3, info: 3 },
  risks: [
    {
      id: 'ar_risk_1',
      title: '研究设计异质性较高',
      description: '三篇文献采用不同研究方法（DID、RCT、元分析），效应量直接比较需谨慎',
      level: 'warning',
      type: 'methodology',
      dimension: '研究方法',
      sources: [
        '论文A：远程工作对生产率的影响',
        '论文B：远程工作与员工福祉',
        '论文C：混合办公模式的元分析',
      ],
      confidence: 90,
      status: 'pending',
      evidence: [
        {
          sourceName: '论文A：远程工作对生产率的影响',
          sourceType: 'doc',
          sourceId: 'demo_academic_1',
          quote: '采用双重差分法（DID）',
          highlightedText: '双重差分法',
          confidence: 98,
        },
        {
          sourceName: '论文B：远程工作与员工福祉',
          sourceType: 'doc',
          sourceId: 'demo_academic_2',
          quote: 'Randomized controlled trial (RCT)',
          highlightedText: 'RCT',
          confidence: 99,
        },
      ],
    },
    {
      id: 'ar_risk_2',
      title: '生产率与福祉的测量指标不一致',
      description: '论文A用代码提交量等客观指标，论文B用量表等主观指标，结果可比性受限',
      level: 'warning',
      type: 'measurement',
      dimension: '测量方法',
      sources: ['论文A：远程工作对生产率的影响', '论文B：远程工作与员工福祉'],
      confidence: 88,
      status: 'pending',
      evidence: [
        {
          sourceName: '论文A：远程工作对生产率的影响',
          sourceType: 'doc',
          sourceId: 'demo_academic_1',
          quote: '生产率指标：代码提交量、代码审查速度、项目完成率',
          highlightedText: '代码提交量',
          confidence: 95,
        },
        {
          sourceName: '论文B：远程工作与员工福祉',
          sourceType: 'doc',
          sourceId: 'demo_academic_2',
          quote: 'Job satisfaction scale, Maslach Burnout Inventory',
          highlightedText: 'Job satisfaction scale',
          confidence: 96,
        },
      ],
    },
    {
      id: 'ar_risk_3',
      title: '最优远程办公天数存在阈值效应',
      description: '元分析显示每周2-3天效果最佳，超过4天增益不显著，需注意非线性关系',
      level: 'info',
      type: 'finding',
      dimension: '关键发现',
      sources: ['论文C：混合办公模式的元分析'],
      confidence: 85,
      status: 'pending',
      evidence: [
        {
          sourceName: '论文C：混合办公模式的元分析',
          sourceType: 'doc',
          sourceId: 'demo_academic_3',
          quote: '每周2-3天远程办公的效果最佳，超过4天则绩效提升不显著',
          highlightedText: '超过4天则绩效提升不显著',
          confidence: 92,
        },
      ],
    },
  ],
  dimensions: [
    {
      id: 'dim_method',
      name: '研究方法',
      status: 'completed',
      summary: '涵盖DID、RCT、元分析多种方法，证据等级较高',
      riskCount: 1,
    },
    {
      id: 'dim_outcome',
      name: '结果指标',
      status: 'completed',
      summary: '生产率与福祉的测量方式不同，解读需谨慎',
      riskCount: 1,
    },
    {
      id: 'dim_dosage',
      name: '远程办公强度',
      status: 'completed',
      summary: '存在非线性关系，2-3天/周可能是最优区间',
      riskCount: 1,
    },
  ],
  riskRelations: {
    associations: [
      {
        sourceName: '论文A：远程工作对生产率的影响',
        sourceType: 'doc',
        riskIds: ['ar_risk_1', 'ar_risk_2'],
        riskCount: 2,
        isConflict: false,
      },
      {
        sourceName: '论文B：远程工作与员工福祉',
        sourceType: 'doc',
        riskIds: ['ar_risk_1', 'ar_risk_2'],
        riskCount: 2,
        isConflict: false,
      },
      {
        sourceName: '论文C：混合办公模式的元分析',
        sourceType: 'doc',
        riskIds: ['ar_risk_1', 'ar_risk_3'],
        riskCount: 2,
        isConflict: false,
      },
    ],
    relatedRiskIds: {
      ar_risk_1: ['ar_risk_2', 'ar_risk_3'],
      ar_risk_2: ['ar_risk_1'],
      ar_risk_3: ['ar_risk_1'],
    },
    conflictPairs: [],
  },
  alignedVersion:
    '综合三篇文献，建议关注：\n1. 研究方法异质性对结论可比性的影响\n2. 生产率与福祉指标的测量差异\n3. 远程办公强度的非线性阈值效应\n4. 长期影响与行业差异的研究空白',
  checklist: [
    {
      id: 'ar_check_1',
      text: '确认纳入研究的设计类型与证据等级',
      checked: false,
      riskType: 'methodology',
      dimension: '研究方法',
    },
    {
      id: 'ar_check_2',
      text: '核对结果指标的操作性定义与测量工具',
      checked: false,
      riskType: 'measurement',
      dimension: '测量方法',
    },
    {
      id: 'ar_check_3',
      text: '评估效应量的实际意义（而非仅统计显著性）',
      checked: false,
      riskType: 'finding',
      dimension: '关键发现',
    },
    {
      id: 'ar_check_4',
      text: '检查异质性来源与亚组分析结果',
      checked: false,
      riskType: 'methodology',
      dimension: '研究方法',
    },
    {
      id: 'ar_check_5',
      text: '确认研究的外部效度与适用范围',
      checked: false,
      riskType: 'finding',
      dimension: '关键发现',
    },
  ],
  extractedEntities: {
    dates: [
      { value: '2019-2021（论文A研究周期）', source: '论文A' },
      { value: '6个月（论文B研究周期）', source: '论文B' },
      { value: '2020-2025（论文C纳入研究周期）', source: '论文C' },
    ],
    amounts: [
      { value: '1200名员工（论文A样本）', source: '论文A' },
      { value: '400名员工（论文B样本）', source: '论文B' },
      { value: '56,789名员工（论文C总样本）', source: '论文C' },
      { value: '+13% 生产率（论文A）', source: '论文A' },
      { value: 'd=0.19 绩效效应量（论文C）', source: '论文C' },
      { value: 'I²=68%（异质性）', source: '论文C' },
    ],
    terms: [
      { value: '双重差分法（DID）', source: '论文A' },
      { value: '随机对照试验（RCT）', source: '论文B' },
      { value: '元分析（Meta-analysis）', source: '论文C' },
      { value: '净收入留存率（NDR）', source: '论文A' },
    ],
    promises: [],
  },
  reasoningTrace: [
    {
      title: '场景识别',
      description: '识别为学术文献综述场景，包含3篇不同研究设计的论文',
      details:
        '分析输入文献类型与研究主题：\n1. 论文A：准自然实验DID设计 → 生产率方向\n2. 论文B：RCT随机对照试验 → 福祉方向\n3. 论文C：系统综述与元分析 → 综合方向\n\n综合判断：远程办公主题文献综述，需从研究方法、结果指标、效应量等维度交叉验证。',
      status: 'completed',
      durationMs: 780,
      tokenUsage: 1400,
    },
    {
      title: '材料解析',
      description: '从三篇论文中提取了研究设计、样本、方法、结果等关键信息',
      details:
        '结构化提取各文献核心信息：\n\n【论文A】\n- 设计：DID准自然实验\n- 样本：1200人，科技公司\n- 结果：生产率+13%（p<0.01）\n- 机制：通勤时间节省+工作灵活性\n\n【论文B】\n- 设计：RCT随机对照\n- 样本：400人，金融公司\n- 结果：满意度+0.32SD，倦怠-0.28SD\n- 注意：对客观生产率无显著影响\n\n【论文C】\n- 设计：系统综述+元分析\n- 样本：28项研究，n=56789\n- 结果：绩效d=0.19，满意度d=0.24\n- 最优：每周2-3天远程办公',
      status: 'completed',
      durationMs: 1650,
      tokenUsage: 3800,
    },
    {
      title: '维度提取',
      description: '确定了研究方法、结果指标、远程办公强度等核心对比维度',
      details:
        '基于循证医学与社会科学知识图谱提取对比维度：\n\n核心维度（高权重）：\n- 研究设计与证据等级 → 权重：0.30\n- 结果指标与测量方式 → 权重：0.25\n\n重要维度（中权重）：\n- 效应量与实际意义 → 权重：0.20\n- 样本与外部效度 → 权重：0.15\n\n一般维度（低权重）：\n- 异质性与亚组 → 权重：0.10',
      status: 'completed',
      durationMs: 950,
      tokenUsage: 1900,
    },
    {
      title: '要素提取',
      description: '提取了研究设计类型、样本量、效应量、p值、置信区间等关键要素',
      details:
        '按维度对各文献要素进行标准化提取：\n\n【研究方法维度】\n- 论文A：DID（准实验，证据等级中高）\n- 论文B：RCT（实验，证据等级高）\n- 论文C：元分析（综合，证据等级最高）\n\n【结果指标维度】\n- 客观指标（生产率）vs 主观指标（满意度/倦怠）\n- 测量方式差异可能解释结果不一致\n\n【剂量-反应维度】\n- 论文A：全职远程（100%）\n- 论文B：2天/周混合\n- 论文C：发现2-3天最优，超过4天增益下降',
      status: 'completed',
      durationMs: 1200,
      tokenUsage: 2700,
    },
    {
      title: '冲突检测',
      description: '发现研究设计异质性、测量指标不一致、非线性阈值效应等关键发现',
      details:
        '跨文献对比检测差异与风险：\n\n🟡 方法学警示（2个）：\n1. 研究设计异质性较高\n   - DID vs RCT vs 元分析\n   - 警示等级：中\n   - 建议：谨慎直接比较效应量\n\n2. 结果测量指标不一致\n   - 客观生产率 vs 主观福祉量表\n   - 警示等级：中\n   - 建议：分指标解读，不做跨指标推论\n\n🟢 重要发现（1个）：\n3. 存在非线性剂量-反应关系\n   - 2-3天/周可能是最优区间\n   - 超过4天增益不显著\n   - 提示：存在"过犹不及"效应',
      status: 'completed',
      durationMs: 1850,
      tokenUsage: 4100,
    },
    {
      title: '结果校验',
      description: '验证了每个发现的证据强度，确认整体结论的稳健性与局限性',
      details:
        '交叉验证与证据等级评估：\n\n【证据强度评估】\n- 生产率提升：中等强度证据（DID+元分析支持）\n- 福祉改善：中高强度证据（RCT+元分析支持）\n- 最优剂量：中等强度证据（元分析亚组支持）\n\n【局限性总结】\n- 样本以白领/知识工作者为主\n- 多数研究为短期效应\n- 行业差异、文化差异研究不足\n\n【总体评估】\n- 高置信度发现（≥85%）：1个（福祉改善）\n- 中置信度发现（70-85%）：2个\n- 建议：解读时注意适用范围，不做过度推论',
      status: 'completed',
      durationMs: 880,
      tokenUsage: 1600,
    },
    {
      title: '报告生成',
      description: '整理分析结果，生成文献综述报告与要点清单',
      details:
        '按照系统综述规范生成最终报告：\n\n- 研究特征汇总表\n- 方法学质量评估\n- 效应量森林图（文字版）\n- 异质性分析与亚组发现\n- 证据等级评定（GRADE框架）\n- 研究空白与未来方向',
      status: 'completed',
      durationMs: 620,
      tokenUsage: 950,
    },
  ],
  debugInfo: {
    model: 'gpt-4o',
    tokenPrompt: 6800,
    tokenCompletion: 2800,
    tokenTotal: 9600,
  },
  preferences: {
    riskWeights: {
      dimensionWeights: {
        methodology: 90,
        measurement: 80,
        finding: 75,
      },
      typeWeights: {
        methodology: 85,
        measurement: 80,
        finding: 70,
      },
      totalChecks: 24,
      lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    draftStyle: {
      formality: 80,
      friendliness: 45,
      conciseness: 65,
      directness: 75,
      totalCopies: 8,
      totalEdits: 5,
      lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      preferredTone: '学术严谨型',
    },
  },
}

DEMO_RESULTS.due_diligence = {
  meta: {
    sourceIds: ['demo_dd_1', 'demo_dd_2', 'demo_dd_3'],
    isIncremental: false,
    durationMs: 5000,
    isMock: undefined,
  },
  summary: { critical: 3, warning: 3, info: 1 },
  risks: [
    {
      id: 'dd_risk_1',
      title: '营收数据真实性存疑',
      description: '年末集中确认收入、总额法/净额法争议，调整后增速从45%降至约15%',
      level: 'critical',
      type: 'fraud_risk',
      dimension: '财务真实性',
      sources: ['目标公司BP及财报', '第三方尽职调查报告'],
      confidence: 88,
      status: 'pending',
      evidence: [
        {
          sourceName: '目标公司BP及财报',
          sourceType: 'doc',
          sourceId: 'demo_dd_1',
          quote: '营业收入：8500万元，同比增长45%',
          highlightedText: '同比增长45%',
          confidence: 95,
        },
        {
          sourceName: '第三方尽职调查报告',
          sourceType: 'doc',
          sourceId: 'demo_dd_2',
          quote: '调整后2024年营收约为6500万元，同比增速约15%',
          highlightedText: '增速约15%',
          confidence: 85,
        },
      ],
    },
    {
      id: 'dd_risk_2',
      title: '未披露关联交易',
      description: '第一大客户（占比28%）为创始人配偶控制企业，但BP中未披露关联关系',
      level: 'critical',
      type: 'disclosure',
      dimension: '关联交易',
      sources: ['第三方尽职调查报告', '创始人访谈纪要'],
      confidence: 90,
      status: 'pending',
      evidence: [
        {
          sourceName: '第三方尽职调查报告',
          sourceType: 'doc',
          sourceId: 'demo_dd_2',
          quote: '第一大客户为关联方（创始人配偶控制的企业），但未披露关联关系',
          highlightedText: '未披露关联关系',
          confidence: 92,
        },
        {
          sourceName: '创始人访谈纪要',
          sourceType: 'doc',
          sourceId: 'demo_dd_3',
          quote: '第一大客户是一家零售集团，我们做的是标杆客户',
          highlightedText: '标杆客户',
          confidence: 80,
        },
      ],
    },
    {
      id: 'dd_risk_3',
      title: '核心知识产权未授权',
      description: '核心算法专利仍在申请中，尚未授权，存在不确定性，与宣传的"技术壁垒"不符',
      level: 'critical',
      type: 'ip_risk',
      dimension: '知识产权',
      sources: ['第三方尽职调查报告', '创始人访谈纪要'],
      confidence: 85,
      status: 'pending',
      evidence: [
        {
          sourceName: '第三方尽职调查报告',
          sourceType: 'doc',
          sourceId: 'demo_dd_2',
          quote: '核心算法专利申请中，尚未授权，存在不确定性',
          highlightedText: '尚未授权',
          confidence: 90,
        },
        {
          sourceName: '创始人访谈纪要',
          sourceType: 'doc',
          sourceId: 'demo_dd_3',
          quote: '正在申请过程中，应该快下来了',
          highlightedText: '应该快下来了',
          confidence: 75,
        },
      ],
    },
    {
      id: 'dd_risk_4',
      title: '核心团队稳定性风险',
      description: '尽调发现近6个月3名核心技术人员离职，但创始人称"团队稳定"',
      level: 'warning',
      type: 'team_risk',
      dimension: '团队稳定性',
      sources: ['第三方尽职调查报告', '创始人访谈纪要'],
      confidence: 80,
      status: 'pending',
      evidence: [
        {
          sourceName: '第三方尽职调查报告',
          sourceType: 'doc',
          sourceId: 'demo_dd_2',
          quote: '核心技术人员有3人于近6个月离职',
          highlightedText: '3人于近6个月离职',
          confidence: 85,
        },
        {
          sourceName: '创始人访谈纪要',
          sourceType: 'doc',
          sourceId: 'demo_dd_3',
          quote: '没有大的变动，都很稳定',
          highlightedText: '都很稳定',
          confidence: 70,
        },
      ],
    },
    {
      id: 'dd_risk_5',
      title: 'NDR和留存率数据口径存疑',
      description:
        '公司宣称NDR 118%、留存率92%，但尽调称剔除一次性因素后NDR约95%，用户口径留存约75%',
      level: 'warning',
      type: 'metric_inflation',
      dimension: '运营指标',
      sources: ['目标公司BP及财报', '第三方尽职调查报告'],
      confidence: 82,
      status: 'pending',
      evidence: [
        {
          sourceName: '目标公司BP及财报',
          sourceType: 'doc',
          sourceId: 'demo_dd_1',
          quote: 'NDR（净收入留存率）：118%...客户留存率：92%',
          highlightedText: 'NDR：118%',
          confidence: 95,
        },
        {
          sourceName: '第三方尽职调查报告',
          sourceType: 'doc',
          sourceId: 'demo_dd_2',
          quote: 'NDR 118%存在水分...剔除后约为95%...用户口径留存率约为75%',
          highlightedText: '用户口径留存率约为75%',
          confidence: 80,
        },
      ],
    },
  ],
  dimensions: [
    {
      id: 'dim_finance',
      name: '财务真实性',
      status: 'completed',
      summary: '营收确认和指标口径存在重大疑问，需进一步核查',
      riskCount: 1,
    },
    {
      id: 'dim_legal',
      name: '法律合规',
      status: 'completed',
      summary: '关联交易未披露、专利未授权、数据合规不足',
      riskCount: 1,
    },
    {
      id: 'dim_team',
      name: '团队与运营',
      status: 'completed',
      summary: '核心人员流失、运营指标口径有水分，团队稳定性存疑',
      riskCount: 1,
    },
  ],
  riskRelations: {
    associations: [
      {
        sourceName: '目标公司BP及财报',
        sourceType: 'doc',
        riskIds: ['dd_risk_1', 'dd_risk_2', 'dd_risk_3', 'dd_risk_5'],
        riskCount: 4,
        isConflict: false,
      },
      {
        sourceName: '第三方尽职调查报告',
        sourceType: 'doc',
        riskIds: ['dd_risk_1', 'dd_risk_2', 'dd_risk_3', 'dd_risk_4', 'dd_risk_5'],
        riskCount: 5,
        isConflict: true,
      },
      {
        sourceName: '创始人访谈纪要',
        sourceType: 'doc',
        riskIds: ['dd_risk_2', 'dd_risk_3', 'dd_risk_4'],
        riskCount: 3,
        isConflict: true,
      },
    ],
    relatedRiskIds: {
      dd_risk_1: ['dd_risk_5'],
      dd_risk_2: ['dd_risk_1', 'dd_risk_5'],
      dd_risk_3: [],
      dd_risk_4: ['dd_risk_5'],
      dd_risk_5: ['dd_risk_1', 'dd_risk_2', 'dd_risk_4'],
    },
    conflictPairs: [
      { risk1Id: 'dd_risk_1', risk2Id: 'dd_risk_5', reason: '营收真实性与运营指标口径直接相关' },
      {
        risk1Id: 'dd_risk_2',
        risk2Id: 'dd_risk_4',
        reason: '诚信问题具有关联性，未披露关联交易与人员稳定性表述相互印证',
      },
    ],
  },
  alignedVersion:
    '综合各材料，尽调核心风险点汇总：\n1. 营收数据真实性存疑，增速可能被严重夸大\n2. 未披露关联交易，公司治理存在缺陷\n3. 核心知识产权未授权，技术壁垒存疑\n4. 核心团队稳定性不足，运营指标有水分\n5. 建议启动专项财务审计和法律尽调',
  checklist: [
    {
      id: 'dd_check_1',
      text: '要求提供经审计的完整财务报表',
      checked: false,
      riskType: 'fraud_risk',
      dimension: '财务真实性',
    },
    {
      id: 'dd_check_2',
      text: '核查前五大客户的关联关系与交易真实性',
      checked: false,
      riskType: 'disclosure',
      dimension: '关联交易',
    },
    {
      id: 'dd_check_3',
      text: '核实核心知识产权的法律状态与权属',
      checked: false,
      riskType: 'ip_risk',
      dimension: '知识产权',
    },
    {
      id: 'dd_check_4',
      text: '确认核心团队人员稳定性与竞业限制情况',
      checked: false,
      riskType: 'team_risk',
      dimension: '团队稳定性',
    },
    {
      id: 'dd_check_5',
      text: '验证NDR、留存率等关键指标的计算口径',
      checked: false,
      riskType: 'metric_inflation',
      dimension: '运营指标',
    },
    {
      id: 'dd_check_6',
      text: '核查数据合规资质与等保认证进展',
      checked: false,
      riskType: 'legal_risk',
      dimension: '法律合规',
    },
    {
      id: 'dd_check_7',
      text: '评估劳动仲裁等未决诉讼风险',
      checked: false,
      riskType: 'legal_risk',
      dimension: '法律合规',
    },
  ],
  extractedEntities: {
    dates: [
      { value: '2024年（财年）', source: '目标公司BP及财报' },
      { value: '2025年6月15日（访谈日期）', source: '创始人访谈纪要' },
    ],
    amounts: [
      { value: '8500万元（宣称营收）', source: '目标公司BP及财报' },
      { value: '6500万元（调整后营收）', source: '第三方尽职调查报告' },
      { value: '+45%（宣称增速）', source: '目标公司BP及财报' },
      { value: '+15%（调整后增速）', source: '第三方尽职调查报告' },
      { value: '5000万元（拟融资额）', source: '目标公司BP及财报' },
      { value: '5亿元（投后估值）', source: '目标公司BP及财报' },
      { value: 'NDR 118%（宣称）', source: '目标公司BP及财报' },
      { value: 'NDR 约95%（调整后）', source: '第三方尽职调查报告' },
    ],
    terms: [
      { value: 'ARR（年度经常性收入）', source: '目标公司BP及财报' },
      { value: 'NDR（净收入留存率）', source: '目标公司BP及财报' },
      { value: '总额法/净额法', source: '第三方尽职调查报告' },
    ],
    promises: [
      { value: '核心专利快下来了', source: '创始人访谈纪要' },
      { value: '团队稳定', source: '创始人访谈纪要' },
    ],
  },
  reasoningTrace: [
    {
      title: '场景识别',
      description: '识别为商业尽职调查场景，包含BP、尽调报告、访谈纪要三类材料',
      details:
        '分析输入材料类型与商业关系：\n1. 检测到商业计划书/财报 → 目标公司自述材料\n2. 检测到第三方尽调报告 → 独立核查材料\n3. 检测到创始人访谈纪要 → 口头陈述材料\n\n综合判断：早期/成长期企业尽调，需从财务、法律、业务、团队等多维度交叉验证。',
      status: 'completed',
      durationMs: 880,
      tokenUsage: 1600,
    },
    {
      title: '材料解析',
      description: '从三份材料中提取了财务数据、法律风险、团队情况等关键信息',
      details:
        '结构化提取各材料核心信息：\n\n【目标公司BP】\n- 财务：营收8500万（+45%），净利1200万，毛利率68%\n- 运营：客户2000+，NDR 118%，留存率92%\n- 团队：创始人大厂背景，核心团队稳定\n- 融资：拟融5000万，投后估值5亿\n\n【第三方尽调报告】\n- 财务：营收确认存疑，调整后约6500万，增速约15%\n- 法律：第一大客户为关联方未披露，专利未授权\n- 运营：NDR和留存率数据有水分\n- 团队：3名核心技术人员近6个月离职\n\n【创始人访谈】\n- 解释：高客户占比是标杆客户、年末确认正常\n- 声称：专利快下来了，团队稳定，等保在办',
      status: 'completed',
      durationMs: 1950,
      tokenUsage: 4500,
    },
    {
      title: '维度提取',
      description: '确定了财务真实性、法律合规、团队运营等核心尽调维度',
      details:
        '基于VC/PE尽调知识图谱提取对比维度：\n\n核心维度（高权重）：\n- 财务真实性 → 权重：0.30\n- 法律合规风险 → 权重：0.25\n\n重要维度（中权重）：\n- 业务模式可持续性 → 权重：0.20\n- 团队稳定性 → 权重：0.15\n\n一般维度（低权重）：\n- 运营指标质量 → 权重：0.10',
      status: 'completed',
      durationMs: 1050,
      tokenUsage: 2200,
    },
    {
      title: '要素提取',
      description: '提取了营收数据、关联关系、知识产权、团队流动、运营指标等关键要素',
      details:
        '按维度对各材料要素进行标准化提取：\n\n【财务真实性维度】\n- 宣称营收：8500万，增速45%\n- 调整后营收：约6500万，增速约15%\n- 差异来源：年末突击确认、总额法/净额法争议\n\n【法律合规维度】\n- 关联交易：第一大客户为创始人配偶控制企业，未披露\n- 知识产权：核心专利申请中，尚未授权\n- 数据合规：未取得等保三级，不符合"金融级"宣传\n- 劳动争议：3起未决仲裁，约50万\n\n【团队与运营维度】\n- 团队：3名核心技术人员近6个月离职\n- NDR：宣称118% vs 调整后约95%\n- 留存率：金额口径92% vs 用户口径约75%',
      status: 'completed',
      durationMs: 1500,
      tokenUsage: 3500,
    },
    {
      title: '冲突检测',
      description: '发现财务造假风险、未披露关联交易、专利不实宣传、团队不稳定等重大风险',
      details:
        '跨材料对比检测风险与红旗：\n\n🔴 严重红旗（3个）：\n1. 营收数据真实性存疑\n   - 8500万 vs 6500万（调整后）\n   - 风险等级：致命（可能影响估值基础）\n   - 红旗信号：年末突击确认、口径争议\n\n2. 未披露重大关联交易\n   - 第一大客户占比28%为关联方\n   - 风险等级：严重（公司治理缺陷）\n   - 红旗信号：创始人否认关联关系\n\n3. 核心知识产权未授权\n   - 宣传"技术壁垒" vs 专利尚在申请中\n   - 风险等级：严重（核心竞争力存疑）\n\n🟡 重要风险（2个）：\n4. 核心团队稳定性存疑\n   - 创始人称"稳定" vs 3名核心技术人员离职\n   - 风险等级：中\n\n5. 运营指标口径有水分\n   - NDR、留存率等关键指标口径存疑\n   - 风险等级：中',
      status: 'completed',
      durationMs: 2400,
      tokenUsage: 5200,
    },
    {
      title: '结果校验',
      description: '验证了每个风险点的证据链，评估了投资风险等级与尽调建议',
      details:
        '交叉验证与风险评级：\n\n【证据链验证】\n- 财务问题：尽调报告有具体分析，BP无法合理解释 → 强证据\n- 关联交易：尽调报告指认，创始人含糊其辞 → 较强证据\n- 专利状态：可公开核实 → 确定性强\n- 团队流动：需进一步核实（可通过背调/LinkedIn）→ 中等证据\n\n【整体风险评级】\n- 综合风险等级：高风险 / 不建议投资（除非价格大幅折扣）\n- 核心问题：信息披露不诚信（关联交易+财务粉饰）\n- 致命缺陷：创始人诚信存疑是最大风险\n\n【建议动作】\n1. 立即启动专项财务审计\n2. 进行全面法律尽调\n3. 核心团队背景调查\n4. 要求估值下调50%+或设置对赌',
      status: 'completed',
      durationMs: 1150,
      tokenUsage: 2100,
    },
    {
      title: '报告生成',
      description: '整理尽调发现，生成风险清单、投资建议和后续核查清单',
      details:
        '按照尽调报告规范生成最终输出：\n\n- 执行摘要（一页纸）\n- 风险清单按严重程度排序\n- 每个风险含证据链与影响评估\n- 财务/法律/业务/团队分模块分析\n- 投资建议与估值调整意见\n- 后续核查清单与优先级排序',
      status: 'completed',
      durationMs: 780,
      tokenUsage: 1300,
    },
  ],
  debugInfo: {
    model: 'gpt-4o',
    tokenPrompt: 9500,
    tokenCompletion: 4200,
    tokenTotal: 13700,
  },
  preferences: {
    riskWeights: {
      dimensionWeights: {
        finance: 95,
        legal: 90,
        business: 80,
        team: 85,
      },
      typeWeights: {
        fraud_risk: 98,
        disclosure: 92,
        ip_risk: 85,
        team_risk: 80,
        metric_inflation: 75,
      },
      totalChecks: 48,
      lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    draftStyle: {
      formality: 90,
      friendliness: 30,
      conciseness: 75,
      directness: 90,
      totalCopies: 6,
      totalEdits: 10,
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      preferredTone: '客观审慎型',
    },
  },
}

DEMO_RESULTS.fact_check = {
  meta: {
    sourceIds: ['demo_fc_1', 'demo_fc_2', 'demo_fc_3', 'demo_fc_4'],
    isIncremental: false,
    durationMs: 4200,
    isMock: undefined,
  },
  summary: { critical: 0, warning: 2, info: 3 },
  risks: [
    {
      id: 'fc_risk_1',
      title: '"裁员500人"为夸大信息',
      description: '网传截图称裁员500人（占30%），但多方信息源证实实际约150-200人，截图系伪造',
      level: 'warning',
      type: 'exaggeration',
      dimension: '事实核查',
      sources: ['网传截图：某公司裁员通知', '公司官方回应', '知情人士爆料（另一平台）', '媒体报道'],
      confidence: 88,
      status: 'pending',
      evidence: [
        {
          sourceName: '网传截图：某公司裁员通知',
          sourceType: 'screenshot',
          sourceId: 'demo_fc_1',
          quote: '本次优化涉及人员约500人，占员工总数的30%',
          highlightedText: '约500人，占30%',
          confidence: 90,
        },
        {
          sourceName: '公司官方回应',
          sourceType: 'web',
          sourceId: 'demo_fc_2',
          quote: '相关截图系伪造...严重不实',
          highlightedText: '截图系伪造',
          confidence: 95,
        },
        {
          sourceName: '媒体报道',
          sourceType: 'web',
          sourceId: 'demo_fc_4',
          quote: '确实在调整...大概一两百人吧',
          highlightedText: '一两百人',
          confidence: 75,
        },
      ],
    },
    {
      id: 'fc_risk_2',
      title: '"完全没有裁员"也不属实',
      description: '官方回应否认一切，但多个独立信息源证实确有人员优化，约150-200人，以销售岗为主',
      level: 'warning',
      type: 'partial_truth',
      dimension: '事实核查',
      sources: ['公司官方回应', '知情人士爆料（另一平台）', '媒体报道'],
      confidence: 82,
      status: 'pending',
      evidence: [
        {
          sourceName: '公司官方回应',
          sourceType: 'web',
          sourceId: 'demo_fc_2',
          quote: '我司目前人员稳定，业务发展良好',
          highlightedText: '人员稳定',
          confidence: 95,
        },
        {
          sourceName: '知情人士爆料（另一平台）',
          sourceType: 'doc',
          sourceId: 'demo_fc_3',
          quote: '裁员是真的，只是数字有出入...实际大概200人左右',
          highlightedText: '裁员是真的',
          confidence: 70,
        },
        {
          sourceName: '媒体报道',
          sourceType: 'web',
          sourceId: 'demo_fc_4',
          quote: '近期收到不少来自XX科技销售岗的简历',
          highlightedText: '销售岗的简历',
          confidence: 72,
        },
      ],
    },
    {
      id: 'fc_risk_3',
      title: '补偿标准说法较为一致',
      description: '网传N+1补偿与爆料N+1+年假折现基本吻合，公司补偿方案优于法定标准',
      level: 'info',
      type: 'consistent',
      dimension: '补偿方案',
      sources: ['网传截图：某公司裁员通知', '知情人士爆料（另一平台）'],
      confidence: 78,
      status: 'pending',
      evidence: [
        {
          sourceName: '网传截图：某公司裁员通知',
          sourceType: 'screenshot',
          sourceId: 'demo_fc_1',
          quote: '被优化员工将获得N+1补偿',
          highlightedText: 'N+1补偿',
          confidence: 85,
        },
        {
          sourceName: '知情人士爆料（另一平台）',
          sourceType: 'doc',
          sourceId: 'demo_fc_3',
          quote: '补偿N+1+未休年假折现...比法律规定的好一些',
          highlightedText: 'N+1+未休年假折现',
          confidence: 70,
        },
      ],
    },
  ],
  dimensions: [
    {
      id: 'dim_scale',
      name: '裁员规模',
      status: 'completed',
      summary: '网传500人夸大，实际约150-200人，但"完全没有"也不属实',
      riskCount: 1,
    },
    {
      id: 'dim_scope',
      name: '涉及部门',
      status: 'completed',
      summary: '以销售和职能岗为主，技术线基本不受影响',
      riskCount: 0,
    },
    {
      id: 'dim_compensation',
      name: '补偿方案',
      status: 'completed',
      summary: 'N+1或更高标准，补偿方案优于法定标准',
      riskCount: 0,
    },
  ],
  riskRelations: {
    associations: [
      {
        sourceName: '网传截图：某公司裁员通知',
        sourceType: 'screenshot',
        riskIds: ['fc_risk_1', 'fc_risk_2', 'fc_risk_3'],
        riskCount: 3,
        isConflict: false,
      },
      {
        sourceName: '公司官方回应',
        sourceType: 'web',
        riskIds: ['fc_risk_1', 'fc_risk_2'],
        riskCount: 2,
        isConflict: true,
      },
      {
        sourceName: '知情人士爆料（另一平台）',
        sourceType: 'doc',
        riskIds: ['fc_risk_1', 'fc_risk_2', 'fc_risk_3'],
        riskCount: 3,
        isConflict: true,
      },
      {
        sourceName: '媒体报道',
        sourceType: 'web',
        riskIds: ['fc_risk_1', 'fc_risk_2'],
        riskCount: 2,
        isConflict: false,
      },
    ],
    relatedRiskIds: {
      fc_risk_1: ['fc_risk_2'],
      fc_risk_2: ['fc_risk_1'],
      fc_risk_3: [],
    },
    conflictPairs: [
      {
        risk1Id: 'fc_risk_1',
        risk2Id: 'fc_risk_2',
        reason: '网传夸大与官方否认的两个极端均不准确，真相在中间',
      },
    ],
  },
  alignedVersion:
    '综合多方信源，事实核查结论：\n1. "裁员500人、占比30%"为夸大不实信息，截图系伪造\n2. "完全没有裁员"也不准确，确有150-200人规模的人员优化\n3. 以销售和职能岗为主，技术线基本不受影响\n4. 补偿方案N+1或更高，优于法定标准\n5. 建议：不传谣不信谣，等待官方进一步信息',
  checklist: [
    {
      id: 'fc_check_1',
      text: '核实截图的原始来源与发布者身份',
      checked: false,
      riskType: 'exaggeration',
      dimension: '事实核查',
    },
    {
      id: 'fc_check_2',
      text: '交叉验证多个独立信源的一致性',
      checked: false,
      riskType: 'partial_truth',
      dimension: '事实核查',
    },
    {
      id: 'fc_check_3',
      text: '确认涉及部门与人员规模的准确数字',
      checked: false,
      riskType: 'exaggeration',
      dimension: '裁员规模',
    },
    {
      id: 'fc_check_4',
      text: '核实补偿方案的具体标准',
      checked: false,
      riskType: 'consistent',
      dimension: '补偿方案',
    },
    {
      id: 'fc_check_5',
      text: '评估信息发布者的利益关联与动机',
      checked: false,
      riskType: 'partial_truth',
      dimension: '事实核查',
    },
  ],
  extractedEntities: {
    dates: [
      { value: '2025年6月28日（网传日期）', source: '网传截图' },
      { value: '2025年7月1日（网传执行日期）', source: '网传截图' },
      { value: '2025年6月29日（官方声明日期）', source: '公司官方回应' },
    ],
    amounts: [
      { value: '500人（网传，占30%）', source: '网传截图' },
      { value: '150-200人（多方信源证实）', source: '知情人士爆料+媒体报道' },
      { value: 'N+1补偿（网传）', source: '网传截图' },
      { value: 'N+1+未休年假折现（爆料）', source: '知情人士爆料' },
    ],
    terms: [
      { value: '组织架构优化', source: '网传截图' },
      { value: '末位淘汰+业务线收缩', source: '知情人士爆料' },
    ],
    promises: [],
  },
  reasoningTrace: [
    {
      title: '场景识别',
      description: '识别为事实核查场景，包含网传截图、官方回应、匿名爆料、媒体报道四类信源',
      details:
        '分析输入信源类型与可信度：\n1. 检测到网传截图（匿名来源）→ 可信度：低\n2. 检测到官方声明（机构来源）→ 可信度：中高（但有利益关联）\n3. 检测到匿名爆料（多平台）→ 可信度：中（需交叉验证）\n4. 检测到媒体报道（第三方）→ 可信度：中高\n\n综合判断：企业裁员传闻事实核查，需从多源交叉验证、证据链溯源、利益关联分析等维度推进。',
      status: 'completed',
      durationMs: 720,
      tokenUsage: 1300,
    },
    {
      title: '材料解析',
      description: '从四份材料中提取了各方说法、关键数字、证据类型等信息',
      details:
        '结构化提取各信源核心主张：\n\n【网传截图】\n- 主张：裁员500人，占30%，N+1补偿\n- 来源：匿名用户，某职场社交平台\n- 证据：截图一张（真实性存疑）\n- 传播：转发1.2万+，评论3000+\n\n【官方回应】\n- 主张：截图伪造，完全不实，人员稳定\n- 来源：公司官方声明\n- 证据：无具体数字\n- 立场：否认一切\n\n【匿名爆料（多平台）】\n- 主张：确有优化，约150-200人，销售岗为主\n- 来源：多名匿名用户，不同平台\n- 证据：无直接证据，但说法高度一致\n- 补偿：N+1+年假折现\n\n【媒体报道】\n- 主张：确有调整，约一两百人，销售为主\n- 来源：媒体记者，多方信源\n- 证据：内部人士+猎头侧面印证',
      status: 'completed',
      durationMs: 1550,
      tokenUsage: 3600,
    },
    {
      title: '维度提取',
      description: '确定了事实核查的核心维度：规模真实性、涉及范围、补偿标准、信息溯源',
      details:
        '基于事实核查方法论提取对比维度：\n\n核心维度（高权重）：\n- 核心事实准确性 → 权重：0.30\n- 信源可信度评估 → 权重：0.25\n\n重要维度（中权重）：\n- 多源交叉印证 → 权重：0.20\n- 利益关联分析 → 权重：0.15\n\n一般维度（低权重）：\n- 传播路径溯源 → 权重：0.10',
      status: 'completed',
      durationMs: 880,
      tokenUsage: 1800,
    },
    {
      title: '要素提取',
      description: '提取了裁员规模数字、涉及部门、补偿标准、信源特征等关键要素',
      details:
        '按维度对各信源要素进行标准化提取：\n\n【裁员规模维度】\n- 网传：500人，30%\n- 官方：否认一切（无具体数字）\n- 匿名爆料：150-200人，销售为主\n- 媒体：一两百人，销售岗\n- 交叉点：150-200人区间有多个独立信源支持\n\n【涉及部门维度】\n- 网传：未提及部门分布\n- 官方：未提及\n- 匿名爆料：市场+销售部门，技术少\n- 媒体：销售体系为主，技术基本不动\n- 交叉点：销售/职能岗为主，技术线影响小\n\n【补偿方案维度】\n- 网传：N+1\n- 官方：未提及\n- 匿名爆料：N+1+未休年假折现\n- 媒体：未提及补偿细节\n- 交叉点：N+1基础上可能有额外补偿',
      status: 'completed',
      durationMs: 1250,
      tokenUsage: 2900,
    },
    {
      title: '冲突检测',
      description: '发现网传信息夸大、官方否认过度、中间地带才是真相的典型事实核查模式',
      details:
        '多信源交叉检测真实性：\n\n🟡 夸大信息（1个）：\n1. "裁员500人，占比30%"\n   - 状态：严重夸大\n   - 依据：截图伪造（官方+爆料均确认）\n   - 真实情况：约150-200人\n   - 夸大倍数：2.5-3倍\n\n🟡 部分不实（1个）：\n2. "完全没有裁员"\n   - 状态：官方否认过度\n   - 依据：多平台匿名爆料+媒体报道+猎头印证\n   - 真实情况：确有人员优化，但规模较小\n\n🟢 基本一致（1个）：\n3. 补偿标准\n   - 状态：多方说法基本吻合\n   - N+1是共识，可能有额外补偿\n   - 整体优于法定标准',
      status: 'completed',
      durationMs: 1750,
      tokenUsage: 3900,
    },
    {
      title: '结果校验',
      description: '通过多源交叉验证评估了各信息点的可信度，给出了事实核查结论',
      details:
        '交叉验证与可信度评估：\n\n【可信度评级】\n- "500人/30%"：低可信度（单一匿名来源+截图伪造+与其他信源严重偏离）\n- "完全没有裁员"：低可信度（官方立场+与多信源矛盾+无具体反证）\n- "150-200人优化"：中高可信度（3个以上独立信源交叉印证）\n- "销售岗为主"：中高可信度（匿名爆料+媒体+猎头三方一致）\n- "N+1或更高补偿"：中等可信度（2个信源支持，无矛盾）\n\n【核查方法说明】\n- 信源数量：3+独立信源为高可信度阈值\n- 信源多样性：不同平台+不同身份（内部人+媒体+第三方）\n- 利益中立度：匿名爆料>媒体报道>官方声明>网传截图\n\n【最终结论】\n- 整体事实等级：部分属实（数字夸大，内核为真）\n- 建议：持续关注，等待更多官方信息',
      status: 'completed',
      durationMs: 980,
      tokenUsage: 2000,
    },
    {
      title: '报告生成',
      description: '按照事实核查规范生成核查报告，包含可信度评级与证据链说明',
      details:
        '生成标准化事实核查报告：\n\n- 核查结论摘要（一句话结论）\n- 事件时间线梳理\n- 各信源主张对比表\n- 关键事实点可信度评级\n- 证据链与交叉验证说明\n- 核查局限性说明\n- 信息溯源与传播路径\n- 待核实问题清单',
      status: 'completed',
      durationMs: 580,
      tokenUsage: 850,
    },
  ],
  debugInfo: {
    model: 'gpt-4o',
    tokenPrompt: 7200,
    tokenCompletion: 3100,
    tokenTotal: 10300,
  },
  preferences: {
    riskWeights: {
      dimensionWeights: {
        accuracy: 95,
        source: 90,
        evidence: 85,
        motive: 75,
      },
      typeWeights: {
        exaggeration: 80,
        partial_truth: 85,
        consistent: 50,
      },
      totalChecks: 30,
      lastUpdated: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    draftStyle: {
      formality: 75,
      friendliness: 50,
      conciseness: 80,
      directness: 85,
      totalCopies: 10,
      totalEdits: 6,
      lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      preferredTone: '中立客观型',
    },
  },
}

DEMO_RESULTS.job_offer = DEMO_RESULTS.job
DEMO_RESULTS.rental = DEMO_RESULTS.rent

export const DEMO_INCREMENTAL_FLOW = {
  initialSources: ['demo_job_1', 'demo_job_2'],
  initialResult: {
    meta: {
      sourceIds: ['demo_job_1', 'demo_job_2'],
      isIncremental: false,
      durationMs: 3500,
      isMock: undefined,
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
        isMock: undefined,
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
        isMock: undefined,
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
