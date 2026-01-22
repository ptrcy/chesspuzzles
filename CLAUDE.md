# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess position analyzer powered by Stockfish WASM. A vanilla JavaScript SPA built with Vite that allows users to analyze chess positions, load FEN files, and get real-time engine evaluation.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server (http://localhost:5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

No test suite or linter is currently configured.

## Architecture

### Core Components

```
BoardAnalyzer (main.js)
    │
    ├── Chessground (UI board with drag-drop)
    │
    ├── StockfishEngine (engine.js)
    │       │
    │       └── stockfishWorker.js (Web Worker proxy)
    │               │
    │               └── Stockfish WASM binary (public/stockfish/)
    │
    └── FavoritesManager (favorites.js) → LocalStorage
```

**BoardAnalyzer** (`src/main.js`): Main application class managing board state (via Chess.js), UI interactions, move history, position navigation, and engine coordination.

**StockfishEngine** (`src/engine.js`): Wraps Web Worker communication with Stockfish WASM. Sends UCI commands, parses engine output (info lines, bestmove), manages MultiPV (top 3 moves).

**stockfishWorker.js**: Proxy between main thread and Stockfish WASM. Handles message queuing during initialization and UCI mode setup.

**FavoritesManager** (`src/favorites.js`): Persists favorite positions to LocalStorage with FEN, filename, and timestamp.

### Key Configuration Values

- Analysis depth: 15 (configurable in `main.js` line ~925)
- MultiPV: 3 moves (configurable in `engine.js` line ~43)
- Default FEN normalization: Auto-pads incomplete FENs to 6 fields

## Tech Stack

- **Vite 5.0.11**: Build tool
- **Chessground 9.1.1**: Chess board UI
- **Chess.js 1.0.0-beta.8**: Move validation, FEN parsing
- **Stockfish WASM 17.1.0**: Chess engine

## Deployment

Deployed via Netlify. The `netlify/functions/board-to-fen.js` serverless function handles image-to-FEN OCR conversion.

## Important Implementation Details

- Web Workers use module format (`{ type: 'module' }`)
- Stockfish WASM files must be served from `/public/stockfish/`
- Mobile version exists (`src/mobile.js`) but is not currently in use
- Browser requirements: WebAssembly support (Chrome 90+, Firefox 88+, Safari 14+)
