import React from 'react';
import { LogOut } from 'lucide-react';

const LobbyHeader = ({ roomId, isHost, roomStatus, playerCount, readyCount, onLeave, onForceStart }) => {
    return (
        <header className="active-room-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div>
                    <h1 className="lobby-title">LWB - REINO: {roomId.substring(0, 8).toUpperCase()}</h1>
                    {isHost && (
                        <div className="host-debug-panel" style={{ fontSize: '0.8rem', color: '#ff4444', border: '1px solid #ff4444', padding: '2px 4px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>HOST</span>
                            <span>| STATUS: {roomStatus}</span>
                            <span>| JOGADORES: {playerCount}</span>
                            <span>| PRONTOS: {readyCount}</span>
                            <button
                                onClick={onForceStart}
                                style={{ background: 'red', color: 'white', border: 'none', padding: '2px 4px', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                                FORÇAR
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <button onClick={onLeave} className="btn-primary" style={{ background: '#451010', fontSize: '0.9rem' }}>
                    <LogOut size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> SAIR
                </button>
            </div>
        </header>
    );
};

export default LobbyHeader;
