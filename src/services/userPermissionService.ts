import { UserProfile, UserPermissions, UserRole } from '../types/User';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';

/**
 * ユーザー権限管理サービス
 */
export class UserPermissionService {
  
  /**
   * ユーザーの権限を取得
   */
  static getPermissions(user: UserProfile | null): UserPermissions {
    if (!user) {
      return {
        canViewAdminFields: false,
        canUploadData: false,
        canManageGames: false,
        canViewAllSongs: true, // 無料ユーザーでも楽曲閲覧は可能
        canExportData: false,
        maxSongsPerGame: 100 // 無料ユーザーの制限
      };
    }

    switch (user.role) {
      case 'admin':
        return {
          canViewAdminFields: true,
          canUploadData: true,
          canManageGames: true,
          canViewAllSongs: true,
          canExportData: true,
          maxSongsPerGame: undefined // 無制限
        };
      
      case 'premium':
        return {
          canViewAdminFields: user.preferences?.showAdminFields || false,
          canUploadData: false,
          canManageGames: false,
          canViewAllSongs: true,
          canExportData: true,
          maxSongsPerGame: undefined // 無制限
        };
      
      case 'free':
      default:
        return {
          canViewAdminFields: false,
          canUploadData: false,
          canManageGames: false,
          canViewAllSongs: true,
          canExportData: false,
          maxSongsPerGame: 100
        };
    }
  }

  /**
   * Firebaseユーザーからユーザープロファイルを取得
   */
  static async getUserProfile(firebaseUser: User): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || data.displayName,
          role: data.role || 'free',
          subscriptionStatus: data.subscriptionStatus,
          subscriptionExpiry: data.subscriptionExpiry?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: new Date(),
          preferences: data.preferences || {}
        };
      } else {
        // 新規ユーザーの場合、デフォルトプロファイルを作成
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
          role: 'free',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          preferences: {}
        };
        
        await this.createUserProfile(newProfile);
        return newProfile;
      }
    } catch (error) {
      console.error('ユーザープロファイル取得エラー:', error);
      return null;
    }
  }

  /**
   * ユーザープロファイルを作成
   */
  static async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        ...profile,
        createdAt: profile.createdAt,
        lastLoginAt: profile.lastLoginAt,
        subscriptionExpiry: profile.subscriptionExpiry
      });
    } catch (error) {
      console.error('ユーザープロファイル作成エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザープロファイルを更新
   */
  static async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        lastLoginAt: new Date()
      });
    } catch (error) {
      console.error('ユーザープロファイル更新エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーの権限を更新（管理者のみ）
   */
  static async updateUserRole(uid: string, role: UserRole, adminUid: string): Promise<void> {
    // 管理者権限チェック
    const adminProfile = await getDoc(doc(db, 'users', adminUid));
    if (!adminProfile.exists() || adminProfile.data().role !== 'admin') {
      throw new Error('管理者権限が必要です');
    }

    try {
      await updateDoc(doc(db, 'users', uid), {
        role,
        lastUpdatedAt: new Date(),
        updatedBy: adminUid
      });
    } catch (error) {
      console.error('ユーザー権限更新エラー:', error);
      throw error;
    }
  }

  /**
   * 管理者かどうかをチェック
   */
  static isAdmin(user: UserProfile | null): boolean {
    return user?.role === 'admin';
  }

  /**
   * プレミアムユーザーかどうかをチェック
   */
  static isPremium(user: UserProfile | null): boolean {
    return user?.role === 'premium' || user?.role === 'admin';
  }

  /**
   * 有効なサブスクリプションを持っているかチェック
   */
  static hasActiveSubscription(user: UserProfile | null): boolean {
    if (!user || user.role === 'free') return false;
    if (user.role === 'admin') return true;
    
    return user.subscriptionStatus === 'active' && 
           (!user.subscriptionExpiry || user.subscriptionExpiry > new Date());
  }
} 