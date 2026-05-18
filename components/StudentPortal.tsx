
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Classroom, Assignment, StudentResult, SharedNote, DirectMessage, ForumPost, ForumReply, Textbook, QuizQuestion } from '../types';
import { 
    authenticateStudent, updateStudentName, getAssignmentsByClassId, getStudentResults, 
    saveStudentResult, getStudentNotes, getDirectMessages, sendDirectMessage, markMessagesRead, 
    addForumReply
} from '../services/storageService';
import { generateStudentPerformanceReport } from '../services/geminiService';
import { 
    LogIn, BookOpen, CheckCircle, Clock, ChevronRight, FileText, AlertCircle, Play, 
    Loader2, Menu, Home, Layers, Book, List, CheckSquare, BarChart2, Mail, MessageSquare, 
    User, LogOut, X, Send, Reply, ChevronLeft, Download, Calendar, RefreshCw, Star, Info,
    Eye, AlertTriangle, Check, Sparkles
} from 'lucide-react';

export default function StudentPortal() {
  const [view, setView] = useState<'login' | 'portal'>('login');
  const [accessCode, setAccessCode] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [activeSection, setActiveSection] = useState<'dashboard' | 'notes' | 'textbooks' | 'all_assignments' | 'pending' | 'results' | 'inbox' | 'forum' | 'profile'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);

  const [selectedNote, setSelectedNote] = useState<SharedNote | null>(null);
  const [selectedResultForReview, setSelectedResultForReview] = useState<StudentResult | null>(null);
  
  const [quizMode, setQuizMode] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [timePerQuestion, setTimePerQuestion] = useState<Record<number, number>>({});
  const [newMessage, setNewMessage] = useState('');
  const [newForumReply, setNewForumReply] = useState('');
  const [activeForumPostId, setActiveForumPostId] = useState<string | null>(null);
  const [hasViewedForum, setHasViewedForum] = useState(false);

  const pendingCount = (assignments || []).filter(a => a && !(results || []).some(r => r && r.assignmentId === a.id)).length;
  const unreadMsgCount = (messages || []).filter(m => m && !m.read && m.receiverId === student?.code).length;

  useEffect(() => {
      if (student && view === 'portal') {
          const interval = setInterval(() => {
              if (classroom) loadStudentData(student.code, classroom.id);
          }, 15000);
          return () => clearInterval(interval);
      }
  }, [student, view, classroom]);

  useEffect(() => {
      if (activeSection === 'inbox' && (messages || []).length > 0 && student && classroom) {
           const unread = messages.some(m => m && !m.read && m.receiverId === student.code);
           if (unread) {
               markMessagesRead(classroom.userId, student.code);
               setMessages(prev => (prev || []).map(m => m.receiverId === student.code ? {...m, read: true} : m));
           }
      }
  }, [activeSection, messages, student, classroom]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accessCode) return;
    setIsInitializing(true);
    const result = authenticateStudent(accessCode.toUpperCase());
    if (result) {
      setStudent(result.student);
      setClassroom(result.classroom);
      if (result.student.name) {
        loadStudentData(result.student.code, result.classroom.id);
        setView('portal');
      }
    } else {
        setError("Invalid Access Code.");
    }
    setIsInitializing(false);
  };

  const handleNameUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (student && classroom && studentName.trim()) {
      const updated = updateStudentName(classroom.id, student.code, studentName);
      if (updated) {
        setStudent(updated);
        loadStudentData(updated.code, classroom.id);
        setTimeout(() => setView('portal'), 50);
      }
    }
  };

  const loadStudentData = (code: string, classId: string) => {
    const classAssignments = getAssignmentsByClassId(classId) || [];
    const studentResults = getStudentResults(code) || [];
    const classNotes = getStudentNotes(classId) || [];
    const msgs = getDirectMessages(code) || [];
    const refreshed = authenticateStudent(code);
    
    if (refreshed) {
        setClassroom(refreshed.classroom);
        setForumPosts(refreshed.classroom.forumPosts || []);
    }
    setAssignments(classAssignments);
    setResults(studentResults);
    setNotes(classNotes);
    setMessages(msgs);
  };

  const groupedNotes = useMemo(() => {
      const groups: Record<string, SharedNote[]> = {};
      (notes || []).forEach(note => {
          if (!note) return;
          if (!groups[note.subject]) groups[note.subject] = [];
          groups[note.subject].push(note);
      });
      return groups;
  }, [notes]);

  const startQuiz = (assignment: Assignment) => {
    const pastAttempts = (results || []).filter(r => r && r.assignmentId === assignment.id).length;
    if (pastAttempts >= 3) {
        alert("Maximum number of attempts (3) reached for this assignment.");
        return;
    }
    setActiveAssignment(assignment);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTimePerQuestion({});
    const now = Date.now();
    setQuizStartTime(now);
    setQuestionStartTime(now);
    setQuizMode(true);
    if(window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleNextQuestion = () => {
      const now = Date.now();
      const timeSpent = (now - questionStartTime) / 1000;
      setTimePerQuestion(prev => ({ ...prev, [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + timeSpent }));
      setQuestionStartTime(now);
      setCurrentQuestionIndex(prev => prev + 1);
  };

  const submitQuiz = async () => {
      if (!student || !activeAssignment) return;
      const now = Date.now();
      const lastSpent = (now - questionStartTime) / 1000;
      const finalTPQ = { ...timePerQuestion, [currentQuestionIndex]: (timePerQuestion[currentQuestionIndex] || 0) + lastSpent };
      const totalTimeTaken = (now - quizStartTime) / 1000;
      setIsSubmitting(true);
      let score = 0;
      activeAssignment.questions.forEach((q, idx) => {
          const userAnswer = selectedAnswers[idx];
          if (userAnswer === q.correctAnswer) score++;
          else if (q.type === 'structured' && userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) score++;
      });
      
      const currentAttempts = (results || []).filter(r => r.assignmentId === activeAssignment.id).length + 1;

      let aiReport = "";
      try {
          aiReport = await generateStudentPerformanceReport(activeAssignment, selectedAnswers, score, totalTimeTaken, finalTPQ);
      } catch (err) { aiReport = "Analysis could not be generated."; }
      
      const result: StudentResult = {
          id: crypto.randomUUID(), 
          assignmentId: activeAssignment.id, 
          studentCode: student.code, 
          studentName: student.name || 'Student', 
          score: score, 
          total: activeAssignment.questions.length, 
          attempts: currentAttempts, 
          answers: selectedAnswers, 
          dateTaken: new Date().toISOString(), 
          timeTaken: totalTimeTaken, 
          timePerQuestion: finalTPQ, 
          aiAnalysis: aiReport
      };
      saveStudentResult(result);
      
      const submissionMsg: DirectMessage = {
          id: crypto.randomUUID(), senderId: student.code, senderName: student.name || 'Student', receiverId: classroom?.userId || '', content: `I submitted: ${activeAssignment.topic}. Attempt ${currentAttempts}/3. Score: ${score}/${activeAssignment.questions.length}.`, timestamp: new Date().toISOString(), read: false, isFromTeacher: false
      };
      if (classroom?.userId) sendDirectMessage(submissionMsg);
      if (classroom) loadStudentData(student.code, classroom.id);
      setIsSubmitting(false); 
      setQuizMode(false); 
      setActiveSection('results'); 
      setActiveAssignment(null);
      setSelectedResultForReview(result);
  };

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !student || !classroom) return;
      const msg: DirectMessage = { id: crypto.randomUUID(), senderId: student.code, senderName: student.name || 'Student', receiverId: classroom.userId, content: newMessage, timestamp: new Date().toISOString(), read: false, isFromTeacher: false };
      sendDirectMessage(msg);
      setNewMessage('');
      loadStudentData(student.code, classroom.id);
  };

  const handleForumReply = (postId: string) => {
      if (!newForumReply.trim() || !student || !classroom) return;
      const reply: ForumReply = { id: crypto.randomUUID(), authorName: student.name || 'Student', authorRole: 'student', content: newForumReply, timestamp: new Date().toISOString() };
      addForumReply(classroom.id, postId, reply);
      setNewForumReply('');
      loadStudentData(student.code, classroom.id);
  };

  const handleDownloadTextbook = (book: Textbook) => {
    const link = document.createElement('a');
    link.href = book.fileData;
    link.download = `${book.title}.${book.fileType}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processedResults = useMemo(() => {
    const map = new Map<string, StudentResult[]>();
    (results || []).forEach(r => { 
        if (!r) return;
        const existing = map.get(r.assignmentId) || [];
        map.set(r.assignmentId, [...existing, r]);
    });
    // For the summary table, we might want the latest or best attempt
    return Array.from(map.values()).map(attempts => attempts.sort((a,b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime())[0]);
  }, [results]);

  const SidebarItem = ({ id, icon: Icon, label, badgeCount }: any) => (
    <button onClick={() => { setActiveSection(id); if (id === 'forum') setHasViewedForum(true); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all group relative ${activeSection === id ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
        <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`} />
        {!isCollapsed && <span>{label}</span>}
        {badgeCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{badgeCount}</span>}
    </button>
  );

  if (view === 'login') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><BookOpen className="w-8 h-8 text-teal-600" /></div>
          <h2 className="text-2xl font-bold text-gray-800">Student Portal</h2>
        </div>
        {student && !student.name ? (
          <form onSubmit={handleNameUpdate} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded text-sm text-blue-700 font-medium">Update your full name to proceed.</div>
            <input type="text" required className="w-full rounded-xl border-gray-300 py-3 border px-4 focus:ring-2 focus:ring-teal-500 outline-none" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Full Name" />
            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl hover:bg-teal-700 font-bold transition-all">Update Profile</button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200 font-medium">{error}</div>}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Student Access Code</label>
              <input type="text" required className="w-full rounded-xl border-gray-300 py-3 border px-4 text-center uppercase font-mono text-2xl tracking-[0.2em] focus:ring-2 focus:ring-teal-500 outline-none" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="XXXXXX" maxLength={6} />
              <p className="mt-4 text-[10px] text-gray-400 text-center uppercase tracking-widest">Try demo code: <span className="font-bold text-teal-600">STUDENT1</span></p>
            </div>
            <button type="submit" disabled={isInitializing} className="w-full bg-teal-600 text-white py-3 rounded-xl hover:bg-teal-700 flex justify-center items-center gap-2 font-bold transition-all">
                {isInitializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Enter Portal
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (quizMode && activeAssignment) {
      const q = activeAssignment.questions[currentQuestionIndex];
      const progress = ((currentQuestionIndex + 1) / activeAssignment.questions.length) * 100;
      return (
        <div className="min-h-screen bg-gray-50 text-slate-800 font-sans pb-12">
          <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm"><div className="max-w-3xl mx-auto flex justify-between items-center"><div><h2 className="font-bold text-gray-800">{activeAssignment.topic}</h2></div><div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Question {currentQuestionIndex + 1} of {activeAssignment.questions.length}</div></div></div>
          <div className="w-full h-1 bg-gray-200"><div className="h-full bg-teal-600 transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
          <div className="max-w-3xl mx-auto p-6 mt-6">
            {isSubmitting ? (<div className="flex flex-col items-center justify-center py-20 animate-pulse"><Loader2 className="w-16 h-16 text-teal-600 animate-spin mb-6" /><h3 className="text-xl font-bold text-gray-800 uppercase tracking-widest">Grading Submission...</h3><p className="text-gray-500 mt-2">AI is evaluating your responses.</p></div>) : (
              <>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-10">
                    <p className="text-xl font-bold text-gray-900 mb-8 leading-relaxed">{q.question}</p>
                    {q.type === 'mcq' ? (
                        <div className="space-y-4">
                            {q.options?.map((opt, i) => (
                                <label key={opt} className={`flex items-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${selectedAnswers[currentQuestionIndex] === opt ? 'border-teal-500 bg-teal-50 shadow-inner' : 'border-gray-100 hover:border-teal-200 hover:bg-slate-50'}`}>
                                    <input type="radio" name="q" className="hidden" value={opt} checked={selectedAnswers[currentQuestionIndex] === opt} onChange={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: opt })} />
                                    <span className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center mr-4 font-bold text-slate-500 bg-white">{String.fromCharCode(65 + i)}</span>
                                    <span className="text-slate-700 font-medium">{opt}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <textarea className="w-full p-6 rounded-2xl border-2 border-gray-100 min-h-[200px] focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-lg transition-all" value={selectedAnswers[currentQuestionIndex] || ''} onChange={e => setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: e.target.value })} placeholder="Type your detailed answer here..." />
                    )}
                </div>
                <div className="mt-10 flex justify-between items-center px-4">
                    <button onClick={() => setQuizMode(false)} className="text-gray-400 font-bold hover:text-red-500 transition-colors uppercase text-xs tracking-widest flex items-center gap-2"><X className="w-4 h-4" /> Quit Session</button>
                    <div className="flex gap-4">
                        {currentQuestionIndex > 0 && <button onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Previous</button>}
                        {currentQuestionIndex < activeAssignment.questions.length - 1 ? (
                            <button onClick={handleNextQuestion} className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all">Continue <ChevronRight className="w-4 h-4 inline ml-1"/></button>
                        ) : (
                            <button onClick={submitQuiz} className="px-10 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all">Submit Quiz</button>
                        )}
                    </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
  }

  return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
          {sidebarOpen && (<div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}/>)}
          <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-950 text-slate-300 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isCollapsed ? 'w-20' : 'w-72'} flex flex-col`}>
              <div className="flex items-center h-20 px-6 bg-black text-white font-black text-2xl tracking-tighter border-b border-slate-900 justify-between">
                  {!isCollapsed ? (<div className="flex items-center"><BookOpen className="w-7 h-7 mr-3 text-teal-500" /><span>StudentHub</span></div>) : (<BookOpen className="w-8 h-8 text-teal-500" />)}
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                  <SidebarItem id="dashboard" icon={Home} label="Dashboard" />
                  <SidebarItem id="notes" icon={FileText} label="Lesson Notes" />
                  <SidebarItem id="textbooks" icon={Book} label="Digital Library" />
                  <SidebarItem id="all_assignments" icon={List} label="All Tasks" />
                  <SidebarItem id="pending" icon={Clock} label="Pending Tests" badgeCount={pendingCount} />
                  <SidebarItem id="results" icon={BarChart2} label="My Performance" />
                  <SidebarItem id="inbox" icon={Mail} label="Teacher Inbox" badgeCount={unreadMsgCount} />
                  <SidebarItem id="forum" icon={MessageSquare} label="Class Forum" badgeCount={!hasViewedForum && (forumPosts || []).length > 0 ? 1 : 0} />
                  <SidebarItem id="profile" icon={User} label="My Account" />
              </nav>
              <div className="p-6 border-t border-slate-900"><button onClick={() => setView('login')} className="flex items-center w-full px-4 py-3 text-sm font-bold rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"><LogOut className="w-5 h-5 mr-3" />{!isCollapsed && "Logout Portal"}</button></div>
          </aside>
          
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} h-screen overflow-hidden`}>
              <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm shrink-0">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-gray-500 hover:bg-slate-50 rounded-lg"><Menu className="w-6 h-6" /></button>
                    <h1 className="text-xl font-black text-slate-800 hidden sm:block uppercase tracking-tight">{activeSection.replace('_', ' ')}</h1>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-black text-slate-800 leading-none">{student?.name}</p>
                        <p className="text-[10px] font-bold text-teal-600 uppercase mt-1">{classroom?.grade} {classroom?.stream}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-900 text-teal-400 rounded-2xl flex items-center justify-center font-black shadow-lg border border-teal-500/20">{student?.name?.charAt(0)}</div>
                  </div>
              </header>

              <main className="flex-1 overflow-y-auto p-4 lg:p-10 max-w-7xl mx-auto w-full">
                  {/* ... other sections ... */}
                  {activeSection === 'dashboard' && (
                    <div className="space-y-10 animate-fade-in">
                        <div className="bg-gradient-to-r from-teal-600 to-slate-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-black mb-2">Welcome back, {student?.name?.split(' ')[0]}!</h2>
                                <p className="text-teal-100 font-medium opacity-90 max-w-lg">Keep up the great work. You have {pendingCount} pending tests to complete this week.</p>
                            </div>
                            <Star className="w-48 h-48 absolute -right-12 -bottom-12 text-white opacity-5 rotate-12" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between">
                                <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">To Do</p><h3 className="text-4xl font-black text-slate-800">{pendingCount}</h3></div>
                                <div className="bg-orange-50 p-5 rounded-2xl text-orange-600 shadow-inner"><Clock className="w-8 h-8" /></div>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between">
                                <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Completed</p><h3 className="text-4xl font-black text-slate-800">{processedResults.length}</h3></div>
                                <div className="bg-teal-50 p-5 rounded-2xl text-teal-600 shadow-inner"><CheckCircle className="w-8 h-8" /></div>
                            </div>
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between">
                                <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Average</p><h3 className="text-4xl font-black text-slate-800">{processedResults.length > 0 ? (processedResults.reduce((a,c) => a + (c.score/c.total), 0) / processedResults.length * 100).toFixed(0) : 0}%</h3></div>
                                <div className="bg-blue-50 p-5 rounded-2xl text-blue-600 shadow-inner"><BarChart2 className="w-8 h-8" /></div>
                            </div>
                        </div>

                        {pendingCount > 0 && (
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-slate-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Up Next: Pending Quizzes</h4>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {(assignments || []).filter(a => a && !(results || []).some(r => r && r.assignmentId === a.id)).slice(0,3).map(a => (
                                        <div key={a.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                            <div>
                                                <h5 className="font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{a.topic}</h5>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{a.subject} • {a.questions.length} Questions</p>
                                            </div>
                                            <button onClick={() => startQuiz(a)} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold text-xs shadow-md hover:bg-teal-700 flex items-center gap-2">Start Quiz <Play className="w-3 h-3 fill-white"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                  )}

                  {activeSection === 'notes' && (
                      <div className="space-y-10 animate-fade-in">
                          <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-100 pb-8">
                            <div><h2 className="text-3xl font-black text-slate-800 tracking-tight">Lesson Notes</h2><p className="text-slate-500 font-medium mt-1">Review summarized content shared by your teacher.</p></div>
                          </div>
                          {Object.keys(groupedNotes).length === 0 ? (
                              <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest">No shared notes available yet</p>
                              </div>
                          ) : (
                              Object.entries(groupedNotes).map(([subject, subjectNotes]: [string, SharedNote[]]) => (
                                  <div key={subject} className="animate-fade-in-up">
                                      <h3 className="text-lg font-black text-teal-800 mb-6 flex items-center gap-3 uppercase tracking-wider"><span className="w-2 h-10 bg-teal-600 rounded-full"></span>{subject}</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                          {(subjectNotes || []).map(note => (
                                              <div key={note.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl hover:shadow-2xl transition-all group flex flex-col h-full">
                                                  <h4 className="font-black text-xl text-slate-800 mb-3 group-hover:text-teal-600 transition-colors leading-snug">{note.title}</h4>
                                                  <p className="text-sm text-slate-500 line-clamp-4 mb-8 leading-relaxed">{(note.content || "").replace(/\*\*/g, '')}</p>
                                                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(note.dateShared).toLocaleDateString()}</span>
                                                      <button onClick={() => setSelectedNote(note)} className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl text-xs font-black hover:bg-teal-600 hover:text-white transition-all shadow-sm">Read Full</button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  )}

                  {activeSection === 'textbooks' && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Digital Library</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(classroom?.textbooks || []).length ? classroom.textbooks.map(book => (
                                <div key={book.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl hover:shadow-2xl transition-all group">
                                    <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all"><Book className="w-8 h-8" /></div>
                                    <h4 className="font-black text-xl text-slate-800 mb-2 leading-tight">{book.title}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Type: {book.fileType} • Size: {book.size}</p>
                                    <button onClick={() => handleDownloadTextbook(book)} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg"><Download className="w-4 h-4" /> Download Book</button>
                                </div>
                            )) : (
                                <div className="col-span-full text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                                    <Book className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest">Your teacher hasn't uploaded any books yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {activeSection === 'all_assignments' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-end"><div><h2 className="text-3xl font-black text-slate-800 tracking-tight">All Tasks</h2><p className="text-slate-500 font-medium">History of all quizzes and assignments.</p></div></div>
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                                    <tr><th className="px-8 py-5">Topic / Lesson</th><th className="px-8 py-5">Subject</th><th className="px-8 py-5">Due Date</th><th className="px-8 py-5 text-right">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(assignments || []).map(a => {
                                        const attempts = (results || []).filter(r => r && r.assignmentId === a.id);
                                        const done = attempts.length > 0;
                                        const maxAttemptsReached = attempts.length >= 3;
                                        
                                        return (
                                            <tr key={a.id} className="hover:bg-slate-50 transition-all group">
                                                <td className="px-8 py-5"><p className="font-bold text-slate-800">{a.topic}</p><p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Attempts: {attempts.length}/3</p></td>
                                                <td className="px-8 py-5"><span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{a.subject}</span></td>
                                                <td className="px-8 py-5 font-bold text-slate-500">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No Limit'}</td>
                                                <td className="px-8 py-5 text-right flex gap-2 justify-end">
                                                    {done && (
                                                        <button 
                                                            onClick={() => setSelectedResultForReview(attempts[0])}
                                                            className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-blue-100 flex items-center gap-1"
                                                        >
                                                            <Eye className="w-3 h-3" /> Review
                                                        </button>
                                                    )}
                                                    {!maxAttemptsReached && (
                                                        <button onClick={() => startQuiz(a)} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-teal-700 shadow-md">
                                                            {done ? 'Retake' : 'Take Quiz'}
                                                        </button>
                                                    )}
                                                    {maxAttemptsReached && (
                                                        <span className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl font-black text-[10px] uppercase cursor-not-allowed">Finalized</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  )}

                  {activeSection === 'pending' && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Active Tests</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {(assignments || []).filter(a => a && !(results || []).some(r => r && r.assignmentId === a.id)).map(a => (
                                <div key={a.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="bg-orange-100 p-4 rounded-2xl text-orange-600"><Clock className="w-8 h-8" /></div>
                                        <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pending</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 mb-2 leading-snug">{a.topic}</h4>
                                    <div className="flex gap-4 mb-8">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Book className="w-3 h-3" /> {a.subject}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> {a.dueDate || 'Ongoing'}</p>
                                    </div>
                                    <button onClick={() => startQuiz(a)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-lg mt-auto">Begin Evaluation</button>
                                </div>
                            ))}
                            {pendingCount === 0 && (
                                <div className="col-span-full text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                                    <CheckSquare className="w-16 h-16 text-teal-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest">You're all caught up! No pending tests.</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {activeSection === 'results' && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Performance Tracker</h2>
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                                    <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Assignment</th><th className="px-8 py-5">Score</th><th className="px-8 py-5 text-right">Actions</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(processedResults || []).map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50 transition-all group">
                                            <td className="px-8 py-5 font-bold text-slate-400">{new Date(r.dateTaken).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 font-bold text-slate-800">{assignments.find(a=>a.id===r.assignmentId)?.topic}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black border ${ (r.score/r.total) >= 0.5 ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                        {r.score}/{r.total}
                                                    </div>
                                                    <span className="text-xs font-black text-slate-300">({(r.score/r.total*100).toFixed(0)}%)</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button 
                                                    onClick={() => setSelectedResultForReview(r)}
                                                    className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-teal-600 transition-all shadow-md flex items-center gap-2 ml-auto"
                                                >
                                                    <Eye className="w-3 h-3" /> Detailed Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {processedResults.length === 0 && (
                                        <tr><td colSpan={4} className="p-20 text-center text-gray-400 italic">No results recorded yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  )}

                  {activeSection === 'inbox' && (
                      <div className="h-[calc(100vh-14rem)] bg-white rounded-3xl border border-gray-100 flex overflow-hidden shadow-2xl animate-fade-in-up">
                          <div className="w-full md:w-80 border-r bg-slate-50 flex flex-col">
                              <div className="p-6 border-b bg-white font-black text-xs uppercase tracking-widest text-slate-400">Teacher Contacts</div>
                              <div onClick={() => markMessagesRead(classroom?.userId || '', student?.code || '')} className="p-6 flex items-center gap-4 bg-white border-l-4 border-teal-600 cursor-pointer">
                                  <div className="w-12 h-12 bg-slate-900 text-teal-400 rounded-2xl flex items-center justify-center font-black">T</div>
                                  <div>
                                      <p className="font-black text-slate-800 text-sm">Class Teacher</p>
                                      <p className="text-[10px] text-teal-600 font-bold uppercase">Online Now</p>
                                  </div>
                              </div>
                          </div>
                          <div className="flex-1 flex flex-col bg-white">
                              <div className="p-6 border-b flex justify-between items-center shadow-sm relative z-10">
                                  <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                      <h3 className="font-black text-slate-800 uppercase tracking-tight">Direct Support</h3>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">End-to-End Encrypted</span>
                              </div>
                              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
                                  {(messages || []).map(m => (
                                      <div key={m.id} className={`flex ${!m.isFromTeacher ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`p-5 rounded-3xl max-w-[80%] shadow-xl text-sm leading-relaxed ${!m.isFromTeacher ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-gray-100'}`}>
                                              <p>{m.content}</p>
                                              <p className="text-[10px] mt-3 opacity-40 font-bold text-right">{new Date(m.timestamp).toLocaleTimeString()}</p>
                                          </div>
                                      </div>
                                  ))}
                                  {(messages || []).length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50"><Mail className="w-16 h-16 mb-4" /><p className="font-black uppercase tracking-widest text-xs">No messages yet</p></div>}
                              </div>
                              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-gray-100 flex gap-4">
                                  <input type="text" className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 transition-all outline-none" value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Ask your teacher a question..." />
                                  <button type="submit" disabled={!newMessage.trim()} className="bg-teal-600 text-white p-4 rounded-2xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"><Send className="w-6 h-6" /></button>
                              </form>
                          </div>
                      </div>
                  )}

                  {activeSection === 'forum' && (
                    <div className="space-y-8 animate-fade-in h-[calc(100vh-14rem)] flex flex-col">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight shrink-0">Classroom Forum</h2>
                        <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                            {(forumPosts || []).length ? forumPosts.map(post => (
                                <div key={post.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden animate-fade-in-up">
                                    <div className="p-8 border-b border-slate-50">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">T</div>
                                            <div><p className="font-black text-slate-800 text-sm">{post.authorName}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(post.timestamp).toLocaleDateString()}</p></div>
                                        </div>
                                        <h4 className="text-xl font-black text-slate-800 mb-3">{post.title}</h4>
                                        <p className="text-slate-600 leading-relaxed text-sm">{post.content}</p>
                                    </div>
                                    <div className="bg-slate-50 px-8 py-6 space-y-4">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Replies ({post.replies?.length || 0})</h5>
                                        {post.replies?.map(r => (
                                            <div key={r.id} className="flex gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${r.authorRole === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{r.authorName.charAt(0)}</div>
                                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex-1">
                                                    <div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-800 text-xs">{r.authorName}</span><span className="text-[10px] text-slate-300">{new Date(r.timestamp).toLocaleTimeString()}</span></div>
                                                    <p className="text-sm text-slate-600">{r.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex gap-4 mt-6">
                                            <input type="text" className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500" value={activeForumPostId === post.id ? newForumReply : ''} onChange={e=>{setActiveForumPostId(post.id); setNewForumReply(e.target.value)}} placeholder="Add to the discussion..." />
                                            <button onClick={() => handleForumReply(post.id)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-teal-600 transition-all"><Reply className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                                    <MessageSquare className="w-16 h-16 text-indigo-100 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest">The class forum is quiet today</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {activeSection === 'profile' && (
                      <div className="max-w-2xl mx-auto space-y-10 animate-fade-in-up">
                          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 text-center relative overflow-hidden">
                              <div className="bg-slate-900 w-32 h-32 rounded-[2.5rem] flex items-center justify-center font-black text-5xl text-teal-400 mx-auto mb-6 shadow-xl relative z-10 border-4 border-white">{student?.name?.charAt(0)}</div>
                              <h3 className="text-3xl font-black text-slate-800 mb-1">{student?.name}</h3>
                              <p className="text-teal-600 font-black uppercase tracking-widest text-sm mb-10">{classroom?.grade} • {classroom?.stream}</p>
                              
                              <div className="grid grid-cols-2 gap-6 relative z-10">
                                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Access Code</p>
                                      <p className="font-mono text-2xl font-black text-slate-800">{student?.code}</p>
                                  </div>
                                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Class ID</p>
                                      <p className="font-mono text-xs font-black text-slate-800 truncate">{classroom?.id.split('-')[0]}...</p>
                                  </div>
                              </div>
                              <div className="mt-10 p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start gap-4 text-left relative z-10">
                                  <Info className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                                  <div>
                                      <p className="font-black text-blue-900 uppercase text-xs tracking-tight mb-1">Security Tip</p>
                                      <p className="text-blue-700 text-xs font-medium leading-relaxed">Keep your Access Code private. This code allows you to log in to your portal and view your assignments and grades.</p>
                                  </div>
                              </div>
                              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -mr-32 -mt-32 opacity-50 z-0"></div>
                          </div>
                      </div>
                  )}
              </main>
          </div>
          
          {selectedNote && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in-up border border-white/20">
                    <div className="bg-slate-950 px-8 py-6 flex justify-between items-center text-white shrink-0">
                        <div>
                            <h3 className="font-black text-xl leading-none">{selectedNote.title}</h3>
                            <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest mt-2">{selectedNote.subject} • Shared {new Date(selectedNote.dateShared).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => setSelectedNote(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="p-10 overflow-y-auto prose prose-slate max-w-none scrollbar-thin scrollbar-thumb-slate-200">
                        <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium">
                            {(selectedNote.content || "").replace(/\*\*/g, '')}
                        </div>
                        {selectedNote.images?.length ? (
                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {selectedNote.images.map((img, i) => (
                                    <img key={i} src={img} alt={`Diagram ${i+1}`} className="rounded-2xl border border-gray-100 shadow-sm" />
                                ))}
                            </div>
                        ) : null}
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end shrink-0">
                        <button onClick={() => setSelectedNote(null)} className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-lg">Close Document</button>
                    </div>
                </div>
              </div>
          )}

          {selectedResultForReview && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[65] p-4">
                  <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                      <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white shrink-0">
                          <div>
                              <h3 className="font-black text-xl uppercase tracking-tight">Submission Review</h3>
                              <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                  {assignments.find(a => a.id === selectedResultForReview.assignmentId)?.topic} • Attempt {selectedResultForReview.attempts}/3
                              </p>
                          </div>
                          <button onClick={() => setSelectedResultForReview(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
                          {/* Performance Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
                                  <p className="text-4xl font-black text-teal-600">{selectedResultForReview.score} / {selectedResultForReview.total}</p>
                              </div>
                              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Percentage</p>
                                  <p className="text-4xl font-black text-indigo-600">{((selectedResultForReview.score/selectedResultForReview.total) * 100).toFixed(0)}%</p>
                              </div>
                              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Taken</p>
                                  <p className="text-4xl font-black text-orange-600">{Math.floor((selectedResultForReview.timeTaken || 0) / 60)}m {Math.floor((selectedResultForReview.timeTaken || 0) % 60)}s</p>
                              </div>
                          </div>

                          {/* Teacher Feedback Only - AI Analysis hidden from student */}
                          {selectedResultForReview.feedback ? (
                              <div className="bg-teal-50 border border-teal-100 p-6 rounded-2xl relative overflow-hidden">
                                  <div className="relative z-10">
                                      <h4 className="text-xs font-black text-teal-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                                          <MessageSquare className="w-4 h-4" /> Teacher's Feedback
                                      </h4>
                                      <p className="text-teal-900 text-sm leading-relaxed font-medium">
                                          {selectedResultForReview.feedback}
                                      </p>
                                  </div>
                                  <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-teal-200/30" />
                              </div>
                          ) : (
                              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-center text-gray-400 italic text-sm">
                                  No feedback provided by the teacher yet.
                              </div>
                          )}

                          {/* Questions Breakdown */}
                          <div className="space-y-6">
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Step-by-Step Breakdown</h4>
                              {assignments.find(a => a.id === selectedResultForReview.assignmentId)?.questions.map((q, idx) => {
                                  const studentAns = selectedResultForReview.answers[idx];
                                  const isCorrect = q.type === 'mcq' 
                                      ? studentAns === q.correctAnswer 
                                      : studentAns?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();

                                  return (
                                      <div key={idx} className={`p-6 rounded-3xl border-2 transition-all ${isCorrect ? 'bg-white border-green-100' : 'bg-white border-red-100'}`}>
                                          <div className="flex justify-between items-start mb-4">
                                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Question {idx + 1}</span>
                                              {isCorrect ? (
                                                  <span className="flex items-center gap-1.5 text-green-600 font-black text-[10px] uppercase bg-green-50 px-3 py-1 rounded-full"><Check className="w-3 h-3" /> Correct</span>
                                              ) : (
                                                  <span className="flex items-center gap-1.5 text-red-600 font-black text-[10px] uppercase bg-red-50 px-3 py-1 rounded-full"><X className="w-3 h-3" /> Incorrect</span>
                                              )}
                                          </div>
                                          <p className="font-bold text-slate-800 mb-6 leading-relaxed">{q.question}</p>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className={`p-4 rounded-2xl border ${isCorrect ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
                                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Your Answer</p>
                                                  <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{studentAns || 'No Answer Provided'}</p>
                                              </div>
                                              {!isCorrect && (
                                                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
                                                      <p className="text-[10px] font-black text-teal-400 uppercase mb-1">Correct Answer</p>
                                                      <p className="font-bold text-teal-800">{q.correctAnswer}</p>
                                                  </div>
                                              )}
                                          </div>
                                          {q.explanation && !isCorrect && (
                                              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Explanation</p>
                                                  <p className="text-xs text-slate-600 leading-relaxed italic">{q.explanation}</p>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                      <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end shrink-0">
                          <button onClick={() => setSelectedResultForReview(null)} className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-lg">Close Review</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
}
