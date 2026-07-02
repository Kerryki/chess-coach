/**
 * Type definitions for stockfish.js WASM module
 */

declare module 'stockfish.js' {
  /**
   * Stockfish engine instance
   */
  interface StockfishEngine {
    /**
     * Send a command to the engine
     * @param command UCI command string
     */
    postMessage(command: string): void;

    /**
     * Listen for engine output
     * @param event Message event listener
     */
    addEventListener(event: string, handler: (event: MessageEvent) => void): void;

    /**
     * Remove event listener
     */
    removeEventListener(event: string, handler: (event: MessageEvent) => void): void;

    /**
     * Terminate the engine
     */
    terminate(): void;
  }

  /**
   * Factory function to create Stockfish engine instance
   * @returns Promise resolving to initialized engine
   */
  function Stockfish(): Promise<StockfishEngine>;

  export default Stockfish;
}
