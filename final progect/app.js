const screens = {
  start: document.querySelector("#start-screen"),
  game: document.querySelector("#game-screen"),
  end: document.querySelector("#end-screen")
};

const eventTypeEl = document.querySelector("#event-type");
const eventTitleEl = document.querySelector("#event-title");
const eventTextEl = document.querySelector("#event-text");
const quoteBoxEl = document.querySelector("#quote-box");
const apiStatusEl = document.querySelector("#api-status");
const choiceAreaEl = document.querySelector("#choice-area");
const logListEl = document.querySelector("#log-list");

const fragmentKeyEl = document.querySelector("#fragment-key");
const authorityKeyEl = document.querySelector("#authority-key");
const echoKeyEl = document.querySelector("#echo-key");
const overrideKeyEl = document.querySelector("#override-key");
const gateProgressEl = document.querySelector("#gate-progress");
const goalHintEl = document.querySelector("#goal-hint");

const endingTitleEl = document.querySelector("#ending-title");
const endingTextEl = document.querySelector("#ending-text");
const endingExtraEl = document.querySelector("#ending-extra");

const startBtn = document.querySelector("#start-btn");
const restartBtn = document.querySelector("#restart-btn");
const playAgainBtn = document.querySelector("#play-again-btn");
const musicBtn = document.querySelector("#music-btn");

const avatarBtn = document.querySelector("#avatar");
const statusPanel = document.querySelector("#status-panel");
const closePanelBtn = document.querySelector("#close-panel");
const panelGrid = document.querySelector("#panel-grid");

let state;
let audioCtx;
let musicNodes = [];
let musicOn = true;

function createInitialState() {
  return {
    hp: 110,
    maxHp: 150,
    gold: 35,
    attack: 2,
    luck: 6,
    day: 1,
    corruption: 0,

    worldOpened: false,
    atGate: false,
    nearDeathTriggered: false,
    attackMilestone: false,

    oracleTag: "neutral",

    fragmentProgress: 0,
    systemTrust: 2,
    echoProgress: 0,
    lastChoiceType: null,

    merchantVisits: 0,
    noBuyCount: 0,
    merchantRobbed: false,
    darkDealTaken: false,

    insertedKeys: {
      fragment: false,
      authority: false,
      echo: false,
      override: false
    },

    keys: {
      fragment: false,
      authority: false,
      echo: false,
      override: false
    },

    log: []
  };
}

const introEvents = [
  {
    type: "Intro",
    title: "You Wake",
    text: "There is no memory of arrival. Only cold floor, distant static, and a ceiling that renders one tile at a time.",
    choices: [
      choice("Stand up.", "begin", () => addLog("You stood inside The Archive."))
    ]
  },
  {
    type: "Intro",
    title: "The Archive",
    text: "This place stores unfinished things: broken records, failed identities, rooms nobody returned from.",
    choices: [
      choice("Read the walls.", "remember", () => {
        state.fragmentProgress += 1;
        addLog("The walls remembered something before you did.");
        checkFragmentKey();
      }),
      choice("Keep walking.", "avoid", () => {
        state.luck += 1;
        addLog("You refused the first memory.");
      })
    ]
  },
  {
    type: "Intro",
    title: "A Signal",
    text: "Something outside tries to reach you. The message breaks apart before it becomes language.",
    choices: [
      choice("Listen.", "remember", () => {
        state.luck += 1;
        state.corruption += 1;
        addLog("The signal entered your head like weather.");
      }),
      choice("Cover your ears.", "authority", () => {
        state.systemTrust += 1;
        addLog("The system approved your restraint.");
      })
    ]
  },
  {
    type: "Intro",
    title: "First Distortion",
    text: "The corridor bends. A second version of you appears at the far end, then walks away first.",
    choices: [
      choice("Follow it.", "repeat", () => {
        state.echoProgress += 1;
        addLog("You followed the shape that moved like you.");
        checkEchoKey();
      }),
      choice("Turn aside.", "avoid", () => {
        state.luck += 1;
        addLog("You avoided your own outline.");
      })
    ]
  },
  {
    type: "Intro",
    title: "A Door Appears",
    text: "Far away, a gate rises from the dark. It has four locks, but only three need to turn.",
    choices: [
      choice("Walk toward the world beyond it.", "begin", () => {
        addLog("The Gate has been seen. It will appear again.");
      })
    ]
  },
  {
    type: "World",
    title: "The Archive Opens",
    text: "The narrow corridor becomes a world. Routes unfold in every direction: markets, ruins, signal towers, and quiet fires.",
    choices: [
      choice("Begin exploring.", "explore", () => {
        state.worldOpened = true;
        addLog("The world opened. The Gate can now be found.");
      }),
      choice("Walk directly to the Gate.", "gate", () => {
        state.worldOpened = true;
        state.atGate = true;
        addLog("You chose to face the Gate early.");
      })
    ]
  }
];

