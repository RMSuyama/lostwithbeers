import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';

export const useLobby = (user, playerName) => {
    const navigate = useNavigate();
    const { showAlert, showConfirm, showPrompt } = useModal();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showStats, setShowStats] = useState(false);

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
            const { data: allRooms } = await supabase.from('rooms').select('id');
            if (!allRooms) return;

            for (const r of allRooms) {
                const { data: pCount } = await supabase.from('players').select('id', { count: 'exact' }).eq('room_id', r.id);
                if (!pCount || pCount.length === 0) {
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
        const { data: activePlayer } = await supabase
            .from('players')
            .select('room_id, rooms(name)')
            .eq('user_id', user.id)
            .single();

        if (activePlayer) {
            const force = await showConfirm(`Herói, você já tem uma sessão ativa no reino "${activePlayer.rooms?.name || 'desconhecido'}". Deseja encerrar a sessão antiga e continuar aqui?`);
            if (force) {
                await supabase.from('players').delete().eq('user_id', user.id);
                return false; // Liberado para seguir
            }
            return true; // Bloqueado por escolha do usuário
        }
        return false;
    };

    const createRoom = async () => {
        if (!playerName?.trim()) return showAlert('Herói, identifique-se antes de iniciar sua jornada!');
        if (await checkAlreadyInRoom()) return;

        const roomName = await showPrompt('Nome da Sala (ex: "Reino dos Bravos"):');
        if (!roomName?.trim()) return; // Keep same logic (null or empty = cancel)

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
            showAlert('Falha na missão: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const joinRoom = async (roomId, isHost = false) => {
        if (!playerName?.trim()) return showAlert('Herói, identifique-se primeiro!');
        if (!isHost && await checkAlreadyInRoom()) return;

        localStorage.setItem('playerName', playerName);

        try {
            const { count } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', roomId);

            if (count >= 5) return showAlert('Esta sala está cheia! (Máx: 5)');

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
            showAlert('Caminho bloqueado! ' + err.message);
        }
    };

    return {
        rooms,
        loading,
        creating,
        showStats,
        setShowStats,
        createRoom,
        joinRoom,
        handleLogout
    };
};
