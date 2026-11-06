window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const linkToRegister = document.getElementById('link-to-register');
  const linkToLogin = document.getElementById('link-to-login');

  // ==========================================
  // 1. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (Вход / Регистрация)
  // ==========================================
  function switchForm(type) {
    if (type === 'register') {
      formLogin.classList.remove('active');
      formRegister.classList.add('active');
      window.location.hash = 'register';
    } else {
      formRegister.classList.remove('active');
      formLogin.classList.add('active');
      window.location.hash = 'login';
    }
  }

  if (linkToRegister) {
    linkToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      switchForm('register');
    });
  }

  if (linkToLogin) {
    linkToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      switchForm('login');
    });
  }

  // Проверяем хэш в URL при загрузке (если перешли по кнопке "Попробовать")
  if (window.location.hash === '#register') {
    switchForm('register');
  } else if (window.location.hash === '#login') {
    switchForm('login');
  }

  // ==========================================
  // 2. ОТПРАВКА ФОРМЫ ВХОДА (Login)
  // ==========================================
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      const submitBtn = formLogin.querySelector('button[type="submit"]');

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Меняем текст кнопки, чтобы показать загрузку
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Загрузка...';
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (res.ok) {
          // Успешный вход - перекидываем в кабинет
          window.location.href = '/dashboard.html';
        } else {
          // Сервер вернул ошибку (неверный пароль и т.д.)
          const data = await res.json();
          alert('Ошибка входа: ' + (data.message || 'Неверный email или пароль'));
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка соединения с сервером. Проверьте, запущен ли Node.js.');
      } finally {
        // Возвращаем кнопку в исходное состояние
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // ==========================================
  // 3. ОТПРАВКА ФОРМЫ РЕГИСТРАЦИИ (Register)
  // ==========================================
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = document.getElementById('reg-email');
      const passwordInput = document.getElementById('reg-password');
      const submitBtn = formRegister.querySelector('button[type="submit"]');

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Простая проверка длины пароля на клиенте
      if (password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
      }

      // Меняем текст кнопки
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Создание...';
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (res.ok) {
          // Успешная регистрация - сервер сам авторизует и мы переходим в кабинет
          window.location.href = '/dashboard.html';
        } else {
          // Ошибка (например, email уже занят)
          const data = await res.json();
          alert('Ошибка регистрации: ' + (data.error || 'Попробуйте другой email'));
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка соединения с сервером.');
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
});