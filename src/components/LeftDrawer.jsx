import React from 'react';

export default function LeftDrawer({ isOpen, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : '-320px',
        width: '320px',
        height: '100vh',
        backgroundColor: '#111',
        color: '#fff',
        padding: '16px',
        boxShadow: '2px 0 8px rgba(0,0,0,0.5)',
        transition: 'left 0.3s ease-in-out',
        zIndex: 20,
      }}
    >
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          color: '#aaa',
          border: 'none',
          fontSize: '1.2rem',
          marginBottom: '1rem',
        }}
      >
        × Close
      </button>
      <div style={{ overflowY: 'auto', height: 'calc(100% - 40px)' }}>
        {children}
      </div>
    </div>
  );
}
