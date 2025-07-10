const API_BASE_URL = "https://clicker-backend-0t8f.onrender.com/";
let userData = {};
let selectedBonus = null;

function getUserInfo() {
  const user = Telegram.WebApp?.initDataUnsafe?.user;
  if (!user || !user.id || !user.username) {
    alert("❌ Запуск возможен только через Telegram");
    throw new Error("Telegram user not detected");
  }
  return user;
}

function formatNumber(n) {
  return Math.floor(n).toLocaleString("en-US");
}

function roundPrice(value) {
  const increased = value * 1.10;
  const lastDigit = Math.floor(increased) % 10;
  const rounded = lastDigit <= 5 ? Math.floor(increased / 10) * 10 : Math.ceil(increased / 10) * 10;
  return Math.max(10, rounded);
}

function updateUI() {
  document.getElementById("balanceStat").textContent = `${formatNumber(userData.balance)} 💎`;
  document.getElementById("perClick").textContent = `${formatNumber(userData.perClick)} 💎`;
  document.getElementById("passiveIncome").textContent = `${formatNumber(userData.passiveIncome)} 💎/h`;
  updatePrices();
  updateBonusProgress();
  updateStatsUI();
  updateTopPlayerHighlight();
}

function updateBonusProgress() {
  const el = document.getElementById("bigBonusProgress");
  const claimBtn = document.getElementById("claimBigBonusBtn");
  const watched = userData.adsWatchedToday || 0;

  if (userData.dailyBigClaimedToday) {
    el.textContent = "Claimed";
    claimBtn.disabled = true;
    claimBtn.textContent = "Claimed";
    claimBtn.classList.remove("active");
  } else if (watched >= 100) {
    el.textContent = "";
    claimBtn.disabled = false;
    claimBtn.textContent = "Claim Daily Bonus";
    claimBtn.classList.add("active");
  } else {
    el.textContent = `${watched}/100`;
    claimBtn.disabled = true;
    claimBtn.textContent = `Claim Daily Bonus (${watched}/100)`;
    claimBtn.classList.remove("active");
  }
}

function updatePrices() {
  const clickBase = 50;
  const passiveBase = 100;
  const clickCost = userData.upgrades.click === 0 ? clickBase : roundPrice(clickBase * Math.pow(1.1, userData.upgrades.click));
  const passiveCost = userData.upgrades.passive === 0 ? passiveBase : roundPrice(passiveBase * Math.pow(1.1, userData.upgrades.passive));
  document.getElementById("buyClickUpgrade").textContent = `${formatNumber(clickCost)} 💎`;
  document.getElementById("buyPassiveUpgrade").textContent = `${formatNumber(passiveCost)} 💎`;
}

function updateStatsUI() {
  const ads = userData.ads_watched || {};
  document.getElementById("totalEarned").textContent = `${formatNumber(userData.totalEarned)}`;
  document.getElementById("totalClicks").textContent = formatNumber(userData.totalClicks);
  document.getElementById("clickUpgrades").textContent = userData.upgrades.click;
  document.getElementById("passiveUpgrades").textContent = userData.upgrades.passive;
  document.getElementById("shortToday").textContent = ads.interstitialToday || 0;
  document.getElementById("shortTotal").textContent = ads.interstitialTotal || 0;
  document.getElementById("popupToday").textContent = ads.popupToday || 0;
  document.getElementById("popupTotal").textContent = ads.popupTotal || 0;
}

function updateTopPlayerHighlight() {
  const cards = document.querySelectorAll(".top-card");
  const tgUser = getUserInfo();
  cards.forEach(card => {
    const name = card.querySelector(".top-name")?.textContent.replace(/^\d+\.\s*/, "").replace(/^@/, "");
    if (name === tgUser.username) {
      card.querySelector(".top-coins").textContent = `${formatNumber(userData.totalEarned)} 💎`;
    }
  });
}

