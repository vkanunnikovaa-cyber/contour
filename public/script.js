window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');
  
  const burger = document.querySelector('.burger');
  const header = document.querySelector('.header');
  
  const mobileMenu = document.createElement('nav');
  mobileMenu.className = 'mobile-menu';
  mobileMenu.innerHTML = `
    <a href="#website">Сайт</a>
    <a href="#gallery">Галереи</a>
    <a href="#booking">Бронирование</a>
    <a href="#calendar">Календарь</a>
    <a href="#pricing">Тарифы</a>
    <a href="login.html" class="btn btn--outline">Войти</a>
    <a href="login.html#register" class="btn btn--primary">Попробовать</a>
  `;
  document.body.appendChild(mobileMenu);

  if (burger) {
    burger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');
  
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px' });
  
  sections.forEach(section => sectionObserver.observe(section));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});