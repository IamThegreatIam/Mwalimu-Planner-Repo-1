
import React, { useState, useEffect, useMemo } from 'react';
import { Grade, Term, LessonDefinition, LessonPlanData, Subject, UserProfile, GenerationStatus } from '../types';
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

import { SCHEMES_OF_WORK_T2 } from '../data/term_2/maths_t2';
import { PRETECH_SCHEMES_T2 } from '../data/term_2/pretech_t2';
import { CREATIVE_ARTS_SCHEMES_T2 } from '../data/term_2/creative_arts_t2';
import { CRE_SCHEMES_T2 } from '../data/term_2/cre_t2';
import { INTEGRATED_SCIENCE_SCHEMES_T2 } from '../data/term_2/integrated_science_t2';
import { SCIENCE_TECHNOLOGY_SCHEMES_T2 } from '../data/term_2/science_technology_t2';
import { SOCIAL_STUDIES_SCHEMES_T2 } from '../data/term_2/social_studies_t2';
import { AGRICULTURE_NUTRITION_SCHEMES_T2 } from '../data/term_2/agriculture_nutrition_t2';
import { ENGLISH_SCHEMES_T2 } from '../data/term_2/english_t2';
import { KISWAHILI_SCHEMES_T2 } from '../data/term_2/kiswahili_t2';
import { generateLessonPlan, generateSimplifiedNotes, generatePracticeQuestions } from '../services/geminiService';
import { savePlan } from '../services/storageService';
import { Loader2, BookOpen, AlertCircle, Upload, Paperclip, X, Plus, Trash2, CheckCircle2, Zap, Users as UsersIcon } from 'lucide-react';

interface BulkRow {
  id: string;
  subject: Subject;
  grade: Grade;
  strand: string;
  subStrand: string;
  lesson: LessonDefinition | null;
  status: GenerationStatus;
  roll: number;
}

interface Props {
  userProfile?: UserProfile | null;
  onPlanGenerated: (data: LessonPlanData) => void;
}

