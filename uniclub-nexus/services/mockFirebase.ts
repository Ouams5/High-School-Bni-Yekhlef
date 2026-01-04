import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, collection, getDocs, doc, setDoc, addDoc, updateDoc, 
  deleteDoc, query, where, onSnapshot, arrayUnion, arrayRemove, getDoc, orderBy
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from "firebase/auth";
import { User, UserRole, Club, Announcement, AppEvent, Project, BugReport, Notification } from '../types';

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
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Service Implementation
class FirebaseService {
  
  // --- Users ---
  async getUser(userId: string): Promise<User | null> {
    const docRef = doc(firestore, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  }

  async createUserProfile(user: User): Promise<void> {
    await setDoc(doc(firestore, "users", user.id), user);
  }

  async getAllUsers(): Promise<User[]> {
    const q = query(collection(firestore, "users"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  }
  
  async updateUserRole(adminId: string, targetUserId: string, newRole: UserRole): Promise<boolean> {
    // Permission check should be done in UI or Security Rules, but we add a sanity check here if we had the admin user obj
    const userRef = doc(firestore, "users", targetUserId);
    await updateDoc(userRef, { role: newRole });
    return true;
  }

  async checkIsFirstUser(): Promise<boolean> {
    const snapshot = await getDocs(query(collection(firestore, "users")));
    return snapshot.empty;
  }

  // --- Clubs ---
  async getClubs(): Promise<Club[]> {
    const snapshot = await getDocs(collection(firestore, "clubs"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
  }
  
  async addClub(club: Omit<Club, 'id'>): Promise<void> {
    await addDoc(collection(firestore, "clubs"), club);
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
  async getAnnouncements(): Promise<Announcement[]> {
    const q = query(collection(firestore, "announcements"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
  }

  async addAnnouncement(a: Announcement): Promise<void> {
    await setDoc(doc(firestore, "announcements", a.id), a);
    // Also create a notification
    await addDoc(collection(firestore, "notifications"), {
      title: "New Announcement",
      message: a.title,
      date: new Date().toISOString(),
      read: false,
      type: a.isImportant ? 'alert' : 'info'
    });
  }

  // --- Notifications ---
  async getNotifications(): Promise<Notification[]> {
      const q = query(collection(firestore, "notifications"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
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

  // --- Projects ---
  async getProjects(): Promise<Project[]> {
    const snapshot = await getDocs(collection(firestore, "projects"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }
  async addProject(p: Project): Promise<void> { 
      await setDoc(doc(firestore, "projects", p.id), p); 
  }
  
  // --- Bug Reports ---
  async addBugReport(b: BugReport): Promise<void> { 
    await addDoc(collection(firestore, "bugs"), b);
  }
}

export const db = new FirebaseService();
