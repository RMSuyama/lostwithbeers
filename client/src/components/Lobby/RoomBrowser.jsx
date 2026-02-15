import React from 'react';
import { Compass } from 'lucide-react';
import RoomList from './RoomList';

const RoomBrowser = ({ rooms, loading, joinRoom }) => {
    return (
        <div className="rooms-section-fancy">
            <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Compass style={{ color: '#4caf50' }} size={32} />
                    <h2>REINOS DISPONÍVEIS</h2>
                </div>
                <span className="room-count">{rooms.length} MUNDOS</span>
            </div>

            <div className="rooms-scroll-area">
                {loading ? (
                    <div className="loading-state-fancy">
                        <div className="spinner-nautical" />
                        <span>Consultando o Oráculo...</span>
                    </div>
                ) : (
                    <RoomList rooms={rooms} joinRoom={joinRoom} />
                )}
            </div>
        </div>
    );
};

export default RoomBrowser;
