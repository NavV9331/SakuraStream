/* ============================================
   SakuraStream — Complete Application Logic
   Router, TMDB API, Rendering, State
   ============================================ */

// ─── Configuration ───
const CONFIG = {
  TMDB_KEY: '4e44d9029b1270a757cddc766a1bcb63',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p',
  EMBED_PROVIDERS: [
    { name: 'VidLink', movieUrl: 'https://vidlink.pro/movie/{id}', tvUrl: 'https://vidlink.pro/tv/{id}/{season}/{episode}' },
    { name: 'Embed.su', movieUrl: 'https://embed.su/embed/movie/{id}', tvUrl: 'https://embed.su/embed/tv/{id}/{season}/{episode}' },
    { name: 'Vidsrc.net', movieUrl: 'https://vidsrc.net/embed/movie?tmdb={id}', tvUrl: 'https://vidsrc.net/embed/tv?tmdb={id}&season={season}&episode={episode}' },
    { name: 'Vidsrc.cc', movieUrl: 'https://vidsrc.cc/v2/embed/movie/{id}', tvUrl: 'https://vidsrc.cc/v2/embed/tv/{id}/{season}/{episode}' },
    { name: 'Vidsrc.pro', movieUrl: 'https://vidsrc.pro/embed/movie/{id}', tvUrl: 'https://vidsrc.pro/embed/tv/{id}/{season}/{episode}' },
    { name: 'AutoEmbed', movieUrl: 'https://player.autoembed.cc/embed/movie/{id}', tvUrl: 'https://player.autoembed.cc/embed/tv/{id}/{season}/{episode}' },
    { name: 'Vidsrc.in', movieUrl: 'https://vidsrc.in/embed/movie?tmdb={id}', tvUrl: 'https://vidsrc.in/embed/tv?tmdb={id}&season={season}&episode={episode}' },
    { name: 'SmashyStream', movieUrl: 'https://player.smashy.stream/movie/{id}', tvUrl: 'https://player.smashy.stream/tv/{id}?s={season}&e={episode}' }
  ],
  HERO_ROTATE_MS: 7000,
  SEARCH_DEBOUNCE_MS: 400,
};

// ─── Genre Map ───
const GENRE_MAP = {
  28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',
  18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',
  9648:'Mystery',10749:'Romance',878:'Science Fiction',10770:'TV Movie',53:'Thriller',
  10752:'War',37:'Western',10759:'Action & Adventure',10762:'Kids',10763:'News',
  10764:'Reality',10765:'Sci-Fi & Fantasy',10766:'Soap',10767:'Talk',10768:'War & Politics',
};

// ─── State ───
const state = {
  currentPage: 'home',
  heroSlideIndex: 0,
  heroInterval: null,
  searchTimeout: null,
  pageData: {},
  genreMovieList: null,
  genreTvList: null,
};

// ─── SVG Icons ───
const ICONS = {
  play: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>',
  bookmark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
  bookmarkFilled: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
};

