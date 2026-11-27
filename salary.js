/* =========================================================
   연봉 실수령액 · 퇴직금 계산기 (salary.js)
   기준: 2026·2027년 4대보험 요율, 2026년 귀속 소득세법
   - 국민연금 2026년 4.75% → 2027년 5% (2025.4 국민연금법 개정)
   - 건강보험 3.595%(전체 7.19%의 절반), 장기요양 건강보험료의 13.14%
   - 고용보험(실업급여) 0.9%
   - 소득세법 제47조(근로소득공제)·제50조(기본공제)·제51조의3·제52조(보험료공제)
     ·제55조(세율)·제59조(근로소득세액공제)·제59조의4(표준세액공제)
   - 근로자퇴직급여 보장법 제8조, 소득세법 제48조(퇴직소득공제)
   모든 계산은 브라우저 안에서만 이루어지며 입력값은 전송·저장되지 않습니다.
   ========================================================= */
(function () {
  'use strict';

  var MAN = 10000;

  var YEAR_RATES = {
    2026: { pension: 0.0475, health: 0.03595, ltcOfHealth: 0.1314, employment: 0.009, label: '2026년' },
    2027: { pension: 0.05, health: 0.03595, ltcOfHealth: 0.1314, employment: 0.009, label: '2027년' }
  };
  var PENSION_MONTHLY_CAP = 6590000;   // 2026.7.1~2027.6.30 기준소득월액 상한
  var PENSION_MONTHLY_FLOOR = 410000;
  var BASIC_DEDUCTION = 1500000;
  var EARNED_DEDUCTION_CAP = 20000000;
  var STANDARD_CREDIT = 130000;

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

  /* ---------------- 도구 ---------------- */
  function nf(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function won(n) { return nf(n) + '원'; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function readDigits(el) {
    if (!el) return 0;
    var d = String(el.value).replace(/[^0-9]/g, '');
    return d ? parseInt(d, 10) : 0;
  }
  function formatMoney(el) {
    var d = String(el.value).replace(/[^0-9]/g, '').slice(0, 12);
    el.value = d ? parseInt(d, 10).toLocaleString('ko-KR') : '';
  }
  function parseDate(str) {
    if (!str) return null;
    var p = String(str).split('-');
    if (p.length !== 3) return null;
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function addMonths(d, m) { return new Date(d.getFullYear(), d.getMonth() + m, d.getDate()); }
  /* 말일 보정: 12월 31일에서 3개월 전은 9월 30일 */
  function addMonthsClamp(d, m) {
    var base = new Date(d.getFullYear(), d.getMonth() + m, 1);
    var last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(d.getDate(), last));
    return base;
  }

  /* ---------------- 소득세 엔진 ---------------- */
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
    var raw = calcTax <= 1300000 ? calcTax * 0.55 : 715000 + (calcTax - 1300000) * 0.30;
    var limit;
    if (gross <= 33000000) limit = 740000;
    else if (gross <= 70000000) limit = Math.max(660000, 740000 - (gross - 33000000) * 0.008);
    else if (gross <= 120000000) limit = Math.max(500000, 660000 - (gross - 70000000) * 0.5);
    else limit = Math.max(200000, 500000 - (gross - 120000000) * 0.5);
    return Math.floor(Math.min(raw, limit));
  }

  function insuranceAnnual(taxableAnnual, rates) {
    if (taxableAnnual <= 0) return { pension: 0, health: 0, ltc: 0, employment: 0, total: 0 };
    var monthly = taxableAnnual / 12;
    var baseMonthly = Math.min(PENSION_MONTHLY_CAP, Math.max(PENSION_MONTHLY_FLOOR, monthly));
    var pension = Math.floor(baseMonthly * rates.pension * 12);
    var health = Math.floor(taxableAnnual * rates.health);
    var ltc = Math.floor(health * rates.ltcOfHealth);
    var employment = Math.floor(taxableAnnual * rates.employment);
    return {
      pension: pension, health: health, ltc: ltc, employment: employment,
      total: pension + health + ltc + employment
    };
  }

  function calcPay(annual, nonTaxableMonthly, family, year) {
    var rates = YEAR_RATES[year] || YEAR_RATES[2026];
    var nonTaxableAnnual = Math.max(0, nonTaxableMonthly) * 12;
    var taxableAnnual = Math.max(0, annual - nonTaxableAnnual);
    var monthlyGross = annual / 12;
    var monthlyTaxable = taxableAnnual / 12;

    var ins = insuranceAnnual(taxableAnnual, rates);
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
      year: year, rates: rates,
      annual: annual, monthlyGross: monthlyGross, monthlyTaxable: monthlyTaxable,
      nonTaxableMonthly: nonTaxableMonthly, family: Math.max(1, family), ins: ins,
      earnedDed: earnedDed, earnedIncome: earnedIncome, basicDed: basicDed, base: base,
      calcTax: calcTax, credit: credit, decisionTax: decisionTax, localTax: localTax,
      monthly: {
        pension: mPension, health: mHealth, ltc: mLtc, employment: mEmploy,
        incomeTax: mIncomeTax, localTax: mLocalTax, total: deductTotal
      },
      net: net, netAnnual: net * 12,
      deductRate: monthlyTaxable > 0 ? deductTotal / monthlyTaxable : 0,
      totalTax: decisionTax + localTax
    };
  }

  /* ---------------- 퇴직금 ---------------- */
  function severanceDeduction(years) {
    if (years <= 5) return years * 1000000;
    if (years <= 10) return 5000000 + (years - 5) * 2000000;
    if (years <= 20) return 15000000 + (years - 10) * 2500000;
    return 40000000 + (years - 20) * 3000000;
  }
  function convertedDeduction(pay) {
    if (pay <= 8000000) return pay;
    if (pay <= 70000000) return 8000000 + (pay - 8000000) * 0.6;
    if (pay <= 100000000) return 45200000 + (pay - 70000000) * 0.55;
    if (pay <= 300000000) return 61700000 + (pay - 100000000) * 0.45;
    return 151700000 + (pay - 300000000) * 0.35;
  }

  function calcSeverance(start, end, salary3m, bonusYear, leaveYear) {
    var days = Math.max(0, daysBetween(start, end));
    var windowStart = addMonthsClamp(end, -3);
    windowStart.setDate(windowStart.getDate() + 1);
    var days3m = Math.max(1, daysBetween(windowStart, end) + 1);
    var bonusPart = Math.max(0, bonusYear) * 3 / 12;
    var leavePart = Math.max(0, leaveYear) * 3 / 12;
    var totalWage = Math.max(0, salary3m) + bonusPart + leavePart;
    var dailyAvg = totalWage / days3m;
    var severance = dailyAvg * 30 * days / 365;

    var years = Math.max(1, days / 365);
    var deduction = Math.min(severance, severanceDeduction(years));
    var converted = Math.max(0, (severance - deduction) * 12 / years);
    var convertedDed = Math.min(converted, convertedDeduction(converted));
    var taxBase = Math.max(0, converted - convertedDed);
    var convertedTax = incomeTax(taxBase);
    var incomeTaxAmount = Math.floor(convertedTax / 12 * years);
    var localTax = Math.floor(incomeTaxAmount * 0.1);

    return {
      days: days, days3m: days3m, salary3m: Math.max(0, salary3m),
      bonusYear: Math.max(0, bonusYear), leaveYear: Math.max(0, leaveYear),
      bonusPart: bonusPart, leavePart: leavePart, totalWage: totalWage,
      dailyAvg: dailyAvg, severance: severance, years: years,
      deduction: deduction, converted: converted, convertedDed: convertedDed,
      taxBase: taxBase, incomeTax: incomeTaxAmount, localTax: localTax,
      taxTotal: incomeTaxAmount + localTax,
      net: severance - incomeTaxAmount - localTax,
      eligible: days >= 365
    };
  }

  /* ---------------- 탭 ---------------- */
  var currentTab = 'pay';
  function activateTab(name, focus, updateHash) {
    if (name !== 'pay' && name !== 'severance') name = 'pay';
    currentTab = name;
    $$('.tab-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.setAttribute('tabindex', on ? '0' : '-1');
      if (on && focus) btn.focus();
    });
    $$('.tab-panel').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-panel') !== name;
    });
    if (updateHash && history.replaceState) history.replaceState(null, '', '#' + name);
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
      var order = ['pay', 'severance'];
      var idx = order.indexOf(currentTab);
      if (e.key === 'ArrowRight') { activateTab(order[(idx + 1) % 2], true, true); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { activateTab(order[(idx + 1) % 2], true, true); e.preventDefault(); }
    });
    if (location.hash === '#severance') activateTab('severance', false, false);
  }

  /* ---------------- 결과 표 ---------------- */
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
  function pctText(v) {
    var p = v * 100;
    return (Math.abs(p - Math.round(p)) < 0.001 ? String(Math.round(p)) : p.toFixed(2)) + '%';
  }

  /* ---------------- 상태 ---------------- */
  var state = { year: 2026, unit: 'year' };

  function renderPay() {
    var raw = readDigits($('#paySalary'));
    var annual = state.unit === 'month' ? raw * 12 : raw;
    var meal = readDigits($('#payMeal'));
    var family = parseInt($('#payFamily').value, 10) || 1;

    $$('.chip[data-pay]').forEach(function (chip) {
      var v = parseInt(chip.getAttribute('data-pay'), 10);
      chip.classList.toggle('is-active', state.unit === 'year' && annual === v);
    });

    if (!annual) {
      $('#sNet').textContent = '0원';
      $('#sDeduct').textContent = '0원';
      $('#sRate').textContent = '-';
      $('#sAnnual').textContent = '0원';
      $('#sNote').textContent = '연봉(또는 월급)을 입력하면 바로 계산됩니다.';
      $('#sReceipt').innerHTML = '';
      $('#sTaxNote').textContent = '';
      return;
    }

    var r = calcPay(annual, meal, family, state.year);

    $('#sNet').textContent = won(r.net);
    $('#sNote').textContent = r.rates.label + ' · 세전 월급 ' + won(r.monthlyGross) +
      (r.nonTaxableMonthly > 0 ? ' 중 비과세 ' + won(r.nonTaxableMonthly) + ' 제외' : '') +
      ' · 부양가족 ' + r.family + '명';
    $('#sDeduct').textContent = won(r.monthly.total);
    $('#sRate').textContent = (r.deductRate * 100).toFixed(1) + '%';
    $('#sAnnual').textContent = won(r.netAnnual);

    var rows = [];
    rows.push(row('월 급여 (세전)', won(r.monthlyGross)));
    if (r.nonTaxableMonthly > 0) {
      rows.push(row('비과세액 (식대 등)', won(r.nonTaxableMonthly), { small: '세금·보험료 계산에서 제외' }));
    }
    rows.push(row('과세 대상 월급', won(r.monthlyTaxable), { sub: true }));
    rows.push(row('국민연금', '−' + won(r.monthly.pension), { minus: true, small: '과세급여 × ' + pctText(r.rates.pension) }));
    rows.push(row('건강보험', '−' + won(r.monthly.health), { minus: true, small: '과세급여 × ' + pctText(r.rates.health) }));
    rows.push(row('장기요양보험', '−' + won(r.monthly.ltc), { minus: true, small: '건강보험료 × ' + pctText(r.rates.ltcOfHealth) }));
    rows.push(row('고용보험', '−' + won(r.monthly.employment), { minus: true, small: '과세급여 × ' + pctText(r.rates.employment) }));
    rows.push(row('4대보험 합계', won(r.monthly.pension + r.monthly.health + r.monthly.ltc + r.monthly.employment), { sub: true }));
    rows.push(row('소득세', '−' + won(r.monthly.incomeTax), { minus: true, small: '연간 결정세액 ÷ 12' }));
    rows.push(row('지방소득세', '−' + won(r.monthly.localTax), { minus: true, small: '소득세의 10%' }));
    rows.push(row('공제 합계', '−' + won(r.monthly.total), { sub: true }));
    rows.push(row('월 예상 실수령액', won(r.net), { total: true }));

    $('#sReceipt').innerHTML = rows.join('');
    $('#sTaxNote').textContent = '연간 소득세·지방소득세 ' + won(r.totalTax) + ' · 과세표준 ' + won(r.base) +
      ' · 산출세액 ' + won(r.calcTax) + ' · 근로소득세액공제 등 ' + won(r.credit);
  }

  function renderSeverance() {
    var start = parseDate($('#sevStart').value);
    var end = parseDate($('#sevEnd').value);
    var warn = $('#vWarn');

    if (!start || !end || end <= start) {
      $('#vTotal').textContent = '0원';
      $('#vNote').textContent = '입사일과 퇴사일을 넣으면 계산됩니다.';
      $('#vDaily').textContent = '0원';
      $('#vDays').textContent = '-';
      $('#vNet').textContent = '0원';
      $('#vReceipt').innerHTML = '';
      $('#vSplit').innerHTML = '';
      warn.hidden = false;
      warn.textContent = '퇴사일이 입사일보다 뒤여야 계산할 수 있습니다.';
      return;
    }

    var r = calcSeverance(start, end, readDigits($('#sevSalary3m')), readDigits($('#sevBonus')), readDigits($('#sevLeave')));

    $('#vTotal').textContent = won(r.severance);
    $('#vNote').textContent = '근속 ' + (r.days / 365).toFixed(2) + '년 (' + nf(r.days) + '일) · ' +
      (r.eligible ? '퇴직금 지급 대상' : '1년 미만이라 지급 대상 아님');
    $('#vDaily').textContent = won(r.dailyAvg);
    $('#vDays').textContent = nf(r.days) + '일';
    $('#vNet').textContent = won(r.net);

    var rows = [];
    rows.push(row('최근 3개월 급여', won(r.salary3m), { small: '기간 ' + nf(r.days3m) + '일' }));
    if (r.bonusPart > 0) rows.push(row('연간 상여금의 3/12', won(r.bonusPart)));
    if (r.leavePart > 0) rows.push(row('연차수당의 3/12', won(r.leavePart)));
    rows.push(row('임금총액', won(r.totalWage), { sub: true }));
    rows.push(row('1일 평균임금', won(r.dailyAvg), { small: '임금총액 ÷ ' + nf(r.days3m) + '일' }));
    rows.push(row('퇴직금 (세전)', won(r.severance), { total: true, small: '평균임금 × 30일 × ' + nf(r.days) + '/365' }));
    rows.push(row('근속연수공제', '−' + won(r.deduction), { minus: true, small: '근속 ' + r.years.toFixed(2) + '년 기준' }));
    rows.push(row('환산급여', won(r.converted), { sub: true }));
    rows.push(row('환산급여공제', '−' + won(r.convertedDed), { minus: true }));
    rows.push(row('퇴직소득 과세표준', won(r.taxBase), { sub: true }));
    rows.push(row('퇴직소득세', '−' + won(r.incomeTax), { minus: true }));
    rows.push(row('지방소득세', '−' + won(r.localTax), { minus: true, small: '퇴직소득세의 10%' }));
    rows.push(row('세후 퇴직금 (참고)', won(r.net), { total: true }));

    $('#vReceipt').innerHTML = rows.join('');

    var eff = r.severance > 0 ? r.taxTotal / r.severance : 0;
    $('#vSplit').innerHTML =
      '<div><span>퇴직소득세·지방소득세</span><strong>' + won(r.taxTotal) + '</strong></div>' +
      '<div><span>실효세율</span><strong>' + (eff * 100).toFixed(2) + '%</strong></div>' +
      '<div><span>1년당 퇴직금</span><strong>' + won(r.severance / Math.max(r.days / 365, 1 / 365)) + '</strong></div>';

    if (!r.eligible) {
      warn.hidden = false;
      warn.textContent = '계속 근로기간이 1년 미만이면 법정 퇴직금 지급 대상이 아닙니다. 계산값은 참고용입니다.';
    } else if (r.days3m > 95 || r.days3m < 88) {
      warn.hidden = false;
      warn.textContent = '3개월 기간 일수가 ' + r.days3m + '일로 계산되었습니다. 퇴사일 기준 3개월 달력일수라 89~92일이 일반적입니다.';
    } else {
      warn.hidden = true;
    }
  }

  /* ---------------- 이벤트 ---------------- */
  function bind() {
    $$('input[data-unit="num"]').forEach(function (el) {
      el.addEventListener('input', function () {
        formatMoney(el);
        if (el.id === 'paySalary' || el.id === 'payMeal' || el.id === 'payFamily') renderPay();
        else renderSeverance();
      });
    });

    $$('.chip[data-pay]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var v = parseInt(chip.getAttribute('data-pay'), 10);
        state.unit = 'year';
        $$('#payUnitSeg .seg-btn').forEach(function (b) {
          var on = b.getAttribute('data-unit') === 'year';
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $('#paySalary').value = v.toLocaleString('ko-KR');
        renderPay();
      });
    });

    $$('.chip[data-meal]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var v = parseInt(chip.getAttribute('data-meal'), 10);
        $$('.chip[data-meal]').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        $('#payMeal').value = v ? v.toLocaleString('ko-KR') : '';
        renderPay();
      });
    });

    $$('#payYearSeg .seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.year = parseInt(btn.getAttribute('data-year'), 10);
        $$('#payYearSeg .seg-btn').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderPay();
      });
    });

    $$('#payUnitSeg .seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var unit = btn.getAttribute('data-unit');
        if (unit === state.unit) return;
        var cur = readDigits($('#paySalary'));
        state.unit = unit;
        $$('#payUnitSeg .seg-btn').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $('#paySalaryLabel').innerHTML = '세전 ' + (unit === 'year' ? '연봉' : '월급') + ' <span class="unit">원</span>';
        $('#paySalary').placeholder = unit === 'year' ? '50,000,000' : '4,000,000';
        // 단위를 바꿔도 같은 금액을 유지한다
        $('#paySalary').value = cur ? cur.toLocaleString('ko-KR') : '';
        renderPay();
      });
    });

    ['#payFamily', '#sevStart', '#sevEnd'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.addEventListener('change', function () {
        if (sel === '#payFamily') renderPay();
        else renderSeverance();
      });
    });

    ['#payForm', '#sevForm'].forEach(function (sel) {
      var form = $(sel);
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sel === '#payForm') renderPay();
        else renderSeverance();
      });
    });
  }

  function init() {
    $$('input[data-unit="num"]').forEach(formatMoney);
    initTabs();
    bind();
    renderPay();
    renderSeverance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 검증용 노출(브라우저 콘솔에서 확인)
  window.__salary = { calcPay: calcPay, calcSeverance: calcSeverance };
})();
