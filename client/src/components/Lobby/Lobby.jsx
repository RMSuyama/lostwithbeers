import React, { useState } from 'react';
import PlayerStats from './PlayerStats';
import MusicPlayer from './MusicPlayer';
import LobbyHeader from './LobbyHeader';
import UserProfileCard from './UserProfileCard';
import RoomBrowser from './RoomBrowser';
import { useLobby } from './useLobby';
import './Lobby.css';

const Lobby = ({ playerName, setPlayerName, user }) => {
    const {
        rooms,
        loading,
        creating,
        showStats,
        setShowStats,
        createRoom,
        joinRoom,
        handleLogout
    } = useLobby(user, playerName);

    return (
        <div className="lobby-container">
            <LobbyHeader
                user={user}
                handleLogout={handleLogout}
                showStats={showStats}
                setShowStats={setShowStats}
            />

            <div className="main-content-layout" style={{ maxWidth: '95rem' }}>
                <div className="left-panel">
                    <UserProfileCard
                        playerName={playerName}
                        setPlayerName={setPlayerName}
                        user={user}
                        createRoom={createRoom}
                        creating={creating}
                    />
                </div>

                <div className="right-panel">
                    <RoomBrowser
                        rooms={rooms}
                        loading={loading}
                        joinRoom={joinRoom}
                    />
                </div>
            </div>

            {/* Stats Panel Overlay */}
            {showStats && (
                <div className="stats-overlay">
                    <PlayerStats user={user} />
                </div>
            )}

            {/* Music Player */}
            <MusicPlayer />
        </div>
    );
};

export default Lobby;
