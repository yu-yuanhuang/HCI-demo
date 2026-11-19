/**
 * MicroLoan（微微貸）- 核心數據與模擬資料庫
 * 課程：智慧人機互動與使用介面研究
 * 作者：黃裕元 | 指導教授：陳志銘
 */

const SYSTEM_CONFIG = {
  version: "v0.1-20261015-transparency",
  institution: "MicroLoan 智慧人機互動研究實驗室",
  maxLoanAmount: 150000,
  aiTriageThreshold: 100000, // 10萬元分流門檻
  annualInterestRate: 0.06,  // 固定年利率 6%
  surplusBurdenRatio: 0.40,  // 40% 餘額安全緩衝負擔率
  handlingFee: 0,            // 模擬無開辦費
  overduePenaltyRate: 0      // 模擬逾期免收罰息
};

// 2026年 雙北市法定所得與資產基準（社會救助法參照）
const BENCHMARKS_2026 = {
  taipei: {
    name: "臺北市",
    lowIncomeCeiling: 20744,
    midLowIncomeCeiling: 29635,
    movablePropertyLimit: 160000, // 每人動產
    immovablePropertyLimit: 9920000, // 每戶不動產
    source: "臺北市政府社會局 (2026)"
  },
  newTaipei: {
    name: "新北市",
    lowIncomeCeiling: 17750,
    midLowIncomeCeiling: 26625,
    movablePropertyLimit: 150000, // 每人動產
    immovablePropertyLimit: 7080000, // 每戶不動產
    source: "新北市政府社會局 (2025/2026)"
  }
};

// Persona 設定
const PERSONAS = {
  borrower: {
    name: "林先生",
    maskedName: "林*元",
    age: 32,
    location: "新北市板橋區",
    housing: "租屋（無自有房屋與土地）",
    occupation: "外送接案 / 按件計酬工作者",
    householdCount: 2,
    householdTotalIncome: 48000,
    perCapitaIncome: 24000, // 低於新北市中低收入上限 26,625
    personalIncome: 28000,
    necessaryExpense: 18000,
    existingDebtPayment: 2000,
    calculatedSurplus: 8000,
    burdenLimit: 3200, // 8000 * 40%
    targetLoan: 50000,
    painPoints: ["急迫週轉需要明確時效", "擔心收入浮動遭拒", "害怕複利或高利息陷阱", "希望保留自尊與隱私"]
  },
  officer: {
    name: "陳專員",
    role: "微額信貸案件審查資深專員",
    age: 35,
    department: "授信風險管理處",
    responsibilities: ["處理超過10萬元案件審核", "人工覆核與申訴裁決", "補件審查與異常追蹤", "輸入實質決策理由"]
  }
};

