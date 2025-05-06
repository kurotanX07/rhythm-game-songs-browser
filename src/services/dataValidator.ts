// src/services/dataValidator.ts
import { Song } from '../types/Song';
import { Game } from '../types/Game';

export interface ValidationIssue {
  songId: string;
  songName: string;
  fieldPath: string;
  issueType: 'missing' | 'invalid' | 'inconsistent' | 'duplicate';
  description: string;
  severity: 'warning' | 'error';
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    duplicatesCount: number;
    inconsistenciesCount: number;
  };
}

/**
 * Validates a collection of songs against a specific game's rules
 * @param songs List of songs to validate
 * @param game Game definition containing validation rules
 * @returns Validation result with issues list
 */
export function validateSongData(songs: Song[], game: Game): ValidationResult {
  const issues: ValidationIssue[] = [];
  const songNameMap = new Map<string, Song[]>();
  
  // Pre-process for duplicate detection
  songs.forEach(song => {
    // Normalize song name for duplicate detection
    const normalizedName = song.name.toLowerCase().trim();
    if (!songNameMap.has(normalizedName)) {
      songNameMap.set(normalizedName, []);
    }
    songNameMap.get(normalizedName)?.push(song);
  });
  
  // Validate each song
  songs.forEach(song => {
    // Check required fields
    validateRequiredFields(song, issues);
    
    // Check difficulty levels and consistency
    validateDifficulties(song, game, issues);
    
    // Validate YouTube URLs
    validateYouTubeUrls(song, issues);
    
    // Validate song info fields
    validateSongInfo(song, issues);
  });
  
  // Check for duplicate songs
  validateDuplicates(songNameMap, issues);
  
  // Generate summary
  const summary = {
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    duplicatesCount: issues.filter(i => i.issueType === 'duplicate').length,
    inconsistenciesCount: issues.filter(i => i.issueType === 'inconsistent').length
  };
  
  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    summary
  };
}

/**
 * Validates required fields on a song
 */
function validateRequiredFields(song: Song, issues: ValidationIssue[]) {
  // Check song name
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
  
  // Check song number
  if (typeof song.songNo !== 'number' || isNaN(song.songNo)) {
    issues.push({
      songId: song.id,
      songName: song.name || '不明',
      fieldPath: 'songNo',
      issueType: 'invalid',
      description: '楽曲番号が無効です',
      severity: 'error'
    });
  }
  
  // Check game ID
  if (!song.gameId) {
    issues.push({
      songId: song.id,
      songName: song.name || '不明',
      fieldPath: 'gameId',
      issueType: 'missing',
      description: 'ゲームIDが設定されていません',
      severity: 'error'
    });
  }
}

/**
 * Validates difficulties against game rules
 */
function validateDifficulties(song: Song, game: Game, issues: ValidationIssue[]) {
  // Get game difficulties sorted by order
  const gameDifficulties = [...game.difficulties].sort((a, b) => a.order - b.order);
  
  // Check if song has at least one difficulty
  const hasDifficulty = Object.values(song.difficulties).some(diff => diff.level !== null);
  if (!hasDifficulty) {
    issues.push({
      songId: song.id,
      songName: song.name,
      fieldPath: 'difficulties',
      issueType: 'missing',
      description: '有効な難易度が設定されていません',
      severity: 'warning'
    });
    return;
  }
  
  // Check each difficulty
  gameDifficulties.forEach(gameDiff => {
    const songDiff = song.difficulties[gameDiff.id];
    
    // Skip if difficulty not set
    if (!songDiff || songDiff.level === null) return;
    
    // Verify level is within game's defined range
    const level = songDiff.level;
    if (
      typeof level !== 'number' || 
      isNaN(level) || 
      level < (gameDiff.minLevel || 1) || 
      level > (gameDiff.maxLevel || 100)
    ) {
      issues.push({
        songId: song.id,
        songName: song.name,
        fieldPath: `difficulties.${gameDiff.id}.level`,
        issueType: 'invalid',
        description: `${gameDiff.name}の難易度レベル(${level})が範囲外です: ${gameDiff.minLevel || 1}-${gameDiff.maxLevel || 100}`,
        severity: 'warning'
      });
    }
    
    // Check combo values
    if (songDiff.combo !== null) {
      if (typeof songDiff.combo !== 'number' || isNaN(songDiff.combo) || songDiff.combo < 0) {
        issues.push({
          songId: song.id,
          songName: song.name,
          fieldPath: `difficulties.${gameDiff.id}.combo`,
          issueType: 'invalid',
          description: `${gameDiff.name}のコンボ数(${songDiff.combo})が無効です`,
          severity: 'warning'
        });
      }
    }
  });
  
  // Check for difficulty consistency
  // Typically, higher difficulties should have higher levels
  for (let i = 0; i < gameDifficulties.length - 1; i++) {
    const currentDiff = gameDifficulties[i];
    const nextDiff = gameDifficulties[i + 1];
    
    const currentLevel = song.difficulties[currentDiff.id]?.level;
    const nextLevel = song.difficulties[nextDiff.id]?.level;
    
    if (
      currentLevel !== null && 
      nextLevel !== null && 
      typeof currentLevel === 'number' && 
      typeof nextLevel === 'number' && 
      currentLevel > nextLevel
    ) {
      issues.push({
        songId: song.id,
        songName: song.name,
        fieldPath: `difficulties`,
        issueType: 'inconsistent',
        description: `${currentDiff.name}(Lv.${currentLevel})が${nextDiff.name}(Lv.${nextLevel})より高くなっています`,
        severity: 'warning'
      });
    }
  }
}

/**
 * Validates YouTube URLs
 */
