import React, { useEffect, useRef, useState } from 'react';

const MusicPlayer = () => {
    const [volume, setVolume] = useState(30);
    const [isMuted, setIsMuted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const playerRef = useRef(null);

    useEffect(() => {
        const initPlayer = () => {
            playerRef.current = new window.YT.Player('youtube-player', {
                videoId: 'jfKfPfyJRdk',
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    origin: window.location.origin
                },
                events: {
                    onReady: (event) => {
                        event.target.setVolume(volume);
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(tag, firstScript);
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        // Load from localStorage
        const savedVolume = localStorage.getItem('musicVolume');
        const savedMuted = localStorage.getItem('musicMuted');
        if (savedVolume) setVolume(parseInt(savedVolume));
        if (savedMuted) setIsMuted(savedMuted === 'true');

    }, []);

    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);
        localStorage.setItem('musicVolume', newVolume);
        if (playerRef.current && playerRef.current.setVolume) {
            playerRef.current.setVolume(newVolume);
        }
    };

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        localStorage.setItem('musicMuted', newMuted);
        if (playerRef.current) {
            if (newMuted) {
                playerRef.current.mute();
            } else {
                playerRef.current.unMute();
            }
        }
    };

    const togglePlay = () => {
        if (playerRef.current) {
            const state = playerRef.current.getPlayerState();
            if (state === 1) { // Playing
                playerRef.current.pauseVideo();
            } else {
                playerRef.current.playVideo();
            }
        }
    };

    return (
        <>
            <div id="youtube-player" style={{ width: '0', height: '0', overflow: 'hidden', position: 'fixed' }}></div>

            {/* Compact Music Icon */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    style={{
                        position: 'fixed',
                        bottom: '80px',
                        right: '20px',
                        background: '#ffd700',
                        border: '3px solid #000',
                        padding: '12px',
                        zIndex: 100,
                        cursor: 'pointer',
                        fontSize: '2rem',
                        boxShadow: '4px 4px #000',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                    🎵
                </button>
            )}

            {/* Expanded Player Panel */}
            {isExpanded && (
                <div style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.9)',
                    border: '3px solid #ffd700',
                    padding: '15px',
                    zIndex: 100,
                    fontFamily: 'VT323',
                    boxShadow: '5px 5px #000'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                    }}>
                        <div style={{ color: '#ffd700', fontSize: '1.5rem' }}>
                            🎵 LOFI RADIO 🎵
                        </div>
                        <button
                            onClick={() => setIsExpanded(false)}
                            style={{
                                background: '#ef4444',
                                border: 'none',
                                padding: '4px 10px',
                                fontFamily: 'VT323',
                                fontSize: '1.2rem',
                                cursor: 'pointer',
                                color: '#fff'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={togglePlay} style={{
                            background: '#22c55e',
                            border: 'none',
                            padding: '8px 15px',
                            fontFamily: 'VT323',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            color: '#fff'
                        }}>▶/⏸</button>

                        <button onClick={toggleMute} style={{
                            background: isMuted ? '#ef4444' : '#ffd700',
                            border: 'none',
                            padding: '8px 15px',
                            fontFamily: 'VT323',
                            fontSize: '1.2rem',
                            cursor: 'pointer'
                        }}>{isMuted ? '🔇' : '🔊'}</button>

                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={handleVolumeChange}
                            style={{ width: '100px' }}
                        />
                        <span style={{ color: '#fff', fontSize: '1.2rem' }}>{volume}%</span>
                    </div>
                </div>
            )}
        </>
    );
};

export default MusicPlayer;
