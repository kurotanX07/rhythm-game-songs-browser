import * as XLSX from 'xlsx';
import { Song, DifficultyLevel, DifficultyInfo, SongInfo } from '../types/Song';
import { ExcelStructure, ColumnMapping } from '../types/ExcelStructure';

/**
 * Excelファイルを解析して楽曲データを取得する
 */
export async function parseExcelFile(file: File, structure: ExcelStructure): Promise<Song[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('ファイル読み込みエラー');
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 指定されたシートを取得
        const sheetName = structure.sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          throw new Error(`シート "${sheetName}" が見つかりません`);
        }
        
        // JSONに変換
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          range: structure.headerRow,
          blankrows: false
        });
        
        // 楽曲データを作成
        const songs = createSongsFromExcel(jsonData, structure);
        resolve(songs);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイル読み込みエラー'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Excelデータから楽曲データを作成する
 */
function createSongsFromExcel(data: any[], structure: ExcelStructure): Song[] {
  const { columnMapping, dataStartRow } = structure;
  const startIndex = Math.max(0, dataStartRow - structure.headerRow - 1);
  
  return data.slice(startIndex).map((row, index) => {
    // 必須フィールドの確認
    const songNo = Number(row[getColumnName(columnMapping.songNo)]);
    const name = String(row[getColumnName(columnMapping.name)] || '');
    
    if (!name) {
      throw new Error(`行 ${index + dataStartRow}: 楽曲名が空です`);
    }
    
    // 難易度情報の取得
    const difficulties = getDifficultyInfo(row, columnMapping);
    
    // 楽曲情報の取得
    const info = getSongInfo(row, columnMapping);
    
    // 実装Noの取得（オプション）
    const implementationNo = columnMapping.implementationNo 
      ? Number(row[getColumnName(columnMapping.implementationNo)]) 
      : undefined;
    
    return {
      id: `${structure.gameId}_${songNo}`,
      gameId: structure.gameId,
      songNo,
      implementationNo,
      name,
      difficulties,
      info
    };
  });
}

/**
 * 列番号から列名（A, B, C, ...）を取得する
 */
function getColumnName(columnIndex: number): string {
  if (columnIndex < 0) {
    throw new Error('無効な列番号です');
  }
  
  // ExcelのデータをJSONに変換すると、列名はオブジェクトのキーになる
  // 0-based indexから列名（A, B, C, ...）を計算
  let columnName = '';
  let temp = columnIndex;
  
  while (temp >= 0) {
    columnName = String.fromCharCode(65 + (temp % 26)) + columnName;
    temp = Math.floor(temp / 26) - 1;
  }
  
  return columnName;
}

/**
 * 行データから難易度情報を取得する
 */
function getDifficultyInfo(row: any, mapping: ColumnMapping): Record<DifficultyLevel, DifficultyInfo> {
  const difficulties: Record<DifficultyLevel, DifficultyInfo> = {
    'EASY': { level: null, combo: null },
    'NORMAL': { level: null, combo: null },
    'HARD': { level: null, combo: null },
    'EXPERT': { level: null, combo: null },
    'MASTER': { level: null, combo: null },
    'APPEND': { level: null, combo: null }
  };
  
  const difficultyLevels: DifficultyLevel[] = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER', 'APPEND'];
  
  difficultyLevels.forEach(level => {
    // 難易度レベル
    if (mapping.difficulties[level] !== undefined) {
      const levelValue = row[getColumnName(mapping.difficulties[level] as number)];
      difficulties[level].level = levelValue !== undefined ? Number(levelValue) : null;
    }
    
    // コンボ数
    if (mapping.combos[level] !== undefined) {
      const comboValue = row[getColumnName(mapping.combos[level] as number)];
      difficulties[level].combo = comboValue !== undefined ? Number(comboValue) : null;
    }
    
    // YouTube URL
    if (mapping.youtubeUrls[level] !== undefined) {
      const urlValue = row[getColumnName(mapping.youtubeUrls[level] as number)];
      if (urlValue) {
        difficulties[level].youtubeUrl = String(urlValue);
      }
    }
  });
  
  return difficulties;
}

/**
 * 行データから楽曲情報を取得する
 */
