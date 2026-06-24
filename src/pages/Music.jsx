import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search, Play, Pause, Heart, SkipBack, SkipForward,
    Shuffle, Repeat, Repeat1, Volume2, VolumeX,
    Plus, ListMusic, X, Music as MusicIcon, Trash2, Edit3,
    Library, Home, ChevronDown, ChevronUp, Check,
    ChevronLeft, ChevronRight, Menu,
    PanelRightClose, PanelRight,
    Radio, User, MoreHorizontal, Settings2, Keyboard,
    Sparkles, TrendingUp, Mic2, Podcast, History as HistoryIcon, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Music.css';



const JIOSAAVN_BASE = 'https://jiosaavnn.vercel.app';

const LANG_LIST = [
    'Hindi', 'English',
    'Punjabi', 'Tamil',
    'Telugu', 'Marathi',
    'Gujarati', 'Bengali',
    'Kannada', 'Bhojpuri',
    'Malayalam', 'Sanskrit',
    'Haryanvi', 'Rajasthani',
    'Odia', 'Assamese',
];

/* ─────────────────────── Helpers ────────────────────────── */
const getArt = (track, quality = '500x500') => {
    if (!track?.image) return '';
    if (typeof track.image === 'string') return track.image;
    if (!Array.isArray(track.image) || !track.image.length) return '';

    // Exact quality match
    const found = track.image.find(i => i.quality?.includes(quality) || i.url?.includes(quality));
    if (found) return found.link || found.url || '';

    // Fallback to highest quality available
    const last = track.image[track.image.length - 1];
    return last?.link || last?.url || '';
};

/* Robust audio URL extractor — handles array, object, or plain string */
const getBestAudio = (track) => {
    const dl = track?.downloadUrl;
    // Case 1: array of quality objects [{quality, link}]
    if (Array.isArray(dl) && dl.length > 0) {
        return (
            dl.find(u => u.quality === '320kbps')?.link ||
            dl.find(u => u.quality === '160kbps')?.link ||
            dl.find(u => u.quality === '96kbps')?.link ||
            dl.find(u => u.quality === '12kbps')?.link ||
            dl[dl.length - 1]?.link ||
            dl[dl.length - 1]?.url ||
            null
        );
    }
    // Case 2: plain string URL
    if (typeof dl === 'string' && dl.length > 3) return dl;
    // Case 3: object with quality keys
    if (dl && typeof dl === 'object') {
        return dl['320kbps'] || dl['160kbps'] || dl['96kbps'] || dl['12kbps'] || Object.values(dl)[0] || null;
    }
    // Case 4: fallback to media_url or streaming_url
    return track?.media_url || track?.streaming_url || null;
};



/* Check if any audio is available for a track */
const hasAudio = (track) => {
    const link = getBestAudio(track);
    // Explicitly exclude non-media URLs (jiosaavn.com pages)
    if (link && typeof link === 'string' && (link.includes('jiosaavn.com/song/') || link.includes('jiosaavn.com/album/'))) {
        return false;
    }
    return !!link;
};

/* Get the primary artist's own image from artistMap (not album art) */
const getArtistImage = (track, quality = '150x150') => {
    const artists = track?.artistMap?.primaryArtists;
    if (artists?.length) {
        const imgs = artists[0].image;
        if (imgs?.length) {
            const found = imgs.find(i => i.quality?.includes(quality));
            return found ? found.link : imgs[imgs.length - 1].link;
        }
    }
    const featured = track?.artistMap?.featuredArtists;
    if (featured?.length) {
        const imgs = featured[0].image;
        if (imgs?.length) {
            const found = imgs.find(i => i.quality?.includes(quality));
            return found ? found.link : imgs[imgs.length - 1].link;
        }
    }
    return getArt(track, quality);
};

/* Decode HTML entities from API responses (&quot; &#039; &amp; etc.) and rebrand */
const decodeHTML = (str) => {
    if (!str || typeof str !== 'string') return str || '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    let val = txt.value;

    // Rebrand any API-provided text
    val = val.replace(/Jio\s*Saav?a?n/gi, 'Sakura Musics');
    val = val.replace(/\bSaav?a?n\b/gi, 'Sakura Musics');
    val = val.replace(/Kilukkampetti(?:\s*Music)?/gi, 'Sakura Musics');

    return val;
};

const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

/* Robust artist formatter — handles string, array of objects, or mixed */
const formatArtists = (artists) => {
    if (!artists) return '';
    if (typeof artists === 'string') return decodeHTML(artists);
    if (Array.isArray(artists)) {
        const joined = artists.map(a => (typeof a === 'object' ? (a.name || a.title) : a)).filter(Boolean).join(', ');
        return decodeHTML(joined) || '';
    }
    if (typeof artists === 'object' && artists.name) return decodeHTML(artists.name);
    return decodeHTML(String(artists));
};

/* Extract artist name from an album/track — tries all known API fields */
const getArtistText = (item) => {
    if (!item) return 'Unknown Artist';
    // Direct string fields
    if (item.primaryArtists && typeof item.primaryArtists === 'string') return formatArtists(item.primaryArtists);
    // Array of artist objects
    if (item.primaryArtists && Array.isArray(item.primaryArtists)) return formatArtists(item.primaryArtists);
    // artistMap from album responses
    if (item.artistMap) {
        const primary = item.artistMap.primary_artists || item.artistMap.primaryArtists || item.artistMap.featured_artists || [];
        if (primary.length > 0) return formatArtists(primary);
    }
    // artists array
    if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) return formatArtists(item.artists);
    // Plain artist string
    if (item.artist && typeof item.artist === 'string') return formatArtists(item.artist);
    // subtitle fallback
    if (item.subtitle && typeof item.subtitle === 'string') {
        const parts = item.subtitle.split('·');
        if (parts.length > 1) return decodeHTML(parts[parts.length - 1].trim());
        return decodeHTML(item.subtitle); // Fallback: return the whole generic subtitle (crucial for playlists)
    }
    // description fallback
    if (item.description) return decodeHTML(item.description);
    return 'Unknown Artist';
};

/* ─────────────────────── Skeletons ──────────────────────── */
const SkeletonCard = () => (
    <div className="mu-vcard mu-skeleton" style={{ height: 260, animation: 'mu-fade-in 0.5s forwards' }}>
        <div className="mu-vcard-img mu-skeleton" style={{ height: 180, marginBottom: 12 }}></div>
        <div className="mu-skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }}></div>
        <div className="mu-skeleton" style={{ height: 12, width: '60%' }}></div>
    </div>
);

const SkeletonRow = () => (
    <div className="mu-mini-row mu-skeleton" style={{ height: 60, marginBottom: 8, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <div className="mu-skeleton" style={{ width: 44, height: 44, flexShrink: 0, marginRight: 12 }}></div>
        <div style={{ flex: 1 }}>
            <div className="mu-skeleton" style={{ height: 14, width: '40%', marginBottom: 6 }}></div>
            <div className="mu-skeleton" style={{ height: 10, width: '25%' }}></div>
        </div>
    </div>
);

/* ─────────────────────── Playlist Modal ──────────────────── */
const PlaylistModal = ({ onClose, onConfirm, editName = '', editImage = '', defaultName = '' }) => {
    const [name, setName] = useState(editName);
    const [image, setImage] = useState(editImage);
    const inputRef = useRef(null);
    const fileRef = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setImage(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalName = name.trim() || defaultName;
        if (finalName) { onConfirm(finalName, image); onClose(); }
    };

    return (
        <div className="mu-modal-overlay" onClick={onClose}>
            <div className="mu-modal glass-panel mu-modal--wide" onClick={e => e.stopPropagation()}>
                <div className="mu-modal-header">
                    <h3>{editName ? 'Edit Details' : 'Create Playlist'}</h3>
                    <button className="mu-icon-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <form className="mu-pl-edit-form" onSubmit={handleSubmit}>
                    <div className="mu-pl-edit-image-wrap" onClick={() => fileRef.current?.click()}>
                        {image ? <img src={image} alt="" /> : <div className="mu-pl-edit-image-placeholder"><ListMusic size={40} /></div>}
                        <div className="mu-pl-edit-image-overlay">
                            <Edit3 size={32} />
                            <span>Choose photo</span>
                        </div>
                        <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleFile} />
                    </div>
                    <div className="mu-pl-edit-info">
                        <div className="mu-modal-field">
                            <label>Name</label>
                            <input ref={inputRef} className="mu-modal-input" type="text"
                                placeholder={editName || defaultName || "My Playlist #1"} value={name}
                                onChange={e => setName(e.target.value)} maxLength={60} />
                        </div>
                        <div className="mu-modal-field">
                            <label>Description (Optional)</label>
                            <textarea className="mu-modal-input mu-modal-textarea" placeholder="Add an optional description" readOnly />
                        </div>
                        <div className="mu-modal-actions">
                            <button type="submit" className="mu-btn-accent" style={{ width: '100%' }}>
                                {editName ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </form>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 12 }}>
                    By proceeding, you agree to give Sakura Musics access to the image you choose to upload. Please make sure you have the right to upload the image.
                </p>
            </div>
        </div>
    );
};


