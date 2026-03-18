#!/usr/bin/env python3
"""
Extract sprite frames from Food Fight character sheets - V2
Tighter cropping to avoid UI elements
"""

from PIL import Image
import os
import json

BASE_DIR = "/root/.openclaw/workspace/assets/characters"
os.makedirs(BASE_DIR, exist_ok=True)

CHARACTERS = {
    "empanada": {
        "file": "/root/openclaw/kimi/downloads/19d017e6-3c42-8e1a-8000-000013c1d8fd_IMG_0134.png",
        "id": "FF-KBTF005",
        "weapon": "knife"
    },
    "pizza": {
        "file": "/root/openclaw/kimi/downloads/19d017e6-15c2-8811-8000-0000878d64ce_IMG_0129.png",
        "id": "FF-KBTF002", 
        "weapon": "punch"
    },
    "taco": {
        "file": "/root/openclaw/kimi/downloads/19d017e7-38c2-8d8b-8000-0000eef7123b_IMG_0128.png",
        "id": "FF-KBTF001",
        "weapon": "punch"
    },
    "sushi": {
        "file": "/root/openclaw/kimi/downloads/19d017e6-dd42-874c-8000-0000ffbe7aa2_IMG_0135.png",
        "id": "FF-KBTF004",
        "weapon": "sword"
    }
}

def extract_centered_sprite(img, center_x, center_y, size_factor=0.35):
    """Extract sprite centered at given point, removing background"""
    width, height = img.size
    sprite_size = int(min(width, height) * size_factor)
    
    left = max(0, int(center_x * width) - sprite_size // 2)
    top = max(0, int(center_y * height) - sprite_size // 2)
    right = min(width, left + sprite_size)
    bottom = min(height, top + sprite_size)
    
    return img.crop((left, top, right, bottom))

def extract_sprites_v2():
    manifest = {}
    target_size = (48, 48)
    
    for char_name, char_data in CHARACTERS.items():
        print(f"\n🎮 Processing {char_name.upper()}...")
        
        char_dir = os.path.join(BASE_DIR, char_name)
        os.makedirs(char_dir, exist_ok=True)
        
        sheet = Image.open(char_data["file"])
        width, height = sheet.size
        print(f"   Sheet: {width}x{height}")
        
        frames = {}
        
        # Based on visual layout of sprite sheets:
        # - Top section: Large single frame (portrait/idle)
        # - Middle-left: Take damage frame
        # - Middle-right: Attack frame  
        # - Bottom: 4-frame walk cycle
        
        if char_name == "sushi":
            # Sushi sheet is smaller (236x512)
            # Idle: top center
            frames["idle"] = extract_centered_sprite(sheet, 0.5, 0.22, 0.45)
            # Damage/Hit: left middle
            # Attack: right middle (not visible in sushi sheet, use idle)
            frames["damage"] = extract_centered_sprite(sheet, 0.25, 0.50, 0.40)
            frames["attack"] = extract_centered_sprite(sheet, 0.75, 0.50, 0.40)
            # Walk cycle: 4 frames at bottom
            frames["walk_0"] = extract_centered_sprite(sheet, 0.12, 0.78, 0.35)
            frames["walk_1"] = extract_centered_sprite(sheet, 0.37, 0.78, 0.35)
            frames["walk_2"] = extract_centered_sprite(sheet, 0.62, 0.78, 0.35)
            frames["walk_3"] = extract_centered_sprite(sheet, 0.87, 0.78, 0.35)
        else:
            # Larger sheets (704x1525) - empanada, pizza, taco
            # Idle: top center
            frames["idle"] = extract_centered_sprite(sheet, 0.5, 0.28, 0.32)
            # Damage: left middle
            frames["damage"] = extract_centered_sprite(sheet, 0.25, 0.62, 0.28)
            # Attack: right middle
            frames["attack"] = extract_centered_sprite(sheet, 0.75, 0.62, 0.28)
            # Walk cycle: 4 frames at bottom
            frames["walk_0"] = extract_centered_sprite(sheet, 0.12, 0.86, 0.25)
            frames["walk_1"] = extract_centered_sprite(sheet, 0.37, 0.86, 0.25)
            frames["walk_2"] = extract_centered_sprite(sheet, 0.62, 0.86, 0.25)
            frames["walk_3"] = extract_centered_sprite(sheet, 0.87, 0.86, 0.25)
        
        # Save all frames
        for frame_name, frame_img in frames.items():
            resized = frame_img.resize(target_size, Image.Resampling.NEAREST)
            output_path = os.path.join(char_dir, f"{frame_name}.png")
            resized.save(output_path, "PNG")
            print(f"   ✓ {frame_name}.png")
        
        # Create preview sheet showing all frames
        preview = create_preview_sheet(char_dir, frames, target_size)
        preview.save(os.path.join(char_dir, "_preview.png"))
        
        manifest[char_name] = {
            "id": char_data["id"],
            "weapon": char_data["weapon"],
            "frames": list(frames.keys()),
            "path": f"assets/characters/{char_name}/"
        }
        
        print(f"   📁 {len(frames)} frames saved")
    
    # Save manifest
    with open(os.path.join(BASE_DIR, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✅ Complete! 4 characters, 28 total frames")
    return manifest

def create_preview_sheet(char_dir, frames, target_size):
    """Create a preview image showing all frames"""
    cols = 4
    rows = 2
    preview = Image.new('RGBA', (cols * target_size[0], rows * target_size[1]), (40, 40, 60, 255))
    
    positions = [
        (0, 0, "idle"), (1, 0, "damage"), (2, 0, "attack"), (3, 0, "walk_0"),
        (0, 1, "walk_1"), (1, 1, "walk_2"), (2, 1, "walk_3")
    ]
    
    for col, row, frame_name in positions:
        if frame_name in frames:
            x = col * target_size[0]
            y = row * target_size[1]
            preview.paste(frames[frame_name].resize(target_size, Image.Resampling.NEAREST), (x, y))
    
    return preview

if __name__ == "__main__":
    extract_sprites_v2()
