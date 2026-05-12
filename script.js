// ============ FRUXY BOT DASHBOARD ============
const API_URL = 'https://fruxty.onrender.com';
const CLIENT_ID = '1503755260814954577'; // Your bot's Client ID - Has purpose!

// Check authentication
const token = localStorage.getItem('discord_token');
const savedClientId = localStorage.getItem('discord_client_id');

if (!token || savedClientId !== CLIENT_ID) {
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
});

async function loadUser() {
    try {
        // Client ID is used in fetch to identify the app
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { 
                Authorization: `Bearer ${token}`,
                'X-Client-ID': CLIENT_ID  // Client ID identifies the dashboard
            }
        });
        if (!res.ok) throw new Error('Invalid token');
        currentUser = await res.json();
        
        document.getElementById('userName').innerText = currentUser.username;
        document.getElementById('userDiscrim').innerText = `#${currentUser.discriminator}`;
        document.getElementById('userAvatar').src = currentUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
            
        // Also validate that this user is authorized to use this dashboard
        await validateUserAccess(currentUser.id);
        
    } catch(e) { logout(); }
}

async function validateUserAccess(userId) {
    // This ensures only users who have the bot in their servers can use dashboard
    const botGuildsRes = await fetch(`${API_URL}/api/guilds`);
    const botGuilds = await botGuildsRes.json();
    const botGuildIds = botGuilds.map(g => g.id);
    
    const userGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const userGuilds = await userGuildsRes.json();
    
    const hasAccess = userGuilds.some(g => g.owner === true && botGuildIds.includes(g.id));
    
    if (!hasAccess) {
        document.getElementById('serverList').innerHTML = `
            <div class="warning-banner">
                ⚠️ You don't have access to any servers where Fruxty Bot is present.<br>
                <a href="https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands" target="_blank">
                    Click here to invite Fruxty Bot to your server
                </a>
            </div>
        `;
    }
}

async function loadBotStatus() {
    try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        document.getElementById('botPing').innerText = `${data.ping || 0}ms`;
        document.getElementById('serverCount').innerText = data.guilds || 0;
        
        // Show which bot is connected (using Client ID)
        document.getElementById('botStatus').innerHTML = `🟢 Online (ID: ${CLIENT_ID.slice(-6)})`;
    } catch(e) { 
        document.getElementById('botStatus').innerHTML = '🔴 Offline';
    }
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
        
        // Filter: User must be OWNER AND bot must be in guild
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
                No servers found. You must own a server and have Fruxty Bot invited.<br>
                <a href="https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands" target="_blank">
                    ➕ Invite Fruxty Bot (Client ID: ${CLIENT_ID})
                </a>
            </div>
        `;
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

window.selectGuild = function(guildId) {
    selectedGuildId = guildId;
    document.getElementById('automodWarning').style.display = 'none';
    document.getElementById('automodSettings').style.display = 'block';
    showToast(`Managing server`, 'info');
};

window.saveAutoMod = async function() {
    if (!selectedGuildId) { showToast('Select a server first!', 'error'); return; }
    await fetch(`${API_URL}/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Client-ID': CLIENT_ID  // Client ID identifies which dashboard is saving
        },
        body: JSON.stringify({ 
            automod: { enabled: document.getElementById('automodEnabled').value === 'true' } 
        })
    });
    showToast('✅ Settings saved!', 'success');
};

window.setupVoice = function() {
    showToast('🎤 Run /setup-voice in Discord to create temp voice channels', 'info');
};

window.refreshData = async function() {
    showToast('🔄 Refreshing...', 'info');
    await loadBotStatus();
    await loadUserGuilds();
    showToast('✅ Refreshed!', 'success');
};

function loadCommands() {
    const commands = [
        '/ping', '/serverinfo', '/userinfo', '/avatar', '/botinfo', '/help',
        '/rank', '/leaderboard', '/giveaway', '/setup', '/setup-voice', '/setup-verify',
        '/automod', '/ban', '/kick', '/timeout', '/warn', '/warnings', '/purge', '/lockdown',
        '/vc rename', '/vc lock', '/vc limit', '/vc claim', '/verify'
    ];
    document.getElementById('commandsList').innerHTML = commands.map(c => `
        <div class="command-card">${c}</div>
    `).join('');
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
        background: ${type === 'success' ? '#00cc66' : type === 'error' ? '#ff4444' : '#FF6B35'};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.logout = function() { 
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_client_id');
    window.location.href = '/'; 
};

// Add animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