function getSongInfo(row: any, mapping: ColumnMapping): SongInfo {
  const info: SongInfo = {};
  
  // アーティスト
  if (mapping.info.artist !== undefined) {
    const artist = row[getColumnName(mapping.info.artist)];
    if (artist) {
      info.artist = String(artist);
    }
  }
  
  // 作詞
  if (mapping.info.lyricist !== undefined) {
    const lyricist = row[getColumnName(mapping.info.lyricist)];
    if (lyricist) {
      info.lyricist = String(lyricist);
    }
  }
  
  // 作曲
  if (mapping.info.composer !== undefined) {
    const composer = row[getColumnName(mapping.info.composer)];
    if (composer) {
      info.composer = String(composer);
    }
  }
  
  // 編曲
  if (mapping.info.arranger !== undefined) {
    const arranger = row[getColumnName(mapping.info.arranger)];
    if (arranger) {
      info.arranger = String(arranger);
    }
  }
  
  // 時間
  if (mapping.info.duration !== undefined) {
    const duration = row[getColumnName(mapping.info.duration)];
    if (duration) {
      info.duration = String(duration);
    }
  }
  
  // BPM
  if (mapping.info.bpm !== undefined) {
    const bpm = row[getColumnName(mapping.info.bpm)];
    if (bpm !== undefined) {
      info.bpm = Number(bpm);
    }
  }
  
  // 追加日
  if (mapping.info.addedDate !== undefined) {
    const addedDate = row[getColumnName(mapping.info.addedDate)];
    if (addedDate) {
      // Excelの日付をJavaScriptのDateに変換
      if (typeof addedDate === 'number') {
        // Excel日付形式の場合（シリアル値）
        info.addedDate = new Date(Math.round((addedDate - 25569) * 86400 * 1000));
      } else {
        // 文字列の場合
        info.addedDate = new Date(String(addedDate));
      }
    }
  }
  
  // タグ
  if (mapping.info.tags !== undefined) {
    const tags = row[getColumnName(mapping.info.tags)];
    if (tags) {
      info.tags = String(tags).split(',').map(tag => tag.trim());
    }
  }
  
  return info;
}

/**
 * Excelファイルの構造を自動検出する
 */
