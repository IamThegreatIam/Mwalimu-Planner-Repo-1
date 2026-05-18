
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Classroom, Grade, Subject, Assignment, StudentResult, ForumPost, ForumReply, DirectMessage, AppNotification, Textbook, SharedNote, LessonDefinition, Student } from '../types';
import { 
  User, School, Phone, Mail, Save, Plus, Trash2, 
  BookOpen, Users, Eye, X, Home, FileText, Settings, 
  Menu, Bell, ChevronDown, Check, ArrowLeft, MessageSquare, ChevronRight, MessageCircle, Send, Reply, ChevronLeft, Layers, Bookmark, Sparkles, Upload, FileText as FileIcon, Building2, Key, Clock, ListChecks, Filter, CheckSquare, Loader2, BarChart2,
  Book, Search, Info, Copy, ClipboardCheck, Link, BrainCircuit, AlertCircle
} from 'lucide-react';
import { 
    createClassroom, getClassrooms, deleteClassroom, addSubjectToClassroom, 
    removeSubjectFromClassroom, getSavedPlans, getAssignmentsByClassId, 
    getAssignmentResults, updateStudentResultFeedback, createForumPost, 
    addForumReply, sendDirectMessage, getDirectMessages, markMessagesRead, 
    getNotifications, markNotificationRead, uploadTextbookToClassroom,
    addStudentsToClassroom, deleteStudentFromClassroom, addSingleStudentToClassroom,
    saveAssignment, getAllResultsGlobal, updateUserProfile, getAllAssignmentsGlobal
} from '../services/storageService';
import { generateCAT } from '../services/geminiService';

// Curriculum Data Imports
import { SCHEMES_OF_WORK } from '../data/term_1/maths';
import { PRETECH_SCHEMES } from '../data/term_1/pretech';
import { CREATIVE_ARTS_SCHEMES } from '../data/term_1/creative_arts';
import { CRE_SCHEMES } from '../data/term_1/cre';
import { INTEGRATED_SCIENCE_SCHEMES } from '../data/term_1/integrated_science';
import { SCIENCE_TECHNOLOGY_SCHEMES } from '../data/term_1/science_technology';
import { SOCIAL_STUDIES_SCHEMES } from '../data/term_1/social_studies';
import { AGRICULTURE_NUTRITION_SCHEMES } from '../data/term_1/agriculture_nutrition';
import { ENGLISH_SCHEMES } from '../data/term_1/english';
import { KISWAHILI_SCHEMES } from '../data/term_1/kiswahili';

interface StatCardProps {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}

