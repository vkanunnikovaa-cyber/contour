document.addEventListener('DOMContentLoaded', async () => {
  document.body.style.opacity = '1';
  
  // 1. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ РАЗДЕЛОВ В САЙДБАРЕ
  const sidebarLinks = document.querySelectorAll('.sidebar__link[data-target]');
  const viewSections = document.querySelectorAll('.view-section');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      viewSections.forEach(v => v.style.display = 'none');
      
      const targetId = link.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.style.display = 'block';
      }
    });
  });

  // 2. ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ И ОНБОРДИНГ
  try {
    const res = await fetch('/api/me');
    if (!res.ok) throw new Error('Not auth');
    const data = await res.json();
    const user = data.user;

    // Устанавливаем аватар и email в сайдбаре
    document.getElementById('userAvatar').textContent = user.name ? user.name.charAt(0).toUpperCase() : 'П';
    document.getElementById('sidebar-email').textContent = user.email || 'Нет email';

    // ЛОГИКА ОНБОРДИНГА
    if (!user.isProfileFilled) {
      document.getElementById('screen-profile').style.display = 'block';
      document.getElementById('view-main').style.display = 'none';
      
      // Блокируем меню, пока онбординг не пройден
      document.querySelectorAll('.sidebar__link').forEach(l => l.style.pointerEvents = 'none');
      
      // На первом шаге мы НЕ вставляем имя из соцсетей, чтобы пользователь сам его ввел
      document.getElementById('prof-name').value = '';
      
      document.getElementById('form-profile').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('prof-name').value;
        const bio = document.getElementById('prof-bio').value;
        await fetch('/api/profile', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ name, bio }) 
        });
        window.location.reload();
      });

    } else if (user.services.length === 0) {
      document.getElementById('screen-service').style.display = 'block';
      document.getElementById('view-main').style.display = 'none';
      
      // На шагах 2 и 3 имя уже можно использовать (если нужно)
      // document.getElementById('name-service').textContent = user.name; // (если добавите этот ID)
      
      document.getElementById('form-service').addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceName = document.getElementById('serv-name').value;
        const price = document.getElementById('serv-price').value;
        await fetch('/api/services', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ serviceName, price }) 
        });
        window.location.reload();
      });

    } else if (!user.bookingLink) {
      document.getElementById('screen-link').style.display = 'block';
      document.getElementById('view-main').style.display = 'none';
      
      const linkInput = document.getElementById('link-name');
      linkInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      });
      
      document.getElementById('form-link').addEventListener('submit', async (e) => {
        e.preventDefault();
        const link = linkInput.value;
        const res = await fetch('/api/link', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ link }) 
        });
        if (res.ok) window.location.reload();
        else {
          const err = await res.json();
          const errEl = document.getElementById('link-error');
          errEl.textContent = err.error;
          errEl.style.display = 'block';
        }
      });

    } else {
      // Всё заполнено - показываем Дашборд
      document.getElementById('view-main').style.display = 'block';
      
      // Подставляем имя только здесь
      document.getElementById('name-dash').textContent = user.name;
      
      const finalLink = document.getElementById('final-link');
      finalLink.textContent = `contour.ru/${user.bookingLink}`;
      finalLink.href = `/${user.bookingLink}`;

      const sideLink = document.getElementById('sidebar-profile-link');
      sideLink.href = `/${user.bookingLink}`;
    }

  } catch (err) {
    window.location.href = '/login.html';
  }
});