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

// 新規追加: カスタムフィールド定義
export interface CustomField {
  columnIndex: number;
  displayName: string;
  originalColumnName: string;
  visible: boolean;
  adminOnly: boolean; // 管理者のみ表示
  dataType: 'string' | 'number' | 'date' | 'url' | 'boolean';
  order: number;
}

// 新規追加: 柔軟な列マッピング
export interface FlexibleColumnMapping extends ColumnMapping {
  // カスタムフィールドのサポート
  customFields?: {
    [fieldId: string]: CustomField;
  };
}

// 新規追加: 表示設定
export interface DisplaySettings {
  [fieldName: string]: {
    visible: boolean;
    order: number;
    label: string;
    adminOnly?: boolean; // 管理者のみ表示
  };
}

// 新規追加: 列の自動検出結果
export interface DetectedColumn {
  suggestedField: string;
  confidence: number;
  sampleData: any[];
  headerName: string;
  isCustomField?: boolean; // カスタムフィールドかどうか
}

export interface ExcelStructure {
  gameId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columnMapping: ColumnMapping;
}

// 新規追加: 拡張されたExcel構造
export interface EnhancedExcelStructure extends ExcelStructure {
  columnMapping: FlexibleColumnMapping;
  // 自動検出された列の候補
  detectedColumns: {
    [columnIndex: number]: DetectedColumn;
  };
  // ユーザーによる手動マッピング
  userMappings: {
    [columnIndex: number]: string | null;
  };
  // 表示設定
  displaySettings: DisplaySettings;
}

// 新規追加: アップロードプリセット
export interface UploadPreset {
  id: string;
  name: string;
  gameId: string;
  description: string;
  columnMappings: FlexibleColumnMapping;
  displaySettings: DisplaySettings;
  createdAt: Date;
  lastUsed: Date;
}