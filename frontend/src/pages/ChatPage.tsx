import { useAuthStore } from '../store/auth';
import { useToast } from '../hooks/useToast';
import { logout } from '../api/auth';
import { useNavigate } from 'react-router-dom';

export default function ChatPage() {
  const { clearTokens, refreshToken } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (refreshToken) await logout(refreshToken);
    } finally {
      clearTokens();
      toast.info('Çıkış yapıldı.');
      navigate('/login');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Sohbet</h1>
      <p>Mesajlaşma ekranı yakında burada olacak.</p>
      <button onClick={handleLogout}>Çıkış Yap</button>
    </div>
  );
}
