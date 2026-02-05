import { initializeApp } from "firebase/app";
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
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { User, UserRole, Club, Announcement, AppEvent, Project, BugReport, Notification, ChatMessage } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDV1rAcCZTQ5GBxO_ai1_IoVaoR962UnBc",
  authDomain: "highschoolbniyekhlef.firebaseapp.com",
  projectId: "highschoolbniyekhlef",
  storageBucket: "highschoolbniyekhlef.firebasestorage.app",
  messagingSenderId: "1008974819884",
  appId: "1:1008974819884:web:c76ddbfbfd3273ffbe9789",
  measurementId: "G-XCSDTY1LLY"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Use Real Firestore
export const firestore = getFirestore(app);
// Use Real Auth
export const auth = getAuth(app);

// Wrapper functions to match AuthContext expectations
export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string, remember: boolean = false) => {
    await setPersistence(authInstance, remember ? browserLocalPersistence : browserSessionPersistence);
    return await firebaseSignIn(authInstance, email, pass);
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    return await firebaseCreateUser(authInstance, email, pass);
};

export const signOut = async (authInstance: any) => {
    return await firebaseSignOut(authInstance);
};

export const sendEmailVerification = async (user: any) => {
    return await firebaseSendEmailVerification(user);
};

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
    return firebaseOnAuthStateChanged(authInstance, callback);
};

// Helper to sanitize user data (migration)
const sanitizeUser = (data: any): User => {
    let role = data.role;

    // Migrate old TEACHER role to MEMBER if it still exists in DB
    if (role === 'TEACHER') {
        role = UserRole.MEMBER;
    }

    // Ensure we handle potential string roles that might not match enum perfectly during dev
    return {
        ...data,
        role: role,
    } as User;
};

// Service Implementation
class FirebaseService {
  
