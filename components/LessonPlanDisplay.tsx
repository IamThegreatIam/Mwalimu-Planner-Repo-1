
import React, { useState, useEffect, useRef } from 'react';
import { LessonPlanData, Assignment, UserProfile, SharedNote, QuizQuestion } from '../types';
import { generateSimilarQuestions, generateStructuredQuestions, generateSimplifiedNotes } from '../services/geminiService';
import { saveAssignment, getCurrentUser, savePlan, getClassrooms, shareNoteToClassroom } from '../services/storageService';
import { 
  ArrowLeft, Download, Printer, Loader2, RefreshCw, Plus, Send, Lock, 
  ChevronDown, ChevronUp, BookOpen, Check, X, FileText, HelpCircle, Layout, Share2, MessageSquare, Edit3, Save, Trash2, Calendar, Monitor, PenTool
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props {
  plan: LessonPlanData;
  onBack: () => void;
}

type NoteStyle = 'standard' | 'whiteboard' | 'presentation';

const LessonPlanDisplay: React.FC<Props> = ({ plan, onBack }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<LessonPlanData>(plan);
  const [activeTab, setActiveTab] = useState<'plan' | 'notes' | 'questions'>('plan');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesWordCount, setNotesWordCount] = useState(350);
  const [noteStyle, setNoteStyle] = useState<NoteStyle>('standard');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'assignment' | 'notes'>('assignment');
  
  // Editable notes state
  const [editableNotes, setEditableNotes] = useState(plan.learnerNotes || '');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuizQuestion>({
      id: 0, type: 'mcq', question: '', correctAnswer: '', options: ['', '', '', '']
  });
  const [dueDate, setDueDate] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    setCurrentPlan(plan);
    setEditableNotes(plan.learnerNotes || '');
  }, [plan]);

  const isGuest = !user;

  const handleSaveChanges = () => {
      if (user && currentPlan.id) {
          // Update the plan with whatever is in the editable text area before saving
          const updatedPlan = { ...currentPlan, learnerNotes: editableNotes };
          setCurrentPlan(updatedPlan);
          savePlan(updatedPlan);
          setIsEditing(false);
      }
  };

  const handleGenerateQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const newQuestions = await generateSimilarQuestions(currentPlan.topic, currentPlan.subject, currentPlan.grade);
      const updatedPlan = { ...currentPlan, structuredQuestions: newQuestions };
      setCurrentPlan(updatedPlan);
      if (user && currentPlan.id) savePlan(updatedPlan);
    } catch (error) {
      alert("Failed to regenerate questions.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAddStructuredQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const structuredQs = await generateStructuredQuestions(currentPlan);
      const updatedQs = [...(currentPlan.structuredQuestions || []), ...structuredQs];
      const updatedPlan = { ...currentPlan, structuredQuestions: updatedQs };
      setCurrentPlan(updatedPlan);
      if (user && currentPlan.id) savePlan(updatedPlan);
    } catch (error) {
      alert("Failed to add structured questions.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleManualAddQuestion = () => {
      if (!newQuestion.question || !newQuestion.correctAnswer) {
          alert("Please fill in the question and correct answer.");
          return;
      }
      
      const qToAdd = { ...newQuestion, id: Date.now() };
      const updatedQs = [...(currentPlan.structuredQuestions || []), qToAdd];
      const updatedPlan = { ...currentPlan, structuredQuestions: updatedQs };
      setCurrentPlan(updatedPlan);
      if (user && currentPlan.id) savePlan(updatedPlan);
      
      setShowAddQuestion(false);
      setNewQuestion({ id: 0, type: 'mcq', question: '', correctAnswer: '', options: ['', '', '', ''] });
  };

  const handleDeleteQuestion = (idx: number) => {
      if(!confirm("Delete this question?")) return;
      const updatedQs = currentPlan.structuredQuestions?.filter((_, i) => i !== idx);
      const updatedPlan = { ...currentPlan, structuredQuestions: updatedQs };
      setCurrentPlan(updatedPlan);
      if (user && currentPlan.id) savePlan(updatedPlan);
  };

  const handleRegenerateNotes = async () => {
      setLoadingNotes(true);
      try {
          const newNotes = await generateSimplifiedNotes(currentPlan, notesWordCount, noteStyle);
          setEditableNotes(newNotes);
          const updatedPlan = { ...currentPlan, learnerNotes: newNotes };
          setCurrentPlan(updatedPlan);
          if (user && currentPlan.id) savePlan(updatedPlan);
      } catch (error) {
          alert("Failed to regenerate notes.");
      } finally {
          setLoadingNotes(false);
      }
  };

  const handleAssignToClass = (mode: 'assignment' | 'notes' = 'assignment') => {
      if (isGuest) return;
      const userClassrooms = getClassrooms();
      if (userClassrooms.length === 0) {
          alert("No classrooms found. Create one in the Dashboard first.");
          return;
      }
      setAssignmentMode(mode);
      setClassrooms(userClassrooms);
      setShowClassSelector(true);
  };

  const confirmAction = (classId: string) => {
      if (assignmentMode === 'assignment') {
          if (!dueDate) {
              if(!confirm("No due date set. Do you want to proceed?")) return;
          }

          const assignment: Assignment = {
              id: crypto.randomUUID(),
              classroomId: classId,
              subject: currentPlan.subject,
              topic: currentPlan.topic,
              questions: currentPlan.structuredQuestions || [],
              createdAt: new Date().toISOString(),
              grade: currentPlan.grade,
              dueDate: dueDate || undefined
          };
          saveAssignment(assignment);
          alert("Assignment posted successfully!");
      } else {
          // Share Notes
          if (!editableNotes) {
              alert("No notes available to share.");
              return;
          }
          const note: SharedNote = {
              id: crypto.randomUUID(),
              title: currentPlan.topic,
              content: editableNotes,
              dateShared: new Date().toISOString(),
              subject: currentPlan.subject,
              images: currentPlan.images
          };
          shareNoteToClassroom(classId, note);
          alert("Notes shared to classroom successfully!");
      }
      setShowClassSelector(false);
  };

  const handleDownloadPDF = async () => {
      if (!contentRef.current) return;
      try {
          const canvas = await html2canvas(contentRef.current, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${currentPlan.topic}_${activeTab}.pdf`);
      } catch (e) {
          console.error(e);
      }
  };

  const handleDownloadWord = () => {
      let bodyContent = '';
      let title = '';
      let fileNameSuffix = '';

      const metadataTable = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10pt; font-family: Arial, sans-serif; border: 1px solid #000;">
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; width: 10%;">Teacher</td>
            <td style="border: 1px solid #000; padding: 4px; width: 25%;">${currentPlan.teacherName}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; width: 10%;">School</td>
            <td style="border: 1px solid #000; padding: 4px; width: 25%;">${currentPlan.schoolName}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; width: 10%;">Date</td>
            <td style="border: 1px solid #000; padding: 4px; width: 10%;">${currentPlan.date}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; width: 10%;">Subject</td>
            <td style="border: 1px solid #000; padding: 4px;">${currentPlan.subject}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">Grade</td>
            <td style="border: 1px solid #000; padding: 4px;">${currentPlan.grade}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">Term</td>
            <td style="border: 1px solid #000; padding: 4px;">${currentPlan.term}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">Roll</td>
            <td style="border: 1px solid #000; padding: 4px;">${currentPlan.roll}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">Time</td>
            <td style="border: 1px solid #000; padding: 4px;">40 min</td>
          </tr>
        </table>
      `;

      if (activeTab === 'plan') {
          title = `Lesson Plan - ${currentPlan.date}`;
          fileNameSuffix = 'Plan';
          bodyContent = `
            ${metadataTable}
            
            <div style="font-family: Arial, sans-serif; font-size: 10pt;">
              <p style="margin: 3px 0;"><strong>Strand:</strong> ${currentPlan.strand}</p>
              <p style="margin: 3px 0;"><strong>Sub-strand:</strong> ${currentPlan.subStrand}</p>
              <p style="margin: 10px 0; font-weight: bold; text-transform: uppercase;">${currentPlan.topic.toUpperCase()}</p>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">SPECIFIC LEARNING OUTCOMES</p>
              <ul style="margin-top: 0; padding-left: 20px; list-style-type: disc;">
                  ${currentPlan.learningOutcomes.map(o => `<li>${o}</li>`).join('')}
              </ul>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">KEY INQUIRY QUESTIONS</p>
              <ul style="margin-top: 0; padding-left: 20px; list-style-type: disc;">
                  ${currentPlan.keyInquiryQuestions.map(q => `<li>${q}</li>`).join('')}
              </ul>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">LEARNING RESOURCES</p>
              <p style="margin-top: 0;">${currentPlan.learningResources.join(", ")}</p>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">INTRODUCTION (5 MIN)</p>
              <p style="margin-top: 0;">${currentPlan.introduction}</p>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">LESSON DEVELOPMENT (25 MIN)</p>
              <p style="margin-top: 0; margin-bottom: 4px;"><strong>Step 1:</strong> ${currentPlan.developmentSteps.step1}</p>
              <p style="margin-top: 0; margin-bottom: 4px;"><strong>Step 2:</strong> ${currentPlan.developmentSteps.step2}</p>
              <p style="margin-top: 0; margin-bottom: 4px;"><strong>Step 3:</strong> ${currentPlan.developmentSteps.step3}</p>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">EXTENDED ACTIVITIES</p>
              <p style="margin-top: 0;">${currentPlan.extendedActivities}</p>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">CONCLUSION (5 MIN)</p>
              <p style="margin-top: 0;">${currentPlan.conclusion}</p>

              <p style="margin-top: 10px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">REFLECTION</p>
              <div style="height: 60px; border: 1px solid #000; width: 100%;"></div>
            </div>
          `;
      } else if (activeTab === 'notes') {
          title = `Learner Notes - ${currentPlan.topic}`;
          fileNameSuffix = 'Notes';
          bodyContent = `
              <div style="font-family: Arial, sans-serif; font-size: 11pt;">
                  <h1 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">${currentPlan.topic}</h1>
                  <p style="margin-bottom: 5px;"><strong>Subject:</strong> ${currentPlan.subject}</p>
                  <p style="margin-bottom: 15px;"><strong>Grade:</strong> ${currentPlan.grade}</p>
                  <hr style="margin-bottom: 15px;"/>
                  ${editableNotes ? editableNotes.replace(/\n/g, '<br/>') : 'No notes available.'}
              </div>
          `;
      } else if (activeTab === 'questions') {
          title = `Assessment Questions - ${currentPlan.topic}`;
          fileNameSuffix = 'Quiz';
          bodyContent = `
              <div style="font-family: Arial, sans-serif; font-size: 11pt;">
                  <h1 style="font-size: 14pt; font-weight: bold; margin-bottom: 15px;">Assessment: ${currentPlan.topic}</h1>
                  ${currentPlan.structuredQuestions?.map((q, i) => `
                      <div style="margin-bottom: 15px;">
                          <p style="font-weight: bold;">Q${i + 1}. ${q.question}</p>
                          ${q.type === 'mcq' && q.options ? `
                              <ul style="list-style-type: none; padding-left: 10px;">
                                  ${q.options.map((opt, idx) => `<li>${String.fromCharCode(65 + idx)}. ${opt}</li>`).join('')}
                              </ul>
                          ` : '<p>___________________________________________________</p>'}
                      </div>
                  `).join('') || 'No questions available.'}
                  
                  <br/>
                  <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20px;">Marking Guide</h2>
                  ${currentPlan.structuredQuestions?.map((q, i) => `
                      <p><strong>Q${i + 1}:</strong> ${q.correctAnswer}</p>
                  `).join('') || ''}
              </div>
          `;
      }

      const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title></head><body>`;
      const postHtml = "</body></html>";
      const html = preHtml + bodyContent + postHtml;

      const blob = new Blob(['\ufeff', html], {
          type: 'application/msword'
      });
      
      const url = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement("a");
      document.body.appendChild(downloadLink);
      
      if(navigator.userAgent.indexOf("Safari") != -1 && navigator.userAgent.indexOf("Chrome") == -1) {
          // Safari-specific handling if needed
          downloadLink.href = url;
      } else {
          downloadLink.href = url;
      }
      
      downloadLink.download = `${currentPlan.topic}_${fileNameSuffix}.doc`;
      downloadLink.click();
      document.body.removeChild(downloadLink);
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex justify-between items-center shadow-sm no-print">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-teal-600 font-medium">
                <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </button>
            {!isGuest && (
                <button 
                    onClick={() => {
                        if (isEditing) handleSaveChanges();
                        else setIsEditing(true);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-bold text-sm transition-colors ${isEditing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                    {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {isEditing ? "Save Changes" : "Edit Plan"}
                </button>
            )}
        </div>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Print">
                <Printer className="w-5 h-5" />
            </button>
            <button onClick={handleDownloadWord} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full" title="Download Word">
                <FileText className="w-5 h-5" />
            </button>
            <button onClick={handleDownloadPDF} className="p-2 text-red-600 hover:bg-red-50 rounded-full" title="Download PDF">
                <Download className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-6 no-print">
        <div className="flex space-x-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            {[
                { id: 'plan', label: 'Lesson Plan', icon: Layout },
                { id: 'notes', label: 'Learner Notes', icon: FileText },
                { id: 'questions', label: 'Questions', icon: HelpCircle }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === tab.id 
                        ? 'bg-teal-600 text-white shadow-md' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto mt-6">
        <div ref={contentRef} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 min-h-[800px]">
            
            {/* VIEW 1: LESSON PLAN (Traditional Table Format) */}
            {activeTab === 'plan' && (
                <div className="space-y-6 text-slate-800">
                    <div className="text-center border-b border-gray-200 pb-4">
                        <h1 className="text-2xl font-black uppercase tracking-tight">{currentPlan.schoolName}</h1>
                        <h2 className="text-lg font-bold text-teal-700 mt-1">Professional Lesson Plan</h2>
                    </div>

                    {/* Administrative Details Table */}
                    <div className="overflow-hidden border border-gray-300 rounded-lg">
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr className="divide-x divide-gray-300 border-b border-gray-300">
                                    <td className="p-3 bg-gray-50 font-bold w-1/4">Teacher</td>
                                    <td className="p-3 w-1/4">{currentPlan.teacherName}</td>
                                    <td className="p-3 bg-gray-50 font-bold w-1/4">Grade</td>
                                    <td className="p-3 w-1/4">{currentPlan.grade}</td>
                                </tr>
                                <tr className="divide-x divide-gray-300 border-b border-gray-300">
                                    <td className="p-3 bg-gray-50 font-bold">Subject</td>
                                    <td className="p-3">{currentPlan.subject}</td>
                                    <td className="p-3 bg-gray-50 font-bold">Date</td>
                                    <td className="p-3">{new Date(currentPlan.date).toLocaleDateString()}</td>
                                </tr>
                                <tr className="divide-x divide-gray-300 border-b border-gray-300">
                                    <td className="p-3 bg-gray-50 font-bold">Time</td>
                                    <td className="p-3">40 Minutes</td>
                                    <td className="p-3 bg-gray-50 font-bold">Roll</td>
                                    <td className="p-3">{currentPlan.roll} Learners</td>
                                </tr>
                                <tr className="divide-x divide-gray-300">
                                    <td className="p-3 bg-gray-50 font-bold">Topic</td>
                                    <td className="p-3" colSpan={3}>
                                        {isEditing ? (
                                            <input 
                                                className="w-full border p-1 rounded" 
                                                value={currentPlan.topic} 
                                                onChange={e => setCurrentPlan({...currentPlan, topic: e.target.value})} 
                                            />
                                        ) : currentPlan.topic}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Core Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-1">Strand & Sub-strand</h3>
                                <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                                    <span className="font-semibold text-teal-700">{currentPlan.strand}</span>
                                    <span className="mx-2 text-gray-400">/</span>
                                    <span>{currentPlan.subStrand}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-1">Specific Learning Outcomes</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                                    {currentPlan.learningOutcomes.map((lo, i) => (
                                        <li key={i}>{lo}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-1">Key Inquiry Questions</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                                    {currentPlan.keyInquiryQuestions.map((q, i) => (
                                        <li key={i}>{q}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-1">Learning Resources</h3>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                                    {currentPlan.learningResources.join(', ')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Procedure Table */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Lesson Procedure</h3>
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-300">
                                    <tr>
                                        <th className="p-3 text-left w-24">Step</th>
                                        <th className="p-3 text-left">Learning Experience</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr>
                                        <td className="p-3 font-bold align-top bg-gray-50">Introduction</td>
                                        <td className="p-3">
                                            {isEditing ? <textarea className="w-full border p-2 rounded h-20" value={currentPlan.introduction} onChange={e => setCurrentPlan({...currentPlan, introduction: e.target.value})} /> : currentPlan.introduction}
                                        </td>
                                    </tr>
                                    {Object.entries(currentPlan.developmentSteps).map(([step, content], i) => (
                                        <tr key={i}>
                                            <td className="p-3 font-bold align-top bg-gray-50">Step {i + 1}</td>
                                            <td className="p-3">
                                                {isEditing ? (
                                                    <textarea 
                                                        className="w-full border p-2 rounded h-20" 
                                                        value={content} 
                                                        onChange={e => {
                                                            const newSteps = {...currentPlan.developmentSteps, [step]: e.target.value};
                                                            setCurrentPlan({...currentPlan, developmentSteps: newSteps});
                                                        }} 
                                                    />
                                                ) : content}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td className="p-3 font-bold align-top bg-gray-50">Conclusion</td>
                                        <td className="p-3">
                                            {isEditing ? <textarea className="w-full border p-2 rounded h-20" value={currentPlan.conclusion} onChange={e => setCurrentPlan({...currentPlan, conclusion: e.target.value})} /> : currentPlan.conclusion}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-bold align-top bg-gray-50">Extended</td>
                                        <td className="p-3 italic">
                                            {isEditing ? <textarea className="w-full border p-2 rounded h-20" value={currentPlan.extendedActivities} onChange={e => setCurrentPlan({...currentPlan, extendedActivities: e.target.value})} /> : currentPlan.extendedActivities}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Reflection Box */}
                    <div className="break-inside-avoid">
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Self-Reflection</h3>
                        <div className="border-2 border-gray-300 border-dashed rounded-lg h-32 p-4 text-gray-400 text-sm italic">
                            (Space for teacher's self-reflection after the lesson)
                        </div>
                    </div>

                    {/* Admin Comments Display */}
                    {currentPlan.adminComments && currentPlan.adminComments.length > 0 && (
                        <div className="break-inside-avoid mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-yellow-800 uppercase mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Admin Feedback
                            </h3>
                            <div className="space-y-3">
                                {currentPlan.adminComments.map(comment => (
                                    <div key={comment.id} className="bg-white p-3 rounded border border-yellow-100 text-sm shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-slate-700">{comment.authorName}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(comment.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-slate-600">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW 2: NOTES */}
            {activeTab === 'notes' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-4 gap-4 no-print">
                        <h2 className="text-2xl font-bold text-slate-800">Learner's Notes</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            {!isEditing && (
                                <>
                                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-2 py-1">
                                        <select 
                                            value={noteStyle}
                                            onChange={(e) => setNoteStyle(e.target.value as NoteStyle)}
                                            className="text-sm border-none bg-transparent focus:ring-0 text-gray-700 font-medium"
                                        >
                                            <option value="standard">Standard Notes</option>
                                            <option value="whiteboard">Whiteboard / Blackboard</option>
                                            <option value="presentation">PowerPoint Slides</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleRegenerateNotes} 
                                        disabled={loadingNotes}
                                        className="flex items-center gap-2 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
                                    >
                                        {loadingNotes ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>} 
                                        Generate
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => handleAssignToClass('notes')} 
                                disabled={isGuest} 
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-white text-xs shadow-md transition-colors ${isGuest ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                <Share2 className="w-3 h-3" /> Share to Class
                            </button>
                        </div>
                    </div>
                    
                    {/* Editable / Appendiable Notes Section */}
                    <div className="space-y-4">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-start gap-3 no-print">
                            <Edit3 className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-yellow-800">Teacher's Note Editor</p>
                                <p className="text-xs text-yellow-700">You can edit or paste additional notes below before sharing with your students.</p>
                            </div>
                        </div>

                        <textarea 
                            className="w-full min-h-[500px] p-8 rounded-xl border border-gray-300 font-sans text-base leading-relaxed text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none bg-slate-50/30"
                            value={editableNotes}
                            onChange={(e) => setEditableNotes(e.target.value)}
                            placeholder={loadingNotes ? "Generating content..." : "AI notes will appear here. You can also paste your own notes..."}
                        ></textarea>
                    </div>
                </div>
            )}

            {/* VIEW 3: QUESTIONS */}
            {activeTab === 'questions' && (
                <div className="space-y-8">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">Assessment Questions</h2>
                        <span className="bg-teal-100 text-teal-800 text-xs px-3 py-1 rounded-full font-bold">
                            {currentPlan.structuredQuestions?.length || 0} Items
                        </span>
                    </div>

                    {isEditing && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                            <button 
                                onClick={() => setShowAddQuestion(!showAddQuestion)} 
                                className="flex items-center gap-2 text-blue-700 font-bold text-sm"
                            >
                                <Plus className="w-4 h-4" /> Add New Question
                            </button>
                            
                            {showAddQuestion && (
                                <div className="mt-4 space-y-3 bg-white p-4 rounded border border-blue-100">
                                    <select 
                                        className="w-full border p-2 rounded text-sm"
                                        value={newQuestion.type}
                                        onChange={e => setNewQuestion({...newQuestion, type: e.target.value as 'mcq' | 'structured'})}
                                    >
                                        <option value="mcq">Multiple Choice</option>
                                        <option value="structured">Structured</option>
                                    </select>
                                    <textarea 
                                        className="w-full border p-2 rounded text-sm" 
                                        placeholder="Question Text" 
                                        value={newQuestion.question} 
                                        onChange={e => setNewQuestion({...newQuestion, question: e.target.value})} 
                                    />
                                    {newQuestion.type === 'mcq' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {newQuestion.options?.map((opt, i) => (
                                                <input 
                                                    key={i} 
                                                    className="border p-2 rounded text-sm" 
                                                    placeholder={`Option ${i+1}`} 
                                                    value={opt} 
                                                    onChange={e => {
                                                        const opts = [...(newQuestion.options || [])];
                                                        opts[i] = e.target.value;
                                                        setNewQuestion({...newQuestion, options: opts});
                                                    }} 
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <input 
                                        className="w-full border p-2 rounded text-sm" 
                                        placeholder="Correct Answer" 
                                        value={newQuestion.correctAnswer} 
                                        onChange={e => setNewQuestion({...newQuestion, correctAnswer: e.target.value})} 
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setShowAddQuestion(false)} className="px-3 py-1 text-gray-500 text-xs">Cancel</button>
                                        <button onClick={handleManualAddQuestion} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold">Add Question</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentPlan.structuredQuestions && currentPlan.structuredQuestions.length > 0 ? (
                        <div className="space-y-6">
                            {currentPlan.structuredQuestions.map((q, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 p-5 rounded-lg break-inside-avoid relative group">
                                    {isEditing && (
                                        <button 
                                            onClick={() => handleDeleteQuestion(idx)} 
                                            className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Question"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="flex gap-3">
                                        <span className="font-bold text-teal-600 whitespace-nowrap">Q{idx + 1}.</span>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-800 mb-3">{q.question}</p>
                                            
                                            {q.image && (
                                                <img src={q.image} alt="Question" className="max-h-48 rounded-lg mb-3 border border-gray-200" />
                                            )}

                                            {q.type === 'mcq' && q.options ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                    {q.options.map((opt, i) => (
                                                        <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 text-sm">
                                                            <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 font-bold">
                                                                {String.fromCharCode(65 + i)}
                                                            </span>
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-16 border-b border-gray-300 border-dashed mb-4 bg-white/50 rounded p-2 text-xs text-gray-400">
                                                    (Student response space)
                                                </div>
                                            )}

                                            <div className="bg-green-50 p-3 rounded border border-green-100 text-sm">
                                                <p className="text-green-800 font-bold text-xs uppercase mb-1">Correct Answer</p>
                                                <p className="text-gray-700">{q.correctAnswer}</p>
                                                {q.explanation && <p className="text-gray-500 mt-1 text-xs italic">{q.explanation}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            No questions generated yet.
                        </div>
                    )}

                    {/* Actions Footer */}
                    <div className="border-t border-gray-200 pt-6 mt-8 no-print">
                        <div className="flex flex-wrap justify-center gap-4">
                            <button 
                                onClick={handleGenerateQuestions} 
                                disabled={loadingQuestions} 
                                className="flex items-center gap-2 bg-white border border-teal-600 text-teal-600 px-4 py-2 rounded-lg hover:bg-teal-50 text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {loadingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                                Regenerate MCQs
                            </button>
                            <button 
                                onClick={handleAddStructuredQuestions} 
                                disabled={loadingQuestions} 
                                className="flex items-center gap-2 bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {loadingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
                                Add Structured Qs
                            </button>
                            
                            <div className="w-px h-10 bg-gray-300 mx-2 hidden md:block"></div>

                            <button 
                                onClick={() => handleAssignToClass('assignment')} 
                                disabled={isGuest} 
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95 ${isGuest ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}
                            >
                                {isGuest ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                {isGuest ? "Sign In to Assign" : "Assign Quiz to Class"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* Class Selector Modal */}
      {showClassSelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
                  <div className="bg-slate-900 px-4 py-3 text-white flex justify-between items-center">
                      <h3 className="font-bold text-sm">Select Classroom to {assignmentMode === 'notes' ? 'Share Notes' : 'Assign Quiz'}</h3>
                      <button onClick={() => setShowClassSelector(false)}><X className="w-4 h-4"/></button>
                  </div>
                  
                  {assignmentMode === 'assignment' && (
                      <div className="p-4 border-b border-gray-100 bg-gray-50">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                          <input 
                              type="date" 
                              className="w-full border border-gray-300 rounded p-2 text-sm"
                              value={dueDate}
                              onChange={e => setDueDate(e.target.value)}
                          />
                      </div>
                  )}

                  <div className="p-2 max-h-80 overflow-y-auto">
                      {classrooms.map(cls => (
                          <button 
                              key={cls.id}
                              onClick={() => confirmAction(cls.id)}
                              className="w-full text-left p-3 hover:bg-slate-50 border-b border-gray-100 last:border-0 transition-colors"
                          >
                              <div className="font-bold text-slate-800">{cls.grade} - {cls.stream}</div>
                              <div className="text-xs text-slate-500">{cls.students.length} Students</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LessonPlanDisplay;
