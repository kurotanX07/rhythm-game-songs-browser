export interface ColumnMapping {
    songNo: number;
    implementationNo?: number;
    name: number;
    difficulties: {
      EASY?: number;
      NORMAL?: number;
      HARD?: number;
      EXPERT?: number;
      MASTER?: number;
      APPEND?: number;
    };
    combos: {
      EASY?: number;
      NORMAL?: number;
      HARD?: number;
      EXPERT?: number;
      MASTER?: number;
      APPEND?: number;
    };
    youtubeUrls: {
      EASY?: number;
      NORMAL?: number;
      HARD?: number;
      EXPERT?: number;
      MASTER?: number;
      APPEND?: number;
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