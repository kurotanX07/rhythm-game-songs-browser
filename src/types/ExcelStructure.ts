// src/types/ExcelStructure.ts
export interface ColumnMapping {
  songNo: number;
  implementationNo?: number;
  name: number;
  difficulties: {
    [difficultyId: string]: number;  // 動的難易度に対応
  };
  combos: {
    [difficultyId: string]: number;  // 動的難易度に対応
  };
  youtubeUrls: {
    [difficultyId: string]: number;  // 動的難易度に対応
  };
  info: {
    artist?: number;
    lyricist?: number;
    composer?: number;
    arranger?: number;
    duration?: number;
    bpm?: number;
    addedDate?: number;
    tags?: number;
  };
}

export interface ExcelStructure {
  gameId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columnMapping: ColumnMapping;
}