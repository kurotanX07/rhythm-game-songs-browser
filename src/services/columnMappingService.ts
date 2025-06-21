import { FlexibleColumnMapping, DetectedColumn, DisplaySettings, UploadPreset, CustomField } from '../types/ExcelStructure';
import { Game } from '../types/Game';
import { collection, doc, setDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 列マッピングの自動検出サービス
 */
export class ColumnMappingService {
  
  /**
   * ヘッダーとサンプルデータから列マッピングを自動推測
   */
  static suggestColumnMapping(
    headers: string[], 
    sampleData: any[][], 
    game: Game
  ): { [columnIndex: number]: DetectedColumn } {
    const detectedColumns: { [columnIndex: number]: DetectedColumn } = {};
    
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      const samples = sampleData.slice(0, 3).map(row => row[index]).filter(val => val != null);
      
      // 難易度レベルの検出を最初に行う（より具体的なパターンを優先）
      const difficultyMatch = this.detectDifficultyColumn(normalizedHeader, game.difficulties);
      if (difficultyMatch) {
        detectedColumns[index] = {
          suggestedField: `difficulties.${difficultyMatch.difficultyId}.level`,
          confidence: difficultyMatch.confidence,
          sampleData: samples,
          headerName: header
        };
        return; // 早期リターンで他の検出をスキップ
      }
      
      // コンボ数の検出
      const comboMatch = this.detectComboColumn(normalizedHeader, game.difficulties);
      if (comboMatch) {
        detectedColumns[index] = {
          suggestedField: `difficulties.${comboMatch.difficultyId}.combo`,
          confidence: comboMatch.confidence,
          sampleData: samples,
          headerName: header
        };
        return; // 早期リターンで他の検出をスキップ
      }
      
      // YouTube URL の検出
      const youtubeMatch = this.detectYouTubeColumn(normalizedHeader, game.difficulties);
      if (youtubeMatch) {
        detectedColumns[index] = {
          suggestedField: `youtubeUrls.${youtubeMatch.difficultyId}`,
          confidence: youtubeMatch.confidence,
          sampleData: samples,
          headerName: header
        };
        return; // 早期リターンで他の検出をスキップ
      }
      
      // 楽曲番号の検出（より厳密なパターンマッチング）- 優先度を上げる
      if (this.matchesSongNumberPattern(normalizedHeader)) {
        detectedColumns[index] = {
          suggestedField: 'songNo',
          confidence: this.calculateConfidence(normalizedHeader, ['songno', 'song_no', '楽曲番号', '曲番']),
          sampleData: samples,
          headerName: header
        };
        return; // 早期リターンで他の検出をスキップ
      }
      
      // 実装番号の検出
      else if (this.matchesImplementationNumberPattern(normalizedHeader)) {
        detectedColumns[index] = {
          suggestedField: 'implementationNo',
          confidence: this.calculateConfidence(normalizedHeader, ['implementationno', 'implementation_no', '実装番号']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // 楽曲名の検出
      else if (this.matchesExactPattern(normalizedHeader, ['曲名', 'song', 'title', 'name', '楽曲', 'songname'])) {
        detectedColumns[index] = {
          suggestedField: 'name',
          confidence: this.calculateConfidence(normalizedHeader, ['曲名', 'song', 'title', 'name']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // アーティスト関連の検出
      else if (this.matchesExactPattern(normalizedHeader, ['アーティスト', 'artist', '歌手', 'vocalist', 'singer'])) {
        detectedColumns[index] = {
          suggestedField: 'info.artist',
          confidence: this.calculateConfidence(normalizedHeader, ['アーティスト', 'artist']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // 作曲者の検出
      else if (this.matchesExactPattern(normalizedHeader, ['作曲', 'composer', 'compose'])) {
        detectedColumns[index] = {
          suggestedField: 'info.composer',
          confidence: this.calculateConfidence(normalizedHeader, ['作曲', 'composer']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // 編曲者の検出
      else if (this.matchesExactPattern(normalizedHeader, ['編曲', 'arranger', 'arrange'])) {
        detectedColumns[index] = {
          suggestedField: 'info.arranger',
          confidence: this.calculateConfidence(normalizedHeader, ['編曲', 'arranger']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // 作詞者の検出
      else if (this.matchesExactPattern(normalizedHeader, ['作詞', 'lyricist', 'lyrics'])) {
        detectedColumns[index] = {
          suggestedField: 'info.lyricist',
          confidence: this.calculateConfidence(normalizedHeader, ['作詞', 'lyricist']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // BPMの検出
      else if (this.matchesExactPattern(normalizedHeader, ['bpm', 'tempo'])) {
        detectedColumns[index] = {
          suggestedField: 'info.bpm',
          confidence: this.calculateConfidence(normalizedHeader, ['bpm']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // 時間の検出
      else if (this.matchesExactPattern(normalizedHeader, ['時間', 'duration', 'time', '長さ', '再生時間'])) {
        detectedColumns[index] = {
          suggestedField: 'info.duration',
          confidence: this.calculateConfidence(normalizedHeader, ['時間', 'duration']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // 追加日の検出（新規追加）
      else if (this.matchesExactPattern(normalizedHeader, ['追加日', 'addeddate', 'added_date', '登録日', 'date', '日付'])) {
        detectedColumns[index] = {
          suggestedField: 'info.addedDate',
          confidence: this.calculateConfidence(normalizedHeader, ['追加日', 'addeddate']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // タグの検出（新規追加）
      else if (this.matchesExactPattern(normalizedHeader, ['タグ', 'tags', 'tag', 'ジャンル', 'genre', 'category', 'カテゴリ'])) {
        detectedColumns[index] = {
          suggestedField: 'info.tags',
          confidence: this.calculateConfidence(normalizedHeader, ['タグ', 'tags']),
          sampleData: samples,
          headerName: header
        };
      }
      
      // 上記に該当しない場合はカスタムフィールドとして扱う
      else {
        detectedColumns[index] = {
          suggestedField: `custom.${this.generateCustomFieldId(header)}`,
          confidence: 0.3, // カスタムフィールドは低い信頼度
          sampleData: samples,
          headerName: header,
          isCustomField: true
        };
      }
    });
    
    return detectedColumns;
  }
  
  /**
   * YouTube URL列の検出（新規追加）
   */
  private static detectYouTubeColumn(
    header: string, 
    difficulties: Game['difficulties']
  ): { difficultyId: string; confidence: number } | null {
    // YouTube関連のキーワードが含まれているかチェック
    if (!header.includes('youtube') && !header.includes('url') && 
        !header.includes('link') && !header.includes('動画') && 
        !header.includes('ユーチューブ')) {
      return null;
    }
    
    for (const diff of difficulties) {
      const diffId = diff.id.toLowerCase();
      const diffName = diff.name.toLowerCase();
      
      if (header.includes(diffId) || header.includes(diffName)) {
        return { difficultyId: diff.id, confidence: 0.8 };
      }
    }
    
    // 難易度が特定できない場合は、一般的なYouTube URLとして扱う
    if (header.includes('youtube') || header.includes('url')) {
      // 最初の難易度をデフォルトとして使用
      if (difficulties.length > 0) {
        return { difficultyId: difficulties[0].id, confidence: 0.5 };
      }
    }
    
    return null;
  }
  
  /**
   * カスタムフィールドIDの生成
   */
  static generateCustomFieldId(headerName: string): string {
    return headerName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  /**
   * カスタムフィールドを作成
   */
  static createCustomField(
    columnIndex: number,
    headerName: string,
    dataType: CustomField['dataType'] = 'string',
    adminOnly: boolean = false
  ): CustomField {
    return {
      columnIndex,
      displayName: headerName,
      originalColumnName: headerName,
      visible: true,
      adminOnly,
      dataType,
      order: columnIndex
    };
  }
  
  /**
   * より厳密なパターンマッチング（完全一致または明確な部分一致のみ）
   */
  private static matchesExactPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      // 完全一致
      if (text === lowerPattern) return true;
      
      // 明確な部分一致（前後に区切り文字がある場合）
      const regex = new RegExp(`(^|[^a-zA-Z])${lowerPattern}([^a-zA-Z]|$)`, 'i');
      return regex.test(text);
    });
  }
  
  /**
   * 楽曲番号パターンの検出（より厳密）
   */
  private static matchesSongNumberPattern(text: string): boolean {
    // 楽曲番号の明確なパターンのみマッチ
    const songNumberPatterns = [
      /^no$/i,                  // "no" 単独
      /^songno$/i,              // "songno"
      /^song_no$/i,             // "song_no"
      /^song-no$/i,             // "song-no"
      /^楽曲番号$/i,             // "楽曲番号"
      /^曲番$/i,                // "曲番"
      /^number$/i,              // "number"（ただし単独の場合のみ）
      /^番号$/i,                // "番号"（ただし単独の場合のみ）
      /^id$/i,                  // "id"
      /^songid$/i,              // "songid"
      /^song_id$/i              // "song_id"
    ];
    
    // "song"や"name"などの楽曲名パターンを除外
    const excludePatterns = [
      /^song$/i,                // "song" 単独は楽曲名
      /^songname$/i,            // "songname" は楽曲名
      /^song_name$/i,           // "song_name" は楽曲名
      /^name$/i,                // "name" は楽曲名
      /^title$/i                // "title" は楽曲名
    ];
    
    // 除外パターンに該当する場合はfalse
    if (excludePatterns.some(pattern => pattern.test(text))) {
      return false;
    }
    
    return songNumberPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * 実装番号パターンの検出
   */
  private static matchesImplementationNumberPattern(text: string): boolean {
    const implementationPatterns = [
      /^implementation(no|_no)?$/i,  // "implementation", "implementationno", "implementation_no"
      /^impl(no|_no)?$/i,           // "impl", "implno", "impl_no"
      /^実装番号$/i,                 // "実装番号"
      /^実装no$/i                   // "実装no"
    ];
    
    return implementationPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * パターンマッチング（後方互換性のため残す）
   */
  private static matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern.toLowerCase()));
  }
  
  /**
   * 信頼度の計算
   */
  private static calculateConfidence(text: string, exactMatches: string[]): number {
    // 完全一致の場合は高い信頼度
    if (exactMatches.some(match => text === match.toLowerCase())) {
      return 0.9;
    }
    
    // 部分一致の場合は中程度の信頼度
    if (exactMatches.some(match => text.includes(match.toLowerCase()))) {
      return 0.7;
    }
    
    return 0.5;
  }
  
  /**
   * 難易度列の検出
   */
  private static detectDifficultyColumn(
    header: string, 
    difficulties: Game['difficulties']
  ): { difficultyId: string; confidence: number } | null {
    for (const diff of difficulties) {
      const diffId = diff.id.toLowerCase();
      const diffName = diff.name.toLowerCase();
      
      // 完全一致
      if (header === diffId || header === diffName) {
        return { difficultyId: diff.id, confidence: 0.9 };
      }
      
      // 部分一致（レベル、難易度などの接尾辞付き）
      if (header.includes(diffId) || header.includes(diffName)) {
        if (header.includes('level') || header.includes('lv') || header.includes('レベル') || header.includes('難易度')) {
          return { difficultyId: diff.id, confidence: 0.8 };
        }
      }
      
      // 頭文字での一致
      if (header.length === 1 && header === diffId.charAt(0).toLowerCase()) {
        return { difficultyId: diff.id, confidence: 0.6 };
      }
    }
    
    return null;
  }
  
  /**
   * コンボ数列の検出
   */
  private static detectComboColumn(
    header: string, 
    difficulties: Game['difficulties']
  ): { difficultyId: string; confidence: number } | null {
    if (!header.includes('combo') && !header.includes('notes') && 
        !header.includes('コンボ') && !header.includes('ノーツ')) {
      return null;
    }
    
    for (const diff of difficulties) {
      const diffId = diff.id.toLowerCase();
      const diffName = diff.name.toLowerCase();
      
      if (header.includes(diffId) || header.includes(diffName)) {
        return { difficultyId: diff.id, confidence: 0.8 };
      }
    }
    
    return null;
  }
  
  /**
   * デフォルトの表示設定を生成
   */
  static generateDefaultDisplaySettings(detectedColumns: { [columnIndex: number]: DetectedColumn }): DisplaySettings {
    const settings: DisplaySettings = {};
    
    Object.entries(detectedColumns).forEach(([columnIndex, detected], order) => {
      settings[detected.suggestedField] = {
        visible: true,
        order,
        label: detected.headerName,
        adminOnly: detected.isCustomField || false // カスタムフィールドはデフォルトで管理者のみ
      };
    });
    
    return settings;
  }
}

/**
 * プリセット管理サービス
 */
export class PresetManager {
  
  /**
   * プリセットの保存
   */
  static async savePreset(preset: Omit<UploadPreset, 'id' | 'createdAt' | 'lastUsed'>): Promise<string> {
    const id = `preset_${Date.now()}`;
    const fullPreset: UploadPreset = {
      ...preset,
      id,
      createdAt: new Date(),
      lastUsed: new Date()
    };
    
    await setDoc(doc(db, 'uploadPresets', id), fullPreset);
    return id;
  }
  
  /**
   * ゲーム別プリセット取得
   */
  static async getPresetsForGame(gameId: string): Promise<UploadPreset[]> {
    try {
      const q = query(
        collection(db, 'uploadPresets'),
        where('gameId', '==', gameId),
        orderBy('lastUsed', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastUsed: doc.data().lastUsed?.toDate() || new Date()
      } as UploadPreset));
    } catch (error) {
      console.error('プリセット取得エラー:', error);
      return [];
    }
  }
  
  /**
   * 自動プリセット生成
   */
  static generateAutoPreset(
    gameId: string, 
    headers: string[], 
    sampleData: any[][],
    game: Game
  ): Partial<UploadPreset> {
    const detectedColumns = ColumnMappingService.suggestColumnMapping(headers, sampleData, game);
    
    // 検出された列から FlexibleColumnMapping を生成
    const columnMappings: FlexibleColumnMapping = {
      songNo: -1,
      implementationNo: -1,
      name: -1,
      difficulties: {},
      combos: {},
      youtubeUrls: {},
      info: {},
      customFields: {}
    };
    
    Object.entries(detectedColumns).forEach(([columnIndex, detected]) => {
      const index = parseInt(columnIndex);
      const field = detected.suggestedField;
      
      if (field === 'name') {
        columnMappings.name = index;
      } else if (field === 'songNo') {
        columnMappings.songNo = index;
      } else if (field === 'implementationNo') {
        columnMappings.implementationNo = index;
      } else if (field.startsWith('info.')) {
        const infoField = field.replace('info.', '') as keyof typeof columnMappings.info;
        columnMappings.info[infoField] = index;
      } else if (field.startsWith('difficulties.')) {
        const parts = field.split('.');
        const diffId = parts[1];
        const type = parts[2]; // 'level' or 'combo'
        
        if (type === 'level') {
          columnMappings.difficulties[diffId] = index;
        } else if (type === 'combo') {
          columnMappings.combos[diffId] = index;
        }
      } else if (field.startsWith('youtubeUrls.')) {
        const diffId = field.replace('youtubeUrls.', '');
        columnMappings.youtubeUrls[diffId] = index;
      } else if (field.startsWith('custom.')) {
        const customFieldId = field.replace('custom.', '');
        if (!columnMappings.customFields) {
          columnMappings.customFields = {};
        }
        columnMappings.customFields[customFieldId] = ColumnMappingService.createCustomField(
          index,
          detected.headerName,
          'string',
          false // デフォルトでは管理者専用ではない
        );
      }
    });
    
    return {
      name: `自動生成プリセット (${new Date().toLocaleDateString()})`,
      gameId,
      description: 'ヘッダー情報から自動生成されたマッピング',
      columnMappings,
      displaySettings: ColumnMappingService.generateDefaultDisplaySettings(detectedColumns)
    };
  }
} 