
import { LessonPlanData, UserProfile, Classroom, Assignment, StudentResult, Student, SharedNote, ForumPost, ForumReply, DirectMessage, AppNotification, Textbook, School, LessonPlanComment, Subject, Grade } from '../types';
import { db } from './firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";

const PLANS_STORAGE_KEY = 'mwalimu_saved_plans';
const USERS_DB_KEY = 'mwalimu_users_db';
const SCHOOLS_DB_KEY = 'mwalimu_schools_db';
const SESSION_KEY = 'mwalimu_current_session';
const CLASSROOMS_STORAGE_KEY = 'mwalimu_classrooms';
const ASSIGNMENTS_STORAGE_KEY = 'mwalimu_assignments';
const RESULTS_STORAGE_KEY = 'mwalimu_results';
const MESSAGES_STORAGE_KEY = 'mwalimu_direct_messages';
const NOTIFICATIONS_STORAGE_KEY = 'mwalimu_notifications';

// --- Firestore User Sync ---

export const syncUserProfileToFirestore = async (user: UserProfile): Promise<void> => {
    if (!user.email) return;
    try {
        const userRef = doc(db, "users", user.email.toLowerCase());
        await setDoc(userRef, {
            ...user,
            lastSynced: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error("Error syncing user to Firestore:", error);
    }
};

export const fetchUserProfileFromFirestore = async (email: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, "users", email.toLowerCase());
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            saveUserMetadata(data); // Sync back to local
            return data;
        }
    } catch (error) {
        console.error("Error fetching user from Firestore:", error);
    }
    return null;
};

// --- Firebase Sync Logic ---

export const syncPlansToFirebase = async (): Promise<void> => {
    const user = getCurrentUser();
    if (!user) return;
    const localPlans = getSavedPlans();
    try {
        for (const plan of localPlans) {
            if (plan.id) {
                const planRef = doc(db, "lesson_plans", plan.id);
                await setDoc(planRef, { ...plan, syncedAt: new Date().toISOString() }, { merge: true });
            }
        }
    } catch (error) {
        console.error("Error syncing to Firebase:", error);
    }
};

// --- Notifications System ---

export const getNotifications = (userId: string): AppNotification[] => {
    const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    return (all || []).filter(n => n && n.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const markNotificationRead = (notificationId: string): void => {
    const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    let all: AppNotification[] = data ? JSON.parse(data) : [];
    all = (all || []).map(n => n.id === notificationId ? { ...n, read: true } : n);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(all));
};

const createNotification = (userId: string, type: 'message' | 'assignment' | 'forum' | 'system', title: string, message: string, linkTo?: string) => {
    const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    const newNotif: AppNotification = { id: crypto.randomUUID(), userId, type, title, message, read: false, timestamp: new Date().toISOString(), linkTo };
    all.push(newNotif);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(all));
};

// --- Direct Messages ---

export const sendDirectMessage = (msg: DirectMessage): void => {
    const data = localStorage.getItem(MESSAGES_STORAGE_KEY);
    const allMessages: DirectMessage[] = data ? JSON.parse(data) : [];
    allMessages.push(msg);
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(allMessages));
    createNotification(msg.receiverId, 'message', `New message from ${msg.senderName}`, msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''));
};

export const getDirectMessages = (userId: string): DirectMessage[] => {
    const data = localStorage.getItem(MESSAGES_STORAGE_KEY);
    const allMessages: DirectMessage[] = data ? JSON.parse(data) : [];
    return (allMessages || []).filter(m => m && (m.senderId === userId || m.receiverId === userId)).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const markMessagesRead = (senderId: string, receiverId: string): void => {
    const data = localStorage.getItem(MESSAGES_STORAGE_KEY);
    let allMessages: DirectMessage[] = data ? JSON.parse(data) : [];
    allMessages = (allMessages || []).map(m => (m.senderId === senderId && m.receiverId === receiverId) ? { ...m, read: true } : m);
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(allMessages));
};

// --- Forum System ---

export const createForumPost = (classId: string, post: ForumPost): void => {
    const data = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
    const allClassrooms: Classroom[] = data ? JSON.parse(data) : [];
    const idx = allClassrooms.findIndex(c => c.id === classId);
    if (idx !== -1) {
        if (!allClassrooms[idx].forumPosts) allClassrooms[idx].forumPosts = [];
        allClassrooms[idx].forumPosts.unshift(post);
        localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
        const currentUser = getCurrentUser();
        if (currentUser && (currentUser.email === allClassrooms[idx].userId || currentUser.email === allClassrooms[idx].teacherId)) {
             allClassrooms[idx].students.forEach(s => createNotification(s.code, 'forum', 'New Class Discussion', post.title));
        }
    }
};

