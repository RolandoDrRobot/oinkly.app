/**
 * API para control por IA: lectura, contrato de acciones, parser y ejecutor.
 */

export { getFullState, getOverviewForAI, getSummaryText } from './aiContext';
export type { FullState, OverviewForAI } from './aiContext';

export { AI_ACTION_TYPES, AI_ACTION_PARAMS, isValidAIIntent } from './aiActions';

export { parseTextToAIAction, getMessageForActionResult } from './aiParser';

export { executeAIAction } from './aiExecutor';
export type { AIExecutorContext } from './aiExecutor';

export { interpretWithAI, isAIVoiceEnabled, getLastAIVoiceError } from './aiVoiceApi';
export type { InterpretVoiceContext } from './aiVoiceApi';

export type { AIAction, AIActionResult, AIIntent } from '../types/ai';
