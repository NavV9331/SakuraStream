// ── Custom DLHD (DaddyLive) Channels ──
// These channels use iframe-based embed players from dlhd.pk
// Stream URL pattern: https://dlhd.pk/cast/stream-<id>.php

const DLHD_BASE = 'https://dlhd.pk';

// Supported player folders (fallbacks)
const PLAYER_FOLDERS = ['watch', 'cast', 'plus', 'player', 'stream', 'casting'];

/**
 * Build embed URL for a DLHD channel
 * @param {number|string} channelId - The DLHD channel ID
 * @param {number} folderIndex - Index of the player folder to use (0 = cast)
 * @returns {string} Full embed URL
 */
export const buildDlhdEmbedUrl = (channelId, folderIndex = 0) => {
  const folder = PLAYER_FOLDERS[folderIndex] || PLAYER_FOLDERS[0];
  return `${DLHD_BASE}/${folder}/stream-${channelId}.php`;
};

/**
 * Get all available embed URLs for a channel (for fallback)
 */
export const getAllEmbedUrls = (channelId) => {
  return PLAYER_FOLDERS.map(folder => `${DLHD_BASE}/${folder}/stream-${channelId}.php`);
};

import fifaLogo from '../assets/fifa-wc2026.png';

/**
 * Custom DLHD channel definitions
 * These get injected into the main channel list under "FIFA Channel" category
 */
export const dlhdChannels = [
  {
    id: 'dlhd-fox-sports-1-usa',
    name: 'Fox Sports 1 USA',
    logo: fifaLogo,
    country: 'US',
    countryName: 'United States',
    categoryNames: ['FIFA Channels'],
    languageNames: ['English'],
    source: 'dlhd',
    dlhdId: 39,
    streams: [
      {
        url: buildDlhdEmbedUrl(39),
        type: 'iframe',
      }
    ]
  },
];

export default dlhdChannels;
