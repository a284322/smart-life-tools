/* =========================================================
   국민연금 예상수령액 · 4대보험 계산기 (pension.js)
   기준: 2026년 A값 3,193,511원, 국민연금법 제51조·제63조·제64조
   - 기본연금액(월) = 1.29 × (A + B) × 지급률 ÷ 12
   - 지급률: 10년 50% → 20년 100%(1년당 5%p), 20년 초과 1년당 5% 가산
   - 조기 1년당 6% 감액(최대 30%), 연기 1년당 7.2% 가산(최대 36%)
   - 부양가족연금: 배우자 월 25,550원, 자녀·부모 1명당 17,030원
   - 4대보험: 2026년 국민연금 9.5%(2027년 10%), 건강 7.19%,
     장기요양 소득의 0.9448%, 고용보험 실업급여 1.8%, 산재 사업주 전액
   모든 계산은 브라우저 안에서만 이루어지며 입력값은 전송·저장되지 않습니다.
   ========================================================= */
(function () {
  'use strict';

  var A_VALUE = 3193511;
  var MONTHLY_CAP = 6590000;
  var MONTHLY_FLOOR = 410000;

  var RATES = {
    2026: { pension: 0.0475, health: 0.03595, ltc: 0.004724, employment: 0.009, label: '2026년' },
    2027: { pension: 0.05, health: 0.03595, ltc: 0.004724, employment: 0.009, label: '2027년' }
  };

  function nf(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function won(n) { return nf(n) + '원'; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function readDigits(el) {
    if (!el) return 0;
    var d = String(el.value).replace(/[^0-9]/g, '');
    return d ? parseInt(d, 10) : 0;
  }
  function readDecimal(el) {
    if (!el) return 0;
    var v = parseFloat(String(el.value).replace(/[^0-9.]/g, ''));
    return isNaN(v) ? 0 : v;
  }
  function formatMoney(el) {
    var d = String(el.value).replace(/[^0-9]/g, '').slice(0, 12);
    el.value = d ? parseInt(d, 10).toLocaleString('ko-KR') : '';
  }

  /* ---------------- 국민연금 ---------------- */
  function paymentRate(years) {
    if (years <= 20) return 0.5 + 0.05 * (years - 10);
    return 1 + 0.05 * (years - 20);
  }

  function calcPension(opts) {
    var income = Math.min(MONTHLY_CAP, Math.max(MONTHLY_FLOOR, opts.income || 0));
    var years = Math.min(45, Math.max(1, opts.years || 0));
    var rate = paymentRate(years);
    var basic = 1.29 * (A_VALUE + income) * Math.max(0, rate) / 12;

    var adjustRate = 0;
    if (opts.mode === 'early') adjustRate = -0.06 * Math.min(5, Math.max(0, opts.shift || 0));
    else if (opts.mode === 'late') adjustRate = 0.072 * Math.min(5, Math.max(0, opts.shift || 0));

    var adjusted = basic * (1 + adjustRate);
    var family = (opts.spouse ? 25550 : 0) + Math.max(0, opts.dependents || 0) * 17030;
    var total = Math.max(0, adjusted) + family;

    return {
      income: income, years: years, rate: rate, basic: basic,
      mode: opts.mode, shift: opts.shift || 0, adjustRate: adjustRate,
      adjusted: adjusted, family: family, total: total,
      yearly: total * 12,
      clamped: opts.income > MONTHLY_CAP || opts.income < MONTHLY_FLOOR
    };
  }

  /* ---------------- 4대보험 ---------------- */
  function calcInsurance(salary, year, sizeRate, injuryRate) {
    var r = RATES[year] || RATES[2026];
    var pensionBase = Math.min(MONTHLY_CAP, Math.max(MONTHLY_FLOOR, salary));
    var pensionEa = Math.floor(pensionBase * r.pension);
    var healthEa = Math.floor(salary * r.health);
    var ltcEa = Math.floor(salary * r.ltc);
    var employmentEa = Math.floor(salary * r.employment);
    var stable = Math.floor(salary * sizeRate);
    var injury = Math.floor(salary * (injuryRate / 100));

    var worker = pensionEa + healthEa + ltcEa + employmentEa;
    var employer = pensionEa + healthEa + ltcEa + employmentEa + stable + injury;
    return {
      year: year, rates: r, salary: salary,
      items: { pension: pensionEa, health: healthEa, ltc: ltcEa, employment: employmentEa, stable: stable, injury: injury },
      worker: worker, employer: employer, total: worker + employer,
      cost: salary + employer,
      workerRate: salary > 0 ? worker / salary : 0,
      employerRate: salary > 0 ? employer / salary : 0
    };
  }

  /* ---------------- 탭 ---------------- */
  var currentTab = 'nps';
  function activateTab(name, focus, updateHash) {
    if (name !== 'nps' && name !== 'ins') name = 'nps';
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
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        activateTab(currentTab === 'nps' ? 'ins' : 'nps', true, true);
        e.preventDefault();
      }
    });
    if (location.hash === '#ins') activateTab('ins', false, false);
  }

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

  /* ---------------- 상태 ---------------- */
  var npsState = { mode: 'normal' };
  var insState = { year: 2026 };

  function renderNps() {
    var income = readDigits($('#npsIncome'));
    var years = parseInt($('#npsYears').value, 10) || 0;
    var shift = parseInt($('#npsShift').value, 10) || 0;
    var spouse = $('#npsSpouse').checked;
    var dependents = parseInt($('#npsDependents').value, 10) || 0;

    $$('.chip[data-income]').forEach(function (c) {
      c.classList.toggle('is-active', parseInt(c.getAttribute('data-income'), 10) === income);
    });
    $$('.chip[data-years]').forEach(function (c) {
      c.classList.toggle('is-active', parseInt(c.getAttribute('data-years'), 10) === years);
    });

    if (!income) {
      $('#npsMonthly').textContent = '0원';
      $('#npsYearly').textContent = '0원';
      $('#npsRate').textContent = '-';
      $('#npsAdjust').textContent = '-';
      $('#npsNote').textContent = '월 소득을 입력하면 바로 계산됩니다.';
      $('#npsReceipt').innerHTML = '';
      $('#npsSplit').innerHTML = '';
      $('#npsWarn').hidden = true;
      return;
    }

    var r = calcPension({
      income: income, years: years, mode: npsState.mode, shift: shift,
      spouse: spouse, dependents: dependents
    });

    $('#npsMonthly').textContent = won(r.total);
    $('#npsNote').textContent = r.years + '년 가입 · ' +
      (r.mode === 'early' ? (r.shift + '년 조기수령') : r.mode === 'late' ? (r.shift + '년 연기수령') : '정상수령') +
      (r.family > 0 ? ' · 부양가족연금 포함' : '');
    $('#npsYearly').textContent = won(r.yearly);
    $('#npsRate').textContent = (r.rate * 100).toFixed(0) + '%';
    $('#npsAdjust').textContent = r.adjustRate === 0 ? '없음' :
      (r.adjustRate > 0 ? '+' : '−') + Math.abs(r.adjustRate * 100).toFixed(1) + '%';

    var rows = [];
    rows.push(row('A값 (2026년)', won(A_VALUE), { small: '전체 가입자 3년 평균소득월액' }));
    rows.push(row('B값 (내 평균소득)', won(r.income), { small: r.clamped ? '기준소득월액 상·하한 적용' : '가입기간 평균' }));
    rows.push(row('A + B', won(A_VALUE + r.income), { sub: true }));
    rows.push(row('가입기간', r.years + '년', { small: '지급률 ' + (r.rate * 100).toFixed(0) + '%' }));
    rows.push(row('기본연금액 (월)', won(r.basic), { small: '1.29 × (A+B) × ' + (r.rate * 100).toFixed(0) + '% ÷ 12' }));
    if (r.adjustRate !== 0) {
      rows.push(row(r.adjustRate > 0 ? '연기 가산' : '조기 감액',
        (r.adjustRate > 0 ? '+' : '−') + won(Math.abs(r.adjusted - r.basic)),
        { minus: r.adjustRate < 0, small: (r.adjustRate * 100).toFixed(1) + '%' }));
    }
    if (r.family > 0) {
      rows.push(row('부양가족연금', '+' + won(r.family), { small: (spouse ? '배우자 ' : '') + (dependents ? '자녀·부모 ' + dependents + '명' : '') }));
    }
    rows.push(row('예상 월 연금액', won(r.total), { total: true }));

    $('#npsReceipt').innerHTML = rows.join('');
    $('#npsSplit').innerHTML =
      '<div><span>연 수령액</span><strong>' + won(r.yearly) + '</strong></div>' +
      '<div><span>20년 수령 가정 총액</span><strong>' + won(r.yearly * 20) + '</strong></div>' +
      '<div><span>가입기간 지급률</span><strong>' + (r.rate * 100).toFixed(0) + '%</strong></div>';

    var warn = $('#npsWarn');
    if (r.years < 10) {
      warn.hidden = false;
      warn.textContent = '가입기간이 10년 미만이면 노령연금이 아니라 반환일시금으로 받습니다. 계산값은 참고용입니다.';
    } else if (r.clamped) {
      warn.hidden = false;
      warn.textContent = '기준소득월액은 2026년 7월~2027년 6월 기준 41만원에서 659만원 사이로 잡힙니다. 입력한 소득 대신 ' + won(r.income) + '으로 계산했습니다.';
    } else {
      warn.hidden = true;
    }
  }

  function renderIns() {
    var salary = readDigits($('#insSalary'));
    var sizeRate = parseFloat($('#insSize').value) || 0;
    var injuryRate = readDecimal($('#insInjury'));

    $$('.chip[data-ins]').forEach(function (c) {
      c.classList.toggle('is-active', parseInt(c.getAttribute('data-ins'), 10) === salary);
    });

    if (!salary) {
      $('#insWorker').textContent = '0원';
      $('#insEmployer').textContent = '0원';
      $('#insTotal').textContent = '0원';
      $('#insCost').textContent = '0원';
      $('#insNote').textContent = '월 급여를 입력하면 바로 계산됩니다.';
      $('#insReceipt').innerHTML = '';
      $('#insTaxNote').textContent = '';
      return;
    }

    var r = calcInsurance(salary, insState.year, sizeRate, injuryRate);
    var it = r.items;

    $('#insWorker').textContent = won(r.worker);
    $('#insNote').textContent = r.rates.label + ' 요율 · 월 급여 ' + won(r.salary) + ' 기준';
    $('#insEmployer').textContent = won(r.employer);
    $('#insTotal').textContent = won(r.total);
    $('#insCost').textContent = won(r.cost);

    var rows = [];
    rows.push(row('국민연금 (' + (r.rates.pension * 100).toFixed(2) + '% × 2)',
      won(it.pension * 2), { small: '근로자 ' + won(it.pension) + ' · 사업주 ' + won(it.pension) }));
    rows.push(row('건강보험 (7.19%)', won(it.health * 2), { small: '근로자 ' + won(it.health) + ' · 사업주 ' + won(it.health) }));
    rows.push(row('장기요양 (0.9448%)', won(it.ltc * 2), { small: '근로자 ' + won(it.ltc) + ' · 사업주 ' + won(it.ltc) }));
    rows.push(row('고용보험 실업급여 (1.8%)', won(it.employment * 2), { small: '근로자 ' + won(it.employment) + ' · 사업주 ' + won(it.employment) }));
    rows.push(row('고용안정·직업능력개발 (' + (sizeRate * 100).toFixed(2) + '%)', won(it.stable), { small: '사업주만 부담' }));
    rows.push(row('산재보험 (' + injuryRate.toFixed(2) + '%)', won(it.injury), { small: '사업주만 부담' }));
    rows.push(row('근로자 부담 합계', won(r.worker), { sub: true, small: (r.workerRate * 100).toFixed(2) + '%' }));
    rows.push(row('사업주 부담 합계', won(r.employer), { sub: true, small: (r.employerRate * 100).toFixed(2) + '%' }));
    rows.push(row('보험료 총액', won(r.total), { total: true }));

    $('#insReceipt').innerHTML = rows.join('');
    $('#insTaxNote').textContent = '근로자 부담률 ' + (r.workerRate * 100).toFixed(2) + '% · 사업주 부담률 ' +
      (r.employerRate * 100).toFixed(2) + '% · 사업주가 부담하는 총 인건비는 월 ' + won(r.cost) + '입니다.';
  }

  /* ---------------- 이벤트 ---------------- */
  function bind() {
    $$('input[data-unit="num"]').forEach(function (el) {
      el.addEventListener('input', function () {
        formatMoney(el);
        if (el.id === 'npsIncome') renderNps();
        else renderIns();
      });
    });

    $$('.chip[data-income]').forEach(function (c) {
      c.addEventListener('click', function () {
        $('#npsIncome').value = parseInt(c.getAttribute('data-income'), 10).toLocaleString('ko-KR');
        renderNps();
      });
    });
    $$('.chip[data-years]').forEach(function (c) {
      c.addEventListener('click', function () {
        $('#npsYears').value = c.getAttribute('data-years');
        renderNps();
      });
    });
    $$('.chip[data-ins]').forEach(function (c) {
      c.addEventListener('click', function () {
        $('#insSalary').value = parseInt(c.getAttribute('data-ins'), 10).toLocaleString('ko-KR');
        renderIns();
      });
    });

    $$('#npsModeSeg .seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        npsState.mode = btn.getAttribute('data-mode');
        $$('#npsModeSeg .seg-btn').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $('#shiftField').hidden = npsState.mode === 'normal';
        renderNps();
      });
    });

    $$('#insYearSeg .seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        insState.year = parseInt(btn.getAttribute('data-year'), 10);
        $$('#insYearSeg .seg-btn').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderIns();
      });
    });

    ['#npsYears', '#npsShift', '#npsSpouse', '#npsDependents'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.addEventListener('change', renderNps);
    });
    $('#npsYears').addEventListener('input', renderNps);

    ['#insSize', '#insInjury'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.addEventListener('change', renderIns);
    });
    $('#insInjury').addEventListener('input', renderIns);

    ['#npsForm', '#insForm'].forEach(function (sel) {
      var form = $(sel);
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sel === '#npsForm') renderNps();
        else renderIns();
      });
    });
  }

  function init() {
    $$('input[data-unit="num"]').forEach(formatMoney);
    initTabs();
    bind();
    renderNps();
    renderIns();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__pension = { calcPension: calcPension, calcInsurance: calcInsurance, paymentRate: paymentRate };
})();