const LessonGenerator: React.FC<Props> = ({ userProfile, onPlanGenerated }) => {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [formData, setFormData] = useState({
    teacherName: userProfile?.name || '',
    schoolName: userProfile?.school || '',
    date: new Date().toISOString().split('T')[0],
    grade: Grade.GRADE_7,
    term: Term.TERM_1,
    roll: 40,
    subject: Subject.MATHEMATICS,
    customContext: '',
    images: [] as string[]
  });

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { id: crypto.randomUUID(), subject: Subject.MATHEMATICS, grade: Grade.GRADE_7, strand: '', subStrand: '', lesson: null, status: 'idle', roll: 40 }
  ]);

  // Sync profile
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        teacherName: userProfile.name,
        schoolName: userProfile.school
      }));
    }
  }, [userProfile]);

  const [selectedStrand, setSelectedStrand] = useState<string>('');
  const [selectedSubStrand, setSelectedSubStrand] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<LessonDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanTopic = (topic: string) => topic.replace(/^Lesson \d+:\s*/i, '');

  const getSchemes = (subject: Subject, grade: Grade, term: Term) => {
    if (term === Term.TERM_2) {
      switch (subject) {
        case Subject.MATHEMATICS: return SCHEMES_OF_WORK_T2[grade] || [];
        case Subject.PRETECHNICAL_STUDIES: return PRETECH_SCHEMES_T2[grade] || [];
        case Subject.CREATIVE_ARTS: return CREATIVE_ARTS_SCHEMES_T2[grade] || [];
        case Subject.CHRISTIAN_RELIGIOUS_EDUCATION: return CRE_SCHEMES_T2[grade] || [];
        case Subject.INTEGRATED_SCIENCE: return INTEGRATED_SCIENCE_SCHEMES_T2[grade] || [];
        case Subject.SCIENCE_AND_TECHNOLOGY: return SCIENCE_TECHNOLOGY_SCHEMES_T2[grade] || [];
        case Subject.SOCIAL_STUDIES: return SOCIAL_STUDIES_SCHEMES_T2[grade] || [];
        case Subject.AGRICULTURE_AND_NUTRITION: return AGRICULTURE_NUTRITION_SCHEMES_T2[grade] || [];
        case Subject.ENGLISH: return ENGLISH_SCHEMES_T2[grade] || [];
        case Subject.KISWAHILI: return KISWAHILI_SCHEMES_T2[grade] || [];
        default: return [];
      }
    } else if (term === Term.TERM_1) {
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
    } else {
      return [];
    }
  };

  const gradeData = useMemo(() => getSchemes(formData.subject, formData.grade, formData.term), [formData.grade, formData.subject, formData.term]);
  const strands = useMemo(() => Array.from(new Set(gradeData.map(l => l.strand))), [gradeData]);
  const subStrands = useMemo(() => Array.from(new Set(gradeData.filter(l => l.strand === selectedStrand).map(l => l.subStrand))), [gradeData, selectedStrand]);
  const lessons = useMemo(() => gradeData.filter(l => l.strand === selectedStrand && l.subStrand === selectedSubStrand), [gradeData, selectedStrand, selectedSubStrand]);

  useEffect(() => { setSelectedStrand(''); setSelectedSubStrand(''); setSelectedLesson(null); }, [formData.grade, formData.subject]);
  useEffect(() => { setSelectedSubStrand(''); setSelectedLesson(null); }, [selectedStrand]);
  useEffect(() => { setSelectedLesson(null); }, [selectedSubStrand]);

  const addBulkRow = () => {
    if (bulkRows.length < 6) {
      setBulkRows([...bulkRows, { id: crypto.randomUUID(), subject: Subject.MATHEMATICS, grade: Grade.GRADE_7, strand: '', subStrand: '', lesson: null, status: 'idle', roll: formData.roll }]);
    }
  };

  const removeBulkRow = (id: string) => {
    if (bulkRows.length > 1) {
      setBulkRows(bulkRows.filter(r => r.id !== id));
    }
  };

  const updateBulkRow = (id: string, updates: Partial<BulkRow>) => {
    setBulkRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleBulkGenerate = async () => {
    const validRows = bulkRows.filter(r => r.lesson);
    if (validRows.length === 0) {
      setError("Please select at least one valid lesson for bulk generation.");
      return;
    }
    setLoading(true);
    setError(null);

    const generateTask = async (row: BulkRow) => {
      if (!row.lesson) return;
      updateBulkRow(row.id, { status: 'loading' });
      try {
        const rowFormData = { ...formData, subject: row.subject, grade: row.grade, roll: row.roll };
        const cleanLessonDef = { ...row.lesson, topic: cleanTopic(row.lesson.topic) };
        
        const plan = await generateLessonPlan(rowFormData, cleanLessonDef);
        const [notes, questions] = await Promise.all([
          generateSimplifiedNotes(plan, 500),
          generatePracticeQuestions(plan)
        ]);

        const completePlan: LessonPlanData = {
          ...plan,
          learnerNotes: notes,
          structuredQuestions: questions,
          topic: cleanTopic(plan.topic),
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          userId: userProfile?.email
        };

        savePlan(completePlan);
        updateBulkRow(row.id, { status: 'success' });
      } catch (err) {
        console.error(err);
        updateBulkRow(row.id, { status: 'error' });
      }
    };

    await Promise.allSettled(validRows.map(row => generateTask(row)));
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if (formData.images.length + files.length > 5) {
        alert("You can upload a maximum of 5 images.");
        return;
      }
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulkMode) {
      handleBulkGenerate();
      return;
    }

    if (!selectedLesson) {
      setError("Please select a specific lesson.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const cleanLessonDef = { ...selectedLesson, topic: cleanTopic(selectedLesson.topic) };
      const plan = await generateLessonPlan(formData, cleanLessonDef);
      const [notes, questions] = await Promise.all([
        generateSimplifiedNotes(plan, 500),
        generatePracticeQuestions(plan)
      ]);
      const completePlan = {
        ...plan,
        learnerNotes: notes,
        structuredQuestions: questions,
        topic: cleanTopic(plan.topic),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      if (userProfile) savePlan(completePlan);
      onPlanGenerated(completePlan);
    } catch (err: any) {
      setError(err.message || "An error occurred generating the plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200/60 overflow-hidden no-print">
      <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 p-2 rounded-lg border border-teal-100/50">
             <BookOpen className="text-teal-600 w-5 h-5" />
          </div>
          <div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Lesson Parameters</h2>
              <p className="text-xs text-slate-500 font-medium">Define the core settings for teaching</p>
          </div>
        </div>
        {userProfile && (
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50">
              <button 
                type="button"
                onClick={() => setIsBulkMode(false)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${!isBulkMode ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                SINGLE LESSON
              </button>
              <button 
                type="button"
                onClick={() => setIsBulkMode(true)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${isBulkMode ? 'bg-slate-800 text-white shadow-sm border border-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                BULK BATCH
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Teacher Name</label>
              <input required type="text" value={formData.teacherName} onChange={e => setFormData({ ...formData, teacherName: e.target.value })} className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-2.5 shadow-sm" placeholder="Enter Name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">School</label>
              <input required type="text" value={formData.schoolName} onChange={e => setFormData({ ...formData, schoolName: e.target.value })} readOnly={!!userProfile?.schoolId} className={`w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-2.5 shadow-sm ${userProfile?.schoolId ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} placeholder="Enter School" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-2.5 shadow-sm" />
            </div>
            {!isBulkMode && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Subject</label>
                <select value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value as Subject })} className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-2.5 shadow-sm">
                  {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {!isBulkMode ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Grade</label>
                <select value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value as Grade })} className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-3 py-2.5 shadow-sm">
                  {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Term</label>
                <select value={formData.term} onChange={e => setFormData({ ...formData, term: e.target.value as Term })} className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-3 py-2.5 shadow-sm">
                  {Object.values(Term).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Roll</label>
                <input type="number" value={formData.roll} onChange={e => setFormData({ ...formData, roll: parseInt(e.target.value) })} className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-3 py-2.5 shadow-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Time</label>
                <div className="w-full py-2.5 px-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-200/60 shadow-inner text-sm font-medium">40 Minutes</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50/50 to-white p-6 md:p-8 rounded-2xl border border-teal-100/60 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-teal-100/50 pb-4">
                 <div className="bg-teal-100/50 p-2 rounded-md">
                   <BookOpen className="text-teal-700 w-4 h-4" />
                 </div>
                 <h3 className="text-teal-900 font-semibold tracking-tight">Curriculum Content Selector</h3>
              </div>
              
              {gradeData.length === 0 ? (
                <div className="text-center text-slate-500 py-8 bg-white/50 rounded-xl border border-dashed border-teal-200">No lesson data available for this selection.</div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-teal-800/70 uppercase tracking-widest">Strand</label>
                      <select value={selectedStrand} onChange={e => setSelectedStrand(e.target.value)} className="w-full bg-white border border-teal-200/60 hover:border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-3 shadow-sm">
                        <option value="">-- Choose Strand --</option>
                        {strands.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-teal-800/70 uppercase tracking-widest">Sub-strand</label>
                      <select value={selectedSubStrand} onChange={e => setSelectedSubStrand(e.target.value)} className="w-full bg-white border border-teal-200/60 hover:border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-3 shadow-sm disabled:opacity-60 disabled:bg-teal-50/30" disabled={!selectedStrand}>
                        <option value="">-- Choose Sub-strand --</option>
                        {subStrands.map(ss => <option key={ss} value={ss}>{ss}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-teal-800/70 uppercase tracking-widest">Lesson</label>
                    <select value={selectedLesson ? JSON.stringify(selectedLesson) : ""} onChange={e => e.target.value && setSelectedLesson(JSON.parse(e.target.value))} className="w-full bg-white border border-teal-200/60 hover:border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-3 shadow-sm disabled:opacity-60 disabled:bg-teal-50/30" disabled={!selectedSubStrand}>
                      <option value="">-- Choose Lesson --</option>
                      {lessons.map((l, idx) => <option key={idx} value={JSON.stringify(l)}>{cleanTopic(l.topic)}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                 <h3 className="font-semibold text-slate-800 tracking-tight">Batch Production List</h3>
                 <p className="text-xs text-slate-500">Generate multiple lessons in one go.</p>
              </div>
              <button type="button" onClick={addBulkRow} disabled={bulkRows.length >= 6} className="text-[11px] font-bold bg-slate-900 text-white px-4 py-2.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> ADD ROW
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Subject</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Grade</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-20">Roll</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Strand</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Sub-strand</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Lesson</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bulkRows.map((row) => {
                    const rowData = getSchemes(row.subject, row.grade, formData.term);
                    const rowStrands = Array.from(new Set(rowData.map(l => l.strand)));
                    const rowSubStrands = Array.from(new Set(rowData.filter(l => l.strand === row.strand).map(l => l.subStrand)));
                    const rowLessons = rowData.filter(l => l.strand === row.strand && l.subStrand === row.subStrand);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2">
                          <select value={row.subject} onChange={e => updateBulkRow(row.id, { subject: e.target.value as Subject, strand: '', subStrand: '', lesson: null })} className="w-full bg-white border border-slate-200 rounded shrink-0 text-xs p-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none">
                            {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <select value={row.grade} onChange={e => updateBulkRow(row.id, { grade: e.target.value as Grade, strand: '', subStrand: '', lesson: null })} className="w-full bg-white border border-slate-200 rounded shrink-0 text-xs p-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none">
                            {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td className="p-2 w-24">
                          <input 
                            type="number" 
                            min="1" 
                            max="200" 
                            value={row.roll} 
                            onChange={e => updateBulkRow(row.id, { roll: parseInt(e.target.value) || 40 })} 
                            className="w-full bg-white border border-slate-200 rounded shrink-0 text-xs p-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                            placeholder="Roll"
                          />
                        </td>
                        <td className="p-2">
                          <select value={row.strand} onChange={e => updateBulkRow(row.id, { strand: e.target.value, subStrand: '', lesson: null })} className="w-full bg-white border border-slate-200 rounded shrink-0 text-xs p-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none">
                            <option value="">--</option>
                            {rowStrands.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <select value={row.subStrand} onChange={e => updateBulkRow(row.id, { subStrand: e.target.value, lesson: null })} className="w-full bg-white border border-slate-200 rounded shrink-0 text-xs p-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-slate-50" disabled={!row.strand}>
                            <option value="">--</option>
                            {rowSubStrands.map(ss => <option key={ss} value={ss}>{ss}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <select value={row.lesson ? JSON.stringify(row.lesson) : ""} onChange={e => updateBulkRow(row.id, { lesson: e.target.value ? JSON.parse(e.target.value) : null })} className="w-full bg-white border border-slate-200 rounded shrink-0 text-xs p-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-slate-50" disabled={!row.subStrand}>
                            <option value="">--</option>
                            {rowLessons.map((l, idx) => <option key={idx} value={JSON.stringify(l)}>{cleanTopic(l.topic)}</option>)}
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2 pr-2">
                            {row.status === 'loading' && <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />}
                            {row.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {row.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                            <button type="button" onClick={() => removeBulkRow(row.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border border-slate-100 rounded-xl p-6 md:p-8 bg-slate-50/50 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
             <Paperclip className="w-4 h-4 text-slate-500" />
             <h3 className="text-slate-800 font-semibold tracking-tight">Context & Resources</h3>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2 bg-slate-200/50 px-2 py-0.5 rounded-full">Optional</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Additional Context</label>
              <textarea className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-lg text-sm px-4 py-3 shadow-sm outline-none resize-none" rows={3} placeholder="Any specific requirements, learner needs, or focus areas for this plan..." value={formData.customContext} onChange={(e) => setFormData({ ...formData, customContext: e.target.value })}></textarea>
            </div>
            {!isBulkMode && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Upload Resource Photos</label>
                <div className="flex flex-col gap-3">
                  <label className="cursor-pointer bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-4 py-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 flex justify-center items-center gap-2 transition-all group">
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" /> 
                    <span>Select Images from Device</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={formData.images.length >= 5} />
                  </label>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                     <span>Max 5 images per plan.</span>
                     <span className={`px-2 py-0.5 rounded-full ${formData.images.length >= 5 ? 'bg-red-100 text-red-700' : 'bg-slate-200/50 text-slate-600'}`}>{formData.images.length} / 5 uploaded</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" />
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
          <button type="button" className="px-6 py-3.5 border border-slate-200 shadow-sm text-sm font-bold rounded-xl text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => { setBulkRows([{ id: crypto.randomUUID(), subject: Subject.MATHEMATICS, grade: Grade.GRADE_7, strand: '', subStrand: '', lesson: null, status: 'idle', roll: 40 }]); setFormData({ ...formData, customContext: '', images: [] }); }}>
            Clear Form
          </button>
          <button type="submit" disabled={loading} className="flex-1 flex justify-center items-center gap-2 px-6 py-3.5 border border-transparent shadow-[0_4px_14px_0_rgb(13,148,136,0.39)] text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-70 disabled:shadow-none disabled:cursor-not-allowed transition-all uppercase tracking-wide">
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                {isBulkMode ? "Generating Batch..." : "Generating Lesson..."}
              </>
            ) : (
              <>
                {isBulkMode ? <Zap className="w-5 h-5" /> : <BookOpen className="w-5 h-5 fill-teal-700/30" />}
                {isBulkMode ? "Generate All Lesson Plans" : "Generate Lesson Plan"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonGenerator;
