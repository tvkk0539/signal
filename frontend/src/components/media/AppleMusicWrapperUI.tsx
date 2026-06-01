import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, ShieldAlert, DownloadCloud, Play, Square, Loader2, Send, Trash2 } from 'lucide-react';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import type { WrapperStartRequestMessage, WrapperStopRequestMessage, Wrapper2FASubmitMessage, WrapperStateDeleteMessage } from '@swarm/shared';
import { useAppleMusicStore } from '../../store/appleMusicStore';

export const AppleMusicWrapperUI: React.FC = () => {
  const {
      wrapperIsInstalled: isInstalled,
      wrapperIsRunning: isRunning,
      wrapperPid: pid,
      wrapperLogs: logs,
      wrapperNeeds2FA: needs2FA,
      wrapperProfiles,
      selectedProfileId,
      setWrapperNeeds2FA,
      appendWrapperLog,
      setWrapperProfiles,
      setSelectedProfileId
  } = useAppleMusicStore();

  const [isInstalling, setIsInstalling] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');

  const socketManager = SocketManager.getInstance();

  useEffect(() => {
    const handleProfileList = (msg: any) => {
       if (msg.profiles) {
          setWrapperProfiles(msg.profiles);
       }
    };

    socketManager.on(MessageType.WRAPPER_PROFILES_LIST, handleProfileList);

    // Request initial list
    socketManager.emit(MessageType.WRAPPER_PROFILES_REQUEST, { timestamp: Date.now() });

    return () => {
       socketManager.off(MessageType.WRAPPER_PROFILES_LIST, handleProfileList);
    };
  }, []);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // When installation succeeds (state flips via global store), stop the spinner
  useEffect(() => {
     if (isInstalled && isInstalling) {
         setIsInstalling(false);
     }
  }, [isInstalled, isInstalling]);

  // For this mock iteration, installation and start are combined in the backend payload.
  // Real implementation might separate downloading the binary from executing it.
  const handleInstall = () => {
    setIsInstalling(true);
    appendWrapperLog("[UI] Sending install & start request to backend...");
    handleStart(); // The backend worker `start` handler installs if missing
  };

  const handleStart = () => {
    if (!selectedProfileId && (!username || !password)) {
        appendWrapperLog("[UI-ERROR] Missing Apple ID or Password for new profile.");
        return;
    }
    const payload: WrapperStartRequestMessage = {
       type: MessageType.WRAPPER_START_REQUEST,
       timestamp: Date.now(),
       workerId: 'target-worker-id',
       username,
       password,
       profileId: selectedProfileId || undefined,
       profileName: selectedProfileId ? undefined : `Profile - ${username}`
    };
    socketManager.emit(MessageType.WRAPPER_START_REQUEST, payload);
  };

  const handleStop = () => {
    const payload: WrapperStopRequestMessage = {
       type: MessageType.WRAPPER_STOP_REQUEST,
       timestamp: Date.now(),
       workerId: 'target-worker-id',
       profileId: selectedProfileId || undefined
    };
    socketManager.emit(MessageType.WRAPPER_STOP_REQUEST, payload);
  };

  const handlePurgeState = () => {
     if (!selectedProfileId) return;
     const payload: WrapperStateDeleteMessage = {
         type: MessageType.WRAPPER_STATE_DELETE,
         timestamp: Date.now(),
         profileId: selectedProfileId
     };
     socketManager.emit(MessageType.WRAPPER_STATE_DELETE, payload);
     setSelectedProfileId(null);
     setUsername('');
     setPassword('');
     appendWrapperLog(`[UI] Purged state for profile: ${selectedProfileId}`);
  };

  const handleSelectProfile = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === 'NEW') {
          setSelectedProfileId(null);
          setUsername('');
          setPassword('');
      } else {
          setSelectedProfileId(val);
          const profile = wrapperProfiles.find(p => p.id === val);
          if (profile) {
              setUsername(profile.username);
              // Do NOT clear password, allow user to input if 2FA is needed
          }
      }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!twoFaCode) return;

      const payload: Wrapper2FASubmitMessage = {
         type: MessageType.WRAPPER_2FA_SUBMIT,
         timestamp: Date.now(),
         workerId: 'target-worker-id',
         code: twoFaCode
      };

      SocketManager.getInstance().emit(MessageType.WRAPPER_2FA_SUBMIT, payload);
      setWrapperNeeds2FA(false);
      setTwoFaCode('');
  };

  return (
    <div className="w-full h-full flex flex-col items-center py-6 overflow-y-auto">
      <div className="w-full max-w-4xl px-6 space-y-6 pb-20">

        {/* Status Header */}
        <div className="flex items-center justify-between p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isRunning ? 'bg-green-500/20 text-green-500 shadow-green-500/20' : 'bg-white/5 text-muted-foreground'}`}>
                    <KeyRound size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Widevine Decryption Proxy</h3>
                    <p className="text-sm text-muted-foreground">Status: {isRunning ? <span className="text-green-400 font-semibold">ONLINE (PID: {pid || 'UNKNOWN'})</span> : 'OFFLINE'}</p>
                </div>
            </div>

            <div className="flex gap-3">
                {!isInstalled ? (
                    <button
                      onClick={handleInstall}
                      disabled={isInstalling || !username || !password}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!username || !password ? "Please enter credentials first" : ""}
                    >
                        {isInstalling ? <Loader2 size={18} className="animate-spin" /> : <DownloadCloud size={18} />}
                        {isInstalling ? 'Installing...' : 'Install Wrapper'}
                    </button>
                ) : !isRunning ? (
                    <button
                      onClick={handleStart}
                      disabled={!username || !password}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                      title={!username || !password ? "Please enter credentials first" : ""}
                    >
                        <Play size={18} /> Start Proxy
                    </button>
                ) : (
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 px-5 py-2.5 bg-destructive hover:bg-red-600 text-white font-semibold rounded-xl transition-all"
                    >
                        <Square size={18} /> Stop Proxy
                    </button>
                )}
            </div>
        </div>

        <div className="flex gap-6 min-h-[500px]">
            {/* Left Col: Credentials & 2FA */}
            <div className="w-1/3 flex flex-col gap-6">

                {/* Credentials & Profile Manager */}
                <div className="p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm shrink-0 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm uppercase tracking-wider text-muted-foreground font-bold">DRM Profiles</h4>
                        {selectedProfileId && !isRunning && (
                            <button onClick={handlePurgeState} className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-xs" title="Purge Widevine State">
                                <Trash2 size={14} /> Purge
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground ml-1">Identity</label>
                            <select
                                value={selectedProfileId || 'NEW'}
                                onChange={handleSelectProfile}
                                disabled={isRunning}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-50 appearance-none"
                            >
                                <option value="NEW">✨ Create New Profile</option>
                                {wrapperProfiles.map((p: any) => (
                                    <option key={p.id} value={p.id}>👤 {p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground ml-1">Apple ID</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isRunning || !!selectedProfileId}
                                placeholder="music@apple.com"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isRunning}
                                placeholder={selectedProfileId ? "•••••••• (Optional if Hydrated)" : "••••••••"}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>

                {/* 2FA Slide-In Prompt */}
                <div className={`border rounded-2xl backdrop-blur-sm transition-all duration-500 overflow-hidden shrink-0 ${
                    needs2FA
                        ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] opacity-100 p-6 max-h-[500px] pointer-events-auto'
                        : 'bg-black/40 border-transparent opacity-0 p-0 max-h-0 m-0 pointer-events-none'
                }`}>
                    <div className="flex items-center gap-2 text-orange-400 mb-3">
                        <ShieldAlert size={18} />
                        <h4 className="font-bold">2FA Required</h4>
                    </div>
                    <p className="text-xs text-orange-200/70 mb-4">Apple servers have intercepted the proxy request. Enter the 6-digit code sent to your trusted device to continue decryption.</p>

                    <form onSubmit={handle2FASubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={twoFaCode}
                            onChange={(e) => setTwoFaCode(e.target.value)}
                            placeholder="123456"
                            className="w-full bg-black/60 border border-orange-500/30 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/30 font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                            maxLength={6}
                        />
                        <button type="submit" className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                            <Send size={18} />
                        </button>
                    </form>
                </div>

            </div>

            {/* Right Col: Terminal logs */}
            <div className="w-2/3 bg-[#050505] border border-white/10 rounded-2xl flex flex-col font-mono relative overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 bg-white/5 text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="ml-2 opacity-50">wrapper-proxy.log</span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto text-xs text-green-500/80 leading-relaxed space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className={log.includes('ERROR') ? 'text-red-400' : log.includes('2FA') ? 'text-orange-400 animate-pulse' : ''}>
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
                {/* Terminal Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
            </div>
        </div>

      </div>
    </div>
  );
};