// ─── TMDB API Service ───
const APICache = new Map();
const API = {
  async get(endpoint, params = {}) {
    const url = new URL(`${CONFIG.TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', CONFIG.TMDB_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const urlString = url.toString();
    
    // 5-minute cache TTL to prevent stale data and memory leaks
    if (APICache.has(urlString)) {
      const cached = APICache.get(urlString);
      if (Date.now() - cached.time < 300000) return cached.data;
      APICache.delete(urlString);
    }

    try {
      const res = await fetch(urlString);
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      APICache.set(urlString, { data, time: Date.now() });
      return data;
    } catch (e) {
      console.error('API fetch error:', e);
      return null;
    }
  },
  trending(timeWindow = 'day', page = 1) { return this.get(`/trending/all/${timeWindow}`, { page }); },
  trendingMovies(page = 1) { return this.get('/trending/movie/week', { page }); },
  trendingTv(page = 1) { return this.get('/trending/tv/week', { page }); },
  popularMovies(page = 1) { return this.get('/movie/popular', { page }); },
  topRatedMovies(page = 1) { return this.get('/movie/top_rated', { page }); },
  nowPlayingMovies(page = 1) { return this.get('/movie/now_playing', { page }); },
  upcomingMovies(page = 1) { return this.get('/movie/upcoming', { page }); },
  popularTv(page = 1) { return this.get('/tv/popular', { page }); },
  topRatedTv(page = 1) { return this.get('/tv/top_rated', { page }); },
  airingTodayTv(page = 1) { return this.get('/tv/airing_today', { page }); },
  searchMulti(query, page = 1) { return this.get('/search/multi', { query, page }); },
  movieDetails(id) { return this.get(`/movie/${id}`, { append_to_response: 'credits,videos,similar,recommendations' }); },
  tvDetails(id) { return this.get(`/tv/${id}`, { append_to_response: 'credits,videos,similar,recommendations' }); },
  tvSeason(tvId, seasonNum) { return this.get(`/tv/${tvId}/season/${seasonNum}`); },
  discoverMovies(params = {}) { return this.get('/discover/movie', { sort_by: 'popularity.desc', ...params }); },
  discoverTv(params = {}) { return this.get('/discover/tv', { sort_by: 'popularity.desc', ...params }); },
};

// ─── Image Helpers ───
function posterUrl(path, size = 'w342') {
  return path ? `${CONFIG.IMG_BASE}/${size}${path}` : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="342" height="513" fill="%23181820"%3E%3Crect width="342" height="513" rx="8"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23333" font-size="16" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
}
function backdropUrl(path, size = 'original') {
  return path ? `${CONFIG.IMG_BASE}/${size}${path}` : '';
}
function profileUrl(path) {
  return path ? `${CONFIG.IMG_BASE}/w185${path}` : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="185" height="185" fill="%23181820"%3E%3Crect width="185" height="185" rx="92"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23444" font-size="14" font-family="sans-serif"%3ENo Photo%3C/text%3E%3C/svg%3E';
}

// ─── Watchlist (LocalStorage) ───
const Watchlist = {
  KEY: 'sakurastream_watchlist',
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  save(list) { localStorage.setItem(this.KEY, JSON.stringify(list)); },
  has(id, type) { return this.get().some(i => i.id === id && i.type === type); },
  add(item) {
    const list = this.get();
    if (!list.some(i => i.id === item.id && i.type === item.type)) {
      list.unshift(item);
      this.save(list);
    }
  },
  remove(id, type) {
    const list = this.get().filter(i => !(i.id === id && i.type === type));
    this.save(list);
  },
  toggle(item) {
    if (this.has(item.id, item.type)) { this.remove(item.id, item.type); return false; }
    else { this.add(item); return true; }
  },
};

// ─── Utility Helpers ───
function getTitle(item) { return item.title || item.name || 'Untitled'; }
function getYear(item) { return (item.release_date || item.first_air_date || '').substring(0, 4); }
function getType(item) { return item.media_type || (item.first_air_date ? 'tv' : 'movie'); }
function getRating(item) { return item.vote_average ? item.vote_average.toFixed(1) : 'N/A'; }

// ─── Content Filtering ───
const TODAY_STR = new Date().toISOString().split('T')[0];
function isAvailable(item) { return Boolean(item.poster_path); }
function isReleased(item) {
  if (!isAvailable(item)) return false;
  const date = item.release_date || item.first_air_date;
  return !date || date <= TODAY_STR;
}
function isUpcoming(item) {
  if (!isAvailable(item)) return false;
  const date = item.release_date || item.first_air_date;
  return date && date > TODAY_STR;
}

function getGenreNames(ids) {
  if (!ids) return [];
  return ids.slice(0, 3).map(id => GENRE_MAP[id]).filter(Boolean);
}
function genreNamesFromObjs(genres) {
  return (genres || []).map(g => g.name);
}
function formatRuntime(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function timeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((new Date() - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval >= 2) return Math.floor(interval) + " days ago";
  if (interval >= 1) return "Yesterday";
  interval = seconds / 3600;
  if (interval >= 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval >= 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
}

// ─── Top Loader ───
function showLoader() {
  const el = document.getElementById('topLoader');
  el.className = 'top-loader loading';
}
function hideLoader() {
  const el = document.getElementById('topLoader');
  el.className = 'top-loader done';
  setTimeout(() => el.className = 'top-loader hidden', 300);
  setTimeout(() => el.className = 'top-loader', 600);
}

// ─── Router ───
function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('?');
  const path = parts[0];
  const queryString = parts[1] || '';
  const query = {};
  queryString.split('&').filter(Boolean).forEach(p => {
    const [k, v] = p.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return { path, query };
}

async function handleRoute() {
  const { path, query } = getRoute();
  showLoader();
  clearHeroInterval();

  // Update nav active link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === getPageFromPath(path));
  });

  const app = document.getElementById('app');

  try {
    if (path === '/' || path === '') {
      await renderHome(app);
    } else if (path === '/movies') {
      await renderMoviesPage(app, query);
    } else if (path === '/tv') {
      await renderTvPage(app, query);
    } else if (path.startsWith('/movie/') && !path.includes('/watch')) {
      const id = path.split('/')[2];
      await renderDetailPage(app, 'movie', id);
    } else if (path.startsWith('/tv/') && !path.includes('/watch')) {
      const id = path.split('/')[2];
      await renderDetailPage(app, 'tv', id);
    } else if (path.startsWith('/watch/movie/')) {
      const id = path.split('/')[3];
      await renderWatchPage(app, 'movie', id);
    } else if (path.startsWith('/watch/tv/')) {
      const parts2 = path.split('/');
      await renderWatchPage(app, 'tv', parts2[3], query.s || '1', query.e || '1');
    } else if (path === '/watchlist') {
      renderWatchlistPage(app);
    } else if (path === '/search') {
      await renderSearchPage(app, query);
    } else {
      app.innerHTML = `<div class="page-content"><div class="empty-state"><h2 class="empty-state-title">Page Not Found</h2><p class="empty-state-text">The page you're looking for doesn't exist.</p><a href="#/" class="btn btn-accent" style="margin-top:20px">Go Home</a></div></div>`;
    }
  } catch (err) {
    console.error('Route error:', err);
    app.innerHTML = `<div class="page-content"><div class="empty-state"><h2 class="empty-state-title">Something went wrong</h2><p class="empty-state-text">${err.message}</p><a href="#/" class="btn btn-accent" style="margin-top:20px">Go Home</a></div></div>`;
  }

  hideLoader();
  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(() => window.updateCarouselArrows && window.updateCarouselArrows(), 50);
}

function getPageFromPath(path) {
  if (path === '/' || path === '') return 'home';
  if (path.startsWith('/movies')) return 'movies';
  if (path.startsWith('/tv') && !path.startsWith('/tv/')) return 'tv';
  if (path === '/watchlist') return 'watchlist';
  return '';
}

// ─── Render: HOME ───
async function renderHome(app) {
  // Show skeleton immediately
  app.innerHTML = renderHeroSkeleton() + '<div class="content-area" id="contentSections">' + renderSectionSkeletons(5) + '</div>';

  // Calculate date for the last 3 months to keep suggestions fresh
  const recentDate = new Date();
  recentDate.setMonth(recentDate.getMonth() - 3);
  const recentDateStr = recentDate.toISOString().split('T')[0];

  const [trending, trendingMovies, trendingTv, topRatedMovies, nowPlaying, upcoming, popularTv, topRatedTv, malayalamMovies, hindiMovies, tamilMovies, teluguMovies, koreanTv] = await Promise.all([
    API.trending('day'),
    API.trendingMovies(),
    API.trendingTv(),
    API.topRatedMovies(),
    API.nowPlayingMovies(),
    API.upcomingMovies(),
    API.popularTv(),
    API.topRatedTv(),
    API.discoverMovies({ with_original_language: 'ml', 'primary_release_date.gte': recentDateStr, sort_by: 'popularity.desc' }),
    API.discoverMovies({ with_original_language: 'hi', 'primary_release_date.gte': recentDateStr, sort_by: 'popularity.desc' }),
    API.discoverMovies({ with_original_language: 'ta', 'primary_release_date.gte': recentDateStr, sort_by: 'popularity.desc' }),
    API.discoverMovies({ with_original_language: 'te', 'primary_release_date.gte': recentDateStr, sort_by: 'popularity.desc' }),
    API.discoverTv({ with_original_language: 'ko', 'first_air_date.gte': recentDateStr, sort_by: 'popularity.desc' })
  ]);

  let heroItems = (trending?.results || []).filter(i => i.backdrop_path).slice(0, 5);
  
  // Inject top regional hits into the main hero banner to diversify the suggestions
  const injectToHero = (list) => { 
    const item = list?.results?.find(i => i.backdrop_path);
    if (item) heroItems.push(item);
  };
  injectToHero(hindiMovies);
  injectToHero(tamilMovies);
  injectToHero(teluguMovies);
  injectToHero(malayalamMovies);
  injectToHero(koreanTv);
  
  // Shuffle hero array to keep it exciting
  heroItems = heroItems.sort(() => 0.5 - Math.random()).slice(0, 10);

  // Render hero
  const heroHtml = renderHero(heroItems);

  const history = HistoryManager.get();
  let continueWatchingHtml = '';
  if (history.length > 0) {
    const historyCards = history.map((item, i) => {
      const type = item.type;
      const watchUrl = type === 'tv' ? `#/watch/tv/${item.id}?s=${item.season}&e=${item.episode}` : `#/watch/movie/${item.id}`;
      const progress = item.progress || 0;
      const timeStr = timeAgo(item.timestamp);
      return `
        <div class="card card-history animate-fadeInUp" style="animation-delay:${i * 0.03}s;" onclick="navigate('${watchUrl.replace('#', '')}')">
          <div class="card-poster">
            <img src="${item.poster}" alt="${item.title}" loading="lazy" />
            <div class="card-overlay">
              <div class="card-play-btn">${ICONS.play}</div>
            </div>
            ${progress ? `
            <div class="card-progress-bar">
              <div class="card-progress-fill" style="width: ${progress}%;"></div>
            </div>` : ''}
          </div>
          <div class="card-info">
            <h3 class="card-title">${item.title}</h3>
            <div class="card-meta">
              <span class="card-type-badge ${type}">${type === 'tv' ? `S${item.season} E${item.episode}` : 'Movie'}</span>
              ${timeStr ? `<span class="card-time-ago">${timeStr}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
    
    continueWatchingHtml = `
      <section class="section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-accent" style="background:var(--accent);"></div>
            <h2 class="section-title">Continue Watching</h2>
          </div>
          <button class="section-view-all" onclick="clearWatchHistory()" style="color:var(--accent); border-color:var(--border-accent);">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Clear History
          </button>
        </div>
        <div class="carousel-container">
          <button class="carousel-arrow carousel-arrow-left" onclick="scrollCarousel('carousel-continue', -1)">${ICONS.chevronLeft}</button>
          <div class="carousel" id="carousel-continue">
            ${historyCards}
          </div>
          <button class="carousel-arrow carousel-arrow-right" onclick="scrollCarousel('carousel-continue', 1)">${ICONS.chevronRight}</button>
        </div>
      </section>`;
  }

  const shuffle = (arr) => arr ? [...arr].sort(() => 0.5 - Math.random()) : [];

  const sections = [
    renderTop10Section('TOP 10 Movies', (trendingMovies?.results || []).filter(isReleased).slice(0, 10), 'movie'),
    renderTop10Section('TOP 10 TV Shows', (trendingTv?.results || []).filter(isReleased).slice(0, 10), 'tv'),
    continueWatchingHtml,
    renderCarouselSection('🔥 Trending Today', (trending?.results || []).filter(isReleased)),
    renderCarouselSection('🎬 Now Playing', (nowPlaying?.results || []).filter(isReleased), 'movie'),
    renderCarouselSection('✨ Bollywood Hits (Hindi)', shuffle((hindiMovies?.results || []).filter(isReleased)), 'movie'),
    renderCarouselSection('💥 Kollywood Action (Tamil)', shuffle((tamilMovies?.results || []).filter(isReleased)), 'movie'),
    renderCarouselSection('🚀 Tollywood Blockbusters (Telugu)', shuffle((teluguMovies?.results || []).filter(isReleased)), 'movie'),
    renderCarouselSection('🌴 Recent Malayalam Hits', shuffle((malayalamMovies?.results || []).filter(isReleased)), 'movie'),
    renderCarouselSection('🌸 Trending K-Dramas (Korean)', shuffle((koreanTv?.results || []).filter(isReleased)), 'tv'),
    renderCarouselSection('⭐ Top Rated Movies', (topRatedMovies?.results || []).filter(isReleased)),
    renderCarouselSection('📺 Popular TV Shows', (popularTv?.results || []).filter(isReleased)),
  ].join('');

  app.innerHTML = heroHtml + `<div class="content-area">${sections}</div>` + renderFooter();

  // Start hero rotation
  if (heroItems.length > 1) startHeroRotation(heroItems.length);

  // Attach carousel arrow listeners
  attachCarouselListeners();
}

// ─── Render: Hero ───
function renderHero(items) {
  if (!items.length) return '';

  const slides = items.map((item, i) => {
    const type = getType(item);
    const rating = getRating(item);
    const year = getYear(item);
    const genreNames = getGenreNames(item.genre_ids);
    const stars = Math.round((item.vote_average || 0) / 2);

    return `
      <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
        <div class="hero-backdrop">
          <img src="${backdropUrl(item.backdrop_path)}" alt="${getTitle(item)}" loading="${i === 0 ? 'eager' : 'lazy'}" />
        </div>
        <div class="hero-gradient hero-gradient-left"></div>
        <div class="hero-gradient hero-gradient-bottom"></div>
        <div class="hero-gradient hero-gradient-top"></div>
        <div class="hero-content">
          <div class="hero-meta">
            <div class="hero-rating">
              ${Array.from({length: 5}, (_, si) => `<span class="star" style="color:${si < stars ? 'var(--gold)' : 'rgba(255,255,255,0.2)'};width:16px;height:16px;">${ICONS.star}</span>`).join('')}
            </div>
            <span class="hero-rating-value">${rating}</span>
            <span class="hero-year">${year}</span>
            <span class="hero-type-badge">${type === 'tv' ? 'TV Series' : 'Movie'}</span>
          </div>
          <h1 class="hero-title">${getTitle(item)}</h1>
          <p class="hero-overview">${item.overview || ''}</p>
          <div class="hero-genres">
            ${genreNames.map(g => `<span class="hero-genre-chip">${g}</span>`).join('')}
          </div>
          <div class="hero-actions">
            <a href="#/watch/${type}/${item.id}${type === 'tv' ? '?s=1&e=1' : ''}" class="btn btn-primary btn-play-fill">${ICONS.play} Play</a>
            <a href="#/${type}/${item.id}" class="btn btn-secondary">${ICONS.info} More Info</a>
            <button class="btn btn-icon" onclick="toggleWatchlistFromCard(event, ${item.id}, '${type}', '${getTitle(item).replace(/'/g,"\\'")}', '${posterUrl(item.poster_path)}', '${getYear(item)}')" title="Watchlist">
              ${Watchlist.has(item.id, type) ? ICONS.bookmarkFilled : ICONS.bookmark}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  const indicators = items.map((_, i) => `<button class="hero-indicator ${i === 0 ? 'active' : ''}" onclick="goToHeroSlide(${i})" aria-label="Go to slide ${i + 1}"></button>`).join('');

  return `<section class="hero" id="heroSection">${slides}<div class="hero-indicators">${indicators}</div></section>`;
}

function renderHeroSkeleton() {
  return `<section class="hero" style="background:var(--bg-secondary);">
    <div class="hero-content" style="opacity:0.3;">
      <div class="skeleton" style="width:60px;height:16px;margin-bottom:16px;"></div>
      <div class="skeleton" style="width:400px;max-width:80%;height:48px;margin-bottom:14px;"></div>
      <div class="skeleton" style="width:500px;max-width:90%;height:40px;margin-bottom:20px;"></div>
      <div style="display:flex;gap:12px;">
        <div class="skeleton" style="width:120px;height:44px;border-radius:22px;"></div>
        <div class="skeleton" style="width:140px;height:44px;border-radius:22px;"></div>
      </div>
    </div>
  </section>`;
}

// ─── Hero Rotation ───
function startHeroRotation(count) {
  state.heroInterval = setInterval(() => {
    state.heroSlideIndex = (state.heroSlideIndex + 1) % count;
    updateHeroSlide(state.heroSlideIndex);
  }, CONFIG.HERO_ROTATE_MS);
}
function clearHeroInterval() {
  if (state.heroInterval) { clearInterval(state.heroInterval); state.heroInterval = null; }
}
function goToHeroSlide(index) {
  clearHeroInterval();
  state.heroSlideIndex = index;
  updateHeroSlide(index);
  const count = document.querySelectorAll('.hero-slide').length;
  if (count > 1) startHeroRotation(count);
}
function updateHeroSlide(index) {
  document.querySelectorAll('.hero-slide').forEach((s, i) => s.classList.toggle('active', i === index));
  document.querySelectorAll('.hero-indicator').forEach((ind, i) => ind.classList.toggle('active', i === index));
}

// ─── Render: Carousel Section ───
function renderCarouselSection(title, items, forceType) {
  if (!items.length) return '';
  const id = 'carousel-' + title.replace(/[^a-zA-Z0-9]/g, '');
  return `
    <section class="section">
      <div class="section-header">
        <div class="section-title-wrap">
          <div class="section-accent"></div>
          <h2 class="section-title">${title}</h2>
        </div>
      </div>
      <div class="carousel-container">
        <button class="carousel-arrow carousel-arrow-left" onclick="scrollCarousel('${id}', -1)">${ICONS.chevronLeft}</button>
        <div class="carousel" id="${id}">
          ${items.map((item, i) => renderCard(item, forceType, i)).join('')}
        </div>
        <button class="carousel-arrow carousel-arrow-right" onclick="scrollCarousel('${id}', 1)">${ICONS.chevronRight}</button>
      </div>
    </section>`;
}

function renderTop10Section(title, items, forceType) {
  if (!items.length) return '';
  const id = 'carousel-top10-' + title.replace(/[^a-zA-Z0-9]/g, '');
  return `
    <section class="section">
      <div class="section-header">
        <div class="section-title-wrap">
          <div class="section-accent"></div>
          <h2 class="section-title">${title}</h2>
        </div>
      </div>
      <div class="carousel-container">
        <button class="carousel-arrow carousel-arrow-left" onclick="scrollCarousel('${id}', -1)">${ICONS.chevronLeft}</button>
        <div class="carousel" id="${id}">
          ${items.map((item, i) => renderTop10Card(item, i + 1, forceType)).join('')}
        </div>
        <button class="carousel-arrow carousel-arrow-right" onclick="scrollCarousel('${id}', 1)">${ICONS.chevronRight}</button>
      </div>
    </section>`;
}

// ─── Render: Movie/TV Card ───
function renderCard(item, forceType, staggerIndex) {
  const type = forceType || getType(item);
  const title = getTitle(item);
  const year = getYear(item);
  const rating = getRating(item);
  const saved = Watchlist.has(item.id, type);
  const delay = staggerIndex !== undefined ? `animation-delay:${staggerIndex * 0.03}s;` : '';

  return `
    <div class="card animate-fadeInUp" style="${delay}" onclick="navigate('/${type}/${item.id}')">
      <div class="card-poster">
        <img src="${posterUrl(item.poster_path)}" alt="${title}" loading="lazy" />
        <div class="card-rating">${ICONS.star} ${rating}</div>
        <button class="card-bookmark ${saved ? 'saved' : ''}" onclick="toggleWatchlistFromCard(event, ${item.id}, '${type}', '${title.replace(/'/g,"\\'")}', '${posterUrl(item.poster_path)}', '${year}')" title="Watchlist">
          ${saved ? ICONS.bookmarkFilled : ICONS.plus}
        </button>
        <div class="card-overlay">
          <div class="card-play-btn">${ICONS.play}</div>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title">${title}</h3>
        <div class="card-meta">
          <span class="card-type-badge ${type}">${type === 'tv' ? 'TV' : 'Movie'}</span>
          <span>${year}</span>
        </div>
      </div>
    </div>`;
}

function renderTop10Card(item, rank, forceType) {
  const type = forceType || getType(item);
  const title = getTitle(item);
  const year = getYear(item);
  const rating = getRating(item);

  return `
    <div class="card-top10 animate-fadeInUp" style="animation-delay:${(rank - 1) * 0.04}s;" onclick="navigate('/${type}/${item.id}')">
      <div class="card-top10-poster">
        <img src="${backdropUrl(item.backdrop_path, 'w780')}" alt="${title}" loading="lazy" />
        <span class="card-top10-rank">${rank}</span>
        <div class="card-top10-overlay">
          <div class="card-play-btn">${ICONS.play}</div>
        </div>
        <button class="card-top10-bookmark" onclick="toggleWatchlistFromCard(event, ${item.id}, '${type}', '${title.replace(/'/g,"\\'")}', '${posterUrl(item.poster_path)}', '${year}')" title="Watchlist">
          ${ICONS.plus}
        </button>
      </div>
      <div class="card-top10-info">
        <h3 class="card-top10-title">${title}</h3>
        <div class="card-top10-meta">
          <span class="card-type-badge ${type}">${type === 'tv' ? 'TV' : 'Movie'}</span>
          <span>${year}</span>
          <span style="margin-left:auto;display:flex;align-items:center;gap:3px;color:var(--gold);">${ICONS.star} ${rating}</span>
        </div>
      </div>
    </div>`;
}

// ─── Render: Section Skeletons ───
function renderSectionSkeletons(count) {
  let html = '';
  for (let s = 0; s < count; s++) {
    html += `<section class="section"><div class="section-header"><div class="section-title-wrap"><div class="section-accent"></div><div class="skeleton" style="width:140px;height:14px;"></div></div></div><div class="carousel">`;
    for (let i = 0; i < 7; i++) {
      html += `<div class="skeleton-card"><div class="skeleton skeleton-poster"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-meta"></div></div>`;
    }
    html += '</div></section>';
  }
  return html;
}

