import React, { useEffect, useState } from 'react';
import { MessageType } from '@swarm/shared';
import type { DbStateUpdateMessage, DbRouteSwitchRequestMessage } from '@swarm/shared';
import { SocketManager } from '../../worker/SocketManager';

export const DatabaseOperationsCenter: React.FC = () => {
  const [routing, setRouting] = useState<Record<string, { primary: { engine: string; connectionString?: string }, mirrors: { engine: string; connectionString?: string }[] }>>({});
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const socketManager = SocketManager.getInstance();

  useEffect(() => {
    const handleDbState = (msg: DbStateUpdateMessage) => {
      setRouting(msg.routing);
    };

    socketManager.on(MessageType.DB_STATE_UPDATE, handleDbState);

    // Initial fetch when opened
    if (isPanelOpen) {
       socketManager.emit(MessageType.DB_STATE_REQUEST, { timestamp: Date.now() });
    }

    return () => {
      socketManager.off(MessageType.DB_STATE_UPDATE, handleDbState);
    };
  }, [isPanelOpen]);

  if (!isPanelOpen) {
     return (
       <button
         onClick={() => setIsPanelOpen(true)}
         style={{ position: 'fixed', bottom: 20, right: 20, backgroundColor: '#8e44ad', color: 'white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 1000 }}
       >
          🎛️ DB Ops Center
       </button>
     );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: '450px',
      backgroundColor: '#2c3e50', color: 'white', borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden', border: '1px solid #34495e'
    }}>
      <div style={{ backgroundColor: '#1a252f', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #34495e' }}>
         <h3 style={{ margin: 0, fontSize: '16px' }}>🎛️ Pluggable DB Switchboard</h3>
         <button onClick={() => setIsPanelOpen(false)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '18px' }}>✖</button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
         <p style={{ margin: 0, fontSize: '13px', color: '#bdc3c7' }}>
            Warning: Hot-swapping a domain routes all live swarm traffic to the new database engine instantly without rebooting the Relay.
         </p>

         {(['AUTH', 'AUDIT', 'CHAT'] as const).map(domain => (
            <DomainConfigRow key={domain} domain={domain} currentConfig={routing[domain]} socketManager={socketManager} />
         ))}
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
      <div style={{ backgroundColor: '#34495e', padding: '15px', borderRadius: '6px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#f1c40f' }}>{domain} DOMAIN</span>
            <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', backgroundColor: currentConfig?.primary?.engine === 'MOCK' ? '#e67e22' : '#2ecc71', color: '#fff' }}>
               Live: {currentConfig?.primary?.engine || 'UNKNOWN'}
               {mirrors.length > 0 && ` (+${mirrors.length} Mirrors)`}
            </span>
         </div>

         {/* PRIMARY DB CONFIG */}
         <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '5px' }}>PRIMARY DATABASE (Sync Read/Write)</span>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
               <select
                  value={primaryEngine}
                  onChange={e => setPrimaryEngine(e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #7f8c8d', backgroundColor: '#2c3e50', color: 'white' }}
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
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #7f8c8d', backgroundColor: '#2c3e50', color: 'white', boxSizing: 'border-box' }}
               />
            )}
         </div>

         {/* MIRRORS CONFIG */}
         {mirrors.map((mirror, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#2c3e50', borderRadius: '4px', border: '1px dashed #7f8c8d' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', color: '#bdc3c7' }}>MIRROR {index + 1} (Async Write-Behind)</span>
                  <button onClick={() => removeMirror(index)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '10px' }}>Remove</button>
               </div>
               <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                  <select
                     value={mirror.engine}
                     onChange={e => updateMirror(index, 'engine', e.target.value)}
                     style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #7f8c8d', backgroundColor: '#1a252f', color: 'white', fontSize: '12px' }}
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
                     style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #7f8c8d', backgroundColor: '#1a252f', color: 'white', boxSizing: 'border-box', fontSize: '12px' }}
                  />
               )}
            </div>
         ))}

         <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button
               onClick={addMirror}
               style={{ flex: 1, padding: '8px', backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
               + Add Async Mirror
            </button>
            <button
               onClick={handleHotSwap}
               style={{ flex: 2, padding: '8px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
               Commit Routing Change
            </button>
         </div>

      </div>
   );
};