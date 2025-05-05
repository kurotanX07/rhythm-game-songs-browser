// src/services/excelParser.ts - Modified to handle large files
import * as XLSX from 'xlsx';
import { Song, DifficultyLevel, DifficultyInfo, SongInfo } from '../types/Song';
import { ExcelStructure, ColumnMapping } from '../types/ExcelStructure';
import { Game } from '../types/Game';

// Maximum number of rows to analyze for structure detection
const MAX_ANALYSIS_ROWS = 20;

/**
 * Excelファイルを解析して楽曲データを取得する - 最適化版
 * Large file support: only processes a limited number of rows at a time
 */
export async function parseExcelFile(file: File, structure: ExcelStructure, game: Game): Promise<Song[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('ファイル読み込みエラー');
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        
        // アドバンストオプション設定
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: true,
          raw: false
        });
        
        // 指定されたシートを取得
        const sheetName = structure.sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          throw new Error(`シート "${sheetName}" が見つかりません`);
        }
        
        // デバッグ: シート構造の詳細を出力
        console.log('Sheet Structure:', {
          ref: worksheet['!ref'],
          range: XLSX.utils.decode_range(worksheet['!ref'] || 'A1'),
          headerRow: structure.headerRow,
          dataStartRow: structure.dataStartRow
        });
        
        // Get the sheet range
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // Calculate total row count (for progress reporting)
        const totalRows = range.e.r - structure.dataStartRow + 1;
        
        // Limit analysis to first few rows if the file is very large
        const isLargeFile = totalRows > 1000;
        
        if (isLargeFile) {
          console.log(`Large file detected (${totalRows} rows). Optimizing parsing process.`);
        }
        
        // Process header row
        const headerRowData = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r: structure.headerRow, c });
          const cell = worksheet[cellAddress];
          headerRowData.push(cell ? String(cell.v) : null);
        }
        console.log('Header Row Raw Data:', headerRowData);
        
        // Process in chunks for large files
        const chunkSize = isLargeFile ? 200 : totalRows;
        const songs: Song[] = [];
        
        // Only process the first chunk for structure analysis
        const endRow = Math.min(range.e.r, structure.dataStartRow + chunkSize - 1);
        const analysisRange = { 
          s: { r: structure.headerRow, c: range.s.c },
          e: { r: endRow, c: range.e.c }
        };
        
        // Convert only the necessary portion to JSON
        const rangeStr = XLSX.utils.encode_range(analysisRange);
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          range: rangeStr,
          header: 1,  // 数値インデックスを使用
          blankrows: false,
          defval: null
        });
        
        // Log the first few rows for debugging
        const firstRows = jsonData.slice(
          structure.dataStartRow - structure.headerRow, 
          structure.dataStartRow - structure.headerRow + 2
        );
        console.log('First 2 rows raw data:', firstRows);
        
        // Adjust column mapping based on sample data
        const sampleRow = firstRows.length > 0 ? firstRows[0] as any[] : undefined;
        const adjustedMapping = adjustColumnOffset(structure.columnMapping, sampleRow);
        
        // Log adjusted mapping
        console.log('Original Column Mapping:', structure.columnMapping);
        console.log('Adjusted Column Mapping:', adjustedMapping);
        
        // Create a modified structure with adjusted mapping
        const adjustedStructure = {
          ...structure,
          columnMapping: adjustedMapping
        };
        
        // Process the data to create songs
        const processedSongs = createSongsFromExcel(
          jsonData as any[][], 
          adjustedStructure, 
          game
        );
        
        console.log(`Processed ${processedSongs.length} songs from Excel file`);
        
        resolve(processedSongs);
      } catch (error) {
        console.error('Excel parse error:', error);
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
 * Excelファイルの最初の行のみを解析して構造を決定する - 最適化版
 * This function only analyzes the header row and a few sample rows
 */
export async function analyzeExcelFirstRow(file: File, gameId: string, game: Game): Promise<ExcelStructure> {
  return analyzeExcelStructure(file, gameId, game, true);
}

/**
 * Excelファイルの構造を自動検出する - 最適化版
 * Only analyzes the first few rows for better performance with large files
 */
export async function analyzeExcelStructure(
  file: File, 
  gameId: string, 
  game: Game, 
  firstRowOnly: boolean = false
): Promise<ExcelStructure> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('ファイル読み込みエラー');
        }
        
        // Check file size and warn if it's very large
        const fileSize = file.size / (1024 * 1024); // Size in MB
        if (fileSize > 10) {
          console.warn(`Large Excel file detected (${fileSize.toFixed(2)} MB). Only analyzing header structure.`);
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: true
        });
        
        // シート情報をログ出力
        console.log("利用可能なシート名:", workbook.SheetNames);
        
        // シート名を決定（指定がなければ最初のシート）
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // シートの範囲を取得
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        console.log("シート範囲:", range);
        
        // firstRowOnlyがtrueの場合、最初の行をヘッダー行として使用
        let headerRow = 0;
        
        if (!firstRowOnly) {
          // ヘッダー行の検出（空でない行を探す）- only check first 10 rows max
          const maxHeaderSearchRows = Math.min(range.e.r, 10);
          for (let r = range.s.r; r <= maxHeaderSearchRows; r++) {
            let hasContent = false;
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cellAddress = XLSX.utils.encode_cell({ r, c });
              if (worksheet[cellAddress] && worksheet[cellAddress].v) {
                hasContent = true;
                break;
              }
            }
            if (hasContent) {
              headerRow = r;
              break;
            }
          }
        }
        
        // ヘッダー行のデータを取得
        const headers: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
          const cell = worksheet[cellAddress];
          // セルが存在し、値がある場合のみ追加
          headers.push(cell && cell.v ? String(cell.v).trim() : '');
        }
        
        console.log("検出されたヘッダー:", headers);
        
        // データ開始行を検出（ヘッダー行の次の空でない行）
        // firstRowOnlyの場合はヘッダー行の次の行を使用
        let dataStartRow = headerRow + 1;
        
        if (!firstRowOnly) {
          let foundData = false;
          
          // Only check a limited number of rows after header
          const maxDataSearchRows = Math.min(range.e.r, headerRow + 10);
          
          for (let r = headerRow + 1; r <= maxDataSearchRows; r++) {
            let contentCells = 0;
            
            // 少なくとも2つのセルに内容があるかチェック
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cellAddress = XLSX.utils.encode_cell({ r, c });
              if (worksheet[cellAddress] && worksheet[cellAddress].v !== undefined) {
                contentCells++;
                if (contentCells >= 2) {
                  foundData = true;
                  dataStartRow = r;
                  break;
                }
              }
            }
            
            if (foundData) break;
          }
          
          if (!foundData) {
            // データが見つからない場合はヘッダーの次の行をデータ開始行とする
            dataStartRow = headerRow + 1;
          }
        }
        
        // デバッグ情報出力
        console.log("ゲーム難易度設定:", game.difficulties);
        console.log("ヘッダー行:", headerRow + 1); // ユーザー可読性向上のため1から始まる番号
        console.log("データ開始行:", dataStartRow + 1); // 同上
        
        // 列のマッピングを推測（ゲーム定義の難易度を使用）
        const columnMapping = gameBasedColumnMapping(headers, game);
        
        // 列マッピング結果を出力
        console.log("列マッピング結果:", columnMapping);
        
        // サンプルデータ行は限定的に読み込む
        if (!firstRowOnly) {
          const sampleRowCount = Math.min(3, range.e.r - dataStartRow + 1);
          if (sampleRowCount > 0) {
            const sampleRows = [];
            for (let r = dataStartRow; r < dataStartRow + sampleRowCount; r++) {
              const sampleRow = [];
              for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r, c });
                const cell = worksheet[cellAddress];
                sampleRow.push(cell ? cell.v : null);
              }
              sampleRows.push(sampleRow);
            }
            
            console.log('サンプルデータ行:', sampleRows);
          }
        }
        
        resolve({
          gameId,
          sheetName,
          headerRow,
          dataStartRow,
          columnMapping
        });
      } catch (error) {
        console.error('Excel解析エラー:', error);
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
 * 列マッピングのオフセットを調整
 * 動的にオフセットを検出して修正
 */
function adjustColumnOffset(mapping: ColumnMapping, row?: any[] | undefined): ColumnMapping {
  // 深いコピーを作成
  const adjusted = JSON.parse(JSON.stringify(mapping)) as ColumnMapping;
  
  // If no sample row is provided, use a fixed offset of 0 (no adjustment)
  // This is a safer default than assuming a fixed offset
  let offset = 0;
  
  // 検証用にログを出力
  console.log('Original Column Mapping:', JSON.stringify(mapping, null, 2));
  
  // If a sample row is provided, try to detect if the offset is needed
  if (row && row.length > 0) {
    // Check if the detected column for songNo has the expected data type
    if (mapping.songNo >= 0 && mapping.songNo < row.length) {
      const songNoValue = row[mapping.songNo];
      // If the value at songNo column is not a number or numeric string,
      // try to find a better match by checking nearby columns
      if (songNoValue !== null && songNoValue !== undefined) {
        if (typeof songNoValue !== 'number' && 
            !/^\d+$/.test(String(songNoValue).trim())) {
          
          // Try columns near the detected songNo column
          for (let i = -2; i <= 2; i++) {
            const testCol = mapping.songNo + i;
            if (testCol >= 0 && testCol < row.length) {
              const testValue = row[testCol];
              if (testValue !== null && testValue !== undefined &&
                  (typeof testValue === 'number' || /^\d+$/.test(String(testValue).trim()))) {
                // Found a better column for songNo - calculate the offset
                offset = i;
                console.log(`Detected column offset: ${offset} based on songNo field`);
                break;
              }
            }
          }
        }
      }
    }
    
    // Also check the name column as a backup
    if (offset === 0 && mapping.name >= 0 && mapping.name < row.length) {
      const nameValue = row[mapping.name];
      // If the value at name column doesn't look like a name (empty or too short),
      // try to find a better match
      if (!nameValue || 
          (typeof nameValue === 'string' && nameValue.trim().length < 2)) {
        
        // Try columns near the detected name column
        for (let i = -2; i <= 2; i++) {
          const testCol = mapping.name + i;
          if (testCol >= 0 && testCol < row.length) {
            const testValue = row[testCol];
            if (testValue && 
                typeof testValue === 'string' && 
                testValue.trim().length >= 2) {
              // Found a better column for name - calculate the offset
              offset = i;
              console.log(`Detected column offset: ${offset} based on name field`);
              break;
            }
          }
        }
      }
    }
  }
  
  console.log(`Using column offset: ${offset}`);
  
  // 基本フィールドの調整
  if (adjusted.songNo >= 0) {
    adjusted.songNo = Math.max(0, adjusted.songNo + offset);
  }
  
  if (adjusted.name >= 0) {
    adjusted.name = Math.max(0, adjusted.name + offset);
  }
  
  if (adjusted.implementationNo !== undefined && adjusted.implementationNo >= 0) {
    adjusted.implementationNo = Math.max(0, adjusted.implementationNo + offset);
  }
  
  // 難易度のマッピング調整
  Object.keys(adjusted.difficulties).forEach(diff => {
    if (adjusted.difficulties[diff] >= 0) {
      adjusted.difficulties[diff] = Math.max(0, adjusted.difficulties[diff] + offset);
    }
  });
  
  // コンボ数のマッピング調整
  Object.keys(adjusted.combos).forEach(diff => {
    if (adjusted.combos[diff] >= 0) {
      adjusted.combos[diff] = Math.max(0, adjusted.combos[diff] + offset);
    }
  });
  
  // YouTube URLのマッピング調整
  Object.keys(adjusted.youtubeUrls).forEach(diff => {
    if (adjusted.youtubeUrls[diff] >= 0) {
      adjusted.youtubeUrls[diff] = Math.max(0, adjusted.youtubeUrls[diff] + offset);
    }
  });
  
  // 楽曲情報のマッピング調整
  Object.keys(adjusted.info).forEach(key => {
    const value = adjusted.info[key as keyof typeof adjusted.info];
    if (value !== undefined && value >= 0) {
      adjusted.info[key as keyof typeof adjusted.info] = Math.max(0, value + offset) as any;
    }
  });
  
  console.log('Adjusted Column Mapping:', JSON.stringify(adjusted, null, 2));
  
  return adjusted;
}

/**
 * Excelデータから楽曲データを作成する 
 */
function createSongsFromExcel(data: any[][], structure: ExcelStructure, game: Game): Song[] {
  const { columnMapping, dataStartRow, headerRow } = structure;
  const startIndex = Math.max(0, dataStartRow - headerRow - 1);
  
  return data.slice(startIndex).map((row, index) => {
    try {
      // Song No の読み取りを強化
      let songNo: number;
      if (row[columnMapping.songNo] !== undefined) {
        // 様々な形式の入力を許容
        const rawValue = row[columnMapping.songNo];
        if (typeof rawValue === 'number') {
          songNo = rawValue;
        } else if (typeof rawValue === 'string') {
          // 数字だけを抽出して変換を試みる
          const numericPart = rawValue.replace(/[^\d]/g, '');
          if (numericPart) {
            songNo = parseInt(numericPart, 10);
          } else {
            // 数字がない場合はインデックスを使用
            songNo = index + 1;
          }
        } else {
          // それ以外の場合はインデックスを使用
          songNo = index + 1;
        }
      } else {
        // カラムが見つからない場合はインデックスを使用
        songNo = index + 1;
      }
      
      // 楽曲名の読み取りを強化
      let name = '';
      if (columnMapping.name >= 0 && columnMapping.name < row.length) {
        const rawName = row[columnMapping.name];
        if (rawName !== null && rawName !== undefined && String(rawName).trim() !== '') {
          name = String(rawName).trim();
        } else if (index === 0) {
          // 最初の行がヘッダーの可能性がある場合は、次の行を見る
          name = `サンプル曲${index + 1}`;
          console.log(`行 ${index + dataStartRow}: ヘッダー行と判断し、仮の曲名を設定: ${name}`);
        } else {
          // データがない場合はデフォルト値
          name = `サンプル曲${index + 1}`;
          console.log(`行 ${index + dataStartRow}: 楽曲名が空のため自動生成: ${name}`);
        }
      } else {
        // 列が見つからない場合はデフォルト値
        name = `サンプル曲${index + 1}`;
        console.log(`行 ${index + dataStartRow}: 楽曲名の列が見つかりません。デフォルト値を使用: ${name}`);
      }
      
      if (!name) {
        throw new Error(`行 ${index + dataStartRow}: 楽曲名が空です`);
      }
      
      // 実装番号の読み取りを強化
      let implementationNo: number | undefined = undefined;
      if (columnMapping.implementationNo !== undefined && 
          columnMapping.implementationNo >= 0 && 
          columnMapping.implementationNo < row.length) {
        const rawImplNo = row[columnMapping.implementationNo];
        if (rawImplNo !== null && rawImplNo !== undefined && rawImplNo !== '') {
          if (typeof rawImplNo === 'number') {
            implementationNo = rawImplNo;
          } else {
            // 文字列から数値への変換を試みる
            const parsed = parseInt(String(rawImplNo).replace(/[^\d]/g, ''), 10);
            if (!isNaN(parsed)) {
              implementationNo = parsed;
            }
          }
        }
      }
      
      // 難易度情報の取得 - ゲーム定義の難易度を使用
      const difficulties = getDifficultyInfoFromArray(row, columnMapping, game);
      
      // 楽曲情報の取得
      const info = getSongInfoFromArray(row, columnMapping);
      
      // Only log debug info for first few songs to avoid console flood
      if (index < 2) {
        console.log(`Song ${songNo}: "${name}" parsed successfully`);
      }
      
      return {
        id: `${structure.gameId}_${songNo}`,
        gameId: structure.gameId,
        songNo,
        implementationNo,
        name,
        difficulties,
        info
      };
    } catch (error) {
      // コンテキスト付きのエラー
      if (error instanceof Error) {
        console.error(`Song parsing error: ${error.message}`, {
          rowIndex: index + dataStartRow,
          rowData: row
        });
        throw new Error(`${error.message} (データ行: ${index + dataStartRow + 1})`);
      }
      throw error;
    }
  });
}

/**
 * 行データから難易度情報を取得する - ゲーム定義の難易度を使用
 */
function getDifficultyInfoFromArray(row: any[], mapping: ColumnMapping, game: Game): Record<DifficultyLevel, DifficultyInfo> {
  // 初期化: 空の難易度マップを作成
  const difficulties: Record<DifficultyLevel, DifficultyInfo> = {};
  
  // ゲームに定義されている難易度を使用
  game.difficulties.forEach(diffDef => {
    const diffId = diffDef.id;
    difficulties[diffId] = { level: null, combo: null };
    
    // 難易度レベル
    if (mapping.difficulties[diffId] !== undefined && mapping.difficulties[diffId] >= 0) {
      const levelIndex = mapping.difficulties[diffId] as number;
      if (levelIndex < row.length) {
        const levelValue = row[levelIndex];
        if (levelValue !== null && levelValue !== undefined && levelValue !== '') {
          // 数値変換の強化
          if (typeof levelValue === 'number') {
            difficulties[diffId].level = levelValue;
          } else {
            // 文字列から数値への変換を試みる - 数字以外の文字を削除
            const parsed = parseInt(String(levelValue).replace(/[^\d.]/g, ''), 10);
            if (!isNaN(parsed)) {
              difficulties[diffId].level = parsed;
            }
          }
        }
      }
    }
    
    // コンボ数
    if (mapping.combos[diffId] !== undefined && mapping.combos[diffId] >= 0) {
      const comboIndex = mapping.combos[diffId] as number;
      if (comboIndex < row.length) {
        const comboValue = row[comboIndex];
        if (comboValue !== null && comboValue !== undefined && comboValue !== '') {
          // 数値変換の強化
          if (typeof comboValue === 'number') {
            difficulties[diffId].combo = comboValue;
          } else {
            // 文字列から数値への変換を試みる - 数字以外の文字を削除
            const parsed = parseInt(String(comboValue).replace(/[^\d]/g, ''), 10);
            if (!isNaN(parsed)) {
              difficulties[diffId].combo = parsed;
            }
          }
        }
      }
    }
    
    // YouTube URL - 特に重点的に処理
    if (mapping.youtubeUrls[diffId] !== undefined && mapping.youtubeUrls[diffId] >= 0) {
      const urlIndex = mapping.youtubeUrls[diffId] as number;
      if (urlIndex < row.length) {
        const urlValue = row[urlIndex];
        if (urlValue !== null && urlValue !== undefined && urlValue !== '') {
          const urlStr = String(urlValue).trim();
          
          // YouTube URL形式のバリデーション
          const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
          
          if (youtubeRegex.test(urlStr)) {
            difficulties[diffId].youtubeUrl = urlStr;
          } else if (urlStr.length === 11 && /^[A-Za-z0-9_-]{11}$/.test(urlStr)) {
            // YouTube動画IDのみの場合はURLに変換
            difficulties[diffId].youtubeUrl = `https://www.youtube.com/watch?v=${urlStr}`;
          } else if (urlStr.toLowerCase().includes('youtube') || urlStr.toLowerCase().includes('youtu.be')) {
            // 不完全なYouTube URLの場合もそのまま保存
            difficulties[diffId].youtubeUrl = urlStr;
          }
        }
      }
    }
  });
  
  return difficulties;
}

/**
 * 行データから楽曲情報を取得する
 */
function getSongInfoFromArray(row: any[], mapping: ColumnMapping): SongInfo {
  const info: SongInfo = {};
  
  // アーティスト
  if (mapping.info.artist !== undefined && mapping.info.artist >= 0 && mapping.info.artist < row.length) {
    const artist = row[mapping.info.artist];
    if (artist) {
      info.artist = String(artist);
    }
  }
  
  // 作詞
  if (mapping.info.lyricist !== undefined && mapping.info.lyricist >= 0 && mapping.info.lyricist < row.length) {
    const lyricist = row[mapping.info.lyricist];
    if (lyricist) {
      info.lyricist = String(lyricist);
    }
  }
  
  // 作曲
  if (mapping.info.composer !== undefined && mapping.info.composer >= 0 && mapping.info.composer < row.length) {
    const composer = row[mapping.info.composer];
    if (composer) {
      info.composer = String(composer);
    }
  }
  
  // 編曲
  if (mapping.info.arranger !== undefined && mapping.info.arranger >= 0 && mapping.info.arranger < row.length) {
    const arranger = row[mapping.info.arranger];
    if (arranger) {
      info.arranger = String(arranger);
    }
  }
  
  // 時間
  if (mapping.info.duration !== undefined && mapping.info.duration >= 0 && mapping.info.duration < row.length) {
    const duration = row[mapping.info.duration];
    if (duration) {
      info.duration = String(duration);
    }
  }
  
  // BPM
  if (mapping.info.bpm !== undefined && mapping.info.bpm >= 0 && mapping.info.bpm < row.length) {
    const bpm = row[mapping.info.bpm];
    if (bpm !== undefined) {
      // BPM値が数値でない場合はパースを試みる
      const parsedBpm = Number(bpm);
      info.bpm = !isNaN(parsedBpm) ? parsedBpm : null;
    }
  }
  
  // 追加日
  if (mapping.info.addedDate !== undefined && mapping.info.addedDate >= 0 && mapping.info.addedDate < row.length) {
    const addedDate = row[mapping.info.addedDate];
    if (addedDate) {
      try {
        // If it's a date object
        if (addedDate instanceof Date) {
          info.addedDate = addedDate;
        }
        // If it's a number (Excel date serial)
        else if (typeof addedDate === 'number') {
          // Excel uses serial numbers starting from 1/1/1900
          const date = new Date(Math.round((addedDate - 25569) * 86400 * 1000));
          
          // Validate the date is reasonable
          const currentYear = new Date().getFullYear();
          if (date.getFullYear() >= 1990 && date.getFullYear() <= currentYear + 1) {
            info.addedDate = date;
          } else {
            info.addedDate = null;
          }
        }
        // If it's a string, try to parse it
        else {
          const dateStr = String(addedDate).trim();
          
          // Already in YYYY/MM/DD format
          if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            info.addedDate = new Date(dateStr);
          }
          // YYYY-MM-DD format
          else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            info.addedDate = new Date(dateStr.replace(/-/g, '/'));
          }
          // DD/MM/YYYY format
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const parts = dateStr.split('/');
            info.addedDate = new Date(`${parts[2]}/${parts[1]}/${parts[0]}`);
          }
          // Japanese format YYYY年MM月DD日
          else if (/^(\d{4})年(\d{1,2})月(\d{1,2})日$/.test(dateStr)) {
            const matches = dateStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
            if (matches && matches.length === 4) {
              info.addedDate = new Date(Number(matches[1]), Number(matches[2]) - 1, Number(matches[3]));
            }
          }
          // Other formats - try standard Date parsing
          else {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              info.addedDate = date;
            } else {
              info.addedDate = null;
            }
          }
        }
      } catch (error) {
        console.error('Date parsing error:', error, 'Value was:', addedDate);
        info.addedDate = null;
      }
    }
  }
  
  // タグ
  if (mapping.info.tags !== undefined && mapping.info.tags >= 0 && mapping.info.tags < row.length) {
    const tags = row[mapping.info.tags];
    if (tags) {
      // Ensure we have a string before splitting
      info.tags = String(tags).split(',').map(tag => tag.trim());
    }
  }
  
  return info;
}

