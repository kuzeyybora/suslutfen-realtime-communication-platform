import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useToast } from '../hooks/useToast';

interface FieldErrors {
  email?: string;
  username?: string;
  password?: string;
  passwordConfirm?: string;
  [key: string]: string | undefined;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!email) e.email = 'E-posta zorunludur.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Geçerli bir e-posta girin.';
    if (!username) e.username = 'Kullanıcı adı zorunludur.';
    else if (username.length < 3) e.username = 'En az 3 karakter olmalıdır.';
    if (!password) e.password = 'Şifre zorunludur.';
    else if (password.length < 8) e.password = 'En az 8 karakter olmalıdır.';
    if (password !== passwordConfirm) e.passwordConfirm = 'Şifreler eşleşmiyor.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await register({ email, username, password });
      toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
      navigate('/login');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 422) {
        const details = err.response.data?.error?.details ?? {};
        setErrors(details);
      } else if (status === 409) {
        setErrors({ email: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Kayıt Ol</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          <div className="field">
            <label htmlFor="passwordConfirm">Şifre Tekrar</label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {errors.passwordConfirm && <span className="error">{errors.passwordConfirm}</span>}
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>
        <p className="auth-link">
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
