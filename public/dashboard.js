document.addEventListener('DOMContentLoaded', async () => {
  document.body.style.opacity = '1';

  // 1. ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ
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
      if (targetSection) targetSection.style.display = 'block';
    });
  });

  // 2. ПОЛУЧАЕМ ПОЛЬЗОВАТЕЛЯ
  try {
    const res = await fetch('/api/me');
    if (!res.ok) throw new Error('Not auth');
    const data = await res.json();
    const user = data.user;

    document.getElementById('userAvatar').textContent = user.name ? user.name.charAt(0).toUpperCase() : 'П';
    document.getElementById('sidebar-email').textContent = user.email || 'Нет email';

    // 3. ЛОГИКА: ЕСЛИ ПРОФИЛЬ НЕ ЗАПОЛНЕН - ПОКАЗЫВАЕМ ФОРМУ
    if (!user.isProfileFilled) {
      document.getElementById('onboarding-screen').style.display = 'block';
      document.getElementById('view-main').style.display = 'none';
      
      document.querySelectorAll('.sidebar__link').forEach(l => l.style.pointerEvents = 'none');

      const linkInput = document.getElementById('onb-link');
      const hintLink = document.getElementById('hint-link');
      const errLink = document.getElementById('err-link');

      linkInput.addEventListener('input', async (e) => {
        e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const link = e.target.value;
        
        hintLink.style.display = 'none';
        errLink.style.display = 'none';

        if (link.length > 2) {
          const res = await fetch('/api/check-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
          });
          const check = await res.json();
          
          if (check.available) {
            hintLink.style.display = 'block';
            linkInput.style.borderColor = '#10b981';
          } else {
            errLink.textContent = 'Этот адрес уже занят';
            errLink.style.display = 'block';
            linkInput.style.borderColor = '#ef4444';
          }
        }
      });

      document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btn-onboarding');
        const errorEl = document.getElementById('onboarding-error');
        
        btn.disabled = true;
        btn.textContent = 'Сохранение...';
        errorEl.style.display = 'none';

        const payload = {
          name: document.getElementById('onb-name').value,
          bio: document.getElementById('onb-bio').value,
          serviceName: document.getElementById('onb-service').value,
          price: document.getElementById('onb-price').value,
          bookingLink: document.getElementById('onb-link').value
        };

        try {
          const res = await fetch('/api/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            window.location.reload();
          } else {
            const err = await res.json();
            errorEl.textContent = err.error;
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Сохранить и перейти в кабинет';
          }
        } catch (error) {
          errorEl.textContent = 'Ошибка соединения';
          errorEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Сохранить и перейти в кабинет';
        }
      });

    } else {
      // 4. ЕСЛИ ПРОФИЛЬ ЗАПОЛНЕН - ПОКАЗЫВАЕМ ДАШБОРД
      document.getElementById('view-main').style.display = 'block';
      document.getElementById('name-dash').textContent = user.name;
      
      // Новая ссылка
      document.getElementById('final-link-text').textContent = `contour.ru/${user.bookingLink}`;
      
      const sideLink = document.getElementById('sidebar-profile-link');
      sideLink.href = `/${user.bookingLink}`;
    }

  } catch (err) {
    window.location.href = '/login.html';
  }
});

// Функция копирования ссылки (вызывается из HTML)
window.copyLink = function() {
  const link = document.getElementById('final-link-text').textContent;
  navigator.clipboard.writeText(link).then(() => {
    const successMsg = document.getElementById('copy-success');
    successMsg.style.display = 'block';
    setTimeout(() => {
      successMsg.style.display = 'none';
    }, 3000);
  });
};