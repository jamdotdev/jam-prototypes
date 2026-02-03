export type ActivityType = 'jam_created' | 'integration' | 'status_change' | 'assignment';
export type IntegrationType = 'linear' | 'slack' | 'jira' | 'github' | 'asana';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  timestamp: Date;
  data: ActivityData;
}

export type ActivityData =
  | { kind: 'jam_created' }
  | { kind: 'integration'; integration: IntegrationType; issueId: string; issueUrl: string }
  | { kind: 'status_change'; from: string; to: string }
  | { kind: 'assignment'; assigneeId: string };
