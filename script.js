const API_URL = 'https://fruxty.onrender.com';
let currentToken = null;
let currentUser = null;
let currentGuilds = [];
let selectedGuildId = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentToken = localStorage.getItem('discord_token');
    if (!currentToken) { window.location.href = '/'; return; }
    await loadUser();
    await loadBotStatus();
    await loadUserGuilds();
    setupNavigation();
    loadCommands();
    setupCommandSearch();
});

async function loadUser() {
    const res = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${currentToken}` } });
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
        document.getElementById('serverCount').innerText = data.guilds || 0;
        document.getElementById('botPing').innerText = `${data.ping || 0}ms`;
        document.getElementById('commandCount').innerText = data.commands || 0;
    } catch(e) { console.error(e); }
}

async function loadUserGuilds() {
    try {
        const userGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${currentToken}` } });
        const userGuilds = await userGuildsRes.json();
        const botGuildsRes = await fetch(`${API_URL}/api/guilds`);
        const botGuilds = await botGuildsRes.json();
        const botGuildIds = botGuilds.map(g => g.id);
        currentGuilds = userGuilds.filter(g => g.owner === true && botGuildIds.includes(g.id));
        renderServerList();
    } catch(e) { document.getElementById('serverList').innerHTML = '<div class="warning-banner">Failed to load servers</div>'; }
}

function renderServerList() {
    const container = document.getElementById('serverList');
    if (currentGuilds.length === 0) { 
        container.innerHTML = '<div class="warning-banner">No servers found. Make sure you own a server and have invited Fruxty Bot.</div>'; 
        return; 
    }
    container.innerHTML = currentGuilds.map(g => `
        <div class="server-card" onclick="selectGuild('${g.id}')">
            <h3>${g.name}</h3>
            <p>🆔 ${g.id}</p>
            <p>👥 ${g.approximate_member_count || '?'} members</p>
            <p style="color:#FF6B35;margin-top:8px;">👑 You own this server</p>
        </div>
    `).join('');
}

window.selectGuild = async function(guildId) {
    selectedGuildId = guildId;
    document.getElementById('automodWarning').style.display = 'none';
    document.getElementById('automodSettings').style.display = 'block';
    document.getElementById('voiceWarning').style.display = 'none';
    document.getElementById('voiceSettings').style.display = 'block';
    document.getElementById('levelingWarning').style.display = 'none';
    document.getElementById('levelingSettings').style.display = 'block';
    await loadGuildSettings(guildId);
    showToast(`Now managing: ${currentGuilds.find(g => g.id === guildId)?.name}`, 'success');
    document.querySelector('[data-page="automod"]').click();
};

async function loadGuildSettings(guildId) {
    try {
        const res = await fetch(`${API_URL}/api/guilds/${guildId}/settings`);
        const settings = await res.json();
        document.getElementById('automodEnabled').value = settings.automod?.enabled !== false ? 'true' : 'false';
        document.getElementById('automodAction').value = settings.automod?.action || 'warn';
        document.getElementById('levelingEnabled').value = settings.leveling?.enabled !== false ? 'true' : 'false';
    } catch(e) { console.error(e); }
}

window.saveAutoMod = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            automod: { 
                enabled: document.getElementById('automodEnabled').value === 'true', 
                action: document.getElementById('automodAction').value 
            } 
        })
    });
    showToast('✅ AutoMod settings saved!', 'success');
};

window.saveLeveling = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            leveling: { enabled: document.getElementById('levelingEnabled').value === 'true' } 
        })
    });
    showToast('✅ Leveling settings saved!', 'success');
};

window.setupVoice = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    showToast('🎤 Run /setup-voice in Discord to create temp voice channels', 'info');
};

window.refreshData = async function() {
    showToast('🔄 Refreshing data...', 'info');
    await loadBotStatus();
    await loadUserGuilds();
    if (selectedGuildId) await loadGuildSettings(selectedGuildId);
    showToast('✅ Data refreshed!', 'success');
};

window.openInvite = function() {
    window.open('https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands', '_blank');
};

function loadCommands() {
    const commands = [
        '/ping', '/serverinfo', '/userinfo', '/avatar', '/botinfo', '/help',
        '/rank', '/leaderboard', '/giveaway', '/setup', '/setup-voice', '/setup-verify',
        '/automod', '/ban', '/kick', '/timeout', '/warn', '/warnings', '/purge', '/lockdown',
        '/vc rename', '/vc lock', '/vc limit', '/vc claim', '/verify'
    ];
    const container = document.getElementById('commandsList');
    container.innerHTML = commands.map(c => `<div class="command-card">${c}</div>`).join('');
}

function setupCommandSearch() {
    const searchInput = document.getElementById('commandSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.command-card');
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }
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

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00cc66' : type === 'error' ? '#ff4444' : '#FF6B35'};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-size: 14px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.logout = function() { 
    localStorage.removeItem('discord_token'); 
    window.location.href = '/'; 
};

// Add animation style
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
