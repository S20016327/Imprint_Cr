#!/usr/bin/env python3
"""Render the 12-second Imprint vertical motion piece to H.264 MP4.

Dependencies: Pillow, imageio-ffmpeg, arabic-reshaper, python-bidi.
"""
from pathlib import Path
import math
import subprocess
import sys

import arabic_reshaper
import imageio_ffmpeg
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "deliverables" / "imprint-creative-film.mp4"
W, H, FPS, SECONDS = 1080, 1920, 24, 12
GOLD = (194, 154, 82)
INK = (16, 29, 46)
PAPER = (244, 241, 234)
MUTED = (119, 119, 111)

FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
if not Path(FONT_REGULAR).exists():
    FONT_REGULAR = "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
    FONT_BOLD = "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def shape(text):
    return get_display(arabic_reshaper.reshape(text))


def clamp(x):
    return max(0.0, min(1.0, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def alpha_composite_at(base, overlay, xy, opacity=1.0):
    if opacity < 1:
        overlay = overlay.copy()
        overlay.putalpha(overlay.getchannel("A").point(lambda a: int(a * clamp(opacity))))
    base.alpha_composite(overlay, xy)


def centered_arabic(draw, text, y, fnt, color, opacity=1.0):
    # Reshape Arabic joining and bidi order for Pillow's non-RAQM text engine.
    rgba = tuple(color) + (round(255 * clamp(opacity)),)
    draw.text((W // 2, y), shape(text), font=fnt, fill=rgba, anchor="mm", stroke_width=0)


def render_frame(t, gold_mark, ghost_mark):
    # Warm paper stock, very subtle light field and watermark-inspired rings.
    base = Image.new("RGBA", (W, H), PAPER + (255,))
    draw = ImageDraw.Draw(base, "RGBA")
    draw.ellipse((-570, 190, 635, 1395), fill=(255, 255, 255, 45))
    draw.ellipse((-430, 330, 490, 1250), outline=(224, 221, 213, 86), width=66)
    draw.ellipse((-280, 480, 340, 1100), outline=(232, 229, 222, 100), width=70)
    draw.ellipse((-130, 630, 190, 950), outline=(236, 233, 226, 115), width=56)

    # Faint oversized imprint drifting behind the composition.
    ghost = ghost_mark.resize((1420, 1420), Image.Resampling.LANCZOS)
    ghost.putalpha(ghost.getchannel("A").point(lambda a: int(a * 0.055)))
    alpha_composite_at(base, ghost, (-570, 250))

    draw = ImageDraw.Draw(base, "RGBA")
    # Restrained frame, studio marker, and top lockup.
    draw.rectangle((48, 48, W - 49, H - 49), outline=(24, 36, 52, 31), width=2)
    draw.line((78, 82, 119, 82), fill=GOLD + (220,), width=3)
    centered_arabic(draw, "إبداع", 106, font(31, True), INK)
    draw.text((78, 139), "IMPRINT  /  CREATIVE STUDIO", font=font(12, True), fill=(112, 115, 113, 220), spacing=3)

    # Fingerprint mark: soft bloom, rise and scale reveal.
    mark_alpha = ease((t - .18) / 1.35)
    mark_alpha *= 1 - .10 * ease((t - 10.9) / 1.0)
    mark_side = round(790 * (.92 + .08 * mark_alpha))
    mark = gold_mark.resize((mark_side, mark_side), Image.Resampling.LANCZOS)
    mark.putalpha(mark.getchannel("A").point(lambda a: round(a * mark_alpha)))
    mark_y = round(230 + 36 * (1 - mark_alpha))
    # Soft diffused gold light behind mark.
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    gd.ellipse((345, mark_y + 120, 735, mark_y + 540), fill=GOLD + (25,))
    glow = glow.filter(ImageFilter.GaussianBlur(72))
    base.alpha_composite(glow)
    alpha_composite_at(base, mark, ((W - mark_side) // 2, mark_y), 1)

    draw = ImageDraw.Draw(base, "RGBA")
    # A fine scanning stroke crosses the signature and dissolves before the final hold.
    if .7 < t < 8.2:
        scan_alpha = round(64 * (1 - ease((t - 7.0) / 1.2)))
        scan_y = mark_y + 90 + int(((t - .7) * 175) % 560)
        draw.line((300, scan_y, 780, scan_y), fill=GOLD + (scan_alpha,), width=2)
        draw.ellipse((772, scan_y - 4, 780, scan_y + 4), fill=GOLD + (scan_alpha,))

    first_alpha = ease((t - .95) / 1.25)
    second_alpha = ease((t - 2.0) / 1.25)
    statement_fade = 1 - .08 * ease((t - 11.1) / .8)
    y1 = round(1045 + (1 - first_alpha) * 30)
    y2 = round(1170 + (1 - second_alpha) * 30)
    centered_arabic(draw, "للإبداع بصمة", y1, font(78, True), INK, first_alpha * statement_fade)
    centered_arabic(draw, "ولكل بصمة أثر", y2, font(82, True), INK, second_alpha * statement_fade)

    # Two quiet gold dots tie the paired lines together, then the signature resolves.
    dots_alpha = ease((t - 2.8) / .8)
    for x in (W // 2 - 9, W // 2 + 9):
        draw.ellipse((x - 3, 1100 - 3, x + 3, 1100 + 3), fill=GOLD + (round(220 * dots_alpha),))

    caption_alpha = ease((t - 3.0) / 1.0)
    centered_arabic(draw, "من فكرةٍ صغيرة، يبدأ أثرٌ كبير.", 1280, font(26), MUTED, caption_alpha)
    signature_alpha = ease((t - 4.1) / 1.0)
    draw.rounded_rectangle((492, 1355, 588, 1358), radius=2, fill=GOLD + (round(230 * signature_alpha),))
    centered_arabic(draw, "بصمتك .. حكايتك", 1405, font(21), MUTED, signature_alpha)

    draw = ImageDraw.Draw(base, "RGBA")
    draw.text((78, H - 84), "IDEAS LEAVE A TRACE", font=font(12, True), fill=(126, 126, 119, 230))
    draw.text((W - 78, H - 84), "01  /  01", font=font(12, True), fill=(126, 126, 119, 230), anchor="ra")
    draw.ellipse((W - 84, H - 58, W - 78, H - 52), fill=GOLD + (220,))
    return base.convert("RGB")


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    gold_mark = Image.open(ROOT / "assets/fingerprint-gold.png").convert("RGBA")
    ghost_mark = Image.open(ROOT / "assets/fingerprint-ink.png").convert("RGBA")
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-vcodec", "rawvideo",
               "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an",
               "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", str(OUT)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for index in range(FPS * SECONDS):
            frame = render_frame(index / FPS, gold_mark, ghost_mark)
            process.stdin.write(frame.tobytes())
        process.stdin.close()
        status = process.wait()
        if status:
            raise RuntimeError(f"ffmpeg exited with status {status}")
    except Exception:
        process.kill()
        process.wait()
        raise
    print(OUT)
    print(f"{W}x{H} · {FPS} fps · {SECONDS} sec · {OUT.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