/**
 * 完全にゲーム定義に基づいた列マッピング
 * これは完全に各ゲームの難易度定義に基づいて動作する改良版
 */
function gameBasedColumnMapping(headers: string[], game: Game): ColumnMapping {
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
  
  // デバッグ出力 - 実際のヘッダーとその位置
  normalizedHeaders.forEach((header, index) => {
    if (header) { // 空でない場合のみ表示
      console.log(`カラム ${index+1}: "${header}" (元の値: "${headers[index]}")`);
    }
  });
  
  // 基本情報のキーワード
  const baseFieldKeywords = {
    songNo: ['no', 'no.', 'song no', 'song no.', '楽曲no', '楽曲no.', '曲no', '曲no.',
             '番号', 'ナンバー', 'id', 'track', 'track no', '曲番号', '曲id'],
    implementationNo: ['implementation no', 'implementation no.', '実装no', '実装no.', 'impl no', 'impl no.',
                      '実装日', '実装順', '実装番号', 'release no', 'release number', 'リリース', 'release'],
    name: ['name', 'song name', 'title', 'song title', '楽曲名', '曲名', 'タイトル',
           '名前', '名称', 'track name', '楽曲', '曲']
  };
  
  // 基本情報の検出
  for (const [field, keywords] of Object.entries(baseFieldKeywords)) {
    const index = findColumnIndex(normalizedHeaders, keywords);
    if (field === 'songNo') mapping.songNo = index;
    else if (field === 'implementationNo') mapping.implementationNo = index;
    else if (field === 'name') mapping.name = index;
  }
  
  // 各難易度の検出用キーワードを動的に生成
  game.difficulties.forEach(diff => {
    const diffId = diff.id;
    const diffName = diff.name;
    const lowerDiffId = diffId.toLowerCase();
    const lowerDiffName = diffName.toLowerCase();
    
    // 難易度名のバリエーションを生成
    let variants = [lowerDiffId, lowerDiffName];
    
    // 日本語の一般的な難易度表現を追加 - 既にゲーム定義にある場合はスキップ
    const commonJapaneseNames: { [key: string]: string[] } = {
      'easy': ['かんたん', '簡単', 'イージー'],
      'normal': ['ふつう', '普通', 'ノーマル'],
      'hard': ['むずかしい', '難しい', 'ハード'],
      'expert': ['おに', '鬼', 'エキスパート', 'エクスパート'],
      'master': ['マスター', 'マスタ'],
      'special': ['スペシャル', 'スペシャル', '特殊', '特別']
    };
    
    // 難易度名の小文字版をキーとしてチェック
    Object.entries(commonJapaneseNames).forEach(([key, values]) => {
      if (lowerDiffId.includes(key) || lowerDiffName.includes(key)) {
        variants = [...variants, ...values];
      }
    });
    
    // 難易度の頭文字や略称を追加
    if (diffId.length > 1) {
      variants.push(diffId.charAt(0).toLowerCase());
      if (diffId.length > 2) {
        variants.push(diffId.toLowerCase().substring(0, 2));
        variants.push(diffId.toLowerCase().substring(0, 3));
      }
    }
    
    // 難易度項目ごとに対応する列を検出
    
    // レベル列
    const levelKeywords = variants.flatMap(v => [
      v,
      `${v} level`, `${v}level`,
      `${v} lv`, `${v}lv`,
      `${v}レベル`, `${v} レベル`,
      `${v}難易度`, `${v} 難易度`
    ]);
    
    mapping.difficulties[diffId] = findColumnIndex(normalizedHeaders, levelKeywords);
    
    // コンボ数列
    const comboKeywords = variants.flatMap(v => [
      `${v} combo`, `${v}combo`,
      `${v} notes`, `${v}notes`,
      `${v}コンボ`, `${v} コンボ`,
      `${v}ノーツ`, `${v} ノーツ`,
      `${v}ノート`, `${v} ノート`
    ]);
    
    mapping.combos[diffId] = findColumnIndex(normalizedHeaders, comboKeywords);
    
    // YouTube URL列
    const youtubeKeywords = variants.flatMap(v => [
      `${v} url`, `${v}url`,
      `${v} youtube`, `${v}youtube`,
      `${v} link`, `${v}link`,
      `${v}リンク`, `${v} リンク`,
      `${v} yt`, `${v}yt`
    ]);
    
    mapping.youtubeUrls[diffId] = findColumnIndex(normalizedHeaders, youtubeKeywords);
  });
  
  // 未検出の難易度列のフォールバック処理
  // これはヘッダーからその他のパターンもチェックする
  if (Object.values(mapping.difficulties).every(v => v === -1)) {
    console.log("標準マッピングで難易度列が検出できませんでした。別の方法で検出を試みます。");
    
    // よく使われる難易度パターンを検索
    const commonPatterns = [
      /^(easy|normal|hard|expert|master|special|append)/i,
      /^([ehnmsx])\s*(lv|level|難易度)/i,
      /^(簡単|普通|ふつう|難しい|むずかしい|エキスパート|マスター|スペシャル)/i
    ];
    
    // 難易度っぽい列を探す
    normalizedHeaders.forEach((header, index) => {
      if (!header) return;
      
      // パターンにマッチするか確認
      const matchesPattern = commonPatterns.some(pattern => pattern.test(header));
      
      if (matchesPattern) {
        // この列はどの難易度に対応するか推測
        const headerParts = header.split(/\s+|_/)[0].toUpperCase();
        
        // 最も近い難易度を検索
        const matchedDifficulty = findClosestDifficulty(headerParts, game.difficulties);
        
        if (matchedDifficulty && mapping.difficulties[matchedDifficulty.id] === -1) {
          mapping.difficulties[matchedDifficulty.id] = index;
          console.log(`難易度列を自動検出: "${header}" を ${matchedDifficulty.id} として検出`);
          
          // コンボ列も近くにあるか確認
          for (let i = index + 1; i < Math.min(index + 3, normalizedHeaders.length); i++) {
            const nextHeader = normalizedHeaders[i];
            if (nextHeader && (nextHeader.includes('combo') || nextHeader.includes('notes') || 
                nextHeader.includes('コンボ') || nextHeader.includes('ノーツ'))) {
              mapping.combos[matchedDifficulty.id] = i;
              console.log(`コンボ列を自動検出: "${normalizedHeaders[i]}" を ${matchedDifficulty.id}のコンボ列として検出`);
              break;
            }
          }
        }
      }
    });
  }
  
  // 楽曲情報のキーワード
  interface InfoFieldsMap {
    artist: string[];
    lyricist: string[];
    composer: string[];
    arranger: string[];
    duration: string[];
    bpm: string[];
    addedDate: string[];
    tags: string[];
  }
  
  const infoFields: InfoFieldsMap = {
    artist: ['artist', 'vocal', 'singer', 'unit', 'アーティスト', '歌手', 'ボーカル', 'ユニット', '歌', 'ボーカリスト', '演奏'],
    lyricist: ['lyricist', 'lyrics', 'lyrics by', '作詞', '作詞者', '作詞家', 'sakushi'],
    composer: ['composer', 'composition', 'composed by', '作曲', '作曲者', '作曲家', 'sakkyoku'],
    arranger: ['arranger', 'arrangement', 'arranged by', '編曲', '編曲者', 'henkyoku'],
    duration: ['duration', 'length', 'time', '時間', '長さ', '曲の長さ', '演奏時間', 'play time'],
    bpm: ['bpm', 'tempo', 'テンポ', '速さ', 'speed'],
    addedDate: ['added date', 'release date', 'date', '追加日', '実装日', '日付', '公開日', 'リリース日', '実装'],
    tags: ['tags', 'genre', 'category', 'タグ', 'ジャンル', 'カテゴリ', '分類', 'type']
  };
  
  // 楽曲情報のマッピング - 型安全なアクセス
  (Object.keys(infoFields) as Array<keyof InfoFieldsMap>).forEach(field => {
    mapping.info[field] = findColumnIndex(normalizedHeaders, infoFields[field]);
  });
  
  return mapping;
}

