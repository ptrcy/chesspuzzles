/**
 * Mobile Chess App
 * Simplified logic for mobile experience
 */

import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { StockfishEngine } from './engine.js';
import './mobile.css';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

class MobileChess {
    constructor() {
        this.chess = new Chess();
        this.board = null;
        this.engine = null;
        this.currentArrows = [];
        this.arrowAnimationTimeout = null;

        // History tracking for Redo
        this.moveHistory = [];
        this.currentMoveIndex = -1;

        this.elements = {
            board: document.getElementById('chessboard'),
            boardContainer: document.getElementById('boardContainer'),
            fenInput: document.getElementById('fenInput'),
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),
            flipBtn: document.getElementById('flipBtn'),
            cameraBtn: document.getElementById('cameraBtn'),
            cameraInput: document.getElementById('cameraInput'),
            statusMessage: document.getElementById('statusMessage'),
            setupControls: document.getElementById('setupControls'),
            toggleTurnBtn: document.getElementById('toggleTurnBtn'),
            rotateBoardBtn: document.getElementById('rotateBoardBtn'),
            confirmSetupBtn: document.getElementById('confirmSetupBtn')
        };

        this.init();
    }

    async init() {
        try {
            this.initBoard();
            this.engine = new StockfishEngine();
            await this.engine.init();

            // Start analysis immediately on mobile
            this.runAnalysis();

        } catch (error) {
            console.error('Mobile init error:', error);
        }
    }

    initBoard() {
        this.board = Chessground(this.elements.board, {
            fen: DEFAULT_FEN,
            movable: {
                free: false,
                color: 'both',
                dests: this.getMoveDests(),
                events: {
                    after: (orig, dest) => this.onMove(orig, dest)
                }
            },
            draggable: {
                enabled: true,
                showGhost: true
            },
            highlight: {
                lastMove: true,
                check: true
            }
        });

        this.updateTurnIndicator();
        this.updateButtons();

        // Button listeners
        if (this.elements.undoBtn) {
            this.elements.undoBtn.addEventListener('click', () => this.undo());
        }
        if (this.elements.redoBtn) {
            this.elements.redoBtn.addEventListener('click', () => this.redo());
        }
        if (this.elements.flipBtn) {
            this.elements.flipBtn.addEventListener('click', () => this.flipBoard());
        }
        if (this.elements.cameraBtn) {
            this.elements.cameraBtn.addEventListener('click', () => {
                this.elements.cameraInput.click();
            });
        }
        if (this.elements.cameraInput) {
            this.elements.cameraInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Setup controls
        if (this.elements.toggleTurnBtn) {
            this.elements.toggleTurnBtn.addEventListener('click', () => this.toggleTurn());
        }
        if (this.elements.rotateBoardBtn) {
            this.elements.rotateBoardBtn.addEventListener('click', () => this.rotateBoardLogic());
        }
        if (this.elements.confirmSetupBtn) {
            this.elements.confirmSetupBtn.addEventListener('click', () => this.hideSetupControls());
        }
    }

    onMove(orig, dest) {
        const move = this.chess.move({
            from: orig,
            to: dest,
            promotion: 'q'
        });

        if (move) {
            // Update history
            // If we are not at the end of history, truncate it
            if (this.currentMoveIndex < this.moveHistory.length - 1) {
                this.moveHistory = this.moveHistory.slice(0, this.currentMoveIndex + 1);
            }
            this.moveHistory.push(move);
            this.currentMoveIndex++;

            this.updateBoardState();
        } else {
            this.board.set({ fen: this.chess.fen() });
        }
    }

    updateBoardState() {
        this.board.set({
            fen: this.chess.fen(),
            turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
            movable: {
                color: 'both',
                dests: this.getMoveDests()
            },
            lastMove: this.currentMoveIndex >= 0 ?
                [this.moveHistory[this.currentMoveIndex].from, this.moveHistory[this.currentMoveIndex].to] : undefined
        });

        this.updateTurnIndicator();
        this.updateButtons();
        this.clearArrows();
        this.runAnalysis();
    }

    getMoveDests() {
        const dests = new Map();
        const moves = this.chess.moves({ verbose: true });
        moves.forEach(move => {
            if (!dests.has(move.from)) dests.set(move.from, []);
            dests.get(move.from).push(move.to);
        });
        return dests;
    }

    updateTurnIndicator() {
        const turn = this.chess.turn(); // 'w' or 'b'
        this.elements.boardContainer.className = 'board-container';
        this.elements.boardContainer.classList.add(turn === 'w' ? 'turn-white' : 'turn-black');
    }

    updateButtons() {
        if (this.elements.undoBtn) {
            this.elements.undoBtn.disabled = this.currentMoveIndex < 0;
            this.elements.undoBtn.style.opacity = this.currentMoveIndex < 0 ? '0.5' : '1';
        }
        if (this.elements.redoBtn) {
            const canRedo = this.currentMoveIndex < this.moveHistory.length - 1;
            this.elements.redoBtn.disabled = !canRedo;
            this.elements.redoBtn.style.opacity = !canRedo ? '0.5' : '1';
        }
    }

    runAnalysis() {
        if (!this.engine || this.chess.isGameOver()) return;

        this.engine.analyze(this.chess.fen(), 15, (result) => {
            if (result.moves && result.moves.length > 0) {
                this.showMoveArrows(result.moves.slice(0, 3));
            }
        });
    }

    showMoveArrows(moves) {
        this.clearArrows();
        const arrows = moves.map((moveData, index) => {
            const { move } = moveData;
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);
            const brushes = ['paleBlue', 'paleGreen', 'yellow'];
            return { orig: from, dest: to, brush: brushes[index] || 'paleBlue' };
        });

        this.currentArrows = arrows;
        this.animateArrows(arrows);
    }

    animateArrows(arrows) {
        if (this.arrowAnimationTimeout) clearTimeout(this.arrowAnimationTimeout);

        let currentIndex = 0;
        const visibleArrows = [];

        const showNextArrow = () => {
            if (currentIndex < arrows.length) {
                visibleArrows.push(arrows[currentIndex]);
                this.board.setShapes(visibleArrows);
                currentIndex++;
                this.arrowAnimationTimeout = setTimeout(showNextArrow, 600);
            } else {
                this.arrowAnimationTimeout = setTimeout(() => {
                    currentIndex = 0;
                    visibleArrows.length = 0;
                    this.board.setShapes([]);
                    showNextArrow();
                }, 1200);
            }
        };
        showNextArrow();
    }

    clearArrows() {
        if (this.arrowAnimationTimeout) clearTimeout(this.arrowAnimationTimeout);
        this.board.setShapes([]);
        this.currentArrows = [];
    }

    undo() {
        if (this.currentMoveIndex >= 0) {
            this.chess.undo();
            this.currentMoveIndex--;
            this.updateBoardState();
        }
    }

    redo() {
        if (this.currentMoveIndex < this.moveHistory.length - 1) {
            const move = this.moveHistory[this.currentMoveIndex + 1];
            this.chess.move(move);
            this.currentMoveIndex++;
            this.updateBoardState();
        }
    }

    flipBoard() {
        const currentOrientation = this.board.state.orientation;
        const newOrientation = currentOrientation === 'white' ? 'black' : 'white';
        this.board.set({ orientation: newOrientation });
    }

    showSetupControls() {
        if (this.elements.setupControls) {
            this.elements.setupControls.style.display = 'flex';
            this.updateSetupButtons();
        }
    }

    hideSetupControls() {
        if (this.elements.setupControls) {
            this.elements.setupControls.style.display = 'none';
        }
    }

    updateSetupButtons() {
        const turn = this.chess.turn();
        if (this.elements.toggleTurnBtn) {
            this.elements.toggleTurnBtn.textContent = turn === 'w' ? 'White to Move' : 'Black to Move';
            this.elements.toggleTurnBtn.style.backgroundColor = turn === 'w' ? '#eee' : '#333';
            this.elements.toggleTurnBtn.style.color = turn === 'w' ? '#333' : '#eee';
        }
    }

    toggleTurn() {
        const fen = this.chess.fen();
        const parts = fen.split(' ');
        parts[1] = parts[1] === 'w' ? 'b' : 'w';
        // Reset en passant if turn changes? Maybe not for simple toggle.
        // Reset halfmove clock?
        const newFen = parts.join(' ');
        this.loadPosition(newFen);
        this.updateSetupButtons();
    }

    rotateBoardLogic() {
        // Logically rotate the board 180 degrees
        // Reverse ranks and reverse rows
        const fen = this.chess.fen();
        const parts = fen.split(' ');
        const rows = parts[0].split('/');

        const reversedRows = rows.map(row => {
            let expanded = row.replace(/\d/g, d => '1'.repeat(parseInt(d)));
            let reversed = expanded.split('').reverse().join('');
            return reversed.replace(/1+/g, m => m.length);
        }).reverse();

        parts[0] = reversedRows.join('/');
        const newFen = parts.join(' ');
        this.loadPosition(newFen);
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showStatus('Processing image...', 'info');

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;

            try {
                const response = await fetch('/.netlify/functions/board-to-fen', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ image: base64Data })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.fen) {
                    console.log('Received FEN from API:', data.fen);
                    this.showStatus('Board detected!', 'success');
                    this.loadPosition(data.fen);

                    // Reset visual orientation to white
                    this.board.set({ orientation: 'white' });

                    // Show setup controls
                    this.showSetupControls();
                } else {
                    throw new Error('No FEN returned');
                }

            } catch (error) {
                console.error('Image processing error:', error);
                this.showStatus(`Error: ${error.message}`, 'error');
            } finally {
                // Clear input so same file can be selected again
                this.elements.cameraInput.value = '';
            }
        };
        reader.readAsDataURL(file);
    }

    loadPosition(fen) {
        try {
            if (fen.split(' ').length < 6) {
                fen += ' w - - 0 1';
            }
            const testChess = new Chess(fen);
            this.chess.load(fen);
            this.moveHistory = [];
            this.currentMoveIndex = -1;
            this.updateBoardState();
        } catch (e) {
            this.showStatus('Invalid FEN loaded', 'error');
        }
    }

    showStatus(message, type) {
        if (this.elements.statusMessage) {
            this.elements.statusMessage.textContent = message;
            this.elements.statusMessage.className = type;
            this.elements.statusMessage.style.display = 'block';
            setTimeout(() => {
                this.elements.statusMessage.style.display = 'none';
            }, 3000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MobileChess();
});
