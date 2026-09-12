const state = {
  bag: JSON.parse(localStorage.getItem('condor-bag') || '[]')
};

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

function saveBag() {
  localStorage.setItem('condor-bag', JSON.stringify(state.bag));
}

function formatAud(value) {
  return `A$${value}`;
}

function renderBag() {
  const count = state.bag.reduce((sum, item) => sum + item.qty, 0);
  const total = state.bag.reduce((sum, item) => sum + item.price * item.qty, 0);
  qs('#bagCount').textContent = count;
  qs('#bagTotal').textContent = formatAud(total);
  const container = qs('#bagItems');

  if (!state.bag.length) {
    container.innerHTML = '<p class="bag-empty">Your bag is empty. Drop 01 is waiting.</p>';
    return;
  }

  container.innerHTML = state.bag.map((item, index) => `
    <div class="bag-item">
      <div>
        <h4>${item.name}</h4>
        <p>${formatAud(item.price)} × ${item.qty}</p>
      </div>
      <button type="button" data-remove="${index}">Remove</button>
    </div>
  `).join('');

  qsa('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      state.bag.splice(Number(button.dataset.remove), 1);
      saveBag();
      renderBag();
    });
  });
}

function addToBag(name, price) {
  const existing = state.bag.find((item) => item.name === name);
  if (existing) existing.qty += 1;
  else state.bag.push({ name, price, qty: 1 });
  saveBag();
  renderBag();
  openBag();
}

function openBag() {
  qs('#drawerBackdrop').hidden = false;
  qs('#bagDrawer').classList.add('open');
  qs('#bagDrawer').setAttribute('aria-hidden', 'false');
}

function closeBag() {
  qs('#drawerBackdrop').hidden = true;
  qs('#bagDrawer').classList.remove('open');
  qs('#bagDrawer').setAttribute('aria-hidden', 'true');
}

qsa('.add-button').forEach((button) => {
  button.addEventListener('click', () => {
    addToBag(button.dataset.name, Number(button.dataset.price));
  });
});

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

qs('#bagButton').addEventListener('click', openBag);
qs('#closeBag').addEventListener('click', closeBag);
qs('#drawerBackdrop').addEventListener('click', closeBag);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeBag();
});

qs('#waitlistForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const email = qs('#email').value.trim();
  if (!email) return;
  qs('#waitlistMessage').textContent = 'Concept captured — connect this form to your mailing platform in phase 2.';
  event.currentTarget.reset();
});

qs('#checkoutButton').addEventListener('click', () => {
  alert('Checkout is intentionally not wired in this design prototype. Next phase: choose Shopify, Stripe Checkout, or another commerce backend and connect fulfilment.');
});

renderBag();