// 初始模擬案件 (共12件，完美符合Dashboard統計驗算)
// 分布：待補件 2、審核中 2、已核准待簽署 1、執行中 3、結案 2、無法核貸 1、已撤回 1
const INITIAL_CASES = [
  {
    id: "ML001",
    applicantName: "林*元",
    idNumber: "F128****90",
    phone: "0912-***-456",
    amount: 50000,
    status: "已核准待簽署",
    triageType: "AI核貸決策",
    income: 28000,
    incomeType: "浮動收入（近3個月平均）",
    expense: 18000,
    debt: 2000,
    surplus: 8000,
    maxAllowedMonthly: 3200,
    ocrStatus: "核對相符",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-10-15 14:20",
    updatedAt: "2026-10-15 14:23",
    assignedTo: "AI 自動引擎",
    selectedPlan: "C", // 18期
    notes: "AI核貸完成：收支餘額8,000元，符合40%負擔上限(3,200元)。方案C月付2,912元符合條件，等待借款人確認簽署。",
    history: [
      { time: "2026-10-15 14:20", actor: "申請人 林*元", action: "提交借款申請 50,000元 (附證件與收入說明)" },
      { time: "2026-10-15 14:21", actor: "AI 影像模組", action: "證件與存摺辨識完成，比對相符" },
      { time: "2026-10-15 14:23", actor: "AI 決策引擎", action: "依40%餘額規則評估通過，分流至方案選擇" }
    ]
  },
  {
    id: "ML002",
    applicantName: "陳*美",
    idNumber: "A221****34",
    phone: "0933-***-882",
    amount: 120000,
    status: "審核中",
    triageType: "人工審核 (超額分流)",
    income: 38000,
    incomeType: "固定兼職+網拍",
    expense: 22000,
    debt: 3000,
    surplus: 13000,
    maxAllowedMonthly: 5200,
    ocrStatus: "已手動確認",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-10-15 09:15",
    updatedAt: "2026-10-15 10:00",
    assignedTo: "陳專員",
    selectedPlan: null,
    notes: "申請金額120,000元 > 100,000元門檻，分流至人工專員審查。AI初評：收支正常，可用餘額13,000元，建議可予核准18期分期，等待審查員填寫最終覆核理由。",
    history: [
      { time: "2026-10-15 09:15", actor: "申請人 陳*美", action: "提交借款申請 120,000元" },
      { time: "2026-10-15 09:16", actor: "AI 分流模組", action: "金額超額10萬元，標記【人工審核中，尚未核准】並指派專員" },
      { time: "2026-10-15 10:00", actor: "陳專員", action: "調閱健保投保紀錄與收支報表，進行二次核實" }
    ]
  },
  {
    id: "ML003",
    applicantName: "王*祥",
    idNumber: "H120****51",
    phone: "0955-***-119",
    amount: 30000,
    status: "待補件",
    triageType: "AI核貸決策",
    income: 0,
    incomeType: "未完整填寫",
    expense: 15000,
    debt: 0,
    surplus: -15000,
    maxAllowedMonthly: 0,
    ocrStatus: "補件待驗證",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-10-14 16:40",
    updatedAt: "2026-10-14 16:42",
    assignedTo: "AI 自動引擎",
    selectedPlan: null,
    notes: "申請人未檢附近三個月入帳存摺或工作酬勞證明，系統已發出缺項補件通知，不以自動填零替代。",
    history: [
      { time: "2026-10-14 16:40", actor: "申請人 王*祥", action: "提交借款申請 30,000元" },
      { time: "2026-10-14 16:42", actor: "AI 完整性檢查", action: "偵測到收入欄位缺失，狀態轉為【待補件】，推送補件指引" }
    ]
  },
  {
    id: "ML004",
    applicantName: "張*華",
    idNumber: "B229****87",
    phone: "0972-***-901",
    amount: 80000,
    status: "無法核貸",
    triageType: "AI核貸決策",
    income: 22000,
    incomeType: "臨時工自述",
    expense: 19000,
    debt: 2000,
    surplus: 1000,
    maxAllowedMonthly: 400,
    ocrStatus: "已核對",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-10-13 11:10",
    updatedAt: "2026-10-13 11:13",
    assignedTo: "AI 自動引擎",
    selectedPlan: null,
    notes: "每月可用餘額僅1,000元，40%負擔上限為400元。80,000元之最長18期月付仍需4,659元，超出安全負擔能力。系統提供調整金額或申請人工覆核管道。",
    history: [
      { time: "2026-10-13 11:10", actor: "申請人 張*華", action: "提交借款申請 80,000元" },
      { time: "2026-10-13 11:13", actor: "AI 決策引擎", action: "計算三方案均超出可負擔餘額(400元)，作成【無法核貸】決策並陳述計算公式與申訴入口" }
    ]
  },
  {
    id: "ML005",
    applicantName: "李*明",
    idNumber: "E123****78",
    phone: "0921-***-334",
    amount: 50000,
    status: "執行中",
    triageType: "AI核貸決策",
    income: 30000,
    incomeType: "固定兼職",
    expense: 19000,
    debt: 1000,
    surplus: 10000,
    maxAllowedMonthly: 4000,
    ocrStatus: "核對相符",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-08-15 10:00",
    updatedAt: "2026-10-15 15:00",
    assignedTo: "系統管理",
    selectedPlan: "C", // 18期
    repaymentProgress: {
      currentPeriod: 3,
      totalPeriods: 18,
      monthlyPayment: 2912,
      paidAmount: 8736,
      remainingAmount: 43673,
      nextDueDate: "2026-11-15",
      isPaidThisMonth: false
    },
    notes: "正常履約中。已繳納2期，本期待繳。系統已排程非侵入式到期前3日推播通知。",
    history: [
      { time: "2026-08-15 10:20", actor: "申請人 李*明", action: "完成電子簽署，契約生效開案" },
      { time: "2026-09-15 09:30", actor: "系統自動扣款", action: "成功繳納第 1 期 (2,912元)" },
      { time: "2026-10-15 14:10", actor: "李*明 (行動端)", action: "自主點擊完成第 2 期繳款 (2,912元)" }
    ]
  },
  {
    id: "ML006",
    applicantName: "趙*強",
    idNumber: "D120****62",
    phone: "0988-***-776",
    amount: 20000,
    status: "結案",
    triageType: "AI核貸決策",
    income: 26000,
    incomeType: "計程車司機",
    expense: 17000,
    debt: 0,
    surplus: 9000,
    maxAllowedMonthly: 3600,
    ocrStatus: "核對相符",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-04-10 13:00",
    updatedAt: "2026-10-10 11:00",
    assignedTo: "系統管理",
    selectedPlan: "A", // 6期
    repaymentProgress: {
      currentPeriod: 6,
      totalPeriods: 6,
      monthlyPayment: 3392,
      paidAmount: 20352,
      remainingAmount: 0,
      nextDueDate: "已結清",
      isPaidThisMonth: true
    },
    notes: "已依約全額清償，共6期本息合計20,352元。已發給數位清償證明並安全歸檔結案。",
    history: [
      { time: "2026-04-10 13:30", actor: "申請人 趙*強", action: "選定方案A簽署開案" },
      { time: "2026-10-10 11:00", actor: "系統記帳模組", action: "第6期最後尾款收訖，本案清償結案" }
    ]
  },
  // 以下6案補充以達成 Dashboard 12 案測試批次
  {
    id: "ML007",
    applicantName: "許*文",
    idNumber: "C120****19",
    phone: "0918-***-223",
    amount: 45000,
    status: "待補件",
    triageType: "AI核貸決策",
    income: 27000,
    incomeType: "兼職倉儲",
    expense: 19000,
    debt: 1500,
    surplus: 6500,
    maxAllowedMonthly: 2600,
    ocrStatus: "影像反光模糊",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-10-15 11:20",
    updatedAt: "2026-10-15 11:22",
    assignedTo: "AI 自動引擎",
    selectedPlan: null,
    notes: "租屋居住證明影像有反光遮蔽，請重新上傳清晰租約封面。",
    history: [
      { time: "2026-10-15 11:20", actor: "申請人 許*文", action: "上傳證件申請" },
      { time: "2026-10-15 11:22", actor: "AI 影像模組", action: "辨識信心值不足(45%)，標記【待補件】" }
    ]
  },
  {
    id: "ML008",
    applicantName: "郭*婷",
    idNumber: "K222****89",
    phone: "0960-***-998",
    amount: 150000,
    status: "審核中",
    triageType: "人工審核 (超額分流)",
    income: 42000,
    incomeType: "早午餐店員",
    expense: 23000,
    debt: 4000,
    surplus: 15000,
    maxAllowedMonthly: 6000,
    ocrStatus: "已手動核對",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-10-15 08:30",
    updatedAt: "2026-10-15 09:10",
    assignedTo: "陳專員",
    selectedPlan: null,
    notes: "最高額度案件審查。申請人已補充近年薪資轉帳明細，專員查核無跳票與高利借貸紀錄。",
    history: [
      { time: "2026-10-15 08:30", actor: "申請人 郭*婷", action: "提交借款申請 150,000元" },
      { time: "2026-10-15 09:10", actor: "陳專員", action: "排入人工覆核序列" }
    ]
  },
  {
    id: "ML009",
    applicantName: "孫*傑",
    idNumber: "P124****44",
    phone: "0937-***-512",
    amount: 60000,
    status: "執行中",
    triageType: "AI核貸決策",
    income: 32000,
    incomeType: "物流司機",
    expense: 20000,
    debt: 1000,
    surplus: 11000,
    maxAllowedMonthly: 4400,
    ocrStatus: "核對相符",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-05-18 10:00",
    updatedAt: "2026-10-15 12:00",
    assignedTo: "系統管理",
    selectedPlan: "B", // 12期
    repaymentProgress: {
      currentPeriod: 6,
      totalPeriods: 12,
      monthlyPayment: 5164,
      paidAmount: 30984,
      remainingAmount: 30984,
      nextDueDate: "2026-11-18",
      isPaidThisMonth: true
    },
    notes: "正常履約中，已繳6期，剩餘6期。",
    history: [
      { time: "2026-05-18 10:00", actor: "申請人 孫*傑", action: "完成方案B簽約生效" }
    ]
  },
  {
    id: "ML010",
    applicantName: "楊*芬",
    idNumber: "T220****67",
    phone: "0928-***-114",
    amount: 35000,
    status: "執行中",
    triageType: "AI核貸決策",
    income: 29000,
    incomeType: "美容美髮助理",
    expense: 18000,
    debt: 0,
    surplus: 11000,
    maxAllowedMonthly: 4400,
    ocrStatus: "核對相符",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-09-28 14:00",
    updatedAt: "2026-10-15 13:00",
    assignedTo: "系統管理",
    selectedPlan: "A", // 6期
    repaymentProgress: {
      currentPeriod: 1,
      totalPeriods: 6,
      monthlyPayment: 5936,
      paidAmount: 5936,
      remainingAmount: 29680,
      nextDueDate: "2026-11-01",
      isPaidThisMonth: true
    },
    notes: "正常履約中，已繳納第1期。",
    history: [
      { time: "2026-09-28 14:00", actor: "申請人 楊*芬", action: "簽署方案A開案" }
    ]
  },
  {
    id: "ML011",
    applicantName: "周*維",
    idNumber: "L121****03",
    phone: "0915-***-667",
    amount: 40000,
    status: "結案",
    triageType: "AI核貸決策",
    income: 31000,
    incomeType: "維修技工",
    expense: 20000,
    debt: 1000,
    surplus: 10000,
    maxAllowedMonthly: 4000,
    ocrStatus: "核對相符",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-02-10 11:00",
    updatedAt: "2026-09-20 15:30",
    assignedTo: "系統管理",
    selectedPlan: "B", // 12期
    repaymentProgress: {
      currentPeriod: 12,
      totalPeriods: 12,
      monthlyPayment: 3442,
      paidAmount: 41312,
      remainingAmount: 0,
      nextDueDate: "已結案",
      isPaidThisMonth: true
    },
    notes: "提前於2026年9月完全清償，無任何遲延違約紀錄。",
    history: [
      { time: "2026-09-20 15:30", actor: "周*維", action: "清償尾款並結案歸檔" }
    ]
  },
  {
    id: "ML012",
    applicantName: "吳*安",
    idNumber: "G122****98",
    phone: "0952-***-409",
    amount: 50000,
    status: "已撤回",
    triageType: "AI核貸決策",
    income: 28000,
    incomeType: "清潔作業員",
    expense: 19000,
    debt: 1000,
    surplus: 8000,
    maxAllowedMonthly: 3200,
    ocrStatus: "已核對",
    ruleVersion: "v0.1-20261015",
    appliedAt: "2026-10-12 10:00",
    updatedAt: "2026-10-12 15:00",
    assignedTo: "AI 自動引擎",
    selectedPlan: null,
    notes: "審核通過待簽署階段，申請人來電告知已獲得親友資助，於介面主動點擊【撤回申請】。",
    history: [
      { time: "2026-10-12 10:00", actor: "申請人 吳*安", action: "提交借款申請 50,000元" },
      { time: "2026-10-12 10:03", actor: "AI 決策引擎", action: "審核通過，進入待簽署" },
      { time: "2026-10-12 15:00", actor: "申請人 吳*安", action: "自主點擊【撤回未簽署案件】，系統安全存檔" }
    ]
  }
];