// ─── Advanced Filters ───
const SORT_OPTIONS = {
  'popularity.desc': 'Popularity (Desc)',
  'popularity.asc': 'Popularity (Asc)',
  'vote_average.desc': 'Rating (Desc)',
  'vote_average.asc': 'Rating (Asc)',
  'primary_release_date.desc': 'Latest',
  'primary_release_date.asc': 'Oldest'
};
const NETWORK_OPTIONS = {
  '213': 'Netflix',
  '49': 'HBO',
  '2552': 'Apple TV+',
  '1024': 'Amazon',
  '2739': 'Disney+',
  '453': 'Hulu'
};
const COUNTRY_OPTIONS = {
  'US': 'United States',
  'KR': 'South Korea',
  'JP': 'Japan',
  'IN': 'India',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'FR': 'France'
};
const RATING_OPTIONS = {
  '9': '9+ Stars',
  '8': '8+ Stars',
  '7': '7+ Stars',
  '6': '6+ Stars',
  '5': '5+ Stars'
};
const LANGUAGE_OPTIONS = {
  'en': 'English',
  'hi': 'Hindi',
  'ja': 'Japanese',
  'ko': 'Korean',
  'es': 'Spanish',
  'fr': 'French',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'zh': 'Chinese'
};

function generateYearOptions() {
  const currentYear = new Date().getFullYear();
  let opts = {};
  for(let i = currentYear; i >= 1990; i--) opts[i] = i.toString();
  return opts;
}
const YEAR_OPTIONS = generateYearOptions();

