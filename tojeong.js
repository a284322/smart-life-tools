/* =========================================================
   2027 정미년 무료 토정비결 – tojeong.js
   생년월일 → 세차·월건·일진 → 144괘 → 형(12) × 자리(12) 풀이
   외부 의존: kor-lunar (음양력 변환, 세차·일진)
   같은 생일이면 언제 봐도 같은 괘·같은 문장이 나오도록
   모든 난수는 생년월일 해시에서 뽑는다.
   ========================================================= */
(function () {
  'use strict';

  var K = window.korLunar || null;
  var $ = function (id) { return document.getElementById(id); };

  var GAN_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var JI_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var JI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var GAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

  /* ---------- 괘의 형 12 ----------
     괘 번호를 12로 나눈 몫으로 정해진다. 각 형은 재물·직장·건강·대인 문장을 가진다. */
  var THEME = [
    { name: '물이 흐르는 형', hanja: '水', keyword: '흐름을 타는 한 해',
      intro: '막힌 곳을 돌아 흐르는 물의 형입니다. 한자리에 버티기보다 흐름을 따라 움직일 때 수확이 큽니다.',
      money: '돈은 크게 한 번에 모으기보다 들어오는 길을 여러 개 만드는 쪽이 맞습니다. 작은 현금 흐름이 쌓여 연말에 힘을 냅니다.',
      work: '새 자리나 새 업무로 옮기는 일이 잘 풀립니다. 옮길 곳을 정했다면 3~4월과 9월에 움직이세요.',
      health: '쉬는 시간을 물 흐르듯 규칙적으로 두는 것이 핵심입니다. 목과 기관지, 수분 섭취를 챙기세요.',
      rel: '사람 사이에 끼어 조율하는 자리가 잦습니다. 흐름을 막지 않고 통과시키면 오히려 신뢰가 쌓입니다.',
      color: '물빛 남색', hex: '#1e3a8a', dir: '북쪽', nums: '1 · 6' },
    { name: '나무가 자라는 형', hanja: '木', keyword: '천천히 크는 한 해',
      intro: '땅을 뚫고 올라오는 나무의 형입니다. 느리지만 방향이 분명해, 한 번 자란 것은 잘 꺾이지 않습니다.',
      money: '씨앗에 해당하는 돈이 필요한 해입니다. 배움·자격·장비에 쓴 돈이 2~3년 뒤 수익으로 돌아옵니다.',
      work: '맡은 일의 폭이 넓어집니다. 눈에 띄지 않아도 실력을 쌓는 자리라, 기록을 남겨 두면 11~12월에 평가로 돌아옵니다.',
      health: '성장통이 있는 해입니다. 무리한 확장보다 스트레칭과 수면 리듬이 몸을 지켜 줍니다. 간과 눈의 피로를 살피세요.',
      rel: '먼저 다가가는 쪽이 이깁니다. 오래된 인연에 물을 주듯 연락하면 생각보다 큰 힘이 됩니다.',
      color: '새싹 초록', hex: '#15803d', dir: '동쪽', nums: '3 · 8' },
    { name: '불이 오르는 형', hanja: '火', keyword: '드러나는 한 해',
      intro: '불이 위로 오르는 형입니다. 드러나는 일이 많고, 이름이 오르내리기 쉬운 해입니다.',
      money: '들어오는 돈도 크지만 나가는 돈도 큽니다. 5월과 8월에 큰 지출이 몰리니 미리 자리를 비워 두세요.',
      work: '발표·계약·홍보처럼 사람들 앞에 서는 일에 강합니다. 다만 말이 앞서지 않게 한 번 더 확인하세요.',
      health: '열이 오르는 해입니다. 혈압과 심장, 수면을 살피고 밤늦은 일은 줄이는 편이 좋습니다.',
      rel: '관계가 뜨겁게 달아오르지만 식는 것도 빠릅니다. 감정을 바로 말하지 말고 하루 두고 전하세요.',
      color: '주홍', hex: '#b91c1c', dir: '남쪽', nums: '2 · 7' },
    { name: '흙이 쌓이는 형', hanja: '土', keyword: '쌓아 두는 한 해',
      intro: '흙이 한 겹씩 쌓이는 형입니다. 화려하지 않지만 손에 남는 것이 많은 해입니다.',
      money: '저축·청약·연금처럼 남는 돈을 만드는 일에 유리합니다. 큰 모험보다 자산을 다지는 쪽이 맞습니다.',
      work: '기반을 만드는 해입니다. 새 일을 벌이기보다 맡은 일을 정리해 매뉴얼로 남기면 다음 해가 편해집니다.',
      health: '소화기와 허리, 무릎을 살피세요. 오래 앉아 있는 시간을 줄이고 걷기를 꾸준히 하세요.',
      rel: '가족과 가까운 사람에게 마음이 쏠립니다. 멀어진 사람보다 곁에 있는 사람을 먼저 챙기세요.',
      color: '황토색', hex: '#b45309', dir: '중앙·남서', nums: '5 · 10' },
    { name: '쇠가 벼려지는 형', hanja: '金', keyword: '단단해지는 한 해',
      intro: '쇠를 두드려 날을 세우는 형입니다. 규칙과 정리가 힘이 되는 해입니다.',
      money: '새는 돈을 막는 데 강한 해입니다. 구독·보험·수수료를 정리하면 생각보다 큰 금액이 남습니다.',
      work: '전문성을 인정받습니다. 자격·평가·심사처럼 기준이 분명한 일에서 좋은 결과가 나옵니다.',
      health: '호흡기와 피부, 치아를 챙기세요. 건조한 계절에 컨디션이 흔들리기 쉽습니다.',
      rel: '선을 긋는 대화가 필요합니다. 미루던 말을 정중하게 꺼내면 관계가 오히려 편해집니다.',
      color: '은빛 회색', hex: '#475569', dir: '서쪽', nums: '4 · 9' },
    { name: '바람이 도는 형', hanja: '風', keyword: '사람이 오가는 한 해',
      intro: '바람이 사방으로 도는 형입니다. 사람과 소식이 많이 오가는 해입니다.',
      money: '정보에서 돈이 나옵니다. 다만 소문만 듣고 뛰어들면 흔들리니 확인된 것만 손대세요.',
      work: '이동·출장·외부 협업이 늘어납니다. 여러 일을 동시에 하기보다 하나를 끝내는 습관이 성과를 지킵니다.',
      health: '알레르기와 비염, 두통이 도질 수 있습니다. 환기와 수면 시간을 일정하게 두세요.',
      rel: '만남이 잦고 인연이 넓어집니다. 다만 약속을 줄여야 깊은 관계가 남습니다.',
      color: '하늘색', hex: '#0284c7', dir: '동남', nums: '3 · 8' },
    { name: '산이 서 있는 형', hanja: '山', keyword: '버티는 한 해',
      intro: '산이 버티고 서 있는 형입니다. 쉽게 흔들리지 않고 지키는 힘이 강한 해입니다.',
      money: '지키는 재물운입니다. 가진 것을 관리하고, 빌려주거나 보증서는 일은 피하세요.',
      work: '책임이 늘어나는 자리에 섭니다. 버티는 동안 힘들어도 연말에 자리가 단단해집니다.',
      health: '허리와 어깨, 관절을 조심하세요. 버티는 해라 긴장이 몸에 쌓입니다.',
      rel: '내 편을 지키는 해입니다. 모두와 좋게 지내려 애쓰기보다 곁의 몇 사람에게 집중하세요.',
      color: '짙은 청록', hex: '#0f766e', dir: '북동', nums: '5 · 8' },
    { name: '못이 고요한 형', hanja: '澤', keyword: '사람이 모이는 한 해',
      intro: '못에 물이 고요히 차오르는 형입니다. 사람을 모으고 마음을 채우는 해입니다.',
      money: '사람을 통해 이익이 옵니다. 함께 하는 일, 소개받은 일에서 돈이 붙습니다.',
      work: '관계·영업·상담에서 강합니다. 다만 정에 끌려 조건을 흐리면 나중에 손해가 됩니다.',
      health: '기분의 기복을 살피세요. 물처럼 가라앉는 날이 있으면 일찍 쉬는 것이 약입니다.',
      rel: '모임과 만남이 기쁨이 되는 해입니다. 다만 마음에 안 드는 자리는 과감히 줄이세요.',
      color: '옥색', hex: '#0d9488', dir: '서남', nums: '2 · 9' },
    { name: '우레가 치는 형', hanja: '雷', keyword: '결단의 한 해',
      intro: '우레가 치며 잠든 것을 깨우는 형입니다. 결단이 필요한 해입니다.',
      money: '미뤄 둔 정산·환급·청구를 지금 처리하세요. 숨어 있던 돈을 찾는 데 유리합니다.',
      work: '오래 미룬 결정을 내려야 합니다. 4월과 10월에 결단하면 뒤가 깔끔합니다.',
      health: '갑작스러운 피로와 두통을 조심하세요. 일정을 몰아 잡지 말고 사이를 비우세요.',
      rel: '쌓였던 감정이 한 번에 터질 수 있습니다. 말하기 전에 하루만 두면 대화가 달라집니다.',
      color: '보랏빛', hex: '#6d28d9', dir: '동쪽', nums: '4 · 7' },
    { name: '땅이 넓은 형', hanja: '地', keyword: '그릇이 커지는 한 해',
      intro: '넓은 땅이 사람을 받아들이는 형입니다. 품이 넓어지고 일이 커지는 해입니다.',
      money: '집·땅·사무실처럼 자리를 옮기는 일에 돈이 붙습니다. 다만 무리한 대출은 피하세요.',
      work: '조직이나 가족 안에서 중심을 잡습니다. 중재 역할이 잘 맞는 해입니다.',
      health: '체중과 혈당을 살피세요. 넓게 먹고 넓게 쓰는 해라 생활 리듬이 흐트러지기 쉽습니다.',
      rel: '아래 사람과 윗사람 사이에서 신뢰를 얻습니다. 편들지 않고 들어 주는 것만으로 힘이 됩니다.',
      color: '베이지', hex: '#a16207', dir: '남서', nums: '5 · 10' },
    { name: '길이 열리는 형', hanja: '道', keyword: '막힌 것이 풀리는 한 해',
      intro: '길이 열리는 형입니다. 오래 막혀 있던 일이 한 번에 풀리는 자리입니다.',
      money: '새 수입원이 생깁니다. 부업·제안·계약처럼 밖에서 들어오는 기회를 놓치지 마세요.',
      work: '이직·전환·새 프로젝트에 좋습니다. 다만 두 길을 동시에 잡으면 어느 쪽도 얕아집니다.',
      health: '다리의 피로와 발을 챙기세요. 많이 걷고 움직이는 해라 무리한 운동은 금물입니다.',
      rel: '새 인연이 오래 갈 사람으로 들어옵니다. 첫 만남에서 예의를 갖추면 그대로 이어집니다.',
      color: '금색', hex: '#ca8a04', dir: '남동', nums: '1 · 6' },
    { name: '달이 차는 형', hanja: '月', keyword: '때를 기다리는 한 해',
      intro: '달이 차오르는 형입니다. 때를 기다릴 줄 아는 사람이 이기는 해입니다.',
      money: '상반기보다 하반기에 재물이 모입니다. 조급하게 굴리지 말고 때를 기다리세요.',
      work: '인정이 늦게 옵니다. 9월 이후에 결과가 보이니 그 전에 포기하지 마세요.',
      health: '수면과 생체 리듬이 핵심입니다. 밤늦게까지 깨어 있는 습관이 몸을 가장 많이 깎습니다.',
      rel: '서두르면 어긋나고 기다리면 이어집니다. 마음이 급할수록 한 걸음 물러서세요.',
      color: '연보라', hex: '#7c3aed', dir: '북서', nums: '2 · 7' }
  ];

  /* ---------- 괘의 자리 12 ----------
     괘 번호를 12로 나눈 나머지로 정해진다. 흐름의 국면을 맡는다. */
  var PHASE = [
    { title: '봄이 열리는 자리',
      total: '새 일을 시작하기 좋은 자리입니다. 첫 단추를 잘 끼우면 연말까지 그 방향이 유지됩니다.',
      first: '1~6월은 씨를 뿌리는 시간입니다. 눈에 보이는 성과가 적어도 조급해하지 마세요.',
      second: '7~12월에 뿌린 것이 올라옵니다. 9월 이후에 손에 잡히는 결과가 생깁니다.',
      advice: '시작을 미루지 마세요. 3월까지 첫걸음을 떼면 나머지는 따라옵니다.' },
    { title: '물이 고이는 자리',
      total: '모으고 정리하는 자리입니다. 벌이기보다 지키는 쪽에서 이득이 납니다.',
      first: '상반기는 정리와 정산의 때입니다. 미뤄 둔 서류와 돈을 먼저 손대세요.',
      second: '하반기에 모인 것이 단단해집니다. 11~12월에 자산이 한 칸 올라섭니다.',
      advice: '지출 내역을 한 번 들여다보세요. 새는 돈을 막는 것만으로도 절반은 이룹니다.' },
    { title: '문이 열리는 자리',
      total: '막혀 있던 문이 열리는 자리입니다. 기회는 예고 없이 오니 준비된 사람이 잡습니다.',
      first: '상반기에 소개와 제안이 들어옵니다. 거절이 두렵더라도 한 번은 만나 보세요.',
      second: '하반기에 그 인연이 일이나 돈으로 이어집니다. 10월에 중요한 만남이 있습니다.',
      advice: '연락을 미루지 마세요. 먼저 인사하는 쪽이 이 자리를 가져갑니다.' },
    { title: '불이 오르는 자리',
      total: '드러나고 오르는 자리입니다. 이름이 알려지는 만큼 책임도 함께 옵니다.',
      first: '상반기에 평가·발표·시험이 몰립니다. 준비한 만큼 정확히 나옵니다.',
      second: '하반기에 그 결과가 자리로 바뀝니다. 8월에 한 번 크게 부딪히니 말조심하세요.',
      advice: '겉으로 드러날수록 사실 확인을 두 번 하세요. 한마디가 오래 남는 해입니다.' },
    { title: '쇠가 벼려지는 자리',
      total: '단단해지는 자리입니다. 힘든 일을 겪어도 그만큼 사람이 강해집니다.',
      first: '상반기는 시험대입니다. 기준이 분명한 일에서 좋은 점수를 받습니다.',
      second: '하반기에 실력이 인정됩니다. 11월에 자격이나 평가 결과가 좋습니다.',
      advice: '지금의 수고를 기록으로 남기세요. 증명할 자료가 있으면 그대로 평가가 됩니다.' },
    { title: '바람이 도는 자리',
      total: '사람과 소식이 많이 오가는 자리입니다. 넓게 만나되 깊게는 골라야 합니다.',
      first: '상반기에 이동과 출장, 새 인연이 늘어납니다. 체력 배분이 관건입니다.',
      second: '하반기에 모은 인연이 일로 이어집니다. 9월에 반가운 소식이 있습니다.',
      advice: '약속을 줄이고 집중할 하나를 정하세요. 벌여 놓은 일이 발목을 잡습니다.' },
    { title: '산이 서는 자리',
      total: '버티는 자리입니다. 화려하지 않지만 끝까지 남는 사람이 됩니다.',
      first: '상반기는 책임이 무거워집니다. 도망가지 않고 버티면 신뢰가 쌓입니다.',
      second: '하반기에 그 신뢰가 자리로 바뀝니다. 12월에 안정이 찾아옵니다.',
      advice: '혼자 다 지지 마세요. 나눠 맡기는 것도 실력입니다.' },
    { title: '못이 고요한 자리',
      total: '사람과 마음이 채워지는 자리입니다. 관계가 곧 재산이 됩니다.',
      first: '상반기에 만남과 화합의 자리가 많습니다. 가족과의 시간이 힘이 됩니다.',
      second: '하반기에 그 관계가 돈과 일로 이어집니다. 10월에 도움을 주는 사람을 만납니다.',
      advice: '감정에 따른 지출을 조심하세요. 정이 앞서면 조건을 놓치기 쉽습니다.' },
    { title: '우레가 치는 자리',
      total: '결단이 필요한 자리입니다. 미루던 일을 지금 정리하면 길이 열립니다.',
      first: '상반기에 오래된 문제가 드러납니다. 외면하지 말고 정면으로 다루세요.',
      second: '하반기에 정리가 끝나고 새 출발이 시작됩니다. 9월이 분기점입니다.',
      advice: '미룬 결정 하나를 이번 달에 끝내세요. 그것 하나로 나머지가 풀립니다.' },
    { title: '땅이 넓어지는 자리',
      total: '품이 넓어지고 일이 커지는 자리입니다. 사람을 품는 만큼 그릇이 커집니다.',
      first: '상반기에 역할이 늘어납니다. 중재와 조율이 잘 맞는 때입니다.',
      second: '하반기에 그 역할이 위치로 굳어집니다. 11월에 안정된 결과가 있습니다.',
      advice: '모두를 만족시키려다 정작 내 몫을 잃지 마세요. 경계를 분명히 하세요.' },
    { title: '길이 트이는 자리',
      total: '막힌 것이 풀리는 자리입니다. 오래 답답했던 일이 한 번에 정리됩니다.',
      first: '상반기에 새 길이 보입니다. 다만 두 길을 동시에 잡으면 둘 다 얕아집니다.',
      second: '하반기에 고른 길이 결과를 냅니다. 8월과 12월이 좋습니다.',
      advice: '선택을 두려워하지 마세요. 고르고 나면 나머지는 따라옵니다.' },
    { title: '달이 차는 자리',
      total: '때를 기다리는 자리입니다. 서두르면 흐트러지고, 기다리면 가득 찹니다.',
      first: '상반기는 준비의 때입니다. 남들이 앞서 보여도 내 속도를 지키세요.',
      second: '하반기에 차오릅니다. 10월 이후에 인정과 결과가 함께 옵니다.',
      advice: '조급함이 유일한 적입니다. 한 달만 더 버티면 판이 바뀝니다.' }
  ];

  /* ---------- 월별 키워드 ---------- */
  var MONTH_KEY = [
    { k: '시작과 설계', d: '한 해의 계획을 세우고 첫 단추를 끼우는 달' },
    { k: '정리와 정산', d: '미뤄 둔 돈과 서류를 정리하는 달' },
    { k: '계약과 문서', d: '문서와 약속을 확정하기 좋은 달' },
    { k: '이동과 변화', d: '자리를 옮기거나 새 시도를 시작하는 달' },
    { k: '지출과 소비', d: '큰 지출이 몰리니 예산을 먼저 정하는 달' },
    { k: '관계와 화합', d: '사람을 만나고 마음을 나누는 달' },
    { k: '건강과 휴식', d: '몸을 돌보고 속도를 늦추는 달' },
    { k: '충돌과 주의', d: '말과 계약에서 한 번 더 확인해야 하는 달' },
    { k: '결실과 평가', d: '그동안의 결과가 드러나는 달' },
    { k: '귀인과 만남', d: '도움을 주는 사람을 만나는 달' },
    { k: '안정과 저축', d: '들어온 것을 지키고 모으는 달' },
    { k: '마무리와 감사', d: '한 해를 정리하고 다음을 준비하는 달' }
  ];

  var BAND = [
    { min: 80, label: '기회가 열리는 달', tips: [
      '새로운 일을 시작하기 좋아요. 먼저 움직이는 쪽이 이깁니다.',
      '사람을 만나 제안하기 좋은 때예요. 미뤄 둔 연락을 이때 하세요.',
      '돈이 움직이는 달입니다. 들어오는 길과 나가는 곳을 함께 보세요.',
      '몸이 가벼운 달이에요. 미뤄 둔 검진이나 운동을 시작하기 좋습니다.'
    ] },
    { min: 65, label: '무난하게 흐르는 달', tips: [
      '큰 변화 없이 흐릅니다. 하던 일을 꾸준히 이어 가세요.',
      '특별한 일보다 일상이 힘이 되는 때입니다. 생활 리듬을 지키세요.',
      '새로 벌이기보다 정리하는 쪽이 남습니다. 서류와 돈을 한 번 점검하세요.',
      '관계는 잔잔합니다. 약속을 지키는 것만으로 신뢰가 쌓입니다.'
    ] },
    { min: 52, label: '천천히 가는 달', tips: [
      '속도보다 방향을 점검하세요. 서두르면 되돌아와야 합니다.',
      '결정을 서두르지 마세요. 하루만 두고 보면 답이 보입니다.',
      '몸이 먼저 신호를 보내는 달입니다. 잠을 조금 더 챙기세요.',
      '지출이 새기 쉬운 때입니다. 작은 구독과 약속을 정리하세요.'
    ] },
    { min: 0, label: '쉬어 가는 달', tips: [
      '결정을 미루고 몸과 마음을 정비하세요. 지출은 작게 두세요.',
      '무리한 약속과 큰 지출은 피하세요. 쉬는 것도 일입니다.',
      '말이 오해를 부르기 쉬운 달입니다. 확인하고 다시 말하세요.',
      '컨디션이 흔들리는 때입니다. 미뤄 둔 병원 일이 있으면 지금 가세요.'
    ] }
  ];

  /* ---------- 유틸 ---------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
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
  function idxOf(arr, ch) { return arr.indexOf(ch); }
  /* 간지 두 글자 → 60갑자 순번(0=갑자) */
  function ganjiIndex(hanja) {
    if (!hanja || hanja.length < 2) return -1;
    var g = idxOf(GAN_H, hanja.charAt(0));
    var j = idxOf(JI_H, hanja.charAt(1));
    if (g < 0 || j < 0) return -1;
    for (var n = 0; n < 60; n++) if (n % 10 === g && n % 12 === j) return n;
    return -1;
  }
  function stars(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += (i <= n ? '★' : '☆');
    return s;
  }
  function starCount(sc) { return clamp(Math.round(sc / 20), 1, 5); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------- 분석 ---------- */
  function analyze(input) {
    var solar, lunar;
    if (input.isLunar) {
      var s = K.toSolar(input.y, input.m, input.d);
      solar = { y: s.year, m: s.month, d: s.day };
      lunar = { y: input.y, m: input.m, d: input.d, leap: !!input.leap };
    } else {
      solar = { y: input.y, m: input.m, d: input.d };
      var l = K.toLunar(input.y, input.m, input.d);
      lunar = { y: l.year, m: l.month, d: l.day, leap: !!l.isLeapMonth };
    }

    var info = K.toLunar(solar.y, solar.m, solar.d);
    var secha = ganjiIndex(info.sechaHanja);
    var iljin = ganjiIndex(info.iljinHanja);
    if (secha < 0) secha = ((solar.y - 4) % 60 + 60) % 60;
    if (iljin < 0) iljin = (solar.y * 372 + solar.m * 31 + solar.d) % 60;

    /* 144괘: 세차·월건·일진을 가중해 더하고 144로 나눈 나머지 */
    var raw = secha * 23 + lunar.m * 37 + iljin * 53 + 7;
    var gwa = ((raw % 144) + 144) % 144 + 1;

    var theme = THEME[Math.floor((gwa - 1) / 12)];
    var phase = PHASE[(gwa - 1) % 12];

    var rnd = mulberry32(hash('tojeong|' + solar.y + '-' + solar.m + '-' + solar.d + '-' + (input.isLunar ? 'L' : 'S') + '|' + gwa));
    var tier = gwa <= 48 ? 0 : (gwa <= 96 ? 1 : 2);
    var base = tier === 0 ? 80 : (tier === 1 ? 69 : 58);
    var total = clamp(Math.round(base + rnd() * 13 - 4), 42, 97);

    var keys = ['money', 'work', 'health', 'rel'];
    var names = { money: '재물운', work: '직장·사업운', health: '건강운', rel: '대인·가정운' };
    var glyph = { money: '財', work: '官', health: '身', rel: '人' };
    var scores = {};
    keys.forEach(function (k) {
      scores[k] = clamp(Math.round(total + rnd() * 20 - 10), 38, 99);
    });

    var months = [];
    for (var i = 1; i <= 12; i++) {
      var sc = clamp(Math.round(total + Math.sin((i + (gwa - 1) % 12) * 0.82) * 11 + rnd() * 14 - 7), 40, 97);
      months.push({ month: i, score: sc, key: MONTH_KEY[i - 1] });
    }
    var sorted = months.slice().sort(function (a, b) { return b.score - a.score; });
    var good = sorted.slice(0, 2).sort(function (a, b) { return a.month - b.month; });
    var bad = sorted.slice(-2).sort(function (a, b) { return a.month - b.month; });

    var firstScore = clamp(Math.round(total + rnd() * 16 - 8), 42, 97);
    var secondScore = clamp(Math.round(total + rnd() * 16 - 8), 42, 97);

    /* 행운 번호: 1~45에서 6개 + 보너스 1개 */
    var pool = [];
    for (var n = 1; n <= 45; n++) pool.push(n);
    for (var p = pool.length - 1; p > 0; p--) {
      var q = Math.floor(rnd() * (p + 1));
      var tmp = pool[p]; pool[p] = pool[q]; pool[q] = tmp;
    }
    var balls = pool.slice(0, 6).sort(function (a, b) { return a - b; });
    var bonus = pool[6];

    var bestKey = keys[0];
    keys.forEach(function (k) { if (scores[k] > scores[bestKey]) bestKey = k; });
    var worstKey = keys[0];
    keys.forEach(function (k) { if (scores[k] < scores[worstKey]) worstKey = k; });

    return {
      input: input, solar: solar, lunar: lunar, gwa: gwa, theme: theme, phase: phase,
      tier: tier, tierName: tier === 0 ? '상괘' : (tier === 1 ? '중괘' : '하괘'),
      total: total, scores: scores, names: names, glyph: glyph, keys: keys,
      months: months, good: good, bad: bad,
      firstScore: firstScore, secondScore: secondScore,
      balls: balls, bonus: bonus, bestKey: bestKey, worstKey: worstKey,
      sechaHanja: info.sechaHanja, iljinHanja: info.iljinHanja,
      wolgeonHanja: info.wolgeonHanja || ''
    };
  }

  /* ---------- 화면 ---------- */
  var form = $('tojeongForm');
  var yearSel = $('birthYear');
  var monthSel = $('birthMonth');
  var daySel = $('birthDay');
  var leapWrap = $('leapWrap');
  var leapInput = $('leap');
  var errBox = $('tError');
  var resultBox = $('result');
  var toast = $('tToast');
  var state = { cal: 's' };
  var current = null;

  function opt(v, label) {
    var o = document.createElement('option');
    o.value = String(v);
    o.textContent = label;
    return o;
  }

  function daysInMonth(y, m) {
    if (!y || !m) return 31;
    return new Date(y, m, 0).getDate();
  }

  function buildSelects() {
    var i;
    yearSel.appendChild(opt('', '년도'));
    for (i = 2025; i >= 1930; i--) yearSel.appendChild(opt(i, i + '년'));
    monthSel.appendChild(opt('', '월'));
    for (i = 1; i <= 12; i++) monthSel.appendChild(opt(i, i + '월'));
    refreshDays();
  }

  function refreshDays() {
    var y = parseInt(yearSel.value, 10);
    var m = parseInt(monthSel.value, 10);
    var keep = parseInt(daySel.value, 10);
    var last = daysInMonth(y, m);
    daySel.innerHTML = '';
    daySel.appendChild(opt('', '일'));
    for (var i = 1; i <= last; i++) daySel.appendChild(opt(i, i + '일'));
    if (keep && keep <= last) daySel.value = String(keep);
  }

  function setCal(cal) {
    state.cal = cal;
    var btns = document.querySelectorAll('[data-cal]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-cal') === cal ? 'true' : 'false');
    }
    var lunar = cal === 'l';
    leapWrap.classList.toggle('is-on', lunar);
    if (!lunar) leapInput.checked = false;
    $('calHint').textContent = lunar
      ? '태어난 날짜를 음력으로 넣어 주세요. 윤달이면 위에 체크하면 양력으로 바꿔 계산합니다.'
      : '태어난 날짜를 양력으로 넣어 주세요. 음력 생일이면 위에서 음력을 고르면 됩니다.';
    refreshDays();
  }

  function showError(msg) {
    errBox.textContent = msg;
    errBox.classList.toggle('is-on', !!msg);
  }

  function render(r) {
    current = r;

    $('tGwaNo').textContent = '2027 정미년 토정비결 · 제 ' + r.gwa + ' 괘 (' + r.tierName + ')';
    $('tKeyword').textContent = r.theme.keyword;
    $('tOneline').textContent = r.phase.total;

    var C = 2 * Math.PI * 38;
    var bar = $('tRingBar');
    bar.setAttribute('stroke-dasharray', C.toFixed(1));
    bar.setAttribute('stroke-dashoffset', C.toFixed(1));
    $('tTotalScore').textContent = String(r.total);
    window.setTimeout(function () {
      bar.style.strokeDashoffset = (C * (1 - r.total / 100)).toFixed(1);
    }, 60);

    var badges = $('tBadges');
    badges.innerHTML = '';
    [
      '<b>제' + r.gwa + '괘</b> · ' + r.tierName,
      '<b>' + r.theme.hanja + '</b> ' + r.theme.name,
      '<b>' + r.names[r.bestKey] + '</b> ' + r.scores[r.bestKey] + '점',
      r.scores[r.worstKey] < 60 ? '<b>' + r.names[r.worstKey] + '</b> 관리 필요' : '숨은 귀인 있음'
    ].forEach(function (t) { badges.appendChild(el('li', null, t)); });

    $('tRelNote').innerHTML = '<strong>' + r.theme.intro + '</strong> ' + r.phase.advice;
    $('tMeta').textContent = [
      '양력 ' + r.solar.y + '. ' + r.solar.m + '. ' + r.solar.d,
      '음력 ' + r.lunar.y + '. ' + r.lunar.m + '. ' + r.lunar.d + (r.lunar.leap ? ' (윤달)' : ''),
      '세차 ' + r.sechaHanja,
      '일진 ' + r.iljinHanja,
      r.wolgeonHanja ? '월건 ' + r.wolgeonHanja : ''
    ].filter(Boolean).join(' · ');

    /* 영역별 운세 */
    var wrap = $('tLucks');
    wrap.innerHTML = '';
    r.keys.forEach(function (k) {
      var card = el('article', 'f-luck');
      card.innerHTML =
        '<div class="f-luck-head">' +
          '<span class="f-glyph" aria-hidden="true">' + r.glyph[k] + '</span>' +
          '<h3>' + r.names[k] + '</h3>' +
          '<span class="f-luck-score">' + r.scores[k] + '</span>' +
        '</div>' +
        '<span class="f-stars" aria-hidden="true">' + stars(starCount(r.scores[k])) + '</span>' +
        '<p>' + r.theme[k] + '</p>';
      wrap.appendChild(card);
    });

    /* 상반기·하반기 */
    $('tHalves').innerHTML =
      '<article class="t-half">' +
        '<h4>상반기 <span>1~6월</span><b>上</b></h4>' +
        '<p>' + r.phase.first + '</p>' +
        '<span class="t-half-score">기운 <b>' + r.firstScore + '</b>점</span>' +
      '</article>' +
      '<article class="t-half">' +
        '<h4>하반기 <span>7~12월</span><b>下</b></h4>' +
        '<p>' + r.phase.second + '</p>' +
        '<span class="t-half-score">기운 <b>' + r.secondScore + '</b>점</span>' +
      '</article>';

    /* 월별 차트 */
    $('tMonthSub').textContent = '제 ' + r.gwa + ' 괘의 수리를 열두 달에 나눠 본 흐름이에요.';
    var chart = $('tChart');
    chart.innerHTML = '';
    r.months.forEach(function (mo) {
      var col = el('div', 'f-col');
      if (mo.score >= 84) col.classList.add('is-good');
      else if (mo.score <= 62) col.classList.add('is-caution');
      var h = clamp(Math.round(((mo.score - 40) / (97 - 40)) * 100), 14, 100);
      var b = el('div', 'f-bar');
      b.style.height = h + '%';
      b.setAttribute('title', mo.month + '월 · ' + mo.key.k + ' · ' + mo.score + '점');
      col.appendChild(b);
      col.appendChild(el('span', 'f-m', String(mo.month)));
      chart.appendChild(col);
    });

    $('tGoodMonth').textContent = r.good[0].month + '월 · ' + r.good[1].month + '월';
    $('tGoodNote').textContent = r.good[0].month + '월은 ' + r.good[0].key.k + ' — ' + tipOf(r.good[0]);
    $('tBadMonth').textContent = r.bad[0].month + '월 · ' + r.bad[1].month + '월';
    $('tBadNote').textContent = r.bad[0].month + '월은 ' + r.bad[0].key.k + ' — ' + tipOf(r.bad[0]);

    /* 월별 핵심 한 줄 */
    var list = $('tMonthList');
    list.innerHTML = '';
    r.months.forEach(function (mo) {
      var band = bandOf(mo.score);
      var li = el('li');
      if (mo.score >= 84) li.classList.add('is-good');
      else if (mo.score <= 62) li.classList.add('is-caution');
      li.innerHTML =
        '<span class="t-mn">' + mo.month + '월</span>' +
        '<span><span class="t-mk">' + mo.key.k + ' · ' + band.label + '</span>' +
        '<span class="t-md">' + mo.key.d + '. ' + tipOf(mo) + '</span></span>';
      list.appendChild(li);
    });

    /* 행운 */
    $('tLuckySub').textContent = '제 ' + r.gwa + ' 괘의 수리에서 뽑은 번호예요. 1부터 45까지 여섯 개와 보너스 하나.';
    var balls = $('tBalls');
    balls.innerHTML = '';
    r.balls.forEach(function (n) { balls.appendChild(el('span', 't-ball', String(n))); });
    balls.appendChild(el('span', 't-ball-sep', '+'));
    balls.appendChild(el('span', 't-ball is-bonus', String(r.bonus)));

    $('tColorChip').style.background = r.theme.hex;
    $('tColor').textContent = r.theme.color;
    $('tDirection').textContent = r.theme.dir;
    $('tNumber').textContent = r.theme.nums;
    $('tLuckyNote').textContent = r.theme.name + '의 기운은 ' + r.theme.color + ' 빛과 ' + r.theme.dir +
      ' 방향에 담겨 있어요. 지갑이나 책상, 휴대폰 배경처럼 자주 보는 곳에 두면 마음이 잡힙니다. 번호는 참고용이며 당첨을 보장하지 않습니다.';

    resultBox.hidden = false;
  }

  function bandOf(sc) {
    for (var i = 0; i < BAND.length; i++) if (sc >= BAND[i].min) return BAND[i];
    return BAND[BAND.length - 1];
  }
  function tipOf(mo) {
    var band = bandOf(mo.score);
    return band.tips[mo.month % band.tips.length];
  }

  function buildText(r) {
    return '📜 2027 정미년 토정비결\n'
      + '제 ' + r.gwa + ' 괘 · ' + r.theme.keyword + '\n'
      + '종합 ' + r.total + '점 — ' + r.phase.title + '\n'
      + r.keys.map(function (k) { return r.names[k] + ' ' + r.scores[k]; }).join(' · ') + '\n'
      + '상반기 ' + r.firstScore + '점 / 하반기 ' + r.secondScore + '점\n'
      + '좋은 달 ' + r.good[0].month + '·' + r.good[1].month + '월 · 조심할 달 ' + r.bad[0].month + '·' + r.bad[1].month + '월\n'
      + '행운 번호 ' + r.balls.join(' ') + ' + ' + r.bonus + '\n'
      + '행운 ' + r.theme.color + ' · ' + r.theme.dir + '\n'
      + 'https://tools.niceluckydays.com/tojeong.html';
  }

  function urlFor(r) {
    var p = new URLSearchParams();
    p.set('y', r.input.y); p.set('m', r.input.m); p.set('d', r.input.d);
    p.set('c', r.input.isLunar ? 'l' : 's');
    if (r.input.leap) p.set('l', '1');
    return location.pathname + '?' + p.toString();
  }

  function submit(auto) {
    showError('');
    var y = parseInt(yearSel.value, 10);
    var m = parseInt(monthSel.value, 10);
    var d = parseInt(daySel.value, 10);
    if (!y || !m || !d) { showError('태어난 연도·월·일을 모두 골라 주세요.'); return; }
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

    var r;
    try {
      r = analyze({ y: y, m: m, d: d, isLunar: isLunar, leap: leap });
    } catch (e) {
      showError('날짜를 다시 확인해 주세요. 1890년부터 2050년 사이 생일을 지원합니다.');
      return;
    }
    render(r);

    if (!auto) {
      var top = resultBox.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
    try { history.replaceState(null, '', urlFor(r)); } catch (e) { }
  }

  /* ---------- 이벤트 ---------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    submit(false);
  });
  yearSel.addEventListener('change', refreshDays);
  monthSel.addEventListener('change', refreshDays);

  var calBtns = document.querySelectorAll('[data-cal]');
  for (var i = 0; i < calBtns.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () { setCal(btn.getAttribute('data-cal')); });
    })(calBtns[i]);
  }

  $('tReset').addEventListener('click', function () {
    resultBox.hidden = true;
    yearSel.value = ''; monthSel.value = ''; daySel.value = '';
    refreshDays();
    showError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try { history.replaceState(null, '', location.pathname); } catch (e) { }
  });

  $('tCopy').addEventListener('click', function () {
    if (!current) return;
    var text = buildText(current);
    navigator.clipboard.writeText(text).then(function () {
      toast.textContent = '결과를 복사했어요. 원하는 곳에 붙여 넣어 보세요.';
      window.setTimeout(function () { toast.textContent = ''; }, 4000);
    }, function () {
      toast.textContent = '복사가 막혔어요. 결과 영역을 길게 눌러 직접 복사해 주세요.';
      window.setTimeout(function () { toast.textContent = ''; }, 4000);
    });
  });

  $('tShare').addEventListener('click', function () {
    if (!current) return;
    var text = buildText(current);
    var url = location.origin + urlFor(current);
    if (navigator.share) {
      navigator.share({ title: '2027 정미년 토정비결', text: text, url: url }).catch(function () { });
    } else {
      navigator.clipboard.writeText(text).then(function () {
        toast.textContent = '공유를 지원하지 않는 브라우저라 복사했어요.';
        window.setTimeout(function () { toast.textContent = ''; }, 4000);
      }, function () { });
    }
  });

  /* ---------- 공유 URL로 들어온 경우 바로 계산 ---------- */
  (function restore() {
    buildSelects();
    setCal('s');
    var p = new URLSearchParams(location.search);
    var y = p.get('y'), m = p.get('m'), d = p.get('d');
    if (y && m && d) {
      if (p.get('c') === 'l') setCal('l');
      if (p.get('l') === '1') leapInput.checked = true;
      yearSel.value = y; refreshDays(); monthSel.value = m; refreshDays(); daySel.value = d;
      if (yearSel.value && monthSel.value && daySel.value) submit(true);
    }
  })();
})();
