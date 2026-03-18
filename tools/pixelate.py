#!/usr/bin/env python3
"""
Pixel Art Converter for Munchboy Games
Converts images to retro pixel art style
"""

from PIL import Image
import sys
import os

def pixelate(input_path, output_path, size=32, colors=16, dither=False):
    """
    Convert image to pixel art
    
    Args:
        input_path: Source image
        output_path: Output path
        size: Target pixel dimensions (e.g., 32 = 32x32 pixels)
        colors: Number of colors in palette (4-256)
        dither: Apply dithering (True/False)
    """
    img = Image.open(input_path)
    
    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Step 1: Resize down (creates pixelation)
    img_small = img.resize((size, size), Image.Resampling.NEAREST)
    
    # Step 2: Reduce colors
    if colors < 256:
        img_small = img_small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG if dither else Image.Dither.NONE)
        img_small = img_small.convert('RGB')
    
    # Step 3: Scale back up for viewing (optional - remove if you want tiny file)
    # img_final = img_small.resize((size * 10, size * 10), Image.Resampling.NEAREST)
    
    img_small.save(output_path)
    print(f"✅ Saved: {output_path} ({size}x{size}, {colors} colors)")
    return output_path

def sprite_sheet(input_paths, output_path, sprite_size=32):
    """
    Combine multiple images into a sprite sheet
    """
    images = [Image.open(p).resize((sprite_size, sprite_size), Image.Resampling.NEAREST) for p in input_paths]
    
    cols = min(4, len(images))
    rows = (len(images) + cols - 1) // cols
    
    sheet = Image.new('RGBA', (cols * sprite_size, rows * sprite_size), (0, 0, 0, 0))
    
    for i, img in enumerate(images):
        x = (i % cols) * sprite_size
        y = (i // cols) * sprite_size
        sheet.paste(img, (x, y))
    
    sheet.save(output_path)
    print(f"✅ Sprite sheet: {output_path} ({cols}x{rows})")
    return output_path

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python pixelate.py <input> <output> [size] [colors]")
        print("  size:    Pixel dimensions (default: 32)")
        print("  colors:  Palette size 4-256 (default: 16)")
        print("\nExamples:")
        print("  python pixelate.py burger.png burger_32x16.png 32 16")
        print("  python pixelate.py photo.jpg hero_pixel.png 64 32")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 32
    colors = int(sys.argv[4]) if len(sys.argv) > 4 else 16
    
    pixelate(input_file, output_file, size, colors)
