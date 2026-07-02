/**
 * Detects critical moments in chess games
 * Analyzes evaluation changes to identify blunders, inaccuracies, and brilliant moves
 */

import { EngineAnalysis } from '@/lib/chess/engine/types';
import { GameState } from '@/lib/types/chess';
import {
  CriticalMoment,
  MomentReason,
  CoachingConfig,
  DEFAULT_COACHING_CONFIG,
} from './types';

/**
 * Detects critical moments in a game based on engine analyses
 * Filters by confidence and removes duplicates
 *
 * @param game - Game state with moves
 * @param analyses - Array of engine analyses (one per move)
 * @param skillLevel - Player skill level for moment filtering
 * @param config - Configuration for moment detection
 * @returns Array of critical moments sorted by move index
 */
export function detectCriticalMoments(
  game: GameState,
  analyses: ReadonlyArray<EngineAnalysis | null>,
  _skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  config: CoachingConfig = DEFAULT_COACHING_CONFIG,
): ReadonlyArray<CriticalMoment> {
  if (game.moves.length === 0 || analyses.length < 2) {
    return [];
  }

  const moments: CriticalMoment[] = [];

  // Process each move (skip first move - no previous evaluation)
  for (let i = 1; i < Math.min(game.moves.length, analyses.length); i++) {
    const current = analyses[i];
    const previous = analyses[i - 1];

    // Skip if either analysis is missing
    if (!current || !previous) {
      continue;
    }

    const evalChange = Math.abs(current.evaluation - previous.evaluation);
    const evalBefore = previous.evaluation;
    const evalAfter = current.evaluation;

    // Determine if move is blunder, inaccuracy, or brilliant
    let momentType: MomentReason | null = null;
    let confidence = 0;

    // Determine whose turn it is (White moves on even halfmove numbers, Black on odd)
    const isWhiteMove = i % 2 === 0;

    // Direction of the eval swing relative to the player who moved, checked
    // once up front. Each branch below tests its own direction *and*
    // magnitude together, rather than gating on magnitude alone - otherwise
    // a move whose magnitude falls in the inaccuracy range but actually
    // improved the position (or vice versa) gets silently dropped instead of
    // falling through to the branch that actually matches its direction.
    const movedWorse = isWhiteMove
      ? evalAfter < evalBefore // White's eval decreased
      : evalAfter > evalBefore; // Black's eval increased (worse for Black)
    const movedBetter = isWhiteMove
      ? evalAfter > evalBefore // White's eval increased
      : evalAfter < evalBefore; // Black's eval decreased (better for Black)

    // Detect blunders (significant evaluation loss for the player who moved)
    if (movedWorse && evalChange >= config.blunderThreshold) {
      momentType = 'blunder';
      confidence = Math.min(evalChange / 500, 1); // Max confidence at 500cp loss
    }
    // Detect inaccuracies (moderate evaluation loss for the player)
    else if (
      movedWorse &&
      evalChange >= config.inaccuracyLowerThreshold &&
      evalChange < config.inaccuracyUpperThreshold
    ) {
      momentType = 'inaccuracy';
      confidence = Math.min(0.5 + evalChange / 600, 1.0); // Clamp to [0.5, 1.0]
    }
    // Detect brilliant moves (unexpected good moves that improve position for the player)
    else if (movedBetter && evalChange > 30) {
      momentType = 'brilliant';
      confidence = Math.min(evalChange / 200, 1);
    }
    // Detect defensive moves (preventing bigger loss)
    else if (evalChange >= 20 && evalBefore < -100) {
      momentType = 'defensive_move';
      confidence = 0.6;
    }

    // Add to moments if passes confidence threshold
    if (momentType && confidence >= config.confidenceThreshold) {
      moments.push({
        moveIndex: i,
        reason: momentType,
        evaluation: evalAfter,
        previousEvaluation: evalBefore,
        confidence,
        bestMove: current.bestMove,
        playedMove: game.moves[i]
          ? `${game.moves[i].from}${game.moves[i].to}${game.moves[i].promotion || ''}`
          : undefined,
      });
    }
  }

  // Detect key positions (opening/endgame transitions, critical positions)
  const keyPositionMoments = detectKeyPositions(game, analyses);
  moments.push(...keyPositionMoments);

  // Filter out consecutive duplicates
  let filtered = moments;
  if (config.filterConsecutiveDuplicates) {
    filtered = filterConsecutiveDuplicates(moments);
  }

  // Sort by importance (confidence descending) then by move index
  filtered.sort((a, b) => {
    const confidenceDiff = b.confidence - a.confidence;
    if (confidenceDiff !== 0) return confidenceDiff;
    return a.moveIndex - b.moveIndex;
  });

  // Limit to max moments
  return filtered.slice(0, config.maxMomentsPerGame);
}

