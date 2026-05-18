
export interface LessonDefinition {
  week: number;
  lesson: number;
  strand: string;
  subStrand: string;
  topic: string; // "Lesson X: Description"
  learningOutcomes: string[];
  inquiryQuestions: string[];
  resources: string;
  activities: string; // Raw text from scheme for context
}

export interface LessonPlanComment {
  id: string;
  authorName: string;
  date: string;
  content: string;
}

export interface LessonPlanData {
  id?: string;
  userId?: string; // Added to track ownership
  createdAt?: string;
  teacherName: string;
  schoolName: string;
  date: string;
  subject: string;
  grade: string;
  term: string;
  roll: number;
  strand: string;
  subStrand: string;
  lessonNumber: string;
  topic: string;
  learningOutcomes: string[];
  keyInquiryQuestions: string[];
  learningResources: string[];
  introduction: string;
  developmentSteps: {
    step1: string;
    step2: string;
    step3: string;
  };
  extendedActivities: string;
  conclusion: string;
  reflectionSpace: boolean;
  learnerNotes?: string;
  practiceQuestions?: string; // Kept for legacy/text view
  structuredQuestions?: QuizQuestion[]; // Added for interactive mode
  
  // New Fields for Context
  customContext?: string; // User pasted notes
  images?: string[]; // Array of Base64 strings for up to 5 images
  
  // New: Teacher added notes/images
  teacherNotes?: SharedNote[];
  
  // New: Admin Comments
  adminComments?: LessonPlanComment[];
}

export type UserRole = 'teacher' | 'school_admin' | 'system_admin';

export interface UserProfile {
  id?: string; // Added ID for linking
  name: string;
  email: string;
  school: string;
  phone: string;
  password?: string; // Added for authentication
  isAdmin?: boolean; // Legacy: Maps to system_admin
  role?: UserRole; // New role system
  schoolId?: string; // Link to a registered School
  teacherCode?: string; // Unique 6-char code for linking independent teachers
}

export interface School {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  adminId: string; // UserProfile.id of the school admin
  createdAt: string;
}

export interface Student {
  index: number;
  code: string; // Unique access code
  name?: string;
}

export interface SharedNote {
  id: string;
  title: string;
  content: string;
  dateShared: string;
  subject: string;
  images?: string[]; // New: Support for uploaded images in notes
}

export interface Textbook {
  id: string;
  title: string;
  fileData: string; // Base64 string
  fileType: string; // 'pdf' | 'word'
  uploadDate: string;
  size: string;
}

export interface ForumReply {
  id: string;
  authorName: string;
  authorRole: 'teacher' | 'student';
  content: string;
  timestamp: string;
  replies?: ForumReply[]; // Recursive replies if needed, simple flat for now
}

export interface ForumPost {
  id: string;
  authorName: string;
  title: string;
  content: string;
  timestamp: string;
  replies: ForumReply[];
}

export interface DirectMessage {
  id: string;
  senderId: string; // Teacher Email or Student Code
  senderName: string;
  receiverId: string; // Teacher Email or Student Code
  content: string;
  timestamp: string;
  read: boolean;
  isFromTeacher: boolean;
}

export interface AppNotification {
  id: string;
  userId: string; // Receiver (Teacher Email or Student Code)
  type: 'message' | 'assignment' | 'forum' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  linkTo?: string; // ID of the relevant object
}

export interface Classroom {
  id: string;
  userId: string; // Creator's Email (Legacy) or ID
  schoolId?: string; // If created by school
  teacherId?: string; // Assigned teacher's UserProfile.id or email
  grade: string;
  stream: string;
  students: Student[];
  subjects: string[];
  sharedNotes: SharedNote[];
  forumPosts: ForumPost[]; 
  textbooks: Textbook[]; // Added for class resources
}

export interface QuizQuestion {
  id: number;
  type: 'mcq' | 'structured'; // New field to distinguish types
  question: string;
  image?: string; // Base64 string for question image
  options?: string[]; // Optional for structured questions
  correctAnswer: string; // The full string of the correct option or key phrase
  explanation?: string;
}

export interface Assignment {
  id: string;
  classroomId: string;
  subject: string;
  grade?: string; // Added to help context for regeneration
  topic: string;
  questions: QuizQuestion[];
  createdAt: string;
  dueDate?: string;
}

export interface StudentResult {
  id: string;
  assignmentId: string;
  studentCode: string;
  studentName: string; 
  score: number;
  total: number;
  attempts: number; // New field to track attempts
  answers: Record<number, string>; // Store index: selectedAnswer
  dateTaken: string;
  feedback?: string; // Teacher feedback
  
  // New Analysis Fields
  timeTaken?: number; // Total seconds
  timePerQuestion?: Record<number, number>; // Seconds per question index
  aiAnalysis?: string; // Pedagogical report generated by AI
}

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  date: string;
  url: string;
}

export enum Grade {
  GRADE_4 = "Grade 4",
  GRADE_5 = "Grade 5",
  GRADE_6 = "Grade 6",
  GRADE_7 = "Grade 7",
  GRADE_8 = "Grade 8",
  GRADE_9 = "Grade 9"
}

export enum Term {
  TERM_1 = "Term 1",
  TERM_2 = "Term 2",
  TERM_3 = "Term 3"
}

export enum Subject {
  MATHEMATICS = "Mathematics",
  ENGLISH = "English",
  KISWAHILI = "Kiswahili",
  PRETECHNICAL_STUDIES = "Pre-Technical Studies",
  CREATIVE_ARTS = "Creative Arts and Sports",
  CHRISTIAN_RELIGIOUS_EDUCATION = "Christian Religious Education",
  INTEGRATED_SCIENCE = "Integrated Science",
  SCIENCE_AND_TECHNOLOGY = "Science and Technology",
  SOCIAL_STUDIES = "Social Studies",
  AGRICULTURE_AND_NUTRITION = "Agriculture and Nutrition"
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';
