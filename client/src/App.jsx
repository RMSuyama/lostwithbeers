import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Lobby from './components/Lobby/Lobby';
import ActiveRoom from './components/Lobby/ActiveRoom';
import Auth from './components/Auth/Auth';
import Game from './game/Game';
import './index.css';

const ProtectedRoute = ({ children, session }) => {
    if (!session) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) return (
        <div style={{ background: '#0b1a0b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd700', fontFamily: 'VT323', fontSize: '2rem' }}>
            CARREGANDO REINO...
        </div>
    );

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={!session ? <Auth /> : <Navigate to="/lobby" replace />} />

                <Route path="/lobby" element={
                    <ProtectedRoute session={session}>
                        <LobbyWrapper session={session} />
                    </ProtectedRoute>
                } />

                <Route path="/room/:roomId" element={
                    <ProtectedRoute session={session}>
                        <ActiveRoomWrapper session={session} />
                    </ProtectedRoute>
                } />

                <Route path="/game/:roomId/:championId" element={
                    <ProtectedRoute session={session}>
                        <GameWrapper session={session} />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to={session ? "/lobby" : "/login"} replace />} />
            </Routes>
        </BrowserRouter>
    );
}

// Wrappers to handle internal state and props inheritance
const LobbyWrapper = ({ session }) => {
    const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || session.user.email?.split('@')[0] || 'Guerreiro');

    return (
        <Lobby
            playerName={playerName}
            setPlayerName={setPlayerName}
            user={session.user}
        />
    );
};

const ActiveRoomWrapper = ({ session }) => {
    const navigate = useNavigate();
    const { roomId } = useParams();
    const playerName = localStorage.getItem('playerName') || session.user.email?.split('@')[0] || 'Guerreiro';

    return (
        <ActiveRoom
            roomId={roomId}
            playerName={playerName}
            user={session.user}
            leaveRoom={() => navigate('/lobby')}
            setInGame={(val, champId) => {
                if (val) navigate(`/game/${roomId}/${champId || 'jaca'}`);
            }}
        />
    );
};

const GameWrapper = ({ session }) => {
    const { roomId, championId } = useParams();
    const navigate = useNavigate();
    const [playerName] = useState(localStorage.getItem('playerName') || session.user.email?.split('@')[0] || 'Guerreiro');

    return (
        <Game
            roomId={roomId}
            playerName={playerName}
            championId={championId || 'jaca'}
            user={session.user}
            setInGame={(val) => {
                if (!val) navigate('/lobby');
            }}
        />
    );
};

export default App;
