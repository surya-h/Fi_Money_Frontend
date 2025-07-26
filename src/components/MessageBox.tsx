import { useEffect, useState } from "react";

export function MessageCard({ agent, message }: { agent: string; message: string }) {
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000 + Math.random() * 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '16px'
      }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            color: 'var(--accent-primary)',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {agent}
          <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </button>
        {isOpen && (
          <div style={{
            marginTop: '12px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            {loading ? "Thinking..." : message}
          </div>
        )}
      </div>
    </div>
  );
}