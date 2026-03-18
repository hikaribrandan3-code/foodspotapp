# Bubble Tea - Full Screen Template for Claude

## Goal
Redesign Bubble Tea to fill the ENTIRE HikariBoy screen (53% of phone height, full width) with NO black bars.

## Current Issue
- Canvas: 480×320 (landscape, 3:2)
- Phone screen: ~9:19.5 portrait
- Result: Black bars above/below

## Target
- Portrait canvas: ~400×720 (or detect container size)
- Fill parent iframe completely
- No letterboxing

## HTML/CSS Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Bubble Tea Blast</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
            touch-action: none;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas to fill container
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Your game resize logic here
        }
        resize();
        window.addEventListener('resize', resize);
        
        // Game uses canvas.width and canvas.height for all positioning
        // No fixed sizes - everything relative to canvas dimensions
    </script>
</body>
</html>
```

## Key Requirements

1. **No fixed canvas size** - Use `window.innerWidth/Height` or resize handler
2. **Responsive layout** - All positions based on `canvas.width/height` percentages
3. **Touch controls** - Resize touch zones on resize
4. **No black bars** - Canvas fills 100% of iframe

## HikariBoy Integration

The game runs in an iframe with these button messages:
```javascript
// Listen for emulator buttons
window.addEventListener('message', (e) => {
    const {type, button} = e.data;
    if (type === 'BUTTON_PRESS') {
        // button = 'dpad-left', 'dpad-right', 'a', 'b', 'start'
        // Handle game input
    }
});

// Exit game
window.parent.postMessage({type: 'GAME_EXIT'}, '*');
```

## File Location
`/public/games/bubble-tea/index.html`

## Current Code Reference
See `/public/games/bubble-tea/index.html` for existing game logic.