/**
 * ヘッダーの難易度名に最も近いゲーム難易度を見つける
 * 完全一致や部分一致を考慮する
 */
function findClosestDifficulty(headerPart: string, difficulties: Game['difficulties']): { id: string, name: string } | null {
  // 完全一致を試行
  for (const diff of difficulties) {
    if (diff.id.toUpperCase() === headerPart || diff.name.toUpperCase() === headerPart) {
      return { id: diff.id, name: diff.name };
    }
  }
  
  // 部分一致を試行
  for (const diff of difficulties) {
    const upperDiffId = diff.id.toUpperCase();
    const upperDiffName = diff.name.toUpperCase();
    
    if (upperDiffId.includes(headerPart) || headerPart.includes(upperDiffId) || 
        upperDiffName.includes(headerPart) || headerPart.includes(upperDiffName)) {
      return { id: diff.id, name: diff.name };
    }
  }
  
  // 頭文字での一致を試行
  if (headerPart.length === 1) {
    for (const diff of difficulties) {
      if (diff.id.charAt(0).toUpperCase() === headerPart || 
          diff.name.charAt(0).toUpperCase() === headerPart) {
        return { id: diff.id, name: diff.name };
      }
    }
  }
  
  // 一般的な略称パターンでの一致を試行
  const commonMappings: { [key: string]: string[] } = {
    'E': ['EASY'],
    'N': ['NORMAL'],
    'H': ['HARD'],
    'EX': ['EXPERT', 'EXP'],
    'M': ['MASTER'],
    'SP': ['SPECIAL'],
    'A': ['APPEND']
  };
  
  for (const [abbr, targets] of Object.entries(commonMappings)) {
    if (headerPart === abbr || headerPart.startsWith(abbr)) {
      for (const diff of difficulties) {
        if (targets.some(t => diff.id.toUpperCase().includes(t) || diff.name.toUpperCase().includes(t))) {
          return { id: diff.id, name: diff.name };
        }
      }
    }
  }
  
  // 未使用の難易度を探す（フォールバック）
  // これは最後の手段として、まだマッピングされていない難易度を返す
  return null;
}

/**
 * ヘッダー配列から指定したキーワードに一致する列のインデックスを検索
 * 部分一致と完全一致を考慮
 */
function findColumnIndex(headers: string[], keywords: string[]): number {
  // 完全一致を優先
  for (const keyword of keywords) {
    const index = headers.findIndex(h => h === keyword);
    if (index !== -1) {
      return index;
    }
  }
  
  // 次に部分一致を試行
  for (const keyword of keywords) {
    const index = headers.findIndex(h => h.includes(keyword));
    if (index !== -1) {
      return index;
    }
  }
  
  // 最後に広めの部分一致（キーワードが他の文字列に含まれる場合）
  for (const keyword of keywords) {
    if (keyword.length < 2) continue; // 短すぎるキーワードはスキップ
    
    const index = headers.findIndex(h => {
      // 日本語と英語の区別なく検索
      const normalizedHeader = h.toLowerCase().replace(/\s+/g, '');
      const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '');
      return normalizedHeader.includes(normalizedKeyword) || 
             normalizedKeyword.includes(normalizedHeader);
    });
    
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