export const addForumReply = (classId: string, postId: string, reply: ForumReply): void => {
    const data = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
    const allClassrooms: Classroom[] = data ? JSON.parse(data) : [];
    const classIdx = allClassrooms.findIndex(c => c.id === classId);
    if (classIdx !== -1) {
        const posts = allClassrooms[classIdx].forumPosts || [];
        const postIdx = posts.findIndex(p => p.id === postId);
        if (postIdx !== -1) {
            posts[postIdx].replies.push(reply);
            localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
        }
    }
};

// --- Plan Management ---

export const savePlan = (plan: LessonPlanData): void => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const allPlans = getAllGlobalPlans();
  if (!plan.id) plan.id = crypto.randomUUID();
  if (!plan.createdAt) plan.createdAt = new Date().toISOString();
  plan.userId = currentUser.email;
  const existingIndex = allPlans.findIndex(p => p.id === plan.id);
  if (existingIndex >= 0) allPlans[existingIndex] = plan;
  else allPlans.unshift(plan);
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(allPlans));
  syncPlansToFirebase().catch(() => {});
};

export const getSavedPlans = (): LessonPlanData[] => {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  const allPlans = getAllGlobalPlans();
  return allPlans.filter(plan => plan && plan.userId === currentUser.email);
};

export const getAllGlobalPlans = (): LessonPlanData[] => {
  const data = localStorage.getItem(PLANS_STORAGE_KEY);
  const plans = data ? JSON.parse(data) : [];
  return Array.isArray(plans) ? plans : [];
};

export const deletePlan = (id: string): void => {
  const allPlans = getAllGlobalPlans();
  const updatedPlans = allPlans.filter(p => p.id !== id);
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
};

export const addCommentToPlan = (planId: string, comment: LessonPlanComment): void => {
    const allPlans = getAllGlobalPlans();
    const planIndex = allPlans.findIndex(p => p.id === planId);
    if (planIndex !== -1) {
        if (!allPlans[planIndex].adminComments) allPlans[planIndex].adminComments = [];
        allPlans[planIndex].adminComments!.push(comment);
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(allPlans));
        
        // Sync to Firebase
        syncPlansToFirebase().catch(console.error);

        const plan = allPlans[planIndex];
        if (plan.userId) createNotification(plan.userId, 'system', 'Admin Feedback', `New feedback on lesson plan: ${plan.topic}`);
    }
};

// --- Classroom Management ---

const generateStudentCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const isCodeUnique = (code: string, allClassrooms: Classroom[]): boolean => {
  for (const cls of allClassrooms) {
    if (cls && cls.students && cls.students.some(s => s.code === code)) return false;
  }
  return true;
};

export const createClassroom = (grade: string, stream: string, roll: number, teacherId?: string): Classroom => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error("Authentication failed. Please log in again.");
  
  const allClassrooms = getAllClassroomsGlobal();
  const students: Student[] = [];
  for (let i = 1; i <= roll; i++) {
    let code = generateStudentCode();
    while (!isCodeUnique(code, allClassrooms)) code = generateStudentCode();
    students.push({ index: i, code: code });
  }
  
  const newClassroom: Classroom = {
    id: crypto.randomUUID(),
    userId: currentUser.email,
    schoolId: currentUser.schoolId,
    teacherId: teacherId || (currentUser.role === 'teacher' ? currentUser.email : ''),
    grade, 
    stream, 
    subjects: [], 
    students, 
    sharedNotes: [], 
    forumPosts: [], 
    textbooks: []
  };
  
  allClassrooms.push(newClassroom);
  localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
  return newClassroom;
};

export const addSubjectToClassroom = (classId: string, subject: string): void => {
  const allClassrooms = getAllClassroomsGlobal();
  const clsIndex = allClassrooms.findIndex(c => c.id === classId);
  if (clsIndex !== -1 && !allClassrooms[clsIndex].subjects.includes(subject)) {
    allClassrooms[clsIndex].subjects.push(subject);
    localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
  }
};

