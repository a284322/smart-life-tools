/* =========================================================
   무료 원카드 타로 & 2027 정미년 궁합 – tarot.js
   · 메이저 아르카나 22장, 날짜+주제 시드로 하루 동안 같은 배열
   · 궁합: 띠(지지)·오행(천간) 상생상극 + 2027 정미년(화·토)
   · 입력값은 서버로 보내지 않습니다.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ---------------- 카드 데이터 ---------------- */
  var CARDS = [
    { num: '0', name: '바보', en: 'The Fool', glyph: '✦', keys: ['시작', '자유', '가능성'],
      up: '아직 아무것도 정해지지 않은 상태입니다. 준비가 덜 됐어도 첫발을 떼는 쪽이 길을 열어요.',
      rev: '가벼운 마음이 빈틈이 되기 쉬운 날입니다. 확인할 것은 확인하고 움직이세요.',
      adv: '계획을 세 줄에서 한 줄로 줄이고, 그 한 줄을 오늘 안에 해 보세요.' },
    { num: 'I', name: '마법사', en: 'The Magician', glyph: '∞', keys: ['의지', '재주', '실행'],
      up: '필요한 도구는 이미 손안에 있습니다. 말과 행동을 한 방향으로 모으면 결과가 따라옵니다.',
      rev: '말만 앞서거나 가진 것을 과신하고 있을 수 있습니다. 하나를 골라 끝까지 해 보세요.',
      adv: '오늘 도움을 청할 사람 한 명에게 먼저 연락해 보세요.' },
    { num: 'II', name: '여사제', en: 'The High Priestess', glyph: '☾', keys: ['직관', '비밀', '관찰'],
      up: '아직 드러나지 않은 정보가 있습니다. 서두르기보다 지켜볼 때 답이 보입니다.',
      rev: '혼자 품은 생각이 오해를 만들 수 있습니다. 중요한 것은 한 번 말로 꺼내세요.',
      adv: '결정 전에 하루만 묵혀 두세요. 밤의 생각이 낮의 판단을 고쳐 줍니다.' },
    { num: 'III', name: '여황제', en: 'The Empress', glyph: '⚘', keys: ['풍요', '돌봄', '결실'],
      up: '돌본 만큼 돌아오는 흐름입니다. 몸과 마음, 사람 사이를 넉넉히 챙기면 결실이 따라옵니다.',
      rev: '너무 많이 베풀어 정작 내 몫이 비어 있을 수 있습니다. 받는 것도 연습해 보세요.',
      adv: '오늘 한 끼는 제대로 챙겨 드세요. 컨디션이 결과를 바꿉니다.' },
    { num: 'IV', name: '황제', en: 'The Emperor', glyph: '♂', keys: ['질서', '책임', '안정'],
      up: '기준을 세우면 일이 빨라집니다. 원칙을 분명히 할수록 주변도 따라옵니다.',
      rev: '고집이 유연함을 밀어낼 수 있습니다. 내 방식이 유일한 답은 아닙니다.',
      adv: '해야 할 일 세 가지를 순서대로 적고, 첫 번째만 끝내세요.' },
    { num: 'V', name: '교황', en: 'The Hierophant', glyph: '✝', keys: ['배움', '조언', '전통'],
      up: '경험자의 조언이 지름길이 됩니다. 혼자 고민하기보다 물어보세요.',
      rev: '틀에 박힌 방식이 지금 상황과 맞지 않을 수 있습니다. 예외를 허용해 보세요.',
      adv: '오래된 방법 중 하나를 골라 그대로 따라 해 보세요.' },
    { num: 'VI', name: '연인', en: 'The Lovers', glyph: '♡', keys: ['선택', '인연', '조화'],
      up: '마음이 향하는 쪽이 분명해지는 날입니다. 관계에서는 솔직함이 가장 좋은 전략입니다.',
      rev: '두 마음이 엇갈리거나 선택을 미루고 있을 수 있습니다. 기준을 하나로 정하세요.',
      adv: '좋아하는 사람에게 짧은 안부 한 줄을 보내 보세요.' },
    { num: 'VII', name: '전차', en: 'The Chariot', glyph: '⚔', keys: ['추진', '승리', '통제'],
      up: '방향만 잡으면 속도가 붙습니다. 밀어붙일 때와 멈출 때를 구분하면 이깁니다.',
      rev: '욕심이 앞서면 균형을 잃습니다. 한 번에 하나만 밀고 나가세요.',
      adv: '오늘 미뤄 둔 연락 한 건을 지금 끝내세요.' },
    { num: 'VIII', name: '힘', en: 'Strength', glyph: '♌', keys: ['용기', '인내', '부드러움'],
      up: '세게 밀기보다 꾸준히 버티는 쪽이 이깁니다. 감정을 다스리면 상황이 풀립니다.',
      rev: '참는 것과 버티는 것은 다릅니다. 힘들면 도움을 요청하세요.',
      adv: '화가 나면 세 번 숨을 고르고 말하세요. 그 한 박자가 결과를 바꿉니다.' },
    { num: 'IX', name: '은둔자', en: 'The Hermit', glyph: '✧', keys: ['성찰', '거리두기', '지혜'],
      up: '잠깐 물러나 정리하는 시간이 필요합니다. 혼자만의 시간이 답을 줍니다.',
      rev: '너무 오래 숨어 있으면 기회를 놓칩니다. 문을 조금 열어 두세요.',
      adv: '오늘 30분은 알림을 끄고 혼자 걷거나 앉아 있어 보세요.' },
    { num: 'X', name: '운명의 수레바퀴', en: 'Wheel of Fortune', glyph: '✵', keys: ['전환', '타이밍', '순환'],
      up: '흐름이 바뀌는 지점입니다. 좋아졌다면 이어 가고, 막혔다면 방향을 틀 때입니다.',
      rev: '때를 기다리며 조급해하고 있을 수 있습니다. 내가 바꿀 수 있는 것부터 손대세요.',
      adv: '미뤄 둔 결정 하나에 오늘 기한을 정해 보세요.' },
    { num: 'XI', name: '정의', en: 'Justice', glyph: '⚖', keys: ['균형', '계약', '책임'],
      up: '공정하게 따지면 답이 나옵니다. 문서와 조건을 확인할수록 손해가 줄어듭니다.',
      rev: '한쪽으로 기울어진 판단이 있을 수 있습니다. 감정과 사실을 분리해 보세요.',
      adv: '돈이 오가는 약속은 오늘 문자로 남겨 두세요.' },
    { num: 'XII', name: '매달린 사람', en: 'The Hanged Man', glyph: '⛓', keys: ['멈춤', '관점', '내려놓기'],
      up: '지금은 움직이지 않는 것이 전략입니다. 시각을 바꾸면 보이지 않던 길이 보입니다.',
      rev: '멈춤이 핑계가 될 수 있습니다. 더 미루면 기회가 사라집니다.',
      adv: '포기할 것 하나를 오늘 정리하면 다음이 가벼워집니다.' },
    { num: 'XIII', name: '죽음', en: 'Death', glyph: '☠', keys: ['끝', '전환', '정리'],
      up: '한 장이 끝나고 새 장이 열립니다. 붙잡고 있던 것을 놓을 때 다음이 시작됩니다.',
      rev: '끝을 인정하지 못해 같은 자리를 맴돌 수 있습니다. 미련을 한 번 적어 보세요.',
      adv: '정리하지 못한 서랍 하나, 또는 연락처 하나를 정리하세요.' },
    { num: 'XIV', name: '절제', en: 'Temperance', glyph: '⚗', keys: ['조율', '균형', '회복'],
      up: '섞고 조절하면 더 좋아집니다. 속도와 양을 반으로 줄이면 오히려 성과가 납니다.',
      rev: '과하거나 모자란 상태입니다. 무리한 일정은 오늘 하나 줄이세요.',
      adv: '오늘 커피 한 잔이나 술 한 잔을 줄이는 작은 조절이 잘 맞습니다.' },
    { num: 'XV', name: '악마', en: 'The Devil', glyph: '◆', keys: ['집착', '유혹', '습관'],
      up: '편한 것에 끌리는 마음이 있습니다. 그 편함이 오래 갈 비용을 계산해 보세요.',
      rev: '끊으려던 습관이 다시 손짓합니다. 오늘 하루만 미루면 다시 잡힙니다.',
      adv: '지출 알림을 켜 두세요. 보이면 줄어듭니다.' },
    { num: 'XVI', name: '탑', en: 'The Tower', glyph: '▲', keys: ['급변', '균열', '진실'],
      up: '예상하지 못한 변화가 흐름을 바꿉니다. 무너진 자리에 더 단단한 것이 남습니다.',
      rev: '큰 사고는 피했지만 긴장이 남아 있습니다. 미리 점검하면 피해가 줄어듭니다.',
      adv: '오늘 중요한 결정은 하루 미루고, 대신 준비만 해 두세요.' },
    { num: 'XVII', name: '별', en: 'The Star', glyph: '★', keys: ['희망', '회복', '안내'],
      up: '어둠이 걷히고 방향이 보입니다. 멀리 두었던 목표를 다시 꺼내도 좋은 날입니다.',
      rev: '기대와 현실 사이가 벌어져 있습니다. 작은 목표로 다시 시작하세요.',
      adv: '올해 이루고 싶은 것 하나를 종이에 적어 눈에 보이게 두세요.' },
    { num: 'XVIII', name: '달', en: 'The Moon', glyph: '☽', keys: ['불확실', '감정', '착각'],
      up: '분위기가 흐릿한 날입니다. 확신보다 확인이 필요한 때예요.',
      rev: '오해가 풀릴 실마리가 보입니다. 먼저 물어보면 대부분 해결됩니다.',
      adv: '소문이나 짐작으로 판단하지 말고 당사자에게 직접 확인하세요.' },
    { num: 'XIX', name: '태양', en: 'The Sun', glyph: '☉', keys: ['성취', '기쁨', '명확'],
      up: '가장 밝은 흐름입니다. 숨기지 말고 드러낼수록 좋은 결과가 옵니다.',
      rev: '빛이 조금 가려져 있습니다. 기대를 낮추면 오히려 만족이 커집니다.',
      adv: '오늘 잘된 일 하나를 소리 내어 칭찬해 주세요.' },
    { num: 'XX', name: '심판', en: 'Judgement', glyph: '❂', keys: ['각성', '재회', '결산'],
      up: '지난 일을 정리하고 다시 부를 때입니다. 미뤄 둔 연락이 좋은 결과로 돌아옵니다.',
      rev: '과거의 실수를 되새기느라 앞으로 못 갈 수 있습니다. 결론을 내고 넘어가세요.',
      adv: '연락을 끊었던 사람이 떠오르면 짧게 안부를 전해 보세요.' },
    { num: 'XXI', name: '세계', en: 'The World', glyph: '❖', keys: ['완성', '성취', '통합'],
      up: '한 바퀴가 완성됩니다. 끝까지 마무리하면 다음 단계의 문이 열립니다.',
      rev: '마지막 한 걸음이 남았습니다. 완벽하지 않아도 끝내는 쪽이 낫습니다.',
      adv: '진행 중인 일 하나를 오늘 마무리 상태로 만들어 두세요.' }
  ];

  var TOPICS = {
    luck: '총운',
    love: '연애·인연',
    money: '금전·재물',
    work: '직장·이직'
  };

  var state = { topic: 'luck', picked: -1, deck: [] };

  /* ---------------- 시드 난수 ---------------- */
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rngFactory(seed) {
    var a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /* ---------------- 탭 ---------------- */
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

  /* ---------------- 덱 그리기 ---------------- */
  function buildDeck() {
    var rnd = rngFactory(hashStr(todayKey() + '|' + state.topic));
    var idx = [];
    for (var i = 0; i < CARDS.length; i++) idx.push(i);
    for (var j = idx.length - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var tmp = idx[j]; idx[j] = idx[k]; idx[k] = tmp;
    }
    state.deck = [];
    for (var m = 0; m < 5; m++) {
      state.deck.push({ card: idx[m], rev: rnd() < 0.36 });
    }
    state.picked = -1;

    var host = $('deck');
    var html = '';
    for (var n = 0; n < 5; n++) {
      html += '<button type="button" class="tarot-card" data-pick="' + n + '" aria-label="' + (n + 1) + '번째 카드 뽑기">'
        + '<span class="tc-inner">'
        + '<span class="tc-face tc-back"><span class="tc-no">' + (n + 1) + '</span></span>'
        + '<span class="tc-face tc-front"><span class="num">' + CARDS[idx[n]].num + '</span>'
        + '<span class="glyph">' + CARDS[idx[n]].glyph + '</span>'
        + '<span class="nm">' + CARDS[idx[n]].name + '</span>'
        + '<span class="en">' + CARDS[idx[n]].en + '</span></span>'
        + '</span></button>';
    }
    host.innerHTML = html;
    $('drawResult').hidden = true;
    $('deckHint').textContent = '마음속으로 질문을 떠올린 뒤, 카드 한 장을 눌러 주세요.';

    var cards = host.querySelectorAll('[data-pick]');
    for (var p = 0; p < cards.length; p++) {
      (function (el) {
        el.addEventListener('click', function () { pick(parseInt(el.getAttribute('data-pick'), 10)); });
      })(cards[p]);
    }
  }

  function pick(i) {
    if (state.picked >= 0) return;
    state.picked = i;
    var deckEls = $('deck').querySelectorAll('[data-pick]');
    for (var d = 0; d < deckEls.length; d++) {
      if (d === i) deckEls[d].classList.add('is-flipped');
      else deckEls[d].style.opacity = '.28';
    }
    renderDraw();
  }

  function renderDraw() {
    var pick = state.deck[state.picked];
    var c = CARDS[pick.card];
    var rev = pick.rev;

    $('drTitle').textContent = c.name;
    $('drEn').textContent = c.en;
    var badge = $('drBadge');
    badge.textContent = rev ? '역방향' : '정방향';
    badge.className = 'dr-badge ' + (rev ? 'rev' : 'up');

    var keysHtml = '';
    for (var i = 0; i < c.keys.length; i++) keysHtml += '<li>' + c.keys[i] + '</li>';
    $('drKeys').innerHTML = keysHtml;

    $('drTopic').textContent = '질문 · ' + TOPICS[state.topic];
    $('drText').textContent = rev ? c.rev : c.up;
    $('drAdvice').innerHTML = '<strong>오늘의 조언 · </strong>' + c.adv;

    var mini = $('drCard');
    mini.innerHTML = '<button type="button" class="tarot-card is-flipped" tabindex="-1" aria-hidden="true" style="transform:none;cursor:default">'
      + '<span class="tc-inner">'
      + '<span class="tc-face tc-back"></span>'
      + '<span class="tc-face tc-front' + (rev ? ' rev' : '') + '"><span class="num">' + c.num + '</span>'
      + '<span class="glyph">' + c.glyph + '</span><span class="nm">' + c.name + '</span>'
      + '<span class="en">' + (rev ? 'reversed' : 'upright') + '</span></span></span></button>';

    $('drawResult').hidden = false;
    $('deckHint').textContent = '카드를 눌러 확인했어요. 같은 날 같은 주제는 같은 카드가 나옵니다.';
    if (window.innerWidth <= 760) {
      var el = $('drawResult');
      var top = el.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  var topicBtns = document.querySelectorAll('[data-topic]');
  for (var tb = 0; tb < topicBtns.length; tb++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        state.topic = btn.getAttribute('data-topic');
        for (var i = 0; i < topicBtns.length; i++) {
          topicBtns[i].classList.toggle('is-active', topicBtns[i] === btn);
        }
        buildDeck();
      });
    })(topicBtns[tb]);
  }

  $('drawAgain').addEventListener('click', function () {
    buildDeck();
    var top = $('deck').getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });

  /* =======================================================
     2027 궁합
     ======================================================= */
  var ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var JI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
  var STEM = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var SAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
  var GEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
  var YEAR_LINE = [
    '새로운 인연이 들어오는 해입니다. 사람을 가리지 말고 만나 보세요.',
    '2027년 기운과 부딪히는 자리(충)라 급한 결정은 피하는 게 좋습니다.',
    '움직이면 성과가 나는 해입니다. 미뤄 둔 계획을 꺼내세요.',
    '실속이 쌓이는 해입니다. 큰 지출보다 작은 저축이 유리합니다.',
    '시야가 넓어지는 해입니다. 배움과 이동이 도움이 됩니다.',
    '관계가 정리되는 해입니다. 오래된 인연이 힘이 됩니다.',
    '속도보다 방향이 중요한 해입니다. 건강 관리도 함께 하세요.',
    '2027년의 주인공입니다. 중요한 제안이 들어오는 해예요.',
    '재주가 빛나는 해입니다. 부업이나 새 기술이 잘 맞습니다.',
    '마무리에 강한 해입니다. 정리 정돈이 곧 돈이 됩니다.',
    '사람 사이 신뢰가 커지는 해입니다. 약속을 지키면 크게 돌아옵니다.',
    '삼합으로 힘을 받는 해입니다. 재물과 인연이 함께 움직입니다.'
  ];

  var cmp = { a: null, b: null };

  function parseDate(v) {
    if (!v) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return null;
    var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
    if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y: y, m: mo, d: d };
  }

  function personOf(dateStr, lunar) {
    var dt = parseDate(dateStr);
    if (!dt) return null;
    var year = dt.y;
    var shifted = false;
    if (!lunar && (dt.m === 1 || (dt.m === 2 && dt.d <= 4))) {
      year -= 1;                 // 설날(입춘) 이전 출생은 이전 해 띠로 본다
      shifted = true;
    }
    var z = ((year - 4) % 12 + 12) % 12;
    var s = ((year - 4) % 10 + 10) % 10;
    return {
      year: year, month: dt.m, day: dt.d, lunar: !!lunar,
      z: z, zodiac: ZODIAC[z], ji: JI[z],
      stem: STEM[s], elem: ELEM[s], shifted: shifted
    };
  }

  function relation(e1, e2) {
    if (e1 === e2) return { key: 'same', label: '같은 오행(' + e1 + '·' + e2 + ')' };
    if (SAENG[e1] === e2 || SAENG[e2] === e1) return { key: 'saeng', label: '상생(' + e1 + '→' + e2 + ')' };
    if (GEUK[e1] === e2 || GEUK[e2] === e1) return { key: 'geuk', label: '상극(' + e1 + '·' + e2 + ')' };
    return { key: 'same', label: '무난한 조합(' + e1 + '·' + e2 + ')' };
  }

  function scoreOf(a, b) {
    var rel = relation(a.elem, b.elem);
    var s = 62;
    if (rel.key === 'saeng') s += 18;
    else if (rel.key === 'geuk') s -= 10;
    else s += 8;

    var SAMHAP = [11, 3, 7];           // 해·묘·미
    var samA = SAMHAP.indexOf(a.z) >= 0;
    var samB = SAMHAP.indexOf(b.z) >= 0;
    if (samA) s += 8;
    if (samB) s += 8;
    if (a.z === b.z) s += 6;
    if (a.z === 1 || b.z === 1) s -= 10;   // 축미충
    if (a.z === 7 || b.z === 7) s += 4;    // 2027년 띠
    return { score: clamp(Math.round(s), 32, 97), rel: rel };
  }

  function conflictMonth(z) {
    var c = (z + 6) % 12;
    return c === 0 ? 12 : c;
  }

  function renderCmp() {
    var a = cmp.a, b = cmp.b;
    if (!a || !b) return;
    var r = scoreOf(a, b);
    var sc = r.score;

    $('scoreNum').innerHTML = sc + '<small>점</small>';
    $('scoreRing').style.setProperty('--pct', sc);

    var headline = sc >= 85 ? '서로의 기운이 잘 통하는 사이'
      : (sc >= 70 ? '노력하면 더 좋아지는 사이'
        : (sc >= 55 ? '무난하지만 속도 조절이 필요한 사이' : '서로 다른 점을 이해해야 하는 사이'));
    $('cmpHeadline').textContent = headline;
    $('cmpLead').textContent = a.zodiac + '띠(' + a.ji + '·' + a.elem + ')와 ' + b.zodiac + '띠(' + b.ji + '·' + b.elem + ')의 조합을 2027 정미년(丁未·화·토) 기운에 비춰 봤습니다.';

    $('cmpPair').innerHTML =
      '<span>' + (a.name || '나') + ' · ' + a.zodiac + '띠 · ' + a.elem + '·' + a.stem + '</span>'
      + '<span>' + (b.name || '상대') + ' · ' + b.zodiac + '띠 · ' + b.elem + '·' + b.stem + '</span>'
      + '<span>오행 ' + r.rel.label + '</span>';

    /* 잘 맞는 점 */
    var good = [];
    if (r.rel.key === 'saeng') good.push('두 사람의 오행이 ' + r.rel.label + '으로 이어집니다. 한쪽이 기울면 다른 쪽이 자연스럽게 받쳐 주는 관계예요.');
    else if (r.rel.key === 'geuk') good.push('오행은 ' + r.rel.label + '이지만, 서로의 부족한 점을 정확히 짚어 주는 사이입니다. 피드백을 고맙게 받으면 크게 성장합니다.');
    else good.push('오행이 ' + r.rel.label + '이라 설명이 필요 없는 편안함이 있습니다. 취향과 생활 리듬이 비슷해 함께 있는 시간이 편해요.');

    if (a.z === b.z) good.push('같은 ' + a.zodiac + '띠라 고민의 결이 비슷합니다. 말하지 않아도 알아주는 부분이 있어요.');
    var SAMHAP = [11, 3, 7];
    if (SAMHAP.indexOf(a.z) >= 0 && SAMHAP.indexOf(b.z) >= 0) good.push('두 사람 모두 2027년과 삼합(亥卯未)을 이루는 띠라, 올해 함께하는 일이 잘 풀립니다.');
    else if (SAMHAP.indexOf(a.z) >= 0 || SAMHAP.indexOf(b.z) >= 0) good.push('한 사람이 2027년과 삼합을 이루는 띠라, 올해의 기운을 상대에게 나눠 줄 수 있습니다.');

    // 인연·재물·일 중 잘 맞는 분야
    if (a.elem === '화' || b.elem === '화') good.push('2027년은 화(火)의 해입니다. 두 사람 중 화의 기운이 있는 쪽이 분위기를 밝히고 추진력을 만듭니다.');
    if (a.elem === '토' || b.elem === '토') good.push('토(土)의 기운이 있어 올해의 중심을 잡아 줍니다. 돈과 생활에서 안정감을 만들어요.');

    var goodHtml = '';
    for (var i = 0; i < good.length; i++) goodHtml += '<li>' + good[i] + '</li>';
    $('cmpGood').innerHTML = goodHtml;

    /* 조심할 시기 */
    var m1 = conflictMonth(a.z), m2 = conflictMonth(b.z);
    var warn = [];
    warn.push('<strong>2027년 ' + m1 + '월</strong>은 ' + (a.name || '나') + '의 띠(' + a.zodiac + ')와 부딪히는 달입니다. 큰 결정이나 말다툼을 피하세요.');
    if (m2 !== m1) warn.push('<strong>2027년 ' + m2 + '월</strong>은 ' + (b.name || '상대') + '의 띠(' + b.zodiac + ')에 힘이 실리는 달이라, 상대의 주장이 강해질 수 있습니다.');
    warn.push('<strong>2027년 7월(미월)</strong>은 정미년의 기운이 한곳에 몰리는 달입니다. 두 사람 모두 감정이 앞서기 쉬우니, 중요한 이야기는 8월로 미루는 편이 좋습니다.');
    var warnHtml = '';
    for (var w = 0; w < warn.length; w++) warnHtml += '<li>' + warn[w] + '</li>';
    $('cmpWarn').innerHTML = warnHtml;

    /* 각자의 2027년 */
    $('cmpYearA').innerHTML = '<strong>' + (a.name || '나') + ' · ' + a.zodiac + '띠</strong> — ' + YEAR_LINE[a.z];
    $('cmpYearB').innerHTML = '<strong>' + (b.name || '상대') + ' · ' + b.zodiac + '띠</strong> — ' + YEAR_LINE[b.z];

    var shiftNote = '';
    if (a.shifted || b.shifted) shiftNote = ' 양력 1~2월 초 출생은 설날 이전이라 이전 해 띠로 계산했습니다.';
    $('cmpFoot').textContent = '띠와 오행은 생년(음력 기준)으로 계산합니다.' + shiftNote + ' 재미로 보는 풀이이며, 두 사람의 관계를 정하는 기준은 아닙니다.';

    $('cmpResult').hidden = false;

    // 공유 URL 갱신
    var params = new URLSearchParams();
    params.set('a', $('birthA').value);
    params.set('b', $('birthB').value);
    params.set('ac', cmp.a.lunar ? 'l' : 's');
    params.set('bc', cmp.b.lunar ? 'l' : 's');
    if ($('nameA').value) params.set('an', $('nameA').value);
    if ($('nameB').value) params.set('bn', $('nameB').value);
    history.replaceState(null, '', location.pathname + '?' + params.toString() + '#cmp');
  }

  $('cmpForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var a = personOf($('birthA').value, $('calA').value === 'l');
    var b = personOf($('birthB').value, $('calB').value === 'l');
    if (!a || !b) {
      $('cmpError').hidden = false;
      $('cmpError').textContent = '두 사람의 생년월일을 모두 입력해 주세요.';
      return;
    }
    $('cmpError').hidden = true;
    cmp.a = a; cmp.b = b;
    renderCmp();
    if (window.innerWidth <= 1000) {
      var el = $('cmpResult');
      var top = el.getBoundingClientRect().top + window.pageYOffset - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  });

  var calBtns = document.querySelectorAll('[data-cal]');
  for (var cb = 0; cb < calBtns.length; cb++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.getAttribute('data-cal-for');
        var val = btn.getAttribute('data-cal');
        var target = $(group === 'a' ? 'calA' : 'calB');
        target.value = val;
        var sibs = document.querySelectorAll('[data-cal-for="' + group + '"]');
        for (var i = 0; i < sibs.length; i++) sibs[i].classList.toggle('is-active', sibs[i] === btn);
      });
    })(calBtns[cb]);
  }

  /* 공유 */
  function toast(msg) {
    var el = $('shareToast');
    el.textContent = msg;
    el.classList.add('is-on');
    setTimeout(function () { el.classList.remove('is-on'); }, 2400);
  }

  $('shareBtn').addEventListener('click', function () {
    var url = location.href;
    var title = '2027 정미년 궁합';
    var text = ($('nameA').value || '나') + '와 ' + ($('nameB').value || '상대') + '의 2027년 궁합: ' + $('scoreNum').textContent;
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast('링크를 복사했어요. 붙여넣기로 공유하세요.'); },
        function () { toast('주소창의 링크를 복사해 공유해 주세요.'); });
    } else {
      toast('주소창의 링크를 복사해 공유해 주세요.');
    }
  });

  /* ---------------- 시작 ---------------- */
  buildDeck();

  var q = new URLSearchParams(location.search);
  if (q.get('a') && q.get('b')) {
    $('birthA').value = q.get('a');
    $('birthB').value = q.get('b');
    $('calA').value = q.get('ac') === 'l' ? 'l' : 's';
    $('calB').value = q.get('bc') === 'l' ? 'l' : 's';
    if (q.get('an')) $('nameA').value = q.get('an');
    if (q.get('bn')) $('nameB').value = q.get('bn');
    var a0 = personOf(q.get('a'), q.get('ac') === 'l');
    var b0 = personOf(q.get('b'), q.get('bc') === 'l');
    if (a0 && b0) {
      cmp.a = a0; cmp.b = b0;
      renderCmp();
      // 궁합 탭으로
      var btn = document.querySelector('[data-tab="cmp"]');
      if (btn) btn.click();
      var sibsA = $('calA').value === 'l' ? 'l' : 's';
      var sA = document.querySelector('[data-cal-for="a"][data-cal="' + sibsA + '"]');
      var sB = document.querySelector('[data-cal-for="b"][data-cal="' + ($('calB').value === 'l' ? 'l' : 's') + '"]');
      if (sA) sA.classList.add('is-active');
      if (sB) sB.classList.add('is-active');
    }
  }
})();
