/******************************************** 
 *              GLOBALA VARIABLER           *
 ********************************************/
const suits = ["\u2665", "\u2666", "\u2663", "\u2660"]; // ♥, ♦, ♣, ♠
const ranks = [
    { value: 1, display: "A" },   // Ess = 1 (men i stickfas räknas det som 14)
    { value: 2, display: "2" },
    { value: 3, display: "3" },
    { value: 4, display: "4" },
    { value: 5, display: "5" },
    { value: 6, display: "6" },
    { value: 7, display: "7" },
    { value: 8, display: "8" },
    { value: 9, display: "9" },
    { value: 10, display: "10" },
    { value: 11, display: "J" },
    { value: 12, display: "Q" },
    { value: 13, display: "K" },
];

let deck = [];
let players = [];
const numPlayers = 4;
const cardsPerPlayer = 5;

let tradeCount = 0;          // Hur många byten har gjorts (max 3)
const maxTrades = 3;         // 3 byten innan stickfas
let trickNumber = 1;         // 1-5
let currentTrickLeader = 0;  // vem som spelar först i sticket

// HTML-element
const statusDiv = document.getElementById("status");
const scoreboardDiv = document.getElementById("scoreboard");
const playersContainer = document.getElementById("players-container");
const logDiv = document.getElementById("log");
const startRoundBtn = document.getElementById("start-round-btn");

/********************************************
 *            INITIERING / START            *
 ********************************************/

// Initiera spelare första gången
function initPlayers() {
    players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({
            id: i,
            name: i === 0 ? "Du" : "CPU " + i,
            hand: [],
            score: 0,      // totalpoäng i spelet
            tricksWon: 0,  // antal tagna stick i denna runda
        });
    }
}

// Återställ händer, stickinfo etc. men behåll score
function resetPlayersForNewRound() {
    players.forEach(p => {
        p.hand = [];
        p.tricksWon = 0;
    });
    trickNumber = 1;
    currentTrickLeader = 0;
    tradeCount = 0;
}

/********************************************
 *            STARTA EN NY RUNDA            *
 ********************************************/
startRoundBtn.addEventListener("click", startNewRound);

function startNewRound() {
    if (players.length === 0) {
        initPlayers();
    }

    clearLog();
    updateStatus("Ny runda startad!");
    resetPlayersForNewRound();
    renderScoreboard();

    deck = createDeck();
    shuffleDeck(deck);

    dealCards();
    renderPlayers();

    updateStatus("Byten startar. Du får byta upp till 3 gånger.");
    tradePhase();
}

/********************************************
 *            LEK: SKAPA OCH BLANDA         *
 ********************************************/
function createDeck() {
    const d = [];
    for (let s of suits) {
        for (let r of ranks) {
            d.push({
                suit: s,
                value: r.value,
                display: r.display,
            });
        }
    }
    return d;
}

function shuffleDeck(d) {
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

function drawCard() {
    if (deck.length === 0) {
        appendLog("Leken är slut - inget kort kan dras.");
        updateStatus("Leken är slut - kan inte dra fler kort.");
        return null;
    }
    const card = deck.pop();
    appendLog(`Kort kvar i leken: ${deck.length}`);
    return card;
}

function dealCards() {
    const totalNeeded = numPlayers * cardsPerPlayer;
    if (deck.length < totalNeeded) {
        updateStatus("Kortleken räcker inte för att dela ut nya händer! Avbryter.");
        return;
    }
    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let p of players) {
            const c = drawCard();
            if (c) p.hand.push(c);
        }
    }
}

/********************************************
 *              BYTEFAS (3 GÅNGER)          *
 ********************************************/
function tradePhase() {
    if (tradeCount >= maxTrades) {
        updateStatus("Alla byten klara. Dags för stickfas.");
        awardPointsToBestHand();
        startTrickPhase();
        return;
    }

    updateStatus(`Byte nr ${tradeCount + 1} (0-5 kort).`);
    showTradeUIForPlayer(players[0]); // Människan
}