function renderAdvancedFilterBar(pageType, query, genresList) {
  const qType = query.type || (pageType === 'search' ? 'movie' : pageType); 
  const genre = query.genre || '';
  const sort = query.sort || 'popularity.desc';
  const year = query.year || '';
  const network = query.network || '';
  const country = query.country || '';
  const language = query.language || '';
  const rating = query.rating || '';
  const textQuery = query.q || '';

  const createSelect = (id, optionsObj, currentVal, defaultLabel) => {
    let html = `<select class="filter-select" id="filter_${id}" onchange="changeFilter('${pageType}')">`;
    html += `<option value="">${defaultLabel}</option>`;
    Object.entries(optionsObj).forEach(([k, v]) => {
      html += `<option value="${k}" ${currentVal == k ? 'selected' : ''}>${v}</option>`;
    });
    html += `</select>`;
    return html;
  };

  const createGenreSelect = () => {
    let html = `<select class="filter-select" id="filter_genre" onchange="changeFilter('${pageType}')">`;
    html += `<option value="">Genre</option>`;
    genresList.forEach(g => {
      html += `<option value="${g.id}" ${genre == g.id ? 'selected' : ''}>${g.name}</option>`;
    });
    html += `</select>`;
    return html;
  };

  let html = `<div class="advanced-filter-bar">`;
  html += `<button class="btn-reset" onclick="resetFilters('${pageType}')">↺ Reset</button>`;
  
  if (pageType === 'search') {
    html += createSelect('type', { 'movie': 'Movies', 'tv': 'TV Shows' }, qType, 'Type');
  }
  
  html += createGenreSelect();
  html += createSelect('sort', SORT_OPTIONS, sort, 'Popular');
  html += createSelect('year', YEAR_OPTIONS, year, 'Year');
  
  if (qType === 'tv') {
    html += createSelect('network', NETWORK_OPTIONS, network, 'Networks');
  }
  
  html += createSelect('country', COUNTRY_OPTIONS, country, 'Country');
  html += createSelect('language', LANGUAGE_OPTIONS, language, 'Language');
  html += createSelect('rating', RATING_OPTIONS, rating, 'Ratings');
  
  if (textQuery) {
    html += `<input type="hidden" id="filter_q" value="${textQuery}">`;
  }
  
  html += `</div>`;
  return html;
}

