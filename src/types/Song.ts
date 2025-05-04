// src/types/Song.ts
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

// For backwards compatibility
export type DifficultyLevel = string;

export interface Song {
  id: string;
  gameId: string;
  songNo: number;
  implementationNo?: number;
  name: string;
  difficulties: {
    [difficultyId: string]: DifficultyInfo;
  };
  info: SongInfo;
}