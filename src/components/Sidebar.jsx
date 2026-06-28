import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Tv, Map, Hash, Menu, X, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({
    channels,
    searchTerm,
    onSearch,
    activeCategory,
    onCategorySelect,
    activeCountry,
    onCountrySelect,
    activeLanguage,
    onLanguageSelect
}) => {
    const [isOpen, setIsOpen] = useState(window.innerWidth > 768);
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
    const [isLanguagesExpanded, setIsLanguagesExpanded] = useState(true);
    const [isCountriesExpanded, setIsCountriesExpanded] = useState(true);
    const [localSearch, setLocalSearch] = useState(searchTerm);

    // Update localSearch if external searchTerm changes (e.g. cleared)
    useEffect(() => {
        setLocalSearch(searchTerm);
    }, [searchTerm]);

    const debouncedSearch = useCallback(
        debounce((term) => onSearch(term), 300),
        [onSearch]
    );

    const handleSearchChange = (e) => {
        setLocalSearch(e.target.value);
        debouncedSearch(e.target.value);
    };

    // Helper for debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Extract unique categories and countries with counts
    const categories = React.useMemo(() => {
        const counts = {};
        channels.forEach(ch => {
            ch.categoryNames.forEach(cat => {
                if (!cat) return;
                counts[cat] = (counts[cat] || 0) + 1;
            });
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topCategories = sorted.slice(0, 20); // top 20

        if (counts['FIFA Channels'] && !topCategories.some(c => c[0] === 'FIFA Channels')) {
            topCategories.unshift(['FIFA Channels', counts['FIFA Channels']]);
        } else if (counts['FIFA Channels']) {
            // If it's already in the top 20, move it to the front
            const index = topCategories.findIndex(c => c[0] === 'FIFA Channels');
            const item = topCategories.splice(index, 1)[0];
            topCategories.unshift(item);
        }

        return topCategories;
    }, [channels]);

    const languages = React.useMemo(() => {
        const counts = {};
        channels.forEach(ch => {
            if (!ch.languageNames) return;
            ch.languageNames.forEach(lang => {
                if (!lang) return;
                counts[lang] = (counts[lang] || 0) + 1;
            });
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topLanguages = sorted.slice(0, 20);

        if (counts['Malayalam'] && !topLanguages.some(l => l[0] === 'Malayalam')) {
            topLanguages.unshift(['Malayalam', counts['Malayalam']]);
        }

        return topLanguages;
    }, [channels]);

    const countries = React.useMemo(() => {
        const counts = {};
        channels.forEach(ch => {
            if (!ch.countryName) return;
            counts[ch.countryName] = (counts[ch.countryName] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    }, [channels]);

    return (
        <>


            {/* Mobile Toggle */}
            <button
                className="mobile-toggle glass-panel"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Content */}
            <aside className={`sidebar glass-panel ${!isOpen ? 'closed' : ''}`}>


                <div className="search-box glass-panel">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search channels..."
                        value={localSearch}
                        onChange={handleSearchChange}
                    />
                </div>

                <div className="sidebar-scrollable custom-scrollbar">

                    <div className="filter-section">
                        <button
                            className="section-title-btn"
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                        >
                            <span className="section-title">
                                <Hash size={16} /> Top Categories
                            </span>
                            {isCategoriesExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        <div className={`collapsible-wrapper ${isCategoriesExpanded ? '' : 'collapsed'}`}>
                            <div className="collapsible-content">
                                <ul className="filter-list">
                                    {categories.map(([cat, count]) => (
                                        <li key={cat}>
                                            <button
                                                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                                                onClick={() => onCategorySelect(cat)}
                                            >
                                                <span className="filter-name">{cat}</span>
                                                <span className="badge">{count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="filter-section">
                        <button
                            className="section-title-btn"
                            onClick={() => setIsLanguagesExpanded(!isLanguagesExpanded)}
                        >
                            <span className="section-title">
                                <Globe size={16} /> Top Languages
                            </span>
                            {isLanguagesExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        <div className={`collapsible-wrapper ${isLanguagesExpanded ? '' : 'collapsed'}`}>
                            <div className="collapsible-content">
                                <ul className="filter-list">
                                    {languages.map(([lang, count]) => (
                                        <li key={lang}>
                                            <button
                                                className={`filter-btn ${activeLanguage === lang ? 'active' : ''}`}
                                                onClick={() => onLanguageSelect(lang)}
                                            >
                                                <span className="filter-name">{lang}</span>
                                                <span className="badge">{count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="filter-section">
                        <button
                            className="section-title-btn"
                            onClick={() => setIsCountriesExpanded(!isCountriesExpanded)}
                        >
                            <span className="section-title">
                                <Map size={16} /> Top Countries
                            </span>
                            {isCountriesExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        <div className={`collapsible-wrapper ${isCountriesExpanded ? '' : 'collapsed'}`}>
                            <div className="collapsible-content">
                                <ul className="filter-list">
                                    {countries.map(([country, count]) => (
                                        <li key={country}>
                                            <button
                                                className={`filter-btn ${activeCountry === country ? 'active' : ''}`}
                                                onClick={() => onCountrySelect(country)}
                                            >
                                                <span className="filter-name">{country}</span>
                                                <span className="badge">{count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </aside>
        </>
    );
};

export default Sidebar;
