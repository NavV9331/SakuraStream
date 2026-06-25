import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { X, AlertCircle, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { buildDlhdEmbedUrl, getAllEmbedUrls } from '../services/dlhdChannels';
import './VideoPlayer.css';

const VideoPlayer = ({ channel, onClose, isEmbedded = false }) => {
    const videoRef = useRef(null);
    const fullscreenRef = useRef(null);
    const playerWrapperRef = useRef(null);
    const [error, setError] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentFolderIndex, setCurrentFolderIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileControls, setShowMobileControls] = useState(true);

    // Detect mobile device reactively
    useEffect(() => {
        const checkMobile = () => {
            const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.innerWidth <= 1024;
            setIsMobile(isSmallScreen || hasTouchScreen);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ── Auto-hide controls in fullscreen after 3s of inactivity ──
    useEffect(() => {
        if (!isFullscreen) {
            setShowMobileControls(true);
            return;
        }
        
        let hideTimeout;
        const resetTimer = () => {
            setShowMobileControls(true);
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => setShowMobileControls(false), 3000);
        };

        resetTimer();

        const wrapper = fullscreenRef.current;
        if (wrapper) {
            wrapper.addEventListener('touchstart', resetTimer, { passive: true });
            wrapper.addEventListener('click', resetTimer, { passive: true });
            wrapper.addEventListener('mousemove', resetTimer, { passive: true });
        }

        return () => {
            clearTimeout(hideTimeout);
            if (wrapper) {
                wrapper.removeEventListener('touchstart', resetTimer);
                wrapper.removeEventListener('click', resetTimer);
                wrapper.removeEventListener('mousemove', resetTimer);
            }
        };
    }, [isFullscreen]);

    // ── Swipe down to minimize player on mobile ──
    useEffect(() => {
        if (!isMobile || !isEmbedded || isFullscreen) return;

        const el = playerWrapperRef.current;
        if (!el) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const onTouchStart = (e) => {
            // Only trigger on the header area
            const header = el.querySelector('.video-header');
            if (!header || !header.contains(e.target)) return;
            startY = e.touches[0].clientY;
            isDragging = true;
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                el.style.transform = `translateY(${Math.min(diff * 0.4, 80)}px)`;
                el.style.opacity = Math.max(1 - diff / 300, 0.4);
            }
        };

        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const diff = currentY - startY;
            if (diff > 80) {
                // Swipe far enough — close player
                el.style.transform = 'translateY(100%)';
                el.style.opacity = '0';
                setTimeout(() => onClose(), 200);
            } else {
                el.style.transform = '';
                el.style.opacity = '';
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [isMobile, isEmbedded, isFullscreen, onClose]);

    // ── Fullscreen Landscape Toggle ──
    const enterFullscreen = useCallback(async () => {
        const el = fullscreenRef.current;
        if (!el) return;

        try {
            // Step 1: Enter browser fullscreen
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                await el.webkitRequestFullscreen();
            } else if (el.msRequestFullscreen) {
                await el.msRequestFullscreen();
            }

            // Step 2: Lock orientation to landscape (only works AFTER fullscreen)
            try {
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                }
            } catch (e) {
                // Orientation lock may fail on some browsers — that's okay
            }

            setIsFullscreen(true);
            setShowMobileControls(true);
        } catch (e) {
            // Fullscreen API denied — use CSS-only fallback
            setIsFullscreen(true);
            setShowMobileControls(true);
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        try {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        } catch (e) { /* ignore */ }

        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (e) { /* ignore */ }

        setIsFullscreen(false);
        setShowMobileControls(true);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (isFullscreen) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }, [isFullscreen, enterFullscreen, exitFullscreen]);

    // Sync state when user exits fullscreen via hardware back / escape
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                setIsFullscreen(false);
                setShowMobileControls(true);
                try {
                    if (screen.orientation && screen.orientation.unlock) {
                        screen.orientation.unlock();
                    }
                } catch (e) { /* ignore */ }
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Lock body scroll when in fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isFullscreen]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            try {
                if (document.fullscreenElement) document.exitFullscreen();
                if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
            } catch (e) { /* ignore */ }
        };
    }, []);

    const isIframeSource = channel.source === 'dlhd' || channel.source === 'youtube';

    const handleLogoError = () => setImgError(true);

    const displayLogo = channel.logo;

    // ── Standard HLS player setup (non-DLHD channels) ──
    useEffect(() => {
        if (isIframeSource) return;

        const streamUrl = channel.streams && channel.streams.length > 0
            ? channel.streams[0].url
            : null;

        if (!streamUrl) {
            setError(true);
            return;
        }

        const video = videoRef.current;
        let hls;
        let player;

        const updateQuality = (newQuality) => {
            if (hls) {
                if (newQuality === 0) {
                    hls.currentLevel = -1;
                } else {
                    hls.levels.forEach((level, levelIndex) => {
                        if (level.height === newQuality) {
                            hls.currentLevel = levelIndex;
                        }
                    });
                }
            }
        };

        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const availableQualities = hls.levels.map((l) => l.height);
                availableQualities.unshift(0);

                player = new Plyr(video, {
                    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                    settings: ['quality', 'speed'],
                    quality: {
                        default: 0,
                        options: availableQualities,
                        forced: true,
                        onChange: (e) => updateQuality(e),
                    },
                    i18n: {
                        qualityLabel: { 0: 'Auto' },
                    },
                });

                player.on('play', () => setIsPlaying(true));
                player.on('pause', () => setIsPlaying(false));
                
                video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            setError(true);
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            player = new Plyr(video);
            player.on('play', () => setIsPlaying(true));
            player.on('pause', () => setIsPlaying(false));
            video.addEventListener('loadedmetadata', () => {
                video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            });
            video.addEventListener('error', () => setError(true));
        } else {
            setError(true);
        }

        return () => {
            if (player) player.destroy();
            if (hls) hls.destroy();
        };
    }, [channel, isIframeSource]);

    const handleStartPlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
        }
    };

    // ── Try next DLHD embed folder if current one fails ──
    const handleTryNextSource = () => {
        const folders = getAllEmbedUrls(channel.dlhdId);
        if (currentFolderIndex < folders.length - 1) {
            setCurrentFolderIndex(prev => prev + 1);
        }
    };

    // ── Get current embed URL (DLHD or YouTube) ──
    const getEmbedUrl = () => {
        if (channel.source === 'dlhd') {
            return buildDlhdEmbedUrl(channel.dlhdId, currentFolderIndex);
        }
        if (channel.source === 'youtube') {
            return channel.streams[0].url;
        }
        return null;
    };
    const embedUrl = isIframeSource ? getEmbedUrl() : null;

    // ── Shared header component ──
    const controlsVisibleClass = isFullscreen && !showMobileControls ? 'controls-hidden' : 'controls-visible';

    const renderHeader = () => (
        <div className={`video-header ${isFullscreen ? 'fullscreen-header ' + controlsVisibleClass : ''}`}>
            <div className="video-title">
                {displayLogo && !imgError && (
                    <img 
                        src={displayLogo} 
                        alt={channel.name} 
                        className="video-header-logo" 
                        onError={handleLogoError} 
                    />
                )}
                <h3>{channel.name}</h3>
                {channel.categoryNames && channel.categoryNames[0] && (
                    <span className="badge">{channel.categoryNames[0]}</span>
                )}
            </div>
            <div className="video-header-actions">
                {isMobile && (
                    <button 
                        className={`mobile-fullscreen-btn ${isFullscreen ? 'active' : ''}`} 
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen landscape'}
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                )}
                <button className="close-btn" onClick={() => {
                    if (isFullscreen) {
                        exitFullscreen();
                    }
                    onClose();
                }}>
                    <X size={isFullscreen ? 20 : 24} />
                </button>
            </div>
        </div>
    );

    // ── Mobile swipe-down indicator ──
    const swipeIndicator = isMobile && isEmbedded && !isFullscreen ? (
        <div className="mobile-swipe-indicator">
            <ChevronDown size={16} />
            <span>Swipe down to close</span>
        </div>
    ) : null;

    // ── Iframe-based Player (DLHD / YouTube) ──
    const iframePlayerContent = isIframeSource ? (
        <div 
            ref={(el) => {
                fullscreenRef.current = el;
                playerWrapperRef.current = el;
            }}
            className={`video-modal-content ${isEmbedded ? 'embedded-player' : 'glass-panel'} jw-player-skin ${isFullscreen ? 'video-fullscreen-landscape' : ''} ${isMobile ? 'mobile-optimized' : ''}`}
        >
            {renderHeader()}
            {swipeIndicator}

            <div className="video-container dlhd-iframe-container">
                {/* Transparent overlay to capture touch events over the iframe in fullscreen */}
                {isFullscreen && (
                    <div 
                        className="fullscreen-touch-overlay"
                        onClick={() => setShowMobileControls(prev => !prev)}
                    />
                )}
                <iframe
                    src={embedUrl}
                    className="dlhd-iframe"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="no-referrer"
                    title={channel.name}
                    {...(channel.source === 'dlhd' ? { sandbox: "allow-scripts allow-same-origin allow-forms allow-presentation" } : {})}
                />
                {channel.source === 'dlhd' && !isFullscreen && (
                    <div className="dlhd-source-switcher">
                        <span className="source-label">Source {currentFolderIndex + 1}/6</span>
                        <button 
                            className="try-next-btn"
                            onClick={handleTryNextSource}
                            disabled={currentFolderIndex >= 5}
                        >
                            Try Next Source →
                        </button>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    // ── Standard HLS Player ──
    const standardPlayerContent = !isIframeSource ? (
        <div 
            ref={(el) => {
                fullscreenRef.current = el;
                playerWrapperRef.current = el;
            }}
            className={`video-modal-content ${isEmbedded ? 'embedded-player' : 'glass-panel'} jw-player-skin ${isFullscreen ? 'video-fullscreen-landscape' : ''} ${isMobile ? 'mobile-optimized' : ''}`}
        >
            {renderHeader()}
            {swipeIndicator}

            <div className="video-container">
                {error ? (
                    <div className="video-error">
                        <AlertCircle size={48} color="#ef4444" />
                        <h3>Stream Unavailable</h3>
                        <p>The stream for this channel is currently offline or unreachable.</p>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            className="player"
                            playsInline
                        />
                        
                        {!isPlaying && (
                            <div className="jw-start-screen" onClick={handleStartPlay}>
                                <div className="jw-play-button-wrapper">
                                    <div className="jw-play-button">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                    <div className="jw-play-glow"></div>
                                </div>
                                <div className="jw-start-overlay"></div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    ) : null;

    const playerContent = isIframeSource ? iframePlayerContent : standardPlayerContent;

    if (isEmbedded) {
        return playerContent;
    }

    return (
        <div className="video-modal-overlay">
            {playerContent}
        </div>
    );
};

export default VideoPlayer;