export const removeSubjectFromClassroom = (classId: string, subject: string): void => {
    const allClassrooms = getAllClassroomsGlobal();
    const clsIndex = allClassrooms.findIndex(c => c.id === classId);
    if (clsIndex !== -1) {
      allClassrooms[clsIndex].subjects = allClassrooms[clsIndex].subjects.filter(s => s !== subject);
      localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
    }
};

export const shareNoteToClassroom = (classId: string, note: SharedNote): void => {
    const allClassrooms = getAllClassroomsGlobal();
    const clsIndex = allClassrooms.findIndex(c => c.id === classId);
    if (clsIndex !== -1) {
        if (!allClassrooms[clsIndex].sharedNotes) allClassrooms[clsIndex].sharedNotes = [];
        allClassrooms[clsIndex].sharedNotes.push(note);
        localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
        allClassrooms[clsIndex].students.forEach(s => createNotification(s.code, 'message', 'New Note Shared', `Notes for ${note.title} have been shared.`));
    }
};

export const uploadTextbookToClassroom = (classId: string, textbook: Textbook): void => {
    const allClassrooms = getAllClassroomsGlobal();
    const clsIndex = allClassrooms.findIndex(c => c.id === classId);
    if (clsIndex !== -1) {
        if(!allClassrooms[clsIndex].textbooks) allClassrooms[clsIndex].textbooks = [];
        allClassrooms[clsIndex].textbooks.push(textbook);
        localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
        allClassrooms[clsIndex].students.forEach(s => createNotification(s.code, 'message', 'New Textbook', `A new textbook: ${textbook.title} has been uploaded.`));
    }
};

export const getStudentNotes = (classId: string): SharedNote[] => {
    const allClassrooms = getAllClassroomsGlobal();
    const cls = allClassrooms.find(c => c.id === classId);
    const notes = cls && cls.sharedNotes ? cls.sharedNotes : [];
    return notes.sort((a,b) => new Date(b.dateShared).getTime() - new Date(a.dateShared).getTime());
};

export const getClassrooms = (): Classroom[] => {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  const allClassrooms = getAllClassroomsGlobal();
  if (currentUser.role === 'school_admin' && currentUser.schoolId) {
    return allClassrooms.filter(c => c && c.schoolId === currentUser.schoolId);
  }
  return allClassrooms.filter(c => c && (c.userId === currentUser.email || c.teacherId === currentUser.email));
};

export const getAllClassroomsGlobal = (): Classroom[] => {
    try {
        const data = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
        const cls = data ? JSON.parse(data) : [];
        return Array.isArray(cls) ? cls : [];
    } catch (e) {
        return [];
    }
};

export const deleteClassroom = (id: string): void => {
  const allClassrooms = getAllClassroomsGlobal();
  localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms.filter(c => c.id !== id)));
};

export const addStudentsToClassroom = (classId: string, count: number): void => {
    const allClassrooms = getAllClassroomsGlobal();
    const clsIndex = allClassrooms.findIndex(c => c.id === classId);
    if (clsIndex !== -1) {
        const currentCount = allClassrooms[clsIndex].students.length;
        for (let i = 1; i <= count; i++) {
            let code = generateStudentCode();
            while (!isCodeUnique(code, allClassrooms)) code = generateStudentCode();
            allClassrooms[clsIndex].students.push({ index: currentCount + i, code: code });
        }
        localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
    }
};

export const addSingleStudentToClassroom = (classId: string, name?: string): Student | null => {
    const allClassrooms = getAllClassroomsGlobal();
    const clsIndex = allClassrooms.findIndex(c => c.id === classId);
    if (clsIndex !== -1) {
        const currentCount = allClassrooms[clsIndex].students.length;
        let code = generateStudentCode();
        while (!isCodeUnique(code, allClassrooms)) code = generateStudentCode();
        const newStudent: Student = { index: currentCount + 1, code: code, name: name };
        allClassrooms[clsIndex].students.push(newStudent);
        localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
        return newStudent;
    }
    return null;
};

export const deleteStudentFromClassroom = (classId: string, studentCode: string): void => {
    const allClassrooms = getAllClassroomsGlobal();
    const clsIndex = allClassrooms.findIndex(c => c.id === classId);
    if (clsIndex !== -1) {
        allClassrooms[clsIndex].students = allClassrooms[clsIndex].students.filter(s => s.code !== studentCode);
        localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
    }
};

