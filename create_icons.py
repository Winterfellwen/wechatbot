import os
from PIL import Image, ImageDraw, ImageFont
import math

BASE_DIR = r"E:\AI\MiniJ\images"
os.makedirs(BASE_DIR, exist_ok=True)

def create_icon(name, bg_color, symbol, text=None):
    size = 81
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw circle background
    draw.ellipse([0, 0, size-1, size-1], fill=bg_color)
    
    # Draw symbol (simple shape)
    cx, cy = size // 2, size // 2
    color = (255, 255, 255, 255)
    
    if symbol == 'home':
        # House icon
        points = [(cx, cy-25), (cx-25, cy), (cx-25, cy+25), (cx+25, cy+25), (cx+25, cy)]
        draw.polygon(points, fill=color)
        draw.rectangle([cx-15, cy, cx+15, cy+25], fill=color)
    elif symbol == 'user':
        # Person icon
        draw.ellipse([cx-12, cy-20, cx+12, cy+5], fill=color)
        draw.ellipse([cx-25, cy+5, cx+25, cy+35], fill=color)
    elif symbol == 'japanese':
        # Japanese flag like - circle
        draw.ellipse([cx-25, cy-25, cx+25, cy+25], outline=color, width=3)
        draw.ellipse([cx-20, cy-20, cx+20, cy+20], fill='#C41E3A')
    elif symbol == 'german':
        # German flag colors
        draw.rectangle([cx-30, cy-30, cx+30, cy-10], fill='#000000')
        draw.rectangle([cx-30, cy-10, cx+30, cy+10], fill='#FF0000')
        draw.rectangle([cx-30, cy+10, cx+30, cy+30], fill='#FFD900')
    elif symbol == 'pdf':
        # Document icon
        draw.rectangle([cx-20, cy-30, cx+20, cy+30], outline=color, width=3)
        draw.line([cx-10, cy-15, cx+10, cy-15], fill=color, width=2)
        draw.line([cx-10, cy, cx+10, cy], fill=color, width=2)
        draw.line([cx-10, cy+15, cx+10, cy+15], fill=color, width=2)
    elif symbol == 'developing':
        # Gear/settings icon
        outer_r = 25
        inner_r = 15
        for i in range(8):
            angle = i * math.pi / 4
            x1 = cx + int(outer_r * math.cos(angle))
            y1 = cy + int(outer_r * math.sin(angle))
            x2 = cx + int(inner_r * math.cos(angle))
            y2 = cy + int(inner_r * math.sin(angle))
            draw.line([x1, y1, x2, y2], fill=color, width=4)
        draw.ellipse([cx-10, cy-10, cx+10, cy+10], fill=color)
    elif symbol == 'avatar':
        # Default avatar (head + shoulders)
        draw.ellipse([cx-15, cy-20, cx+15, cy+5], fill=color)
        draw.ellipse([cx-25, cy+5, cx+25, cy+35], fill=color)
    
    filepath = os.path.join(BASE_DIR, f"{name}.png")
    img.save(filepath, 'PNG')
    print(f"Created: {filepath}")

# Create icons
create_icon('icon-home', (24, 144, 255, 255), 'home')
create_icon('icon-home-active', (24, 144, 255, 255), 'home')
create_icon('icon-user', (128, 128, 128, 255), 'user')
create_icon('icon-user-active', (24, 144, 255, 255), 'user')
create_icon('icon-japanese', (255, 255, 255, 255), 'japanese')
create_icon('icon-german', (255, 255, 255, 255), 'german')
create_icon('icon-pdf', (255, 255, 255, 255), 'pdf')
create_icon('icon-developing', (128, 128, 128, 255), 'developing')
create_icon('avatar-default', (200, 200, 200, 255), 'avatar')

print("All icons created!")