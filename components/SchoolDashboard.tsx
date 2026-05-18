
import React, { useState, useEffect } from 'react';
import { UserProfile, Classroom, Grade, Subject, Student, LessonPlanData, LessonPlanComment } from '../types';
import { 
    getClassrooms, createClassroom, getSchoolTeachers, linkTeacherToSchool, createTeacherAccount,
    addStudentsToClassroom, updateStudentName, getTeacherPlans, deleteStudentFromClassroom, addCommentToPlan,
    deleteClassroom
} from '../services/storageService';
import LessonPlanDisplay from './LessonPlanDisplay';
import { 
    Users, BookOpen, UserPlus, Plus, GraduationCap, School as SchoolIcon, 
    ChevronRight, Copy, Check, Search, Mail, Phone, Lock, Eye, Trash2, Link, ArrowLeft, MessageSquare, Send, X, FileText, Home,
    UserCheck, Briefcase, Calendar
} from 'lucide-react';

interface Props {
  profile: UserProfile;
}

const SchoolDashboard: React.FC<Props> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'classes' | 'students'>('overview');
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  const [showLinkTeacher, setShowLinkTeacher] = useState(false);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [newTeacherForm, setNewTeacherForm] = useState({ name: '', email: '', phone: '', password: '' });

  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassData, setNewClassData] = useState({ grade: Grade.GRADE_7, stream: '', teacherId: '', roll: 40 });

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [bulkStudentCount, setBulkStudentCount] = useState(5);

  const [selectedTeacher, setSelectedTeacher] = useState<UserProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlanData | null>(null);
  const [newComment, setNewComment] = useState('');

  useEffect(() => { loadData(); }, [profile.schoolId]);

  const loadData = () => {
      if (profile.schoolId) {
          setTeachers(getSchoolTeachers(profile.schoolId));
          setClassrooms(getClassrooms());
      }
  };

  const handleLinkTeacher = (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (profile.schoolId && profile.school) {
            linkTeacherToSchool(profile.schoolId, profile.school, teacherCode.toUpperCase());
            setShowLinkTeacher(false); 
            setTeacherCode('');
            loadData(); 
            alert("Teacher linked successfully!");
          }
      } catch (e: any) { alert(e.message); }
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
      e.preventDefault();
      if (profile.schoolId && profile.school) {
          createTeacherAccount(profile.schoolId, profile.school, newTeacherForm.name, newTeacherForm.email, newTeacherForm.phone, newTeacherForm.password);
          setShowCreateTeacher(false); 
          setNewTeacherForm({ name: '', email: '', phone: '', password: '' });
          loadData(); 
          alert("Teacher account created!");
      }
  };

  const handleCreateClass = (e: React.FormEvent) => {
      e.preventDefault();
      createClassroom(newClassData.grade, newClassData.stream, newClassData.roll, newClassData.teacherId);
      setShowAddClass(false); 
      setNewClassData({ grade: Grade.GRADE_7, stream: '', teacherId: '', roll: 40 });
      loadData();
  };

  const handleDeleteClass = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (confirm("Delete this class? All associated student records and assignments will be removed.")) {
          deleteClassroom(id);
          loadData();
      }
  };

  const handleAddBulkStudents = (classId: string) => {
      if (bulkStudentCount > 0) {
          addStudentsToClassroom(classId, bulkStudentCount);
          loadData(); 
          setBulkStudentCount(5);
      }
  };

  const handleDeleteStudent = (classId: string, studentCode: string) => {
      if (confirm("Remove this student from the class?")) {
          deleteStudentFromClassroom(classId, studentCode);
          loadData();
      }
  };

  const handleAddComment = () => {
      if (!selectedPlan || !selectedPlan.id || !newComment.trim()) return;
      const comment: LessonPlanComment = { 
          id: crypto.randomUUID(), 
          authorName: profile.name, 
          date: new Date().toISOString(), 
          content: newComment 
      };
      addCommentToPlan(selectedPlan.id, comment);
      setNewComment('');
      // Update local state to show the comment immediately
      setSelectedPlan({ 
          ...selectedPlan, 
          adminComments: [...(selectedPlan.adminComments || []), comment] 
      });
      alert("Feedback posted.");
  };

  const totalStudents = classrooms.reduce((acc, c) => acc + c.students.length, 0);

  // View specific teacher's plan history
  if (selectedTeacher && !selectedPlan) {
      const teacherPlans = getTeacherPlans(selectedTeacher.email);
      return (
          <div className="min-h-screen bg-slate-50 font-sans pb-10">
              <div className="bg-white border-b px-8 py-6 sticky top-0 z-40 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedTeacher(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowLeft className="w-6 h-6 text-slate-600" />
                      </button>
                      <div>
                          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedTeacher.name}</h2>
                          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Plan Submission History</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-6">
                      <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase">Total Plans</p>
                          <p className="text-lg font-black text-slate-800 leading-none">{teacherPlans.length}</p>
                      </div>
                  </div>
              </div>
              <div className="max-w-5xl mx-auto px-4 mt-8">
                  <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                              <tr>
                                  <th className="px-8 py-5">Topic</th>
                                  <th className="px-8 py-5">Subject</th>
                                  <th className="px-8 py-5">Grade</th>
                                  <th className="px-8 py-5">Date Created</th>
                                  <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {teacherPlans.map(plan => (
                                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-8 py-5 font-bold text-slate-800">{plan.topic}</td>
                                      <td className="px-8 py-5 text-slate-600">{plan.subject}</td>
                                      <td className="px-8 py-5 font-medium text-indigo-600">{plan.grade}</td>
                                      <td className="px-8 py-5 text-slate-400 font-medium">{new Date(plan.createdAt || plan.date).toLocaleDateString()}</td>
                                      <td className="px-8 py-5 text-right">
                                          <button 
                                              onClick={() => setSelectedPlan(plan)}
                                              className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase hover:bg-teal-700 shadow-sm flex items-center gap-1 ml-auto"
                                          >
                                              <Eye className="w-3.5 h-3.5" /> Review & Feedback
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {teacherPlans.length === 0 && (
                                  <tr><td colSpan={5} className="p-20 text-center text-gray-400 italic">No lesson plans submitted by this teacher yet.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  }

  if (selectedPlan) {
      return (
          <div className="min-h-screen bg-gray-100 flex flex-col">
              <div className="bg-white border-b px-6 py-4 sticky top-0 z-40 flex items-center justify-between shadow-sm">
                  <button onClick={() => setSelectedPlan(null)} className="flex items-center text-slate-600 font-bold hover:text-teal-600 transition-colors">
                      <ArrowLeft className="w-5 h-5 mr-2" /> Back to History
                  </button>
                  <h2 className="font-bold text-slate-800 hidden md:block">{selectedPlan.topic}</h2>
                  <div className="w-24"></div>
              </div>
              <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col lg:flex-row max-w-7xl mx-auto gap-8 p-6">
                      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                          <LessonPlanDisplay plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
                      </div>
                      <div className="w-full lg:w-96 shrink-0 space-y-6">
                          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                  <MessageSquare className="w-5 h-5 text-teal-600" /> Admin Feedback
                              </h3>
                              <div className="space-y-4 max-h-[500px] overflow-y-auto mb-6 pr-2">
                                  {selectedPlan.adminComments?.length ? selectedPlan.adminComments.map(c => (
                                      <div key={c.id} className="bg-slate-50 p-4 rounded-xl text-sm border border-slate-100 shadow-sm">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="font-bold text-teal-700">{c.authorName}</span>
                                              <span className="text-[10px] text-gray-400">{new Date(c.date).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-slate-600 leading-relaxed">{c.content}</p>
                                      </div>
                                  )) : (
                                      <div className="text-center py-10 text-gray-400 italic">No feedback comments yet.</div>
                                  )}
                              </div>
                              <div className="relative">
                                  <textarea 
                                      className="w-full p-4 border border-gray-200 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all" 
                                      rows={4} 
                                      value={newComment} 
                                      onChange={e=>setNewComment(e.target.value)} 
                                      placeholder="Write your review or correction notes..." 
                                  />
                                  <button onClick={handleAddComment} disabled={!newComment.trim()} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2">
                                      <Send className="w-4 h-4" /> Post Feedback
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
        <div className="bg-indigo-900 text-white px-8 py-12 shadow-xl flex justify-between items-center overflow-hidden relative">
            <div className="relative z-10">
                <h1 className="text-4xl font-black uppercase tracking-tight mb-2">{profile.school}</h1>
                <p className="text-indigo-200 text-lg font-medium">Academic Management Console</p>
            </div>
            <SchoolIcon className="w-48 h-48 absolute -right-12 -bottom-12 text-white opacity-5 rotate-12" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-wrap md:flex-nowrap gap-2">
                {[
                    { id: 'overview', icon: Home, label: 'Overview' },
                    { id: 'teachers', icon: Users, label: 'Faculty' },
                    { id: 'classes', icon: SchoolIcon, label: 'Classrooms' },
                    { id: 'students', icon: GraduationCap, label: 'Students' }
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-sm transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-12">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in-up">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between"><div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Teachers</p><h3 className="text-5xl font-black text-slate-800">{teachers.length}</h3></div><div className="bg-blue-50 p-6 rounded-3xl text-blue-600 shadow-inner"><Users className="w-10 h-10" /></div></div>
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between"><div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Classes</p><h3 className="text-5xl font-black text-slate-800">{classrooms.length}</h3></div><div className="bg-teal-50 p-6 rounded-3xl text-teal-600 shadow-inner"><SchoolIcon className="w-10 h-10" /></div></div>
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex items-center justify-between"><div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Students</p><h3 className="text-5xl font-black text-slate-800">{totalStudents}</h3></div><div className="bg-orange-50 p-6 rounded-3xl text-orange-600 shadow-inner"><GraduationCap className="w-10 h-10" /></div></div>
                </div>
            )}

            {activeTab === 'teachers' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Faculty Management</h2>
                            <p className="text-gray-500 text-sm">Register or link teachers to the school portal</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={()=>setShowLinkTeacher(true)} className="bg-white border-2 border-indigo-600 text-indigo-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all flex items-center gap-2">
                                <Link className="w-4 h-4" /> Link Existing
                            </button>
                            <button onClick={()=>setShowCreateTeacher(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2">
                                <UserPlus className="w-4 h-4" /> New Teacher
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {teachers.map(t => (
                            <div key={t.email} onClick={() => setSelectedTeacher(t)} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl hover:shadow-2xl transition-all group cursor-pointer relative overflow-hidden">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-slate-900 text-teal-400 rounded-2xl flex items-center justify-center font-black text-2xl border border-teal-500/20 shadow-lg">
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 leading-tight">{t.name}</h3>
                                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{t.phone || 'No phone'}</p>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                                        <Mail className="w-4 h-4" /> {t.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                                        <Lock className="w-4 h-4" /> Code: <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{t.teacherCode || 'N/A'}</span>
                                    </div>
                                </div>
                                <button className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest group-hover:bg-teal-600 group-hover:text-white transition-all">
                                    <Eye className="w-4 h-4" /> Review Plans
                                </button>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                            </div>
                        ))}
                        {teachers.length === 0 && (
                            <div className="col-span-full py-32 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                <Users className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest">No teachers registered yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'classes' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-8"><div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Classrooms</h2><p className="text-gray-500 text-sm">Organize and assign teachers</p></div><button onClick={()=>setShowAddClass(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2"><Plus className="w-4 h-4" /> Create Class</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {classrooms.map(c=>(
                            <div key={c.id} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl hover:shadow-2xl transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><SchoolIcon className="w-8 h-8" /></div>
                                    <button onClick={(e)=>handleDeleteClass(e, c.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-1">{c.grade} - {c.stream}</h3>
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6">{c.students.length} Enrolled</p>
                                <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Teacher</p>
                                    <p className="text-xs font-bold text-slate-700 truncate">{teachers.find(t=>t.email === c.teacherId)?.name || 'Unassigned'}</p>
                                </div>
                                <button onClick={()=>{setSelectedClassId(c.id); setActiveTab('students');}} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md">Manage Students</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="animate-fade-in">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select Target Classroom</label>
                            <select value={selectedClassId || ''} onChange={e=>setSelectedClassId(e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">-- Choose a Classroom --</option>
                                {classrooms.map(c=>(<option key={c.id} value={c.id}>{c.grade} - {c.stream}</option>))}
                            </select>
                        </div>
                        {selectedClassId && (
                            <div className="flex items-end gap-3 w-full md:w-auto">
                                <div className="flex-1 md:w-32"><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Count</label><input type="number" min="1" max="50" value={bulkStudentCount} onChange={e=>setBulkStudentCount(parseInt(e.target.value) || 1)} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold" /></div>
                                <button onClick={()=>handleAddBulkStudents(selectedClassId)} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-sm shadow-md flex items-center gap-2"><Plus className="w-4 h-4" /> Bulk Add</button>
                            </div>
                        )}
                    </div>
                    {selectedClassId ? (
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                                    <tr><th className="px-8 py-5">Code</th><th className="px-8 py-5">Name</th><th className="px-8 py-5 text-right">Actions</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {classrooms.find(c=>c.id===selectedClassId)?.students.map(s=>(
                                        <tr key={s.code} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 font-mono font-bold text-indigo-700">{s.code}</td>
                                            <td className="px-8 py-5 italic text-slate-600">{s.name || 'Pending registration'}</td>
                                            <td className="px-8 py-5 text-right"><button onClick={()=>handleDeleteStudent(selectedClassId, s.code)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm"><Users className="w-16 h-16 mx-auto mb-4 text-gray-200" /><p className="text-gray-400 font-bold uppercase tracking-widest">Select a classroom above to manage the roster</p></div>
                    )}
                </div>
            )}
        </div>

        {/* --- Modals --- */}

        {/* New Classroom Modal */}
        {showAddClass && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                    <div className="bg-indigo-900 px-8 py-6 text-white flex justify-between items-center"><h3 className="font-black text-xl uppercase tracking-tight">New Classroom</h3><button onClick={()=>setShowAddClass(false)}><X className="w-6 h-6"/></button></div>
                    <form onSubmit={handleCreateClass} className="p-8 space-y-5">
                        <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Grade Level</label><select value={newClassData.grade} onChange={e=>setNewClassData({...newClassData, grade: e.target.value as Grade})} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold">{Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                        <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Stream / Name</label><input type="text" required placeholder="e.g. West" value={newClassData.stream} onChange={e=>setNewClassData({...newClassData, stream: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold"/></div>
                        <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assign Teacher</label><select value={newClassData.teacherId} onChange={e=>setNewClassData({...newClassData, teacherId: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold"><option value="">-- Select Teacher --</option>{teachers.map(t => <option key={t.id} value={t.email}>{t.name}</option>)}</select></div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-bold shadow-lg">Generate Classroom</button>
                    </form>
                </div>
            </div>
        )}

        {/* Link Existing Teacher Modal */}
        {showLinkTeacher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                    <div className="bg-indigo-900 px-8 py-6 text-white flex justify-between items-center">
                        <h3 className="font-black text-xl uppercase tracking-tight">Link Existing Teacher</h3>
                        <button onClick={()=>setShowLinkTeacher(false)}><X className="w-6 h-6"/></button>
                    </div>
                    <form onSubmit={handleLinkTeacher} className="p-8 space-y-6">
                        <p className="text-sm text-slate-500 leading-relaxed">Enter the 6-character unique code from the teacher's profile to link them to your school database.</p>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Teacher Link Code</label>
                            <input 
                                type="text" 
                                required 
                                maxLength={6}
                                value={teacherCode} 
                                onChange={e=>setTeacherCode(e.target.value.toUpperCase())} 
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-5 text-center text-3xl font-mono font-black tracking-[0.3em] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                                placeholder="XXXXXX"
                            />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                            <Link className="w-4 h-4" /> Verify & Link Teacher
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Create New Teacher Modal */}
        {showCreateTeacher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                    <div className="bg-teal-700 px-8 py-6 text-white flex justify-between items-center">
                        <h3 className="font-black text-xl uppercase tracking-tight">Register New Teacher</h3>
                        <button onClick={()=>setShowCreateTeacher(false)}><X className="w-6 h-6"/></button>
                    </div>
                    <form onSubmit={handleCreateTeacher} className="p-8 space-y-4">
                        <input type="text" required placeholder="Full Name" value={newTeacherForm.name} onChange={e=>setNewTeacherForm({...newTeacherForm, name:e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold" />
                        <input type="email" required placeholder="Email Address" value={newTeacherForm.email} onChange={e=>setNewTeacherForm({...newTeacherForm, email:e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold" />
                        <input type="tel" placeholder="Phone Number" value={newTeacherForm.phone} onChange={e=>setNewTeacherForm({...newTeacherForm, phone:e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold" />
                        <input type="password" required placeholder="Initial Password" value={newTeacherForm.password} onChange={e=>setNewTeacherForm({...newTeacherForm, password:e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-bold" />
                        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white py-5 rounded-2xl font-bold shadow-lg mt-4">
                            Create Account
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default SchoolDashboard;
