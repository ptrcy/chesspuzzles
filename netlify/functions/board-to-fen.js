import fetch from 'node-fetch';
import FormData from 'form-data';

export const handler = async (event, context) => {
    console.log('Function board-to-fen invoked');
    console.log('Method:', event.httpMethod);

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log('Parsing body...');
        const data = JSON.parse(event.body);
        const imageBase64 = data.image;

        if (!imageBase64) {
            console.error('No image provided in body');
            return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
        }

        console.log('Processing image data...');
        // Remove header if present (e.g., "data:image/png;base64,")
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const form = new FormData();
        form.append('file', buffer, { filename: 'board.png', contentType: 'image/png' });

        console.log('Sending request to OCR API...');
        const response = await fetch('https://helpman.komtera.lt/predict', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        console.log('OCR API response status:', response.status);

        if (!response.ok) {
            throw new Error(`API responded with ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('OCR API result:', JSON.stringify(result));

        // The API returns { results: [ { fen: "..." } ] }
        let fen = result.results && result.results[0] ? result.results[0].fen : null;

        if (!fen) {
            console.error('No FEN found in result');
            return { statusCode: 422, body: JSON.stringify({ error: 'Could not detect board' }) };
        }

        // Ensure FEN is complete (6 parts)
        if (fen.split(' ').length < 6) {
            fen += ' w - - 0 1';
        }

        // --- Heuristic Orientation Detection ---
        // Standard FEN starts from Rank 8 (Black side usually) to Rank 1 (White side usually).
        // If the board is flipped (Black at bottom), the image top is Rank 1 (White) and bottom is Rank 8 (Black).
        // But the API just sees pieces. It maps top of image to Rank 8 of FEN.
        // So if flipped:
        // API Rank 8 (Top of image) = Real Rank 1 (White pieces)
        // API Rank 1 (Bottom of image) = Real Rank 8 (Black pieces)
        // Heuristic: Count white/black pieces in top half vs bottom half of the FEN.

        const rows = fen.split(' ')[0].split('/');
        const topHalf = rows.slice(0, 4).join('');
        const bottomHalf = rows.slice(4).join('');

        const countPieces = (str, color) => {
            const regex = color === 'w' ? /[A-Z]/g : /[a-z]/g;
            return (str.match(regex) || []).length;
        };

        const whiteTop = countPieces(topHalf, 'w');
        const blackTop = countPieces(topHalf, 'b');
        const whiteBottom = countPieces(bottomHalf, 'w');
        const blackBottom = countPieces(bottomHalf, 'b');

        // Normal board: Black at top (Rank 8), White at bottom (Rank 1).
        // So Top should have more Black, Bottom should have more White.
        // Flipped board: White at top (Rank 1), Black at bottom (Rank 8).
        // So Top has more White, Bottom has more Black.

        let isFlipped = false;
        if (whiteTop > blackTop && blackBottom > whiteBottom) {
            isFlipped = true;
            console.log('Detected FLIPPED board orientation. Rotating...');
        } else {
            console.log('Detected NORMAL board orientation.');
        }

        if (isFlipped) {
            // Reverse the FEN
            // 1. Reverse the order of rows
            // 2. Reverse the content of each row
            // 3. Swap case (optional? No, piece colors are absolute. 
            //    Wait, if I rotate the board 180, a white piece at a1 becomes a white piece at h8? 
            //    No, physical rotation:
            //    Top-Left (a8 in image) was actually h1.
            //    So the piece at "a8" (API view) is actually at h1.
            //    So we need to reverse the whole board string.

            const reversedRows = rows.map(row => {
                // Reverse the row string: "rnbqk" -> "kqbnr"
                // But numbers need to be handled? "3p4" -> "4p3"
                // Actually, just reversing the string is tricky with numbers.
                // Expand numbers to 1s first.
                let expanded = row.replace(/\d/g, d => '1'.repeat(parseInt(d)));
                let reversed = expanded.split('').reverse().join('');
                // Collapse 1s back
                return reversed.replace(/1+/g, m => m.length);
            }).reverse(); // Reverse order of rows (Rank 8 becomes Rank 1)

            fen = reversedRows.join('/') + ' ' + fen.split(' ').slice(1).join(' ');
        }

        // --- Optimistic Castling Rights ---
        // Check if Kings and Rooks are on starting squares
        const fenParts = fen.split(' ');
        const position = fenParts[0];
        const ranks = position.split('/');

        // Rank 8 (Black) is index 0
        // Rank 1 (White) is index 7
        const rank8 = ranks[0]; // Black pieces
        const rank1 = ranks[7]; // White pieces

        // Helper to check piece at file (0-7 => a-h)
        // We need to expand the rank string to check specific indices
        const expandRank = (rankStr) => rankStr.replace(/\d/g, d => '1'.repeat(parseInt(d)));

        const r8 = expandRank(rank8);
        const r1 = expandRank(rank1);

        let castling = '';

        // White Castling (Rank 1)
        if (r1[4] === 'K') { // King at e1
            if (r1[7] === 'R') castling += 'K'; // Rook at h1
            if (r1[0] === 'R') castling += 'Q'; // Rook at a1
        }

        // Black Castling (Rank 8)
        if (r8[4] === 'k') { // King at e8
            if (r8[7] === 'r') castling += 'k'; // Rook at h8
            if (r8[0] === 'r') castling += 'q'; // Rook at a8
        }

        if (castling === '') castling = '-';

        // Reconstruct FEN
        // Parts: [Pos, Turn, Castling, EnPassant, Halfmove, Fullmove]
        // API usually returns "Pos w - - 0 1" or similar.
        // We preserve Turn, replace Castling.

        fenParts[2] = castling;
        fen = fenParts.join(' ');

        console.log('Success! Final FEN:', fen);
        return {
            statusCode: 200,
            body: JSON.stringify({ fen: fen })
        };

    } catch (error) {
        console.error('Error processing image:', error);
        console.error('Stack:', error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message, stack: error.stack })
        };
    }
};
