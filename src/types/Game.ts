// src/types/Game.ts
export interface DifficultyDefinition {
  id: string;        // 識別子 (例: "EASY", "NORMAL", "MASTER"など)
  name: string;      // 表示名 (例: "かんたん", "ふつう", "むずかしい"など)
  color: string;     // 表示色 (例: "#43a047")
  order: number;     // 表示順序
  minLevel?: number; // 最小レベル (例: 1)
  maxLevel?: number; // 最大レベル (例: 15)
}

// Excelファイルの列マッピング情報
export interface GameExcelMapping {
  headerRow: number;
  dataStartRow: number;
  columnMapping: {
    songNo: number;
    name: number;
    implementationNo?: number;
    difficulties: Record<string, number>;
    combos: Record<string, number>;
    youtubeUrls: Record<string, number>;
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
  };
}

export interface Game {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  songCount: number;
  lastUpdated: Date;
  difficulties: DifficultyDefinition[];
  excelMapping?: GameExcelMapping; // 追加: Excel構造のマッピング情報
  minLevel?: number; // ゲーム全体の最小レベル
  maxLevel?: number; // ゲーム全体の最大レベル
}