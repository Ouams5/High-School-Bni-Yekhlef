import { initializeApp, deleteApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, collection, getDocs, doc, setDoc, addDoc, updateDoc, 
  deleteDoc, query, where, onSnapshot, arrayUnion, arrayRemove, getDoc, orderBy, limit, writeBatch
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { User, UserRole, Club, Announcement, AppEvent, Project, BugReport, Notification, ChatMessage, Credit, Badge } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyDV1rAcCZTQ5GBxO_ai1_IoVaoR962UnBc",
  authDomain: "highschoolbniyekhlef.firebaseapp.com",
  projectId: "highschoolbniyekhlef",
  storageBucket: "highschoolbniyekhlef.firebasestorage.app",
  messagingSenderId: "1008974819884",
  appId: "1:1008974819884:web:c76ddbfbfd3273ffbe9789",
  measurementId: "G-XCSDTY1LLY"
};

let app: any;
let analytics: any;
export let firestore: any;
export let auth: any;
let isFirebaseAvailable = false;

try {
  app = initializeApp(firebaseConfig);
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics not initialized:", e);
  }
  firestore = getFirestore(app);
  auth = getAuth(app);
  isFirebaseAvailable = true;
} catch (error) {
  console.error("Firebase failed to initialize. Operating in Local Standalone Mode:", error);
}

