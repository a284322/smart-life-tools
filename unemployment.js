/* =========================================================
   실업급여(구직급여) · 근로/자녀장려금 계산기 – unemployment.js
   · 구직급여: 고용보험법 제45조(기초일액)·제46조(일액)·제50조 별표1(소정급여일수)
              시행령 제68조(기초일액 상한 113,500원)
              2026년 이직: 상한 68,100원 / 하한 66,048원
              2027년 이직: 하한 68,480원(최저임금 10,700원×8시간×80%),
                           상한은 하한 연동 개정안(입법예고) 확정 전 → 하한으로 계산
   · 장려금: 조세특례제한법 제100조의5 산정식, 시행령 별표 11·11의2
   외부 라이브러리 없음. 모든 계산은 브라우저 안에서만.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function nf(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function won(n) { return nf(n) + '원'; }
  function man(n) { return Math.round(n / 10000).toLocaleString('ko-KR') + '만원'; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function ceil1000(n) { return Math.ceil(n / 1000) * 1000; }

  /* ---------- 숫자 입력(콤마) ---------- */
  function digits(v) { return (v || '').replace(/[^0-9]/g, ''); }
  function comma(n) { return n.toLocaleString('ko-KR'); }

  /* =======================================================
     탭
     ======================================================= */
  var tabBtns = document.querySelectorAll('[data-tab]');
  for (var t = 0; t < tabBtns.length; t++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-tab');
        for (var i = 0; i < tabBtns.length; i++) {
          var on = tabBtns[i].getAttribute('data-tab') === key;
          tabBtns[i].classList.toggle('is-active', on);
          tabBtns[i].setAttribute('aria-selected', on ? 'true' : 'false');
          var panel = $(tabBtns[i].getAttribute('data-panel'));
          if (panel) panel.hidden = !on;
        }
      });
    })(tabBtns[t]);
  }

  /* =======================================================
     1) 구직급여
     ======================================================= */
  var LIMIT_BASE = 113500;      // 시행령 제68조: 기초일액 상한
  var YEAR = {
    2026: { cap: 68100, floor: 66048, minWage: 10320, capPending: false },
    2027: { cap: 68100, floor: 68480, minWage: 10700, capPending: true }
  };
  var DAYS = {
    under50: { lt1: 120, '1to3': 150, '3to5': 180, '5to10': 210, ge10: 240 },
    over50:  { lt1: 120, '1to3': 180, '3to5': 210, '5to10': 240, ge10: 270 }
  };
  var PERIOD_NAME = {
    lt1: '1년 미만', '1to3': '1년 이상 3년 미만', '3to5': '3년 이상 5년 미만',
    '5to10': '5년 이상 10년 미만', ge10: '10년 이상'
  };

  var u = { year: 2026, age: 'under50', period: '1to3', salary: 3000000 };

  function setYear(y) {
    u.year = y;
    var btns = document.querySelectorAll('[data-year]');
    for (var i = 0; i < btns.length; i++) {
      var on = parseInt(btns[i].getAttribute('data-year'), 10) === y;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    renderUnemp();
  }

  function setAge(a) {
    u.age = a;
    var btns = document.querySelectorAll('[data-age]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-age') === a;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    renderUnemp();
  }

  function setPeriod(p) {
    u.period = p;
    var chips = document.querySelectorAll('[data-period]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-active', chips[i].getAttribute('data-period') === p);
    }
    renderUnemp();
  }

  function renderUnemp() {
    var cfg = YEAR[u.year];
    var salary = u.salary;
    var baseRaw = (salary * 3) / 91.25;           // 이직 전 3개월 임금총액 ÷ 3개월 일수
    var base = Math.min(baseRaw, LIMIT_BASE);
    var raw60 = baseRaw * 0.6;
    var capped = Math.min(base, LIMIT_BASE) * 0.6;
    var daily = Math.max(capped, cfg.floor);
    var days = DAYS[u.age][u.period];
    var total = daily * days;
    var monthly = daily * 30;

    $('uTotal').textContent = won(total);
    $('uDaily').textContent = won(daily);
    $('uDays').textContent = days + '일';
    $('uMonthly').textContent = won(monthly);

    var note = daily >= cfg.floor && raw60 <= cfg.floor
      ? (u.year === 2027 ? '평균임금이 낮아 2027년 하한액이 적용됩니다.' : '평균임금이 낮아 2026년 하한액이 적용됩니다.')
      : (baseRaw > LIMIT_BASE ? '기초일액 상한에 걸려 상한액으로 계산했습니다.' : '이직 전 평균임금의 60%로 계산했습니다.');
    $('uNote').textContent = note;

    // 계산 과정
    var rows = [
      ['퇴직 전 3개월 임금총액', won(salary * 3)],
      ['기초일액 (3개월 임금 ÷ 91.25일)', won(baseRaw)],
      ['60% 금액', won(raw60)],
      [u.year + '년 1일 상한액', won(cfg.cap) + (cfg.capPending ? ' (개정 전)' : '')],
      [u.year + '년 1일 하한액', won(cfg.floor) + ' (최저임금 ' + nf(cfg.minWage) + '원×8시간×80%)'],
      ['적용된 1일 구직급여', won(daily)],
      ['소정급여일수', days + '일']
    ];
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td class="lbl">' + rows[i][0] + '</td><td class="val">' + rows[i][1] + '</td></tr>';
    }
    $('uReceipt').innerHTML = html;

    // 상·하한 비교
    var parts = [
      ['평균임금의 60%', won(raw60)],
      ['실제 받는 1일 금액', won(daily)],
      ['차이', (daily - raw60 >= 0 ? '+' : '−') + won(Math.abs(daily - raw60))]
    ];
    var sp = '';
    for (var j = 0; j < parts.length; j++) {
      sp += '<div><span>' + parts[j][0] + '</span><strong>' + parts[j][1] + '</strong></div>';
    }
    $('uSplit').innerHTML = sp;

    // 경고
    var warn = $('uWarn');
    if (u.year === 2027) {
      warn.hidden = false;
      warn.innerHTML = '<strong>2027년 이직은 금액이 달라질 수 있어요.</strong> 2027년 하한액은 최저임금 10,700원 기준 1일 68,480원으로 확정됐지만, 상한액을 하한액의 103%로 묶는 시행령 개정안(2027년 1월 1일 시행 예정)은 아직 공포 전입니다. 임금이 높아 60% 금액이 68,480원을 넘는 경우, 개정안이 시행되면 실제 금액은 이 계산보다 커질 수 있습니다.';
    } else {
      warn.hidden = true;
      warn.innerHTML = '';
    }

    // 대기기간 안내
    $('uAfter').innerHTML = '첫 7일은 <strong>대기기간</strong>이라 지급되지 않습니다. 실제 입금은 실업인정(1~4주 단위)마다 나뉘어 들어오고, 소정급여일수가 남아 있어도 이직일 다음 날부터 <strong>12개월</strong>이 지나면 받을 수 없습니다.';
  }

  $('salary').addEventListener('input', function () {
    var n = parseInt(digits($('salary').value), 10) || 0;
    u.salary = Math.min(n, 100000000);
    var chips = document.querySelectorAll('[data-salary]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-active', parseInt(chips[i].getAttribute('data-salary'), 10) === u.salary);
    }
    renderUnemp();
  });

  var ageBtns = document.querySelectorAll('[data-age]');
  for (var a = 0; a < ageBtns.length; a++) {
    (function (btn) { btn.addEventListener('click', function () { setAge(btn.getAttribute('data-age')); }); })(ageBtns[a]);
  }
  var perChips = document.querySelectorAll('[data-period]');
  for (var p = 0; p < perChips.length; p++) {
    (function (btn) { btn.addEventListener('click', function () { setPeriod(btn.getAttribute('data-period')); }); })(perChips[p]);
  }
  var yearBtns = document.querySelectorAll('[data-year]');
  for (var y = 0; y < yearBtns.length; y++) {
    (function (btn) { btn.addEventListener('click', function () { setYear(parseInt(btn.getAttribute('data-year'), 10)); }); })(yearBtns[y]);
  }
  var salChips = document.querySelectorAll('[data-salary]');
  for (var s = 0; s < salChips.length; s++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        u.salary = parseInt(btn.getAttribute('data-salary'), 10);
        $('salary').value = comma(u.salary);
        var chips = document.querySelectorAll('[data-salary]');
        for (var i = 0; i < chips.length; i++) chips[i].classList.remove('is-active');
        btn.classList.add('is-active');
        renderUnemp();
      });
    })(salChips[s]);
  }

  $('unempForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    renderUnemp();
    scrollToResult('uResultCard');
  });

  function scrollToResult(id) {
    if (window.innerWidth > 1000) return;
    var el = $(id);
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - 72;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  /* =======================================================
     2) 근로·자녀장려금
     ======================================================= */
  var EITC = {
    2026: {
      single: { limit: 22000000, max: 1650000, riseTo: 4000000, flatTo: 9000000 },
      one:    { limit: 32000000, max: 2850000, riseTo: 7000000, flatTo: 14000000 },
      dual:   { limit: 44000000, max: 3300000, riseTo: 8000000, flatTo: 17000000 }
    },
    2027: {
      single: { limit: 26000000, max: 1800000, riseTo: 4000000, flatTo: 9000000 },
      one:    { limit: 37000000, max: 3100000, riseTo: 7000000, flatTo: 14000000 },
      dual:   { limit: 52000000, max: 3600000, riseTo: 8000000, flatTo: 18000000 }
    }
  };
  var CHILD = {
    one:  { flatTo: 21000000 },
    dual: { flatTo: 25000000 }
  };
  var TYPE_NAME = { single: '단독가구', one: '홑벌이가구', dual: '맞벌이가구' };

  var e = { year: 2026, type: 'one', income: 18000000, asset: 'under', kids: 0 };

  function eitcAmount(x, cfg) {
    if (x < 40000 || x >= cfg.limit) return 0;
    var amt;
    if (x < cfg.riseTo) amt = x * cfg.max / cfg.riseTo;
    else if (x < cfg.flatTo) amt = cfg.max;
    else amt = cfg.max - (x - cfg.flatTo) * cfg.max / (cfg.limit - cfg.flatTo);
    if (amt <= 0) return 0;
    amt = ceil1000(amt);
    return amt < 30000 ? 30000 : amt;
  }

  function childAmount(x, type) {
    if (type === 'single') return 0;
    if (x >= 70000000) return 0;
    var flatTo = CHILD[type].flatTo;
    if (x < flatTo) return 1000000;
    var v = 1000000 - (x - flatTo) * 500000 / (70000000 - flatTo);
    if (v < 500000) v = 500000;
    return ceil1000(v);
  }

  function setType(type) {
    e.type = type;
    var btns = document.querySelectorAll('[data-type]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-type') === type;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (type === 'single') {
      e.kids = 0;
      $('kidsInput').value = '0';
    }
    renderEitc();
  }

  function setEYear(y) {
    e.year = y;
    var btns = document.querySelectorAll('[data-eyear]');
    for (var i = 0; i < btns.length; i++) {
      var on = parseInt(btns[i].getAttribute('data-eyear'), 10) === y;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    $('eYearNote').textContent = y === 2026
      ? '2026년 신청 기준(2025년 소득). 국세청 현행 기준입니다.'
      : '2027년 소득분부터 적용될 개정안(국회 심의 예정)으로 계산합니다. 소득요건과 최대지급액이 넓어집니다.';
    renderEitc();
  }

  function renderEitc() {
    var cfg = EITC[e.year][e.type];
    var x = e.income;
    var assetRate = e.asset === 'mid' ? 0.5 : (e.asset === 'over' ? 0 : 1);
    var eitcRaw = eitcAmount(x, cfg);
    var childRaw = childAmount(x, e.type) * e.kids;
    var eitc = Math.round(eitcRaw * assetRate);
    var child = Math.round(childRaw * assetRate);
    var total = eitc + child;

    $('eTotal').textContent = won(total);

    var incomeOk = x < cfg.limit;
    var dualTooSmall = e.type === 'dual' && x < 6000000;
    var note;
    if (e.asset === 'over') note = '재산 2억 4,000만원 이상이라 지급 대상에서 제외됩니다.';
    else if (!incomeOk) note = '총소득이 ' + man(cfg.limit) + ' 기준을 넘어 근로장려금 대상이 아닙니다.' + (e.type !== 'single' && x < 70000000 ? ' 자녀장려금은 따로 볼 수 있어요.' : '');
    else if (total === 0) note = '예상 지급액이 0원입니다. 아래 요건을 확인해 보세요.';
    else note = (e.asset === 'mid' ? '재산 1억 7,000만원 이상이라 산정액의 50%만 지급됩니다.' : '소득·재산 요건을 모두 채우면 이 금액을 받을 수 있어요.');
    $('eNote').textContent = note;

    // 산정 내역
    var rows = [
      ['가구 유형', TYPE_NAME[e.type]],
      ['연간 총소득', won(x)],
      ['근로장려금 산정액', won(eitcRaw) + (e.year === 2027 ? ' (개정안)' : '')],
      ['자녀장려금 (' + e.kids + '명 × ' + (e.kids ? won(childAmount(x, e.type)) : '0원') + ')', won(childRaw)],
      ['재산 감액', e.asset === 'over' ? '지급 제외' : (e.asset === 'mid' ? '−' + won((eitcRaw + childRaw) / 2) : '없음')]
    ];
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td class="lbl">' + rows[i][0] + '</td><td class="val">' + rows[i][1] + '</td></tr>';
    }
    $('eReceipt').innerHTML = html;

    // 요건 체크
    var req = [];
    req.push({ ok: incomeOk, text: '총소득 ' + won(x) + ' <strong>' + man(cfg.limit) + ' 미만</strong>' + (incomeOk ? ' 충족' : ' 초과') });
    if (e.type === 'dual') {
      req.push({ ok: !dualTooSmall, text: '맞벌이 요건: 부부 합산 <strong>600만원 이상</strong>' + (dualTooSmall ? ' — 각 300만원 이상이어야 맞벌이로 인정됩니다' : ' 충족') });
    }
    req.push({ ok: e.asset !== 'over', text: '재산 합계 <strong>2억 4,000만원 미만</strong>' + (e.asset === 'over' ? ' 초과' : ' 충족') });
    if (e.asset === 'mid') req.push({ ok: true, text: '재산 1억 7,000만원 이상 → <strong>산정액의 50%</strong> 지급' });
    if (e.type !== 'single') {
      req.push({ ok: true, text: '부양자녀 ' + e.kids + '명 · 자녀장려금은 총소득 <strong>7,000만원 미만</strong>이면 별도 계산' });
    }
    var rhtml = '';
    for (var r = 0; r < req.length; r++) {
      rhtml += '<li class="' + (req[r].ok ? 'ok' : 'no') + '">' + req[r].text + '</li>';
    }
    $('eReq').innerHTML = rhtml;

    // 결과 하단 상태 표시
    var pill = $('ePill');
    if (total > 0) { pill.textContent = e.asset === 'mid' ? '50% 감액 적용' : '지급 가능'; pill.className = 'pill' + (e.asset === 'mid' ? ' warn' : ''); }
    else { pill.textContent = '지급 대상 아님'; pill.className = 'pill off'; }
  }

  $('income').addEventListener('input', function () {
    e.income = Math.min(parseInt(digits($('income').value), 10) || 0, 200000000);
    var chips = document.querySelectorAll('[data-income]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-active', parseInt(chips[i].getAttribute('data-income'), 10) === e.income);
    }
    renderEitc();
  });

  var typeBtns = document.querySelectorAll('[data-type]');
  for (var tb = 0; tb < typeBtns.length; tb++) {
    (function (btn) { btn.addEventListener('click', function () { setType(btn.getAttribute('data-type')); }); })(typeBtns[tb]);
  }
  var eyBtns = document.querySelectorAll('[data-eyear]');
  for (var ey = 0; ey < eyBtns.length; ey++) {
    (function (btn) { btn.addEventListener('click', function () { setEYear(parseInt(btn.getAttribute('data-eyear'), 10)); }); })(eyBtns[ey]);
  }
  var assetSel = document.querySelectorAll('[data-asset]');
  for (var as = 0; as < assetSel.length; as++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        e.asset = btn.getAttribute('data-asset');
        for (var i = 0; i < assetSel.length; i++) {
          var on = assetSel[i].getAttribute('data-asset') === e.asset;
          assetSel[i].classList.toggle('is-active', on);
          assetSel[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        renderEitc();
      });
    })(assetSel[as]);
  }
  var incChips = document.querySelectorAll('[data-income]');
  for (var ic = 0; ic < incChips.length; ic++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        e.income = parseInt(btn.getAttribute('data-income'), 10);
        $('income').value = comma(e.income);
        var chips = document.querySelectorAll('[data-income]');
        for (var i = 0; i < chips.length; i++) chips[i].classList.remove('is-active');
        btn.classList.add('is-active');
        renderEitc();
      });
    })(incChips[ic]);
  }
  $('kidsMinus').addEventListener('click', function () {
    if (e.type === 'single') return;
    e.kids = clamp(e.kids - 1, 0, 6);
    $('kidsInput').value = e.kids;
    renderEitc();
  });
  $('kidsPlus').addEventListener('click', function () {
    if (e.type === 'single') return;
    e.kids = clamp(e.kids + 1, 0, 6);
    $('kidsInput').value = e.kids;
    renderEitc();
  });
  $('eitcForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    renderEitc();
    scrollToResult('eResultCard');
  });

  /* ---------- 시작 ---------- */
  $('salary').value = comma(u.salary);
  $('income').value = comma(e.income);
  setYear(2026);
  setAge('under50');
  setPeriod('1to3');
  setEYear(2026);
  setType('one');
})();
