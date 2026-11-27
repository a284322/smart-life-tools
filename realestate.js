/* =========================================================
   부동산 취득세 · 중개보수 · 전월세 전환 계산기 (realestate.js)
   기준
   - 취득세: 지방세법 제11조①8호(주택 유상취득 1~3%), 제13조의2(다주택 중과 8%·12%),
     제151조(지방교육세), 농어촌특별세법 제4조·제5조
   - 중개보수: 공인중개사법 시행규칙 제20조·별표 1 (2026. 8. 28. 시행)
   - 전월세 전환: 주택임대차보호법 제7조의2, 시행령 제9조
     법정 전환율 = min(10%, 한국은행 기준금리 + 2%)
   모든 계산은 브라우저 안에서만 이루어지며 입력값은 전송·저장되지 않습니다.
   ========================================================= */
(function () {
  'use strict';

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
    var d = String(el.value).replace(/[^0-9]/g, '').slice(0, 13);
    el.value = d ? parseInt(d, 10).toLocaleString('ko-KR') : '';
  }
  function rateText(r) {
    var p = r * 100;
    if (Math.abs(p - Math.round(p)) < 0.0005) return Math.round(p) + '%';
    return p.toFixed(2).replace(/0$/, '') + '%';
  }

  /* ---------------- 취득세 ---------------- */
  function basicRate(price) {
    if (price <= 0) return 0;
    if (price <= 600000000) return 0.01;
    if (price <= 900000000) {
      var pct = price * 2 / 300000000 - 3;           // 1% ~ 3%
      return Math.round(pct * 10000) / 1000000;      // 소수점 넷째자리 반올림
    }
    return 0.03;
  }

  function calcAcquisition(price, count, zone, large, firstTime) {
    var base = basicRate(price);
    var heavy = 0;
    if (count === 2 && zone) heavy = 0.08;
    else if (count === 3) heavy = zone ? 0.12 : 0.08;
    else if (count >= 4) heavy = 0.12;

    var rate = heavy || base;
    var mainTax = Math.floor(price * rate);
    var eduTax = heavy ? Math.floor(price * 0.004) : Math.floor(mainTax * 0.1);
    var farmTax = 0;
    if (large) {
      if (!heavy) farmTax = Math.floor(price * 0.002);
      else farmTax = Math.floor(price * (heavy === 0.08 ? 0.006 : 0.01));
    }

    var relief = 0;
    if (firstTime && count === 1 && price <= 1200000000) {
      relief = Math.min(mainTax, 2000000);
    }
    var total = mainTax - relief + eduTax + farmTax;

    return {
      price: price, count: count, zone: zone, large: large, heavy: heavy,
      rate: rate, mainTax: mainTax, eduTax: eduTax, farmTax: farmTax,
      relief: relief, total: total,
      ratio: price > 0 ? total / price : 0,
      firstEligible: firstTime && count === 1 && price <= 1200000000
    };
  }

  /* ---------------- 중개보수 ---------------- */
  var SALE_TABLE = [
    { upTo: 50000000, rate: 0.006, cap: 250000 },
    { upTo: 200000000, rate: 0.005, cap: 800000 },
    { upTo: 900000000, rate: 0.004, cap: 0 },
    { upTo: 1200000000, rate: 0.005, cap: 0 },
    { upTo: 1500000000, rate: 0.006, cap: 0 },
    { upTo: Infinity, rate: 0.007, cap: 0 }
  ];
  var RENT_TABLE = [
    { upTo: 50000000, rate: 0.005, cap: 200000 },
    { upTo: 100000000, rate: 0.004, cap: 300000 },
    { upTo: 600000000, rate: 0.003, cap: 0 },
    { upTo: 1200000000, rate: 0.004, cap: 0 },
    { upTo: 1500000000, rate: 0.005, cap: 0 },
    { upTo: Infinity, rate: 0.006, cap: 0 }
  ];

  function feeFromTable(amount, table) {
    for (var i = 0; i < table.length; i++) {
      if (amount < table[i].upTo) {
        var raw = amount * table[i].rate;
        var fee = table[i].cap ? Math.min(raw, table[i].cap) : raw;
        return { rate: table[i].rate, cap: table[i].cap, raw: raw, fee: fee, band: i };
      }
    }
    return { rate: 0, cap: 0, raw: 0, fee: 0, band: 0 };
  }

  function calcFee(type, amount, deposit, rent) {
    var deal = amount;
    if (type === 'monthly') {
      var with100 = deposit + rent * 100;
      deal = with100 < 50000000 ? deposit + rent * 70 : with100;
    }
    var table = type === 'sale' ? SALE_TABLE : RENT_TABLE;
    var r = feeFromTable(deal, table);
    return {
      type: type, amount: amount, deposit: deposit, rent: rent, deal: deal,
      rate: r.rate, cap: r.cap, raw: r.raw, fee: r.fee,
      both: r.fee * 2, vat: r.fee * 1.1
    };
  }

  /* ---------------- 전월세 전환 ---------------- */
  function legalRate(baseRate) {
    return Math.min(0.10, Math.max(0, baseRate) / 100 + 0.02);
  }

  function calcConvert(mode, baseRate, deposit, newDeposit, rent) {
    var rate = legalRate(baseRate);
    if (mode === 'toMonthly') {
      var converted = Math.max(0, deposit - newDeposit);
      var monthlyCap = converted * rate / 12;
      return {
        mode: mode, rate: rate, converted: converted,
        monthlyCap: monthlyCap, yearly: monthlyCap * 12,
        result: monthlyCap
      };
    }
    var total = deposit + (rate > 0 ? rent * 12 / rate : 0);
    return {
      mode: mode, rate: rate, converted: total - deposit,
      monthlyCap: rent, yearly: rent * 12, result: total
    };
  }

  /* ---------------- 탭 ---------------- */
  var currentTab = 'tax';
  function activateTab(name, focus, updateHash) {
    if (['tax', 'fee', 'convert'].indexOf(name) < 0) name = 'tax';
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
    var order = ['tax', 'fee', 'convert'];
    $$('.tab-btn', tabbar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        activateTab(btn.getAttribute('data-tab'), false, true);
      });
    });
    tabbar.addEventListener('keydown', function (e) {
      var idx = order.indexOf(currentTab);
      if (e.key === 'ArrowRight') { activateTab(order[(idx + 1) % 3], true, true); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { activateTab(order[(idx + 2) % 3], true, true); e.preventDefault(); }
    });
    if (order.indexOf(location.hash.replace('#', '')) >= 0) activateTab(location.hash.replace('#', ''), false, false);
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
  var state = { count: 1, zone: true, size: 'small', feeType: 'sale', cvMode: 'toMonthly' };

  function renderTax() {
    var price = readDigits($('#rtPrice'));
    $$('.chip[data-price]').forEach(function (c) {
      c.classList.toggle('is-active', parseInt(c.getAttribute('data-price'), 10) === price);
    });

    if (!price) {
      $('#rtTotal').textContent = '0원';
      $('#rtMain').textContent = '0원';
      $('#rtRate').textContent = '-';
      $('#rtRatio').textContent = '-';
      $('#rtNote').textContent = '매매가를 입력하면 바로 계산됩니다.';
      $('#rtReceipt').innerHTML = '';
      $('#rtSplit').innerHTML = '';
      $('#rtWarn').hidden = true;
      return;
    }

    var r = calcAcquisition(price, state.count, state.zone, state.size === 'large', $('#rtFirst').checked);

    $('#rtTotal').textContent = won(r.total);
    $('#rtMain').textContent = won(r.mainTax);
    $('#rtRate').textContent = rateText(r.rate);
    $('#rtRatio').textContent = (r.ratio * 100).toFixed(2) + '%';
    $('#rtNote').textContent = r.count + '주택 · ' + (state.zone ? '조정대상지역' : '비조정지역') +
      ' · 전용 85㎡ ' + (state.size === 'large' ? '초과' : '이하') +
      (r.heavy ? ' · 중과 적용' : '');

    var rows = [];
    rows.push(row('취득가액', won(r.price)));
    rows.push(row('적용 취득세율', rateText(r.rate), { small: r.heavy ? '다주택 중과' : '기본세율' }));
    rows.push(row('취득세 본세', won(r.mainTax)));
    if (r.relief > 0) {
      rows.push(row('생애최초 감면', '−' + won(r.relief), { minus: true, small: '본세에서 공제' }));
    }
    rows.push(row('지방교육세', won(r.eduTax), { small: r.heavy ? '중과 0.4%' : '취득세율의 10분의 1' }));
    if (r.farmTax > 0) {
      rows.push(row('농어촌특별세', won(r.farmTax), { small: '전용 85㎡ 초과' }));
    }
    rows.push(row('총 납부 세액', won(r.total), { total: true }));

    $('#rtReceipt').innerHTML = rows.join('');
    $('#rtSplit').innerHTML =
      '<div><span>매매가 대비 세금 비율</span><strong>' + (r.ratio * 100).toFixed(2) + '%</strong></div>' +
      '<div><span>지방교육세</span><strong>' + won(r.eduTax) + '</strong></div>' +
      '<div><span>농어촌특별세</span><strong>' + won(r.farmTax) + '</strong></div>';

    var warn = $('#rtWarn');
    if (r.heavy) {
      warn.hidden = false;
      warn.textContent = '다주택 중과가 적용되어 기본세율보다 ' + rateText(r.rate - basicRate(price)) +
        ' 높습니다. 일시적 2주택·상속주택 등 예외가 있으면 실제 세율이 달라질 수 있습니다.';
    } else if (r.firstEligible) {
      warn.hidden = false;
      warn.textContent = '생애최초 감면은 본세 기준 최대 200만원(소형 주택 등 300만원)이고, 지방교육세·농특세는 감면 전 세율로 계산했습니다. 세부 요건은 관할 지자체에서 확인하세요.';
    } else {
      warn.hidden = true;
    }
  }

  function feeLabel(type) {
    if (type === 'sale') return { label: '매매가', help: '2억원 이상 9억원 미만은 0.4%, 9억원 이상 12억원 미만은 0.5%가 상한입니다.' };
    if (type === 'jeonse') return { label: '전세 보증금', help: '1억원 이상 6억원 미만은 0.3%가 상한입니다. 6억원을 넘으면 0.4%입니다.' };
    return { label: '월세 (참고)', help: '월세는 보증금 + 월세 × 100을 거래금액으로 봅니다. 합이 5천만원 미만이면 월세 × 70을 씁니다.' };
  }

  function renderFee() {
    var type = state.feeType;
    var amount = readDigits($('#feeAmount'));
    var deposit = readDigits($('#feeDeposit'));
    var rent = readDigits($('#feeRent'));

    $('#feeMonthlyRow').hidden = type !== 'monthly';
    $('#feeAmountLabel').innerHTML = feeLabel(type).label + ' <span class="unit">원</span>';
    $('#feeHelp').textContent = feeLabel(type).help;

    var dealCheck = type === 'monthly' ? (deposit || rent) : amount;
    if (!dealCheck) {
      $('#feeLimit').textContent = '0원';
      $('#feeNote').textContent = '거래금액을 입력하면 바로 계산됩니다.';
      $('#feeRate').textContent = '-';
      $('#feeBoth').textContent = '0원';
      $('#feeVat').textContent = '0원';
      $('#feeReceipt').innerHTML = '';
      $('#feeTableNote').textContent = '';
      return;
    }

    var r = calcFee(type, amount, deposit, rent);

    $('#feeLimit').textContent = won(r.fee);
    $('#feeNote').textContent = (type === 'sale' ? '매매' : type === 'jeonse' ? '전세' : '월세') +
      ' 거래금액 ' + won(r.deal) + ' · 상한요율 ' + rateText(r.rate) + ' 기준';
    $('#feeRate').textContent = rateText(r.rate);
    $('#feeBoth').textContent = won(r.both);
    $('#feeVat').textContent = won(r.vat);

    var rows = [];
    if (type === 'monthly') {
      rows.push(row('보증금', won(r.deposit)));
      rows.push(row('월세 × 100', won(r.rent * 100)));
      if (r.deposit + r.rent * 100 < 50000000) {
        rows.push(row('5천만원 미만 → 월세 × 70', won(r.rent * 70), { small: '환산 방식 변경' }));
      }
      rows.push(row('거래금액(환산보증금)', won(r.deal), { sub: true }));
    } else {
      rows.push(row(type === 'sale' ? '매매가' : '전세 보증금', won(r.deal)));
    }
    rows.push(row('상한요율', rateText(r.rate)));
    rows.push(row('계산값', won(r.raw)));
    if (r.cap) rows.push(row('한도액', won(r.cap), { small: '계산값과 한도액 중 작은 금액' }));
    rows.push(row('한쪽당 중개보수 상한', won(r.fee), { total: true }));
    rows.push(row('매도·매수(임대·임차) 합계', won(r.both), { sub: true }));
    rows.push(row('부가세 10% 포함(참고)', won(r.vat), { small: '일반과세 사무소 기준' }));

    $('#feeReceipt').innerHTML = rows.join('');
    $('#feeTableNote').textContent = type === 'monthly'
      ? '이 금액은 임대인과 임차인이 각각 낼 수 있는 상한입니다. 실제 중개보수는 이 안에서 협의해 정하고, 부가세는 별도입니다.'
      : '법정 상한은 천장일 뿐 정가가 아닙니다. 이 안에서 중개사와 협의해 정하며, 부가세는 상한에 포함되지 않습니다.';
  }

  function renderConvert() {
    var baseRate = readDecimal($('#cvBaseRate'));
    var mode = state.cvMode;
    var deposit = readDigits(mode === 'toMonthly' ? $('#cvDeposit') : $('#cvDeposit2'));
    var newDeposit = readDigits($('#cvNewDeposit'));
    var rent = readDigits($('#cvRent'));

    $('#cvDepositRow').hidden = mode !== 'toMonthly';
    $('#cvMonthlyRow').hidden = mode !== 'toDeposit';

    var rate = legalRate(baseRate);
    $('#cvRate').textContent = (rate * 100).toFixed(2).replace(/0$/, '') + '%';

    if (mode === 'toMonthly' && (!deposit || newDeposit >= deposit)) {
      $('#cvResultLabel').textContent = '월세 상한';
      $('#cvResult').textContent = '0원';
      $('#cvNote').textContent = '현재 보증금이 바꾼 뒤 보증금보다 커야 계산됩니다.';
      $('#cvYearly').textContent = '0원';
      $('#cvAmount').textContent = '0원';
      $('#cvReceipt').innerHTML = '';
      $('#cvWarn').hidden = true;
      return;
    }
    if (mode === 'toDeposit' && (!deposit && !rent)) {
      $('#cvResultLabel').textContent = '전세 환산액';
      $('#cvResult').textContent = '0원';
      $('#cvNote').textContent = '보증금과 월세를 입력하면 바로 계산됩니다.';
      $('#cvYearly').textContent = '0원';
      $('#cvAmount').textContent = '0원';
      $('#cvReceipt').innerHTML = '';
      $('#cvWarn').hidden = true;
      return;
    }

    var r = calcConvert(mode, baseRate, deposit, newDeposit, rent);

    if (mode === 'toMonthly') {
      $('#cvResultLabel').textContent = '월세 상한';
      $('#cvResult').textContent = won(r.monthlyCap);
      $('#cvYearly').textContent = won(r.yearly);
      $('#cvAmount').textContent = won(r.converted);
      $('#cvNote').textContent = '보증금 ' + won(r.converted) + '을 월세로 전환 · 법정 전환율 ' + (rate * 100).toFixed(2) + '%';

      var rows = [];
      rows.push(row('현재 보증금', won(deposit)));
      rows.push(row('바꾼 뒤 보증금', won(newDeposit)));
      rows.push(row('전환되는 보증금', won(r.converted), { sub: true }));
      rows.push(row('법정 전환율', (rate * 100).toFixed(2) + '%', { small: '기준금리 ' + baseRate + '% + 2%' }));
      rows.push(row('월세 상한', won(r.monthlyCap), { total: true, small: '전환금액 × 전환율 ÷ 12' }));
      rows.push(row('연 환산', won(r.yearly), { sub: true }));
      $('#cvReceipt').innerHTML = rows.join('');

      var warn = $('#cvWarn');
      warn.hidden = false;
      warn.textContent = '이 금액을 넘겨 받으면 초과분은 돌려달라고 청구할 수 있습니다(주택임대차보호법 제10조의2). 실제 월세는 이 상한 안에서 협의해 정합니다.';
    } else {
      $('#cvResultLabel').textContent = '전세 환산액';
      $('#cvResult').textContent = won(r.result);
      $('#cvYearly').textContent = won(r.yearly);
      $('#cvAmount').textContent = won(r.converted);
      $('#cvNote').textContent = '보증금 ' + won(deposit) + ' + 월세 ' + won(rent) + ' · 법정 전환율 ' + (rate * 100).toFixed(2) + '% 기준';

      var rows2 = [];
      rows2.push(row('보증금', won(deposit)));
      rows2.push(row('월세 (연)', won(rent * 12), { small: '월 ' + won(rent) }));
      rows2.push(row('법정 전환율', (rate * 100).toFixed(2) + '%'));
      rows2.push(row('월세의 보증금 환산액', won(r.converted), { small: '연 월세 ÷ 전환율' }));
      rows2.push(row('전세 환산액', won(r.result), { total: true }));
      rows2.push(row('연 이자 상당액', won(r.yearly), { sub: true }));
      $('#cvReceipt').innerHTML = rows2.join('');
      $('#cvWarn').hidden = true;
    }
  }

  /* ---------------- 이벤트 ---------------- */
  function setSeg(containerId, attr, value) {
    $$('#' + containerId + ' .seg-btn').forEach(function (b) {
      var on = b.getAttribute(attr) === String(value);
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function bind() {
    $$('input[data-unit="num"]').forEach(function (el) {
      el.addEventListener('input', function () {
        formatMoney(el);
        if (el.id === 'rtPrice') renderTax();
        else if (el.id.indexOf('fee') === 0) renderFee();
        else renderConvert();
      });
    });

    $$('.chip[data-price]').forEach(function (c) {
      c.addEventListener('click', function () {
        $('#rtPrice').value = parseInt(c.getAttribute('data-price'), 10).toLocaleString('ko-KR');
        renderTax();
      });
    });

    $$('.chip[data-amount]').forEach(function (c) {
      c.addEventListener('click', function () {
        $('#feeAmount').value = parseInt(c.getAttribute('data-amount'), 10).toLocaleString('ko-KR');
        renderFee();
      });
    });

    $$('#rtCountSeg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.count = parseInt(b.getAttribute('data-count'), 10);
        setSeg('rtCountSeg', 'data-count', state.count);
        renderTax();
      });
    });
    $$('#rtAreaSeg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.zone = b.getAttribute('data-zone') === 'yes';
        setSeg('rtAreaSeg', 'data-zone', state.zone ? 'yes' : 'no');
        renderTax();
      });
    });
    $$('#rtSizeSeg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.size = b.getAttribute('data-size');
        setSeg('rtSizeSeg', 'data-size', state.size);
        renderTax();
      });
    });
    $('#rtFirst').addEventListener('change', renderTax);

    $$('#feeTypeSeg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.feeType = b.getAttribute('data-type');
        setSeg('feeTypeSeg', 'data-type', state.feeType);
        $('#feeChips').hidden = state.feeType === 'monthly';
        $('#feeAmount').parentElement.parentElement.hidden = state.feeType === 'monthly';
        renderFee();
      });
    });

    $$('#cvModeSeg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.cvMode = b.getAttribute('data-mode');
        setSeg('cvModeSeg', 'data-mode', state.cvMode);
        $('#cvHelp').textContent = state.cvMode === 'toMonthly'
          ? '전환되는 보증금(현재 보증금 − 바꾼 뒤 보증금)에 법정 전환율을 곱해 월세 상한을 구합니다.'
          : '보증금에 연 월세를 전환율로 나눈 금액을 더해 전세 환산액을 구합니다.';
        renderConvert();
      });
    });

    $('#cvBaseRate').addEventListener('input', renderConvert);
    $('#cvBaseRate').addEventListener('change', renderConvert);

    ['#taxForm', '#feeForm', '#convertForm'].forEach(function (sel) {
      var form = $(sel);
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sel === '#taxForm') renderTax();
        else if (sel === '#feeForm') renderFee();
        else renderConvert();
      });
    });
  }

  function init() {
    $$('input[data-unit="num"]').forEach(formatMoney);
    initTabs();
    bind();
    renderTax();
    renderFee();
    renderConvert();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__realestate = {
    calcAcquisition: calcAcquisition, calcFee: calcFee,
    calcConvert: calcConvert, legalRate: legalRate
  };
})();
