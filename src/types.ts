export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type ErrorType =
  | 'TypeError'
  | 'NetworkError'
  | 'ReferenceError'
  | 'SyntaxError'
  | 'RangeError'
  | 'AuthError'
  | 'DatabaseError'
  | 'UnhandledRejection'
  | 'Other';

export type Environment = 'production' | 'staging' | 'development';

export interface ErrorEvent {
  title: string;
  errorType: ErrorType;
  environment: Environment;
  stackTrace: string;
  culprit: string;       // e.g. "src/auth/session.ts in getUser"
  frequency: number;     // how many times this error has occurred
  affectedUsers: number;
  firstSeen: string;     // ISO date string
  lastSeen: string;      // ISO date string
  platform: string;      // e.g. "node", "javascript"
  tags: Record<string, string>;
}

export interface TriageResult {
  priority: Priority;
  errorType: ErrorType;
  summary: string;
  suggestedFix: string;
  isDuplicate: boolean;
  existingPageId?: string; // set if duplicate found
}
