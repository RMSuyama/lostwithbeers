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

const ActiveRoom = ({ roomId, playerName, user, leaveRoom, setInGame }) => {
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

        // Cleanup function to remove player from database
        const cleanupPlayer = async () => {
            if (!isTransitioning.current && user?.id) {
                console.log('Cleaning up player on exit...');
                await supabase.from('players').delete().eq('room_id', roomId).eq('user_id', user.id);
            }
        };

        // Handle browser back button and navigation
        const handleBeforeUnload = (e) => {
            if (!isTransitioning.current) {
                cleanupPlayer();
            }
        };

        const handlePopState = (e) => {
            console.log('Browser back button detected, cleaning up...');
            cleanupPlayer();
        };

        // Add event listeners for browser navigation
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

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
                    console.log('Room status changed to playing. Initiating transition with champion:', championIdRef.current);
                    isTransitioning.current = true;
                    setIsLoading(true);
                    setTimeout(() => {
                        setInGame(true, championIdRef.current);
                    }, 500); // Small delay for visual effect
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
            // Remove event listeners
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);

            supabase.removeChannel(channel);
            // ONLY cleanup if we are not moving to the game scene
            cleanupPlayer();
        };
    }, [roomId, user?.id]);

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
        if (players.some(p => !p.is_ready)) return showAlert('Nem todos os guerreiros estão prontos!');

        console.log('Starting battle...');
        setIsLoading(true);
        const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId);

        if (error) {
            console.error('Error starting game:', error);
            showAlert('Erro ao iniciar a batalha: ' + error.message);
            setIsLoading(false);
        } else {
            console.log('Battle start signal sent successfully. Champion:', championIdRef.current);
            isTransitioning.current = true;
            setTimeout(() => {
                setInGame(true, championIdRef.current);
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
