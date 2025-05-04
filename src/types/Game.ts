// src/types/Game.ts
export interface DifficultyDefinition {
  id: string;        // 識別子 (例: "EASY", "NORMAL", "MASTER"など)
  name: string;      // 表示名 (例: "かんたん", "ふつう", "むずかしい"など)
  color: string;     // 表示色 (例: "#43a047")
  order: number;     // 表示順序
}

export interface Game {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  songCount: number;
  lastUpdated: Date;
  difficulties: DifficultyDefinition[]; // 追加：ゲームごとの難易度定義
}