import { dlhdChannels } from './dlhdChannels';
import cazeTVLogo from '../assets/CazeTV.png';

// ── URL validation helper ──
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const BASE_URL = 'https://iptv-org.github.io/api';

export const fetchChannels = async () => {
  const response = await fetch(`${BASE_URL}/channels.json`);
  if (!response.ok) throw new Error('Failed to fetch channels');
  return response.json();
};

export const fetchStreams = async () => {
  const response = await fetch(`${BASE_URL}/streams.json`);
  if (!response.ok) throw new Error('Failed to fetch streams');
  return response.json();
};

export const fetchCategories = async () => {
  const response = await fetch(`${BASE_URL}/categories.json`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
};

export const fetchCountries = async () => {
  const response = await fetch(`${BASE_URL}/countries.json`);
  if (!response.ok) throw new Error('Failed to fetch countries');
  return response.json();
};

export const fetchFeeds = async () => {
  const response = await fetch(`${BASE_URL}/feeds.json`);
  if (!response.ok) throw new Error('Failed to fetch feeds');
  return response.json();
};

export const fetchLanguages = async () => {
  const response = await fetch(`${BASE_URL}/languages.json`);
  if (!response.ok) throw new Error('Failed to fetch languages');
  return response.json();
};

// ── In-memory cache to avoid re-fetching on navigation ──
let cachedChannels = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Combine and process data
export const getProcessedChannels = async (forceRefresh = false) => {
  // Return cached data if fresh
  if (!forceRefresh && cachedChannels && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return cachedChannels;
  }

  // We want to fetch all necessary data in parallel
  const [channels, streams, categories, countries, feeds, languages] = await Promise.all([
    fetchChannels(),
    fetchStreams(),
    fetchCategories(),
    fetchCountries(),
    fetchFeeds(),
    fetchLanguages()
  ]);

  // Create a map for fast lookup of streams by channel ID
  // Note: a channel might have multiple streams, we'll group them
  const streamMap = new Map();
  for (const stream of streams) {
    // S5: Validate stream URLs before storing
    if (!isValidUrl(stream.url)) continue;
    if (!streamMap.has(stream.channel)) {
      streamMap.set(stream.channel, []);
    }
    streamMap.get(stream.channel).push(stream);
  }

  // Categories map
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Countries map
  const countryMap = new Map(countries.map(c => [c.code, c.name]));

  // Languages map
  const languageMap = new Map(languages.map(l => [l.code, l.name]));

  const channelLanguagesMap = new Map();
  for (const feed of feeds) {
    if (feed.languages) {
      if (!channelLanguagesMap.has(feed.channel)) channelLanguagesMap.set(feed.channel, new Set());
      feed.languages.forEach(l => channelLanguagesMap.get(feed.channel).add(languageMap.get(l) || l));
    }
  }

  // Process channels in chunks to avoid blocking the main UI thread
  const activeChannels = [];
  let chunkCount = 0;

  for (const channel of channels) {
    const channelStreams = streamMap.get(channel.id);
    if (channelStreams && channelStreams.length > 0) {
      const langs = channelLanguagesMap.get(channel.id);
      let finalLogo = isValidUrl(channel.logo) ? channel.logo : null;

      let categoryNames = (channel.categories || []).map(cid => categoryMap.get(cid) || cid);
      if (channel.name && (channel.name.toLowerCase().includes('cazétv') || channel.name.toLowerCase().includes('cazetv'))) {
        categoryNames = ['FIFA Channels'];
        finalLogo = cazeTVLogo;
      }

      activeChannels.push({
        ...channel,
        logo: finalLogo,
        streams: channelStreams,
        categoryNames: categoryNames,
        countryName: countryMap.get(channel.country) || channel.country,
        languageNames: langs ? Array.from(langs) : []
      });
    }

    // Yield back to the browser every 1000 items
    chunkCount++;
    if (chunkCount % 1000 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // ── Inject custom DLHD channels (e.g. Fox Sports 1/2 USA) ──
  // These use iframe-based embed players and are added separately
  const dlhdProcessed = dlhdChannels.map(ch => ({
    ...ch,
    // Already fully formed; no extra processing needed
  }));

  // Prepend DLHD channels so they appear first
  const allChannels = [...dlhdProcessed, ...activeChannels];

  // Store in cache
  cachedChannels = allChannels;
  cacheTimestamp = Date.now();

  return allChannels;
};

// Allow manual cache invalidation if needed
export const clearChannelCache = () => {
  cachedChannels = null;
  cacheTimestamp = 0;
};