function validateYouTubeUrls(song: Song, issues: ValidationIssue[]) {
  // Check each difficulty for YouTube URLs
  Object.entries(song.difficulties).forEach(([diffId, diffInfo]) => {
    if (!diffInfo.youtubeUrl) return;
    
    // YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    const youtubeIdRegex = /^[A-Za-z0-9_-]{11}$/;
    
    if (
      !youtubeRegex.test(diffInfo.youtubeUrl) && 
      !youtubeIdRegex.test(diffInfo.youtubeUrl)
    ) {
      issues.push({
        songId: song.id,
        songName: song.name,
        fieldPath: `difficulties.${diffId}.youtubeUrl`,
        issueType: 'invalid',
        description: `無効なYouTube URL: ${diffInfo.youtubeUrl}`,
        severity: 'warning'
      });
    }
  });
}

/**
 * Validates song information fields
 */
function validateSongInfo(song: Song, issues: ValidationIssue[]) {
  // Check BPM format
  if (
    song.info.bpm !== null && 
    song.info.bpm !== undefined && 
    (typeof song.info.bpm !== 'number' || isNaN(song.info.bpm) || song.info.bpm <= 0)
  ) {
    issues.push({
      songId: song.id,
      songName: song.name,
      fieldPath: 'info.bpm',
      issueType: 'invalid',
      description: `無効なBPM値: ${song.info.bpm}`,
      severity: 'warning'
    });
  }
  
  // Check duration format (00:00)
  if (song.info.duration) {
    const durationRegex = /^\d{1,2}:\d{2}$/;
    if (!durationRegex.test(song.info.duration)) {
      issues.push({
        songId: song.id,
        songName: song.name,
        fieldPath: 'info.duration',
        issueType: 'invalid',
        description: `無効な時間フォーマット: ${song.info.duration} (期待形式: MM:SS)`,
        severity: 'warning'
      });
    }
  }
  
  // Check addedDate
  if (
    song.info.addedDate !== null && 
    song.info.addedDate !== undefined && 
    !(song.info.addedDate instanceof Date)
  ) {
    issues.push({
      songId: song.id,
      songName: song.name,
      fieldPath: 'info.addedDate',
      issueType: 'invalid',
      description: '追加日が有効な日付ではありません',
      severity: 'warning'
    });
  }
  
  // Check tags
  if (song.info.tags && !Array.isArray(song.info.tags)) {
    issues.push({
      songId: song.id,
      songName: song.name,
      fieldPath: 'info.tags',
      issueType: 'invalid',
      description: 'タグが配列形式ではありません',
      severity: 'warning'
    });
  }
}

/**
 * Validates for duplicate songs
 */
function validateDuplicates(songNameMap: Map<string, Song[]>, issues: ValidationIssue[]) {
  songNameMap.forEach((songs, name) => {
    if (songs.length <= 1) return;
    
    // Group by game
    const gameGroups = new Map<string, Song[]>();
    songs.forEach(song => {
      if (!gameGroups.has(song.gameId)) {
        gameGroups.set(song.gameId, []);
      }
      gameGroups.get(song.gameId)?.push(song);
    });
    
    // Check for duplicates within the same game
    gameGroups.forEach((gameSongs, gameId) => {
      if (gameSongs.length <= 1) return;
      
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
    });
  });
}

/**
 * Fix common issues automatically
 * @param songs Songs to fix
 * @param issues Validation issues
 * @returns Fixed songs
 */
export function autoFixSongIssues(songs: Song[], issues: ValidationIssue[]): Song[] {
  return songs.map(song => {
    const songIssues = issues.filter(issue => issue.songId === song.id);
    if (songIssues.length === 0) return song;
    
    // Create a copy to apply fixes
    const fixedSong = { ...song };
    
    // Fix duration format
    const durationIssue = songIssues.find(issue => issue.fieldPath === 'info.duration');
    if (durationIssue && song.info.duration) {
      fixedSong.info = {
        ...fixedSong.info,
        duration: formatDurationString(song.info.duration)
      };
    }
    
    // Fix BPM if it's a string
    const bpmIssue = songIssues.find(issue => issue.fieldPath === 'info.bpm');
    if (bpmIssue && song.info.bpm !== null && song.info.bpm !== undefined) {
      // Convert to number or use default
      const bpmValue = typeof song.info.bpm === 'string' 
        ? parseInt(song.info.bpm, 10) 
        : song.info.bpm;
        
      fixedSong.info = {
        ...fixedSong.info,
        bpm: isNaN(bpmValue) || bpmValue <= 0 ? null : bpmValue
      };
    }
    
    // Fix tags if not an array
    const tagsIssue = songIssues.find(issue => issue.fieldPath === 'info.tags');
    if (tagsIssue) {
      fixedSong.info = {
        ...fixedSong.info,
        tags: Array.isArray(song.info.tags) ? song.info.tags : []
      };
    }
    
    return fixedSong;
  });
}

/**
 * Format duration string to 00:00 format
 */
function formatDurationString(duration: string): string {
  // If already in 00:00 format, return as is
  if (/^\d{1,2}:\d{2}$/.test(duration)) {
    return duration;
  }
  
  // Try to extract minutes and seconds
  let minutes = 0;
  let seconds = 0;
  
  // Try to parse as MM:SS or M:SS
  const timeRegex = /(\d+):(\d+)/;
  const timeMatch = duration.match(timeRegex);
  
  if (timeMatch) {
    minutes = parseInt(timeMatch[1], 10);
    seconds = parseInt(timeMatch[2], 10);
  } else {
    // Try to parse as seconds only
    const totalSeconds = parseInt(duration.replace(/[^\d]/g, ''), 10);
    if (!isNaN(totalSeconds)) {
      minutes = Math.floor(totalSeconds / 60);
      seconds = totalSeconds % 60;
    }
  }
  
  // Format as 00:00
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}