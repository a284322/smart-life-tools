/* =========================================================
   2026 연말정산 환급금 계산기 – 계산 엔진
   기준: 2026년 귀속(2027년 1~2월 정산), 2026-11 기준 공포·시행 법령
   - 소득세법 제47조(근로소득공제), 제50조~제52조(인적공제·보험료),
     제55조(세율), 제59조(근로소득세액공제), 제59조의2(자녀세액공제),
     제59조의3(연금계좌), 제59조의4(표준세액공제)
   - 조세특례제한법 제95조의2(월세), 제126조의2(신용카드등)
   - 2026년 4대보험료율: 국민연금 4.75%, 건강보험 3.595%,
     장기요양(건강보험료의 13.14%), 고용보험 0.9%
   ========================================================= */
(function () {
  'use strict';

  var WON = 1;              // 내부 계산 단위: 원
  var MAN = 10000;

  /* ---------------- 2026년 기준 상수 ---------------- */
  var RATES = {
    pension: 0.0475,
    health: 0.03595,
    longTermCareOfHealth: 0.131404, // 0.9448% / 7.19%
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

  var BASIC_DEDUCTION = 1500000;      // 1인당
  var EARNED_DEDUCTION_CAP = 20000000;
  var CARD_MIN_RATE = 0.25;
  var PENSION_CREDIT_LIMIT = 9000000;
  var RENT_CREDIT_LIMIT = 10000000;
  var STANDARD_CREDIT = 130000;

  /* ---------------- 숫자 포맷 ---------------- */
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

  /* ---------------- 계산 함수 ---------------- */
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

  function bracketOf(base) {
    for (var i = 0; i < TAX_BRACKETS.length; i++) {
      if (base <= TAX_BRACKETS[i].upTo) return TAX_BRACKETS[i];
    }
    return TAX_BRACKETS[TAX_BRACKETS.length - 1];
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

  function insuranceBreakdown(gross) {
    if (gross <= 0) return { pension: 0, health: 0, ltc: 0, employment: 0, total: 0 };
    var monthly = gross / 12;
    var baseMonthly = Math.min(RATES.pensionMonthlyCap, Math.max(RATES.pensionMonthlyFloor, monthly));
    var pension = Math.floor(baseMonthly * RATES.pension * 12);
    var health = Math.floor(gross * RATES.health);
    var ltc = Math.floor(health * RATES.longTermCareOfHealth);
    var employment = Math.floor(gross * RATES.employment);
    return {
      pension: pension,
      health: health,
      ltc: ltc,
      employment: employment,
      total: pension + health + ltc + employment
    };
  }

  function cardDeduction(gross, credit, check, market, children) {
    var totalUsage = credit + check + market;
    var minUse = gross * CARD_MIN_RATE;
    var baseLimit = gross <= 70000000
      ? (children >= 2 ? 4000000 : children === 1 ? 3500000 : 3000000)
      : (children >= 2 ? 3000000 : children === 1 ? 2750000 : 2500000);
    var addCap = gross <= 70000000 ? 3000000 : 2000000;

    var out = {
      totalUsage: totalUsage,
      minUse: minUse,
      baseLimit: baseLimit,
      addCap: addCap,
      computed: 0,
      deduction: 0,
      additional: 0,
      firstStage: 0
    };
    if (totalUsage <= 0 || totalUsage <= minUse) return out;

    // 최저사용금액은 신용카드 → 체크카드 → 전통시장·대중교통 순으로 차감
    var remain = minUse;
    var takeCredit = Math.min(remain, credit); remain -= takeCredit;
    var takeCheck = Math.min(remain, check); remain -= takeCheck;
    var takeMarket = Math.min(remain, market); remain -= takeMarket;

    var qCredit = Math.max(0, credit - takeCredit);
    var qCheck = Math.max(0, check - takeCheck);
    var qMarket = Math.max(0, market - takeMarket);

    var computed = qCredit * 0.15 + qCheck * 0.30 + qMarket * 0.40;
    var firstStage = Math.min(computed, baseLimit);
    var excess = Math.max(0, computed - baseLimit);
    var specialPool = market * 0.40;
    var additional = Math.min(excess, specialPool, addCap);

    out.computed = Math.floor(computed);
    out.firstStage = Math.floor(firstStage);
    out.additional = Math.floor(additional);
    out.deduction = Math.floor(Math.min(firstStage + additional, baseLimit + addCap));
    return out;
  }

  function estimateWithheld(gross, family, insuranceTotal) {
    if (gross <= 0) return 0;
    var base = Math.max(0, gross - earnedIncomeDeduction(gross) - Math.max(1, family) * BASIC_DEDUCTION - insuranceTotal);
    var tax = incomeTax(base);
    return Math.max(0, tax - earnedTaxCredit(tax, gross));
  }

  /* ---------------- 전체 계산 ---------------- */
  function calculate(input) {
    var gross = Math.max(0, input.gross);
    var familyInput = Math.max(1, input.family || 1);
    var children = Math.max(0, input.children || 0);
    var childrenCreditN = Math.min(children, Math.max(0, input.childrenCredit || 0));
    // 자녀가 부양가족 수에 빠져 있으면 자녀로 보정 (본인 1명 + 자녀 수)
    var family = Math.max(familyInput, 1 + children);

    var earnedDed = earnedIncomeDeduction(gross);
    var earnedIncome = Math.max(0, gross - earnedDed);

    var ins = input.autoInsurance ? insuranceBreakdown(gross) : { pension: 0, health: 0, ltc: 0, employment: 0, total: 0 };
    var basicDed = family * BASIC_DEDUCTION;
    var card = cardDeduction(gross, input.cardCredit, input.cardCheck, input.cardMarket, children);

    var taxable = Math.max(0, earnedIncome - basicDed - ins.total - card.deduction);
    var calcTax = incomeTax(taxable);
    var bracket = bracketOf(taxable);

    var earnedCredit = earnedTaxCredit(calcTax, gross);

    var childCredit = childrenCreditN >= 3
      ? 550000 + (childrenCreditN - 2) * 400000
      : childrenCreditN === 2 ? 550000
      : childrenCreditN === 1 ? 250000 : 0;

    var pensionBase = Math.min(Math.max(0, input.pension), PENSION_CREDIT_LIMIT);
    // 법정 공제율은 국세 기준. 지방소득세 10%는 결정세액에 별도로 더해진다.
    var pensionRate = gross <= 55000000 ? 0.15 : 0.12;
    var pensionCredit = Math.floor(pensionBase * pensionRate);

    var rentEligible = !!input.noHouse && gross > 0 && gross <= 80000000;
    var rentBase = rentEligible ? Math.min(Math.max(0, input.rent), RENT_CREDIT_LIMIT) : 0;
    var rentRate = gross <= 55000000 ? 0.17 : 0.15;
    var rentCredit = Math.floor(rentBase * rentRate);

    // 표준세액공제: 월세 등 특별세액공제를 신청하지 않은 경우 13만원
    var standardCredit = rentCredit > 0 ? 0 : STANDARD_CREDIT;
    if (calcTax === 0) standardCredit = 0;

    var creditsTotal = earnedCredit + childCredit + pensionCredit + rentCredit + standardCredit;
    var decisionTax = Math.max(0, calcTax - creditsTotal);

    var localTax = Math.floor(decisionTax * 0.1);
    var totalDue = decisionTax + localTax;

    var paidRaw = input.autoPaid
      ? estimateWithheld(gross, family, ins.total)
      : Math.max(0, input.paid);
    var paidTotal = Math.round(paidRaw * 1.1); // 지방소득세 포함 가정
    var diff = paidTotal - totalDue;

    var wastedCredits = Math.max(0, creditsTotal - calcTax);
    var effectiveRate = gross > 0 ? totalDue / gross : 0;

    return {
      gross: gross,
      family: family,
      familyInput: familyInput,
      children: children,
      childrenCreditN: childrenCreditN,
      earnedDed: earnedDed,
      earnedIncome: earnedIncome,
      ins: ins,
      basicDed: basicDed,
      card: card,
      taxable: taxable,
      calcTax: calcTax,
      bracket: bracket,
      earnedCredit: earnedCredit,
      childCredit: childCredit,
      pensionBase: pensionBase,
      pensionRate: pensionRate,
      pensionCredit: pensionCredit,
      rentEligible: rentEligible,
      rentBase: rentBase,
      rentRate: rentRate,
      rentCredit: rentCredit,
      standardCredit: standardCredit,
      creditsTotal: creditsTotal,
      decisionTax: decisionTax,
      localTax: localTax,
      totalDue: totalDue,
      paidRaw: paidRaw,
      paidTotal: paidTotal,
      diff: diff,
      wastedCredits: wastedCredits,
      effectiveRate: effectiveRate,
      autoPaid: !!input.autoPaid
    };
  }

  /* ---------------- DOM ---------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var els = {};
  var current = null;

  function readNumber(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var digits = String(el.value).replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function readInput() {
    return {
      gross: readNumber('gross') * MAN,
      paid: readNumber('paid') * MAN,
      family: parseInt($('#family').value, 10) || 1,
      children: parseInt($('#children').value, 10) || 0,
      childrenCredit: parseInt($('#childrenCredit').value, 10) || 0,
      cardCredit: readNumber('cardCredit') * MAN,
      cardCheck: readNumber('cardCheck') * MAN,
      cardMarket: readNumber('cardMarket') * MAN,
      rent: readNumber('rent') * MAN,
      pension: readNumber('pension') * MAN,
      noHouse: $('#noHouse').checked,
      autoPaid: $('#autoPaid').checked,
      autoInsurance: $('#autoInsurance').checked
    };
  }

  function formatManField(el) {
    var digits = String(el.value).replace(/[^0-9]/g, '').slice(0, 10);
    if (!digits) {
      el.value = '';
      return;
    }
    el.value = parseInt(digits, 10).toLocaleString('ko-KR');
  }

  /* ---------------- 렌더링 ---------------- */
  function receiptRows(r) {
    var rows = [];
    function push(html, cls) { rows.push({ html: html, cls: cls || '' }); }

    push('<tr><td class="lbl">연간 총급여</td><td class="val">' + won(r.gross) + '</td></tr>');
    push('<tr class="minus"><td class="lbl">근로소득공제<small>총급여 구간별 70%~2%, 한도 2,000만원</small></td><td class="val">−' + nf(r.earnedDed) + '</td></tr>');
    push('<tr class="sub"><td>근로소득금액</td><td class="val">' + won(r.earnedIncome) + '</td></tr>');

    push('<tr class="minus"><td class="lbl">인적공제<small>본인 포함 ' + r.family + '명 × 150만원</small></td><td class="val">−' + nf(r.basicDed) + '</td></tr>');

    if (r.ins.total > 0) {
      push('<tr class="minus"><td class="lbl">국민연금보험료<small>근로자 부담 4.75%</small></td><td class="val">−' + nf(r.ins.pension) + '</td></tr>');
      push('<tr class="minus"><td class="lbl">건강·장기요양·고용보험<small>건강 3.595% + 장기요양 + 고용 0.9%</small></td><td class="val">−' + nf(r.ins.health + r.ins.ltc + r.ins.employment) + '</td></tr>');
    }

    if (r.card.deduction > 0) {
      push('<tr class="minus"><td class="lbl">신용카드 등 소득공제<small>사용액 ' + man(r.card.totalUsage) + ' · 최저사용 ' + man(r.card.minUse) + '</small></td><td class="val">−' + nf(r.card.deduction) + '</td></tr>');
    }

    push('<tr class="sub"><td>과세표준</td><td class="val">' + won(r.taxable) + '</td></tr>');
    push('<tr><td class="lbl">산출세액<small>과세표준 × ' + pct(r.bracket.rate) + ' − 누진공제 ' + man(r.bracket.progressive) + '</small></td><td class="val">' + won(r.calcTax) + '</td></tr>');

    if (r.earnedCredit > 0) {
      push('<tr class="minus"><td class="lbl">근로소득세액공제</td><td class="val">−' + nf(r.earnedCredit) + '</td></tr>');
    }
    if (r.childCredit > 0) {
      push('<tr class="minus"><td class="lbl">자녀세액공제<small>9세 이상 ' + r.childrenCreditN + '명</small></td><td class="val">−' + nf(r.childCredit) + '</td></tr>');
    }
    if (r.pensionCredit > 0) {
      push('<tr class="minus"><td class="lbl">연금계좌 세액공제<small>' + man(r.pensionBase) + ' × ' + pct(r.pensionRate) + ' (지방소득세 포함 ' + pct(r.pensionRate * 1.1) + ')</small></td><td class="val">−' + nf(r.pensionCredit) + '</td></tr>');
    }
    if (r.rentCredit > 0) {
      push('<tr class="minus"><td class="lbl">월세 세액공제<small>' + man(r.rentBase) + ' × ' + pct(r.rentRate) + ' (지방소득세 포함 ' + pct(r.rentRate * 1.1) + ')</small></td><td class="val">−' + nf(r.rentCredit) + '</td></tr>');
    }
    if (r.standardCredit > 0) {
      push('<tr class="minus"><td class="lbl">표준세액공제</td><td class="val">−' + nf(r.standardCredit) + '</td></tr>');
    }

    push('<tr class="sub"><td>결정세액(소득세)</td><td class="val">' + won(r.decisionTax) + '</td></tr>');
    push('<tr><td class="lbl">지방소득세<small>소득세의 10%</small></td><td class="val">+' + nf(r.localTax) + '</td></tr>');
    push('<tr class="sub"><td>총 납부세액</td><td class="val">' + won(r.totalDue) + '</td></tr>');
    push('<tr><td class="lbl">기납부세액<small>' + (r.autoPaid ? '자동 추정값 · 소득세+지방소득세' : '입력값 · 소득세+지방소득세') + '</small></td><td class="val">−' + nf(r.paidTotal) + '</td></tr>');

    var label = r.diff >= 0 ? '예상 환급액' : '추가 납부액';
    var value = r.diff >= 0 ? won(r.diff) : '−' + nf(Math.abs(r.diff)) + '원';
    push('<tr class="total refund"><td>' + label + '</td><td class="val">' + value + '</td></tr>');

    return rows;
  }

  function buildDiagnosis(r, input) {
    var tips = [];
    var marginal = r.bracket.rate;
    var remainingTax = function () {
      return Math.max(0, r.calcTax - (r.earnedCredit + r.childCredit + r.pensionCredit + r.rentCredit + r.standardCredit));
    };

    // 1) 세액공제가 산출세액을 넘긴 경우
    if (r.calcTax > 0 && r.wastedCredits > 0) {
      tips.push({
        tone: 'warn',
        html: '산출세액 ' + won(r.calcTax) + '보다 세액공제가 ' + won(r.creditsTotal) +
          '이라 <strong>결정세액이 0원</strong>이에요. 공제 ' + won(r.wastedCredits) +
          '은 환급으로 이어지지 않으니, 남은 연금 납입은 내년으로 미루는 편이 나아요.'
      });
    }

    // 2) 연금계좌 여유
    var pensionRoom = Math.max(0, PENSION_CREDIT_LIMIT - r.pensionBase);
    if (input.pension > 0 && pensionRoom > 0) {
      var gain = Math.min(Math.floor(pensionRoom * r.pensionRate), remainingTax());
      if (gain > 0) {
        tips.push({
          tone: '',
          html: '연금저축·IRP에 <strong>' + man(pensionRoom) + '</strong> 더 넣으면 최대 <strong>' +
            won(Math.floor(gain * 1.1)) + '</strong> 더 돌려받아요(지방소득세 포함). 12월 31일까지 입금된 금액만 2026년 귀속이에요.'
        });
      }
    } else if (input.pension === 0 && r.decisionTax > 0) {
      var fullGain = Math.min(Math.floor(PENSION_CREDIT_LIMIT * r.pensionRate), remainingTax());
      tips.push({
        tone: '',
        html: '연금저축·IRP에 <strong>900만원</strong>을 넣으면 최대 <strong>' + won(Math.floor(fullGain * 1.1)) +
          '</strong>을 더 돌려받을 수 있어요(지방소득세 포함, 공제율 ' + pct(r.pensionRate * 1.1) + '). 55세까지 못 쓰는 돈이라 여유 자금으로 판단하세요.'
      });
    }

    // 3) 카드 공제
    if (r.card.totalUsage === 0) {
      tips.push({
        tone: '',
        html: '카드·현금영수증 사용액을 넣으면 <strong>소득공제가 얼마나 나오는지</strong> 바로 계산해 드려요. 총급여의 25%를 넘는 사용액부터 공제돼요.'
      });
    } else if (r.card.totalUsage < r.card.minUse) {
      tips.push({
        tone: 'warn',
        html: '카드 사용액 ' + man(r.card.totalUsage) + '은 최저사용금액 ' + man(r.card.minUse) +
          '보다 적어 <strong>소득공제가 0원</strong>이에요. ' + man(r.card.minUse - r.card.totalUsage) +
          '은 어떤 카드로 써도 공제가 없으니, 12월 지출을 몰아 쓰기보다 내년 계획을 세우는 게 좋아요.'
      });
    } else {
      if (r.card.totalUsage === r.card.minUse) {
        tips.push({
          tone: 'warn',
          html: '카드 사용액이 최저사용금액(' + man(r.card.minUse) + ')과 같아 <strong>소득공제가 0원</strong>이에요. 딱 그 금액을 넘는 지출부터 공제가 시작돼요.'
        });
      }
      if (r.card.deduction < r.card.baseLimit) {
        var need = (r.card.baseLimit - r.card.deduction) / 0.30;
        var savings = Math.floor(Math.floor(r.card.baseLimit - r.card.deduction) * marginal * 1.1);
        tips.push({
          tone: '',
          html: '카드 공제 기본한도(' + man(r.card.baseLimit) + ')까지 <strong>' + man(need) +
            '</strong>이 남았어요. 체크카드로 채우면 소득공제가 ' + won(Math.floor(r.card.baseLimit - r.card.deduction)) +
            ' 늘고, 세금은 약 <strong>' + won(savings) + '</strong> 줄어요(지방소득세 포함).'
        });
      } else {
        tips.push({
          tone: 'good',
          html: '카드 공제 기본한도(' + man(r.card.baseLimit) + ')를 이미 채웠어요. 남은 전통시장·대중교통 지출은 40%로 추가한도(' +
            man(r.card.addCap) + ')까지 더 공제돼요.'
        });
      }
      if (input.cardCredit > 0) {
        tips.push({
          tone: '',
          html: '총급여 25%(' + man(r.card.minUse) + ')까지는 신용카드, <strong>초과분은 체크카드·현금영수증</strong>이 유리해요. 신용 15% vs 체크 30%, 같은 지출이면 두 배로 공제돼요.'
        });
      }
    }

    // 4) 월세
    if (input.rent > 0 && !input.noHouse) {
      tips.push({
        tone: 'warn',
        html: '무주택 세대가 아니면 월세 세액공제(최대 170만원)를 받을 수 없어요. 부모님 명의 계약 등 다른 요건이 있는지 확인해 보세요.'
      });
    } else if (input.rent > 0 && r.gross > 80000000) {
      tips.push({
        tone: 'warn',
        html: '총급여가 8,000만원을 넘어 <strong>월세 세액공제 대상이 아니에요</strong>. 이 경우 월세 공제는 0원으로 계산했어요.'
      });
    } else if (input.rent > 0 && r.rentEligible && input.rent < RENT_CREDIT_LIMIT) {
      tips.push({
        tone: '',
        html: '월세는 연 1,000만원까지 공제돼요. 지금 ' + man(input.rent) + ' 기준 <strong>' + won(r.rentCredit) +
          '</strong>을 받아요. 계좌이체 내역·임대차계약서·주민등록등본을 준비해 두세요.'
      });
    }

    // 5) 5,500만원 경계
    if (r.gross > 54000000 && r.gross < 57000000) {
      tips.push({
        tone: 'warn',
        html: '총급여가 5,500만원을 넘으면 월세 공제율(17%→15%)과 연금계좌 공제율(16.5%→13.2%)이 낮아져요. 연봉 협상·잔업으로 조금 넘겼다면 환급이 줄어드는 게 정상이에요.'
      });
    }

    // 6) 부양가족
    if (r.familyInput === 1 && marginal > 0) {
      tips.push({
        tone: '',
        html: '부모님이나 배우자를 기본공제 대상(나이·연 소득 100만원 이하)으로 올리면 1인당 150만원이 소득공제돼요. 지금 세율 구간(' +
          pct(marginal) + ')이면 1명당 약 <strong>' + won(Math.floor(BASIC_DEDUCTION * marginal * 1.1)) + '</strong> 절세예요.'
      });
    }

    // 7) 자녀 카드 한도 확대
    if (r.children >= 2 && r.gross <= 70000000) {
      tips.push({
        tone: 'good',
        html: '자녀 2명 이상이라 카드 공제 기본한도가 400만원으로 늘었어요(자녀 없으면 300만원). 한도를 다 썼다면 작년보다 소득공제가 100만원 커요.'
      });
    }

    // 8) 추가 납부
    if (r.diff < 0) {
      tips.push({
        tone: 'warn',
        html: '기납부세액보다 결정세액이 커서 <strong>추가 납부</strong>가 예상돼요. 상여·성과급으로 과세표준이 올라간 경우, 부양가족·연금·월세 공제를 빠뜨린 경우가 대표적이에요.'
      });
    }

    return tips.slice(0, 4);
  }

  function render() {
    var input = readInput();

    // 기납부 자동 추정 시 표시값 갱신
    var paidField = $('#paid');
    if (input.autoPaid) {
      var est = estimateWithheld(input.gross, input.family, input.autoInsurance ? insuranceBreakdown(input.gross).total : 0);
      paidField.value = est > 0 ? Math.round(est / MAN).toLocaleString('ko-KR') : '';
    }

    // 자녀 세액공제 대상은 전체 자녀 수를 넘을 수 없음
    if (input.childrenCredit > input.children) {
      input.childrenCredit = input.children;
      $('#childrenCredit').value = input.children;
    }

    // 칩 활성 상태
    $$('.chip[data-gross]').forEach(function (chip) {
      var v = parseInt(chip.getAttribute('data-gross'), 10) * MAN;
      chip.classList.toggle('is-active', input.gross === v);
    });

    if (input.gross <= 0) {
      current = null;
      $('#resultEmpty').hidden = false;
      $('#resultBody').hidden = true;
      $('#mobileBar').classList.remove('is-visible');
      document.body.classList.remove('has-result');
      return;
    }

    var r = calculate(input);
    current = r;

    $('#resultEmpty').hidden = true;
    $('#resultBody').hidden = false;
    document.body.classList.add('has-result');

    // 배너
    var banner = $('#resultBanner');
    var label, amount, note;
    banner.classList.remove('is-due', 'is-zero');

    if (r.diff > 0) {
      label = '예상 환급액';
      amount = '+' + won(r.diff);
      note = '기납부 ' + won(r.paidTotal) + ' − 총 납부세액 ' + won(r.totalDue) + ' · 지방소득세 포함';
    } else if (r.diff < 0) {
      label = '추가 납부 예상';
      amount = '−' + won(Math.abs(r.diff));
      note = '총 납부세액 ' + won(r.totalDue) + ' − 기납부 ' + won(r.paidTotal) + ' · 지방소득세 포함';
      banner.classList.add('is-due');
    } else {
      label = '정산 금액';
      amount = '0원';
      note = '기납부세액과 총 납부세액이 같아요';
      banner.classList.add('is-zero');
    }
    $('#resultLabel').textContent = label;
    $('#resultAmount').textContent = amount;
    $('#resultNote').textContent = note;

    // 요약
    $('#statDecision').textContent = won(r.totalDue);
    $('#statRate').textContent = (r.effectiveRate * 100).toFixed(1) + '%';
    var totalDeduction = r.earnedDed + r.basicDed + r.ins.total + r.card.deduction;
    $('#statDeduction').textContent = won(totalDeduction);

    // 진단
    var list = $('#diagList');
    list.innerHTML = '';
    buildDiagnosis(r, input).forEach(function (tip) {
      var li = document.createElement('li');
      if (tip.tone) li.className = 'is-' + tip.tone;
      li.innerHTML = tip.html;
      list.appendChild(li);
    });

    // 영수증
    var tbody = $('#receipt tbody');
    tbody.innerHTML = receiptRows(r).map(function (row) { return row.html; }).join('');

    // 모바일 바
    $('#mbLabel').textContent = label;
    $('#mbAmount').textContent = amount;
    $('#mobileBar').classList.toggle('is-due', r.diff < 0);
    $('#mobileBar').classList.add('is-visible');
  }

  /* ---------------- 이벤트 ---------------- */
  function init() {
    var form = $('#calcForm');
    if (!form) return;

    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.matches('input[data-unit="man"]') && !t.disabled) {
        formatManField(t);
      }
      if (t.id === 'children') {
        var c = parseInt(t.value, 10) || 0;
        var cc = $('#childrenCredit');
        if ((parseInt(cc.value, 10) || 0) > c) cc.value = c;
      }
      render();
    });

    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'autoPaid') {
        var paid = $('#paid');
        paid.disabled = t.checked;
        paid.setAttribute('placeholder', t.checked ? '자동 추정 중' : '예: 96');
      }
      render();
    });

    // 연봉 프리셋
    $$('.chip[data-gross]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var v = parseInt(chip.getAttribute('data-gross'), 10);
        var gross = $('#gross');
        gross.value = v.toLocaleString('ko-KR');
        render();
      });
    });

    // 스테퍼
    $$('.step-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.getAttribute('data-step'));
        if (!target) return;
        var delta = parseInt(btn.getAttribute('data-delta'), 10);
        var min = parseInt(target.getAttribute('min'), 10);
        var max = parseInt(target.getAttribute('max'), 10);
        var next = (parseInt(target.value, 10) || min) + delta;
        next = Math.max(min, Math.min(max, next));
        target.value = next;
        if (target.id === 'children') {
          var cc = $('#childrenCredit');
          if ((parseInt(cc.value, 10) || 0) > next) cc.value = next;
        }
        render();
      });
    });

    // 예시 값
    var sample = $('#fillSample');
    if (sample) {
      sample.addEventListener('click', function () {
        $('#gross').value = '4,500';
        $('#cardCredit').value = '1,500';
        $('#cardCheck').value = '500';
        $('#cardMarket').value = '0';
        $('#rent').value = '600';
        $('#pension').value = '300';
        $('#family').value = '1';
        $('#children').value = '0';
        $('#childrenCredit').value = '0';
        $('#noHouse').checked = true;
        $('#autoPaid').checked = true;
        $('#paid').disabled = true;
        $('#autoInsurance').checked = true;
        render();
        var card = $('#resultCard');
        if (card && window.matchMedia('(max-width: 1000px)').matches) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // 광고 자리 숨김 옵션 (?ads=off)
    if (/[?&]ads=off/.test(location.search)) {
      $$('.ad-slot').forEach(function (el) { el.hidden = true; });
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