const enemies = [
  { name: "Firewall Beast", description: "A beast of blue glass blocks the path. Its ribs open and close like burning gates.", baseDamage: 11, scale: 1.14, goldReward: 15 },
  { name: "Corrupted Sentinel", description: "A guard without a face raises a weapon made of rejected commands.", baseDamage: 13, scale: 1.16, goldReward: 18 },
  { name: "Echo Stalker", description: "Something wearing the rhythm of your footsteps follows too closely.", baseDamage: 10, scale: 1.22, goldReward: 14 },
  { name: "Archive Warden", description: "A massive figure made of locks and file names turns its attention toward you.", baseDamage: 16, scale: 1.18, goldReward: 25 },
  { name: "Null Entity", description: "A blank space in the shape of a person reaches for the part of you that still has a name.", baseDamage: 19, scale: 1.2, goldReward: 32 }
];

const explorationEvents = [
  event("memory_drift", "Memory", "Memory Drift", "You remember a room you have never entered. The memory waits like a hand held out in the dark.", 8, [
    choice("Hold onto it.", "remember", () => {
      state.fragmentProgress++;
      state.corruption += 1;
      addLog("The memory stayed. It was not gentle.");
      checkFragmentKey();
    }),
    choice("Let it go.", "avoid", () => {
      state.luck += 1;
      state.systemTrust += 1;
      addLog("The Archive approved your refusal to remember.");
      checkAuthorityKey();
    })
  ]),

  event("mirror_node", "Memory", "The Mirror Node", "A reflective surface opens in the wall. It does not show your face, only a silhouette moving late.", 7, [
    choice("Reach into the reflection.", "remember", () => {
      state.hp -= 10;
      state.fragmentProgress++;
      state.corruption += 2;
      addLog("Something inside the mirror resisted. You pulled anyway.");
      checkFragmentKey();
    }),
    choice("Break the surface.", "fight", () => {
      state.hp -= 6;
      state.gold += 12;
      state.systemTrust -= 1;
      addLog("The mirror shattered into useful pieces.");
    })
  ]),

  event("corrupted_memory", "Memory", "Corrupted Memory", "A memory fragment appears. It is damaged, but it feels familiar enough to hurt.", 7, [
    choice("Absorb it.", "remember", () => {
      state.fragmentProgress++;
      state.corruption += 2;
      addLog("The fragment entered you before you understood it.");
      checkFragmentKey();
    }),
    choice("Delete it.", "authority", () => {
      state.gold += 12;
      state.systemTrust += 1;
      addLog("The system rewarded clean disposal.");
      checkAuthorityKey();
    })
  ]),

  event("broken_authorization", "Authority", "Broken Authorization", "A terminal asks for credentials you almost remember.\n\nHint: consistent, low-corruption behavior may be recognized by the system.", 7, [
    choice("Enter what you recall.", "authority", () => {
      if (state.luck + state.systemTrust >= 8 && state.corruption < 10) {
        state.systemTrust += 3;
        addLog("The terminal accepted part of your identity.");
        checkAuthorityKey();
      } else {
        state.hp -= 9;
        state.corruption += 1;
        addLog("The terminal rejected the shape of your name.");
      }
    }),
    choice("Override the system.", "fight", () => {
      state.hp -= 7;
      state.gold += 14;
      state.systemTrust -= 2;
      state.corruption += 2;
      addLog("The terminal opened, but the Archive noticed.");
    })
  ]),

  event("system_audit", "Authority", "System Audit", "White light fills the corridor. Something measures you without speaking.\n\nHint: this place seems related to the Authority Key.", 6, [
    choice("Stand still.", "authority", () => {
      if (state.systemTrust >= 7 && state.corruption <= 8) {
        state.keys.authority = true;
        addLog("🔑 Identity confirmed. The Authority Key formed in your hand.");
      } else {
        state.hp -= 12;
        addLog("The system found contradictions in your record.");
      }
    }),
    choice("Run through the light.", "avoid", () => {
      state.hp -= 5;
      state.luck += 2;
      state.systemTrust -= 1;
      addLog("You escaped the scan, but not cleanly.");
    })
  ], () => state.day >= 9),

  event("recursive_hallway", "Echo", "Recursive Hallway", "The hallway repeats. Or maybe you do. A mark on the wall says: again.\n\nHint: repeated behavior can become a key.", 7, [
    choice("Keep walking.", "repeat", () => {
      state.echoProgress++;
      state.hp -= 3;
      addLog("The corridor accepted your repetition.");
      checkEchoKey();
    }),
    choice("Mark your path.", "authority", () => {
      state.systemTrust += 1;
      state.luck += 1;
      addLog("You made the loop visible.");
      checkAuthorityKey();
    })
  ]),

  event("static_field", "Anomaly", "Static Field", "The air becomes static. Every step turns into resistance.", 6, [
    choice("Push forward.", "repeat", () => {
      state.hp -= 7;
      state.echoProgress++;
      addLog("You moved through the static until it remembered your outline.");
      checkEchoKey();
    }),
    choice("Step back.", "avoid", () => {
      state.luck += 1;
      addLog("The static passed over the place where you had been.");
    })
  ]),

  event("silent_process", "Observer", "The Silent Process", "A background process follows you. It does not interfere. It only records.", 6, [
    choice("Terminate it.", "fight", () => {
      state.gold += 18;
      state.systemTrust -= 2;
      addLog("The observer disappeared. The silence became heavier.");
    }),
    choice("Let it stay.", "authority", () => {
      state.luck += 2;
      state.systemTrust += 2;
      addLog("The observer continued. For now, it seemed satisfied.");
      checkAuthorityKey();
    })
  ]),

  event("whisper_cache", "Memory", "The Whisper Cache", "A storage node hums softly. It contains voices that were never meant to be heard again.\n\nHint: memory fragments may eventually reconstruct something important.", 6, [
    choice("Listen carefully.", "remember", () => {
      state.fragmentProgress++;
      state.luck += 1;
      state.corruption += 1;
      addLog("One voice used your name before you remembered having one.");
      checkFragmentKey();
    }),
    choice("Shut it down.", "authority", () => {
      state.gold += 15;
      state.systemTrust += 1;
      addLog("The voices ended cleanly.");
      checkAuthorityKey();
    })
  ]),

  event("old_save_file", "Memory", "Old Save File", "A previous version of you left a file behind. It is still warm.", 5, [
    choice("Open it.", "remember", () => {
      state.fragmentProgress += 2;
      state.corruption += 2;
      addLog("The file remembered losing.");
      checkFragmentKey();
    }),
    choice("Archive it.", "authority", () => {
      state.systemTrust += 2;
      addLog("The system accepted your discipline.");
      checkAuthorityKey();
    })
  ]),

  event("empty_station", "World", "Empty Station", "A train arrives with no passengers and no driver. Its destination board says your name.", 5, [
    choice("Board it.", "repeat", () => {
      state.echoProgress += 2;
      state.hp -= 4;
      addLog("The train moved without tracks.");
      checkEchoKey();
    }),
    choice("Let it pass.", "avoid", () => {
      state.luck += 2;
      addLog("The train left with one empty seat.");
    })
  ]),

  event("locked_shrine", "Authority", "Locked Shrine",
"A silent shrine stands in the Archive.\n\nIt does not respond to logic. Only to devotion, sacrifice, or chance.\n\nHint: this place may grant recognition if you interact with it correctly.", 
5,
[
  choice("Pray", "authority", () => {

    if (state.templeCharged) {
      state.keys.authority = true;
      addLog("🔑 The shrine remembers your sacrifice. The Authority Key is granted.");
    } else {
      state.systemTrust += 1;
      addLog("The shrine remains silent, but something is watching.");
    }

  }),

  choice("Offer 20 gold", "merchant", () => {

    if (state.gold >= 20) {
      state.gold -= 20;

      let chance = 0.5 + state.luck * 0.02;

      if (Math.random() < chance) {
        state.keys.authority = true;
        addLog("🔑 The shrine accepts your offering. The Authority Key forms.");
      } else {
        state.systemTrust += 1;
        addLog("The shrine consumes the gold. Nothing else happens.");
      }

    } else {
      addLog("You don't have enough gold.");
    }

  }),

  choice("Offer EVERYTHING", "merchant", () => {

    if (state.gold > 0) {
      state.gold = 0;
      state.templeCharged = true;
      state.corruption += 2;

      addLog("The shrine absorbs everything. It will remember this.");
    } else {
      addLog("You have nothing left to give.");
    }

  })
]
),

  event("threaded_bridge", "Echo", "Threaded Bridge", "A bridge made of repeated steps stretches across a gap with no bottom.\n\nHint: the Echo Key belongs to repeated choices.", 5, [
    choice("Cross without stopping.", "repeat", () => {
      state.echoProgress += 2;
      state.hp -= 5;
      addLog("The bridge held because you did not doubt it.");
      checkEchoKey();
    }),
    choice("Count each step.", "authority", () => {
      state.systemTrust += 1;
      state.luck += 1;
      addLog("The bridge preferred precision.");
      checkAuthorityKey();
    })
  ]),

  event("sealed_fountain", "World", "Sealed Fountain", "Water moves under glass. You can hear it, but you cannot touch it.", 5, [
    choice("Break the glass.", "fight", () => {
      state.hp += 22;
      state.systemTrust -= 1;
      addLog("The water healed you. The system marked the damage.");
    }),
    choice("Trace the seal.", "authority", () => {
      state.systemTrust += 2;
      state.luck += 1;
      addLog("The seal taught you how it was made.");
      checkAuthorityKey();
    })
  ]),

  event("old_battlefield", "Combat", "Old Battlefield", "Broken weapons lie in rows. The battle seems to have ended before anyone arrived.", 4, [
    choice("Take a weapon.", "fight", () => {
      state.attack += 2;
      state.corruption += 1;
      addLog("The weapon fit your hand too well.");
      checkAttackMilestone();
    }),
    choice("Leave them buried.", "authority", () => {
      state.systemTrust += 1;
      state.hp += 8;
      addLog("The battlefield stayed quiet.");
      checkAuthorityKey();
    })
  ]),

  event("currency_rain", "World", "Currency Rain", "Coins fall from a cloud with no sky above it.", 4, [
    choice("Gather them.", "merchant", () => {
      state.gold += 25;
      addLog("You collected currency that smelled like ozone.");
    }),
    choice("Look for the source.", "explore", () => {
      state.luck += 2;
      addLog("You found the pattern behind the rain.");
    })
  ]),

  event("quiet_fireflies", "World", "Quiet Fireflies", "Small lights drift over the ground. They blink in a pattern that resembles thought.", 4, [
    choice("Follow them.", "explore", () => {
      state.luck += 3;
      addLog("The lights led you around danger.");
    }),
    choice("Catch one.", "remember", () => {
      state.fragmentProgress += 1;
      state.hp -= 3;
      addLog("The light burned with a small memory.");
      checkFragmentKey();
    })
  ]),

  event("gate_sighting", "Gate", "The Gate in the Distance", "Between two ruined towers, you see the Gate again. It waits without moving closer.", 9, [
    choice("Go to the Gate.", "gate", () => {
      state.atGate = true;
      addLog("You returned to the Gate.");
    }),
    choice("Continue exploring.", "explore", () => {
      state.luck += 1;
      addLog("The Gate remained behind you.");
    })
  ], () => state.worldOpened)
];

