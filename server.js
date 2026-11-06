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
const users = []; // Временное хранилище

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
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
    callbackURL: "https://contour-41wv.onrender.com/"
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
    callbackURL: "http://localhost:3000/auth/google/callback"
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

app.post('/api/profile', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Не авторизован' });
  const { name, bio } = req.body;
  req.user.name = name || req.user.name;
  req.user.bio = bio;
  req.user.isProfileFilled = true;
  res.json({ success: true, user: req.user });
});

app.post('/api/services', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Не авторизован' });
  const { serviceName, price } = req.body;
  req.user.services.push({ name: serviceName, price: price });
  res.json({ success: true, user: req.user });
});

// СОХРАНЕНИЕ ССЫЛКИ (с проверкой на кириллицу)
app.post('/api/link', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Не авторизован' });
  
  let { link } = req.body;
  link = link.toLowerCase().trim();

  // Проверка: только латиница, цифры и дефис
  const isValid = /^[a-z0-9-]+$/.test(link);
  
  if (!isValid) {
    return res.status(400).json({ error: 'Используйте только английские буквы, цифры и дефис.' });
  }

  // Проверка, не занят ли адрес
  const isTaken = users.some(u => u.bookingLink === link && u.id !== req.user.id);
  if (isTaken) {
    return res.status(400).json({ error: 'Этот адрес уже занят, выберите другой.' });
  }

  req.user.bookingLink = link;
  res.json({ success: true, user: req.user });
});

/* ======================= ДЕМО-СТРАНИЦА ССЫЛКИ ======================= */

// Этот маршрут показывает, как выглядит страница записи клиента
app.get('/:link', (req, res) => {
  const link = req.params.link;
  
  // Игнорируем служебные маршруты
  if (link === 'favicon.ico' || link === 'dashboard.html' || link === 'login.html') return res.status(404).end();

  const user = users.find(u => u.bookingLink === link);

  if (user) {
    res.send(`
      <html>
        <head>
          <meta charset="utf-8">
          <title>Запись к ${user.name}</title>
          <style>
            body { font-family: 'Manrope', sans-serif; padding: 50px; text-align: center; background: #f4f4f2; color: #1a1a1a; }
            .card { background: #fff; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            h1 { font-family: 'Oswald', sans-serif; text-transform: uppercase; font-size: 2.5rem; margin-bottom: 10px; }
            p { color: #7a7a7a; margin-bottom: 20px; }
            .service { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Запись к фотографу</h1>
            <p>${user.name}</p>
            <p>${user.bio || 'Добро пожаловать!'}</p>
            <div style="margin-top: 30px; text-align: left;">
              <h3>Выберите услугу:</h3>
              ${user.services.map(s => `<div class="service">${s.name} — ${s.price} ₽</div>`).join('')}
            </div>
            <p style="margin-top: 30px; font-size: 0.8rem;">Это демонстрационная страница. Скоро здесь будет полноценная онлайн-запись.</p>
            <a href="/" style="color: #7c1c2e; font-weight: bold; text-decoration: none;">Вернуться на главную</a>
          </div>
        </body>
      </html>
    `);
  } else {
    res.status(404).send('Страница не найдена');
  }
});

/* ======================= OAUTH ======================= */

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