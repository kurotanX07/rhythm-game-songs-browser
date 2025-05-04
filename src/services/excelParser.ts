import * as XLSX from 'xlsx';
import { Song, DifficultyLevel, DifficultyInfo, SongInfo } from '../types/Song';
import { ExcelStructure, ColumnMapping } from '../types/ExcelStructure';
import { Game } from '../types/Game';

/**
 * Excelファイルを解析して楽曲データを取得する
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
        
        // 直接セルデータを読み取り、ヘッダー行を検証
        const headerRowData = [];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r: structure.headerRow, c });
          const cell = worksheet[cellAddress];
          headerRowData.push(cell ? String(cell.v) : null);
        }
        console.log('Header Row Raw Data:', headerRowData);
        
        // 問題のある特定の列を直接探す
        const columnNameHints = [
          '楽曲No', '曲No', 'Song No', 'SongNo', 'No.',
          '実装No', 'Implementation No', 'Impl No',
          'APPEND', 'Special', 'SP', 'アペンド'
        ];
        
        // ヘッダー行の各セルを調べて特定の文字列を含む列を探す
        const directColumnMatches: Record<string, string> = {};
        headerRowData.forEach((text, index) => {
          if (text) {
            columnNameHints.forEach(hint => {
              if (String(text).toLowerCase().includes(hint.toLowerCase())) {
                directColumnMatches[`${hint} -> column ${index}`] = text;
              }
            });
          }
        });
        console.log('Direct Column Matches:', directColumnMatches);
        
        // JSONに変換（列インデックスの調整を考慮）
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          range: structure.headerRow,
          header: 1,  // 数値インデックスを使用
          blankrows: false,
          defval: null
        });
        
        // 最初の数行を詳細出力（生データ確認）
        console.log('First 2 rows raw data:', 
          jsonData.slice(structure.dataStartRow - structure.headerRow, 
            structure.dataStartRow - structure.headerRow + 2));
        
        // 列オフセットの調整（2列のズレを修正）
        const columnOffsetAdjusted = {
          ...structure,
          columnMapping: adjustColumnOffset(structure.columnMapping)
        };
        
        // 調整後の構造を表示
        console.log('Original Column Mapping:', structure.columnMapping);
        console.log('Adjusted Column Mapping:', columnOffsetAdjusted.columnMapping);
        
        // 調整された構造で楽曲データを作成
        const songs = createSongsFromExcel(jsonData as any[][], columnOffsetAdjusted, game);
        console.log('Parsed songs count:', songs.length);
        if (songs.length > 0) {
          console.log('First song example:', JSON.stringify(songs[0], null, 2));
        }
        
        resolve(songs);
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
 * 列マッピングのオフセットを調整
 * 報告された問題: 列インデックスが実際より2程度大きい
 */
function adjustColumnOffset(mapping: ColumnMapping): ColumnMapping {
  // 深いコピーを作成
  const adjusted = JSON.parse(JSON.stringify(mapping)) as ColumnMapping;
  
  // オフセット調整値
  const offset = -2; // 列番号が2大きい場合は-2で調整
  
  // 基本フィールドの調整
  if (adjusted.songNo >= 0) adjusted.songNo = Math.max(0, adjusted.songNo + offset);
  if (adjusted.name >= 0) adjusted.name = Math.max(0, adjusted.name + offset);
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
  
  return adjusted;
}

/**
 * Excelデータから楽曲データを作成する - 強化版
 * ゲーム情報から動的に難易度定義を利用
 */
