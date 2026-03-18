#!/usr/bin/env python3
"""
Extract sprite frames - V3
Manual precise cropping based on grid lines in sprite sheets
"""

from PIL import Image
import os
import json

BASE_DIR = "/root/.openclaw/workspace/assets/characters"
os.makedirs(BASE_DIR, exist_ok=True)

def extract_sprite(img, x1, y1, x2, y2, target=(48, 48)):
    """Extract and resize a sprite region"""
    sprite = img.crop((x1, y1, x2, y2))
    return sprite.resize(target, Image.Resampling.NEAREST)

def process_empanada():
    """Empanada: 704x1525 - knife fighter"""
    img = Image.open("/root/openclaw/kimi/downloads/19d017e6-3c42-8e1a-8000-000013c1d8fd_IMG_0134.png")
    w, h = img.size
    char_dir = os.path.join(BASE_DIR, "empanada")
    os.makedirs(char_dir, exist_ok=True)
    
    # Based on grid lines visible in sheet:
    # Idle (top section, main portrait)
    extract_sprite(img, 180, 280, 520, 620).save(f"{char_dir}/idle.png")
    # Damage (left middle)
    extract_sprite(img, 40, 800, 320, 1080).save(f"{char_dir}/damage.png")
    # Attack (right middle, knife slash)
    extract_sprite(img, 380, 800, 680, 1080).save(f"{char_dir}/attack.png")
    # Walk frames (bottom row, 4 frames)
    extract_sprite(img, 20, 1180, 180, 1340).save(f"{char_dir}/walk_0.png")
    extract_sprite(img, 180, 1180, 340, 1340).save(f"{char_dir}/walk_1.png")
    extract_sprite(img, 360, 1180, 520, 1340).save(f"{char_dir}/walk_2.png")
    extract_sprite(img, 540, 1180, 700, 1340).save(f"{char_dir}/walk_3.png")
    
    print("✓ Empanada (7 frames)")

def process_pizza():
    """Pizza: 704x1527 - punch fighter"""
    img = Image.open("/root/openclaw/kimi/downloads/19d017e6-15c2-8811-8000-0000878d64ce_IMG_0129.png")
    char_dir = os.path.join(BASE_DIR, "pizza")
    os.makedirs(char_dir, exist_ok=True)
    
    # Idle (top portrait)
    extract_sprite(img, 150, 280, 550, 650).save(f"{char_dir}/idle.png")
    # Attack (mid-punch, left middle)
    extract_sprite(img, 40, 820, 340, 1120).save(f"{char_dir}/attack.png")
    # Damage (right middle)
    extract_sprite(img, 380, 820, 680, 1120).save(f"{char_dir}/damage.png")
    # Walk frames
    extract_sprite(img, 20, 1200, 180, 1360).save(f"{char_dir}/walk_0.png")
    extract_sprite(img, 180, 1200, 340, 1360).save(f"{char_dir}/walk_1.png")
    extract_sprite(img, 360, 1200, 520, 1360).save(f"{char_dir}/walk_2.png")
    extract_sprite(img, 540, 1200, 700, 1360).save(f"{char_dir}/walk_3.png")
    
    print("✓ Pizza (7 frames)")

def process_taco():
    """Taco: 704x1527 - boxing fighter"""
    img = Image.open("/root/openclaw/kimi/downloads/19d017e7-38c2-8d8b-8000-0000eef7123b_IMG_0128.png")
    char_dir = os.path.join(BASE_DIR, "taco")
    os.makedirs(char_dir, exist_ok=True)
    
    # Idle (top portrait)
    extract_sprite(img, 150, 280, 550, 650).save(f"{char_dir}/idle.png")
    # Attack (mid-punch)
    extract_sprite(img, 40, 820, 340, 1120).save(f"{char_dir}/attack.png")
    # Damage
    extract_sprite(img, 380, 820, 680, 1120).save(f"{char_dir}/damage.png")
    # Walk frames
    extract_sprite(img, 20, 1200, 180, 1360).save(f"{char_dir}/walk_0.png")
    extract_sprite(img, 180, 1200, 340, 1360).save(f"{char_dir}/walk_1.png")
    extract_sprite(img, 360, 1200, 520, 1360).save(f"{char_dir}/walk_2.png")
    extract_sprite(img, 540, 1200, 700, 1360).save(f"{char_dir}/walk_3.png")
    
    print("✓ Taco (7 frames)")

def process_sushi():
    """Sushi: 236x512 - samurai sword"""
    img = Image.open("/root/openclaw/kimi/downloads/19d017e6-dd42-874c-8000-0000ffbe7aa2_IMG_0135.png")
    w, h = img.size
    char_dir = os.path.join(BASE_DIR, "sushi")
    os.makedirs(char_dir, exist_ok=True)
    
    # This sheet is smaller and laid out differently
    # Idle (top)
    extract_sprite(img, 50, 80, 190, 220).save(f"{char_dir}/idle.png")
    # Idle alt (bottom left)
    extract_sprite(img, 10, 280, 70, 340).save(f"{char_dir}/idle_alt.png")
    # Attack (sword slash, bottom middle-right)
    extract_sprite(img, 140, 260, 230, 350).save(f"{char_dir}/attack.png")
    # Walk frames (bottom row, 4 frames)
    extract_sprite(img, 10, 400, 60, 450).save(f"{char_dir}/walk_0.png")
    extract_sprite(img, 65, 400, 115, 450).save(f"{char_dir}/walk_1.png")
    extract_sprite(img, 120, 400, 170, 450).save(f"{char_dir}/walk_2.png")
    extract_sprite(img, 175, 400, 225, 450).save(f"{char_dir}/walk_3.png")
    # Use idle_alt as damage (no damage frame in this sheet)
    extract_sprite(img, 10, 280, 70, 340).save(f"{char_dir}/damage.png")
    
    print("✓ Sushi (8 frames)")

def create_manifest():
    manifest = {
        "empanada": {
            "id": "FF-KBTF005",
            "weapon": "knife",
            "frames": ["idle", "damage", "attack", "walk_0", "walk_1", "walk_2", "walk_3"]
        },
        "pizza": {
            "id": "FF-KBTF002",
            "weapon": "punch",
            "frames": ["idle", "damage", "attack", "walk_0", "walk_1", "walk_2", "walk_3"]
        },
        "taco": {
            "id": "FF-KBTF001",
            "weapon": "punch",
            "frames": ["idle", "damage", "attack", "walk_0", "walk_1", "walk_2", "walk_3"]
        },
        "sushi": {
            "id": "FF-KBTF004",
            "weapon": "sword",
            "frames": ["idle", "damage", "attack", "walk_0", "walk_1", "walk_2", "walk_3", "idle_alt"]
        }
    }
    
    with open(os.path.join(BASE_DIR, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    
    print("\n📄 manifest.json saved")

if __name__ == "__main__":
    print("🎮 Extracting Food Fight sprites...\n")
    process_empanada()
    process_pizza()
    process_taco()
    process_sushi()
    create_manifest()
    print(f"\n✅ Done! Check: {BASE_DIR}")