function event(id, type, title, text, weight, choices, condition) {
  return { id, type, title, text, weight, choices, condition };
}

function choice(label, choiceType, effect) {
  return { label, choiceType, effect };
}

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function resetGame() {
  state = createInitialState();
  document.body.classList.remove("glitch");
  endingExtraEl.innerHTML = "";
  logListEl.innerHTML = "";
  updateUI();
  updatePanel();
  showScreen("game");
  loadEvent();
  
}

async function fetchQuote() {
  apiStatusEl.textContent = "Calling API...";

  try {
    const response = await fetch("https://cse2004.com/api/quotes/random");
    if (!response.ok) throw new Error("API failed");

    const data = await response.json();
    const text = data.text || "The outside signal arrived empty.";
    setOracleTag(text);
    apiStatusEl.textContent = "API connected";
    return `“${text}”`;
  } catch {
    state.oracleTag = "neutral";
    apiStatusEl.textContent = "API fallback used";
    return "“The outside signal failed. The Archive wrote its own message.”";
  }
}

function setOracleTag(text) {
  const lower = text.toLowerCase();

  if (lower.includes("danger") || lower.includes("risk") || lower.includes("fire")) {
    state.oracleTag = "danger";
    document.body.style.filter = "hue-rotate(10deg)";
  } else if (lower.includes("hope") || lower.includes("life") || lower.includes("change")) {
    state.oracleTag = "hope";
    document.body.style.filter = "hue-rotate(-10deg)";
  } else {
    state.oracleTag = "neutral";
    document.body.style.filter = "none";
  }
}