// Visa trade UI för spelaren
function showTradeUIForPlayer(player) {
    if (player.id !== 0) return;
    const area = document.getElementById(`player-area-${player.id}`);
    const tradeBtn = document.createElement("button");
    tradeBtn.textContent = "Byt Valda Kort (0-5)";
    tradeBtn.onclick = () => {
        const selectedCards = document.querySelectorAll(
            `#player-area-${player.id} .card.selected`
        );
        const numSelected = selectedCards.length;
        if (numSelected > 5) {
            updateStatus("Du kan max byta 5 kort åt gången!");
            return;
        }

        if (numSelected === 1) {
            const cardEl = selectedCards[0];
            const index = Number(cardEl.getAttribute("data-index"));
            player.hand.splice(index, 1);

            const openCard = drawCard();
            if (!openCard) {
                updateStatus("Leken är slut, du får inget ersättningskort.");
                removeElement(tradeBtn);
                renderPlayers();
                cpuTradePhase(1);
                return;
            }
            updateStatus(`Du drog ett öppet kort: ${openCard.display}${openCard.suit}`);
            renderPlayers();
            showOpenCardChoice(player, openCard, tradeBtn);
            return;
        }

        let replacedCount = 0;
        selectedCards.forEach(cardEl => {
            const index = Number(cardEl.getAttribute("data-index"));
            player.hand[index] = null;
        });

        for (let i = 0; i < player.hand.length; i++) {
            if (player.hand[i] === null) {
                const newCard = drawCard();
                if (newCard) {
                    player.hand[i] = newCard;
                    replacedCount++;
                } else {
                    updateStatus("Leken tog slut, vissa kort byttes inte.");
                    player.hand[i] = {}; // Placeholder
                }
            }
        }
        updateStatus(`Du bytte ${numSelected} kort. Faktiskt ersatta: ${replacedCount}`);
        removeElement(tradeBtn);
        renderPlayers();
        cpuTradePhase(1);
    };

    area.appendChild(tradeBtn);
}

// Hantera valet av öppet kort
function showOpenCardChoice(player, openCard, tradeBtn) {
    const area = document.getElementById(`player-area-${player.id}`);
    const choiceDiv = document.createElement("div");

    const takeBtn = document.createElement("button");
    takeBtn.textContent = "Ta öppna kortet";
    takeBtn.onclick = () => {
        player.hand.push(openCard);
        updateStatus("Du tog det öppna kortet.");
        finishOneCardTrade(player, tradeBtn, choiceDiv);
    };

    const denyBtn = document.createElement("button");
    denyBtn.textContent = "Neka öppna kortet";
    denyBtn.onclick = () => {
        const hiddenCard = drawCard();
        if (!hiddenCard) {
            updateStatus("Du nekade öppna kortet men leken tog slut. Inget nytt kort.");
        } else {
            updateStatus(`Du fick istället ${hiddenCard.display}${hiddenCard.suit} (stängt).`);
            player.hand.push(hiddenCard);
        }
        finishOneCardTrade(player, tradeBtn, choiceDiv);
    };

    choiceDiv.appendChild(takeBtn);
    choiceDiv.appendChild(denyBtn);
    area.appendChild(choiceDiv);
}

// Avsluta trade för en kortbyte
function finishOneCardTrade(player, tradeBtn, choiceDiv) {
    removeElement(choiceDiv);
    removeElement(tradeBtn);
    renderPlayers();
    cpuTradePhase(1);
}

// Hantera CPU-bytet
function cpuTradePhase(cpuIndex) {
    if (cpuIndex >= players.length) {
        tradeCount++;
        if (tradeCount >= maxTrades) {
            awardPointsToBestHand();
            startTrickPhase();
            return;
        }
        tradePhase();
        return;
    }
    const cpu = players[cpuIndex];
    if (cpu.id === 0) {
        cpuTradePhase(cpuIndex + 1);
        return;
    }

    const toChange = Math.floor(Math.random() * 6);
    if (toChange === 0) {
        updateStatus(`${cpu.name} byter inga kort.`);
        cpuTradePhase(cpuIndex + 1);
        return;
    }

    const indices = [];
    while (indices.length < toChange) {
        const r = Math.floor(Math.random() * cpu.hand.length);
        if (!indices.includes(r)) indices.push(r);
    }

    if (toChange === 1) {
        const idx = indices[0];
        cpu.hand.splice(idx, 1);
        const openCard = drawCard();
        if (!openCard) {
            updateStatus(`${cpu.name} skulle dra 1 öppet kort men leken är slut.`);
            renderPlayers();
            setTimeout(() => cpuTradePhase(cpuIndex + 1), 800);
            return;
        }
        const willTake = Math.random() < 0.5;
        if (willTake) {
            cpu.hand.push(openCard);
            updateStatus(`${cpu.name} byter 1 kort (tar öppna kortet).`);
        } else {
            const hiddenCard = drawCard();
            if (!hiddenCard) {
                updateStatus(`${cpu.name} nekade öppna kortet men leken är slut.`);
            } else {
                cpu.hand.push(hiddenCard);
                updateStatus(`${cpu.name} byter 1 kort (nekar öppna kortet).`);
            }
        }
    } else {
        let replacedCount = 0;
        indices.forEach(i => {
            cpu.hand[i] = null;
        });
        indices.forEach(i => {
            const drawn = drawCard();
            if (drawn) {
                cpu.hand[i] = drawn;
                replacedCount++;
            } else {
                cpu.hand[i] = {};
            }
        });
        updateStatus(`${cpu.name} ville byta ${toChange} kort. Faktiskt bytta: ${replacedCount}.`);
    }

    renderPlayers();
    setTimeout(() => cpuTradePhase(cpuIndex + 1), 800);
}

