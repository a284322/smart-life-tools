/* =========================================================
   생활계산기 – 월급 실수령액 · 대출이자 · 퇴직금
   기준: 2026년 4대보험 근로자 부담률, 소득세 기본세율 (2026-11 기준)
   - 국민연금 4.75%(근로자), 건강보험 3.595%(전체 7.19%의 절반),
     장기요양(건강보험료의 13.14% = 소득 대비 0.9448%), 고용보험 0.9%
     ※ 출처: 국민건강보험공단 2026년 보험료율 안내(7.19%), 보건복지부 2026년 장기요양보험료율 0.9448% 의결
   - 소득세법 제47조(근로소득공제), 제50조·제51조(인적공제·보험료공제),
     제55조(세율), 제59조(근로소득세액공제), 제59조의4(표준세액공제)
   - 근로자퇴직급여 보장법 제8조(퇴직금 = 1일 평균임금 × 30일 × 재직일수/365)
   모든 계산은 브라우저 안에서만 이루어지며 입력값은 전송·저장되지 않습니다.
   ========================================================= */
(function () {
  'use strict';

  var MAN = 10000;

  /* ---------------- 2026년 기준 상수 ---------------- */
  var RATES = {
    pension: 0.0475,
    health: 0.03595,
    longTermCareOfHealth: 0.1314, // 0.9448% ÷ 7.19%
    employment: 0.009,
    pensionMonthlyCap: 6590000,
    pensionMonthlyFloor: 410000
  };

  var TAX_BRACKETS = [
    { upTo: 14000000, rate: 0.06, progressive: 0 },
    { upTo: 50000000, rate: 0.15, progressive: 1260000 },
    { upTo: 88000000, rate: 0.24, progressive: 5760000 },
    { upTo: 150000000, rate: 0.35, progressive: 15440000 },
    { upTo: 300000000, rate: 0.38, progressive: 19940000 },
    { upTo: 500000000, rate: 0.40, progressive: 25940000 },
    { upTo: 1000000000, rate: 0.42, progressive: 35940000 },
    { upTo: Infinity, rate: 0.45, progressive: 65940000 }
  ];

  var BASIC_DEDUCTION = 1500000;
  var EARNED_DEDUCTION_CAP = 20000000;
  var STANDARD_CREDIT = 130000;

  /* ---------------- 숫자·날짜 도구 ---------------- */
  function nf(n) {
    return Math.round(n).toLocaleString('ko-KR');
  }
  function won(n) {
    return nf(n) + '원';
  }
  function man(n) {
    var v = n / MAN;
    if (Math.abs(v - Math.round(v)) < 0.05) return Math.round(v).toLocaleString('ko-KR') + '만원';
    return v.toFixed(1) + '만원';
  }
  function pct(rate) {
    var v = rate * 100;
    return (Math.abs(v - Math.round(v)) < 0.001 ? String(Math.round(v)) : v.toFixed(1)) + '%';
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function readNumber(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var digits = String(el.value).replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function formatManField(el) {
    var digits = String(el.value).replace(/[^0-9]/g, '').slice(0, 12);
    if (!digits) { el.value = ''; return; }
    el.value = parseInt(digits, 10).toLocaleString('ko-KR');
  }

  function parseDate(str) {
    if (!str) return null;
    var p = String(str).split('-');
    if (p.length !== 3) return null;
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }
  function addMonths(d, m) {
    return new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
  }
  function ymd(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function periodText(days) {
    var years = Math.floor(days / 365);
    var rest = days - years * 365;
    var months = Math.floor(rest / 30);
    var d = rest - months * 30;
    var parts = [];
    if (years) parts.push(years + '년');
    if (months) parts.push(months + '개월');
    if (!years && d) parts.push(d + '일');
    if (!parts.length) parts.push(days + '일');
    return parts.join(' ') + ' (' + nf(days) + '일)';
  }

  /* ---------------- 소득세 엔진 ----------------
     총급여(과세 대상 연간 급여) → 결정세액. 근로소득공제·인적공제·
     4대보험료 소득공제·근로소득세액공제·표준세액공제만 반영합니다. */
  function earnedIncomeDeduction(gross) {
    var d;
    if (gross <= 5000000) d = gross * 0.7;
    else if (gross <= 15000000) d = 3500000 + (gross - 5000000) * 0.4;
    else if (gross <= 45000000) d = 7500000 + (gross - 15000000) * 0.15;
    else if (gross <= 100000000) d = 12000000 + (gross - 45000000) * 0.05;
    else d = 14750000 + (gross - 100000000) * 0.02;
    return Math.min(EARNED_DEDUCTION_CAP, Math.floor(d));
  }

  function incomeTax(base) {
    if (base <= 0) return 0;
    for (var i = 0; i < TAX_BRACKETS.length; i++) {
      var b = TAX_BRACKETS[i];
      if (base <= b.upTo) return Math.max(0, Math.floor(base * b.rate - b.progressive));
    }
    return 0;
  }

  function earnedTaxCredit(calcTax, gross) {
    if (calcTax <= 0) return 0;
    var raw = calcTax <= 1300000
      ? calcTax * 0.55
      : 715000 + (calcTax - 1300000) * 0.30;
    var limit;
    if (gross <= 33000000) limit = 740000;
    else if (gross <= 70000000) limit = Math.max(660000, 740000 - (gross - 33000000) * 0.008);
    else if (gross <= 120000000) limit = Math.max(500000, 660000 - (gross - 70000000) * 0.5);
    else limit = Math.max(200000, 500000 - (gross - 120000000) * 0.5);
    return Math.floor(Math.min(raw, limit));
  }

  /* 연간 4대보험료(근로자 부담분). 기준: 과세 대상 연간 급여 */
  function insuranceAnnual(taxableAnnual) {
    if (taxableAnnual <= 0) return { pension: 0, health: 0, ltc: 0, employment: 0, total: 0 };
    var monthly = taxableAnnual / 12;
    var baseMonthly = Math.min(RATES.pensionMonthlyCap, Math.max(RATES.pensionMonthlyFloor, monthly));
    var pension = Math.floor(baseMonthly * RATES.pension * 12);
    var health = Math.floor(taxableAnnual * RATES.health);
    var ltc = Math.floor(health * RATES.longTermCareOfHealth);
    var employment = Math.floor(taxableAnnual * RATES.employment);
    return {
      pension: pension,
      health: health,
      ltc: ltc,
      employment: employment,
      total: pension + health + ltc + employment
    };
  }

  /* ---------------- 1. 월급 실수령액 ---------------- */
  function calcPay(annual, nonTaxableMonthly, family) {
    var nonTaxableAnnual = Math.max(0, nonTaxableMonthly) * 12;
    var taxableAnnual = Math.max(0, annual - nonTaxableAnnual);
    var monthlyGross = annual / 12;
    var monthlyTaxable = taxableAnnual / 12;

    var ins = insuranceAnnual(taxableAnnual);
    var earnedDed = earnedIncomeDeduction(taxableAnnual);
    var earnedIncome = Math.max(0, taxableAnnual - earnedDed);
    var basicDed = BASIC_DEDUCTION * Math.max(1, family);
    var base = Math.max(0, earnedIncome - basicDed - ins.total);

    var calcTax = incomeTax(base);
    var credit = calcTax > 0 ? Math.min(calcTax, earnedTaxCredit(calcTax, taxableAnnual) + STANDARD_CREDIT) : 0;
    var decisionTax = Math.max(0, calcTax - credit);
    var localTax = Math.floor(decisionTax * 0.1);

    var mPension = Math.round(ins.pension / 12);
    var mHealth = Math.round(ins.health / 12);
    var mLtc = Math.round(ins.ltc / 12);
    var mEmploy = Math.round(ins.employment / 12);
    var mIncomeTax = Math.round(decisionTax / 12);
    var mLocalTax = Math.round(localTax / 12);

    var deductTotal = mPension + mHealth + mLtc + mEmploy + mIncomeTax + mLocalTax;
    var net = monthlyGross - deductTotal;

    return {
      annual: annual,
      monthlyGross: monthlyGross,
      monthlyTaxable: monthlyTaxable,
      nonTaxableMonthly: nonTaxableMonthly,
      family: Math.max(1, family),
      ins: ins,
      earnedDed: earnedDed,
      earnedIncome: earnedIncome,
      basicDed: basicDed,
      base: base,
      calcTax: calcTax,
      credit: credit,
      decisionTax: decisionTax,
      localTax: localTax,
      monthly: {
        pension: mPension,
        health: mHealth,
        ltc: mLtc,
        employment: mEmploy,
        incomeTax: mIncomeTax,
        localTax: mLocalTax,
        total: deductTotal
      },
      net: net,
      netAnnual: net * 12,
      deductRate: monthlyTaxable > 0 ? deductTotal / monthlyTaxable : 0,
      totalTax: decisionTax + localTax
    };
  }

  /* ---------------- 2. 대출이자 ---------------- */
  var LOAN_METHODS = {
    'equal-payment': {
      name: '원리금균등분할상환',
      short: '원리금균등'
    },
    'equal-principal': {
      name: '원금균등분할상환',
      short: '원금균등'
    },
    'bullet': {
      name: '만기일시상환',
      short: '만기일시'
    }
  };

  function calcLoan(principal, annualRate, months, method) {
    if (principal <= 0 || months <= 0) return null;
    var i = Math.max(0, annualRate) / 100 / 12;
    var m = Math.max(1, Math.round(months));
    var first = 0, avgMonthly = 0, totalInterest = 0, totalPayment = 0;

    if (method === 'equal-payment') {
      var pay = i === 0 ? principal / m : principal * i / (1 - Math.pow(1 + i, -m));
      first = pay;
      avgMonthly = pay;
      totalPayment = pay * m;
      totalInterest = totalPayment - principal;
    } else if (method === 'equal-principal') {
      var part = principal / m;
      first = part + principal * i;
      var last = part + part * i;
      avgMonthly = (first + last) / 2;
      totalInterest = principal * i * (m + 1) / 2;
      totalPayment = principal + totalInterest;
    } else {
      first = principal * i;
      avgMonthly = principal * i;
      totalInterest = principal * i * m;
      totalPayment = principal + totalInterest;
    }

    // 연차별 상환 스케줄
    var schedule = [];
    var balance = principal;
    var principalPart = principal / m;
    var yearRow = null;
    for (var k = 1; k <= m; k++) {
      var interest = balance * i;
      var principalPay, monthlyPay;
      if (method === 'equal-payment') {
        monthlyPay = (i === 0 ? principal / m : principal * i / (1 - Math.pow(1 + i, -m)));
        if (k === m) monthlyPay = balance + interest;
        principalPay = monthlyPay - interest;
        if (principalPay > balance) principalPay = balance;
      } else if (method === 'equal-principal') {
        principalPay = k === m ? balance : principalPart;
        monthlyPay = principalPay + interest;
      } else {
        principalPay = k === m ? balance : 0;
        monthlyPay = interest + principalPay;
      }
      balance = Math.max(0, balance - principalPay);

      var yearIndex = Math.floor((k - 1) / 12) + 1;
      if (!yearRow || yearRow.year !== yearIndex) {
        yearRow = { year: yearIndex, payment: 0, interest: 0, principal: 0, balance: 0 };
        schedule.push(yearRow);
      }
      yearRow.payment += monthlyPay;
      yearRow.interest += interest;
      yearRow.principal += principalPay;
      yearRow.balance = balance;
    }

    return {
      principal: principal,
      annualRate: annualRate,
      months: m,
      method: method,
      methodName: LOAN_METHODS[method].name,
      first: first,
      avgMonthly: avgMonthly,
      totalInterest: totalInterest,
      totalPayment: totalPayment,
      schedule: schedule
    };
  }

  /* ---------------- 3. 퇴직금 ---------------- */
  function calcSeverance(opts) {
    var days = opts.days > 0 ? opts.days : 0;
    var days3m = opts.days3m > 0 ? opts.days3m : 0;
    var salary3m = Math.max(0, opts.salary3m);
    var bonusPart = Math.max(0, opts.bonusYear) * 3 / 12;
    var leavePart = Math.max(0, opts.leaveYear) * 3 / 12;
    var totalWage = salary3m + bonusPart + leavePart;
    var dailyAvg = days3m > 0 ? totalWage / days3m : 0;
    var severance = dailyAvg * 30 * days / 365;

    return {
      days: days,
      days3m: days3m,
      salary3m: salary3m,
      bonusYear: Math.max(0, opts.bonusYear),
      leaveYear: Math.max(0, opts.leaveYear),
      bonusPart: bonusPart,
      leavePart: leavePart,
      totalWage: totalWage,
      dailyAvg: dailyAvg,
      severance: severance,
      monthlyAvg: dailyAvg * 30,
      eligible: days >= 365
    };
  }

  /* =========================================================
     화면 렌더링
     ========================================================= */
  var currentTab = 'pay';

  /* ---------- 탭 ---------- */
  function activateTab(name, focus, updateHash) {
    if (name !== 'pay' && name !== 'loan' && name !== 'severance') name = 'pay';
    currentTab = name;

    $$('.tab-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.setAttribute('tabindex', on ? '0' : '-1');
      if (on && focus) btn.focus();
    });

    $$('.tab-panel').forEach(function (panel) {
      var on = panel.getAttribute('data-panel') === name;
      panel.hidden = !on;
    });

    var tabbar = $('.tabbar');
    if (tabbar) tabbar.setAttribute('data-active', name);

    if (updateHash && history.replaceState) {
      history.replaceState(null, '', '#' + name);
    }
  }

  function initTabs() {
    var tabbar = $('.tabbar');
    if (!tabbar) return;

    $$('.tab-btn', tabbar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        activateTab(btn.getAttribute('data-tab'), false, true);
      });
    });

    tabbar.addEventListener('keydown', function (e) {
      var order = ['pay', 'loan', 'severance'];
      var idx = order.indexOf(currentTab);
      if (e.key === 'ArrowRight') {
        activateTab(order[(idx + 1) % order.length], true, true);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        activateTab(order[(idx + order.length - 1) % order.length], true, true);
        e.preventDefault();
      } else if (e.key === 'Home') {
        activateTab(order[0], true, true);
        e.preventDefault();
      } else if (e.key === 'End') {
        activateTab(order[order.length - 1], true, true);
        e.preventDefault();
      }
    });
  }

  /* ---------- 공통 결과 도구 ---------- */
  function row(label, value, opts) {
    opts = opts || {};
    var cls = [];
    if (opts.minus) cls.push('minus');
    if (opts.sub) cls.push('sub');
    if (opts.total) cls.push('total');
    var small = opts.small ? '<small>' + opts.small + '</small>' : '';
    return '<tr' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' +
      '<td class="lbl">' + label + small + '</td>' +
      '<td class="val">' + value + '</td></tr>';
  }

  /* ---------- 1. 월급 실수령액 렌더 ---------- */
  function renderPay() {
    var annual = readNumber('paySalary') * MAN;
    var unit = $('#payUnit').value; // 'year' | 'month'
    if (unit === 'month') annual = annual * 12;
    var nonTaxable = readNumber('payNonTaxable') * MAN;
    var family = parseInt($('#payFamily').value, 10) || 1;

    $$('.chip[data-salary]').forEach(function (chip) {
      var v = parseInt(chip.getAttribute('data-salary'), 10) * MAN;
      chip.classList.toggle('is-active', unit === 'year' && annual === v);
    });

    var empty = $('#payEmpty');
    var body = $('#payBody');
    if (!annual) {
      empty.hidden = false;
      body.hidden = true;
      return;
    }

    var r = calcPay(annual, nonTaxable, family);
    empty.hidden = true;
    body.hidden = false;

    $('#payNet').textContent = won(r.net);
    $('#payNote').textContent = '세전 월급 ' + won(r.monthlyGross) +
      (r.nonTaxableMonthly > 0 ? ' 중 비과세 ' + won(r.nonTaxableMonthly) + ' 제외' : '') +
      ' · 부양가족 ' + r.family + '명 기준';

    $('#payDeduct').textContent = won(r.monthly.total);
    $('#payRate').textContent = (r.deductRate * 100).toFixed(1) + '%';
    $('#payAnnual').textContent = won(r.netAnnual);

    var rows = [];
    rows.push(row('월 급여 (세전)', won(r.monthlyGross)));
    if (r.nonTaxableMonthly > 0) {
      rows.push(row('비과세액 (식대 등)', won(r.nonTaxableMonthly), { small: '과세 대상에서 제외' }));
    }
    rows.push(row('과세 대상 월급', won(r.monthlyTaxable), { sub: true }));
    rows.push(row('국민연금', '−' + won(r.monthly.pension), { minus: true, small: '과세급여 × 4.75%' }));
    rows.push(row('건강보험', '−' + won(r.monthly.health), { minus: true, small: '과세급여 × 3.595%' }));
    rows.push(row('장기요양보험', '−' + won(r.monthly.ltc), { minus: true, small: '건강보험료 × 13.14%' }));
    rows.push(row('고용보험', '−' + won(r.monthly.employment), { minus: true, small: '과세급여 × 0.9%' }));
    rows.push(row('4대보험 합계', won(r.monthly.pension + r.monthly.health + r.monthly.ltc + r.monthly.employment), { sub: true }));
    rows.push(row('소득세', '−' + won(r.monthly.incomeTax), { minus: true, small: '연간 결정세액 ÷ 12' }));
    rows.push(row('지방소득세', '−' + won(r.monthly.localTax), { minus: true, small: '소득세의 10%' }));
    rows.push(row('공제 합계', '−' + won(r.monthly.total), { sub: true }));
    rows.push(row('월 예상 실수령액', won(r.net), { total: true }));

    $('#payReceipt').innerHTML = rows.join('');
    $('#payTaxNote').textContent = '연간 소득세·지방소득세 합계 ' + won(r.totalTax) +
      ' · 과세표준 ' + won(r.base) + ' · 산출세액 ' + won(r.calcTax);
  }

  /* ---------- 2. 대출이자 렌더 ---------- */
  function renderLoan() {
    var principal = readNumber('loanAmount') * MAN;
    var rate = parseFloat(String($('#loanRate').value).replace(/[^0-9.]/g, '')) || 0;
    var termValue = parseFloat(String($('#loanTerm').value).replace(/[^0-9.]/g, '')) || 0;
    var termUnit = $('#loanTermUnit').value; // 'month' | 'year'
    var months = termUnit === 'year' ? Math.round(termValue * 12) : Math.round(termValue);
    var method = $('#loanMethod').value;

    var empty = $('#loanEmpty');
    var body = $('#loanBody');
    if (!principal || !months) {
      empty.hidden = false;
      body.hidden = true;
      return;
    }

    var r = calcLoan(principal, rate, months, method);
    if (!r) {
      empty.hidden = false;
      body.hidden = true;
      return;
    }
    empty.hidden = true;
    body.hidden = false;

    var bullet = method === 'bullet';
    $('#loanLabel').textContent = bullet ? '월 이자 (만기 원금 일시상환)' : '월 평균 납입금';
    $('#loanMain').textContent = won(r.avgMonthly);
    $('#loanNote').textContent = r.methodName + ' · ' + nf(r.months) + '개월' +
      (bullet ? ' · 만기에 원금 ' + won(r.principal) + ' 상환' : '') +
      (rate === 0 ? ' · 무이자' : ' · 연 ' + rate + '%');

    $('#loanFirst').textContent = won(r.first);
    $('#loanInterest').textContent = won(r.totalInterest);
    $('#loanTotal').textContent = won(r.totalPayment);

    var rows = [];
    rows.push(row('대출 원금', won(r.principal)));
    rows.push(row('연 이자율', rate + '%', { small: '월 ' + (rate / 12).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '% 적용' }));
    rows.push(row('대출 기간', nf(r.months) + '개월 (' + (r.months / 12).toFixed(1) + '년)'));
    rows.push(row('상환 방식', r.methodName));
    rows.push(row('첫 달 상환금', won(r.first), { small: bullet ? '월 이자만 납부' : '원금 + 이자' }));
    rows.push(row('총 대출이자', won(r.totalInterest), { sub: true }));
    rows.push(row('총 상환금액', won(r.totalPayment), { total: true }));
    $('#loanReceipt').innerHTML = rows.join('');

    // 연차별 스케줄 (최대 10년까지 표시)
    var shown = r.schedule.slice(0, 10);
    var html = shown.map(function (y) {
      return '<tr><td>' + y.year + '년차</td><td>' + nf(y.payment) + '</td><td>' + nf(y.interest) +
        '</td><td>' + nf(y.balance) + '</td></tr>';
    }).join('');
    $('#loanSchedule').innerHTML = html;
    $('#loanScheduleWrap').hidden = false;
    $('#loanScheduleHint').textContent = r.schedule.length > shown.length
      ? '상환 기간이 ' + r.schedule.length + '년이라 앞 10년만 표시합니다.'
      : '단위: 원';
  }

  /* ---------- 3. 퇴직금 렌더 ---------- */
  function renderSeverance() {
    var hire = parseDate($('#sevHire').value);
    var quit = parseDate($('#sevQuit').value);
    var manual = $('#sevManual').checked;
    var salary3m = readNumber('sevSalary3m') * MAN;
    var bonus = readNumber('sevBonus') * MAN;
    var leave = readNumber('sevLeave') * MAN;

    var empty = $('#sevEmpty');
    var body = $('#sevBody');

    var days = 0;
    if (manual) {
      days = readNumber('sevDays');
    } else if (hire && quit) {
      days = daysBetween(hire, quit) + 1;
    }

    if (!days || days <= 0 || salary3m <= 0) {
      empty.hidden = false;
      body.hidden = true;
      return;
    }

    // 최근 3개월 역일수: 퇴사일 3개월 전 ~ 퇴사일
    var days3m = 91;
    if (!manual && quit) {
      days3m = daysBetween(addMonths(quit, -3), quit) + 1;
    }

    var r = calcSeverance({
      days: days,
      days3m: days3m,
      salary3m: salary3m,
      bonusYear: bonus,
      leaveYear: leave
    });

    empty.hidden = true;
    body.hidden = false;

    $('#sevMain').textContent = won(r.severance);
    $('#sevNote').textContent = '세전 금액 · 재직 ' + nf(days) + '일 · 1일 평균임금 ' + won(r.dailyAvg);
    $('#sevDaily').textContent = won(r.dailyAvg);
    $('#sevDays2').textContent = nf(days) + '일';
    $('#sevPeriod').textContent = periodText(days).replace(/\s*\([^)]*\)$/, '');

    var warnBox = $('#sevWarn');
    if (!r.eligible) {
      warnBox.hidden = false;
      warnBox.textContent = '재직 기간이 1년(365일) 미만이면 근로자퇴직급여 보장법상 법정 퇴직금 지급 대상이 아닙니다. 아래 금액은 참고용 계산값입니다.';
    } else {
      warnBox.hidden = true;
    }

    var rows = [];
    rows.push(row('재직일수', nf(r.days) + '일', { small: manual ? '직접 입력' : '입사일 ~ 퇴사일' }));
    if (!manual && hire && quit) {
      rows.push(row('입사일 · 퇴사일', ymd(hire) + ' ~ ' + ymd(quit)));
    }
    rows.push(row('최근 3개월 급여 합계', won(r.salary3m)));
    rows.push(row('연간 상여금 반영분', won(r.bonusPart), { small: '연간 ' + won(r.bonusYear) + ' × 3/12' }));
    rows.push(row('연차수당 반영분', won(r.leavePart), { small: '연간 ' + won(r.leaveYear) + ' × 3/12' }));
    rows.push(row('3개월 임금 총액', won(r.totalWage), { sub: true }));
    rows.push(row('3개월 역일수', nf(r.days3m) + '일', { small: '퇴사일 기준 직전 3개월' }));
    rows.push(row('1일 평균임금', won(r.dailyAvg), { sub: true }));
    rows.push(row('1개월 평균임금', won(r.monthlyAvg), { small: '1일 평균임금 × 30일' }));
    rows.push(row('퇴직금', won(r.severance), { total: true, small: '1일 평균임금 × 30 × 재직일수/365' }));
    $('#sevReceipt').innerHTML = rows.join('');
  }

  /* ---------- 초기화 ---------- */
  function init() {
    if (!$('.tabbar')) return;

    initTabs();

    // 만원 단위 입력 콤마
    $$('input[data-unit="man"]').forEach(function (el) {
      el.addEventListener('input', function () { formatManField(el); });
    });

    // 연봉 빠른 선택
    $$('.chip[data-salary]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var v = parseInt(chip.getAttribute('data-salary'), 10);
        var field = $('#paySalary');
        field.value = v.toLocaleString('ko-KR');
        $('#payUnit').value = 'year';
        renderPay();
      });
    });

    // 월급/연봉 전환 시 현재 값 유지 + 안내 갱신
    var unitSel = $('#payUnit');
    if (unitSel) {
      unitSel.addEventListener('change', function () {
        $$('.chip[data-salary]').forEach(function (c) { c.classList.remove('is-active'); });
        renderPay();
      });
    }

    // 계산 버튼 (입력 즉시 계산되지만 모바일에서 안내용으로 유지)
    $$('button[data-calc]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-calc');
        if (target === 'pay') renderPay();
        else if (target === 'loan') renderLoan();
        else if (target === 'severance') renderSeverance();
        var card = btn.closest('.calc-grid').querySelector('.result-card');
        if (card && window.matchMedia('(max-width: 1000px)').matches) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // 재직일수 스테퍼 · 부양가족 스테퍼
    $$('.step-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.getAttribute('data-step'));
        if (!target) return;
        var delta = parseInt(btn.getAttribute('data-delta'), 10);
        var min = parseInt(target.getAttribute('min'), 10);
        var max = parseInt(target.getAttribute('max'), 10);
        var next = (parseInt(target.value, 10) || 1) + delta;
        if (!isNaN(min)) next = Math.max(min, next);
        if (!isNaN(max)) next = Math.min(max, next);
        target.value = next;
        renderPay();
      });
    });

    // 키워드 칩에서 탭으로 바로 이동
    $$('[data-jump]').forEach(function (el) {
      el.addEventListener('click', function () {
        activateTab(el.getAttribute('data-jump'), false, true);
      });
    });

    // 실시간 계산
    ['paySalary', 'payNonTaxable', 'payFamily'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', renderPay);
    });
    ['loanAmount', 'loanRate', 'loanTerm'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', renderLoan);
    });
    ['loanTermUnit', 'loanMethod'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', renderLoan);
    });
    ['sevHire', 'sevQuit', 'sevSalary3m', 'sevBonus', 'sevLeave', 'sevDays'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', renderSeverance);
      if (el) el.addEventListener('change', renderSeverance);
    });
    var manualToggle = $('#sevManual');
    if (manualToggle) {
      manualToggle.addEventListener('change', function () {
        var on = manualToggle.checked;
        $('#sevDaysField').hidden = !on;
        $('#sevHire').disabled = on;
        $('#sevQuit').disabled = on;
        if (on && !readNumber('sevDays')) {
          var hire = parseDate($('#sevHire').value);
          var quit = parseDate($('#sevQuit').value);
          if (hire && quit && daysBetween(hire, quit) > 0) {
            $('#sevDays').value = daysBetween(hire, quit) + 1;
          }
        }
        renderSeverance();
      });
    }

    // 퇴사일 기본값: 오늘
    var quitField = $('#sevQuit');
    if (quitField && !quitField.value) {
      var today = new Date();
      quitField.value = ymd(today);
    }

    // 광고 자리 숨김 옵션 (?ads=off)
    if (/[?&]ads=off/.test(location.search)) {
      $$('.ad-slot').forEach(function (el) { el.hidden = true; });
    }

    // 첫 화면: 메뉴에서 넘어온 탭이 있으면 그 탭
    var hash = (location.hash || '').replace('#', '');
    activateTab(hash === 'loan' || hash === 'severance' ? hash : 'pay', false, false);

    renderPay();
    renderLoan();
    renderSeverance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