async function loadEvent() {
  if (state.hp <= 0) return endGame("death");

  if (state.hp <= 12 && !state.nearDeathTriggered) {
    state.nearDeathTriggered = true;
    state.luck += 3;
    state.fragmentProgress += 1;
    addLog("⚠️ Near death changed you. Luck rose, and a memory fragment surfaced.");
    checkFragmentKey();
  }

  if (state.day <= 6) {
    renderEvent(introEvents[state.day - 1], false);
    return;
  }

  if (state.day >= 11 && state.day % 10 === 1) {

  state.atGate = true;

  triggerGateCinematic(); // 🎬 演出

  renderEvent(createGateEvent(), false);

  return;

}

if (state.atGate) {

  renderEvent(createGateEvent(), false);

  return;

}

  const roll = Math.random();

  if (roll < 0.2) renderEvent(createCombatEvent(), true);
  else if (roll < 0.34) renderEvent(createCampfireEvent(), true);
  else if (roll < 0.46 && Math.random() < 0.32 + state.luck * 0.025) renderEvent(createLuckEvent(), true);
  else if (roll < 0.59) renderEvent(createMerchantEvent(), true);
  else renderEvent(chooseWeightedEvent(), true);
}

async function renderEvent(currentEvent, useApi) {
  choiceAreaEl.innerHTML = "";
  eventTypeEl.textContent = currentEvent.type || "Event";
  eventTitleEl.textContent = currentEvent.title;
  eventTextEl.textContent = currentEvent.text;

  quoteBoxEl.textContent = useApi ? await fetchQuote() : "“The Archive is listening.”";
  if (!useApi) apiStatusEl.textContent = "API ready";

  currentEvent.choices.forEach(currentChoice => {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.textContent = currentChoice.label;
    button.addEventListener("click", () => handleChoice(currentChoice));
    choiceAreaEl.appendChild(button);
  });
}

