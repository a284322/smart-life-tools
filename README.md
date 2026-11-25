# 스마트 라이프 툴즈 — 2026 연말정산 환급금 계산기

정적 사이트(HTML/CSS/JS)입니다. 서버·빌드 과정 없이 폴더를 그대로 올리면 동작합니다.

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 메인 랜딩 + 계산기 (SEO 메타, Open Graph, JSON-LD: WebSite·SoftwareApplication·FAQPage) |
| `styles.css` | 전체 스타일 (모바일 퍼스트, 320~1600px 확인) |
| `app.js` | 계산 엔진 + 실시간 결과 + 맞춤 절세 진단 |
| `privacy.html` | 개인정보처리방침 (쿠키·Google AdSense 안내 포함) |
| `about.html` | 사이트 소개 및 계산 기준(법령 근거·미반영 항목) |
| `robots.txt`, `sitemap.xml` | 검색엔진 수집용 |
| `assets/og-cover.png` | SNS 공유 이미지 (1200×630) |

## 배포 전 반드시 할 일

1. **도메인** — `index.html`, `about.html`, `privacy.html`, `robots.txt`, `sitemap.xml`의 canonical·OG·sitemap 주소는
   `https://tools.niceluckydays.com` 으로 설정되어 있습니다. (canonical·OG·sitemap 주소가 틀리면 검색 노출에 불리합니다.)
   다른 도메인으로 옮길 때는 아래처럼 일괄 치환하세요.
   ```bash
   grep -rl "tools.niceluckydays.com" . | xargs sed -i 's#https://tools.niceluckydays.com#https://내도메인#g'
   ```
2. **AdSense 코드 삽입** — `index.html`의 `<!-- AdSense 슬롯 -->` 주석 두 곳(`.ad-slot[data-ad-slot="top"]`, `[data-ad-slot="result-bottom"]`)의
   `<span>` 안내 문구를 실제 광고 단위 코드로 교체하세요. 미리보기에서 광고 자리를 숨기려면 URL 뒤에 `?ads=off`를 붙이면 됩니다.
3. **ads.txt** — 애드센스 승인 후 게시자 ID로 `ads.txt`를 추가하세요.
4. **Search Console / 네이버 서치어드바이저** — 사이트 등록 후 `sitemap.xml` 제출.

## 로컬에서 확인

```bash
cd projects/smart-life-tools
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## 계산 기준

- 2026년 귀속(2027년 1~2월 정산) 기준, 2026년 11월 현재 공포·시행 법령.
- 반영: 근로소득공제, 인적공제(1인당 150만원), 4대보험료(2026년 요율), 신용카드 등 소득공제(자녀 수별 한도),
  근로소득세액공제, 자녀세액공제(9세 이상), 연금계좌 세액공제(900만원 한도, 15%/12% + 지방소득세),
  월세 세액공제(1,000만원 한도, 17%/15%), 표준세액공제(13만원), 지방소득세(10%).
- 미반영: 의료비·교육비·기부금·보장성보험료·주택자금, 부양가족 추가공제, 감면·세액감면, ISA 전환 추가공제.
- 2026년 8월 정부 세제개편안과 12월 국회 의결 내용은 반영하지 않았습니다. 확정되면 `app.js` 상단 상수와
  `about.html` 기준표를 함께 갱신하세요.

## 갱신이 필요한 시점

- 국세청이 2026년 귀속 연말정산 신고안내를 확정 발표할 때 (보통 12월~1월)
- 4대보험료율이 바뀔 때 → `app.js`의 `RATES`
- 카드 공제 한도·자녀세액공제 등 한도 변경 시 → `app.js`의 `cardDeduction()`, `calculate()`