window.changeFilter = function(pageType) {
  const getVal = (id) => document.getElementById(`filter_${id}`) ? document.getElementById(`filter_${id}`).value : '';
  const type = getVal('type');
  const genre = getVal('genre');
  const sort = getVal('sort');
  const year = getVal('year');
  const network = getVal('network');
  const country = getVal('country');
  const language = getVal('language');
  const rating = getVal('rating');
  const q = getVal('q');
  
  let url = `/${pageType}?`;
  if (q) url += `q=${encodeURIComponent(q)}&`;
  if (type) url += `type=${type}&`;
  if (genre) url += `genre=${genre}&`;
  if (sort && sort !== 'popularity.desc') url += `sort=${sort}&`;
  if (year) url += `year=${year}&`;
  if (network) url += `network=${network}&`;
  if (country) url += `country=${country}&`;
  if (language) url += `language=${language}&`;
  if (rating) url += `rating=${rating}&`;
  
  navigate(url.replace(/&$/, '').replace(/\?$/, ''));
};

window.resetFilters = function(pageType) {
  const q = document.getElementById('filter_q') ? document.getElementById('filter_q').value : '';
  navigate(`/${pageType}${q ? '?q=' + encodeURIComponent(q) : ''}`);
};

// ─── Render: Movies Page ───
async function renderMoviesPage(app, query) {
  const page = parseInt(query.page) || 1;
  const genre = query.genre || '';
  const sort = query.sort || 'popularity.desc';

  app.innerHTML = `<div class="page-content">
    <div class="page-title-section"><h1 class="page-title">Movies</h1><p class="page-subtitle">Explore the latest and greatest films</p></div>
    <div class="filter-bar" id="filterBar"></div>
    <div class="content-grid" id="movieGrid"></div>
    <div class="load-more-wrap" id="loadMoreWrap"></div>
  </div>` + renderFooter();

  // Render advanced filters
  if (!state.genreMovieList) {
    const g = await API.get('/genre/movie/list');
    state.genreMovieList = g?.genres || [];
  }
  const filterBar = document.getElementById('filterBar');
  filterBar.innerHTML = renderAdvancedFilterBar('movies', query, state.genreMovieList);

  // Fetch movies
  const params = { page, sort_by: sort };
  if (genre) params.with_genres = genre;
  if (query.year) params.primary_release_year = query.year;
  if (query.country) params.with_origin_country = query.country;
  if (query.language) params.with_original_language = query.language;
  if (query.rating) params['vote_average.gte'] = query.rating;
  
  const data = await API.discoverMovies(params);
  const items = (data?.results || []).filter(isReleased);

  const grid = document.getElementById('movieGrid');
  grid.innerHTML = items.map((item, i) => renderCard({ ...item, media_type: 'movie' }, 'movie', i)).join('');

  const loadMore = document.getElementById('loadMoreWrap');
  if (page < (data?.total_pages || 1) && page < 20) {
    let url = `/movies?page=${page + 1}`;
    if (genre) url += `&genre=${genre}`;
    if (sort && sort !== 'popularity.desc') url += `&sort=${sort}`;
    if (query.year) url += `&year=${query.year}`;
    if (query.country) url += `&country=${query.country}`;
    if (query.language) url += `&language=${query.language}`;
    if (query.rating) url += `&rating=${query.rating}`;
    loadMore.innerHTML = `<button class="btn-load-more" onclick="navigate('${url}')">Load More</button>`;
  }
}

// ─── Render: TV Page ───
async function renderTvPage(app, query) {
  const page = parseInt(query.page) || 1;
  const genre = query.genre || '';

  const sort = query.sort || 'popularity.desc';

  app.innerHTML = `<div class="page-content">
    <div class="page-title-section"><h1 class="page-title">TV Shows</h1><p class="page-subtitle">Discover binge-worthy series</p></div>
    <div class="filter-bar" id="filterBar"></div>
    <div class="content-grid" id="tvGrid"></div>
    <div class="load-more-wrap" id="loadMoreWrap"></div>
  </div>` + renderFooter();

  if (!state.genreTvList) {
    const g = await API.get('/genre/tv/list');
    state.genreTvList = g?.genres || [];
  }
  const filterBar = document.getElementById('filterBar');
  filterBar.innerHTML = renderAdvancedFilterBar('tv', query, state.genreTvList);

  const params = { page, sort_by: sort };
  if (genre) params.with_genres = genre;
  if (query.year) params.first_air_date_year = query.year;
  if (query.network) params.with_networks = query.network;
  if (query.country) params.with_origin_country = query.country;
  if (query.language) params.with_original_language = query.language;
  if (query.rating) params['vote_average.gte'] = query.rating;
  
  const data = await API.discoverTv(params);
  const items = (data?.results || []).filter(isReleased);

  const grid = document.getElementById('tvGrid');
  grid.innerHTML = items.map((item, i) => renderCard({ ...item, media_type: 'tv' }, 'tv', i)).join('');

  const loadMore = document.getElementById('loadMoreWrap');
  if (page < (data?.total_pages || 1) && page < 20) {
    let url = `/tv?page=${page + 1}`;
    if (genre) url += `&genre=${genre}`;
    if (sort && sort !== 'popularity.desc') url += `&sort=${sort}`;
    if (query.year) url += `&year=${query.year}`;
    if (query.network) url += `&network=${query.network}`;
    if (query.country) url += `&country=${query.country}`;
    if (query.language) url += `&language=${query.language}`;
    if (query.rating) url += `&rating=${query.rating}`;
    loadMore.innerHTML = `<button class="btn-load-more" onclick="navigate('${url}')">Load More</button>`;
  }
}