function handleChoice(currentChoice) {
  if (currentChoice.choiceType) trackEcho(currentChoice.choiceType);

  currentChoice.effect();

  state.hp = Math.min(state.maxHp, state.hp);
  state.gold = Math.max(0, state.gold);
  state.attack = Math.max(0, state.attack);
  state.luck = Math.max(0, state.luck);
  state.corruption = Math.max(0, state.corruption);
  state.systemTrust = Math.max(0, state.systemTrust);

  if (state.hp <= 0) {
    updateUI();
    setTimeout(() => endGame("death"), 400);
    return;
  }

  state.day++;
  updateUI();
  setTimeout(loadEvent, 450);
}

function chooseWeightedEvent() {
  const pool = explorationEvents.filter(e => !e.condition || e.condition());
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;

  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }

  return pool[0];
}

function createCombatEvent() {
  const enemy = getScaledEnemy();
  const projected = Math.max(1, enemy.damage - state.attack - getArmorBonus());

  return {
    type: "Combat",
    title: enemy.name,
    text: `${enemy.description}

Enemy Power: ${enemy.damage}
Your Attack: ${state.attack}
Estimated Damage if you fight: ${projected}
Gold Reward: ${enemy.reward}

Fight is reliable. Run builds luck. Risk attack can change the run.`,
    choices: [
      choice("Fight.", "fight", () => {
        let damage = Math.max(1, enemy.damage - state.attack - getArmorBonus());

        if (state.oracleTag === "danger") {
          damage += 2;
          addLog("The outside signal warned of danger. It was correct.");
        }

        if (Math.random() < state.luck * 0.035) {
          damage = Math.max(1, Math.floor(damage / 2));
          addLog("✨ Lucky break: incoming damage was reduced.");
        }

        state.hp -= damage;
        state.gold += enemy.reward;
        state.corruption += enemy.corruptionGain;

        addLog(`⚔️ ${enemy.name}: Enemy ${enemy.damage} vs Attack ${state.attack}. You lost ${damage} HP and gained ${enemy.reward} gold.`);
      }),
      choice("Run.", "avoid", () => {
        const chip = Math.max(0, Math.floor(enemy.damage * 0.2) - Math.floor(state.luck / 6));
        state.hp -= chip;
        state.luck += 2;
        addLog(`🏃 You escaped ${enemy.name}. You took ${chip} HP damage and gained luck.`);
      }),
      choice("Take the risky opening.", "fight", () => {
        if (Math.random() < 0.55 + state.luck * 0.012) {
          state.hp -= 1;
          state.gold += enemy.reward + 10;
          state.attack += 1;
          addLog(`⚡ Perfect risk: ${enemy.name} missed. You gained ${enemy.reward + 10} gold and +1 Attack.`);
          checkAttackMilestone();
        } else {
          const damage = Math.max(2, Math.floor((enemy.damage - getArmorBonus()) * 1.45));
          state.hp -= damage;
          addLog(`💥 Failed risk: ${enemy.name} punished you for ${damage} HP.`);
        }
      })
    ]
  };
}

function getScaledEnemy() {
  const t = enemies[Math.floor(Math.random() * enemies.length)];
  const difficulty = Math.floor((state.day - 1) / 4);
  const damage = Math.floor(t.baseDamage * Math.pow(t.scale, difficulty));
  const reward = Math.floor(t.goldReward * (1 + difficulty * 0.24));

  return {
    name: t.name,
    description: t.description,
    damage,
    reward,
    corruptionGain: t.name === "Null Entity" ? 2 : 1
  };
}

function getArmorBonus() {
  return state.attackMilestone ? 3 : 0;
}

function createCampfireEvent() {
  return {
    type: "Campfire",
    title: "Quiet Campfire",
    text: "A quiet flame burns in a place that should not support fire. It does not question your presence.",
    choices: [
      choice("Rest.", "rest", () => {
        state.hp += 32;
        addLog("The fire restored your body.");
      }),
      choice("Train.", "fight", () => {
        state.attack += 2;
        addLog("You practiced until the dark stepped back.");
        checkAttackMilestone();
      }),
      choice("Focus.", "authority", () => {
        state.luck += 2;
        state.systemTrust += 1;
        addLog("Your senses sharpened in the quiet.");
        checkAuthorityKey();
      })
    ]
  };
}

function createLuckEvent() {
  return {
    type: "Luck",
    title: "Lucky Break",
    text: "For once, the Archive makes a mistake in your favor.",
    choices: [
      choice("Accept it.", "explore", () => {
        let roll = Math.random();
        if (state.oracleTag === "hope") roll -= 0.15;

        if (roll < 0.25) {
          state.gold += 45;
          addLog("You found hidden resources.");
        } else if (roll < 0.5) {
          state.hp += 38;
          addLog("Your body recovered without explanation.");
        } else if (roll < 0.75) {
          state.attack += 3;
          addLog("A weapon appeared where your hand expected one.");
          checkAttackMilestone();
        } else {
          state.fragmentProgress += 1;
          addLog("A memory fragment fell from the air.");
          checkFragmentKey();
        }
      })
    ]
  };
}

