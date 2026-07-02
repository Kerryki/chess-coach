/**
 * Builds Claude API prompts for chess coaching explanations
 * Tailors explanations to player skill level and position context
 */

import { CoachingContext } from './types';

/**
 * Builds a coaching prompt for Claude based on a moment and context
 * Adapts explanation level to player skill
 *
 * @param context - Coaching context with position and move information
 * @param skillLevel - Player skill level (beginner, intermediate, advanced)
 * @returns Prompt string for Claude API
 */
export function buildCoachingPrompt(
  context: CoachingContext,
  skillLevel: 'beginner' | 'intermediate' | 'advanced',
): string {
  const basePrompt = buildBaseContext(context);
  const skillPrompt = buildSkillLevelPrompt(skillLevel, context);
  const guidelines = buildGuidelinesPrompt(skillLevel);

  return `${basePrompt}\n\n${skillPrompt}\n\n${guidelines}`;
}

/**
 * Builds the base context section of the prompt
 * Includes FEN, moves, and evaluation information
 *
 * @param context - Coaching context
 * @returns Base context string
 */
function buildBaseContext(context: CoachingContext): string {
  const moveNum = Math.ceil(context.moveNumber / 2);
  const isWhiteMove = context.moveNumber % 2 === 1;
  const moveColor = isWhiteMove ? 'White' : 'Black';

  let prompt = `# Chess Position Analysis\n\n`;
  prompt += `**Position (Move ${moveNum}, ${moveColor} to move)**\n`;
  prompt += `FEN: \`${context.fen}\`\n\n`;

  if (context.gameMetadata) {
    prompt += `**Game Info**\n`;
    if (context.gameMetadata.white) prompt += `- White: ${context.gameMetadata.white}\n`;
    if (context.gameMetadata.black) prompt += `- Black: ${context.gameMetadata.black}\n`;
    if (context.gameMetadata.event) prompt += `- Event: ${context.gameMetadata.event}\n`;
    if (context.gameMetadata.timeControl) {
      prompt += `- Time Control: ${context.gameMetadata.timeControl}\n`;
    }
    prompt += '\n';
  }

  prompt += `**Move Analysis**\n`;
  prompt += `- Move Played: ${formatMove(context.movePlayed)}\n`;
  prompt += `- Best Move: ${formatMove(context.bestMove)}\n`;
  prompt += `- Evaluation Before: ${formatEvaluation(context.evaluationBefore)}\n`;
  prompt += `- Evaluation After: ${formatEvaluation(context.evaluationAfter)}\n`;
  prompt += `- Evaluation Change: ${formatEvaluationChange(context.evaluationBefore, context.evaluationAfter)}\n`;

  if (context.principalVariation && context.principalVariation.length > 0) {
    prompt += `- Best Continuation: ${context.principalVariation.slice(0, 3).map(formatMove).join(' - ')}\n`;
  }

  prompt += `\n**Moment Type**: ${formatMomentType(context.momentType)}\n`;

  return prompt;
}

/**
 * Builds the skill-level specific prompt section
 *
 * @param skillLevel - Player skill level
 * @param context - Coaching context
 * @returns Skill-specific prompt string
 */
