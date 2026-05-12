const API_URL = 'https://fruxty.onrender.com';
const CLIENT_ID = '1503755260814954577';

// Validate token with backend
async function validateToken() {
    const token = localStorage.getItem('discord_token');
    const tokenExpiry = localStorage.getItem('token_expires');
    
    if (!token || !tokenExpiry || Date.now() > parseInt(tokenExpiry)) {
        localStorage.clear();
        window.location.href = '/';
        return false;
    }
    
    // Verify token is still valid with Discord
    try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Invalid token');
        return true;
    } catch(e) {
        localStorage.clear();
        window.location.href = '/';
        return false;
    }
}

let currentUser = null;
let currentGuilds = [];
let selectedGuildId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const isValid = await validateToken();
    if (!isValid) return;
    
    await loadUser();
    await loadBotStatus();
    await loadUserGuilds();
    setupNavigation();
    loadCommands();
});

async function loadUser() {
    const token = localStorage.getItem('discord_token');
    const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { logout(); return; }
    currentUser = await res.json();
    document.getElementById('userName').innerText = currentUser.username;
    document.getElementById('userDiscrim').innerText = `#${currentUser.discriminator}`;
    document.getElementById('userAvatar').src = currentUser.avatar ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
}

async function loadBotStatus() {
    try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        document.getElementById('totalServers').innerText = data.guilds || 0;
        document.getElementById('serverCountBadge').innerText = data.guilds || 0;
        document.getElementById('botPing').innerText = `${data.ping || 0}ms`;
        document.getElementById('totalUsers').innerText = data.users || 0;
    } catch(e) { console.error(e); }
}

async function loadUserGuilds() {
    const token = localStorage.getItem('discord_token');
    const userGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const userGuilds = await userGuildsRes.json();
    const botGuildsRes = await fetch(`${API_URL}/api/guilds`);
    const botGuilds = await botGuildsRes.json();
    const botGuildIds = botGuilds.map(g => g.id);
    currentGuilds = userGuilds.filter(g => g.owner === true && botGuildIds.includes(g.id));
    renderServerList();
}

function renderServerList() {
    const container = document.getElementById('serverList');
    if (currentGuilds.length === 0) {
        container.innerHTML = `<div class="warning-banner">No servers found. <a href="https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands" target="_blank">Invite FRUXTY Bot</a></div>`;
        return;
    }
    container.innerHTML = currentGuilds.map(g => `<div class="server-card" onclick="selectGuild('${g.id}')"><h3>${g.name}</h3><p>👥 ${g.approximate_member_count || '?'} members</p><p style="color:#FF6B35">👑 Owner</p></div>`).join('');
}

window.selectGuild = function(guildId) {
    selectedGuildId = guildId;
    document.getElementById('automodWarning').style.display = 'none';
    document.getElementById('automodSettings').style.display = 'block';
    document.getElementById('levelingWarning').style.display = 'none';
    document.getElementById('levelingSettings').style.display = 'block';
    loadGuildSettings(guildId);
    showToast(`Managing server`, 'success');
};

async function loadGuildSettings(guildId) {
    const res = await fetch(`${API_URL}/api/guilds/${guildId}/settings`);
    const settings = await res.json();
    if (document.getElementById('automodEnabled')) document.getElementById('automodEnabled').checked = settings.automod?.enabled || false;
    if (document.getElementById('levelingEnabled')) document.getElementById('levelingEnabled').checked = settings.leveling?.enabled || false;
}

window.saveAutoMod = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    const enabled = document.getElementById('automodEnabled').checked;
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automod: { enabled, action: 'warn' } })
    });
    showToast('✅ AutoMod saved!', 'success');
};

window.saveLeveling = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    const enabled = document.getElementById('levelingEnabled').checked;
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leveling: { enabled } })
    });
    showToast('✅ Leveling saved!', 'success');
};

window.setupVoice = () => showToast('Run /setup-voice in Discord', 'info');
window.refreshData = async () => { await loadBotStatus(); await loadUserGuilds(); showToast('Refreshed!', 'success'); };

function loadCommands() {
    const cmds = ['/ping', '/serverinfo', '/userinfo', '/avatar', '/botinfo', '/help', '/rank', '/leaderboard', '/setup', '/setup-voice', '/setup-verify', '/automod', '/ban', '/kick', '/timeout', '/warn', '/purge', '/vc rename', '/vc lock', '/verify'];
    document.getElementById('commandsList').innerHTML = cmds.map(c => `<div class="command-card">${c}</div>`).join('');
    document.getElementById('commandSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.command-card').forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(term) ? 'block' : 'none';
        });
    });
}

function setupNavigation() {
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
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.innerText = msg;
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type === 'success' ? '#00cc66' : '#FF6B35'};color:white;padding:12px 20px;border-radius:10px;z-index:1000;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.logout = () => { localStorage.clear(); window.location.href = '/'; };