function createMerchantEvent() {
  state.merchantVisits++;

  const choices = [
    choice("Buy healing.", "merchant", () => {
      if (state.gold >= 14) {
        state.gold -= 14;
        state.hp += 32;
        state.noBuyCount = 0;
        addLog("The merchant sold you something that healed like a lie.");
      } else {
        state.noBuyCount++;
        addLog("The merchant smiled at your empty hands.");
      }
    }),
    choice("Buy a weapon upgrade.", "merchant", () => {
      if (state.gold >= 20) {
        state.gold -= 20;
        state.attack += 3;
        state.noBuyCount = 0;
        addLog("The weapon upgrade felt older than the shop.");
        checkAttackMilestone();
      } else {
        state.noBuyCount++;
        addLog("The merchant tapped the counter and waited.");
      }
    }),
    choice("Buy a luck charm.", "merchant", () => {
      if (state.gold >= 16) {
        state.gold -= 16;
        state.luck += 3;
        state.noBuyCount = 0;
        addLog("The charm blinked once, like an eye.");
      } else {
        state.noBuyCount++;
        addLog("The merchant covered the charm with one hand.");
      }
    }),
    choice("Trade something personal.", "merchant", () => {
      if (!state.darkDealTaken) {
        state.darkDealTaken = true;
        state.hp -= 16;
        state.corruption += 5;
        state.gold += 42;
        addLog("The merchant bought something you cannot name anymore.");
      } else {
        state.corruption += 2;
        state.gold += 12;
        addLog("There was less of you left to sell.");
      }
    }),
    choice("Ask about the Gate.", "merchant", () => {
      state.luck += 1;
      state.noBuyCount++;
      addLog("He said he was not selling objects. He was selling exits.");
      if (state.merchantVisits >= 3) addLog("⚠️ The merchant is hiding something unusual.");
    }),
    choice("Leave without buying.", "avoid", () => {
      state.noBuyCount++;
      addLog("The merchant watched you leave with professional disappointment.");
    })
  ];

  if (state.merchantVisits >= 4 && !state.keys.override && !state.merchantRobbed && state.gold >= 60) {
    choices.push(choice("Buy the strange sigil.", "merchant", () => {
      state.gold -= 60;
      state.keys.override = true;
      state.corruption += 7;
      addLog("🔑 The Override Key did not enter your hand. It entered the page.");
    }));
  }

  if (state.noBuyCount >= 3 && !state.keys.override && !state.merchantRobbed) {
    choices.push(choice("Rob the merchant.", "fight", () => {
      state.merchantRobbed = true;
      const chance = Math.random() + state.luck * 0.03 + state.attack * 0.02;

      if (chance > 0.5) {
        state.keys.override = true;
        state.corruption += 9;
        state.hp -= 12;
        addLog("🔑 You stole the Override Key. The shop disappeared before the merchant screamed.");
      } else {
        state.hp -= 28;
        state.corruption += 4;
        addLog("The merchant was faster than he looked.");
      }
    }));
  }

  return {
    type: "Merchant",
    title: "The Glitched Merchant",
    text: "A merchant appears between two unfinished rooms. His inventory renders one item at a time.",
    choices
  };
}

function createGateEvent() {
  return {
    type: "Gate",
    title: "The Final Gate",
    text: `The Gate has four locks. It does not require all of them. It only requires proof that you changed.

Inserted Locks: ${countInsertedKeys()} / 3
Owned Keys: ${countOwnedKeys()} / 4

You may insert keys, return to exploration, or try to force the Gate with only two inserted locks.`,
    choices: [
      choice("Insert the Fragment Key.", "gate", () => insertKey("fragment", "The first lock remembered you.")),
      choice("Insert the Authority Key.", "gate", () => insertKey("authority", "The second lock recognized you.")),
      choice("Insert the Echo Key.", "gate", () => insertKey("echo", "The third lock repeated your name.")),
      choice("Insert the Override Key.", "gate", () => insertKey("override", "The fourth lock did not open. It broke.")),
      choice("Open the Gate.", "gate", () => {
        if (countInsertedKeys() >= 3) endGame("gate");
        else {
          state.hp -= 10;
          addLog("The Gate rejected your incomplete proof.");
        }
      }),
      choice("Force the Gate.", "gate", () => {
        const inserted = countInsertedKeys();

        if (inserted >= 3) {
          endGame("gate");
          return;
        }

        if (inserted === 2 && Math.random() < 0.55 + state.luck * 0.01) {
          state.corruption += 4;
          addLog("The Gate opened under pressure.");
          endGame("forced");
        } else {
          state.hp -= 26;
          state.corruption += 2;
          addLog("The Gate punished the attempt.");
        }
      }),
      choice("Return to exploration.", "explore", () => {
        state.atGate = false;
        addLog("You left the Gate behind.");
      })
    ]
  };
}

