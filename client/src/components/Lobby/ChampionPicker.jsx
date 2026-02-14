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
