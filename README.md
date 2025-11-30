# Lichess Board Analyzer

Interactive, single-page chess position analyzer powered by Stockfish WASM. Drag pieces, load FEN lists, and view real-time evaluations with move suggestions.

![Chess Board Analyzer](https://img.shields.io/badge/Chess-Analyzer-blue)
![Stockfish](https://img.shields.io/badge/Stockfish-17.1.0-green)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)

## Features
- Interactive board with legal move validation and SAN display
- FEN input plus file/drag-and-drop loader with multi-position navigation
- Stockfish 17 analysis in a Web Worker (depth 15, MultiPV 3)
- Evaluation bar, depth display, and top move list with arrows
- Move navigation (first/prev/next/last) with history tracking
- Favorites saved to LocalStorage when loaded from a file
- Responsive design with a simplified mobile build

## Quick Start
Prerequisites: Node.js 16+, npm, modern browser with WebAssembly.

1. Install dependencies  
   `npm install`
2. Development server  
   `npm run dev` (opens http://localhost:5173)
3. Production build  
   `npm run build`
4. Preview build  
   `npm run preview`

Serve `dist/` with any static server or open `dist/index.html` directly.

## Usage
- Type or paste a FEN and press Enter or click on the board to play moves.
- Click **Start Analysis** to run Stockfish; top moves and arrows update live.
- Drop a `.fen`/`.pgn`/`.txt` file to load multiple positions, then use the position nav buttons.
- When a file is loaded, click **Save favorite** to toggle storing the starting position in LocalStorage.
- Use move navigation buttons to step through history; analysis re-runs when active.

## Configuration
- Analysis depth: `src/main.js` -> `this.engine.analyze(fen, 15, ...)`
- MultiPV: `src/engine.js` -> `setoption name MultiPV value 3`
- Stockfish script: `src/stockfishWorker.js` -> worker path

## Project Structure
```
src/
  main.js             # Desktop app logic
  mobile.js           # Mobile-focused UI logic
  engine.js           # Stockfish wrapper
  stockfishWorker.js  # Worker proxy for wasm build
  favorites.js        # LocalStorage favorites
  style.css, mobile.css
public/stockfish/     # stockfish.wasm + loader
netlify/functions/    # OCR lambda: board-to-fen.js
index.html, mobile.html
```

## Troubleshooting
- Stockfish not loading: ensure assets served from `/stockfish/stockfish.wasm.js` and browser has WASM support.
- Invalid FEN: verify six fields; incomplete FEN is auto-padded when possible.
- Build issues: reinstall dependencies; Vite config is in `vite.config.js`.

## Browser Compatibility
Chrome/Edge 90+, Firefox 88+, Safari 14+, Opera 76+ (WebAssembly and ES modules required).

## License
Educational/personal use. Third-party licenses: Stockfish (GPLv3), Chessground (GPLv3), Chess.js (BSD-2).

## Acknowledgments
Thanks to Lichess (Chessground), Stockfish team, and Jeff Hlywa (chess.js).
