#!/usr/bin/env python3
"""Extract final 2 characters"""
from PIL import Image
import os

BASE_DIR = "/root/.openclaw/workspace/assets/characters"

def extract_sprite(img, x1, y1, x2, y2, target=(48, 48)):
    sprite = img.crop((x1, y1, x2, y2))
    return sprite.resize(target, Image.Resampling.NEAREST)

def process_alfajor():
    """Alfajor: Nunchaku fighter"""
    img = Image.open("/root/openclaw/kimi/downloads/19d0190c-6652-8660-8000-0000b2397988_2A09A0E8-765D-4F74-9092-28A82B7CA4D3.jpg")
    char_dir = os.path.join(BASE_DIR, "alfajor")
    os.makedirs(char_dir, exist_ok=True)
    
    # Idle (top portrait)
    extract_sprite(img, 90, 200, 350, 480).save(f"{char_dir}/idle.png")
    # Damage (left middle)
    extract_sprite(img, 30, 550, 230, 750).save(f"{char_dir}/damage.png")
    # Attack (nunchaku, right middle)
    extract_sprite(img, 270, 550, 470, 750).save(f"{char_dir}/attack.png")
    # Walk frames (bottom row)
    extract_sprite(img, 20, 830, 120, 930).save(f"{char_dir}/walk_0.png")
    extract_sprite(img, 130, 830, 230, 930).save(f"{char_dir}/walk_1.png")
    extract_sprite(img, 240, 830, 340, 930).save(f"{char_dir}/walk_2.png")
    extract_sprite(img, 350, 830, 450, 930).save(f"{char_dir}/walk_3.png")
    
    print("✓ Alfajor (7 frames)")

def process_hamburger():
    """Hamburger: Boxing fighter"""
    img = Image.open("/root/openclaw/kimi/downloads/19d0190f-7be2-8944-8000-0000e23e5b06_FE38AC0E-C4DC-4425-89E1-630B52B3F774.jpg")
    char_dir = os.path.join(BASE_DIR, "hamburger")
    os.makedirs(char_dir, exist_ok=True)
    
    # Idle (top portrait)
    extract_sprite(img, 150, 280, 550, 650).save(f"{char_dir}/idle.png")
    # Damage (left middle)
    extract_sprite(img, 40, 820, 340, 1120).save(f"{char_dir}/damage.png")
    # Attack (mid-punch, right middle)
    extract_sprite(img, 380, 820, 680, 1120).save(f"{char_dir}/attack.png")
    # Walk frames
    extract_sprite(img, 20, 1200, 180, 1360).save(f"{char_dir}/walk_0.png")
    extract_sprite(img, 180, 1200, 340, 1360).save(f"{char_dir}/walk_1.png")
    extract_sprite(img, 360, 1200, 520, 1360).save(f"{char_dir}/walk_2.png")
    extract_sprite(img, 540, 1200, 700, 1360).save(f"{char_dir}/walk_3.png")
    
    print("✓ Hamburger (7 frames)")

if __name__ == "__main__":
    print("🎮 Extracting final 2 characters...\n")
    process_alfajor()
    process_hamburger()
    print("\n✅ All 6 characters ready!")
