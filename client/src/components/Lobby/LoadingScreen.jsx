import React from 'react';
import loadingBg from '../../loading_bg.png';

const LoadingScreen = ({ text = "Carregando..." }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${loadingBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 9999,
            paddingBottom: '5rem'
        }}>
            <div style={{
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '1rem 2rem',
                border: '2px solid #ffd700',
                color: '#ffd700',
                fontFamily: 'VT323, monospace',
                fontSize: '2rem',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.8)'
            }}>
                {text}
            </div>
        </div>
    );
};

export default LoadingScreen;
// Force rebuild
