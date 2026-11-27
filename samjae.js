/* =========================================================
   2027 삼재·대박띠 확인 & 로또 행운번호 생성기 (samjae.js)
   - 띠: 입춘(2월 4일) 이전 출생은 전년도 띠로 계산
   - 2027 정미년(未) 기준 삼합·육합·충·형·원진·해 해석 (전통 해석, 재미용)
   - 삼재: 해묘미(2025~2027) · 인오술(2028~2030) · 사유축(2031~2033) · 신자진(2034~2036)
   - 로또: 1~45 중 중복 없는 6개, 게임 5줄, 생년월일 시드 또는 무작위
   모든 계산은 브라우저 안에서만 이루어지며 입력값은 전송·저장되지 않습니다.
   ========================================================= */
(function () {
  'use strict';

  var ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

  /* 2027년 미(未)와의 관계 */
  var RELATIONS = {
    0: { rel: '원진 · 해', grade: '관계 주의', text: '가까운 사람과 말이 어긋나기 쉬운 해입니다. 오해가 생기면 그날 안에 풀어 두세요. 큰일보다 사소한 서운함이 쌓이는 쪽을 조심합니다.' },
    1: { rel: '충 · 삼형', grade: '변동 큼', text: '이사·직장·관계 변화가 한꺼번에 몰릴 수 있는 해입니다. 계약서와 조건을 두 번 확인하고, 서두르는 결정은 하루 미뤄 보세요.' },
    2: { rel: '특별한 관계 없음', grade: '무난', text: '합도 충도 없어 내 사주의 흐름이 더 크게 작용하는 해입니다. 세운 계획을 꾸준히 밀고 나가기 좋습니다. 2028년부터는 호랑이띠 삼재가 시작됩니다.' },
    3: { rel: '삼합 · 날삼재', grade: '협력 좋음', text: '사람과 일이 한 방향으로 모이는 해입니다. 다만 삼재의 마지막 해라 새 판을 크게 벌이기보다 하던 일을 결과로 남기는 데 힘을 쓰세요.' },
    4: { rel: '특별한 관계 없음', grade: '무난', text: '부딪힘이 적은 해입니다. 눈에 띄는 성과보다 실속과 안정을 챙기기 좋습니다.' },
    5: { rel: '방합(사오미)', grade: '활동적', text: '같은 방향의 기운이 모여 활동량이 늘어나는 해입니다. 다만 돈과 말이 새지 않도록 지출과 언행을 한 번 더 살피세요.' },
    6: { rel: '육합(오미합)', grade: '대박띠', text: '2027년 띠 관계에서 가장 좋은 자리입니다. 사람과 제안이 잘 붙고 귀인의 도움을 받기 쉬운 해로 봅니다. 2028년부터 말띠 삼재가 시작되니 큰 결정은 2027년 안에 정리해 두면 좋습니다.' },
    7: { rel: '본명년 · 날삼재', grade: '재정비', text: '내 띠가 돌아온 해입니다. 기운이 두 배로 커지는 만큼 잘한 일도 크게 보입니다. 삼재는 빠져나가는 중이니 건강과 재무를 점검하는 해로 쓰세요.' },
    8: { rel: '특별한 관계 없음', grade: '무난', text: '부딪힘이 없는 해입니다. 자리와 인정이 따라오는 흐름으로 보는 풀이도 있으니, 기회가 보이면 작게라도 시작해 보세요.' },
    9: { rel: '특별한 관계 없음', grade: '무난', text: '압박 속에서 단련되는 해로 봅니다. 실무 성과를 차곡차곡 쌓기 좋습니다.' },
    10: { rel: '형 · 파', grade: '주의', text: '계약·서류·말실수에서 꼬이기 쉬운 해입니다. 도장 찍기 전에 한 번 더 읽고, 2028년 들삼재를 앞두고 정리할 것은 미리 정리하세요.' },
    11: { rel: '삼합 · 날삼재', grade: '협력 좋음', text: '협력운은 좋고 마무리가 관건인 해입니다. 정재와 정관이 함께 든다고 보는 풀이도 있어, 안정적인 수입과 자리를 다지는 데 좋습니다.' }
  };

  /* 삼재 묶음: [띠 지지들], 시작 연도(첫 해) */
  var SANJAE_GROUPS = [
    { zhi: [11, 3, 7], start: 2025, label: '돼지 · 토끼 · 양' },
    { zhi: [2, 6, 10], start: 2028, label: '호랑이 · 말 · 개' },
    { zhi: [5, 9, 1], start: 2031, label: '뱀 · 닭 · 소' },
    { zhi: [8, 0, 4], start: 2034, label: '원숭이 · 쥐 · 용' }
  ];

  var DAEBAK = { 6: '1위 대박띠', 3: '2위 상생띠', 11: '2위 상생띠' };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function parseDate(str) {
    if (!str) return null;
    var p = String(str).split('-');
    if (p.length !== 3) return null;
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  /* 입춘 기준 띠 계산: 1월과 2월 4일 이전은 전년도 */
  function zodiacYear(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    if (m === 1 || (m === 2 && d <= 4)) y -= 1;
    return y;
  }
  function zodiacIndex(year) {
    var idx = ((year - 4) % 12 + 12) % 12;
    return idx;
  }

  function samjaeInfo(idx, targetYear) {
    for (var i = 0; i < SANJAE_GROUPS.length; i++) {
      var g = SANJAE_GROUPS[i];
      if (g.zhi.indexOf(idx) >= 0) {
        var s = g.start;
        var found = s;
        for (var k = 0; k < 12; k++) {
          if (s <= targetYear && targetYear <= s + 2) { found = s; break; }
          if (s > targetYear) { found = s; break; }
          s += 12;
        }
        var inPeriod = found <= targetYear && targetYear <= found + 2;
        var phase = inPeriod ? (targetYear - found === 0 ? '들삼재' : targetYear - found === 1 ? '눌삼재' : '날삼재') : '';
        return {
          group: g, periodStart: found, inPeriod: inPeriod, phase: phase,
          nextStart: inPeriod ? found + 12 : found
        };
      }
    }
    return null;
  }

  function renderSanjae() {
    var date = parseDate($('#birthDate').value);
    if (!date) {
      $('#sjZodiac').textContent = '-';
      $('#sjSummary').textContent = '생년월일을 넣으면 띠와 삼재를 확인합니다.';
      $('#sjSanjae').textContent = '-';
      $('#sjRelation').textContent = '-';
      $('#sjBirth').textContent = '-';
      $('#sjSplit').innerHTML = '';
      $('#sjAdvice').innerHTML = '';
      return;
    }

    var y = zodiacYear(date);
    var idx = zodiacIndex(y);
    var name = ZODIAC[idx];
    var rel = RELATIONS[idx];
    var sj = samjaeInfo(idx, 2027);
    var next = samjaeInfo(idx, 2028);

    $('#sjZodiac').textContent = name + '띠';
    $('#sjSummary').textContent = '2027년 정미년 · ' + rel.rel +
      (DAEBAK[idx] ? ' · ' + DAEBAK[idx] : '') +
      (sj && sj.inPeriod ? ' · ' + sj.phase : ' · 삼재 아님');
    $('#sjSanjae').textContent = sj && sj.inPeriod ? sj.phase : '해당 없음';
    $('#sjRelation').textContent = rel.rel.replace(' · ', '·');
    $('#sjBirth').textContent = y + '년생 (만 ' + (2027 - y) + '세)';

    var split = [];
    if (sj && sj.inPeriod) {
      split.push('<div><span>삼재 기간</span><strong>' + sj.periodStart + '~' + (sj.periodStart + 2) + '년</strong></div>');
      split.push('<div><span>다음 삼재</span><strong>' + (sj.periodStart + 12) + '~' + (sj.periodStart + 14) + '년</strong></div>');
    } else if (next && next.periodStart) {
      split.push('<div><span>다음 삼재</span><strong>' + next.periodStart + '~' + (next.periodStart + 2) + '년</strong></div>');
      split.push('<div><span>삼재까지</span><strong>' + (next.periodStart - 2027) + '년 남음</strong></div>');
    }
    split.push('<div><span>2027년 관계</span><strong>' + rel.rel + '</strong></div>');
    split.push('<div><span>대박 기운</span><strong>' + (DAEBAK[idx] ? DAEBAK[idx] : '해당 없음') + '</strong></div>');
    $('#sjSplit').innerHTML = split.join('');

    var advice = '<p><strong>' + name + '띠 · ' + rel.grade + '</strong> — ' + rel.text + '</p>';
    if (sj && sj.inPeriod) {
      advice += '<p><strong>' + sj.phase + ' 안내.</strong> ' +
        (sj.phase === '날삼재'
          ? '삼재가 빠져나가는 마지막 해입니다. 새 일을 크게 벌이기보다 지난 2년간 미뤄 둔 일을 정리하고 마무리하면 다음 9년이 가벼워집니다.'
          : sj.phase === '눌삼재'
            ? '삼재의 가운데 해입니다. 체력과 관계가 흔들리기 쉬우니 건강검진과 재무 점검처럼 나를 관리하는 일에 시간을 쓰세요.'
            : '삼재의 첫해입니다. 큰 투자나 창업처럼 되돌리기 어려운 결정은 조건을 한 번 더 확인하고 시작하세요.') + '</p>';
    }
    if (DAEBAK[idx] && rel.grade !== '대박띠') {
      advice += '<p><strong>대박띠.</strong> 2027년 띠 관계에서 좋은 자리입니다. 사람을 통해 기회가 오는 해로 보니, 제안이 오면 조건을 정리해 두었다가 받아 보세요.</p>';
    }
    $('#sjAdvice').innerHTML = advice;

    // 로또 탭의 생년월일도 함께 맞춰 둔다
    if (!$('#lottoBirth').value) $('#lottoBirth').value = $('#birthDate').value;
  }

  /* ---------------- 로또 번호 ---------------- */
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function pickNumbers(rand, count) {
    var pool = [];
    for (var i = 1; i <= 45; i++) pool.push(i);
    var out = [];
    for (var k = 0; k < count; k++) {
      var j = Math.floor(rand() * pool.length);
      out.push(pool.splice(j, 1)[0]);
    }
    return out.sort(function (a, b) { return a - b; });
  }

  function ballClass(n) {
    if (n <= 10) return 'y1';
    if (n <= 20) return 'y2';
    if (n <= 30) return 'y3';
    if (n <= 40) return 'y4';
    return 'y5';
  }
  function ballsHtml(nums, extraClass) {
    return nums.map(function (n) {
      return '<span class="ball ' + ballClass(n) + (extraClass ? ' ' + extraClass : '') + '">' + n + '</span>';
    }).join('');
  }

  var lottoState = { mode: 'seed', games: [], lucky: [] };

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function renderLucky() {
    var birth = $('#lottoBirth').value || '1984-02-20';
    var seed = hashSeed(todayKey() + '|' + birth + '|lucky');
    var rand = mulberry32(seed);
    lottoState.lucky = pickNumbers(rand, 5);
    $('#luckyRow').innerHTML = ballsHtml(lottoState.lucky, 'gold');
  }

  function renderGames(forceRandom) {
    var birth = $('#lottoBirth').value || '1984-02-20';
    var games = [];
    var baseSeed = lottoState.mode === 'seed' && !forceRandom
      ? hashSeed(birth + '|lotto')
      : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

    for (var g = 0; g < 5; g++) {
      var rand = mulberry32((baseSeed + g * 2654435761) >>> 0);
      games.push(pickNumbers(rand, 6));
    }
    lottoState.games = games;

    $('#lottoGames').innerHTML = games.map(function (nums, i) {
      return '<div class="game-row"><span class="game-no">' + (String.fromCharCode(65 + i)) + '</span>' +
        '<span class="game-balls">' + ballsHtml(nums) + '</span></div>';
    }).join('');

    $('#lottoNote').textContent = lottoState.mode === 'seed' && !forceRandom
      ? birth + ' 시드 · 같은 값이면 같은 번호'
      : '무작위 추출 · 누를 때마다 새 번호';
  }

  function copyText(text, btn) {
    function done(ok) {
      var original = btn.textContent;
      btn.textContent = ok ? '복사했어요' : '복사 실패';
      setTimeout(function () { btn.textContent = original; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
  }

  /* ---------------- 탭 ---------------- */
  var currentTab = 'sanjae';
  function activateTab(name, focus, updateHash) {
    if (name !== 'sanjae' && name !== 'lotto') name = 'sanjae';
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
        if (btn.getAttribute('data-tab') === 'lotto') {
          if (!$('#lottoBirth').value) $('#lottoBirth').value = $('#birthDate').value;
          renderLucky();
          renderGames();
        }
      });
    });
    tabbar.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        activateTab(currentTab === 'sanjae' ? 'lotto' : 'sanjae', true, true);
        e.preventDefault();
      }
    });
    if (location.hash === '#lotto') activateTab('lotto', false, false);
  }

  /* ---------------- 이벤트 ---------------- */
  function bind() {
    $('#birthDate').addEventListener('change', renderSanjae);
    $('#birthDate').addEventListener('input', renderSanjae);
    $$('.chip[data-birth]').forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-birth');
        $$('.chip[data-birth]').forEach(function (x) { x.classList.remove('is-active'); });
        c.classList.add('is-active');
        $('#birthDate').value = v;
        $('#lottoBirth').value = v;
        renderSanjae();
        renderLucky();
        renderGames();
      });
    });

    $('#sanjaeForm').addEventListener('submit', function (e) {
      e.preventDefault();
      renderSanjae();
    });

    $('#lottoBirth').addEventListener('change', function () {
      renderLucky();
      renderGames();
    });
    $('#lottoBirth').addEventListener('input', function () {
      renderLucky();
    });

    $$('#lottoModeSeg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        lottoState.mode = b.getAttribute('data-mode');
        $$('#lottoModeSeg .seg-btn').forEach(function (x) {
          var on = x === b;
          x.classList.toggle('is-active', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderGames();
      });
    });

    $('#lottoForm').addEventListener('submit', function (e) {
      e.preventDefault();
      renderGames(lottoState.mode === 'random');
    });

    $('#lottoAgain').addEventListener('click', function () { renderGames(true); });

    $('#luckyCopy').addEventListener('click', function () {
      copyText('오늘의 행운번호: ' + lottoState.lucky.join(' '), this);
    });
    $('#lottoCopy').addEventListener('click', function () {
      var lines = lottoState.games.map(function (nums, i) {
        return String.fromCharCode(65 + i) + ' ' + nums.join(' ');
      });
      copyText(lines.join('\n'), this);
    });
  }

  function init() {
    initTabs();
    bind();
    renderSanjae();
    renderLucky();
    renderGames();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__samjae = { zodiacYear: zodiacYear, zodiacIndex: zodiacIndex, samjaeInfo: samjaeInfo };
})();
