import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Lobby from './components/Lobby/Lobby';
import Auth from './components/Auth/Auth';
import Game from './game/Game';
import './index.css';

function App() {
    const [session, setSession] = useState(null);
    const [isInGame, setIsInGame] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
    const [championId, setChampionId] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (!session) {
        return <Auth />;
    }

    // Use user metadata name as default if available, safely handle anonymous users without emails
    const displayName = session.user.email ? session.user.email.split('@')[0] : 'Guerreiro';
    const effectiveName = playerName || displayName;

    const handleSetInGame = (val, cid) => {
        if (cid) setChampionId(cid);
        setIsInGame(val);
    };

    return (
        <div className="App">
            {!isInGame ? (
                <Lobby
                    setInGame={handleSetInGame}
                    setRoomId={setRoomId}
                    playerName={effectiveName}
                    setPlayerName={setPlayerName}
                    user={session.user}
                />
            ) : (
                <Game roomId={roomId} playerName={effectiveName} championId={championId} user={session.user} setInGame={setIsInGame} />
            )}
        </div>
    );

}

export default App;
