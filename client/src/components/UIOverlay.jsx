import { useState, useEffect, useRef } from 'react';

export default function UIOverlay({ socket, roomId }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('chat_message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        // System announcements
        socket.on('announcement', (text) => {
            setMessages(prev => [...prev, { author: 'SYSTEM', text, color: 'yellow' }]);
        });

        return () => {
            socket.off('chat_message');
            socket.off('announcement');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        socket.emit('chat_message', { roomId, text: inputText });
        setInputText('');
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            width: '300px',
            height: '200px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            padding: '5px',
            borderRadius: '5px',
            pointerEvents: 'auto'
        }}>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '5px', fontSize: '12px' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ color: m.color || 'white' }}>
                        <strong>{m.author}: </strong>{m.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type !elite, !storm..."
                    style={{ width: '100%', padding: '2px' }}
                />
            </form>
        </div>
    );
}
