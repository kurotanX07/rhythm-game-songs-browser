import { Song } from '../types/Song';

export interface ValidationIssue {
  songId: string;
  songName: string;
  fieldPath: string;
  issueType: 'missing' | 'invalid' | 'inconsistent' | 'duplicate';
  description: string;
  severity: 'warning' | 'error';
}

export function validateSongData(songs: Song[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const songNameMap = new Map<string, Song[]>();
  
  songs.forEach(song => {
    // 楽曲名の重複チェック（可能性のある類似楽曲の検出）
    const normalizedName = song.name.toLowerCase().trim();
    if (!songNameMap.has(normalizedName)) {
      songNameMap.set(normalizedName, []);
    }
    songNameMap.get(normalizedName)?.push(song);
    
    // 必須フィールドチェック
    if (!song.name || song.name.trim() === '') {
      issues.push({
        songId: song.id,
        songName: song.name || '不明',
        fieldPath: 'name',
        issueType: 'missing',
        description: '楽曲名が空です',
        severity: 'error'
      });
    }
    
    // 難易度レベルの整合性チェック
    const difficulties = Object.entries(song.difficulties);
    difficulties.forEach(([level, info]) => {
      if (info.level !== null) {
        // レベル範囲チェック
        if (info.level < 1 || info.level > 15) {
          issues.push({
            songId: song.id,
            songName: song.name,
            fieldPath: `difficulties.${level}.level`,
            issueType: 'invalid',
            description: `難易度レベルが範囲外です: ${info.level}`,
            severity: 'warning'
          });
        }
        
        // コンボ数NULLチェック
        if (info.combo === null) {
          issues.push({
            songId: song.id,
            songName: song.name,
            fieldPath: `difficulties.${level}.combo`,
            issueType: 'missing',
            description: `${level}難易度のコンボ数が設定されていません`,
            severity: 'warning'
          });
        }
      }
    });
    
    // YouTubeリンクの有効性チェック
    difficulties.forEach(([level, info]) => {
      if (info.youtubeUrl) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!youtubeRegex.test(info.youtubeUrl)) {
          issues.push({
            songId: song.id,
            songName: song.name,
            fieldPath: `difficulties.${level}.youtubeUrl`,
            issueType: 'invalid',
            description: `無効なYouTube URLです: ${info.youtubeUrl}`,
            severity: 'warning'
          });
        }
      }
    });
  });
  
  // 重複楽曲チェック
  songNameMap.forEach((songs, name) => {
    if (songs.length > 1) {
      // 同じゲーム内での楽曲名重複
      const gameSongGroups = new Map<string, Song[]>();
      songs.forEach(song => {
        if (!gameSongGroups.has(song.gameId)) {
          gameSongGroups.set(song.gameId, []);
        }
        gameSongGroups.get(song.gameId)?.push(song);
      });
      
      gameSongGroups.forEach((gameSongs, gameId) => {
        if (gameSongs.length > 1) {
          gameSongs.forEach(song => {
            issues.push({
              songId: song.id,
              songName: song.name,
              fieldPath: 'name',
              issueType: 'duplicate',
              description: `同一ゲーム内で重複する楽曲名があります (${gameSongs.length}件)`,
              severity: 'warning'
            });
          });
        }
      });
    }
  });
  
  return issues;
}