const StatCard = ({ icon: Icon, label, value, color }: StatCardProps) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-transform hover:-translate-y-1 duration-300">
    <div>
      <div className={`p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3 ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{label}</h3>
    </div>
    <div className="text-right">
      <span className={`text-4xl font-light ${color.replace('bg-', 'text-')}`}>{value}</span>
    </div>
  </div>
);

const Dashboard: React.FC<{ profile: UserProfile; onUpdate: (profile: UserProfile) => void }> = ({ profile, onUpdate }) => {
  const [activeView, setActiveView] = useState<'overview' | 'classrooms' | 'profile' | 'inbox' | 'cat_gen'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [totalPlans, setTotalPlans] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  
  // Management Modal State
  const [managedClassroom, setManagedClassroom] = useState<Classroom | null>(null);
  const [manageTab, setManageTab] = useState<'students' | 'performance' | 'grading'>('students');
  const [selectedStudentForGrading, setSelectedStudentForGrading] = useState<Student | null>(null);
  const [selectedResultForGrading, setSelectedResultForGrading] = useState<StudentResult | null>(null);
  const [teacherFeedbackInput, setTeacherFeedbackInput] = useState('');
  
  const [dmModal, setDmModal] = useState<{studentName: string, studentCode: string} | null>(null);
  const [dmInput, setDmInput] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [newClassGrade, setNewClassGrade] = useState<Grade>(Grade.GRADE_7);
  const [newClassStream, setNewClassStream] = useState('');
  const [newClassRoll, setNewClassRoll] = useState<number>(40);
  const [newStudentName, setNewStudentName] = useState('');

  // Profile Edit State
  const [editProfile, setEditProfile] = useState<UserProfile>({...profile});
  const [copySuccess, setCopySuccess] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // CAT Generator State
  const [catSubject, setCatSubject] = useState<Subject>(Subject.MATHEMATICS);
  const [catGrade, setCatGrade] = useState<Grade>(Grade.GRADE_7);
  const [selectedLessonsForCAT, setSelectedLessonsForCAT] = useState<string[]>([]);
  const [isGeneratingCAT, setIsGeneratingCAT] = useState(false);
  const [catTargetClass, setCatTargetClass] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
        setNotifications(getNotifications(profile.email));
        setMessages(getDirectMessages(profile.email));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const cls = getClassrooms();
    setClassrooms(cls);
    const plans = getSavedPlans();
    setTotalPlans(plans.length);
    setNotifications(getNotifications(profile.email));
    setMessages(getDirectMessages(profile.email));

    if (managedClassroom) {
        const updated = cls.find(c => c.id === managedClassroom.id);
        if (updated) setManagedClassroom(updated);
        else setManagedClassroom(null);
    }
  };

  const getSchemes = (subject: Subject, grade: Grade) => {
    switch (subject) {
      case Subject.MATHEMATICS: return SCHEMES_OF_WORK[grade] || [];
      case Subject.PRETECHNICAL_STUDIES: return PRETECH_SCHEMES[grade] || [];
      case Subject.CREATIVE_ARTS: return CREATIVE_ARTS_SCHEMES[grade] || [];
      case Subject.CHRISTIAN_RELIGIOUS_EDUCATION: return CRE_SCHEMES[grade] || [];
      case Subject.INTEGRATED_SCIENCE: return INTEGRATED_SCIENCE_SCHEMES[grade] || [];
      case Subject.SCIENCE_AND_TECHNOLOGY: return SCIENCE_TECHNOLOGY_SCHEMES[grade] || [];
      case Subject.SOCIAL_STUDIES: return SOCIAL_STUDIES_SCHEMES[grade] || [];
      case Subject.AGRICULTURE_AND_NUTRITION: return AGRICULTURE_NUTRITION_SCHEMES[grade] || [];
      case Subject.ENGLISH: return ENGLISH_SCHEMES[grade] || [];
      case Subject.KISWAHILI: return KISWAHILI_SCHEMES[grade] || [];
      default: return [];
    }
  };

  const availableLessons = useMemo(() => getSchemes(catSubject, catGrade), [catSubject, catGrade]);

  const handleCreateClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (newClassStream && newClassRoll > 0) {
        try {
            createClassroom(newClassGrade, newClassStream, newClassRoll);
            loadData();
            setShowAddClassModal(false);
            setNewClassStream('');
            setNewClassRoll(40);
        } catch (err: any) {
            setCreateError(err.message || "Failed to create classroom.");
        }
    }
  };

  const handleDeleteClassroom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent navigating if the card is clicked
    if (window.confirm('Are you sure? All student data will be lost.')) {
        deleteClassroom(id);
        loadData();
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      updateUserProfile(editProfile);
      onUpdate(editProfile);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Update failed.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const copyTeacherCode = () => {
    if (profile.teacherCode) {
      navigator.clipboard.writeText(profile.teacherCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleAddStudent = () => {
      if (managedClassroom && newStudentName.trim()) {
          addSingleStudentToClassroom(managedClassroom.id, newStudentName);
          setNewStudentName('');
          loadData();
      }
  };

  const handleDeleteStudent = (studentCode: string) => {
      if (managedClassroom && confirm("Remove this student?")) {
          deleteStudentFromClassroom(managedClassroom.id, studentCode);
          loadData();
      }
  };

  const openClassroomManager = (cls: Classroom) => {
      setManagedClassroom(cls);
      setManageTab('students');
      setSelectedStudentForGrading(null);
      setSelectedResultForGrading(null);
      setActiveView('classrooms');
  };

  // --- Student Grading Logic ---

  const handleOpenStudentGrading = (student: Student) => {
      setSelectedStudentForGrading(student);
      setManageTab('grading');
      setSelectedResultForGrading(null); // Reset selection
  };

  const handleSelectResultForGrading = (result: StudentResult) => {
      setSelectedResultForGrading(result);
      setTeacherFeedbackInput(result.feedback || '');
  };

  const saveFeedback = () => {
      if (selectedResultForGrading) {
          updateStudentResultFeedback(selectedResultForGrading.id, teacherFeedbackInput);
          // Update local state to reflect change immediately
          setSelectedResultForGrading({ ...selectedResultForGrading, feedback: teacherFeedbackInput });
          alert("Feedback saved successfully.");
          loadData(); // Refresh global data
      }
  };

  // ---

  const openDmModal = (s: Student) => {
      setDmModal({ studentName: s.name || 'Student', studentCode: s.code });
  };

  const sendDm = () => {
      if (!dmModal || !dmInput.trim()) return;
      const msg: DirectMessage = { id: crypto.randomUUID(), senderId: profile.email, senderName: profile.name, receiverId: dmModal.studentCode, content: dmInput, timestamp: new Date().toISOString(), read: false, isFromTeacher: true };
      sendDirectMessage(msg);
      setDmModal(null);
      setDmInput('');
      loadData();
  };

  const handleReplyToStudent = (studentId: string) => {
      if (!replyText.trim()) return;
      const msg: DirectMessage = { id: crypto.randomUUID(), senderId: profile.email, senderName: profile.name, receiverId: studentId, content: replyText, timestamp: new Date().toISOString(), read: false, isFromTeacher: true };
      sendDirectMessage(msg);
      setReplyText('');
      loadData();
  };

  const handleSelectThread = (studentId: string) => {
      setSelectedThread(studentId);
      markMessagesRead(studentId, profile.email);
      loadData();
  };

  const handleNotificationClick = (notif: AppNotification) => {
      markNotificationRead(notif.id);
      if (notif.type === 'message') setActiveView('inbox');
      loadData();
      setShowNotifications(false);
  };

  const classPerformance = useMemo(() => {
      if (!managedClassroom) return { byStudent: [] };
      const results = getAllResultsGlobal() || [];
      const studentData = (managedClassroom.students || []).map(s => {
          const studentResults = results.filter(r => r && r.studentCode === s.code);
          const totalScore = studentResults.reduce((acc: number, curr) => acc + (curr.score / curr.total), 0);
          const avg = studentResults.length > 0 ? (totalScore / studentResults.length) * 100 : 0;
          return { name: s.name || 'Student', code: s.code, avg: avg.toFixed(1), attempts: studentResults.length, recent: studentResults[0] };
      });
      return { byStudent: studentData };
  }, [managedClassroom]);

  const handleGenerateCAT = async () => {
      if (selectedLessonsForCAT.length === 0 || !catTargetClass) {
          alert("Please select lessons and a target classroom.");
          return;
      }
      setIsGeneratingCAT(true);
      try {
          const selectedLessonObjects = availableLessons.filter(l => selectedLessonsForCAT.includes(l.topic));
          const questions = await generateCAT(catSubject, catGrade, selectedLessonObjects, 20);
          const topic = `CAT: ${catSubject} - ${catGrade}`;
          const assign: Assignment = { id: crypto.randomUUID(), classroomId: catTargetClass, subject: catSubject, topic: topic, questions: questions, createdAt: new Date().toISOString(), grade: catGrade };
          saveAssignment(assign);
          alert("CAT Generated and assigned successfully!");
          setSelectedLessonsForCAT([]);
          setActiveView('classrooms');
      } catch (err) {
          alert("CAT generation failed.");
      } finally {
          setIsGeneratingCAT(false);
      }
  };

  const toggleLessonSelection = (topic: string) => {
      setSelectedLessonsForCAT(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const unreadMessagesCount = (messages || []).filter(m => m && !m.read && m.receiverId === profile.email).length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {sidebarOpen && (<div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}/>)}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isCollapsed ? 'w-20' : 'w-64'} flex flex-col`}>
        <div className="flex items-center h-16 px-4 bg-slate-950 text-white font-bold text-xl border-b border-slate-800">
          {!isCollapsed ? (<div className="flex items-center"><BookOpen className="w-6 h-6 mr-2 text-teal-500" /><span>Admin</span></div>) : (<BookOpen className="w-8 h-8 text-teal-500" />)}
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <button onClick={() => setActiveView('overview')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${activeView === 'overview' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
            <Home className="w-5 h-5 mr-3" /> {!isCollapsed && "Dashboard"}
          </button>
          <button onClick={() => setActiveView('classrooms')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${activeView === 'classrooms' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
            <Layers className="w-5 h-5 mr-3" /> {!isCollapsed && "Classrooms"}
          </button>
          <button onClick={() => setActiveView('cat_gen')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${activeView === 'cat_gen' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
            <ListChecks className="w-5 h-5 mr-3" /> {!isCollapsed && "CAT Generator"}
          </button>
          <button onClick={() => setActiveView('inbox')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${activeView === 'inbox' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
            <Mail className="w-5 h-5 mr-3" /> {!isCollapsed && "Inbox"} {unreadMessagesCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 rounded-full">{unreadMessagesCount}</span>}
          </button>
          <button onClick={() => setActiveView('profile')} className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg ${activeView === 'profile' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
            <Settings className="w-5 h-5 mr-3" /> {!isCollapsed && "Profile Settings"}
          </button>
        </nav>
      </aside>
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-gray-500">
               <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 capitalize">{activeView.replace('_', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4 relative">
             <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-400 relative hover:bg-gray-50 rounded-full">
               <Bell className="w-5 h-5" />
               {(notifications || []).some(n=>!n.read) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>}
             </button>
             
             {/* Notification Dropdown */}
             {showNotifications && (
               <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-teal-50/50' : ''}`}>
                          <div className="flex gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-teal-500' : 'bg-transparent'}`}></div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-800">{n.title}</h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-gray-400 mt-2 block">{new Date(n.timestamp).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No notifications</p>
                      </div>
                    )}
                  </div>
               </div>
             )}

             <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">{profile.name.charAt(0)}</div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full">
          {activeView === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={FileText} label="Lesson Plans" value={totalPlans} color="bg-teal-500" />
                <StatCard icon={Users} label="Classrooms" value={classrooms.length} color="bg-blue-500" />
                <StatCard icon={CheckSquare} label="Pending Tasks" value={unreadMessagesCount} color="bg-purple-500" />
            </div>
          )}

          {/* ... [Profile Section remains unchanged] ... */}
          {activeView === 'profile' && (
            <div className="max-w-4xl space-y-8 animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="bg-slate-900 px-8 py-6 text-white">
                      <h3 className="text-lg font-bold">Personal Information</h3>
                      <p className="text-slate-400 text-xs uppercase tracking-widest font-black">Manage your teacher profile</p>
                    </div>
                    <form onSubmit={handleUpdateProfileSubmit} className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                              type="text" 
                              required 
                              value={editProfile.name} 
                              onChange={e => setEditProfile({...editProfile, name: e.target.value})} 
                              className="w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email (Static)</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                              type="email" 
                              readOnly
                              value={profile.email} 
                              className="w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-sm text-gray-400"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                              type="tel" 
                              value={editProfile.phone} 
                              onChange={e => setEditProfile({...editProfile, phone: e.target.value})} 
                              className="w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">School / Institution</label>
                          <div className="relative">
                            <School className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                              type="text" 
                              value={editProfile.school} 
                              onChange={e => setEditProfile({...editProfile, school: e.target.value})} 
                              className="w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        disabled={isUpdatingProfile}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
                      >
                        {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </button>
                    </form>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                        <Link className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800">School Link</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      Provide this unique code to your school administrator to link your account to the school portal.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center group">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">My Teacher Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-mono font-black text-slate-800 tracking-widest">
                          {profile.teacherCode || "N/A"}
                        </span>
                        <button 
                          onClick={copyTeacherCode}
                          className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                          title="Copy Code"
                        >
                          {copySuccess ? <ClipboardCheck className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    {profile.schoolId ? (
                      <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl border border-green-100">
                        <Check className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tight">Linked to School Database</span>
                      </div>
                    ) : (
                      <div className="mt-6 flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <Info className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tight">Independent Account</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'classrooms' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-xl text-gray-600 font-light">My Classrooms</h2><button onClick={() => setShowAddClassModal(true)} className="bg-teal-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Classroom</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {classrooms.map(room => (
                        <div key={room.id} onClick={() => openClassroomManager(room)} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md cursor-pointer transition-all relative">
                            <div className="flex justify-between items-start mb-4">
                                <div><h4 className="text-lg font-bold">{room.grade} - {room.stream}</h4><p className="text-xs text-gray-500">{room.students.length} Students</p></div>
                                <div className="flex gap-2">
                                    <button 
                                      onClick={(e) => handleDeleteClassroom(e, room.id)} 
                                      className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 z-10"
                                      title="Delete Classroom"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {classrooms.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 italic bg-white rounded-xl border border-dashed">No classrooms yet. Click the button above to create one.</div>}
                </div>
            </div>
          )}

          {/* ... [CAT Gen & Inbox Sections remain largely unchanged] ... */}
          {activeView === 'cat_gen' && (
            <div className="bg-white rounded-xl border shadow-sm p-8">
                <div className="mb-8 border-b pb-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-teal-800">CAT Generator</h2>
                        <p className="text-sm text-gray-500">Generate a professional quiz from chosen curriculum lessons.</p>
                    </div>
                    <button 
                        onClick={handleGenerateCAT} 
                        disabled={isGeneratingCAT || selectedLessonsForCAT.length === 0 || !catTargetClass} 
                        className="bg-teal-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                        {isGeneratingCAT ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} 
                        Generate & Assign Quiz
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border">
                            <h4 className="font-bold text-sm mb-3">1. Select Context</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                                    <select value={catSubject} onChange={e => { setCatSubject(e.target.value as Subject); setSelectedLessonsForCAT([]); }} className="w-full border rounded-lg p-2 text-sm">
                                        {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade</label>
                                    <select value={catGrade} onChange={e => { setCatGrade(e.target.value as Grade); setSelectedLessonsForCAT([]); }} className="w-full border rounded-lg p-2 text-sm">
                                        {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Classroom</label>
                                    <select value={catTargetClass} onChange={e => setCatTargetClass(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
                                        <option value="">-- Choose Class --</option>
                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.grade} - {c.stream}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <h4 className="font-bold text-sm">2. Choose Lessons ({selectedLessonsForCAT.length} selected)</h4>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Max 10 Lessons</div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto divide-y">
                                {availableLessons.map((l, i) => (
                                    <label key={i} className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLessonsForCAT.includes(l.topic)}
                                            onChange={() => toggleLessonSelection(l.topic)}
                                            className="w-4 h-4 text-teal-600 rounded"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{l.topic.replace(/^Lesson \d+:\s*/i, '')}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-medium">{l.strand} / {l.subStrand}</p>
                                        </div>
                                    </label>
                                ))}
                                {availableLessons.length === 0 && <div className="p-10 text-center text-gray-400 italic">No lessons found for this selection.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeView === 'inbox' && (
              <div className="h-[calc(100vh-12rem)] bg-white rounded-xl border flex overflow-hidden shadow-sm">
                  <div className="w-1/3 border-r overflow-y-auto bg-gray-50/50">
                      <div className="p-4 border-b bg-white font-bold flex items-center justify-between">
                          <span>Students</span>
                          <span className="bg-teal-100 text-teal-700 text-[10px] px-2 py-0.5 rounded-full">{(Array.from(new Set((messages || []).filter(m => m && !m.isFromTeacher).map(m => m.senderId))) || []).length} Threads</span>
                      </div>
                      {(Array.from(new Set((messages || []).filter(m => m && !m.isFromTeacher).map(m => m.senderId))) as string[]).map((sid: string) => {
                          const last = messages.filter(m=>m && (m.senderId===sid || m.receiverId===sid)).pop();
                          return (
                            <div key={sid} onClick={()=>handleSelectThread(sid)} className={`p-4 border-b hover:bg-white cursor-pointer transition-all ${selectedThread===sid ? 'bg-white border-l-4 border-l-teal-600' : ''}`}>
                                <p className="font-bold text-sm text-slate-800">{last?.senderName || sid}</p>
                                <p className="text-xs text-gray-500 truncate mt-1">{last?.content}</p>
                                <p className="text-[10px] text-gray-400 mt-2">{last ? new Date(last.timestamp).toLocaleDateString() : ''}</p>
                            </div>
                          );
                      })}
                  </div>
                  <div className="flex-1 flex flex-col bg-white">
                      {selectedThread ? (
                        <>
                            <div className="p-4 border-b font-bold flex justify-between items-center">
                                <span>Chat with {selectedThread}</span>
                                <button onClick={() => setSelectedThread(null)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {(messages || []).filter(m=>m && (m.senderId===selectedThread || m.receiverId===selectedThread)).map(m=>(
                                    <div key={m.id} className={`flex ${m.isFromTeacher ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-3 rounded-2xl max-w-[75%] text-sm shadow-sm ${m.isFromTeacher ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                            <p className="leading-relaxed">{m.content}</p>
                                            <p className="text-[10px] mt-2 opacity-50 text-right">{new Date(m.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={(e)=>{e.preventDefault(); handleReplyToStudent(selectedThread)}} className="p-4 border-t flex gap-3">
                                <input type="text" className="flex-1 border rounded-full px-6 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Type a message..." />
                                <button className="bg-teal-600 text-white p-3 rounded-full hover:bg-teal-700 transition-colors shadow-md"><Send className="w-5 h-5" /></button>
                            </form>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/30">
                            <Mail className="w-16 h-16 opacity-10 mb-4" />
                            <p className="font-bold uppercase tracking-widest text-xs">Select a student thread to start</p>
                        </div>
                      )}
                  </div>
              </div>
          )}
        </main>
      </div>

      {/* Classroom Manager Modal */}
      {managedClassroom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden h-[90vh] flex flex-col animate-fade-in-up">
                  <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                      <div><h3 className="font-bold text-lg">{managedClassroom.grade} - {managedClassroom.stream}</h3><p className="text-slate-400 text-xs uppercase font-black tracking-widest">Class Management Hub</p></div>
                      <button onClick={() => setManagedClassroom(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex border-b bg-gray-50 overflow-x-auto">
                      {[
                          { id: 'students', label: 'Student Roster', icon: Users },
                          { id: 'performance', label: 'Analytics', icon: BarChart2 }
                      ].map(t => (<button key={t.id} onClick={() => { setManageTab(t.id as any); setSelectedStudentForGrading(null); }} className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${manageTab === t.id && !selectedStudentForGrading ? 'border-b-4 border-teal-600 text-teal-700 bg-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}><t.icon className="w-4 h-4"/> {t.label}</button>))}
                  </div>
                  <div className="flex-1 overflow-y-auto bg-white">
                      
                      {/* Grading View */}
                      {manageTab === 'grading' && selectedStudentForGrading && (
                          <div className="flex flex-col h-full">
                              <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                      <button onClick={() => setManageTab('students')} className="bg-white p-2 rounded-lg border hover:bg-gray-50"><ChevronLeft className="w-5 h-5"/></button>
                                      <div>
                                          <h3 className="font-bold text-lg">{selectedStudentForGrading.name}</h3>
                                          <p className="text-xs text-gray-500 font-mono">{selectedStudentForGrading.code}</p>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex-1 flex overflow-hidden">
                                  {/* Submissions List */}
                                  <div className="w-1/3 border-r overflow-y-auto bg-white">
                                      <div className="p-4 bg-gray-50 font-bold text-xs uppercase tracking-widest text-gray-500 border-b">Submission History</div>
                                      {getAllResultsGlobal().filter(r => r.studentCode === selectedStudentForGrading.code).map(result => {
                                          const assign = getAllAssignmentsGlobal().find(a => a.id === result.assignmentId);
                                          return (
                                              <div 
                                                key={result.id} 
                                                onClick={() => handleSelectResultForGrading(result)}
                                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedResultForGrading?.id === result.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''}`}
                                              >
                                                  <p className="font-bold text-sm text-slate-800">{assign?.topic || 'Unknown Assignment'}</p>
                                                  <div className="flex justify-between items-center mt-2">
                                                      <span className="text-xs text-gray-500">{new Date(result.dateTaken).toLocaleDateString()}</span>
                                                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${result.score/result.total >= 0.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                          {result.score}/{result.total}
                                                      </span>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                      {getAllResultsGlobal().filter(r => r.studentCode === selectedStudentForGrading.code).length === 0 && (
                                          <div className="p-8 text-center text-gray-400 italic text-sm">No submissions yet.</div>
                                      )}
                                  </div>

                                  {/* Result Details */}
                                  <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                                      {selectedResultForGrading ? (
                                          <div className="space-y-6">
                                              {/* AI Analysis (Private) */}
                                              <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">Private to Teacher</div>
                                                  <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><BrainCircuit className="w-5 h-5"/> AI Pedagogical Analysis</h4>
                                                  <p className="text-sm text-slate-700 leading-relaxed bg-indigo-50/50 p-4 rounded-lg">
                                                      {selectedResultForGrading.aiAnalysis || "No AI analysis available for this submission."}
                                                  </p>
                                              </div>

                                              {/* Teacher Feedback */}
                                              <div className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
                                                  <h4 className="font-bold text-teal-900 mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Teacher Feedback (Visible to Student)</h4>
                                                  <textarea 
                                                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none min-h-[100px]"
                                                      placeholder="Write your feedback here..."
                                                      value={teacherFeedbackInput}
                                                      onChange={e => setTeacherFeedbackInput(e.target.value)}
                                                  />
                                                  <div className="mt-3 flex justify-end">
                                                      <button onClick={saveFeedback} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm">
                                                          <Save className="w-4 h-4" /> Save Feedback
                                                      </button>
                                                  </div>
                                              </div>

                                              {/* Questions Breakdown */}
                                              <div className="space-y-4">
                                                  <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Student Responses</h4>
                                                  {getAllAssignmentsGlobal().find(a => a.id === selectedResultForGrading.assignmentId)?.questions.map((q, idx) => {
                                                      const studentAns = selectedResultForGrading.answers[idx];
                                                      const isCorrect = q.type === 'mcq' 
                                                          ? studentAns === q.correctAnswer 
                                                          : studentAns?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
                                                      
                                                      return (
                                                          <div key={idx} className={`bg-white p-4 rounded-xl border ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                                                              <div className="flex justify-between items-start mb-2">
                                                                  <span className="font-bold text-sm text-slate-700">Q{idx+1}</span>
                                                                  {isCorrect ? <Check className="w-4 h-4 text-green-500"/> : <X className="w-4 h-4 text-red-500"/>}
                                                              </div>
                                                              <p className="text-sm text-slate-800 mb-3 font-medium">{q.question}</p>
                                                              <div className="grid grid-cols-2 gap-4 text-xs">
                                                                  <div className={`p-2 rounded bg-gray-50 ${!isCorrect ? 'text-red-700 bg-red-50 font-bold' : ''}`}>
                                                                      <span className="block text-gray-400 uppercase text-[10px] mb-1">Student Answer</span>
                                                                      {studentAns || 'No Answer'}
                                                                  </div>
                                                                  <div className="p-2 rounded bg-green-50 text-green-800 font-bold">
                                                                      <span className="block text-green-600/60 uppercase text-[10px] mb-1">Correct Answer</span>
                                                                      {q.correctAnswer}
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                              <ListChecks className="w-16 h-16 mb-4 opacity-20" />
                                              <p>Select a submission to view details.</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      )}

                      {manageTab === 'students' && (
                          <div className="p-8">
                              <div className="mb-8 flex gap-3 max-w-lg">
                                <div className="relative flex-1">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input type="text" className="w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm" value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} placeholder="Enter Student Name..." />
                                </div>
                                <button onClick={handleAddStudent} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-md"><Plus className="w-4 h-4" /> Add</button>
                              </div>
                              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                                        <tr><th className="px-8 py-4">Access Code</th><th className="px-8 py-4">Full Name</th><th className="px-8 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(managedClassroom.students || []).map(s => (
                                            <tr key={s.code} onClick={() => handleOpenStudentGrading(s)} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                                                <td className="px-8 py-4 font-mono text-teal-700 font-bold">{s.code}</td>
                                                <td className="px-8 py-4 font-medium text-slate-700">{s.name || <span className="text-gray-300 italic">Unregistered</span>}</td>
                                                <td className="px-8 py-4 text-right flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); openDmModal(s); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Send DM"><MessageCircle className="w-4 h-4" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStudent(s.code); }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Remove Student"><Trash2 className="w-4 h-4" /></button>
                                                    <button className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100" title="View Grades"><Eye className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {managedClassroom.students.length === 0 && (
                                            <tr><td colSpan={3} className="p-12 text-center text-gray-400 italic">No students added yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                              </div>
                          </div>
                      )}
                      {manageTab === 'performance' && (
                          <div className="p-8 space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                                      <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest text-teal-600">
                                          <BarChart2 className="w-5 h-5" /> Performance Ranking
                                      </h4>
                                      <div className="space-y-3">
                                          {(classPerformance.byStudent || []).sort((a,b) => parseFloat(b.avg) - parseFloat(a.avg)).map((s, i) => (
                                              <div key={s.code} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                  <div className="flex items-center gap-3">
                                                      <span className="text-xs text-gray-300 font-black">{i+1}</span>
                                                      <p className="text-sm font-bold text-slate-700">{s.name}</p>
                                                  </div>
                                                  <span className="text-sm font-black text-teal-600">{s.avg}%</span>
                                              </div>
                                          ))}
                                          {classPerformance.byStudent.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No scores available.</p>}
                                      </div>
                                  </div>
                                  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 flex flex-col">
                                      <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest text-blue-600">
                                          <Clock className="w-5 h-5" /> Engagement
                                      </h4>
                                      <div className="space-y-4 flex-1">
                                          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                                              <span className="text-sm font-bold text-slate-500">Quiz Attempts</span>
                                              <span className="text-2xl font-black text-blue-600">{classPerformance.byStudent.reduce((acc: number,curr) => acc + curr.attempts, 0)}</span>
                                          </div>
                                          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                                              <span className="text-sm font-bold text-slate-500">Active Students</span>
                                              <span className="text-2xl font-black text-green-600">{classPerformance.byStudent.filter(s => s.attempts > 0).length}</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Add Classroom Modal */}
      {showAddClassModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white/20">
                  <div className="bg-teal-700 px-8 py-6 text-white flex justify-between items-center">
                      <h3 className="font-black text-xl uppercase tracking-tight">New Classroom</h3>
                      <button onClick={() => { setShowAddClassModal(false); setCreateError(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  <form onSubmit={handleCreateClassroom} className="p-8 space-y-6">
                      {createError && <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100">{createError}</div>}
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Grade Level</label>
                          <select 
                            value={newClassGrade} 
                            onChange={e => setNewClassGrade(e.target.value as Grade)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                          >
                            {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Stream / Class Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. West, Alpha, Blue" 
                            value={newClassStream} 
                            onChange={e => setNewClassStream(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Starting Student Count</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="60" 
                            value={newClassRoll} 
                            onChange={e => setNewClassRoll(parseInt(e.target.value) || 1)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                      </div>
                      <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">
                          Create Class & Generate Codes
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* DM Modal */}
      {dmModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800">Message to {dmModal.studentName}</h3>
                    <button onClick={() => setDmModal(null)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                  </div>
                  <textarea 
                    rows={4} 
                    className="w-full border border-gray-200 rounded-xl p-4 text-sm mb-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Type your instruction or feedback here..." 
                    value={dmInput} 
                    onChange={e=>setDmInput(e.target.value)} 
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setDmModal(null)} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-lg">Cancel</button>
                      <button onClick={sendDm} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md">Send Message</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
