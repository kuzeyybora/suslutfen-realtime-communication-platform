import { useState, useRef, useCallback, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { login } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { useKonami } from '../hooks/useKonami';
import ThemeToggle from '../components/ThemeToggle';
import Confetti from '../components/Confetti';

interface FieldErrors { email?: string; password?: string; }
interface FloatingEmoji { id: number; emoji: string; x: number; y: number; }

type ChatMsg =
  | { id: number; user: string; color: string; right: boolean; type: 'text'; msg: string }
  | { id: number; user: string; color: string; right: boolean; type: 'voice'; duration: string }
  | { id: number; user: string; color: string; right: boolean; type: 'system'; msg: string };

/* Kuzey sağda, diğerleri solda */
const CAST = {
  Kuzey:   { color: '#fb923c', right: true  },
  Batuhan: { color: '#f87171', right: false },
  Fatih:   { color: '#fbbf24', right: false },
  İmam:    { color: '#a78bfa', right: false },
  Emra:    { color: '#60a5fa', right: false },
  Selin:   { color: '#f472b6', right: false },
  Sude:    { color: '#34d399', right: false },
} as const;

type Actor = keyof typeof CAST;

function msg(user: Actor, text: string): Omit<ChatMsg, 'id'> {
  return { user, ...CAST[user], type: 'text', msg: text };
}
function sys(text: string): Omit<ChatMsg, 'id'> {
  return { user: '', color: '', right: false, type: 'system', msg: text };
}

const CHAT_SCRIPT: Omit<ChatMsg, 'id'>[] = [
  msg('Kuzey',   'akşam ne söylüyoruz, pizza mı 😎'),
  msg('Batuhan', 'pizza değil ya hep aynı şey'),
  msg('Fatih',   'ben köfte isterim açıkçası'),
  msg('Kuzey',   'fatih köfte mi, ciddi misin 😂'),
  msg('İmam',    'kuzey abi bence köfte harika bir seçim'),
  msg('Emra',    'imam sen de köfteci mi oldun 😂'),
  msg('İmam',    'emra abla beni küçümseme, çok sinir bozucu'),
  msg('Selin',   'hahaha imam sinirli 😭'),
  msg('İmam',    'selin abla sen de gülüyorsun, inanamıyorum'),
  msg('Batuhan', 'imam bırak ya kimse seni küçümsemiyor'),
  msg('İmam',    'batuhan abi sen de mi, hepiniz benim üstüme'),
  msg('Kuzey',   'imam bak herkes gülüyor 😎'),
  msg('İmam',    'kuzey abi tam da bunu yapmamalıydın'),
  msg('Emra',    'ahahahaha 😭😭'),
  msg('Fatih',   'köfte siparişi verelim mi artık'),
  msg('İmam',    'fatih abi teşekkür ederim, en azından sen varsın'),
  msg('Kuzey',   'hep haklıyım, alışın 😎'),
  sys('🔐 Biri giriş yapıyor...'),
];

const WAVE = [3,5,8,5,10,7,12,8,5,9,6,11,4,8,5];

const LOADING_MSGS = [
  'Seni arıyoruz... 🔍',
  'Şifre kırılıyor... jk 😅',
  'Sunucuya bağlanılıyor... 📡',
  'Hemen geliyoruz! 🚀',
  'Bir saniye, kahve içiyoruz ☕',
];

const BADGE_MSGS: Record<number, string> = {
  150: '🔥 Rekor kırıldı!',
  200: '🎉 200 kişi! Bu gece partiii',
  500: '🤯 500 kişi mi? Bu sunucu dayanır mı?',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return ['🌙 Gece kuşu musun?', 'Bu saatte mi giriyorsun... Yatsan olmaz mı?'];
  if (h < 12) return ['☀️ Günaydın!', 'Erkenci kuş kurtçuğu kapar derler.'];
  if (h < 17) return ['👋 Merhaba!', 'Öğle arası mı? Gir sohbet et.'];
  if (h < 21) return ['🌆 İyi akşamlar!', 'Günün yorgunluğunu atmak için doğru yerdesin.'];
  return ['🌃 Gece modu açık!', 'Geç saatte takılanlara özel selamlama 🤫'];
}

const BUBBLE_REACTIONS = ['❤️','😂','🔥','👏','😍','🤣','💯','🎉'];

export default function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [confetti, setConfetti] = useState(false);
  const [onlineCount, setOnlineCount] = useState(128);
  const [logoClicks, setLogoClicks] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [capsLock, setCapsLock] = useState(false);
  const [logoSpin, setLogoSpin] = useState(false);
  const [chaos, setChaos] = useState(false);

  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const chatMsgId = useRef(0);
  const scriptIdx = useRef(0);
  const chatTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chatRef   = useRef<HTMLDivElement>(null);

  const rageRef   = useRef(0);
  const rageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const emojiId   = useRef(0);

  const [greeting, greetingSub] = getGreeting();

  /* Live chat (tek geçiş, döngü yok) */
  useEffect(() => {
    const tick = () => {
      const idx = scriptIdx.current;
      if (idx >= CHAT_SCRIPT.length) { setTypingUser(null); return; }

      const entry = CHAT_SCRIPT[idx];
      setTypingUser('Kuzey');

      const typingMs = entry.type === 'system' ? 300 : 600 + Math.random() * 500;
      chatTimer.current = setTimeout(() => {
        setTypingUser(null);
        setChatMsgs((prev) => [...prev.slice(-6), { ...entry, id: ++chatMsgId.current } as ChatMsg]);
        scriptIdx.current++;
        const pause = entry.type === 'system' ? 2500 : 900 + Math.random() * 700;
        chatTimer.current = setTimeout(tick, pause);
      }, typingMs);
    };
    chatTimer.current = setTimeout(tick, 1200);
    return () => clearTimeout(chatTimer.current);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMsgs, typingUser]);

  useKonami(useCallback(() => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 100);
    toast('🎮 KONAMI KODU! Hacker modu aktif!', { description: 'Tebrikler, gizli kodu buldun 🕹️', duration: 4000 });
  }, []));

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    setLogoSpin(true);
    setTimeout(() => setLogoSpin(false), 600);
    if (next === 3)  toast('🤨 Ne yapıyorsun?');
    if (next === 5)  toast('😅 Dur dur dur, nereye?');
    if (next === 7)  toast('🤯 Tıklamaya devam edersen...');
    if (next === 10) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
      toast.success('🎊 10 tık! Sen özelsin.', { description: 'Gizli rozetini kazandın: Tıklama Ustası 🏆' });
      setLogoClicks(0);
    }
  };

  const handleBadgeClick = () => {
    const next = onlineCount + Math.floor(Math.random() * 3 + 1);
    setOnlineCount(next);
    const milestone = Object.keys(BADGE_MSGS).map(Number).find((m) => next >= m && onlineCount < m);
    if (milestone) toast(BADGE_MSGS[milestone]);
  };

  const handleRageClick = () => {
    rageRef.current++;
    clearTimeout(rageTimer.current);
    rageTimer.current = setTimeout(() => { rageRef.current = 0; }, 1500);
    if (rageRef.current >= 5) {
      toast('😤 Dur dur dur! Yavaş ol biraz.', { description: 'Buton kaçmıyor ki 😂' });
      rageRef.current = 0;
    }
  };

  const handleCapsLock = (e: React.KeyboardEvent) => setCapsLock(e.getModifierState('CapsLock'));

  const handleChaos = () => {
    if (chaos) {
      setChaos(false);
      toast.success('✅ Sistem kurtarıldı.', { description: 'Bir daha basma. Lütfen.' });
    } else {
      setChaos(true);
      toast.error('⚠️ SİSTEM ÇÖKÜYOR!!!', {
        description: 'Sizi uyarmıştık. Tekrar basarsan durur (belki).',
        duration: 4000,
      });
    }
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!email) e.email = 'E-posta adresini girmen lazım.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Bu e-posta geçerli görünmüyor.';
    if (!password) e.password = 'Şifreni unutmadın değil mi?';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    handleRageClick();
    if (!validate()) return;
    setLoadingMsg(LOADING_MSGS[Math.floor(Math.random() * LOADING_MSGS.length)]);
    setIsLoading(true);
    try {
      const { data } = await login({ email, password });
      setTokens(data.token, data.refresh_token);
      toast.success('Hoş geldin! 🎉');
      navigate('/chat');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrors({ password: 'E-posta veya şifre yanlış. Bir daha dene.' });
        toast.error('Hmm, bir şeyler yanlış 🤔');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`auth-layout${chaos ? ' chaos' : ''}`}>
      <Confetti active={confetti} />
      <ThemeToggle />

      <div className="auth-brand" style={{ position: 'relative' }}>
        <div className="brand-content">

          <div className="brand-badge" onClick={handleBadgeClick}
               style={{ cursor: 'pointer' }} title="Tıkla bakalım 👀">
            <span className="pulse" />
            🟠 Şu an {onlineCount} kişi çevrimiçi
          </div>

          <h1 className="brand-headline">
            Sohbet etmek<br />
            <span className="accent">hiç bu kadar kolay</span><br />
            olmamıştı.
          </h1>

          <p className="brand-sub">
            suslütfen ile arkadaşlarınla anlık mesajlaş,<br />
            gruplarda takıl, hiçbir şeyi kaçırma.
          </p>

          <div className="live-chat">
            <div className="live-chat-header">
              <div className="live-chat-avatars">
                {Object.values(CAST).slice(0, 4).map((c) => (
                  <span key={c.color} className="lc-mini-avatar" style={{ background: c.color }} />
                ))}
              </div>
              <div className="live-chat-meta">
                <span className="live-chat-name">arkadaş grubu 🔥</span>
                <span className="live-chat-members">
                  <span className="live-dot-sm" />
                  7 üye çevrimiçi
                </span>
              </div>
            </div>

            <div className="live-chat-msgs" ref={chatRef}>
              {chatMsgs.map((m) => (
                <div key={m.id} className={`lc-row${m.right ? ' lc-row-right' : ''}`}>
                  {m.type === 'system' ? (
                    <div className="lc-system">{m.msg}</div>
                  ) : (
                    <>
                      {!m.right && (
                        <span className="lc-avatar" style={{ background: m.color }}>{m.user[0]}</span>
                      )}
                      <div className="lc-bubble-wrap">
                        {!m.right && <span className="lc-username">{m.user}</span>}
                        {m.type === 'text' && (
                          <div className={`lc-bubble${m.right ? ' lc-bubble-right' : ''}`}
                               style={{ cursor: 'pointer' }}
                               onClick={(e) => {
                                 const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                 const id = ++emojiId.current;
                                 const emoji = BUBBLE_REACTIONS[Math.floor(Math.random() * BUBBLE_REACTIONS.length)];
                                 setFloatingEmojis((p) => [...p, { id, emoji, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
                                 setTimeout(() => setFloatingEmojis((p) => p.filter((f) => f.id !== id)), 1200);
                               }}>
                            {m.msg}
                          </div>
                        )}
                        {m.type === 'voice' && (
                          <div className={`lc-bubble lc-voice${m.right ? ' lc-bubble-right' : ''}`}>
                            <span className="lc-voice-icon">🎙</span>
                            <svg width="60" height="20" viewBox="0 0 60 20">
                              {WAVE.map((h, i) => (
                                <rect key={i} x={i * 4} y={(20 - h) / 2} width="2.5" height={h}
                                      rx="1.5" fill="currentColor" opacity={0.7 + (i % 3) * 0.1} />
                              ))}
                            </svg>
                            <span className="lc-voice-dur">{m.duration}</span>
                          </div>
                        )}
                      </div>
                      {m.right && (
                        <span className="lc-avatar" style={{ background: m.color }}>{m.user[0]}</span>
                      )}
                    </>
                  )}
                </div>
              ))}

              {typingUser && (
                <div className="lc-row lc-row-right">
                  <div className="lc-typing"><span /><span /><span /></div>
                  <span className="lc-avatar" style={{ background: CAST.Kuzey.color }}>K</span>
                </div>
              )}

              {floatingEmojis.map((fe) => (
                <span key={fe.id} className="floating-emoji"
                      style={{ left: fe.x, top: fe.y }}>
                  {fe.emoji}
                </span>
              ))}
            </div>
          </div>

          <div className="brand-stats">
            {([
              { num: '12K+',  label: 'Kullanıcı', tip: '12 bin insan yanılıyor olamaz 😄' },
              { num: '3M+',   label: 'Mesaj',     tip: '3 milyon mesaj, 0 pişmanlık 🔥' },
              { num: '99.9%', label: 'Uptime',    tip: '%0.1\'i kahve molasıydı ☕' },
            ] as const).map(({ num, label, tip }) => (
              <div key={label} className="stat" style={{ cursor: 'pointer' }}
                   onClick={() => toast(tip)}>
                <span className="stat-num">{num}</span>
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <button className={`chaos-btn${chaos ? ' active' : ''}`} onClick={handleChaos}>
          {chaos ? '💀 DURDURAMAZSIN' : '⚠️ Bu butona basma'}
        </button>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-logo" onClick={handleLogoClick}
                 title={logoClicks >= 7 ? '...tıklamaya devam et 👀' : 'suslütfen'}
                 style={{ cursor: 'pointer', display: 'inline-block', marginBottom: '1rem' }}>
              <span className={`auth-logo-emoji${logoSpin ? ' spin' : ''}`}>💬</span>
            </div>
            <p className="greeting">{greeting}</p>
            <h2>Giriş yap</h2>
            <p>{greetingSub}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input id="email" type="email" placeholder="ornek@email.com"
                     value={email} onChange={(e) => setEmail(e.target.value)}
                     className={errors.email ? 'input-error' : ''}
                     autoComplete="email" />
              {errors.email && <span className="error">⚠ {errors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="password">Şifre</label>
              <input id="password" type="password" placeholder="••••••••"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     onKeyUp={handleCapsLock}
                     className={errors.password ? 'input-error' : ''}
                     autoComplete="current-password" />
              {capsLock && <span className="caps-warning">⇪ Caps Lock açık! Şifreni kontrol et.</span>}
              {errors.password && <span className="error">⚠ {errors.password}</span>}
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}
                    onClick={handleRageClick}>
              {isLoading ? <><span className="spinner" />{loadingMsg}</> : 'Giriş Yap 🚀'}
            </button>
          </form>

          <p className="auth-divider">
            Henüz aramızda değil misin?<Link to="/register">Hemen katıl</Link>
          </p>

          <p className="easter-hint">
            💡 <span title="↑↑↓↓←→←→BA dene!">Bir sır var burada...</span>
          </p>
        </div>
      </div>
    </div>
  );
}