/**
 * Detects key positions in the game
 * Identifies opening/endgame transitions and critical positions
 *
 * @param game - Game state
 * @param analyses - Array of engine analyses
 * @returns Array of key position moments
 */
function detectKeyPositions(
  game: GameState,
  analyses: ReadonlyArray<EngineAnalysis | null>,
): CriticalMoment[] {
  const keyMoments: CriticalMoment[] = [];
  const moveCount = game.moves.length;

  // Detect opening end (typically after 10-15 moves)
  const openingEndMove = Math.max(10, Math.floor(moveCount * 0.25));
  if (openingEndMove < analyses.length && analyses[openingEndMove]) {
    const analysis = analyses[openingEndMove];
    if (analysis) {
      keyMoments.push({
        moveIndex: openingEndMove,
        reason: 'key_position',
        evaluation: analysis.evaluation,
        previousEvaluation: analyses[openingEndMove - 1]?.evaluation || 0,
        confidence: 0.8, // High confidence for opening end
      });
    }
  }

  // Detect endgame start (typically after 70% of moves or when few pieces left)
  const endgameStartMove = Math.max(20, Math.floor(moveCount * 0.7));
  if (endgameStartMove < moveCount && endgameStartMove < analyses.length) {
    const analysis = analyses[endgameStartMove];
    if (analysis) {
      keyMoments.push({
        moveIndex: endgameStartMove,
        reason: 'key_position',
        evaluation: analysis.evaluation,
        previousEvaluation: analyses[endgameStartMove - 1]?.evaluation || 0,
        confidence: 0.75,
      });
    }
  }

  return keyMoments;
}

/**
 * Filters out consecutive duplicate moments
 * Keeps the first occurrence and removes duplicates within 2 moves
 *
 * @param moments - Array of moments
 * @returns Filtered array without consecutive duplicates
 */
function filterConsecutiveDuplicates(moments: CriticalMoment[]): CriticalMoment[] {
  if (moments.length <= 1) return moments;

  const filtered: CriticalMoment[] = [moments[0]];

  for (let i = 1; i < moments.length; i++) {
    const current = moments[i];
    const last = filtered[filtered.length - 1];

    // Keep if different reason or more than 2 moves apart
    if (current.reason !== last.reason || current.moveIndex - last.moveIndex > 2) {
      filtered.push(current);
    }
  }

  return filtered;
}

/**
 * Gets a human-readable description of a moment reason
 *
 * @param reason - Moment reason
 * @returns Description string
 */
export function getReasonLabel(reason: MomentReason): string {
  const labels: Record<MomentReason, string> = {
    blunder: 'Blunder',
    brilliant: 'Brilliant Move',
    inaccuracy: 'Inaccuracy',
    key_position: 'Key Position',
    defensive_move: 'Defensive Move',
  };
  return labels[reason];
}

/**
 * Gets color for moment reason badge
 *
 * @param reason - Moment reason
 * @returns CSS color value
 */
export function getReasonColor(reason: MomentReason): string {
  const colors: Record<MomentReason, string> = {
    blunder: '#dc2626', // Red
    brilliant: '#16a34a', // Green
    inaccuracy: '#f59e0b', // Amber
    key_position: '#0ea5e9', // Sky blue
    defensive_move: '#8b5cf6', // Violet
  };
  return colors[reason];
}
