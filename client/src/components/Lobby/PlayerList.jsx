import React from 'react';
import { Sword, LogOut, CheckCircle } from 'lucide-react';

const PlayerSlot = ({ player, isMe, isHost, onKick }) => (
    <div className={`player-slot ${player.is_ready ? 'ready' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
            <div className="champ-avatar" style={{ width: '32px', height: '32px', fontSize: '1.2rem', margin: 0 }}>
                {player.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', lineHeight: '1', whiteSpace: 'nowrap' }}>
                    {player.name}
                    {isMe && <span style={{ fontSize: '0.8rem', color: '#ffd700' }}>[EU]</span>}
                    {player.is_host && <Sword size={14} style={{ color: '#ffd700' }} />}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#8a8a8a', lineHeight: '1', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {player.champion_id || '?'}
                </div>
            </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            {player.is_ready && <CheckCircle size={20} style={{ color: '#fff' }} />}
            {isHost && !isMe && (
                <button
                    onClick={(e) => { e.stopPropagation(); onKick(); }}
                    title="Expulsar"
                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0' }}
                >
                    <LogOut size={14} />
                </button>
            )}
        </div>
    </div>
);

const PlayerList = ({ players, me, kickPlayer }) => {
    return (
        <div className="team-column">
            <h3 className="team-header">HERÓIS ({players.length}/10)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', overflowY: 'auto', paddingRight: '4px' }}>
                {players.map(p => (
                    <PlayerSlot
                        key={p.id}
                        player={p}
                        isMe={p.id === me?.id}
                        isHost={me?.is_host}
                        onKick={() => kickPlayer(p.id)}
                    />
                ))}
                {Array.from({ length: Math.max(0, 10 - players.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="player-slot" style={{ opacity: 0.3, borderStyle: 'dashed', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>VAGA</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerList;
