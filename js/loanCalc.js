/**
 * MicroLoan（微微貸）- 金融計算引擎與XAI決策邏輯
 * 依據專案規格書：
 * 1. 本息平均攤還 (PMT) 公式：M = P * r / [1 - (1 + r)^(-n)]
 * 2. 餘額公式：R = I - E - D
 * 3. 40% 安全負擔門檻：M <= 0.40 * R
 * 4. 10萬元核貸分流門檻：P <= 100,000 (AI) vs P > 100,000 (人工審核)
 */

const LoanEngine = {
  /**
   * 計算每月本息平均攤還金額 (PMT)
   * @param {number} P 借款本金
   * @param {number} annualRate 固定年利率 (例如 0.06)
   * @param {number} n 期數 (月數)
   * @returns {object} { monthlyPayment, totalRepayment, totalInterest }
   */
  calculatePMT(P, annualRate = 0.06, n = 12) {
    if (P <= 0 || n <= 0) {
      return { monthlyPayment: 0, totalRepayment: 0, totalInterest: 0 };
    }
    const r = annualRate / 12; // 月利率
    // M = P * r / (1 - (1+r)^(-n))
    const powFactor = Math.pow(1 + r, -n);
    const rawM = (P * r) / (1 - powFactor);
    const monthlyPayment = Math.round(rawM);
    const totalRepayment = monthlyPayment * n;
    const totalInterest = totalRepayment - P;

    return {
      monthlyPayment,
      totalRepayment,
      totalInterest,
      monthlyRate: r,
      periods: n
    };
  },

  /**
   * 計算可用餘額 R = I - E - D
   */
  calculateSurplus(income, expense, debt) {
    return Number(income) - Number(expense) - Number(debt);
  },

  /**
   * 生成 A (6期)、B (12期)、C (18期) 三種還款方案與負擔對照
   */
  generateThreePlans(principal, surplus, annualRate = 0.06) {
    const P = Number(principal);
    const R = Number(surplus);
    const maxAllowed = R > 0 ? Math.round(R * SYSTEM_CONFIG.surplusBurdenRatio) : 0;

    const periodsConfig = [
      { id: "A", name: "方案 A（短期速清）", periods: 6, tag: "總利息最低", desc: "適合短期有確定收入挹注、希望儘早結清債務者" },
      { id: "B", name: "方案 B（分期平衡）", periods: 12, tag: "期限與月付平衡", desc: "兼顧每期還款金額與總利息支出的標準分期方案" },
      { id: "C", name: "方案 C（降低月付）", periods: 18, tag: "每月壓力最小", desc: "適合收入浮動或需保留較多月生活預備金者" }
    ];

    const plans = periodsConfig.map(cfg => {
      const calc = this.calculatePMT(P, annualRate, cfg.periods);
      const burdenRatio = R > 0 ? ((calc.monthlyPayment / R) * 100).toFixed(1) : "999";
      const fitsLimit = R > 0 && calc.monthlyPayment <= maxAllowed;

      return {
        ...cfg,
        ...calc,
        burdenRatio: Number(burdenRatio),
        fitsLimit,
        maxAllowedMonthly: maxAllowed,
        surplus: R,
        // 超出上限時的提示
        exceedAmount: calc.monthlyPayment > maxAllowed ? calc.monthlyPayment - maxAllowed : 0
      };
    });

    // 計算成本差額 (相對於利息最低的 Plan A)
    const baseInterest = plans[0].totalInterest;
    plans.forEach(p => {
      p.interestDiff = p.totalInterest - baseInterest;
    });

    return {
      plans,
      maxAllowedMonthly: maxAllowed,
      surplus: R,
      principal: P,
      hasEligiblePlan: plans.some(p => p.fitsLimit)
    };
  },

  /**
   * 執行全流程評估與 XAI 解釋生成
   */
  evaluateApplication(amount, income, expense, debt, incomeType = "浮動收入") {
    const P = Number(amount);
    const I = Number(income);
    const E = Number(expense);
    const D = Number(debt);

    // 1. 檢查資料完整性
    if (I <= 0 || isNaN(I)) {
      return {
        decision: "MISSING_DATA",
        status: "待補件",
        reason: "收入證明資料未完整提供或為 0 元，系統不自動補零值，請補件後再行評估。",
        xaiExplanation: "【完整性檢核未通過】系統檢測到收入欄位為空或無有效憑據。為保障評估客觀性，MicroLoan 不擅自預估收入，請點擊補件上傳存摺或工作紀錄。",
        canAppeal: false,
        requiresHuman: false
      };
    }

    const R = this.calculateSurplus(I, E, D);
    const maxAllowedMonthly = R > 0 ? Math.round(R * SYSTEM_CONFIG.surplusBurdenRatio) : 0;
    const plansResult = this.generateThreePlans(P, R, SYSTEM_CONFIG.annualInterestRate);

    // 2. 金額分流判斷
    if (P > SYSTEM_CONFIG.aiTriageThreshold) {
      return {
        decision: "HUMAN_TRIAGE",
        status: "審核中",
        triageType: "人工審核 (超額分流)",
        surplus: R,
        maxAllowedMonthly,
        plansResult,
        reason: `申請金額 ${P.toLocaleString()} 元超過 10 萬元分流門檻，依規定交由授信專員陳專員進行實質審查。`,
        xaiExplanation: `【超額分流說明】您的申貸金額（NT$ ${P.toLocaleString()}）已超過 AI 自主決策上限（NT$ 100,000）。系統已自動完成收支餘額計算（可用餘額 NT$ ${R.toLocaleString()}），現已排入人工審核佇列。專員將於 1 個工作日內完成複核，期間不會直接核准或撥款。`,
        canAppeal: false,
        requiresHuman: true
      };
    }

    // 3. AI 決策路徑 (金額 <= 100,000)
    if (R <= 0) {
      return {
        decision: "REJECTED_NEGATIVE_SURPLUS",
        status: "無法核貸",
        triageType: "AI核貸決策",
        surplus: R,
        maxAllowedMonthly: 0,
        plansResult,
        reason: `每月必要支出(${E.toLocaleString()}元)與既有債務(${D.toLocaleString()}元)已超出收入(${I.toLocaleString()}元)，無安全可用現金流。`,
        xaiExplanation: `【XAI 評估原因】你所確認的月收入為 ${I.toLocaleString()} 元，扣除必要支出 ${E.toLocaleString()} 元與既有債務 ${D.toLocaleString()} 元後，每月可用餘額為 ${R.toLocaleString()} 元（小於等於 0）。系統為避免造成進一步財務負擔，未能核准此次申請。若資料有誤可立即更正，或提出人工覆核。`,
        canAppeal: true,
        requiresHuman: false
      };
    }

    if (!plansResult.hasEligiblePlan) {
      const minMonthly = plansResult.plans[2].monthlyPayment; // 方案C的月付
      return {
        decision: "REJECTED_EXCEEDS_BURDEN",
        status: "無法核貸",
        triageType: "AI核貸決策",
        surplus: R,
        maxAllowedMonthly,
        plansResult,
        reason: `借款金額所對應之所有方案月付額均超出安全負擔上限(${maxAllowedMonthly.toLocaleString()}元)。`,
        xaiExplanation: `【XAI 評估原因】你的月收入為 ${I.toLocaleString()} 元，每月可用餘額 R = ${R.toLocaleString()} 元。依本原型暫定的 40% 安全餘額規則，候選月付上限為 ${maxAllowedMonthly.toLocaleString()} 元。然而在此借款額度下，月負擔最輕的 18 期方案每月需繳付 ${minMonthly.toLocaleString()} 元，仍超出上限 ${minMonthly - maxAllowedMonthly} 元。建議「降低借款金額」或「申請人工覆核」。`,
        canAppeal: true,
        requiresHuman: false
      };
    }

    // 4. 正常核准通過
    return {
      decision: "APPROVED",
      status: "已核准待簽署",
      triageType: "AI核貸決策",
      surplus: R,
      maxAllowedMonthly,
      plansResult,
      reason: `評估通過：收支餘額 ${R.toLocaleString()} 元，負擔上限 ${maxAllowedMonthly.toLocaleString()} 元，已有方案符合安全負擔標準。`,
      xaiExplanation: `【XAI 評估原因】你確認的月收入為 ${I.toLocaleString()} 元，必要支出 ${E.toLocaleString()} 元，既有債務月付 ${D.toLocaleString()} 元，每月餘額為 ${R.toLocaleString()} 元。依本原型暫定的 40% 餘額規則，候選月付上限為 ${maxAllowedMonthly.toLocaleString()} 元。目前「方案 C（18期）」月付 ${plansResult.plans[2].monthlyPayment.toLocaleString()} 元符合負擔條件；短期方案 A 與 B 雖利息較低，但月付超出安全上限，請審慎權衡後選擇。`,
      canAppeal: false,
      requiresHuman: false
    };
  }
};
