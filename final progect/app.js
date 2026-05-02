const screens = {
  start: document.querySelector("#start-screen"),
  game: document.querySelector("#game-screen"),
  end: document.querySelector("#end-screen")
};

const hpEl = document.querySelector("#hp");
const goldEl = document.querySelector("#gold");
const luckEl = document.querySelector("#luck");
const dayEl = document.querySelector("#day");

const eventTypeEl = document.querySelector("#event-type");
const eventTitleEl = document.querySelector("#event-title");
const eventTextEl = document.querySelector("#event-text");
const quoteBoxEl = document.querySelector("#quote-box");
const apiStatusEl = document.querySelector("#api-status");
const choiceAreaEl = document.querySelector("#choice-area");
const logListEl = document.querySelector("#log-list");

const endingTitleEl = document.querySelector("#ending-title");
const endingTextEl = document.querySelector("#ending-text");

const startBtn = document.querySelector("#start-btn");
const restartBtn = document.querySelector("#restart-btn");
const playAgainBtn = document.querySelector("#play-again-btn");

let state = {
  hp: 100,
  gold: 20,
  luck: 5,
  day: 1,
  maxDay: 8,
  log: []
};

const events = [
  {
    type: "Market",
    title: "The Neon Bazaar",
    text: "A glowing underground market appears between two broken servers. A merchant offers you a strange upgrade.",
    choices: [
      {
        label: "Buy a shield chip",
        detail: "-10 gold, +15 HP",
        effect: () => changeStats({ gold: -10, hp: 15 }, "Bought a shield chip.")
      },
      {
        label: "Gamble with the merchant",
        detail: "Luck decides your reward",
        effect: () => gamble()
      }
    ]
  },
  {
    type: "Combat",
    title: "Firewall Beast",
    text: "A firewall beast blocks your path. Its code-body shifts and burns like blue glass.",
    choices: [
      {
        label: "Fight directly",
        detail: "-18 HP, +12 gold",
        effect: () => changeStats({ hp: -18, gold: 12 }, "Defeated the firewall beast.")
      },
      {
        label: "Search for a weak point",
        detail: "+2 luck, but lose time",
        effect: () => changeStats({ luck: 2 }, "Studied the beast and found a pattern.")
      }
    ]
  },
  {
    type: "Mystery",
    title: "The API Oracle",
    text: "A machine speaks in fragments from the outside world. Its message may strengthen your run.",
    choices: [
      {
        label: "Trust the oracle",
        detail: "+5 luck, -5 HP",
        effect: () => changeStats({ luck: 5, hp: -5 }, "Trusted the oracle's strange advice.")
      },
      {
        label: "Extract its data core",
        detail: "+18 gold, -2 luck",
        effect: () => changeStats({ gold: 18, luck: -2 }, "Took the oracle's data core.")
      }
    ]
  },
  {
    type: "Rest",
    title: "A Quiet Save Point",
    text: "For one moment, the dungeon becomes silent. Even the background processes stop watching you.",
    choices: [
      {
        label: "Rest",
        detail: "+20 HP",
        effect: () => changeStats({ hp: 20 }, "Rested at a quiet save point.")
      },
      {
        label: "Train",
        detail: "+4 luck",
        effect: () => changeStats({ luck: 4 }, "Practiced reading dungeon patterns.")
      }
    ]
  }
];

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function resetGame() {
  state = {
    hp: 100,
    gold: 20,
    luck: 5,
    day: 1,
    maxDay: 8,
    log: []
  };

  updateStats();
  logListEl.innerHTML = "";
  showScreen("game");
  loadEvent();
}

function updateStats() {
  hpEl.textContent = state.hp;
  goldEl.textContent = state.gold;
  luckEl.textContent = state.luck;
  dayEl.textContent = state.day;

  [hpEl, goldEl, luckEl, dayEl].forEach(el => {
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
  });
}

async function fetchQuote() {
  apiStatusEl.textContent = "Calling API...";

  try {
    const response = await fetch("https://cse2004.com/api/quotes/random");

    if (!response.ok) {
      throw new Error("API response was not OK");
    }

    const data = await response.json();
    apiStatusEl.textContent = "API connected";

    if (data.text) {
      return `“${data.text}”`;
    }

    return "“The oracle is quiet, but the dungeon keeps moving.”";
  } catch (error) {
    apiStatusEl.textContent = "API fallback used";
    return "“The API oracle failed to respond, so the dungeon created its own prophecy.”";
  }
}

async function loadEvent() {
  if (state.hp <= 0) {
    endGame(false);
    return;
  }

  if (state.day > state.maxDay) {
    endGame(true);
    return;
  }

  choiceAreaEl.innerHTML = "";
  eventTitleEl.textContent = "Loading encounter...";
  eventTextEl.textContent = "The dungeon is generating your next room.";
  quoteBoxEl.textContent = "Loading API message...";

  const currentEvent = events[Math.floor(Math.random() * events.length)];
  const quote = await fetchQuote();

  eventTypeEl.textContent = currentEvent.type;
  eventTitleEl.textContent = currentEvent.title;
  eventTextEl.textContent = currentEvent.text;
  quoteBoxEl.textContent = quote;

  currentEvent.choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.innerHTML = `${choice.label}<span>${choice.detail}</span>`;

    button.addEventListener("click", () => {
      choice.effect();
      state.day += 1;
      updateStats();
      setTimeout(loadEvent, 450);
    });

    choiceAreaEl.appendChild(button);
  });
}

function changeStats(delta, message) {
  state.hp = Math.min(120, state.hp + (delta.hp || 0));
  state.gold = Math.max(0, state.gold + (delta.gold || 0));
  state.luck = Math.max(0, state.luck + (delta.luck || 0));

  addLog(message);
}

function gamble() {
  const roll = Math.random() * 10 + state.luck;

  if (roll >= 10) {
    changeStats({ gold: 30, luck: 1 }, "Won the merchant's gamble.");
  } else {
    changeStats({ hp: -15, gold: -5 }, "Lost the merchant's gamble.");
  }
}

function addLog(message) {
  state.log.unshift(`Day ${state.day}: ${message}`);

  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = state.log[0];

  logListEl.prepend(item);
}

function endGame(won) {
  showScreen("end");

  if (won) {
    endingTitleEl.textContent = "You Escaped the Digital Dungeon";
    endingTextEl.textContent = `You survived ${state.maxDay} days with ${state.hp} HP, ${state.gold} gold, and ${state.luck} luck.`;
  } else {
    endingTitleEl.textContent = "Run Failed";
    endingTextEl.textContent = `The dungeon defeated you on Day ${state.day}. Your final gold was ${state.gold}.`;
  }
}

startBtn.addEventListener("click", resetGame);
restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);