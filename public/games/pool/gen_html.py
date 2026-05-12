import base64
b64_path = '/Users/daiskebrandan/Desktop/FoodSpotApp/public/games/pool/png_b64.txt'
html_path = '/Users/daiskebrandan/Desktop/FoodSpotApp/public/games/pool/convert.html'
with open(b64_path, 'r') as f:
    b64_data = f.read().strip()

html_content = f"""<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: white;">
    <canvas id="canvas" style="display: none;"></canvas>
    <div id="status">Loading...</div>
    <script>
        const img = new Image();
        img.onload = function() {{
            const canvas = document.getElementById('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const webpData = canvas.toDataURL('image/webp', 0.9);
            document.getElementById('status').innerText = 'DONE:' + webpData;
        }};
        img.onerror = function() {{
            document.getElementById('status').innerText = 'ERROR';
        }};
        img.src = 'data:image/png;base64,{b64_data}';
    </script>
</body>
</html>"""

with open(html_path, 'w') as f:
    f.write(html_content)
print("SUCCESS")
