import Fuse from 'fuse.js';
import { Song, DifficultyLevel } from '../types/Song';

// 高度な検索エンジン設定
const fuseOptions = {
  includeScore: true,
  threshold: 0.3,
  ignoreLocation: true,
  keys: [
    { name: 'name', weight: 2 }, // 楽曲名の重み付け
    { name: 'info.artist', weight: 1.5 }, // アーティスト名の重み付け
    'info.lyricist',
    'info.composer',
    'info.tags'
  ]
};

export interface SearchResult {
  song: Song;
  score?: number; // 類似度スコア（0-1）
  highlightedName?: string; // ハイライト表示用
}

export function searchSongs(songs: Song[], query: string): SearchResult[] {
  if (!query || query.trim() === '') {
    return songs.map(song => ({ song }));
  }
  
  // Fuseインスタンスの作成
  const fuse = new Fuse(songs, fuseOptions);
  
  // 検索の実行
  const searchResults = fuse.search(query);
  
  // 結果の変換
  return searchResults.map(result => {
    const { item: song, score, matches } = result;
    
    // ハイライト用のテキスト（オプション）
    let highlightedName = song.name;
    
    // マッチした箇所をハイライト
    if (matches) {
      const nameMatch = matches.find(match => match.key === 'name');
      if (nameMatch && nameMatch.indices.length > 0) {
        // 元のテキスト
        const text = song.name;
        // ハイライト位置を降順でソート（後ろから処理するため）
        const indices = [...nameMatch.indices].sort((a, b) => b[0] - a[0]);
        
        // ハイライトHTMLの生成
        let highlighted = text;
        indices.forEach(([start, end]) => {
          highlighted = 
            highlighted.substring(0, start) + 
            `<mark>${highlighted.substring(start, end + 1)}</mark>` + 
            highlighted.substring(end + 1);
        });
        
        highlightedName = highlighted;
      }
    }
    
    return {
      song,
      score,
      highlightedName
    };
  });
}

// 類似楽曲レコメンデーション
export interface SimilarityCriteria {
  byArtist?: boolean;
  byTags?: boolean;
  byBpm?: boolean;
  byDifficulty?: boolean;
}

export function getSimilarSongs(
  targetSong: Song,
  allSongs: Song[],
  criteria: SimilarityCriteria = { byArtist: true, byTags: true, byBpm: true, byDifficulty: true },
  limit: number = 10
): SearchResult[] {
  // 自分自身を除外
  const otherSongs = allSongs.filter(song => song.id !== targetSong.id);
  
  // 各曲の類似度スコアを計算
  const scoredSongs = otherSongs.map(song => {
    let similarityScore = 0;
    let matchCount = 0;
    
    // アーティスト一致
    if (criteria.byArtist && targetSong.info.artist && song.info.artist) {
      if (targetSong.info.artist.toLowerCase() === song.info.artist.toLowerCase()) {
        similarityScore += 0.4;
        matchCount++;
      }
    }
    
    // タグ一致
    if (criteria.byTags && targetSong.info.tags && song.info.tags) {
      const targetTags = new Set(targetSong.info.tags.map(tag => tag.toLowerCase()));
      const songTags = song.info.tags.map(tag => tag.toLowerCase());
      
      // 共通タグの数をカウント
      const commonTags = songTags.filter(tag => targetTags.has(tag));
      if (commonTags.length > 0) {
        // タグ一致のスコア (0-0.3)
        const tagScore = Math.min(0.3, 0.1 * commonTags.length);
        similarityScore += tagScore;
        matchCount++;
      }
    }
    
    // BPM近似
    if (criteria.byBpm && targetSong.info.bpm && song.info.bpm) {
      const bpmDiff = Math.abs(targetSong.info.bpm - song.info.bpm);
      
      // BPM差が10以内で高いスコア、30以内で中程度のスコア
      if (bpmDiff <= 10) {
        similarityScore += 0.2;
        matchCount++;
      } else if (bpmDiff <= 30) {
        similarityScore += 0.1;
        matchCount++;
      }
    }
    
    // 難易度パターン近似
    if (criteria.byDifficulty) {
      const difficultyPatternMatch = compareDifficultyPatterns(targetSong, song);
      if (difficultyPatternMatch > 0) {
        similarityScore += difficultyPatternMatch * 0.1;
        matchCount++;
      }
    }
    
    // 少なくとも1つのカテゴリでマッチした場合のみスコアを調整
    const finalScore = matchCount > 0 ? similarityScore / matchCount : 0;
    
    return {
      song,
      score: finalScore
    };
  });
  
  // スコアでソートして上位を返す
  return scoredSongs
    .filter(result => result.score > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit);
}

// 難易度パターンの類似度を計算
function compareDifficultyPatterns(song1: Song, song2: Song): number {
    const difficulties: DifficultyLevel[] = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER', 'APPEND'];
    let matchCount = 0;
    let totalComparisons = 0;
    
    difficulties.forEach(diff => {
      const level1 = song1.difficulties[diff]?.level;
      const level2 = song2.difficulties[diff]?.level;
      
      if (level1 !== null && level2 !== null) {
        totalComparisons++;
        
        // Levels match or are within 1 level
        if (Math.abs((level1 as number) - (level2 as number)) <= 1) {
          matchCount++;
        }
      }
    });
    
    // Match rate (0-1)
    return totalComparisons > 0 ? matchCount / totalComparisons : 0;
  }