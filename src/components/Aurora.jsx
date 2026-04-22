import React, { useState, useEffect } from 'react';
import './Aurora.css';

const Aurora = ({ 
    colorStops = ["#c0143c", "#8b0000", "#130b0d"], 
    amplitude = 0.8, 
    blend = 1,
    style = {}
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // Generate valid CSS colors from props
    const color1 = colorStops[0] || "#c0143c";
    const color2 = colorStops[1] || "#8b0000";
    const color3 = colorStops[2] || color1;
    const animationPlayState = isVisible ? 'running' : 'paused';

    return (
        <div 
            className="aurora-wrapper" 
            style={{ 
                opacity: amplitude, 
                mixBlendMode: blend === 1 ? 'screen' : 'normal',
                ...style 
            }}
        >
            <div className="aurora-blob aurora-1" style={{ backgroundColor: color1, animationPlayState }}></div>
            <div className="aurora-blob aurora-2" style={{ backgroundColor: color2, animationPlayState }}></div>
            <div className="aurora-blob aurora-3" style={{ backgroundColor: color3, animationPlayState }}></div>
            <div className="aurora-noise"></div>
        </div>
    );
};

export default Aurora;
