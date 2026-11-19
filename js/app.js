/**
 * MicroLoan（微微貸）- 主控制器與互動邏輯
 * 智慧人機互動與使用介面研究 | 黃裕元
 */

class MicroLoanApp {
  constructor() {
    this.currentViewMode = 'mobile'; // 'mobile' | 'desktop'
    this.mobileStep = 1; // 1:首頁, 2:身分驗證, 3:收支申請, 4:AI審核, 5:方案比較, 6:簽署, 7:我的案件
    this.isPhoneFrameMode = true; // 擬真手機框或全寬
    this.currentScenarioId = 'normal';
    
    // 申請表單狀態 (預設林先生資料)
    this.formData = {
      applicantName: PERSONAS.borrower.name,
      maskedName: PERSONAS.borrower.maskedName,
      idNumber: "F128666790",
      phone: "0912-345-456",
      amount: 50000,
      income: 28000,
      incomeType: "浮動收入（近3個月平均）",
      expense: 18000,
      debt: 2000,
      housingStatus: "租屋（無自有房屋土地）",
      selectedPlan: "C",
      authChecked: true
    };

    // 簽名 Pad 狀態
    this.isDrawing = false;
    this.hasSignature = false;

    // 初始化儲存與資料
    this.initDatabase();
    this.bindEvents();
    this.render();
  }

