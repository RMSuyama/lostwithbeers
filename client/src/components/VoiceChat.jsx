import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Mic, MicOff, Headphones, VolumeX } from 'lucide-react';
import { supabase } from '../supabaseClient';

const VoiceChat = ({ roomId, userId, playerName, muted = false }) => {
    const [peerId, setPeerId] = useState('');
    const [peers, setPeers] = useState({}); // { [peerId]: call }
    const [isMuted, setIsMuted] = useState(muted);
    const [isDeafened, setIsDeafened] = useState(false);

    const myStreamRef = useRef(null);
    const peerRef = useRef(null);
    const peersRef = useRef({}); // Ref for stable access in callbacks

    useEffect(() => {
        // Initialize Peer
        const peer = new Peer(undefined, {
            host: '0.peerjs.com', // Using public PeerJS server for prototype
            port: 443,
            path: '/'
        });

        peer.on('open', (id) => {
            console.log('[VOICE] My Peer ID:', id);
            setPeerId(id);
            peerRef.current = peer;

            // Signal my PeerID to the room via Supabase
            // We use a specific channel for signaling to avoid cluttering game state
            const channel = supabase.channel(`voice-${roomId}`);
            channel
                .on('broadcast', { event: 'signal' }, handleSignal)
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        // Announce myself
                        await channel.send({
                            type: 'broadcast',
                            event: 'signal',
                            payload: { type: 'join', userId, peerId: id, name: playerName }
                        });
                    }
                });
        });

        peer.on('call', (call) => {
            console.log('[VOICE] Incoming call from', call.peer);
            call.answer(myStreamRef.current);
            handleCall(call);
        });

        // Get User Media
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then((stream) => {
                myStreamRef.current = stream;
                // Mute initial track if needed
                stream.getAudioTracks()[0].enabled = !isMuted;
            })
            .catch(err => console.error('[VOICE] Failed to get local stream', err));

        return () => {
            peer.destroy();
            if (myStreamRef.current) {
                myStreamRef.current.getTracks().forEach(track => track.stop());
            }
            supabase.removeChannel(supabase.channel(`voice-${roomId}`));
        };
    }, [roomId]);

    useEffect(() => {
        if (myStreamRef.current) {
            myStreamRef.current.getAudioTracks()[0].enabled = !isMuted;
        }
    }, [isMuted]);

    const handleSignal = (payload) => {
        const data = payload.payload;
        if (data.userId === userId) return; // Ignore self

        if (data.type === 'join') {
            console.log('[VOICE] User joined:', data.name);
            connectToNewUser(data.peerId, myStreamRef.current);
        }
    };

    const connectToNewUser = (remotePeerId, stream) => {
        if (!peerRef.current) return;
        const call = peerRef.current.call(remotePeerId, stream);
        handleCall(call);
    };

    const handleCall = (call) => {
        call.on('stream', (remoteStream) => {
            // Create audio element
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
            audio.addEventListener('loadedmetadata', () => {
                audio.play();
            });
            // Store call reference
            peersRef.current[call.peer] = { call, audio };
            setPeers(prev => ({ ...prev, [call.peer]: call }));
        });

        call.on('close', () => {
            if (peersRef.current[call.peer]) {
                peersRef.current[call.peer].audio.remove();
                delete peersRef.current[call.peer];
                setPeers(prev => {
                    const newPeers = { ...prev };
                    delete newPeers[call.peer];
                    return newPeers;
                });
            }
        });
    };

    const toggleDeafen = () => {
        const newVal = !isDeafened;
        setIsDeafened(newVal);
        Object.values(peersRef.current).forEach(({ audio }) => {
            if (audio) audio.muted = newVal;
        });
    };

    return (
        <div style={{
            position: 'fixed', bottom: '80px', right: '15px',
            background: 'rgba(0,0,0,0.8)', padding: '10px',
            borderRadius: '8px', border: '1px solid #444',
            display: 'flex', flexDirection: 'column', gap: '5px',
            color: '#fff', fontFamily: 'VT323', zIndex: 50
        }}>
            <div style={{ fontSize: '1rem', color: '#ffd700', marginBottom: '5px' }}>
                VOICE CHAT ({Object.keys(peers).length + 1}/10)
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    style={{ background: isMuted ? '#ef4444' : '#166534', border: 'none', borderRadius: '4px', padding: '5px', cursor: 'pointer', color: '#fff' }}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                    onClick={toggleDeafen}
                    style={{ background: isDeafened ? '#ef4444' : '#3b82f6', border: 'none', borderRadius: '4px', padding: '5px', cursor: 'pointer', color: '#fff' }}
                >
                    {isDeafened ? <VolumeX size={20} /> : <Headphones size={20} />}
                </button>
            </div>
        </div>
    );
};

export default VoiceChat;