export async function analyzeExcelStructure(file: File, gameId: string): Promise<ExcelStructure> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('ファイル読み込みエラー');
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // 最初のシートを使用
        const worksheet = workbook.Sheets[sheetName];
        
        // シートの範囲を取得
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // ヘッダー行を特定（先頭行と仮定）
        const headerRow = 0;
        
        // ヘッダー行のデータを取得
        const headers: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
          const cell = worksheet[cellAddress];
          headers.push(cell ? String(cell.v) : '');
        }
        
        // 列のマッピングを推測
        const columnMapping = guessColumnMapping(headers);
        
        // データ開始行は通常ヘッダーの次の行
        const dataStartRow = headerRow + 1;
        
        resolve({
          gameId,
          sheetName,
          headerRow,
          dataStartRow,
          columnMapping
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイル読み込みエラー'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * ヘッダー行から列のマッピングを推測する
 */
function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    songNo: -1,
    name: -1,
    difficulties: {},
    combos: {},
    youtubeUrls: {},
    info: {}
  };
  
  // ヘッダーを正規化して検索しやすくする
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // 基本情報の検索
  mapping.songNo = findColumnIndex(normalizedHeaders, ['no', 'no.', 'song no', 'song no.', '楽曲no', '楽曲no.', '曲no', '曲no.']);
  mapping.implementationNo = findColumnIndex(normalizedHeaders, ['implementation no', 'implementation no.', '実装no', '実装no.', 'impl no', 'impl no.']);
  mapping.name = findColumnIndex(normalizedHeaders, ['name', 'song name', 'title', 'song title', '楽曲名', '曲名', 'タイトル']);
  
  // 難易度レベル
  mapping.difficulties.EASY = findColumnIndex(normalizedHeaders, ['easy', 'easy level', 'easy difficulty', 'e level', 'e難易度']);
  mapping.difficulties.NORMAL = findColumnIndex(normalizedHeaders, ['normal', 'normal level', 'normal difficulty', 'n level', 'n難易度']);
  mapping.difficulties.HARD = findColumnIndex(normalizedHeaders, ['hard', 'hard level', 'hard difficulty', 'h level', 'h難易度']);
  mapping.difficulties.EXPERT = findColumnIndex(normalizedHeaders, ['expert', 'expert level', 'expert difficulty', 'ex level', 'ex難易度']);
  mapping.difficulties.MASTER = findColumnIndex(normalizedHeaders, ['master', 'master level', 'master difficulty', 'm level', 'm難易度']);
  mapping.difficulties.APPEND = findColumnIndex(normalizedHeaders, ['append', 'append level', 'append difficulty', 'a level', 'a難易度', 'special', 'special level']);
  
  // コンボ数
  mapping.combos.EASY = findColumnIndex(normalizedHeaders, ['easy combo', 'e combo', 'easy notes', 'e notes', 'easyコンボ', 'eコンボ']);
  mapping.combos.NORMAL = findColumnIndex(normalizedHeaders, ['normal combo', 'n combo', 'normal notes', 'n notes', 'normalコンボ', 'nコンボ']);
  mapping.combos.HARD = findColumnIndex(normalizedHeaders, ['hard combo', 'h combo', 'hard notes', 'h notes', 'hardコンボ', 'hコンボ']);
  mapping.combos.EXPERT = findColumnIndex(normalizedHeaders, ['expert combo', 'ex combo', 'expert notes', 'ex notes', 'expertコンボ', 'exコンボ']);
  mapping.combos.MASTER = findColumnIndex(normalizedHeaders, ['master combo', 'm combo', 'master notes', 'm notes', 'masterコンボ', 'mコンボ']);
  mapping.combos.APPEND = findColumnIndex(normalizedHeaders, ['append combo', 'a combo', 'append notes', 'a notes', 'appendコンボ', 'aコンボ', 'special combo']);
  
  // YouTube URL
  mapping.youtubeUrls.EASY = findColumnIndex(normalizedHeaders, ['easy url', 'easy youtube', 'e url', 'e youtube', 'easy link', 'easyリンク', 'e link']);
  mapping.youtubeUrls.NORMAL = findColumnIndex(normalizedHeaders, ['normal url', 'normal youtube', 'n url', 'n youtube', 'normal link', 'normalリンク', 'n link']);
  mapping.youtubeUrls.HARD = findColumnIndex(normalizedHeaders, ['hard url', 'hard youtube', 'h url', 'h youtube', 'hard link', 'hardリンク', 'h link']);
  mapping.youtubeUrls.EXPERT = findColumnIndex(normalizedHeaders, ['expert url', 'expert youtube', 'ex url', 'ex youtube', 'expert link', 'expertリンク', 'ex link']);
  mapping.youtubeUrls.MASTER = findColumnIndex(normalizedHeaders, ['master url', 'master youtube', 'm url', 'm youtube', 'master link', 'masterリンク', 'm link']);
  mapping.youtubeUrls.APPEND = findColumnIndex(normalizedHeaders, ['append url', 'append youtube', 'a url', 'a youtube', 'append link', 'appendリンク', 'a link', 'special url']);
  
  // 楽曲情報
  mapping.info.artist = findColumnIndex(normalizedHeaders, ['artist', 'vocal', 'singer', 'unit', 'アーティスト', '歌手', 'ボーカル', 'ユニット']);
  mapping.info.lyricist = findColumnIndex(normalizedHeaders, ['lyricist', 'lyrics', 'lyrics by', '作詞', '作詞者']);
  mapping.info.composer = findColumnIndex(normalizedHeaders, ['composer', 'composition', 'composed by', '作曲', '作曲者']);
  mapping.info.arranger = findColumnIndex(normalizedHeaders, ['arranger', 'arrangement', 'arranged by', '編曲', '編曲者']);
  mapping.info.duration = findColumnIndex(normalizedHeaders, ['duration', 'length', 'time', '時間', '長さ']);
  mapping.info.bpm = findColumnIndex(normalizedHeaders, ['bpm', 'tempo', 'テンポ']);
  mapping.info.addedDate = findColumnIndex(normalizedHeaders, ['added date', 'release date', 'date', '追加日', '実装日', '日付']);
  mapping.info.tags = findColumnIndex(normalizedHeaders, ['tags', 'genre', 'category', 'タグ', 'ジャンル', 'カテゴリ']);
  
  return mapping;
}

/**
 * ヘッダー配列から指定したキーワードに一致する列のインデックスを検索
 */
function findColumnIndex(headers: string[], keywords: string[]): number {
  for (const keyword of keywords) {
    const index = headers.findIndex(h => h.includes(keyword));
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

/**
 * 列マッピングを手動で更新する
 */
export function updateColumnMapping(
    structure: ExcelStructure, 
    field: string, 
    subField: string | null,
    columnIndex: number
  ): ExcelStructure {
    const newStructure = { ...structure };
    const newMapping = { ...structure.columnMapping };
    
    if (subField === null) {
      // Main fields (songNo, name, implementationNo)
      if (field === 'songNo' || field === 'name' || field === 'implementationNo') {
        (newMapping as any)[field] = columnIndex;
      }
    } else {
      // Sub-fields (difficulties, combos, youtubeUrls, info)
      if (field === 'difficulties' || field === 'combos' || field === 'youtubeUrls' || field === 'info') {
        const subFieldObj = { ...(newMapping[field as keyof ColumnMapping] as any) };
        subFieldObj[subField] = columnIndex;
        (newMapping as any)[field] = subFieldObj;
      }
    }
    
    newStructure.columnMapping = newMapping;
    return newStructure;
  }