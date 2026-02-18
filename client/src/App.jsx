import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Lobby from './components/Lobby/Lobby';
import ActiveRoom from './components/Lobby/ActiveRoom';
import Auth from './components/Auth/Auth';
import AdminPanel from './components/Admin/AdminPanel';
import Game from './game/Game';
import './index.css';
import { ModalProvider } from './context/ModalContext';
import CustomModal from './components/Common/CustomModal';
import { io } from 'socket.io-client';
import loadingBg from './loading_bg.png';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
let socket;
try {
    socket = io(SERVER_URL, {
        autoConnect: true,
        reconnection: true,
        timeout: 10000
    });
    socket.on('connect', () => console.log('[SOCKET] Connected to server at', SERVER_URL));
    socket.on('connect_error', (err) => console.error('[SOCKET] Connection Error:', err));
} catch (err) {
    console.error('[SOCKET] Failed to initialize socket.io:', err);
}

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
        // Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                // Force immediate cleanup on logout
                localStorage.removeItem('playerName');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // --- SECURE SESSION TIMEOUT (20 Minutes of Inactivity) ---
    useEffect(() => {
        if (!session) return;

        let idleTimer;
        const TIMEOUT_DURATION = 20 * 60 * 1000; // 20 Minutes

        const performLogout = async () => {
            console.log('[SECURITY] Inactivity timeout reached. Logging out...');
            await supabase.auth.signOut();
            setSession(null);
            window.location.href = '/login'; // Force hard redirect to clear all logic
        };

        const resetTimer = () => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(performLogout, TIMEOUT_DURATION);
        };

        // Interaction events to reset timer
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(evt => window.addEventListener(evt, resetTimer));

        resetTimer();

        return () => {
            if (idleTimer) clearTimeout(idleTimer);
            activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
        };
    }, [session]);

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
            socket={socket}
            setInGame={(val, champId, gameMode) => {
                if (val) navigate(`/game/${roomId}/${champId || 'jaca'}`, { state: { gameMode } });
            }}
        />
    );
};

const GameWrapper = ({ session }) => {
    const { roomId, championId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [playerName] = useState(localStorage.getItem('playerName') || session.user.email?.split('@')[0] || 'Guerreiro');

    return (
        <Game
            roomId={roomId}
            playerName={playerName}
            championId={championId || 'jaca'}
            initialGameMode={location.state?.gameMode}
            user={session.user}
            socket={socket}
            setInGame={(val) => {
                if (!val) navigate('/lobby');
            }}
        />
    );
};

export default App;
// VERCEL_TRIGGER_V5
