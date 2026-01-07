import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
    auth, 
    db, 
    sendEmailVerification, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from '../services/mockFirebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<{success: boolean, message?: string}>;
  register: (email: string, pass: string, firstName: string, lastName: string, grade: string) => Promise<void>;
  logout: () => void;
  canAccessAdminPanel: boolean;
  canAnnounce: boolean;
  canCreateClub: boolean;
  canDeleteClub: boolean;
  canManageClub: (clubId: string) => boolean;
  refreshUser: () => Promise<void>;
  isEmailVerified: boolean;
  isOwner: boolean;
  isDev: boolean;
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

  const login = async (email: string, pass: string, rememberMe: boolean) => {
    try {
        const userCred = await signInWithEmailAndPassword(auth, email, pass, rememberMe);
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

        // Determine Role: First user is OWNER, "Dev Team" grade becomes DEV, others MEMBER
        let role = UserRole.MEMBER;
        if (isFirst) {
            role = UserRole.OWNER;
        } else if (grade === 'Dev Team') {
            role = UserRole.DEV;
        }

        const newUser: User = {
            id: cred.user.uid,
            name: `${firstName} ${lastName}`,
            email: email,
            role: role,
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
            // Mock reload
            await auth.currentUser.reload();
            setIsEmailVerified(auth.currentUser.emailVerified);
        }
    }
  }

  // Permission Logic
  const canAccessAdminPanel = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const canAnnounce = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const canCreateClub = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const canDeleteClub = user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const isOwner = user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
  const isDev = user?.role === UserRole.DEV;
  
  const canManageClub = (clubId: string) => {
    if (!user) return false;
    if (user.role === UserRole.OWNER || user.role === UserRole.DEV) return true;
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
      canManageClub,
      isOwner,
      isDev
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