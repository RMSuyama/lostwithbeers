import React, { useState } from 'react';
import { Shield, Map } from 'lucide-react';

const UserProfileCard = ({ playerName, setPlayerName, user, createRoom, creating }) => {
    const [selectedMode, setSelectedMode] = useState('standard');
    return (
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
                        className="hero-text-input hero-input-disabled"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        disabled={true}
                    />

                    <label className="label-technical" style={{ marginTop: '10px' }}>MODO DE JOGO</label>
                    <select
                        className="hero-text-input"
                        value={selectedMode}
                        onChange={(e) => setSelectedMode(e.target.value)}
                        style={{ background: '#000', color: '#ffd700', border: '1px solid #ffd700' }}
                    >
                        <option value="standard">MOBA Clássico</option>
                        <option value="boss_rush">Boss Rush (Coliseu)</option>
                    </select>

                    <div style={{ fontSize: '0.8rem', color: '#ffd700', marginTop: '4px', opacity: 0.8, textAlign: 'center' }}>
                        Vinculado a: {user?.email}
                    </div>
                    <button
                        onClick={() => createRoom(selectedMode)}
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
    );
};

export default UserProfileCard;
