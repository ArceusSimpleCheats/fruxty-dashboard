// ============ FRUXTY DASHBOARD - COMPLETE ============
const API_URL = 'https://fruxty.onrender.com';
const CLIENT_ID = '1503755260814954577';

// Check authentication
const token = localStorage.getItem('discord_token');
const tokenExpiry = localStorage.getItem('discord_token_expiry');
const isTokenValid = token && tokenExpiry && Date.now() < parseInt(tokenExpiry);

if (!isTokenValid) {
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_token_expiry');
    localStorage.removeItem('discord_client_id');
    window.location.href = '/';
}

let currentUser = null;
let currentGuilds = [];
let selectedGuildId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadUser();
    await loadBotStatus();
    await loadUserGuilds();
    setupNavigation();
    loadCommands();
    loadAnalytics();
    addActivity('Dashboard loaded', 'success');
});

async function loadUser() {
    try {
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Invalid token');
        currentUser = await res.json();
        
        document.getElementById('userName').innerText = currentUser.username;
        document.getElementById('userDiscrim').innerText = `#${currentUser.discriminator}`;
        document.getElementById('userAvatar').src = currentUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
    } catch(e) { logout(); }
}

async function loadBotStatus() {
    try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        document.getElementById('totalServers').innerText = data.guilds || 0;
        document.getElementById('serverCountBadge').innerText = data.guilds || 0;
        document.getElementById('botPing').innerText = `${data.ping || 0}ms`;
        document.getElementById('totalUsers').innerText = data.users || 0;
        document.getElementById('botUptime').innerText = data.uptime ? `${Math.floor(data.uptime / 1000 / 60)}m` : '0m';
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
    } catch(e) { 
        document.getElementById('serverList').innerHTML = '<div class="warning-banner">Failed to load servers</div>';
    }
}

function renderServerList() {
    const container = document.getElementById('serverList');
    if (currentGuilds.length === 0) { 
        container.innerHTML = `
            <div class="warning-banner">
                No servers found. You must own a server and have FRUXTY Bot invited.
                <a href="https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands" target="_blank" style="color:#FF6B35;display:block;margin-top:10px;">
                    ➕ Click here to invite FRUXTY Bot
                </a>
            </div>
        `; 
        return; 
    }
    container.innerHTML = currentGuilds.map(g => `
        <div class="server-card" onclick="selectGuild('${g.id}', '${g.name.replace(/'/g, "\\'")}')">
            <h3>${g.name}</h3>
            <p>🆔 ${g.id}</p>
            <p>👥 ${g.approximate_member_count || '?'} members</p>
            <p style="color:#FF6B35;margin-top:8px;">👑 You own this server</p>
        </div>
    `).join('');
}

window.selectGuild = function(guildId, guildName) {
    selectedGuildId = guildId;
    document.getElementById('automodWarning').style.display = 'none';
    document.getElementById('automodSettings').style.display = 'block';
    document.getElementById('voiceWarning').style.display = 'none';
    document.getElementById('voiceSettings').style.display = 'block';
    document.getElementById('levelingWarning').style.display = 'none';
    document.getElementById('levelingSettings').style.display = 'block';
    document.getElementById('giveawayWarning').style.display = 'none';
    document.getElementById('giveawaySettings').style.display = 'block';
    document.getElementById('serverCountBadge').innerText = currentGuilds.length;
    addActivity(`Selected server: ${guildName}`, 'info');
    showToast(`Now managing: ${guildName}`, 'success');
    document.querySelector('[data-page="automod"]').click();
};

window.setupAutoMod = function() {
    if (!selectedGuildId) {
        showToast('Select a server first from "My Servers"', 'warning');
        document.querySelector('[data-page="servers"]').click();
        return;
    }
    document.getElementById('automodEnabled').checked = true;
    saveAutoMod();
};

window.saveAutoMod = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    const enabled = document.getElementById('automodEnabled')?.checked || false;
    const action = document.getElementById('automodAction')?.value || 'warn';
    
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automod: { enabled, action } })
    });
    addActivity(`AutoMod settings saved for server`, 'success');
    showToast('✅ AutoMod settings saved!', 'success');
};

window.saveLeveling = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    const enabled = document.getElementById('levelingEnabled')?.checked || false;
    
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leveling: { enabled } })
    });
    addActivity(`Leveling settings saved`, 'success');
    showToast('✅ Leveling settings saved!', 'success');
};

window.setupVoice = function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    addActivity(`Temp voice setup initiated`, 'info');
    showToast('🎤 Run /setup-voice in Discord to complete setup', 'info');
};

window.createGiveaway = function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    const prize = document.getElementById('giveawayPrize')?.value;
    const duration = document.getElementById('giveawayDuration')?.value;
    const winners = document.getElementById('giveawayWinners')?.value;
    
    if (!prize || !duration || !winners) {
        showToast('Please fill in all giveaway fields', 'error');
        return;
    }
    addActivity(`Giveaway created: ${prize}`, 'success');
    showToast(`🎉 Giveaway "${prize}" started!`, 'success');
};

window.refreshData = async function() {
    showToast('🔄 Refreshing data...', 'info');
    await loadBotStatus();
    await loadUserGuilds();
    addActivity('Dashboard data refreshed', 'success');
    showToast('✅ Data refreshed!', 'success');
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
    
    // Add search functionality
    const searchInput = document.getElementById('commandSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.command-card').forEach(card => {
                card.style.display = card.textContent.toLowerCase().includes(term) ? 'block' : 'none';
            });
        });
    }
}

async function loadAnalytics() {
    try {
        const res = await fetch(`${API_URL}/api/guilds`);
        const guilds = await res.json();
        const topServers = guilds.sort((a, b) => b.memberCount - a.memberCount).slice(0, 5);
        
        const container = document.getElementById('topServersList');
        container.innerHTML = topServers.map(g => `
            <div class="top-server-item">
                <span>${g.name}</span>
                <strong style="color:#FF6B35">${g.memberCount} members</strong>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

function addActivity(message, type) {
    const container = document.getElementById('activityList');
    const activityDiv = document.createElement('div');
    activityDiv.className = 'activity-item';
    activityDiv.innerHTML = `
        <span class="activity-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="activity-text">${message}</span>
        <span class="activity-time">Just now</span>
    `;
    container.insertBefore(activityDiv, container.firstChild);
    if (container.children.length > 10) {
        container.removeChild(container.lastChild);
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
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00cc66' : type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa00' : '#FF6B35'};
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
    localStorage.removeItem('discord_token_expiry');
    localStorage.removeItem('discord_client_id');
    window.location.href = '/'; 
};