/* ─────────────────────── Track Row ───────────────────────── */
const TrackRow = ({ track, index, isCurrent, isPlaying, isLiked, onPlay, onLike, playlists, onAddToPlaylist, onCreatePlaylist, onRadio, onOpenArtist }) => {
    const [showPlMenu, setShowPlMenu] = useState(false);
    const playing = isCurrent && isPlaying;
    const isInAnyPlaylist = playlists?.some(pl => pl.tracks?.some(t => t.id === track.id)) || false;
    return (
        <div className={`mu-track-row ${isCurrent ? 'mu-track-row--active' : ''}`} onDoubleClick={onPlay}>
            <div className="mu-track-num">
                {playing
                    ? <div className="mu-eq-mini"><span /><span /><span /></div>
                    : <span className="mu-idx">{index + 1}</span>}
                <button className="mu-play-inline" onClick={onPlay}>
                    {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
                </button>
            </div>
            <img src={getArt(track, '50x50')} alt={track.name} className="mu-track-art" />
            <div className="mu-track-info" onClick={onPlay}>
                <span className={`mu-track-title ${isCurrent ? 'mu-track-title--accent' : ''}`}>{track.name}</span>
                <span className="mu-track-artist" onClick={e => { e.stopPropagation(); onOpenArtist?.(track.primaryArtistId || track.singerId); }}>
                    {track.primaryArtists}
                </span>
            </div>
            <span className="mu-track-album" onClick={onPlay}>{track.album?.name || track.album || '—'}</span>
            <div className="mu-track-actions" onClick={e => e.stopPropagation()}>
                <button className={`mu-icon-btn mu-like-btn ${isLiked ? 'mu-like-btn--active' : ''}`}
                    onClick={onLike} title={isLiked ? 'Remove from Liked' : 'Add to Liked'}>
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
                <div className="mu-pl-dropdown-wrapper">
                    <button className="mu-icon-btn"
                        title="Options"
                        onClick={() => setShowPlMenu(m => !m)}>
                        <MoreHorizontal size={16} />
                    </button>
                    {showPlMenu && (
                        <div className="mu-pl-dropdown glass-panel" style={{ top: 24, right: 0 }}>
                            <button className="mu-pl-dropdown-item" onClick={() => { onRadio?.(track.id); setShowPlMenu(false); }}>
                                <Radio size={14} /> Go to Radio
                            </button>
                            <button className="mu-pl-dropdown-item" onClick={() => { onOpenArtist?.(track.primaryArtistId || track.singerId); setShowPlMenu(false); }}>
                                <User size={14} /> Go to Artist
                            </button>
                            <div className="mu-pl-divider" style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                            <p className="mu-pl-dropdown-title">Add to playlist</p>
                            {playlists.length === 0
                                ? <p className="mu-pl-empty">No playlists yet</p>
                                : playlists.map(pl => {
                                    const alreadyIn = pl.tracks.some(t => t.id === track.id);
                                    return (
                                        <button key={pl.id} className={`mu-pl-dropdown-item ${alreadyIn ? 'mu-pl-dropdown-item--added' : ''}`}
                                            onClick={() => { onAddToPlaylist(track, pl.id); setShowPlMenu(false); }}>
                                            <ListMusic size={14} />{pl.name}
                                            {alreadyIn && <Check size={13} className="mu-pl-check" />}
                                        </button>
                                    );
                                })}
                            <button className="mu-pl-dropdown-item" style={{ borderTop: playlists.length > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none', marginTop: playlists.length > 0 ? 4 : 0, paddingTop: playlists.length > 0 ? 4 : 0 }}
                                onClick={(e) => { e.stopPropagation(); onCreatePlaylist?.(track); setShowPlMenu(false); }}>
                                <Plus size={14} /> Create Playlist
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <span className="mu-track-dur">{fmtTime(parseInt(track.duration, 10))}</span>
        </div>
    );
};
const TrackHCard = ({ track, isCurrent, isPlaying, onPlay, isLiked, onLike, playlists, onAddToPlaylist, onCreatePlaylist, onRadio, onOpenArtist, onOpenEntity }) => {
    const [showPlMenu, setShowPlMenu] = useState(false);
    const isEntity = ['playlists', 'albums', 'artists'].includes(track.type);

    const handleCardClick = () => {
        if (isEntity) onOpenEntity?.(track.type, track.id);
        else onPlay?.();
    };

    const playing = !isEntity && isCurrent && isPlaying;
    const isInAnyPlaylist = playlists?.some(pl => pl.tracks?.some(t => t.id === track.id)) || false;
    return (
        <div className={`mu-hcard ${isCurrent ? 'mu-hcard--active' : ''}`} onClick={handleCardClick}>
            <img src={getArt(track, '150x150')} alt={track.name} />

            <div className="mu-hcard-label">
                <div className="mu-hcard-title">{track.name || track.title || 'Untitled'}</div>
                <div className="mu-hcard-artist">{track.primaryArtists || track.subtitle || (track.type ? track.type.charAt(0).toUpperCase() + track.type.slice(1) : 'Various Artists')}</div>
            </div>

            <button className={`mu-hcard-play ${playing ? 'mu-hcard-play--show' : ''}`} onClick={(e) => { e.stopPropagation(); handleCardClick(); }}>
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
        </div>
    );
};


/* ─────────────────────── Track Vertical Card ───────────────────────── */
const TrackVCard = ({ track, isCurrent, isPlaying, onPlay, isLiked, onLike, badge, playlists, onAddToPlaylist, onCreatePlaylist, onRadio, onOpenArtist, onOpen }) => {
    const [showPlMenu, setShowPlMenu] = useState(false);
    const isEntity = track.type === 'album' || track.type === 'playlist' || track.type === 'artist';
    const handleClick = () => { if (isEntity && onOpen) { onOpen(); } else if (onPlay) { onPlay(); } };
    const isInAnyPlaylist = playlists?.some(pl => pl.tracks?.some(t => t.id === track.id)) || false;
    return (
        <div className="mu-vcard" onClick={handleClick}>
            <div className="mu-vcard-img">
                <img src={getArt(track, '150x150')} alt={track.name || track.title} loading="lazy" />
                {badge && <div className="mu-vcard-trending-badge">{badge}</div>}

                <button className={`mu-vcard-play ${isPlaying ? 'mu-vcard-play--show' : ''}`}
                    onClick={e => { e.stopPropagation(); handleClick(); }}>
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
                </button>
            </div>

            {!isEntity && (
                <div className="mu-vcard-actions" onClick={e => e.stopPropagation()}>
                    <button className={`mu-icon-btn mu-vcard-like ${isLiked ? 'mu-icon-btn--accent' : ''}`}
                        onClick={onLike} title={isLiked ? 'Remove from Liked' : 'Add to Liked'}>
                        <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                    <div className="mu-pl-dropdown-wrapper">
                        <button className="mu-icon-btn mu-vcard-add"
                            onClick={() => setShowPlMenu(m => !m)}
                            title="Options">
                            <MoreHorizontal size={16} />
                        </button>
                        {showPlMenu && (
                            <div className="mu-pl-dropdown glass-panel" style={{ top: 30, right: 0, left: 'auto', bottom: 'auto' }}>
                                <button className="mu-pl-dropdown-item" onClick={() => { onRadio?.(track.id); setShowPlMenu(false); }}>
                                    <Radio size={14} /> Go to Radio
                                </button>
                                {track.type === 'song' && (
                                    <button className="mu-pl-dropdown-item" onClick={() => { onOpenArtist?.(track.primaryArtistId); setShowPlMenu(false); }}>
                                        <User size={14} /> Go to Artist
                                    </button>
                                )}
                                <div className="mu-pl-divider" />
                                <p className="mu-pl-dropdown-title">Add to playlist</p>
                                {playlists.length === 0
                                    ? <p className="mu-pl-empty">No playlists yet</p>
                                    : playlists.map(pl => {
                                        const alreadyIn = pl.tracks.some(t => t.id === track.id);
                                        return (
                                            <button key={pl.id} className={`mu-pl-dropdown-item ${alreadyIn ? 'mu-pl-dropdown-item--added' : ''}`}
                                                onClick={() => { onAddToPlaylist(track, pl.id); setShowPlMenu(false); }}>
                                                <ListMusic size={14} />{pl.name}
                                                {alreadyIn && <Check size={13} className="mu-pl-check" />}
                                            </button>
                                        );
                                    })}
                                <button className="mu-pl-dropdown-item" style={{ borderTop: playlists.length > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none', marginTop: playlists.length > 0 ? 4 : 0, paddingTop: playlists.length > 0 ? 4 : 0 }}
                                    onClick={(e) => { e.stopPropagation(); onCreatePlaylist?.(track); setShowPlMenu(false); }}>
                                    <Plus size={14} /> Create Playlist
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <h3 className={`mu-vcard-title ${isCurrent ? 'mu-vcard-title--accent' : ''}`}>{decodeHTML(track.title || track.name)}</h3>
            <p className="mu-vcard-sub">{getArtistText(track)}</p>
        </div>
    );
};

/* ─────────────────────── Mini Row (Search) ───────────────────────── */
const MiniRow = ({ item, isCurrent, playlists, onAddToPlaylist, onCreatePlaylist, onPlay, onOpen }) => {
    const [showPlMenu, setShowPlMenu] = useState(false);
    const isInAnyPlaylist = playlists.some(pl => (pl.tracks || []).some(t => t.id === item.id));
    return (
        <div className="mu-mini-row" onClick={onPlay || onOpen}>
            <img src={getArt(item, '50x50')} alt="" className="mu-mini-art" />
            <div className="mu-mini-info">
                <p className={`mu-mini-title ${isCurrent ? 'mu-mini-title--accent' : ''}`}>{item.title || item.name}</p>
                <p className="mu-mini-sub">
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.primaryArtists || item.description || 'Sakura Musics'}
                </p>
            </div>

            {(item.type === 'song' || item.downloadUrl) && (
                <div className="mu-pl-dropdown-wrapper" onClick={e => e.stopPropagation()}>
                    <button className={`mu-icon-btn ${isInAnyPlaylist ? 'mu-in-playlist-btn' : ''}`}
                        style={{ opacity: showPlMenu ? 1 : (isInAnyPlaylist ? 1 : 0.6) }}
                        onClick={() => setShowPlMenu(m => !m)}
                        title={isInAnyPlaylist ? 'Added to playlist' : 'Add to playlist'}>
                        {isInAnyPlaylist ? <Check size={16} strokeWidth={2.5} /> : <Plus size={16} />}
                    </button>
                    {showPlMenu && (
                        <div className="mu-pl-dropdown glass-panel" style={{ top: 25, right: 0, left: 'auto', bottom: 'auto' }}>
                            <p className="mu-pl-dropdown-title">Add to playlist</p>
                            {playlists.length === 0
                                ? <p className="mu-pl-empty">No playlists yet</p>
                                : playlists.map(pl => {
                                    const alreadyIn = pl.tracks.some(t => t.id === item.id);
                                    return (
                                        <button key={pl.id} className={`mu-pl-dropdown-item ${alreadyIn ? 'mu-pl-dropdown-item--added' : ''}`}
                                            onClick={() => { onAddToPlaylist(item, pl.id); setShowPlMenu(false); }}>
                                            <ListMusic size={14} />{pl.name}
                                            {alreadyIn && <Check size={13} className="mu-pl-check" />}
                                        </button>
                                    );
                                })}
                            <button className="mu-pl-dropdown-item" style={{ borderTop: playlists.length > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none', marginTop: playlists.length > 0 ? 4 : 0, paddingTop: playlists.length > 0 ? 4 : 0 }}
                                onClick={(e) => { e.stopPropagation(); onCreatePlaylist?.(item); setShowPlMenu(false); }}>
                                <Plus size={14} /> Create Playlist
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const Music = () => {
    /* ── Data ── */
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [activeQuery, setActiveQuery] = useState('Top Hits 2024');

    /* ── Music Languages ── */
    const [musicLanguages, setMusicLanguages] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mu_languages') || JSON.stringify(['Hindi'])); }
        catch { return ['Hindi']; }
    });
    const [pendingLanguages, setPendingLanguages] = useState(null); // null = closed
    const [showLangPicker, setShowLangPicker] = useState(false);
    const langPickerRef = useRef(null);



    /* ── View ── */
    const [view, setView] = useState('home');
    const [activePill, setActivePill] = useState('All');

    /* ── Sidebar State ── */
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth <= 900);

    /* ── Internal Navigation History ── */
    const [navHistory, setNavHistory] = useState([{ view: 'home', query: 'Top Hits 2024' }]);
    const [historyPointer, setHistoryPointer] = useState(0);
    const isNavigatingHistory = useRef(false);

    const historyPointerRef = useRef(historyPointer);
    useEffect(() => { historyPointerRef.current = historyPointer; }, [historyPointer]);

    const pushToHistory = useCallback((newView, newQuery) => {
        if (isNavigatingHistory.current) return;
        setNavHistory(prev => {
            const ptr = historyPointerRef.current;
            const next = prev.slice(0, ptr + 1);
            const current = next[next.length - 1];
            if (current && current.view === newView && current.query === newQuery) return prev;

            const updated = [...next, { view: newView, query: newQuery }];
            setHistoryPointer(updated.length - 1);
            return updated;
        });
    }, []);

    const goHistoryBack = () => {
        if (historyPointer > 0) {
            const prev = navHistory[historyPointer - 1];
            isNavigatingHistory.current = true;
            setView(prev.view);
            setActiveQuery(prev.query);
            setHistoryPointer(historyPointer - 1);
            setTimeout(() => { isNavigatingHistory.current = false; }, 50);
        }
    };

    const goHistoryForward = () => {
        if (historyPointer < navHistory.length - 1) {
            const nextEntry = navHistory[historyPointer + 1];
            isNavigatingHistory.current = true;
            setView(nextEntry.view);
            setActiveQuery(nextEntry.query);
            setHistoryPointer(historyPointer + 1);
            setTimeout(() => { isNavigatingHistory.current = false; }, 50);
        }
    };

    // Track state changes to push to history
    useEffect(() => {
        pushToHistory(view, activeQuery);
    }, [view, activeQuery, pushToHistory]);

    /* ── Library sidebar ── */
    const [libFilter, setLibFilter] = useState('Playlists');
    const [libSearch, setLibSearch] = useState('');

    /* ── Liked Songs ── */
    const [likedSongs, setLikedSongs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mu_liked') || '[]'); } catch { return []; }
    });

    /* ── Playlists ── */
    const [playlists, setPlaylists] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mu_playlists') || '[]'); } catch { return []; }
    });

    /* ── Right Panel State ── */
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState('playing');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEntityPlMenu, setShowEntityPlMenu] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState(null);



    /* ── Global Search & Entity Data ── */
    const [searchData, setSearchData] = useState(null);
    const [entityData, setEntityData] = useState(null);

    /* ── Player ── */
    const [queue, setQueue] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('none');
    const [isBuffering, setIsBuffering] = useState(false);

    /* ── Lyrics ── */
    const [lyrics, setLyrics] = useState(null);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
    const [showPlMenu, setShowPlMenu] = useState(false);
    const [showBottomPlMenu, setShowBottomPlMenu] = useState(false);

    /* ── Recently played (history) ── */
    const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mu_history') || '[]'); } catch { return []; }
    });

    /* ── Trending / New Releases tracks ── */
    const [trendingTracks, setTrendingTracks] = useState([]);
    const [trendingAlbums, setTrendingAlbums] = useState([]);
    const [newReleaseTracks, setNewReleaseTracks] = useState([]);

    /* ── Hero Carousel ── */
    const [heroIndex, setHeroIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setHeroIndex(prev => (prev + 1));
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    /* ── Refs ── */
    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const volumeRef = useRef(null);
    const queueRef = useRef(queue);
    const idxRef = useRef(currentIndex);
    const shuffleRef = useRef(isShuffle);
    const repeatRef = useRef(repeatMode);

    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { idxRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { shuffleRef.current = isShuffle; }, [isShuffle]);
    useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);

    useEffect(() => { localStorage.setItem('mu_liked', JSON.stringify(likedSongs)); }, [likedSongs]);
    useEffect(() => { localStorage.setItem('mu_playlists', JSON.stringify(playlists)); }, [playlists]);
    useEffect(() => { localStorage.setItem('mu_history', JSON.stringify(recentlyPlayed)); }, [recentlyPlayed]);
    useEffect(() => { localStorage.setItem('mu_languages', JSON.stringify(musicLanguages)); }, [musicLanguages]);
    // Sidebar collapsed state is no longer persisted, it dynamically opens on play

    /* ── Auto-open right panel when music starts playing ── */
    useEffect(() => {
        if (currentTrack && window.innerWidth > 900) {
            setIsRightPanelOpen(true);
            setIsSidebarCollapsed(false);
        }
    }, [currentTrack]);

    /* ── Close lang picker on outside click ── */
    useEffect(() => {
        const handler = (e) => {
            if (langPickerRef.current && !langPickerRef.current.contains(e.target)) {
                setShowLangPicker(false);
                setPendingLanguages(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── Audio bootstrap ── */
    useEffect(() => {
        const audio = new Audio();
        audio.volume = 0.8;
        audioRef.current = audio;
        const onEnded = () => {
            const list = queueRef.current;
            if (!list.length) return;
            if (repeatRef.current === 'one') { audio.currentTime = 0; audio.play(); return; }
            if (!shuffleRef.current && repeatRef.current === 'none' && idxRef.current + 1 >= list.length) {
                setIsPlaying(false); return;
            }
            const nextIdx = shuffleRef.current ? Math.floor(Math.random() * list.length) : (idxRef.current + 1) % list.length;
            setCurrentIndex(nextIdx); setCurrentTrack(list[nextIdx]); setIsPlaying(true);
        };
        const onTime = () => {
            if (audio.duration) { setProgress((audio.currentTime / audio.duration) * 100); setElapsed(audio.currentTime); }
        };
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
        audio.addEventListener('waiting', () => setIsBuffering(true));
        audio.addEventListener('playing', () => setIsBuffering(false));
        audio.addEventListener('canplay', () => setIsBuffering(false));
        return () => { audio.pause(); audio.src = ''; };
    }, []); // eslint-disable-line


    /* ── Load track (quality-aware, auto-enrich if no audio) ── */
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        const loadAudio = async () => {
            let link = getBestAudio(currentTrack);

            // If no audio URL, auto-fetch full song details from API
            if (!link && currentTrack.id) {
                try {
                    const res = await fetch(`${JIOSAAVN_BASE}/songs?id=${currentTrack.id}`);
                    const json = await res.json();
                    if (json.status === 'SUCCESS' && json.data?.[0]) {
                        const full = json.data[0];
                        const enriched = {
                            ...currentTrack,
                            ...full,
                            name: decodeHTML(full.name || currentTrack.name),
                            primaryArtists: formatArtists(full.primaryArtists) || formatArtists(currentTrack.primaryArtists)
                        };
                        link = getBestAudio(enriched);
                        if (link) {
                            // Update state with enriched track (so it works on replay)
                            setCurrentTrack(enriched);
                            // Also update the queue so future plays work
                            setQueue(prev => prev.map(t => t.id === enriched.id ? enriched : t));
                            return; // setCurrentTrack will re-trigger this effect
                        }
                    }
                } catch (err) {
                    console.error('Auto-enrich failed:', err);
                }
            }

            if (!link) return;
            audio.src = link;
            setProgress(0); setElapsed(0); setDuration(0);
            if (isPlaying) audio.play().catch(() => setIsPlaying(false));
        };

        loadAudio();

        // Dynamic backdrop
        if (currentTrack?.image?.[2]?.link) {
            document.documentElement.style.setProperty('--ambient-color', 'rgba(192, 20, 60, 0.2)');
        } else {
            document.documentElement.style.setProperty('--ambient-color', 'rgba(192, 20, 60, 0.05)');
        }
    }, [currentTrack]); // eslint-disable-line

    /* ── Fetch lyrics when track changes ── */
    useEffect(() => {
        if (!currentTrack?.id) { setLyrics(null); return; }
        setLyricsLoading(true);
        setLyrics(null);
        fetch(`${JIOSAAVN_BASE}/lyrics?id=${currentTrack.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(j => {
                if (j?.status === 'SUCCESS' && j?.data?.lyrics) setLyrics(j.data.lyrics);
                else setLyrics(null);
            })
            .catch(() => setLyrics(null))
            .finally(() => setLyricsLoading(false));
    }, [currentTrack]);

    /* ── Play/Pause ── */
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) audio.play().catch(() => setIsPlaying(false));
        else audio.pause();
    }, [isPlaying]);

    /* ── Volume ── */
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = isMuted ? 0 : volume;
    }, [volume, isMuted]);


    /* ── Fetch music (Tracks only, for Browse/Tags) ── */
    const fetchMusic = useCallback(async (q) => {
        if (!q) return;
        setLoading(true); setError(null);
        const lang = musicLanguages[0]?.toLowerCase() ?? '';
        const enrichedQ = lang && !q.toLowerCase().includes(lang) ? `${q} ${lang}` : q;
        try {
            const res = await fetch(`${JIOSAAVN_BASE}/search/songs?query=${encodeURIComponent(enrichedQ)}&limit=50`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            if (json.status === 'SUCCESS' && json.data?.results?.length) {
                // Include ALL songs — even those where downloadUrl is in a non-standard format
                const all = json.data.results.map(t => ({
                    ...t,
                    name: decodeHTML(t.title || t.name),
                    primaryArtists: formatArtists(t.primaryArtists) || decodeHTML(t.description) || 'Unknown Artist'
                }));
                const valid = all.filter(hasAudio);
                const list = valid.length > 0 ? valid : all;
                setTracks(list);
                const isPlaylistView = playlists.some(pl => pl.id === view);
                if (view === 'home' || isPlaylistView) setQueue(list);
            } else { setTracks([]); }
        } catch { setError('Could not reach Sakura Musics. Check your connection.'); }
        finally { setLoading(false); }
    }, [musicLanguages, view]); // eslint-disable-line

    // Only run track fetch if we are in 'home' view or similar simple state, OR skip auto-fetching if view is search/entity.
    useEffect(() => {
        if (view === 'home') {
            fetchMusic(activeQuery);
        }
    }, [activeQuery, musicLanguages, view]); // eslint-disable-line

    /* ── Perform Global Search ── */
    const performGlobalSearch = async (q) => {
        setLoading(true); setError(null);
        try {
            const lang = musicLanguages[0]?.toLowerCase() ?? '';
            const enrichedQ = lang && !q.toLowerCase().includes(lang) ? `${q} ${lang}` : q;
            const res = await fetch(`${JIOSAAVN_BASE}/search/all?query=${encodeURIComponent(enrichedQ)}`);
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const json = await res.json();

            if (json.status === 'SUCCESS' && json.data) {
                const results = json.data;

                // Fetch full details for songs to get downloadUrl
                let allSongIds = [];
                if (results.songs?.results) {
                    allSongIds = [...(results.songs.results.map(s => s.id) || [])];
                }
                if (results.topQuery?.results) {
                    results.topQuery.results.forEach(item => {
                        if (item.type === 'song' && !allSongIds.includes(item.id)) {
                            allSongIds.push(item.id);
                        }
                    });
                }

                if (allSongIds.length > 0) {
                    const sRes = await fetch(`${JIOSAAVN_BASE}/songs?id=${allSongIds.join(',')}`);
                    const sJson = await sRes.json();
                    if (sJson.status === 'SUCCESS' && sJson.data) {
                        const fullSongsMap = new Map(sJson.data.map(s => [s.id, s]));

                        // Merge full details back
                        if (results.songs?.results) {
                            results.songs.results = results.songs.results.map(s => {
                                const full = fullSongsMap.get(s.id);
                                if (!full) return s;
                                return {
                                    ...s,
                                    ...full,
                                    name: decodeHTML(s.title || full.name || s.name),
                                    primaryArtists: formatArtists(full.primaryArtists) || formatArtists(s.primaryArtists) || decodeHTML(s.description) || 'Unknown Artist'
                                };
                            });
                        }
                        if (results.topQuery?.results) {
                            results.topQuery.results = results.topQuery.results.map(item => {
                                if (item.type === 'song') {
                                    const full = fullSongsMap.get(item.id);
                                    if (!full) return item;
                                    return {
                                        ...item,
                                        ...full,
                                        name: decodeHTML(item.title || full.name || item.name),
                                        primaryArtists: formatArtists(full.primaryArtists) || formatArtists(item.primaryArtists) || decodeHTML(item.description) || 'Unknown Artist'
                                    };
                                }
                                return item;
                            });
                        }
                    }
                }

                setSearchData(results);
                setView('search');
                setActiveQuery(q);
            } else {
                setError('No results found. Try a different search.');
            }
        } catch (e) {
            console.error('Search error:', e);
            setError('Global search failed. Check your connection.');
        }
        finally { setLoading(false); }
    };

    /* ── Similar Songs (replaces broken Radio endpoint) ── */
    const loadRadio = useCallback(async (trackId) => {
        if (!trackId) return;
        setLoading(true); setError(null); setView('radio');
        try {
            // Get the current track's artist name for searching similar songs
            const artistName = formatArtists(currentTrack?.primaryArtists) || 'popular';
            const res = await fetch(`${JIOSAAVN_BASE}/search/songs?query=${encodeURIComponent(artistName)}&limit=30`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            if (json.status === 'SUCCESS' && json.data?.results?.length) {
                const list = json.data.results
                    .filter(t => hasAudio(t) && t.id !== trackId)
                    .map(t => ({
                        ...t,
                        name: decodeHTML(t.title || t.name),
                        primaryArtists: formatArtists(t.primaryArtists)
                    }));
                setEntityData({
                    name: `Similar to ${currentTrack?.name || 'this song'}`,
                    type: "radio",
                    tracks: list,
                    image: currentTrack?.image
                });
            } else { setEntityData(null); }
        } catch { setError('Similar songs failed. Try again later.'); }
        finally { setLoading(false); }
    }, [currentTrack]);

    /* ── Fetch Entity Detail (Album/Playlist/Artist) ── */
    const openEntity = async (type, id) => {
        setLoading(true); setError(null); setView(`entity_${id}`);
        try {
            const endpoint = type === 'artists' ? 'artists' : type === 'albums' ? 'albums' : 'playlists';
            const res = await fetch(`${JIOSAAVN_BASE}/${endpoint}?id=${id}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            if (json.status === 'SUCCESS' && json.data) {
                // Robust track extraction
                let items = [];
                const d = json.data;
                if (Array.isArray(d.songs)) items = d.songs;
                else if (Array.isArray(d.list)) items = d.list;
                else if (Array.isArray(d.topSongs)) items = d.topSongs;
                else if (d.tracks && Array.isArray(d.tracks)) items = d.tracks;

                const entityDataObj = {
                    ...d,
                    type: endpoint,
                    tracks: (items || []).map(t => ({
                        ...t,
                        name: decodeHTML(t.title || t.name),
                        primaryArtists: formatArtists(t.primaryArtists) || decodeHTML(t.description) || 'Unknown Artist'
                    }))
                };
                setEntityData(entityDataObj);

                if (type === 'artists') {
                    // Fetch top songs and albums for artist profile
                    const [sRes, aRes] = await Promise.all([
                        fetch(`${JIOSAAVN_BASE}/search/songs?query=${encodeURIComponent(d.name)}&limit=20`),
                        fetch(`${JIOSAAVN_BASE}/search/albums?query=${encodeURIComponent(d.name)}&limit=10`)
                    ]);
                    const [sJson, aJson] = await Promise.all([sRes.json(), aRes.json()]);
                    setEntityData(prev => ({
                        ...prev,
                        tracks: sJson.status === 'SUCCESS' ? sJson.data.results : prev.tracks,
                        artistAlbums: aJson.status === 'SUCCESS' ? aJson.data.results : []
                    }));
                }
            } else { setEntityData(null); }
        } catch { setError(`Failed to load ${type.slice(0, -1)}.`); }
        finally { setLoading(false); }
    };

    /* ── Fetch Home Modules (Trending, New Releases, etc.) ── */
    useEffect(() => {
        const loadHome = async () => {
            setLoading(true);
            try {
                const lang = musicLanguages.join(',').toLowerCase();
                const res = await fetch(`${JIOSAAVN_BASE}/modules?language=${lang}`);
                if (!res.ok) return;
                const json = await res.json();
                if (json.status === 'SUCCESS' && json.data) {
                    const d = json.data;
                    const moduleSongs = (d.trending?.songs || []).map(t => ({
                        ...t,
                        name: decodeHTML(t.title || t.name),
                        primaryArtists: formatArtists(t.primaryArtists) || decodeHTML(t.description) || 'Unknown Artist'
                    }));

                    // Deep Search Enrichment: Fetch more regional hits
                    let enrichedSongs = [];
                    try {
                        const primLang = musicLanguages[0] || 'Hindi';
                        const enrichRes = await fetch(`${JIOSAAVN_BASE}/search/songs?query=trending+${primLang.toLowerCase()}+2025&limit=40`);
                        const enrichJson = await enrichRes.json();
                        if (enrichJson.status === 'SUCCESS' && enrichJson.data?.results) {
                            enrichedSongs = enrichJson.data.results.map(t => ({
                                ...t,
                                name: decodeHTML(t.title || t.name),
                                primaryArtists: formatArtists(t.primaryArtists) || decodeHTML(t.description) || 'Unknown Artist'
                            }));
                        }
                    } catch (e) { console.error("Enrichment failed", e); }

                    // Deduplicate and merge
                    const songMap = new Map();
                    moduleSongs.forEach(s => songMap.set(s.id, s));
                    enrichedSongs.forEach(s => { if (!songMap.has(s.id)) songMap.set(s.id, s); });

                    setTrendingTracks(Array.from(songMap.values()));

                    setTrendingAlbums((d.trending?.albums || d.albums || []).map(a => ({
                        ...a,
                        name: decodeHTML(a.name || a.title),
                        title: decodeHTML(a.title || a.name),
                        subtitle: decodeHTML(a.subtitle || a.description)
                    })));
                    setNewReleaseTracks((d.albums || []).slice(0, 10).map(t => ({
                        ...t,
                        name: decodeHTML(t.title || t.name),
                        primaryArtists: formatArtists(t.primaryArtists) || decodeHTML(t.description) || 'Unknown Artist'
                    })));
                    setSearchData(prev => ({
                        ...prev,
                        featuredPlaylists: (d.playlists || []).map(pl => ({
                            ...pl,
                            title: decodeHTML(pl.title || pl.name),
                            subtitle: decodeHTML(pl.subtitle || pl.description)
                        })),
                        globalCharts: (d.charts || []).map(c => ({
                            ...c,
                            title: decodeHTML(c.title || c.name),
                            subtitle: decodeHTML(c.subtitle || c.description)
                        }))
                    }));
                }
            } catch (e) {
                console.error("Home modules error:", e);
                setError("Failed to load discovery content.");
            } finally {
                setLoading(false);
            }
        };
        if (view === 'home') loadHome();
    }, [musicLanguages, view]);

    /* ── Playback ── */
    const playFromList = useCallback((list, track, idx) => {
        if (!track) return;
        setQueue(list);
        if (currentTrack?.id === track.id && hasAudio(currentTrack)) {
            setIsPlaying(p => !p);
            return;
        }
        setCurrentTrack(track);
        setCurrentIndex(idx);
        setIsPlaying(true);
        // Track recently played history (keep last 20, deduplicated)
        setRecentlyPlayed(prev => {
            const filtered = prev.filter(t => t.id !== track.id);
            return [track, ...filtered].slice(0, 20);
        });
    }, [currentTrack]);

    const clearRecentlyPlayed = useCallback(() => {
        setRecentlyPlayed([]);
        localStorage.removeItem('mu_history');
    }, []);

    const playTrack = useCallback(async (track, list = []) => {
        if (!track) return;

        // If track is missing audio, fetch full details
        if (!hasAudio(track) && track.id) {
            setLoading(true);
            try {
                const res = await fetch(`${JIOSAAVN_BASE}/songs?id=${track.id}`);
                const json = await res.json();
                if (json.status === 'SUCCESS' && json.data?.[0]) {
                    const full = json.data[0];
                    const enriched = {
                        ...track,
                        ...full,
                        name: decodeHTML(track.title || full.name || track.name),
                        primaryArtists: formatArtists(full.primaryArtists) || formatArtists(track.primaryArtists) || decodeHTML(track.description) || 'Unknown Artist'
                    };
                    const newList = list.map(t => t.id === track.id ? enriched : t);
                    if (!newList.some(t => t.id === track.id)) newList.push(enriched);
                    const idx = newList.findIndex(t => t.id === track.id);
                    playFromList(newList, enriched, Math.max(0, idx));
                    return;
                }
            } catch (err) {
                console.error("Failed to enrich track:", err);
            } finally {
                setLoading(false);
            }
        }

        const idx = list.findIndex(t => t.id === track.id);
        const finalList = list.length > 0 ? list : [track];
        playFromList(finalList, track, Math.max(0, idx));
    }, [playFromList]);

    const skipNext = useCallback(() => {
        const list = queueRef.current;
        if (!list.length) return;
        const next = shuffleRef.current ? Math.floor(Math.random() * list.length) : (idxRef.current + 1) % list.length;
        setCurrentIndex(next); setCurrentTrack(list[next]); setIsPlaying(true);
    }, []);

    const skipPrev = useCallback(() => {
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
        const list = queueRef.current;
        if (!list.length) return;
        const prev = (idxRef.current - 1 + list.length) % list.length;
        setCurrentIndex(prev); setCurrentTrack(list[prev]); setIsPlaying(true);
    }, []);

    /* ── Keyboard Shortcuts ── */
    useEffect(() => {
        const handleKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.code) {
                case 'Space': e.preventDefault(); setIsPlaying(p => !p); break;
                case 'ArrowRight': skipNext(); break;
                case 'ArrowLeft': skipPrev(); break;
                case 'KeyM': setIsMuted(m => !m); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [skipNext, skipPrev]);

    const scrubProgress = (e) => {
        const audio = audioRef.current;
        const bar = progressRef.current;
        if (!audio?.duration || !bar) return;
        const { left, width } = bar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - left) / width));
        audio.currentTime = pct * audio.duration;
        setProgress(pct * 100);
    };

    const scrubVolume = (e) => {
        const bar = volumeRef.current;
        if (!bar) return;
        const { left, width } = bar.getBoundingClientRect();
        setVolume(Math.max(0, Math.min(1, (e.clientX - left) / width)));
        setIsMuted(false);
    };

    /* ── Liked ── */
    const isLiked = (track) => likedSongs.some(t => t.id === track.id);
    const toggleLike = useCallback((track) => {
        setLikedSongs(prev =>
            prev.some(t => t.id === track.id) ? prev.filter(t => t.id !== track.id) : [...prev, track]
        );
    }, []);

    /* ── Playlists ── */
    const createPlaylist = (name, cover) => {
        const initialTracks = (typeof showCreateModal === 'object' && showCreateModal !== null) ? [showCreateModal] : [];
        setPlaylists(p => [...p, { id: Date.now(), name, cover, tracks: initialTracks }]);
        setShowCreateModal(false);
    };
    const renamePlaylist = (id, name, cover) => setPlaylists(p => p.map(pl => pl.id === id ? { ...pl, name, cover } : pl));
    const deletePlaylist = (id) => { setPlaylists(p => p.filter(pl => pl.id !== id)); if (view === id) setView('home'); };
    const addToPlaylist = useCallback((track, playlistId) => {
        setPlaylists(p => p.map(pl => {
            if (pl.id !== playlistId) return pl;
            if (pl.tracks.some(t => t.id === track.id)) return pl;
            return { ...pl, tracks: [...pl.tracks, track] };
        }));
    }, []);
    const addListToPlaylist = useCallback((list, playlistId) => {
        setPlaylists(p => p.map(pl => {
            if (pl.id !== playlistId) return pl;
            const newTracks = list.filter(t => !pl.tracks.some(existing => existing.id === t.id));
            if (newTracks.length === 0) return pl;
            return { ...pl, tracks: [...pl.tracks, ...newTracks] };
        }));
    }, []);



    const handleSearch = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            performGlobalSearch(searchInput.trim());
        }
    };

    const cycleRepeat = () => setRepeatMode(m => m === 'none' ? 'all' : m === 'all' ? 'one' : 'none');

    /* ── Derived ── */
    const currentPlaylist = playlists.find(pl => pl.id === view) || null;
    const displayList = view === 'liked' ? likedSongs
        : view === 'history' ? recentlyPlayed
            : view === 'trending' ? trendingTracks
                : view === 'radio' ? entityData?.tracks || []
                    : currentPlaylist ? currentPlaylist.tracks
                        : (typeof view === 'string' && view.startsWith('entity_')) && entityData ? entityData.tracks
                            : tracks;
    const effectiveVol = isMuted ? 0 : volume;

    /* ── Filtered library list ── */
    const filteredPlaylists = playlists.filter(pl =>
        pl.name.toLowerCase().includes(libSearch.toLowerCase())
    );

    const navigate = useNavigate();

    const mixedTrending = React.useMemo(() => {
        const list = [...trendingTracks.slice(0, 3)];
        if (trendingAlbums?.length) {
            list.push(...trendingAlbums.slice(0, 2).map(a => ({ ...a, type: 'albums' })));
        }
        if (searchData?.featuredPlaylists?.length) {
            list.push(...searchData.featuredPlaylists.slice(0, 1).map(p => ({ ...p, type: 'playlists' })));
        }
        // Increased to 10 for a richer home screen experience
        return list.slice(0, 10);
    }, [trendingTracks, trendingAlbums, searchData?.featuredPlaylists]);

    /* ════════════════════════ RENDER ════════════════════════ */
    return (
        <div className={`mu-page ${isSidebarCollapsed ? 'mu-page--sidebar-collapsed' : ''} ${isRightPanelOpen ? 'mu-page--panel-open' : ''}`}>
            <div className="mu-orb mu-orb-1" />
            <div className="mu-orb mu-orb-2" />


            {/* ═══════ LEFT — YOUR LIBRARY ═══════ */}
            <aside className={`mu-sidebar glass-panel ${isSidebarCollapsed ? 'mu-sidebar--collapsed' : ''}`}>
                {/* Library header */}
                <div className="mu-lib-header">
                    <div className="mu-lib-title" onClick={() => setIsSidebarCollapsed(p => !p)} style={{ cursor: 'pointer' }} title={isSidebarCollapsed ? "Expand Your Library" : "Collapse Your Library"}>
                        {isSidebarCollapsed ? <Library size={24} /> : <Library size={22} />}
                        {!isSidebarCollapsed && <span>Your Library</span>}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="mu-lib-header-actions">
                            <button className="mu-icon-btn mu-icon-btn--transparent" onClick={() => setShowCreateModal(true)} title="Create playlist">
                                <Plus size={20} />
                            </button>
                        </div>
                    )}
                </div>



                {/* ── Library search & filters ── */}
                {!isSidebarCollapsed && (
                    <>
                        <div className="mu-lib-search glass-panel">
                            <Search size={14} />
                            <input
                                placeholder="Search library"
                                value={libSearch}
                                onChange={e => setLibSearch(e.target.value)}
                            />
                        </div>
                    </>
                )}

                {/* ── Scrollable: BROWSE + MY LIBRARY ── */}
                <div className="mu-sidebar-scrollable custom-scrollbar">
                    <div className="mu-browse-section">
                        <p className="mu-section-label">BROWSE</p>
                        {[
                            { label: 'New Releases', icon: <Sparkles size={18} />, query: 'new releases bollywood 2025' },
                            { label: 'Top Charts', icon: <TrendingUp size={18} />, query: 'top charts hindi 2025' },
                            { label: 'Top Playlists', icon: <ListMusic size={18} />, query: 'top playlists bollywood 2025' },
                            { label: 'Top Artists', icon: <Mic2 size={18} />, query: 'top artists india 2025' },
                        ].map(item => (
                            <button
                                key={item.label}
                                className="mu-browse-btn"
                                onClick={() => {
                                    setSearchInput(item.query);
                                    performGlobalSearch(item.query);
                                }}
                            >
                                <span className="mu-browse-icon">{item.icon}</span>
                                <span className="mu-browse-text">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* ── MY LIBRARY section ── */}
                    <div className="mu-browse-section">
                        <p className="mu-section-label">MY LIBRARY</p>

                        {/* History & Liked (Always show) */}
                        <div
                            className={`mu-lib-item ${view === 'history' ? 'mu-lib-item--active' : ''}`}
                            onClick={() => setView('history')}
                        >
                            <div className="mu-lib-art mu-lib-art--history">
                                <HistoryIcon size={18} color="white" />
                            </div>
                            <div className="mu-lib-info">
                                <span className={`mu-lib-name ${view === 'history' ? 'mu-lib-name--accent' : ''}`}>History</span>
                                <span className="mu-lib-sub">{recentlyPlayed.length} tracks played</span>
                            </div>
                        </div>

                        <div className={`mu-lib-item ${view === 'liked' ? 'mu-lib-item--active' : ''}`} onClick={() => setView('liked')}>
                            <div className="mu-lib-art mu-lib-art--liked">
                                <Heart size={18} fill="currentColor" />
                            </div>
                            <div className="mu-lib-info">
                                <span className={`mu-lib-name ${view === 'liked' ? 'mu-lib-name--accent' : ''}`}>Liked Songs</span>
                                <span className="mu-lib-sub">{likedSongs.length} songs</span>
                            </div>
                        </div>

                        {/* Filtered Content */}
                        {filteredPlaylists.map(pl => (
                            <div key={pl.id} className={`mu-lib-item ${view === pl.id ? 'mu-lib-item--active' : ''}`}
                                onClick={() => setView(pl.id)}>
                                <div className="mu-lib-art">
                                    {pl.cover ? <img src={pl.cover} alt="" />
                                        : pl.tracks.length > 0
                                            ? <img src={getArt(pl.tracks[0], '50x50')} alt={pl.name} />
                                            : <ListMusic size={18} />}
                                </div>
                                <div className="mu-lib-info">
                                    <span className={`mu-lib-name ${view === pl.id ? 'mu-lib-name--accent' : ''}`}>{pl.name}</span>
                                    <span className="mu-lib-sub">Playlist • {pl.tracks.length} songs</span>
                                </div>
                                {!isSidebarCollapsed && (
                                    <div className="mu-lib-actions">
                                        <button className="mu-icon-btn" onClick={(e) => { e.stopPropagation(); setEditingPlaylist(pl); }} title="Edit Playlist"><Edit3 size={14} /></button>
                                        <button className="mu-icon-btn" onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }} title="Delete Playlist"><Trash2 size={14} color="#ff4444" /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    
                </div>

                {!isSidebarCollapsed && (
                    <div className="mu-sidebar-footer">
                        <h2 className="mu-sidebar-logo">SakuraStream.</h2>
                    </div>
                )}
            </aside>

            {/* ═══════ CENTER — MAIN CONTENT ═══════ */}
            <main className="mu-main">
                {/* Ambient Equalizer Background */}
                <div className="ambient-eq-container">
                    <div className="eq-bar eq-bar-1"></div>
                    <div className="eq-bar eq-bar-2"></div>
                    <div className="eq-bar eq-bar-3"></div>
                    <div className="eq-bar eq-bar-4"></div>
                </div>

                {/* Topbar */}
                <div className="mu-topbar">
                    <div className="mu-topbar-nav">
                        <button className="mu-mobile-menu-btn" onClick={() => setIsSidebarCollapsed(p => !p)} title="Menu">
                            <Menu size={24} />
                        </button>
                        <button
                            className="mu-nav-btn mu-desktop-only"
                            onClick={goHistoryBack}
                            disabled={historyPointer === 0}
                            title="Go back"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            className="mu-nav-btn mu-desktop-only"
                            onClick={goHistoryForward}
                            disabled={historyPointer >= navHistory.length - 1}
                            title="Go forward"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <button
                            className="mu-nav-btn"
                            onClick={() => window.location.href = '/'}
                            title="Go to Main Home"
                        >
                            <Home size={18} />
                        </button>
                    </div>
                    <form className="mu-topbar-search glass-panel" onSubmit={handleSearch}>
                        <Search size={18} className="mu-topbar-icon" />
                        <input
                            type="text"
                            placeholder="What do you want to play?"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                        />
                        {searchInput && (
                            <button
                                type="button"
                                className="mu-icon-btn"
                                onClick={() => {
                                    setSearchInput('');
                                    if (view === 'search') setView('home');
                                }}
                                style={{ display: 'flex', alignItems: 'center', opacity: 0.7, padding: '4px 8px' }}
                                title="Clear search"
                            >
                                <span style={{ fontSize: '0.85rem', marginRight: '6px' }}>Clear</span>
                                <X size={16} />
                            </button>
                        )}
                    </form>

                    {/* Music Languages picker */}
                    <div className="mu-lang-wrapper" ref={langPickerRef}>
                        <button
                            className={`mu-lang-btn ${showLangPicker ? 'mu-lang-btn--open' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowLangPicker(o => !o);
                                setPendingLanguages(prev => prev ?? [...musicLanguages]);
                            }}
                            title="Music Languages"
                        >
                            <Globe size={18} />
                        </button>

                        {showLangPicker && (
                            <div className="mu-lang-modal-new mu-entry-animate" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 12, zIndex: 1000 }}>
                                <div className="mu-lang-header">
                                    <h3>What music do you like?</h3>
                                    <p>Pick all the languages you want to listen to.</p>
                                </div>

                                <div className="mu-lang-grid-new">
                                    {LANG_LIST.map(lang => {
                                        const isSel = (pendingLanguages || musicLanguages).includes(lang);
                                        return (
                                            <div key={lang}
                                                className={`mu-lang-item-new ${isSel ? 'mu-lang-item-new--selected' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingLanguages(prev => {
                                                        const base = prev || [...musicLanguages];
                                                        if (base.includes(lang)) {
                                                            if (base.length > 1) return base.filter(l => l !== lang);
                                                            return base;
                                                        }
                                                        return [...base, lang];
                                                    });
                                                }}>
                                                <span>{lang}</span>
                                                {isSel && <div className="mu-lang-check"><Check size={12} strokeWidth={3} /></div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button className="mu-lang-update-btn-new" onClick={(e) => {
                                    e.stopPropagation();
                                    if (pendingLanguages) setMusicLanguages(pendingLanguages);
                                    setShowLangPicker(false);
                                    setPendingLanguages(null);
                                }}>
                                    Update
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── DISCOVER VIEW ── */}
                {view === 'home' && (
                    <div className="mu-discover custom-scrollbar mu-entry-animate">
                        {/* Greeting */}
                        <div className="mu-greeting">
                            <h1 className="mu-greeting-text">
                                {(() => {
                                    const h = new Date().getHours();
                                    if (h < 5) return 'Late Night Vibes';
                                    if (h < 12) return 'Good Morning';
                                    if (h < 17) return 'Good Afternoon';
                                    if (h < 21) return 'Good Evening';
                                    return 'Night Session';
                                })()}
                            </h1>
                            <p className="mu-greeting-sub">Curated for your mood · SakuraStream</p>
                        </div>

                        <div className="mu-pills" style={{ marginBottom: 24 }}>
                            {['All', 'Music', 'Albums', 'Playlists'].map(p => (
                                <button key={p} className={`mu-pill ${activePill === p ? 'mu-pill--active' : ''}`}
                                    onClick={() => setActivePill(p)}>{p}</button>
                            ))}
                        </div>


                        {loading ? (
                            <div className="mu-home-content">
                                {/* Hero skeleton */}
                                <div className="mu-skeleton" style={{ height: 240, borderRadius: 20, marginBottom: 36 }}></div>
                                <section className="mu-section">
                                    <div className="mu-skeleton" style={{ height: 24, width: 140, marginBottom: 16 }}></div>
                                    <div className="mu-grid mu-grid--h">
                                        {[...Array(6)].map((_, i) => <div key={i} className="mu-hcard mu-skeleton" style={{ height: 64 }}></div>)}
                                    </div>
                                </section>
                                <section className="mu-section">
                                    <div className="mu-skeleton" style={{ height: 24, width: 160, marginBottom: 16 }}></div>
                                    <div className="mu-grid">
                                        {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="mu-state mu-state--error">
                                        <p>{error}</p>
                                        <button className="mu-btn-accent" onClick={() => fetchMusic(activeQuery)}>Retry</button>
                                    </div>
                                )}

                                {/* Hero Banner — Featured trending tracks */}
                                {activePill === 'All' && trendingTracks.length > 0 && (() => {
                                    const featuredTracks = trendingTracks.filter(t => hasAudio(t)).slice(0, 5);
                                    if (featuredTracks.length === 0 && trendingTracks.length > 0) {
                                        featuredTracks.push(trendingTracks[0]);
                                    }
                                    const safeIndex = heroIndex % featuredTracks.length;
                                    const hero = featuredTracks[safeIndex];
                                    const heroIdx = trendingTracks.indexOf(hero);

                                    const playHero = async (e) => {
                                        if (e) e.stopPropagation();
                                        if (hasAudio(hero)) {
                                            playFromList(trendingTracks, hero, heroIdx);
                                            return;
                                        }
                                        try {
                                            const res = await fetch(`${JIOSAAVN_BASE}/songs?id=${hero.id}`);
                                            const json = await res.json();
                                            if (json.status === 'SUCCESS' && json.data?.[0]) {
                                                const fullTrack = {
                                                    ...hero,
                                                    ...json.data[0],
                                                    name: hero.name || decodeHTML(json.data[0].name),
                                                    primaryArtists: hero.primaryArtists || formatArtists(json.data[0].primaryArtists)
                                                };
                                                const updatedList = [...trendingTracks];
                                                updatedList[heroIdx] = fullTrack;
                                                setTrendingTracks(updatedList);
                                                playFromList(updatedList, fullTrack, heroIdx);
                                            }
                                        } catch (err) {
                                            console.error('Hero fetch failed:', err);
                                        }
                                    };

                                    return (
                                        <div className="mu-hero-banner" onClick={playHero}>
                                            <div className="mu-hero-banner-bg" key={`bg-${hero.id}`}>
                                                <img src={getArt(hero, '500x500')} alt="" />
                                            </div>
                                            <div className="mu-hero-banner-content" key={`content-${hero.id}`}>
                                                <div className="mu-hero-banner-art">
                                                    <img src={getArt(hero, '500x500')} alt="" />
                                                </div>
                                                <div className="mu-hero-banner-info">
                                                    <div className="mu-hero-banner-eyebrow">Featured Track</div>
                                                    <h2 className="mu-hero-banner-title">{hero.name || hero.title}</h2>
                                                    <p className="mu-hero-banner-artist">{formatArtists(hero.primaryArtists)}</p>
                                                    <button className="mu-hero-banner-cta" onClick={playHero}>
                                                        <Play size={16} fill="currentColor" /> Play Now
                                                    </button>
                                                </div>
                                            </div>
                                            {featuredTracks.length > 1 && (
                                                <div className="mu-hero-indicators" onClick={e => e.stopPropagation()}>
                                                    {featuredTracks.map((_, i) => (
                                                        <div key={i} 
                                                             className={`mu-hero-dot ${i === safeIndex ? 'mu-hero-dot--active' : ''}`}
                                                             onClick={() => setHeroIndex(i)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="mu-home-content">
                                        {/* Recently Played */}
                                        {['All', 'Music', 'Albums', 'Playlists'].includes(activePill) && recentlyPlayed.length > 0 && (
                                            <section className="mu-section">
                                                <div className="mu-section-header">
                                                    <h2>Recently Played</h2>
                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        <button className="mu-section-link" onClick={clearRecentlyPlayed}>Clear</button>
                                                        <button className="mu-section-link" onClick={() => setView('history')}>Show all</button>
                                                    </div>
                                                </div>
                                                <div className="mu-grid mu-grid--h">
                                                    {recentlyPlayed.slice(0, 6).map((t, i) => (
                                                        <TrackHCard key={t.id} track={t}
                                                            isCurrent={currentTrack?.id === t.id} isPlaying={isPlaying}
                                                            isLiked={isLiked(t)} onPlay={() => playFromList(recentlyPlayed, t, i)} onLike={() => toggleLike(t)}
                                                            playlists={playlists} onAddToPlaylist={addToPlaylist} onCreatePlaylist={setShowCreateModal}
                                                            onOpenEntity={openEntity} />
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Trending Songs */}
                                        {['All', 'Music'].includes(activePill) && (
                                            <section className="mu-section">
                                            <div className="mu-section-header">
                                                <h2>Trending Now</h2>
                                                <button className="mu-section-link" onClick={() => setView('trending')}>Show all</button>
                                            </div>
                                            <div className="mu-grid mu-grid--h">
                                                {mixedTrending.map((t, i) => (
                                                    <TrackHCard key={t.id} track={t}
                                                        isCurrent={currentTrack?.id === t.id} isPlaying={isPlaying}
                                                        isLiked={isLiked(t)} onPlay={() => playFromList(mixedTrending.filter(x => x.type === 'song' || !x.type), t, i)} onLike={() => toggleLike(t)}
                                                        playlists={playlists} onAddToPlaylist={addToPlaylist} onCreatePlaylist={setShowCreateModal}
                                                        onRadio={loadRadio} onOpenArtist={(id) => openEntity('artists', id)}
                                                        onOpenEntity={openEntity} />
                                                ))}
                                            </div>
                                        </section>
                                        )}

                                        {/* Global Charts */}
                                        {['All', 'Playlists'].includes(activePill) && searchData?.globalCharts?.length > 0 && (
                                            <section className="mu-section">
                                                <div className="mu-section-header">
                                                    <h2>Global Charts</h2>
                                                </div>
                                                <div className="mu-grid">
                                                    {searchData.globalCharts.slice(0, 5).map(c => (
                                                        <div key={c.id} className="mu-vcard" onClick={() => openEntity('playlists', c.id)}>
                                                            <div className="mu-vcard-img">
                                                                <img src={getArt(c, '500x500')} alt="" />
                                                                <button className="mu-vcard-play"><Play size={20} fill="currentColor" /></button>
                                                            </div>
                                                            <h3 className="mu-vcard-title">{decodeHTML(c.title || c.name)}</h3>
                                                            <p className="mu-vcard-sub">{getArtistText(c)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Trending Albums */}
                                        {['All', 'Albums'].includes(activePill) && (
                                            <section className="mu-section">
                                            <div className="mu-section-header">
                                                <h2>Trending Albums</h2>
                                            </div>
                                            <div className="mu-grid">
                                                {trendingAlbums.slice(0, 5).map(a => (
                                                    <div key={a.id} className="mu-vcard" onClick={() => openEntity('albums', a.id)}>
                                                        <div className="mu-vcard-img">
                                                            <img src={getArt(a, '500x500')} alt="" />
                                                            <button className="mu-vcard-play"><Play size={20} fill="currentColor" /></button>
                                                        </div>
                                                        <h3 className="mu-vcard-title">{decodeHTML(a.title || a.name)}</h3>
                                                        <p className="mu-vcard-sub">{getArtistText(a)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                        )}

                                        {/* Featured Playlists */}
                                        {['All', 'Playlists'].includes(activePill) && searchData?.featuredPlaylists?.length > 0 && (
                                            <section className="mu-section">
                                                <div className="mu-section-header">
                                                    <h2>Featured Playlists</h2>
                                                    <button className="mu-section-link" onClick={() => openEntity('playlists', searchData.featuredPlaylists[0].id)}>Explore</button>
                                                </div>
                                                <div className="mu-grid">
                                                    {searchData.featuredPlaylists.slice(0, 5).map(pl => (
                                                        <div key={pl.id} className="mu-vcard" onClick={() => openEntity('playlists', pl.id)}>
                                                            <div className="mu-vcard-img">
                                                                <img src={getArt(pl, '500x500')} alt="" />
                                                                <button className="mu-vcard-play"><Play size={20} fill="currentColor" /></button>
                                                            </div>
                                                            <h3 className="mu-vcard-title">{decodeHTML(pl.title || pl.name)}</h3>
                                                            <p className="mu-vcard-sub">{decodeHTML(pl.subtitle || pl.description || `${pl.songCount || ''} songs`)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                </>
                        )}
                    </div>
                )}

                {/* ── SEARCH VIEW ── */}

                {view === 'search' && searchData && (
                    <div className="mu-discover custom-scrollbar mu-entry-animate" style={{ padding: '24px 32px' }}>
                        <div className="mu-search-grid-wrap">
                            {/* LEFT COLUMN: TOP RESULT */}
                            {searchData.topQuery && searchData.topQuery.results?.[0] && (
                                <section>
                                    <h2 className="mu-section-eyebrow" style={{ marginBottom: 16 }}>Top result</h2>
                                    <div className="mu-search-hero" style={{ height: 'auto', padding: 24 }} onClick={() => {
                                        const top = searchData.topQuery.results[0];
                                        if (top.type === 'song') {
                                            if (currentTrack?.id === top.id && hasAudio(currentTrack)) setIsPlaying(p => !p);
                                            else playTrack(top, searchData.songs?.results?.filter(hasAudio) || [top]);
                                        } else {
                                            openEntity(top.type === 'artist' ? 'artists' : (top.type === 'album' ? 'albums' : 'playlists'), top.id);
                                        }
                                    }}>
                                        <div className="mu-hero-art" style={{ width: 120, height: 120 }}>
                                            <img src={getArt(searchData.topQuery.results[0], '500x500')} alt="" />
                                            <button className="mu-hero-play">
                                                {isPlaying && currentTrack?.id === searchData.topQuery.results[0].id ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />}
                                            </button>
                                        </div>
                                        <div className="mu-hero-details">
                                            <h2 className="mu-hero-title" style={{ fontSize: '2rem' }}>{searchData.topQuery.results[0].title || searchData.topQuery.results[0].name}</h2>
                                            <p className="mu-hero-sub">
                                                <span className="mu-badge">{searchData.topQuery.results[0].type.toUpperCase()}</span>
                                                {searchData.topQuery.results[0].primaryArtists || searchData.topQuery.results[0].description}
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* RIGHT COLUMN: TOP SONGS */}
                            {searchData.songs?.results?.length > 0 && (() => {
                                const validSongs = searchData.songs.results.filter(hasAudio);
                                if (validSongs.length === 0) return null;
                                return (
                                    <section>
                                        <h2 className="mu-section-eyebrow" style={{ marginBottom: 16 }}>Songs</h2>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {validSongs.slice(0, 4).map((track, i) => (
                                                <MiniRow key={track.id} item={{ ...track, type: 'song' }} isCurrent={currentTrack?.id === track.id}
                                                    playlists={playlists} onAddToPlaylist={addToPlaylist} onCreatePlaylist={setShowCreateModal}
                                                    onPlay={() => playTrack(track, validSongs)} />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })()}
                        </div>

                        {/* OTHER SECTIONS BELOW */}
                        <div className="mu-home-content" style={{ marginTop: 40 }}>
                            {searchData.albums?.results?.length > 0 && (
                                <section className="mu-section">
                                    <div className="mu-section-header"><h2>Albums</h2></div>
                                    <div className="mu-grid">
                                        {searchData.albums.results.slice(0, 6).map(album => (
                                            <TrackVCard key={album.id} track={{ ...album, type: 'album' }}
                                                playlists={playlists} onAddToPlaylist={addToPlaylist} onOpen={() => openEntity('albums', album.id)} />
                                        ))}
                                    </div>
                                </section>
                            )}
                            {searchData.playlists?.results?.length > 0 && (
                                <section className="mu-section">
                                    <div className="mu-section-header"><h2>Playlists</h2></div>
                                    <div className="mu-grid">
                                        {searchData.playlists.results.slice(0, 6).map(pl => (
                                            <TrackVCard key={pl.id} track={{ ...pl, type: 'playlist' }}
                                                playlists={playlists} onAddToPlaylist={addToPlaylist} onOpen={() => openEntity('playlists', pl.id)} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                )}

                {/* ── LIKED / PLAYLIST / HISTORY / ENTITY TRACK LIST VIEW ── */}
                {view !== 'home' && view !== 'search' && (
                    <div className="mu-list-view">
                        <div className="mu-page-header mu-page-header--premium">
                            <div className="mu-page-header-art">
                                {view === 'liked' ? <div className="mu-header-art-liked"><Heart size={80} fill="white" /></div>
                                    : view === 'history' ? <div className="mu-header-art-history"><HistoryIcon size={80} color="white" /></div>
                                        : view === 'radio' ? <div className="mu-header-art-radio"><Radio size={80} color="#1ed760" /></div>
                                            : (typeof view === 'string' && view.startsWith('entity_'))
                                                ? <img src={entityData?.image?.[2]?.link || entityData?.image?.[0]?.link} alt="" />
                                                : currentPlaylist?.cover
                                                    ? <img src={currentPlaylist.cover} alt="" />
                                                    : currentPlaylist?.tracks?.length > 0
                                                        ? <img src={getArt(currentPlaylist.tracks[0], '500x500')} alt="" />
                                                        : <div className="mu-header-art-empty"><ListMusic size={64} /></div>}
                            </div>
                            <div className="mu-page-header-details">
                                <span className="mu-header-eyebrow">
                                    {view === 'liked' ? 'Playlist' : view === 'history' ? 'Playlist' : view === 'radio' ? 'Radio' : (typeof view === 'string' && view.startsWith('entity_')) ? 'Public Playlist' : 'Playlist'}
                                </span>
                                <h1 className="mu-page-title mu-page-title--massive">
                                    {view === 'liked' ? 'Liked Songs'
                                        : view === 'history' ? 'History'
                                            : view === 'trending' ? 'Trending Now'
                                                : view === 'radio' ? `${decodeHTML(currentTrack?.name)} Radio`
                                                : (typeof view === 'string' && view.startsWith('entity_')) ? decodeHTML(entityData?.name || entityData?.title)
                                                    : decodeHTML(currentPlaylist?.name)}
                                </h1>
                                <p className="mu-header-desc">
                                    {view === 'liked' ? 'Favourites'
                                        : view === 'history' ? 'Your listening history'
                                            : view === 'trending' ? 'Top trending songs and global hits'
                                                : view === 'radio' ? `Inspired by ${currentTrack?.name}`
                                                    : (typeof view === 'string' && view.startsWith('entity_')) ? (entityData?.type === 'artists' ? 'Artist Profile' : (entityData?.type === 'albums' ? 'Album' : 'Playlist'))
                                                        : 'Playlist'}
                                </p>
                                <div className="mu-header-meta mu-header-meta--spotify">
                                    <span>
                                        {view === 'liked' ? `${likedSongs.length} songs`
                                            : view === 'history' ? `${recentlyPlayed.length} songs`
                                                : view === 'trending' ? `${trendingTracks.length} songs`
                                                    : view === 'radio' ? `${entityData?.tracks?.length ?? 0} songs`
                                                    : (typeof view === 'string' && view.startsWith('entity_')) ? `${entityData?.tracks?.length ?? 0} songs`
                                                        : `${currentPlaylist?.tracks?.length ?? 0} songs`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mu-list-controls mu-list-controls--spotify">
                            <div className="mu-controls-left">
                                {displayList.length > 0 && (
                                    <button className="mu-play-circle-spotify" onClick={() => playFromList(displayList, displayList[0], 0)}>
                                        <Play size={28} fill="currentColor" />
                                    </button>
                                )}
                                {view === 'history' && recentlyPlayed.length > 0 && (
                                    <button className="mu-icon-btn--spotify" onClick={clearRecentlyPlayed} title="Clear history" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                {currentPlaylist && (
                                    <button className="mu-icon-btn--spotify" onClick={() => deletePlaylist(currentPlaylist.id)} title="Delete Playlist" style={{ background: 'rgba(255,255,255,0.05)', color: '#ff4444' }}>
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                {typeof view === 'string' && view.startsWith('entity_') && entityData?.type !== 'artists' && (() => {
                                    const matchingPlaylist = playlists.find(pl => pl.name === entityData.name);
                                    return matchingPlaylist ? (
                                        <button className="mu-icon-btn--spotify"
                                            onClick={() => deletePlaylist(matchingPlaylist.id)}
                                            title="Remove from Library"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-color)' }}>
                                            <Check size={20} />
                                        </button>
                                    ) : (
                                        <div className="mu-pl-dropdown-wrapper">
                                            <button className="mu-icon-btn--spotify"
                                                onClick={() => setShowEntityPlMenu(!showEntityPlMenu)}
                                                title="Add to Playlist"
                                                style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <Plus size={20} />
                                            </button>
                                            {showEntityPlMenu && (
                                                <div className="mu-pl-dropdown glass-panel" style={{ top: 40, left: 0 }}>
                                                    <p className="mu-pl-dropdown-title">Add to playlist</p>
                                                    {playlists.length === 0 ? (
                                                        <p className="mu-pl-empty">No custom playlists yet</p>
                                                    ) : playlists.map(pl => {
                                                        const numAlreadyIn = displayList.filter(t => pl.tracks.some(existing => existing.id === t.id)).length;
                                                        const isFullyAdded = displayList.length > 0 && numAlreadyIn === displayList.length;
                                                        return (
                                                            <button key={pl.id} className={`mu-pl-dropdown-item ${isFullyAdded ? 'mu-pl-dropdown-item--added' : ''}`}
                                                                onClick={() => { addListToPlaylist(displayList, pl.id); setShowEntityPlMenu(false); }}>
                                                                <ListMusic size={14} />{pl.name}
                                                                {isFullyAdded && <Check size={13} className="mu-pl-check" />}
                                                            </button>
                                                        );
                                                    })}
                                                    <div className="mu-pl-divider" style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                                                    <button className="mu-pl-dropdown-item" onClick={() => {
                                                        const id = 'pl_' + Date.now();
                                                        const cover = entityData.image?.[2]?.link || entityData.image?.[1]?.link || entityData.image?.[0]?.link || '';
                                                        setPlaylists(p => [...p, { id, name: entityData.name, cover, tracks: displayList }]);
                                                        setShowEntityPlMenu(false);
                                                    }}>
                                                        <Plus size={14} /> Save as New Playlist
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="mu-controls-right">
                                <button className="mu-icon-btn--spotify" title="Search inside platform" onClick={() => {
                                    const searchInput = document.querySelector('.mu-search-input');
                                    if (searchInput) {
                                        searchInput.focus();
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}><Search size={22} strokeWidth={1.5} /></button>
                            </div>
                        </div>

                        <div className="mu-track-list-wrapper">
                            {displayList.length > 0 && (
                                <div className="mu-track-list-head">
                                    <span className="mu-th-num">#</span>
                                    <span className="mu-th-img" />
                                    <span className="mu-th-title">Title</span>
                                    <span className="mu-th-album">Album</span>
                                    <span />
                                    <span className="mu-th-dur">Duration</span>
                                </div>
                            )}
                            {loading && <div className="mu-state"><div className="spinner" /><p>Fetching…</p></div>}
                            {!loading && error && <div className="mu-state mu-state--error"><p>{error}</p></div>}
                            {!loading && !error && displayList.length === 0 && (
                                <div className="mu-state">
                                    {view === 'liked'
                                        ? <><Heart size={48} className="mu-state-icon" /><p>No liked songs yet.<br />Click the ♥ on any track.</p></>
                                        : <><ListMusic size={48} className="mu-state-icon" /><p>This playlist is empty.<br />Add songs from Discover.</p></>}
                                </div>
                            )}
                            <div className="mu-track-list custom-scrollbar">
                                {!loading && !error && displayList.map((track, i) => (
                                    <TrackRow key={track.id} track={track} index={i}
                                        isCurrent={currentTrack?.id === track.id} isPlaying={isPlaying}
                                        isLiked={isLiked(track)}
                                        onPlay={() => playFromList(displayList, track, i)}
                                        onLike={() => toggleLike(track)}
                                        playlists={playlists} onAddToPlaylist={addToPlaylist} onCreatePlaylist={setShowCreateModal}
                                        onRadio={loadRadio} onOpenArtist={(id) => openEntity('artists', id)} />
                                ))}

                                {/* Artist's Discography Section */}
                                {typeof view === 'string' && view.startsWith('entity_') && entityData?.type === 'artists' && entityData?.artistAlbums?.length > 0 && (
                                    <div className="mu-discography" style={{ marginTop: 48, padding: '0 8px 48px' }}>
                                        <h2 className="mu-section-header" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24, color: '#fff' }}>Discography</h2>
                                        <div className="mu-grid">
                                            {entityData.artistAlbums.map(album => (
                                                <div key={album.id} className="mu-vcard" onClick={() => openEntity('albums', album.id)}>
                                                    <div className="mu-vcard-img">
                                                        <img src={getArt(album, '500x500')} alt="" />
                                                        <button className="mu-vcard-play"><Play size={20} fill="currentColor" /></button>
                                                    </div>
                                                    <h3 className="mu-vcard-title">{album.name}</h3>
                                                    <p className="mu-vcard-sub">{album.year || 'Album'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ═══════ BOTTOM PLAYER (always visible) ═══════ */}
            <footer className="mu-player glass-panel mu-entry-animate">
                {/* Left */}
                <div className="mu-player-left">
                    {currentTrack && (
                        <>
                            <div className="mu-player-art-wrap">
                                <img src={getArt(currentTrack, '150x150')} alt="" className="mu-player-art" />
                                {isPlaying && <div className="mu-player-eq"><span /><span /><span /></div>}
                            </div>
                            <div className="mu-player-meta">
                                <span className="mu-player-title">{currentTrack.name}</span>
                                <span className="mu-player-artist">{formatArtists(currentTrack.primaryArtists)}</span>
                            </div>
                            <button className={`mu-icon-btn mu-like-btn ${isLiked(currentTrack) ? 'mu-like-btn--active' : ''}`}
                                onClick={() => toggleLike(currentTrack)} title={isLiked(currentTrack) ? 'Unlike' : 'Like'}>
                                <Heart size={18} fill={isLiked(currentTrack) ? 'currentColor' : 'none'} />
                            </button>
                            <div className="mu-pl-dropdown-wrapper">
                                <button className="mu-icon-btn" onClick={() => setShowBottomPlMenu(!showBottomPlMenu)} title="Add to Playlist">
                                    <Plus size={18} />
                                </button>
                                {showBottomPlMenu && (
                                    <div className="mu-pl-dropdown glass-panel mu-entry-animate" style={{ bottom: '100%', top: 'auto', left: 0, marginBottom: 8, zIndex: 100 }}>
                                        <p className="mu-pl-dropdown-title">Add to playlist</p>
                                        {playlists.length === 0 ? (
                                            <p className="mu-pl-empty">No custom playlists yet</p>
                                        ) : playlists.map(pl => {
                                            const alreadyIn = pl.tracks?.some(t => t.id === currentTrack.id);
                                            return (
                                                <button key={pl.id} className={`mu-pl-dropdown-item ${alreadyIn ? 'mu-pl-dropdown-item--added' : ''}`}
                                                    onClick={() => { if (!alreadyIn) addToPlaylist(currentTrack, pl.id); setShowBottomPlMenu(false); }}>
                                                    <ListMusic size={14} />{pl.name}
                                                    {alreadyIn && <Check size={13} className="mu-pl-check" />}
                                                </button>
                                            );
                                        })}
                                        <div className="mu-pl-divider" style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                                        <button className="mu-pl-dropdown-item" onClick={() => { setShowCreateModal(true); setShowBottomPlMenu(false); }}>
                                            <Plus size={14} /> Save as New Playlist
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Center */}
                <div className="mu-player-center">
                    <div className="mu-player-controls">
                        <button className={`mu-player-btn ${isShuffle ? 'mu-player-btn--active' : ''}`}
                            onClick={() => setIsShuffle(s => !s)} title="Shuffle"><Shuffle size={16} /></button>
                        <button className="mu-player-btn" onClick={skipPrev} title="Previous">
                            <SkipBack size={18} fill="currentColor" /></button>
                        <button className="mu-play-circle" onClick={() => currentTrack && setIsPlaying(p => !p)} disabled={!currentTrack}>
                            {isBuffering ? <div className="mu-buf-spin" />
                                : isPlaying ? <Pause size={18} fill="currentColor" />
                                    : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
                        </button>
                        <button className="mu-player-btn" onClick={skipNext} title="Next">
                            <SkipForward size={18} fill="currentColor" /></button>
                        <button className={`mu-player-btn ${repeatMode !== 'none' ? 'mu-player-btn--active' : ''}`}
                            onClick={cycleRepeat} title="Repeat">
                            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                        </button>
                    </div>
                    <div className="mu-progress-wrap">
                        <span className="mu-time">{fmtTime(elapsed)}</span>
                        <div className="mu-progress" ref={progressRef} onClick={scrubProgress}>
                            <div className="mu-progress-fill" style={{ width: `${progress}%` }} />
                            <div className="mu-progress-knob" style={{ left: `${progress}%` }} />
                        </div>
                        <span className="mu-time">{fmtTime(duration)}</span>
                    </div>
                </div>

                {/* Right */}
                <div className="mu-player-right">

                    <button className={`mu-player-btn ${isRightPanelOpen ? 'mu-player-btn--active' : ''}`}
                        onClick={() => setIsRightPanelOpen(o => !o)} title="Now Playing View">
                        <PanelRight size={18} />
                    </button>
                    <div className="mu-volume-wrap">
                        <button className="mu-player-btn" onClick={() => setIsMuted(m => !m)} title="Mute (M)">
                            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <div className="mu-volume" ref={volumeRef} onClick={scrubVolume}>
                            <div className="mu-volume-fill" style={{ width: `${effectiveVol * 100}%` }} />
                            <div className="mu-volume-knob" style={{ left: `${effectiveVol * 100}%` }} />
                        </div>
                    </div>
                </div>
            </footer>

            {/* ══════════════ RIGHT PANEL ══════════════ */}
            {isRightPanelOpen && (
                <aside className="mu-panel mu-entry-animate">
                    <div className="mu-panel-header">
                        <h3>Now Playing</h3>
                        <button className="mu-icon-btn" onClick={() => setIsRightPanelOpen(false)}><X size={20} /></button>
                    </div>

                    <div className="mu-panel-tabs">
                        <button className={`mu-panel-tab ${rightPanelTab === 'playing' ? 'mu-panel-tab--active' : ''}`}
                            onClick={() => setRightPanelTab('playing')}>Track Info</button>
                        <button className={`mu-panel-tab ${rightPanelTab === 'lyrics' ? 'mu-panel-tab--active' : ''}`}
                            onClick={() => setRightPanelTab('lyrics')}>Lyrics</button>
                        <button className={`mu-panel-tab ${rightPanelTab === 'queue' ? 'mu-panel-tab--active' : ''}`}
                            onClick={() => setRightPanelTab('queue')}>Queue</button>
                    </div>

                    <div className="mu-panel-content custom-scrollbar">
                        {rightPanelTab === 'playing' && (
                            currentTrack ? (
                                <div className="mu-panel-track-info">
                                    <img src={getArt(currentTrack, '500x500')} alt="" className="mu-panel-art" />
                                    <h2 className="mu-panel-title">{currentTrack.name}</h2>
                                    <p className="mu-panel-artist">{formatArtists(currentTrack.primaryArtists)}</p>

                                    <div className="mu-panel-card">
                                        <span className="mu-panel-card-label">Song Details</span>
                                        <div className="mu-panel-card-body">
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{formatArtists(currentTrack.primaryArtists)}</p>
                                            {currentTrack.album?.name && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Album: {currentTrack.album.name}</p>}
                                            {currentTrack.label && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>Label: {currentTrack.label}</p>}
                                            {currentTrack.year && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>Year: {currentTrack.year}</p>}
                                            {currentTrack.language && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, textTransform: 'capitalize' }}>Language: {currentTrack.language}</p>}
                                        </div>
                                    </div>
                                    <div className="mu-panel-card">
                                        <span className="mu-panel-card-label">Keyboard Shortcuts</span>
                                        <div className="mu-panel-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {[['Space', 'Play / Pause'], ['→', 'Next track'], ['←', 'Prev / Restart'], ['M', 'Mute toggle']].map(([k, v]) => (
                                                <div key={k} className="mu-shortcut-row">
                                                    <kbd className="mu-kbd">{k}</kbd>
                                                    <span className="mu-shortcut-val">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mu-state"><p>No track playing</p></div>
                            )
                        )}
                        {rightPanelTab === 'lyrics' && (
                            currentTrack ? (
                                <div className="mu-lyrics-panel">
                                    {lyricsLoading ? (
                                        <div className="mu-state"><div className="spinner" /><p>Loading lyrics…</p></div>
                                    ) : lyrics ? (
                                        <div className="mu-lyrics-content" dangerouslySetInnerHTML={{ __html: lyrics.replace(/\n/g, '<br/>') }} />
                                    ) : (
                                        <div className="mu-state">
                                            <MusicIcon size={40} className="mu-state-icon" />
                                            <p>No lyrics available<br />for this track.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mu-state"><p>No track playing</p></div>
                            )
                        )}
                        {rightPanelTab === 'queue' && (
                            <div className="mu-queue-list">
                                {(queue.length > 0 ? queue : tracks).slice(0, 20).map((t, i) => (
                                    <div key={t.id + i} className={`mu-lib-item ${currentTrack?.id === t.id ? 'mu-lib-item--active' : ''}`}
                                        onClick={() => playTrack(t, queue.length > 0 ? queue : tracks)}>
                                        <div className="mu-lib-art"><img src={getArt(t, '50x50')} alt="" /></div>
                                        <div className="mu-lib-info">
                                            <span className={`mu-lib-name ${currentTrack?.id === t.id ? 'mu-lib-name--accent' : ''}`}>{t.name}</span>
                                            <span className="mu-lib-sub">{formatArtists(t.primaryArtists)}</span>
                                        </div>
                                    </div>
                                ))}
                                {(queue.length === 0 && tracks.length === 0) && (
                                    <div className="mu-state"><p>Queue is empty</p></div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            )}

            {/* Modals */}
            {showCreateModal && (
                <PlaylistModal onClose={() => setShowCreateModal(false)} onConfirm={createPlaylist} defaultName={`My Playlist #${playlists.length + 1}`} />
            )}
            {editingPlaylist && (
                <PlaylistModal
                    editName={editingPlaylist.name}
                    editImage={editingPlaylist.cover}
                    onClose={() => setEditingPlaylist(null)}
                    onConfirm={(name, image) => renamePlaylist(editingPlaylist.id, name, image)} />
            )}

        </div>
    );
};

export default Music;
