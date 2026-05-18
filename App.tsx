
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LessonGenerator from './components/LessonGenerator';
import LessonPlanDisplay from './components/LessonPlanDisplay';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SchoolDashboard from './components/SchoolDashboard';
import LandingPage from './components/LandingPage';
import SavedPlans from './components/SavedPlans';
import NewsSection from './components/NewsSection';
import AdminDashboard from './components/AdminDashboard';
import StudentPortal from './components/StudentPortal';
import MwalimuBot from './components/MwalimuBot';
import { LessonPlanData, UserProfile } from './types';
import { LayoutDashboard, FileText, LogOut, Save, Newspaper, Shield, Building2, Loader2 } from 'lucide-react';
import { getCurrentUser, logoutUser, updateUserProfile, loginUser, getLocalUserMetadata, fetchUserProfileFromFirestore } from './services/storageService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlanData | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'generator' | 'dashboard' | 'school_dashboard' | 'saved' | 'news' | 'admin' | 'student'>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [isInitializing, setIsInitializing] = useState(true);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && firebaseUser.emailVerified) {
            // Priority 1: Check Firestore for full profile
            let profile = await fetchUserProfileFromFirestore(firebaseUser.email!);
            
            // Priority 2: Fallback to local storage
            if (!profile) {
                profile = getLocalUserMetadata(firebaseUser.email!);
            }

            // Priority 3: Final fallback to default
            if (!profile) {
                profile = {
                    email: firebaseUser.email!,
                    name: firebaseUser.displayName || 'Teacher',
                    school: 'Independent',
                    phone: '',
                    role: 'teacher'
                };
            }

            setUser(profile);
            loginUser(profile);
            
            // Initial routing if we're on landing/auth
            if (currentView === 'landing' || currentView === 'auth') {
                if (profile.role === 'school_admin') setCurrentView('school_dashboard');
                else if (profile.role === 'system_admin' || profile.isAdmin) setCurrentView('admin');
                else setCurrentView('generator');
            }
        } else {
            // Not logged in or not verified
            if (user && !firebaseUser) {
                handleLogout();
            }
        }
        setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    if (profile.role === 'school_admin') setCurrentView('school_dashboard');
    else if (profile.role === 'system_admin' || profile.isAdmin) setCurrentView('admin');
    else setCurrentView('generator');
  };

  const handleUpdateProfile = (profile: UserProfile) => {
    updateUserProfile(profile);
    setUser(profile);
  };

  const handleLogout = async () => {
    await signOut(auth);
    logoutUser();
    setUser(null);
    setGeneratedPlan(null);
    setCurrentView('landing');
  };

  const navigateToAuth = (mode: 'signin' | 'signup') => {
      setAuthMode(mode);
      setCurrentView('auth');
  };

  const handleHomeClick = () => {
    if (currentView === 'student') return;
    if (user) {
        if (user.role === 'school_admin') setCurrentView('school_dashboard');
        else if (user.role === 'system_admin' || user.isAdmin) setCurrentView('admin');
        else {
            setCurrentView('generator');
            setGeneratedPlan(null);
        }
    } else {
        setCurrentView('landing');
        setGeneratedPlan(null);
    }
  };

  if (isInitializing) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                  <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Synchronizing Session...</p>
              </div>
          </div>
      );
  }

  if (currentView === 'student') {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
              <Header onHomeClick={() => setCurrentView('landing')} />
              <StudentPortal />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header onHomeClick={handleHomeClick} />
      <main className="flex-1 relative">
        {currentView === 'landing' && !user && (
            <LandingPage 
                onStart={() => navigateToAuth('signup')} 
                user={user}
                onLogout={handleLogout}
                onPlanGenerated={(plan) => setGeneratedPlan(plan)} 
            />
        )}
        {currentView === 'auth' && !user && (
            <Login 
                onLogin={handleLogin} 
                initialMode={authMode} 
                onStudentLoginClick={() => setCurrentView('student')}
            />
        )}
        {user && (
            <div className={`container mx-auto px-4 py-8 md:py-12 ${currentView === 'admin' || currentView === 'school_dashboard' ? 'max-w-full px-0 py-0' : 'max-w-5xl'}`}>
                <div className={`flex flex-wrap gap-4 justify-between items-center mb-8 border-b border-gray-200 pb-4 no-print ${['admin', 'school_dashboard'].includes(currentView) ? 'px-4 pt-4' : ''}`}>
                    <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0">
                        {(user.role === 'system_admin' || user.isAdmin) ? (
                            <button onClick={() => setCurrentView('admin')} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${currentView === 'admin' ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <Shield className="w-4 h-4" /> Admin Panel
                            </button>
                        ) : user.role === 'school_admin' ? (
                            <button onClick={() => setCurrentView('school_dashboard')} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${currentView === 'school_dashboard' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <Building2 className="w-4 h-4" /> School Portal
                            </button>
                        ) : (
                            <>
                                <button onClick={() => { setCurrentView('generator'); setGeneratedPlan(null); }} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${currentView === 'generator' && !generatedPlan ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <FileText className="w-4 h-4" /> Planner
                                </button>
                                <button onClick={() => { setCurrentView('saved'); setGeneratedPlan(null); }} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${currentView === 'saved' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <Save className="w-4 h-4" /> Generated Plans
                                </button>
                                <button onClick={() => { setCurrentView('news'); setGeneratedPlan(null); }} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${currentView === 'news' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <Newspaper className="w-4 h-4" /> News
                                </button>
                                <button onClick={() => { setCurrentView('dashboard'); setGeneratedPlan(null); }} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md font-medium transition-colors text-sm md:text-base ${currentView === 'dashboard' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 hidden md:inline">{user.school ? <span className="font-bold text-indigo-600 mr-2">{user.school}</span> : ''}{user.name}</span>
                        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                    </div>
                </div>
                {currentView === 'admin' ? (<AdminDashboard />) : 
                 currentView === 'school_dashboard' ? (<SchoolDashboard profile={user} />) : 
                 currentView === 'dashboard' ? (<Dashboard profile={user} onUpdate={handleUpdateProfile} />) : 
                 currentView === 'saved' ? (<SavedPlans onSelectPlan={(plan) => { setGeneratedPlan(plan); setCurrentView('generator'); }} />) : 
                 currentView === 'news' ? (<NewsSection />) : 
                 generatedPlan ? (<LessonPlanDisplay plan={generatedPlan} onBack={() => setGeneratedPlan(null)} />) : (
                    <div className="animate-fade-in-up max-w-4xl mx-auto">
                        <div className="mb-8 no-print space-y-2">
                            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">Create Lesson Plan</h2>
                            <p className="text-slate-500 text-sm">Configure your parameters, select curriculum topics, and let AI generate a comprehensive lesson plan.</p>
                        </div>
                        <LessonGenerator userProfile={user} onPlanGenerated={setGeneratedPlan} />
                    </div>
                )}
            </div>
        )}
        {!user && generatedPlan && (
             <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl animate-fade-in">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 flex justify-between items-center">
                    <p className="text-sm text-yellow-700">You are viewing this plan as a guest. <strong>Sign in</strong> to save it to your account.</p>
                    <button onClick={() => navigateToAuth('signin')} className="text-sm font-medium text-yellow-800 underline hover:text-yellow-900">Sign In Now</button>
                </div>
                <LessonPlanDisplay plan={generatedPlan} onBack={() => { setGeneratedPlan(null); setCurrentView('landing'); }} />
            </div>
        )}
        {user && !user.isAdmin && user.role !== 'school_admin' && <MwalimuBot />}
      </main>
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm no-print mt-auto">
        <p>© {new Date().getFullYear()} MwalimuPlanner. All Rights Reserved.</p>
        <p className="mt-1">Empowering Kenyan Educators.</p>
      </footer>
    </div>
  );
}

export default App;
