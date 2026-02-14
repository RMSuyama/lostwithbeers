import React from 'react';
import './Lobby.css';

const CHAMPIONS = [
    { id: 'jaca', name: 'Jaca', description: 'Assassino: Rápido e agressivo com seu facão.', color: '#15803d', theme: '🐊' },
    { id: 'djox', name: 'Djox', description: 'Lutador: Impacto pesado com âncora abissal.', color: '#334155', theme: '🦈' },
    { id: 'brunao', name: 'Brunão', description: 'Tanque: O guardião cor-de-rosa com seu escudo.', color: '#db2777', theme: '🐬' },
    { id: 'jubarbie', name: 'Jubarbie', description: 'Colosso: Titã do oceano de impacto massivo.', color: '#1e3a8a', theme: '🐋' },
    { id: 'shiryusuyama', name: 'Shiryu Suyama', description: 'Dragão: Mestre dos céus com poder ancestral.', color: '#dc2626', theme: '🐉' },
    { id: 'charles', name: 'J. Charles', description: 'Atirador: Precisão naval com pistolas duplas.', color: '#475569', theme: '🔫' },
    { id: 'kleyiton', name: 'Kleyiton', description: 'Engenheiro: Mestre das engenhocas e torretas.', color: '#b45309', theme: '⚙️' },
    { id: 'gusto', name: 'Gusto', description: 'Brutamontes: O taverneiro que arremessa barris.', color: '#78350f', theme: '🍻' },
    { id: 'milan', name: 'Milan', description: 'Estrategista: Místico espectral e ilusionista.', color: '#4a044e', theme: '🧠' },
    { id: 'enzo', name: 'Enzo', description: 'Assassino: Corsário elétrico de alta mobilidade.', color: '#0369a1', theme: '⚡' },
    { id: 'mayron', name: 'Mayron', description: 'Controle: Senhor das correntes e ventos.', color: '#0d9488', theme: '🌪️' },
];

const ChampionPicker = ({ onSelect, selectedId }) => {
    return (
        <div>
            <h3 className="card-header">
                01. ESCOLHA SEU CAMPEÃO DO PORTO
            </h3>
            <div className="champion-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                {CHAMPIONS.map((champ) => (
                    <div
                        key={champ.id}
                        onClick={() => onSelect(champ.id)}
                        className={`champ-card ${selectedId === champ.id ? 'selected' : ''}`}
                    >
                        <div className="champ-avatar" style={{
                            background: champ.color,
                            border: '3px solid #000',
                            boxShadow: selectedId === champ.id ? `0 0 10px ${champ.color}` : 'none',
                            fontSize: '1.8rem'
                        }}>
                            {champ.theme}
                        </div>
                        <h4 style={{ fontSize: '1.1rem', color: '#ffd700', textTransform: 'uppercase' }}>{champ.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '2px', lineHeight: '1.1' }}>{champ.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChampionPicker;
