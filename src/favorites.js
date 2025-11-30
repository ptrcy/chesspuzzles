/**
 * Favorites Manager
 * Handles saving and retrieving favorite positions from LocalStorage
 */
export class FavoritesManager {
    constructor(storageKey = 'chess_favorites') {
        this.storageKey = storageKey;
    }

    /**
     * Get all favorites
     * @returns {Array} List of favorite objects
     */
    getAll() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load favorites', e);
            return [];
        }
    }

    /**
     * Add a favorite
     * @param {string} fen - The FEN string
     * @param {string} fileName - The source file name
     * @returns {boolean} True if added, false if already exists
     */
    add(fen, fileName) {
        const favorites = this.getAll();

        // Check for duplicates
        const exists = favorites.some(f => f.fen === fen && f.fileName === fileName);
        if (exists) {
            return false;
        }

        favorites.push({
            fen,
            fileName,
            date: new Date().toISOString()
        });

        this.save(favorites);
        return true;
    }

    /**
     * Remove a favorite
     * @param {string} fen 
     * @param {string} fileName 
     */
    remove(fen, fileName) {
        let favorites = this.getAll();
        favorites = favorites.filter(f => !(f.fen === fen && f.fileName === fileName));
        this.save(favorites);
    }

    /**
     * Check if a position is favorited
     * @param {string} fen 
     * @param {string} fileName 
     * @returns {boolean}
     */
    isFavorite(fen, fileName) {
        const favorites = this.getAll();
        return favorites.some(f => f.fen === fen && f.fileName === fileName);
    }

    /**
     * Save to LocalStorage
     * @private
     */
    save(favorites) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(favorites));
        } catch (e) {
            console.error('Failed to save favorites', e);
            throw new Error('Could not save to local storage');
        }
    }
}