// --- Assignment Management ---

export const saveAssignment = (assignment: Assignment): void => {
  const data = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
  const assignments: Assignment[] = data ? JSON.parse(data) : [];
  assignments.push(assignment);
  localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  const classrooms = getAllClassroomsGlobal();
  const cls = classrooms.find(c => c.id === assignment.classroomId);
  if (cls) cls.students.forEach(s => createNotification(s.code, 'assignment', 'New Assignment', `New ${assignment.subject} assignment: ${assignment.topic}`));
};

export const getAssignmentsByClassId = (classId: string): Assignment[] => {
  const allAssignments = getAllAssignmentsGlobal();
  return allAssignments.filter(a => a && a.classroomId === classId);
};

export const getAllAssignmentsGlobal = (): Assignment[] => {
    const data = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    const assigns = data ? JSON.parse(data) : [];
    return Array.isArray(assigns) ? assigns : [];
};

// --- Student Login & Results ---

/**
 * Seeding logic for Universal Test Codes
 */
const seedDemoClass = (code: string) => {
    const demoClassId = "demo-class-maths-7";
    const classrooms = getAllClassroomsGlobal();
    if (classrooms.some(c => c.id === demoClassId)) return;

    const demoClass: Classroom = {
        id: demoClassId,
        userId: "system@mwalimuplanner.com",
        grade: "Grade 7",
        stream: "Mathematics Alpha",
        subjects: ["Mathematics"],
        students: [
            { index: 1, code: "DEMO12", name: "Demo Student" },
            { index: 2, code: "STUDENT1", name: "Guest User" }
        ],
        sharedNotes: [{
            id: "note-1",
            title: "Welcome to your Student Hub",
            content: "This is your personalized portal. Here you can see your assignments, read shared notes, and download textbooks. We have added a sample quiz to get you started.",
            dateShared: new Date().toISOString(),
            subject: "Mathematics"
        }],
        forumPosts: [],
        textbooks: []
    };

    const demoAssignment: Assignment = {
        id: "assign-math-1",
        classroomId: demoClassId,
        subject: "Mathematics",
        topic: "Initial Assessment: Number Systems",
        createdAt: new Date().toISOString(),
        grade: "Grade 7",
        questions: [
            { id: 1, type: 'mcq', question: "What is the result of 25 + 75?", options: ["90", "100", "110", "125"], correctAnswer: "100", explanation: "Basic addition: 25 plus 75 equals exactly 100." },
            { id: 2, type: 'mcq', question: "Which number is even?", options: ["13", "27", "42", "51"], correctAnswer: "42", explanation: "Even numbers are divisible by 2. 42 divided by 2 is 21." }
        ]
    };

    classrooms.push(demoClass);
    localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(classrooms));
    saveAssignment(demoAssignment);
};

export const authenticateStudent = (code: string): { student: Student, classroom: Classroom } | null => {
  const normalizedCode = code.toUpperCase();
  if (normalizedCode === 'DEMO12' || normalizedCode === 'STUDENT1') {
      seedDemoClass(normalizedCode);
  }

  const allClassrooms = getAllClassroomsGlobal();
  for (const cls of allClassrooms) {
    if (!cls || !cls.students) continue;
    const student = cls.students.find(s => s.code === normalizedCode);
    if (student) return { student, classroom: cls };
  }
  return null;
};

export const updateStudentName = (classId: string, studentCode: string, name: string): Student | null => {
    const allClassrooms = getAllClassroomsGlobal();
    const clsIndex = allClassrooms.findIndex(c => c.id === classId);
    if (clsIndex === -1) return null;
    const studentIndex = allClassrooms[clsIndex].students.findIndex(s => s.code === studentCode);
    if (studentIndex === -1) return null;
    allClassrooms[clsIndex].students[studentIndex].name = name;
    localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(allClassrooms));
    return allClassrooms[clsIndex].students[studentIndex];
};

export const saveStudentResult = (result: StudentResult): void => {
  const allResults = getAllResultsGlobal();
  allResults.push(result);
  localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults));
};

export const getStudentResults = (studentCode: string): StudentResult[] => {
    const allResults = getAllResultsGlobal();
    return (allResults || []).filter(r => r && r.studentCode === studentCode);
};

