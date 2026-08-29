// ═══════════════════════════════════════════════════════════════
//  app.js — ব্যক্তিগত আর্থিক ট্র্যাকার — ফ্রন্টএন্ড লজিক
// ═══════════════════════════════════════════════════════════════

// ─── বর্তমান বছর ফুটারে দেখানো ─────────────────────────────
document.getElementById('currentYear').textContent = new Date().getFullYear();

// ═══════════════════════════════════════════════════════════════
//  সাহায্যকারী ফাংশনসমূহ (Utility Functions)
// ═══════════════════════════════════════════════════════════════

/**
 * টোস্ট নোটিফিকেশন দেখানো
 * @param {string} message - বার্তা
 * @param {string} type - 'success', 'error', বা 'info'
 */
function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast toast-' + type;

  // ৩ সেকেন্ড পর স্বয়ংক্রিয় লুকানো
  setTimeout(function() {
    toast.classList.add('hidden');
  }, 3500);
}

/**
 * লোডিং ওভারলে দেখানো/লুকানো
 */
function showLoading() {
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

/**
 * সংখ্যাকে বাংলা মুদ্রা ফরম্যাটে রূপান্তর
 */
function formatCurrency(amount) {
  return CONFIG.CURRENCY + ' ' + parseFloat(amount).toLocaleString('bn-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * তারিখকে বাংলা ফরম্যাটে রূপান্তর
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch(e) {
    return dateStr;
  }
}

/**
 * বর্তমান মাস YYYY-MM ফরম্যাটে
 */
function getCurrentMonth() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

/**
 * বর্তমান তারিখ YYYY-MM-DD ফরম্যাটে
 */
function getCurrentDate() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

/**
 * বর্তমান সময় HH:MM ফরম্যাটে
 */
function getCurrentTime() {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');
}

// ═══════════════════════════════════════════════════════════════
//  ট্যাব স্যুইচিং
// ═══════════════════════════════════════════════════════════════

function switchTab(tabName) {
  // সব ট্যাব লুকানো
  document.querySelectorAll('.tab-content').forEach(function(tab) {
    tab.classList.remove('active');
  });

  // সব বোতাম ডিঅ্যাক্টিভ
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  // নির্বাচিত ট্যাব দেখানো
  document.getElementById('tab-' + tabName).classList.add('active');

  // নির্বাচিত বোতাম অ্যাক্টিভ
  document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');

  // ট্যাব অনুযায়ী ডেটা লোড
  if (tabName === 'dashboard') loadDashboard();
  else if (tabName === 'report') initReportTab();
  else if (tabName === 'loans') loadLoanTracker();
}

// ═══════════════════════════════════════════════════════════════
//  API কল ফাংশন — fetch ব্যবহার করে Apps Script-এ সংযোগ
// ═══════════════════════════════════════════════════════════════

/**
 * GET রিকোয়েস্ট পাঠানো
 * @param {object} params - URL প্যারামিটার (key-value)
 * @returns {Promise<object>} - JSON রেসপন্স
 */
async function apiGet(params) {
  const url = new URL(CONFIG.API_URL);

  // প্যারামিটার যোগ করা
  Object.keys(params).forEach(function(key) {
    url.searchParams.append(key, params[key]);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API GET ত্রুটি:', error);
    showToast('সার্ভারের সাথে যোগাযোগে সমস্যা হয়েছে।', 'error');
    return { status: 'error', message: error.message };
  }
}

/**
 * POST রিকোয়েস্ট পাঠানো — নতুন ডেটা সংরক্ষণ
 * @param {object} data - পাঠানোর ডেটা
 * @returns {Promise<object>} - JSON রেসপন্স
 */
async function apiPost(data) {
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
      mode: 'no-cors' // Apps Script CORS সমস্যা এড়াতে
    });

    // no-cors মোডে response body পড়া যায় না
    // তাই আমরা সরাসরি redirect follow করে response নিই

    return { status: 'success' };
  } catch (error) {
    console.error('API POST ত্রুটি:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * POST রিকোয়েস্ট — বিকল্প পদ্ধতি (Redirect follow করে)
 * এই পদ্ধতিতে Apps Script-এর রেসপন্স সঠিকভাবে পাওয়া যায়
 */
async function apiPostWithResponse(data) {
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      redirect: 'follow'
    });
    const result = await response.json();
    return result;
  } catch (error) {
    // ফলব্যাক: no-cors পদ্ধতি
    console.warn('redirect follow ব্যর্থ, no-cors চেষ্টা করা হচ্ছে:', error);
    return apiPost(data);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ড্যাশবোর্ড লোড
// ═══════════════════════════════════════════════════════════════

async function loadDashboard() {
  showLoading();

  try {
    const currentMonth = getCurrentMonth();

    // একসাথে দুটি API কল
    const [monthlyData, categoryData] = await Promise.all([
      apiGet({ action: 'getMonthlyData', month: currentMonth }),
      apiGet({ action: 'getCategorySummary', month: currentMonth })
    ]);

    // সামারি কার্ড আপডেট
    if (monthlyData.status === 'success') {
      const summary = monthlyData.summary;
      document.getElementById('totalExpense').textContent = formatCurrency(summary.totalExpense);
      document.getElementById('totalLoanGiven').textContent = formatCurrency(summary.totalLoanGiven);
      document.getElementById('totalLoanReceived').textContent = formatCurrency(summary.totalLoanReceived);

      const netBal = summary.netLoanBalance;
      const netBalEl = document.getElementById('netBalance');
      netBalEl.textContent = formatCurrency(Math.abs(summary.totalOutflow));
      // netBalEl.style.color = netBal >= 0 ? 'var(--success)' : 'var(--danger)';

      // সাম্প্রতিক লেনদেন
      renderRecentTransactions(monthlyData.data);
    }

    // ক্যাটাগরি চার্ট
    if (categoryData.status === 'success') {
      renderCategoryChart(categoryData.categories);
    }

  } catch (error) {
    console.error('ড্যাশবোর্ড লোডে সমস্যা:', error);
    showToast('ড্যাশবোর্ড লোডে সমস্যা হয়েছে।', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * সাম্প্রতিক লেনদেন রেন্ডার করা
 */
function renderRecentTransactions(transactions) {
  const container = document.getElementById('recentTransactions');

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="empty-state">এই মাসে কোনো লেনদেন নেই।</p>';
    return;
  }

  // সর্বশেষটি আগে দেখাতে উল্টানো
  const sorted = transactions.slice().reverse().slice(0, 15);

  let html = '';
  sorted.forEach(function(txn) {
    const typeClass = txn.Type === 'Expense' ? 'expense' :
                      txn.Type === 'Loan-Given' ? 'loan-given' : 'loan-received';

    const typeLabel = txn.Type === 'Expense' ? 'খরচ' :
                      txn.Type === 'Loan-Given' ? 'ঋণ দেওয়া' : 'ঋণ নেওয়া';

    const amountPrefix = txn.Type === 'Loan-Received' ? '+' : '-';

    html += '<div class="transaction-item">';
    html +=   '<div class="txn-left">';
    html +=     '<span class="txn-category">' + (txn.Category || '') +
                '<span class="type-tag ' + typeClass + '">' + typeLabel + '</span></span>';
    html +=     '<span class="txn-meta">' + formatDate(txn.Date) + ' • ' + (txn.Time || '') +
                (txn.Description ? ' • ' + txn.Description : '') + '</span>';
    html +=   '</div>';
    html +=   '<span class="txn-amount ' + typeClass + '">' +
              amountPrefix + formatCurrency(txn.Amount) + '</span>';
    html += '</div>';
  });

  container.innerHTML = html;
}

/**
 * ক্যাটাগরি চার্ট রেন্ডার — সাধারণ বার চার্ট (কোনো লাইব্রেরি ছাড়া)
 */
function renderCategoryChart(categories) {
  const container = document.getElementById('categoryChart');

  if (!categories || Object.keys(categories).length === 0) {
    container.innerHTML = '<p class="chart-placeholder">এই মাসে কোনো খরচের ডেটা নেই।</p>';
    return;
  }

  // সর্বোচ্চ মান বের করা (বার-এর আনুপাতিক দৈর্ঘ্যের জন্য)
  const maxAmount = Math.max.apply(null, Object.values(categories));

  // বার চার্টের রং
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
  ];

  let html = '<div class="chart-bar-container">';

  const entries = Object.entries(categories).sort(function(a, b) {
    return b[1] - a[1]; // বড় থেকে ছোট
  });

  entries.forEach(function(entry, index) {
    const category = entry[0];
    const amount = entry[1];
    const percentage = (amount / maxAmount) * 100;
    const color = colors[index % colors.length];

    html += '<div class="chart-bar-item">';
    html +=   '<span class="chart-bar-label">' + category + '</span>';
    html +=   '<div class="chart-bar-track">';
    html +=     '<div class="chart-bar-fill" style="width: ' + Math.max(percentage, 8) +
                '%; background: ' + color + ';">';
    html +=       '<span class="chart-bar-value">' + formatCurrency(amount) + '</span>';
    html +=     '</div>';
    html +=   '</div>';
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  নতুন এন্ট্রি ফর্ম লজিক
// ═══════════════════════════════════════════════════════════════

/**
 * ফর্ম ইনিশিয়ালাইজ — ক্যাটাগরি ড্রপডাউন পূরণ ও ডিফল্ট মান
 */
function initEntryForm() {
  // ডিফল্ট তারিখ ও সময় সেট
  document.getElementById('txnDate').value = getCurrentDate();
  document.getElementById('txnTime').value = getCurrentTime();

  // ক্যাটাগরি ড্রপডাউন পূরণ
  populateCategories();

  // Type পরিবর্তনে hint আপডেট
  onTypeChange('Expense');
}

/**
 * ক্যাটাগরি ড্রপডাউন পূরণ
 */
function populateCategories() {
  const select = document.getElementById('txnCategory');
  // ডিফল্ট option রাখা
  select.innerHTML = '<option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>';

  CONFIG.CATEGORIES.forEach(function(cat) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/**
 * Type পরিবর্তন হলে Description hint আপডেট
 */
function onTypeChange(type) {
  const descLabel = document.getElementById('descLabel');
  const descHint = document.getElementById('descHint');
  const descField = document.getElementById('txnDescription');

  if (type === 'Loan-Given') {
    descLabel.textContent = '📝 কাকে ঋণ দিয়েছেন (ব্যক্তির নাম)';
    descHint.textContent = '💡 ব্যক্তির নাম লিখুন — ঋণ ট্র্যাকারে ব্যক্তিভিত্তিক হিসাব দেখতে পাবেন।';
    descField.placeholder = 'যেমন: রহিম, করিম';
    document.getElementById('txnCategory').value = 'ঋণ';
  } else if (type === 'Loan-Received') {
    descLabel.textContent = '📝 কার কাছ থেকে ঋণ নিয়েছেন (ব্যক্তির নাম)';
    descHint.textContent = '💡 ব্যক্তির নাম লিখুন — ঋণ ট্র্যাকারে ব্যক্তিভিত্তিক হিসাব দেখতে পাবেন।';
    descField.placeholder = 'যেমন: রহিম, করিম';
    document.getElementById('txnCategory').value = 'ঋণ';
  } else {
    descLabel.textContent = '📝 বিবরণ';
    descHint.textContent = '';
    descField.placeholder = 'বিবরণ লিখুন (ঐচ্ছিক)';
  }
}

/**
 * ফর্ম সাবমিট হ্যান্ডলার
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ সংরক্ষণ করা হচ্ছে...';

  // ফর্ম ডেটা সংগ্রহ
  const formData = {
    date: document.getElementById('txnDate').value,
    time: document.getElementById('txnTime').value,
    category: document.getElementById('txnCategory').value,
    amount: document.getElementById('txnAmount').value,
    type: document.querySelector('input[name="type"]:checked').value,
    description: document.getElementById('txnDescription').value
  };

  // ক্লায়েন্ট-সাইড ভ্যালিডেশন
  if (!formData.date || !formData.time || !formData.category || !formData.amount) {
    showToast('সব আবশ্যক (*) ফিল্ড পূরণ করুন।', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ সংরক্ষণ করুন';
    return false;
  }

  if (parseFloat(formData.amount) <= 0) {
    showToast('টাকার পরিমাণ ০ এর বেশি হতে হবে।', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ সংরক্ষণ করুন';
    return false;
  }

  try {
    // API-তে ডেটা পাঠানো
    const result = await apiPostWithResponse(formData);

    if (result.status === 'success') {
      showToast('✅ ডেটা সফলভাবে সংরক্ষিত হয়েছে!', 'success');

      // ফর্ম রিসেট
      document.getElementById('txnAmount').value = '';
      document.getElementById('txnDescription').value = '';
      document.getElementById('txnTime').value = getCurrentTime();

      // Expense রেডিও বোতাম আবার সিলেক্ট
      document.querySelector('input[name="type"][value="Expense"]').checked = true;
      onTypeChange('Expense');
    } else {
      showToast(result.message || 'সংরক্ষণে সমস্যা হয়েছে।', 'error');
    }

  } catch (error) {
    // no-cors মোডে response পড়া যায় না, তাই সফল ধরে নেওয়া
    showToast('✅ ডেটা পাঠানো হয়েছে! শিট চেক করুন।', 'info');

    // ফর্ম রিসেট
    document.getElementById('txnAmount').value = '';
    document.getElementById('txnDescription').value = '';
    document.getElementById('txnTime').value = getCurrentTime();
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ সংরক্ষণ করুন';
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════
//  মাসিক রিপোর্ট ট্যাব
// ═══════════════════════════════════════════════════════════════

function initReportTab() {
  // ডিফল্ট মাস সেট
  const monthInput = document.getElementById('reportMonth');
  if (!monthInput.value) {
    monthInput.value = getCurrentMonth();
  }

  loadMonthlyReport();
  loadAllMonthsReport();
}

/**
 * নির্বাচিত মাসের রিপোর্ট লোড
 */
async function loadMonthlyReport() {
  const month = document.getElementById('reportMonth').value;
  if (!month) return;

  showLoading();

  try {
    const data = await apiGet({ action: 'getMonthlyData', month: month });

    if (data.status === 'success') {
      renderReportSummary(data.summary, month);
      renderReportTable(data.data);
    } else {
      showToast(data.message || 'রিপোর্ট লোডে সমস্যা।', 'error');
    }
  } catch (error) {
    showToast('রিপোর্ট লোডে সমস্যা হয়েছে।', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * রিপোর্ট সামারি রেন্ডার
 */
function renderReportSummary(summary, month) {
  const container = document.getElementById('reportSummary');

  const monthName = new Date(month + '-01').toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long'
  });

  let html = '';

  html += '<div class="report-stat">';
  html +=   '<span class="stat-label">💸 মোট খরচ</span>';
  html +=   '<span class="stat-value" style="color:var(--danger)">' + formatCurrency(summary.totalExpense) + '</span>';
  html += '</div>';

  html += '<div class="report-stat">';
  html +=   '<span class="stat-label">📤 ঋণ দেওয়া</span>';
  html +=   '<span class="stat-value" style="color:var(--warning)">' + formatCurrency(summary.totalLoanGiven) + '</span>';
  html += '</div>';

  html += '<div class="report-stat">';
  html +=   '<span class="stat-label">📥 ঋণ নেওয়া</span>';
  html +=   '<span class="stat-value" style="color:var(--success)">' + formatCurrency(summary.totalLoanReceived) + '</span>';
  html += '</div>';

  html += '<div class="report-stat">';
  html +=   '<span class="stat-label">💰 মোট বহির্গমন</span>';
  html +=   '<span class="stat-value">' + formatCurrency(summary.totalOutflow) + '</span>';
  html += '</div>';

  container.innerHTML = html;
}

/**
 * রিপোর্ট টেবিল রেন্ডার
 */
function renderReportTable(transactions) {
  const container = document.getElementById('reportTable');

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="empty-state">এই মাসে কোনো লেনদেন নেই।</p>';
    return;
  }

  let html = '<table class="report-table">';
  html += '<thead><tr>';
  html +=   '<th>তারিখ</th><th>সময়</th><th>ক্যাটাগরি</th>';
  html +=   '<th>ধরন</th><th>টাকা</th><th>বিবরণ</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  transactions.forEach(function(txn) {
    const typeLabel = txn.Type === 'Expense' ? '💸 খরচ' :
                      txn.Type === 'Loan-Given' ? '📤 ঋণ দেওয়া' : '📥 ঋণ নেওয়া';

    html += '<tr>';
    html +=   '<td>' + formatDate(txn.Date) + '</td>';
    html +=   '<td>' + (txn.Time || '') + '</td>';
    html +=   '<td>' + (txn.Category || '') + '</td>';
    html +=   '<td>' + typeLabel + '</td>';
    html +=   '<td><strong>' + formatCurrency(txn.Amount) + '</strong></td>';
    html +=   '<td>' + (txn.Description || '-') + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

/**
 * সব মাসের তুলনামূলক সামারি লোড
 */
async function loadAllMonthsReport() {
  try {
    const data = await apiGet({ action: 'getMonthlyReport' });

    if (data.status === 'success' && data.report) {
      renderAllMonthsReport(data.report);
    }
  } catch (error) {
    console.error('সব মাসের রিপোর্ট লোডে সমস্যা:', error);
  }
}

function renderAllMonthsReport(report) {
  const container = document.getElementById('allMonthsReport');

  if (!report || report.length === 0) {
    container.innerHTML = '<p class="empty-state">কোনো রিপোর্ট ডেটা নেই।</p>';
    return;
  }

  let html = '';
  report.reverse().forEach(function(row) {
    let monthDisplay = row.Month;
    try {
      monthDisplay = new Date(row.Month + '-01').toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long'
      });
    } catch(e) {}

    html += '<div class="month-report-card">';
    html +=   '<span class="month-name">📅 ' + monthDisplay + '</span>';
    html +=   '<div class="month-stats">';
    html +=     '<span>💸 খরচ: <strong>' + formatCurrency(row.TotalExpense) + '</strong></span>';
    html +=     '<span>📤 দেওয়া: <strong>' + formatCurrency(row.TotalLoanGiven) + '</strong></span>';
    html +=     '<span>📥 নেওয়া: <strong>' + formatCurrency(row.TotalLoanReceived) + '</strong></span>';
    html +=   '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  ঋণ ট্র্যাকার ট্যাব
// ═══════════════════════════════════════════════════════════════

async function loadLoanTracker() {
  showLoading();

  try {
    const data = await apiGet({ action: 'getLoanBalance' });

    if (data.status === 'success') {
      renderLoanOverview(data.overallSummary);
      renderLoanDetails(data.loanDetails);
    } else {
      showToast(data.message || 'ঋণ ডেটা লোডে সমস্যা।', 'error');
    }
  } catch (error) {
    showToast('ঋণ ট্র্যাকার লোডে সমস্যা হয়েছে।', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * সামগ্রিক ঋণ সারাংশ রেন্ডার
 */
function renderLoanOverview(summary) {
  const container = document.getElementById('loanOverview');

  let html = '';

  html += '<div class="loan-overview-card">';
  html +=   '<span class="loan-card-label">📤 মোট ঋণ দেওয়া</span>';
  html +=   '<span class="loan-card-value" style="color:var(--warning)">' +
            formatCurrency(summary.totalGiven) + '</span>';
  html += '</div>';

  html += '<div class="loan-overview-card">';
  html +=   '<span class="loan-card-label">📥 মোট ঋণ নেওয়া</span>';
  html +=   '<span class="loan-card-value" style="color:var(--success)">' +
            formatCurrency(summary.totalReceived) + '</span>';
  html += '</div>';

  html += '<div class="loan-overview-card">';
  html +=   '<span class="loan-card-label">⚖️ নিট ব্যালেন্স</span>';

  const netBalance = summary.netBalance;
  const balColor = netBalance > 0 ? 'var(--danger)' : netBalance < 0 ? 'var(--success)' : 'var(--text-light)';
  const balText = netBalance > 0 ? '(অন্যরা আপনার কাছে ' + formatCurrency(netBalance) + ' পাওনা)' :
                  netBalance < 0 ? '(আপনি অন্যদের কাছে ' + formatCurrency(Math.abs(netBalance)) + ' পাওনা)' :
                  '(কোনো বকেয়া নেই)';

  html +=   '<span class="loan-card-value" style="color:' + balColor + '">' +
            formatCurrency(Math.abs(netBalance)) + '</span>';
  html +=   '<small style="color:var(--text-secondary);font-size:0.8rem;">' + balText + '</small>';
  html += '</div>';

  container.innerHTML = html;
}

/**
 * ব্যক্তিভিত্তিক ঋণ তালিকা রেন্ডার
 */
function renderLoanDetails(loanDetails) {
  const container = document.getElementById('loanDetails');

  if (!loanDetails || loanDetails.length === 0) {
    container.innerHTML = '<p class="empty-state">কোনো ঋণ লেনদেন নেই।</p>';
    return;
  }

  let html = '<h3>👥 ব্যক্তিভিত্তিক ঋণ হিসাব</h3>';

  loanDetails.forEach(function(loan) {
    const balance = loan.balance;
    let balanceClass, balanceText;

    if (balance > 0) {
      balanceClass = 'loan-balance-positive';
      balanceText = 'পাওনা: ' + formatCurrency(balance);
    } else if (balance < 0) {
      balanceClass = 'loan-balance-negative';
      balanceText = 'দেনা: ' + formatCurrency(Math.abs(balance));
    } else {
      balanceClass = 'loan-balance-zero';
      balanceText = 'হিসাব সমান ✓';
    }

    html += '<div class="loan-person-card">';
    html +=   '<span class="loan-person-name">👤 ' + loan.person + '</span>';
    html +=   '<div class="loan-person-stats">';
    html +=     '<span>📤 দেওয়া: ' + formatCurrency(loan.totalGiven) + '</span>';
    html +=     '<span>📥 নেওয়া: ' + formatCurrency(loan.totalReceived) + '</span>';
    html +=     '<span class="' + balanceClass + '">' + balanceText + '</span>';
    html +=   '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  অ্যাপ ইনিশিয়ালাইজেশন — পেজ লোড হওয়ার পর
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  // এন্ট্রি ফর্ম ইনিশিয়ালাইজ
  initEntryForm();

  // ড্যাশবোর্ড লোড (ডিফল্ট ট্যাব)
  loadDashboard();

  console.log('💰 আর্থিক ট্র্যাকার সফলভাবে লোড হয়েছে!');
});