function createSongsFromExcel(data: any[][], structure: ExcelStructure, game: Game): Song[] {
  const { columnMapping, dataStartRow, headerRow } = structure;
  const startIndex = Math.max(0, dataStartRow - headerRow - 1);
  
  return data.slice(startIndex).map((row, index) => {
    try {
      // 必須フィールドの確認 - 厳密な存在チェック
      let songNo: number;
      
      // Song No の読み取りを強化
      if (columnMapping.songNo >= 0 && columnMapping.songNo < row.length) {
        const rawSongNo = row[columnMapping.songNo];
        if (rawSongNo === null || rawSongNo === undefined || rawSongNo === '') {
          throw new Error(`行 ${index + dataStartRow}: 楽曲番号が空です`);
        }
        
        // 数値変換の強化
        if (typeof rawSongNo === 'number') {
          songNo = rawSongNo;
        } else {
          // 文字列から数値への変換を試みる
          const parsed = parseInt(String(rawSongNo).replace(/[^\d]/g, ''), 10);
          if (isNaN(parsed)) {
            throw new Error(`行 ${index + dataStartRow}: 無効な楽曲番号形式: ${rawSongNo}`);
          }
          songNo = parsed;
        }
      } else {
        // 列が見つからない場合、データの位置に基づいて行番号を割り当て
        songNo = index + 1;
        console.warn(`行 ${index + dataStartRow}: 楽曲番号の列が見つかりません。行番号を使用: ${songNo}`);
      }
      
      // 楽曲名の読み取りを強化
      let name = '';
      if (columnMapping.name >= 0 && columnMapping.name < row.length) {
        const rawName = row[columnMapping.name];
        if (rawName !== null && rawName !== undefined && rawName !== '') {
          name = String(rawName).trim();
        }
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
      
      // デバッグ: 重要な列の値を出力
      if (index === 0) { // 最初の曲のみ詳細デバッグ
        console.log(`Song ${songNo}: "${name}" | Row Data:`, {
          songNo: row[columnMapping.songNo],
          name: row[columnMapping.name],
          implNo: columnMapping.implementationNo !== undefined ? 
                 row[columnMapping.implementationNo] : 'N/A',
          difficultyLevels: game.difficulties.map(diff => ({
            id: diff.id,
            level: columnMapping.difficulties[diff.id] !== undefined ? 
                  row[columnMapping.difficulties[diff.id]] : 'N/A',
            combo: columnMapping.combos[diff.id] !== undefined ? 
                  row[columnMapping.combos[diff.id]] : 'N/A',
            youtube: columnMapping.youtubeUrls[diff.id] !== undefined ? 
                    row[columnMapping.youtubeUrls[diff.id]] : 'N/A'
          }))
        });
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
        // Excelの日付をJavaScriptのDateに変換
        if (typeof addedDate === 'number') {
          // Excel日付形式の場合（シリアル値）
          // Excel uses serial numbers starting from 1/1/1900 (Windows) or 1/1/1904 (Mac)
          // 25569 is the number of days between 1/1/1900 and 1/1/1970 (Unix epoch)
          const date = new Date(Math.round((addedDate - 25569) * 86400 * 1000));
          
          // Validate the date is reasonable (between 1990 and current year + 1)
          const currentYear = new Date().getFullYear();
          if (date.getFullYear() >= 1990 && date.getFullYear() <= currentYear + 1) {
            info.addedDate = date;
          } else {
            // If date is outside reasonable range, store as null
            info.addedDate = null;
          }
        } else {
          // 文字列の場合はフォーマットを判断
          const dateStr = String(addedDate).trim();
          
          // Try to parse based on common formats
          let date = null;
          // yyyy/MM/dd or yyyy-MM-dd format
          if (/^\d{4}[\/\-](0[1-9]|1[0-2])[\/\-](0[1-9]|[12][0-9]|3[01])$/.test(dateStr)) {
            date = new Date(dateStr.replace(/-/g, '/'));  // Convert dash to slash for safer parsing
          } 
          // dd/MM/yyyy or dd-MM-yyyy format
          else if (/^(0[1-9]|[12][0-9]|3[01])[\/\-](0[1-9]|1[0-2])[\/\-]\d{4}$/.test(dateStr)) {
            const parts = dateStr.replace(/-/g, '/').split('/');
            date = new Date(`${parts[2]}/${parts[1]}/${parts[0]}`);
          }
          // Custom Japanese format like "2020年12月25日"
          else if (/^(\d{4})年(\d{1,2})月(\d{1,2})日$/.test(dateStr)) {
            const matches = dateStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
            if (matches && matches.length === 4) {
              date = new Date(Number(matches[1]), Number(matches[2]) - 1, Number(matches[3]));
            }
          } 
          // If above formats fail, try standard Date parsing
          else {
            date = new Date(dateStr);
          }
          
          // Final validation
          if (date && !isNaN(date.getTime())) {
            info.addedDate = date;
          } else {
            // If parsing failed, store as null
            info.addedDate = null;
          }
        }
      } catch (error) {
        console.error('Date parsing error:', error, 'Value was:', addedDate);
        info.addedDate = null; // Set to null on error
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
 * Excelファイルの構造を自動検出する
 * ゲーム情報から動的に難易度定義を利用
 */
export async function analyzeExcelStructure(file: File, gameId: string, game: Game): Promise<ExcelStructure> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('ファイル読み込みエラー');
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: true
        });
        
        // シート名を決定（指定がなければ最初のシート）
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // シートの範囲を取得
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // ヘッダー行の検出（空でない行を探す）
        let headerRow = 0;
        for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) { // 最初の10行を検索
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
        
        // ヘッダー行のデータを取得
        const headers: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
          const cell = worksheet[cellAddress];
          // セルが存在し、値がある場合のみ追加
          headers.push(cell && cell.v ? String(cell.v).trim() : '');
        }
        
        // データ開始行を検出（ヘッダー行の次の空でない行）
        let dataStartRow = headerRow + 1;
        let foundData = false;
        
        for (let r = headerRow + 1; r <= Math.min(range.e.r, headerRow + 10); r++) {
          let rowHasContent = false;
          
          // 少なくとも2つのセルに内容があるかチェック
          let contentCells = 0;
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r, c });
            if (worksheet[cellAddress] && worksheet[cellAddress].v !== undefined) {
              contentCells++;
              if (contentCells >= 2) {
                rowHasContent = true;
                break;
              }
            }
          }
          
          if (rowHasContent) {
            dataStartRow = r;
            foundData = true;
            break;
          }
        }
        
        if (!foundData) {
          // データが見つからない場合はヘッダーの次の行をデータ開始行とする
          dataStartRow = headerRow + 1;
        }
        
        // デバッグ情報の表示
        console.log('Excel Analysis Debug:');
        console.log('Sheet Name:', sheetName);
        console.log('Headers found:', headers);
        console.log('Header Row:', headerRow + 1); // 1-based for user readability
        console.log('Data Start Row:', dataStartRow + 1); // 1-based for user readability
        
        // 列のマッピングを推測（ゲーム定義の難易度を使用）
        const columnMapping = improvedColumnMapping(headers, game);
        
        // マッピング結果をデバッグ表示
        console.log('Column Mapping:', columnMapping);
        
        // 最初の数行のデータをサンプルとして読み取り（検証用）
        const sampleRows = [];
        for (let r = dataStartRow; r < Math.min(dataStartRow + 3, range.e.r + 1); r++) {
          const sampleRow = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r, c });
            const cell = worksheet[cellAddress];
            sampleRow.push(cell ? cell.v : null);
          }
          sampleRows.push(sampleRow);
        }
        
        console.log('Sample Data Rows:', sampleRows);
        
        resolve({
          gameId,
          sheetName,
          headerRow,
          dataStartRow,
          columnMapping
        });
      } catch (error) {
        console.error('Excel analysis error:', error);
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
 * 改良版: ヘッダー行から列のマッピングを推測する - ゲーム定義の難易度を使用
 */
function improvedColumnMapping(headers: string[], game: Game): ColumnMapping {
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
      console.log(`Column ${index+1}: "${header}" (Original: "${headers[index]}")`);
    }
  });
  
  // 基本情報の検索 - より多くのキーワードでマッチング
  mapping.songNo = findColumnIndex(normalizedHeaders, [
    'no', 'no.', 'song no', 'song no.', '楽曲no', '楽曲no.', '曲no', '曲no.',
    '番号', 'ナンバー', 'id', 'track', 'track no', '曲番号', '曲id'
  ]);
  
  mapping.implementationNo = findColumnIndex(normalizedHeaders, [
    'implementation no', 'implementation no.', '実装no', '実装no.', 'impl no', 'impl no.',
    '実装日', '実装順', '実装番号', 'release no', 'release number'
  ]);
  
  mapping.name = findColumnIndex(normalizedHeaders, [
    'name', 'song name', 'title', 'song title', '楽曲名', '曲名', 'タイトル',
    '名前', '名称', 'track name', '楽曲'
  ]);
  
  // ゲーム定義の難易度を使用して検索キーワードを作成
  const difficultyKeywords: Record<string, string[]> = {};
  
  // ゲームの各難易度に対するキーワードを動的に構築
  game.difficulties.forEach(diff => {
    const diffId = diff.id;
    const diffName = diff.name;
    
    // 基本キーワード
    const baseKeywords = [
      diffId.toLowerCase(),
      diffName.toLowerCase(),
      `${diffId.toLowerCase()} level`,
      `${diffName.toLowerCase()} level`,
      `${diffId.toLowerCase()}難易度`,
      `${diffName.toLowerCase()}難易度`
    ];
    
    // 追加のキーワードを難易度IDに基づいて追加
    if (diffId === 'EASY' || diffName.toLowerCase().includes('easy')) {
      baseKeywords.push(...['かんたん', '簡単', 'e', 'イージー']);
    } else if (diffId === 'NORMAL' || diffName.toLowerCase().includes('normal')) {
      baseKeywords.push(...['ふつう', '普通', 'n', 'ノーマル']);
    } else if (diffId === 'HARD' || diffName.toLowerCase().includes('hard')) {
      baseKeywords.push(...['むずかしい', '難しい', 'h', 'ハード']);
    } else if (diffId === 'EXPERT' || diffName.toLowerCase().includes('expert')) {
      baseKeywords.push(...['おに', '鬼', 'エキスパート', 'ex', 'exp']);
    } else if (diffId === 'MASTER' || diffName.toLowerCase().includes('master')) {
      baseKeywords.push(...['マスター', 'm', 'mas']);
    } else if (diffId === 'APPEND' || diffName.toLowerCase().includes('append') ||
               diffId === 'SPECIAL' || diffName.toLowerCase().includes('special')) {
      baseKeywords.push(...['アペンド', 'sp', 'a', '拡張', 'スペシャル']);
    }
    
    difficultyKeywords[diffId] = baseKeywords;
  });
  
  // 各ゲーム定義の難易度に対応する列マッピングを検出
  game.difficulties.forEach(diff => {
    const diffId = diff.id;
    const keywords = difficultyKeywords[diffId] || [];
    
    // レベル
    mapping.difficulties[diffId] = findColumnIndex(normalizedHeaders, [
      ...keywords,
      ...keywords.map(k => `${k} lv`),
      ...keywords.map(k => `${k}レベル`),
      ...keywords.map(k => `${k} level`),
      ...keywords.map(k => `${k}_lv`)
    ]);
    
    // コンボ数
    mapping.combos[diffId] = findColumnIndex(normalizedHeaders, [
      ...keywords.map(k => `${k} combo`),
      ...keywords.map(k => `${k} notes`),
      ...keywords.map(k => `${k}コンボ`),
      ...keywords.map(k => `${k} コンボ`),
      ...keywords.map(k => `${k}_combo`),
      ...keywords.map(k => `${k}ノーツ`),
      ...keywords.map(k => `${k} ノーツ`)
    ]);
    
    // YouTube URL
    mapping.youtubeUrls[diffId] = findColumnIndex(normalizedHeaders, [
      ...keywords.map(k => `${k} url`),
      ...keywords.map(k => `${k} youtube`),
      ...keywords.map(k => `${k} link`),
      ...keywords.map(k => `${k}リンク`),
      ...keywords.map(k => `${k} yt`),
      ...keywords.map(k => `${k}_url`),
      ...keywords.map(k => `${k}_yt`)
    ]);
  });
  
  // 楽曲情報のキーワードを拡張 - 型安全なオブジェクト形式に変更
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
 * 改良版: ヘッダー配列から指定したキーワードに一致する列のインデックスを検索
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