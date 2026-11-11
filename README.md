# IP Man Home Office 🏠🐾

A cozy 5-storey 3D "virtual home office" built with [Three.js](https://threejs.org).
Plain HTML + JavaScript: no build step. Three.js is included in `lib/`, so the site doesn't depend on a CDN.

**Live site (after GitHub Pages is on):** https://ivanth36.github.io/our-3d-office/

**Japanese theme:** dark timber facade with posts, tiled eaves; stone lanterns, a sakura tree and a glowing drinks vending machine out front. Seasons follow Japan's calendar (sakura in spring, momiji in autumn, more snow on Fuji in winter) and the sky, lights and lanterns follow the clock in Singapore. Ambient sounds (koto, shishi-odoshi, wind chimes, the shamisen on the stage, a station chime when the lift arrives) start after your first tap; 🔊 mutes them. Add `?season=spring`, `?time=21` or `?friday=1` to the address to preview.

| Floor | What's there |
|---|---|
| 1F Joe's Café | A three-storey atrium tea house: tall cedar pillars, exposed roof beams with small spotlights, two levels of wraparound wooden balconies with low tables, criss-crossing wooden staircases with softly lit steps. In the centre a raised stage with a red carpet and red railings over a shallow pond and stream with rocks and koi, where Hana plays the shamisen. Matcha counter under a little tiled roof (chawan and whisk display, wagashi case), paper lanterns, bamboo, genkan with slippers at the entrance. Joe the Shih Tzu roams around; Jennie, Lisa, Rose and Jisoo work here |
| 2F Outsource AI Team | Same calm Kyoto / Muji-style office as 3F, kept for future client work |
| 3F In-house Office | Pale oak shared desk with bonsai and the AI employees, live FX board, frosted shoji-glass meeting room with ikebana, Kenny's glass office with his hanko stamp, and Kenny's daruma wall: one daruma per scheduled task (one eye = set up, both eyes = ran OK, red with a frown = error) |
| 4F Chill Home | Living room with low Japandi sofas (exposed oak frame, linen cushions) and a low oak table facing the TV; a raised tatami room (washitsu) in front with shoji, kotatsu, floor cushions and a tansu chest; jazz-kissa listening bar (records wall, warm amber light, drums, piano); game room; omakase counter kitchen; dining for 12 under red izakaya lanterns |
| 5F Japanese Garden | Dojo (Eugene's gym), hinoki hot-spring tub facing Mt Fuji, torii gate, koi pond and red bridge, zen garden, shishi-odoshi, stone lanterns, sakura, pines, bamboo, tea pavilion |

**Fridays (Singapore time):** JungKook, XiaoMing and Kenny wear yukata.

**Walls:** the left, right and back walls fade to see-through when you rotate the camera to look from that side.

**Floor panel:** pick a floor to see a column for each person on it: what they do, what they're doing now, and the latest message from each scheduled task (tap to read it in full). Messages come from `reports/latest.json`.

**Controls (phone):** drag with one finger to rotate, pinch to zoom, two-finger drag to move.

**Controls (computer):** drag to rotate, scroll to zoom, right-drag to move, keys `0`–`5` switch floors. Tap a floor button to jump to that floor. Tap Joe or an employee to see their card.

## Files
- `index.html`, `style.css`: page and on-screen buttons
- `js/main.js`: camera, controls, floor switching, lift
- `js/building.js`: walls, slabs, stairs, lift shaft
- `js/floors.js`: furniture for each floor
- `js/furniture.js`: reusable furniture pieces
- `js/characters.js`: Joe the Shih Tzu + AI employee figures
- `js/japan.js`: Japanese props (lanterns, trees, noren, kanban, tatami, shoji, daruma)
- `js/env.js`: seasons, day/night, Mt Fuji
- `js/audio.js`: ambient sounds + mute button
- `js/joe.js`: Joe's roaming walk around the café
- `js/staff.js`: the employees' and owners' (Ivan & Phil) daily routines (walking map, stairs, lift, smoke breaks, coffee runs, meetings)
- `js/fx.js`: the live FX board (rates from Coinbase, falling back to ExchangeRate-API)
- `js/employees.js`: **edit this to add or rename AI employees and the scheduled tasks they run** (tap an employee to see their tasks and next run time)
