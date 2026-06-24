import React from 'react';
import { Play } from 'lucide-react';
import './ChannelCard.css';

const ChannelCard = ({ channel, onSelect }) => {
    const [imgError, setImgError] = React.useState(false);

    React.useEffect(() => {
        setImgError(false);
    }, [channel.logo]);

    const handleError = () => {
        // S6: Removed Google Favicon API fallback to prevent privacy leakage
        setImgError(true);
    };

    const handleClick = React.useCallback(() => {
        if (onSelect) onSelect(channel);
    }, [onSelect, channel]);

    return (
        <div className="channel-card glass-panel" onClick={handleClick}>
            <div className="card-image-wrapper">
                {(!channel.logo || imgError) && (
                    <div className="image-fallback">
                        <span>{channel.name.charAt(0)}</span>
                    </div>
                )}
                {channel.logo && !imgError && (
                    <img
                        src={channel.logo}
                        alt={channel.name}
                        className="channel-logo"
                        width={128}
                        height={128}
                        loading="lazy"
                        onError={handleError}
                    />
                )}
                <div className="play-overlay">
                    <div className="play-button">
                        <Play size={24} fill="currentColor" />
                    </div>
                </div>
            </div>
            <div className="card-content">
                <h3 className="channel-name">{channel.name}</h3>
                <div className="channel-meta">
                    {channel.countryName && (
                        <span className="meta-tag">{channel.countryName}</span>
                    )}
                    {channel.categoryNames && channel.categoryNames[0] && (
                        <span className="meta-tag active">{channel.categoryNames[0]}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ChannelCard);
