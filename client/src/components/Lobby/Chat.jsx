import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Send } from 'lucide-react';
import './Lobby.css';

const Chat = ({ roomId, playerName }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel(`chat_room_${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'lobby_messages',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                console.log('Nova mensagem recebida:', payload.new);
                setMessages(prev => {
                    // Evitar duplicatas em caso de insert local + real-time
                    if (prev.some(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new];
                });
            })
            .subscribe((status) => {
                console.log(`Status do chat (${roomId}):`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}]`;
    };

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('lobby_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        setMessages(data || []);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const { error } = await supabase.from('lobby_messages').insert([{
            room_id: roomId,
            sender_name: playerName,
            content: inputText
        }]);

        if (!error) {
            setInputText('');
            // Opcional: fetchMessages() se o real-time falhar, mas o ideal é o real-time funcionar
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                Chat da Taberna
            </div>
            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className="message">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: '#888', fontSize: '1rem' }}>{formatTime(msg.created_at)}</span>
                            <span className="message-sender">{msg.sender_name}:</span>
                        </div>
                        <span style={{ fontSize: '1.2rem', paddingLeft: '2rem' }}>{msg.content}</span>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className="chat-input-area">
                <input
                    type="text"
                    placeholder="Diga algo, guerreiro..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="btn-primary">
                    <Send size={24} />
                </button>
            </form>
        </div>
    );
};

export default Chat;