function buildSkillLevelPrompt(
  skillLevel: 'beginner' | 'intermediate' | 'advanced',
  context: CoachingContext,
): string {
  const evalChange = Math.abs(context.evaluationAfter - context.evaluationBefore);

  switch (skillLevel) {
    case 'beginner':
      return `
## Beginner-Level Analysis

Explain this move in simple terms focusing on:

1. **What happened**: Describe the move played and what pieces moved where
2. **Why it was wrong (if inaccuracy/blunder)**: Focus on basic chess principles:
   - Piece safety and protection
   - Material count (did pieces get captured?)
   - King safety (is the king under attack?)
3. **Better alternative**: Suggest the best move in simple terms and explain why it's better
4. **Key lesson**: One simple takeaway the player can remember

Use simple chess language and avoid deep positional concepts. Focus on TACTICS and material.
${evalChange > 300 ? '5. **How bad was it?**: Briefly explain the evaluation gap in simple terms (e.g., "Your king is in danger" or "You lost the exchange")' : ''}
`;

    case 'intermediate':
      return `
## Intermediate-Level Analysis

Explain this move with tactical and strategic insight:

1. **Position assessment**: Describe the current position and its characteristics
   - Pawn structure and weaknesses
   - Piece placement and activity
   - King safety considerations
2. **Move evaluation**: Why was the move played? What was the idea?
3. **Why it didn't work**: Explain the tactical or strategic problem with this move
4. **Better moves**: Suggest the best move and alternatives, explaining the advantages of each
5. **Strategic lesson**: What should the player learn about this type of position?

Consider both tactics and strategy. Explain calculation depth (how many moves ahead to think).
${evalChange > 200 ? '6. **Technical evaluation**: Explain what the evaluation numbers mean in this context' : ''}
`;

    case 'advanced':
      return `
## Advanced-Level Analysis

Provide deep analysis suitable for a strong player:

1. **Position assessment**:
   - Pawn structure evaluation and long-term implications
   - Piece placement and coordination
   - Imbalances and dynamic factors
2. **Move critique**: Why was this move chosen? Analyze the player's likely thinking
3. **Objective evaluation**:
   - Exact evaluation change and its significance
   - Computer continuation and human alternatives
   - Critical variations that arise from the move
4. **Alternative moves**: Compare top candidate moves
   - Pros/cons of each move
   - Engine evaluations for main alternatives
   - Practical play considerations
5. **Opening/Middle/Endgame context**: How does this phase of the game factor in?
6. **Psychological and practical aspects**: Time pressure, preparation, practical chances vs. objective evaluation

Reference specific engine variations and use concrete analysis.
`;
  }
}

/**
 * Builds the guidelines section of the prompt
 *
 * @param skillLevel - Player skill level
 * @returns Guidelines string
 */
function buildGuidelinesPrompt(skillLevel: 'beginner' | 'intermediate' | 'advanced'): string {
  return `
## Instructions

- Keep your explanation CONCISE (2-3 paragraphs maximum)
- Be encouraging and constructive in tone
- Provide SPECIFIC advice the player can use in future games
- If the move was good or excellent, acknowledge what was right about it
- Focus on understanding WHY, not just WHAT was wrong

${skillLevel === 'advanced' ? '- Use chess notation and technical terminology' : ''}
${skillLevel === 'beginner' ? '- Use very simple language and avoid overwhelming with too many ideas' : ''}
${skillLevel === 'intermediate' ? '- Balance simplicity with some strategic depth' : ''}

Format your response as a clear, flowing explanation suitable for coaching.
`;
}

/**
 * Formats a move from algebraic notation to readable format
 *
 * @param move - Move in algebraic notation (e.g., "e2e4")
 * @returns Formatted move string
 */
function formatMove(move: string): string {
  if (!move || move.length < 4) return move;
  const from = move.substring(0, 2);
  const to = move.substring(2, 4);
  const promotion = move.length > 4 ? move.substring(4) : '';
  return `${from}${to}${promotion ? `=${promotion.toUpperCase()}` : ''}`;
}

/**
 * Formats evaluation for display
 *
 * @param evaluation - Evaluation in centipawns
 * @returns Formatted evaluation string
 */
function formatEvaluation(evaluation: number): string {
  const pawns = (evaluation / 100).toFixed(1);
  return `${evaluation >= 0 ? '+' : ''}${pawns} (${evaluation >= 0 ? 'White' : 'Black'} advantage)`;
}

/**
 * Formats evaluation change
 *
 * @param before - Evaluation before
 * @param after - Evaluation after
 * @returns Formatted change string
 */
function formatEvaluationChange(before: number, after: number): string {
  const change = after - before;
  const absChange = Math.abs(change);
  const direction = change > 0 ? '↑ Improved' : '↓ Worsened';
  const pawns = (absChange / 100).toFixed(1);
  return `${direction} by ${pawns}`;
}

/**
 * Formats moment type for display
 *
 * @param momentType - Moment type
 * @returns Formatted type string
 */
function formatMomentType(momentType: string): string {
  const types: Record<string, string> = {
    blunder: 'Critical Blunder',
    inaccuracy: 'Inaccuracy',
    brilliant: 'Brilliant Move',
    key_position: 'Key Position',
    defensive_move: 'Defensive Move',
  };
  return types[momentType] || momentType;
}
