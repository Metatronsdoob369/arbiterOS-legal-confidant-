
import React, { useMemo, useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';

export const AuditLog: React.FC = () => {
  const { entries } = useAudit();
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [strictMode, setStrictMode] = useState(true);
  const [jurisdictionLock, setJurisdictionLock] = useState(false);

  // Process data for charts
  const { telemetryData, statusData, complianceMetrics } = useMemo(() => {
    // Reverse entries to show chronological order (oldest to newest)
    const chronoEntries = [...entries].reverse();
    
    // 1. Telemetry (Latency & Score) - Take last 20 relevant entries
    const telemetry = chronoEntries
      .filter(e => e.metadata?.latencyMs || e.metadata?.criticScore)
      .slice(-20)
      .map(e => ({
        time: e.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        latency: e.metadata?.latencyMs || 0,
        score: (e.metadata?.criticScore || 0) * 100,
        id: e.id,
        status: (e.metadata?.criticScore || 1) < confidenceThreshold ? 'risk' : 'safe'
      }));

    // 2. Status Distribution
    const statusCounts = entries.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusChart = [
      { name: 'Verified', value: statusCounts['Verified'] || 0, color: '#ffffff' },
      { name: 'Pending', value: statusCounts['Pending'] || 0, color: '#525252' },
      { name: 'Refining', value: statusCounts['Refining'] || 0, color: '#a3a3a3' },
      { name: 'Error', value: statusCounts['Error'] || 0, color: '#ef4444' }
    ].filter(d => d.value > 0);

    // 3. Compliance Metrics based on Threshold
    const belowThreshold = entries.filter(e => e.metadata?.criticScore && e.metadata.criticScore < confidenceThreshold).length;
    const totalAudited = entries.filter(e => e.metadata?.criticScore).length;

    return { 
        telemetryData: telemetry, 
        statusData: statusChart,
        complianceMetrics: { belowThreshold, totalAudited } 
    };
  }, [entries, confidenceThreshold]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black border border-white p-3 text-[10px] font-mono shadow-2xl max-w-[200px]">
          <p className="text-white font-bold mb-2 border-b border-neutral-800 pb-1">{label}</p>
          <div className="space-y-1">
             <div className="flex justify-between">
                <span className="text-neutral-500">Latency:</span>
                <span className="text-white">{data.latency}ms</span>
             </div>
             <div className="flex justify-between">
                <span className="text-neutral-500">Confidence:</span>
                <span className={data.score < (confidenceThreshold * 100) ? 'text-red-500 font-bold' : 'text-green-500'}>
                    {data.score.toFixed(1)}%
                </span>
             </div>
             {data.score < (confidenceThreshold * 100) && (
                 <div className="mt-2 text-red-500 uppercase tracking-widest text-[9px] border-t border-neutral-800 pt-1">
                    Below Threshold
                 </div>
             )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto flex flex-col font-mono bg-black">
      
      {/* Header & Controls */}
      <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-neutral-800 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Governance Ledger</h2>
            <p className="text-neutral-500 text-xs uppercase tracking-wider max-w-xl">
               Real-time telemetry of the Arbiter's cognitive performance. Use controls to set compliance standards.
            </p>
        </div>
        
        {/* Governance Controls */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 border border-neutral-800 bg-[#0a0a0a] rounded-lg">
            
            {/* Slider */}
            <div className="flex flex-col justify-center min-w-[150px]">
                <div className="flex justify-between mb-2 text-[9px] uppercase tracking-widest font-bold">
                    <span className="text-neutral-400">Compliance Threshold</span>
                    <span className="text-white">{(confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0.5" 
                    max="1.0" 
                    step="0.01" 
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>
            
            <div className="w-px bg-neutral-800 hidden sm:block"></div>

            {/* Toggles */}
            <div className="flex gap-4">
                 <button onClick={() => setStrictMode(!strictMode)} className="flex flex-col gap-1 items-start group">
                    <span className="text-[9px] uppercase text-neutral-500 group-hover:text-white transition-colors">Strict Mode</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${strictMode ? 'bg-white' : 'bg-neutral-800'}`}>
                        <div className={`w-3 h-3 rounded-full bg-black shadow transform transition-transform ${strictMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                 </button>
                 <button onClick={() => setJurisdictionLock(!jurisdictionLock)} className="flex flex-col gap-1 items-start group">
                    <span className="text-[9px] uppercase text-neutral-500 group-hover:text-white transition-colors">Jurisdiction Lock</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${jurisdictionLock ? 'bg-white' : 'bg-neutral-800'}`}>
                        <div className={`w-3 h-3 rounded-full bg-black shadow transform transition-transform ${jurisdictionLock ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                 </button>
            </div>
        </div>
      </div>

      {/* Live Telemetry Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-8 h-48">
        <div className="md:col-span-2 border border-neutral-800 bg-[#050505] p-4 flex flex-col relative rounded-lg overflow-hidden">
           <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Performance Telemetry
              </h3>
              <div className="flex gap-4">
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white"></div>
                    <span className="text-[9px] text-neutral-500">LATENCY (ms)</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-neutral-600"></div>
                    <span className="text-[9px] text-neutral-500">CONFIDENCE (%)</span>
                 </div>
              </div>
           </div>
           <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={telemetryData}>
                 <defs>
                   <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                 <XAxis 
                    dataKey="time" 
                    stroke="#525252" 
                    tick={{fontSize: 9, fill: '#525252'}} 
                    tickLine={false}
                    interval="preserveStartEnd"
                 />
                 <YAxis 
                    yAxisId="left" 
                    stroke="#525252" 
                    tick={{fontSize: 9, fill: '#525252'}} 
                    tickLine={false}
                 />
                 <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#525252" 
                    tick={{fontSize: 9, fill: '#525252'}} 
                    tickLine={false}
                    domain={[0, 100]}
                 />
                 {/* Visual Threshold Line */}
                 <Tooltip content={<CustomTooltip />} />
                 <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#ffffff" 
                    strokeWidth={1}
                    fillOpacity={1} 
                    fill="url(#colorLatency)" 
                    isAnimationActive={false}
                 />
                 <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="score" 
                    stroke="#525252" 
                    strokeWidth={1}
                    fill="none" 
                    isAnimationActive={false}
                 />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Stats Card */}
        <div className="border border-neutral-800 bg-[#050505] p-4 flex flex-col justify-between rounded-lg">
           <h3 className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Audit Summary</h3>
           
           <div className="space-y-4 my-auto">
                <div className="flex justify-between items-end">
                    <span className="text-xs text-neutral-500">Total Audits</span>
                    <span className="text-2xl font-bold text-white">{complianceMetrics.totalAudited}</span>
                </div>
                
                <div className="flex justify-between items-end">
                    <span className="text-xs text-neutral-500">Risk Flags</span>
                    <span className={`text-2xl font-bold ${complianceMetrics.belowThreshold > 0 ? 'text-red-500' : 'text-neutral-700'}`}>
                        {complianceMetrics.belowThreshold}
                    </span>
                </div>

                <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-white transition-all duration-500" 
                        style={{ width: `${(1 - (complianceMetrics.belowThreshold / (complianceMetrics.totalAudited || 1))) * 100}%` }}
                    ></div>
                </div>
                <div className="text-[9px] text-neutral-600 text-right uppercase tracking-widest">
                    {(100 - ((complianceMetrics.belowThreshold / (complianceMetrics.totalAudited || 1)) * 100)).toFixed(1)}% Health
                </div>
           </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 bg-[#050505] border border-neutral-800 flex flex-col rounded-lg overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0a0a0a] border-b border-neutral-800 text-neutral-400 text-[10px] uppercase tracking-widest">
                <th className="p-4 font-bold sticky top-0 bg-[#0a0a0a] z-10">Timestamp</th>
                <th className="p-4 font-bold sticky top-0 bg-[#0a0a0a] z-10">Source</th>
                <th className="p-4 font-bold sticky top-0 bg-[#0a0a0a] z-10">Operation</th>
                <th className="p-4 font-bold sticky top-0 bg-[#0a0a0a] z-10">Compliance Check</th>
                <th className="p-4 font-bold text-right sticky top-0 bg-[#0a0a0a] z-10">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {entries.map((entry) => {
                  const score = entry.metadata?.criticScore || 0;
                  const isRisky = score < confidenceThreshold && entry.metadata?.criticScore !== undefined;

                  return (
                    <tr key={entry.id} className={`transition-colors group ${isRisky ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-neutral-900/30'}`}>
                    <td className="p-4 text-neutral-500 text-xs whitespace-nowrap">
                        <div className="text-neutral-300 font-mono">{entry.timestamp.toLocaleTimeString([], {hour12: false})}</div>
                    </td>
                    <td className="p-4">
                        <span className="inline-block px-2 py-1 text-[9px] uppercase tracking-widest font-bold border border-neutral-800 text-neutral-400 bg-neutral-950 rounded">
                        {entry.source}
                        </span>
                    </td>
                    <td className="p-4 text-neutral-300 font-bold text-xs">
                        {entry.action}
                        <div className="text-[10px] font-normal text-neutral-500 font-mono mt-1 max-w-md truncate">{entry.details}</div>
                    </td>
                    <td className="p-4">
                        {entry.metadata?.criticScore !== undefined ? (
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-24 bg-neutral-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${isRisky ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${score * 100}%` }}
                                ></div>
                            </div>
                            <span className={`text-xs font-mono font-bold ${isRisky ? 'text-red-500' : 'text-green-500'}`}>
                                {(score * 100).toFixed(0)}%
                            </span>
                        </div>
                        ) : (
                            <span className="text-neutral-700 text-[10px] uppercase">N/A</span>
                        )}
                    </td>
                    <td className="p-4 text-right">
                        <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded-sm border ${
                             entry.status === 'Verified' && !isRisky ? 'border-green-900/30 text-green-400 bg-green-900/10' : 
                             isRisky ? 'border-red-900/30 text-red-400 bg-red-900/10' :
                             'border-neutral-800 text-neutral-500'
                        }`}>
                        {isRisky ? 'RISK DETECTED' : entry.status}
                        </span>
                    </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-[9px] uppercase tracking-widest text-neutral-600">
        <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            <span>ArbiterOS v2.4</span>
        </div>
        <span>Encrypted Ledger // Immutable</span>
      </div>
    </div>
  );
};
