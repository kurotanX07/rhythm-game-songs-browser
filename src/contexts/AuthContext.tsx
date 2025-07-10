import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, signInWithEmailAndPassword, signOut as firebaseSignOut,
  onAuthStateChanged, sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  
  console.log('[AuthContext] Provider initialized');
  
  useEffect(() => {
    console.log('[AuthContext] Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AuthContext] Auth state changed:', user?.uid || 'No user');
      setCurrentUser(user);
      
      if (user) {
        try {
          // ユーザーがadmin権限を持っているか確認
          const token = await user.getIdTokenResult();
          setIsAdmin(!!token.claims.admin);
          // ユーザーがpremium権限を持っているか確認
          setIsPremium(!!token.claims.premium);
          console.log('[AuthContext] User permissions loaded - admin:', !!token.claims.admin, 'premium:', !!token.claims.premium);
        } catch (error) {
          console.error('[AuthContext] Error loading user permissions:', error);
          setIsAdmin(false);
          setIsPremium(false);
        }
      } else {
        setIsAdmin(false);
        setIsPremium(false);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  // ログイン
  async function signIn(email: string, password: string): Promise<void> {
    console.log('[AuthContext] Signing in user...');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[AuthContext] Sign in successful, user:', userCredential.user.uid);
      
      // ユーザーの権限が更新されるまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('[AuthContext] Sign in failed:', error);
      throw error;
    }
  }
  
  // ログアウト
  async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }
  
  // パスワードリセット
  async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }
  
  const value: AuthContextType = {
    currentUser,
    loading,
    isAdmin,
    isPremium,
    signIn,
    signOut,
    resetPassword
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}