  // --- Users ---
  async getUser(userId: string): Promise<User | null> {
    try {
      const docRef = doc(firestore, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return sanitizeUser(docSnap.data());
      }
      return null;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
      try {
        const q = query(collection(firestore, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return sanitizeUser(snapshot.docs[0].data());
        }
        return null;
      } catch (error) {
        console.error("Error fetching user by email:", error);
        return null;
      }
  }

  async createUserProfile(user: User): Promise<void> {
    await setDoc(doc(firestore, "users", user.id), user);
  }

  async getAllUsers(): Promise<User[]> {
    const q = query(collection(firestore, "users"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => sanitizeUser({ id: doc.id, ...doc.data() }));
  }
  
  async updateUserRole(adminId: string, targetUserId: string, newRole: UserRole): Promise<boolean> {
    const userRef = doc(firestore, "users", targetUserId);
    await updateDoc(userRef, { role: newRole });
    return true;
  }

  async updateUserIp(userId: string, ip: string): Promise<void> {
    const userRef = doc(firestore, "users", userId);
    await updateDoc(userRef, { 
        ip: ip,
        lastLogin: new Date().toISOString()
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(firestore, "users", userId));
  }

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    const batch = writeBatch(firestore);
    userIds.forEach(id => {
        const docRef = doc(firestore, "users", id);
        batch.delete(docRef);
    });
    await batch.commit();
  }

  async bulkUpdateUserRole(userIds: string[], newRole: UserRole): Promise<void> {
    const batch = writeBatch(firestore);
    userIds.forEach(id => {
        const docRef = doc(firestore, "users", id);
        batch.update(docRef, { role: newRole });
    });
    await batch.commit();
  }

  async checkIsFirstUser(): Promise<boolean> {
    // Optimization: Limit to 1 document to check existence without fetching all users
    const snapshot = await getDocs(query(collection(firestore, "users"), limit(1)));
    return snapshot.empty;
  }

  // --- Clubs ---
  async getClubs(): Promise<Club[]> {
    const snapshot = await getDocs(collection(firestore, "clubs"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
  }

  async getClub(clubId: string): Promise<Club | null> {
      try {
        const docRef = doc(firestore, "clubs", clubId);
        const s = await getDoc(docRef);
        return s.exists() ? ({ id: s.id, ...s.data() } as Club) : null;
      } catch (error) {
        console.error("Error getting club:", error);
        return null;
      }
  }
  
  async createClubWithLeader(clubData: Omit<Club, 'id'>, leaderEmail: string): Promise<boolean> {
      try {
        // 1. Find User
        const leader = await this.getUserByEmail(leaderEmail);
        if (!leader) return false;

        // 2. Create Club
        const clubRef = await addDoc(collection(firestore, "clubs"), {
            ...clubData,
            leaderId: leader.id,
            memberIds: [leader.id] // Leader is automatically a member
        });

        // 3. Update User Role
        await updateDoc(doc(firestore, "users", leader.id), {
            role: UserRole.CLUB_LEADER,
            leadingClubId: clubRef.id,
            joinedClubIds: arrayUnion(clubRef.id)
        });
        
        return true;
      } catch (error) {
        console.error("Error creating club with leader:", error);
        return false;
      }
  }

  async deleteClub(clubId: string): Promise<void> {
    await deleteDoc(doc(firestore, "clubs", clubId));
  }

  async joinClub(userId: string, clubId: string): Promise<void> {
    const userRef = doc(firestore, "users", userId);
    const clubRef = doc(firestore, "clubs", clubId);

    await updateDoc(userRef, {
      joinedClubIds: arrayUnion(clubId)
    });
    await updateDoc(clubRef, {
      memberIds: arrayUnion(userId)
    });
  }

  async leaveClub(userId: string, clubId: string): Promise<void> {
    const userRef = doc(firestore, "users", userId);
    const clubRef = doc(firestore, "clubs", clubId);

    await updateDoc(userRef, {
        joinedClubIds: arrayRemove(clubId)
    });
    await updateDoc(clubRef, {
        memberIds: arrayRemove(userId)
    });
  }

  async kickMember(leaderId: string, clubId: string, memberId: string): Promise<boolean> {
    // In real app, verify leaderId via security rules or check here
    await this.leaveClub(memberId, clubId);
    return true;
  }

  // --- Announcements ---
  async getAnnouncements(clubId?: string): Promise<Announcement[]> {
    try {
        let q;
        if (clubId) {
            q = query(collection(firestore, "announcements"), where("clubId", "==", clubId));
        } else {
            q = query(collection(firestore, "announcements"), orderBy("date", "desc"));
        }
        const snapshot = await getDocs(q);
        // Fix spread error by casting doc.data() to any
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Announcement));
        announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return announcements;
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return [];
    }
  }

  async addAnnouncement(a: Announcement): Promise<void> {
    await setDoc(doc(firestore, "announcements", a.id), a);
    
    // Create notification
    await addDoc(collection(firestore, "notifications"), {
      title: a.clubId ? "New Club Announcement" : "New Global Announcement",
      message: a.title,
      date: new Date().toISOString(),
      read: false,
      type: a.isImportant ? 'alert' : 'info',
      clubId: a.clubId || null, // Store clubId to filter notifications later
      announcementId: a.id // Store announcement ID to enable deletion later
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    // 1. Delete the announcement document
    await deleteDoc(doc(firestore, "announcements", id));

    // 2. Find and delete associated notifications
    try {
      const q = query(collection(firestore, "notifications"), where("announcementId", "==", id));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting associated notification:", error);
    }
  }

  async deleteAllAnnouncements(): Promise<void> {
    const snapshot = await getDocs(collection(firestore, "announcements"));
    // Use deleteAnnouncement to ensure notifications are also cleaned up
    const deletePromises = snapshot.docs.map(doc => this.deleteAnnouncement(doc.id));
    await Promise.all(deletePromises);
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
      const q = query(collection(firestore, "notifications"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      // Fix spread error by casting doc.data() to any
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification));
  }

  async deleteNotification(id: string): Promise<void> {
    await deleteDoc(doc(firestore, "notifications", id));
  }

  // --- Events ---
  async getEvents(): Promise<AppEvent[]> {
    const q = query(collection(firestore, "events"), orderBy("date", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEvent));
  }
  async addEvent(e: AppEvent): Promise<void> { 
      await setDoc(doc(firestore, "events", e.id), e); 
  }
  async deleteEvent(id: string): Promise<void> {
      await deleteDoc(doc(firestore, "events", id));
  }

  // --- Projects ---
  async getProjects(clubId?: string): Promise<Project[]> {
    try {
        let q;
        if (clubId) {
            q = query(collection(firestore, "projects"), where("clubId", "==", clubId));
        } else {
            q = query(collection(firestore, "projects"));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
  }
  async addProject(p: Project): Promise<void> { 
      await setDoc(doc(firestore, "projects", p.id), p); 
  }
  
  async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
      const ref = doc(firestore, "projects", projectId);
      await updateDoc(ref, data);
  }

  async deleteProject(id: string): Promise<void> {
      await deleteDoc(doc(firestore, "projects", id));
  }
  
  // --- Bug Reports ---
  async addBugReport(b: BugReport): Promise<void> { 
    await addDoc(collection(firestore, "bugs"), b);
  }

  // --- Dev Chat ---
  subscribeToDevChat(callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(collection(firestore, "dev_chat"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
    });
  }

  async sendDevMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    await addDoc(collection(firestore, "dev_chat"), message);
  }

  // --- Event Planning Chat ---
  subscribeToEventPlanningChat(callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(collection(firestore, "event_planning_chat"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
    });
  }

  async sendEventPlanningMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    await addDoc(collection(firestore, "event_planning_chat"), message);
  }
}

export const db = new FirebaseService();