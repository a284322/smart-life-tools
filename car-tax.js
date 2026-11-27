/* =========================================================
   2026 자동차세 연납 할인 계산기 – car-tax.js
   지방세법 제127조(세율·차령 경감)·제128조 제3항(연납 공제)
   + 시행령 제125조 제6항(이자율 5%) 기준.
   외부 의존 없음. 모든 계산은 브라우저 안에서만.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    fuel: 'ice',   // ice | ev
    when: 'jan'    // jan | mar | jun | sep
  };

  /* ---------- 숫자 유틸 ---------- */
  function nf(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function won(n) { return nf(n) + '원'; }
  function r10(n) { return Math.round(n / 10) * 10; }        // 10원 미만 절사(고지서 표기 방식)
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInYear(y) { return isLeap(y) ? 366 : 365; }

  /* ---------- 세율 (지방세법 제127조 제1항 제1호·제3호) ---------- */
  function ccRate(cc) {
    if (cc <= 1000) return 80;
    if (cc <= 1600) return 140;
    return 200;
  }

  /* ---------- 차령 경감률 (제127조 제1항 제2호) ---------- */
  function ageRate(age) {
    if (!age || age < 3) return 0;             // 1~2년: 경감 없음
    if (age >= 12) return 0.5;
    return 0.05 * (age - 2);                   // 3년 5% … 11년 45%
  }

  /* ---------- 연납 공제 (제128조 제3항) ----------
     1월·3월: 연세액 × (기한 다음 날 ~ 12/31 일수) ÷ 365(윤년 366) × 5%
     6월    : 제2기분 세액 × 5%
     9월    : 제2기분 세액 × (10/1 ~ 12/31 = 92일) ÷ 184 × 5%
     → 연세액 대비 실효 공제율로 환산해 한 식으로 처리한다.          */
  var RATE = 0.05;
  function whenInfo(when, year) {
    var diy = daysInYear(year);
    if (when === 'jan') {
      var dJan = diy - 31;                      // 2/1 ~ 12/31
      return {
        key: 'jan', name: '1월', period: '1월 16일 ~ 31일', base: '연세액',
        days: dJan, denom: diy, factor: RATE * dJan / diy,
        help: '1월 16~31일 신청. 2월 1일부터 12월 31일까지 남은 기간에 연 5%를 적용해 가장 많이 아낍니다.',
        short: nf(dJan) + '일 ÷ ' + diy + '일 × 5%'
      };
    }
    if (when === 'mar') {
      var dMar = diy - (31 + (isLeap(year) ? 29 : 28) + 31);   // 4/1 ~ 12/31
      return {
        key: 'mar', name: '3월', period: '3월 16일 ~ 31일', base: '연세액',
        days: dMar, denom: diy, factor: RATE * dMar / diy,
        help: '3월 16~31일 신청. 4월 1일부터 12월 31일까지 남은 기간에 연 5%를 적용합니다.',
        short: nf(dMar) + '일 ÷ ' + diy + '일 × 5%'
      };
    }
    if (when === 'jun') {
      return {
        key: 'jun', name: '6월', period: '6월 16일 ~ 30일', base: '제2기분 세액',
        days: 0, denom: 0, factor: RATE * 0.5,
        help: '6월 16~30일 신청. 1기분(6월)은 그대로 내고, 2기분 세액의 5%를 미리 내며 공제받습니다.',
        short: '제2기분 세액 × 5%'
      };
    }
    return {
      key: 'sep', name: '9월', period: '9월 16일 ~ 30일', base: '제2기분 세액',
      days: 92, denom: 184, factor: RATE * 0.5 * (92 / 184),
      help: '9월 16~30일 신청. 10월 1일부터 12월 31일까지 92일에 연 5%를 적용해 할인 폭이 가장 작습니다.',
      short: '제2기분 세액 × 92/184 × 5%'
    };
  }

  /* ---------- 마지막 날 + 기한 특례 ---------- */
  function deadline(when, year) {
    var end = when === 'jan' ? 31 : (when === 'mar' ? 31 : (when === 'jun' ? 30 : 30));
    var month = when === 'jan' ? 1 : (when === 'mar' ? 3 : (when === 'jun' ? 6 : 9));
    var d = new Date(year, month - 1, end);
    var moved = false;
    var dow = d.getDay();
    if (dow === 6) { d.setDate(d.getDate() + 2); moved = true; }
    else if (dow === 0) { d.setDate(d.getDate() + 1); moved = true; }
    else if (dow === 5) { /* 금요일: 그대로 */ }
    return { month: month, day: end, moved: moved, next: d };
  }

  /* ---------- 계산 ---------- */
  function calc(cc, age, when, year, fuel) {
    var ev = fuel === 'ev';
    var baseRaw = ev ? 100000 : cc * ccRate(cc);
    var red = ev ? 0 : ageRate(age);
    var taxRaw = baseRaw * (1 - red);              // 경감 후 연 자동차세(본세)
    var info = whenInfo(when, year);
    var deductRaw = taxRaw * info.factor;          // 연납 공제액(자동차세에서)

    var taxBase = r10(taxRaw);
    var deduct = r10(deductRaw);
    if (deduct > taxBase) deduct = taxBase;
    var taxAfter = taxBase - deduct;
    var eduAfter = r10(taxAfter * 0.3);
    var eduBase = r10(taxBase * 0.3);

    var pay = taxAfter + eduAfter;                 // 연납 시 1년치 총 납부액
    var total = taxBase + eduBase;                 // 6월·12월 분할납부 총액
    var save = total - pay;

    return {
      ev: ev, cc: cc, age: age, year: year, when: when, info: info,
      rate: ev ? 0 : ccRate(cc),
      base: Math.round(baseRaw), red: red, redAmt: Math.round(baseRaw * red),
      taxBase: taxBase, deduct: deduct, taxAfter: taxAfter,
      eduBase: eduBase, eduAfter: eduAfter,
      pay: pay, total: total, save: save,
      ratePct: total > 0 ? (save / total) * 100 : 0
    };
  }

  /* ---------- 화면 ---------- */
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

  function render() {
    var cc = parseInt(($('cc').value || '').replace(/[^\d]/g, ''), 10) || 0;
    var age = parseInt($('age').value, 10) || 0;
    var year = parseInt($('year').value, 10) || 2027;
    var r = calc(cc, age, state.when, year, state.fuel);

    /* 큰 숫자 */
    if (r.total <= 0) {
      $('resSave').textContent = '0원';
    } else {
      $('resSave').textContent = won(r.save);
    }
    $('resNote').textContent = r.info.name + ' 연납 · ' + r.year + '년 기준 · 연세액의 ' +
      r.ratePct.toFixed(2) + '% 절약';

    $('resSplit').textContent = won(r.total);
    $('resPay').textContent = won(r.pay);
    $('resRate').textContent = r.ratePct.toFixed(2) + '%';

    /* 계산 과정 */
    var rows = [];
    if (r.ev) {
      rows.push(row('차량 구분', '전기·수소 승용', { small: '배기량 없음 · 정액 과세' }));
      rows.push(row('자동차세 (연 정액)', won(r.base), { small: '지방세법 제127조 제1항 제3호' }));
      rows.push(row('차령 경감', '해당 없음', { small: '정액 세액에는 경감 미적용' }));
    } else {
      rows.push(row('배기량', nf(r.cc) + 'cc', { small: nf(r.rate) + '원/cc 적용' }));
      rows.push(row('자동차세 (경감 전)', won(r.base), { small: nf(r.cc) + 'cc × ' + nf(r.rate) + '원' }));
      rows.push(row('차령 경감' + (r.age >= 3 ? ' (' + r.age + '년)' : ''),
        r.red > 0 ? '−' + won(r.redAmt) : '없음',
        { minus: r.red > 0, small: r.red > 0 ? '−' + Math.round(r.red * 100) + '% 경감' : '1~2년 · 경감 없음' }));
    }
    rows.push(row('연 자동차세', won(r.taxBase), { sub: true }));
    rows.push(row('지방교육세 30%', '+ ' + won(r.eduBase), { small: '자동차세의 30%' }));
    rows.push(row('연세액 (6·12월 분할납부)', won(r.total), { sub: true }));

    rows.push(row('연납 공제', '−' + won(r.deduct), {
      minus: true,
      small: r.info.short + (r.info.base === '제2기분 세액' ? ' · ' + r.info.base + ' 기준' : '')
    }));
    rows.push(row(r.info.name + ' 연납 시 총 납부액', won(r.pay), { total: true }));

    $('receiptBody').innerHTML = rows.join('');

    /* 분할납부 비교 */
    var half = r10(r.total / 2);
    var half2 = r.total - half;
    $('splitCompare').innerHTML =
      '<h4>6월 · 12월에 나눠 낼 때와 비교</h4>' +
      '<div class="split-row"><span>6월 (제1기분)<small>연세액의 절반 + 교육세</small></span><b>' + won(half) + '</b></div>' +
      '<div class="split-row"><span>12월 (제2기분)<small>연세액의 절반 + 교육세</small></span><b>' + won(half2) + '</b></div>' +
      '<div class="split-row"><span>나눠 낼 때 합계</span><b>' + won(r.total) + '</b></div>' +
      '<div class="split-row"><span>' + r.info.name + ' 연납 납부액<small>' + r.info.period + ' 신청</small></span><b>' + won(r.pay) + '</b></div>' +
      '<div class="split-row is-save"><span>' + r.info.name + ' 연납으로 아끼는 금액</span><b>' + won(r.save) + '</b></div>';

    /* 안내 문구 */
    var notes = [];
    if (r.ev) {
      notes.push('전기·수소차는 자동차세가 연 10만원 이하라, 지자체가 6월 제1기분에 1년치를 한꺼번에 고지하는 경우가 많습니다. 고지서를 먼저 확인하세요.');
    }
    var dl = deadline(r.when, r.year);
    if (dl.moved) {
      notes.push(r.year + '년 ' + dl.month + '월 ' + dl.day + '일이 주말이라 신청 기한은 ' +
        (dl.next.getMonth() + 1) + '월 ' + dl.next.getDate() + '일(' +
        ['일', '월', '화', '수', '목', '금', '토'][dl.next.getDay()] + ')까지입니다. 기한이 밀리면 공제 일수가 하루 줄어 실제 금액이 몇십 원 차이 날 수 있어요.');
    }
    var now = new Date();
    if (now.getFullYear() > r.year || (now.getFullYear() === r.year && now.getMonth() + 1 > dl.month)) {
      notes.push('이미 지난 연납 기간입니다. 계산식은 같지만 실제 신청은 다음 기간에 하셔야 합니다.');
    }
    $('resWarn').hidden = notes.length === 0;
    $('resWarn').textContent = notes.join(' ');

    /* 배너 색: 아끼는 금액이 0이면 차분하게 */
    var banner = $('resBanner');
    banner.classList.toggle('is-zero', r.save <= 0);
  }

  /* ---------- 입력 ---------- */
  function formatCc() {
    var v = $('cc').value.replace(/[^\d]/g, '');
    if (v === '') { $('cc').value = ''; return 0; }
    var n = clamp(parseInt(v, 10), 0, 20000);
    $('cc').value = n.toLocaleString('ko-KR');
    return n;
  }

  function setActive(group, btn) {
    var all = document.querySelectorAll(group);
    for (var i = 0; i < all.length; i++) all[i].classList.remove('is-active');
    if (btn) btn.classList.add('is-active');
  }

  function setFuel(fuel) {
    state.fuel = fuel;
    var btns = document.querySelectorAll('[data-fuel]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-fuel') === fuel;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    var isEv = fuel === 'ev';
    $('ccField').hidden = isEv;
    $('evNote').hidden = !isEv;
    $('age').disabled = isEv;
    render();
  }

  function setWhen(when) {
    state.when = when;
    var btns = document.querySelectorAll('[data-when]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-when') === when;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    var info = whenInfo(when, parseInt($('year').value, 10) || 2027);
    $('whenHelp').textContent = info.help;
    render();
  }

  /* ---------- 이벤트 ---------- */
  $('cc').addEventListener('input', function () {
    var n = formatCc();
    var chips = document.querySelectorAll('[data-cc]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-active', parseInt(chips[i].getAttribute('data-cc'), 10) === n);
    }
    render();
  });

  $('age').addEventListener('change', render);
  $('year').addEventListener('change', function () {
    setWhen(state.when);
  });

  var fuelBtns = document.querySelectorAll('[data-fuel]');
  for (var f = 0; f < fuelBtns.length; f++) {
    (function (btn) {
      btn.addEventListener('click', function () { setFuel(btn.getAttribute('data-fuel')); });
    })(fuelBtns[f]);
  }

  var whenBtns = document.querySelectorAll('[data-when]');
  for (var w = 0; w < whenBtns.length; w++) {
    (function (btn) {
      btn.addEventListener('click', function () { setWhen(btn.getAttribute('data-when')); });
    })(whenBtns[w]);
  }

  var ccChips = document.querySelectorAll('[data-cc]');
  for (var c = 0; c < ccChips.length; c++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        setFuel('ice');
        $('cc').value = parseInt(btn.getAttribute('data-cc'), 10).toLocaleString('ko-KR');
        var chips = document.querySelectorAll('[data-cc]');
        for (var i = 0; i < chips.length; i++) chips[i].classList.remove('is-active');
        btn.classList.add('is-active');
        render();
      });
    })(ccChips[c]);
  }

  $('carForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    render();
    if (window.innerWidth <= 1000) {
      var top = $('resultCard').getBoundingClientRect().top + window.pageYOffset - 76;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  });

  /* ---------- 시작 ---------- */
  formatCc();
  setFuel('ice');
  setWhen('jan');
})();
