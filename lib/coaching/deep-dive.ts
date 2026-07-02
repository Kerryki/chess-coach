/**
 * Deep Dive module for on-demand, streaming chess explanations
 * Generates Claude-powered analysis for individual moves
 */

/**
 * Context for generating a deep-dive explanation
 * Includes move, position, and analysis information
 */
export interface DeepDiveContext {
  /** Index of the move in the game (0-based) */
  readonly moveIndex: number;

  /** FEN string of the position before the move */
  readonly fen: string;

  /** Move in algebraic notation (e.g., "e2e4") */
  readonly move: string;

  /** Engine analysis at the position (in centipawns) */
  readonly analysis: {
    /** Evaluation before the move */
    readonly before: number;

    /** Evaluation after the move */
    readonly after: number;

    /** Best move according to engine */
    readonly bestMove?: string;

    /** Principal variation (top engine line) */
    readonly principalVariation?: ReadonlyArray<string>;
  };

  /** Alternative moves and their evaluations */
  readonly alternatives?: ReadonlyArray<{
    readonly move: string;
    readonly evaluation?: number;
  }>;

  /** Player skill level for adapting explanation depth */
  readonly skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Builds a prompt for streaming deep-dive analysis
 * Tailors explanation to skill level and move context
 *
 * @param context - Deep dive context with move and position info
 * @returns Prompt string for Claude API streaming
 */
export function buildDeepDivePrompt(context: DeepDiveContext): string {
  const moveNum = Math.ceil(context.moveIndex / 2);
  const isWhiteMove = context.moveIndex % 2 === 0;
  const moveColor = isWhiteMove ? 'White' : 'Black';
  const evalChange = context.analysis.after - context.analysis.before;

  let prompt = `# Deep Analysis of Move ${moveNum}${moveColor === 'White' ? '' : '...'}\n\n`;
  prompt += `**Position Context**\n`;
  prompt += `FEN: \`${context.fen}\`\n`;
  prompt += `Move Played: ${formatMove(context.move)}\n`;
  prompt += `Evaluation Before: ${formatEvaluation(context.analysis.before)}\n`;
  prompt += `Evaluation After: ${formatEvaluation(context.analysis.after)}\n`;
  prompt += `Change: ${evalChange > 0 ? '↑' : '↓'} ${Math.abs(evalChange / 100).toFixed(1)} pawns\n\n`;

  if (context.analysis.bestMove) {
    prompt += `**Engine Assessment**\n`;
    prompt += `Best Move: ${formatMove(context.analysis.bestMove)}\n`;
  }

  if (context.analysis.principalVariation && context.analysis.principalVariation.length > 0) {
    prompt += `Best Continuation: ${context.analysis.principalVariation
      .slice(0, 5)
      .map(formatMove)
      .join(' ')}\n`;
  }

  if (context.alternatives && context.alternatives.length > 0) {
    prompt += `\n**Alternative Moves Considered**\n`;
    for (const alt of context.alternatives.slice(0, 3)) {
      const altEval = alt.evaluation !== undefined ? ` (${formatEvaluation(alt.evaluation)})` : '';
      prompt += `- ${formatMove(alt.move)}${altEval}\n`;
    }
  }

  prompt += '\n';

  // Skill-level specific instructions
  switch (context.skillLevel) {
    case 'beginner':
      prompt += `## For Beginners

Explain this move in simple terms:
1. **What happened**: Describe the move clearly
2. **Was it good?**: Use simple terms (good, bad, losing material, etc.)
3. **Why or why not**: Focus on piece safety and material
4. **What to remember**: One key lesson for similar positions
5. **Better alternatives**: Suggest simpler, safer moves if available

Keep it encouraging and avoid jargon. Focus on practical understanding.`;
      break;

    case 'intermediate':
      prompt += `## For Intermediate Players

Provide tactical and strategic analysis:
1. **Position assessment**: What's the key feature of this position?
2. **Move evaluation**: Was this the right choice? Why?
3. **Tactical considerations**: Are there any hanging pieces or tactics?
4. **Strategic ideas**: What's the long-term plan?
5. **Alternatives**: What else could have been played? Why was this move better or worse?
6. **Key lesson**: What principle or technique applies here?

Balance simplicity with some depth. Explain your reasoning clearly.`;
      break;

    case 'advanced':
      prompt += `## For Advanced Players

Provide deep positional and theoretical analysis:
1. **Position characteristics**: Pawn structure, piece placement, weaknesses
2. **Move assessment**: Objective evaluation and reasoning
3. **Concrete analysis**: Specific variations and tactical points
4. **Alternatives**: Compare candidate moves with detailed analysis
5. **Opening/Middle/Endgame context**: Phase of game implications
6. **Practical vs. theoretical**: Time pressure, practical chances, objective evaluation
7. **Engine insights**: Reference top engine variations and evaluations

Use technical terminology and specific variations. Focus on understanding the position deeply.`;
      break;
  }

  prompt += `\n\n## Instructions

- Be specific and concrete with your analysis
- If the move was strong, explain why it's good
- If the move was weak, explain what was better
- Keep your explanation clear and focused (2-4 paragraphs)
- For beginners: use very simple language
- For advanced: use chess terminology and specific lines

Format your response as a flowing explanation suitable for learning.`;

  return prompt;
}

/**
 * Formats a move from algebraic notation to readable format
 *
 * @param move - Move in algebraic notation
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
  const side = evaluation >= 0 ? 'White' : 'Black';
  return `${evaluation >= 0 ? '+' : ''}${pawns} (${side} ↑)`;
}