// ─── Render: Search Page ───
async function renderSearchPage(app, query) {
  const page = parseInt(query.page) || 1;
  const qType = query.type || 'movie';
  const genre = query.genre || '';
  const sort = query.sort || 'popularity.desc';
  const textQuery = query.q || '';

  app.innerHTML = `<div class="page-content">
    <div class="page-title-section">
      <h1 class="page-title">Search & Discover</h1>
      <p class="page-subtitle">Find exactly what you're looking for</p>
    </div>
    <div style="margin-bottom:20px; display:flex; gap:10px;">
      <input type="text" id="mainSearchInput" class="search-input" style="flex-grow:1; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:12px 16px; color:var(--text-primary);" placeholder="Type a movie or show name..." value="${textQuery}" onkeydown="if(event.key === 'Enter') navigate('/search?q=' + encodeURIComponent(this.value))" />
      <button class="btn btn-accent" onclick="navigate('/search?q=' + encodeURIComponent(document.getElementById('mainSearchInput').value))">Search</button>
    </div>
    <div class="filter-bar" id="searchFilterBar"></div>
    <div class="content-grid" id="searchGrid"></div>
    <div class="load-more-wrap" id="searchLoadMoreWrap"></div>
  </div>` + renderFooter();

  if (!state.genreMovieList) {
    const g = await API.get('/genre/movie/list');
    state.genreMovieList = g?.genres || [];
  }
  document.getElementById('searchFilterBar').innerHTML = renderAdvancedFilterBar('search', query, state.genreMovieList);

  let items = [];
  let totalPages = 1;

  if (textQuery) {
    const data = await API.searchMulti(textQuery, page);
    items = (data?.results || []).filter(i => (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path);
    // Apply client-side type filter
    if (qType !== 'all') {
      items = items.filter(i => i.media_type === qType);
    }
    totalPages = data?.total_pages || 1;
  } else {
    const params = { page, sort_by: sort };
    if (genre) params.with_genres = genre;
    if (query.year) {
      if (qType === 'movie') params.primary_release_year = query.year;
      else params.first_air_date_year = query.year;
    }
    if (query.network && qType === 'tv') params.with_networks = query.network;
    if (query.country) params.with_origin_country = query.country;
    if (query.language) params.with_original_language = query.language;
    if (query.rating) params['vote_average.gte'] = query.rating;
    
    const data = qType === 'movie' ? await API.discoverMovies(params) : await API.discoverTv(params);
    items = (data?.results || []).filter(isReleased);
    totalPages = data?.total_pages || 1;
  }

  const grid = document.getElementById('searchGrid');
  grid.innerHTML = items.length ? items.map((item, i) => renderCard({ ...item, media_type: item.media_type || qType }, item.media_type || qType, i)).join('') : `<div class="empty-state" style="grid-column: 1/-1"><h3 style="color:var(--text-secondary)">No results found.</h3></div>`;

  const loadMore = document.getElementById('searchLoadMoreWrap');
  if (page < totalPages && page < 20) {
    let url = `/search?page=${page + 1}`;
    if (textQuery) url += `&q=${encodeURIComponent(textQuery)}`;
    if (qType) url += `&type=${qType}`;
    if (genre) url += `&genre=${genre}`;
    if (sort) url += `&sort=${sort}`;
    if (query.year) url += `&year=${query.year}`;
    if (query.network) url += `&network=${query.network}`;
    if (query.country) url += `&country=${query.country}`;
    if (query.language) url += `&language=${query.language}`;
    if (query.rating) url += `&rating=${query.rating}`;
    loadMore.innerHTML = `<button class="btn-load-more" onclick="navigate('${url}')">Load More</button>`;
  }
}

// ─── Render: Detail Page ───
async function renderDetailPage(app, type, id) {
  // Skeleton
  app.innerHTML = `<div class="detail-hero" style="background:var(--bg-secondary);min-height:70vh;display:flex;align-items:center;justify-content:center;"><div class="loading-spinner"></div></div>`;

  const data = type === 'movie' ? await API.movieDetails(id) : await API.tvDetails(id);
  if (!data) { app.innerHTML = '<div class="page-content"><div class="empty-state"><h2 class="empty-state-title">Not Found</h2></div></div>'; return; }

  const title = data.title || data.name;
  const year = (data.release_date || data.first_air_date || '').substring(0, 4);
  const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
  const runtime = type === 'movie' ? formatRuntime(data.runtime) : (data.episode_run_time?.[0] ? formatRuntime(data.episode_run_time[0]) : `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}`);
  const genres = genreNamesFromObjs(data.genres);
  const cast = (data.credits?.cast || []).slice(0, 12);
  const trailer = (data.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const similar = (data.similar?.results || data.recommendations?.results || []).slice(0, 14);
  const saved = Watchlist.has(data.id, type);

  const watchUrl = type === 'movie' ? `#/watch/movie/${data.id}` : `#/watch/tv/${data.id}?s=1&e=1`;

  app.innerHTML = `
    <div class="detail-hero">
      <div class="detail-backdrop">
        <img src="${backdropUrl(data.backdrop_path)}" alt="${title}" />
      </div>
      <div class="detail-gradient hero-gradient-left"></div>
      <div class="detail-gradient hero-gradient-bottom"></div>
      <div class="detail-gradient hero-gradient-top"></div>
      <div class="detail-content animate-fadeIn">
        <div class="detail-poster-wrap">
          <div class="detail-poster">
            <img src="${posterUrl(data.poster_path, 'w500')}" alt="${title}" />
          </div>
        </div>
        <div class="detail-info">
          <div class="detail-badge-row">
            <span class="detail-badge hd">HD</span>
            <span class="detail-badge type">${type === 'tv' ? 'TV Series' : 'Movie'}</span>
          </div>
          <h1 class="detail-title">${title}</h1>
          ${data.tagline ? `<p class="detail-tagline">"${data.tagline}"</p>` : ''}
          <div class="detail-meta-row">
            <span class="detail-rating">${ICONS.star} ${rating}</span>
            <span class="detail-meta-divider"></span>
            <span>${year}</span>
            ${runtime ? `<span class="detail-meta-divider"></span><span>${runtime}</span>` : ''}
            ${data.original_language ? `<span class="detail-meta-divider"></span><span style="text-transform:uppercase">${data.original_language}</span>` : ''}
          </div>
          <div class="detail-genres">
            ${genres.map(g => `<span class="detail-genre-tag">${g}</span>`).join('')}
          </div>
          <p class="detail-overview">${data.overview || 'No overview available.'}</p>
          <div class="detail-actions">
            <a href="${watchUrl}" class="btn btn-primary btn-play-fill">${ICONS.play} Watch Now</a>
            <button class="btn btn-secondary" id="detailWatchlistBtn" onclick="toggleDetailWatchlist(${data.id}, '${type}', '${title.replace(/'/g,"\\'")}', '${posterUrl(data.poster_path)}', '${year}')">
              ${saved ? ICONS.bookmarkFilled : ICONS.bookmark} ${saved ? 'In Watchlist' : 'Add to List'}
            </button>
            <button class="btn btn-secondary btn-icon" style="padding: 0 16px;" onclick="shareMedia('${title.replace(/'/g,"\\'")}', '#/${type}/${data.id}')" title="Share">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="detail-extra">
      ${cast.length ? `
        <div class="detail-section">
          <h2 class="detail-section-title">Cast</h2>
          <div class="carousel" style="gap:8px;">
            ${cast.map(c => `
              <div class="cast-card">
                <div class="cast-photo"><img src="${profileUrl(c.profile_path)}" alt="${c.name}" loading="lazy" /></div>
                <div class="cast-name">${c.name}</div>
                <div class="cast-character">${c.character || ''}</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      ${trailer ? `
        <div class="detail-section">
          <h2 class="detail-section-title">Trailer</h2>
          <div class="trailer-container">
            <iframe src="https://www.youtube.com/embed/${trailer.key}" title="Trailer" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>` : ''}
      ${similar.length ? renderCarouselSection('You Might Also Like', similar) : ''}
    </div>` + renderFooter();

  attachCarouselListeners();
}

// ─── Render: Watch Page ───
async function renderWatchPage(app, type, id, season, episode) {
  season = season || '1';
  episode = episode || '1';

  const data = type === 'movie' ? await API.movieDetails(id) : await API.tvDetails(id);
  if (!data) { app.innerHTML = '<div class="page-content"><div class="empty-state"><h2>Not Found</h2></div></div>'; return; }

  const title = data.title || data.name;
  
  // Save to history
  HistoryManager.add({
    id: data.id,
    type: type,
    title: title,
    poster: posterUrl(data.poster_path),
    backdrop: backdropUrl(data.backdrop_path, 'w780'),
    progress: Math.floor(Math.random() * 70) + 15,
    year: (data.release_date || data.first_air_date || '').substring(0, 4),
    season: type === 'tv' ? season : null,
    episode: type === 'tv' ? episode : null
  });

  const currentProvider = CONFIG.EMBED_PROVIDERS[0];

  function getEmbedUrl(provider, t, tid, s, e) {
    let url = t === 'movie' ? provider.movieUrl.replace('{id}', tid) : provider.tvUrl.replace('{id}', tid).replace('{season}', s).replace('{episode}', e);
    url += (url.includes('?') ? '&' : '?') + `primaryColor=e8294f`;
    return url;
  }

  const embedUrl = getEmbedUrl(currentProvider, type, id, season, episode);

  let episodesHtml = '';
  if (type === 'tv') {
    const seasons = data.seasons ? data.seasons.filter(s => s.season_number > 0) : [];
    const seasonData = await API.tvSeason(id, season);
    const episodes = seasonData?.episodes || [];

    episodesHtml = `
      <div class="season-episode-wrap">
        <div class="season-header">
          <h2 class="season-title">Episodes</h2>
          <div class="season-selector">
            <select id="seasonSelect" onchange="navigate('/watch/tv/${id}?s=' + this.value + '&e=1')">
              ${seasons.map(s => `<option value="${s.season_number}" ${s.season_number == season ? 'selected' : ''}>Season ${s.season_number}</option>`).join('')}
            </select>
            <div class="select-icon">${ICONS.chevronRight}</div>
          </div>
        </div>
        <div class="episode-list">
          ${episodes.map(ep => `
            <div class="episode-card ${ep.episode_number == episode ? 'active' : ''}" onclick="navigate('/watch/tv/${id}?s=${season}&e=${ep.episode_number}')">
              <div class="episode-thumb">
                <img src="${ep.still_path ? CONFIG.IMG_BASE + '/w300' + ep.still_path : posterUrl(data.poster_path)}" alt="Episode ${ep.episode_number}" loading="lazy" />
                <div class="episode-play-overlay">${ICONS.play}</div>
              </div>
              <div class="episode-info">
                <h4 class="episode-title"><span class="ep-num">${ep.episode_number}.</span> ${ep.name || 'Episode ' + ep.episode_number}</h4>
                <div class="episode-meta">
                  <span>${ep.air_date ? ep.air_date.substring(0, 4) : 'N/A'}</span>
                  ${ep.runtime ? `<span style="margin: 0 6px;">·</span><span>${ep.runtime}m</span>` : ''}
                </div>
                <p class="episode-desc">${ep.overview || 'No description available.'}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  app.innerHTML = `
    <div class="watch-page">
      <div class="player-container" id="playerContainer">
        <div class="player-wrapper" id="playerWrapper">
          <iframe src="${embedUrl}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen frameborder="0" scrolling="no" style="width:100%;height:100%;" id="playerIframe" referrerpolicy="origin" onerror="autoSwitchServer('${type}', '${id}', '${season}', '${episode}')"></iframe>
        </div>
        <div class="player-controls">
          <div>
            <h1 class="player-title">${title}</h1>
            ${type === 'tv' ? `<span style="font-size:13px;color:var(--text-tertiary);">Season ${season} · Episode ${episode}</span>` : ''}
          </div>
          <div class="player-actions-row">
            <div>
              ${type === 'tv' ? `<button class="btn btn-secondary btn-sm" onclick="playNextEpisode('${id}', '${season}', '${episode}')">Next Episode ${ICONS.chevronRight}</button>` : ''}
            </div>
            <div class="server-selector-container">
              <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:8px; gap: 12px;">
                <span style="font-size:11px;color:var(--text-tertiary);">If video fails to load, try another server:</span>
                <button class="btn btn-accent btn-sm" style="padding: 4px 10px; font-size:12px; font-weight:600;" onclick="autoSwitchServer('${type}', '${id}', '${season}', '${episode}')">⏭ Next Server</button>
              </div>
              <div class="server-selector">
                <label>Server:</label>
                ${CONFIG.EMBED_PROVIDERS.map((p, i) => `<button class="server-btn ${i === 0 ? 'active' : ''}" onclick="switchServer(${i}, '${type}', '${id}', '${season}', '${episode}')">${p.name}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
      ${episodesHtml}
    </div>` + renderFooter();
}

// ─── Render: Watchlist Page ───
function renderWatchlistPage(app) {
  const items = Watchlist.get();

  app.innerHTML = `
    <div class="page-content">
      <div class="page-title-section">
        <h1 class="page-title">My Watchlist</h1>
        <p class="page-subtitle">${items.length} title${items.length !== 1 ? 's' : ''} saved</p>
      </div>
      ${items.length ? `
        <div class="content-grid">
          ${items.map((item, i) => `
            <div class="card animate-fadeInUp" style="animation-delay:${i * 0.03}s;" onclick="navigate('/${item.type}/${item.id}')">
              <div class="card-poster">
                <img src="${item.poster}" alt="${item.title}" loading="lazy" />
                <button class="card-bookmark saved" onclick="removeFromWatchlist(event, ${item.id}, '${item.type}')" title="Remove">
                  ${ICONS.bookmarkFilled}
                </button>
                <div class="card-overlay">
                  <div class="card-play-btn">${ICONS.play}</div>
                </div>
              </div>
              <div class="card-info">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-meta">
                  <span class="card-type-badge ${item.type}">${item.type === 'tv' ? 'TV' : 'Movie'}</span>
                  <span>${item.year || ''}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>` : `
        <div class="empty-state">
          <div style="width:64px;height:64px;color:var(--text-dim);">${ICONS.bookmark}</div>
          <h2 class="empty-state-title">Your watchlist is empty</h2>
          <p class="empty-state-text">Start adding movies and TV shows to your watchlist and they'll appear here.</p>
          <a href="#/" class="btn btn-accent" style="margin-top:20px">Browse Content</a>
        </div>`}
    </div>` + renderFooter();
}

// ─── Footer ───
function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-brand">Sakura<span style="color:var(--accent)">Stream.</span></div>
      <p class="footer-text">The ultimate streaming experience. Watch thousands of movies and TV shows online for free in HD.</p>
      <p class="footer-disclaimer">This site does not store any files on our server. All content is provided by non-affiliated third-party services. SakuraStream is for educational purposes only.</p>
      <div class="footer-links">
        <a href="#/" class="footer-link">Home</a>
        <a href="#/movies" class="footer-link">Movies</a>
        <a href="#/tv" class="footer-link">TV Shows</a>
        <a href="#/watchlist" class="footer-link">Watchlist</a>
      </div>
      <div style="margin-top:16px;">
        <button class="btn btn-accent" style="font-size:13px; padding:10px 24px;" onclick="surpriseMe()">🎲 Surprise Me</button>
      </div>
      <p class="footer-text" style="margin-top:16px;">SakuraStream © ${new Date().getFullYear()}. All Rights Reserved.</p>
    </footer>`;
}

// ─── Global Actions ───
function navigate(path) {
  window.location.hash = path;
}

window.navigate = navigate;

function scrollCarousel(id, direction) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: direction * 600, behavior: 'smooth' });
}
window.scrollCarousel = scrollCarousel;

function updateCarouselArrows() {
  document.querySelectorAll('.carousel-container').forEach(container => {
    const carousel = container.querySelector('.carousel');
    const leftArrow = container.querySelector('.carousel-arrow-left');
    const rightArrow = container.querySelector('.carousel-arrow-right');
    if (!carousel || !leftArrow || !rightArrow) return;
    
    // Hide arrows if no overflow
    if (carousel.scrollWidth <= carousel.clientWidth) {
      leftArrow.style.display = 'none';
      rightArrow.style.display = 'none';
    } else {
      leftArrow.style.display = 'flex';
      rightArrow.style.display = 'flex';
    }
  });
}
window.addEventListener('resize', updateCarouselArrows);
window.updateCarouselArrows = updateCarouselArrows;

// goToHeroSlide already defined above, using window reference
window.goToHeroSlide = goToHeroSlide;

function toggleWatchlistFromCard(e, id, type, title, poster, year) {
  e.stopPropagation();
  e.preventDefault();
  const item = { id, type, title, poster, year };
  const added = Watchlist.toggle(item);
  const btn = e.currentTarget;
  if (added) {
    btn.classList.add('saved');
    btn.innerHTML = ICONS.bookmarkFilled;
  } else {
    btn.classList.remove('saved');
    btn.innerHTML = ICONS.plus;
  }
}
window.toggleWatchlistFromCard = toggleWatchlistFromCard;

function toggleDetailWatchlist(id, type, title, poster, year) {
  const item = { id, type, title, poster, year };
  const added = Watchlist.toggle(item);
  const btn = document.getElementById('detailWatchlistBtn');
  if (btn) {
    btn.innerHTML = added ? `${ICONS.bookmarkFilled} In Watchlist` : `${ICONS.bookmark} Add to List`;
  }
}
window.toggleDetailWatchlist = toggleDetailWatchlist;

function removeFromWatchlist(e, id, type) {
  e.stopPropagation();
  e.preventDefault();
  Watchlist.remove(id, type);
  renderWatchlistPage(document.getElementById('app'));
}
window.removeFromWatchlist = removeFromWatchlist;

function switchServer(index, type, id, season, episode) {
  const provider = CONFIG.EMBED_PROVIDERS[index];
  let url = type === 'movie' ? provider.movieUrl.replace('{id}', id) : provider.tvUrl.replace('{id}', id).replace('{season}', season).replace('{episode}', episode);
  
  url += (url.includes('?') ? '&' : '?') + `primaryColor=e8294f`;

  document.getElementById('playerIframe').src = url;
  document.querySelectorAll('.server-btn').forEach((b, i) => b.classList.toggle('active', i === index));
}
window.switchServer = switchServer;

function autoSwitchServer(type, id, season, episode) {
  const btns = Array.from(document.querySelectorAll('.server-btn'));
  const activeIdx = btns.findIndex(b => b.classList.contains('active'));
  const nextIdx = (activeIdx + 1) % CONFIG.EMBED_PROVIDERS.length;
  switchServer(nextIdx, type, id, season, episode);
}
window.autoSwitchServer = autoSwitchServer;

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}
window.closeMobileMenu = closeMobileMenu;

function attachCarouselListeners() {
  // Already handled via onclick in HTML
}

// ─── Global Search Hotkeys ───
function initSearchHotkeys() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K or / to open search page
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName))) {
      e.preventDefault();
      navigate('/search');
    }
  });
}

// ─── Share Media ───

window.shareMedia = function(title, path) {
  const fullUrl = window.location.origin + window.location.pathname + path;
  if (navigator.share) {
    navigator.share({
      title: title,
      text: `Check out ${title} on SakuraStream!`,
      url: fullUrl
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showToast('Link copied to clipboard!');
    });
  }
};

// ─── Toast Notification ───
function showToast(message) {
  let toast = document.getElementById('sakura-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sakura-toast';
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--bg-card);color:var(--text-primary);padding:14px 28px;border-radius:12px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:999999;font-size:14px;font-weight:500;transition:transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.4s;opacity:0;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.transform = 'translateX(-50%) translateY(0)';
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
    toast.style.opacity = '0';
  }, 2500);
}
window.showToast = showToast;

// ─── Surprise Me (Random Discovery) ───
window.surpriseMe = async function() {
  showToast('Finding something amazing...');
  const randomPage = Math.floor(Math.random() * 20) + 1;
  const coin = Math.random();
  let data;
  if (coin < 0.5) {
    data = await API.discoverMovies({ page: randomPage });
  } else {
    data = await API.discoverTv({ page: randomPage });
  }
  const items = (data?.results || []).filter(i => i.poster_path && i.vote_average > 5);
  if (items.length) {
    const pick = items[Math.floor(Math.random() * items.length)];
    const type = pick.first_air_date ? 'tv' : 'movie';
    navigate(`/${type}/${pick.id}`);
  } else {
    showToast('Try again!');
  }
};

// ─── Navigation & Scroll ───
function initNav() {
  const nav = document.getElementById('mainNav');
  const backToTop = document.getElementById('backToTop');

  let isScrolling = false;
  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
        backToTop.classList.toggle('visible', window.scrollY > 400);
        isScrolling = false;
      });
      isScrolling = true;
    }
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Mobile menu
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.add('open');
  });
  document.getElementById('mobileMenuClose').addEventListener('click', closeMobileMenu);
}

// ─── History (Continue Watching) ───
const HistoryManager = {
  KEY: 'sakurastream_history',
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  save(list) { localStorage.setItem(this.KEY, JSON.stringify(list)); },
  add(item) {
    let list = this.get();
    list = list.filter(i => i.id !== item.id);
    list.unshift({ ...item, timestamp: Date.now() });
    if (list.length > 20) list = list.slice(0, 20); // Keep last 20
    this.save(list);
  },
  clear() { localStorage.removeItem(this.KEY); }
};

window.clearWatchHistory = function() {
  if (confirm("Are you sure you want to clear your watch history?")) {
    HistoryManager.clear();
    handleRoute(); // re-render the page
  }
};

function playNextEpisode(id, currentSeason, currentEpisode) {
  // Simplistic next episode jump (assumes next episode exists in same season)
  navigate(`/watch/tv/${id}?s=${currentSeason}&e=${parseInt(currentEpisode) + 1}`);
}
window.playNextEpisode = playNextEpisode;

// ─── TV / Spatial Navigation ───
let isTvMode = false;
function enableTvMode() {
  if (isTvMode) return;
  isTvMode = true;
  document.body.classList.add('tv-mode');
}

function initSpatialNavigation() {
  let activeElement = null;
  
  function getFocusable() {
    return Array.from(document.querySelectorAll('a[href], button, select, input, [tabindex]:not([tabindex="-1"])'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return !el.hasAttribute('disabled') && el.offsetParent !== null && r.width > 0 && r.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
      });
  }

  function setActive(el) {
    if (activeElement) activeElement.classList.remove('tv-focus');
    activeElement = el;
    el.classList.add('tv-focus');
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }

  document.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
    enableTvMode();

    if (e.key === 'Enter') {
      if (document.activeElement && document.activeElement.click) {
        // enter already triggers click on focused buttons/links natively
      }
      return;
    }

    e.preventDefault();
    
    const els = getFocusable();
    if (!els.length) return;

    if (!activeElement || !document.body.contains(activeElement) || activeElement !== document.activeElement) {
      // Re-sync active element if user clicked something or it got removed
      activeElement = document.activeElement !== document.body ? document.activeElement : els[0];
      if (!activeElement) return;
      setActive(activeElement);
      return;
    }

    const currentRect = activeElement.getBoundingClientRect();
    let best = null;
    let minDistance = Infinity;

    els.forEach(el => {
      if (el === activeElement) return;
      const rect = el.getBoundingClientRect();
      let dx = 0, dy = 0, valid = false;

      if (e.key === 'ArrowUp' && rect.bottom <= currentRect.top + 15) {
        dy = currentRect.top - rect.bottom;
        dx = (currentRect.left + currentRect.width/2) - (rect.left + rect.width/2);
        valid = true;
      } else if (e.key === 'ArrowDown' && rect.top >= currentRect.bottom - 15) {
        dy = rect.top - currentRect.bottom;
        dx = (currentRect.left + currentRect.width/2) - (rect.left + rect.width/2);
        valid = true;
      } else if (e.key === 'ArrowLeft' && rect.right <= currentRect.left + 15) {
        dx = currentRect.left - rect.right;
        dy = (currentRect.top + currentRect.height/2) - (rect.top + rect.height/2);
        valid = true;
      } else if (e.key === 'ArrowRight' && rect.left >= currentRect.right - 15) {
        dx = rect.left - currentRect.right;
        dy = (currentRect.top + currentRect.height/2) - (rect.top + rect.height/2);
        valid = true;
      }

      if (valid) {
        const dist = Math.sqrt(dx*dx + dy*dy) + (e.key === 'ArrowUp' || e.key === 'ArrowDown' ? Math.abs(dx)*1.5 : Math.abs(dy)*1.5);
        if (dist < minDistance) {
          minDistance = dist;
          best = el;
        }
      }
    });

    if (best) setActive(best);
  });
}

// ─── Init ───
async function init() {
  initNav();
  initSearchHotkeys();
  initSpatialNavigation();

  // Listen for route changes
  window.addEventListener('hashchange', handleRoute);

  // Set default hash if none
  if (!window.location.hash) {
    window.location.hash = '#/';
  }

  await handleRoute();

  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
  }, 500);
}

// Boot
document.addEventListener('DOMContentLoaded', init);
