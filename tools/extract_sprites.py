#!/usr/bin/env python3
"""
Extract sprite frames from Food Fight character sheets
"""

from PIL import Image
import os
import json

# Create output directories
BASE_DIR = "/root/.openclaw/workspace/assets/characters"
os.makedirs(BASE_DIR, exist_ok=True)

# Character definitions based on the sprite sheets
# Each has: idle (single), attack, damage, walk (4 frames)
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

def extract_sprites():
    manifest = {}
    
    for char_name, char_data in CHARACTERS.items():
        print(f"\n🎮 Processing {char_name.upper()}...")
        
        char_dir = os.path.join(BASE_DIR, char_name)
        os.makedirs(char_dir, exist_ok=True)
        
        # Load sprite sheet
        sheet = Image.open(char_data["file"])
        width, height = sheet.size
        
        print(f"   Sheet size: {width}x{height}")
        
        # Based on the layout:
        # Row 1: Title + single frame (large portrait)
        # Row 2: Take Damage + Attack frames
        # Row 3: Walking animation (4 frames)
        
        # The sprite sheets have visual guides - I'll crop based on visual inspection
        # These are approximate coordinates based on the grid lines visible
        
        frames = {}
        
        # Single/Idle frame (top section, large portrait)
        # Approximate: center-top area, single character pose
        idle_box = (width * 0.15, height * 0.18, width * 0.85, height * 0.42)
        idle = sheet.crop(idle_box)
        frames["idle"] = idle
        
        # Take Damage frame (left, middle section)
        damage_box = (width * 0.05, height * 0.52, width * 0.45, height * 0.72)
        damage = sheet.crop(damage_box)
        frames["damage"] = damage
        
        # Attack frame (right, middle section)
        attack_box = (width * 0.48, height * 0.52, width * 0.95, height * 0.72)
        attack = sheet.crop(attack_box)
        frames["attack"] = attack
        
        # Walking frames (bottom row - 4 frames)
        walk_y_start = height * 0.78
        walk_y_end = height * 0.95
        frame_width = width * 0.22
        
        for i in range(4):
            x_start = width * 0.04 + (i * frame_width)
            x_end = x_start + frame_width * 0.9
            walk_box = (x_start, walk_y_start, x_end, walk_y_end)
            walk_frame = sheet.crop(walk_box)
            frames[f"walk_{i}"] = walk_frame
        
        # Resize all frames to 48x48 with crisp pixels
        target_size = (48, 48)
        
        for frame_name, frame_img in frames.items():
            # Resize with nearest neighbor for pixel art
            resized = frame_img.resize(target_size, Image.Resampling.NEAREST)
            
            # Save as PNG
            output_path = os.path.join(char_dir, f"{frame_name}.png")
            resized.save(output_path, "PNG")
            print(f"   ✓ {frame_name}.png ({target_size[0]}x{target_size[1]})")
        
        # Create metadata
        manifest[char_name] = {
            "id": char_data["id"],
            "weapon": char_data["weapon"],
            "frames": {
                "idle": "idle.png",
                "damage": "damage.png", 
                "attack": "attack.png",
                "walk": [f"walk_{i}.png" for i in range(4)]
            },
            "path": f"assets/characters/{char_name}/"
        }
        
        print(f"   📁 Saved to: {char_dir}")
    
    # Save manifest
    manifest_path = os.path.join(BASE_DIR, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✅ All characters processed!")
    print(f"📄 Manifest saved: {manifest_path}")
    
    return manifest

if __name__ == "__main__":
    extract_sprites()
