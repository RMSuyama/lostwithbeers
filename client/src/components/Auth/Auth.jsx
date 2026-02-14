import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Sword, Shield, Lock } from 'lucide-react';

const Auth = () => {
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
                alert('Invocação enviada! Verifique seu e-mail para confirmar sua jornada.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error) {
            alert('Falha na Missão: ' + error.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="lobby-container" style={{ justifyContent: 'center' }}>
            <div className="panel-zelda" style={{ maxWidth: '400px' }}>
                <div className="card-header">
                    <Lock size={32} />
                    <span>{isSignUp ? 'NOVO HERÓI' : 'IDENTIFIQUE-SE'}</span>
                </div>

                <form onSubmit={handleAuth} className="hero-input-area">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label-technical">CORREIO DO REINO (EMAIL)</label>
                        <input
                            type="email"
                            className="hero-text-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required={!loading}
                            placeholder="heroi@reino.com"
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label className="label-technical">PALAVRA MÁGICA (SENHA)</label>
                        <input
                            type="password"
                            className="hero-text-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={!loading}
                            placeholder="******"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="hero-btn-primary"
                            style={{ width: '100%' }}
                        >
                            {loading ? 'CONVOCANDO...' : (isSignUp ? 'CRIAR CONTA' : 'LOGAR')}
                        </button>

                    </div>

                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#deb887',
                            cursor: 'pointer',
                            fontFamily: 'VT323',
                            fontSize: '1.4rem',
                            marginTop: '1.5rem',
                            width: '100%',
                            textDecoration: 'underline'
                        }}
                    >
                        {isSignUp ? 'Já possui uma lenda? Entre aqui' : 'Nova jornada? Registre-se'}
                    </button>
                </form>

                <div className="card-footer">
                    <Shield size={24} />
                    <span>Protegido pela Triforce</span>
                </div>
            </div>
        </div>
    );
};

export default Auth;
