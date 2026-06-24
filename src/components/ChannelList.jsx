import React, { useState, useMemo } from 'react';
import ChannelCard from './ChannelCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ChannelList.css';

const ITEMS_PER_PAGE = 24;

const ChannelList = ({ channels, searchTerm, activeCategory, activeCountry, activeLanguage, onChannelSelect }) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Filter channels based on search, category, and country
    const filteredChannels = useMemo(() => {
        let filtered = channels;
        if (activeCategory) {
            filtered = filtered.filter(ch => ch.categoryNames.includes(activeCategory));
        }
        if (activeCountry) {
            filtered = filtered.filter(ch => ch.countryName === activeCountry);
        }
        if (activeLanguage) {
            filtered = filtered.filter(ch => ch.languageNames && ch.languageNames.includes(activeLanguage));
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(ch =>
                ch.name.toLowerCase().includes(term) ||
                (ch.categoryNames && ch.categoryNames.some(c => c && c.toLowerCase().includes(term)))
            );
        }
        return filtered;
    }, [channels, searchTerm, activeCategory, activeCountry, activeLanguage]);

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeCategory, activeCountry, activeLanguage]);

    const totalPages = Math.ceil(filteredChannels.length / ITEMS_PER_PAGE);
    const currentItems = filteredChannels.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="channel-list-container">
            <div className="list-header">
                <h2>
                    {activeLanguage ? `${activeLanguage} Channels` :
                        activeCategory ? (activeCategory.toLowerCase().includes('channel') ? activeCategory : `${activeCategory} Channels`) :
                            activeCountry ? `Channels in ${activeCountry}` :
                                'Explore Channels'}
                </h2>
                <span className="channel-count">{filteredChannels.length} results</span>
            </div>

            <div className="channel-grid">
                {currentItems.map(channel => (
                    <ChannelCard
                        key={channel.id}
                        channel={channel}
                        onSelect={onChannelSelect}
                    />
                ))}
                {currentItems.length === 0 && (
                    <div className="no-results">
                        <p>No channels found matching your criteria.</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination glass-panel">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChannelList;
