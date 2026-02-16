import React from 'react';
import { Users, Sword, Shield, Play, Clock } from 'lucide-react';
import './Lobby.css';

const RoomList = ({ rooms, joinRoom }) => {
    if (rooms.length === 0) {
        return (
            <div className="loading-state-fancy">
                <Sword size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p>NENHUMA AVENTURA NO RADAR...</p>
                <span style={{ fontSize: '1.2rem', color: '#8a8a8a' }}>Crie seu próprio reino para começar!</span>
            </div>
        );
    }

    return (
        <div className="room-grid">
            {rooms.map((room) => {
                const isInProgress = room.status === 'in_progress';
                const playerCount = room.player_count || 0;

                return (
                    <div key={room.id} className="room-card" style={{ opacity: isInProgress ? 0.7 : 1 }}>
                        <div className="room-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4px' }}>
                                <Shield size={24} style={{ color: isInProgress ? '#ff9800' : '#4caf50' }} />
                                <h3>{room.name}</h3>
                                {isInProgress && (
                                    <span style={{
                                        fontSize: '1rem',
                                        color: '#ff9800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginLeft: 'auto'
                                    }}>
                                        <Play size={14} /> EM JOGO
                                    </span>
                                )}
                            </div>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#8a8a8a' }}>
                                <Users size={16} /> {playerCount} / 5 HERÓIS
                            </p>
                        </div>
                        <button
                            onClick={() => joinRoom(room.id)}
                            className="btn-primary"
                            disabled={isInProgress}
                            style={{
                                opacity: isInProgress ? 0.5 : 1,
                                cursor: isInProgress ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isInProgress ? (
                                <>
                                    <Clock size={16} /> AGUARDAR
                                </>
                            ) : (
                                'INICIAR JORNADA'
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default RoomList;
