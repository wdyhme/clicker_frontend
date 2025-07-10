const API_BASE_URL = "https://clicker-backend-0t8f.onrender.com/";
let userData = {};
let passiveTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchUserData();
  } catch (e) {
    console.error("Ошибка загрузки данных", e);
    alert("Ошибка соединения с сервером");
  } finally {
    document.getElementById("preloader")?.remove();
  }

  Telegram.WebApp.ready();
  resetDailyStatsIfNeeded();
  updateUI();
  loadTopPlayers();
  loadGlobalStats();
  startPassiveIncome();
});

function getUserInfo() {
  return Telegram.WebApp?.initDataUnsafe?.user || {
    id: "debug_id",
    username: "debug_user"
  };
}

async function fetchUserData() {
  const user = getUserInfo();
  const res = await fetch(`${API_BASE_URL}get_data?user_id=${user.id}&username=${user.username}`);
  userData = await res.json();

  userData.upgrades ??= { click: 0, passive: 0 };
  userData.adsWatchedToday ??= 0;
  userData.adsWatchedTotal ??= 0;
  userData.totalClicks ??= 0;
  userData.totalEarned ??= 0;
  userData.perClick ??= 1;
  userData.passiveIncome ??= 0;
  userData.ads_watched ??= {
    interstitialToday: 0,
    interstitialTotal: 0,
    popupToday: 0,
    popupTotal: 0
  };
  userData.dailyBigClaimedToday ??= false;
}