function insertKey(keyName, message) {
  if (!state.keys[keyName]) {
    state.hp -= 4;
    addLog("You reached for a key you did not have.");
    return;
  }

  if (state.insertedKeys[keyName]) {
    addLog("That lock has already turned.");
    return;
  }

  state.insertedKeys[keyName] = true;
  addLog(message);
}

function trackEcho(choiceType) {
  if (choiceType === state.lastChoiceType) state.echoProgress++;
  else state.echoProgress = Math.max(0, state.echoProgress - 1);

  state.lastChoiceType = choiceType;

  if (state.echoProgress === 3 && !state.keys.echo) {
    addLog("⚠️ Pattern detected. You feel like you have done this before.");
  }

  checkEchoKey();
}

function checkFragmentKey() {
  if (state.fragmentProgress === 2 && !state.keys.fragment) addLog("⚠️ A memory is almost complete.");

  if (!state.keys.fragment && state.fragmentProgress >= 3) {
    state.keys.fragment = true;
    addLog("🔑 The fragments aligned. The Fragment Key remembered you.");
  }
}

function checkAuthorityKey() {
  if (state.systemTrust >= 6 && !state.keys.authority) addLog("⚠️ The system is starting to recognize you.");

  if (!state.keys.authority && state.systemTrust >= 8 && state.corruption <= 8) {
    state.keys.authority = true;
    addLog("🔑 The system confirmed your identity. The Authority Key appeared.");
  }
}

function checkEchoKey() {
  if (!state.keys.echo && state.echoProgress >= 4) {
    state.keys.echo = true;
    addLog("🔑 Repetition became recognition. The Echo Key opened inside the loop.");
  }
}

function checkAttackMilestone() {
  if (!state.attackMilestone && state.attack >= 10) {
    state.attackMilestone = true;
    addLog("⚔️ Build milestone reached: incoming combat damage is reduced by 3.");
  }
}

function countOwnedKeys() {
  return Object.values(state.keys).filter(Boolean).length;
}

function countInsertedKeys() {
  return Object.values(state.insertedKeys).filter(Boolean).length;
}

function updateUI() {
  fragmentKeyEl.textContent = `Fragment Key: ${state.keys.fragment ? "✅" : "❌"}`;
  authorityKeyEl.textContent = `Authority Key: ${state.keys.authority ? "✅" : "❌"}`;
  echoKeyEl.textContent = `Echo Key: ${state.keys.echo ? "✅" : "❌"}`;
  overrideKeyEl.textContent = `Override Key: ${state.keys.override ? "✅" : "❌"}`;

  fragmentKeyEl.classList.toggle("owned", state.keys.fragment);
  authorityKeyEl.classList.toggle("owned", state.keys.authority);
  echoKeyEl.classList.toggle("owned", state.keys.echo);
  overrideKeyEl.classList.toggle("owned", state.keys.override);

  fragmentKeyEl.classList.toggle("inserted", state.insertedKeys.fragment);
  authorityKeyEl.classList.toggle("inserted", state.insertedKeys.authority);
  echoKeyEl.classList.toggle("inserted", state.insertedKeys.echo);
  overrideKeyEl.classList.toggle("inserted", state.insertedKeys.override);

  gateProgressEl.textContent = `Gate progress: ${countInsertedKeys()} / 3 | Owned keys: ${countOwnedKeys()} / 4 | Day ${state.day}`;

  updateGoalHint();
  updatePanel();
}

function updateGoalHint() {
  if (!state.keys.fragment) goalHintEl.textContent = "Hint: Memory events can reconstruct the Fragment Key.";
  else if (!state.keys.authority) goalHintEl.textContent = "Hint: System Trust and low corruption can unlock the Authority Key.";
  else if (!state.keys.echo) goalHintEl.textContent = "Hint: Repetition reveals the Echo Key.";
  else goalHintEl.textContent = "Find the Gate. Insert any three keys.";
}

function addLog(message) {
  const fullMessage = `Day ${state.day}: ${message}`;
  state.log.unshift(fullMessage);

  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = fullMessage;
  logListEl.prepend(item);
}

