import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth, db, sendEmailVerification } from '../services/mockFirebase'; // Importing the real service from the same file
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{success: boolean, message?: string}>;
  register: (email: string, pass: string, firstName: string, lastName: string, grade: string) => Promise<void>;
  logout: () => void;
  canAccessAdminPanel: boolean;
  canAnnounce: boolean;
  canCreateClub: boolean;
  canDeleteClub: boolean;
  canManageClub: (clubId: string) => boolean;
  refreshUser: () => Promise<void>;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsEmailVerified(firebaseUser.emailVerified);
        const userProfile = await db.getUser(firebaseUser.uid);
        setUser(userProfile);
      } else {
        setUser(null);
        setIsEmailVerified(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
        const userCred = await signInWithEmailAndPassword(auth, email, pass);
        if (!userCred.user.emailVerified) {
            // Option: Prevent login or just warn.
            // We'll let them login but UI might show a banner.
        }
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, message: e.message };
    }
  };

  const register = async (email: string, pass: string, firstName: string, lastName: string, grade: string) => {
    try {
        const isFirst = await db.checkIsFirstUser();
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        
        await sendEmailVerification(cred.user);

        const newUser: User = {
            id: cred.user.uid,
            name: `${firstName} ${lastName}`,
            email: email,
            role: isFirst ? UserRole.OWNER : UserRole.MEMBER,
            grade: grade,
            joinedClubIds: [],
            avatarUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`
        };

        await db.createUserProfile(newUser);
        setUser(newUser);
    } catch (e) {
        console.error(e);
        throw e;
    }
  }

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const refreshUser = async () => {
    if (user) {
        const fresh = await db.getUser(user.id);
        if (fresh) setUser(fresh);
        if (auth.currentUser) {
            await auth.currentUser.reload();
            setIsEmailVerified(auth.currentUser.emailVerified);
        }
    }
  }

  // Permission Logic
  const canAccessAdminPanel = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
  const canAnnounce = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
  const canCreateClub = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
  const canDeleteClub = user?.role === UserRole.OWNER;
  
  const canManageClub = (clubId: string) => {
    if (!user) return false;
    if (user.role === UserRole.OWNER) return true;
    if (user.role === UserRole.CLUB_LEADER && user.leadingClubId === clubId) return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      login, 
      register,
      logout, 
      refreshUser,
      isEmailVerified,
      canAccessAdminPanel, 
      canAnnounce, 
      canCreateClub, 
      canDeleteClub,
      canManageClub 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};