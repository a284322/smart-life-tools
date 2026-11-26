/* =========================================================
   2027 정미년 신년운세 – fortune.js
   생년월일 → (음양력 변환) → 년주·일주·월지·시지 → 2027 정미와의
   십성·지지 관계 → 영역별 점수·문장 생성. 외부 의존: kor-lunar(KASI)
   ========================================================= */
(function () {
  'use strict';

  var K = window.korLunar || null;

  /* ---------- 기본 표 ---------- */
  var GAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var GAN_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var GAN_E = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
  var JI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var JI_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var JI_E = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
  var ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var ANIMAL_H = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '犬', '猪'];

  var ELEM_H = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
  var GEN = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
  var CTRL = { '목': '토', '토': '수', '수': '화', '화': '금', '금': '목' };

  var YEARGAN_2027 = 3;  // 정(丁)
  var YEARJI_2027 = 7;   // 미(未)

  /* ---------- 지지 관계 ---------- */
  var HAP6 = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
  var CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  var HYUNG = [[2, 5, 8], [1, 10, 7], [0, 3]];
  var WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];

  function pairIn(list, a, b) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) return true;
    }
    return false;
  }
  function tripleIn(list, a, b) {
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.indexOf(a) >= 0 && t.indexOf(b) >= 0 && a !== b) return true;
    }
    return false;
  }
  function relBetween(a, b) {
    if (a === b) return 'same';
    if (pairIn(HAP6, a, b)) return 'hap';
    if (tripleIn(SAMHAP, a, b)) return 'sam';
    if (pairIn(CHUNG, a, b)) return 'chung';
    if (tripleIn(HYUNG, a, b)) return 'hyung';
    if (pairIn(WONJIN, a, b)) return 'wonjin';
    return 'none';
  }

  /* ---------- 절기 기준 월지 ---------- */
  var MONTH_START = [
    {m: 1, d: 6, j: 1}, {m: 2, d: 4, j: 2}, {m: 3, d: 6, j: 3},
    {m: 4, d: 5, j: 4}, {m: 5, d: 6, j: 5}, {m: 6, d: 6, j: 6},
    {m: 7, d: 7, j: 7}, {m: 8, d: 8, j: 8}, {m: 9, d: 8, j: 9},
    {m: 10, d: 8, j: 10}, {m: 11, d: 7, j: 11}, {m: 12, d: 7, j: 0}
  ];
  function birthMonthJi(sm, sd) {
    var cur = 0; // 1월 1~5일은 자월(子月)
    for (var i = 0; i < MONTH_START.length; i++) {
      var b = MONTH_START[i];
      if (sm > b.m || (sm === b.m && sd >= b.d)) cur = b.j;
    }
    return cur;
  }

  /* ---------- 해시 (같은 입력 → 같은 결과) ---------- */
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /* ---------- 십성 ---------- */
  function tenGod(selfGan, otherGan) {
    var se = GAN_E[selfGan], oe = GAN_E[otherGan];
    var key, label, same = (selfGan % 2) === (otherGan % 2);
    if (se === oe) { key = '비겁'; label = same ? '비견' : '겁재'; }
    else if (GEN[se] === oe) { key = '식상'; label = same ? '식신' : '상관'; }
    else if (GEN[oe] === se) { key = '인성'; label = same ? '편인' : '정인'; }
    else if (CTRL[se] === oe) { key = '재성'; label = same ? '편재' : '정재'; }
    else { key = '관성'; label = same ? '편관' : '정관'; }
    return { key: key, label: label };
  }

  var GOD_SHORT = {
    비겁: '나와 같은 기운이 겹치는 자리라 경쟁과 자립이 함께 옵니다.',
    식상: '내 기운이 밖으로 나가는 자리라 표현하고 움직이는 만큼 성과가 됩니다.',
    재성: '내가 다스리는 기운이 들어오는 자리라 돈과 현실 감각이 살아납니다.',
    관성: '나를 누르며 세우는 기운이 들어오는 자리라 책임과 성장이 함께 옵니다.',
    인성: '나를 채워 주는 기운이 들어오는 자리라 배움과 도움이 따라옵니다.'
  };

  /* ---------- 문장 자원 ---------- */
  var KEYWORDS = {
    재성: ['거두는 해', '값을 매기는 해'],
    관성: ['세워지는 해', '이름이 붙는 해'],
    인성: ['채우는 해', '숨 고르는 해'],
    식상: ['펼치는 해', '말이 통해지는 해'],
    비겁: ['가다듬는 해', '나를 세우는 해']
  };

  var ONELINE = {
    재성: [
      '노력이 숫자로 바뀝니다. 벌고 쓰는 감각이 또렷해지는 한 해예요.',
      '현실 감각이 살아납니다. 확인하고 옮기는 일이 곧 성과가 되는 해예요.'
    ],
    관성: [
      '기준이 생기고 맡은 일이 자리를 잡습니다. 책임이 곧 실력이 되는 해예요.',
      '규율이 나를 지켜 줍니다. 해야 할 일을 순서대로 하면 결과가 따라와요.'
    ],
    인성: [
      '배우고 쉬는 사이에 다음이 준비됩니다. 서두르지 않아도 늦지 않은 해예요.',
      '도움과 정보가 들어옵니다. 받은 만큼 정리해 두면 내 것이 돼요.'
    ],
    식상: [
      '가만히 있으면 아까운 해예요. 말하고 만들고 움직일수록 커집니다.',
      '표현이 무기가 됩니다. 밖으로 내놓은 것이 기회를 데려와요.'
    ],
    비겁: [
      '동료와 경쟁 사이에서 내 몫을 확인하는 해예요. 비교보다 정리가 필요합니다.',
      '기운이 넘치는 만큼 부딪히기 쉬워요. 페이스를 나누면 오래 갑니다.'
    ]
  };

  var LUCK_TEXT = {
    재물: {
      재성: [
        '돈이 도는 길이 짧아지는 해예요. 들어온 돈을 쓸 곳에 바로 붙이면 남는 게 눈에 보입니다.',
        '버는 힘보다 모으는 힘이 붙는 해예요. 저축 통장을 하나 더 만들면 체감이 큽니다.'
      ],
      관성: [
        '벌이가 안정되는 쪽으로 움직여요. 급한 투자보다 자리 잡은 수입을 키우는 편이 맞습니다.',
        '성과가 평가로 이어져 수입이 따라옵니다. 한 일을 기록으로 남겨 두세요.'
      ],
      인성: [
        '큰돈보다 새는 돈을 막는 해예요. 고정지출을 한 번 정리하면 남는 금액이 달라집니다.',
        '배움에 쓴 돈이 나중에 값이 됩니다. 지금은 아끼는 쪽이 이기는 해예요.'
      ],
      식상: [
        '아이디어가 돈이 되는 해예요. 부업·제안·콘텐츠처럼 손을 움직이는 일에 기회가 있습니다.',
        '만들어서 내놓는 쪽이 잘 풀립니다. 작게라도 결과물을 밖에 꺼내 보세요.'
      ],
      비겁: [
        '지출이 앞서기 쉬운 해예요. 함께하는 자리에서 쓰는 돈에 한도를 정해 두면 좋습니다.',
        '벌기보다 지키는 해로 잡으세요. 큰 베팅은 다음으로 미루는 편이 낫습니다.'
      ]
    },
    직장: {
      재성: [
        '성과가 숫자로 인정받는 해예요. 목표를 금액과 기한으로 세워 보세요.',
        '일의 우선순위가 분명해집니다. 돈이 되는 일부터 정리하면 흐름이 트여요.'
      ],
      관성: [
        '맡은 일이 커지고 이름이 붙는 해예요. 책임을 피하지 않으면 다음 자리가 보입니다.',
        '규칙을 지키는 사람이 인정받습니다. 문서와 보고를 꼼꼼히 챙기세요.'
      ],
      인성: [
        '자격·교육·이직 준비에 힘이 실리는 해예요. 공부한 만큼 바로 써먹습니다.',
        '윗사람의 지원이 따라오는 해예요. 도움을 청하는 쪽이 더 빨리 갑니다.'
      ],
      식상: [
        '내 방식이 통하는 해예요. 새 업무나 새 프로젝트를 직접 제안해 보세요.',
        '말과 글에서 성과가 나옵니다. 발표와 기획을 맡으면 좋은 해예요.'
      ],
      비겁: [
        '팀 안에서 경쟁이 붙는 해예요. 비교보다 내 강점 하나를 숫자로 만들면 이깁니다.',
        '혼자보다 같이 할 때 커집니다. 다만 역할과 몫은 처음에 분명히 하세요.'
      ]
    },
    애정: {
      재성: [
        '마음이 현실로 옮겨가는 해예요. 어렴풋하던 사이가 만남과 약속으로 이어집니다.',
        '현실적인 조건을 함께 보게 됩니다. 돈 이야기를 꺼내도 관계가 상하지 않아요.'
      ],
      관성: [
        '책임 있는 관계로 넘어가기 좋은 해예요. 다만 상대의 기준을 먼저 물어보세요.',
        '한 사람에게 마음을 정리하는 해예요. 약속을 미루면 흐름이 흐려집니다.'
      ],
      인성: [
        '가족과 오랜 인연이 편안해지는 해예요. 새 인연보다 깊어지는 쪽이 좋습니다.',
        '돌봄이 관계를 살립니다. 먼저 챙기는 사람이 끝까지 남습니다.'
      ],
      식상: [
        '표현이 관계를 살리는 해예요. 먼저 말을 걸고 먼저 고마움을 전해 보세요.',
        '함께 웃을 일을 만드는 해예요. 재미가 곧 인연이 됩니다.'
      ],
      비겁: [
        '친구와 동료 사이가 활발한 해예요. 다만 감정 경쟁은 피하는 게 좋습니다.',
        '사람이 모이는 해예요. 다만 마음이 앞설 때 한 번만 더 확인하세요.'
      ]
    },
    건강: {
      재성: [
        '많이 움직이는 해예요. 과식과 야식만 줄여도 컨디션이 달라집니다.',
        '일이 늘어 몸을 챙기기 어려운 해예요. 식사 시간만 지켜도 버팁니다.'
      ],
      관성: [
        '긴장이 몸에 남기 쉬운 해예요. 어깨와 목을 자주 풀어 주세요.',
        '자세가 컨디션을 좌우해요. 앉아 있는 시간을 줄이고 중간에 일어나세요.'
      ],
      인성: [
        '쉬는 시간이 약이 되는 해예요. 잠을 줄이면 그만큼 흐려집니다.',
        '몸을 돌보는 데 쓴 돈이 아깝지 않은 해예요. 검진 한 번이 마음을 놓게 합니다.'
      ],
      식상: [
        '활동량이 늘어나는 해예요. 다칠 수 있는 자리에서는 준비를 갖추세요.',
        '말하고 다니는 일이 많아 기운이 소모돼요. 물을 자주 드세요.'
      ],
      비겁: [
        '체력이 버텨 주지만 무리하면 한 번에 옵니다. 페이스를 나눠 쓰세요.',
        '함께하는 운동이 잘 맞는 해예요. 혼자보다 같이 하면 오래 갑니다.'
      ]
    }
  };

  var REL_NOTE = {
    hap: '2027년의 미(未)가 당신의 지지와 육합(六合)을 이뤄요. 사람과 인연이 자연스럽게 붙는 한 해입니다.',
    sam: '미(未)가 당신의 지지와 삼합(三合)을 이뤄요. 함께하는 일에서 힘이 곱해집니다.',
    same: '2027년과 같은 지지(未)를 가진 해예요. 흐름이 두 배로 오니 페이스 조절이 중요합니다.',
    chung: '미(未)가 당신의 지지와 충(沖)해요. 판이 흔들리는 해라 옮기고 바꾸는 일은 서두르지 마세요.',
    hyung: '미(未)가 당신의 지지와 형(刑)해요. 말과 서류에서 오해가 생기기 쉬우니 확인을 한 번 더 하세요.',
    wonjin: '미(未)가 당신의 지지와 원진(怨嗔)이에요. 가까운 사이일수록 말이 날카로워질 수 있어요.',
    none: '미(未)와 특별한 합도 충도 없는 담백한 조합이에요. 내 페이스대로 가면 되는 해입니다.'
  };

  var REL_LABEL = { hap: '육합', sam: '삼합', same: '같은 지지', chung: '충', hyung: '형', wonjin: '원진', none: '무난' };

  var MONTH_BASE = { hap: 90, sam: 86, same: 76, none: 72, hyung: 63, chung: 58, wonjin: 56 };

  var MONTH_GOOD_NOTE = {
    hap: '사람이 붙는 달이라 만남·제안·면접에 좋습니다.',
    sam: '힘이 보태지는 달이라 함께하는 일이 잘 풀립니다.',
    same: '흐름이 겹치는 달이라 밀기보다 정리하며 가면 좋습니다.',
    none: '무난하게 흐르는 달이라 미뤄 둔 일을 붙이기 좋습니다.',
    hyung: '말이 꼬이기 쉬운 달이라 확인을 한 번 더 하세요.',
    chung: '판이 흔들리는 달이라 큰 결정은 다음으로 미루세요.',
    wonjin: '감정이 흔들리기 쉬워 말을 아끼는 편이 좋습니다.'
  };

  var MONTH_BAD_NOTE = {
    hap: '합이 들어도 일이 몰릴 수 있으니 한 번에 다 하려 하지 마세요.',
    sam: '도움은 있지만 기대가 커지기 쉬운 달이에요. 선을 지키세요.',
    same: '흐름이 겹치는 달이라 같은 일이 반복될 수 있어요.',
    none: '특별한 기운은 없지만 서두르면 흐트러지기 쉬운 달이에요.',
    hyung: '말과 서류에서 오해가 생기기 쉬운 달이에요.',
    chung: '판이 흔들리는 달이라 큰 결정은 다음으로 미루세요.',
    wonjin: '감정이 흔들리기 쉬운 달이라 말을 아끼세요.'
  };

  var MONTH_REL_PREFIX = {
    hap: '육합이 들어와 ', sam: '삼합이 들어와 ', same: '같은 지지가 겹쳐 ',
    none: '', hyung: '형(刑)이 걸려 ', chung: '충(沖)이 들어 ', wonjin: '원진이 걸려 '
  };

  var ELEM_LUCK = {
    목: { color: '청록·연두', hex: '#3f7d4e', nums: '3 · 8', dir: '동쪽' },
    화: { color: '주홍·자주', hex: '#c0392b', nums: '2 · 7', dir: '남쪽' },
    토: { color: '한지 노랑·베이지', hex: '#c9a227', nums: '5 · 10', dir: '가운데(남서쪽)' },
    금: { color: '아이보리·은회색', hex: '#b9b2a1', nums: '4 · 9', dir: '서쪽' },
    수: { color: '먹빛·감청', hex: '#2b3a55', nums: '1 · 6', dir: '북쪽' }
  };

  var ELEM_TIP = {
    목: '나무의 기운은 시작과 성장입니다. 아침 산책이나 초록 식물이 도움이 됩니다.',
    화: '불의 기운은 열정과 표현입니다. 볕을 쬐고 밝은 색을 가까이 두세요.',
    토: '흙의 기운은 중심과 안정입니다. 규칙적인 식사와 정리가 마음을 잡아 줍니다.',
    금: '쇠의 기운은 결단과 정리입니다. 미룬 결정을 하나 처리하면 흐름이 트입니다.',
    수: '물의 기운은 지혜와 유연함입니다. 물을 자주 마시고 잠을 충분히 자세요.'
  };

  var LUCK_META = [
    { key: '재물', name: '재물운', glyph: '財' },
    { key: '직장', name: '직장·사업운', glyph: '官' },
    { key: '애정', name: '애정·대인운', glyph: '緣' },
    { key: '건강', name: '건강운', glyph: '身' }
  ];

  var ADJ = {
    재물: { 재성: 14, 식상: 10, 관성: 3, 인성: -4, 비겁: -9 },
    직장: { 관성: 14, 인성: 9, 재성: 4, 식상: 2, 비겁: -7 },
    애정: { 식상: 8, 재성: 4, 관성: 3, 인성: 2, 비겁: -6 },
    건강: { 인성: 10, 비겁: 7, 식상: 2, 재성: -5, 관성: -8 }
  };

  var REL_ADJ = {
    hap: { 애정: 15, 재물: 4, 직장: 5, 건강: 2 },
    sam: { 애정: 10, 재물: 4, 직장: 5, 건강: 2 },
    same: { 애정: 3, 재물: 1, 직장: 1, 건강: -1 },
    none: { 애정: 0, 재물: 0, 직장: 0, 건강: 0 },
    hyung: { 애정: -6, 재물: -3, 직장: -3, 건강: -2 },
    chung: { 애정: -11, 재물: -4, 직장: -4, 건강: -3 },
    wonjin: { 애정: -12, 재물: -3, 직장: -2, 건강: -2 }
  };

  var MONTH_JI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]; // 1월~12월

  /* ---------- 유틸 ---------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- 분석 ---------- */
  function analyze(input) {
    var y = input.y, m = input.m, d = input.d;
    var solar, lunar;

    if (input.isLunar) {
      var s = K.toSolar(y, m, d, !!input.leap);
      solar = { y: s.year, m: s.month, d: s.day };
      lunar = { y: y, m: m, d: d, leap: !!input.leap };
    } else {
      solar = { y: y, m: m, d: d };
      var l = K.toLunar(y, m, d);
      lunar = { y: l.year, m: l.month, d: l.day, leap: !!l.isLeapMonth };
    }

    // 시드는 양력 날짜 기준 – 양력·음력 어느 쪽으로 넣어도 같은 결과가 나온다
    var seed = hash([solar.y, solar.m, solar.d, input.gender, input.hour].join('|'));
    function rnd(salt, mod) { return hash(seed + '|' + salt) % mod; }

    // 년주: 음력 연도 기준 세차
    var lunarInfo = K.toLunar(solar.y, solar.m, solar.d);
    var secha = lunarInfo.sechaHanja || ''; // 예: '丁未'
    var yearGan = GAN_H.indexOf(secha.charAt(0));
    var yearJi = JI_H.indexOf(secha.charAt(1));
    if (yearGan < 0 || yearJi < 0) throw new Error('year pillar');

    // 일주
    var iljin = lunarInfo.iljinHanja || '';
    var dayGan = GAN_H.indexOf(iljin.charAt(0));
    var dayJi = JI_H.indexOf(iljin.charAt(1));
    if (dayGan < 0 || dayJi < 0) throw new Error('day pillar');

    var monthJi = birthMonthJi(solar.m, solar.d);
    var hourJi = input.hour >= 0 ? input.hour : -1;

    // 십성 · 지지 관계
    var god = tenGod(dayGan, YEARGAN_2027);
    var rel = relBetween(dayJi, YEARJI_2027);

    // 오행 분포 (월지는 계절이라 두 번 센다)
    var counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    counts[GAN_E[yearGan]] += 1;
    counts[JI_E[yearJi]] += 1;
    counts[JI_E[monthJi]] += 2;
    counts[GAN_E[dayGan]] += 1;
    counts[JI_E[dayJi]] += 1;
    if (hourJi >= 0) counts[JI_E[hourJi]] += 1;

    var order = ['목', '화', '토', '금', '수'];
    var minElem = order[0], maxElem = order[0];
    for (var i = 1; i < order.length; i++) {
      var e = order[i];
      if (counts[e] < counts[minElem]) minElem = e;
      if (counts[e] > counts[maxElem]) maxElem = e;
    }
    // 가장 적은 기운이 여럿이면 해시로 하나 선택
    var tied = order.filter(function (e) { return counts[e] === counts[minElem]; });
    var needElem = tied.length > 1 ? tied[rnd('need', tied.length)] : minElem;

    // 점수
    var base = 64 + rnd('base', 12);
    var scores = {};
    var totalSum = 0;
    LUCK_META.forEach(function (meta) {
      var adj = ADJ[meta.key][god.key] + REL_ADJ[rel][meta.key] + (rnd(meta.key + 'score', 9) - 4);
      var sc = clamp(Math.round(base + adj), 56, 97);
      scores[meta.key] = sc;
      totalSum += sc;
    });
    var total = clamp(Math.round(totalSum / LUCK_META.length), 56, 97);

    // 월별
    var months = [];
    for (var mo = 1; mo <= 12; mo++) {
      var b = MONTH_JI[mo - 1];
      var mrel = relBetween(dayJi, b);
      var msc = clamp(MONTH_BASE[mrel] + (rnd('m' + mo, 7) - 3), 48, 96);
      months.push({ month: mo, ji: b, rel: mrel, score: msc });
    }
    var sorted = months.slice().sort(function (a, b2) {
      if (b2.score !== a.score) return b2.score - a.score;
      return a.month - b.month;
    });
    var goodMonths = sorted.slice(0, 2).sort(function (a, b2) { return a.month - b2.month; });
    var badMonths = sorted.slice(-2).sort(function (a, b2) { return a.month - b2.month; });

    var P = null; // (사용하지 않음)

    var luckTexts = {};
    LUCK_META.forEach(function (meta) {
      var arr = LUCK_TEXT[meta.key][god.key];
      luckTexts[meta.key] = arr[rnd(meta.key + 'txt', arr.length)];
    });

    return {
      input: input,
      solar: solar,
      lunar: lunar,
      yearGan: yearGan,
      yearJi: yearJi,
      dayGan: dayGan,
      dayJi: dayJi,
      monthJi: monthJi,
      hourJi: hourJi,
      god: god,
      rel: rel,
      counts: counts,
      needElem: needElem,
      strongElem: maxElem,
      scores: scores,
      total: total,
      months: months,
      goodMonths: goodMonths,
      badMonths: badMonths,
      keyword: KEYWORDS[god.key][rnd('kw', KEYWORDS[god.key].length)],
      oneline: ONELINE[god.key][rnd('ol', ONELINE[god.key].length)],
      luckTexts: luckTexts,
      seed: seed,
      rnd: rnd
    };
  }

  /* ---------- 화면 ---------- */
  var $ = function (id) { return document.getElementById(id); };

  var form = $('fortuneForm');
  var yearSel = $('birthYear');
  var monthSel = $('birthMonth');
  var daySel = $('birthDay');
  var hourSel = $('birthHour');
  var leapWrap = $('leapWrap');
  var leapInput = $('leap');
  var errBox = $('fError');
  var resultBox = $('result');
  var toast = $('fToast');

  var state = { cal: 's', gender: '' };
  var current = null;

  function opt(v, label) {
    var o = document.createElement('option');
    o.value = String(v);
    o.textContent = label;
    return o;
  }

  function buildSelects() {
    var i;
    yearSel.appendChild(opt('', '년도'));
    for (i = 2026; i >= 1930; i--) yearSel.appendChild(opt(i, i + '년'));

    monthSel.appendChild(opt('', '월'));
    for (i = 1; i <= 12; i++) monthSel.appendChild(opt(i, i + '월'));

    refreshDays();
  }

  function refreshDays() {
    var keep = daySel.value;
    var y = parseInt(yearSel.value, 10);
    var m = parseInt(monthSel.value, 10);
    var max = 31;
    if (state.cal === 'l') {
      max = 30;
    } else if (y && m) {
      max = new Date(y, m, 0).getDate();
    }
    daySel.innerHTML = '';
    daySel.appendChild(opt('', '일'));
    for (var i = 1; i <= max; i++) daySel.appendChild(opt(i, i + '일'));
    if (keep && parseInt(keep, 10) <= max) daySel.value = keep;
  }

  function setCal(cal) {
    state.cal = cal;
    var btns = document.querySelectorAll('[data-cal]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-cal') === cal ? 'true' : 'false');
    }
    leapWrap.classList.toggle('is-on', cal === 'l');
    if (cal !== 'l') leapInput.checked = false;
    $('calHint').textContent = cal === 'l'
      ? '음력 생일은 그 해 음력 날짜로 넣어 주세요. 띠는 설날(음력 1월 1일)을 기준으로 정해집니다.'
      : '태어난 날짜를 양력으로 넣어 주세요. 음력 생일이면 위에서 음력을 고르면 됩니다.';
    refreshDays();
  }

  function setGender(g) {
    state.gender = g;
    var btns = document.querySelectorAll('[data-gender]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-gender') === g ? 'true' : 'false');
    }
  }

  function showError(msg) {
    if (!msg) { errBox.textContent = ''; errBox.classList.remove('is-on'); return; }
    errBox.textContent = msg;
    errBox.classList.add('is-on');
  }

  function stars(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }
  function starCount(sc) {
    if (sc >= 88) return 5;
    if (sc >= 76) return 4;
    if (sc >= 64) return 3;
    return 2;
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function meterNote(mo, good) {
    var prefix = MONTH_REL_PREFIX[mo.rel] || '';
    return mo.month + '월은 ' + prefix + (good ? MONTH_GOOD_NOTE[mo.rel] : MONTH_BAD_NOTE[mo.rel]);
  }

  function render(r) {
    current = r;

    /* --- 총운 --- */
    $('fKeyword').textContent = r.keyword;
    $('fOneline').textContent = r.oneline;

    var badges = $('fBadges');
    badges.innerHTML = '';
    var list = [
      '<b>' + ANIMAL[r.yearJi] + '띠</b> · ' + GAN_H[r.yearGan] + JI_H[r.yearJi] + '년',
      '<b>' + GAN[r.dayGan] + '(' + GAN_H[r.dayGan] + ')</b> ' + (r.dayGan % 2 === 0 ? '양' : '음') + GAN_E[r.dayGan],
      '<b>' + r.god.label + '</b>',
      state.gender === 'm' ? '남성' : (state.gender === 'f' ? '여성' : '')
    ];
    list.forEach(function (t) {
      if (!t) return;
      badges.appendChild(el('li', null, t));
    });

    var C = 2 * Math.PI * 38;
    var bar = $('fRingBar');
    bar.setAttribute('stroke-dasharray', C.toFixed(1));
    bar.setAttribute('stroke-dashoffset', C.toFixed(1));
    $('fTotalScore').textContent = String(r.total);
    // 다음 프레임에 채운다
    window.setTimeout(function () {
      bar.style.strokeDashoffset = (C * (1 - r.total / 100)).toFixed(1);
    }, 60);

    var relHtml = '<strong>2027년 정(丁)은 내 일간 ' + GAN[r.dayGan] + '(' + GAN_H[r.dayGan] + '·' + ELEM_H[GAN_E[r.dayGan]] + ')에게 '
      + r.god.label + '</strong>. ' + GOD_SHORT[r.god.key] + ' '
      + REL_NOTE[r.rel];
    $('fRelNote').innerHTML = relHtml;

    var meta = [];
    if (r.input.isLunar) {
      meta.push('음력 ' + r.input.y + '. ' + r.input.m + '. ' + r.input.d + (r.input.leap ? ' (윤달)' : '')
        + ' → 양력 ' + r.solar.y + '. ' + r.solar.m + '. ' + r.solar.d);
    } else {
      meta.push('양력 ' + r.solar.y + '. ' + r.solar.m + '. ' + r.solar.d
        + ' · 음력 ' + r.lunar.y + '. ' + r.lunar.m + '. ' + r.lunar.d + (r.lunar.leap ? ' (윤달)' : ''));
    }
    meta.push(GAN_H[r.dayGan] + JI_H[r.dayJi] + '일');
    meta.push(JI[r.monthJi] + '월');
    meta.push(r.hourJi >= 0 ? JI[r.hourJi] + '시' : '시진 모름');
    $('fMeta').textContent = meta.join(' · ');

    /* --- 4대 운세 --- */
    var wrap = $('fLucks');
    wrap.innerHTML = '';
    LUCK_META.forEach(function (m) {
      var sc = r.scores[m.key];
      var text = r.luckTexts[m.key];
      if (m.key === '애정') {
        if (state.gender === 'f' && r.god.key === '관성') {
          text += ' 전통 명리에서 여성의 관성은 인연(배우자) 자리로도 보는데, 올해 그 자리에 기운이 들어왔어요.';
        } else if (state.gender === 'm' && r.god.key === '재성') {
          text += ' 전통 명리에서 남성의 재성은 인연(배우자) 자리로도 보는데, 올해 그 자리에 기운이 들어왔어요.';
        }
      }
      var card = el('article', 'f-luck');
      card.innerHTML =
        '<div class="f-luck-head">' +
          '<span class="f-glyph" aria-hidden="true">' + m.glyph + '</span>' +
          '<h3>' + m.name + '</h3>' +
          '<span class="f-luck-score">' + sc + '</span>' +
        '</div>' +
        '<span class="f-stars" aria-hidden="true">' + stars(starCount(sc)) + '</span>' +
        '<p>' + text + '</p>';
      wrap.appendChild(card);
    });

    /* --- 월별 흐름 --- */
    $('fMonthSub').textContent = '미(未)와 내 지지(' + JI[r.dayJi] + ')의 관계로 본 달별 기운이에요.';
    var chart = $('fChart');
    chart.innerHTML = '';
    r.months.forEach(function (mo) {
      var col = el('div', 'f-col');
      if (mo.score >= 84) col.classList.add('is-good');
      else if (mo.score <= 62) col.classList.add('is-caution');
      var h = Math.round(((mo.score - 46) / (96 - 46)) * 100);
      h = clamp(h, 14, 100);
      var bar2 = el('div', 'f-bar');
      bar2.style.height = h + '%';
      bar2.setAttribute('title', mo.month + '월 ' + JI[mo.ji] + '월 · ' + REL_LABEL[mo.rel] + ' · ' + mo.score + '점');
      var lab = el('span', 'f-m', String(mo.month));
      col.appendChild(bar2);
      col.appendChild(lab);
      chart.appendChild(col);
    });

    var gm = r.goodMonths, bm = r.badMonths;
    $('fGoodMonth').textContent = gm[0].month + '월 · ' + gm[1].month + '월';
    $('fGoodNote').textContent = meterNote(gm[0], true);
    $('fBadMonth').textContent = bm[0].month + '월 · ' + bm[1].month + '월';
    $('fBadNote').textContent = meterNote(bm[0], false);

    /* --- 행운의 열쇠 --- */
    var luck = ELEM_LUCK[r.needElem];
    var needCount = r.counts[r.needElem];
    $('fLuckySub').textContent = needCount === 0
      ? '내 사주에 ' + ELEM_H[r.needElem] + '(' + r.needElem + ') 기운이 아예 없어요. 이 기운을 채우는 쪽이 올해의 열쇠입니다.'
      : '내 사주에 ' + ELEM_H[r.needElem] + '(' + r.needElem + ') 기운이 가장 적어요(' + needCount + '개). 이 기운을 채우는 쪽이 올해의 열쇠입니다.';
    $('fColorChip').style.background = luck.hex;
    $('fColor').textContent = luck.color;
    $('fNumber').textContent = luck.nums;
    $('fDirection').textContent = luck.dir;
    $('fLuckyNote').textContent = ELEM_TIP[r.needElem]
      + (r.hourJi >= 0
        ? ' 태어난 시간(' + JI[r.hourJi] + '시)까지 반영한 결과예요.'
        : ' 태어난 시간을 몰라 시주는 빼고 계산했어요.');

    resultBox.hidden = false;
  }

  function buildShare(r) {
    return '🔮 2027 정미년 신년운세\n'
      + r.solar.y + '년 ' + r.solar.m + '월 ' + r.solar.d + '일생 · ' + ANIMAL[r.yearJi] + '띠 · ' + r.god.label + '\n'
      + '종합 ' + r.total + '점 — ' + r.keyword + '\n'
      + LUCK_META.map(function (m) { return m.name.replace('직장·사업운', '직장').replace('애정·대인운', '애정') + ' ' + r.scores[m.key]; }).join(' · ') + '\n'
      + '최고의 달 ' + r.goodMonths[0].month + '·' + r.goodMonths[1].month + '월 · 조심할 달 ' + r.badMonths[0].month + '·' + r.badMonths[1].month + '월\n'
      + '행운 ' + ELEM_LUCK[r.needElem].color + ' · ' + ELEM_LUCK[r.needElem].nums + ' · ' + ELEM_LUCK[r.needElem].dir + '\n'
      + 'https://tools.niceluckydays.com/fortune.html';
  }

  function urlFor(r) {
    var p = new URLSearchParams();
    p.set('y', r.input.y); p.set('m', r.input.m); p.set('d', r.input.d);
    p.set('c', r.input.isLunar ? 'l' : 's');
    if (r.input.leap) p.set('l', '1');
    p.set('g', r.input.gender);
    p.set('h', r.input.hour);
    return location.pathname + '?' + p.toString();
  }

  function submit(auto) {
    showError('');
    var y = parseInt(yearSel.value, 10);
    var m = parseInt(monthSel.value, 10);
    var d = parseInt(daySel.value, 10);
    if (!y || !m || !d) { showError('태어난 연도·월·일을 모두 골라 주세요.'); return; }
    if (!state.gender) { showError('성별을 골라 주세요. 운세 문장이 조금 달라집니다.'); return; }
    if (!K) { showError('음양력 자료를 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.'); return; }

    var isLunar = state.cal === 'l';
    var leap = isLunar && leapInput.checked;

    if (isLunar) {
      var ok = true;
      try {
        if (K.LunarCalendar && K.LunarCalendar.isValid) ok = K.LunarCalendar.isValid(y, m, d, leap);
      } catch (e) { ok = false; }
      if (!ok) {
        showError(leap
          ? y + '년에는 윤' + m + '월이 없거나 그 날짜가 없어요. 윤달 여부를 확인해 주세요.'
          : y + '년 음력 ' + m + '월 ' + d + '일은 없는 날짜예요. 달을 확인해 주세요.');
        return;
      }
    }

    var input = {
      y: y, m: m, d: d,
      isLunar: isLunar,
      leap: leap,
      gender: state.gender,
      hour: parseInt(hourSel.value, 10)
    };

    var r;
    try {
      r = analyze(input);
    } catch (e) {
      showError('날짜를 계산하지 못했어요. 1900년 이후 날짜로 다시 시도해 주세요.');
      return;
    }

    render(r);

    if (!auto) {
      try { history.replaceState(null, '', urlFor(r)); } catch (e) { /* 무시 */ }
    }
    resultBox.scrollIntoView({ behavior: auto ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- 이벤트 ---------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    submit(false);
  });

  var calBtns = document.querySelectorAll('[data-cal]');
  for (var i = 0; i < calBtns.length; i++) {
    calBtns[i].addEventListener('click', function () {
      setCal(this.getAttribute('data-cal'));
    });
  }

  var genBtns = document.querySelectorAll('[data-gender]');
  for (var j = 0; j < genBtns.length; j++) {
    genBtns[j].addEventListener('click', function () {
      setGender(this.getAttribute('data-gender'));
    });
  }

  yearSel.addEventListener('change', refreshDays);
  monthSel.addEventListener('change', refreshDays);

  $('fReset').addEventListener('click', function () {
    form.reset();
    setCal('s');
    setGender('');
    refreshDays();
    resultBox.hidden = true;
    current = null;
    toast.textContent = '';
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* 무시 */ }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('fCopy').addEventListener('click', function () {
    if (!current) return;
    var text = buildShare(current);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast.textContent = '결과를 복사했어요. 붙여넣기로 보내 보세요.';
      }, function () {
        toast.textContent = '복사가 막혔어요. 결과 영역을 길게 눌러 복사해 주세요.';
      });
    } else {
      toast.textContent = '이 브라우저에서는 복사가 안 돼요. 화면을 길게 눌러 복사해 주세요.';
    }
    window.setTimeout(function () { toast.textContent = ''; }, 4000);
  });

  $('fShare').addEventListener('click', function () {
    if (!current) return;
    var text = buildShare(current);
    var url = location.origin + urlFor(current);
    if (navigator.share) {
      navigator.share({ title: '2027 정미년 신년운세', text: text, url: url }).catch(function () { });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast.textContent = '공유 문구를 복사했어요. 원하는 곳에 붙여넣기 하세요.';
      }, function () { });
      window.setTimeout(function () { toast.textContent = ''; }, 4000);
    } else {
      toast.textContent = '공유를 지원하지 않는 브라우저예요. 결과 복사를 이용해 주세요.';
    }
  });

  /* ---------- 초기화 + 공유 링크 복원 ---------- */
  buildSelects();

  (function restore() {
    var p = new URLSearchParams(location.search);
    var y = p.get('y'), m = p.get('m'), d = p.get('d');
    if (!y || !m || !d) return;
    var c = p.get('c') === 'l' ? 'l' : 's';
    setCal(c);
    if (c === 'l' && p.get('l') === '1') leapInput.checked = true;
    yearSel.value = String(parseInt(y, 10));
    monthSel.value = String(parseInt(m, 10));
    refreshDays();
    daySel.value = String(parseInt(d, 10));
    hourSel.value = String(parseInt(p.get('h') || '-1', 10));
    var g = p.get('g');
    if (g === 'm' || g === 'f') setGender(g);
    if (state.gender) submit(true);
  })();
})();
