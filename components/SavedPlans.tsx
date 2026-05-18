
import React, { useState, useEffect, useMemo } from 'react';
import { LessonPlanData } from '../types';
import { getSavedPlans, deletePlan } from '../services/storageService';
import { FileText, Calendar, Trash2, ChevronRight, Search, Book, Layers, ArrowUp, ArrowDown, Users as UsersIcon } from 'lucide-react';

interface Props {
  onSelectPlan: (plan: LessonPlanData) => void;
}

const SavedPlans: React.FC<Props> = ({ onSelectPlan }) => {
  const [plans, setPlans] = useState<LessonPlanData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<'subject' | 'grade'>('subject');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    setPlans(getSavedPlans());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('Are you sure you want to permanently delete this lesson plan?')) {
      deletePlan(id);
      setPlans(getSavedPlans()); // Refresh list immediately
    }
  };

  const groupedPlans = useMemo(() => {
      const filtered = plans.filter(p => 
        p.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.grade.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Apply primary sort by date
      const sorted = [...filtered].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });

      const groups: Record<string, LessonPlanData[]> = {};
      sorted.forEach(plan => {
          const key = groupBy === 'subject' ? plan.subject : plan.grade;
          if (!groups[key]) groups[key] = [];
          groups[key].push(plan);
      });
      
      return groups;
  }, [plans, searchTerm, groupBy, sortOrder]);

  const cleanTopic = (topic: string) => topic.replace(/^Lesson \d+:\s*/i, '');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Saved Lesson Plans</h2>
            <p className="text-gray-500 text-sm font-medium">{plans.length} plans available in your repository</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    type="button"
                    onClick={() => setGroupBy('subject')} 
                    className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${groupBy === 'subject' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Book className="w-3 h-3" /> Subject
                </button>
                <button 
                    type="button"
                    onClick={() => setGroupBy('grade')} 
                    className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${groupBy === 'grade' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Layers className="w-3 h-3" /> Grade
                </button>
            </div>

            <button 
                type="button"
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
                {sortOrder === 'newest' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>

            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Filter plans..." 
                    value={searchTerm} 
                    onChange={e=>setSearchTerm(e.target.value)} 
                    className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 w-full md:w-48" 
                />
            </div>
        </div>
      </div>
      {Object.keys(groupedPlans).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest text-xs">No plans found</p>
        </div>
      ) : (
          <div className="space-y-8">
              {Object.entries(groupedPlans).map(([groupTitle, groupPlans]: [string, LessonPlanData[]]) => (
                  <div key={groupTitle} className="animate-fade-in">
                      <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">{groupTitle}</h3>
                          <span className="text-[10px] font-black text-white bg-slate-400 px-2 py-0.5 rounded-full">{groupPlans.length}</span>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                          <ul className="divide-y divide-gray-50">
                            {groupPlans.map((plan) => (
                              <li key={plan.id} onClick={() => onSelectPlan(plan)} className="group hover:bg-teal-50/30 transition-all cursor-pointer relative">
                                <div className="p-5 flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-slate-800 truncate mb-1 group-hover:text-teal-700">{cleanTopic(plan.lessonNumber || plan.topic)}</h3>
                                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-medium">
                                        <span className="flex items-center gap-1"><Book className="w-3 h-3"/> {plan.subject}</span>
                                        <span className="bg-slate-100 text-slate-500 px-2 rounded-full font-bold">{plan.grade}</span>
                                        <span className="flex items-center gap-1 text-teal-600 font-bold"><UsersIcon className="w-3 h-3"/> Roll: {plan.roll}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(plan.date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 ml-4">
                                    <button 
                                        onClick={(e) => handleDelete(e, plan.id || '')} 
                                        className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-20 relative" 
                                        title="Delete Plan"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-teal-500 transition-colors" />
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default SavedPlans;
