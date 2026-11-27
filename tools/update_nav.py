#!/usr/bin/env python3
"""모든 페이지의 상단·하단 내비게이션을 같은 내용으로 맞춘다."""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

HEADER_ITEMS = [
    ("index.html", "calc", '연말정산<span class="nav-long"> 계산기</span>'),
    ("calculator.html", "life", '생활계산기'),
    ("car-tax.html", "cartax", '자동차세<span class="nav-long"> 연납</span>'),
    ("unemployment.html", "unemp", '실업급여<span class="nav-long"> 계산</span>'),
    ("subsidy.html", "subsidy", '내 지원금<span class="nav-long"> 찾기</span>'),
    ("fortune.html", "fortune", '<span class="nav-long">2027 </span>신년운세'),
    ("tojeong.html", "tojeong", '토정비결'),
    ("tarot.html", "tarot", '타로<span class="nav-long">·궁합</span>'),
]

FOOTER_ITEMS = [
    ("index.html", "연말정산 계산기"),
    ("calculator.html", "생활계산기"),
    ("car-tax.html", "자동차세 연납"),
    ("unemployment.html", "실업급여 계산기"),
    ("subsidy.html", "내 지원금 찾기"),
    ("fortune.html", "2027 신년운세"),
    ("tojeong.html", "2027 토정비결"),
    ("tarot.html", "타로·궁합"),
    ("about.html", "사이트 소개"),
    ("privacy.html", "개인정보처리방침"),
]

def header_nav(active):
    lines = ['    <nav class="site-nav" aria-label="주요 메뉴">']
    for href, key, label in HEADER_ITEMS:
        if href == active:
            lines.append(f'      <a href="{href}" class="is-active" data-nav="{key}" aria-current="page">{label}</a>')
        else:
            lines.append(f'      <a href="{href}" data-nav="{key}">{label}</a>')
    lines.append('    </nav>')
    return "\n".join(lines)

def footer_nav():
    lines = ['    <nav class="footer-nav" aria-label="바닥글 메뉴">']
    for href, label in FOOTER_ITEMS:
        lines.append(f'      <a href="{href}">{label}</a>')
    lines.append('      <a href="mailto:a284322@gmail.com">문의 a284322@gmail.com</a>')
    lines.append('    </nav>')
    return "\n".join(lines)

HEADER_RE = re.compile(r'    <nav class="site-nav"[^>]*>.*?</nav>', re.S)
FOOTER_RE = re.compile(r'    <nav class="footer-nav"[^>]*>.*?</nav>', re.S)

for path in sorted(ROOT.glob("*.html")):
    if path.name.startswith(("google", "naver")):
        continue
    text = path.read_text(encoding="utf-8")
    orig = text
    if HEADER_RE.search(text):
        text = HEADER_RE.sub(header_nav(path.name), text, count=1)
    if FOOTER_RE.search(text):
        text = FOOTER_RE.sub(footer_nav(), text, count=1)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("updated", path.name)
    else:
        print("skipped", path.name)
