import React from 'react';

const LobbyControls = ({ me, players, toggleReady, startGame }) => {
    return (
        <div className="active-room-controls">
            <button
                onClick={toggleReady}
                disabled={!me?.champion_id}
                className={`btn-primary ${me?.is_ready ? 'ready' : ''}`}
                title={!me?.champion_id ? 'Escolha um campeão!' : ''}
            >
                {me?.is_ready ? 'PRONTO!' : 'MARCAR PRONTO'}
            </button>

            {me?.is_host && (
                <button
                    onClick={startGame}
                    disabled={players.some(p => !p.is_ready)}
                    className="btn-primary"
                >
                    INICIAR
                </button>
            )}
        </div>
    );
};

export default LobbyControls;
