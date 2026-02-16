import React, { useState, useEffect, useRef } from 'react';
import { Sword, Zap, Shield, ArrowUp } from 'lucide-react';

const MobileControls = ({ onInput, onAction }) => {
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const joystickBaseRef = useRef(null);
    const activeTouchId = useRef(null);

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
        e.preventDefault();
        const touch = e.touches[0];
        activeTouchId.current = touch.identifier;
        handleJoystickMove(e);
    };

    const handleJoystickMove = (e) => {
        e.preventDefault();
        if (!joystickBaseRef.current || activeTouchId.current === null) return;

        // Find the touch that matches our active ID
        const touch = Array.from(e.touches).find(t => t.identifier === activeTouchId.current);
        if (!touch) return;

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

        // Send normalized vector to game (compatible with ControlsSystem)
        const threshold = 0.2;
        if (limitedDist > maxDist * threshold) {
            const normalizedX = sx / maxDist;
            const normalizedY = sy / maxDist;
            onInput({ mx: normalizedX, my: normalizedY });
        } else {
            onInput({ mx: 0, my: 0 });
        }
    };

    const handleJoystickEnd = (e) => {
        e.preventDefault();
        activeTouchId.current = null;
        setJoystickPos({ x: 0, y: 0 });
        onInput({ mx: 0, my: 0 });
    };

    const btnStyle = (color = 'rgba(255, 255, 255, 0.2)') => ({
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: color,
        border: '3px solid rgba(255, 255, 255, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        backdropFilter: 'blur(6px)',
        touchAction: 'none',
        pointerEvents: 'auto',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
        transition: 'transform 0.1s',
        activeTransform: 'scale(0.95)'
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
            padding: '15px',
            paddingBottom: '25px'
        }}>

            {/* Left Side: Analog Joystick */}
            <div
                ref={joystickBaseRef}
                style={{
                    width: '140px',
                    height: '140px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '50%',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                    position: 'relative',
                    touchAction: 'none',
                    backdropFilter: 'blur(4px)'
                }}
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                onTouchCancel={handleJoystickEnd}
            >
                <div
                    style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(255, 255, 255, 0.6)',
                        borderRadius: '50%',
                        position: 'absolute',
                        transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                        boxShadow: '0 0 20px rgba(255,255,255,0.5)',
                        border: '2px solid rgba(255,255,255,0.8)',
                        transition: 'transform 0.05s'
                    }}
                />
            </div>

            {/* Right Side: Skill Cluster (Optimized for Thumb) */}
            <div style={{ position: 'relative', width: '200px', height: '200px', pointerEvents: 'none' }}>

                {/* Basic Attack (Large Center) */}
                <div
                    style={{
                        ...btnStyle('rgba(255, 215, 0, 0.5)'),
                        width: '90px', height: '90px',
                        position: 'absolute', right: '0px', bottom: '0px'
                    }}
                    onTouchStart={(e) => { e.preventDefault(); onAction('attack'); }}
                >
                    <Sword size={45} />
                </div>

                {/* Skill Q */}
                <div
                    style={{ ...btnStyle('rgba(255, 50, 50, 0.5)'), position: 'absolute', right: '110px', bottom: '10px' }}
                    onTouchStart={(e) => { e.preventDefault(); onAction('skill'); }}
                >
                    <Zap size={28} />
                    <span style={{ position: 'absolute', bottom: '-18px', fontSize: '11px', fontWeight: 'bold' }}>Q</span>
                </div>

                {/* Dash (Space) */}
                <div
                    style={{ ...btnStyle('rgba(0, 200, 255, 0.5)'), position: 'absolute', right: '5px', bottom: '110px' }}
                    onTouchStart={(e) => { e.preventDefault(); onAction('dash'); }}
                >
                    <ArrowUp size={28} style={{ transform: 'rotate(45deg)' }} />
                    <span style={{ position: 'absolute', top: '-18px', fontSize: '10px', fontWeight: 'bold' }}>DASH</span>
                </div>

                {/* Extra Skill W (Planned) */}
                <div
                    style={{ ...btnStyle('rgba(100, 100, 255, 0.3)'), position: 'absolute', right: '80px', bottom: '90px' }}
                    onTouchStart={(e) => { e.preventDefault(); onAction('skill2'); }}
                >
                    <Shield size={24} />
                    <span style={{ position: 'absolute', top: '-18px', fontSize: '11px', fontWeight: 'bold' }}>W</span>
                </div>

            </div>
        </div>
    );
};

export default MobileControls;
