const API_URL = 'https://fruxty.onrender.com';
const CLIENT_ID = '1503755260814954577';

// --- Get token from localStorage ---
const token = localStorage.getItem('fruxty_token');
if (!token) {
    // No token, send to login
    window.location.href = '/';
}

let currentUser = null;
let currentGuilds = [];
let selectedGuildId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadUser();
    await loadBotStatus();
    await loadUserGuilds();
    loadCommands();
    setupNavigation();
});

async function loadUser() {
    try {
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            // Token invalid, logout
            logout();
            return;
        }
        currentUser = await res.json();
        document.getElementById('userName').innerText = currentUser.username;
        document.getElementById('userAvatar').src = currentUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
    } catch(e) { logout(); }
}

async function loadBotStatus() {
    try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        document.getElementById('botStatus').innerHTML = `🟢 Online | ${data.guilds} servers | ${data.ping}ms`;
    } catch(e) { console.error(e); }
}

async function loadUserGuilds() {
    try {
        const userGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const userGuilds = await userGuildsRes.json();
        const botGuildsRes = await fetch(`${API_URL}/api/guilds`);
        const botGuilds = await botGuildsRes.json();
        const botGuildIds = botGuilds.map(g => g.id);
        currentGuilds = userGuilds.filter(g => g.owner === true && botGuildIds.includes(g.id));
        renderServerList();
    } catch(e) { console.error(e); }
}

function renderServerList() {
    const container = document.getElementById('serverList');
    if (currentGuilds.length === 0) {
        container.innerHTML = '<div>No servers found. <a href="https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands" target="_blank">Invite FRUXTY Bot</a></div>';
        return;
    }
    container.innerHTML = currentGuilds.map(g => `<div class="server-card" onclick="selectGuild('${g.id}')"><h3>${g.name}</h3><p>Members: ${g.approximate_member_count || '?'}</p><p style="color:#FF6B35">You own this server</p></div>`).join('');
}

window.selectGuild = async function(guildId) {
    selectedGuildId = guildId;
    document.getElementById('automodWarning').style.display = 'none';
    document.getElementById('automodSettings').style.display = 'block';
    document.getElementById('levelingWarning').style.display = 'none';
    document.getElementById('levelingSettings').style.display = 'block';
    const res = await fetch(`${API_URL}/api/guilds/${guildId}/settings`);
    const settings = await res.json();
    document.getElementById('automodEnabled').value = settings.automod?.enabled ? 'true' : 'false';
    document.getElementById('levelingEnabled').value = settings.leveling?.enabled ? 'true' : 'false';
    showToast(`Now managing server`, 'success');
};

window.saveAutoMod = async function() {
    if (!selectedGuildId) { showToast('Select a server first', 'error'); return; }
    const enabled = document.getElementById('automodEnabled').value === 'true';
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automod: { enabled, action: 'warn' } })
    });
    showToast('AutoMod saved', 'success');
};

window.saveLeveling = async function() {
    if (!selectedGuildId) { showToast('Select a server first', 'error'); return; }
    const enabled = document.getElementById('levelingEnabled').value === 'true';
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leveling: { enabled } })
    });
    showToast('Leveling saved', 'success');
};

window.setupVoice = () => showToast('Run /setup-voice in Discord', 'info');

function loadCommands() {
    const cmds = ['/ping','/serverinfo','/userinfo','/avatar','/botinfo','/help','/rank','/leaderboard','/setup','/setup-voice','/setup-verify','/automod','/ban','/kick','/timeout','/warn','/purge','/vc rename','/vc lock','/verify'];
    document.getElementById('commandsList').innerHTML = cmds.map(c => `<div class="command-card">${c}</div>`).join('');
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
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type==='success'?'#00cc66':'#FF6B35'};color:white;padding:12px;border-radius:8px;z-index:1000;`;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),3000);
}

window.logout = function() {
    localStorage.removeItem('fruxty_token');
    window.location.href = '/';
};
