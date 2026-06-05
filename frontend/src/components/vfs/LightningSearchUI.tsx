import React, { useState, useEffect, useRef } from 'react';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
// @ts-ignore
import { FixedSizeList } from 'react-window';

export const LightningSearchUI: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [aliases, setAliases] = useState<string[]>([]);
    const [selectedAlias, setSelectedAlias] = useState<string>('');
    const searchTimeout = useRef<any>(null);
    const queryRef = useRef(query);
    const socketManager = SocketManager.getInstance();

    // Keep ref in sync so the empty-dep useEffect has access to latest without re-triggering
    useEffect(() => {
        queryRef.current = query;
    }, [query]);

    useEffect(() => {
        const handleSearchResponse = (msg: any) => {
            if (msg.query === queryRef.current) {
                setResults(msg.results);
                setIsSearching(false);
            }
        };

        const handleAliasList = (msg: any) => {
            setAliases(msg.aliases || []);
        };

        socketManager.on(MessageType.VFS_SEARCH_RESPONSE, handleSearchResponse);
        socketManager.on(MessageType.VFS_ALIAS_LIST_RESPONSE, handleAliasList);

        // Fetch aliases on mount
        socketManager.emit(MessageType.VFS_ALIAS_LIST_REQUEST, { timestamp: Date.now() });

        return () => {
            socketManager.off(MessageType.VFS_SEARCH_RESPONSE, handleSearchResponse);
            socketManager.off(MessageType.VFS_ALIAS_LIST_RESPONSE, handleAliasList);
        };
    }, []); // Empty dependency array ensures we only bind once

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (val.trim() === '') {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        // Debounce search to protect Relay Server
        searchTimeout.current = setTimeout(() => {
            socketManager.emit(MessageType.VFS_SEARCH_REQUEST, {
                type: MessageType.VFS_SEARCH_REQUEST,
                timestamp: Date.now(),
                query: val,
                limit: 1000, // Safely fetch up to 1000 results because react-window will virtualize them
                remoteAlias: selectedAlias || undefined
            });
        }, 300);
    };

    const handleAliasChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAlias(e.target.value);
        // Re-trigger search if query is not empty
        if (query.trim() !== '') {
            setIsSearching(true);
            socketManager.emit(MessageType.VFS_SEARCH_REQUEST, {
                type: MessageType.VFS_SEARCH_REQUEST,
                timestamp: Date.now(),
                query: query,
                limit: 1000,
                remoteAlias: e.target.value || undefined
            });
        }
    };

    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const file = results[index];
        return (
            <div style={style} className="flex items-center justify-between p-2 border-b border-gray-700 hover:bg-gray-800 text-sm">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-xl">{file.isDirectory ? '📁' : '📄'}</span>
                    <div className="flex flex-col truncate">
                        <span className="text-white truncate">{file.name}</span>
                        <span className="text-gray-400 text-xs truncate">{file.remoteAlias}://{file.path}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end text-xs text-gray-500 min-w-[80px]">
                    {file.isEphemeral && <span className="text-orange-500 font-bold">EPHEMERAL</span>}
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-96 p-4">
            <h2 className="text-xl font-bold text-white mb-4">Lightning Search</h2>

            <div className="mb-3">
                <select
                    value={selectedAlias}
                    onChange={handleAliasChange}
                    className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                >
                    <option value="">Search All Drives</option>
                    {aliases.map(alias => (
                        <option key={alias} value={alias}>Search [{alias}] only</option>
                    ))}
                </select>
            </div>

            <div className="relative mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={handleSearchChange}
                    placeholder="Search millions of files..."
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2 pl-10 focus:outline-none focus:border-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                {isSearching && <span className="absolute right-3 top-2.5 text-blue-500 animate-spin">⟳</span>}
            </div>

            <div className="flex-1 overflow-hidden rounded bg-gray-950 border border-gray-800">
                {results.length === 0 && !isSearching && query !== '' ? (
                    <div className="p-4 text-center text-gray-500 mt-10">No results found in any remote.</div>
                ) : (
                    <FixedSizeList
                        height={600}
                        itemCount={results.length}
                        itemSize={60}
                        width="100%"
                    >
                        {Row}
                    </FixedSizeList>
                )}
            </div>
        </div>
    );
};