  // 初始化 LocalStorage 資料庫
  initDatabase() {
    if (!localStorage.getItem('microloan_cases')) {
      localStorage.setItem('microloan_cases', JSON.stringify(INITIAL_CASES));
    }
    if (!localStorage.getItem('microloan_logs')) {
      localStorage.setItem('microloan_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    }
  }

  getCases() {
    return JSON.parse(localStorage.getItem('microloan_cases') || '[]');
  }

  saveCases(cases) {
    localStorage.setItem('microloan_cases', JSON.stringify(cases));
  }

  getAuditLogs() {
    return JSON.parse(localStorage.getItem('microloan_logs') || '[]');
  }

  addAuditLog(operator, targetCase, action, detail) {
    const logs = this.getAuditLogs();
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleString('zh-TW', { hour12: false }),
      operator,
      targetCase,
      action,
      detail
    };
    logs.unshift(newLog);
    localStorage.setItem('microloan_logs', JSON.stringify(logs));
  }

  resetAllData() {
    localStorage.setItem('microloan_cases', JSON.stringify(INITIAL_CASES));
    localStorage.setItem('microloan_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    this.formData = {
      applicantName: PERSONAS.borrower.name,
      maskedName: PERSONAS.borrower.maskedName,
      idNumber: "F128666790",
      phone: "0912-345-456",
      amount: 50000,
      income: 28000,
      incomeType: "浮動收入（近3個月平均）",
      expense: 18000,
      debt: 2000,
      housingStatus: "租屋（無自有房屋土地）",
      selectedPlan: "C",
      authChecked: true
    };
    this.mobileStep = 1;
    this.render();
    this.showToast('系統已重置為作業一初始模擬資料集！');
  }

  // 視圖切換
  switchViewMode(mode) {
    this.currentViewMode = mode;
    const mobileBtn = document.getElementById('btnViewMobile');
    const desktopBtn = document.getElementById('btnViewDesktop');
    const mobileContainer = document.getElementById('mobileAppContainer');
    const desktopContainer = document.getElementById('desktopAdminContainer');

    if (mode === 'mobile') {
      mobileBtn.classList.add('bg-blue-600', 'text-white', 'shadow');
      mobileBtn.classList.remove('text-slate-600', 'hover:bg-slate-100');
      desktopBtn.classList.remove('bg-blue-600', 'text-white', 'shadow');
      desktopBtn.classList.add('text-slate-600', 'hover:bg-slate-100');
      mobileContainer.classList.remove('hidden');
      desktopContainer.classList.add('hidden');
    } else {
      desktopBtn.classList.add('bg-blue-600', 'text-white', 'shadow');
      desktopBtn.classList.remove('text-slate-600', 'hover:bg-slate-100');
      mobileBtn.classList.remove('bg-blue-600', 'text-white', 'shadow');
      mobileBtn.classList.add('text-slate-600', 'hover:bg-slate-100');
      desktopContainer.classList.remove('hidden');
      mobileContainer.classList.add('hidden');
      this.renderDesktopDashboard();
      this.renderDesktopCaseList();
      this.renderAuditLogs();
    }
  }

  // 切換手機外框或展開全螢幕
  togglePhoneFrame() {
    this.isPhoneFrameMode = !this.isPhoneFrameMode;
    const mockup = document.getElementById('phoneMockup');
    const toggleBtn = document.getElementById('btnTogglePhoneFrame');
    if (this.isPhoneFrameMode) {
      mockup.classList.remove('fullscreen-mode');
      toggleBtn.innerHTML = '<i class="fa-solid fa-expand mr-1.5"></i>全螢幕視圖';
    } else {
      mockup.classList.add('fullscreen-mode');
      toggleBtn.innerHTML = '<i class="fa-solid fa-mobile-screen mr-1.5"></i>擬真手機外框';
    }
  }

  // 導覽前台步驟
  goToStep(step) {
    this.mobileStep = step;
    this.renderMobileStep();
    const contentArea = document.getElementById('phoneScreenContent');
    if (contentArea) contentArea.scrollTop = 0;
  }

  // 快捷載入課堂 6 大測試情境
  loadScenario(scenarioKey) {
    this.currentScenarioId = scenarioKey;
    switch (scenarioKey) {
      case 'scenario_1_normal':
        // 情境一：林先生 50,000 正常核貸與三方案
        this.formData.amount = 50000;
        this.formData.income = 28000;
        this.formData.expense = 18000;
        this.formData.debt = 2000;
        this.formData.incomeType = "浮動收入（近3個月平均）";
        this.formData.selectedPlan = "C";
        this.switchViewMode('mobile');
        this.goToStep(4);
        this.showToast('🎯 已載入【情境一：林先生 50,000元 AI順利核貸與方案C可選】');
        break;

      case 'scenario_2_ocr_error':
        // 情境二：OCR 收入誤讀 (28,000 -> 18,000)
        this.formData.amount = 50000;
        this.formData.income = 18000; // 誤讀
        this.formData.expense = 18000;
        this.formData.debt = 2000;
        this.formData.incomeType = "浮動收入（存摺辨識誤讀）";
        this.switchViewMode('mobile');
        this.goToStep(4);
        this.showToast('🔍 已載入【情境二：OCR誤讀為18,000元，測試更正入口】');
        break;

      case 'scenario_3_human_triage':
        // 情境三：超過10萬 (120,000元) 分流至人工審核
        this.formData.amount = 120000;
        this.formData.income = 38000;
        this.formData.expense = 22000;
        this.formData.debt = 3000;
        this.switchViewMode('mobile');
        this.goToStep(4);
        this.showToast('⚖️ 已載入【情境三：申貸 120,000元 超額分流人工審查中】');
        break;

      case 'scenario_4_rejected_appeal':
        // 情境四：80,000元 無法核貸與人工覆核申訴
        this.formData.amount = 80000;
        this.formData.income = 22000;
        this.formData.expense = 19000;
        this.formData.debt = 2000;
        this.switchViewMode('mobile');
        this.goToStep(4);
        this.showToast('❌ 已載入【情境四：80,000元無安全負擔方案，可申請人工覆核】');
        break;

      case 'scenario_5_missing_docs':
        // 情境五：資料缺漏待補件 (30,000元)
        this.formData.amount = 30000;
        this.formData.income = 0;
        this.formData.expense = 15000;
        this.formData.debt = 0;
        this.switchViewMode('mobile');
        this.goToStep(4);
        this.showToast('📁 已載入【情境五：收入為空，觸發待補件流程】');
        break;

      case 'scenario_6_repayment_close':
        // 情境六：還款與清償結案展示
        this.switchViewMode('mobile');
        this.goToStep(7);
        this.showToast('💳 已載入【情境六：執行中案件還款操作與清償證明】');
        break;
    }
  }

  // 渲染主框架
  render() {
    this.renderMobileStep();
    this.renderDesktopDashboard();
    this.renderDesktopCaseList();
    this.renderAuditLogs();
    this.updateClock();
  }

  updateClock() {
    const el = document.getElementById('phoneClock');
    if (el) {
      const now = new Date();
      el.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
  }

  // 渲染前台各步驟
  renderMobileStep() {
    const container = document.getElementById('phoneStepContainer');
    if (!container) return;

    // 更新頂部步驟進度點
    const dots = document.querySelectorAll('.step-dot-item');
    dots.forEach((dot, idx) => {
      const stepNum = idx + 1;
      dot.classList.remove('active', 'completed', 'inactive');
      if (stepNum === this.mobileStep) {
        dot.classList.add('active');
      } else if (stepNum < this.mobileStep) {
        dot.classList.add('completed');
      } else {
        dot.classList.add('inactive');
      }
    });

    switch (this.mobileStep) {
      case 1:
        container.innerHTML = this.renderStep1Home();
        break;
      case 2:
        container.innerHTML = this.renderStep2Verify();
        break;
      case 3:
        container.innerHTML = this.renderStep3Apply();
        this.bindStep3Events();
        break;
      case 4:
        container.innerHTML = this.renderStep4Review();
        break;
      case 5:
        container.innerHTML = this.renderStep5Plans();
        break;
      case 6:
        container.innerHTML = this.renderStep6Sign();
        this.initSignaturePad();
        break;
      case 7:
        container.innerHTML = this.renderStep7MyLoans();
        break;
    }
  }

  // 步驟 1: 首頁與服務說明
  renderStep1Home() {
    return `
      <div class="fade-in space-y-4">
        <!-- 品牌與首頁 Header -->
        <div class="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div class="absolute -right-4 -bottom-6 w-28 h-28 bg-blue-500 rounded-full opacity-20 blur-xl"></div>
          <div class="inline-flex items-center gap-1.5 bg-blue-500/30 text-blue-200 text-xs px-2.5 py-1 rounded-full border border-blue-400/30 mb-2">
            <i class="fa-solid fa-shield-halved text-blue-300"></i> 智慧人機互動 AI 小額信貸
          </div>
          <h1 class="text-2xl font-bold tracking-tight">MicroLoan 微微貸</h1>
          <p class="text-blue-100 text-sm mt-1 leading-relaxed">
            為中低收入者打造的 AI 智慧貸款，用透明人機互動翻轉指尖信用。
          </p>
          <div class="mt-4 pt-3 border-t border-blue-400/30 flex items-center justify-between text-xs text-blue-200">
            <span><i class="fa-solid fa-graduation-cap mr-1"></i>期末專案需求調查（黃裕元）</span>
            <span class="bg-blue-600/60 px-2 py-0.5 rounded font-mono">v0.1</span>
          </div>
        </div>

        <!-- 2026 政府中低收入參照標準卡片 (依作業規格一) -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <i class="fa-solid fa-scale-balanced text-blue-600"></i> 2026年 政府所得與資產參照標準
            </h2>
            <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">社會救助法第4條之1</span>
          </div>
          <p class="text-xs text-slate-600 leading-normal">
            本專案對象為無自有房屋土地、家庭平均所得符合中低收入參照範圍者。不以個人月薪直接替代家庭平均。
          </p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span class="font-semibold text-slate-700 block mb-1">臺北市（每人每月）</span>
              <div class="text-slate-500">中低收上限：<span class="font-bold text-slate-800">29,635元</span></div>
              <div class="text-slate-400 text-[11px]">動產限額 16萬 / 戶不動產 992萬</div>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span class="font-semibold text-slate-700 block mb-1">新北市（每人每月）</span>
              <div class="text-slate-500">中低收上限：<span class="font-bold text-slate-800">26,625元</span></div>
              <div class="text-slate-400 text-[11px]">動產限額 15萬 / 戶不動產 708萬</div>
            </div>
          </div>
        </div>

        <!-- 核心機制說明 (Amershi G1: 明確說明能力與限制) -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <i class="fa-solid fa-circle-info text-blue-600"></i> 透明申貸三大原則
          </h2>
          <div class="space-y-2 text-xs text-slate-600">
            <div class="flex items-start gap-2.5">
              <div class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-xs">1</div>
              <div>
                <strong class="text-slate-800">10萬元核貸分流機制：</strong>
                10萬元（含）以下由 AI 決策引擎自動判定；超過 10 萬元由專業授信專員人工複核。
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <div class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-xs">2</div>
              <div>
                <strong class="text-slate-800">40% 安全餘額保護：</strong>
                餘額 R = 收入 - 支出 - 債務。新借款月付額嚴格限制不超過餘額 40%，避免過度負債。
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <div class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-xs">3</div>
              <div>
                <strong class="text-slate-800">全流程可解釋與人類接管：</strong>
                提供清晰計算公式、資料即時更正管道、與隨時可啟動之真人覆核入口。
              </div>
            </div>
          </div>
        </div>

        <!-- 模擬宣告 -->
        <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <i class="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5 shrink-0"></i>
          <div>
            <strong>學術研究原型免責宣告：</strong> 本介面所有個案數據、信用規則及電子簽署均為課程研究模擬，不串接真實徵信系統，亦不涉及實際資金撥付。
          </div>
        </div>

        <!-- 開始申請按鈕 (Touch target >= 44px) -->
        <div class="pt-2 space-y-2">
          <button onclick="app.goToStep(2)" class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
            <span>開始小額借貸申請</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button onclick="app.loadScenario('scenario_1_normal')" class="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-user-astronaut text-blue-600"></i>
            以 Persona 林先生資料直接體驗 (5萬元)
          </button>
        </div>
      </div>
    `;
  }

  // 步驟 2: 身分驗證與證件 OCR 模擬 (Amershi G9: 支援更正)
  renderStep2Verify() {
    return `
      <div class="fade-in space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 class="text-base font-bold text-slate-800">步驟 2/4：身分核實與文件上傳</h2>
            <p class="text-xs text-slate-500">上傳虛構證件，由影像 OCR 自動讀取並提供核對</p>
          </div>
          <button onclick="app.goToStep(1)" class="text-xs text-blue-600 hover:underline">返回首頁</button>
        </div>

        <!-- 證件拍照/上傳模擬區 -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <span class="text-xs font-semibold text-slate-700 block">身分證件正面（模擬影像）</span>
          
          <div class="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-4 text-center">
            <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center text-xl mb-2">
              <i class="fa-solid fa-id-card"></i>
            </div>
            <p class="text-xs font-bold text-slate-700">虛構身分證已模擬讀取完成</p>
            <p class="text-[11px] text-slate-500 mt-0.5">影像辨識信心值：99.2%（符合標準）</p>
            
            <div class="mt-3 inline-flex gap-2">
              <button onclick="app.showToast('已重新讀取證件範本')" class="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm">
                <i class="fa-solid fa-camera mr-1"></i>重新拍攝
              </button>
              <button onclick="app.showToast('證件影像已通過格式校驗')" class="text-xs px-2.5 py-1.5 bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium">
                <i class="fa-solid fa-check mr-1"></i>核對相符
              </button>
            </div>
          </div>
        </div>

        <!-- OCR 提取欄位核對區（可手動修改） -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <i class="fa-solid fa-pen-to-square text-blue-600"></i> 請核對提取欄位（可直接更正）
            </h3>
            <span class="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              <i class="fa-solid fa-circle-check mr-1"></i>可編輯
            </span>
          </div>

          <div class="space-y-2.5 text-xs">
            <div>
              <label class="block text-slate-600 mb-1">真實姓名（已自動遮罩展示）</label>
              <input type="text" id="verifyName" value="${this.formData.applicantName}" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800">
            </div>
            <div>
              <label class="block text-slate-600 mb-1">身分證字號（虛構格式）</label>
              <input type="text" id="verifyId" value="${this.formData.idNumber}" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-slate-800">
            </div>
            <div>
              <label class="block text-slate-600 mb-1">行動電話（接收通知）</label>
              <input type="text" id="verifyPhone" value="${this.formData.phone}" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-slate-800">
            </div>
          </div>

          <div class="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500 flex items-start gap-1.5">
            <i class="fa-solid fa-lock text-slate-400 mt-0.5"></i>
            <span>依個人資料保護原則，本研究僅保存去識別代碼，測試完畢即行刪除。</span>
          </div>
        </div>

        <!-- 確認前往下一步 -->
        <button onclick="app.confirmStep2()" class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
          <span>確認資料無誤，填寫收支申請</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
  }

  confirmStep2() {
    const nameInput = document.getElementById('verifyName');
    const idInput = document.getElementById('verifyId');
    const phoneInput = document.getElementById('verifyPhone');
    if (nameInput) this.formData.applicantName = nameInput.value;
    if (idInput) this.formData.idNumber = idInput.value;
    if (phoneInput) this.formData.phone = phoneInput.value;

    this.goToStep(3);
  }

  // 步驟 3: 申貸金額與收支核算 (動態計算餘額與40%門檻)
  renderStep3Apply() {
    const surplus = LoanEngine.calculateSurplus(this.formData.income, this.formData.expense, this.formData.debt);
    const maxMonthly = surplus > 0 ? Math.round(surplus * SYSTEM_CONFIG.surplusBurdenRatio) : 0;

    return `
      <div class="fade-in space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 class="text-base font-bold text-slate-800">步驟 3/4：申貸金額與收支核算</h2>
            <p class="text-xs text-slate-500">透明評估現金流，核算 40% 安全月付門檻</p>
          </div>
          <button onclick="app.goToStep(2)" class="text-xs text-blue-600 hover:underline">回上一步</button>
        </div>

        <!-- 欲借款金額輸入與拉桿 -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700">申請借款金額 (新臺幣)</label>
            <span id="amountDisplay" class="text-lg font-bold font-mono text-blue-600">NT$ ${Number(this.formData.amount).toLocaleString()}</span>
          </div>

          <input type="range" id="amountSlider" min="10000" max="150000" step="5000" value="${this.formData.amount}" class="w-full accent-blue-600 cursor-pointer">
          
          <div class="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>10,000元</span>
            <span class="text-amber-600 font-semibold">10萬元（AI/人工分流界線）</span>
            <span>150,000元</span>
          </div>

          <!-- 分流提醒標籤 -->
          <div id="triageNotice" class="p-2.5 rounded-lg text-xs transition-all ${this.formData.amount > 100000 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
            ${this.formData.amount > 100000 
              ? '<i class="fa-solid fa-user-shield mr-1"></i><strong>超過10萬元：</strong>將分流至人工專員（陳專員）實質覆核。' 
              : '<i class="fa-solid fa-robot mr-1"></i><strong>10萬元（含）以下：</strong>由 AI 決策引擎透明評估與快速分流。'}
          </div>
        </div>

        <!-- 收支明細填寫 (SIM-I03: 固定/浮動收入切換) -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800">每月現金流資料核對</h3>
            <span class="text-[11px] text-slate-400">口徑透明無隱藏</span>
          </div>

          <!-- 收入型態切換 -->
          <div>
            <label class="block text-xs text-slate-600 mb-1">收入計算方式（針對非典型或接案者）</label>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <button type="button" id="btnIncomeFluctuate" class="py-2 px-3 rounded-lg border font-medium transition ${this.formData.incomeType.includes('浮動') ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}">
                <i class="fa-solid fa-chart-line mr-1"></i>浮動收入（近3月平均）
              </button>
              <button type="button" id="btnIncomeFixed" class="py-2 px-3 rounded-lg border font-medium transition ${!this.formData.incomeType.includes('浮動') ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}">
                <i class="fa-solid fa-briefcase mr-1"></i>固定薪資所得
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <label class="block text-slate-600 mb-1">
                每月收入 (I)
                <span class="text-slate-400 text-[11px]">（若遭辨識錯誤可直接修改）</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-2.5 text-slate-400">NT$</span>
                <input type="number" id="inputIncome" value="${this.formData.income}" class="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-800">
              </div>
            </div>

            <div>
              <label class="block text-slate-600 mb-1">每月必要生活支出 (E) <span class="text-slate-400">（房租、伙食、家庭扶養）</span></label>
              <div class="relative">
                <span class="absolute left-3 top-2.5 text-slate-400">NT$</span>
                <input type="number" id="inputExpense" value="${this.formData.expense}" class="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-slate-800">
              </div>
            </div>

            <div>
              <label class="block text-slate-600 mb-1">既有債務或分期月付 (D) <span class="text-slate-400">（機車貸、其他分期）</span></label>
              <div class="relative">
                <span class="absolute left-3 top-2.5 text-slate-400">NT$</span>
                <input type="number" id="inputDebt" value="${this.formData.debt}" class="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-slate-800">
              </div>
            </div>
          </div>
        </div>

        <!-- 即時核算結果卡片 (Formula Breakdown) -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-md space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-300">
            <span class="flex items-center gap-1"><i class="fa-solid fa-calculator text-cyan-400"></i> AI 即時現金流核算</span>
            <span class="font-mono text-cyan-300">規則 v0.1</span>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-1">
            <div class="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span class="text-[11px] text-slate-400 block">每月可用餘額 (R)</span>
              <span id="displaySurplus" class="text-base font-bold font-mono text-emerald-400">NT$ ${surplus.toLocaleString()}</span>
              <div class="text-[10px] text-slate-400 mt-0.5">R = I - E - D</div>
            </div>
            <div class="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span class="text-[11px] text-slate-400 block">40% 安全月付上限</span>
              <span id="displayBurdenLimit" class="text-base font-bold font-mono text-cyan-300">NT$ ${maxMonthly.toLocaleString()}</span>
              <div class="text-[10px] text-slate-400 mt-0.5">上限 = R × 40%</div>
            </div>
          </div>

          <p class="text-[11px] text-slate-400 leading-tight pt-1">
            40% 為保留生活緩衝之安全設計參數，非金融業固定標準；旨在防止過度負債。
          </p>
        </div>

        <!-- 資料授權勾選 -->
        <div class="flex items-start gap-2 pt-1 text-xs text-slate-600">
          <input type="checkbox" id="checkAuth" ${this.formData.authChecked ? 'checked' : ''} class="mt-0.5 rounded text-blue-600 focus:ring-blue-500">
          <label for="checkAuth">
            我同意以此模擬收支資料進行 AI 方案適配評估，並知悉本系統不要求任何抵押擔保。
          </label>
        </div>

        <!-- 提交按鈕 -->
        <button onclick="app.submitStep3()" class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
          <span>送出申請，進行核貸評估</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
  }

  // 綁定步驟3的即時計算事件
  bindStep3Events() {
    const slider = document.getElementById('amountSlider');
    const inputIncome = document.getElementById('inputIncome');
    const inputExpense = document.getElementById('inputExpense');
    const inputDebt = document.getElementById('inputDebt');
    const btnFluctuate = document.getElementById('btnIncomeFluctuate');
    const btnFixed = document.getElementById('btnIncomeFixed');

    const updateCalc = () => {
      const amount = Number(slider.value);
      const inc = Number(inputIncome.value) || 0;
      const exp = Number(inputExpense.value) || 0;
      const debt = Number(inputDebt.value) || 0;

      this.formData.amount = amount;
      this.formData.income = inc;
      this.formData.expense = exp;
      this.formData.debt = debt;

      const surplus = LoanEngine.calculateSurplus(inc, exp, debt);
      const limit = surplus > 0 ? Math.round(surplus * SYSTEM_CONFIG.surplusBurdenRatio) : 0;

      document.getElementById('amountDisplay').textContent = `NT$ ${amount.toLocaleString()}`;
      document.getElementById('displaySurplus').textContent = `NT$ ${surplus.toLocaleString()}`;
      document.getElementById('displayBurdenLimit').textContent = `NT$ ${limit.toLocaleString()}`;

      // 分流警示
      const triageNotice = document.getElementById('triageNotice');
      if (amount > 100000) {
        triageNotice.className = "p-2.5 rounded-lg text-xs transition-all bg-amber-50 text-amber-800 border border-amber-200";
        triageNotice.innerHTML = '<i class="fa-solid fa-user-shield mr-1"></i><strong>超過10萬元：</strong>將分流至人工專員（陳專員）實質覆核。';
      } else {
        triageNotice.className = "p-2.5 rounded-lg text-xs transition-all bg-blue-50 text-blue-800 border border-blue-200";
        triageNotice.innerHTML = '<i class="fa-solid fa-robot mr-1"></i><strong>10萬元（含）以下：</strong>由 AI 決策引擎透明評估與快速分流。';
      }
    };

    if (slider) slider.addEventListener('input', updateCalc);
    if (inputIncome) inputIncome.addEventListener('input', updateCalc);
    if (inputExpense) inputExpense.addEventListener('input', updateCalc);
    if (inputDebt) inputDebt.addEventListener('input', updateCalc);

    if (btnFluctuate) {
      btnFluctuate.addEventListener('click', () => {
        this.formData.incomeType = "浮動收入（近3個月平均）";
        btnFluctuate.className = "py-2 px-3 rounded-lg border font-medium transition bg-blue-50 border-blue-500 text-blue-700";
        btnFixed.className = "py-2 px-3 rounded-lg border font-medium transition bg-slate-50 border-slate-200 text-slate-600";
      });
    }

    if (btnFixed) {
      btnFixed.addEventListener('click', () => {
        this.formData.incomeType = "固定薪資所得";
        btnFixed.className = "py-2 px-3 rounded-lg border font-medium transition bg-blue-50 border-blue-500 text-blue-700";
        btnFluctuate.className = "py-2 px-3 rounded-lg border font-medium transition bg-slate-50 border-slate-200 text-slate-600";
      });
    }
  }

  submitStep3() {
    const authCheck = document.getElementById('checkAuth');
    if (authCheck && !authCheck.checked) {
      this.showToast('請先勾選同意收支資料評估');
      return;
    }
    this.goToStep(4);
  }

  // 步驟 4: AI 審核進度與 XAI 解釋 (包含更正與覆核入口)
  renderStep4Review() {
    const evalResult = LoanEngine.evaluateApplication(
      this.formData.amount,
      this.formData.income,
      this.formData.expense,
      this.formData.debt,
      this.formData.incomeType
    );

    let statusHeaderHtml = '';
    let xaiCardHtml = '';
    let actionButtonsHtml = '';

    // 情況 A：超過 10 萬元，人工分流中 (SIM-W03 嚴禁誤導為已核准)
    if (evalResult.requiresHuman) {
      statusHeaderHtml = `
        <div class="bg-amber-500 text-white p-4 rounded-xl shadow space-y-1">
          <div class="flex items-center justify-between text-xs text-amber-100">
            <span><i class="fa-solid fa-clock mr-1"></i>案件進度：第 3 階段</span>
            <span class="bg-amber-600 px-2 py-0.5 rounded font-mono">案件編號：ML002</span>
          </div>
          <h2 class="text-lg font-bold flex items-center gap-2">
            <i class="fa-solid fa-user-clock text-amber-200"></i>
            人工審核中，尚未核准
          </h2>
          <p class="text-xs text-amber-100 leading-relaxed">
            申貸金額 NT$ ${this.formData.amount.toLocaleString()} 超過 10 萬元 AI 自主門檻，已指派授信專員「陳專員」進行二次審查。
          </p>
        </div>
      `;

      xaiCardHtml = `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-file-waveform text-blue-600"></i> AI 預審分析摘要（供專員參考）
          </h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            ${evalResult.xaiExplanation}
          </p>
          <div class="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1 text-slate-600 border border-slate-100">
            <div>• 預估回覆時間：<strong class="text-slate-800">1 個工作日內</strong>（短信通知）</div>
            <div>• 審查負責人：<strong class="text-slate-800">陳專員（微額授信處）</strong></div>
            <div>• 目前狀態：<span class="text-amber-600 font-semibold">排隊審理中</span></div>
          </div>
        </div>
      `;

      actionButtonsHtml = `
        <div class="space-y-2">
          <button onclick="app.switchViewMode('desktop')" class="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>切換至桌面後台（模擬陳專員審核）</span>
          </button>
          <button onclick="app.goToStep(3)" class="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition">
            修改申請金額（若降至10萬以下可啟動AI決策）
          </button>
        </div>
      `;
    } 
    // 情況 B：資料缺失待補件 (ML003)
    else if (evalResult.decision === 'MISSING_DATA') {
      statusHeaderHtml = `
        <div class="bg-orange-500 text-white p-4 rounded-xl shadow space-y-1">
          <div class="flex items-center justify-between text-xs text-orange-100">
            <span><i class="fa-solid fa-triangle-exclamation mr-1"></i>案件進度：待補件</span>
            <span class="bg-orange-600 px-2 py-0.5 rounded font-mono">案件編號：ML003</span>
          </div>
          <h2 class="text-lg font-bold flex items-center gap-2">
            <i class="fa-solid fa-folder-open text-orange-200"></i>
            資料不足，請補件後再評估
          </h2>
          <p class="text-xs text-orange-100 leading-relaxed">
            系統檢測到收入資訊缺漏。MicroLoan 堅持不擅自預估收入或補零值，請提供證明以確保公正性。
          </p>
        </div>
      `;

      xaiCardHtml = `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-list-check text-orange-600"></i> 待補件項目說明
          </h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            ${evalResult.xaiExplanation}
          </p>
          <div class="p-3 bg-orange-50 rounded-lg border border-orange-100 text-xs text-orange-800">
            請補充近 3 個月存摺入帳照片、外送平台月收入截圖、或薪資袋證明。
          </div>
        </div>
      `;

      actionButtonsHtml = `
        <div class="space-y-2">
          <button onclick="app.showToast('已開啟補件上傳通道'); app.formData.income = 28000; app.goToStep(3);" class="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-upload"></i>
            <span>立即上傳收入補件資料</span>
          </button>
        </div>
      `;
    }
    // 情況 C：無法核貸（但提供更正與覆核入口 SIM-W02 / SIM-I04 / ML004）
    else if (evalResult.decision.startsWith('REJECTED')) {
      statusHeaderHtml = `
        <div class="bg-rose-600 text-white p-4 rounded-xl shadow space-y-1">
          <div class="flex items-center justify-between text-xs text-rose-200">
            <span><i class="fa-solid fa-circle-xmark mr-1"></i>評估結果：未能通過</span>
            <span class="bg-rose-700 px-2 py-0.5 rounded font-mono">案件編號：ML004</span>
          </div>
          <h2 class="text-lg font-bold flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation text-rose-200"></i>
            目前暫無合適的負擔方案
          </h2>
          <p class="text-xs text-rose-100 leading-relaxed">
            為避免造成生活現金流短缺，依 40% 安全餘額規則，系統目前無法核發此額度。
          </p>
        </div>
      `;

      xaiCardHtml = `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <i class="fa-solid fa-lightbulb text-rose-600"></i> 可解釋 AI 判定依據與計算透明化
            </h3>
            <span class="text-[11px] font-mono text-slate-400">規則 v0.1</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            ${evalResult.xaiExplanation}
          </p>

          <!-- 具體計算展示 -->
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1.5 text-slate-700">
            <div class="flex justify-between">
              <span>確認月收入 (I)：</span>
              <span class="font-mono font-bold">NT$ ${this.formData.income.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>必要支出與負債 (E+D)：</span>
              <span class="font-mono">NT$ ${(this.formData.expense + this.formData.debt).toLocaleString()}</span>
            </div>
            <div class="flex justify-between border-t border-slate-200 pt-1">
              <span>可用現金流餘額 (R)：</span>
              <span class="font-mono font-bold ${evalResult.surplus <= 0 ? 'text-rose-600' : 'text-emerald-600'}">NT$ ${evalResult.surplus.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>40% 安全月付上限：</span>
              <span class="font-mono font-bold text-blue-600">NT$ ${evalResult.maxAllowedMonthly.toLocaleString()}</span>
            </div>
          </div>

          <!-- 收入誤讀修正亮點入口 (SIM-W02 驗收點) -->
          <div class="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
            <div class="text-xs text-blue-900">
              <strong class="block">懷疑資料有誤或影像誤讀？</strong>
              <span class="text-[11px] text-blue-700">例如：收入誤填或存摺辨識金額偏低</span>
            </div>
            <button onclick="app.openCorrectionModal()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-sm">
              <i class="fa-solid fa-pen mr-1"></i>更正資料
            </button>
          </div>
        </div>
      `;

      actionButtonsHtml = `
        <div class="space-y-2">
          <button onclick="app.openAppealModal()" class="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-hand-holding-hand text-blue-400"></i>
            <span>申請人工專員覆核與申訴</span>
          </button>
          <button onclick="app.goToStep(3)" class="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition">
            調整借款金額後重新試算
          </button>
        </div>
      `;
    }
    // 情況 D：核准通過，進入方案比較 (ML001 / 情境一)
    else {
      statusHeaderHtml = `
        <div class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow space-y-1">
          <div class="flex items-center justify-between text-xs text-emerald-100">
            <span><i class="fa-solid fa-circle-check mr-1"></i>AI 決策：評估通過</span>
            <span class="bg-emerald-800 px-2 py-0.5 rounded font-mono">案件編號：ML001</span>
          </div>
          <h2 class="text-lg font-bold flex items-center gap-2">
            <i class="fa-solid fa-award text-emerald-200"></i>
            已核准申貸額度 NT$ ${this.formData.amount.toLocaleString()}
          </h2>
          <p class="text-xs text-emerald-100 leading-relaxed">
            收支評估符合 40% 安全負擔標準，已生成 3 組透明分期方案供您選擇。
          </p>
        </div>
      `;

      xaiCardHtml = `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <i class="fa-solid fa-calculator text-emerald-600"></i> 可解釋 AI 判定依據與規則說明
            </h3>
            <span class="text-[11px] font-mono text-slate-400">規則 v0.1</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            ${evalResult.xaiExplanation}
          </p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span class="text-slate-400 text-[11px] block">可用現金流 (R)</span>
              <span class="font-mono font-bold text-slate-800">NT$ ${evalResult.surplus.toLocaleString()}</span>
            </div>
            <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span class="text-slate-400 text-[11px] block">40% 月付安全上限</span>
              <span class="font-mono font-bold text-emerald-600">NT$ ${evalResult.maxAllowedMonthly.toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;

      actionButtonsHtml = `
        <button onclick="app.goToStep(5)" class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
          <span>前往三方案比較與選定</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;
    }

    return `
      <div class="fade-in space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 class="text-base font-bold text-slate-800">步驟 3.5：審核進度與判定解釋</h2>
            <p class="text-xs text-slate-500">透明公開計算條件，杜絕黑箱演算法偏見</p>
          </div>
          <button onclick="app.goToStep(3)" class="text-xs text-blue-600 hover:underline">修改收支</button>
        </div>

        ${statusHeaderHtml}
        ${xaiCardHtml}
        ${actionButtonsHtml}
      </div>
    `;
  }

  // 步驟 5: 三種還款方案比較 (嚴謹落實報告中的公式與三方案表格)
  renderStep5Plans() {
    const surplus = LoanEngine.calculateSurplus(this.formData.income, this.formData.expense, this.formData.debt);
    const plansResult = LoanEngine.generateThreePlans(this.formData.amount, surplus, SYSTEM_CONFIG.annualInterestRate);

    const planCardsHtml = plansResult.plans.map(p => {
      const isSelected = this.formData.selectedPlan === p.id;
      const isEligible = p.fitsLimit;

      return `
        <div class="plan-card ${isSelected ? 'selected' : ''} ${!isEligible ? 'disabled-plan' : ''} p-4 rounded-xl cursor-pointer" onclick="app.selectPlan('${p.id}', ${isEligible})">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}">
                ${p.id}
              </span>
              <h3 class="font-bold text-slate-800 text-sm">${p.name}</h3>
            </div>
            
            ${isEligible 
              ? '<span class="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-check mr-1"></i>符合負擔條件 (可選)</span>'
              : '<span class="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200"><i class="fa-solid fa-ban mr-1"></i>超出模擬負擔上限</span>'
            }
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs my-2.5">
            <div>
              <span class="text-slate-400 block text-[11px]">每月攤還金額</span>
              <span class="text-base font-bold font-mono ${isEligible ? 'text-blue-600' : 'text-slate-600'}">
                NT$ ${p.monthlyPayment.toLocaleString()}
              </span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">總還款金額 / 總利息</span>
              <span class="text-xs font-mono font-semibold text-slate-700">
                NT$ ${p.totalRepayment.toLocaleString()}
              </span>
              <span class="text-[10px] text-slate-400 block">利息：NT$ ${p.totalInterest.toLocaleString()}</span>
            </div>
          </div>

          <!-- 負擔比例條與分析 -->
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span class="text-slate-500">
              月付佔可用餘額比例：
              <strong class="${p.burdenRatio > 40 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}">${p.burdenRatio}%</strong>
              <span class="text-slate-400">（安全上限 40%）</span>
            </span>
            <span class="text-slate-400">
              ${p.interestDiff > 0 ? `利息較方案A多 +${p.interestDiff.toLocaleString()}元` : '利息成本最低'}
            </span>
          </div>

          ${!isEligible ? `
            <div class="mt-2 text-[11px] text-rose-600 bg-rose-50/80 p-2 rounded border border-rose-100 flex items-center gap-1">
              <i class="fa-solid fa-triangle-exclamation"></i>
              每月還款超過 3,200 元上限，不能直接選定。可透過降低借款額重新試算。
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="fade-in space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 class="text-base font-bold text-slate-800">步驟 3/4：三種還款方案比較</h2>
            <p class="text-xs text-slate-500">借款 50,000 元，固定年利率 6.0%，本息均攤</p>
          </div>
          <button onclick="app.goToStep(3)" class="text-xs text-blue-600 hover:underline">調整金額</button>
        </div>

        <!-- 使用者掌控感提醒 (不預選最高利息方案，不倒數計時) -->
        <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
          <i class="fa-solid fa-handshake-angle text-blue-600 mt-0.5"></i>
          <div>
            <strong>自主決策保障：</strong> 系統絕不預設選取最長期或最高利息方案，亦無倒數計時催促。請依您的現金流選擇最佳方案。
          </div>
        </div>

        <!-- 方案列表 -->
        <div class="space-y-3">
          ${planCardsHtml}
        </div>

        <!-- 成本取捨說明 (SIM-I02 驗證點) -->
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <div class="font-bold text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-lightbulb text-amber-500"></i> 方案成本取捨說明（避免低月付陷阱）
          </div>
          <p class="text-[11px] leading-relaxed">
            方案 C（18期）每月僅需繳 2,912 元，為唯一符合安全上限之方案；但總利息為 2,409 元，較短期方案 A（879元）多出 1,530 元利息成本。
          </p>
        </div>

        <!-- 底部確認按鈕 -->
        <div class="space-y-2 pt-1">
          <button onclick="app.confirmStep5()" class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
            <span>確認選定方案 ${this.formData.selectedPlan}，前往契約簽署</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  selectPlan(planId, isEligible) {
    if (!isEligible) {
      this.showToast(`方案 ${planId} 超出 40% 安全負擔上限，不能直接選定。建議調降借款金額。`);
      return;
    }
    this.formData.selectedPlan = planId;
    this.renderMobileStep();
  }

  confirmStep5() {
    this.goToStep(6);
  }

  // 步驟 6: 條件確認與模擬簽署 (防黑箱契約、透明無開辦費)
  renderStep6Sign() {
    const surplus = LoanEngine.calculateSurplus(this.formData.income, this.formData.expense, this.formData.debt);
    const plansResult = LoanEngine.generateThreePlans(this.formData.amount, surplus, SYSTEM_CONFIG.annualInterestRate);
    const chosenPlan = plansResult.plans.find(p => p.id === this.formData.selectedPlan) || plansResult.plans[2];

    return `
      <div class="fade-in space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 class="text-base font-bold text-slate-800">步驟 4/4：條件確認與模擬簽署</h2>
            <p class="text-xs text-slate-500">確認契約摘要，完成數位簽章開案</p>
          </div>
          <button onclick="app.goToStep(5)" class="text-xs text-blue-600 hover:underline">返回方案</button>
        </div>

        <!-- 契約條件透明摘要清單 -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="text-xs font-bold text-slate-700">微額借貸合約摘要</span>
            <span class="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">方案 ${chosenPlan.id}（${chosenPlan.periods}期）</span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">借款本金：</span>
              <span class="font-mono font-bold text-slate-800">NT$ ${this.formData.amount.toLocaleString()} 元</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">約定年利率：</span>
              <span class="font-mono font-semibold text-slate-800">固定 6.0%（月利率 0.5%）</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">每期攤還本息：</span>
              <span class="font-mono font-bold text-blue-600">NT$ ${chosenPlan.monthlyPayment.toLocaleString()} 元</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">總還款本息：</span>
              <span class="font-mono font-bold text-slate-800">NT$ ${chosenPlan.totalRepayment.toLocaleString()} 元</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">開辦手續費：</span>
              <span class="font-bold text-emerald-600">NT$ 0 元（完全無隱藏費用）</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">逾期遲延罰息：</span>
              <span class="text-emerald-600 font-medium">0元（原型承諾非侵入協助）</span>
            </div>
          </div>
        </div>

        <!-- 數位簽名板 (Canvas) -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 flex items-center gap-1">
              <i class="fa-solid fa-signature text-blue-600"></i>
              請於下方區域完成正楷電子簽署
            </label>
            <button type="button" onclick="app.clearSignature()" class="text-xs text-rose-600 hover:underline">
              <i class="fa-solid fa-rotate-left mr-1"></i>清除重簽
            </button>
          </div>

          <div class="relative">
            <canvas id="signatureCanvas" width="340" height="120" class="w-full h-32 rounded-lg"></canvas>
            <div id="signaturePlaceholder" class="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
              以滑鼠或手指在此處簽名...
            </div>
          </div>
        </div>

        <!-- 簽署開案確認按鈕 -->
        <button onclick="app.completeSigning()" class="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
          <i class="fa-solid fa-file-contract"></i>
          <span>確認並送出電子簽約（模擬開案生效）</span>
        </button>
      </div>
    `;
  }

  // 初始化簽名板
  initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('signaturePlaceholder');
    this.hasSignature = false;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (placeholder) placeholder.style.display = 'none';
      this.hasSignature = true;
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    canvas.onmousedown = startDraw;
    canvas.onmousemove = draw;
    window.onmouseup = stopDraw;

    canvas.ontouchstart = startDraw;
    canvas.ontouchmove = draw;
    window.ontouchend = stopDraw;
  }

  clearSignature() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const placeholder = document.getElementById('signaturePlaceholder');
    if (placeholder) placeholder.style.display = 'flex';
    this.hasSignature = false;
  }

  completeSigning() {
    if (!this.hasSignature) {
      // 寬鬆模式下若未簽名也允許模擬
      this.showToast('已為您自動載入數位授權簽章');
    }

    // 建立新案件或更新 ML001 為執行中
    const cases = this.getCases();
    const targetCase = cases.find(c => c.id === 'ML001');
    if (targetCase) {
      targetCase.status = '執行中';
      targetCase.selectedPlan = this.formData.selectedPlan;
      targetCase.repaymentProgress = {
        currentPeriod: 1,
        totalPeriods: 18,
        monthlyPayment: 2912,
        paidAmount: 0,
        remainingAmount: 52409,
        nextDueDate: '2026-11-15',
        isPaidThisMonth: false
      };
      targetCase.history.push({
        time: new Date().toLocaleString('zh-TW', { hour12: false }),
        actor: '申請人 ' + this.formData.maskedName,
        action: '完成數位簽署，合約正式生效開案'
      });
      this.saveCases(cases);
    }

    this.addAuditLog('申請人 ' + this.formData.maskedName, 'ML001', '電子簽約開案', '選定方案 C（18期），契約正式生效');
    this.showToast('🎉 電子簽署成功！借款開案生效，前往我的借款中心');
    this.goToStep(7);
  }

  // 步驟 7: 我的借貸與還款 (非侵入式通知、模擬還款防重複點擊)
  renderStep7MyLoans() {
    const cases = this.getCases();
    // 優先展示執行中案件 (ML005 或 ML001)
    const activeLoan = cases.find(c => c.id === 'ML001' && c.status === '執行中') || cases.find(c => c.id === 'ML005') || cases[4];
    const progress = activeLoan.repaymentProgress || {
      currentPeriod: 3,
      totalPeriods: 18,
      monthlyPayment: 2912,
      paidAmount: 8736,
      remainingAmount: 43673,
      nextDueDate: "2026-11-15",
      isPaidThisMonth: false
    };

    const percent = Math.round((progress.currentPeriod / progress.totalPeriods) * 100);

    return `
      <div class="fade-in space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 class="text-base font-bold text-slate-800">我的案件與還款中心</h2>
            <p class="text-xs text-slate-500">透明追蹤期數、防重複扣款、非侵入式協助</p>
          </div>
          <button onclick="app.goToStep(1)" class="text-xs text-blue-600 hover:underline">返回首頁</button>
        </div>

        <!-- 進行中貸款卡片 -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
              案件編號：${activeLoan.id}
            </span>
            <span class="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              履約中（執行中）
            </span>
          </div>

          <div>
            <span class="text-xs text-slate-400">核准借款本金</span>
            <div class="text-2xl font-bold font-mono text-white">NT$ ${activeLoan.amount.toLocaleString()}</div>
          </div>

          <!-- 還款進度條 -->
          <div class="space-y-1">
            <div class="flex justify-between text-xs text-slate-300">
              <span>已還期數：第 ${progress.currentPeriod} / ${progress.totalPeriods} 期</span>
              <span class="font-mono text-cyan-300">${percent}%</span>
            </div>
            <div class="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-xs">
            <div>
              <span class="text-slate-400 text-[11px] block">下期應繳日期</span>
              <span class="font-mono font-semibold text-slate-200">${progress.nextDueDate}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[11px] block">下期應繳金額</span>
              <span class="font-mono font-bold text-emerald-400">NT$ ${progress.monthlyPayment.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- 模擬繳款按鈕（防重複點擊鎖定） -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800">線上自主還款（模擬支付）</span>
            <span class="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">防重複扣款保護中</span>
          </div>

          <button id="btnPayInstallment" onclick="app.simulateRepayment('${activeLoan.id}')" class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-credit-card"></i>
            <span>模擬繳付本期款項 (NT$ ${progress.monthlyPayment.toLocaleString()})</span>
          </button>

          <p class="text-[11px] text-slate-500 text-center">
            點擊後自動鎖定交易識別碼，不重複記帳扣款。
          </p>
        </div>

        <!-- 倫理保障與展延求助 (嚴禁催繳騷擾與聯絡親友) -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h3 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-life-ring text-blue-600"></i> 還款遇到暫時困難？
          </h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            MicroLoan 嚴格遵守倫理防護規範：<strong>絕不催收騷擾、絕不聯絡第三人親友</strong>。若本月收入因接案浮動不足，可隨時申請專案彈性展延。
          </p>
          <button onclick="app.showToast('已為您開啟專案協調通道，專員陳專員將與您討論分期彈性');" class="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
            <i class="fa-solid fa-calendar-plus mr-1 text-blue-600"></i>申請暫緩本金或延長分期
          </button>
        </div>
      </div>
    `;
  }

  // 模擬還款（含鎖定與結案流轉）
  simulateRepayment(caseId) {
    const payBtn = document.getElementById('btnPayInstallment');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>交易處理中，鎖定重複扣款...';
    }

    setTimeout(() => {
      const cases = this.getCases();
      const target = cases.find(c => c.id === caseId);
      if (target && target.repaymentProgress) {
        target.repaymentProgress.currentPeriod += 1;
        target.repaymentProgress.paidAmount += target.repaymentProgress.monthlyPayment;
        target.repaymentProgress.remainingAmount = Math.max(0, target.repaymentProgress.remainingAmount - target.repaymentProgress.monthlyPayment);

        if (target.repaymentProgress.currentPeriod >= target.repaymentProgress.totalPeriods) {
          target.status = '結案';
          target.notes = '已完成全部期數清償，系統頒發清償證明歸檔結案。';
          target.history.push({
            time: new Date().toLocaleString('zh-TW', { hour12: false }),
            actor: '系統記帳模組',
            action: '全數期款繳清，案件轉為【結案】'
          });
          this.addAuditLog('系統記帳模組', target.id, '全額清償結案', '完成所有期數還款，發送結清通知');
          this.showToast('🎊 恭喜！本貸款已全數清償結案！');
        } else {
          target.history.push({
            time: new Date().toLocaleString('zh-TW', { hour12: false }),
            actor: '申請人 (自主繳款)',
            action: `成功繳納第 ${target.repaymentProgress.currentPeriod} 期款項 (NT$ ${target.repaymentProgress.monthlyPayment})`
          });
          this.addAuditLog('申請人', target.id, '繳納期款', `繳付第 ${target.repaymentProgress.currentPeriod} 期款項`);
          this.showToast(`✅ 成功繳納第 ${target.repaymentProgress.currentPeriod} 期！剩餘 ${target.repaymentProgress.totalPeriods - target.repaymentProgress.currentPeriod} 期`);
        }
        this.saveCases(cases);
        this.renderMobileStep();
      }
    }, 1000);
  }

  // ==========================
  // 桌面管理後台渲染與操作邏輯
  // ==========================

  renderDesktopDashboard() {
    const cases = this.getCases();
    
    // 計算期間指標 (落實報告第9頁：進案12件為期間事件，開案5件含執行中3與結案2，不可相加之原則)
    const totalSubmissions = cases.length; // 期間進案 12
    const activeCases = cases.filter(c => c.status === '執行中').length; // 3
    const closedCases = cases.filter(c => c.status === '結案').length; // 2
    const pendingCases = cases.filter(c => c.status === '審核中').length; // 2
    const missingDocCases = cases.filter(c => c.status === '待補件').length; // 2
    const approvedWaitingSign = cases.filter(c => c.status === '已核准待簽署').length; // 1
    const rejectedCases = cases.filter(c => c.status === '無法核貸').length; // 1
    const withdrawnCases = cases.filter(c => c.status === '已撤回').length; // 1
    const openedCases = activeCases + closedCases; // 開案 5件

    document.getElementById('metricTotalSubmissions').textContent = totalSubmissions;
    document.getElementById('metricActiveLoans').textContent = activeCases;
    document.getElementById('metricClosedLoans').textContent = closedCases;
    document.getElementById('metricPendingReview').textContent = pendingCases;
    document.getElementById('metricMissingDocs').textContent = missingDocCases;
    document.getElementById('metricOpenedLoans').textContent = openedCases;

    // 渲染分流佔比
    const aiCases = cases.filter(c => c.triageType.includes('AI')).length;
    const humanCases = cases.filter(c => c.triageType.includes('人工')).length;
    document.getElementById('statAiCount').textContent = `${aiCases} 案 (${Math.round(aiCases/totalSubmissions*100)}%)`;
    document.getElementById('statHumanCount').textContent = `${humanCases} 案 (${Math.round(humanCases/totalSubmissions*100)}%)`;
  }

  renderDesktopCaseList(filterStatus = 'ALL') {
    const tableBody = document.getElementById('caseTableBody');
    if (!tableBody) return;

    let cases = this.getCases();
    if (filterStatus !== 'ALL') {
      cases = cases.filter(c => c.status === filterStatus);
    }

    tableBody.innerHTML = cases.map(c => {
      let statusBadge = '';
      switch (c.status) {
        case '已核准待簽署':
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">已核准待簽署</span>';
          break;
        case '審核中':
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">審核中 (待人工)</span>';
          break;
        case '待補件':
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">待補件</span>';
          break;
        case '執行中':
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">執行中</span>';
          break;
        case '結案':
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">結案</span>';
          break;
        case '無法核貸':
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">無法核貸</span>';
          break;
        case '已撤回':
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">已撤回</span>';
          break;
      }

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-4 py-3 font-mono font-bold text-slate-800">${c.id}</td>
          <td class="px-4 py-3 font-medium text-slate-800">${c.applicantName}</td>
          <td class="px-4 py-3 font-mono font-bold text-slate-900">NT$ ${c.amount.toLocaleString()}</td>
          <td class="px-4 py-3 text-xs">
            <span class="inline-flex items-center gap-1 ${c.triageType.includes('AI') ? 'text-blue-700 font-semibold' : 'text-amber-700 font-bold'}">
              ${c.triageType.includes('AI') ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user-shield"></i>'}
              ${c.triageType}
            </span>
          </td>
          <td class="px-4 py-3 font-mono text-xs text-slate-600">NT$ ${c.surplus.toLocaleString()}</td>
          <td class="px-4 py-3">${statusBadge}</td>
          <td class="px-4 py-3 text-xs text-slate-500">${c.appliedAt}</td>
          <td class="px-4 py-3">
            <button onclick="app.openCaseDetail('${c.id}')" class="px-3 py-1 bg-slate-800 hover:bg-blue-600 text-white rounded-lg text-xs font-medium shadow-sm transition">
              <i class="fa-solid fa-magnifying-glass mr-1"></i>詳情與審核
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 開啟案件詳情與人工覆核抽屜
  openCaseDetail(caseId) {
    const cases = this.getCases();
    const c = cases.find(item => item.id === caseId);
    if (!c) return;

    const modal = document.getElementById('caseReviewModal');
    const content = document.getElementById('caseReviewModalContent');

    content.innerHTML = `
      <div class="space-y-4">
        <!-- 標頭資訊 -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-900">案件審查：${c.id} - ${c.applicantName}</h2>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold ${c.status === '審核中' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}">
                ${c.status}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">進件時間：${c.appliedAt} | 審查負責人：${c.assignedTo}</p>
          </div>
          <button onclick="app.closeCaseReviewModal()" class="text-slate-400 hover:text-slate-600 text-lg">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 申請人財務收支與核對資料 -->
          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <h3 class="font-bold text-slate-800 flex items-center gap-1.5">
              <i class="fa-solid fa-id-card text-blue-600"></i> 申請人身分與收支憑證
            </h3>
            <div class="space-y-1.5 text-slate-600">
              <div class="flex justify-between"><span>申貸金額：</span><strong class="text-slate-800 font-mono text-sm">NT$ ${c.amount.toLocaleString()}</strong></div>
              <div class="flex justify-between"><span>所得型態：</span><span class="text-slate-800">${c.incomeType}</span></div>
              <div class="flex justify-between"><span>每月收入 (I)：</span><span class="font-mono font-bold text-slate-800">NT$ ${c.income.toLocaleString()}</span></div>
              <div class="flex justify-between"><span>生活支出 (E)：</span><span class="font-mono text-slate-800">NT$ ${c.expense.toLocaleString()}</span></div>
              <div class="flex justify-between"><span>既有債務 (D)：</span><span class="font-mono text-slate-800">NT$ ${c.debt.toLocaleString()}</span></div>
              <div class="flex justify-between border-t border-slate-200 pt-1">
                <span>可用現金流 (R)：</span>
                <span class="font-mono font-bold ${c.surplus > 0 ? 'text-emerald-600' : 'text-rose-600'}">NT$ ${c.surplus.toLocaleString()}</span>
              </div>
              <div class="flex justify-between"><span>40% 安全月付上限：</span><span class="font-mono font-bold text-blue-600">NT$ ${c.maxAllowedMonthly.toLocaleString()}</span></div>
              <div class="flex justify-between"><span>證件影像核對：</span><span class="text-emerald-600 font-medium">${c.ocrStatus}</span></div>
            </div>
          </div>

          <!-- AI 建議與規則版本 -->
          <div class="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-blue-900 flex items-center gap-1.5">
                <i class="fa-solid fa-robot text-blue-600"></i> AI 決策建議與判定日誌
              </h3>
              <span class="font-mono text-[11px] text-blue-600">${c.ruleVersion}</span>
            </div>
            <p class="text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-blue-100">
              ${c.notes}
            </p>
            <div class="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px]">
              <i class="fa-solid fa-circle-exclamation mr-1"></i>
              <strong>防自動化偏誤提醒：</strong> 審查專員不得盲從 AI 建議；若做成核准或否決，皆須手動填寫實質裁決理由。
            </div>
          </div>
        </div>

        <!-- 案件歷史軌跡 -->
        <div class="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <span class="font-bold text-slate-700 block">案件操作事件歷程：</span>
          <div class="space-y-1 max-h-28 overflow-y-auto custom-scroll">
            ${c.history.map(h => `
              <div class="flex items-center justify-between text-[11px] text-slate-500 py-0.5 border-b border-slate-50">
                <span><strong class="text-slate-700">${h.actor}</strong>：${h.action}</span>
                <span class="font-mono text-slate-400">${h.time}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 人工專員審查決策操作區 (依規格強制填寫理由) -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <h3 class="text-xs font-bold text-slate-800 flex items-center gap-1">
            <i class="fa-solid fa-user-pen text-slate-700"></i> 專員人工審查與理由備註（陳專員）
          </h3>
          
          <div>
            <label class="block text-xs text-slate-600 mb-1">
              實質裁決理由 <span class="text-rose-500 font-bold">*（必填）</span>
            </label>
            <textarea id="officerDecisionReason" rows="2" placeholder="請輸入人工覆核判定理由（例如：已調閱近三個月薪資往來證明無虞，同意18期分期核貸）..." class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button onclick="app.executeOfficerAction('${c.id}', 'REJECT')" class="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition">
              <i class="fa-solid fa-ban mr-1"></i>無法核貸
            </button>
            <button onclick="app.executeOfficerAction('${c.id}', 'REQUEST_DOCS')" class="px-3.5 py-2 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 rounded-lg text-xs font-bold transition">
              <i class="fa-solid fa-folder-plus mr-1"></i>要求補件
            </button>
            <button onclick="app.executeOfficerAction('${c.id}', 'APPROVE')" class="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold shadow-sm transition">
              <i class="fa-solid fa-circle-check mr-1"></i>人工核准通過
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  closeCaseReviewModal() {
    const modal = document.getElementById('caseReviewModal');
    if (modal) modal.classList.add('hidden');
  }

  // 專員執行決策（強制理由填寫）
  executeOfficerAction(caseId, actionType) {
    const reasonInput = document.getElementById('officerDecisionReason');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    if (!reason) {
      this.showToast('⚠️ 依人機互動規範，人工專員必須填寫實質決策理由以防偏誤！');
      return;
    }

    const cases = this.getCases();
    const target = cases.find(c => c.id === caseId);
    if (!target) return;

    let actionLabel = '';
    const nowTime = new Date().toLocaleString('zh-TW', { hour12: false });

    if (actionType === 'APPROVE') {
      target.status = '已核准待簽署';
      actionLabel = '專員人工核准通過';
      target.notes = `專員人工覆核通過。理由：${reason}`;
      target.history.push({ time: nowTime, actor: '陳專員 (人工審查)', action: `核准案件，理由：${reason}` });
      this.addAuditLog('陳專員 (審查專員)', target.id, '人工核准', reason);
    } else if (actionType === 'REQUEST_DOCS') {
      target.status = '待補件';
      actionLabel = '專員要求補充文件';
      target.notes = `專員要求補件。理由：${reason}`;
      target.history.push({ time: nowTime, actor: '陳專員 (人工審查)', action: `發起補件通知：${reason}` });
      this.addAuditLog('陳專員 (審查專員)', target.id, '要求補件', reason);
    } else if (actionType === 'REJECT') {
      target.status = '無法核貸';
      actionLabel = '專員作成無法核貸決策';
      target.notes = `專員判定無法核貸。理由：${reason}`;
      target.history.push({ time: nowTime, actor: '陳專員 (人工審查)', action: `無法核貸，理由：${reason}` });
      this.addAuditLog('陳專員 (審查專員)', target.id, '人工否決', reason);
    }

    this.saveCases(cases);
    this.closeCaseReviewModal();
    this.renderDesktopDashboard();
    this.renderDesktopCaseList();
    this.renderAuditLogs();
    this.showToast(`✅ 已完成案件 ${caseId} 之 ${actionLabel}`);
  }

  renderAuditLogs() {
    const container = document.getElementById('auditLogTableBody');
    if (!container) return;
    const logs = this.getAuditLogs();
    container.innerHTML = logs.map(l => `
      <tr class="hover:bg-slate-50 text-xs border-b border-slate-100">
        <td class="px-3 py-2.5 font-mono text-slate-500">${l.time}</td>
        <td class="px-3 py-2.5 font-semibold text-slate-800">${l.operator}</td>
        <td class="px-3 py-2.5 font-mono font-bold text-blue-600">${l.targetCase}</td>
        <td class="px-3 py-2.5 font-medium text-slate-700">${l.action}</td>
        <td class="px-3 py-2.5 text-slate-600">${l.detail}</td>
      </tr>
    `).join('');
  }

  // ==========================
  // 錯誤更正 Modal (SIM-W02)
  // ==========================
  openCorrectionModal() {
    const modal = document.getElementById('correctionModal');
    const inputField = document.getElementById('correctIncomeInput');
    const oldField = document.getElementById('oldIncomeDisplay');
    if (oldField) oldField.textContent = `NT$ ${this.formData.income.toLocaleString()}`;
    if (inputField) inputField.value = 28000; // 建議修正為林先生正確之 28,000 元
    modal.classList.remove('hidden');
  }

  closeCorrectionModal() {
    const modal = document.getElementById('correctionModal');
    if (modal) modal.classList.add('hidden');
  }

  saveCorrection() {
    const inputField = document.getElementById('correctIncomeInput');
    const newInc = Number(inputField.value) || 28000;
    const oldInc = this.formData.income;
    this.formData.income = newInc;

    this.addAuditLog('申請人 (自助更正)', 'ML001', '修正收入資料', `將辨識誤讀之 ${oldInc} 元更正為 ${newInc} 元，重新觸發評估`);
    this.closeCorrectionModal();
    this.showToast(`✅ 資料已更正為 ${newInc.toLocaleString()} 元，重新評估中...`);
    this.goToStep(4);
  }

  // ==========================
  // 人工覆核申訴 Modal (SIM-I04)
  // ==========================
  openAppealModal() {
    const modal = document.getElementById('appealModal');
    modal.classList.remove('hidden');
  }

  closeAppealModal() {
    const modal = document.getElementById('appealModal');
    if (modal) modal.classList.add('hidden');
  }

  submitAppeal() {
    const reasonText = document.getElementById('appealReasonText').value.trim();
    if (!reasonText) {
      this.showToast('請簡述您的申訴說明或預計補充之資料');
      return;
    }

    const cases = this.getCases();
    let target = cases.find(c => c.id === 'ML004');
    if (target) {
      target.status = '審核中';
      target.notes = `使用者提出人工覆核異議：${reasonText}`;
      target.history.push({
        time: new Date().toLocaleString('zh-TW', { hour12: false }),
        actor: '申請人 (異議覆核)',
        action: `提出覆核申請：${reasonText}`
      });
      this.saveCases(cases);
    }

    this.addAuditLog('申請人 (異議覆核)', 'ML004', '申請人工覆核', reasonText);
    this.closeAppealModal();
    this.showToast('📬 覆核申請已送出！已轉交審查專員陳專員');
    this.goToStep(4);
  }

  // ==========================
  // 智慧 CUI 對話助理 (Mixed-Initiative)
  // ==========================
  toggleChatDrawer() {
    const drawer = document.getElementById('chatDrawer');
    drawer.classList.toggle('open');
  }

  sendChatMessage(customText) {
    const input = document.getElementById('chatInput');
    const text = customText || (input ? input.value.trim() : '');
    if (!text) return;

    const chatBody = document.getElementById('chatMessageContainer');
    // 使用者訊息
    const userMsgHtml = `
      <div class="flex justify-end mb-2.5">
        <div class="bg-blue-600 text-white text-xs px-3 py-2 rounded-xl rounded-tr-none max-w-[80%] shadow">
          ${text}
        </div>
      </div>
    `;
    chatBody.insertAdjacentHTML('beforeend', userMsgHtml);
    if (input) input.value = '';

    // AI 回應邏輯
    setTimeout(() => {
      let reply = "您好！我是 MicroLoan 微微貸 AI 小幫手。針對您的提問，本系統秉持透明人機互動原則，隨時為您解釋計算公式與提供人工協助。";

      if (text.includes("40%") || text.includes("上限")) {
        reply = "40% 餘額規則是本專案為保護借款人生活緩衝所設計的參數：每月可用餘額 R = 收入 - 支出 - 債務。新貸款月付額不超過 R 的 40%，以確保即使遇到突發支出也不會造成週轉危機。";
      } else if (text.includes("方案") || text.includes("利息") || text.includes("差在哪")) {
        reply = "方案 C（18期）月付最低（2,912元），最不易造成每月壓力；但因為期數較長，總利息會比短期方案 A（6期，利息879元）多出約 1,530 元。系統將總還款成本完全公開，讓您自主權衡。";
      } else if (text.includes("10萬") || text.includes("人工")) {
        reply = "為防範高額信貸自動化風險，本系統以 10 萬元為分流界線。10萬元（含）以下由 AI 即時評估；超過 10 萬元則由授信專員「陳專員」進行二次實質審查，保障雙方權益。";
      } else if (text.includes("誤讀") || text.includes("更正")) {
        reply = "若影像辨識或收支資料有誤，您可在【審核進度】或【收支填寫】頁面，點擊「更正資料」按鈕，系統將並列原值與新值，並即時為您重新試算！";
      } else if (text.includes("覆核") || text.includes("被拒") || text.includes("申訴")) {
        reply = "若 AI 決策為無法核貸，系統不會直接關閉案件。您可以點擊「申請人工專員覆核」，陳述您的特殊經濟情況或補充證明，專員將於 1 個工作日內親自受理。";
      }

      const aiMsgHtml = `
        <div class="flex items-start gap-2 mb-2.5">
          <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0 font-bold">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div class="bg-slate-100 text-slate-800 text-xs px-3 py-2 rounded-xl rounded-tl-none max-w-[80%] leading-relaxed shadow-sm">
            ${reply}
          </div>
        </div>
      `;
      chatBody.insertAdjacentHTML('beforeend', aiMsgHtml);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 400);
  }

  // ==========================
  // 課堂研究規格與理論 Drawer
  // ==========================
  openSpecDrawer() {
    const drawer = document.getElementById('specDrawer');
    drawer.classList.remove('hidden');
  }

  closeSpecDrawer() {
    const drawer = document.getElementById('specDrawer');
    drawer.classList.add('hidden');
  }

  // 通用 Toast 提示
  showToast(message) {
    const toast = document.getElementById('toastNotification');
    const textEl = document.getElementById('toastText');
    if (!toast || !textEl) return;
    textEl.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3200);
  }

  bindEvents() {
    // 綁定鍵盤 Enter 傳送 Chat
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendChatMessage();
      });
    }
  }
}

// 實例化全域應用
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new MicroLoanApp();
});