export const getAllResultsGlobal = (): StudentResult[] => {
    try {
        const data = localStorage.getItem(RESULTS_STORAGE_KEY);
        const res = data ? JSON.parse(data) : [];
        return Array.isArray(res) ? res : [];
    } catch (e) {
        return [];
    }
};

export const getAssignmentResults = (assignmentId: string): StudentResult[] => {
    const allResults = getAllResultsGlobal();
    return (allResults || []).filter(r => r && r.assignmentId === assignmentId);
};

export const updateStudentResultFeedback = (resultId: string, feedback: string): void => {
    const allResults = getAllResultsGlobal();
    const index = allResults.findIndex(r => r.id === resultId);
    if (index !== -1) {
        allResults[index].feedback = feedback;
        localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults));
        createNotification(allResults[index].studentCode, 'assignment', 'Teacher Feedback', 'You have received feedback on your assignment.');
    }
};

// --- User Profile Metadata Storage ---

export const getLocalUserMetadata = (email: string): UserProfile | null => {
  const data = localStorage.getItem(USERS_DB_KEY);
  const users: UserProfile[] = data ? JSON.parse(data) : [];
  return (users || []).find(u => u && u.email.toLowerCase() === email.toLowerCase()) || null;
};

export const saveUserMetadata = (user: UserProfile): void => {
  const data = localStorage.getItem(USERS_DB_KEY);
  const users: UserProfile[] = data ? JSON.parse(data) : [];
  const idx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  
  // Ensure teacher code exists
  if (!user.teacherCode) {
      user.teacherCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  if (idx >= 0) users[idx] = { ...users[idx], ...user };
  else users.push(user);
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  // Trigger Firestore sync in background
  syncUserProfileToFirestore(user).catch(console.error);
};

export const loginUser = (user: UserProfile): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const logoutUser = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): UserProfile | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const updateUserProfile = (updatedProfile: UserProfile): void => {
  if (!updatedProfile.teacherCode) {
      updatedProfile.teacherCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  loginUser(updatedProfile);
  saveUserMetadata(updatedProfile);
};

export const getAllUsers = (): UserProfile[] => {
    const data = localStorage.getItem(USERS_DB_KEY);
    const users = data ? JSON.parse(data) : [];
    return Array.isArray(users) ? users : [];
};

export const registerSchool = (schoolName: string, adminEmail: string, adminPass: string, adminPhone: string, address: string): UserProfile => {
    const adminId = crypto.randomUUID();
    const schoolId = crypto.randomUUID();
    const adminUser: UserProfile = { 
        id: adminId, 
        name: `${schoolName} Admin`, 
        email: adminEmail, 
        phone: adminPhone, 
        school: schoolName, 
        schoolId: schoolId, 
        role: 'school_admin',
        password: adminPass 
    };
    saveUserMetadata(adminUser);
    loginUser(adminUser);
    return adminUser;
};

export const createTeacherAccount = (schoolId: string, schoolName: string, teacherName: string, teacherEmail: string, teacherPhone: string, password: string): UserProfile => {
    const newTeacher: UserProfile = { 
        id: crypto.randomUUID(), 
        name: teacherName, 
        email: teacherEmail, 
        phone: teacherPhone, 
        school: schoolName, 
        schoolId: schoolId, 
        role: 'teacher', 
        teacherCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        password: password
    };
    saveUserMetadata(newTeacher);
    return newTeacher;
};

export const getSchoolTeachers = (schoolId: string): UserProfile[] => {
    return getAllUsers().filter(u => u && u.schoolId === schoolId && u.role === 'teacher');
};

export const getTeacherPlans = (teacherEmail: string): LessonPlanData[] => {
    return getAllGlobalPlans().filter(p => p && p.userId === teacherEmail);
};

export const linkTeacherToSchool = (schoolId: string, schoolName: string, teacherCode: string): UserProfile => {
  const users = getAllUsers();
  const idx = users.findIndex(u => u && u.teacherCode === teacherCode);
  if (idx === -1) throw new Error("Invalid Teacher Code.");
  
  const updatedUser = {
      ...users[idx],
      schoolId: schoolId,
      school: schoolName
  };
  
  saveUserMetadata(updatedUser);
  return updatedUser;
};

export const isSystemAdmin = (email: string): boolean => {
    const admins = ['admin@mwalimuplanner.com', 'muhigalamacdie@gmail.com'];
    return admins.includes(email.toLowerCase());
};
