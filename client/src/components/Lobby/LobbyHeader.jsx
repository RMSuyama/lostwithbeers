import React from 'react';
import { Sword, Shield, LogOut, DoorOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { supabase } from '../../supabaseClient';

const LobbyHeader = ({
    user,
    handleLogout,
    showStats,
    setShowStats,
    // Room-specific props
    roomId,
    isHost,
    onLeave,
    roomStatus,
    playerCount,
    readyCount
}) => {
    const navigate = useNavigate();
    const { showConfirm } = useModal();
    const isInRoom = !!roomId;

    const handleLeaveRoom = async () => {
        if (isHost) {
            const confirmed = await showConfirm(
                'Você é o host! Sair irá FECHAR a sala para todos os jogadores. Confirma?'
            );
            if (!confirmed) return;

            // Delete the room (will cascade delete all players)
            await supabase.from('rooms').delete().eq('id', roomId);
        } else {
            const confirmed = await showConfirm('Deseja sair da sala?');
            if (!confirmed) return;
        }

        onLeave?.();
    };

    return (
        <header className="lobby-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div className="logo-container">
                    <Sword className="icon-gold" size={64} />
                    <h1 className="lobby-title">LWB - Lost With Beers</h1>
                </div>

                {!isInRoom && (
                    <button onClick={handleLogout} className="btn-primary" style={{ height: 'fit-content', background: '#333' }}>
                        LOGOUT
                    </button>
                )}

                {isInRoom && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ color: '#ffd700', fontSize: '1.2rem', fontFamily: 'VT323' }}>
                            SALA: {roomId} | {playerCount} HERÓIS | {readyCount} PRONTOS
                        </div>
                        <button
                            onClick={handleLeaveRoom}
                            className="btn-primary"
                            style={{
                                height: 'fit-content',
                                background: isHost ? '#dc2626' : '#78350f',
                                border: '2px solid #ffd700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {isHost ? <DoorOpen size={20} /> : <LogOut size={20} />}
                            {isHost ? 'FECHAR SALA' : 'SAIR'}
                        </button>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <p className="lobby-subtitle">UMA LENDA DO PORTO DO REINO</p>
                {!isInRoom && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {(user?.email?.trim().toLowerCase() === 'admin@lwb.com' || user?.email === 'admin@lwb.com') && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="btn-primary admin-btn"
                            >
                                <Shield size={16} style={{ marginRight: '5px' }} />
                                ADMIN
                            </button>
                        )}
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className={`btn-primary toggle-stats-btn ${showStats ? 'active' : ''}`}
                        >
                            {showStats ? 'FECHAR ESTATÍSTICAS' : 'VER ESTATÍSTICAS'}
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default LobbyHeader;
