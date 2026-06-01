import React, { useEffect, useState } from 'react';
import { MessageType } from '@swarm/shared';
import type { DbStateUpdateMessage, DbRouteSwitchRequestMessage } from '@swarm/shared';
import { SocketManager } from '../../worker/SocketManager';

export const DatabaseOperationsCenter: React.FC = () => {
  const [routing, setRouting] = useState<Record<string, { primary: { engine: string; connectionString?: string }, mirrors: { engine: string; connectionString?: string }[] }>>({});

  const socketManager = SocketManager.getInstance();

  useEffect(() => {
    const handleDbState = (msg: DbStateUpdateMessage) => {
      setRouting(msg.routing);
    };

    socketManager.on(MessageType.DB_STATE_UPDATE, handleDbState);

    // Initial fetch when opened
    socketManager.emit(MessageType.DB_STATE_REQUEST, { timestamp: Date.now() });

    return () => {
      socketManager.off(MessageType.DB_STATE_UPDATE, handleDbState);
    };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      <div className="p-6 bg-card/20 border border-border/50 rounded-2xl shadow-xl backdrop-blur-sm">

        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/50">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(170,59,255,0.2)]">
            <span className="text-2xl">🎛️</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pluggable DB Switchboard</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Warning: Hot-swapping a domain routes all live swarm traffic to the new database engine instantly without rebooting the Relay.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {(['AUTH', 'AUDIT', 'CHAT', 'APPLE_MUSIC'] as const).map(domain => (
             <DomainConfigRow key={domain} domain={domain} currentConfig={routing[domain]} socketManager={socketManager} />
          ))}
        </div>
      </div>
    </div>
  );
};

const DomainConfigRow: React.FC<{ domain: string; currentConfig?: { primary: { engine: string; connectionString?: string }, mirrors: { engine: string; connectionString?: string }[] }; socketManager: SocketManager }> = ({ domain, currentConfig, socketManager }) => {
   const [primaryEngine, setPrimaryEngine] = useState<string>('MOCK');
   const [primaryConn, setPrimaryConn] = useState('');
   const [mirrors, setMirrors] = useState<Array<{ engine: string, connectionString: string }>>([]);

   // Sync local state when external state updates
   useEffect(() => {
      if (currentConfig && currentConfig.primary) {
         setPrimaryEngine(currentConfig.primary.engine);
         if (currentConfig.primary.connectionString) setPrimaryConn(currentConfig.primary.connectionString);

         const syncedMirrors = currentConfig.mirrors.map(m => ({
            engine: m.engine,
            connectionString: m.connectionString || ''
         }));
         setMirrors(syncedMirrors);
      }
   }, [currentConfig]);

   const handleHotSwap = () => {
      if (!primaryEngine) return;
      const payload: DbRouteSwitchRequestMessage = {
         type: MessageType.DB_ROUTE_SWITCH_REQUEST,
         timestamp: Date.now(),
         domain: domain as any,
         engine: primaryEngine as any,
         connectionString: primaryConn || undefined,
         mirrors: mirrors.map(m => ({ engine: m.engine, connectionString: m.connectionString || undefined }))
      };
      socketManager.emit(MessageType.DB_ROUTE_SWITCH_REQUEST, payload);
   };

   const addMirror = () => {
      setMirrors([...mirrors, { engine: 'POSTGRES', connectionString: '' }]);
   };

   const updateMirror = (index: number, key: 'engine' | 'connectionString', value: string) => {
      const newMirrors = [...mirrors];
      newMirrors[index] = { ...newMirrors[index], [key]: value };
      setMirrors(newMirrors);
   };

   const removeMirror = (index: number) => {
      setMirrors(mirrors.filter((_, i) => i !== index));
   };

   return (
      <div className="bg-secondary/40 border border-border/50 p-5 rounded-xl transition-all hover:border-primary/30">
         <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm tracking-widest text-primary uppercase">{domain} DOMAIN</span>
            <span className={`text-[10px] font-medium px-3 py-1 rounded-full border ${currentConfig?.primary?.engine === 'MOCK' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
               Live: {currentConfig?.primary?.engine || 'UNKNOWN'}
               {mirrors.length > 0 && ` (+${mirrors.length} Mirrors)`}
            </span>
         </div>

         {/* PRIMARY DB CONFIG */}
         <div className="mb-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2 font-semibold">Primary Database (Sync Read/Write)</span>
            <div className="flex gap-3 mb-2">
               <select
                  value={primaryEngine}
                  onChange={e => setPrimaryEngine(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-lg p-2 text-sm text-foreground outline-none focus:border-primary/50"
               >
                  <option value="MOCK">Memory Mock DB</option>
                  <option value="MONGODB">MongoDB</option>
                  <option value="POSTGRES">PostgreSQL</option>
                  <option value="SUPABASE">Supabase</option>
                  <option value="FIREBASE">Firebase</option>
                  <option value="SQLITE">SQLite</option>
               </select>
            </div>
            {primaryEngine !== 'MOCK' && primaryEngine !== 'SQLITE' && (
               <input
                  type="text"
                  placeholder="Primary Connection String"
                  value={primaryConn}
                  onChange={e => setPrimaryConn(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground outline-none focus:border-primary/50 font-mono"
               />
            )}
         </div>

         {/* MIRRORS CONFIG */}
         <div className="space-y-3">
           {mirrors.map((mirror, index) => (
              <div key={index} className="p-3 bg-background/50 rounded-lg border border-dashed border-border/60">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mirror {index + 1} (Async Write-Behind)</span>
                    <button onClick={() => removeMirror(index)} className="text-[10px] text-destructive hover:underline">Remove</button>
                 </div>
                 <div className="flex gap-3 mb-2">
                    <select
                       value={mirror.engine}
                       onChange={e => updateMirror(index, 'engine', e.target.value)}
                       className="flex-1 bg-background border border-border rounded-md p-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                    >
                       <option value="POSTGRES">PostgreSQL</option>
                       <option value="MONGODB">MongoDB</option>
                       <option value="SUPABASE">Supabase</option>
                       <option value="FIREBASE">Firebase</option>
                       <option value="SQLITE">SQLite</option>
                    </select>
                 </div>
                 {mirror.engine !== 'SQLITE' && (
                    <input
                       type="text"
                       placeholder="Mirror Connection String"
                       value={mirror.connectionString}
                       onChange={e => updateMirror(index, 'connectionString', e.target.value)}
                       className="w-full bg-background border border-border rounded-md p-1.5 text-xs text-foreground outline-none focus:border-primary/50 font-mono"
                    />
                 )}
              </div>
           ))}
         </div>

         <div className="flex gap-3 mt-4 pt-4 border-t border-border/30">
            <button
               onClick={addMirror}
               className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-lg text-xs font-medium transition-colors"
            >
               + Add Async Mirror
            </button>
            <button
               onClick={handleHotSwap}
               className="flex-[2] px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-sm transition-all shadow-[0_0_10px_rgba(170,59,255,0.2)]"
            >
               Commit Routing Change
            </button>
         </div>

      </div>
   );
};