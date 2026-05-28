import React, { useEffect, useState } from 'react';
import { MessageType } from '@swarm/shared';
import type { DbStateUpdateMessage, DbRouteSwitchRequestMessage } from '@swarm/shared';
import { SocketManager } from '../../worker/SocketManager';

export const DatabaseOperationsCenter: React.FC = () => {
  const [routing, setRouting] = useState<Record<string, { engine: string; connectionString?: string }>>({});
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

const DomainConfigRow: React.FC<{ domain: string; currentConfig?: { engine: string; connectionString?: string }; socketManager: SocketManager }> = ({ domain, currentConfig, socketManager }) => {
   const [engine, setEngine] = useState<string>('MOCK');
   const [connectionString, setConnectionString] = useState('');

   // Sync local state when external state updates
   useEffect(() => {
      if (currentConfig) {
         setEngine(currentConfig.engine);
         // We generally shouldn't broadcast connection strings back for security, but for this dev UI we do.
         if (currentConfig.connectionString) setConnectionString(currentConfig.connectionString);
      }
   }, [currentConfig]);

   const handleHotSwap = () => {
      if (!engine) return;
      const payload: DbRouteSwitchRequestMessage = {
         type: MessageType.DB_ROUTE_SWITCH_REQUEST,
         timestamp: Date.now(),
         domain: domain as any,
         engine: engine as any,
         connectionString: connectionString || undefined
      };
      socketManager.emit(MessageType.DB_ROUTE_SWITCH_REQUEST, payload);
   };

   return (
      <div style={{ backgroundColor: '#34495e', padding: '15px', borderRadius: '6px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#f1c40f' }}>{domain} DOMAIN</span>
            <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', backgroundColor: currentConfig?.engine === 'MOCK' ? '#e67e22' : '#2ecc71', color: '#fff' }}>
               Live: {currentConfig?.engine || 'UNKNOWN'}
            </span>
         </div>

         <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select
               value={engine}
               onChange={e => setEngine(e.target.value)}
               style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #7f8c8d', backgroundColor: '#2c3e50', color: 'white' }}
            >
               <option value="MOCK">Memory Mock DB</option>
               <option value="MONGODB">MongoDB</option>
               <option value="POSTGRES">PostgreSQL</option>
               <option value="SUPABASE">Supabase</option>
               <option value="FIREBASE">Firebase</option>
               <option value="SQLITE">SQLite</option>
            </select>
            <button
               onClick={handleHotSwap}
               style={{ padding: '8px 15px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
               Hot-Swap
            </button>
         </div>

         {engine !== 'MOCK' && engine !== 'SQLITE' && (
            <input
               type="text"
               placeholder="Connection String / API Key"
               value={connectionString}
               onChange={e => setConnectionString(e.target.value)}
               style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #7f8c8d', backgroundColor: '#2c3e50', color: 'white', boxSizing: 'border-box' }}
            />
         )}
      </div>
   );
};