/********************************************
 *         POKERPOÄNG & BÄSTA HAND          *
 ********************************************/
function awardPointsToBestHand() {
    const handPoints = players.map(p => {
        return { player: p, points: getPokerHandPoints(p.hand) };
    });
    handPoints.sort((a, b) => b.points - a.points);
    const best = handPoints[0];
    const second = handPoints[1];

    if (best.points === 0) {
        updateStatus("Ingen hade någon värdig pokerkombination (0 p).");
        return;
    }
    if (best.points === second.points) {
        updateStatus(`Flera delade förstaplatsen med ${best.points} p. Ingen får poäng.`);
        return;
    }
    best.player.score += best.points;
    updateStatus(`${best.player.name} hade bästa hand och får ${best.points} poäng!`);
    renderScoreboard();
}

/**
 * Returnerar en siffra enligt tabell (förenklad):
 *  1 par => 1p
 *  2 par => 2p
 *  3 lika (triss) => 3p
 *  Stege => 4p
 *  Färg => 5p
 *  Kåk => 8p
 *  Fyrtal => 10p
 *  Färgstege => 15p
 *  Royal Färgstege => 25p
 *  Annars => 0p
 */
function getPokerHandPoints(hand) {
    const cleanedHand = hand.filter(c => c && c.suit && c.value);
    if (cleanedHand.length < 5) {
        return 0;
    }
    let sorted = [...cleanedHand].sort((a, b) => b.value - a.value); // Descending sort
    let values = sorted.map(c => c.value);
    let altValues = sorted.map(c => (c.value === 1 ? 14 : c.value)).sort((a, b) => b - a); // Descending

    let suitsInHand = sorted.map(c => c.suit);

    function isFlush() {
        return suitsInHand.every(s => s === suitsInHand[0]);
    }
    function isStraight(vals) {
        for (let i = 0; i < vals.length - 1; i++) {
            if (vals[i] !== vals[i + 1] + 1) return false;
        }
        return true;
    }

    const freq = {};
    for (let v of values) {
        freq[v] = (freq[v] || 0) + 1;
    }
    const counts = Object.values(freq).sort((a, b) => b - a);

    const hasFlush = isFlush();
    const hasStraightA = isStraight(values);
    const hasStraightB = isStraight(altValues);

    function isRoyal(vals) {
        return JSON.stringify(vals) === JSON.stringify([14, 13, 12, 11, 10]); // Descending order
    }

    if (hasFlush && hasStraightA && isRoyal(values)) return 25; // Royal färgstege
    if (hasFlush && (hasStraightA || hasStraightB)) return 15; // Färgstege
    if (counts[0] === 4) return 10; // Fyrtal
    if (counts[0] === 3 && counts[1] === 2) return 8;  // Kåk
    if (hasFlush) return 5;  // Färg
    if (hasStraightA || hasStraightB) return 4;  // Stege
    if (counts[0] === 3) return 3;  // Triss
    if (counts[0] === 2 && counts[1] === 2) return 2;  // 2 par
    if (counts[0] === 2) return 1;  // 1 par
    return 0;
}

/********************************************
 *               STICKFAS (5 STICK)         *
 ********************************************/
function startTrickPhase() {
    updateStatus("STICKFAS startar - 5 stick ska spelas.");
    trickNumber = 1;
    currentTrickLeader = 0;
    playTrick();
}

