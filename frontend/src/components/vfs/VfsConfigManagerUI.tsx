import React, { useState, useEffect } from 'react';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import { useFleetStore } from '../../store/fleetStore';

export const VfsConfigManagerUI: React.FC = () => {
    const { workers } = useFleetStore();
    const [alias, setAlias] = useState('');
    const [rcloneName, setRcloneName] = useState('drive:');
    const [configText, setConfigText] = useState('');
    const [isEphemeral, setIsEphemeral] = useState(false);
    const [targetWorkerId, setTargetWorkerId] = useState('');
    const [savedAliases, setSavedAliases] = useState<string[]>([]);
    const socketManager = SocketManager.getInstance();

    useEffect(() => {
        const handleAliasList = (msg: any) => {
            setSavedAliases(msg.aliases || []);
        };

        socketManager.on(MessageType.VFS_ALIAS_LIST_RESPONSE, handleAliasList);
        socketManager.emit(MessageType.VFS_ALIAS_LIST_REQUEST, { timestamp: Date.now() });

        return () => {
            socketManager.off(MessageType.VFS_ALIAS_LIST_RESPONSE, handleAliasList);
        };
    }, []);

    const handleSave = () => {
        if (!alias) {
            alert('Please enter a Remote Alias before saving.');
            return;
        }
        socketManager.emit(MessageType.VFS_CONFIG_SAVE, {
            type: MessageType.VFS_CONFIG_SAVE,
            timestamp: Date.now(),
            alias,
            rcloneName,
            configText,
            isEphemeral
        });
        setAlias('');
        setConfigText('');
        alert('Config Saved to Database!');
    };

    const handleDelete = () => {
        if (!alias) {
            alert('Please enter the Remote Alias to delete.');
            return;
        }
        if (window.confirm(`Are you sure you want to permanently delete the config and index for alias: ${alias}?`)) {
            socketManager.emit(MessageType.VFS_CONFIG_DELETE, {
                type: MessageType.VFS_CONFIG_DELETE,
                timestamp: Date.now(),
                alias,
                isEphemeral
            });
            setAlias('');
            setConfigText('');
            alert('Delete command dispatched to Relay Server.');
        }
    };

    const handleIndexDrive = () => {
        if (targetWorkerId) {
            socketManager.emit(MessageType.VFS_INDEX_REQUEST, {
                type: MessageType.VFS_INDEX_REQUEST,
                timestamp: Date.now(),
                workerId: targetWorkerId,
                remoteAlias: alias,
                rcloneName: rcloneName,
                isEphemeral: isEphemeral
            });
            alert('Massive Indexing Job Dispatched to Worker!');
        } else {
            alert('Please select an active worker to perform the indexing.');
        }
    };

    const handleRebootConfig = () => {
        if (targetWorkerId) {
            socketManager.emit('REQUEST_VFS_CONFIG_REBOOT', { workerId: targetWorkerId });
            alert('Hybrid Config Reboot command sent to worker.');
        }
    };

    return (
        <div className="flex flex-col p-6 bg-gray-900 text-white rounded-lg shadow-xl max-w-2xl mx-auto mt-10 border border-gray-800">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Hybrid Configuration Engine
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Remote Alias (DB Identity)</label>
                    <input
                        list="saved-aliases"
                        value={alias}
                        onChange={e => setAlias(e.target.value)}
                        placeholder="e.g. storage_movies_1"
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:border-blue-500"
                    />
                    <datalist id="saved-aliases">
                        {savedAliases.map(sa => (
                            <option key={sa} value={sa} />
                        ))}
                    </datalist>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Physical Rclone Name</label>
                    <input value={rcloneName} onChange={e => setRcloneName(e.target.value)} placeholder="e.g. gdrive_backup:" className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:border-blue-500" />
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Raw rclone.conf Block</label>
                <textarea
                    value={configText}
                    onChange={e => setConfigText(e.target.value)}
                    rows={6}
                    placeholder="[gdrive_backup]\ntype = drive\nclient_id = xxx\n..."
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 font-mono text-xs focus:border-blue-500"
                />
            </div>

            <div className="flex items-center space-x-3 mb-6 bg-gray-800 p-3 rounded border border-gray-700">
                <input type="checkbox" checked={isEphemeral} onChange={e => setIsEphemeral(e.target.checked)} className="w-4 h-4" />
                <div>
                    <div className="font-bold">Ephemeral Mode (Dead Man's Switch)</div>
                    <div className="text-xs text-gray-400">If enabled, this index and config will automatically self-destruct from the DB when the worker dies.</div>
                </div>
            </div>

            <div className="flex space-x-4 mb-8">
                <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors">
                    Save to Database Switchboard
                </button>
                <button onClick={handleDelete} className="px-6 bg-transparent border border-red-900/50 hover:bg-red-950/30 text-red-500 hover:text-red-400 font-bold py-2 rounded transition-all">
                    Delete
                </button>
            </div>

            <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold mb-4 text-gray-300">Swarm Dispatch</h3>
                <div className="flex space-x-4 mb-4">
                    <select value={targetWorkerId} onChange={e => setTargetWorkerId(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded p-2">
                        <option value="">-- Select Active Worker --</option>
                        {workers.map((w: any) => (
                            <option key={w} value={w}>Worker: {w.substring(0, 8)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex space-x-4">
                    <button onClick={handleIndexDrive} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded transition-colors">
                        Build VFS Index (fast-list)
                    </button>
                    <button onClick={handleRebootConfig} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded transition-colors border border-gray-600">
                        Force Hybrid Config Sync
                    </button>
                </div>
            </div>
        </div>
    );
};
