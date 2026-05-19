"use client";
import { useState, useEffect, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type Mode = "easy" | "build" | "hard";
type HardTab = "find" | "validate";
type BuildTab = "launch" | "brand";
type Path = { emoji:string; title:string; tagline:string; whyYou:string; timeToFirstIncome:string; startupCost:string; difficulty:string; firstStep:string; steps:string[]; };
type Product = { name:string; emoji:string; tagline:string; whyItFits:string; opportunity:string; competition:string; margin:string; trend:string; trendNote:string; startupCost:string; timeToFirstSale:string; firstMove:string; };
type Validation = { score:number; verdict:string; verdictLine:string; executiveSummary:string; keyRecommendations:string[]; problemScore:number; solutionScore:number; marketScore:number; greenLights:string[]; redFlags:string[]; competitors:{name:string;note:string}[]; marketSize:string; biggestRisk:string; recommendation:string; firstSteps:string[]; };
type LaunchTask = { week:string; action:string; why:string; };
type LaunchPhase = { name:string; duration:string; goal:string; tasks:LaunchTask[]; };
type LaunchPlan = { headline:string; phases:LaunchPhase[]; milestones:{when:string;target:string}[]; topPriority:string; biggestTrap:string; revenueTarget:string; };
type BrandName = { name:string; handle:string; domain:string; why:string; };
type BrandResult = { names:BrandName[]; positioning:string; tagline:string; targetCustomer:{who:string;age:string;interests:string[];painPoints:string[];whereTheyHang:string[];}; brandVoice:{tone:string;doSay:string[];dontSay:string[];}; visualDirection:{feel:string;colours:string[];fontStyle:string;}; contentAngles:string[]; };

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  purple: "#7C3AED",
  purpleLight: "#EDE9FE",
  purpleMid: "#8B5CF6",
  emerald: "#059669",
  emeraldLight: "#D1FAE5",
  orange: "#EA580C",
  orangeLight: "#FFF7ED",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  amber: "#D97706",
  red: "#DC2626",
};

// ── Mode config ──────────────────────────────────────────────────────────────
const MODES = [
  { id:"easy"  as Mode, emoji:"🌱", label:"Find Your Path",      sub:"New to business",   desc:"Tell us your situation. We find 3 business paths that fit your life, skills, and budget.", cta:"Start here →", xp:50,  accent:C.emerald, accentLight:C.emeraldLight, accentBorder:"#A7F3D0" },
  { id:"build" as Mode, emoji:"🏗️", label:"Build Your Business", sub:"Got an idea",        desc:"Brand it, plan your launch, and map every week of your first 90 days.",                 cta:"Let's build →",xp:75,  accent:C.orange,  accentLight:C.orangeLight,  accentBorder:"#FED7AA" },
  { id:"hard"  as Mode, emoji:"⚡", label:"Research & Validate", sub:"Know what you want", desc:"Find winning products or stress-test your idea with brutal, honest analysis.",            cta:"Dig in →",     xp:100, accent:C.purple,  accentLight:C.purpleLight,  accentBorder:"#C4B5FD" },
];

