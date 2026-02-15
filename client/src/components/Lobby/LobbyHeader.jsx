import React from 'react';
import { Sword, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LobbyHeader = ({ user, handleLogout, showStats, setShowStats }) => {
    const navigate = useNavigate();

    return (
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
            </div>
        </header>
    );
};

export default LobbyHeader;
