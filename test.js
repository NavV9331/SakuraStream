const fetch = require('node-fetch');

async function check() {
    const c = await (await fetch('https://iptv-org.github.io/api/channels.json')).json();
    const s = await (await fetch('https://iptv-org.github.io/api/streams.json')).json();

    const mal = c.filter(ch => ch.languages && ch.languages.includes('mal'));
    console.log('Total Malayalam channels:', mal.length);

    const streamMap = new Set(s.map(stream => stream.channel));
    const playable = mal.filter(ch => streamMap.has(ch.id));
    console.log('Playable Malayalam channels:', playable.length);
}
check();
