import React from 'react';
import './Lobby.css';

const CHAMPIONS = [
    { id: 'jaca', name: 'Jaca', description: 'Assassino: O predador do mangue rápido e agressivo.', color: '#15803d', theme: '🐊' },
    { id: 'djox', name: 'Djox', description: 'Lutador: O executor abissal com sua âncora.', color: '#334155', theme: '🦈' },
    { id: 'brunao', name: 'Brunão', description: 'Tanque: O guardião do porto e protetor da tripulação.', color: '#db2777', theme: '🐬' },
    { id: 'jubarbie', name: 'Jubarbie', description: 'Colosso: O titã das marés de impacto massivo.', color: '#1e3a8a', theme: '🐋' },
    { id: 'shiryu', name: 'Shiryu Suyama', description: 'Mago/DPS: O dragão ancestral de poder espiritual.', color: '#064e3b', theme: '🐲' },
    { id: 'charles', name: 'J. Charles', description: 'DPS Rítmico: O baterista de guerra do porto.', color: '#475569', theme: '🥁' },
    { id: 'gusto', name: 'Gusto', description: 'Mago Químico: Alquimista mestre em reações tóxicas.', color: '#78350f', theme: '🧪' },
    { id: 'kleyiton', name: 'Kleyiton', description: 'Controle: Designer que projeta campos geométricos.', color: '#b45309', theme: '🎨' },
    { id: 'milan', name: 'Milan', description: 'Ilusionista: O cartista fantasma mestre do blefe.', color: '#4a044e', theme: '🃏' },
    { id: 'enzo', name: 'Enzo', description: 'Assassino: O corsário elétrico das cordas.', color: '#0369a1', theme: '🎸' },
    { id: 'mayron', name: 'Mayron', description: 'Controle: O senhor dos portos e das correntes.', color: '#0d9488', theme: '🌪️' },
    { id: 'klebao', name: 'Klebão', description: 'Bruiser: O imperador lendário do chinelo branco.', color: '#ffffff', theme: '🩴' },
    { id: 'poisoncraft', name: 'Poisoncraft', description: 'Veneno: Baseado no Venomancer/Viper. DoT e Slow.', color: '#4d7c0f', theme: '🐍' },
    { id: 'foxz', name: 'Foxz', description: 'Necro: Baseado no Warlock. Soul Drain e Life Steal.', color: '#7e22ce', theme: '💀' },
    { id: 'peixe', name: 'Peixe', description: 'Paladino: Baseado no Paladino DPS. Holy Burst.', color: '#fbbf24', theme: '🐟' },
    { id: 'dan', name: 'Dan', description: 'Druida: Baseado no Druida Resto. Cura Massiva.', color: '#16a34a', theme: '🌿' },
    { id: 'huntskan', name: 'Huntskan', description: 'Naga: Baseado no Slardar. Stun e Atropelo.', color: '#0f766e', theme: '🔱' },
];

const ChampionPicker = ({ onSelect, selectedId }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 className="card-header" style={{ margin: 0, fontSize: '1rem' }}>
                01. ESCOLHA SEU CAMPEÃO
            </h3>
            <div className="champion-grid">
                {CHAMPIONS.map((champ) => (
                    <div
                        key={champ.id}
                        onClick={() => onSelect(champ.id)}
                        className={`champ-card ${selectedId === champ.id ? 'selected' : ''}`}
                        title={champ.description}
                    >
                        <div className="champ-avatar" style={{
                            background: champ.color,
                            boxShadow: selectedId === champ.id ? `0 0 10px ${champ.color}` : 'none'
                        }}>
                            {champ.theme}
                        </div>
                        <h3>{champ.name}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChampionPicker;
