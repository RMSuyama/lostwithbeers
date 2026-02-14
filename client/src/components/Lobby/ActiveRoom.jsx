import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import Chat from './Chat';
import ChampionPicker from './ChampionPicker';
import { Sword, LogOut, CheckCircle } from 'lucide-react';
import './Lobby.css';

const ActiveRoom = ({ roomId, playerName, user, leaveRoom, setInGame }) => {
    const [players, setPlayers] = useState([]);
    const [me, setMe] = useState(null);
    const [room, setRoom] = useState(null);
    const isTransitioning = React.useRef(false);

    useEffect(() => {
        fetchRoom();
        fetchPlayers();

        // Presence & Real-time Channel
        const channel = supabase.channel(`room:${roomId}`, {
            config: { presence: { key: user?.id || playerName } }
        });

        channel
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'players',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                fetchPlayers();
                // If I was deleted (Kicked or session ended), leave room
                if (payload.event === 'DELETE' && payload.old.user_id === user?.id) {
                    leaveRoom();
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'rooms',
                filter: `id=eq.${roomId}`
            }, (payload) => {
                setRoom(payload.new);
                if (payload.new.status === 'playing') {
                    console.log('Room status changed to playing. Initiating transition...');
                    isTransitioning.current = true;
                    setInGame(true);
                } else {
                    console.log('Room status changed but not to playing:', payload.new.status);
                }
            })
            .on('presence', { event: 'sync' }, () => {
                // Sync presence? Not strictly needed if we use it for cleanup
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                // IMPORTANT: Cleanup ghost players when they DISCONNECT
                leftPresences.forEach(async (p) => {
                    if (p.user_id) {
                        await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', p.user_id);

                        // Check if room is now empty
                        const { data: remaining } = await supabase.from('players').select('id').eq('room_id', roomId);
                        if (!remaining || remaining.length === 0) {
                            console.log('Room empty, deleting:', roomId);
                            await supabase.from('rooms').delete().eq('id', roomId);
                        }
                    }
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: user?.id, online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
            // ONLY cleanup if we are not moving to the game scene
            if (!isTransitioning.current && user?.id) {
                console.log('Cleaning up player on exit...');
                supabase.from('players').delete().eq('room_id', roomId).eq('user_id', user.id);
            }
        };
    }, [roomId, user?.id]);

    const fetchRoom = async () => {
        const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        setRoom(data);
    };

    const fetchPlayers = async () => {
        const { data } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true });

        const playerList = data || [];
        setPlayers(playerList);

        // Find "me" based on user_id (most reliable) or name
        const myPlayer = playerList.find(p => p.user_id === user?.id || p.name === playerName);
        setMe(myPlayer);

        // Self-Healing: If no host exists, promote the oldest player (index 0)
        const hasHost = playerList.some(p => p.is_host);
        if (playerList.length > 0 && !hasHost) {
            console.warn('Room has no host! Promoting oldest player...');
            const oldestPlayer = playerList[0];

            // Optimistic update locally to show UI immediately
            oldestPlayer.is_host = true;
            if (oldestPlayer.id === myPlayer?.id) {
                if (myPlayer) myPlayer.is_host = true;
            }

            // Real update in DB
            await supabase.from('players').update({ is_host: true }).eq('id', oldestPlayer.id);
        }

        setPlayers(playerList);
        setMe(myPlayer);

        // If I was in a room but my record is gone, leave
        if (playerList.length > 0 && !myPlayer) {
            leaveRoom();
        }
    };

    const toggleReady = async () => {
        if (!me) return;

        // Prevent marking ready without selecting a champion
        if (!me.champion_id && !me.is_ready) {
            alert('Escolha seu campeão antes de marcar como pronto!');
            return;
        }

        console.log('Toggling ready state:', !me.is_ready);
        await supabase.from('players').update({ is_ready: !me.is_ready }).eq('id', me.id);
    };

    const selectChampion = async (champId) => {
        if (!me) {
            console.error('Cannot select champion: Me is null', { players, playerName, userId: user?.id });
            return;
        }
        console.log(`Selecting champion ${champId} for ${me.id}`);
        const { error } = await supabase.from('players').update({ champion_id: champId }).eq('id', me.id);
        if (error) {
            console.error('Selection error:', error);
        } else {
            fetchPlayers(); // Immediate refresh
        }
    };

    const kickPlayer = async (playerId) => {
        if (!me?.is_host) return;
        await supabase.from('players').delete().eq('id', playerId);
    };

    const randomizeTeams = async () => {
        if (!me?.is_host) return;
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const updates = shuffled.map((p, i) => ({
            id: p.id,
            team_id: i < Math.ceil(players.length / 2) ? 1 : 2
        }));
        for (const update of updates) {
            await supabase.from('players').update({ team_id: update.team_id }).eq('id', update.id);
        }
    };

    const startGame = async () => {
        if (!me?.is_host) return;
        if (players.length < 1) return alert('O herói precisa de um propósito!');
        if (players.some(p => !p.is_ready)) return alert('Nem todos os guerreiros estão prontos!');

        console.log('Starting battle...');
        const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId);

        if (error) {
            console.error('Error starting game:', error);
            alert('Erro ao iniciar a batalha: ' + error.message);
        } else {
            console.log('Battle start signal sent successfully.');
            // Transition is handled by subscription/UPDATE or optimistic navigation
            setInGame(true);
        }
    };

    const team1 = players.filter(p => p.team_id === 1);
    const team2 = players.filter(p => p.team_id === 2);

    return (
        <div className="active-room-container">
            <header className="active-room-header">
                <div>
                    <h1 className="lobby-title" style={{ fontSize: '1.8rem' }}>
                        {room?.name || 'ENTRANDO...'}
                    </h1>
                    <p style={{ color: '#deb887', fontSize: '1.1rem', marginTop: '-5px' }}>REINO ID: {roomId.substring(0, 8).toUpperCase()}</p>
                    {/* Debug Info for Host */}
                    {me?.is_host && (
                        <div style={{ fontSize: '1rem', color: '#ff4444', border: '1px solid #ff4444', padding: '4px', marginTop: '8px' }}>
                            [DEBUG] HOST: SIM | STATUS: {room?.status} | JOGADORES: {players.length} | PRONTOS: {players.filter(p => p.is_ready).length}
                            <button onClick={() => { console.log('FORCE START'); isTransitioning.current = true; setInGame(true); }} style={{ marginLeft: '10px', background: 'red', color: 'white' }}>
                                FORÇAR INÍCIO
                            </button>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {me?.is_host && (
                        <button onClick={randomizeTeams} className="btn-primary" style={{ padding: '0.4rem 0.8rem' }}>
                            SORTEAR TIMES
                        </button>
                    )}
                    <button onClick={leaveRoom} className="btn-primary" style={{ background: '#451010', padding: '0.4rem 0.8rem' }}>
                        <LogOut size={20} style={{ marginRight: '8px' }} /> ABANDONAR
                    </button>
                </div>
            </header>

            <div className="active-room-main-layout" style={{ display: 'flex', flex: 1, width: '100%', maxWidth: '80rem', gap: '1.5rem', overflow: 'hidden' }}>
                <main style={{ flex: 1, overflowY: 'auto' }}>
                    <div className="panel-zelda" style={{ marginBottom: '2rem' }}>
                        <ChampionPicker onSelect={selectChampion} selectedId={me?.champion_id} />
                    </div>

                    <div className="main-content-layout" style={{ maxWidth: 'none' }}>
                        <div className="team-column">
                            <h3 className="team-header team-1-header">DEFENSORES (PORTO)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {team1.map(p => (
                                    <PlayerSlot key={p.id} player={p} isMe={p.id === me?.id} isHost={me?.is_host} onKick={() => kickPlayer(p.id)} />
                                ))}
                                {Array.from({ length: Math.max(0, 5 - team1.length) }).map((_, i) => (
                                    <div key={`empty-1-${i}`} className="player-slot" style={{ opacity: 0.2, borderStyle: 'dashed' }}>VAGA ABERTA</div>
                                ))}
                            </div>
                        </div>

                        <div className="team-column">
                            <h3 className="team-header team-2-header">INVASORES (MAR)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {team1.length > 5 && team1.slice(5).map(p => (
                                    <PlayerSlot key={p.id} player={p} isMe={p.id === me?.id} isHost={me?.is_host} onKick={() => kickPlayer(p.id)} />
                                ))}
                                {team2.map(p => (
                                    <PlayerSlot key={p.id} player={p} isMe={p.id === me?.id} isHost={me?.is_host} onKick={() => kickPlayer(p.id)} />
                                ))}
                                {Array.from({ length: Math.max(0, 5 - team2.length) }).map((_, i) => (
                                    <div key={`empty-2-${i}`} className="player-slot" style={{ opacity: 0.2, borderStyle: 'dashed' }}>VAGA ABERTA</div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="active-room-controls" style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem' }}>
                        <button
                            onClick={toggleReady}
                            disabled={!me?.champion_id}
                            className={`btn-primary ${me?.is_ready ? 'ready' : ''}`}
                            style={{
                                padding: '0.8rem 2.5rem',
                                fontSize: '1.5rem',
                                opacity: me?.champion_id ? 1 : 0.5,
                                cursor: me?.champion_id ? 'pointer' : 'not-allowed'
                            }}
                            title={!me?.champion_id ? 'Escolha um campeão primeiro!' : ''}
                        >
                            {me?.is_ready ? 'ESTOU PRONTO!' : 'MARCAR PRONTO'}
                        </button>

                        {me?.is_host && (
                            <button
                                onClick={startGame}
                                disabled={players.some(p => !p.is_ready)}
                                className="btn-primary"
                                style={{ padding: '0.8rem 2.5rem', fontSize: '1.5rem' }}
                            >
                                INICIAR BATALHA
                            </button>
                        )}
                    </div>
                </main>

                <Chat roomId={roomId} playerName={playerName} />
            </div>
        </div>
    );
};

const PlayerSlot = ({ player, isMe, isHost, onKick }) => (
    <div className={`player-slot ${player.is_ready ? 'ready' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="champ-avatar" style={{ width: '40px', height: '40px', fontSize: '1.5rem', margin: 0 }}>
                {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                    {player.name} {isMe && <span style={{ fontSize: '1rem', color: '#ffd700' }}>[VOCÊ]</span>}
                    {player.is_host && <Sword size={18} style={{ color: '#ffd700' }} />}
                    {isHost && !isMe && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onKick(); }}
                            title="Expulsar"
                            style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '4px' }}
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
                <div style={{ fontSize: '1.1rem', color: '#8a8a8a' }}>
                    {player.champion_id || 'Escolhendo herói...'}
                </div>
            </div>
        </div>
        {player.is_ready && <CheckCircle size={28} style={{ color: '#fff' }} />}
    </div>
);

export default ActiveRoom;
