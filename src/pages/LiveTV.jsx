import React, { useState, useEffect } from 'react';
import { getProcessedChannels } from '../services/api';
import Sidebar from '../components/Sidebar';
import ChannelList from '../components/ChannelList';
import VideoPlayer from '../components/VideoPlayer';
import { AlertCircle } from 'lucide-react';
import '../index.css';
import './LiveTV.css';

function LiveTV() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeCountry, setActiveCountry] = useState(null);
  const [activeLanguage, setActiveLanguage] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getProcessedChannels();
      setChannels(data);
      console.log('Processed Channels:', data.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => setSearchTerm(term);
  const handleCategorySelect = (category) => {
    setActiveCategory(category === activeCategory ? null : category);
  };
  const handleCountrySelect = (country) => {
    setActiveCountry(country === activeCountry ? null : country);
  };
  const handleLanguageSelect = (language) => {
    setActiveLanguage(language === activeLanguage ? null : language);
  };
  const mainContentRef = React.useRef(null);

  const handleChannelSelect = (channel) => {
    setCurrentChannel(channel);
    // Scroll to top so the player is visible
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>
          SakuraStream.
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>Loading live channels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loader-container">
        <AlertCircle size={48} color="#ef4444" />
        <h2>Connection Failed</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button
          onClick={loadData}
          style={{
            marginTop: 20,
            padding: '10px 24px',
            background: 'var(--accent-gradient)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600
          }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar
        channels={channels}
        searchTerm={searchTerm}
        onSearch={handleSearch}
        activeCategory={activeCategory}
        onCategorySelect={handleCategorySelect}
        activeCountry={activeCountry}
        onCountrySelect={handleCountrySelect}
        activeLanguage={activeLanguage}
        onLanguageSelect={handleLanguageSelect}
      />

      <main className="main-content" ref={mainContentRef}>
        {currentChannel && (
          <div className="embedded-player-wrapper">
            <VideoPlayer
              key={currentChannel.id}
              channel={currentChannel}
              onClose={() => setCurrentChannel(null)}
              isEmbedded={true}
            />
          </div>
        )}
        
        <div className="channel-list-section">
          <ChannelList
            channels={channels}
            searchTerm={searchTerm}
            activeCategory={activeCategory}
            activeCountry={activeCountry}
            activeLanguage={activeLanguage}
            onChannelSelect={handleChannelSelect}
          />
        </div>
      </main>
    </div>
  );
}

export default LiveTV;
