import React, { useState } from 'react';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import { Save, Server, Loader2, Check } from 'lucide-react';

export const RcloneConfigManagerUI: React.FC<{ workerId: string }> = ({ workerId }) => {
  const [configBlock, setConfigBlock] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleMergeSync = () => {
      setIsSaving(true);
      setSaveSuccess(false);

      SocketManager.getInstance().emit(MessageType.CONFIG_MERGE_SYNC as any, {
          type: MessageType.CONFIG_MERGE_SYNC,
          timestamp: Date.now(),
          workerId: workerId,
          permanentConfigBlock: configBlock
      });

      setTimeout(() => {
          setIsSaving(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
      }, 500);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 bg-background text-foreground overflow-y-auto">
        <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                <Server size={20} />
            </div>
            <div>
                <h2 className="text-xl font-bold">Hybrid VFS Config Manager</h2>
                <p className="text-sm text-muted-foreground">Inject permanent remote configurations into the ephemeral worker.</p>
            </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
            <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 space-y-2">
                <h3 className="text-sm font-semibold text-white/90">Permanent Rclone Configuration Block</h3>
                <p className="text-xs text-muted-foreground">
                    Paste your massive or permanent <code className="bg-background px-1 py-0.5 rounded">rclone.conf</code> remotes here.
                    The Swarm Worker will dynamically merge this with any ephemeral configs and mount the dual-state drives instantly.
                </p>
                <textarea
                    value={configBlock}
                    onChange={(e) => setConfigBlock(e.target.value)}
                    placeholder="[GoogleDrive_Permanent]&#10;type = drive&#10;client_id = ...&#10;client_secret = ..."
                    className="w-full h-64 bg-background border border-border/50 rounded-lg p-3 text-sm font-mono focus:ring-1 focus:ring-primary outline-none custom-scrollbar resize-y"
                />
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleMergeSync}
                    disabled={isSaving || !configBlock.trim()}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-300 ${
                        saveSuccess
                            ? 'bg-green-500 text-white'
                            : 'bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                >
                    {isSaving ? <><Loader2 size={18} className="animate-spin" /> Merging Configs...</> :
                     saveSuccess ? <><Check size={18} /> Swarm Daemon Rebooted</> :
                     <><Save size={18} /> Apply Hybrid Config Merge</>}
                </button>
            </div>
        </div>
    </div>
  );
};
