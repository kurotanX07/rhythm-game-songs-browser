// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Extended user interface with membership details
export interface UserWithMembership {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  membershipLevel: 'free' | 'premium' | 'admin';
  membershipExpiry: Date | null;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userMembership: UserWithMembership | null;
  loading: boolean;
  isAdmin: boolean;
  isPremium: boolean; // New property to check if user has premium membership
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userMembership, setUserMembership] = useState<UserWithMembership | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Get user token for admin check
        const token = await user.getIdTokenResult();
        const isUserAdmin = !!token.claims.admin;
        setIsAdmin(isUserAdmin);
        
        // Subscribe to the user's membership document
        const userDocRef = doc(db, 'userMemberships', user.uid);
        const unsubscribeMembership = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            
            // Create membership object
            const membership: UserWithMembership = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              membershipLevel: data.membershipLevel || 'free',
              membershipExpiry: data.membershipExpiry?.toDate() || null
            };
            
            // Determine if membership is valid
            const isValidPremium = 
              membership.membershipLevel === 'premium' && 
              membership.membershipExpiry && 
              membership.membershipExpiry > new Date();
            
            setUserMembership(membership);
            setIsPremium(isUserAdmin || isValidPremium);
          } else {
            // No membership document exists, create one with free tier
            const defaultMembership: UserWithMembership = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              membershipLevel: isUserAdmin ? 'admin' : 'free',
              membershipExpiry: null
            };
            
            // Save the default membership
            setDoc(userDocRef, {
              membershipLevel: defaultMembership.membershipLevel,
              membershipExpiry: null,
              createdAt: new Date()
            });
            
            setUserMembership(defaultMembership);
            setIsPremium(isUserAdmin);
          }
        });
        
        // Cleanup the membership listener when auth state changes
        return () => unsubscribeMembership();
      } else {
        // User is signed out
        setIsAdmin(false);
        setIsPremium(false);
        setUserMembership(null);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  // Login
  async function signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }
  
  // Logout
  async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }
  
  // Password reset
  async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }
  
  const value: AuthContextType = {
    currentUser,
    userMembership,
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