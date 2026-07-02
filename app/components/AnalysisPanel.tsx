/**
 * Analysis panel component
 * Displays Stockfish engine analysis with evaluation, best move, and principal variation
 */

'use client';

import React, { useMemo } from 'react';
import { EngineAnalysis } from '@/lib/chess/engine/types';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import ErrorAlert from '@/app/components/ErrorAlert';
import { AppError } from '@/lib/types/errors';

/**
 * Props for AnalysisPanel component
 */
interface AnalysisPanelProps {
  /** Current analysis result, or null if no analysis */
  readonly analysis: EngineAnalysis | null;

  /** Whether analysis is currently running */
  readonly isAnalyzing: boolean;

  /** Current error, or null if no error */
  readonly error: AppError | null;

  /** Current FEN being analyzed */
  readonly fen: string | null;

  /** Callback to retry analysis on error */
  readonly onRetry?: () => void;

  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Memoized evaluation bar component
 */
const EvaluationBar: React.FC<{ evaluation: number; isMate: boolean }> = React.memo(
  ({ evaluation, isMate }) => {
    // Convert centipawns to percentage for bar width
    // Range: -400 to +400 cp represents full range
    const maxCp = 400;
    const normalizedEval = Math.max(-maxCp, Math.min(maxCp, evaluation));
    const percentage = ((normalizedEval + maxCp) / (maxCp * 2)) * 100;

    // Determine colors based on evaluation
    const getColor = () => {
      if (isMate) return '#2e7d32';
      if (evaluation > 200) return '#2e7d32';
      if (evaluation < -200) return '#c62828';
      return '#f57c00';
    };

    return (
      <div className="eval-bar-container">
        <div
          className="eval-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: getColor(),
          }}
        />
        <div className="eval-bar-label">{isMate ? 'Mate' : `${evaluation} cp`}</div>
      </div>
    );
  },
);

EvaluationBar.displayName = 'EvaluationBar';

/**
 * Memoized principal variation display
 */
const PrincipalVariation: React.FC<{
  moves: ReadonlyArray<string>;
}> = React.memo(({ moves }) => {
  return (
    <div className="principal-variation">
      <div className="principal-variation-label">Variation:</div>
      <div className="principal-variation-moves">
        {moves.map((move, index) => (
          <span key={`${move}-${index}`} className="principal-variation-move">
            {move}
          </span>
        ))}
      </div>
    </div>
  );
});

PrincipalVariation.displayName = 'PrincipalVariation';

/**
 * Analysis panel component
 * Displays engine analysis with best move, evaluation, and principal variation
 */
