// assets/js/main.js
// Mobile menu toggle and AJAX form submission.

const qs = (s,doc=document)=>doc.querySelector(s);
const qsa = (s,doc=document)=>Array.from(doc.querySelectorAll(s));

// Mobile nav
const hamb = qs('#hamb');
const mobileMenu = qs('#mobileMenu');
if(hamb && mobileMenu){
  hamb.addEventListener('click', () => {
    mobileMenu.classList.toggle('show');
  });
}

// Set active nav link based on pathname
const path = location.pathname.split('/').pop() || 'index.html';
qsa('[data-nav]').forEach(a => {
  const target = a.getAttribute('href');
  if ((path === '' && target.endsWith('index.html')) || path === target) {
    a.classList.add('active');
  }
});

// Form helpers
function serializeForm(form){
  const fd = new FormData(form);
  const data = {};
  for(const [k,v] of fd.entries()){ data[k]=v.trim(); }
  return data;
}

async function submitForm(form){
  const endpoint = form.getAttribute('action') || '/forms/process_form.php';
  const resultBox = form.querySelector('.form-result');
  resultBox?.classList.add('hidden');
  const payload = serializeForm(form);

  // basic client validation
  if(!payload.name || !payload.phone || !payload.email){
    if(resultBox){
      resultBox.textContent = 'Please complete all fields.';
      resultBox.className = 'form-result muted';
    }
    return;
  }

  // simple honeypot: if filled, abort
  if(payload.website){
    return;
  }

  try{
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {'Accept':'application/json'},
      body: new FormData(form) // keep as FormData to support PHP file_get_contents + $_POST
    });
    const ct = res.headers.get('content-type') || '';
    let data;
    if(ct.includes('application/json')){
      data = await res.json();
    }else{
      const text = await res.text();
      try{ data = JSON.parse(text); }catch(e){ data = {ok:false, error:'Unexpected response'}; }
    }

    if(data.ok){
      if(resultBox){
        resultBox.textContent = 'Thank you. We will contact you soon.';
        resultBox.className = 'form-result';
      }
      form.reset();
    }else{
      if(resultBox){
        resultBox.textContent = data.error || 'Failed to submit. Try again.';
        resultBox.className = 'form-result muted';
      }
    }
  }catch(err){
    if(resultBox){
      resultBox.textContent = 'Network error. Try again.';
      resultBox.className = 'form-result muted';
    }
  }
}

// Bind all forms with data-ajax
qsa('form[data-ajax="true"]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    submitForm(form);
  });
});

// Testimonials carousel controls
document.querySelectorAll('.testimonial-slider').forEach(slider => {
  const prev = slider.parentElement.querySelector('.prevBtn');
  const next = slider.parentElement.querySelector('.nextBtn');
  if(prev && next){
    prev.addEventListener('click', ()=>{
      slider.scrollBy({left:-slider.clientWidth, behavior:'smooth'});
    });
    next.addEventListener('click', ()=>{
      slider.scrollBy({left:slider.clientWidth, behavior:'smooth'});
    });
  }
});

// --- Testimonials Carousel ---
(function(){
  const root = document.querySelector('[data-carousel="testimonials"]');
  if(!root) return;
  const track = root.querySelector('.carousel-track');
  const slides = Array.from(root.querySelectorAll('.carousel-slide'));
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const dotsWrap = root.querySelector('.carousel-dots');
  if(!track || !slides.length) return;

  let idx = 0;
  let autoTimer = null;
  const autoplayMs = 5000;

  function renderDots(){
    dotsWrap.innerHTML = '';
    slides.forEach((_,i)=>{
      const b = document.createElement('button');
      b.className = 'carousel-dot' + (i===idx ? ' active' : '');
      b.setAttribute('aria-label', 'Go to slide ' + (i+1));
      b.addEventListener('click', ()=>{ go(i, true); });
      dotsWrap.appendChild(b);
    });
  }

  function go(newIdx, manual=false){
    idx = (newIdx + slides.length) % slides.length;
    const x = -idx * 100;
    track.style.transform = `translateX(${x}%)`;
    renderDots();
    if(manual) restart();
  }

  function step(delta){
    go(idx + delta, true);
  }

  function start(){
    stop();
    autoTimer = setInterval(()=> go(idx+1, false), autoplayMs);
  }
  function stop(){ if(autoTimer) clearInterval(autoTimer); autoTimer = null; }
  function restart(){ start(); }

  prev?.addEventListener('click', ()=> step(-1));
  next?.addEventListener('click', ()=> step(1));
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  window.addEventListener('visibilitychange', ()=>{
    if(document.hidden) stop(); else start();
  });

  // Init
  renderDots();
  go(0);
  start();
})();

// --- Desktop popups: page-load + exit intent + global redirect (5s gate) ---
(function () {
  const mq = window.matchMedia('(min-width:1024px)');
  if (!mq.matches) return; // desktop only

  const offerUrl = 'https://usafeed.66media.today';
  const pagePopup = document.getElementById('offerPopup');
  const exitPopup = document.getElementById('exitIntentPopup');
  if (!pagePopup || !exitPopup) return;

  let active = null;        // 'page' | 'exit' | null
  let redirected = false;
  let exitAllowed = false;  // becomes true exactly 5s after load

  function showPage() {
    pagePopup.hidden = false;
    document.documentElement.classList.add('sh-no-scroll');
    active = 'page';
  }
  function showExitOnTop() {
    // do NOT hide the image popup; just layer exit on top
    exitPopup.hidden = false;
    document.documentElement.classList.add('sh-no-scroll');
    active = 'exit';
  }
  function hideAll() {
    pagePopup.hidden = true;
    exitPopup.hidden  = true;
    document.documentElement.classList.remove('sh-no-scroll');
    active = null;
  }
  function redirectOnce() {
    if (redirected) return;
    redirected = true;
    window.open(offerUrl, '_blank', 'noopener');
    hideAll();
  }

  // Show image popup immediately on load
  showPage();

  // Arm exit intent exactly 5 seconds after load
  setTimeout(() => { exitAllowed = true; }, 1000);

  // Exit intent → show exit popup ON TOP of image popup (no extra delay)
  document.addEventListener('mouseout', (e) => {
    if (!exitAllowed) return;
    if (e.clientY <= 0 && exitPopup.hidden) {
      showExitOnTop();
    }
  });

  // Any click anywhere while a popup is active → redirect (single open)
  document.addEventListener('click', () => {
    if (active) redirectOnce();
  }, { capture: true });

  // Keyboard fallback
  document.addEventListener('keydown', (e) => {
    if (active && (e.key === 'Enter' || e.key === ' ')) redirectOnce();
  });
})();
