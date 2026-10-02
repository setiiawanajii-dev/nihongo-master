import type { LearningDatabase } from '../repositories/contracts';
import { createIndexedDbDatabase } from '../infrastructure/database/repositories';

// Composition root. A future HTTP/backend adapter implements LearningDatabase here.
// Components depend only on the contract, never on IndexedDB APIs.
export const database: LearningDatabase = createIndexedDbDatabase();
