#!/usr/bin/env python3
"""
Beyblade Pixel Art Converter
Converts PNG images to 34x34 pixel art with 1:1 color preservation
"""

from PIL import Image
import os
import sys

def pixelate_image(input_path, output_path, size=34):
    """
    Convert image to pixel art at specified size
    Uses nearest neighbor resampling to preserve pixel edges
    """
    img = Image.open(input_path)
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Resize to target size with nearest neighbor (no smoothing)
    pixelated = img.resize((size, size), Image.NEAREST)
    
    # Save with original colors preserved
    pixelated.save(output_path, 'PNG')
    print(f"✅ Created: {output_path} ({size}x{size})")
    return output_path

def main():
    # Files to process
    files = [
        ('attackbeyblade.png', 'attackbeyblade_34x34.png'),
        ('defensebeyblade.png', 'defensebeyblade_34x34.png'),
        ('staminabeyblade.png', 'staminabeyblade_34x34.png'),
    ]
    
    for input_file, output_file in files:
        if os.path.exists(input_file):
            pixelate_image(input_file, output_file, 34)
        else:
            print(f"⚠️  Missing: {input_file}")

if __name__ == '__main__':
    # Install pillow if needed: pip install pillow
    try:
        from PIL import Image
    except ImportError:
        print("Installing Pillow...")
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow'])
        from PIL import Image
    
    main()
