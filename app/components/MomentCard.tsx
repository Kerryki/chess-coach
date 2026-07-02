/**
 * Card component for displaying a single coaching moment
 * Shows move number, reason, evaluation change, and explanation
 */

'use client';

import React, { useState } from 'react';
import { CriticalMoment, CoachingExplanation } from '@/lib/coaching/types';
import { getReasonLabel, getReasonColor } from '@/lib/coaching/moment-detector';

/**
 * Props for MomentCard component
 */
interface MomentCardProps {
  readonly moment: CriticalMoment;
  readonly explanation?: CoachingExplanation;
  readonly isLoading?: boolean;
  readonly skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  readonly className?: string;
}

/**
 * Card component for a single coaching moment
 */
export const MomentCard: React.FC<MomentCardProps> = ({
  moment,
  explanation,
  isLoading = false,
  skillLevel = 'intermediate',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const moveNumber = Math.ceil((moment.moveIndex + 1) / 2);
  const reasonLabel = getReasonLabel(moment.reason);
  const reasonColor = getReasonColor(moment.reason);
  const evalChange = moment.evaluation - moment.previousEvaluation;
  const evalChangeAbs = Math.abs(evalChange);
  const evalChangeStr = evalChange > 0 ? `+${(evalChangeAbs / 100).toFixed(1)}` : `-${(evalChangeAbs / 100).toFixed(1)}`;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`moment-card ${isExpanded ? 'expanded' : ''} ${className}`}>
      {/* Header */}
      <button
        className="moment-card-header"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={`moment-${moment.moveIndex}-body`}
      >
        <div className="moment-card-header-left">
          <span className="moment-card-move-num">Move {moveNumber}</span>
          <span
            className="moment-card-reason-badge"
            style={{ backgroundColor: reasonColor }}
          >
            {reasonLabel}
          </span>
        </div>

        <div className="moment-card-header-right">
          <span
            className="moment-card-eval-change"
            style={{
              color: evalChange > 0 ? '#16a34a' : '#dc2626',
            }}
          >
            {evalChangeStr}
          </span>
          <span className="moment-card-toggle-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {/* Evaluation bar */}
      <div className="moment-card-eval-bar">
        <div className="moment-card-eval-bar-track">
          <div
            className="moment-card-eval-bar-before"
            style={{
              width: `${Math.min(Math.max((moment.previousEvaluation + 300) / 600, 0), 100)}%`,
            }}
          />
          <div
            className="moment-card-eval-bar-after"
            style={{
              width: `${Math.min(Math.max((moment.evaluation + 300) / 600, 0), 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Confidence indicator */}
      <div className="moment-card-confidence">
        <span className="moment-card-confidence-label">Confidence:</span>
        <div className="moment-card-confidence-bar">
          <div
            className="moment-card-confidence-fill"
            style={{ width: `${moment.confidence * 100}%` }}
          />
        </div>
        <span className="moment-card-confidence-value">
          {(moment.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="moment-card-body" id={`moment-${moment.moveIndex}-body`}>
          {/* Skill level badge */}
          {skillLevel && (
            <div className="moment-card-skill-level">
              Explanation for <strong>{skillLevel}</strong> level
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="moment-card-loading">
              <span className="moment-card-spinner" />
              Generating explanation...
            </div>
          )}

          {/* Explanation */}
          {explanation && !isLoading && (
            <>
              <div className="moment-card-explanation">
                {explanation.explanation}
              </div>

              {/* Alternatives */}
              {explanation.alternatives && explanation.alternatives.length > 0 && (
                <div className="moment-card-alternatives">
                  <strong>Alternative moves:</strong>
                  <div className="moment-card-alternatives-list">
                    {explanation.alternatives.map((alt) => (
                      <span key={alt} className="moment-card-alternative">
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up */}
              {explanation.followUp && (
                <div className="moment-card-followup">
                  <strong>Remember:</strong> {explanation.followUp}
                </div>
              )}
            </>
          )}

          {/* No explanation yet */}
          {!explanation && !isLoading && (
            <div className="moment-card-no-explanation">
              No explanation yet. Generate explanations to learn from this move.
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .moment-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          overflow: hidden;
          transition: all 200ms ease;
        }

        .moment-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .moment-card.expanded {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .moment-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f9fafb;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          cursor: pointer;
          transition: background 150ms ease;
          width: 100%;
          text-align: left;
        }

        .moment-card-header:hover {
          background: #f3f4f6;
        }

        .moment-card-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .moment-card-move-num {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          min-width: 50px;
        }

        .moment-card-reason-badge {
          padding: 4px 10px;
          border-radius: 4px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .moment-card-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-left: 12px;
        }

        .moment-card-eval-change {
          font-weight: 700;
          font-size: 14px;
          min-width: 40px;
          text-align: right;
        }

        .moment-card-toggle-icon {
          color: #9ca3af;
          font-size: 12px;
          transition: transform 150ms ease;
        }

        .moment-card.expanded .moment-card-toggle-icon {
          transform: rotate(0deg);
        }

        .moment-card-eval-bar {
          padding: 8px 16px;
          background: #f3f4f6;
        }

        .moment-card-eval-bar-track {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .moment-card-eval-bar-before,
        .moment-card-eval-bar-after {
          position: absolute;
          height: 100%;
          left: 0;
          bottom: 0;
        }

        .moment-card-eval-bar-before {
          background: rgba(102, 126, 234, 0.3);
        }

        .moment-card-eval-bar-after {
          background: rgba(102, 126, 234, 0.6);
        }

        .moment-card-confidence {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f9fafb;
          font-size: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .moment-card-confidence-label {
          color: #6b7280;
          font-weight: 500;
          min-width: 65px;
        }

        .moment-card-confidence-bar {
          flex: 1;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }

        .moment-card-confidence-fill {
          height: 100%;
          background: #667eea;
          transition: width 200ms ease;
        }

        .moment-card-confidence-value {
          color: #374151;
          font-weight: 600;
          min-width: 30px;
          text-align: right;
        }

        .moment-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: slideDown 200ms ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .moment-card-skill-level {
          padding: 8px 12px;
          background: #ede9fe;
          border-left: 3px solid #8b5cf6;
          border-radius: 4px;
          font-size: 12px;
          color: #6b21a8;
        }

        .moment-card-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          text-align: center;
          color: #6b7280;
          justify-content: center;
        }

        .moment-card-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 600ms linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .moment-card-explanation {
          color: #374151;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .moment-card-alternatives {
          padding: 12px;
          background: #f0f9ff;
          border-left: 3px solid #0ea5e9;
          border-radius: 4px;
          font-size: 13px;
        }

        .moment-card-alternatives strong {
          color: #0369a1;
        }

        .moment-card-alternatives-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .moment-card-alternative {
          padding: 4px 12px;
          background: white;
          border: 1px solid #0ea5e9;
          border-radius: 4px;
          color: #0369a1;
          font-family: monospace;
          font-weight: 600;
        }

        .moment-card-followup {
          padding: 12px;
          background: #f0fdf4;
          border-left: 3px solid #16a34a;
          border-radius: 4px;
          font-size: 13px;
          color: #166534;
        }

        .moment-card-followup strong {
          color: #15803d;
        }

        .moment-card-no-explanation {
          padding: 16px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
          font-style: italic;
        }

        @media (prefers-color-scheme: dark) {
          .moment-card {
            border-color: #374151;
            background: #1f2937;
          }

          .moment-card-header {
            background: #111827;
            border-bottom-color: #374151;
          }

          .moment-card-header:hover {
            background: #1f2937;
          }

          .moment-card-move-num {
            color: #d1d5db;
          }

          .moment-card-eval-bar {
            background: #111827;
            border-bottom-color: #374151;
          }

          .moment-card-eval-bar-track {
            background: #374151;
          }

          .moment-card-confidence {
            background: #111827;
            border-bottom-color: #374151;
            color: #9ca3af;
          }

          .moment-card-skill-level {
            background: #3730a3;
            color: #ddd6fe;
          }

          .moment-card-explanation {
            color: #d1d5db;
          }

          .moment-card-alternatives {
            background: #082f49;
            border-left-color: #0ea5e9;
          }

          .moment-card-alternatives strong {
            color: #0284c7;
          }

          .moment-card-alternative {
            background: #1f2937;
            border-color: #0284c7;
            color: #06b6d4;
          }

          .moment-card-followup {
            background: #052e16;
            border-left-color: #16a34a;
            color: #86efac;
          }

          .moment-card-followup strong {
            color: #4ade80;
          }

          .moment-card-no-explanation {
            color: #6b7280;
          }
        }

        @media (max-width: 640px) {
          .moment-card-header-left {
            gap: 8px;
          }

          .moment-card-reason-badge {
            font-size: 11px;
            padding: 3px 8px;
          }

          .moment-card-header-right {
            gap: 8px;
          }

          .moment-card-body {
            padding: 12px;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default MomentCard;
