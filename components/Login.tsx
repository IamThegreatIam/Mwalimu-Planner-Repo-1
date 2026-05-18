
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Lock, User, School, Phone, Mail, ArrowRight, LogIn, AlertCircle, GraduationCap, CheckCircle, Key, Building2, Loader2, MailCheck, Target } from 'lucide-react';
import { auth } from '../services/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification, 
    signOut 
} from 'firebase/auth';
import { saveUserMetadata, getLocalUserMetadata, loginUser, registerSchool, isSystemAdmin, fetchUserProfileFromFirestore } from '../services/storageService';

interface Props {
  onLogin: (profile: UserProfile) => void;
  onStudentLoginClick: () => void;
  initialMode?: 'signin' | 'signup';
}

type AuthView = 'signin' | 'signup' | 'forgot' | 'school_signup' | 'verify_pending';

const Login: React.FC<Props> = ({ onLogin, onStudentLoginClick, initialMode = 'signin' }) => {
  const [view, setView] = useState<AuthView>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    school: '',
    phone: '',
    password: ''
  });

  const [schoolData, setSchoolData] = useState({
      name: '',
      email: '',
      phone: '',
      address: '',
      password: '',
      confirmPassword: ''
  });

  const handleError = (err: any) => {
      if (err.code === 'auth/email-already-in-use') {
          setError("User already exists. Please sign in");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          setError("Email or password is incorrect");
      } else {
          setError(err.message || "An unexpected error occurred.");
      }
  };

  const handleSignUp = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const user = userCredential.user;
          await sendEmailVerification(user);
          saveUserMetadata({
              email: formData.email,
              name: formData.name,
              school: formData.school,
              phone: formData.phone,
              role: 'teacher'
          });
          setPendingEmail(formData.email);
          await signOut(auth);
          setView('verify_pending');
      } catch (err: any) {
          handleError(err);
      } finally {
          setLoading(false);
      }
  };

  const handleSchoolSignUp = async (e: React.FormEvent) => {
      e.preventDefault();
      if (schoolData.password !== schoolData.confirmPassword) {
          setError("Passwords do not match.");
          return;
      }
      setError(null);
      setLoading(true);
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, schoolData.email, schoolData.password);
          const user = userCredential.user;
          await sendEmailVerification(user);
          registerSchool(schoolData.name, schoolData.email, schoolData.password, schoolData.phone, schoolData.address);
          setPendingEmail(schoolData.email);
          await signOut(auth);
          setView('verify_pending');
      } catch (err: any) {
          handleError(err);
      } finally {
          setLoading(false);
      }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = loginEmail.toLowerCase();
    if ((email === 'admin@mwalimuplanner.com' || email === 'muhigalamacdie@gmail.com') && loginPass === 'admin123') {
        const adminProfile: UserProfile = {
            name: 'System Administrator',
            email: email,
            school: 'HQ',
            phone: '0000000000',
            isAdmin: true,
            role: 'system_admin'
        };
        loginUser(adminProfile);
        onLogin(adminProfile);
        setLoading(false);
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPass);
        const user = userCredential.user;

        if (!user.emailVerified) {
            setPendingEmail(user.email || loginEmail);
            await signOut(auth);
            setView('verify_pending');
            setLoading(false);
            return;
        }

        let profile: UserProfile | null = await fetchUserProfileFromFirestore(user.email!);
        
        if (!profile) {
            const metadata = getLocalUserMetadata(user.email!);
            profile = metadata || {
                email: user.email!,
                name: user.displayName || 'Teacher',
                school: 'Independent',
                phone: '',
                role: 'teacher'
            };
        }
        
        loginUser(profile);
        onLogin(profile);
    } catch (err: any) {
        handleError(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {view === 'verify_pending' ? (
          <div className="p-8 text-center animate-fade-in">
              <div className="mx-auto bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mb-6"><MailCheck className="w-10 h-10 text-blue-600" /></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Verify Your Email</h2>
              <p className="text-slate-600 mb-8">We have sent you a verification email to <span className="font-bold text-indigo-600">{pendingEmail}</span>.</p>
              <button onClick={() => setView('signin')} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-md">Login</button>
          </div>
        ) : (
          <>
            <div className="bg-slate-900 px-6 py-8 text-center text-white">
              <div className="mx-auto bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                {view === 'signup' ? <User className="w-8 h-8 text-teal-400" /> : view === 'school_signup' ? <Building2 className="w-8 h-8 text-indigo-400" /> : <LogIn className="w-8 h-8 text-teal-400" />}
              </div>
              <h2 className="text-2xl font-bold">{view === 'signup' ? "Teacher Registration" : view === 'school_signup' ? "Register School" : "Welcome Back"}</h2>
            </div>
            <div className="p-8">
                {error && <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-start gap-2"><AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{error}</span></div>}
                {view === 'signin' && (
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm py-2.5 border px-3" placeholder="name@school.edu" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Password</label><input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm py-2.5 border px-3" placeholder="••••••••" /></div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg shadow-md mt-6 disabled:opacity-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"} <ArrowRight className="w-4 h-4" /></button>
                    </form>
                )}
                {view === 'signup' && (
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="Full Name" />
                        <input type="text" required value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="School Name" />
                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="Email" />
                        <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="Phone" />
                        <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="Password" minLength={6} />
                        <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow-md mt-4 disabled:opacity-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}</button>
                    </form>
                )}
                {view === 'school_signup' && (
                    <form onSubmit={handleSchoolSignUp} className="space-y-4">
                        <input type="text" required value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="School Name" />
                        <input type="email" required value={schoolData.email} onChange={e => setSchoolData({...schoolData, email: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="Admin Email" />
                        <input type="password" required value={schoolData.password} onChange={e => setSchoolData({...schoolData, password: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="Password" minLength={6} />
                        <input type="password" required value={schoolData.confirmPassword} onChange={e => setSchoolData({...schoolData, confirmPassword: e.target.value})} className="w-full rounded-md border border-gray-300 p-2.5" placeholder="Confirm Password" />
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md mt-4 disabled:opacity-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Register School"}</button>
                    </form>
                )}
                <div className="mt-6 text-center space-y-4">
                    {view === 'signin' ? (
                        <><button onClick={() => setView('signup')} className="text-teal-600 font-semibold text-sm">Register as Teacher</button><br/><button onClick={() => setView('school_signup')} className="text-indigo-600 font-semibold text-sm">Register a School</button></>
                    ) : (<button onClick={() => setView('signin')} className="text-teal-600 font-semibold text-sm">Already have an account? Sign In</button>)}
                    <div className="pt-4 border-t border-gray-100"><button onClick={onStudentLoginClick} className="text-sm text-slate-500 font-medium px-4 py-2 rounded-full bg-slate-50 flex items-center gap-2 mx-auto"><Target className="w-4 h-4" />I am a Student</button></div>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
