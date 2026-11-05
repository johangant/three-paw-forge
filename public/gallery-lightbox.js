// Progressive enhancement: without dialog support or JavaScript, links open JPEGs.
const dialog = document.querySelector('#gallery-lightbox');
const links = [...document.querySelectorAll('[data-gallery-photo]')];

if (dialog && typeof dialog.showModal === 'function' && links.length) {
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('[data-caption]');
  const counter = dialog.querySelector('[data-counter]');
  const original = dialog.querySelector('[data-original]');
  const close = dialog.querySelector('[data-close]');
  const previous = dialog.querySelector('[data-previous]');
  const next = dialog.querySelector('[data-next]');
  let index = 0;
  let opener;
  let previousOverflow;

  function showPhoto(position) {
    index = (position + links.length) % links.length;
    const link = links[index];
    image.alt = link.querySelector('img').alt;
    image.src = link.href;
    caption.textContent = link.closest('figure').querySelector('figcaption').textContent.trim();
    counter.textContent = `Photograph ${index + 1} of ${links.length}. `;
    original.href = link.href;
  }

  for (const [position, link] of links.entries()) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      showPhoto(position);
      previousOverflow = document.documentElement.style.overflow;
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
      close.focus();
    });
  }
  previous.hidden = next.hidden = links.length < 2;
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => showPhoto(index - 1));
  next.addEventListener('click', () => showPhoto(index + 1));
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const positions = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: links.length - 1 };
    if (Object.hasOwn(positions, event.key)) {
      event.preventDefault();
      showPhoto(positions[event.key]);
    }
  });
  // Native modal dialog supplies Escape handling and keeps focus inside the viewer.
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    image.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
}
