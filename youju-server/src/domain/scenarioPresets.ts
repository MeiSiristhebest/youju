import type { ScenarioPreset } from './types.js'

/**
 * 预设场景数据（单一数据源，供 routes 和 preheat 共享）
 *
 * - routes/scenarios.ts 用于 GET /scenarios 与 POST /scenarios/:id/init
 * - domain/services/analysisCache.ts 的 preheatScenarios 用于服务启动时预计算
 */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'job',
    name: '求职 Offer 确认',
    icon: '💼',
    description: '核对 HR 口头承诺与正式 Offer 是否一致',
    sources: [
      {
        type: 'chat',
        name: 'HR 微信沟通记录',
        content:
          'HR小李 10:30:\n您好，很高兴通知您通过了面试！\n\n您 10:32:\n谢谢！请问薪资结构是怎样的？\n\nHR小李 10:35:\n月薪25k，另外每年有2-3个月年终奖\n\n您 10:36:\n试用期是多久？\n\nHR小李 10:38:\n试用期2个月，期间薪资不打折\n\n您 10:40:\n请问每年有调薪机会吗？\n\nHR小李 10:42:\n每年两次调薪机会，表现好的话涨幅10-20%\n\n您 10:45:\n五险一金怎么交？\n\nHR小李 10:48:\n五险一金按实际工资全额缴纳，公积金12%',
        meta: '微信 · 15条消息',
      },
      {
        type: 'doc',
        name: 'Offer 邮件',
        content:
          '正式录用通知书\n\n尊敬的候选人：\n\n很高兴通知您已被录用，薪资待遇如下：\n- 年薪：30万元（固定）\n- 试用期：6个月\n- 五险一金：按北京市最低标准缴纳\n- 工作地点：北京市朝阳区\n\n请于2024年3月1日前回复确认。',
        meta: '邮件 · PDF附件',
      },
      {
        type: 'contract',
        name: '劳动合同草案',
        content:
          '劳动合同（草案）\n\n第一条 试用期\n试用期为6个月，试用期工资为正式工资的80%。\n\n第二条 薪资\n乙方年薪为人民币24万元。\n\n第三条 社保\n甲方按国家规定为乙方缴纳社会保险。',
        meta: 'PDF · 12页',
      },
    ],
  },
  {
    id: 'rent',
    name: '租房签约',
    icon: '🏠',
    description: '核对中介承诺与合同条款是否一致',
    sources: [
      {
        type: 'chat',
        name: '中介微信沟通',
        content:
          '中介王经理 14:20:\n这套房子月租4500，押一付三\n\n您 14:22:\n水电费怎么算？\n\n中介王经理 14:25:\n水费包在房租里，电费你自己交\n\n您 14:28:\n家电坏了谁负责修？\n\n中介王经理 14:30:\n家电我们负责维修，随时联系我们\n\n您 14:32:\n可以养宠物吗？\n\n中介王经理 14:35:\n可以养，没问题',
        meta: '微信 · 20条消息',
      },
      {
        type: 'contract',
        name: '租房合同',
        content:
          '房屋租赁合同\n\n第三条 租金\n月租金4500元，押金4500元。\n\n第四条 水电\n水费、电费由承租人承担。\n\n第五条 维修\n房屋内设施由承租人自行维护维修。\n\n第六条 禁止事项\n禁止在房屋内饲养宠物。',
        meta: 'PDF · 8页',
      },
    ],
  },
  {
    id: 'homework',
    name: '作业/申请提交',
    icon: '📚',
    description: '核对提交要求与材料是否一致',
    sources: [
      {
        type: 'web',
        name: '课程官网要求',
        content:
          '期末论文提交要求\n\n1. 格式：PDF格式\n2. 字数：不少于5000字\n3. 截止时间：2024年1月15日 23:59\n4. 提交方式：通过课程系统提交\n5. 延期政策：每延期1天扣10分，最多延期3天',
        meta: '网页 · 课程公告',
      },
      {
        type: 'chat',
        name: '助教群消息',
        content:
          '助教张老师 16:30:\n@所有人 论文截止时间延期到1月20日，不用扣分\n\n同学A 16:35:\n字数要求有变化吗？\n\n助教张老师 16:40:\n字数还是5000字以上\n\n同学B 16:45:\n可以提交Word格式吗？\n\n助教张老师 16:50:\n可以，Word格式也接受',
        meta: '微信群 · 12条消息',
      },
    ],
  },
]
