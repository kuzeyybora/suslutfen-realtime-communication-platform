import { useState, useCallback, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { register } from '../api/auth';
import { useKonami } from '../hooks/useKonami';
import ThemeToggle from '../components/ThemeToggle';
import Confetti from '../components/Confetti';

interface FieldErrors {
  email?: string; username?: string; password?: string; passwordConfirm?: string;
  [key: string]: string | undefined;
}
interface FloatingEmoji { id: number; emoji: string; }

/* ─── Canlı grup sohbeti ─── */
type ChatMsg =
  | { id: number; user: string; color: string; right: boolean; type: 'text'; msg: string }
  | { id: number; user: string; color: string; right: boolean; type: 'voice'; duration: string }
  | { id: number; user: string; color: string; right: boolean; type: 'system'; msg: string };

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

function cm(user: Actor, text: string): Omit<ChatMsg, 'id'> {
  return { user, ...CAST[user], type: 'text', msg: text };
}
function cs(text: string): Omit<ChatMsg, 'id'> {
  return { user: '', color: '', right: false, type: 'system', msg: text };
}

const CHAT_SCRIPT: Omit<ChatMsg, 'id'>[] = [
  cm('Kuzey',   'arkadaşlar gruba biri katılıyor 👀'),
  cm('Selin',   'kim bu 😱'),
  cm('Emra',    'heyecanlandım açıkçası'),
  cm('İmam',    'kuzey abi kim bu kişi, güvenilir mi'),
  cm('Batuhan', 'imam sen nasıl bileceksin ki güvenilir mi'),
  cm('İmam',    'batuhan abi bana böyle konuşma, çok sinirli oldum'),
  cm('Selin',   'hahaha imam yine mi sinirlendi 😭'),
  cm('İmam',    'selin abla sen de gülüyorsun, buna üzüldüm'),
  cm('Emra',    'imam her seferinde aynı 😂'),
  cm('İmam',    'emra abla "her seferinde" ne demek, ben tutarlıyım'),
  cm('Kuzey',   'tutarlısın imam, tutarlı sinirleniyorsun 😎'),
  cm('İmam',    'kuzey abi sen de mi, dört kişi üstüme geldi'),
  cm('Fatih',   'ben bir şey demedim imam'),
  cm('İmam',    'fatih abi sen susarak dahil oldun buna'),
  cm('Emra',    'ahahahaha fatih susarak dahil olmuş 😭'),
  cm('Batuhan', 'imam artık bırak ya'),
  cm('Kuzey',   'gel aramıza, kadromuz sağlam 😎'),
  cm('İmam',    'kuzey abi "sağlam" dedin ama ben hâlâ sinirleniyorum'),
  cs('🎉 Yeni üye katılmak üzere...'),
];

/* ─── Easter egg veri tabanı ─── */
const USERNAME_EGGS: Record<string, string> = {
  'admin':      '😏 Admin misin gerçekten? Şüphelisin.',
  'suslütfen':  '🤫 Proje adını mı giriyorsun... Biraz özgün ol!',
  'suslutfen':  '🤫 Proje adını mı giriyorsun... Biraz özgün ol!',
  'test':       '🧪 Test kullanıcısı mı? Ciddiye alınmazsın ha.',
  'root':       '🐧 Linux kullanıcısı selamları!',
  'kuzey':      '👀 Dev misin sen? Şüpheleniyorum...',
  'null':       '💀 NULL mu? Veritabanımı patlatmak mı istiyorsun?',
  'undefined':  '🤨 JavaScript mı? Burası TypeScript toprakları.',
  '42':         '🌌 Hayatın, evrenin ve her şeyin cevabı. Zekisin.',
  'lütfensus':  '😂 Tam tersi mi girdin? Olmaz öyle.',
  'hacker':     '🔓 Hacker mı? Buyur gel bakalım.',
  'batman':     '🦇 Neden bu kadar ciddisin?',
  'spiderman':  '🕷️ Büyük güç büyük sorumluluk getirir... ve kullanıcı adı.',
  'ninja':      '🥷 Sessizce mi katıldın? İyi gizlendin.',
  'dragon':     '🐉 Ejderha kullanıcısı! Nadir tür.',
  'unicorn':    '🦄 Sen gerçekten var mısın?',
  'coffee':     '☕ Kahve içerek mi kayıt oluyorsun? Sağlıklı.',
  'yolo':       '🎲 YOLO diyerek mi kayıt oldun? Cesursun.',
  'leet':       '1337 Hacker detected! 🕵️',
  'error404':   '🚫 Bu kullanıcı adı bulunamadı — ironik.',
  'password':   '🔑 Kullanıcı adın "password" mu? Yaratıcı...',
};

const EMAIL_PROVIDER_EGGS: Record<string, string> = {
  'gmail.com':      '📧 Gmail! Klasik ama güvenilir.',
  'hotmail.com':    '📬 Hotmail mi? 2005\'ten selamlar!',
  'yahoo.com':      '🦖 Yahoo! Hâlâ yaşıyor musun sen?',
  'outlook.com':    '💼 Outlook mı? Çok profesyonelsin.',
  'icloud.com':     '🍎 iCloud! Apple kullanıcısı selamları.',
  'yandex.com':     '🪆 Yandex mi? Rusya\'dan mı geliyorsun?',
  'protonmail.com': '🔐 ProtonMail! Gizlilik önce gelir, saygılar.',
  'mail.ru':        '🐻 Rusya selamları! Привет!',
  'gmx.com':        '🇩🇪 GMX! Alman mühendisliği gibi güvenilir.',
};

const WEAK_PASSWORDS = ['123456','password','12345678','qwerty','111111','123123','abc123','000000'];

/* ─── Yardımcı ─── */
function getPasswordStrength(pw: string) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Çok zayıf 😬', color: '#ef4444', width: '20%' };
  if (score === 2) return { label: 'Zayıf 😐',    color: '#f97316', width: '40%' };
  if (score === 3) return { label: 'Orta 🙂',      color: '#fbbf24', width: '60%' };
  if (score === 4) return { label: 'Güçlü 💪',     color: '#22c55e', width: '80%' };
  return                  { label: 'Mükemmel 🔐', color: '#10b981', width: '100%' };
}

