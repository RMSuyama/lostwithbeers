import React from 'react';
import { Users, Sword, Shield } from 'lucide-react';
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
            {rooms.map((room) => (
                <div key={room.id} className="room-card">
                    <div className="room-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4px' }}>
                            <Shield size={24} style={{ color: '#4caf50' }} />
                            <h3>{room.name}</h3>
                        </div>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#8a8a8a' }}>
                            <Users size={16} /> {room.player_count || 0} / {room.max_players || 10} HERÓIS
                        </p>
                    </div>
                    <button
                        onClick={() => joinRoom(room.id)}
                        className="btn-primary"
                    >
                        INICIAR JORNADA
                    </button>
                </div>
            ))}
        </div>
    );
};

export default RoomList;