// --- Local Storage Store & Fallback Data ---
class LocalStoreClass {
  get(key: string, defaultVal: any) {
    const val = localStorage.getItem(`nexus_local_${key}`);
    if (!val) {
      this.set(key, defaultVal);
      return defaultVal;
    }
    try {
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  }
  set(key: string, val: any) {
    localStorage.setItem(`nexus_local_${key}`, JSON.stringify(val));
  }
}
const LocalStore = new LocalStoreClass();

const defaultUsers: Record<string, User> = {};

const defaultClubs: Record<string, Club> = {
  "club-1": {
    id: "club-1",
    name: "AI & Coding Club",
    description: "The official university club for artificial intelligence, machine learning, and fullstack coding projects. We learn together and build amazing apps.",
    leaderId: "system-setup-admin",
    memberIds: [],
    category: "Technology",
    logoUrl: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&q=80&w=200",
    bannerUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
    createdAt: new Date().toISOString(),
    requiredMerit: 15,
    rules: [
      "No spamming of the digital channels and chatrooms.",
      "Submit real-life functional contributions on our code repositories.",
      "Strictly respect academic integrity and co-authored creative rights."
    ]
  },
  "club-2": {
    id: "club-2",
    name: "Robotics Club",
    description: "Building autonomous systems, sensory feedback designs, and internet-of-things controllers.",
    leaderId: "system-setup-admin",
    memberIds: [],
    category: "Engineering",
    logoUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=200",
    bannerUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
    createdAt: new Date().toISOString(),
    requiredMerit: 17,
    rules: [
      "Always prioritize workplace safety protocols inside our university labs.",
      "Never override physical equipment limiters without proper peer authorization.",
      "Maintain strict cleanliness guidelines and organize electronics cabinets."
    ]
  }
};

const defaultAnnouncements: Record<string, Announcement> = {
  "ann-1": {
    id: "ann-1",
    title: "Welcome to UniClub Nexus!",
    content: "We are thrilled to launch the new club management system. Here, you can coordinate club events, explore student projects, issue digital merit badges, and chat in real-time.",
    date: new Date().toISOString(),
    authorName: "Nexus Administration",
    authorEmail: "admin@bniyekhlef.edu",
    isImportant: true
  }
};

const defaultEvents: Record<string, AppEvent> = {
  "event-1": {
    id: "event-1",
    title: "Fullstack Web Development",
    description: "An intensive interactive workshop on React, Tailwind CSS, and Cloud storage systems.",
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    time: "14:00 - 17:00",
    location: "Hall B, Engineering Block",
    clubId: "club-1",
    creatorId: "system-setup-admin"
  }
};

const defaultProjects: Record<string, Project> = {
  "proj-1": {
    id: "proj-1",
    title: "Nexus Companion AI Assistant",
    description: "A study assistant integrated with course syllabi to test students' comprehension and summarize academic lectures in real-time.",
    clubId: "club-1",
    creatorId: "system-setup-admin",
    creatorName: "Nexus Administration",
    createdAt: new Date().toISOString(),
    likes: 5,
    likedByUserIds: [],
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=600"
  }
};

const defaultCredits: Record<string, Credit> = {
  "credit-1": {
    id: "credit-1",
    studentName: "Nexus Support Team",
    clubName: "Nexus Admin",
    description: "System Architect and Core Security Integration lead.",
    date: new Date().toISOString()
  }
};

const tryCall = async <T>(fbAction: () => Promise<T>, fallbackAction: () => Promise<T> | T): Promise<T> => {
  if (isFirebaseAvailable) {
    try {
      return await fbAction();
    } catch (e) {
      console.warn("Firebase action failed, falling back to local storage:", e);
    }
  }
  return await fallbackAction();
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const MEMORY_CACHE: {
  clubs?: CacheEntry<Club[]>;
  clubMap?: Record<string, CacheEntry<Club | null>>;
  projects?: CacheEntry<Project[]>;
  clubProjects?: Record<string, CacheEntry<Project[]>>;
  announcements?: CacheEntry<Announcement[]>;
  clubAnnouncements?: Record<string, CacheEntry<Announcement[]>>;
  events?: CacheEntry<AppEvent[]>;
} = {};

const CACHE_DURATION_MS = 300000; // 5 minutes cache

const getCache = <T>(key: 'clubs' | 'projects' | 'announcements' | 'events'): T | null => {
  const entry = MEMORY_CACHE[key];
  if (entry && (Date.now() - entry.timestamp < CACHE_DURATION_MS)) {
    return entry.data as unknown as T;
  }
  return null;
};

const setCache = <T>(key: 'clubs' | 'projects' | 'announcements' | 'events', data: T) => {
  MEMORY_CACHE[key] = {
    data: data as any,
    timestamp: Date.now()
  };
};

const getClubCache = (clubId: string): Club | null => {
  if (!MEMORY_CACHE.clubMap) MEMORY_CACHE.clubMap = {};
  const entry = MEMORY_CACHE.clubMap[clubId];
  if (entry && (Date.now() - entry.timestamp < CACHE_DURATION_MS)) {
    return entry.data;
  }
  return null;
};

const setClubCache = (clubId: string, data: Club | null) => {
  if (!MEMORY_CACHE.clubMap) MEMORY_CACHE.clubMap = {};
  MEMORY_CACHE.clubMap[clubId] = {
    data,
    timestamp: Date.now()
  };
};

const getClubProjectsCache = (clubId: string): Project[] | null => {
  if (!MEMORY_CACHE.clubProjects) MEMORY_CACHE.clubProjects = {};
  const entry = MEMORY_CACHE.clubProjects[clubId];
  if (entry && (Date.now() - entry.timestamp < CACHE_DURATION_MS)) {
    return entry.data;
  }
  return null;
};

const setClubProjectsCache = (clubId: string, data: Project[]) => {
  if (!MEMORY_CACHE.clubProjects) MEMORY_CACHE.clubProjects = {};
  MEMORY_CACHE.clubProjects[clubId] = {
    data,
    timestamp: Date.now()
  };
};

const getClubAnnouncementsCache = (clubId: string): Announcement[] | null => {
  if (!MEMORY_CACHE.clubAnnouncements) MEMORY_CACHE.clubAnnouncements = {};
  const entry = MEMORY_CACHE.clubAnnouncements[clubId];
  if (entry && (Date.now() - entry.timestamp < CACHE_DURATION_MS)) {
    return entry.data;
  }
  return null;
};

const setClubAnnouncementsCache = (clubId: string, data: Announcement[]) => {
  if (!MEMORY_CACHE.clubAnnouncements) MEMORY_CACHE.clubAnnouncements = {};
  MEMORY_CACHE.clubAnnouncements[clubId] = {
    data,
    timestamp: Date.now()
  };
};

const invalidateClubsCache = () => {
  delete MEMORY_CACHE.clubs;
  delete MEMORY_CACHE.clubMap;
};

const invalidateProjectsCache = () => {
  delete MEMORY_CACHE.projects;
  delete MEMORY_CACHE.clubProjects;
};

const invalidateAnnouncementsCache = () => {
  delete MEMORY_CACHE.announcements;
  delete MEMORY_CACHE.clubAnnouncements;
};

const invalidateEventsCache = () => {
  delete MEMORY_CACHE.events;
};

// Wrapper functions to match AuthContext expectations
export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string, remember: boolean = false) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isFirebaseAvailable && authInstance) {
        try {
            await setPersistence(authInstance, remember ? browserLocalPersistence : browserSessionPersistence);
            const userCred = await firebaseSignIn(authInstance, email, pass);
            return userCred;
        } catch (err) {
            console.warn("Firebase sign in failed, trying fallback mode", err);
            const localUsers = LocalStore.get("users", {});
            const matchedUser: any = Object.values(localUsers).find(
                (u: any) => u.email.toLowerCase() === normalizedEmail && u.plainPassword === pass
            );
            if (matchedUser) {
                localStorage.setItem("nexus_bypass_auth_uid", matchedUser.id);
                return {
                    user: {
                        uid: matchedUser.id,
                        email: matchedUser.email,
                        emailVerified: true,
                        displayName: matchedUser.name
                    }
                };
            }
            throw err;
        }
    } else {
        const localUsers = LocalStore.get("users", {});
        const matchedUser: any = Object.values(localUsers).find(
            (u: any) => u.email.toLowerCase() === normalizedEmail && u.plainPassword === pass
        );
        if (matchedUser) {
            localStorage.setItem("nexus_bypass_auth_uid", matchedUser.id);
            return {
                user: {
                    uid: matchedUser.id,
                    email: matchedUser.email,
                    emailVerified: true,
                    displayName: matchedUser.name
                }
            };
        }
        throw new Error("Incorrect email or password (Standalone mode).");
    }
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    if (isFirebaseAvailable && authInstance) {
        try {
            return await firebaseCreateUser(authInstance, email, pass);
        } catch (err) {
            console.warn("Firebase signup failed, trying local fallback", err);
        }
    }
    const uid = `local-uid-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("nexus_bypass_auth_uid", uid);
    return {
        user: {
            uid: uid,
            email: email,
            emailVerified: true,
            displayName: email.split('@')[0]
        }
    };
};

export const signOut = async (authInstance: any) => {
    localStorage.removeItem("nexus_bypass_auth_uid");
    if (isFirebaseAvailable && authInstance) {
        try {
            return await firebaseSignOut(authInstance);
        } catch (e) {
            console.warn("Firebase signout failed", e);
        }
    }
};

export const sendEmailVerification = async (user: any) => {
    if (isFirebaseAvailable && user && typeof user.sendEmailVerification === 'function') {
        try {
            return await firebaseSendEmailVerification(user);
        } catch (e) {
            console.warn("Email verification omitted in offline fallback", e);
        }
    }
};

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
    let unsubFirebase: any = null;
    if (isFirebaseAvailable && authInstance) {
        try {
            unsubFirebase = firebaseOnAuthStateChanged(authInstance, (fbUser) => {
                if (fbUser) {
                    callback(fbUser);
                } else {
                    const bypassUid = localStorage.getItem("nexus_bypass_auth_uid");
                    if (bypassUid) {
                        const localUsers = LocalStore.get("users", defaultUsers);
                        const user = localUsers[bypassUid];
                        if (user) {
                            callback({
                                uid: user.id,
                                email: user.email,
                                emailVerified: true,
                                displayName: user.name
                            });
                        } else {
                            callback(null);
                        }
                    } else {
                        callback(null);
                    }
                }
            });
        } catch (e) {
            console.warn("Firebase Auth state tracking error:", e);
        }
    }

    if (!unsubFirebase) {
        setTimeout(() => {
            const bypassUid = localStorage.getItem("nexus_bypass_auth_uid");
            if (bypassUid) {
                const localUsers = LocalStore.get("users", defaultUsers);
                const user = localUsers[bypassUid];
                if (user) {
                    callback({
                        uid: user.id,
                        email: user.email,
                        emailVerified: true,
                        displayName: user.name
                    });
                } else {
                    callback(null);
                }
            } else {
                callback(null);
            }
        }, 50);
    }

    return () => {
        if (unsubFirebase) unsubFirebase();
    };
};

export const updateUserPassword = async (user: any, newPassword: string) => {
    if (isFirebaseAvailable && user) {
        try {
            await firebaseUpdatePassword(user, newPassword);
        } catch (e) {
            console.warn("Firebase password sync skipped: ", e);
        }
    }
    try {
        const localUsers = LocalStore.get("users", defaultUsers);
        if (localUsers[user.uid]) {
            localUsers[user.uid].plainPassword = newPassword;
            LocalStore.set("users", localUsers);
        }
    } catch (e) {
        console.warn("Failed to sync local plain password", e);
    }
};

export const adminSendPasswordReset = async (email: string) => {
    if (isFirebaseAvailable) {
        try {
            return await firebaseSendPasswordResetEmail(auth, email);
        } catch (e) {
            console.warn("Firebase reset skipped:", e);
        }
    }
};

// Helper to sanitize user data (migration)
const sanitizeUser = (data: any): User => {
    let role = data.role;
    if (role === 'TEACHER') {
        role = UserRole.MEMBER;
    }
    let finalBadges: Badge[] = [];
    if (data.badges && Array.isArray(data.badges)) {
        finalBadges = data.badges;
    } else if (data.clubBadges && Array.isArray(data.clubBadges)) {
        finalBadges = data.clubBadges.map((b: any) => ({
             id: b.clubId ? `legacy-${b.clubId}` : `legacy-${Math.random()}`,
             type: 'CUSTOM',
             name: b.badgeName || b.name || 'Legacy Badge',
             imageUrl: b.badgeImageUrl || b.imageUrl || '',
             description: b.badgeDescription || b.description || '',
             assignedAt: b.claimedAt || b.assignedAt || new Date().toISOString(),
             clubId: b.clubId
        }));
    }
    finalBadges = finalBadges.map((b: any) => ({
        ...b,
        type: b.type || 'CUSTOM'
    }));

    const meritScore = typeof data.meritScore === 'number' ? Math.min(20, data.meritScore) : 20;
    const meritHistory = Array.isArray(data.meritHistory) ? data.meritHistory : [
      {
         id: `init-${data.id || 'default'}`,
         date: data.lastLogin || new Date().toISOString(),
         amount: 20,
         action: 'SYSTEM' as const,
         reason: 'Account credential security and merit record successfully registered.'
      }
    ];
    const isOutOfSync = data.isOutOfSync !== undefined ? data.isOutOfSync : false;
    const isSuspended = !!data.isSuspended;
    const suspendedUntil = data.suspendedUntil || "";
    const suspendedReason = data.suspendedReason || "";
    const zeroMeritOccurrenceCount = typeof data.zeroMeritOccurrenceCount === 'number' ? data.zeroMeritOccurrenceCount : 0;
    const isSuspendedIndefinitely = !!data.isSuspendedIndefinitely;

    return {
        ...data,
        role: role,
        badges: finalBadges,
        meritScore: meritScore,
        meritHistory: meritHistory,
        isOutOfSync: isOutOfSync,
        isSuspended,
        suspendedUntil,
        suspendedReason,
        zeroMeritOccurrenceCount,
        isSuspendedIndefinitely
    } as User;
};

const sanitizeClub = (data: any): Club => {
  return {
    ...data,
    requiredMerit: typeof data.requiredMerit === 'number' ? data.requiredMerit : 12,
    rules: Array.isArray(data.rules) ? data.rules : [
      "No spamming of the digital channels and chatrooms.",
      "Engage consistently inside assemblies and constructive projects.",
      "Strictly respect academic integrity and co-authored creative rights."
    ]
  };
};

// Service Implementation
class FirebaseService {
  
  // --- Users ---
  async getUser(userId: string): Promise<User | null> {
    return tryCall(
      async () => {
        const docRef = doc(firestore, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return sanitizeUser(docSnap.data());
        }
        return null;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        return users[userId] || null;
      }
    );
  }

  async syncUser(userId: string): Promise<boolean> {
    return tryCall(
      async () => {
        const user = await this.getUser(userId);
        if (user) {
          await setDoc(doc(firestore, "users", userId), user);
          return true;
        }
        return false;
      },
      async () => {
        const user = await this.getUser(userId);
        if (user) {
          const users = LocalStore.get("users", defaultUsers);
          users[userId] = user;
          LocalStore.set("users", users);
          return true;
        }
        return false;
      }
    );
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return sanitizeUser(snapshot.docs[0].data());
        }
        return null;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        const target = Object.values(users).find((user: any) => user.email.toLowerCase() === email.toLowerCase());
        return (target as User) || null;
      }
    );
  }

  async createUserProfile(user: User): Promise<void> {
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "users", user.id), user);
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        users[user.id] = user;
        LocalStore.set("users", users);
      }
    );
  }

  async getAllUsers(): Promise<User[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "users"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => sanitizeUser({ id: doc.id, ...doc.data() }));
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        return Object.values(users);
      }
    );
  }
  
  async updateUserRole(adminId: string, targetUserId: string, newRole: UserRole): Promise<boolean> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", targetUserId);
        await updateDoc(userRef, { role: newRole });
        return true;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[targetUserId]) {
          users[targetUserId].role = newRole;
          LocalStore.set("users", users);
        }
        return true;
      }
    );
  }

  async updateUserIp(userId: string, ip: string): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        await updateDoc(userRef, { 
          ip: ip,
          lastLogin: new Date().toISOString()
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          users[userId].ip = ip;
          users[userId].lastLogin = new Date().toISOString();
          LocalStore.set("users", users);
        }
      }
    );
  }

  async deleteUser(userId: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "users", userId));
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        delete users[userId];
        LocalStore.set("users", users);
      }
    );
  }

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    return tryCall(
      async () => {
        const batch = writeBatch(firestore);
        userIds.forEach(id => {
          const docRef = doc(firestore, "users", id);
          batch.delete(docRef);
        });
        await batch.commit();
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        userIds.forEach(id => {
          delete users[id];
        });
        LocalStore.set("users", users);
      }
    );
  }

  async bulkUpdateUserRole(userIds: string[], newRole: UserRole): Promise<void> {
    return tryCall(
      async () => {
        const batch = writeBatch(firestore);
        userIds.forEach(id => {
          const docRef = doc(firestore, "users", id);
          batch.update(docRef, { role: newRole });
        });
        await batch.commit();
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        userIds.forEach(id => {
          if (users[id]) users[id].role = newRole;
        });
        LocalStore.set("users", users);
      }
    );
  }

  async bulkPromotionRefresh(promotions: { userId: string, passed: boolean }[]): Promise<{ success: number, errors: any[] }> {
    return tryCall(
      async () => {
        const results = { success: 0, errors: [] as any[] };
        
        const qUsers = query(collection(firestore, "users"));
        const snapshotUsers = await getDocs(qUsers);
        const usersMap = new Map<string, any>();
        snapshotUsers.docs.forEach(doc => {
          usersMap.set(doc.id, doc.data());
        });

        const clubsSnapshot = await getDocs(collection(firestore, "clubs"));
        const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        const batch = writeBatch(firestore);

        for (const item of promotions) {
          if (!usersMap.has(item.userId)) {
            results.errors.push({ userId: item.userId, error: "User not found" });
            continue;
          }

          const u = usersMap.get(item.userId);
          const currentGradeNormalized = (u.grade || '').trim().toLowerCase();
          const shouldDelete = currentGradeNormalized.includes('2') && currentGradeNormalized.includes('bac') && item.passed;

          if (shouldDelete) {
            const userRef = doc(firestore, "users", item.userId);
            batch.delete(userRef);
          } else {
            let newGrade = u.grade || 'TC';
            if (currentGradeNormalized.includes('tc') || currentGradeNormalized.includes('tronc')) {
              newGrade = item.passed ? '1 Bac' : 'TC';
            } else if (currentGradeNormalized.includes('1') && currentGradeNormalized.includes('bac')) {
              newGrade = item.passed ? '2 Bac' : '1 Bac';
            } else {
              newGrade = item.passed ? '1 Bac' : 'TC';
            }

            const isSystemRole = u.role === UserRole.ADMIN || u.role === UserRole.DEV || u.role === UserRole.OWNER;
            const newRole = isSystemRole ? u.role : UserRole.MEMBER;
            const keptBadges = (u.badges || []).filter((b: any) => b.type === 'OWNER' || b.type === 'ADMIN' || b.type === 'DEV');

            const userRef = doc(firestore, "users", item.userId);
            batch.update(userRef, {
              grade: newGrade,
              joinedClubIds: [],
              leadingClubId: null,
              role: newRole,
              badges: keptBadges
            });
          }

          clubsData.forEach(club => {
            let clubUpdated = false;
            let finalMembers = club.memberIds || [];
            let finalLeaderId = club.leaderId;

            if (finalMembers.includes(item.userId)) {
              finalMembers = finalMembers.filter((mId: string) => mId !== item.userId);
              clubUpdated = true;
            }

            if (finalLeaderId === item.userId) {
              finalLeaderId = "";
              clubUpdated = true;
            }

            if (clubUpdated) {
              const clubRef = doc(firestore, "clubs", club.id);
              batch.update(clubRef, {
                memberIds: finalMembers,
                leaderId: finalLeaderId
              });
            }
          });

          results.success++;
        }

        await batch.commit();
        return results;
      },
      () => {
        const results = { success: 0, errors: [] as any[] };
        const users = LocalStore.get("users", defaultUsers);
        const clubs = LocalStore.get("clubs", defaultClubs);

        for (const item of promotions) {
          const u = users[item.userId];
          if (!u) {
            results.errors.push({ userId: item.userId, error: "User not found" });
            continue;
          }

          const currentGradeNormalized = (u.grade || '').trim().toLowerCase();
          const shouldDelete = currentGradeNormalized.includes('2') && currentGradeNormalized.includes('bac') && item.passed;

          if (shouldDelete) {
            delete users[item.userId];
          } else {
            let newGrade = u.grade || 'TC';

            if (currentGradeNormalized.includes('tc') || currentGradeNormalized.includes('tronc')) {
              newGrade = item.passed ? '1 Bac' : 'TC';
            } else if (currentGradeNormalized.includes('1') && currentGradeNormalized.includes('bac')) {
              newGrade = item.passed ? '2 Bac' : '1 Bac';
            } else {
              newGrade = item.passed ? '1 Bac' : 'TC';
            }

            const isSystemRole = u.role === UserRole.ADMIN || u.role === UserRole.DEV || u.role === UserRole.OWNER;
            const newRole = isSystemRole ? u.role : UserRole.MEMBER;
            const keptBadges = (u.badges || []).filter((b: any) => b.type === 'OWNER' || b.type === 'ADMIN' || b.type === 'DEV');

            u.grade = newGrade;
            u.joinedClubIds = [];
            u.leadingClubId = undefined;
            u.role = newRole;
            u.badges = keptBadges;
          }

          Object.keys(clubs).forEach(clubId => {
            const club = clubs[clubId];
            if (club.memberIds && club.memberIds.includes(item.userId)) {
              club.memberIds = club.memberIds.filter((mId: string) => mId !== item.userId);
            }
            if (club.leaderId === item.userId) {
              club.leaderId = "";
            }
          });

          results.success++;
        }

        LocalStore.set("users", users);
        LocalStore.set("clubs", clubs);
        return results;
      }
    );
  }

  async checkIsFirstUser(): Promise<boolean> {
    return tryCall(
      async () => {
        const snapshot = await getDocs(query(collection(firestore, "users"), limit(1)));
        return snapshot.empty;
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        return Object.keys(users).length === 0;
      }
    );
  }

  async bulkCreateUsers(users: {email: string, password: string, name: string, grade: string}[]): Promise<{success: number, errors: any[]}> {
    if (isFirebaseAvailable) {
      try {
        let secondaryApp;
        const appName = "SecondaryUserCreator";
        try {
          const existing = getApps().find(a => a.name === appName);
          if (existing) {
            secondaryApp = existing;
          } else {
            secondaryApp = initializeApp(firebaseConfig, appName);
          }
        } catch(e) {
          secondaryApp = initializeApp(firebaseConfig, "SecondaryUserCreator" + Date.now());
        }

        const secondaryAuth = getAuth(secondaryApp);
        const results = { success: 0, errors: [] as any[] };

        for (const u of users) {
          try {
            const cred = await firebaseCreateUser(secondaryAuth, u.email, u.password);
            const newUser: User = {
              id: cred.user.uid,
              name: u.name,
              email: u.email,
              role: UserRole.MEMBER,
              grade: u.grade,
              joinedClubIds: [],
              avatarUrl: `https://ui-avatars.com/api/?name=${u.name}&background=random`,
              ip: 'Created via Bulk Import',
              lastLogin: new Date().toISOString(),
              plainPassword: u.password,
              badges: []
            };
            await this.createUserProfile(newUser);
            results.success++;
          } catch (e: any) {
            results.errors.push({ email: u.email, error: e.code });
          }
        }
        try { await deleteApp(secondaryApp); } catch(e) {}
        return results;
      } catch (err) {
        console.warn("Bulk create failed with firebase auth, fall back to local store", err);
      }
    }

    const localUsers = LocalStore.get("users", defaultUsers);
    const results = { success: 0, errors: [] as any[] };
    for (const u of users) {
      const id = `local-uid-${Math.random().toString(36).substr(2, 9)}`;
      const newUser: User = {
        id,
        name: u.name,
        email: u.email,
        role: UserRole.MEMBER,
        grade: u.grade,
        joinedClubIds: [],
        avatarUrl: `https://ui-avatars.com/api/?name=${u.name}&background=random`,
        ip: 'Created via Bulk Import (Local)',
        lastLogin: new Date().toISOString(),
        plainPassword: u.password,
        badges: []
      };
      localUsers[id] = newUser;
      results.success++;
    }
    LocalStore.set("users", localUsers);
    return results;
  }

  // --- Badges ---
  async addBadgeToUser(userId: string, badge: Badge): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        await updateDoc(userRef, {
          badges: arrayUnion(badge)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const badges = users[userId].badges || [];
          if (!badges.some((b: any) => b.id === badge.id)) {
            badges.push(badge);
          }
          users[userId].badges = badges;
          LocalStore.set("users", users);
        }
      }
    );
  }

  async removeBadgeFromUser(userId: string, badge: Badge): Promise<void> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        await updateDoc(userRef, {
          badges: arrayRemove(badge)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const badges = users[userId].badges || [];
          users[userId].badges = badges.filter((b: any) => b.id !== badge.id);
          LocalStore.set("users", users);
        }
      }
    );
  }

  // --- Clubs ---
  async getClubs(): Promise<Club[]> {
    const cachedAll = getCache<Club[]>('clubs');
    if (cachedAll) return cachedAll;

    const data = await tryCall(
      async () => {
        const snapshot = await getDocs(collection(firestore, "clubs"));
        return snapshot.docs.map(doc => sanitizeClub({ id: doc.id, ...doc.data() }));
      },
      () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        return Object.values(clubs).map(c => sanitizeClub(c));
      }
    );

    setCache<Club[]>('clubs', data);
    return data;
  }

  async getClub(clubId: string): Promise<Club | null> {
    const cachedOne = getClubCache(clubId);
    if (cachedOne !== null) return cachedOne;

    const data = await tryCall(
      async () => {
        const docRef = doc(firestore, "clubs", clubId);
        const s = await getDoc(docRef);
        return s.exists() ? sanitizeClub({ id: s.id, ...s.data() }) : null;
      },
      () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        return clubs[clubId] ? sanitizeClub(clubs[clubId]) : null;
      }
    );

    setClubCache(clubId, data);
    return data;
  }
  
  async createClubWithLeader(clubData: Omit<Club, 'id'>, leaderEmail: string): Promise<boolean> {
    invalidateClubsCache();
    return tryCall(
      async () => {
        const leader = await this.getUserByEmail(leaderEmail);
        if (!leader) return false;
        const clubRef = await addDoc(collection(firestore, "clubs"), {
          ...clubData,
          leaderId: leader.id,
          memberIds: [leader.id]
        });
        const isPrivileged = leader.role === UserRole.OWNER || leader.role === UserRole.ADMIN || leader.role === UserRole.DEV;
        await updateDoc(doc(firestore, "users", leader.id), {
          role: isPrivileged ? leader.role : UserRole.CLUB_LEADER,
          leadingClubId: clubRef.id,
          joinedClubIds: arrayUnion(clubRef.id)
        });
        return true;
      },
      async () => {
        const leader = await this.getUserByEmail(leaderEmail);
        if (!leader) return false;
        const clubs = LocalStore.get("clubs", defaultClubs);
        const clubId = `club-${Math.random().toString(36).substr(2, 9)}`;
        const newClub: Club = {
          id: clubId,
          ...clubData,
          leaderId: leader.id,
          memberIds: [leader.id]
        };
        clubs[clubId] = newClub;
        LocalStore.set("clubs", clubs);

        const users = LocalStore.get("users", defaultUsers);
        if (users[leader.id]) {
          const isPrivileged = users[leader.id].role === UserRole.OWNER || users[leader.id].role === UserRole.ADMIN || users[leader.id].role === UserRole.DEV;
          users[leader.id].role = isPrivileged ? users[leader.id].role : UserRole.CLUB_LEADER;
          users[leader.id].leadingClubId = clubId;
          const joined = users[leader.id].joinedClubIds || [];
          if (!joined.includes(clubId)) joined.push(clubId);
          users[leader.id].joinedClubIds = joined;
          LocalStore.set("users", users);
        }
        return true;
      }
    );
  }

  async deleteClub(clubId: string): Promise<void> {
    invalidateClubsCache();
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "clubs", clubId));
      },
      () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        delete clubs[clubId];
        LocalStore.set("clubs", clubs);
      }
    );
  }

  async updateClub(clubId: string, updates: Partial<Club>): Promise<boolean> {
      invalidateClubsCache();
      return tryCall(
          async () => {
              const clubRef = doc(firestore, "clubs", clubId);
              await updateDoc(clubRef, updates);
              return true;
          },
          async () => {
              const clubs = LocalStore.get("clubs", defaultClubs);
              if (clubs[clubId]) {
                  clubs[clubId] = { ...clubs[clubId], ...updates };
                  LocalStore.set("clubs", clubs);
                  return true;
              }
              return false;
          }
      );
  }

  async updateClubSettings(clubId: string, requiredMerit: number, rules: string[], chatRules?: string[]): Promise<boolean> {
    invalidateClubsCache();
    return tryCall(
      async () => {
        const clubRef = doc(firestore, "clubs", clubId);
        await updateDoc(clubRef, {
          requiredMerit,
          rules,
          chatRules: chatRules || []
        });
        return true;
      },
      async () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        if (clubs[clubId]) {
          clubs[clubId].requiredMerit = requiredMerit;
          clubs[clubId].rules = rules;
          clubs[clubId].chatRules = chatRules || [];
          LocalStore.set("clubs", clubs);
          return true;
        }
        return false;
      }
    );
  }

  async saveClubRegistrationOption(clubId: string, requireRegistrationCode: boolean): Promise<boolean> {
    invalidateClubsCache();
    return tryCall(
        async () => {
            const clubRef = doc(firestore, "clubs", clubId);
            await updateDoc(clubRef, { requireRegistrationCode });
            return true;
        },
        async () => {
            const clubs = LocalStore.get("clubs", defaultClubs);
            if (clubs[clubId]) {
                clubs[clubId].requireRegistrationCode = requireRegistrationCode;
                LocalStore.set("clubs", clubs);
                return true;
            }
            return false;
        }
    );
  }

  async generateRegistrationCode(clubId: string, hours: number, createdBy: string): Promise<string> {
    invalidateClubsCache();
    const minHours = 1;
    const maxHours = 48;
    const validHours = Math.max(minHours, Math.min(hours, maxHours));
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + validHours * 60 * 60 * 1000).toISOString();
    
    await tryCall(
        async () => {
            const clubRef = doc(firestore, "clubs", clubId);
            await updateDoc(clubRef, {
                registrationCodes: arrayUnion({ code: randomCode, expiresAt, createdBy })
            });
        },
        async () => {
            const clubs = LocalStore.get("clubs", defaultClubs);
            if (clubs[clubId]) {
                const codes = clubs[clubId].registrationCodes || [];
                codes.push({ code: randomCode, expiresAt, createdBy });
                clubs[clubId].registrationCodes = codes;
                LocalStore.set("clubs", clubs);
            }
        }
    );
    return randomCode;
  }

  async verifyRegistrationCode(clubId: string, code: string): Promise<boolean> {
      const club = await this.getClub(clubId);
      if (!club || !club.registrationCodes) return false;
      const found = club.registrationCodes.find(c => c.code === code);
      if (!found) return false;
      return new Date(found.expiresAt).getTime() > Date.now();
  }

  async consumeRegistrationCode(clubId: string, code: string, userId: string): Promise<boolean> {
      invalidateClubsCache();
      return tryCall(
          async () => {
              const userRef = doc(firestore, "users", userId);
              const uDoc = await getDoc(userRef);
              let userName = "Unknown";
              if (uDoc.exists()) {
                  userName = uDoc.data().name;
              }
 
              const clubRef = doc(firestore, "clubs", clubId);
              const cDoc = await getDoc(clubRef);
              if (cDoc.exists()) {
                  let codes = cDoc.data().registrationCodes || [];
                  const foundCode = codes.find((c: any) => c.code === code);
                  if (foundCode) {
                      codes = codes.filter((c: any) => c.code !== code);
                      await updateDoc(clubRef, {
                          registrationCodes: codes,
                          usedRegistrationCodes: arrayUnion({
                              code,
                              usedBy: userId,
                              userName: userName,
                              usedAt: new Date().toISOString()
                          })
                      });
                      return true;
                  }
              }
              return false;
          },
          async () => {
              const users = LocalStore.get("users", defaultUsers);
              const userName = users[userId] ? users[userId].name : "Unknown";
 
              const clubs = LocalStore.get("clubs", defaultClubs);
              if (clubs[clubId]) {
                  let codes = clubs[clubId].registrationCodes || [];
                  const foundCode = codes.find(c => c.code === code);
                  if (foundCode) {
                      codes = codes.filter(c => c.code !== code);
                      clubs[clubId].registrationCodes = codes;
                      
                      const used = clubs[clubId].usedRegistrationCodes || [];
                      used.push({
                          code,
                          usedBy: userId,
                          userName: userName,
                          usedAt: new Date().toISOString()
                      });
                      clubs[clubId].usedRegistrationCodes = used;
                      
                      LocalStore.set("clubs", clubs);
                      return true;
                  }
              }
              return false;
          }
      );
  }
 
  async joinClub(userId: string, clubId: string): Promise<void> {
    invalidateClubsCache();
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const clubRef = doc(firestore, "clubs", clubId);
        await updateDoc(userRef, {
          joinedClubIds: arrayUnion(clubId)
        });
        await updateDoc(clubRef, {
          memberIds: arrayUnion(userId)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const joined = users[userId].joinedClubIds || [];
          if (!joined.includes(clubId)) joined.push(clubId);
          users[userId].joinedClubIds = joined;
          LocalStore.set("users", users);
        }
        const clubs = LocalStore.get("clubs", defaultClubs);
        if (clubs[clubId]) {
          const members = clubs[clubId].memberIds || [];
          if (!members.includes(userId)) members.push(userId);
          clubs[clubId].memberIds = members;
          LocalStore.set("clubs", clubs);
        }
      }
    );
  }
 
  async leaveClub(userId: string, clubId: string): Promise<void> {
    invalidateClubsCache();
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const clubRef = doc(firestore, "clubs", clubId);
        try {
          await updateDoc(userRef, {
            joinedClubIds: arrayRemove(clubId)
          });
        } catch (e: any) {
          if (e.code !== 'not-found') throw e;
        }
        await updateDoc(clubRef, {
          memberIds: arrayRemove(userId)
        });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const joined = users[userId].joinedClubIds || [];
          users[userId].joinedClubIds = joined.filter((id: string) => id !== clubId);
          LocalStore.set("users", users);
        }
        const clubs = LocalStore.get("clubs", defaultClubs);
        if (clubs[clubId]) {
          const members = clubs[clubId].memberIds || [];
          clubs[clubId].memberIds = members.filter((id: string) => id !== userId);
          LocalStore.set("clubs", clubs);
        }
      }
    );
  }

  async kickMember(leaderId: string, clubId: string, memberId: string): Promise<boolean> {
    await this.leaveClub(memberId, clubId);
    return true;
  }

  async kickMemberWithRecord(leaderId: string, clubId: string, memberId: string, reason: string, brokenRule: string, reportToAdmin: boolean): Promise<boolean> {
    return tryCall(
      async () => {
        await this.leaveClub(memberId, clubId);
        
        const club = await this.getClub(clubId);
        const clubName = club ? club.name : "Club";

        const userRef = doc(firestore, "users", memberId);
        const uDoc = await getDoc(userRef);
        let uName = "Unknown";
        if (uDoc.exists()) {
          const userData = sanitizeUser(uDoc.data());
          uName = userData.name;
          const oldDiscipline = userData.disciplineRecord || [];

          const newRecord: DisciplineRecord = {
            id: `kick-${Date.now()}`,
            date: new Date().toISOString(),
            clubId,
            clubName,
            reason,
            brokenRule,
            reportedToAdmin: reportToAdmin
          };

          const updates: any = {
            disciplineRecord: [...oldDiscipline, newRecord]
          };

          if (reportToAdmin) {
            const currentScore = userData.meritScore ?? 20;
            updates.meritScore = 0;
            updates.isSuspended = true;
            updates.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            updates.suspendedReason = `Administrative disciplinary referral (Violation: ${brokenRule}). Suspended pending review.`;
            
            const oldHistory = userData.meritHistory || [];
            const newMeritRecord: MeritRecord = {
              id: `kick-deduct-${Date.now()}`,
              date: new Date().toISOString(),
              amount: -currentScore,
              action: 'DEDUCTION',
              reason: `Kicked and reported to admin. Reason: ${reason}`,
              brokenRule
            };
            updates.meritHistory = [...oldHistory, newMeritRecord];
          }

          await updateDoc(userRef, updates);
        }

        if (reportToAdmin) {
            const reportRef = doc(collection(firestore, "admin_reports"));
            await setDoc(reportRef, {
                id: reportRef.id,
                userId: memberId,
                userName: uName,
                clubId: clubId,
                clubName: clubName,
                reason: reason,
                brokenRule: brokenRule,
                clubRules: club ? club.rules || [] : [],
                date: new Date().toISOString(),
                resolved: false
            });
        }

        await addDoc(collection(firestore, "notifications"), {
          title: `Membership Dismissed: ${clubName}`,
          message: `You were kicked from ${clubName}. Rule: ${brokenRule}. Reason: ${reason} (Recorded)`,
          date: new Date().toISOString(),
          read: false,
          type: 'alert',
          clubId: clubId
        });

        return true;
      },
      async () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        const users = LocalStore.get("users", defaultUsers);
        const reports = LocalStore.get("admin_reports", {});
        const notifications = LocalStore.get("notifications", {});

        if (clubs[clubId]) {
          clubs[clubId].memberIds = (clubs[clubId].memberIds || []).filter((id: string) => id !== memberId);
          LocalStore.set("clubs", clubs);
        }

        const clubName = clubs[clubId] ? clubs[clubId].name : "Club";

        if (users[memberId]) {
          const u = sanitizeUser(users[memberId]);
          const oldDiscipline = u.disciplineRecord || [];

          const newRecord: DisciplineRecord = {
            id: `kick-${Date.now()}`,
            date: new Date().toISOString(),
            clubId,
            clubName,
            reason,
            brokenRule,
            reportedToAdmin: reportToAdmin
          };

          u.joinedClubIds = (u.joinedClubIds || []).filter((id: string) => id !== clubId);
          u.disciplineRecord = [...oldDiscipline, newRecord];

          if (reportToAdmin) {
            const currentScore = u.meritScore ?? 20;
            u.meritScore = 0;
            u.isSuspended = true;
            u.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            u.suspendedReason = `Administrative disciplinary referral (Violation: ${brokenRule}). Suspended pending review.`;
            
            const oldHistory = u.meritHistory || [];
            const newMeritRecord: MeritRecord = {
              id: `kick-deduct-${Date.now()}`,
              date: new Date().toISOString(),
              amount: -currentScore,
              action: 'DEDUCTION',
              reason: `Kicked and reported to admin. Reason: ${reason}`,
              brokenRule
            };
            u.meritHistory = [...oldHistory, newMeritRecord];
          }

          users[memberId] = u;
          LocalStore.set("users", users);
        }

        if (reportToAdmin) {
            const rid = `report-${Date.now()}`;
            reports[rid] = {
                id: rid,
                userId: memberId,
                userName: users[memberId] ? users[memberId].name : "Unknown",
                clubId,
                clubName,
                reason,
                brokenRule,
                clubRules: clubs[clubId] ? clubs[clubId].rules || [] : [],
                date: new Date().toISOString(),
                resolved: false
            };
            LocalStore.set("admin_reports", reports);
        }

        const notificationId = `noti-${Date.now()}`;
        notifications[notificationId] = {
          id: notificationId,
          title: `Membership Dismissed: ${clubName}`,
          message: `You were kicked from ${clubName}. Rule: ${brokenRule}. Reason: ${reason} (Recorded)`,
          date: new Date().toISOString(),
          read: false,
          type: 'alert',
          clubId: clubId,
          userId: memberId
        };
        LocalStore.set("notifications", notifications);

        return true;
      }
    );
  }

  async getAdminReports(): Promise<AdminReport[]> {
      return tryCall(
          async () => {
              const q = query(collection(firestore, "admin_reports"));
              const snapshot = await getDocs(q);
              return snapshot.docs.map(doc => doc.data() as AdminReport);
          },
          async () => {
              const reports = LocalStore.get("admin_reports", {});
              return Object.values(reports) as AdminReport[];
          }
      );
  }

  async resolveAdminReport(reportId: string): Promise<boolean> {
      return tryCall(
          async () => {
              const ref = doc(firestore, "admin_reports", reportId);
              await updateDoc(ref, { resolved: true });
              return true;
          },
          async () => {
              const reports = LocalStore.get("admin_reports", {});
              if (reports[reportId]) {
                  reports[reportId].resolved = true;
                  LocalStore.set("admin_reports", reports);
              }
              return true;
          }
      );
  }

  async kickMemberWithDeduction(leaderId: string, clubId: string, memberId: string, deductionAmount: number, reason: string, brokenRule: string, hasValidReason?: boolean): Promise<boolean> {
    return tryCall(
      async () => {
        await this.leaveClub(memberId, clubId);
        
        const club = await this.getClub(clubId);
        const clubName = club ? club.name : "Club";

        const userRef = doc(firestore, "users", memberId);
        const uDoc = await getDoc(userRef);
        if (uDoc.exists()) {
          const userData = sanitizeUser(uDoc.data());
          const oldScore = userData.meritScore ?? 20;
          const newScore = Math.max(0, oldScore - deductionAmount);
          const oldHistory = userData.meritHistory || [];

          const newRecord: MeritRecord = {
            id: `kick-${Date.now()}`,
            date: new Date().toISOString(),
            amount: -deductionAmount,
            action: 'DEDUCTION',
            reason: `Kicked from ${clubName}. Reason: ${reason}`,
            brokenRule
          };

          const updates: any = {
            meritScore: newScore,
            meritHistory: [...oldHistory, newRecord]
          };

          if (newScore === 0) {
            const oldOccurrences = userData.zeroMeritOccurrenceCount ?? 0;
            const newOccurrences = oldOccurrences + 1;
            updates.zeroMeritOccurrenceCount = newOccurrences;
            updates.isSuspended = true;
            if (newOccurrences >= 3) {
              updates.isSuspendedIndefinitely = true;
              updates.suspendedUntil = "";
              updates.suspendedReason = `Merit reached zero 3 times (Violation: ${brokenRule}). Indefinite suspension enforced. Please contact the administrative office for re-enrollment discussion.`;
            } else {
              updates.isSuspendedIndefinitely = false;
              updates.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
              updates.suspendedReason = `Merit reached zero (Occurrence #${newOccurrences}, Violation: ${brokenRule}). Standard 48-hour cooling suspension applied.`;
            }
          }

          await updateDoc(userRef, updates);
        }

        if (hasValidReason === false) {
          const leaderRef = doc(firestore, "users", leaderId);
          const leaderDoc = await getDoc(leaderRef);
          if (leaderDoc.exists()) {
            const leaderData = sanitizeUser(leaderDoc.data());
            const oldLeaderScore = leaderData.meritScore ?? 20;
            const newLeaderScore = Math.max(0, oldLeaderScore - 13);
            const oldLeaderHistory = leaderData.meritHistory || [];

            const leaderRecord: MeritRecord = {
              id: `leader-penalty-${Date.now()}`,
              date: new Date().toISOString(),
              amount: -13,
              action: 'DEDUCTION',
              reason: `Frivolous Disciplinary Action: Unjustified expulsion of student from ${clubName}.`,
              brokenRule: "Server Governance Code Section III.A (Abuse of Disciplinary Expulsion Powers)"
            };

            const leaderUpdates: any = {
              meritScore: newLeaderScore,
              meritHistory: [...oldLeaderHistory, leaderRecord],
              isSuspended: true,
              suspendedUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
              suspendedReason: `Suspended for 12 hours due to abusive/unjustified expulsion of a member from ${clubName} without a valid reason.`
            };

            if (newLeaderScore === 0) {
              const oldOccurrences = leaderData.zeroMeritOccurrenceCount ?? 0;
              const newOccurrences = oldOccurrences + 1;
              leaderUpdates.zeroMeritOccurrenceCount = newOccurrences;
              if (newOccurrences >= 3) {
                leaderUpdates.isSuspendedIndefinitely = true;
                leaderUpdates.suspendedUntil = "";
                leaderUpdates.suspendedReason = `Merit reached zero 3 times. Indefinite suspension enforced. Placed hold on leadership and membership rights.`;
              } else {
                leaderUpdates.isSuspendedIndefinitely = false;
                leaderUpdates.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                leaderUpdates.suspendedReason = `Merit reached zero (Occurrence #${newOccurrences}) after leadership abuse deduction. 48-hour cooling suspension applied.`;
              }
            }

            await updateDoc(leaderRef, leaderUpdates);
          }
        }

        await addDoc(collection(firestore, "notifications"), {
          title: `Membership Dismissed: ${clubName}`,
          message: `You were kicked from ${clubName} and lost ${deductionAmount} Merit. Rule: ${brokenRule}. Reason: ${reason}`,
          date: new Date().toISOString(),
          read: false,
          type: 'alert',
          clubId: clubId
        });

        return true;
      },
      async () => {
        const clubs = LocalStore.get("clubs", defaultClubs);
        const users = LocalStore.get("users", defaultUsers);
        const notifications = LocalStore.get("notifications", {});

        if (clubs[clubId]) {
          clubs[clubId].memberIds = (clubs[clubId].memberIds || []).filter((id: string) => id !== memberId);
          LocalStore.set("clubs", clubs);
        }

        const clubName = clubs[clubId] ? clubs[clubId].name : "Club";

        if (users[memberId]) {
          const u = sanitizeUser(users[memberId]);
          const oldScore = u.meritScore ?? 20;
          const newScore = Math.max(0, oldScore - deductionAmount);
          const oldHistory = u.meritHistory || [];

          const newRecord: MeritRecord = {
            id: `kick-${Date.now()}`,
            date: new Date().toISOString(),
            amount: -deductionAmount,
            action: 'DEDUCTION',
            reason: `Kicked from ${clubName}. Reason: ${reason}`,
            brokenRule
          };

          u.joinedClubIds = (u.joinedClubIds || []).filter((id: string) => id !== clubId);
          u.meritScore = newScore;
          u.meritHistory = [...oldHistory, newRecord];

          if (newScore === 0) {
            const oldOccurrences = u.zeroMeritOccurrenceCount ?? 0;
            const newOccurrences = oldOccurrences + 1;
            u.zeroMeritOccurrenceCount = newOccurrences;
            u.isSuspended = true;
            if (newOccurrences >= 3) {
              u.isSuspendedIndefinitely = true;
              u.suspendedUntil = "";
              u.suspendedReason = `Merit reached zero 3 times (Violation: ${brokenRule}). Indefinite suspension enforced. Please contact the administrative office for re-enrollment discussion.`;
            } else {
              u.isSuspendedIndefinitely = false;
              u.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
              u.suspendedReason = `Merit reached zero (Occurrence #${newOccurrences}, Violation: ${brokenRule}). Standard 48-hour cooling suspension applied.`;
            }
          }

          users[memberId] = u;
          LocalStore.set("users", users);
        }

        if (hasValidReason === false && users[leaderId]) {
          const l = sanitizeUser(users[leaderId]);
          const oldLeaderScore = l.meritScore ?? 20;
          const newLeaderScore = Math.max(0, oldLeaderScore - 13);
          const oldLeaderHistory = l.meritHistory || [];

          const leaderRecord: MeritRecord = {
            id: `leader-penalty-${Date.now()}`,
            date: new Date().toISOString(),
            amount: -13,
            action: 'DEDUCTION',
            reason: `Frivolous Disciplinary Action: Unjustified expulsion of student from ${clubName}.`,
            brokenRule: "Server Governance Code Section III.A (Abuse of Disciplinary Expulsion Powers)"
          };

          l.meritScore = newLeaderScore;
          l.meritHistory = [...oldLeaderHistory, leaderRecord];
          l.isSuspended = true;
          l.suspendedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
          l.suspendedReason = `Suspended for 12 hours due to abusive/unjustified expulsion of a member from ${clubName} without a valid reason.`;

          if (newLeaderScore === 0) {
            const oldOccurrences = l.zeroMeritOccurrenceCount ?? 0;
            const newOccurrences = oldOccurrences + 1;
            l.zeroMeritOccurrenceCount = newOccurrences;
            if (newOccurrences >= 3) {
              l.isSuspendedIndefinitely = true;
              l.suspendedUntil = "";
              l.suspendedReason = `Merit reached zero 3 times. Indefinite suspension enforced. Placed hold on leadership and membership rights.`;
            } else {
              l.isSuspendedIndefinitely = false;
              l.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
              l.suspendedReason = `Merit reached zero (Occurrence #${newOccurrences}) after leadership abuse deduction. 48-hour cooling suspension applied.`;
            }
          }

          users[leaderId] = l;
          LocalStore.set("users", users);
        }

        const notifId = `notif-kick-${Date.now()}`;
        notifications[notifId] = {
          id: notifId,
          title: `Membership Dismissed: ${clubName}`,
          message: `You were kicked from ${clubName} and lost ${deductionAmount} Merit. Rule: ${brokenRule}. Reason: ${reason}`,
          date: new Date().toISOString(),
          read: false,
          type: 'alert'
        };
        LocalStore.set("notifications", notifications);

        return true;
      }
    );
  }

  async recoverMerit(userId: string, amount: number, reason: string): Promise<boolean> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const uDoc = await getDoc(userRef);
        if (uDoc.exists()) {
          const userData = sanitizeUser(uDoc.data());
          const oldScore = userData.meritScore ?? 20;
          const newScore = Math.min(20, oldScore + amount);
          const oldHistory = userData.meritHistory || [];

          const newRecord: MeritRecord = {
            id: `recov-${Date.now()}`,
            date: new Date().toISOString(),
            amount: amount,
            action: 'GAIN',
            reason: reason
          };

          await updateDoc(userRef, {
            meritScore: newScore,
            meritHistory: [...oldHistory, newRecord]
          });
        }
        return true;
      },
      async () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const u = sanitizeUser(users[userId]);
          const oldScore = u.meritScore ?? 20;
          const newScore = Math.min(20, oldScore + amount);
          const oldHistory = u.meritHistory || [];

          const newRecord: MeritRecord = {
            id: `recov-${Date.now()}`,
            date: new Date().toISOString(),
            amount: amount,
            action: 'GAIN',
            reason: reason
          };

          u.meritScore = newScore;
          u.meritHistory = [...oldHistory, newRecord];
          users[userId] = u;
          LocalStore.set("users", users);
        }
        return true;
      }
    );
  }

  // --- Announcements ---
  async getAnnouncements(clubId?: string): Promise<Announcement[]> {
    if (clubId) {
      const cachedClub = getClubAnnouncementsCache(clubId);
      if (cachedClub) return cachedClub;
    } else {
      const cachedAll = getCache<Announcement[]>('announcements');
      if (cachedAll) return cachedAll;
    }

    const data = await tryCall(
      async () => {
        let q;
        if (clubId) {
          q = query(collection(firestore, "announcements"), where("clubId", "==", clubId));
        } else {
          q = query(collection(firestore, "announcements"), orderBy("date", "desc"));
        }
        const snapshot = await getDocs(q);
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Announcement));
        announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return announcements;
      },
      () => {
        const announcements = LocalStore.get("announcements", defaultAnnouncements);
        const list = Object.values(announcements) as Announcement[];
        const filtered = clubId ? list.filter(a => a.clubId === clubId) : list;
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    );

    if (clubId) {
      setClubAnnouncementsCache(clubId, data);
    } else {
      setCache<Announcement[]>('announcements', data);
    }
    return data;
  }

  async addAnnouncement(a: Announcement): Promise<void> {
    invalidateAnnouncementsCache();
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "announcements", a.id), a);
        await addDoc(collection(firestore, "notifications"), {
          title: a.clubId ? "New Club Announcement" : "New Global Announcement",
          message: a.title,
          date: new Date().toISOString(),
          read: false,
          type: a.isImportant ? 'alert' : 'info',
          clubId: a.clubId || null,
          announcementId: a.id
        });
      },
      () => {
        const announcements = LocalStore.get("announcements", defaultAnnouncements);
        announcements[a.id] = a;
        LocalStore.set("announcements", announcements);

        const notifications = LocalStore.get("notifications", {});
        const notifId = `notif-${Math.random().toString(36).substr(2, 9)}`;
        notifications[notifId] = {
          id: notifId,
          title: a.clubId ? "New Club Announcement" : "New Global Announcement",
          message: a.title,
          date: new Date().toISOString(),
          read: false,
          type: a.isImportant ? 'alert' : 'info',
          clubId: a.clubId || null,
          announcementId: a.id
        };
        LocalStore.set("notifications", notifications);
      }
    );
  }

  async deleteAnnouncement(id: string): Promise<void> {
    invalidateAnnouncementsCache();
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "announcements", id));
        const q = query(collection(firestore, "notifications"), where("announcementId", "==", id));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      },
      () => {
        const announcements = LocalStore.get("announcements", defaultAnnouncements);
        delete announcements[id];
        LocalStore.set("announcements", announcements);

        const notifications = LocalStore.get("notifications", {});
        const updated = { ...notifications };
        for (const notifId in updated) {
          if (updated[notifId].announcementId === id) {
            delete updated[notifId];
          }
        }
        LocalStore.set("notifications", updated);
      }
    );
  }

  async deleteAllAnnouncements(): Promise<void> {
    invalidateAnnouncementsCache();
    return tryCall(
      async () => {
        const snapshot = await getDocs(collection(firestore, "announcements"));
        const deletePromises = snapshot.docs.map(doc => this.deleteAnnouncement(doc.id));
        await Promise.all(deletePromises);
      },
      () => {
        LocalStore.set("announcements", {});
        LocalStore.set("notifications", {});
      }
    );
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "notifications"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification));
      },
      () => {
        const notifications = LocalStore.get("notifications", {});
        return (Object.values(notifications) as Notification[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    );
  }

  async deleteNotification(id: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "notifications", id));
      },
      () => {
        const notifications = LocalStore.get("notifications", {});
        delete notifications[id];
        LocalStore.set("notifications", notifications);
      }
    );
  }

  // --- Events ---
  async getEvents(): Promise<AppEvent[]> {
    const cachedAll = getCache<AppEvent[]>('events');
    if (cachedAll) return cachedAll;

    const data = await tryCall(
      async () => {
        const q = query(collection(firestore, "events"), orderBy("date", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent));
      },
      () => {
        const events = LocalStore.get("events", defaultEvents);
        return (Object.values(events) as AppEvent[]).sort((a, b) => a.date.localeCompare(b.date));
      }
    );

    setCache<AppEvent[]>('events', data);
    return data;
  }
  async addEvent(e: AppEvent): Promise<void> {
    invalidateEventsCache();
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "events", e.id), e);
      },
      () => {
        const events = LocalStore.get("events", defaultEvents);
        events[e.id] = e;
        LocalStore.set("events", events);
      }
    );
  }
  async deleteEvent(id: string): Promise<void> {
    invalidateEventsCache();
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "events", id));
      },
      () => {
        const events = LocalStore.get("events", defaultEvents);
        delete events[id];
        LocalStore.set("events", events);
      }
    );
  }

  // --- Projects ---
  async getProjects(clubId?: string): Promise<Project[]> {
    if (clubId) {
      const cachedClub = getClubProjectsCache(clubId);
      if (cachedClub) return cachedClub;
    } else {
      const cachedAll = getCache<Project[]>('projects');
      if (cachedAll) return cachedAll;
    }

    const data = await tryCall(
      async () => {
        let q;
        if (clubId) {
          q = query(collection(firestore, "projects"), where("clubId", "==", clubId));
        } else {
          q = query(collection(firestore, "projects"));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        const list = Object.values(projects) as Project[];
        return clubId ? list.filter(p => p.clubId === clubId) : list;
      }
    );

    if (clubId) {
      setClubProjectsCache(clubId, data);
    } else {
      setCache<Project[]>('projects', data);
    }
    return data;
  }
  async addProject(p: Project): Promise<void> {
    invalidateProjectsCache();
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "projects", p.id), p);
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        projects[p.id] = p;
        LocalStore.set("projects", projects);
      }
    );
  }
  
  async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
    invalidateProjectsCache();
    return tryCall(
      async () => {
        const ref = doc(firestore, "projects", projectId);
        await updateDoc(ref, data);
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        if (projects[projectId]) {
          projects[projectId] = { ...projects[projectId], ...data };
          LocalStore.set("projects", projects);
        }
      }
    );
  }

  async deleteProject(id: string): Promise<void> {
    invalidateProjectsCache();
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "projects", id));
      },
      () => {
        const projects = LocalStore.get("projects", defaultProjects);
        delete projects[id];
        LocalStore.set("projects", projects);
      }
    );
  }
  
  // --- Bug Reports ---
  async addBugReport(b: BugReport): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "bugs"), b);
      },
      () => {
        const bugs = LocalStore.get("bugs", {});
        const id = `bug-${Math.random().toString(36).substr(2, 9)}`;
        bugs[id] = { id, ...b };
        LocalStore.set("bugs", bugs);
      }
    );
  }

  async getBugReports(): Promise<BugReport[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "bugs"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BugReport));
      },
      () => {
        const bugs = LocalStore.get("bugs", {});
        return (Object.values(bugs) as BugReport[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }
    );
  }

  // --- Dev Chat ---
  subscribeToDevChat(callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "dev_chat"), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          callback(messages);
        });
      } catch (e) {
        console.warn("Dev chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      callback(LocalStore.get("dev_chat", []));
    }, 1000);
    callback(LocalStore.get("dev_chat", []));
    return () => clearInterval(interval);
  }

  async sendDevMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "dev_chat"), message);
      },
      () => {
        const list = LocalStore.get("dev_chat", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("dev_chat", list);
      }
    );
  }

  // --- Event Planning Chat ---
  subscribeToEventPlanningChat(callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "event_planning_chat"), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          callback(messages);
        });
      } catch (e) {
        console.warn("Event planning chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      callback(LocalStore.get("event_planning_chat", []));
    }, 1000);
    callback(LocalStore.get("event_planning_chat", []));
    return () => clearInterval(interval);
  }

  async sendEventPlanningMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "event_planning_chat"), message);
      },
      () => {
        const list = LocalStore.get("event_planning_chat", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("event_planning_chat", list);
      }
    );
  }

  // --- General Chat ---
  subscribeToGeneralChat(callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "general_chat"), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          callback(messages);
        });
      } catch (e) {
        console.warn("General chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      callback(LocalStore.get("general_chat", []));
    }, 1000);
    callback(LocalStore.get("general_chat", []));
    return () => clearInterval(interval);
  }

  async sendGeneralMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "general_chat"), message);
      },
      () => {
        const list = LocalStore.get("general_chat", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("general_chat", list);
      }
    );
  }

  // --- Club Chat ---
  subscribeToClubChat(clubId: string, callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(firestore, "club_chats"), where("clubId", "==", clubId));
        return onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          callback(messages);
        });
      } catch (e) {
        console.warn("Club chat subscription failed, utilizing local pool:", e);
      }
    }
    const interval = setInterval(() => {
      const all = LocalStore.get("club_chats", []);
      const filtered = all.filter((m: any) => m.clubId === clubId);
      filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(filtered);
    }, 1000);
    
    const all = LocalStore.get("club_chats", []);
    const filtered = all.filter((m: any) => m.clubId === clubId);
    filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(filtered);
    return () => clearInterval(interval);
  }

  async sendClubMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    return tryCall(
      async () => {
        await addDoc(collection(firestore, "club_chats"), message);
      },
      () => {
        const list = LocalStore.get("club_chats", []);
        const id = `msg-${Math.random().toString(36).substr(2, 9)}`;
        list.push({ id, ...message });
        LocalStore.set("club_chats", list);
      }
    );
  }

  // --- Credits ---
  async getCredits(): Promise<Credit[]> {
    return tryCall(
      async () => {
        const q = query(collection(firestore, "credits"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Credit));
      },
      () => {
        const credits = LocalStore.get("credits", defaultCredits);
        return (Object.values(credits) as Credit[]).sort((a, b) => b.date.localeCompare(a.date));
      }
    );
  }

  async addCredit(credit: Credit): Promise<void> {
    return tryCall(
      async () => {
        await setDoc(doc(firestore, "credits", credit.id), credit);
      },
      () => {
        const credits = LocalStore.get("credits", defaultCredits);
        credits[credit.id] = credit;
        LocalStore.set("credits", credits);
      }
    );
  }

  async deleteCredit(id: string): Promise<void> {
    return tryCall(
      async () => {
        await deleteDoc(doc(firestore, "credits", id));
      },
      () => {
        const credits = LocalStore.get("credits", defaultCredits);
        delete credits[id];
        LocalStore.set("credits", credits);
      }
    );
  }

  async adminRestoreMerit(userId: string): Promise<boolean> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const uDoc = await getDoc(userRef);
        if (uDoc.exists()) {
          const userData = sanitizeUser(uDoc.data());
          const oldHistory = userData.meritHistory || [];
          const newRecord: MeritRecord = {
            id: `restore-${Date.now()}`,
            date: new Date().toISOString(),
            amount: 20 - (userData.meritScore ?? 20),
            action: 'GAIN',
            reason: "Administrative audit clearance and active status restoration"
          };
          await updateDoc(userRef, {
            meritScore: 20,
            meritHistory: [...oldHistory, newRecord],
            isSuspended: false,
            suspendedUntil: "",
            suspendedReason: "",
            isSuspendedIndefinitely: false,
            zeroMeritOccurrenceCount: 0
          });
          return true;
        }
        return false;
      },
      async () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const u = sanitizeUser(users[userId]);
          const oldHistory = u.meritHistory || [];
          const newRecord: MeritRecord = {
            id: `restore-${Date.now()}`,
            date: new Date().toISOString(),
            amount: 20 - (u.meritScore ?? 20),
            action: 'GAIN',
            reason: "Administrative audit clearance and active status restoration"
          };
          u.meritScore = 20;
          u.meritHistory = [...oldHistory, newRecord];
          u.isSuspended = false;
          u.suspendedUntil = "";
          u.suspendedReason = "";
          u.isSuspendedIndefinitely = false;
          u.zeroMeritOccurrenceCount = 0;
          users[userId] = u;
          LocalStore.set("users", users);
          return true;
        }
        return false;
      }
    );
  }

  async adminLimitServices(userId: string, services: string[], hours: number | 'indefinite', reason: string): Promise<boolean> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const uDoc = await getDoc(userRef);
        if (uDoc.exists()) {
          const updates: any = {};
          if (services.length === 0) {
            updates.limitedServices = null;
          } else {
            updates.limitedServices = {
              services,
              until: hours === 'indefinite' ? 'indefinite' : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
              reason
            };
          }
          await updateDoc(userRef, updates);
          return true;
        }
        return false;
      },
      async () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const u = sanitizeUser(users[userId]);
          if (services.length === 0) {
            delete u.limitedServices;
          } else {
            u.limitedServices = {
              services,
              until: hours === 'indefinite' ? 'indefinite' : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
              reason
            };
          }
          users[userId] = u;
          LocalStore.set("users", users);
          return true;
        }
        return false;
      }
    );
  }

  async adminSuspendUser(userId: string, hours: number | 'indefinite', reason: string): Promise<boolean> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const uDoc = await getDoc(userRef);
        if (uDoc.exists()) {
          const updates: any = {
            isSuspended: true,
            suspendedReason: reason
          };
          if (hours === 'indefinite') {
            updates.isSuspendedIndefinitely = true;
            updates.suspendedUntil = "";
          } else {
            updates.isSuspendedIndefinitely = false;
            updates.suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
          }
          await updateDoc(userRef, updates);
          return true;
        }
        return false;
      },
      async () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const u = sanitizeUser(users[userId]);
          u.isSuspended = true;
          u.suspendedReason = reason;
          if (hours === 'indefinite') {
            u.isSuspendedIndefinitely = true;
            u.suspendedUntil = "";
          } else {
            u.isSuspendedIndefinitely = false;
            u.suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
          }
          users[userId] = u;
          LocalStore.set("users", users);
          return true;
        }
        return false;
      }
    );
  }

  async adminDeductMerit(userId: string, deductionAmount: number, reason: string): Promise<boolean> {
    return tryCall(
      async () => {
        const userRef = doc(firestore, "users", userId);
        const uDoc = await getDoc(userRef);
        if (uDoc.exists()) {
          const userData = sanitizeUser(uDoc.data());
          const oldScore = userData.meritScore ?? 20;
          const newScore = Math.max(0, oldScore - deductionAmount);
          const oldHistory = userData.meritHistory || [];

          const newRecord: MeritRecord = {
            id: `admin-deduct-${Date.now()}`,
            date: new Date().toISOString(),
            amount: -deductionAmount,
            action: 'DEDUCTION',
            reason: `Administrative Action: ${reason}`,
            brokenRule: "Administrative Disciplinary Directive"
          };

          const updates: any = {
            meritScore: newScore,
            meritHistory: [...oldHistory, newRecord]
          };

          if (newScore === 0) {
            const oldOccurrences = userData.zeroMeritOccurrenceCount ?? 0;
            const newOccurrences = oldOccurrences + 1;
            updates.zeroMeritOccurrenceCount = newOccurrences;
            updates.isSuspended = true;
            if (newOccurrences >= 3) {
              updates.isSuspendedIndefinitely = true;
              updates.suspendedUntil = "";
              updates.suspendedReason = `Merit reached zero 3 times. Indefinite suspension enforced. Please contact the administrative office to discuss re-enrollment.`;
            } else {
              updates.isSuspendedIndefinitely = false;
              updates.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
              updates.suspendedReason = `Merit reached zero (Occurrence #${newOccurrences}). Standard 48-hour cooling suspension applied.`;
            }
          }

          await updateDoc(userRef, updates);
        }
        return true;
      },
      async () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          const u = sanitizeUser(users[userId]);
          const oldScore = u.meritScore ?? 20;
          const newScore = Math.max(0, oldScore - deductionAmount);
          const oldHistory = u.meritHistory || [];

          const newRecord: MeritRecord = {
            id: `admin-deduct-${Date.now()}`,
            date: new Date().toISOString(),
            amount: -deductionAmount,
            action: 'DEDUCTION',
            reason: `Administrative Action: ${reason}`,
            brokenRule: "Administrative Disciplinary Directive"
          };

          u.meritScore = newScore;
          u.meritHistory = [...oldHistory, newRecord];

          if (newScore === 0) {
            const oldOccurrences = u.zeroMeritOccurrenceCount ?? 0;
            const newOccurrences = oldOccurrences + 1;
            u.zeroMeritOccurrenceCount = newOccurrences;
            u.isSuspended = true;
            if (newOccurrences >= 3) {
              u.isSuspendedIndefinitely = true;
              u.suspendedUntil = "";
              u.suspendedReason = `Merit reached zero 3 times. Indefinite suspension enforced. Please contact the administrative office to discuss re-enrollment.`;
            } else {
              u.isSuspendedIndefinitely = false;
              u.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
              u.suspendedReason = `Merit reached zero (Occurrence #${newOccurrences}). Standard 48-hour cooling suspension applied.`;
            }
          }

          users[userId] = u;
          LocalStore.set("users", users);
        }
        return true;
      }
    );
  }

  // --- Debug: Force Password Update (Firestore only for view) ---
  async forceUpdatePlainPassword(userId: string, newPass: string): Promise<void> {
    return tryCall(
      async () => {
        const ref = doc(firestore, "users", userId);
        await updateDoc(ref, { plainPassword: newPass });
      },
      () => {
        const users = LocalStore.get("users", defaultUsers);
        if (users[userId]) {
          users[userId].plainPassword = newPass;
          LocalStore.set("users", users);
        }
      }
    );
  }

  async resyncEntireDatabase(): Promise<{ success: boolean; usersCount: number; clubsCount: number; error?: string }> {
    try {
      // 1. Resync Offline LocalStore database first
      const usersOffline = LocalStore.get("users", {});
      const clubsOffline = LocalStore.get("clubs", defaultClubs);
      
      let localUsersCount = 0;
      let localClubsCount = 0;

      // Reset and sync LocalStore users
      const updatedLocalUsers: Record<string, User> = {};
      for (const [uid, uData] of Object.entries(usersOffline)) {
        const u = uData as any;
        const oldHistory = u.meritHistory || [];
        
        let merit = u.meritScore !== undefined ? u.meritScore : 20;
        // Map old 100 PT range to 20 PT scale if needed
        if (merit > 20) {
          merit = Math.round(merit * 20 / 100);
        }
        merit = Math.max(0, Math.min(20, merit));

        const updatedUser: User = {
          ...u,
          id: uid,
          name: u.name || "User",
          email: u.email || "",
          role: u.role || UserRole.MEMBER,
          joinedClubIds: Array.isArray(u.joinedClubIds) ? u.joinedClubIds : [],
          badges: Array.isArray(u.badges) ? u.badges : [],
          meritScore: merit,
          meritHistory: oldHistory,
          isOutOfSync: false,
          isSuspended: !!u.isSuspended,
          suspendedUntil: u.suspendedUntil || "",
          suspendedReason: u.suspendedReason || "",
          zeroMeritOccurrenceCount: typeof u.zeroMeritOccurrenceCount === 'number' ? u.zeroMeritOccurrenceCount : 0,
          isSuspendedIndefinitely: !!u.isSuspendedIndefinitely,
        };
        updatedLocalUsers[uid] = updatedUser;
        localUsersCount++;
      }
      LocalStore.set("users", updatedLocalUsers);

      // Reset and sync LocalStore clubs
      const updatedLocalClubs: Record<string, Club> = {};
      for (const [cid, cData] of Object.entries(clubsOffline)) {
        const club = cData as any;
        let reqMerit = club.requiredMerit !== undefined ? club.requiredMerit : 12;
        if (reqMerit > 20) {
          reqMerit = Math.round(reqMerit * 20 / 100);
        }
        reqMerit = Math.max(0, Math.min(20, reqMerit));

        const updatedClub: Club = {
          ...club,
          id: cid,
          name: club.name || "Unnamed Club",
          description: club.description || "",
          leaderId: club.leaderId || "system-setup-admin",
          memberIds: Array.isArray(club.memberIds) ? club.memberIds : [],
          requiredMerit: reqMerit,
          rules: Array.isArray(club.rules) ? club.rules : [
            "No spamming of the digital channels and chatrooms.",
            "Engage consistently inside assemblies and constructive projects.",
            "Strictly respect academic integrity and co-authored creative rights."
          ]
        };
        updatedLocalClubs[cid] = updatedClub;
        localClubsCount++;
      }
      LocalStore.set("clubs", updatedLocalClubs);

      // 2. Resync Online Firestore database if accessible
      let firestoreUsersCount = 0;
      let firestoreClubsCount = 0;

      if (isFirebaseAvailable) {
        try {
          // Sync Users Collection
          const usersSnapshot = await getDocs(collection(firestore, "users"));
          for (const uDoc of usersSnapshot.docs) {
            const u = uDoc.data() as any;
            const uid = uDoc.id;
            const oldHistory = u.meritHistory || [];
            
            let merit = u.meritScore !== undefined ? u.meritScore : 20;
            if (merit > 20) {
              merit = Math.round(merit * 20 / 100);
            }
            merit = Math.max(0, Math.min(20, merit));

            const updatedUser: User = {
              ...u,
              id: uid,
              name: u.name || "User",
              email: u.email || "",
              role: u.role || UserRole.MEMBER,
              joinedClubIds: Array.isArray(u.joinedClubIds) ? u.joinedClubIds : [],
              badges: Array.isArray(u.badges) ? u.badges : [],
              meritScore: merit,
              meritHistory: oldHistory,
              isOutOfSync: false,
              isSuspended: !!u.isSuspended,
              suspendedUntil: u.suspendedUntil || "",
              suspendedReason: u.suspendedReason || "",
              zeroMeritOccurrenceCount: typeof u.zeroMeritOccurrenceCount === 'number' ? u.zeroMeritOccurrenceCount : 0,
              isSuspendedIndefinitely: !!u.isSuspendedIndefinitely,
            };
            await setDoc(doc(firestore, "users", uid), updatedUser);
            firestoreUsersCount++;
          }

          // Sync Clubs Collection
          const clubsSnapshot = await getDocs(collection(firestore, "clubs"));
          for (const cDoc of clubsSnapshot.docs) {
            const club = cDoc.data() as any;
            const cid = cDoc.id;
            
            let reqMerit = club.requiredMerit !== undefined ? club.requiredMerit : 12;
            if (reqMerit > 20) {
              reqMerit = Math.round(reqMerit * 20 / 100);
            }
            reqMerit = Math.max(0, Math.min(20, reqMerit));

            const updatedClub: Club = {
              ...club,
              id: cid,
              name: club.name || "Unnamed Club",
              description: club.description || "",
              leaderId: club.leaderId || "system-setup-admin",
              memberIds: Array.isArray(club.memberIds) ? club.memberIds : [],
              requiredMerit: reqMerit,
              rules: Array.isArray(club.rules) ? club.rules : [
                "No spamming of the digital channels and chatrooms.",
                "Engage consistently inside assemblies and constructive projects.",
                "Strictly respect academic integrity and co-authored creative rights."
              ]
            };
            await setDoc(doc(firestore, "clubs", cid), updatedClub);
            firestoreClubsCount++;
          }
        } catch (fbError) {
          console.warn("Firestore resync incomplete or permission denied:", fbError);
        }
      }

      return {
        success: true,
        usersCount: Math.max(localUsersCount, firestoreUsersCount),
        clubsCount: Math.max(localClubsCount, firestoreClubsCount)
      };
    } catch (e: any) {
      console.error("Database Resync Fatal Error:", e);
      return {
        success: false,
        usersCount: 0,
        clubsCount: 0,
        error: e.message || "Unknown error during database schema resync"
      };
    }
  }
}

export const db = new FirebaseService();