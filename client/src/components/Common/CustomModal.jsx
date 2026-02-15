import React from 'react';
import { useModal } from '../../context/ModalContext';

const CustomModal = () => {
    const { modal, closeModal } = useModal();
    const [inputValue, setInputValue] = React.useState('');

    React.useEffect(() => {
        if (modal.isOpen && modal.type === 'prompt') {
            setInputValue(modal.defaultValue || '');
        }
    }, [modal.isOpen, modal.type, modal.defaultValue]);

    if (!modal.isOpen) return null;

    const handleConfirm = () => {
        const value = modal.type === 'prompt' ? inputValue : true;
        modal.onConfirm(value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') modal.onCancel ? modal.onCancel() : closeModal();
    };

    return (
        <div className="modal-overlay" onKeyDown={handleKeyDown} tabIndex="-1">
            <div className="modal-content panel-zelda" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">MEMÓRIA DO REINO</span>
                </div>
                <div className="modal-body">
                    <p>{modal.message}</p>
                    {modal.type === 'prompt' && (
                        <input
                            autoFocus
                            className="modal-input"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Digite aqui..."
                        />
                    )}
                </div>
                <div className="modal-footer">
                    {modal.type !== 'alert' ? (
                        <>
                            <button className="btn-primary" onClick={modal.onCancel}>CANCELAR</button>
                            <button className="btn-primary active" onClick={handleConfirm}>PROSSEGUIR</button>
                        </>
                    ) : (
                        <button className="btn-primary active" onClick={handleConfirm}>OK</button>
                    )}
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    width: 90%;
                    max-width: 450px;
                    padding: 2rem !important;
                    animation: modalPop 0.2s ease-out;
                }
                @keyframes modalPop {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .modal-header {
                    border-bottom: 2px solid #2e1a0a;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                    text-align: center;
                }
                .modal-title {
                    color: #ffd700;
                    font-size: 1.8rem;
                    text-shadow: 2px 2px 0 #000;
                }
                .modal-body {
                    margin-bottom: 2rem;
                    text-align: center;
                }
                .modal-body p {
                    font-size: 1.6rem;
                    color: #fff;
                    line-height: 1.4;
                    text-shadow: 1px 1px 0 #000;
                }
                .modal-footer {
                    display: flex;
                    justify-content: center;
                    gap: 1.5rem;
                }
                .modal-footer .btn-primary {
                    min-width: 120px;
                    font-size: 1.4rem;
                }
                .modal-footer .btn-primary.active {
                    background: #16a34a;
                    box-shadow: inset 1px 1px 0 #4ade80, 0 0 10px rgba(22, 163, 74, 0.4);
                }
                .modal-input {
                    width: 100%;
                    background: #000;
                    border: 2px solid #ffd700;
                    color: #ffd700;
                    padding: 0.8rem;
                    font-family: 'VT323', monospace;
                    font-size: 1.5rem;
                    text-align: center;
                    margin-top: 1rem;
                    outline: none;
                }
                .modal-input:focus {
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
                }
            `}</style>
        </div>
    );
};

export default CustomModal;
