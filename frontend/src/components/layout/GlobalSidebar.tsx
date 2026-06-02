import React from 'react';
import { useLayoutStore } from '../../store/layoutStore';
import { useAuthStore } from '../../store/authStore';
import { Folder, MessageSquare, Database, Settings, LogOut, Music, Server } from 'lucide-react';

export const GlobalSidebar: React.FC = () => {
  const { activeView, setActiveView } = useLayoutStore();
  const { logout } = useAuthStore();

  const navItems = [
    { id: 'EXPLORER', icon: Folder, label: 'File Explorer' },
    { id: 'MUSIC_RIPS', icon: Music, label: 'Media Ingestion Hub' },
    { id: 'RCLONE_CONFIG', icon: Server, label: 'Hybrid VFS Config' },
    { id: 'CHAT', icon: MessageSquare, label: 'Encrypted Chat' },
    { id: 'DB_OPS', icon: Database, label: 'Database Ops' },
    { id: 'SETTINGS', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="w-16 flex-none bg-[#111319] border-r border-border flex flex-col items-center py-4 z-20 shadow-xl">
      <div className="flex-1 w-full flex flex-col items-center gap-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Highlight the Music icon if we are in the hub or one of the dedicated apps
          const isActive = activeView === item.id || (item.id === 'MUSIC_RIPS' && activeView === 'APPLE_MUSIC');
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(170,59,255,0.3)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
              title={item.label}
            >
              <Icon size={22} className={isActive ? 'drop-shadow-md' : ''} />

              {/* Tooltip */}
              <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border shadow-lg">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-full flex flex-col items-center gap-4">
        <button
          onClick={logout}
          className="p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Logout"
        >
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
};
