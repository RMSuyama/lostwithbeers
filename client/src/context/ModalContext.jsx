import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }) => {
    const [modal, setModal] = useState({
        isOpen: false,
        type: 'alert', // 'alert' or 'confirm'
        message: '',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = useCallback((message) => {
        return new Promise((resolve) => {
            setModal({
                isOpen: true,
                type: 'alert',
                message,
                onConfirm: () => {
                    setModal(prev => ({ ...prev, isOpen: false }));
                    resolve();
                }
            });
        });
    }, []);

    const showConfirm = useCallback((message) => {
        return new Promise((resolve) => {
            setModal({
                isOpen: true,
                type: 'confirm',
                message,
                onConfirm: () => {
                    setModal(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setModal(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    }, []);

    const showPrompt = useCallback((message, defaultValue = '') => {
        return new Promise((resolve) => {
            setModal({
                isOpen: true,
                type: 'prompt',
                message,
                defaultValue,
                onConfirm: (value) => {
                    setModal(prev => ({ ...prev, isOpen: false }));
                    resolve(value);
                },
                onCancel: () => {
                    setModal(prev => ({ ...prev, isOpen: false }));
                    resolve(null);
                }
            });
        });
    }, []);

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt, modal, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
};
