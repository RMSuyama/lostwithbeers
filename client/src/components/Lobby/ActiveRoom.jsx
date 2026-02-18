import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useModal } from '../../context/ModalContext';
import VoiceChat from '../VoiceChat';
import ChampionPicker from './ChampionPicker';
import LobbyHeader from './LobbyHeader';
import PlayerList from './PlayerList';
import LobbyControls from './LobbyControls';
import LoadingScreen from './LoadingScreen';
import './Lobby.css';

const ActiveRoom = ({ roomId, playerName, user, leaveRoom, setInGame, socket }) => {
    const { showAlert } = useModal();
    const [players, setPlayers] = useState([]);
    const [me, setMe] = useState(null);
    const [room, setRoom] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const isTransitioning = useRef(false);
    const championIdRef = useRef('jaca'); // Default fallback

    useEffect(() => {
        fetchRoom();
        fetchPlayers();

        // Presence & Real-time Channel
        const channel = supabase.channel(`room:${roomId}`, {
            config: { presence: { key: user?.id || playerName } }
        });

        const cleanupPlayer = async () => {
            // ONLY cleanup if we are NOT transitioning to the game AND we are actually leaving the room routes
            if (!isTransitioning.current && user?.id) {
                const currentPath = window.location.pathname;
                // Use a more robust check for path
                const stillInRoom = currentPath.includes(roomId);

                if (!stillInRoom) {
                    console.log('[ActiveRoom] Cleanup: User left room path:', currentPath);
                    await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', user.id);
                }
            }
        };

        // Tab close/External navigation (Only for hard escapes)
        const handleBeforeUnload = (e) => {
            if (!isTransitioning.current && user?.id) {
                // Fire and forget deletion
                supabase.from('players').delete().eq('room_id', roomId).eq('user_id', user.id);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        channel
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'players',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                fetchPlayers();
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
                    isTransitioning.current = true;
                    setIsLoading(true);
                    setTimeout(() => {
                        setInGame(true, championIdRef.current, payload.new.game_mode);
                    }, 500);
                }
            })
            .on('presence', { event: 'sync' }, () => {
                // Sync presence? Not strictly needed if we use it for cleanup
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                // When someone else leaves according to Presence, we clean up their DB record
                leftPresences.forEach(async (p) => {
                    if (p.user_id && p.user_id !== user?.id) {
                        console.log('[ActiveRoom] Presence leave detected for:', p.user_id);
                        await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', p.user_id);

                        // Check if room is empty
                        const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('room_id', roomId);
                        if (count === 0) {
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

        if (socket) {
            console.log('[ActiveRoom] Joining Socket.IO lobby room:', roomId);
            socket.emit('join_room', { roomId, userId: user?.id });
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            supabase.removeChannel(channel);
            // Delay cleanup slightly to avoid Strict Mode double-kill
            setTimeout(cleanupPlayer, 200);
        };
    }, [roomId, user?.id, socket]);

    const fetchRoom = async () => {
        const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        setRoom(data);
    };

    const fetchPlayers = async () => {
        console.log('[ActiveRoom] Fetching players for room:', roomId);
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true });

        if (error) {
            console.error('[ActiveRoom] Error fetching players:', error);
            return;
        }

        console.log('[ActiveRoom] Players fetched:', data);
        const playerList = data || [];
        setPlayers(playerList);

        // Find "me" based on user_id (most reliable) or name
        const myPlayer = playerList.find(p => p.user_id === user?.id || p.name === playerName);
        setMe(myPlayer);

        // Self-Healing: If no host exists, promote the oldest player (index 0)
        const hasHost = playerList.some(p => p.is_host);
        if (playerList.length > 0 && !hasHost) {
            console.warn('[ActiveRoom] Room has no host! Promoting oldest player...');
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
        if (myPlayer?.champion_id) {
            championIdRef.current = myPlayer.champion_id;
        }

        // If I was in a room but my record is gone, leave
        if (playerList.length > 0 && !myPlayer) {
            console.warn('[ActiveRoom] My player record not found, leaving room.');
            leaveRoom();
        }
    };

    const refreshRoom = () => {
        console.log('[ActiveRoom] Manual Refresh Triggered');
        fetchRoom();
        fetchPlayers();
    };

    const toggleReady = async () => {
        if (!me) return;

        // Prevent marking ready without selecting a champion
        if (!me.champion_id && !me.is_ready) {
            showAlert('Escolha seu campeão antes de marcar como pronto!');
            return;
        }

        console.log('Toggling ready state:', !me.is_ready);
        const { error } = await supabase.from('players').update({ is_ready: !me.is_ready }).eq('id', me.id);
        if (!error) fetchPlayers();
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

    const startGame = async () => {
        if (!me?.is_host) return;
        if (players.length < 1) return showAlert('O herói precisa de um propósito!');
        if (players.filter(p => !p.is_host).some(p => !p.is_ready)) return showAlert('Nem todos os guerreiros estão prontos!');
        if (!me?.champion_id) return showAlert('Escolha seu campeão antes de liderar a batalha!');

        console.log('[ActiveRoom] Starting battle... Signal sent to Supabase.');
        setIsLoading(true);
        const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId);

        // Notify server to start game loop via socket
        if (socket) {
            console.log('[ActiveRoom] Emitting start_game to server via socket.');
            socket.emit('start_game', { roomId });
        }

        if (error) {
            console.error('[ActiveRoom] Error starting game:', error);
            showAlert('Erro ao iniciar a batalha: ' + error.message);
            setIsLoading(false);
        } else {
            console.log('[ActiveRoom] Battle start signal success. Transitioning in 500ms... Champ:', championIdRef.current);
            isTransitioning.current = true;
            setTimeout(() => {
                console.log('[ActiveRoom] Calling setInGame(true)');
                setInGame(true, championIdRef.current, room?.game_mode);
            }, 500);
        }
    };

    const forceStart = () => {
        console.log('FORCE START');
        isTransitioning.current = true;
        setIsLoading(true);
        setTimeout(() => {
            setInGame(true, championIdRef.current);
        }, 500);
    };

    if (isLoading) {
        return <LoadingScreen text="PREPARANDO O REINO..." />;
    }

    return (
        <div className="active-room-container">
            <LobbyHeader
                roomId={roomId}
                isHost={me?.is_host}
                roomStatus={room?.status}
                playerCount={players.length}
                readyCount={players.filter(p => p.is_ready).length}
                onLeave={leaveRoom}
                onForceStart={forceStart}
                onRefresh={refreshRoom}
            />

            <div className="active-room-main-layout">
                <div className="room-column-players">
                    <PlayerList
                        players={players}
                        me={me}
                        kickPlayer={kickPlayer}
                    />
                    <LobbyControls
                        me={me}
                        players={players}
                        toggleReady={toggleReady}
                        startGame={startGame}
                    />
                </div>

                <div className="room-column-center">
                    <div className="panel-zelda no-shrink">
                        <ChampionPicker onSelect={selectChampion} selectedId={me?.champion_id} />
                    </div>
                </div>
            </div>

            <VoiceChat
                roomId={roomId}
                userId={user?.id}
                playerName={playerName}
                minimal={true}
            />
        </div>
    );
};

export default ActiveRoom;
