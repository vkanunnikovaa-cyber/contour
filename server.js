require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const YandexStrategy = require('passport-yandex').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const users = [];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Для Render с HTTPS можно поставить true, если настроен прокси
}));

app.use(passport.initialize());
app.use(passport.session());

/* ======================= СТРАТЕГИИ ======================= */

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  const user = users.find(u => u.email === email);
  if (!user) return done(null, false, { message: 'Пользователь не найден' });
  if (!user.password) return done(null, false, { message: 'Войдите через соцсети' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return done(null, false, { message: 'Неверный пароль' });
  return done(null, user);
}));

passport.use(new YandexStrategy({
    clientID: process.env.YANDEX_CLIENT_ID,
    clientSecret: process.env.YANDEX_CLIENT_SECRET,
    callbackURL: "https://contour-41wv.onrender.com/auth/yandex/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    let user = users.find(u => u.yandexId === profile.id);
    if (!user) {
      user = {
        id: Date.now(),
        yandexId: profile.id,
        name: profile.displayName || profile.real_name || 'Пользователь',
        email: (profile.emails && profile.emails[0]) ? profile.emails[0].value : null,
        isProfileFilled: false,
        bio: '',
        services: [],
        bookingLink: null
      };
      users.push(user);
    }
    return done(null, user);
  }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://contour-41wv.onrender.com/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    let user = users.find(u => u.googleId === profile.id);
    if (!user) {
      user = {
        id: Date.now(),
        googleId: profile.id,
        name: profile.displayName,
        email: (profile.emails && profile.emails[0]) ? profile.emails[0].value : null,
        isProfileFilled: false,
        bio: '',
        services: [],
        bookingLink: null
      };
      users.push(user);
    }
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

/* ======================= API ======================= */

app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// Единый эндпоинт для онбординга
app.post('/api/onboarding', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Не авторизован' });

  const { name, bio, serviceName, price, bookingLink } = req.body;

  // Валидация на сервере
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' });
  }
  if (!serviceName || serviceName.trim().length < 3) {
    return res.status(400).json({ error: 'Название услуги слишком короткое' });
  }
  if (!price || isNaN(price) || Number(price) <= 0) {
    return res.status(400).json({ error: 'Укажите корректную цену' });
  }

  const cleanLink = bookingLink.toLowerCase().trim();
  const isValidLink = /^[a-z0-9-]+$/.test(cleanLink);
  
  if (!isValidLink) {
    return res.status(400).json({ error: 'Ссылка должна содержать только английские буквы, цифры и дефис' });
  }

  // Проверка на занятость ссылки
  const isTaken = users.some(u => u.bookingLink === cleanLink && u.id !== req.user.id);
  if (isTaken) {
    return res.status(400).json({ error: 'Этот адрес уже занят, выберите другой' });
  }

  // Сохраняем всё
  req.user.name = name;
  req.user.bio = bio;
  req.user.services = [{ name: serviceName, price: Number(price) }];
  req.user.bookingLink = cleanLink;
  req.user.isProfileFilled = true;

  res.json({ success: true, user: req.user });
});

// Проверка ссылки в реальном времени
app.post('/api/check-link', (req, res) => {
  const { link } = req.body;
  if (!link) return res.json({ available: false });
  const isTaken = users.some(u => u.bookingLink === link.toLowerCase());
  res.json({ available: !isTaken });
});

/* ======================= ПУБЛИЧНАЯ СТРАНИЦА ======================= */

app.get('/:link', (req, res) => {
  const link = req.params.link;
  if (['favicon.ico', 'dashboard.html', 'login.html', 'index.html'].includes(link)) {
    return res.status(404).end();
  }

  const user = users.find(u => u.bookingLink === link);

  if (user) {
    res.send(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${user.name} — Запись на съёмку</title>
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root { --bg: #fbfbfb; --text: #1a1a1a; --muted: #7a7a7a; --accent: #7c1c2e; }
          body { font-family: 'Manrope', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 60px 20px; }
          .container { max-width: 900px; margin: 0 auto; }
          h1 { font-family: 'Oswald', sans-serif; font-size: 3rem; text-transform: uppercase; margin: 0 0 10px; }
          .bio { color: var(--muted); font-size: 1.2rem; margin-bottom: 40px; }
          .services { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
          .card { background: #fff; border: 1px solid #eaeaea; border-radius: 20px; padding: 30px; }
          .card h3 { margin: 0 0 10px; font-size: 1.4rem; }
          .price { font-family: 'Oswald', sans-serif; font-size: 2rem; color: var(--accent); margin-bottom: 20px; }
          .btn { display: block; text-align: center; background: var(--text); color: #fff; text-decoration: none; padding: 15px; border-radius: 99px; font-weight: 600; transition: 0.3s; }
          .btn:hover { background: var(--accent); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${user.name}</h1>
          <p class="bio">${user.bio}</p>
          <div class="services">
            ${user.services.map(s => `
              <div class="card">
                <h3>${s.name}</h3>
                <div class="price">${s.price} ₽</div>
                <a href="#" class="btn" onclick="alert('Форма записи (демо)')">Записаться</a>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.status(404).send('Страница не найдена');
  }
});

/* ======================= OAUTH & ЗАЩИТА ======================= */

app.get('/auth/yandex', passport.authenticate('yandex'));
app.get('/auth/yandex/callback',
  passport.authenticate('yandex', { failureRedirect: '/login.html' }),
  (req, res) => res.redirect('/dashboard.html')
);

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => res.redirect('/dashboard.html')
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/dashboard.html', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ Сервер запущен: http://localhost:${process.env.PORT || 3000}`);
});