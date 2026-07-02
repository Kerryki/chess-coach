/**
 * Skill level definitions for chess coaching personalization
 */

/**
 * Represents a skill level with associated parameters
 */
export interface SkillLevelDefinition {
  /** Unique identifier for the skill level */
  readonly id: 'beginner' | 'intermediate' | 'advanced';

  /** Display name */
  readonly name: string;

  /** Description of this skill level */
  readonly description: string;

  /** ELO rating range (approximate) */
  readonly eloRange: {
    readonly min: number;
    readonly max: number;
  };

  /** Whether to explain basic tactics */
  readonly explainBasicTactics: boolean;

  /** Whether to explain opening principles */
  readonly explainOpeningPrinciples: boolean;

  /** Whether to suggest opening improvements */
  readonly suggestOpeningImprovements: boolean;

  /** Whether to analyze endgame technique */
  readonly analyzeEndgame: boolean;

  /** Whether to suggest complex positional improvements */
  readonly suggestPositionalImprovements: boolean;

  /** Whether to suggest sacrificial ideas */
  readonly suggestSacrifices: boolean;

  /** Maximum depth of analysis (in plies) */
  readonly analysisDepth: number;

  /** Focus areas for coaching */
  readonly focusAreas: ReadonlyArray<string>;
}

/**
 * All available skill levels with their configurations
 */
export const SKILL_LEVELS: Record<string, SkillLevelDefinition> = {
  beginner: {
    id: 'beginner',
    name: 'Beginner',
    description: 'Learning basic chess rules and fundamental tactics',
    eloRange: { min: 0, max: 1200 },
    explainBasicTactics: true,
    explainOpeningPrinciples: true,
    suggestOpeningImprovements: true,
    analyzeEndgame: false,
    suggestPositionalImprovements: false,
    suggestSacrifices: false,
    analysisDepth: 4,
    focusAreas: ['piece safety', 'basic tactics', 'king safety', 'material control', 'opening principles'],
  },

  intermediate: {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'Developing tactical awareness and basic strategic understanding',
    eloRange: { min: 1200, max: 1800 },
    explainBasicTactics: true,
    explainOpeningPrinciples: true,
    suggestOpeningImprovements: true,
    analyzeEndgame: true,
    suggestPositionalImprovements: true,
    suggestSacrifices: false,
    analysisDepth: 8,
    focusAreas: [
      'tactical motifs',
      'positional understanding',
      'pawn structures',
      'piece coordination',
      'opening strategy',
      'endgame techniques',
    ],
  },

  advanced: {
    id: 'advanced',
    name: 'Advanced',
    description: 'Deep strategic analysis and advanced tactical patterns',
    eloRange: { min: 1800, max: 3000 },
    explainBasicTactics: true,
    explainOpeningPrinciples: true,
    suggestOpeningImprovements: true,
    analyzeEndgame: true,
    suggestPositionalImprovements: true,
    suggestSacrifices: true,
    analysisDepth: 16,
    focusAreas: [
      'deep positional understanding',
      'prophylaxis',
      'compensation assessment',
      'dynamic play',
      'novelty discovery',
      'opening preparation',
      'conversion technique',
      'psychological play',
    ],
  },
} as const;

/**
 * Gets a skill level definition by ID
 *
 * @param id - Skill level ID
 * @returns Skill level definition or undefined
 */
export function getSkillLevel(id: string): SkillLevelDefinition | undefined {
  return SKILL_LEVELS[id];
}

/**
 * Gets all available skill levels
 *
 * @returns Array of all skill level definitions
 */
export function getAllSkillLevels(): ReadonlyArray<SkillLevelDefinition> {
  return Object.values(SKILL_LEVELS);
}

/**
 * Validates that a string is a valid skill level ID
 *
 * @param value - Value to check
 * @returns True if value is a valid skill level ID
 */
export function isValidSkillLevel(value: unknown): value is 'beginner' | 'intermediate' | 'advanced' {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}

/**
 * Gets the analysis depth for a skill level
 *
 * @param skillLevel - Skill level ID
 * @returns Analysis depth in plies
 */
export function getAnalysisDepth(skillLevel: 'beginner' | 'intermediate' | 'advanced'): number {
  return SKILL_LEVELS[skillLevel].analysisDepth;
}

/**
 * Gets focus areas for a skill level
 *
 * @param skillLevel - Skill level ID
 * @returns Array of focus areas
 */
export function getFocusAreas(skillLevel: 'beginner' | 'intermediate' | 'advanced'): ReadonlyArray<string> {
  return SKILL_LEVELS[skillLevel].focusAreas;
}
