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
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // ユーザーがadmin権限を持っているか確認
        const token = await user.getIdTokenResult();
        setIsAdmin(!!token.claims.admin);
        // ユーザーがpremium権限を持っているか確認
        setIsPremium(!!token.claims.premium);
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
    await signInWithEmailAndPassword(auth, email, password);
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
      {!loading && children}
    </AuthContext.Provider>
  );
}