function playTrick() {
    if (trickNumber > 5) {
        endOfRound();
        return;
    }
    updateStatus(`Stick ${trickNumber} - dags att spela kort`);

    let ledSuit = null;
    const turnOrder = getPlayersInOrder(currentTrickLeader);
    const plays = [];
    let turnIndex = 0;

    const nextPlayer = () => {
        if (turnIndex >= turnOrder.length) {
            // Alla har spelat => avgör
            const winnerPlay = determineTrickWinner(plays, ledSuit);
            winnerPlay.player.tricksWon++;
            updateStatus(`Sticket vinns av ${winnerPlay.player.name}`);
            currentTrickLeader = winnerPlay.player.id;
            trickNumber++;
            setTimeout(playTrick, 1000);
            return;
        }
        const pl = turnOrder[turnIndex];
        turnIndex++;

        highlightActivePlayer(pl.id);

        if (pl.id === 0) {
            // Människans tur
            showTrickPlayOptions(pl, ledSuit, chosenCard => {
                plays.push({ player: pl, card: chosenCard });
                if (!ledSuit) ledSuit = chosenCard.suit;
                removeCardFromHand(pl, chosenCard);
                renderPlayers();
                unHighlightActivePlayer(pl.id);
                nextPlayer();
            });
        } else {
            // CPU:s tur
            const cCard = chooseCpuCard(pl, ledSuit);
            plays.push({ player: pl, card: cCard });
            if (!ledSuit) ledSuit = cCard.suit;
            removeCardFromHand(pl, cCard);
            updateStatus(`${pl.name} spelar ${cCard.display}${cCard.suit}`);
            renderPlayers();
            unHighlightActivePlayer(pl.id);
            setTimeout(nextPlayer, 700);
        }
    };
    nextPlayer();
}

// Färg tvång: om man kan följa färg ska man göra det
function showTrickPlayOptions(player, ledSuit, callback) {
    updateStatus(`${player.name}, välj ett kort att spela`);

    const cardEls = document.querySelectorAll(`#player-area-${player.id} .card`);
    const validIndices = getValidIndicesForSuit(player.hand, ledSuit);

    cardEls.forEach(cardEl => {
        const idx = Number(cardEl.getAttribute("data-index"));
        if (!validIndices.includes(idx)) {
            cardEl.style.opacity = 0.3;
            cardEl.style.cursor = "not-allowed";
            cardEl.onclick = null;
        } else {
            cardEl.style.opacity = 1;
            cardEl.style.cursor = "pointer";
            cardEl.onclick = () => {
                const chosenCard = player.hand[idx];
                updateStatus(`${player.name} spelar ${chosenCard.display}${chosenCard.suit}`);
                cardEls.forEach(el => {
                    el.onclick = null;
                    el.style.opacity = 1;
                });
                callback(chosenCard);
            };
        }
    });
}

// CPU väljer slumpmässigt men följer färg om möjligt
function chooseCpuCard(cpuPlayer, ledSuit) {
    const valid = getValidIndicesForSuit(cpuPlayer.hand, ledSuit);
    if (valid.length === 0) {
        const r = Math.floor(Math.random() * cpuPlayer.hand.length);
        return cpuPlayer.hand[r];
    } else {
        const r = Math.floor(Math.random() * valid.length);
        return cpuPlayer.hand[valid[r]];
    }
}

function getValidIndicesForSuit(hand, ledSuit) {
    if (!ledSuit) return hand.map((_, i) => i);
    const suitIndices = hand
        .map((c, i) => (c.suit === ledSuit ? i : -1))
        .filter(i => i !== -1);
    if (suitIndices.length > 0) {
        return suitIndices;
    }
    // Saknar färgen
    return hand.map((_, i) => i);
}

// Hitta vinnare av sticket (högsta value i ledSuit, ess=14)
function determineTrickWinner(plays, ledSuit) {
    let winnerPlay = plays[0];
    for (let i = 1; i < plays.length; i++) {
        const p = plays[i];
        const wCard = winnerPlay.card;
        const cCard = p.card;
        const wValue = (wCard.value === 1 ? 14 : wCard.value);
        const cValue = (cCard.value === 1 ? 14 : cCard.value);

        if (cCard.suit === ledSuit && wCard.suit !== ledSuit) {
            winnerPlay = p;
        } else if (cCard.suit === ledSuit && wCard.suit === ledSuit) {
            if (cValue > wValue) {
                winnerPlay = p;
            }
        }
    }
    return winnerPlay;
}

function removeCardFromHand(player, card) {
    const idx = player.hand.findIndex(c => c.suit === card.suit && c.value === card.value);
    if (idx !== -1) {
        player.hand.splice(idx, 1);
    }
}

/********************************************
 *       NÄR ALLA 5 STICK SPELATS KLART      *
 ********************************************/
