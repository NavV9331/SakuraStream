import React from 'react';

const Vod = () => {
    return (
        <div style={{ width: '100%', height: 'calc(100vh - 64px)', marginTop: '64px', overflow: 'hidden' }}>
            <iframe 
                src="vod/index.html" 
                title="Movies & TV"
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#0a0a0f' }}
            />
        </div>
    );
};

export default Vod;
