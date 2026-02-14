import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

const PlayerStats = ({ user }) => {
    const [personalStats, setPersonalStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
        try {
            // Personal stats
            const { data: personal } = await supabase
                .from('player_stats')
                .select('*')
                .eq('user_id', user.id)
                .single();

            setPersonalStats(personal);

            // Leaderboard
            const { data: leaders } = await supabase
                .from('player_stats')
                .select('*, users(email)')
                .order('total_damage', { ascending: false })
                .limit(10);

            setLeaderboard(leaders || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setLoading(false);
        }
    };

    if (loading) return <div style={{ color: '#ffd700', fontFamily: 'VT323', fontSize: '2rem' }}>CARREGANDO STATS...</div>;

    const getMostPlayedChampion = () => {
        if (!personalStats?.champion_stats) return 'N/A';
        const champStats = personalStats.champion_stats;
        const sorted = Object.entries(champStats).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0]?.toUpperCase() || 'N/A';
    };

    return (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontFamily: 'VT323', color: '#fff', padding: '20px' }}>
            {/* Personal Stats */}
            <div style={{ flex: '1 1 300px', background: 'rgba(0,0,0,0.8)', border: '4px solid #ffd700', padding: '20px', boxShadow: '5px 5px #000' }}>
                <h2 style={{ color: '#ffd700', fontSize: '2.5rem', margin: '0 0 15px 0', borderBottom: '3px solid #ffd700' }}>SUAS ESTATÍSTICAS</h2>
                {personalStats ? (
                    <>
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                            <span style={{ color: '#ffd700' }}>JOGOS:</span> {personalStats.games_played}
                        </div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                            <span style={{ color: '#ffd700' }}>BICHOS MORTOS:</span> {personalStats.total_kills}
                        </div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                            <span style={{ color: '#ffd700' }}>DANO TOTAL:</span> {personalStats.total_damage.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                            <span style={{ color: '#ffd700' }}>MELHOR WAVE:</span> {personalStats.highest_wave}
                        </div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                            <span style={{ color: '#ffd700' }}>CAMPEÃO FAVORITO:</span> {getMostPlayedChampion()}
                        </div>
                    </>
                ) : (
                    <p style={{ fontSize: '1.5rem' }}>Jogue sua primeira partida!</p>
                )}
            </div>

            {/* Leaderboard */}
            <div style={{ flex: '1 1 400px', background: 'rgba(0,0,0,0.8)', border: '4px solid #ffd700', padding: '20px', boxShadow: '5px 5px #000' }}>
                <h2 style={{ color: '#ffd700', fontSize: '2.5rem', margin: '0 0 15px 0', borderBottom: '3px solid #ffd700' }}>TOP 10 - REINO</h2>
                {leaderboard.map((player, idx) => (
                    <div key={player.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px',
                        background: player.user_id === user?.id ? 'rgba(255,215,0,0.2)' : 'transparent',
                        borderBottom: '1px solid #333',
                        fontSize: '1.3rem'
                    }}>
                        <span style={{ color: idx < 3 ? '#ffd700' : '#fff' }}>
                            {idx + 1}. {player.users?.email?.split('@')[0] || 'Anônimo'}
                        </span>
                        <span style={{ color: '#22c55e' }}>{player.total_damage.toLocaleString()} DMG</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerStats;