function endGame(reason) {
  showScreen("end");
  endingExtraEl.innerHTML = "";

  if (reason === "death" || state.hp <= 0) {
    endingTitleEl.textContent = "Death Ending: Body Failure";
    endingTextEl.textContent = "Your body failed before your identity did. The Archive does not remember the dead. It only stores the unfinished.";
    return;
  }

  if (state.keys.override && state.insertedKeys.override) {
    document.body.classList.add("glitch");
    endingTitleEl.textContent = "Hidden Ending: Outside the Page";
    endingTextEl.textContent = "The Override Key did not open the Gate. It opened the interface. The Archive stops speaking to your character and starts speaking to you. The system requests visual confirmation.";

    const btn = document.createElement("button");
    btn.className = "primary-btn";
    btn.textContent = "Allow Visual Confirmation";
    btn.addEventListener("click", startCameraEnding);
    endingExtraEl.appendChild(btn);
    return;
  }

  if (countInsertedKeys() < 3 && reason !== "forced") {
    endingTitleEl.textContent = "Bad Ending: Archived";
    endingTextEl.textContent = "Your data has been successfully stored. The Archive closes your file without ceremony. You will not be accessed again.";
    return;
  }

  if (state.keys.fragment && state.keys.authority && state.systemTrust >= 9) {
    endingTitleEl.textContent = "Conspiracy Ending: Approved Escape";
    endingTextEl.textContent = "The Gate opens before you touch it. You escaped, but the system did not lose you. It approved the route, measured the outcome, and moved you somewhere cleaner.";
    return;
  }

  if (reason === "forced") {
    endingTitleEl.textContent = "Forced Ending: Breach";
    endingTextEl.textContent = "You forced the Gate open with incomplete proof. The outside accepted you, but The Archive kept the shape of your absence.";
    return;
  }

  if (state.corruption <= 8) {
    endingTitleEl.textContent = "Good Ending: Reconstructed";
    endingTextEl.textContent = "The system recognizes you. The fragments settle into a name, and the Gate opens. For the first time, the outside feels real.";
    return;
  }

  endingTitleEl.textContent = "Uneasy Ending: Escape Without Self";
  endingTextEl.textContent = "You escaped The Archive, but something came with you. It answers when your name is called.";
}

function updatePanel() {
  if (!state) return;

  const items = [
    ["HP", `${state.hp} / ${state.maxHp}`],
    ["Gold", state.gold],
    ["Attack", state.attack],
    ["Luck", state.luck],
    ["Corruption", state.corruption],
    ["System Trust", state.systemTrust],
    ["Day", state.day],
    ["Oracle Signal", state.oracleTag],
    ["Fragment Progress", `${state.fragmentProgress} / 3`],
    ["Echo Pattern", `${state.echoProgress} / 4`],
    ["Owned Keys", `${countOwnedKeys()} / 4`],
    ["Inserted Locks", `${countInsertedKeys()} / 3`]
  ];

  panelGrid.innerHTML = items.map(([label, value]) => `
    <div class="panel-item">${label}<span>${value}</span></div>
  `).join("");
}

async function startCameraEnding() {
  const layer = document.querySelector("#camera-layer");
  const video = document.querySelector("#camera-video");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    layer.classList.remove("hidden");
    document.body.classList.add("glitch");
  } catch {
    endingTextEl.textContent = "Camera access was denied. The Archive cannot confirm the subject, but it knows someone is still watching.";
  }
}

function initStarfield() {
  const canvas = document.querySelector("#starfield");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      v: Math.random() * 0.35 + 0.08
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(147, 197, 253, 0.55)";

    particles.forEach(p => {
      p.y += p.v;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

function startMusic() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const master = audioCtx.createGain();
  master.gain.value = 0.045;
  master.connect(audioCtx.destination);

  const notes = [110, 146.83, 164.81, 220];

  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = i % 2 === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;

    filter.type = "lowpass";
    filter.frequency.value = 600;

    gain.gain.value = 0.08 / notes.length;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();

    musicNodes.push({ osc, gain });
  });
}

// ===== Gate Cinematic =====
function triggerGateCinematic() {

  // 黑暗压迫
  document.body.style.transition = "all 0.6s ease";
  document.body.style.filter = "brightness(0.35) contrast(1.4)";

  // glitch
  document.body.classList.add("glitch");

  // 音乐降调
  if (audioCtx) {
    musicNodes.forEach(node => {
      node.osc.frequency.setTargetAtTime(
        node.osc.frequency.value * 0.6,
        audioCtx.currentTime,
        0.5
      );
    });
  }

  // 短暂停顿感（更电影）
  setTimeout(() => {
    document.body.style.filter = "brightness(0.5)";
  }, 300);

  // 恢复
  setTimeout(() => {
    document.body.classList.remove("glitch");
    document.body.style.filter = "none";
  }, 2200);
}



function toggleMusic() {
  musicOn = !musicOn;
  musicBtn.textContent = musicOn ? "Music: On" : "Music: Off";

  if (!audioCtx) return;

  musicNodes.forEach(node => {
    node.gain.gain.setTargetAtTime(musicOn ? 0.02 : 0, audioCtx.currentTime, 0.05);
  });
}

startBtn.addEventListener("click", () => {
  startMusic();
  resetGame();
});

restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);
musicBtn.addEventListener("click", toggleMusic);

avatarBtn.addEventListener("click", () => {
  updatePanel();
  statusPanel.classList.remove("hidden");
});

closePanelBtn.addEventListener("click", () => {
  statusPanel.classList.add("hidden");
});

statusPanel.addEventListener("click", e => {
  if (e.target === statusPanel) statusPanel.classList.add("hidden");
});

document.addEventListener("mousemove", e => {
  const x = (e.clientX / window.innerWidth - 0.5) * 8;
  const y = (e.clientY / window.innerHeight - 0.5) * 8;
  avatarBtn.style.transform = `translate(${x}px, ${y}px)`;
});

initStarfield();