const i18n = {
  pt: {
    submit: 'SUBMETA ↗', journalLabel: 'PERIÓDICO DIAMOND OPEN ACCESS · ABRALIN',
    introTitle: 'Linguística aberta, rigorosa e acessível.',
    introText: 'Acesso rápido às publicações, notícias, chamadas e redes de Cadernos de Linguística.',
    featured: 'DESTAQUE', featuredLabel: 'EM DESTAQUE', readMore: 'ABRIR ↗',
    recentArticles: 'PUBLICADOS RECENTEMENTE', allArticles: 'VER TODOS OS ARTIGOS ↗',
    newsCalls: 'NOTÍCIAS & CHAMADAS', allNews: 'VER TODAS AS NOTÍCIAS ↗',
    submitPaper: 'SUBMETA SEU ARTIGO', journalSite: 'SITE DA REVISTA', newsletter: 'ASSINE A NEWSLETTER',
    footer: 'Um periódico da Associação Brasileira de Linguística · Abralin', expires: 'ATÉ',
    loading: 'Carregando…', articlesError: 'Não foi possível carregar os artigos recentes.',
    newsError: 'Não foi possível carregar as notícias recentes.'
  },
  en: {
    submit: 'SUBMIT ↗', journalLabel: 'DIAMOND OPEN ACCESS JOURNAL · ABRALIN',
    introTitle: 'Open, rigorous and accessible linguistics.',
    introText: 'Quick access to publications, news, calls and the social channels of Cadernos de Linguística.',
    featured: 'FEATURED', featuredLabel: 'FEATURED', readMore: 'OPEN ↗',
    recentArticles: 'RECENTLY PUBLISHED', allArticles: 'VIEW ALL ARTICLES ↗',
    newsCalls: 'NEWS & CALLS', allNews: 'VIEW ALL NEWS ↗',
    submitPaper: 'SUBMIT YOUR PAPER', journalSite: 'JOURNAL WEBSITE', newsletter: 'SUBSCRIBE TO NEWSLETTER',
    footer: 'A journal of the Brazilian Linguistics Association · Abralin', expires: 'UNTIL',
    loading: 'Loading…', articlesError: 'Recent articles could not be loaded.',
    newsError: 'Recent news could not be loaded.'
  }
};
const social = [
  ['Bluesky', 'https://bsky.app/profile/cadlin.bsky.social'],
  ['WhatsApp', 'https://chat.whatsapp.com/I0ZhvMMyEjREqw4eGweBar'],
  ['Instagram', 'https://www.instagram.com/cadernosl/'],
  ['Mastodon', 'https://c.im/@cadlin'],
  ['Facebook', 'https://www.facebook.com/@CadernosL'],
  ['X', 'https://x.com/CadernosL'],
  ['LinkedIn', 'https://www.linkedin.com/company/105709503/'],
  ['Threads', 'https://www.threads.net/@cadernosl'],
  ['Substack', 'https://substack.com/@cadlin']
];
let lang = localStorage.getItem('cadlin-lang') || (navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en');
let articles = [], news = [], featured = null;
const $ = (sel) => document.querySelector(sel);
const escapeHtml = (s = '') => String(s).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
function safeHttpsUrl(value) { try { const u = new URL(String(value || '')); return u.protocol === 'https:' ? u.toString() : null; } catch { return null; } }
function localizedTitle(item) { const v=item?.titles||{}; return v[lang] || (lang==='pt'?v.pt:v.en) || v.pt || v.en || item?.title || Object.values(v)[0] || ''; }
function applyTranslations() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => { const key=el.dataset.i18n; if (i18n[lang][key]) el.textContent=i18n[lang][key]; });
  $('#langToggle').textContent = lang === 'pt' ? 'EN' : 'PT';
}
function renderSocial() { $('#socialLinks').innerHTML = social.map(([label,url]) => `<a class="social-link" href="${url}" target="_blank" rel="noopener"><span>${escapeHtml(label)}</span><span class="social-arrow" aria-hidden="true">↗</span></a>`).join(''); }
function formatDate(dateValue, compact=false) {
  if (!dateValue) return '';
  const d = new Date(`${dateValue}T12:00:00`); if (Number.isNaN(d.getTime())) return dateValue;
  if (compact) { const month = new Intl.DateTimeFormat(lang==='pt'?'pt-BR':'en',{month:'short'}).format(d).replace('.','').toUpperCase(); return `${String(d.getDate()).padStart(2,'0')} _ ${month}`; }
  return new Intl.DateTimeFormat(lang==='pt'?'pt-BR':'en',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}
function validFeatured(item) { if (!item || !item.text || !safeHttpsUrl(item.url)) return false; if (!item.expiresAt) return true; const end=new Date(`${item.expiresAt}T23:59:59`); return Number.isNaN(end.getTime()) || new Date()<=end; }
function renderFeatured() {
  const section=$('#featuredSection'); if (!validFeatured(featured)) { section.hidden=true; return; }
  section.hidden=false; $('#featuredCard').href=safeHttpsUrl(featured.url); $('#featured-heading').textContent=featured.text;
  $('#featuredExpiry').textContent=featured.expiresAt ? `${i18n[lang].expires} ${formatDate(featured.expiresAt)}` : '';
}
function renderArticles() {
  const root=$('#articlesList'), valid=articles.filter(a=>safeHttpsUrl(a.url));
  if (!valid.length) { root.innerHTML=`<div class="error-row">${escapeHtml(i18n[lang].articlesError)}</div>`; return; }
  root.innerHTML=valid.slice(0,10).map(a=>`<a class="article-card" href="${safeHttpsUrl(a.url)}" target="_blank" rel="noopener"><span class="article-date">${escapeHtml(formatDate(a.date,true))}</span><span><span class="article-title">${escapeHtml(localizedTitle(a))}</span><span class="article-author">${escapeHtml((a.authors||[]).join(' · '))}</span>${a.doi?`<span class="article-doi">${escapeHtml(a.doi)}</span>`:''}</span><span class="article-arrow" aria-hidden="true">↗</span></a>`).join('');
}
function renderNews() {
  const root=$('#newsList'), valid=news.filter(n=>safeHttpsUrl(n.url));
  if (!valid.length) { root.innerHTML=`<div class="error-row">${escapeHtml(i18n[lang].newsError)}</div>`; return; }
  root.innerHTML=valid.slice(0,3).map(n=>`<a class="news-card" href="${safeHttpsUrl(n.url)}" target="_blank" rel="noopener"><span class="news-date">${escapeHtml(formatDate(n.date))}</span><span class="news-title">${escapeHtml(localizedTitle(n))}</span><span aria-hidden="true">↗</span></a>`).join('');
}
async function loadFeatured() {
  try { const r=await fetch('./api/featured',{cache:'no-store'}); if (!r.ok) throw new Error(`API ${r.status}`); const json=await r.json(); featured=json.featured||null; }
  catch (err) { console.warn('API de destaque indisponível; nenhum destaque será exibido.',err); featured=null; }
}
async function loadContent() {
  $('#articlesList').innerHTML=`<div class="loading-row">${escapeHtml(i18n[lang].loading)}</div>`;
  $('#newsList').innerHTML=`<div class="loading-row">${escapeHtml(i18n[lang].loading)}</div>`;
  const [a,n]=await Promise.allSettled([
    fetch('./data/articles.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(r.status))),
    fetch('./data/news.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(r.status)))
  ]);
  articles=a.status==='fulfilled'?a.value.articles||[]:[]; news=n.status==='fulfilled'?n.value.news||[]:[];
}
async function init(){ applyTranslations(); renderSocial(); await Promise.all([loadFeatured(),loadContent()]); renderFeatured(); renderArticles(); renderNews(); }
$('#langToggle').addEventListener('click',()=>{ lang=lang==='pt'?'en':'pt'; localStorage.setItem('cadlin-lang',lang); applyTranslations(); renderFeatured(); renderArticles(); renderNews(); });
init();
