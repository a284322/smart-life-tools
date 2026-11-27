/* =========================================================
   2027 중위소득 · 내 지원금 찾기 – subsidy.js
   · 기준 중위소득: 보건복지부 고시 2025-135호(2026년), 2026년 7월 결정(2027년)
   · 급여별 선정기준: 생계 32% / 의료 40% / 주거 48% / 교육 50%
   · 기초연금 선정기준액·기준연금액: 보건복지부 고시(2026년)
   · 청년월세·국민취업지원제도·내일배움카드·근로장려금: 2026년 기준
   모든 판정은 입력한 월 소득만 보는 간편 추정입니다.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function nf(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function won(n) { return nf(n) + '원'; }
  function man(n) { return Math.round(n / 10000).toLocaleString('ko-KR') + '만원'; }
  function digits(v) { return (v || '').replace(/[^0-9]/g, ''); }
  function comma(n) { return n.toLocaleString('ko-KR'); }

  /* 가구원 수 1~7인(7인 이상은 7인 기준) */
  var MI = {
    2026: [2564238, 4199292, 5359036, 6494738, 7556719, 8555952, 9515150],
    2027: [2736042, 4480645, 5718091, 6929885, 8063019, 9129201, 10152665]
  };
  var RATE = { basic: 32, medical: 40, housing: 48, education: 50 };
  var PENSION = { single: 2470000, couple: 3952000, base: 349700 };

  var state = {
    year: 2027,
    household: 1,
    income: 2000000,
    mode: 'gross',          // gross | recognized
    flags: {}               // youth, newly, midlife, senior, jobseeker, disabled
  };

  function mi() { return MI[state.year][Math.min(state.household, 7) - 1]; }
  function ratio() { return state.income / mi() * 100; }

  /* ---------- 지원금 판정 ---------- */
  function evaluate() {
    var m = mi(), r = ratio(), inc = state.income, f = state.flags;
    var annual = inc * 12;
    var out = [];

    function add(key, name, basis, status, money, desc, how) {
      out.push({ key: key, name: name, basis: basis, status: status, money: money, desc: desc, how: how });
    }

    /* 1. 생계급여 */
    var basicBase = m * 0.32, basicGap = Math.max(0, basicBase - inc);
    add('basic', '생계급여', '중위 32% 이하', r <= 32 ? 'ok' : 'no',
      r <= 32 ? '월 약 ' + won(basicGap) : '월 최대 ' + won(basicBase),
      r <= 32
        ? '선정기준 ' + won(basicBase) + '에서 소득 ' + won(inc) + '을 뺀 금액을 매달 받습니다. 부양의무자 기준도 함께 봅니다.'
        : '선정기준 ' + won(basicBase) + ' 이하여야 합니다. 지금 소득으로는 ' + won(Math.max(0, inc - basicBase)) + ' 초과입니다.',
      '주민센터·복지로');

    /* 2. 의료급여 */
    add('medical', '의료급여', '중위 40% 이하', r <= 40 ? 'ok' : 'no',
      r <= 40 ? '병원비 본인부담 거의 없음' : '기준 ' + won(m * 0.4),
      r <= 40
        ? '입원·외래 진료비를 국가가 부담합니다(본인부담 일부). 생계급여와 함께 신청하는 경우가 많습니다.'
        : '기준 중위소득 40%(' + won(m * 0.4) + ') 이하일 때 받을 수 있습니다.',
      '주민센터·복지로');

    /* 3. 주거급여 */
    add('housing', '주거급여', '중위 48% 이하', r <= 48 ? 'ok' : 'no',
      r <= 48 ? '월세·전세 지원' : '기준 ' + won(m * 0.48),
      r <= 48
        ? '임차가구는 기준임대료 범위에서 월세를 지원하고, 자가가구는 수선비를 지원합니다. 금액은 지역과 가구원 수에 따라 다릅니다.'
        : '기준 중위소득 48%(' + won(m * 0.48) + ') 이하일 때 신청할 수 있습니다.',
      '주민센터·복지로');

    /* 4. 교육급여 */
    var eduStatus = r <= 50 ? (f.newly ? 'ok' : 'check') : 'no';
    add('education', '교육급여', '중위 50% 이하', eduStatus,
      r <= 50 ? '초·중·고 교육비' : '기준 ' + won(m * 0.5),
      r <= 50
        ? '교육활동지원비(초 46만·중 65만·고 72만원 수준)와 교과서·입학금을 지원합니다. 학생이 있는 가구만 해당됩니다.'
        : '기준 중위소득 50%(' + won(m * 0.5) + ') 이하이면서 초·중·고 학생이 있어야 합니다.',
      '주민센터·복지로');

    /* 5. 차상위계층 */
    add('nearpoor', '차상위계층', '중위 50% 이하', r <= 50 ? 'ok' : 'no',
      r <= 50 ? '본인부담 경감·통신비 감면' : '기준 ' + won(m * 0.5),
      r <= 50
        ? '의료비 본인부담 경감, 통신비 감면, 전기요금 할인 등을 받을 수 있습니다. 별도 신청으로 확인증을 발급받습니다.'
        : '기준 중위소득 50%(' + won(m * 0.5) + ') 이하일 때 해당됩니다.',
      '주민센터');

    /* 6. 기초연금 */
    var pLimit = state.household >= 2 ? PENSION.couple : PENSION.single;
    var seniorOk = !!f.senior && inc <= pLimit;
    add('pension', '기초연금', '만 65세 이상', f.senior ? (seniorOk ? 'ok' : 'no') : 'no',
      seniorOk ? '월 최대 ' + won(PENSION.base) : '월 최대 ' + won(PENSION.base),
      !f.senior
        ? '만 65세 이상이면 소득인정액 ' + man(PENSION.single) + '(부부 ' + man(PENSION.couple) + ') 이하일 때 받을 수 있습니다.'
        : (seniorOk
          ? '2026년 기준연금액 ' + won(PENSION.base) + '입니다. 부부가 함께 받으면 각각 감액되고, 국민연금 가입기간에 따라 줄어들 수 있습니다.'
          : '소득인정액이 기준(단독 ' + man(PENSION.single) + '·부부 ' + man(PENSION.couple) + ')을 넘습니다. 재산을 소득으로 환산해 다시 확인해 보세요.'),
      '주민센터·복지로');

    /* 7. 청년월세 */
    var youthStatus = !f.youth ? 'no' : (r <= 60 ? 'ok' : (r <= 100 ? 'check' : 'no'));
    add('youth-rent', '청년월세 지원', '만 19~34세·중위 60%', youthStatus,
      '월 최대 20만원 × 24개월',
      !f.youth
        ? '만 19~34세 무주택 청년이 부모와 따로 살 때 신청할 수 있습니다.'
        : (r <= 60
          ? '청년가구 소득이 중위 60%(' + won(m * 0.6) + ') 이하이고, 부모를 포함한 원가구는 중위 100% 이하일 때 받을 수 있습니다. 실제 낸 월세 범위에서 월 20만원씩 최대 24개월입니다.'
          : '청년가구 소득이 중위 60%(' + won(m * 0.6) + ')를 넘습니다. 만 30세 이상이거나 혼인했다면 본인 가구 소득만 봅니다.'),
      '복지로·주민센터');

    /* 8. 근로장려금 */
    var eitcStatus = annual < 22000000 ? 'ok' : (annual < 44000000 ? 'check' : 'no');
    add('eitc', '근로장려금', '연소득 기준', eitcStatus,
      annual < 22000000 ? '최대 165만원' : (annual < 44000000 ? '가구 유형에 따라' : '대상 아님'),
      eitcStatus === 'ok'
        ? '연소득 ' + man(annual) + '이면 단독가구 기준(2,200만원 미만)을 넘지 않습니다. 홑벌이는 3,200만, 맞벌이는 4,400만원까지 받을 수 있어요.'
        : (eitcStatus === 'check'
          ? '연소득 ' + man(annual) + '은 단독가구 기준을 넘습니다. 배우자·부양자녀가 있는 홑벌이(3,200만)·맞벌이(4,400만)라면 받을 수 있습니다.'
          : '연소득 ' + man(annual) + '은 맞벌이 기준(4,400만원)도 넘습니다. 자녀장려금은 7,000만원 미만이면 따로 볼 수 있습니다.'),
      '홈택스·ARS 1544-9944');

    /* 9. 국민취업지원제도 */
    var kuaStatus = !f.jobseeker ? 'no' : (r <= 60 ? 'ok' : (r <= 120 ? 'check' : 'no'));
    add('kua', '국민취업지원제도', '구직자·중위 60%', kuaStatus,
      '구직촉진수당 월 60만원 × 6개월',
      !f.jobseeker
        ? '구직 중이거나 곧 구직할 예정이면 신청할 수 있습니다. Ⅰ유형은 중위 60% 이하·재산 4억원 이하(청년 5억원)입니다.'
        : (r <= 60
          ? 'Ⅰ유형 요건에 들어갑니다. 구직촉진수당 월 60만원을 6개월 받고, 부양가족이 있으면 1인당 월 10만원(최대 40만원)이 더해집니다.'
          : '중위 60%를 넘습니다. 청년(15~34세)은 중위 120%까지 Ⅰ유형 청년특례를 볼 수 있고, Ⅱ유형은 소득 기준이 더 넓습니다.'),
      '고용24·고용센터');

    /* 10. 내일배움카드 */
    add('card', '국민내일배움카드', '전 연령', f.jobseeker ? 'ok' : 'check',
      '훈련비 300~500만원',
      f.jobseeker
        ? '구직자는 구직 등록 후 발급받아 훈련비 300만원(최대 500만원)을 지원받습니다. 140시간 이상 과정은 훈련장려금 월 최대 11만 6천원이 따로 나옵니다.'
        : '재직자도 발급됩니다. 다만 현직 공무원·사립학교 교직원·연 매출 4억원 이상 자영업자 등은 제외되니 고용24에서 확인하세요.',
      '고용24·고용센터');

    /* 11. 에너지바우처 */
    add('energy', '에너지바우처', '생계·의료급여 수급자', r <= 40 ? 'ok' : 'no',
      r <= 40 ? '여름·겨울 냉난방비' : '수급자만 해당',
      r <= 40
        ? '생계급여·의료급여 수급자 중 노인·장애인·영유아·임산부 등이 있는 가구에 전기·가스 요금을 지원합니다.'
        : '생계급여·의료급여 수급자여야 신청할 수 있습니다.',
      '주민센터·복지로');

    /* 12. 아동수당 */
    var childStatus = !f.newly ? 'no' : 'check';
    add('child', '아동수당', '만 8세 미만', childStatus,
      '월 10만원',
      !f.newly
        ? '만 8세 미만 자녀가 있으면 소득과 상관없이 받습니다. 출산·입양 후 60일 안에 신청하면 태어난 날부터 소급됩니다.'
        : '만 8세 미만 자녀 1명당 월 10만원입니다. 자녀 나이와 주민등록상 거주지가 맞는지 확인하세요.',
      '주민센터·복지로');

    return out;
  }

  /* ---------- 렌더 ---------- */
  var STATUS_LABEL = { ok: '신청 가능', check: '조건 확인', no: '해당 없음' };
  var GROUP_TITLE = {
    ok: ['바로 신청해 볼 수 있어요', '입력한 소득만으로 기준을 넘지 않습니다'],
    check: ['조건을 더 확인해 보세요', '가구 구성·재산에 따라 달라집니다'],
    no: ['지금은 해당되지 않아요', '소득이나 상황이 바뀌면 다시 확인하세요']
  };

  function render() {
    var m = mi(), r = ratio();
    $('miAmount').textContent = won(m);
    $('ratioNum').textContent = r.toFixed(1) + '%';
    $('ratioLine').textContent = state.household + '인 가구 기준 중위소득 ' + won(m) + ' · 내 소득 ' + won(state.income);

    var pct = Math.min(r, 150) / 150 * 100;
    $('gaugeFill').style.width = pct.toFixed(2) + '%';

    var list = evaluate();
    var counts = { ok: 0, check: 0, no: 0 };
    for (var i = 0; i < list.length; i++) counts[list[i].status]++;
    $('cntOk').textContent = counts.ok + '개';
    $('cntCheck').textContent = counts.check + '개';
    $('cntNo').textContent = counts.no + '개';

    var summary = counts.ok > 0
      ? '중위소득의 ' + r.toFixed(0) + '% 구간입니다. 바로 신청할 수 있는 지원금이 ' + counts.ok + '개 보입니다.'
      : '중위소득의 ' + r.toFixed(0) + '% 구간입니다. 지금은 조건 확인이 필요한 지원금 위주로 보세요.';
    $('judgeNote').textContent = summary;

    var host = $('progList');
    var order = ['ok', 'check', 'no'];
    var html = '';
    for (var g = 0; g < order.length; g++) {
      var st = order[g];
      var items = [];
      for (var j = 0; j < list.length; j++) if (list[j].status === st) items.push(list[j]);
      if (!items.length) continue;
      html += '<section class="prog-group">';
      html += '<h3>' + GROUP_TITLE[st][0] + ' <em>' + GROUP_TITLE[st][1] + ' · ' + items.length + '개</em></h3>';
      html += '<div class="prog-grid">';
      for (var k = 0; k < items.length; k++) {
        var it = items[k];
        html += '<article class="prog-card is-' + it.status + '">';
        html += '<header><div><h4>' + it.name + '</h4><span class="basis">' + it.basis + '</span></div>';
        html += '<span class="status ' + it.status + '">' + STATUS_LABEL[it.status] + '</span></header>';
        html += '<p class="money"><strong>' + it.money + '</strong></p>';
        html += '<p>' + it.desc + '</p>';
        html += '<p class="how">신청·문의 · ' + it.how + '</p>';
        html += '</article>';
      }
      html += '</div></section>';
    }
    host.innerHTML = html;

    // 표
    var rows = '';
    for (var n = 1; n <= 7; n++) {
      var base = MI[state.year][n - 1];
      rows += '<tr' + (n === state.household ? ' class="is-mine"' : '') + '><td>' + (n === 7 ? '7인 이상' : n + '인') + '</td>';
      rows += '<td>' + nf(base) + '</td>';
      rows += '<td>' + nf(base * 0.32) + '</td>';
      rows += '<td>' + nf(base * 0.4) + '</td>';
      rows += '<td>' + nf(base * 0.48) + '</td>';
      rows += '<td>' + nf(base * 0.5) + '</td>';
      rows += '<td>' + nf(base * 0.6) + '</td>';
      rows += '</tr>';
    }
    $('miTableBody').innerHTML = rows;
    $('miTableYear').textContent = state.year + '년';
  }

  /* ---------- 이벤트 ---------- */
  var hChips = document.querySelectorAll('[data-house]');
  for (var h = 0; h < hChips.length; h++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        state.household = parseInt(btn.getAttribute('data-house'), 10);
        for (var i = 0; i < hChips.length; i++) hChips[i].classList.toggle('is-active', hChips[i] === btn);
        render();
      });
    })(hChips[h]);
  }

  $('income').addEventListener('input', function () {
    state.income = Math.min(parseInt(digits($('income').value), 10) || 0, 100000000);
    var chips = document.querySelectorAll('[data-income]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-active', parseInt(chips[i].getAttribute('data-income'), 10) === state.income);
    }
    render();
  });

  var iChips = document.querySelectorAll('[data-income]');
  for (var ic = 0; ic < iChips.length; ic++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        state.income = parseInt(btn.getAttribute('data-income'), 10);
        $('income').value = comma(state.income);
        var chips = document.querySelectorAll('[data-income]');
        for (var i = 0; i < chips.length; i++) chips[i].classList.remove('is-active');
        btn.classList.add('is-active');
        render();
      });
    })(iChips[ic]);
  }

  var flagBtns = document.querySelectorAll('[data-flag]');
  for (var fb = 0; fb < flagBtns.length; fb++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-flag');
        state.flags[key] = !state.flags[key];
        btn.classList.toggle('is-active', state.flags[key]);
        btn.setAttribute('aria-pressed', state.flags[key] ? 'true' : 'false');
        render();
      });
    })(flagBtns[fb]);
  }

  var modeBtns = document.querySelectorAll('[data-mode]');
  for (var mb = 0; mb < modeBtns.length; mb++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        state.mode = btn.getAttribute('data-mode');
        for (var i = 0; i < modeBtns.length; i++) {
          var on = modeBtns[i].getAttribute('data-mode') === state.mode;
          modeBtns[i].classList.toggle('is-active', on);
          modeBtns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        $('incomeLabel').innerHTML = state.mode === 'gross'
          ? '월 소득(세전) <span class="unit">원</span>'
          : '월 소득인정액 <span class="unit">원</span>';
        $('modeHelp').textContent = state.mode === 'gross'
          ? '급여·사업소득의 세전 월평균입니다. 복지 급여는 재산을 소득으로 환산한 소득인정액으로 다시 심사합니다.'
          : '재산을 소득으로 환산한 금액(소득인정액)을 안다면 그 값을 넣으세요. 복지로 모의계산에서 확인할 수 있습니다.';
        render();
      });
    })(modeBtns[mb]);
  }

  var yBtns = document.querySelectorAll('[data-year]');
  for (var y = 0; y < yBtns.length; y++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        state.year = parseInt(btn.getAttribute('data-year'), 10);
        for (var i = 0; i < yBtns.length; i++) {
          var on = parseInt(yBtns[i].getAttribute('data-year'), 10) === state.year;
          yBtns[i].classList.toggle('is-active', on);
          yBtns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        render();
      });
    })(yBtns[y]);
  }

  $('subsidyForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    render();
    if (window.innerWidth <= 1000) {
      var el = $('resultCard');
      var top = el.getBoundingClientRect().top + window.pageYOffset - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  });

  /* ---------- 시작 ---------- */
  $('income').value = comma(state.income);
  render();
})();