function endOfRound() {
    updateStatus("Stickfas slut! Summerar stick...");
    const winner = players.find(p => p.score >= 52);
    if (winner) {
        updateStatus(`SPELET ÄR SLUT! ${winner.name} når 52 poäng och vinner!`);
        startRoundBtn.disabled = true;
    } else {
        updateStatus("Runda klar! Klicka på Starta Ny Runda för nästa.");
    }
}

/********************************************
 *               HJÄLPFUNKTIONER            *
 ********************************************/

/**
 * Sorterar en spelares hand i descending ordning.
 */
function sortHandDescending(hand) {
    const suitOrder = {
        "\u2660": 4, // ♠
        "\u2665": 3, // ♥
        "\u2666": 2, // ♦
        "\u2663": 1, // ♣
    };
    hand.sort((a, b) => {
        if (a.value === b.value) {
            return suitOrder[b.suit] - suitOrder[a.suit];
        }
        return b.value - a.value; // Descending
    });
}

function getPlayersInOrder(startId) {
    const arr = [];
    for (let i = 0; i < players.length; i++) {
        arr.push(players[(startId + i) % players.length]);
    }
    return arr;
}

// Uppdaterar statusområdet
function updateStatus(msg) {
    if (!statusDiv) return;
    statusDiv.textContent = msg;
}

// Loggen får fortfarande existera om man vill se detaljer
function appendLog(msg) {
    if (!logDiv) return;
    logDiv.innerHTML += msg + "<br/>";
    logDiv.scrollTop = logDiv.scrollHeight;
}

function clearLog() {
    if (!logDiv) return;
    logDiv.innerHTML = "";
}

// Markera spelare som aktiv
function highlightActivePlayer(playerId) {
    const area = document.getElementById(`player-area-${playerId}`);
    if (area) {
        area.classList.add("active-player");
    }
}

function unHighlightActivePlayer(playerId) {
    const area = document.getElementById(`player-area-${playerId}`);
    if (area) {
        area.classList.remove("active-player");
    }
}

// Renderar scoreboard
function renderScoreboard() {
    if (!scoreboardDiv) return;
    scoreboardDiv.innerHTML = "";
    players.forEach(p => {
        const div = document.createElement("div");
        div.classList.add("score-item");
        div.textContent = `${p.name}: ${p.score} p`;
        scoreboardDiv.appendChild(div);
    });
}

/**
 * Ritar spelarna och deras (sorterade) kort.
 */
function renderPlayers() {
    if (!playersContainer) return;
    playersContainer.innerHTML = "";
    players.forEach(p => {
        // SORTERA I DESCENDING ORDNING
        sortHandDescending(p.hand);

        const pDiv = document.createElement("div");
        pDiv.classList.add("player-area");
        pDiv.id = `player-area-${p.id}`;

        const h2 = document.createElement("h2");
        h2.textContent = p.name;
        pDiv.appendChild(h2);

        const cardsDiv = document.createElement("div");
        cardsDiv.classList.add("cards-container");

        p.hand.forEach((card, idx) => {
            const isBack = (p.id !== 0);
            const cEl = createCardElement(card, idx, isBack, p.id);
            cardsDiv.appendChild(cEl);
        });

        pDiv.appendChild(cardsDiv);

        const stInfo = document.createElement("p");
        stInfo.textContent = `Stick: ${p.tricksWon}`;
        pDiv.appendChild(stInfo);

        playersContainer.appendChild(pDiv);
    });
    renderScoreboard();
}

/**
 * Skapar ett "kort-element" med fyra färger.
 */
function createCardElement(card, index, isBack, ownerId) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card");
    cardEl.setAttribute("data-index", index);

    // Välj färgklass beroende på suit (fyrafärgslayout)
    if (card.suit === "\u2660") {
        cardEl.classList.add("spade");
    } else if (card.suit === "\u2665") {
        cardEl.classList.add("heart");
    } else if (card.suit === "\u2666") {
        cardEl.classList.add("diamond");
    } else if (card.suit === "\u2663") {
        cardEl.classList.add("club");
    }

    if (isBack) {
        // CPU-kort visas med baksida
        cardEl.classList.add("back");
    } else {
        if (card && card.display && card.suit) {
            cardEl.textContent = card.display + card.suit;
        } else {
            // Om kortet är "tomt" ({}), visa t.ex. ?? eller tomt
            cardEl.textContent = "??";
            cardEl.classList.add("unknown");
        }
    }

    // Om det är människans tur att byta kort
    if (!isBack && ownerId === 0 && tradeCount < maxTrades) {
        cardEl.onclick = () => {
            cardEl.classList.toggle("selected");
        };
    }

    return cardEl;
}

function removeElement(el) {
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}
