import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Globe, Activity, LayoutGrid, Tv, Music, Palette, Headphones } from 'lucide-react';
import Aurora from '../components/Aurora';
import './Home.css';


const Home = () => {
    const navigate = useNavigate();


    return (
        <div className="home-container">
            {/* React Bits Aurora Animation Integration */}
            <Aurora
                colorStops={["rgba(192, 20, 60, 0.4)", "rgba(139, 0, 0, 0.3)", "rgba(192, 20, 60, 0.2)"]}
                amplitude={0.6}
                blend={0}
            />

            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        The Ultimate <br />
                        <span className="text-gradient">Entertainment Hub</span>
                    </h1>
                    <p className="hero-subtitle">
                        Experience a beautifully crafted, glassmorphic platform merging over 6,000+ free live global TV channels and a premium, ad-free music studio in one place.
                    </p>
                    <div className="hero-actions">
                        <button className="btn-hero-primary" onClick={() => navigate('/live')}>
                            <Play size={22} fill="currentColor" />
                            Watch Live TV
                        </button>
                        <button className="btn-hero-secondary" onClick={() => window.location.href = '/vod/index.html'}>
                            <Tv size={22} />
                            Movies & Shows
                        </button>
                        <button className="btn-hero-secondary" onClick={() => navigate('/music')}>
                            <Headphones size={22} />
                            Listen to Music
                        </button>
                    </div>
                </div>
            </section>

            {/* Bento Box Features Section */}
            <section className="features-section">
                <div className="features-bento">

                    {/* Card 1: Wide - Live TV Aggregator */}
                    <div className="feature-card glass-panel bento-wide">
                        <div className="feature-icon-wrapper">
                            <Tv size={32} />
                        </div>
                        <div className="bento-text">
                            <h3>Live World TV</h3>
                            <p>Dive into over 6,000+ aggregated free TV channels streaming directly from nations across the globe. No subscriptions required.</p>
                        </div>
                    </div>

                    {/* Card 1.5: Wide - Movies & TV */}
                    <div className="feature-card glass-panel bento-wide" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/vod/index.html'}>
                        <div className="feature-icon-wrapper">
                            <Play size={32} />
                        </div>
                        <div className="bento-text">
                            <h3>On-Demand Movies & Series</h3>
                            <p>Stream the latest blockbuster movies and binge-worthy TV series on demand in HD quality, with a fully responsive custom player.</p>
                        </div>
                    </div>

                    {/* Card 2: Tall - Premium Music Network */}
                    <div className="feature-card glass-panel bento-tall bento-accent" style={{ position: 'relative', overflow: 'hidden' }}>
                        {/* Ambient Equalizer Bars moved INSIDE the music box! */}
                        <div className="ambient-eq-container">
                            <div className="eq-bar eq-bar-1"></div>
                            <div className="eq-bar eq-bar-2"></div>
                            <div className="eq-bar eq-bar-3"></div>
                            <div className="eq-bar eq-bar-4"></div>
                        </div>

                        <div className="feature-icon-wrapper" style={{ position: 'relative', zIndex: 2 }}>
                            <Music size={32} />
                        </div>
                        <div className="bento-text" style={{ position: 'relative', zIndex: 2 }}>
                            <h3>Premium Music Hub</h3>
                            <p>Powered by SakuraStream. routing, stream thousands of ad-free tracks, dynamic regional playlists, and explore lyrics dynamically.</p>
                        </div>
                    </div>

                    {/* Card 3: Square - Filter Engine */}
                    <div className="feature-card glass-panel bento-square">
                        <div className="feature-icon-wrapper">
                            <Globe size={28} />
                        </div>
                        <h3>Smart Sorting</h3>
                        <p>Locate global media instantly via hyper-fast region and language filtering.</p>
                    </div>

                    {/* Card 4: Square - HLS Magic */}
                    <div className="feature-card glass-panel bento-square">
                        <div className="feature-icon-wrapper">
                            <Activity size={28} />
                        </div>
                        <h3>HLS Streaming</h3>
                        <p>Buttery smooth m3u8 playback matching your network stability.</p>
                    </div>

                    {/* Card 5: Full Width Bottom - Glass Aesthetic */}
                    <div className="feature-card glass-panel bento-full">
                        <div className="feature-icon-wrapper">
                            <Palette size={32} />
                        </div>
                        <div className="bento-text">
                            <h3>Bespoke Glassmorphism</h3>
                            <p>Get immersed in a uniquely crafted signature maroon-black transparent aesthetic natively optimized for all desktop browsers.</p>
                        </div>
                    </div>

                </div>
            </section>

            {/* Footer Section */}
            <footer className="home-footer">
                <div className="footer-content">
                    <p className="copyright-text">
                        &copy; {new Date().getFullYear()} SakuraStream. All rights reserved.
                    </p>
                    <button className="btn-terms" onClick={() => navigate('/terms')}>
                        Terms and Policy
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default Home;