function saveUserData() {
  const user = getUserInfo();
  fetch(`${API_BASE_URL}save_data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: user.id, data: userData })
  });
}

function resetDailyStatsIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem("lastResetDate");
  if (last !== today) {
    localStorage.setItem("lastResetDate", today);
    userData.adsWatchedToday = 0;
    userData.ads_watched.interstitialToday = 0;
    userData.ads_watched.popupToday = 0;
    userData.dailyBigClaimedToday = false;
    saveUserData();
  }
}

function formatNumber(n) {
  return Math.floor(n).toLocaleString("en-US");
}

function updateUI() {
  document.getElementById("balance").textContent = formatNumber(userData.balance);
  document.getElementById("perClick").textContent = userData.perClick;
  document.getElementById("passive").textContent = `${userData.passiveIncome}/h`;
  updateBonusProgress();
}

function updateBonusProgress() {
  const el = document.getElementById("bigBonusProgress");
  const btn = document.getElementById("claimBigBonusBtn");

  const watched = userData.adsWatchedToday || 0;

  if (userData.dailyBigClaimedToday) {
    el.textContent = "Claimed";
    btn.disabled = true;
    btn.textContent = "Claimed";
    btn.classList.remove("active");
  } else if (watched >= 100) {
    el.textContent = "";
    btn.disabled = false;
    btn.textContent = "Claim Daily Bonus";
    btn.classList.add("active");
  } else {
    el.textContent = `${watched}/100`;
    btn.disabled = true;
    btn.textContent = `Claim Daily Bonus (${watched}/100)`;
    btn.classList.remove("active");
  }
}

function startPassiveIncome() {
  if (passiveTimer) clearInterval(passiveTimer);
  passiveTimer = setInterval(() => {
    const perSec = userData.passiveIncome / 3600;
    if (perSec >= 1 || Math.random() < perSec) {
      userData.balance += 1;
      userData.totalEarned += 1;
      updateUI();
      saveUserData();
    }
  }, 1000);
}

document.getElementById("clicker").addEventListener("click", () => {
  userData.balance += userData.perClick;
  userData.totalEarned += userData.perClick;
  userData.totalClicks += 1;
  updateUI();
  saveUserData();
});

document.getElementById("claimBonusBtn").addEventListener("click", () => {
  const type = document.querySelector(".bonus-btn.active")?.dataset.type;
  if (!type) return;

  const reward = 25;
  const msg = document.getElementById("bonusMsg");

  show_9522334(type === "popup" ? "pop" : undefined).then(() => {
    userData.balance += reward;
    userData.totalEarned += reward;
    userData.adsWatchedToday++;
    userData.adsWatchedTotal++;

    if (type === "popup") {
      userData.ads_watched.popupToday++;
      userData.ads_watched.popupTotal++;
    } else if (type === "interstitial") {
      userData.ads_watched.interstitialToday++;
      userData.ads_watched.interstitialTotal++;
    }

    updateUI();
    updateBonusProgress();
    saveUserData();

    msg.textContent = `+${reward} 🪙`;
    setTimeout(() => (msg.textContent = ""), 2000);
  });
});

document.getElementById("claimBigBonusBtn").addEventListener("click", () => {
  if (userData.adsWatchedToday >= 100 && !userData.dailyBigClaimedToday) {
    const reward = 500;
    userData.balance += reward;
    userData.totalEarned += reward;
    userData.dailyBigClaimedToday = true;

    updateBonusProgress();
    updateUI();
    saveUserData();

    const msg = document.getElementById("bonusMsg");
    msg.textContent = `🎉 +${reward} big bonus!`;
    setTimeout(() => (msg.textContent = ""), 2000);
  }
});

document.querySelectorAll(".bonus-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".bonus-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.getElementById("buyClickUpgrade").addEventListener("click", () => {
  const msg = document.getElementById("shopMsg");
  const cost = Math.floor(50 * Math.pow(1.5, userData.upgrades.click));

  if (userData.balance >= cost) {
    userData.balance -= cost;
    userData.perClick += 1;
    userData.upgrades.click++;
    msg.textContent = "✅ Upgrade bought!";
  } else {
    msg.textContent = "❌ Not enough coins.";
  }

  updateUI();
  saveUserData();
  setTimeout(() => (msg.textContent = ""), 2000);
});

document.getElementById("buyPassiveUpgrade").addEventListener("click", () => {
  const msg = document.getElementById("shopMsg");
  const cost = Math.floor(100 * Math.pow(1.5, userData.upgrades.passive));

  if (userData.balance >= cost) {
    userData.balance -= cost;
    userData.passiveIncome += 5;
    userData.upgrades.passive++;
    msg.textContent = "✅ Upgrade bought!";
  } else {
    msg.textContent = "❌ Not enough coins.";
  }

  updateUI();
  saveUserData();
  setTimeout(() => (msg.textContent = ""), 2000);
});

async function loadTopPlayers() {
  const res = await fetch(`${API_BASE_URL}get_top_players`);
  const top = await res.json();
  const container = document.getElementById("topPlayers");
  const tgUser = getUserInfo();

  container.innerHTML = "";

  top.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "top-card";
    const isCurrent = player.nickname === tgUser.username;

    if (isCurrent) card.classList.add("highlight");

    card.innerHTML = `
      <div class="top-name">
        <span class="top-rank-num" style="vertical-align: sub;">${index + 1}.</span>
        @${player.nickname}
      </div>
      <div class="top-coins">
        ${isCurrent ? formatNumber(userData.totalEarned) : formatNumber(player.totalEarned)} 🪙
      </div>
    `;

    container.appendChild(card);
  });
}

async function loadGlobalStats() {
  const res = await fetch(`${API_BASE_URL}get_global_stats`);
  const s = await res.json();

  document.getElementById("globalTotalEarned").textContent = formatNumber(s.totalEarned);
  document.getElementById("globalTotalClicks").textContent = formatNumber(s.totalClicks);
  document.getElementById("globalClickUpgrades").textContent = s.clickUpgrades;
  document.getElementById("globalPassiveUpgrades").textContent = s.passiveUpgrades;
  document.getElementById("globalUsers").textContent = s.users;
  document.getElementById("globalInterstitial").textContent = s.ads.interstitialTotal;
  document.getElementById("globalPopup").textContent = s.ads.popupTotal;
}
