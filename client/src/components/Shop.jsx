import React from 'react';
import { Award, Heart, Zap, Shield, ChevronsUp, Crosshair } from 'lucide-react';

const UPGRADES = [
    { id: 'dmg', name: 'Dano Extra', cost: 50, icon: <Crosshair size={24} />, desc: '+5% Dano' },
    { id: 'atk_speed', name: 'Velocidade Atq', cost: 100, icon: <Zap size={24} />, desc: '-5% Cooldown' },
    { id: 'max_hp', name: 'Vida Máxima', cost: 75, icon: <Heart size={24} />, desc: '+20 HP' },
    { id: 'regen', name: 'Regeneração', cost: 120, icon: <ChevronsUp size={24} />, desc: '+1 HP/s' },
    { id: 'speed', name: 'Velocidade Mov.', cost: 80, icon: <Award size={24} />, desc: '+5% Speed' },
];

const Shop = ({ gold, buyUpgrade, onClose }) => {
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                background: '#1a1a1a', border: '4px solid #ffd700', padding: '30px',
                width: '600px', borderRadius: '8px', color: '#fff',
                fontFamily: 'VT323'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 style={{ margin: 0, color: '#ffd700', fontSize: '2.5rem' }}>MERCADOR</h1>
                    <div style={{ fontSize: '2rem', color: '#ffd700' }}>💰 {gold} G</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    {UPGRADES.map(u => (
                        <div key={u.id} style={{
                            background: '#333', padding: '15px', borderRadius: '4px',
                            border: '1px solid #555', display: 'flex', alignItems: 'center', gap: '15px'
                        }}>
                            <div style={{ color: '#ffd700' }}>{u.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.2rem', color: '#fff' }}>{u.name}</div>
                                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{u.desc}</div>
                            </div>
                            <button
                                onClick={() => buyUpgrade(u.id, u.cost)}
                                disabled={gold < u.cost}
                                style={{
                                    background: gold >= u.cost ? '#16a34a' : '#555',
                                    color: '#fff', border: 'none', padding: '8px 12px',
                                    borderRadius: '4px', cursor: gold >= u.cost ? 'pointer' : 'not-allowed',
                                    opacity: gold >= u.cost ? 1 : 0.5,
                                    fontSize: '1rem', fontFamily: 'VT323'
                                }}
                            >
                                {u.cost} G
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button onClick={onClose} style={{
                        background: '#ef4444', color: '#fff', border: 'none',
                        padding: '10px 30px', fontSize: '1.5rem', fontFamily: 'VT323',
                        cursor: 'pointer', borderRadius: '4px'
                    }}>
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Shop;
