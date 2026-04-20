/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  MessageSquare, 
  LogOut, 
  Search, 
  Zap, 
  Send,
  BarChart3,
  PenTool,
  Hash,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getSocialMediaTrends, generateContent, analyzeCompetitor } from './lib/gemini';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'dashboard' | 'chat' | 'content' | 'competitor';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(u === null);
      if (u) {
        setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const sendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    const response = await getSocialMediaTrends(userMsg);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsTyping(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] flex flex-col items-center justify-center p-6 text-center font-sans text-slate-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#111419] p-10 rounded-2xl shadow-2xl border border-slate-800/50"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-900/20">
            <TrendingUp className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">PulseAI</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Your all-in-one assistant for social media intelligence, trends, and content strategy.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-white" />
            Continue with Google
          </button>
          <p className="mt-6 text-[10px] text-slate-600 uppercase tracking-widest">
            Secure authentication handled by Firebase
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0A0B0E] text-slate-300 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-[#111419] border-r border-slate-800/50 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">PulseAI</span>
          </div>

          <div className="space-y-1">
            <NavButton 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Overview"
            />
            <NavButton 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')}
              icon={<MessageSquare className="w-4 h-4" />}
              label="Social Chatbot"
            />
            <NavButton 
              active={activeTab === 'content'} 
              onClick={() => setActiveTab('content')}
              icon={<PenTool className="w-4 h-4" />}
              label="Content Studio"
            />
            <NavButton 
              active={activeTab === 'competitor'} 
              onClick={() => setActiveTab('competitor')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Competitors"
            />
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800/50 opacity-90">
          <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl mb-4 border border-slate-700/50 shadow-inner">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20"></div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate block">{user.displayName}</span>
              <span className="text-[10px] text-indigo-400 font-medium truncate block">PRO Marketer</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#0F1115] relative">
        <header className="h-16 border-b border-slate-800/50 flex align-center items-center px-8 bg-[#0F1115]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20"></div>
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
              {activeTab === 'dashboard' ? 'Market Analysis Mode' : 
               activeTab === 'chat' ? 'Trending Insight Mode' : 
               activeTab === 'content' ? 'Content Factory' : 'Competitive Intel'}
            </h2>
          </div>
          
          <div className="relative group flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Global trends search..." 
              className="bg-[#1A1D23] border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:border-indigo-500 transition-colors text-slate-300 placeholder-slate-500 shadow-inner"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <DashboardView key="dash" />}
            {activeTab === 'chat' && (
              <div key="chat" className="h-full flex flex-col max-w-4xl mx-auto rounded-2xl overflow-hidden">
                <div ref={scrollRef} className="flex-1 overflow-y-auto pb-6 space-y-6">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-20">
                      <MessageSquare className="w-16 h-16 mb-4 text-slate-600" />
                      <p className="text-lg font-medium text-slate-300">Ask me about trends on Instagram, Youtube, or TikTok</p>
                      <p className="text-sm text-slate-500">I'll use real-time search to find what's hot.</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex",
                        m.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {m.role === 'user' ? (
                        <div className="max-w-[420px] bg-indigo-600/10 border border-indigo-500/30 p-4 rounded-2xl rounded-tr-none shadow-lg shadow-indigo-900/10">
                          <p className="text-sm leading-relaxed text-indigo-100 italic">"{m.content}"</p>
                        </div>
                      ) : (
                        <div className="max-w-[580px] bg-[#1A1D23] border border-slate-800 p-6 rounded-2xl rounded-tl-none shadow-xl">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
                              <Zap className="w-3 h-3 text-white fill-white" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">PulseAI Insight</span>
                          </div>
                          <div className="text-sm text-slate-300 prose prose-invert prose-indigo prose-p:text-slate-300 prose-headings:text-slate-200 prose-strong:text-white prose-a:text-indigo-400 prose-li:text-slate-300">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-[580px] bg-[#1A1D23] border border-slate-800 p-4 rounded-2xl rounded-tl-none shadow-xl flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Fixed Input area at bottom of chat panel */}
                <div className="p-6 bg-[#0A0B0E] border border-slate-800/50 rounded-xl mx-auto w-full max-w-4xl shrink-0">
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Ask about hashtags, trends, or competitor analysis..." 
                      className="w-full bg-[#1A1D23] border border-slate-800 rounded-xl py-4 pl-6 pr-36 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner text-slate-200 placeholder-slate-500"
                    />
                    <div className="absolute right-2 flex gap-2">
                      <button 
                        onClick={sendMessage}
                        disabled={isTyping}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center h-full"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'content' && <ContentView key="content" />}
            {activeTab === 'competitor' && <CompetitorView key="comp" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer group text-left",
        active 
          ? "bg-slate-800/50 text-indigo-400" 
          : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-300"
      )}
    >
      <div className="flex items-center justify-center w-5">
        {icon}
      </div>
      <span className={cn("text-sm", active ? "font-medium" : "")}>{label}</span>
    </button>
  );
}

function DashboardView() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-gradient-to-br from-[#1A1D23] to-[#111419] rounded-2xl p-8 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Market Pulse</span>
              </div>
              <h3 className="text-3xl font-bold mb-4 leading-tight text-white">Identify Trending<br />Topics with AI</h3>
              <p className="text-slate-400 max-w-sm mb-6 text-sm leading-relaxed">
                Connect your social media goals with real-time data from the web.
              </p>
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold w-fit flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/40 border border-indigo-500/50">
              Start Researching
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 -translate-y-20 translate-x-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl mix-blend-screen" />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard icon={<Hash />} title="Trending Tags" value="+2,450" color="bg-orange-500/10 border border-orange-500/20 text-orange-400" />
          <StatCard icon={<Clock />} title="Optimal Post Time" value="18:30" color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" />
        </section>

        <section className="bg-[#1A1D23] rounded-2xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Platform Pulse</h4>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-md text-[10px] font-bold">Daily</button>
              <button className="px-3 py-1.5 hover:bg-slate-800/50 text-slate-400 rounded-md text-[10px] font-bold transition-colors">Weekly</button>
            </div>
          </div>
          <div className="space-y-5">
            <PulseItem label="Instagram Reels" value="High Activity" percentage={88} color="#6366F1" />
            <PulseItem label="YouTube Shorts" value="Increasing" percentage={72} color="#10B981" />
            <PulseItem label="TikTok Audio" value="Viral Surge" percentage={95} color="#F59E0B" />
          </div>
        </section>
      </div>

      <aside className="space-y-6 flex flex-col">
        <section className="bg-[#111419] rounded-2xl p-6 border border-slate-800 shadow-xl">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Quick Actions</h4>
          <div className="space-y-3">
            {[
              { icon: <TrendingUp className="w-4 h-4" />, label: 'Analyze Instagram Pulse', sub: 'Predict next big trend' },
              { icon: <PenTool className="w-4 h-4" />, label: 'Caption Generator', sub: 'AI written hooks' },
              { icon: <BarChart3 className="w-4 h-4" />, label: 'Audit Competitor', sub: 'Strategy teardown' }
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg border border-slate-800/50 hover:bg-slate-800/80 transition-colors text-left group">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:text-white transition-all shrink-0 shadow-inner">
                  {item.icon}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">{item.label}</span>
                  <span className="text-[10px] text-slate-500 block">{item.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-xl relative overflow-hidden mt-auto">
          <div className="relative z-10">
            <div className="flex items-center gap-1 mb-2">
               <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Pro Tip</span>
            </div>
            <p className="text-xs leading-relaxed italic text-slate-400">
              Include a 2-second visual hook showing texture to boost YouTube Shorts reach by 3x.
            </p>
          </div>
        </section>
      </aside>
    </motion.div>
  );
}

function StatCard({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: string }) {
  return (
    <div className="bg-[#1A1D23] p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-inner", color)}>
        {icon}
      </div>
    </div>
  );
}

function PulseItem({ label, value, percentage, color }: { label: string, value: string, percentage: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-xs text-slate-300 font-medium">{label}</span>
        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{value} · {percentage}%</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full rounded-full transition-all"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ContentView() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<'Instagram' | 'YouTube' | 'TikTok' | 'General'>('Instagram');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    const content = await generateContent(topic, platform);
    setResult(content);
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="bg-[#1A1D23] rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-300 block">What's your content about?</label>
          <input 
            type="text" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Summer skincare routine, New tech gadget review..." 
            className="w-full bg-[#0F1115] border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors placeholder-slate-600 shadow-inner"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {(['Instagram', 'YouTube', 'TikTok', 'General'] as const).map(p => (
            <button 
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                platform === p 
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20" 
                : "bg-[#0A0B0E] text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-300"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading || !topic}
          className="w-full bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
        >
          {loading ? 'Generative Magic...' : 'Generate Content Strategy'}
        </button>

        {result && (
          <div className="bg-[#0A0B0E] border border-slate-800/50 rounded-xl p-6 mt-6">
            <div className="prose prose-invert prose-indigo prose-sm max-w-none text-slate-300 prose-headings:text-slate-200 prose-a:text-indigo-400">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CompetitorView() {
  const [name, setName] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!name) return;
    setLoading(true);
    const analysis = await analyzeCompetitor(name);
    setResult(analysis);
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="bg-[#1A1D23] rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-300 block">Enter Competitor or Brand Name</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nike, Sephora, Peter McKinnon..." 
              className="flex-1 bg-[#0F1115] border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors placeholder-slate-600 shadow-inner"
            />
            <button 
              onClick={handleAnalyze}
              disabled={loading || !name}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Audit'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-[#0A0B0E] border border-slate-800/50 rounded-xl p-6 mt-6">
            <div className="prose prose-invert prose-indigo prose-sm max-w-none text-slate-300 prose-headings:text-slate-200 prose-a:text-indigo-400">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="p-12 border border-dashed border-slate-700 bg-slate-900/20 rounded-2xl text-center opacity-50 mt-6">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-500" />
            <p className="text-sm font-bold italic text-slate-400">Uncover their secret sauce...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
