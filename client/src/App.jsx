import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Lobby from './components/Lobby/Lobby';
import ActiveRoom from './components/Lobby/ActiveRoom';
import Auth from './components/Auth/Auth';
import AdminPanel from './components/Admin/AdminPanel';
import Game from './game/Game';
import './index.css';
import { ModalProvider } from './context/ModalContext';
import CustomModal from './components/Common/CustomModal';

import loadingBg from './loading_bg.png';

const ProtectedRoute = ({ children, session }) => {
    if (!session) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    return (
        <ModalProvider>
            <AppContent />
            <CustomModal />
        </ModalProvider>
    );
}

function AppContent() {
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

    // Global Presence Tracking for "One Room" Policy & Admin Monitoring
    useEffect(() => {
        if (!session?.user) return;

        const roomChannel = supabase.channel('online-users');
        const userStatus = {
            user_id: session.user.id,
            email: session.user.email,
            name: localStorage.getItem('playerName') || session.user.email.split('@')[0],
            online_at: new Date().toISOString(),
            room_id: 'Lobby' // Default, updated by Game/ActiveRoom
        };

        roomChannel
            .on('presence', { event: 'sync' }, () => {
                // We can use this to detect if *I* am connected elsewhere
                // const state = roomChannel.presenceState();
                // ... logic to prevent duplicate tabs ...
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await roomChannel.track(userStatus);
                }
            });

        return () => {
            supabase.removeChannel(roomChannel);
        };
    }, [session]);

    if (loading) return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffd700',
            fontFamily: 'VT323',
            fontSize: '2rem',
            backgroundImage: `url(${loadingBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            textShadow: '2px 2px 0 #000'
        }}>
            <div style={{
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '2rem',
                border: '2px solid #ffd700',
                borderRadius: '8px',
                textAlign: 'center'
            }}>
                CARREGANDO REINO...
            </div>
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

                <Route path="/admin" element={
                    <ProtectedRoute session={session}>
                        <AdminPanel session={session} />
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
// VERCEL_TRIGGER_V5