export const AnalysisPanel: React.FC<AnalysisPanelProps> = React.memo(
  ({ analysis, isAnalyzing, error, fen, onRetry, className = '' }) => {
    // Determine if we have a mate
    const mateDisplay = useMemo(() => {
      if (!analysis || !analysis.isMate || !analysis.mateIn) {
        return null;
      }
      return `Mate in ${analysis.mateIn}`;
    }, [analysis]);

    // Format evaluation text
    const evaluationText = useMemo(() => {
      if (!analysis) return null;
      if (mateDisplay) return mateDisplay;
      return `${analysis.evaluation > 0 ? '+' : ''}${analysis.evaluation} cp`;
    }, [analysis, mateDisplay]);

    return (
      <div className={`analysis-panel ${className}`}>
        <div className="analysis-panel-header">
          <h3 className="analysis-panel-title">Engine Analysis</h3>
          <div className="analysis-panel-status">
            {isAnalyzing && <span className="status-badge analyzing">Analyzing...</span>}
            {analysis && !isAnalyzing && (
              <span className="status-badge complete">Depth {analysis.depth}</span>
            )}
          </div>
        </div>

        {/* FEN Display */}
        {fen && (
          <div className="analysis-fen">
            <div className="analysis-fen-label">Position:</div>
            <div className="analysis-fen-value">{fen.slice(0, 30)}...</div>
          </div>
        )}

        {/* Error State */}
        {error && !isAnalyzing && (
          <ErrorAlert error={error} onDismiss={onRetry} />
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <LoadingSpinner message="Analyzing position..." size={30} />
        )}

        {/* Analysis Results */}
        {analysis && !isAnalyzing && (
          <div className="analysis-results">
            {/* Best Move */}
            <div className="analysis-section">
              <div className="analysis-section-label">Best Move:</div>
              <div className="analysis-best-move">{analysis.bestMove.toUpperCase()}</div>
            </div>

            {/* Evaluation Bar and Score */}
            <div className="analysis-section">
              <div className="analysis-section-label">Evaluation:</div>
              <EvaluationBar
                evaluation={analysis.evaluation}
                isMate={Boolean(analysis.isMate)}
              />
              {evaluationText && (
                <div className="analysis-evaluation-text">{evaluationText}</div>
              )}
            </div>

            {/* Principal Variation */}
            {analysis.principalVariation.length > 0 && (
              <div className="analysis-section">
                <PrincipalVariation moves={analysis.principalVariation} />
              </div>
            )}

            {/* Depth Info */}
            <div className="analysis-section-small">
              <span className="analysis-meta">Search depth: {analysis.depth}</span>
              {analysis.isMate && analysis.mateIn && (
                <span className="analysis-meta">Mate in {analysis.mateIn} moves</span>
              )}
            </div>
          </div>
        )}

        {/* No Analysis Yet */}
        {!analysis && !isAnalyzing && !error && (
          <div className="analysis-placeholder">
            <p>Navigate to a position to view engine analysis</p>
          </div>
        )}

        <style jsx>{`
          .analysis-panel {
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .analysis-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }

          .analysis-panel-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            color: #333;
          }

          .analysis-panel-status {
            display: flex;
            gap: 8px;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .status-badge.analyzing {
            background: #fff3e0;
            color: #e65100;
          }

          .status-badge.complete {
            background: #e8f5e9;
            color: #2e7d32;
          }

          .analysis-fen {
            padding: 12px;
            background: #f5f5f5;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
          }

          .analysis-fen-label {
            font-size: 11px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .analysis-fen-value {
            color: #333;
            word-break: break-all;
          }

          .analysis-results {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .analysis-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .analysis-section-label {
            font-size: 12px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .analysis-best-move {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
            font-family: monospace;
          }

          .eval-bar-container {
            width: 100%;
            height: 40px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
          }

          .eval-bar-fill {
            height: 100%;
            transition: width 200ms ease;
            display: flex;
            align-items: center;
          }

          .eval-bar-label {
            position: absolute;
            width: 100%;
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            color: #333;
            z-index: 10;
          }

          .analysis-evaluation-text {
            font-size: 14px;
            font-weight: 600;
            color: #333;
          }

          .principal-variation {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .principal-variation-label {
            font-size: 12px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .principal-variation-moves {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .principal-variation-move {
            padding: 6px 12px;
            background: #f0f0f0;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            font-weight: 600;
            color: #333;
          }

          .analysis-section-small {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            padding-top: 12px;
            border-top: 1px solid #e0e0e0;
          }

          .analysis-meta {
            font-size: 12px;
            color: #666;
          }

          .analysis-placeholder {
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;
          }

            @media (prefers-color-scheme: dark) {
            .analysis-panel { background: #2a2a2a; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
            .analysis-panel-title { color: #ddd; }
            .analysis-fen { background: #1a1a1a; color: #aaa; }
            .analysis-fen-value { color: #ccc; }
            .analysis-section-label { color: #999; }
            .analysis-best-move { color: #81d4fa; }
            .eval-bar-container { background: #444; }
            .eval-bar-label { color: #ddd; }
            .analysis-evaluation-text { color: #ddd; }
            .principal-variation-move { background: #1a1a1a; color: #aaa; }
            .analysis-section-small { border-top-color: #444; }
            .analysis-meta { color: #999; }
            .analysis-placeholder { color: #666; }
          }
        `}</style>
      </div>
    );
  },
);

AnalysisPanel.displayName = 'AnalysisPanel';

export default AnalysisPanel;