async function saveUserData() {
  const tgUser = getUserInfo();
  userData.username = tgUser.username;
  await fetch(`${API_BASE_URL}save_data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: String(tgUser.id), data: userData }),
  });
}

async function fetchUserData() {
  const tgUser = getUserInfo();
  const res = await fetch(`${API_BASE_URL}get_data?user_id=${String(tgUser.id)}&username=${tgUser.username}`);
  userData = await res.json();

  const last = localStorage.getItem("lastPassiveTime");
  const now = Date.now();
  if (last && userData.passiveIncome > 0) {
    const diffMs = now - parseInt(last);
    const earned = Math.floor(diffMs / 3600000 * userData.passiveIncome);
    if (earned > 0) {
      userData.balance += earned;
      userData.totalEarned += earned;
    }
  }
  localStorage.setItem("lastPassiveTime", now.toString());
}

function resetDailyStatsIfNeeded() {
  const today = new Date();
  const storedDate = localStorage.getItem("lastResetDate");
  const nowDate = today.toISOString().slice(0, 10);
  if (storedDate !== nowDate) {
    localStorage.setItem("lastResetDate", nowDate);
    userData.adsWatchedToday = 0;
    userData.ads_watched.interstitialToday = 0;
    userData.ads_watched.popupToday = 0;
    userData.dailyBigClaimedToday = false;
    saveUserData();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetchUserData();

  document.getElementById("preloader")?.remove();

  setInterval(() => {
    if (userData?.passiveIncome > 0) {
      const perSecond = userData.passiveIncome / 3600;
      if (perSecond >= 1 || Math.random() < perSecond) {
        userData.balance += 1;
        userData.totalEarned += 1;
        updateUI();
        saveUserData();
      }
    }
  }, 1000);

  Telegram.WebApp.ready();
  resetDailyStatsIfNeeded();
  updateUI();
  loadTopPlayers();
  loadGlobalStats();

  show_9522334({
    type: 'inApp',
    inAppSettings: {
      frequency: 2,
      capping: 0.1,
      interval: 120,
      timeout: 5,
      everyPage: false
    }
  });

  document.getElementById("clickCircle").addEventListener("click", () => {
    userData.balance += userData.perClick;
    userData.totalEarned += userData.perClick;
    userData.totalClicks++;
    updateUI();
    saveUserData();
  });

  const navMap = {
    navClicker: "page-clicker",
    navTop: "page-top",
    navShop: "page-shop",
    navBonuses: "page-bonuses",
    navStats: "page-stats"
  };
  for (let [btnId, pageId] of Object.entries(navMap)) {
    document.getElementById(btnId).onclick = () => {
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      document.getElementById(pageId).classList.add("active");
    };
  }

  document.querySelectorAll(".bonus-item").forEach(el => {
    el.addEventListener("click", () => {
      if (el.dataset.bonus === "dailybig") return;
      document.querySelectorAll(".bonus-item").forEach(i => i.classList.remove("selected"));
      el.classList.add("selected");
      selectedBonus = el.dataset.bonus;
      document.getElementById("claimBonusBtn").disabled = false;
    });
  });

  document.getElementById("claimBonusBtn").addEventListener("click", async () => {
    if (!selectedBonus) return;
    let adPromise = selectedBonus === "popup" ? show_9522334("pop") : show_9522334();
    adPromise.then(() => {
      const reward = 100;
      userData.balance += reward;
      userData.totalEarned += reward;

      if (selectedBonus === "popup") {
        userData.ads_watched.popupToday++;
        userData.ads_watched.popupTotal++;
      } else {
        userData.ads_watched.interstitialToday++;
        userData.ads_watched.interstitialTotal++;
      }

      userData.adsWatchedToday++;
      document.getElementById("bonusMsg").textContent = `🎉 You earned +${reward} coins!`;
      setTimeout(() => document.getElementById("bonusMsg").textContent = "", 2000);

      updateBonusProgress();
      updateUI();
      saveUserData();
      selectedBonus = null;
      document.getElementById("claimBonusBtn").disabled = true;
      document.querySelectorAll(".bonus-item").forEach(i => i.classList.remove("selected"));
    });
  });

  document.getElementById("claimBigBonusBtn").addEventListener("click", () => {
    if (userData.adsWatchedToday >= 100 && !userData.dailyBigClaimedToday) {
      const reward = 500;
      userData.balance += reward;
      userData.totalEarned += reward;
      userData.dailyBigClaimedToday = true;

      const msg = document.getElementById("bonusMsg");
      msg.textContent = `🎉 You earned +${reward} coins!`;
      setTimeout(() => msg.textContent = "", 2000);

      updateBonusProgress();
      updateUI();
      saveUserData();
    }
  });

  document.getElementById("buyClickUpgrade").addEventListener("click", () => {
    const base = 50;
    const cost = userData.upgrades.click === 0 ? base : roundPrice(base * Math.pow(1.25, userData.upgrades.click));
    const msg = document.getElementById("shopMsg");

    if (userData.balance >= cost) {
      userData.balance -= cost;
      userData.perClick += 1;
      userData.upgrades.click += 1;
      msg.textContent = "✅ Upgrade purchased!";
    } else {
      msg.textContent = "❌ Not enough coins!";
    }

    setTimeout(() => msg.textContent = "", 2000);
    updateUI();
    saveUserData();
  });

  document.getElementById("buyPassiveUpgrade").addEventListener("click", () => {
    const base = 100;
    const cost = userData.upgrades.passive === 0 ? base : roundPrice(base * Math.pow(1.25, userData.upgrades.passive));
    const msg = document.getElementById("shopMsg");

    if (userData.balance >= cost) {
      userData.balance -= cost;
      userData.passiveIncome += 1;
      userData.upgrades.passive += 1;
      msg.textContent = "✅ Upgrade purchased!";
    } else {
      msg.textContent = "❌ Not enough coins!";
    }

    setTimeout(() => msg.textContent = "", 2000);
    updateUI();
    saveUserData();
  });
});
