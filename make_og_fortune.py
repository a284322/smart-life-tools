#!/usr/bin/env python3
"""2027 신년운세 OG 카드(1200x630) 생성 – 한지빛 + 금빛/주홍 낙관 스타일"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
SANS = "/usr/share/fonts/pickle-hwp/NotoSansCJKkr-Regular.otf"
SERIF = "/usr/share/fonts/pickle-hwp/NotoSerifCJKkr-Regular.otf"


def font(path, size):
    return ImageFont.truetype(path, size)


def vgrad(top, bottom, w, h):
    base = Image.new("RGB", (1, h))
    d = ImageDraw.Draw(base)
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.point((0, y), c)
    return base.resize((w, h))


img = vgrad((253, 248, 239), (243, 232, 213), W, H).convert("RGBA")
d = ImageDraw.Draw(img, "RGBA")

# 은은한 원(해·달) – 오른쪽
for r, a in ((250, 26), (196, 22)):
    d.ellipse([W - 120 - r, -80 - r // 3, W - 120 + r, -80 + r * 2 - r // 3],
              outline=(201, 139, 58, a), width=3)

# 구름 라인
d.line([(60, 552), (200, 552)], fill=(201, 139, 58, 60), width=2)
d.line([(70, 566), (150, 566)], fill=(201, 139, 58, 40), width=2)

# 상단 브랜드
d.rounded_rectangle([72, 60, 118, 106], radius=13, fill=(37, 99, 235))
d.text((95, 83), "₩", font=font(SANS, 30), fill=(255, 255, 255), anchor="mm")
d.text((132, 72), "스마트 라이프 툴즈", font=font(SANS, 26), fill=(60, 48, 36))

# 낙관(도장)
seal = [980, 62, 1130, 212]
d.rounded_rectangle(seal, radius=20, fill=(179, 38, 30))
d.rounded_rectangle([seal[0] + 9, seal[1] + 9, seal[2] - 9, seal[3] - 9], radius=13,
                    outline=(255, 244, 232, 150), width=3)
d.text((1055, 137), "丁\n未", font=font(SERIF, 46), fill=(255, 247, 238),
       anchor="mm", align="center", spacing=2)

# 제목
d.text((74, 178), "2027", font=font(SANS, 52), fill=(180, 83, 9))
d.text((74, 240), "신년운세", font=font(SANS, 96), fill=(28, 22, 18))
d.text((80, 372), "정미년 丁未年 · 붉은 양의 해", font=font(SERIF, 38), fill=(146, 64, 14))

# 설명
d.text((80, 448), "생년월일만 넣으면 총운·재물·직장·애정·건강운과",
       font=font(SANS, 27), fill=(92, 78, 62))
d.text((80, 488), "월별 흐름, 행운의 컬러까지 한 장에",
       font=font(SANS, 27), fill=(92, 78, 62))

# 하단 구분선 + 주소
d.line([(80, 588), (W - 80, 588)], fill=(201, 139, 58, 70), width=2)
d.text((80, 604), "tools.niceluckydays.com", font=font(SANS, 21), fill=(150, 122, 92), anchor="lm")
d.text((W - 80, 604), "무료 · 회원가입 없음", font=font(SANS, 21), fill=(150, 122, 92), anchor="rm")

img.convert("RGB").save("assets/og-fortune.png", quality=92)
print("saved assets/og-fortune.png", img.size)