function isPalindrome(s: string) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean.length > 2 && clean === clean.split('').reverse().join('');
}

function getProgressLabel(step: number) {
  return ['👋 Başlayalım', '✏️ Kullanıcı adı', '🔐 Şifre seç', '✅ Neredeyse bitti!'][step] ?? '🎉 Hazır!';
}

/* ─── Voice waveform (dekoratif) ─── */
const WAVE = [3,5,8,5,10,7,12,8,5,9,6,11,4,8,5];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [statsUnlocked, setStatsUnlocked] = useState(false);
  const [statsSeq, setStatsSeq] = useState<number[]>([]);
  const [headlineSecret, setHeadlineSecret] = useState(false);
  const [allValid, setAllValid] = useState(false);
  const [chaos, setChaos] = useState(false);

  /* ─── Live chat state ─── */
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const chatMsgId = useRef(0);
  const scriptIdx  = useRef(0);
  const chatTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chatRef    = useRef<HTMLDivElement>(null);

  const emojiCounter   = useRef(0);
  const idleTimer      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const headlineTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fieldFocusCount = useRef<Record<string, number>>({});
  const prevPwStrength  = useRef(0);

  const pwStrength = getPasswordStrength(password);
  const filledCount = [email, username, password, passwordConfirm].filter(Boolean).length;
  const progressPct = (filledCount / 4) * 100;
  const step = filledCount;

  /* ─── Canlı sohbet animasyonu (tek geçiş, döngü yok) ─── */
  useEffect(() => {
    const tick = () => {
      const idx = scriptIdx.current;
      if (idx >= CHAT_SCRIPT.length) { setTypingUser(null); return; }

      const entry = CHAT_SCRIPT[idx];
      /* Typing göstergesi her zaman Kuzey olarak görünür */
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

  /* Otomatik scroll */
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMsgs, typingUser]);

  /* ─── Idle timer ─── */
  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      toast('😴 Uyudun mu?', { description: 'Hâlâ buradayım, kayıt olmayı unuttun mu?' });
    }, 30000);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('mousemove', resetIdle);
    resetIdle();
    return () => {
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('mousemove', resetIdle);
      clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  /* ─── Konami ─── */
  useKonami(useCallback(() => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 100);
    toast('🎮 Konami kodu! Kayıt formunda bile mi?', { description: '500 bonus puan kazandın (fiktif) 🏆' });
  }, []));

  /* ─── Floating emoji ─── */
  const spawnEmoji = (emoji: string) => {
    const id = ++emojiCounter.current;
    setFloatingEmojis((p) => [...p, { id, emoji }]);
    setTimeout(() => setFloatingEmojis((p) => p.filter((f) => f.id !== id)), 1100);
  };

  /* ─── Email ─── */
  const handleEmail = (val: string) => {
    setEmail(val);
    const domain = val.split('@')[1]?.toLowerCase();
    if (domain && EMAIL_PROVIDER_EGGS[domain]) toast(EMAIL_PROVIDER_EGGS[domain]);
  };

  /* ─── Username ─── */
  const handleUsername = (val: string) => {
    if (/[^\x00-\x7F]/.test(val)) return;
    setUsername(val);
    const lower = val.toLowerCase().trim();
    const egg = USERNAME_EGGS[lower];
    if (egg) { toast(egg); return; }
    if (val === val.toUpperCase() && val.length > 2 && /[A-Z]/.test(val))
      toast('😤 Neden BAĞIRIYORSUN?');
    if (isPalindrome(val))
      toast('🪞 Palindrom kullanıcı adı! Zekisin.', { description: `"${val}" — ileri geri aynı!` });
    if (val.length > 20)
      toast('😅 Bu kadar uzun isim mi gerekiyordu?');
  };

  /* ─── Password ─── */
  const handlePassword = (val: string) => {
    setPassword(val);
    if (WEAK_PASSWORDS.includes(val))
      toast.error('😱 Bu şifreyi gerçekten mi kullanıyorsun?', { description: 'Lütfen daha yaratıcı ol.' });
    if (val.toLowerCase().includes('suslütfen') || val.toLowerCase().includes('suslutfen'))
      toast('🥹 Adımızı şifre yaptın... Teşekkürler!', { description: 'Ama bu çok tahmin edilebilir 😅' });
    if (username && val.toLowerCase() === username.toLowerCase())
      toast('🤦 Kullanıcı adın = şifren mi? OLMAZ!');
    if (username && val.toLowerCase().includes(username.toLowerCase()) && val.length > 3)
      toast('🙈 Şifrende kullanıcı adın geçiyor, daha zor yap.');
    if (val === '42')
      toast('🌌 Hayatın anlamı şifre olarak kullanılamaz!');
    if (/^(.)\1+$/.test(val) && val.length > 0)
      toast('🦜 Aynı karakteri tekrar eden şifre mi? Gerçekten?');
    const s = getPasswordStrength(val);
    const newScore = s ? parseInt(s.width) : 0;
    if (newScore === 100 && prevPwStrength.current < 100) {
      spawnEmoji('🔐');
      toast.success('🏆 Mükemmel şifre! Güvende olacaksın.');
    }
    prevPwStrength.current = newScore;
  };

  /* ─── Chaos ─── */
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

  /* ─── Focus tracker ─── */
  const handleFocus = (field: string) => {
    fieldFocusCount.current[field] = (fieldFocusCount.current[field] ?? 0) + 1;
    const count = fieldFocusCount.current[field];
    if (count === 5)  toast(`🤔 "${field}" alanına 5 kez tıkladın...`);
    if (count === 8)  toast('😂 Hâlâ o alana mı odaklanıyorsun?');
    if (count === 12) toast('🫵 Seninle konuşuyorum. FORM DOLDURMAYA DEVAM ET!');
  };

  /* ─── Stats ─── */
  const handleStatClick = (idx: number, tip: string) => {
    toast(tip);
    const next = [...statsSeq, idx];
    if (next.at(-3) === 0 && next.at(-2) === 1 && next.at(-1) === 2) {
      setStatsUnlocked(true);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
      toast.success('🏅 Gizli başarı kilidi açıldı!', { description: '"Sıralı Tıklayıcı" rozetini kazandın.' });
    }
    setStatsSeq(next.slice(-5));
  };

  /* ─── Headline hover ─── */
  const handleHeadlineEnter = () => {
    headlineTimer.current = setTimeout(() => setHeadlineSecret(true), 2500);
  };
  const handleHeadlineLeave = () => clearTimeout(headlineTimer.current);

  /* ─── CapsLock ─── */
  const handleCapsLock = (e: React.KeyboardEvent) => setCapsLock(e.getModifierState('CapsLock'));

  /* ─── All valid ─── */
  useEffect(() => {
    const valid =
      /\S+@\S+\.\S+/.test(email) &&
      username.length >= 3 &&
      password.length >= 8 &&
      password === passwordConfirm;
    if (valid && !allValid) {
      spawnEmoji('🎉');
      toast('✨ Her şey tamam gibi görünüyor!', { description: 'Hadi kayıt ol!' });
    }
    setAllValid(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, username, password, passwordConfirm]);

  /* ─── Validate ─── */
  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!email) e.email = 'E-posta adresini girmen lazım.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Bu e-posta geçerli görünmüyor.';
    if (!username) e.username = 'Kendine bir kullanıcı adı seç.';
    else if (username.length < 3) e.username = 'En az 3 karakter olsun.';
    if (!password) e.password = 'Güçlü bir şifre belirle.';
    else if (password.length < 8) e.password = 'En az 8 karakter olmalı.';
    if (password !== passwordConfirm) e.passwordConfirm = 'Şifreler eşleşmiyor, dikkatli ol.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ─── Submit ─── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      spawnEmoji(['😬','🙈','🤦','😅'][Math.floor(Math.random() * 4)]);
      return;
    }
    setIsLoading(true);
    try {
      await register({ email, username, password });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 100);
      toast.success('🎊 Aramıza hoş geldin!', { description: 'Artık suslütfen ailesinin bir parçasısın.' });
      navigate('/login');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 422) setErrors(err.response.data?.error?.details ?? {});
      else if (status === 409) {
        setErrors({ email: 'Bu e-posta veya kullanıcı adı zaten alınmış.' });
        toast.error('😬 Birisi senden önce davrandı!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`auth-layout${chaos ? ' chaos' : ''}`}>
      <Confetti active={confetti} />
      <ThemeToggle />

      {/* ─── Sol panel ─── */}
      <div className="auth-brand" style={{ position: 'relative' }}>
        <div className="brand-content">

          <div className="brand-badge">
            <span className="pulse" />
            🟠 Ücretsiz • Sınırsız • Anlık
          </div>

          <h1 className="brand-headline"
              onMouseEnter={handleHeadlineEnter}
              onMouseLeave={handleHeadlineLeave}
              style={{ cursor: 'default', userSelect: 'none' }}>
            Sessizliğe<br />
            <span className="accent">son ver,</span><br />
            konuşmaya başla.
          </h1>

          {headlineSecret && (
            <p className="secret-reveal" onClick={() => setHeadlineSecret(false)}>
              🤫 Seni izliyorum... Haha şaka, kayıt ol artık.
            </p>
          )}

          <p className="brand-sub">
            suslütfen ile dakikalar içinde hesap aç,<br />
            arkadaşlarınla gerçek zamanlı takıl.
          </p>

          {/* ─── Canlı grup sohbeti ─── */}
          <div className="live-chat">
            <div className="live-chat-header">
              <div className="live-chat-avatars">
                {Object.values(CAST).slice(0, 4).map((c) => (
                  <span key={c.color} className="lc-mini-avatar" style={{ background: c.color }} />
                ))}
              </div>
              <div className="live-chat-meta">
                <span className="live-chat-name">bahcelievler yayla anlik 🔥</span>
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
                        <span className="lc-avatar" style={{ background: m.color }}>
                          {m.user[0]}
                        </span>
                      )}
                      <div className="lc-bubble-wrap">
                        {!m.right && <span className="lc-username">{m.user}</span>}
                        {m.type === 'text' && (
                          <div className={`lc-bubble${m.right ? ' lc-bubble-right' : ''}`}>
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
                        <span className="lc-avatar" style={{ background: m.color }}>
                          {m.user[0]}
                        </span>
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
                <span key={fe.id} className="floating-emoji-center">{fe.emoji}</span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="brand-stats">
            {([
              { num: '30sn', label: 'Kayıt süresi', tip: 'Gerçekten 30 saniye! Dene 😄', idx: 0 },
              { num: '0₺',  label: 'Ücret',         tip: 'Sıfır. Hiç. Bedava. Ücretsiz. 🎁', idx: 1 },
              { num: '∞',   label: 'Mesaj',         tip: 'Sonsuz mesaj, sonsuz muhabbet 💬', idx: 2 },
            ] as const).map(({ num, label, tip, idx }) => (
              <div key={label} className={`stat${statsUnlocked ? ' stat-gold' : ''}`}
                   style={{ cursor: 'pointer' }}
                   onClick={() => handleStatClick(idx, tip)}>
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

      {/* ─── Sağ panel ─── */}
      <div className="auth-panel">
        <div className="auth-card">
          <div className="progress-wrap" style={{ cursor: 'pointer' }}
               onClick={() => toast(progressPct < 50
                 ? '🐢 Yavaş yavaş...'
                 : progressPct < 100 ? '🏃 Neredeyse bitti!'
                 : '🚀 Hazırsın, gönder!')}>
            <div className="progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="progress-label">{getProgressLabel(step)}</p>

          <div className="auth-card-header" style={{ marginTop: '.75rem' }}>
            <p className="greeting">✨ Yeni buradaysın</p>
            <h2>Hesap oluştur</h2>
            <p>30 saniye sürer, söz. Hadi başlayalım.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input id="email" type="email" placeholder="ornek@email.com"
                     value={email}
                     onChange={(e) => handleEmail(e.target.value)}
                     onFocus={() => handleFocus('E-posta')}
                     className={errors.email ? 'input-error' : ''}
                     autoComplete="email" />
              {errors.email && <span className="error">⚠ {errors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="username">Kullanıcı adı</label>
              <input id="username" type="text" placeholder="harika_biri"
                     value={username}
                     onChange={(e) => handleUsername(e.target.value)}
                     onFocus={() => handleFocus('Kullanıcı adı')}
                     className={errors.username ? 'input-error' : ''}
                     autoComplete="username" />
              {errors.username && <span className="error">⚠ {errors.username}</span>}
            </div>

            <div className="field">
              <label htmlFor="password">
                Şifre
                {pwStrength && (
                  <span className="pw-label-badge" style={{ color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                )}
              </label>
              <input id="password" type="password" placeholder="En az 8 karakter"
                     value={password}
                     onChange={(e) => handlePassword(e.target.value)}
                     onKeyUp={handleCapsLock}
                     onFocus={() => handleFocus('Şifre')}
                     className={errors.password ? 'input-error' : ''}
                     autoComplete="new-password" />
              {pwStrength && (
                <div className="pw-strength-bar">
                  <div style={{ width: pwStrength.width, background: pwStrength.color }} />
                </div>
              )}
              {capsLock && <span className="caps-warning">⇪ Caps Lock açık! Dikkat et.</span>}
              {errors.password && <span className="error">⚠ {errors.password}</span>}
            </div>

            <div className="field">
              <label htmlFor="passwordConfirm">Şifre tekrar</label>
              <input id="passwordConfirm" type="password" placeholder="••••••••"
                     value={passwordConfirm}
                     onChange={(e) => setPasswordConfirm(e.target.value)}
                     onFocus={() => handleFocus('Şifre tekrar')}
                     className={errors.passwordConfirm ? 'input-error' : ''}
                     autoComplete="new-password" />
              {passwordConfirm && password === passwordConfirm && (
                <span className="match-ok">✅ Şifreler eşleşiyor!</span>
              )}
              {errors.passwordConfirm && <span className="error">⚠ {errors.passwordConfirm}</span>}
            </div>

            <button type="submit" className={`btn-primary${allValid ? ' btn-glow' : ''}`} disabled={isLoading}>
              {isLoading
                ? <><span className="spinner" />Hesap açılıyor...</>
                : allValid ? 'Katıl 🎊 — Hazırsın!' : 'Katıl 🎊'}
            </button>
          </form>

          <p className="auth-divider">
            Zaten varım ben.<Link to="/login">Giriş yap</Link>
          </p>

          <p className="easter-hint">
            💡 <span title="İpucu: Başlığa bak, sıralı tıkla...">Psst... birçok sır var.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
