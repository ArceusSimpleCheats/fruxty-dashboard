const RENDER_URL = 'https://fruxty.onrender.com';

// Get token from URL (after OAuth redirect) or from localStorage
let token = new URLSearchParams(window.location.search).get('token');
if (token) {
    localStorage.setItem('fruxty_token', token);
    // Remove token from URL to keep it clean
    window.history.replaceState({}, document.title, '/dashboard');
} else {
    token = localStorage.getItem('fruxty_token');
}

if (!token) {
    window.location.href = '/';
}

let currentUser = null;
let currentGuilds = [];
let selectedGuildId = null;

async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${RENDER_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    if (res.status === 401) {
        localStorage.removeItem('fruxty_token');
        window.location.href = '/';
        throw new Error('Unauthorized');
    }
    return res.json();
}

async function loadUser() {
    const user = await apiCall('/api/verify');
    currentUser = user;
    document.getElementById('userName').innerText = user.username;
    document.getElementById('userAvatar').src = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
}

async function loadBotStatus() {
    const data = await apiCall('/api/status');
    document.getElementById('stats').innerHTML = `
        <div>Servers: ${data.guilds}</div>
        <div>Ping: ${data.ping}ms</div>
        <div>Users: ${data.users}</div>
    `;
}

async function loadUserGuilds() {
    const userGuilds = await fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    const botGuilds = await apiCall('/api/guilds');
    const botGuildIds = botGuilds.map(g => g.id);
    currentGuilds = userGuilds.filter(g => g.owner === true && botGuildIds.includes(g.id));
    renderServerList();
}

function renderServerList() {
    const container = document.getElementById('serverList');
    if (currentGuilds.length === 0) {
        container.innerHTML = '<div class="warning">No servers found. Invite FRUXTY Bot first.</div>';
        return;
    }
    container.innerHTML = currentGuilds.map(g => `
        <div class="server-card" data-id="${g.id}">
            <h3>${g.name}</h3>
            <p>Members: ${g.approximate_member_count || '?'}</p>
            <p class="owner-badge">👑 You own this server</p>
        </div>
    `).join('');
    document.querySelectorAll('.server-card').forEach(card => {
        card.addEventListener('click', () => selectGuild(card.dataset.id));
    });
}

async function selectGuild(guildId) {
    selectedGuildId = guildId;
    document.getElementById('automodWarning').style.display = 'none';
    document.getElementById('automodSettings').style.display = 'block';
    document.getElementById('levelingWarning').style.display = 'none';
    document.getElementById('levelingSettings').style.display = 'block';
    const settings = await apiCall(`/api/guilds/${guildId}/settings`);
    document.getElementById('automodEnabled').value = settings.automod?.enabled ? 'true' : 'false';
    document.getElementById('levelingEnabled').value = settings.leveling?.enabled ? 'true' : 'false';
    alert(`Now managing ${currentGuilds.find(g => g.id === guildId).name}`);
}

document.getElementById('saveAutoMod')?.addEventListener('click', async () => {
    if (!selectedGuildId) return alert('Select a server first');
    await apiCall(`/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        body: JSON.stringify({ automod: { enabled: document.getElementById('automodEnabled').value === 'true', action: 'warn' } })
    });
    alert('AutoMod saved');
});

document.getElementById('saveLeveling')?.addEventListener('click', async () => {
    if (!selectedGuildId) return alert('Select a server first');
    await apiCall(`/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        body: JSON.stringify({ leveling: { enabled: document.getElementById('levelingEnabled').value === 'true' } })
    });
    alert('Leveling saved');
});

document.getElementById('setupVoiceBtn')?.addEventListener('click', () => {
    alert('Run /setup-voice in Discord');
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('fruxty_token');
    window.location.href = '/';
});

function loadCommands() {
    const cmds = ['/ping','/serverinfo','/userinfo','/avatar','/botinfo','/help','/rank','/leaderboard','/setup','/setup-voice','/setup-verify','/automod','/ban','/kick','/timeout','/warn','/purge','/vc rename','/vc lock','/verify'];
    document.getElementById('commandsList').innerHTML = cmds.map(c => `<div class="command-card">${c}</div>`).join('');
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(page).classList.add('active');
    });
});

// Initialize
(async () => {
    await loadUser();
    await loadBotStatus();
    await loadUserGuilds();
    loadCommands();
})();
