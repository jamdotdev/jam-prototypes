export interface Comment {
  id: string;
  userId: string;
  text: string;
  videoTime: number | null;
  timestamp: Date;
  editedAt: Date | null;
  reactions: Reaction[];
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}
