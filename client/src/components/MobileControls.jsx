import React, { useState, useEffect, useRef } from 'react';
import { Sword, Zap, Shield, ArrowUp, ZapIcon } from 'lucide-react';

const MobileControls = ({ onInput, onAction }) => {
    const [isJoystickActive, setIsJoystickActive] = useState(false);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const joystickBaseRef = useRef(null);
    const joystickStickRef = useRef(null);
    const lastAngle = useRef(null);

    // Prevent default touch behaviors
    useEffect(() => {
        const preventDefault = (e) => {
            if (e.touches.length > 1) e.preventDefault();
        };
        document.addEventListener('touchstart', preventDefault, { passive: false });
        document.addEventListener('touchmove', preventDefault, { passive: false });
        return () => {
            document.removeEventListener('touchstart', preventDefault);
            document.removeEventListener('touchmove', preventDefault);
        };
    }, []);

    const handleJoystickStart = (e) => {
        setIsJoystickActive(true);
        handleJoystickMove(e);
    };

    const handleJoystickMove = (e) => {
        if (!joystickBaseRef.current) return;
        const touch = e.touches[0];
        const rect = joystickBaseRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = rect.width / 2;

        const angle = Math.atan2(dy, dx);
        const limitedDist = Math.min(dist, maxDist);

        const sx = Math.cos(angle) * limitedDist;
        const sy = Math.sin(angle) * limitedDist;

        setJoystickPos({ x: sx, y: sy });

        // Map to keys for compatibility
        const threshold = 0.3;
        const activeKeys = new Set();
        if (limitedDist > maxDist * threshold) {
            if (Math.abs(Math.cos(angle)) > 0.38) { // Left/Right
                if (dx > 0) activeKeys.add('ArrowRight'); else activeKeys.add('ArrowLeft');
            }
            if (Math.abs(Math.sin(angle)) > 0.38) { // Up/Down
                if (dy > 0) activeKeys.add('ArrowDown'); else activeKeys.add('ArrowUp');
            }
        }
        onInput(activeKeys);
    };

    const handleJoystickEnd = () => {
        setIsJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        onInput(new Set());
    };

    const btnStyle = (color = 'rgba(255, 255, 255, 0.2)') => ({
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: color,
        border: '2px solid rgba(255, 255, 255, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        backdropFilter: 'blur(4px)',
        touchAction: 'none',
        pointerEvents: 'auto',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
    });

    return (
        <div className="mobile-overlay" style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: '20px'
        }}>

            {/* Left Side: Analog Joystick */}
            <div
                ref={joystickBaseRef}
                style={{
                    width: '120px',
                    height: '120px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                    position: 'relative',
                    touchAction: 'none'
                }}
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
            >
                <div
                    style={{
                        width: '50px',
                        height: '50px',
                        background: 'rgba(255, 255, 255, 0.4)',
                        borderRadius: '50%',
                        position: 'absolute',
                        transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                        boxShadow: '0 0 15px rgba(255,255,255,0.3)'
                    }}
                />
            </div>

            {/* Right Side: Skill Cluster (Ergonomic Arc) */}
            <div style={{ position: 'relative', width: '180px', height: '180px', pointerEvents: 'none' }}>

                {/* Basic Attack (Large Center) */}
                <div
                    style={{
                        ...btnStyle('rgba(255, 215, 0, 0.4)'),
                        width: '80px', height: '80px',
                        position: 'absolute', right: '10px', bottom: '10px'
                    }}
                    onTouchStart={() => onAction('attack')}
                >
                    <Sword size={40} />
                </div>

                {/* Skill Q */}
                <div
                    style={{ ...btnStyle('rgba(255, 0, 0, 0.3)'), position: 'absolute', right: '100px', bottom: '15px' }}
                    onTouchStart={() => onAction('skill')}
                >
                    <Zap size={24} />
                    <span style={{ position: 'absolute', bottom: '-15px', fontSize: '10px' }}>Q</span>
                </div>

                {/* Dash (Space) */}
                <div
                    style={{ ...btnStyle('rgba(0, 255, 255, 0.3)'), position: 'absolute', right: '10px', bottom: '100px' }}
                    onTouchStart={() => onAction('dash')}
                >
                    <ArrowUp size={24} style={{ transform: 'rotate(45deg)' }} />
                    <span style={{ position: 'absolute', top: '-15px', fontSize: '10px' }}>SPACE</span>
                </div>

                {/* Extra Skill W (Planned) */}
                <div
                    style={{ ...btnStyle('rgba(255, 255, 255, 0.1)'), position: 'absolute', right: '70px', bottom: '80px', opacity: 0.5 }}
                >
                    <Shield size={20} />
                    <span style={{ position: 'absolute', top: '-15px', fontSize: '10px' }}>W</span>
                </div>

            </div>
        </div>
    );
};

export default MobileControls;
