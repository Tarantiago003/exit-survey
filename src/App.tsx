/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Lock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  LayoutDashboard, 
  LogOut,
  BarChart3,
  Users,
  MessageSquare,
  Award,
  ShieldCheck,
  RefreshCcw,
  Image as ImageIcon,
  X,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { Separator } from '@/components/ui/separator';

import { SCRIPT_URL, ADMIN_PASS, PROGRAMS, RATING_QUESTIONS, SATISFACTION_LABELS } from './constants';
import { SurveyData, AnalyticsData } from './types';

// --- Utility: Image Compression & Base64 ---
async function processImage(file: File): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const [header, base64] = dataUrl.split(',');
        const type = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';
        resolve({ base64, type });
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// --- Main App Component ---
export default function App() {
  const [view, setView] = useState<'survey' | 'admin' | 'success'>('survey');
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Form State
  const [formData, setFormData] = useState<SurveyData>({
    email: '',
    name: '',
    program: '',
    yearGrad: '',
    contact: '',
    address: '',
    fbName: '',
    employment: '',
    consent: null,
    ratings: {},
    appreciate: '',
    improve: '',
    suggestions: '',
    alumniId: null,
  });

  const [files, setFiles] = useState<{ esig?: string; photo?: string }>({});

  // --- Actions ---
  const handleUpdateField = (field: keyof SurveyData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateRating = (id: string, val: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [id]: val }
    }));
  };

  const handleFileUpload = async (field: 'esig' | 'photo', file: File) => {
    try {
      const { base64, type } = await processImage(file);
      setFiles(prev => ({ ...prev, [field]: base64 }));
      handleUpdateField(field === 'esig' ? 'esig' : 'photo', base64);
      handleUpdateField(field === 'esig' ? 'esigType' : 'photoType', type);
      toast.success(`${field === 'esig' ? 'Signature' : 'Photo'} uploaded successfully.`);
    } catch (err) {
      toast.error("Failed to process image. Try a smaller file.");
    }
  };

  const validateStep = () => {
    if (step === 0) {
      const required = ['email', 'name', 'program', 'yearGrad', 'contact', 'address', 'fbName'];
      const missing = required.some(k => !formData[k as keyof SurveyData]);
      if (missing) return "Please fill in all personal information.";
      if (!formData.email.includes('@')) return "Please enter a valid email address.";
    }
    if (step === 1) {
      if (formData.consent !== "I Agree") return "You must agree to the data privacy consent to proceed.";
    }
    if (step === 2) {
      const answered = Object.keys(formData.ratings).length;
      if (answered < RATING_QUESTIONS.length) return "Please rate all items.";
    }
    if (step === 3) {
      if (!formData.appreciate || !formData.improve || !formData.suggestions) return "Please fill in all feedback fields.";
    }
    if (step === 4) {
      if (!formData.alumniId) return "Please indicate if you want an Alumni ID.";
      if (formData.alumniId === "Yes") {
        const req = ['dob', 'citizenship', 'homeAddress', 'primaryContact', 'emergencyPerson', 'emergencyContact', 'relationship', 'emergencyAddress', 'esig', 'photo'];
        const missing = req.some(k => !formData[k as keyof SurveyData]);
        if (missing) return "Please complete all fields for the Alumni ID application.";
      }
    }
    return null;
  };

  const nextStep = () => {
    const error = validateStep();
    if (error) {
      toast.error(error);
      return;
    }
    if (step < 4) setStep(step + 1);
    else submitSurvey();
  };

  const submitSurvey = async () => {
    setIsSubmitting(true);
    const payload = {
      action: 'submit',
      ...formData,
      timestamp: new Date().toLocaleString('en-PH'),
    };

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setView('success');
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toast.error("Submit failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminPwd === ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      fetchAnalytics();
    } else {
      toast.error("Incorrect password.");
    }
  };

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getAnalytics`);
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      toast.error("Failed to load analytics.");
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // --- Render Helpers ---
  const renderProgress = () => (
    <div className="w-full max-w-2xl mx-auto mb-8 px-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
        <span className="text-xs font-bold text-primary">{Math.round((step / 4) * 100)}%</span>
      </div>
      <Progress value={(step / 4) * 100} className="h-2" />
      <div className="flex justify-between mt-4">
        {[0, 1, 2, 3, 4].map(idx => (
          <div 
            key={idx} 
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${step >= idx ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3fbf3] font-sans text-[#0d1f0d]">
      <Toaster position="top-center" />
      
      {/* Navigation */}
      <nav className="nav">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-br from-[#c9a84c] to-[#f0d88a] rounded-full flex items-center justify-center text-base shadow-[0_0_0_2px_rgba(201,168,76,0.3)]">
            🎓
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold text-[#f0d88a] tracking-wider leading-none">MVGFC</span>
            <span className="text-[10px] uppercase font-light text-white/50 tracking-widest">Student Affairs Office</span>
          </div>
        </div>
        <div className="absolute right-4">
           {view === 'survey' ? (
              <Button variant="ghost" size="sm" onClick={() => setView('admin')} className="text-[#f0d88a] hover:bg-white/10 gap-2">
                <Lock className="h-3 w-3" /> Admin
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setView('survey')} className="text-[#f0d88a] hover:bg-white/10 gap-2">
                <ChevronLeft className="h-3 w-3" /> Survey
              </Button>
            )}
        </div>
      </nav>

      <main className="pb-20">
        <AnimatePresence mode="wait">
          {view === 'survey' && (
            <motion.div
              key="survey"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* HERO SECTION */}
              <div className="hero">
                <div className="hero-bg" />
                <div className="hero-lines" />
                <div className="relative z-10 max-w-2xl mx-auto px-4">
                  <div className="inline-flex items-center gap-2 bg-[#c9a84c1a] border border-[#c9a84c33] text-[#f0d88a] text-[10px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 rounded-full mb-6">
                    <span className="w-1.5 h-1.5 bg-[#f0d88a] rounded-full animate-pulse" />
                    Academic Year 2024–2025
                  </div>
                  <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-bold leading-[1.1] mb-6">
                    Graduation <br />
                    <span className="italic font-normal text-[#f0d88a]">Satisfaction</span> Survey
                  </h1>
                  <p className="text-sm text-white/60 max-w-lg mx-auto mb-8 leading-relaxed">
                    Your voice shapes a better graduation for every MVGFC graduate who comes after you. This takes about 5–7 minutes.
                  </p>
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Survey Progress</span>
                      <span className="text-xs font-bold text-[#7dd87d]">{Math.round((step / 4) * 100)}%</span>
                    </div>
                    <Progress value={(step / 4) * 100} className="h-2 bg-white/10" />
                  </div>
                </div>
              </div>

              {/* STEPS BAR */}
              <div className="sticky top-[60px] z-40 bg-white border-b border-[#dceadc] px-4 overflow-x-auto">
                <div className="max-w-4xl mx-auto flex items-stretch">
                  {[
                    { id: 0, label: 'Profile' },
                    { id: 1, label: 'Privacy' },
                    { id: 2, label: 'Ratings' },
                    { id: 3, label: 'Feedback' },
                    { id: 4, label: 'Alumni ID' }
                  ].map((s) => (
                    <div 
                      key={s.id}
                      className={`step-pill ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
                    >
                      <div className="step-dot">{step > s.id ? '✓' : s.id + 1}</div>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
                {/* Introduction Purpose Card */}
                {step === 0 && (
                  <div className="card-custom">
                    <div className="flex items-start gap-4 mb-8 pb-5 border-b border-[#dceadc]">
                      <div className="w-11 h-11 bg-[#eaf5ea] border-[1.5px] border-[#dceadc] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        👤
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#3d8c3d] uppercase tracking-[0.16em] mb-1">Section 1 of 5</div>
                        <h3 className="font-serif text-xl font-bold text-[#0f3d0f] leading-none">Personal Information</h3>
                        <p className="text-[11px] text-[#7a8e7a] mt-1">Tell us about yourself so we can connect your feedback properly.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs font-semibold text-[#4a5e4a]">Email Address <span className="text-[#2d7a2d]">*</span></Label>
                          <Input 
                            id="email" 
                            type="email" 
                            className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0"
                            placeholder="yourname@email.com" 
                            value={formData.email}
                            onChange={e => handleUpdateField('email', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs font-semibold text-[#4a5e4a]">Full Name <span className="text-[#2d7a2d]">*</span></Label>
                          <Input 
                            id="name" 
                            className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0"
                            placeholder="Last Name, First Name M.I." 
                            value={formData.name}
                            onChange={e => handleUpdateField('name', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="program" className="text-xs font-semibold text-[#4a5e4a]">Degree Program <span className="text-[#2d7a2d]">*</span></Label>
                          <Select 
                            value={formData.program} 
                            onValueChange={v => handleUpdateField('program', v)}
                          >
                            <SelectTrigger className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0">
                              <SelectValue placeholder="— Select your program —" />
                            </SelectTrigger>
                            <SelectContent>
                              {PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="yearGrad" className="text-xs font-semibold text-[#4a5e4a]">Year Graduated <span className="text-[#2d7a2d]">*</span></Label>
                          <Input 
                            id="yearGrad" 
                            className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0"
                            placeholder="e.g. 2025" 
                            value={formData.yearGrad}
                            onChange={e => handleUpdateField('yearGrad', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact" className="text-xs font-semibold text-[#4a5e4a]">Contact Number <span className="text-[#2d7a2d]">*</span></Label>
                          <Input 
                            id="contact" 
                            className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0"
                            placeholder="09XXXXXXXXX" 
                            value={formData.contact}
                            onChange={e => handleUpdateField('contact', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fbName" className="text-xs font-semibold text-[#4a5e4a]">Facebook Name <span className="text-[#2d7a2d]">*</span></Label>
                          <Input 
                            id="fbName" 
                            className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0"
                            placeholder="Your Facebook display name" 
                            value={formData.fbName}
                            onChange={e => handleUpdateField('fbName', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs font-semibold text-[#4a5e4a]">Permanent Address <span className="text-[#2d7a2d]">*</span></Label>
                        <Input 
                          id="address" 
                          className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0"
                          placeholder="House No., Street, Barangay, City/Municipality, Province" 
                          value={formData.address}
                          onChange={e => handleUpdateField('address', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employment" className="text-xs font-semibold text-[#4a5e4a]">Employment Status <span className="text-[#7a8e7a] font-normal">(optional)</span></Label>
                        <Input 
                          id="employment" 
                          className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0"
                          placeholder="e.g. Employed — ABC Hospital, Staff Nurse" 
                          value={formData.employment}
                          onChange={e => handleUpdateField('employment', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-8 pt-6 border-t flex justify-end">
                      <Button onClick={nextStep} className="bg-[#0f3d0f] hover:bg-[#1e5e1e] rounded-full px-8 py-6 h-auto font-serif font-bold text-lg shadow-lg group">
                        Next Section <ChevronRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="card-custom">
                    <div className="flex items-start gap-4 mb-8 pb-5 border-b border-[#dceadc]">
                      <div className="w-11 h-11 bg-[#eaf5ea] border-[1.5px] border-[#dceadc] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        🔐
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#3d8c3d] uppercase tracking-[0.16em] mb-1">Section 2 of 5</div>
                        <h3 className="font-serif text-xl font-bold text-[#0f3d0f] leading-none">Data Privacy Consent</h3>
                        <p className="text-[11px] text-[#7a8e7a] mt-1">Your data is protected under Philippine law.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-[#eaf5ea] rounded-xl text-sm leading-[1.75] text-[#4a5e4a] border border-[#c5ddc5]">
                        I hereby authorize <strong className="text-[#0f3d0f]">MVGFCI Student Affairs</strong> to collect and process my personal data in accordance with <strong className="text-[#0f3d0f]">RA 10173 (Data Privacy Act of 2012)</strong>. The information gathered will be used solely for survey evaluation, alumni services, and institutional improvement. All data will be treated confidentially and accessed only by authorized personnel.
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                          className={`choice-btn ${formData.consent === 'I Agree' ? 'selected-yes shadow-md' : ''}`}
                          onClick={() => handleUpdateField('consent', 'I Agree')}
                        >
                          <span className="text-lg">✅</span> I Agree
                        </button>
                        <button 
                          className={`choice-btn ${formData.consent === 'I Disagree' ? 'selected-no shadow-md' : ''}`}
                          onClick={() => handleUpdateField('consent', 'I Disagree')}
                        >
                          <span className="text-lg">❌</span> I Disagree
                        </button>
                      </div>
                    </div>
                    <div className="mt-8 pt-6 border-t flex justify-between gap-4">
                      <Button variant="ghost" onClick={() => setStep(0)} className="rounded-full px-6 h-12 text-[#4a5e4a] hover:bg-[#eaf5ea]">
                        Back
                      </Button>
                      <Button onClick={nextStep} className="bg-[#0f3d0f] hover:bg-[#1e5e1e] rounded-full px-8 py-6 h-auto font-serif font-bold text-lg shadow-lg group">
                        Next Section <ChevronRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ratings */}
                {step === 2 && (
                  <div className="card-custom">
                    <div className="flex items-start gap-4 mb-8 pb-5 border-b border-[#dceadc]">
                      <div className="w-11 h-11 bg-[#eaf5ea] border-[1.5px] border-[#dceadc] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        ⭐
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#3d8c3d] uppercase tracking-[0.16em] mb-1">Section 3 of 5</div>
                        <h3 className="font-serif text-xl font-bold text-[#0f3d0f] leading-none">Satisfaction Parameters</h3>
                        <p className="text-[11px] text-[#7a8e7a] mt-1">Rate each aspect of your graduation experience.</p>
                      </div>
                    </div>

                    <div className="bg-linear-to-br from-[#0f3d0f] to-[#1e5e1e] rounded-xl p-5 mb-8 flex items-center gap-4">
                      <div className="text-2xl">🏆</div>
                      <div>
                        <p className="text-xs font-semibold text-[#f0d88a]">How it works:</p>
                        <p className="text-[11px] text-white/80 leading-tight mt-1">Select a face that best describes your satisfaction for each item.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {RATING_QUESTIONS.map((q) => (
                        <div key={q.id} className={`p-5 rounded-2xl border-[1.5px] transition-all relative ${formData.ratings[q.id] ? 'border-[#3d8c3d] bg-[#f3fbf3]' : 'border-[#dceadc] bg-white'}`}>
                          <div className="flex gap-3 mb-4">
                            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[#0f3d0f] flex items-center justify-center text-[10px] font-bold text-white">
                              {q.num}
                            </div>
                            <p className="text-sm font-semibold text-[#2a3d2a]">{q.text}</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                             {Object.entries(SATISFACTION_LABELS).map(([score, info]) => (
                                <button
                                  key={score}
                                  onClick={() => handleUpdateRating(q.id, parseInt(score))}
                                  className={`
                                    flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group
                                    ${formData.ratings[q.id] === parseInt(score) 
                                      ? `border-transparent shadow-lg -translate-y-1 ${
                                          score === '4' ? 'bg-linear-to-br from-[#1e5e1e] to-[#2d7a2d]' :
                                          score === '3' ? 'bg-linear-to-br from-[#2d7a2d] to-[#3d8c3d]' :
                                          score === '2' ? 'bg-linear-to-br from-[#8c6a00] to-[#c9a84c]' :
                                          'bg-linear-to-br from-[#8c1a0f] to-[#c0392b]'
                                        }`
                                      : 'border-[#c5ddc5] bg-white hover:border-[#3d8c3d] hover:bg-[#eaf5ea]'
                                    }
                                  `}
                                >
                                  <span className={`text-2xl mb-1 transition-transform group-hover:scale-110 ${formData.ratings[q.id] === parseInt(score) ? 'scale-110' : ''}`}>{info.emoji}</span>
                                  <span className={`text-[10px] leading-tight font-bold text-center ${formData.ratings[q.id] === parseInt(score) ? 'text-white/90' : 'text-[#7a8e7a]'}`}>
                                    {info.label.split(' ').join('\n')}
                                  </span>
                                </button>
                              ))}
                          </div>
                          {formData.ratings[q.id] && (
                            <div className="absolute top-4 right-4 w-5 h-5 bg-[#2d7a2d] text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t flex justify-between gap-4">
                      <Button variant="ghost" onClick={() => setStep(1)} className="rounded-full px-6 h-12 text-[#4a5e4a] hover:bg-[#eaf5ea]">
                        Back
                      </Button>
                      <Button onClick={nextStep} className="bg-[#0f3d0f] hover:bg-[#1e5e1e] rounded-full px-8 py-6 h-auto font-serif font-bold text-lg shadow-lg group">
                        Next Section <ChevronRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="card-custom">
                    <div className="flex items-start gap-4 mb-8 pb-5 border-b border-[#dceadc]">
                      <div className="w-11 h-11 bg-[#eaf5ea] border-[1.5px] border-[#dceadc] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        💬
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#3d8c3d] uppercase tracking-[0.16em] mb-1">Section 4 of 5</div>
                        <h3 className="font-serif text-xl font-bold text-[#0f3d0f] leading-none">Open Feedback</h3>
                        <p className="text-[11px] text-[#7a8e7a] mt-1">Your words matter — these responses are read by the administration.</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                       {[
                         { id: 'appreciate', label: 'What aspect of the graduation process did you appreciate the most?', num: '1' },
                         { id: 'improve', label: 'What aspect needs improvement?', num: '2' },
                         { id: 'suggestions', label: 'Suggestions for future graduation ceremonies', num: '3' }
                       ].map((fb) => (
                         <div key={fb.id} className="space-y-3">
                           <div className="flex items-center gap-3">
                             <div className="w-6 h-6 bg-[#0f3d0f] text-[#f0d88a] rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0">{fb.num}</div>
                             <Label className="text-sm font-semibold text-[#2a3d2a]">{fb.label} <span className="text-[#2d7a2d]">*</span></Label>
                           </div>
                           <Textarea 
                              className="rounded-xl border-[#c5ddc5] focus:border-[#2d7a2d] focus:ring-0 min-h-[120px] bg-[#fbfdfb]"
                              placeholder="Share your thoughts..."
                              value={formData[fb.id as keyof SurveyData] as string}
                              onChange={e => handleUpdateField(fb.id as keyof SurveyData, e.target.value)}
                              maxLength={500}
                           />
                           <div className="text-[10px] text-right text-[#7a8e7a] font-medium tracking-wide">
                             {(formData[fb.id as keyof SurveyData] as string).length}/500
                           </div>
                         </div>
                       ))}
                    </div>

                    <div className="mt-8 pt-6 border-t flex justify-between gap-4">
                      <Button variant="ghost" onClick={() => setStep(2)} className="rounded-full px-6 h-12 text-[#4a5e4a] hover:bg-[#eaf5ea]">
                        Back
                      </Button>
                      <Button onClick={nextStep} className="bg-[#0f3d0f] hover:bg-[#1e5e1e] rounded-full px-8 py-6 h-auto font-serif font-bold text-lg shadow-lg group">
                        Next Section <ChevronRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Alumni ID */}
                {step === 4 && (
                  <div className="card-custom">
                    <div className="flex items-start gap-4 mb-8 pb-5 border-b border-[#dceadc]">
                      <div className="w-11 h-11 bg-[#eaf5ea] border-[1.5px] border-[#dceadc] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        🆔
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#3d8c3d] uppercase tracking-[0.16em] mb-1">Section 5 of 5</div>
                        <h3 className="font-serif text-xl font-bold text-[#0f3d0f] leading-none">MVGFC Alumni ID</h3>
                        <p className="text-[11px] text-[#7a8e7a] mt-1">Get your digital-ready alumni identification card.</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4">
                        <Label className="text-sm font-bold text-[#2a3d2a]">Would you like to apply for an Alumni ID?</Label>
                        <div className="flex gap-4">
                          <button 
                            className={`choice-btn ${formData.alumniId === 'Yes' ? 'selected-yes shadow-md' : ''}`}
                            onClick={() => handleUpdateField('alumniId', 'Yes')}
                          >
                            <span className="text-lg">💳</span> Yes, I want one
                          </button>
                          <button 
                            className={`choice-btn ${formData.alumniId === 'No' ? 'selected-no shadow-md' : ''}`}
                            onClick={() => handleUpdateField('alumniId', 'No')}
                          >
                            <span className="text-lg">⏭️</span> Skip for now
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {formData.alumniId === 'Yes' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-8 pt-4 overflow-hidden"
                          >
                            <div className="p-4 bg-[#fff5d6] border border-[#f0d88a] rounded-xl flex gap-3 items-start">
                              <span className="text-xl">💡</span>
                              <p className="text-[11px] text-[#8c6a00] leading-relaxed font-medium">Please ensure all information below matches your official records. Your photo will be printed on your physical ID.</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-[#4a5e4a]">Date of Birth</Label>
                                <Input type="date" className="rounded-xl border-[#c5ddc5]" value={formData.dob} onChange={e => handleUpdateField('dob', e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-[#4a5e4a]">Citizenship</Label>
                                <Input className="rounded-xl border-[#c5ddc5]" placeholder="e.g. Filipino" value={formData.citizenship} onChange={e => handleUpdateField('citizenship', e.target.value)} />
                              </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-[#4a5e4a]">Complete Home Address</Label>
                                <Input className="rounded-xl border-[#c5ddc5]" placeholder="House No, Street, Barangay, City/Province" value={formData.homeAddress} onChange={e => handleUpdateField('homeAddress', e.target.value)} />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-[#4a5e4a]">Emergency Contact Person</Label>
                                <Input className="rounded-xl border-[#c5ddc5]" placeholder="Full Name" value={formData.emergencyPerson} onChange={e => handleUpdateField('emergencyPerson', e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-[#4a5e4a]">Emergency Number</Label>
                                <Input className="rounded-xl border-[#c5ddc5]" placeholder="09XXXXXXXXX" value={formData.emergencyContact} onChange={e => handleUpdateField('emergencyContact', e.target.value)} />
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6 pt-4">
                              <div className="space-y-3">
                                <Label className="text-xs font-bold text-[#2a3d2a] flex items-center gap-2">✍️ Wet Signature</Label>
                                <div 
                                  onClick={() => document.getElementById('esig-u')?.click()}
                                  className="upload-zone"
                                >
                                  <input id="esig-u" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload('esig', e.target.files[0])} />
                                  {files.esig ? (
                                    <div className="relative group">
                                      <img src={`data:${formData.esigType};base64,${files.esig}`} className="h-24 w-full object-contain mx-auto" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                        <span className="text-[10px] text-white font-bold bg-[#c0392b] px-3 py-1 rounded-full">Replace</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-lg">🖋️</div>
                                      <p className="text-[11px] font-bold text-[#0f3d0f] mt-2 underline">Upload Image</p>
                                      <p className="text-[9px] text-[#7a8e7a]">PNG (Transparent preferred)</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <Label className="text-xs font-bold text-[#2a3d2a] flex items-center gap-2">🤳 2x2 ID Photo</Label>
                                <div 
                                  onClick={() => document.getElementById('photo-u')?.click()}
                                  className="upload-zone"
                                >
                                  <input id="photo-u" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload('photo', e.target.files[0])} />
                                  {files.photo ? (
                                    <div className="relative group mx-auto w-24 h-24">
                                      <img src={`data:${formData.photoType};base64,${files.photo}`} className="h-24 w-24 object-cover rounded-lg shadow-md" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                        <span className="text-[10px] text-white font-bold bg-[#c0392b] px-3 py-1 rounded-full">Replace</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-lg">📸</div>
                                      <p className="text-[11px] font-bold text-[#0f3d0f] mt-2 underline">Upload Image</p>
                                      <p className="text-[9px] text-[#7a8e7a]">2x2 Size, White Background</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                      <Button variant="ghost" onClick={() => setStep(3)} className="rounded-full px-6 h-12 text-[#4a5e4a] hover:bg-[#eaf5ea] w-full sm:w-auto">
                        Back to Feedback
                      </Button>
                      <Button 
                        onClick={submitSurvey} 
                        disabled={isSubmitting}
                        className="bg-linear-to-r from-[#0f3d0f] to-[#1e5e1e] hover:shadow-xl hover:scale-[1.02] text-[#f0d88a] rounded-full px-12 py-7 h-auto font-serif font-bold text-xl shadow-lg group w-full sm:w-auto transition-all"
                      >
                        {isSubmitting ? (
                          <>
                             <div className="h-5 w-5 border-3 border-[#f0d88a] border-t-transparent rounded-full animate-spin mr-3" />
                             Submitting...
                          </>
                        ) : (
                          <>Submit Final Response <CheckCircle2 className="h-6 w-6 ml-3" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto py-20 px-6 text-center"
            >
              <div className="w-24 h-24 bg-[#eaf5ea] border-[3px] border-[#2d7a2d] rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-xl animate-bounce">
                🎓
              </div>
              <h2 className="font-serif text-4xl font-bold text-[#0f3d0f] mb-4">Congratulations, <br /><span className="text-[#2d7a2d]">{formData.name.split(',')[1] || 'Graduate'}</span>!</h2>
              <p className="text-[#7a8e7a] text-lg leading-relaxed mb-10">
                Your survey response has been securely transmitted. Thank you for helping MVGFC improve the graduation journey for the class of 2026.
              </p>
              
              <div className="p-6 bg-white rounded-3xl border border-[#dceadc] shadow-sm mb-10 flex items-center justify-center gap-6">
                 <div className="text-center">
                   <p className="text-[10px] uppercase font-bold text-[#7a8e7a] tracking-widest mb-1">Status</p>
                   <p className="text-sm font-bold text-[#2d7a2d] flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Received</p>
                 </div>
                 <div className="w-px h-10 bg-[#dceadc]" />
                 <div className="text-center">
                   <p className="text-[10px] uppercase font-bold text-[#7a8e7a] tracking-widest mb-1">Alumni ID</p>
                   <p className="text-sm font-bold text-[#0f3d0f]">{formData.alumniId === 'Yes' ? 'Processing' : 'N/A'}</p>
                 </div>
              </div>

              <Button 
                onClick={() => window.location.reload()}
                className="bg-linear-to-r from-[#0f3d0f] to-[#1e5e1e] text-[#f0d88a] rounded-full px-10 py-6 h-auto font-serif font-bold hover:scale-[1.05] transition-all shadow-lg"
              >
                Finish & Close
              </Button>
            </motion.div>
          )}

          {view === 'admin' && !isAdminLoggedIn && (
            <motion.div
              key="admin-login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto py-12"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" /> Admin Login
                  </CardTitle>
                  <CardDescription>Authentication required to view analytics.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pass">Password</Label>
                    <Input 
                      id="pass" 
                      type="password" 
                      value={adminPwd}
                      onChange={e => setAdminPwd(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                    />
                  </div>
                  <Button className="w-full" onClick={handleAdminLogin}>Access Dashboard</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {view === 'admin' && isAdminLoggedIn && (
            <motion.div
              key="admin-dash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 pb-20"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                     <LayoutDashboard className="h-8 w-8 text-primary" /> Analytics Dashboard
                  </h2>
                  <p className="text-muted-foreground">Real-time survey insights from Google Sheets API</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                   <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={isLoadingAnalytics} className="gap-2 flex-1">
                    <RefreshCcw className={`h-4 w-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsAdminLoggedIn(false)} className="gap-2 flex-1">
                    <LogOut className="h-4 w-4" /> Logout
                  </Button>
                </div>
              </div>

              {isLoadingAnalytics ? (
                <div className="grid gap-6">
                  <div className="h-32 bg-muted animate-pulse rounded-xl" />
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="h-64 bg-muted animate-pulse rounded-xl" />
                    <div className="h-64 bg-muted animate-pulse rounded-xl" />
                  </div>
                </div>
              ) : analytics ? (
                <div className="grid gap-6">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Respondents</CardDescription>
                        <CardTitle className="text-3xl">{analytics.total}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Alumni ID Requests</CardDescription>
                        <CardTitle className="text-3xl">{analytics.alumni?.Yes || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Overall Avg Rating</CardDescription>
                        <CardTitle className="text-3xl">
                          {analytics.total > 0 ? (
                            (Object.values(analytics.avgRatings).reduce((a: number, b: number) => (a as any) + (b as any), 0) as number / 
                            (Object.keys(analytics.avgRatings).length || 1)).toFixed(2)
                          ) : "0.00"}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Consent Rate</CardDescription>
                        <CardTitle className="text-3xl">
                          {analytics.total > 0 ? Math.round(((analytics.consent?.['I Agree'] as number || 0) / (analytics.total as number)) * 100) : 0}%
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Top Rating</CardDescription>
                        <CardTitle className="text-3xl">4.0</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="responses">Recent Responses</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                         <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Program Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {Object.entries(analytics.programs).sort((a,b) => (b[1] as number) - (a[1] as number)).map(([p, c]) => (
                                <div key={p} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span>{p}</span>
                                    <span>{c} ({Math.round(c as number / (analytics.total as number) * 100)}%)</span>
                                  </div>
                                  <Progress value={(c as number) / (analytics.total as number) * 100} className="h-1.5" />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Satisfaction Averages</CardTitle>
                          </CardHeader>
                          <CardContent>
                             <div className="space-y-3">
                              {Object.entries(analytics.avgRatings).map(([k, v]) => {
                                const q = RATING_QUESTIONS.find(rq => rq.id === k);
                                if (!q) return null;
                                return (
                                  <div key={k} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                                      <span className="truncate max-w-[200px]">{q.text}</span>
                                      <span>{(v as number).toFixed(2)}/4</span>
                                    </div>
                                    <Progress value={((v as number) / 4) * 100} className="h-1" />
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Latest Appreciation Feedback</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {analytics.appreciation.map((fb, i) => (
                              <div key={i} className="p-4 rounded-xl border bg-muted/30 text-sm leading-relaxed">
                                <p className="font-bold text-primary mb-1">— {fb.name}</p>
                                "{fb.text}"
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="responses">
                      <Card>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="p-4 font-bold uppercase tracking-tight text-[10px]">Time</th>
                                <th className="p-4 font-bold uppercase tracking-tight text-[10px]">Name</th>
                                <th className="p-4 font-bold uppercase tracking-tight text-[10px]">Program</th>
                                <th className="p-4 font-bold uppercase tracking-tight text-[10px]">Consent</th>
                                <th className="p-4 font-bold uppercase tracking-tight text-[10px]">ID Req</th>
                                <th className="p-4 font-bold uppercase tracking-tight text-[10px]">Avg</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {analytics.recentResponses.map((r, i) => (
                                <tr key={i} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-4 text-muted-foreground whitespace-nowrap">{r.ts}</td>
                                  <td className="p-4 font-bold">{r.name}</td>
                                  <td className="p-4">{r.program}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.consent === 'I Agree' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {r.consent}
                                    </span>
                                  </td>
                                  <td className="p-4 uppercase text-[10px] font-bold">{r.alumni}</td>
                                  <td className="p-4 font-mono font-bold text-primary">{r.avg}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                  <BarChart3 className="h-12 w-12 text-muted mx-auto mb-4" />
                  <p className="text-muted-foreground">No analytics data available. Connect your Apps Script first.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full border-t py-8 bg-muted/10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 MVGFC Student Affairs Office · Graduation Satisfaction Survey System
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
             <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </footer>
    </div>
  );
}
