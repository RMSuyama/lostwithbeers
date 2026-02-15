import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Sword, Shield, Lock } from 'lucide-react';
import { useModal } from '../../context/ModalContext';

import loadingBg from '../../loading_bg.png';

const Auth = () => {
    const { showAlert } = useModal();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                showAlert('Invocação enviada! Verifique seu e-mail para confirmar sua jornada.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error) {
            showAlert('Falha na Missão: ' + error.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${loadingBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            fontFamily: 'VT323, monospace'
        }}>
            {/* Dark Overlay for readability */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)'
            }}></div>

            <div className="panel-zelda" style={{
                position: 'relative',
                maxWidth: '400px',
                width: '90%',
                background: '#0b1a0b',
                border: '4px solid #ffd700',
                boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 10px #000'
            }}>
                <div className="card-header" style={{ borderBottom: '2px solid #ffd700', color: '#ffd700' }}>
                    <Lock size={32} />
                    <span style={{ textShadow: '2px 2px 0 #000' }}>{isSignUp ? 'NOVO HERÓI' : 'IDENTIFIQUE-SE'}</span>
                </div>

                <form onSubmit={handleAuth} className="hero-input-area" style={{ padding: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label-technical" style={{ color: '#ffd700' }}>CORREIO DO REINO (EMAIL)</label>
                        <input
                            type="email"
                            className="hero-text-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required={!loading}
                            placeholder="heroi@reino.com"
                            style={{
                                background: '#143411',
                                border: '2px solid #451a03',
                                color: '#fff'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label className="label-technical" style={{ color: '#ffd700' }}>PALAVRA MÁGICA (SENHA)</label>
                        <input
                            type="password"
                            className="hero-text-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={!loading}
                            placeholder="******"
                            style={{
                                background: '#143411',
                                border: '2px solid #451a03',
                                color: '#fff'
                            }}
                        />
                    </div>

                    {loading ? (
                        <div style={{
                            textAlign: 'center',
                            color: '#ffd700',
                            fontSize: '1.5rem',
                            animation: 'pulse 1s infinite'
                        }}>
                            ABRINDO PORTAIS...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                type="submit"
                                className="hero-btn-primary"
                                style={{
                                    width: '100%',
                                    background: '#78350f',
                                    border: '2px solid #ffd700',
                                    color: '#ffd700',
                                    textShadow: '1px 1px 0 #000'
                                }}
                            >
                                {isSignUp ? 'CRIAR CONTA' : 'LOGAR'}
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffd700',
                            cursor: 'pointer',
                            fontFamily: 'VT323',
                            fontSize: '1.2rem',
                            marginTop: '1.5rem',
                            width: '100%',
                            textDecoration: 'underline',
                            opacity: 0.8
                        }}
                    >
                        {isSignUp ? 'Já possui uma lenda? Entre aqui' : 'Nova jornada? Registre-se'}
                    </button>
                </form>

                <div className="card-footer" style={{ borderTop: '2px solid #ffd700', color: '#ffd700' }}>
                    <Shield size={24} />
                    <span>Protegido pela Triforce</span>
                </div>
            </div>
        </div>
    );
};

export default Auth;
