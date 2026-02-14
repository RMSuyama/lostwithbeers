import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import RoomList from './RoomList';
import ActiveRoom from './ActiveRoom';
import PlayerStats from './PlayerStats';
import MusicPlayer from './MusicPlayer';
import { useNavigate } from 'react-router-dom';
import { Sword, Compass, Shield, Map, LogOut } from 'lucide-react';

const Lobby = ({ playerName, setPlayerName, user }) => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Initial load and real-time subscription
    useEffect(() => {
        const init = async () => {
            await purgeEmptyRooms();
            await fetchRooms();
        };
        init();

        const channel = supabase
            .channel('lobby-rooms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
                fetchRooms();
            })
            .subscribe();

        // Periodic cleanup every 10 seconds
        const cleanupInterval = setInterval(() => {
            purgeEmptyRooms();
        }, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(cleanupInterval);
        };
    }, []);

    const purgeEmptyRooms = async () => {
        try {
            // Select all rooms that are NOT playing (optional: check all)
            const { data: allRooms } = await supabase.from('rooms').select('id');
            if (!allRooms) return;

            for (const r of allRooms) {
                const { data: pCount } = await supabase.from('players').select('id', { count: 'exact' }).eq('room_id', r.id);
                if (!pCount || pCount.length === 0) {
                    console.log('Purging empty room:', r.id);
                    await supabase.from('rooms').delete().eq('id', r.id);
                }
            }
        } catch (err) {
            console.error('Purge error:', err);
        }
    };

    const fetchRooms = async () => {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .neq('status', 'finished')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRooms(data || []);
        } catch (err) {
            console.error('Error fetching rooms:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const checkAlreadyInRoom = async () => {
        // Enforce "One Room" Policy via Presence
        const channel = supabase.channel('online-users');
        // Retrieve state - this is a bit hacky as we need to wait for sync
        // Alternatively, check DB 'players' table for active session
        const { data: activePlayer } = await supabase
            .from('players')
            .select('room_id')
            .eq('user_id', user.id)
            .single();

        if (activePlayer) {
            alert('Você já está em uma sala! Saia da outra sessão primeiro.');
            return true;
        }
        return false;
    };

    const createRoom = async () => {
        if (!playerName.trim()) return alert('Herói, identifique-se antes de iniciar sua jornada!');
        if (await checkAlreadyInRoom()) return;

        const roomName = prompt('Nome da Sala (ex: "Reino dos Bravos"):');
        if (!roomName?.trim()) return alert('Dê um nome à sua sala!');

        setCreating(true);
        localStorage.setItem('playerName', playerName);

        try {
            const { data, error } = await supabase
                .from('rooms')
                .insert([{
                    name: roomName.trim(),
                    status: 'waiting'
                }])
                .select();

            if (error) throw error;

            if (data && data.length > 0) {
                await joinRoom(data[0].id, true);
            }
        } catch (err) {
            alert('Falha na missão: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const joinRoom = async (roomId, isHost = false) => {
        if (!playerName.trim()) return alert('Herói, identifique-se primeiro!');
        if (!isHost && await checkAlreadyInRoom()) return; // Host check skipped as they just created it

        localStorage.setItem('playerName', playerName);

        try {
            // Check room capacity (Max 10)
            const { count } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', roomId);

            if (count >= 10) return alert('Esta sala está cheia! (Máx: 10)');

            // Remove previous session to be safe (One Room Policy enforcement)
            await supabase.from('players').delete().eq('user_id', user?.id);

            const { error } = await supabase
                .from('players')
                .insert([{
                    room_id: roomId,
                    user_id: user?.id,
                    name: playerName,
                    is_host: isHost,
                    is_ready: false
                }]);

            if (error) throw error;
            navigate(`/room/${roomId}`);
        } catch (err) {
            alert('Caminho bloqueado! ' + err.message);
        }
    };

    return (
        <div className="lobby-container">
            <header className="lobby-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div className="logo-container">
                        <Sword className="icon-gold" size={64} />
                        <h1 className="lobby-title">LWB - Lost With Beers</h1>
                    </div>
                    <button onClick={handleLogout} className="btn-primary" style={{ height: 'fit-content', background: '#333' }}>
                        LOGOUT
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <p className="lobby-subtitle">UMA LENDA DO PORTO DO REINO</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {user?.email?.toLowerCase() === 'admin@lwb.com' && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="btn-primary"
                                style={{ background: '#7c3aed', color: '#fff', fontSize: '1rem', padding: '5px 10px' }}
                            >
                                <Shield size={16} style={{ marginRight: '5px' }} />
                                ADMIN
                            </button>
                        )}
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="btn-primary"
                            style={{
                                background: showStats ? '#ef4444' : '#ffd700',
                                fontSize: '1.2rem',
                                padding: '5px 15px',
                                color: '#000'
                            }}
                        >
                            {showStats ? 'FECHAR ESTATÍSTICAS' : 'VER ESTATÍSTICAS'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="main-content-layout" style={{ maxWidth: '95rem' }}>
                <div className="left-panel">
                    <div className="profile-hero-card">
                        <div>
                            <div className="card-header">
                                <Shield className="icon-blue" size={32} />
                                <span>SUA IDENTIDADE</span>
                            </div>
                            <div className="hero-input-area">
                                <label className="label-technical">NOME DO GUERREIRO</label>
                                <input
                                    type="text"
                                    className="hero-text-input"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    disabled={true}
                                    style={{
                                        cursor: 'not-allowed',
                                        opacity: 0.7,
                                        border: '2px solid #555',
                                        background: 'rgba(0,0,0,0.5)',
                                        color: '#aaa'
                                    }}
                                />
                                <div style={{ fontSize: '0.8rem', color: '#ffd700', marginTop: '4px', opacity: 0.8, textAlign: 'center' }}>
                                    Vinculado a: {user?.email}
                                </div>
                                <button
                                    onClick={createRoom}
                                    disabled={creating}
                                    className="hero-btn-primary"
                                >
                                    {creating ? 'CONVOCANDO...' : 'INICIAR NOVA LENDA'}
                                </button>
                            </div>
                        </div>
                        <div className="card-footer">
                            <Map size={32} />
                            <span>MAPA DO GRANDE REINO CARREGADO</span>
                        </div>
                    </div>
                </div>

                <div className="right-panel">
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
                </div>
            </div>


            {/* Stats Panel Overlay */}
            {showStats && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 998,
                    overflowY: 'auto',
                    padding: '80px 20px 20px 20px'
                }}>
                    <PlayerStats user={user} />
                </div>
            )}

            {/* Music Player */}
            <MusicPlayer />
        </div>
    );
};

export default Lobby;
