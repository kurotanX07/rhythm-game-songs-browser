export type UserRole = 'free' | 'premium' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  subscriptionStatus?: 'active' | 'inactive' | 'trial';
  subscriptionExpiry?: Date;
  createdAt: Date;
  lastLoginAt: Date;
  preferences?: {
    showAdminFields?: boolean;
    defaultGameId?: string;
    theme?: 'light' | 'dark';
  };
}

export interface UserPermissions {
  canViewAdminFields: boolean;
  canUploadData: boolean;
  canManageGames: boolean;
  canViewAllSongs: boolean;
  canExportData: boolean;
  maxSongsPerGame?: number;
}

// 権限チェック用のヘルパー関数の型
export type PermissionChecker = (user: UserProfile | null) => UserPermissions; 