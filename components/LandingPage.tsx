
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Star, 
  Menu,
  X,
  BrainCircuit,
  LogOut,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Check,
  Zap,
  Calendar,
  Clock,
  Target,
  Award,
  FileText,
  ChevronDown,
  Quote,
  Send,
  Loader2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { UserProfile, LessonPlanData, NewsItem } from '../types';
import { fetchEducationNews } from '../services/geminiService';
import LessonGenerator from './LessonGenerator';

// Reverting to Teal/Green Theme
const COLORS = {
  primary: 'bg-teal-600',
  textPrimary: 'text-teal-600',
  borderPrimary: 'border-teal-600',
  hoverPrimary: 'hover:bg-teal-700',
  light: 'bg-teal-50',
  dark: 'bg-slate-900', 
  hoverDark: 'hover:bg-slate-800',
  gold: 'text-yellow-500',
  ringPrimary: 'focus:ring-teal-500',
  emerald: 'bg-emerald-600',
  textEmerald: 'text-emerald-600'
};

interface LandingProps {
  onStart: () => void;
  user: UserProfile | null;
  onLogout: () => void;
  onViewHistory?: () => void;
  onViewDashboard?: () => void;
  onPlanGenerated: (plan: LessonPlanData) => void;
}

const LandingPage: React.FC<LandingProps> = ({ onStart, user, onLogout, onViewDashboard, onPlanGenerated }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  const sectionRefs = {
    hero: useRef<HTMLElement>(null),
    features: useRef<HTMLElement>(null),
    pathways: useRef<HTMLElement>(null),
    preview: useRef<HTMLElement>(null),
    testimonials: useRef<HTMLElement>(null),
    contact: useRef<HTMLElement>(null),
    news: useRef<HTMLElement>(null),
    newsletter: useRef<HTMLElement>(null)
  };

  // Intersection Observer for table of contents
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    Object.entries(sectionRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setActiveSection(key);
              }
            });
          },
          { threshold: 0.5 }
        );
        observer.observe(ref.current);
        observers.push(observer);
      }
    });

    return () => observers.forEach(observer => observer.disconnect());
  }, []);

  const loadNews = async () => {
    setIsNewsLoading(true);
    try {
      const data = await fetchEducationNews();
      setNews(data);
    } catch (e) {
      console.error("Failed to load news");
    } finally {
      setIsNewsLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubscribing(false);
    setSubscribeSuccess(true);
    setEmail('');
    setTimeout(() => setSubscribeSuccess(false), 3000);
  };

  const scrollToSection = (sectionId: string) => {
    const ref = sectionRefs[sectionId as keyof typeof sectionRefs];
    if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  };

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const testimonials = [
    {
      name: "Sarah Kiprono",
      role: "JS Teacher, Nairobi",
      content: "This platform cut my lesson planning time from 3 hours to 15 minutes. The alignment with CBE standards is perfect!",
      rating: 5,
      school: "Moi Educational Centre"
    },
    {
      name: "James Omondi",
      role: "Head of Department",
      content: "Our entire department uses MwalimuPlanner. The consistency in quality has improved our students' performance by 40%.",
      rating: 5,
      school: "Milimani Junior School"
    },
    {
      name: "Dr. Wanjiku Muthoni",
      role: "Curriculum Developer",
      content: "Finally, a tool that understands the nuances of competency-based education in Kenya. A game-changer for our teachers.",
      rating: 5,
      school: "KICD Consultant"
    }
  ];

  const features = [
    { icon: <Zap className="w-5 h-5" />, title: "AI-Powered Generation", desc: "Generate complete plans in 30 seconds" },
    { icon: <Target className="w-5 h-5" />, title: "KICD Aligned", desc: "100% compliant with latest circulars" },
    { icon: <FileText className="w-5 h-5" />, title: "Multiple Formats", desc: "PDF, Word, WhatsApp ready" },
    { icon: <Calendar className="w-5 h-5" />, title: "Term Planning", desc: "Full term coverage for Grades 4-9" },
    { icon: <Clock className="w-5 h-5" />, title: "Time-Saving", desc: "Save 10+ hours weekly" },
    { icon: <Award className="w-5 h-5" />, title: "Quality Guaranteed", desc: "Peer-reviewed by experts" }
  ];

  return (
    <div className="bg-white min-h-screen font-sans text-slate-900">
      
      {/* Main Navigation */}
      <nav 
        className={`${COLORS.primary} sticky top-0 z-50 shadow-lg border-b border-white/10`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <button 
                className="flex items-center focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
                onClick={() => scrollToSection('hero')}
              >
                <div className="bg-white p-1.5 rounded-md mr-3">
                  <BrainCircuit className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-lg font-bold text-white leading-none tracking-tight">MwalimuPlanner</span>
                  <span className="text-[10px] font-medium text-teal-100 tracking-wide opacity-90">JS & Primary</span>
                </div>
              </button>
              
              <div className="hidden lg:flex items-center space-x-1">
                <NavButton 
                  label="HOME" 
                  active={activeSection === 'hero'}
                  onClick={() => scrollToSection('hero')}
                />
                <NavButton 
                  label="FEATURES" 
                  onClick={() => scrollToSection('features')}
                />
                <NavButton 
                  label="PATHWAYS" 
                  onClick={() => scrollToSection('pathways')}
                />
                <NavButton 
                  label="GENERATOR" 
                  onClick={() => scrollToSection('preview')}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <div className="hidden md:flex items-center gap-3">
                    <button 
                      onClick={onViewDashboard}
                      className="text-teal-50 text-sm font-medium hover:text-white transition-colors focus:outline-none"
                    >
                      Dashboard ({user.name.split(' ')[0]})
                    </button>
                    <div className="h-4 w-px bg-teal-500/50 mx-1"></div>
                    <button 
                      onClick={onLogout}
                      className="text-teal-100 text-sm font-medium hover:text-white flex items-center gap-1.5 focus:outline-none"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={onStart}
                    className="text-white text-sm font-medium hover:text-teal-100 transition-colors focus:outline-none px-3 py-2"
                  >
                    Log In
                  </button>
                </div>
              )}
              
              <button 
                onClick={onStart}
                className="bg-white text-teal-700 px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-teal-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-teal-600 focus:ring-white"
              >
                Get Started
              </button>

              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden text-white p-2 focus:outline-none focus:ring-2 focus:ring-white rounded-md"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className={`${COLORS.dark} lg:hidden px-4 py-6 border-t border-white/10 animate-fade-in`}>
            <div className="space-y-4">
              {['Home', 'Features', 'Pathways', 'Generator'].map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section === 'Generator' ? 'preview' : section.toLowerCase())}
                  className="block w-full text-left text-white font-bold text-sm py-3 hover:bg-white/10 px-4 rounded-md focus:outline-none focus:bg-white/10"
                >
                  {section.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main id="main-content">
        {/* Hero Section */}
        <section 
          ref={sectionRefs.hero}
          className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0">
            {/* Switched hero image to one representing a Kenyan teacher in a classroom pointing at a board */}
            <img 
              src="https://i.ibb.co/5hMgV585/Chat-GPT-Image-Feb-9-2026-10-22-13-AM.png"
              alt="Kenyan male teacher in a classroom pointing at a blackboard with a map of Kenya"
              className="w-full h-full object-cover"
            />
            {/* Green overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r from-slate-900/95 via-teal-900/80 to-slate-900/90`}></div>
          </div>
          
          <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
            <div className="flex justify-center mb-8 animate-fade-in-up">
              <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/20 shadow-2xl">
                <BrainCircuit className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-6 animate-fade-in-up uppercase leading-tight">
              Mwalimu Planner
            </h1>
            <p className="text-xl md:text-3xl font-bold text-teal-300 tracking-wide mb-10 animate-fade-in-up animation-delay-200 max-w-3xl mx-auto uppercase">
              JS and Primary Planner
            </p>
            <p className="text-lg text-slate-200 mb-10 max-w-2xl mx-auto">
                The ultimate AI-powered curriculum-aligned planning tool for Kenyan teachers. Compliant with CBE standards.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-2xl mx-auto">
              {[
                { value: "5,000+", label: "Teachers Using" },
                { value: "50K+", label: "Plans Generated" },
                { value: "40%", label: "Time Saved" },
                { value: "4.9★", label: "Rating" }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <div className="text-xs text-white/70 uppercase tracking-widest font-bold">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center animate-fade-in-up animation-delay-400">
              <button 
                onClick={onStart}
                className={`group bg-white text-teal-900 px-12 py-5 font-black text-sm tracking-widest hover:scale-105 transition-transform duration-300 flex items-center gap-3 mx-auto shadow-2xl rounded-sm uppercase focus:outline-none focus:ring-4 ${COLORS.ringPrimary} focus:ring-offset-2`}
              >
                Sign In to Start
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
              <span className="text-white/60 text-[10px] mt-4 font-bold uppercase tracking-[0.3em]">
                Curriculum Aligned • Instant Generation • Export Ready
              </span>
            </div>

            <button 
              onClick={() => scrollToSection('features')}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section 
          ref={sectionRefs.features}
          className="py-24 bg-gradient-to-b from-white to-slate-50"
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <span className={`${COLORS.primary} text-white px-4 py-1.5 text-[10px] font-black tracking-[0.3em] uppercase mb-6 inline-block rounded-full`}>
                Why Choose MwalimuPlanner
              </span>
              <h2 className={`text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight mb-6`}>
                Everything You Need in One Platform
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Designed by Kenyan teachers, for Kenyan teachers. Every feature is built to save you time and improve student outcomes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`bg-white p-8 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xl transition-all duration-300 group`}
                >
                  <div className={`bg-teal-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-600 group-hover:scale-110 transition-all`}>
                    <div className={`text-teal-600 group-hover:text-white`}>
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Generator Section (Replaces Preview) */}
        <section ref={sectionRefs.preview} className="py-24 bg-white border-t border-slate-100">
             <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                    <span className={`${COLORS.primary} text-white px-4 py-1.5 text-[10px] font-black tracking-[0.3em] uppercase mb-6 inline-block rounded-full`}>
                        Live Generator
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight mb-4">
                        Generate Your Plan Now
                    </h2>
                    <p className="text-slate-600">
                        Try it below. No login required for generation.
                    </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                    <LessonGenerator onPlanGenerated={onPlanGenerated} userProfile={user} />
                </div>
             </div>
        </section>

        {/* CBE Pathways Section */}
        <section 
          ref={sectionRefs.pathways}
          className={`${COLORS.dark} py-24`}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
                CBE Pathways Aligned
              </h2>
              <p className="text-lg text-slate-300 max-w-3xl mx-auto">
                Comprehensive planning tools tailored for the three Junior School pathways.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "STEM Pathway",
                  topics: ["Mathematics", "Integrated Science", "Pre-Tech Studies", "Agriculture"],
                  color: "from-teal-100 to-emerald-100",
                  img: "https://i.ibb.co/VcnCQbr5/Chat-GPT-Image-Feb-9-2026-10-21-56-AM.png"
                },
                {
                  title: "Social Sciences",
                  topics: ["Social Studies", "Religious Ed", "English/Kiswahili"],
                  color: "from-blue-500 to-cyan-500",
                  img: "https://i.ibb.co/fYKLwGB2/Chat-GPT-Image-Feb-9-2026-10-32-58-AM.png"
                },
                {
                  title: "Arts & Sports Science",
                  topics: ["Creative Arts & Sports", "English", "Kiswahili"],
                  color: "from-indigo-500 to-violet-500",
                  img: "https://i.ibb.co/Z6mCtg6z/Chat-GPT-Image-Feb-9-2026-10-22-01-AM.png"
                }
              ].map((pathway, index) => (
                <div 
                  key={index}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-2xl transform hover:-translate-y-2 transition-transform duration-300"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={pathway.img}
                      alt={`${pathway.title} students`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${pathway.color}/40`}></div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                      <span className="text-lg font-black text-slate-900">JS Pathway</span>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <h3 className="text-2xl font-black text-slate-900 mb-4">{pathway.title}</h3>
                    <div className="mb-6">
                      <p className="text-sm font-bold uppercase text-slate-500 mb-3">Core Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {pathway.topics.map((topic, i) => (
                          <span 
                            key={i}
                            className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <button 
                        onClick={onStart}
                        className={`w-full ${COLORS.primary} text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 ${COLORS.ringPrimary}`}
                      >
                        Generate Plan
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section 
          ref={sectionRefs.testimonials}
          className="py-24 bg-gradient-to-b from-slate-50 to-white"
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <span className={`${COLORS.emerald} text-white px-4 py-1.5 text-[10px] font-black tracking-[0.3em] uppercase mb-6 inline-block rounded-full`}>
                Trusted by Educators
              </span>
              <h2 className={`text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight mb-6`}>
                What Teachers Are Saying
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Join thousands of Kenyan teachers who have transformed their lesson planning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-center mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i}
                        className={`w-5 h-5 fill-yellow-400 text-yellow-400`}
                      />
                    ))}
                  </div>
                  
                  <Quote className="w-12 h-12 text-teal-600/20 mb-6" />
                  
                  <p className="text-slate-700 mb-8 italic leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold`}>
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{testimonial.name}</h4>
                        <p className="text-sm text-slate-600">{testimonial.role}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">{testimonial.school}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social Proof */}
            <div className={`mt-20 bg-gradient-to-r from-teal-700 to-slate-900 rounded-2xl p-8 text-white`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl font-black mb-2">98%</div>
                  <div className="text-sm opacity-90 uppercase tracking-widest">Satisfaction Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-black mb-2">5,000+</div>
                  <div className="text-sm opacity-90 uppercase tracking-widest">Active Teachers</div>
                </div>
                <div>
                  <div className="text-3xl font-black mb-2">40+</div>
                  <div className="text-sm opacity-90 uppercase tracking-widest">Counties Covered</div>
                </div>
                <div>
                  <div className="text-3xl font-black mb-2">24/7</div>
                  <div className="text-sm opacity-90 uppercase tracking-widest">Support Available</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section 
          ref={sectionRefs.contact}
          className={`${COLORS.dark} py-24 relative overflow-hidden`}
        >
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className={`${COLORS.primary} text-white px-4 py-1.5 text-[10px] font-black tracking-[0.3em] uppercase mb-6 inline-block rounded-sm`}>
                  Available for Consultation
                </span>
                <h2 className={`text-4xl md:text-6xl font-black text-white uppercase tracking-tight mb-8`}>
                  Contact The <br/><span className={COLORS.gold}>Lesson Guru</span>
                </h2>
                <p className="text-slate-400 text-lg mb-12 leading-relaxed max-w-lg">
                  For curriculum support, school-wide licenses, or specialized pedagogical workshops, reach out to Macdonald Muhiga.
                </p>
                
                <div className="space-y-6">
                  <ContactInfo 
                    icon={<Mail className="w-5 h-5" />} 
                    label="Email" 
                    value="macdonaldmuhiga@gmail.com"
                    onClick={() => window.location.href = 'mailto:macdonaldmuhiga@gmail.com'}
                  />
                  <ContactInfo 
                    icon={<Phone className="w-5 h-5" />} 
                    label="Phone" 
                    value="0710151009 / 0725738254"
                    onClick={() => window.location.href = 'tel:+254710151009'}
                  />
                  <ContactInfo 
                    icon={<MapPin className="w-5 h-5" />} 
                    label="Location" 
                    value="Katani, Kenya"
                  />
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 md:p-12 border border-white/10 rounded-sm">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-32 h-32 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-5xl font-black mb-6 shadow-2xl`}>
                    MM
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase mb-2">Macdonald Muhiga</h3>
                  <p className={`${COLORS.gold} font-bold uppercase tracking-widest text-sm mb-6`}>Educational Consultant & Founder</p>
                  <p className="text-slate-300 mb-8 max-w-md">
                    With 10+ years in education technology and curriculum development, dedicated to empowering Kenyan teachers.
                  </p>
                  
                  <div className="w-full h-px bg-white/10 mb-8"></div>
                  
                  <div className="space-y-4 w-full">
                    <button 
                      onClick={() => handleExternalLink('https://wa.me/254710151009')}
                      className={`w-full ${COLORS.emerald} text-white py-4 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-emerald-700 transition-colors rounded-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900`}
                    >
                      <MessageSquare className="w-5 h-5" /> Chat on WhatsApp
                    </button>
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest block">
                      Typically responds in minutes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* News Section */}
        <section 
          ref={sectionRefs.news}
          className="bg-slate-50 py-24 border-t border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
              <div>
                <h2 className={`text-2xl font-black text-teal-700 uppercase tracking-widest flex items-center gap-3`}>
                  <span className={`w-12 h-1 bg-teal-600`}></span> KENYA EDUCATION NEWS
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
                  Latest CBE & JS Updates from Ministry of Education
                </p>
              </div>
              <div className="flex flex-col items-end">
                <button 
                  onClick={loadNews} 
                  disabled={isNewsLoading}
                  className={`bg-teal-600 text-white px-6 py-3 rounded-full font-black text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 ${COLORS.ringPrimary} disabled:opacity-50`}
                >
                  {isNewsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Refresh News
                    </>
                  )}
                </button>
              </div>
            </div>

            {isNewsLoading ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <Loader2 className={`w-12 h-12 text-teal-600 animate-spin mb-4`} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Fetching Real-time News...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {news.length > 0 && (
                  <div className="md:col-span-2 relative group cursor-pointer overflow-hidden bg-white border border-slate-200 rounded-2xl hover:shadow-xl transition-shadow">
                    <div className="h-[500px] overflow-hidden bg-slate-200 relative">
                       <div className="absolute inset-0 bg-slate-300 flex items-center justify-center text-slate-400">
                            <BookOpen className="w-20 h-20" />
                       </div>
                        {/* Placeholder for news image if available */}
                       <img 
                        src="https://i.ibb.co/GQkqgPHJ/Chat-GPT-Image-Feb-9-2026-10-55-01-AM.png" 
                        alt="Education News"
                        className="w-full h-full object-cover absolute inset-0 opacity-80 group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent`}></div>
                    <div className="absolute bottom-0 p-8 text-white w-full">
                      <span className={`${COLORS.emerald} text-xs font-black tracking-widest px-3 py-1.5 uppercase rounded-full mb-4 inline-block`}>
                        Top Story
                      </span>
                      <h3 className="text-2xl md:text-4xl font-black uppercase mb-4 leading-tight">
                        {news[0].title}
                      </h3>
                      <p className="text-white/70 text-base mb-6 max-w-xl line-clamp-3">
                        {news[0].summary}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50 text-xs font-bold uppercase tracking-widest">
                          {news[0].date}
                        </span>
                        <button 
                          onClick={() => handleExternalLink(news[0].url)}
                          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          Source <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {news.slice(1, 4).map((item, idx) => (
                    <NewsCard key={idx} item={item} onReadMore={() => handleExternalLink(item.url)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter Section */}
        <section 
          ref={sectionRefs.newsletter}
          className={`py-24 bg-gradient-to-br from-teal-700 via-slate-900 to-teal-700`}
        >
          <div className="max-w-4xl mx-auto px-4 text-center">
            <span className="bg-white/20 text-white px-4 py-1.5 text-[10px] font-black tracking-[0.3em] uppercase mb-6 inline-block rounded-full">
              Stay Updated
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
              Get Teaching Resources & Updates
            </h2>
            <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
              Join 5,000+ teachers receiving weekly lesson planning tips, curriculum updates, and exclusive resources.
            </p>

            <form 
              onSubmit={handleSubscribe}
              className="max-w-xl mx-auto"
            >
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className={`flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 rounded-lg px-6 py-4 text-base focus:outline-none focus:ring-2 ${COLORS.ringPrimary} focus:border-transparent`}
                  required
                  disabled={isSubscribing}
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className={`bg-white text-teal-800 px-8 py-4 rounded-lg font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${COLORS.ringPrimary} focus:ring-offset-2 focus:ring-offset-teal-700`}
                >
                  {isSubscribing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Subscribing...
                    </span>
                  ) : subscribeSuccess ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Subscribed!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Subscribe
                      <Send className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest">
                No spam. Unsubscribe anytime. We respect your privacy.
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`${COLORS.dark} text-slate-400 py-16 px-4 border-t-4 border-teal-600`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-white p-2 rounded-sm">
                  <BrainCircuit className="w-10 h-10 text-teal-600" />
                </div>
                <div>
                  <span className="text-2xl font-black text-white uppercase tracking-tighter block">MwalimuPlanner</span>
                  <span className="text-xs text-white/60 font-bold uppercase tracking-widest">The Premier AI Lesson Planning Platform</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-8 max-w-xl">
                Developed by <strong className="text-white">Macdonald Muhiga</strong>. Kenya's premier AI-powered lesson plan generation platform for Junior School mathematics teachers.
              </p>
              <div className="space-y-2">
                <button 
                  onClick={() => scrollToSection('contact')}
                  className={`text-white text-sm font-bold text-yellow-500 hover:underline transition-colors focus:outline-none`}
                >
                  Contact Information
                </button>
                <div className="text-xs space-y-1">
                  <p className="text-white/60">Email: macdonaldmuhiga@gmail.com</p>
                  <p className="text-white/60">Phone: 0710151009 / 0725738254</p>
                  <p className="text-white/60">Location: Katani, Kenya</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-black text-sm tracking-widest uppercase mb-6">Quick Links</h4>
              <ul className="space-y-4">
                {[
                  { label: 'STEM Pathway', onClick: () => scrollToSection('preview') },
                  { label: 'Social Sciences', onClick: () => scrollToSection('preview') },
                  { label: 'Arts & Sports', onClick: () => scrollToSection('preview') },
                  { label: 'Teacher Dashboard', onClick: onViewDashboard },
                  { label: 'Consultation', onClick: () => scrollToSection('contact') }
                ].map((link, idx) => (
                  <li key={idx}>
                    <button
                      onClick={link.onClick}
                      className="text-xs font-bold uppercase tracking-wider hover:text-white transition-colors focus:outline-none focus:text-white focus:underline"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-black text-sm tracking-widest uppercase mb-6">Resources</h4>
              <ul className="space-y-4">
                {[
                  { label: 'KICD Guidelines', url: 'https://kicd.ac.ke' },
                  { label: 'TSC Regulations', url: 'https://tsc.go.ke' },
                  { label: 'CBE Framework', url: 'https://education.go.ke' },
                  { label: 'Ministry of Education', url: 'https://education.go.ke' }
                ].map((resource, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleExternalLink(resource.url)}
                      className="text-xs font-bold uppercase tracking-wider hover:text-white transition-colors focus:outline-none focus:text-white focus:underline"
                    >
                      {resource.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 text-center">
            <p className="text-[10px] uppercase tracking-widest font-black text-white/20">
              © {new Date().getFullYear()} Macdonald Muhiga • MwalimuPlanner • Professional Excellence in Education
            </p>
            <p className="text-[9px] text-white/30 mt-2">
              All rights reserved. This platform is designed for educational purposes by certified teachers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Subcomponents
const NavButton = ({ label, active = false, onClick }: { label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:bg-teal-700 ${active ? 'bg-teal-700 text-white shadow-inner' : 'text-teal-100 hover:bg-teal-500/20 hover:text-white'}`}
  >
    {label}
  </button>
);

const ContactInfo = ({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value: string, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-start gap-4 w-full text-left hover:bg-white/5 p-3 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-white/30"
  >
    <div className={`${COLORS.primary} p-2 rounded-sm text-white flex-shrink-0`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-white font-bold text-base">{value}</p>
    </div>
  </button>
);

const NewsCard: React.FC<{ item: NewsItem; onReadMore: () => void }> = ({ item, onReadMore }) => (
  <article className={`group cursor-pointer bg-white p-6 border border-slate-200 hover:border-teal-600 transition-all rounded-xl shadow-sm hover:shadow-md`}>
    <header>
      <div className="flex justify-between items-start mb-2">
         <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold uppercase">{item.source}</span>
      </div>
      <h4 className={`text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors leading-snug mb-3 line-clamp-2`}>
        {item.title}
      </h4>
    </header>
    <p className="text-slate-600 text-sm mb-4 line-clamp-3">{item.summary}</p>
    <footer className="flex justify-between items-center">
      <time className="text-slate-500 text-xs font-bold uppercase tracking-wider">
        {item.date}
      </time>
      <button
        onClick={onReadMore}
        className={`text-teal-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:underline focus:outline-none focus:underline`}
      >
        Read More <ExternalLink className="w-3 h-3" />
      </button>
    </footer>
  </article>
);

export default LandingPage;
