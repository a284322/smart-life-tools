/* =========================================================
   공통 내비게이션 보조 (nav.js)
   - 도구가 많아 좁은 화면에서 메뉴 줄이 가로로 밀리는데,
     지금 보고 있는 페이지가 가려지지 않게 그 자리로 옮겨 준다.
   - 페이지에 is-active 표시가 빠져 있으면 주소를 보고 채운다.
   ========================================================= */
(function () {
  'use strict';

  var nav = document.querySelector('.site-nav');
  if (!nav) return;

  var file = (location.pathname.split('/').pop() || 'index.html');
  if (file === '') file = 'index.html';

  var links = nav.querySelectorAll('a[data-nav]');
  var active = nav.querySelector('a.is-active');

  if (!active) {
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === file) {
        links[i].classList.add('is-active');
        active = links[i];
        break;
      }
    }
  }

  function markOverflow() {
    nav.classList.toggle('has-overflow', nav.scrollWidth > nav.clientWidth + 2);
  }

  function reveal() {
    markOverflow();
    if (!active) return;
    if (nav.scrollWidth <= nav.clientWidth + 2) return;
    var a = active.getBoundingClientRect();
    var n = nav.getBoundingClientRect();
    if (a.left < n.left + 4) {
      nav.scrollLeft += (a.left - n.left) - 20;
    } else if (a.right > n.right - 4) {
      nav.scrollLeft += (a.right - n.right) + 20;
    }
  }

  reveal();
  window.addEventListener('load', reveal);
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(reveal, 150);
  });
})();
