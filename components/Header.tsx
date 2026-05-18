
import React from 'react';
import { BookOpen } from 'lucide-react';

interface Props {
  onHomeClick?: () => void;
}

const Header: React.FC<Props> = ({ onHomeClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button 
          onClick={onHomeClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
          title="Go to Home"
        >
          <div className="bg-teal-600 p-2 rounded-lg text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
              MwalimuPlanner
            </h1>
            <p className="text-xs text-slate-500 font-medium">Kenyan JS & Primary Planner</p>
          </div>
        </button>
        
        <div className="hidden md:flex items-center space-x-4 text-xs font-medium text-slate-600">
          <span className="bg-slate-100 px-3 py-1 rounded-full">CBE Aligned</span>
          <span className="bg-slate-100 px-3 py-1 rounded-full">Grade 4-9</span>
          <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-100">AI Powered</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
