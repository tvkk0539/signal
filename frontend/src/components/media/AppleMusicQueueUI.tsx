import React, { useState } from 'react';
import { useAppleMusicQueueStore } from '../../store/appleMusicQueueStore';
import { Trash2, Terminal, StopCircle, CheckCircle2, XCircle, Clock, PlayCircle } from 'lucide-react';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import type { AppleMusicCancelRequestMessage } from '@swarm/shared';

export const AppleMusicQueueUI: React.FC = () => {
  const { jobs, removeJobs } = useAppleMusicQueueStore();
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [viewedJobId, setViewedJobId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'TELEMETRY' | 'CONFIG'>('TELEMETRY');

  const toggleSelect = (jobId: string) => {
    const newSet = new Set(selectedJobIds);
    if (newSet.has(jobId)) newSet.delete(jobId);
    else newSet.add(jobId);
    setSelectedJobIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedJobIds.size === jobs.length) {
      setSelectedJobIds(newSet => { newSet.clear(); return new Set(newSet); });
    } else {
      setSelectedJobIds(new Set(jobs.map(j => j.jobId)));
    }
  };

  const handleDeleteSelected = () => {
    // Only cancel jobs that are actively running before removing them
    const jobsToCancel = jobs.filter(j => selectedJobIds.has(j.jobId) && j.status === 'RUNNING');

    jobsToCancel.forEach(j => {
      const payload: AppleMusicCancelRequestMessage = {
        type: MessageType.APPLE_MUSIC_CANCEL_REQUEST,
        timestamp: Date.now(),
        workerId: 'target-worker-id', // Assuming target worker routing here
        jobId: j.jobId
      };
      SocketManager.getInstance().emit(MessageType.APPLE_MUSIC_CANCEL_REQUEST, payload);
    });

    removeJobs(Array.from(selectedJobIds));
    setSelectedJobIds(new Set());
    if (viewedJobId && selectedJobIds.has(viewedJobId)) {
        setViewedJobId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
        case 'RUNNING': return <PlayCircle className="text-blue-500 animate-pulse" size={16} />;
        case 'COMPLETED': return <CheckCircle2 className="text-green-500" size={16} />;
        case 'FAILED': return <XCircle className="text-red-500" size={16} />;
        case 'CANCELLED': return <StopCircle className="text-yellow-500" size={16} />;
        default: return <Clock className="text-gray-400" size={16} />;
    }
  };

  const viewedJob = jobs.find(j => j.jobId === viewedJobId);

  return (
    <div className="flex h-full w-full pointer-events-auto">
      {/* Left: Queue List */}
      <div className="w-1/2 flex flex-col border-r border-white/10 bg-[#0a0a0a]/40 backdrop-blur-sm">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-semibold flex items-center gap-2">
                <Terminal size={18}/> Job Ledger
            </h2>
            <button
                onClick={handleDeleteSelected}
                disabled={selectedJobIds.size === 0}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded flex items-center gap-2 text-xs font-semibold disabled:opacity-30 transition-colors"
            >
                <Trash2 size={14} /> Delete Selected ({selectedJobIds.size})
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {jobs.length === 0 ? (
                <div className="text-center text-muted-foreground mt-10 text-sm">No jobs in queue.</div>
            ) : (
                <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    <input
                        type="checkbox"
                        checked={selectedJobIds.size === jobs.length && jobs.length > 0}
                        onChange={toggleSelectAll}
                        className="accent-[#FA243C]"
                    />
                    <div className="flex-1">Target URL</div>
                    <div className="w-24">Status</div>
                </div>
            )}

            {jobs.map(job => (
                <div
                    key={job.jobId}
                    onClick={() => setViewedJobId(job.jobId)}
                    className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        viewedJobId === job.jobId ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5 hover:bg-white/5'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selectedJobIds.has(job.jobId)}
                            onChange={(e) => { e.stopPropagation(); toggleSelect(job.jobId); }}
                            className="accent-[#FA243C]"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium truncate">{job.url}</div>
                            <div className="text-muted-foreground text-xs flex items-center gap-2 mt-1">
                                <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] uppercase">{job.configSnapshot.ripMode}</span>
                                <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] uppercase">{job.configSnapshot.format}</span>
                            </div>
                        </div>
                        <div className="w-24 flex flex-col items-end gap-1 text-xs">
                            <div className="flex items-center gap-2">
                                {getStatusIcon(job.status)}
                                <span className={
                                    job.status === 'RUNNING' ? 'text-blue-400 font-bold' :
                                    job.status === 'COMPLETED' ? 'text-green-400 font-bold' :
                                    job.status === 'FAILED' ? 'text-red-400 font-bold' :
                                    'text-yellow-400 font-bold'
                                }>{job.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Highly Engineered Sleek Progress Bar UI */}
                    {job.status === 'RUNNING' && job.progressPhase && (
                        <div className="mt-2 ml-7 pl-1">
                            <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1">
                                <span className="text-[#FA243C] font-semibold animate-pulse">{job.progressPhase}...</span>
                                <span className="text-white/80 font-mono">{job.progressSpeed}</span>
                            </div>
                            <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/5 relative">
                                <div
                                    className="bg-gradient-to-r from-[#FA243C] to-[#fa5e6e] h-1.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(250,36,60,0.5)]"
                                    style={{ width: `${job.progressPercent || 0}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
                                <span>{job.progressDataMetrics}</span>
                                <span>{job.progressPercent || 0}%</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Right: Telemetry & Config Ledger */}
      <div className="w-1/2 bg-[#050505] flex flex-col font-mono relative">
        <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <Terminal size={14} />
                <span>Worker Node [tty0] {viewedJobId ? `(Job: ${viewedJobId.split('-')[0]})` : ''}</span>
            </div>

            {viewedJobId && (
                <div className="flex gap-2">
                    <button
                        onClick={() => setInspectorTab('TELEMETRY')}
                        className={`px-3 py-1 rounded transition-colors ${inspectorTab === 'TELEMETRY' ? 'bg-[#FA243C] text-white' : 'hover:text-white'}`}
                    >
                        stdout
                    </button>
                    <button
                        onClick={() => setInspectorTab('CONFIG')}
                        className={`px-3 py-1 rounded transition-colors ${inspectorTab === 'CONFIG' ? 'bg-[#FA243C] text-white' : 'hover:text-white'}`}
                    >
                        frozen config
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto text-[11px] leading-relaxed text-green-500/80 space-y-1">
            {!viewedJob ? (
                <div className="text-white/30 italic">Select a job from the ledger to view historical telemetry and configuration...</div>
            ) : inspectorTab === 'TELEMETRY' ? (
                <>
                    {viewedJob.logs.map((log, idx) => (
                        <div key={idx} className={
                            log.includes('ERROR') ? 'text-red-400' :
                            log.includes('SUCCESS') ? 'text-blue-400' :
                            log.includes('WARN') ? 'text-yellow-500' :
                            log.startsWith('#') ? 'text-white/40' : ''
                        }>
                            {log}
                        </div>
                    ))}
                    {viewedJob.status === 'RUNNING' && <div className="animate-pulse opacity-50">_</div>}
                </>
            ) : (
                <div className="text-white/80 space-y-2">
                    <div className="text-yellow-500/80 italic mb-4">
                        // IMMUTABLE DISPATCH SNAPSHOT
                        <br/>
                        // These arguments were securely injected into the VFS Vault at dispatch.
                    </div>
                    {Object.entries(viewedJob.configSnapshot).map(([key, value]) => (
                        <div key={key} className="flex">
                            <span className="w-48 text-blue-400">"{key}"</span>
                            <span className="text-muted-foreground">: </span>
                            <span className={typeof value === 'boolean' ? 'text-purple-400' : typeof value === 'number' ? 'text-orange-400' : 'text-green-400'}>
                                {typeof value === 'string' ? `"${value}"` : String(value)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
      </div>
    </div>
  );
};