// 初始稽核操作日誌
const INITIAL_AUDIT_LOGS = [
  { id: "LOG-101", time: "2026-10-15 14:23", operator: "AI 決策引擎 (v0.1)", targetCase: "ML001", action: "AI自動核貸分流", detail: "借款50,000元 <= 10萬元，收支餘額8,000元，生成A/B/C方案，Plan C符合40%負擔" },
  { id: "LOG-102", time: "2026-10-15 10:00", operator: "陳專員 (審核員)", targetCase: "ML002", action: "受理超額人工覆核", detail: "調閱健保投保紀錄與收支報表，120,000元超額案件進行二次人工覆核" },
  { id: "LOG-103", time: "2026-10-14 16:42", operator: "AI 完整性模組", targetCase: "ML003", action: "標記缺項發送補件", detail: "缺少近三個月收入明細，觸發待補件通知，不自動補零值" },
  { id: "LOG-104", time: "2026-10-13 11:13", operator: "AI 決策引擎 (v0.1)", targetCase: "ML004", action: "核貸不通過並告知原因", detail: "計算餘額僅1,000元，月付上限400元，無法負擔任何方案，提供更正與覆核入口" },
  { id: "LOG-105", time: "2026-10-12 15:00", operator: "申請人 吳*安", targetCase: "ML012", action: "簽署前主動撤回", detail: "因親友資助點擊撤回，釋出額度並記錄撤回原因" }
];
