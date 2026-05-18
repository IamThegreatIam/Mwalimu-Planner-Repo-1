
import React, { useMemo } from 'react';
import { UserProfile, LessonPlanData, Subject, Grade } from '../types';
import { getAllGlobalPlans, getAllUsers, getAllClassroomsGlobal, getAllAssignmentsGlobal } from '../services/storageService';
import { Users, FileText, TrendingUp, BarChart2, BookOpen, School, Download, Shield } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const users = useMemo(() => getAllUsers(), []);
  const plans = useMemo(() => getAllGlobalPlans(), []);
  const classrooms = useMemo(() => getAllClassroomsGlobal(), []);
  const assignments = useMemo(() => getAllAssignmentsGlobal(), []);

  // --- Statistics Calculation ---
  
  const totalUsers = users.length;
  const totalPlans = plans.length;
  
  // Student stats
  const totalStudents = classrooms.reduce((acc, cls) => acc + cls.students.length, 0);
  const totalAssignments = assignments.length;

  // Calculate top subjects
  const subjectCounts: Record<string, number> = {};
  plans.forEach(plan => {
    subjectCounts[plan.subject] = (subjectCounts[plan.subject] || 0) + 1;
  });
  
  // Sort subjects by count desc
  const sortedSubjects = Object.entries(subjectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5

  // Calculate grade distribution
  const gradeCounts: Record<string, number> = {};
  Object.values(Grade).forEach(g => gradeCounts[g] = 0); // Initialize
  plans.forEach(plan => {
    if (gradeCounts[plan.grade] !== undefined) {
      gradeCounts[plan.grade]++;
    }
  });

  const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

  // Recent Plans
  const recentPlans = [...plans].sort((a, b) => 
    new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  ).slice(0, 5);

  const downloadTeachersCSV = () => {
      // Define headers
      const headers = ["Name", "School", "Email", "Phone", "Password"];
      
      // Map user data to rows
      const rows = users.map(u => [
          `"${u.name}"`, 
          `"${u.school}"`, 
          `"${u.email}"`, 
          `"${u.phone}"`, 
          `"${u.password || 'N/A'}"`
      ]);

      // Combine headers and rows
      const csvContent = [
          headers.join(","),
          ...rows.map(r => r.join(","))
      ].join("\n");

      // Create blob and link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "mwalimu_teachers.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans">
      {/* Admin Header Band */}
      <div className="bg-slate-900 text-white px-6 py-8 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Admin Console</h1>
            <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest">Platform Analytics & Usage</p>
          </div>
          <div className="bg-slate-800 p-2 rounded-full border border-slate-700">
            <TrendingUp className="w-6 h-6 text-teal-400" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Teachers</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{totalUsers}</h3>
            </div>
            <div className="bg-blue-50 p-4 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Students</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{totalStudents}</h3>
            </div>
            <div className="bg-indigo-50 p-4 rounded-full">
              <School className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Assignments Posted</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{totalAssignments}</h3>
            </div>
            <div className="bg-purple-50 p-4 rounded-full">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Generated Plans</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">{totalPlans}</h3>
            </div>
            <div className="bg-teal-50 p-4 rounded-full">
              <FileText className="w-8 h-8 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Grade Distribution */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <BarChart2 className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-800">Plan Usage by Grade</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(gradeCounts).map(([grade, count]) => (
                <div key={grade} className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase text-slate-500 w-20">{grade}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(count / maxGradeCount) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Subjects */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <BookOpen className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-800">Popular Subjects</h3>
            </div>
            <div className="space-y-4">
              {sortedSubjects.length > 0 ? sortedSubjects.map(([sub, count], idx) => (
                <div key={sub} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{sub}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{count}</span>
                </div>
              )) : (
                <p className="text-slate-400 text-sm text-center py-8">No data available yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800">Registered Teachers</h3>
            </div>
            <button 
                onClick={downloadTeachersCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
            >
                <Download className="w-3 h-3" /> Export Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">School</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length > 0 ? users.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 text-slate-600">{u.school}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{u.email}</td>
                    <td className="px-6 py-4 text-slate-500">{u.phone}</td>
                    <td className="px-6 py-4 text-red-500 font-mono text-xs">{u.password}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No users registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
