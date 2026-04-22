import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Terms.css';

const Terms = () => {
    const navigate = useNavigate();

    return (
        <div className="terms-container">
            <div className="terms-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                    Back
                </button>
                <h1 className="terms-title">Terms & Privacy Policy</h1>
            </div>

            <div className="terms-content glass-panel">
                <section className="terms-section">
                    <h2>1. Introduction</h2>
                    <p>Welcome to SakuraStream. By accessing and using our platform, you agree to these Terms and Conditions and our Privacy Policy. Our service aggregates free, publicly available IPTV streams and music APIs for entertainment purposes.</p>
                </section>

                <section className="terms-section">
                    <h2>2. Intellectual Property</h2>
                    <p>SakuraStream does not host any media content on its servers. All streams and audio tracks are provided by third-party APIs (such as iptv-org and JioSaavn). All copyrights, trademarks, and intellectual properties belong to their respective owners.</p>
                </section>

                <section className="terms-section">
                    <h2>3. User Data & Privacy</h2>
                    <p>We respect your privacy. SakuraStream is designed to work client-side and does not actively collect, store, or sell personal user data. Any preferences (like liked songs or playlists) are stored locally on your device via your browser's local storage.</p>
                </section>

                <section className="terms-section">
                    <h2>4. Acceptable Use</h2>
                    <p>You agree not to misuse the platform. This includes attempting to reverse-engineer our application, bypassing rate limits on our third-party APIs, or using the service for any illegal activities.</p>
                </section>

                <section className="terms-section">
                    <h2>5. Disclaimer of Warranties</h2>
                    <p>SakuraStream is provided "as is" without any warranties. We do not guarantee the uptime, quality, or continuous availability of any specific TV channel or music track, as these rely entirely on external providers.</p>
                </section>

                <section className="terms-section">
                    <h2>6. Changes to Terms</h2>
                    <p>We reserve the right to modify these terms at any time. Continued use of SakuraStream after any such changes constitutes your consent to such changes.</p>
                </section>

                <div className="terms-footer-text">
                    <p>Last Updated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

export default Terms;
