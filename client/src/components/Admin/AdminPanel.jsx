import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, AlertTriangle, Activity } from 'lucide-react';

const AdminPanel = ({ session }) => {
    const navigate = useNavigate();
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [stats, setStats] = useState({ rooms: 0, playing: 0 });

    useEffect(() => {
        // Strict Admin Check
        if (session?.user?.email !== 'admin@lwb.com') {
            alert('Acesso Negado: Área restrita a Administradores da LWB.');
            navigate('/lobby');
            return;
        }

        // Fetch Room Stats
        const fetchStats = async () => {
            const { data: rooms } = await supabase.from('rooms').select('status');
            if (rooms) {
                setStats({
                    rooms: rooms.length,
                    playing: rooms.filter(r => r.status === 'playing').length
                });
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);

        // Presence Tracking (Global)
        const channel = supabase.channel('online-users');
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = [];
                for (const id in state) {
                    // Each ID might have multiple "presences" (tabs)
                    state[id].forEach(p => {
                        users.push({
                            id: p.user_id,
                            email: p.email,
                            name: p.name,
                            online_at: p.online_at,
                            current_room: p.room_id || 'Lobby'
                        });
                    });
                }
                // Deduplicate by user_id if needed, or show all sessions
                setOnlineUsers(users.sort((a, b) => new Date(b.online_at) - new Date(a.online_at)));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Admin tracks themselves too, but we mainly want to Listen
                }
            });

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [session, navigate]);

    if (!session || session.user.email !== 'admin@lwb.com') return null;

    return (
        <div style={{ padding: '2rem', color: '#ffd700', fontFamily: 'VT323', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
                <Shield size={40} color="#ef4444" />
                <h1 style={{ fontSize: '3rem', margin: 0 }}>PAINEL ADMINISTRATIVO LWB</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div className="stat-card" style={cardStyle}>
                    <Activity size={32} color="#10b981" />
                    <div>
                        <div style={{ fontSize: '2rem' }}>{onlineUsers.length}</div>
                        <div style={{ opacity: 0.7 }}>USUÁRIOS ONLINE</div>
                    </div>
                </div>
                <div className="stat-card" style={cardStyle}>
                    <Users size={32} color="#3b82f6" />
                    <div>
                        <div style={{ fontSize: '2rem' }}>{stats.rooms}</div>
                        <div style={{ opacity: 0.7 }}>SALAS ATIVAS</div>
                    </div>
                </div>
                <div className="stat-card" style={cardStyle}>
                    <AlertTriangle size={32} color="#ef4444" />
                    <div>
                        <div style={{ fontSize: '2rem' }}>{stats.playing}</div>
                        <div style={{ opacity: 0.7 }}>EM PARTIDA</div>
                    </div>
                </div>
            </div>

            <h2 style={{ fontSize: '2rem', borderBottom: '1px solid #333', paddingBottom: '10px' }}>USUÁRIOS CONECTADOS</h2>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem' }}>
                    <thead style={{ background: '#111', color: '#888' }}>
                        <tr>
                            <th style={thStyle}>EMAIL / CONTA</th>
                            <th style={thStyle}>NOME (NICK)</th>
                            <th style={thStyle}>LOCAL ATUAL</th>
                            <th style={thStyle}>CONECTADO EM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {onlineUsers.map((u, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #222', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                <td style={tdStyle}>{u.email}</td>
                                <td style={tdStyle}><span style={{ color: '#fff' }}>{u.name}</span></td>
                                <td style={tdStyle}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: u.current_room === 'Lobby' ? '#334155' : '#166534',
                                        fontSize: '0.9rem'
                                    }}>
                                        {u.current_room === 'Lobby' ? 'NO LOBBY' : `SALA: ${u.current_room}`}
                                    </span>
                                </td>
                                <td style={tdStyle}>{new Date(u.online_at).toLocaleTimeString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {onlineUsers.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Nenhum usuário detectado (além de você?)...</div>
                )}
            </div>

            <button
                onClick={() => navigate('/lobby')}
                style={{ marginTop: '30px', padding: '10px 20px', background: 'transparent', border: '1px solid #555', color: '#888', cursor: 'pointer', fontFamily: 'VT323', fontSize: '1.2rem' }}
            >
                VOLTAR AO LOBBY
            </button>
        </div>
    );
};

const cardStyle = {
    background: '#1e293b',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    border: '1px solid #334155'
};

const thStyle = { padding: '15px', textAlign: 'left', fontWeight: 'normal' };
const tdStyle = { padding: '15px' };

export default AdminPanel;
