import React, { useState, useEffect } from 'react';
import { Sword, Zap, Shield, ArrowUp } from 'lucide-react';

const MobileControls = ({ onInput }) => {
    const [activeInputs, setActiveInputs] = useState(new Set());

    const handlePress = (key) => {
        setActiveInputs(prev => {
            const next = new Set(prev);
            next.add(key);
            onInput(next);
            return next;
        });
    };

    const handleRelease = (key) => {
        setActiveInputs(prev => {
            const next = new Set(prev);
            next.delete(key);
            onInput(next);
            return next;
        });
    };

    // Prevent default touch behaviors like zooming
    useEffect(() => {
        const preventDefault = (e) => {
            if (e.touches.length > 1) e.preventDefault();
        };
        document.addEventListener('touchstart', preventDefault, { passive: false });
        return () => document.removeEventListener('touchstart', preventDefault);
    }, []);

    const btnStyle = (key) => ({
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: activeInputs.has(key) ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)',
        border: '2px solid rgba(255, 255, 255, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        backdropFilter: 'blur(4px)',
        touchAction: 'none',
        userSelect: 'none'
    });

    return (
        <div className="mobile-controls-overlay" style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            pointerEvents: 'none',
            zIndex: 100
        }}>
            {/* Left Side: Movement D-Pad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gap: '5px', pointerEvents: 'auto' }}>
                <div />
                <div
                    style={btnStyle('ArrowUp')}
                    onTouchStart={() => handlePress('ArrowUp')}
                    onTouchEnd={() => handleRelease('ArrowUp')}
                ><ArrowUp /></div>
                <div />

                <div
                    style={btnStyle('ArrowLeft')}
                    onTouchStart={() => handlePress('ArrowLeft')}
                    onTouchEnd={() => handleRelease('ArrowLeft')}
                ><ArrowUp style={{ transform: 'rotate(-90deg)' }} /></div>
                <div
                    style={btnStyle('ArrowDown')}
                    onTouchStart={() => handlePress('ArrowDown')}
                    onTouchEnd={() => handleRelease('ArrowDown')}
                ><ArrowUp style={{ transform: 'rotate(180deg)' }} /></div>
                <div
                    style={btnStyle('ArrowRight')}
                    onTouchStart={() => handlePress('ArrowRight')}
                    onTouchEnd={() => handleRelease('ArrowRight')}
                ><ArrowUp style={{ transform: 'rotate(90deg)' }} /></div>
            </div>

            {/* Right Side: Skill Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', maxWidth: '160px', justifyContent: 'flex-end', pointerEvents: 'auto' }}>
                <div
                    style={{ ...btnStyle('q'), width: '70px', height: '70px', background: activeInputs.has('q') ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 0, 0, 0.15)' }}
                    onTouchStart={() => handlePress('q')}
                    onTouchEnd={() => handleRelease('q')}
                >
                    <Sword size={32} />
                </div>

                <div
                    style={{ ...btnStyle(' '), width: '70px', height: '70px', background: activeInputs.has(' ') ? 'rgba(0, 255, 255, 0.4)' : 'rgba(0, 255, 255, 0.15)' }}
                    onTouchStart={() => handlePress(' ')}
                    onTouchEnd={() => handleRelease(' ')}
                >
                    <Zap size={32} />
                </div>
            </div>
        </div>
    );
};

export default MobileControls;
