# IP Man Home Office 🏠🐾

A cozy 5-storey 3D "virtual home office" built with [Three.js](https://threejs.org).
Plain HTML + JavaScript: no build step. Three.js is included in `lib/`, so the site doesn't depend on a CDN.

**Live site (after GitHub Pages is on):** https://ivanth36.github.io/our-3d-office/

| Floor | What's there |
|---|---|
| 1F Joe's Café | Joe the Shih Tzu roams around! U-shaped counter (coffee machine · cashier · pick-up), stools, round tables, sofa corner, long table + bench, Joe statue, mascot signs |
| 2F Chill Home | Big living room (wall-mounted TV, 2 long sofas, armchair, rug), glass music room at the front-left (CDs, hi-fi, lounge chair, drum kit, keyboard, music desk + computer), large kitchen with island, dining table for 12 |
| 3F Office A | Big shared desk with AI employees (JungKook, XiaoMing, Aida, Mary), live FX board (1 SGD → KRW / CNY, hourly), glass meeting room |
| 4F Office B | Same layout as 3F |
| 5F Roof Garden | Eugene the wellness coach in the glass gym (treadmills, weights, bench, yoga mats), lounge, umbrella table, loungers, string lights |

**Walls:** the left, right and back walls fade to see-through when you rotate the camera to look from that side.

**Controls (phone):** drag with one finger to rotate, pinch to zoom, two-finger drag to move.

**Controls (computer):** drag to rotate, scroll to zoom, right-drag to move, keys `0`–`5` switch floors. Tap a floor button to jump to that floor. Tap Joe or an employee to see their card.

## Files
- `index.html`, `style.css`: page and on-screen buttons
- `js/main.js`: camera, controls, floor switching, lift
- `js/building.js`: walls, slabs, stairs, lift shaft
- `js/floors.js`: furniture for each floor
- `js/furniture.js`: reusable furniture pieces
- `js/characters.js`: Joe the Shih Tzu + AI employee figures
- `js/joe.js`: Joe's roaming walk around the café
- `js/staff.js`: the employees' daily routines (walking map, stairs, lift, smoke breaks, coffee runs, meetings)
- `js/fx.js`: the live FX board (rates from Coinbase, falling back to ExchangeRate-API)
- `js/employees.js`: **edit this to add or rename AI employees and the scheduled tasks they run** (tap an employee to see their tasks and next run time)
