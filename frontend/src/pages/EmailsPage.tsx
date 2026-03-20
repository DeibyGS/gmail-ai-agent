import { useEffect, useState } from 'react';
import type { Email } from '../types';
import { fetchEmails, triggerProcess } from '../services/api';
import EmailCard from '../components/EmailCard';

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEmails();
      setEmails(data);
    } catch {
      setError('No se pudo conectar con el backend. ¿Está corriendo en el puerto 8000?');
    } finally {
      setLoading(false);
    }
  };

  // Fuerza un ciclo de procesamiento y recarga la lista al terminar
  const handleProcess = async () => {
    setProcessing(true);
    try {
      await triggerProcess();
      await loadEmails();
    } catch {
      setError('Error al procesar correos.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Correos clasificados</h1>
        <button
          style={{ ...styles.button, opacity: processing ? 0.6 : 1 }}
          onClick={handleProcess}
          disabled={processing}
        >
          {processing ? 'Procesando...' : 'Procesar ahora'}
        </button>
      </div>

      {loading && <p style={styles.info}>Cargando correos...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && emails.length === 0 && (
        <p style={styles.info}>No hay correos no leídos clasificados.</p>
      )}

      <div style={styles.list}>
        {emails.map(email => (
          <EmailCard key={email.id} email={email} />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '1.5rem', maxWidth: '760px', margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  title: { margin: 0, fontSize: '1.25rem', fontWeight: 700 },
  button: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1.1rem',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  info: { color: '#6b7280', fontSize: '0.9rem' },
  error: { color: '#dc2626', fontSize: '0.9rem' },
};
