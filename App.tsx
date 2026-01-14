
import React, { useState, useEffect, useMemo } from 'react';
import { predictToday, reviewToday } from './services/geminiService';
import { StorageService } from './services/storageService';
import { PredictionRecord } from './types';

const App: React.FC = () => {
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);
  const [activeTab, setActiveTab] = useState<'strategy' | 'learning' | 'history'>('strategy');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedMarket, setSelectedMarket] = useState('上证指数');

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  useEffect(() => {
    const saved = StorageService.loadHistory();
    setHistory(saved);
    addLog("Prophet R1 终端已上线。准备接收因子流...");
  }, []);

  useEffect(() => {
    StorageService.saveHistory(history);
  }, [history]);

  const todayDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const todayRecord = useMemo(() => history.find(h => h.date === todayDate && h.marketType === selectedMarket), [history, todayDate, selectedMarket]);

  // 自动化调度引擎
  useEffect(() => {
    if (!autoPilot) return;
    const interval = setInterval(() => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();

      // 早盘逻辑 (9:10 - 9:30)
      if (h === 9 && m >= 10 && m < 30 && !todayRecord && !loading) {
        handlePredict();
      }
      // 收盘逻辑 (15:35 - 16:00)
      if (h === 15 && m >= 35 && m < 59 && todayRecord && !todayRecord.isReviewed && !loading) {
        handleReview();
      }
    }, 20000); 
    return () => clearInterval(interval);
  }, [autoPilot, todayRecord, loading, selectedMarket]);

  const handlePredict = async () => {
    setLoading(true);
    addLog(`启动深度推理引擎，正在检索 ${selectedMarket} 全网信源...`);
    try {
      const result = await predictToday(selectedMarket, history);
      setHistory(prev => [result as PredictionRecord, ...prev.filter(h => h.date !== todayDate || h.marketType !== selectedMarket)]);
      addLog("研判报告已生成，因子逻辑对冲完成。");
    } catch (e) {
      addLog("错误: API 通信超时，请检查 KEY 有效性。");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!todayRecord) return;
    setLoading(true);
    addLog("执行收盘绩效审计...");
    try {
      const reviewed = await reviewToday(todayRecord);
      setHistory(prev => prev.map(h => h.id === todayRecord.id ? (reviewed as PredictionRecord) : h));
      addLog(`复盘结束: ${reviewed.isCorrect ? '预测击中' : '逻辑偏误'}。新规则已存入逻辑库。`);
    } catch (e) {
      addLog("错误: 复盘审计失败。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-400 font-sans selection:bg-red-500/30">
      {/* 动态行情模拟条 */}
      <div className="bg-red-600/10 border-b border-red-500/20 py-1.5 overflow-hidden">
        <div className="whitespace-nowrap animate-marquee flex space-x-12 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
          <span>Search Grounding: Active</span><span>•</span>
          <span>Reasoning Engine: Gemini 3 Pro (R1-Tier)</span><span>•</span>
          <span>Market: A-Share Mainboard</span><span>•</span>
          <span>Bias Correction: Enabled</span>
        </div>
      </div>

      <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
              <span className="text-white font-black italic">R1</span>
            </div>
            <div>
              <h1 className="text-white font-black text-lg tracking-tighter uppercase">Prophet <span className="text-red-600">Scientific</span></h1>
              <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Autonomous Intelligence Unit</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setAutoPilot(!autoPilot)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${autoPilot ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoPilot ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span>{autoPilot ? 'Auto-Pilot On' : 'Manual Mode'}</span>
            </button>
            <nav className="flex space-x-1 p-1 bg-black/40 rounded-xl border border-white/5">
              {(['strategy', 'learning', 'history'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab === 'strategy' ? '因子研报' : tab === 'learning' ? '规则进化' : '历史'}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 左侧控制与日志 */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-slate-900/50 rounded-[32px] p-8 border border-white/5 shadow-2xl">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center">
              <span className="w-1 h-3 bg-red-600 mr-2 rounded-full"></span>
              研判参数设定
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase mb-3 block">目标指数</label>
                <select value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-red-600 transition-all">
                  <option>上证指数</option><option>深证成指</option><option>创业板指</option>
                </select>
              </div>
              <button 
                onClick={handlePredict}
                disabled={loading || !!todayRecord}
                className="w-full py-5 bg-red-600 hover:bg-red-700 disabled:opacity-20 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-red-600/30 active:scale-[0.98]"
              >
                {loading ? 'AI 正在深度推理...' : todayRecord ? '研判已完成' : '启动 R1 级因子预测'}
              </button>
            </div>
          </section>

          <section className="bg-black/20 rounded-[32px] p-8 border border-white/5 h-[400px] flex flex-col">
            <h3 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-widest">系统实时日志</h3>
            <div className="flex-grow overflow-y-auto space-y-3 font-mono text-[10px] pr-2 scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className="flex space-x-3 leading-relaxed border-l border-white/5 pl-3">
                  <span className="text-red-900 font-black">#</span>
                  <span className={log.includes('错误') ? 'text-red-400' : 'text-slate-500'}>{log}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 右侧主内容展示 */}
        <div className="lg:col-span-8">
          {activeTab === 'strategy' && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              {!todayRecord ? (
                <div className="h-full min-h-[600px] bg-slate-900/30 rounded-[64px] border border-dashed border-white/10 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-32 h-32 bg-slate-900 rounded-[48px] flex items-center justify-center text-5xl mb-8 shadow-inner border border-white/5">🔭</div>
                  <h3 className="text-white font-black text-xl mb-3">等待模型初始化</h3>
                  <p className="text-slate-500 text-sm max-w-sm leading-relaxed">系统将在 09:10 自动触发。若需立即执行，请点击左侧启动按钮。</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <article className="bg-white rounded-[48px] p-10 shadow-2xl shadow-black/50 text-slate-900">
                    <div className="flex justify-between items-start mb-12">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="px-2 py-1 bg-red-600 text-white text-[9px] font-black rounded uppercase">Scientific Report</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{todayRecord.date}</span>
                        </div>
                        <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{todayRecord.marketType} 深度研判</h2>
                      </div>
                      <div className={`px-8 py-4 rounded-[24px] border-2 shadow-xl ${todayRecord.prediction === 'up' ? 'border-red-100 bg-red-50 text-red-600 shadow-red-500/10' : 'border-green-100 bg-green-50 text-green-600 shadow-green-500/10'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">预测方向</p>
                        <p className="text-3xl font-black italic leading-none">{todayRecord.prediction === 'up' ? '上涨 ↑' : '下跌 ↓'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                      {['macro', 'liquidity', 'sentiment'].map((f) => (
                        <div key={f} className="bg-slate-50 border border-slate-100 p-6 rounded-[32px]">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{f}</p>
                           <p className="text-3xl font-black text-slate-800">{(todayRecord.reasoning as any)[f].split(': ')[1]}</p>
                        </div>
                      ))}
                      <div className="bg-slate-950 p-6 rounded-[32px] text-white">
                         <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">综合置信度</p>
                         <p className="text-3xl font-black">{todayRecord.confidence}%</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-[40px] p-10 prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium mb-10 whitespace-pre-wrap max-h-[500px] overflow-y-auto scrollbar-hide">
                      {todayRecord.rawReport}
                    </div>

                    {todayRecord.sources.length > 0 && (
                      <div className="pt-8 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">联网检索信源 (Grounding Proof)</p>
                        <div className="flex flex-wrap gap-3">
                          {todayRecord.sources.map((s, i) => s.web && (
                            <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-white text-slate-500 px-4 py-2 rounded-2xl border border-slate-200 hover:border-red-500 hover:text-red-600 transition-all truncate max-w-[200px]">
                              {s.web.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>

                  {todayRecord.isReviewed && (
                    <div className="bg-amber-400 rounded-[48px] p-10 text-amber-950 shadow-2xl shadow-amber-400/20 animate-in zoom-in-95 duration-500">
                       <div className="flex items-center space-x-3 mb-6">
                         <div className="w-2 h-2 bg-amber-950 rounded-full"></div>
                         <h3 className="font-black italic uppercase text-xs tracking-widest">收盘绩效审计报告 (Performance Audit)</h3>
                       </div>
                       <p className="text-lg font-bold leading-relaxed mb-8">{todayRecord.failureAnalysis}</p>
                       <div className="bg-amber-950/10 border border-amber-950/10 p-8 rounded-[32px]">
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">规则进化引擎已更新</p>
                          <p className="text-lg font-black italic tracking-tight leading-tight">“{todayRecord.learningRule}”</p>
                       </div>
                    </div>
                  )}

                  {!todayRecord.isReviewed && (
                    <div className="bg-slate-900/50 rounded-[48px] p-12 border border-white/5 text-center">
                       <p className="text-xs font-bold text-slate-500 mb-8">收盘数据正在同步中。复盘审计将在 15:35 自动执行。</p>
                       <button onClick={handleReview} className="px-14 py-4 bg-white text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/10">执行手动审计</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'learning' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
               {history.filter(h => h.isReviewed).map(h => (
                 <div key={h.id} className="bg-slate-900 p-8 rounded-[40px] border border-white/5 hover:border-red-500/30 transition-all group">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black px-3 py-1 bg-slate-800 text-slate-500 rounded-lg uppercase tracking-widest">{h.attributionCategory}</span>
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${h.isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {h.isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                    <p className="text-lg font-black text-white mb-4 leading-tight group-hover:text-red-500 transition-colors">“{h.learningRule}”</p>
                    <div className="mt-8 flex justify-between items-end border-t border-white/5 pt-6">
                      <p className="text-[10px] font-black text-slate-600 uppercase">{h.date}</p>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{h.marketType}</p>
                    </div>
                 </div>
               ))}
               {history.filter(h => h.isReviewed).length === 0 && <div className="col-span-full py-40 text-center text-slate-700 italic text-sm">暂无审计数据。模型需要通过交易日进行实战学习。</div>}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-slate-900 rounded-[40px] border border-white/5 overflow-hidden animate-in fade-in duration-500">
               <table className="w-full text-left text-[11px]">
                 <thead className="bg-white/5 text-slate-500 uppercase font-black tracking-widest">
                   <tr>
                     <th className="px-8 py-5">交易日期</th>
                     <th className="px-8 py-5">预测方向</th>
                     <th className="px-8 py-5">实际结果</th>
                     <th className="px-8 py-5">绩效状态</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 text-slate-400">
                   {history.map(h => (
                     <tr key={h.id} className="hover:bg-white/5 transition-colors">
                       <td className="px-8 py-5 font-bold text-slate-300">{h.date}</td>
                       <td className={`px-8 py-5 font-black ${h.prediction === 'up' ? 'text-red-500' : 'text-green-500'}`}>{h.prediction.toUpperCase()}</td>
                       <td className="px-8 py-5 text-slate-500 font-bold">{h.actualOutcome?.toUpperCase() || '--'}</td>
                       <td className="px-8 py-5">
                         {h.isReviewed ? (
                           <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase ${h.isCorrect ? 'bg-amber-400 text-amber-950' : 'bg-slate-800 text-slate-600'}`}>
                             {h.isCorrect ? 'Captured' : 'Missed'}
                           </span>
                         ) : <span className="text-[9px] font-bold text-slate-700 italic">Unverified</span>}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-32 py-12 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
          <div className="flex items-center space-x-3">
             <span className="w-2 h-2 bg-red-600 rounded-full"></span>
             <p>Prophet R1 Scientific Lab | High Fidelity Engine</p>
          </div>
          <div className="flex space-x-8">
            <span className="text-red-900">Capital At Risk</span>
            <span>Reasoning Path: Gemini 3 Pro Enabled</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 40s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
