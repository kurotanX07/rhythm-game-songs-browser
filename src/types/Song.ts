// src/types/Song.ts
export interface DifficultyInfo {
  level: number | null;
  combo: number | null;
  youtubeUrl?: string | null;  // Changed to allow null
}

export interface SongInfo {
  artist?: string | null;
  lyricist?: string | null;
  composer?: string | null;
  arranger?: string | null;
  duration?: string | null;
  bpm?: number | null;  // Changed to allow null
  addedDate?: Date | null;  // Changed to allow null
  tags?: string[] | null;
}

// For backwards compatibility
export type DifficultyLevel = string;

export interface Song {
  id: string;
  gameId: string;
  songNo: number;
  implementationNo?: number | null;  // Allow null
  name: string;
  difficulties: {
    [difficultyId: string]: DifficultyInfo;
  };
  info: SongInfo;
}