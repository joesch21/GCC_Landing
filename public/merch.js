const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

qsa('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    qsa('.filter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    qsa('.product-card').forEach((card) => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
    });
  });
});

const waitlistForm = qs('#waitlistForm');
if (waitlistForm) {
  waitlistForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = qs('#email').value.trim();
    if (!email) return;
    qs('#waitlistMessage').textContent = 'Interest noted locally for this preview. Mailing-list integration will be connected after sample approval.';
    event.currentTarget.reset();
  });
}
