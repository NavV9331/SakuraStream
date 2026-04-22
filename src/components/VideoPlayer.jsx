import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { X, AlertCircle } from 'lucide-react';
import './VideoPlayer.css';

const VideoPlayer = ({ channel, onClose, isEmbedded = false }) => {
    const videoRef = useRef(null);
    const [error, setError] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleLogoError = () => {
        setImgError(true);
    };

    const displayLogo = channel.logo;

    useEffect(() => {
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
                    hls.currentLevel = -1; // Auto
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
    }, [channel]);

    const handleStartPlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
        }
    };

    const playerContent = (
        <div className={`video-modal-content ${isEmbedded ? 'embedded-player' : 'glass-panel'} jw-player-skin`}>
            <div className="video-header">
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
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

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
    );

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
