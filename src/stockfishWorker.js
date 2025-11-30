/**
 * Stockfish Web Worker Proxy
 *
 * This worker acts as a thin proxy around the actual Stockfish WASM worker
 * located at `/public/stockfish/stockfish.wasm.js`.
 *
 * It keeps the same `{ type, command }` message API that `engine.js` expects,
 * while internally communicating with the real Stockfish worker using plain
 * UCI command strings.
 */

let engineWorker = null;
let messageQueue = [];
let isReady = false;

function initStockfish() {
    if (engineWorker) {
        return;
    }

    try {
        // The WASM build exposes itself directly as a Web Worker script.
        // It is served as a static asset from `public/stockfish/stockfish.wasm.js`.
        engineWorker = new Worker('/stockfish/stockfish.wasm.js');

        engineWorker.onmessage = (event) => {
            const line = event.data;

            // Forward all engine output to the main thread
            self.postMessage({ type: 'output', data: line });

            // Detect when UCI initialization is complete
            if (line === 'uciok') {
                isReady = true;

                // Flush any queued commands
                while (messageQueue.length > 0) {
                    const cmd = messageQueue.shift();
                    engineWorker.postMessage(cmd);
                }
            }
        };

        engineWorker.onerror = (error) => {
            self.postMessage({
                type: 'error',
                data: `Stockfish worker error: ${error.message || error}`
            });
        };

        // Start the engine in UCI mode
        engineWorker.postMessage('uci');
    } catch (error) {
        self.postMessage({
            type: 'error',
            data: `Failed to initialize Stockfish: ${error.message}`
        });
    }
}

// Handle messages from main thread
self.onmessage = (e) => {
    const { type, command } = e.data || {};

    if (type === 'init') {
        initStockfish();
        return;
    }

    if (type === 'command') {
        if (isReady && engineWorker) {
            engineWorker.postMessage(command);
        } else {
            // Queue commands until the engine reports `uciok`
            messageQueue.push(command);
        }
        return;
    }

    if (type === 'stop') {
        if (engineWorker) {
            engineWorker.postMessage('stop');
        }
    }
};
