// src/utils/gameHelper.ts
import { Game, DifficultyDefinition } from '../types/Game';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * 任意のゲームのカスタム難易度を簡単に設定するヘルパー関数
 * @param gameId ゲームのID
 * @param gameTitle ゲームのタイトル
 * @param difficulties 難易度定義の配列
 * @param description ゲームの説明
 * @param imageUrl ゲームの画像URL
 */
export async function setupCustomGame(
  gameId: string,
  gameTitle: string,
  difficulties: Array<{
    id: string, 
    name: string, 
    color: string, 
    order?: number,
    minLevel?: number,
    maxLevel?: number
  }>,
  description?: string,
  imageUrl?: string
): Promise<Game> {
  // 難易度定義を作成
  const difficultyDefinitions: DifficultyDefinition[] = difficulties.map((diff, index) => ({
    id: diff.id,
    name: diff.name,
    color: diff.color,
    order: diff.order !== undefined ? diff.order : index,
    minLevel: diff.minLevel !== undefined ? diff.minLevel : 1,
    maxLevel: diff.maxLevel !== undefined ? diff.maxLevel : 30 // 高めのデフォルト値
  }));
  
  // 最小・最大レベルを計算
  const minLevel = Math.min(...difficultyDefinitions.map(d => d.minLevel || 1));
  const maxLevel = Math.max(...difficultyDefinitions.map(d => d.maxLevel || 30));
  
  // ゲームオブジェクトを作成
  const game: Game = {
    id: gameId,
    title: gameTitle,
    description: description || undefined, // null ではなく undefined を使用
    imageUrl: imageUrl || undefined, // null ではなく undefined を使用
    songCount: 0,
    lastUpdated: new Date(),
    difficulties: difficultyDefinitions,
    minLevel,
    maxLevel
  };
  
  // Firebaseに保存する際は null に変換して保存
  // (Firestore では undefined はフィールドを削除することを意味するため)
  try {
    const firestoreData = {
      title: game.title,
      description: game.description || null, // Firestore用にnullに変換
      imageUrl: game.imageUrl || null, // Firestore用にnullに変換
      songCount: game.songCount,
      difficulties: game.difficulties,
      minLevel: game.minLevel,
      maxLevel: game.maxLevel,
      lastUpdated: new Date()
    };
    
    await setDoc(doc(db, 'games', gameId), firestoreData);
    console.log(`「${gameTitle}」ゲームデータが正常に保存されました`);
  } catch (error) {
    console.error(`「${gameTitle}」ゲームデータの保存中にエラーが発生しました:`, error);
  }
  
  return game;
}

/**
 * 事前定義されたゲーム設定
 * 人気のあるリズムゲームの定義を素早く作成するのに役立ちます
 */