// ── Gamification ─────────────────────────────────────────────────────────────
const LEVELS = [
  {name:"Curious",  min:0,    color:"#9CA3AF"},
  {name:"Aspiring", min:100,  color:C.amber},
  {name:"Builder",  min:300,  color:C.emerald},
  {name:"Founder",  min:600,  color:C.purple},
  {name:"Mogul",    min:1000, color:"#EF4444"},
];
const XP_MAP: Record<string,number> = {easy:50, find:75, validate:100, launch:100, brand:75};
function getLevel(xp:number) { return [...LEVELS].reverse().find(l=>xp>=l.min) ?? LEVELS[0]; }
function xpToNextLevel(xp:number) {
  const cur = [...LEVELS].reverse().findIndex(l=>xp>=l.min);
  const idx  = LEVELS.length - 1 - cur;
  const next = LEVELS[idx+1];
  if (!next) return {pct:100, remaining:0};
  const cur2 = LEVELS[idx];
  const pct   = ((xp - cur2.min) / (next.min - cur2.min)) * 100;
  return {pct: Math.min(pct,100), remaining: next.min - xp};
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = "founder-input";
const verdictStyle: Record<string,{bg:string;color:string;label:string}> = {
  Strong:    {bg:C.emeraldLight, color:C.emerald,  label:"STRONG"},
  Promising: {bg:C.purpleLight,  color:C.purple,   label:"PROMISING"},
  Risky:     {bg:"#FFFBEB",      color:C.amber,    label:"RISKY"},
  Avoid:     {bg:"#FEF2F2",      color:C.red,      label:"AVOID"},
};
const oppBadge  = (v:string) => v==="High"?"bg-emerald-100 text-emerald-700":v==="Medium"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-600";
const compBadge = (v:string) => v==="Low" ?"bg-emerald-100 text-emerald-700":v==="Medium"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-600";

// ── XP Toast ─────────────────────────────────────────────────────────────────
function XPToast({amount, color}:{amount:number; color:string}) {
  return (
    <div className="xp-toast fixed z-[999] pointer-events-none" style={{bottom:"80px",right:"24px"}}>
      <div className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg"
        style={{background:color}}>
        ⚡ +{amount} XP
      </div>
    </div>
  );
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({value,label,color}:{value:number;label:string;color:string}) {
  const r=20, circ=2*Math.PI*r, fill=circ-(circ*Math.min(value,100)/100);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4"/>
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" transform="rotate(-90 28 28)" style={{transition:"stroke-dashoffset 1s ease"}}/>
        <text x="28" y="33" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">{value}</text>
      </svg>
      <span className="text-xs font-bold" style={{color:"rgba(255,255,255,0.5)"}}>{label}</span>
    </div>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────
function ScoreBar({label,value,color}:{label:string;value:number;color:string}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-sm font-bold" style={{color}}>{value}/100</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full progress-bar" style={{width:`${value}%`,background:color}}/>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [mode, setMode] = useState<Mode|null>(null);
  const [hardTab, setHardTab]   = useState<HardTab>("find");
  const [buildTab, setBuildTab] = useState<BuildTab>("launch");

  const [easyForm,   setEasyForm]   = useState({situation:"",time:"5–10 hrs/week",budget:"Under £500",skills:""});
  const [findForm,   setFindForm]   = useState({audience:"",budget:"£500–2k",type:"Either",extra:""});
  const [valForm,    setValForm]    = useState({idea:"",customer:"",problem:"",extra:""});
  const [launchForm, setLaunchForm] = useState({idea:"",stage:"Just an idea",budget:"Under £500",time:"5–10 hrs/week",extra:""});
  const [brandForm,  setBrandForm]  = useState({idea:"",audience:"",vibe:"Bold & Edgy",names:"",extra:""});

  const [easyResults,  setEasyResults]  = useState<Path[]|null>(null);
  const [findResults,  setFindResults]  = useState<Product[]|null>(null);
  const [valResult,    setValResult]    = useState<Validation|null>(null);
  const [launchResult, setLaunchResult] = useState<LaunchPlan|null>(null);
  const [brandResult,  setBrandResult]  = useState<BrandResult|null>(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Gamification
  const [xp,      setXp]      = useState(0);
  const [streak,  setStreak]  = useState(0);
  const [xpGain,  setXpGain]  = useState<{amount:number;color:string}|null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("founder_xp");
      if (!s) return;
      const {xp:x,streak:st,lastUsed} = JSON.parse(s);
      setXp(x??0);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now()-86400000).toDateString();
      if (lastUsed===today||lastUsed===yesterday) setStreak(st??0); else setStreak(0);
    } catch {}
  }, []);

  const awardXP = (apiMode:string, accentColor:string) => {
    const gain = XP_MAP[apiMode] ?? 50;
    setXp(prev => {
      const next = prev + gain;
      const today = new Date().toDateString();
      const stored = localStorage.getItem("founder_xp");
      const prev2 = stored ? JSON.parse(stored) : {};
      const newStreak = prev2.lastUsed===new Date(Date.now()-86400000).toDateString()
        ? streak+1 : prev2.lastUsed===today ? streak : 1;
      setStreak(newStreak);
      localStorage.setItem("founder_xp", JSON.stringify({xp:next,streak:newStreak,lastUsed:today}));
      return next;
    });
    setXpGain({amount:gain,color:accentColor});
    setTimeout(()=>setXpGain(null), 2200);
    setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:"smooth",block:"start"}), 400);
  };

  const call = async (apiMode:string, data:object) => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/founder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:apiMode,data})});
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json.result;
    } catch(e:unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return null;
    } finally { setLoading(false); }
  };

  const clearResults = () => { setEasyResults(null);setFindResults(null);setValResult(null);setLaunchResult(null);setBrandResult(null);setError(""); };

  const modeConfig = MODES.find(m=>m.id===mode);

  const submitEasy = async () => {
    if (!easyForm.situation.trim()) return; setEasyResults(null);
    const r = await call("easy", easyForm);
    if (r) { setEasyResults(r); awardXP("easy", C.emerald); }
  };
  const submitFind = async () => {
    if (!findForm.audience.trim()) return; setFindResults(null);
    const r = await call("find", findForm);
    if (r) { setFindResults(r); awardXP("find", C.purple); }
  };
  const submitValidate = async () => {
    if (!valForm.idea.trim()) return; setValResult(null);
    const r = await call("validate", valForm);
    if (r) { setValResult(r); awardXP("validate", C.purple); }
  };
  const submitLaunch = async () => {
    if (!launchForm.idea.trim()) return; setLaunchResult(null);
    const r = await call("launch", launchForm);
    if (r) { setLaunchResult(r); awardXP("launch", C.orange); }
  };
  const submitBrand = async () => {
    if (!brandForm.idea.trim()) return; setBrandResult(null);
    const r = await call("brand", brandForm);
    if (r) { setBrandResult(r); awardXP("brand", C.orange); }
  };

  const level     = getLevel(xp);
  const {pct}     = xpToNextLevel(xp);
  const PhaseC    = [C.purple, C.emerald, C.blue];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{background:"#fafafa"}}>

      {xpGain && <XPToast amount={xpGain.amount} color={xpGain.color}/>}

      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 0% 0%, rgba(139,92,246,0.07) 0%, transparent 65%)"}}/>
        <div style={{position:"absolute",top:0,right:0,width:"55%",height:"100%",backgroundImage:"radial-gradient(circle, rgba(139,92,246,0.08) 1px, transparent 1px)",backgroundSize:"24px 24px",maskImage:"linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 100%)",WebkitMaskImage:"linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 100%)"}}/>
      </div>

      {/* ── Nav ── */}
      <header className="relative z-50 sticky top-0" style={{borderBottom:"1px solid #F3F4F6",background:"rgba(250,250,250,0.9)",backdropFilter:"blur(16px)"}}>
        <div className="mx-auto flex max-w-6xl items-center px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 w-36">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{background:C.purple}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-extrabold" style={{color:"#111827",letterSpacing:"-0.02em"}}>Founder</span>
          </div>

          {/* Gamification — centre */}
          <div className="flex flex-1 items-center justify-center gap-4">
            {/* Streak */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{background:streak>0?"#FFF7ED":"#F9FAFB",border:`1px solid ${streak>0?"#FED7AA":"#E5E7EB"}`}}>
              <span className="streak-fire text-sm">{streak>0?"🔥":"💤"}</span>
              <span className="text-xs font-bold" style={{color:streak>0?C.orange:"#9CA3AF"}}>{streak} day streak</span>
            </div>
            {/* XP + level bar */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{background:C.purpleLight,border:`1px solid #C4B5FD`}}>
                <span className="text-xs">⚡</span>
                <span className="text-xs font-bold" style={{color:C.purple}}>{xp} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:level.color}}/>
                </div>
                <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{background:level.color+"20",color:level.color}}>{level.name}</span>
              </div>
            </div>
          </div>

          {/* Auth */}
          <div className="flex w-36 items-center justify-end gap-3">
            <a href="/login" className="hidden text-sm font-medium text-gray-500 hover:text-gray-900 md:block transition-colors">Login</a>
            <a href="/signup" className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
              style={{background:C.purple,boxShadow:`0 2px 8px ${C.purple}40`}}>
              Sign Up
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">

        {/* ── Hero ── */}
        <section className="mx-auto max-w-3xl px-6 pb-12 pt-14 text-center">
          {/* Social proof */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex -space-x-2">
              {[C.purple,"#F59E0B","#10B981","#3B82F6","#EC4899"].map((c,i)=>(
                <div key={i} className="h-9 w-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white" style={{background:c,zIndex:5-i}}>
                  {["J","S","M","A","R"][i]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-amber-400">★★★★★</span>
              <span><span className="font-bold text-gray-900">12,400+</span> businesses built</span>
            </div>
          </div>

          <h1 className="mb-4 font-extrabold leading-tight" style={{fontSize:"clamp(2.4rem,6vw,3.6rem)",letterSpacing:"-0.04em",color:"#111827"}}>
            Your AI co-founder.<br/>
            <span style={{color:C.purple}}>From idea to launch.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-lg text-gray-500" style={{lineHeight:1.7}}>
            Find your idea, validate it, build your brand, get your launch plan — all AI-powered, all in one place.
          </p>

          {/* Mode pills on hero for quick jump */}
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {MODES.map(m=>(
              <a key={m.id} href="#tool"
                onClick={()=>{clearResults();setMode(m.id);}}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-all hover:scale-105"
                style={{background:m.accentLight,color:m.accent,border:`1.5px solid ${m.accentBorder}`}}>
                {m.emoji} {m.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-400">Free · No account needed · Earn XP as you build</p>
        </section>

        {/* ── Tool ── */}
        <section id="tool" className="mx-auto max-w-2xl px-6 pb-24">

          {/* Mode selection cards */}
          {!mode && (
            <div className="slide-down">
              <p className="text-center text-sm font-semibold text-gray-400 mb-4 uppercase tracking-widest">What do you want to do today?</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {MODES.map(m=>(
                  <button key={m.id} onClick={()=>{clearResults();setMode(m.id);}}
                    className="mode-card rounded-2xl p-6 text-left"
                    style={{background:"white",border:`2px solid ${m.accentBorder}`,boxShadow:`0 4px 20px ${m.accent}10`}}>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-3xl">{m.emoji}</span>
                      <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{background:m.accentLight,color:m.accent}}>+{m.xp} XP</span>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:m.accent}}>{m.sub}</p>
                    <h3 className="text-base font-extrabold text-gray-900 mb-2" style={{letterSpacing:"-0.02em"}}>{m.label}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{m.desc}</p>
                    <span className="text-sm font-bold" style={{color:m.accent}}>{m.cta}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active mode */}
          {mode && modeConfig && (
            <div className="slide-down">
              {/* Back + mode badge */}
              <div className="flex items-center gap-3 mb-5">
                <button onClick={()=>{setMode(null);clearResults();}}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:bg-gray-100"
                  style={{color:"#6B7280",border:"1.5px solid #E5E7EB"}}>
                  ← Back
                </button>
                <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{background:modeConfig.accentLight,color:modeConfig.accent,border:`1.5px solid ${modeConfig.accentBorder}`}}>
                  {modeConfig.emoji} {modeConfig.label}
                  <span className="opacity-60">· +{modeConfig.xp} XP</span>
                </div>
              </div>

              {/* Card */}
              <div className="rounded-2xl bg-white overflow-hidden" style={{border:`2px solid ${modeConfig.accentBorder}`,boxShadow:`0 8px 32px ${modeConfig.accent}12`}}>

                {/* ── EASY ── */}
                {mode==="easy" && (
                  <div className="p-7 space-y-5">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Tell us about yourself</h2>
                      <p className="mt-1 text-sm text-gray-400">We'll find 3 business paths that genuinely fit your life.</p>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Your situation</label>
                      <textarea rows={4} className={inputCls+" resize-none"}
                        placeholder="e.g. I'm 20, working part time, obsessed with fitness. I've got £300 saved and want to make money online. Good at social media and talking to people..."
                        value={easyForm.situation} onChange={e=>setEasyForm(f=>({...f,situation:e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Time per week</label>
                        <select className={inputCls} value={easyForm.time} onChange={e=>setEasyForm(f=>({...f,time:e.target.value}))}>
                          {["Under 5 hrs/week","5–10 hrs/week","10–20 hrs/week","Full time"].map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Budget</label>
                        <select className={inputCls} value={easyForm.budget} onChange={e=>setEasyForm(f=>({...f,budget:e.target.value}))}>
                          {["Under £500","£500–2k","£2k–10k","£10k+"].map(b=><option key={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Skills? <span className="font-normal text-gray-400">(optional)</span></label>
                      <input type="text" className={inputCls} placeholder="e.g. video editing, social media, coding..."
                        value={easyForm.skills} onChange={e=>setEasyForm(f=>({...f,skills:e.target.value}))}/>
                    </div>
                    <button onClick={submitEasy} disabled={loading||!easyForm.situation.trim()} className="submit-btn"
                      style={{background:`linear-gradient(135deg, #059669, #10B981)`,boxShadow:"0 4px 16px rgba(5,150,105,0.3)"}}>
                      {loading?"Finding your paths...":"Find my business paths →"}
                    </button>
                  </div>
                )}

                {/* ── BUILD ── */}
                {mode==="build" && (
                  <div>
                    <div className="flex border-b border-gray-100">
                      {([["launch","🚀","Launch Planner"],["brand","✨","Brand Builder"]] as [BuildTab,string,string][]).map(([t,emoji,label])=>(
                        <button key={t} onClick={()=>{setBuildTab(t);setLaunchResult(null);setBrandResult(null);setError("");}}
                          className="flex-1 py-4 text-sm font-bold transition-all"
                          style={buildTab===t
                            ?{color:C.orange,borderBottom:`2.5px solid ${C.orange}`,background:"#FFF7ED"}
                            :{color:"#9CA3AF",borderBottom:"2.5px solid transparent"}}>
                          {emoji} {label}
                        </button>
                      ))}
                    </div>

                    {buildTab==="launch" && (
                      <div className="p-7 space-y-5">
                        <div>
                          <h2 className="text-2xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>90-day launch plan</h2>
                          <p className="mt-1 text-sm text-gray-400">Your idea. Your stage. Your exact week-by-week roadmap.</p>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Your business idea</label>
                          <textarea rows={3} className={inputCls+" resize-none"}
                            placeholder="e.g. Premium car fragrance brand targeting 18-30 year old car enthusiasts, selling DTC via TikTok and Instagram..."
                            value={launchForm.idea} onChange={e=>setLaunchForm(f=>({...f,idea:e.target.value}))}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Where are you now?</label>
                            <select className={inputCls} value={launchForm.stage} onChange={e=>setLaunchForm(f=>({...f,stage:e.target.value}))}>
                              {["Just an idea","Validated the idea","Building already","Ready to launch"].map(s=><option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Budget</label>
                            <select className={inputCls} value={launchForm.budget} onChange={e=>setLaunchForm(f=>({...f,budget:e.target.value}))}>
                              {["Under £500","£500–2k","£2k–10k","£10k+"].map(b=><option key={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Time per week</label>
                            <select className={inputCls} value={launchForm.time} onChange={e=>setLaunchForm(f=>({...f,time:e.target.value}))}>
                              {["Under 5 hrs/week","5–10 hrs/week","10–20 hrs/week","Full time"].map(t=><option key={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Extra context <span className="font-normal text-gray-400">(optional)</span></label>
                            <input type="text" className={inputCls} placeholder="e.g. 150k followers, can code..."
                              value={launchForm.extra} onChange={e=>setLaunchForm(f=>({...f,extra:e.target.value}))}/>
                          </div>
                        </div>
                        <button onClick={submitLaunch} disabled={loading||!launchForm.idea.trim()} className="submit-btn"
                          style={{background:`linear-gradient(135deg, #EA580C, #F97316)`,boxShadow:"0 4px 16px rgba(234,88,12,0.3)"}}>
                          {loading?"Building your plan...":"Build my launch plan →"}
                        </button>
                      </div>
                    )}

                    {buildTab==="brand" && (
                      <div className="p-7 space-y-5">
                        <div>
                          <h2 className="text-2xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Build your brand</h2>
                          <p className="mt-1 text-sm text-gray-400">Names, positioning, voice, colours, and content angles.</p>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Your business idea</label>
                          <textarea rows={3} className={inputCls+" resize-none"}
                            placeholder="e.g. Premium car fragrance brand for young car enthusiasts, DTC via social media..."
                            value={brandForm.idea} onChange={e=>setBrandForm(f=>({...f,idea:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Target audience</label>
                          <input type="text" className={inputCls} placeholder="e.g. Car enthusiasts aged 18-30, mostly male, TikTok/Instagram"
                            value={brandForm.audience} onChange={e=>setBrandForm(f=>({...f,audience:e.target.value}))}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Brand vibe</label>
                            <select className={inputCls} value={brandForm.vibe} onChange={e=>setBrandForm(f=>({...f,vibe:e.target.value}))}>
                              {["Bold & Edgy","Premium & Luxury","Fun & Playful","Minimal & Clean","Raw & Authentic","Professional & Trustworthy"].map(v=><option key={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Name ideas so far <span className="font-normal text-gray-400">(optional)</span></label>
                            <input type="text" className={inputCls} placeholder="e.g. ScentDrive, RoadScent..."
                              value={brandForm.names} onChange={e=>setBrandForm(f=>({...f,names:e.target.value}))}/>
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Extra context <span className="font-normal text-gray-400">(optional)</span></label>
                          <input type="text" className={inputCls} placeholder="e.g. 150k car followers, want global brand, inspired by..."
                            value={brandForm.extra} onChange={e=>setBrandForm(f=>({...f,extra:e.target.value}))}/>
                        </div>
                        <button onClick={submitBrand} disabled={loading||!brandForm.idea.trim()} className="submit-btn"
                          style={{background:`linear-gradient(135deg, #EA580C, #F97316)`,boxShadow:"0 4px 16px rgba(234,88,12,0.3)"}}>
                          {loading?"Crafting your brand...":"Build my brand →"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── HARD ── */}
                {mode==="hard" && (
                  <div>
                    <div className="flex border-b border-gray-100">
                      {(["find","validate"] as HardTab[]).map(t=>(
                        <button key={t} onClick={()=>{setHardTab(t);setFindResults(null);setValResult(null);setError("");}}
                          className="flex-1 py-4 text-sm font-bold transition-all"
                          style={hardTab===t
                            ?{color:C.purple,borderBottom:`2.5px solid ${C.purple}`,background:C.purpleLight+"60"}
                            :{color:"#9CA3AF",borderBottom:"2.5px solid transparent"}}>
                          {t==="find"?"🔍 Find a Product":"⚡ Validate an Idea"}
                        </button>
                      ))}
                    </div>

                    {hardTab==="find" && (
                      <div className="p-7 space-y-5">
                        <div>
                          <h2 className="text-2xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Find a winning product</h2>
                          <p className="mt-1 text-sm text-gray-400">Describe your situation. Get 5 ranked opportunities.</p>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Your audience or niche</label>
                          <textarea rows={3} className={inputCls+" resize-none"}
                            placeholder="e.g. I have 150k car enthusiast followers on Instagram, 15M views/month. Want repeat purchase, good margins..."
                            value={findForm.audience} onChange={e=>setFindForm(f=>({...f,audience:e.target.value}))}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Budget</label>
                            <select className={inputCls} value={findForm.budget} onChange={e=>setFindForm(f=>({...f,budget:e.target.value}))}>
                              {["Under £500","£500–2k","£2k–10k","£10k+"].map(b=><option key={b}>{b}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Product type</label>
                            <select className={inputCls} value={findForm.type} onChange={e=>setFindForm(f=>({...f,type:e.target.value}))}>
                              {["Either","Physical","Digital","SaaS"].map(t=><option key={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Extra context <span className="font-normal text-gray-400">(optional)</span></label>
                          <input type="text" className={inputCls} placeholder="e.g. can build apps, want recurring revenue..."
                            value={findForm.extra} onChange={e=>setFindForm(f=>({...f,extra:e.target.value}))}/>
                        </div>
                        <button onClick={submitFind} disabled={loading||!findForm.audience.trim()} className="submit-btn"
                          style={{background:`linear-gradient(135deg, #6D28D9, #7C3AED)`,boxShadow:`0 4px 16px ${C.purple}40`}}>
                          {loading?"Researching...":"Find winning products →"}
                        </button>
                      </div>
                    )}

                    {hardTab==="validate" && (
                      <div className="p-7 space-y-5">
                        <div>
                          <h2 className="text-2xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Validate your idea</h2>
                          <p className="mt-1 text-sm text-gray-400">Brutal honesty. No cheerleading. Just the truth.</p>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Your idea</label>
                          <textarea rows={3} className={inputCls+" resize-none"}
                            placeholder="e.g. A premium car fragrance brand targeting car enthusiasts aged 18-30, selling DTC via TikTok..."
                            value={valForm.idea} onChange={e=>setValForm(f=>({...f,idea:e.target.value}))}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Target customer</label>
                            <input type="text" className={inputCls} placeholder="e.g. Car enthusiasts 18-30"
                              value={valForm.customer} onChange={e=>setValForm(f=>({...f,customer:e.target.value}))}/>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Problem it solves</label>
                            <input type="text" className={inputCls} placeholder="e.g. No premium car fragrance brand"
                              value={valForm.problem} onChange={e=>setValForm(f=>({...f,problem:e.target.value}))}/>
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-700">Extra context <span className="font-normal text-gray-400">(optional)</span></label>
                          <input type="text" className={inputCls} placeholder="e.g. 150k followers, limited capital..."
                            value={valForm.extra} onChange={e=>setValForm(f=>({...f,extra:e.target.value}))}/>
                        </div>
                        <button onClick={submitValidate} disabled={loading||!valForm.idea.trim()} className="submit-btn"
                          style={{background:`linear-gradient(135deg, #6D28D9, #7C3AED)`,boxShadow:`0 4px 16px ${C.purple}40`}}>
                          {loading?"Tearing it apart...":"Stress test this idea →"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-8 flex flex-col items-center gap-3 py-8">
              <div className="spinner"/>
              <p className="text-sm font-medium text-gray-400">
                {mode==="build"&&buildTab==="launch"?"Mapping your 90 days...":
                 mode==="build"&&buildTab==="brand" ?"Crafting your brand identity...":
                 mode==="hard"&&hardTab==="validate"?"Tearing it apart...":
                 mode==="hard"&&hardTab==="find"    ?"Hunting for opportunities...":
                 "Finding your best paths..."}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>
          )}

          {/* ── Results ── */}
          <div ref={resultsRef}>

          {/* EASY RESULTS */}
          {easyResults && (
            <div className="mt-8 space-y-5 fade-up">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Your 3 best paths</h3>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:C.emeraldLight,color:C.emerald}}>+50 XP earned</span>
              </div>
              {easyResults.map((p,i)=>(
                <div key={i} className="result-card">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{p.emoji}</span>
                        <div>
                          <h4 className="font-extrabold text-gray-900" style={{letterSpacing:"-0.01em"}}>{p.title}</h4>
                          <p className="text-sm font-semibold mt-0.5" style={{color:C.emerald}}>{p.tagline}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${p.difficulty==="Beginner"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>{p.difficulty}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">{p.whyYou}</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[["First income",p.timeToFirstIncome],["Startup cost",p.startupCost]].map(([l,v])=>(
                        <div key={l} className="rounded-xl p-3" style={{background:"#F9FAFB",border:"1px solid #F3F4F6"}}>
                          <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                          <p className="text-sm font-bold text-gray-900">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl p-4 mb-4" style={{background:C.emeraldLight,border:"1px solid #A7F3D0"}}>
                      <p className="text-xs font-bold mb-1" style={{color:C.emerald}}>⚡ Start here today</p>
                      <p className="text-sm font-semibold text-gray-900">{p.firstStep}</p>
                    </div>
                    <ol className="space-y-2">
                      {p.steps.map((s,j)=>(
                        <li key={j} className="flex gap-3 text-sm text-gray-600">
                          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:C.emerald,minWidth:"20px"}}>{j+1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LAUNCH RESULTS */}
          {launchResult && (
            <div className="mt-8 space-y-4 fade-up">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Your 90-Day Roadmap</h3>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:"#FFF7ED",color:C.orange}}>+100 XP earned</span>
              </div>
              <div className="rounded-2xl p-6" style={{background:`linear-gradient(135deg, #EA580C, #F97316)`,boxShadow:"0 4px 20px rgba(234,88,12,0.25)"}}>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-200 mb-2">Mission</p>
                <h3 className="text-lg font-extrabold text-white leading-snug">{launchResult.headline}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="result-card p-5">
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{color:C.orange}}>🎯 Top Priority</p>
                  <p className="text-sm font-semibold text-gray-800">{launchResult.topPriority}</p>
                </div>
                <div className="result-card p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">⚠️ Biggest Trap</p>
                  <p className="text-sm font-semibold text-gray-800">{launchResult.biggestTrap}</p>
                </div>
              </div>
              {launchResult.phases.map((phase,pi)=>(
                <div key={pi} className="result-card overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between" style={{background:`${PhaseC[pi]}08`,borderBottom:"1.5px solid #F3F4F6"}}>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-widest" style={{color:PhaseC[pi]}}>{phase.duration}</span>
                      <h4 className="text-base font-extrabold text-gray-900 mt-0.5" style={{letterSpacing:"-0.01em"}}>{phase.name}</h4>
                    </div>
                    <p className="text-xs text-gray-400 text-right max-w-[180px]">{phase.goal}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {phase.tasks.map((task,ti)=>(
                      <div key={ti} className="px-6 py-4 flex gap-4">
                        <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-white h-fit" style={{background:PhaseC[pi]}}>{task.week}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{task.action}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{task.why}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="result-card p-5">
                <h4 className="text-sm font-extrabold text-gray-900 mb-3">Milestones</h4>
                <div className="space-y-3">
                  {launchResult.milestones.map((m,i)=>(
                    <div key={i} className="flex items-start gap-3">
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{background:PhaseC[i]??C.purple}}>{m.when}</span>
                      <p className="text-sm text-gray-700 pt-0.5">{m.target}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-5" style={{background:"#FFF7ED",border:"1.5px solid #FED7AA"}}>
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{color:C.orange}}>Revenue Target — Week 12</p>
                <p className="text-sm font-bold text-gray-900">{launchResult.revenueTarget}</p>
              </div>
            </div>
          )}

          {/* BRAND RESULTS */}
          {brandResult && (
            <div className="mt-8 space-y-4 fade-up">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Your Brand</h3>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:"#FFF7ED",color:C.orange}}>+75 XP earned</span>
              </div>
              <div className="rounded-2xl p-6 text-center" style={{background:`linear-gradient(135deg, #EA580C, #F97316)`,boxShadow:"0 4px 20px rgba(234,88,12,0.25)"}}>
                <p className="text-2xl font-extrabold text-white mb-2">{brandResult.tagline}</p>
                <p className="text-sm text-orange-100">{brandResult.positioning}</p>
              </div>
              <div className="result-card p-5">
                <h4 className="text-sm font-extrabold text-gray-900 mb-3">5 Name Ideas</h4>
                <div className="space-y-2.5">
                  {brandResult.names.map((n,i)=>(
                    <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{background:i===0?C.orangeLight:"#F9FAFB",border:`1.5px solid ${i===0?"#FED7AA":"#F3F4F6"}`}}>
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:i===0?C.orange:"#9CA3AF",minWidth:"24px"}}>{i+1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-gray-900">{n.name}</span>
                          <span className="text-xs text-gray-400">{n.handle}</span>
                          <span className="text-xs text-gray-400">· {n.domain}</span>
                          {i===0 && <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{background:C.orange}}>Top pick</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{n.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="result-card p-5">
                <h4 className="text-sm font-extrabold text-gray-900 mb-3">Target Customer</h4>
                <p className="text-sm text-gray-600 mb-3">{brandResult.targetCustomer.who}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[["Interests",brandResult.targetCustomer.interests,C.purple,C.purpleLight],
                    ["Pain points",brandResult.targetCustomer.painPoints,C.red,"#FEF2F2"],
                    ["Where they are",brandResult.targetCustomer.whereTheyHang,C.emerald,C.emeraldLight]
                  ].map(([label,items,color,bg])=>(
                    <div key={label as string}>
                      <p className="text-xs text-gray-400 mb-1.5">{label as string}</p>
                      <div className="flex flex-col gap-1">
                        {(items as string[]).map((t,i)=>(
                          <span key={i} className="rounded-lg px-2 py-1 text-xs font-semibold text-center" style={{background:bg as string,color:color as string}}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="result-card p-5">
                <h4 className="text-sm font-extrabold text-gray-900 mb-1">Brand Voice</h4>
                <p className="text-sm font-bold mb-3" style={{color:C.orange}}>{brandResult.brandVoice.tone}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-2">✓ Do say</p>
                    {brandResult.brandVoice.doSay.map((s,i)=><p key={i} className="text-xs text-gray-600 italic mb-1">"{s}"</p>)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-500 mb-2">✗ Don't say</p>
                    {brandResult.brandVoice.dontSay.map((s,i)=><p key={i} className="text-xs text-gray-600 italic mb-1">"{s}"</p>)}
                  </div>
                </div>
              </div>
              <div className="result-card p-5">
                <h4 className="text-sm font-extrabold text-gray-900 mb-2">Visual Direction</h4>
                <p className="text-sm text-gray-500 mb-3">{brandResult.visualDirection.feel}</p>
                <div className="flex flex-wrap gap-3 mb-3">
                  {brandResult.visualDirection.colours.map((c,i)=>{
                    const hex=c.match(/#[0-9A-Fa-f]{3,6}/)?.[0];
                    return <div key={i} className="flex items-center gap-1.5">
                      {hex&&<div className="h-6 w-6 rounded-lg border border-gray-200 shadow-sm" style={{background:hex}}/>}
                      <span className="text-xs text-gray-500">{c}</span>
                    </div>;
                  })}
                </div>
                <p className="text-xs text-gray-400"><span className="font-bold text-gray-600">Fonts: </span>{brandResult.visualDirection.fontStyle}</p>
              </div>
              <div className="result-card p-5">
                <h4 className="text-sm font-extrabold text-gray-900 mb-3">Content Angles</h4>
                <div className="space-y-2">
                  {brandResult.contentAngles.map((a,i)=>(
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:C.orange,minWidth:"20px"}}>{i+1}</span>
                      <span className="text-gray-700">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FIND RESULTS */}
          {findResults && (
            <div className="mt-8 space-y-5 fade-up">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>5 Opportunities For You</h3>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:C.purpleLight,color:C.purple}}>+75 XP earned</span>
              </div>
              {findResults.map((p,i)=>(
                <div key={i} className="result-card p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{p.emoji}</span>
                      <div>
                        <h4 className="font-extrabold text-gray-900" style={{letterSpacing:"-0.01em"}}>{p.name}</h4>
                        <p className="text-sm text-gray-400 mt-0.5">{p.tagline}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{background:C.purple}}>#{i+1}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{p.whyItFits}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${oppBadge(p.opportunity)}`}>{p.opportunity} opp</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${compBadge(p.competition)}`}>{p.competition} comp</span>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:C.purpleLight,color:C.purple}}>{p.margin} margin</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.trend==="Growing"?"bg-emerald-100 text-emerald-700":p.trend==="Declining"?"bg-red-100 text-red-600":"bg-amber-100 text-amber-700"}`}>
                      {p.trend==="Growing"?"↑":p.trend==="Declining"?"↓":"→"} {p.trend}
                    </span>
                  </div>
                  <p className="text-xs italic text-gray-400 mb-4">{p.trendNote}</p>
                  <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                    {[["Cost",p.startupCost,false],["First sale",p.timeToFirstSale,false],["First move",p.firstMove,true]].map(([l,v,isPurple])=>(
                      <div key={l as string}>
                        <p className="text-xs text-gray-400 mb-0.5">{l as string}</p>
                        <p className="text-sm font-bold" style={isPurple?{color:C.purple}:{color:"#111827"}}>{v as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VALIDATE RESULTS */}
          {valResult && (()=>{
            const vc = verdictStyle[valResult.verdict]??verdictStyle.Promising;
            return (
              <div className="mt-8 space-y-4 fade-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold text-gray-900" style={{letterSpacing:"-0.02em"}}>Validation Report</h3>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{background:C.purpleLight,color:C.purple}}>+100 XP earned</span>
                </div>
                {/* Dark header */}
                <div className="rounded-2xl overflow-hidden" style={{background:"#0F172A"}}>
                  <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4" style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                    <div>
                      <span className="inline-block rounded-full px-2.5 py-1 text-xs font-bold mb-2" style={{background:vc.bg,color:vc.color}}>{vc.label}</span>
                      <p className="text-sm leading-relaxed" style={{color:"rgba(255,255,255,0.6)"}}>{valResult.verdictLine}</p>
                    </div>
                    <div className="shrink-0 text-center score-pop">
                      <div className="text-4xl font-extrabold text-white">{valResult.score}</div>
                      <div className="text-xs" style={{color:"rgba(255,255,255,0.3)"}}>SCORE</div>
                    </div>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-around">
                    <ScoreRing value={valResult.problemScore??0}  label="PROB" color="#F59E0B"/>
                    <ScoreRing value={valResult.solutionScore??0} label="SOL"  color="#10B981"/>
                    <ScoreRing value={valResult.marketScore??0}   label="MKT"  color={C.purpleMid}/>
                    <ScoreRing value={valResult.score}            label="TOTAL" color="white"/>
                  </div>
                </div>
                {/* Summary + lights/flags */}
                <div className="grid gap-4" style={{gridTemplateColumns:"1fr 1fr"}}>
                  <div className="result-card p-5">
                    <h4 className="text-sm font-extrabold text-gray-900 mb-2">📋 Executive Summary</h4>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">{valResult.executiveSummary}</p>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Key Recommendations</p>
                    <ol className="space-y-2">
                      {(valResult.keyRecommendations??[]).map((r,i)=>(
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <span className="shrink-0 font-extrabold" style={{color:C.purple}}>{i+1}.</span>{r}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="space-y-3">
                    <div className="result-card p-4" style={{borderColor:"#A7F3D0"}}>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-3">✓ Green Lights</h4>
                      <ul className="space-y-2">
                        {(valResult.greenLights??[]).map((g,i)=>(
                          <li key={i} className="flex gap-2 text-xs text-gray-600">
                            <span className="shrink-0 text-emerald-500 font-bold">✓</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="result-card p-4" style={{borderColor:"#FECACA"}}>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-red-500 mb-3">✗ Red Flags</h4>
                      <ul className="space-y-2">
                        {(valResult.redFlags??[]).map((r,i)=>(
                          <li key={i} className="flex gap-2 text-xs text-gray-600">
                            <span className="shrink-0 text-red-400 font-bold">✗</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                {/* Scorecard */}
                <div className="result-card p-6">
                  <h4 className="text-sm font-extrabold text-gray-900 mb-5">Validation Scorecard</h4>
                  <div className="space-y-5">
                    <ScoreBar label="Problem Validation"  value={valResult.problemScore??0}  color="#F59E0B"/>
                    <ScoreBar label="Solution Validation" value={valResult.solutionScore??0} color="#10B981"/>
                    <ScoreBar label="Market Validation"   value={valResult.marketScore??0}   color={C.purpleMid}/>
                  </div>
                </div>
                {/* Market + risk */}
                <div className="grid grid-cols-2 gap-4">
                  {[["Market Size",valResult.marketSize,"#111827"],["Biggest Risk",valResult.biggestRisk,C.amber]].map(([l,v,c])=>(
                    <div key={l} className="result-card p-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">{l}</p>
                      <p className="text-sm font-bold" style={{color:c as string}}>{v as string}</p>
                    </div>
                  ))}
                </div>
                {/* Competitors */}
                <div className="result-card p-5">
                  <h4 className="text-sm font-extrabold text-gray-900 mb-3">Competitors</h4>
                  <div className="space-y-3">
                    {valResult.competitors.map((c,i)=>(
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="shrink-0 rounded px-2 py-0.5 text-xs font-bold text-white" style={{background:C.purple}}>#{i+1}</span>
                        <span><span className="font-bold text-gray-900">{c.name}</span><span className="text-gray-400"> — {c.note}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Recommendation + steps */}
                <div className="result-card p-5">
                  <h4 className="text-sm font-extrabold mb-2" style={{color:C.purple}}>Strategic Recommendation</h4>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">{valResult.recommendation}</p>
                  <h4 className="text-sm font-extrabold text-gray-900 mb-3">First 3 Moves</h4>
                  <ol className="space-y-3">
                    {valResult.firstSteps.map((s,i)=>(
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:C.purple,minWidth:"24px"}}>{i+1}</span>
                        <span className="text-gray-700 pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })()}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20" style={{background:"white",borderTop:"1.5px solid #F3F4F6"}}>
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3" style={{letterSpacing:"-0.03em"}}>From idea to launch — in one place</h2>
              <p className="text-gray-400 max-w-md mx-auto">Every tool you need to go from zero to a real business. Earn XP as you go.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {[
                {emoji:"🌱",title:"Find Your Path",    desc:"New to business? Tell us about yourself, get 3 paths that fit your life.",   color:C.emerald, bg:C.emeraldLight},
                {emoji:"🏗️",title:"Launch Planner",   desc:"Week-by-week 90-day plan. Your idea, your stage, your exact roadmap.",        color:C.orange,  bg:C.orangeLight},
                {emoji:"✨",title:"Brand Builder",     desc:"Names, positioning, voice, colours. A complete brand identity in seconds.",   color:C.orange,  bg:C.orangeLight},
                {emoji:"🔍",title:"Find Products",     desc:"5 ranked opportunities with margins, competition levels, and first moves.",   color:C.purple,  bg:C.purpleLight},
                {emoji:"⚡",title:"Validate Ideas",    desc:"Score out of 100. Green lights, red flags, scorecard. No cheerleading.",     color:C.purple,  bg:C.purpleLight},
                {emoji:"🏆",title:"Earn As You Build", desc:"XP, streaks, levels. The more you use it, the more you learn.",             color:C.amber,   bg:"#FFFBEB"},
              ].map(f=>(
                <div key={f.title} className="rounded-2xl p-6 transition-all hover:shadow-md hover:-translate-y-1" style={{background:"white",border:"1.5px solid #F3F4F6"}}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{background:f.bg}}>{f.emoji}</div>
                  <h3 className="font-extrabold text-gray-900 mb-1.5" style={{letterSpacing:"-0.01em"}}>{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20" style={{background:`linear-gradient(135deg, #3B0764, ${C.purple} 50%, #4C1D95)`}}>
          <div className="mx-auto max-w-2xl px-6 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{background:"rgba(255,255,255,0.1)"}}>
              <span>🏆</span>
              <span className="text-sm font-bold text-white">12,400+ founders are already building</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4" style={{letterSpacing:"-0.03em"}}>Your idea deserves a real shot.</h2>
            <p className="mb-8 text-purple-200">Stop overthinking. Get the plan, build the brand, launch the business.</p>
            <a href="#tool" onClick={()=>{setMode(null);clearResults();}}
              className="inline-block rounded-xl px-8 py-4 text-base font-extrabold transition hover:scale-105"
              style={{background:"white",color:C.purple,boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
              Start Building — It's Free →
            </a>
            <p className="mt-3 text-sm text-purple-300">Earn XP · Track your streak · Level up as you build</p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-8" style={{background:"#1E1B4B",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{background:C.purple}}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-extrabold text-white">Founder</span>
            </div>
            <p className="text-xs" style={{color:"rgba(255,255,255,0.3)"}}>© 2025 Founder. Built for builders.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
