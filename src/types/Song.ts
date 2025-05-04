export type DifficultyLevel = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT' | 'MASTER' | 'APPEND';

export interface DifficultyInfo {
  level: number | null;
  combo: number | null;
  youtubeUrl?: string;
}

export interface SongInfo {
  artist?: string;
  lyricist?: string;
  composer?: string;
  arranger?: string;
  duration?: string;
  bpm?: number;
  addedDate?: Date;
  tags?: string[];
}

export interface Song {
  id: string;
  gameId: string;
  songNo: number;
  implementationNo?: number;
  name: string;
  difficulties: Record<DifficultyLevel, DifficultyInfo>;
  info: SongInfo;
}