export const GAME_PRESETS = {
  // バンドリ！ガールズバンドパーティー
  bandori: {
    id: 'bandori',
    title: 'BanG Dream! Girls Band Party',
    description: 'BanG Dream! Girls Band Party (ガルパ) リズムゲーム',
    difficulties: [
      { id: 'EASY', name: 'EASY', color: '#88c600', minLevel: 5, maxLevel: 10 },
      { id: 'NORMAL', name: 'NORMAL', color: '#ffbb00', minLevel: 7, maxLevel: 13 },
      { id: 'HARD', name: 'HARD', color: '#ff7800', minLevel: 11, maxLevel: 18 },
      { id: 'EXPERT', name: 'EXPERT', color: '#ff0000', minLevel: 16, maxLevel: 26 },
      { id: 'SPECIAL', name: 'SPECIAL', color: '#bb00bb', minLevel: 20, maxLevel: 32 }
    ]
  },
  
  // プロジェクトセカイ
  pjsekai: {
    id: 'pjsekai',
    title: 'プロジェクトセカイ',
    description: 'プロジェクトセカイ カラフルステージ！ feat. 初音ミク',
    difficulties: [
      { id: 'EASY', name: 'EASY', color: '#79cc55', minLevel: 3, maxLevel: 9 },
      { id: 'NORMAL', name: 'NORMAL', color: '#4780cc', minLevel: 6, maxLevel: 14 },
      { id: 'HARD', name: 'HARD', color: '#ff9d45', minLevel: 10, maxLevel: 21 },
      { id: 'EXPERT', name: 'EXPERT', color: '#ff606a', minLevel: 17, maxLevel: 30 },
      { id: 'MASTER', name: 'MASTER', color: '#d566dd', minLevel: 24, maxLevel: 38 }
    ]
  },
  
  // ラブライブ！スクールアイドルフェスティバル
  lovelive: {
    id: 'lovelive',
    title: 'ラブライブ！スクールアイドルフェスティバル',
    description: 'ラブライブ！シリーズのスマートフォン向けリズムゲーム',
    difficulties: [
      { id: 'EASY', name: 'EASY', color: '#81c04b', minLevel: 1, maxLevel: 5 },
      { id: 'NORMAL', name: 'NORMAL', color: '#4472c4', minLevel: 4, maxLevel: 9 },
      { id: 'HARD', name: 'HARD', color: '#ff9a3e', minLevel: 6, maxLevel: 11 },
      { id: 'EXPERT', name: 'EXPERT', color: '#de2e42', minLevel: 9, maxLevel: 12 },
      { id: 'MASTER', name: 'MASTER', color: '#ba44bd', minLevel: 10, maxLevel: 14 }
    ]
  },
  
  // アイドルマスター シンデレラガールズ スターライトステージ
  deresute: {
    id: 'deresute',
    title: 'デレステ',
    description: 'アイドルマスター シンデレラガールズ スターライトステージ',
    difficulties: [
      { id: 'DEBUT', name: 'DEBUT', color: '#5aad6d', minLevel: 1, maxLevel: 6 },
      { id: 'REGULAR', name: 'REGULAR', color: '#3871c1', minLevel: 5, maxLevel: 12 },
      { id: 'PRO', name: 'PRO', color: '#e25b36', minLevel: 10, maxLevel: 17 },
      { id: 'MASTER', name: 'MASTER', color: '#ba34ad', minLevel: 15, maxLevel: 25 },
      { id: 'MASTER_PLUS', name: 'MASTER+', color: '#ba34ad', minLevel: 19, maxLevel: 32 }
    ]
  },
  
  // チュウニズム
  chunithm: {
    id: 'chunithm',
    title: 'CHUNITHM',
    description: 'SEGA製アーケードリズムゲーム',
    difficulties: [
      { id: 'BASIC', name: 'BASIC', color: '#18ae60', minLevel: 1, maxLevel: 7 },
      { id: 'ADVANCED', name: 'ADVANCED', color: '#f0a02c', minLevel: 3, maxLevel: 10 },
      { id: 'EXPERT', name: 'EXPERT', color: '#f13750', minLevel: 7, maxLevel: 13 },
      { id: 'MASTER', name: 'MASTER', color: '#9932cc', minLevel: 10, maxLevel: 14 },
      { id: 'ULTIMA', name: 'ULTIMA', color: '#000000', minLevel: 14, maxLevel: 15 },
      { id: 'WORLD_END', name: 'WORLD\'S END', color: '#0080ff', minLevel: 1, maxLevel: 7 }
    ]
  }
};

/**
 * プリセットからゲームを設定する
 * 管理画面から簡単に定義済みのゲームをセットアップできる
 * @param presetId プリセットID
 */
export async function setupGameFromPreset(presetId: string): Promise<Game | null> {
  const preset = GAME_PRESETS[presetId as keyof typeof GAME_PRESETS];
  
  if (!preset) {
    console.error(`プリセット '${presetId}' が見つかりません`);
    return null;
  }
  
  return setupCustomGame(
    preset.id,
    preset.title,
    preset.difficulties,
    preset.description
  );
}

/**
 * 管理画面UIからゲームプリセットを選択するためのヘルパー
 * この関数は、管理画面から呼び出されることを想定しています
 */
export function getGamePresetOptions(): Array<{ id: string, name: string }> {
  return Object.entries(GAME_PRESETS).map(([id, preset]) => ({
    id,
    name: preset.title
  }));
}