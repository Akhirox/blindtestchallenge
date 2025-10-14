// --- CONFIGURATION ---
const API_URL = 'https://blindtestchallenge.onrender.com';
const ROUND_DURATION = 30;
const ANSWER_SCREEN_DURATION = 5000;

// --- ÉLÉMENTS HTML ---
const audioPlayer = document.getElementById('audio-player');
const answerInput = document.getElementById('answer-input');
const submitButton = document.getElementById('submit-btn');
const livesDisplay = document.getElementById('lives-display');
const heartsDisplay = document.getElementById('hearts-display');
const volumeSlider = document.getElementById('volume-slider');
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const startGameBtn = document.getElementById('start-game-btn');
const timerDisplay = document.getElementById('timer-display');
const artistFeedback = document.getElementById('artist-feedback');
const titleFeedback = document.getElementById('title-feedback');
const answerScreen = document.getElementById('answer-screen');
const correctAnswerDisplay = document.getElementById('correct-answer-display');
const roundSummaryMessage = document.getElementById('round-summary-message');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
// Nouveaux éléments pour les filtres et le contenu du round
const roundContent = document.getElementById('round-content');
const decadesFiltersDiv = document.getElementById('decades-filters');
const genresFiltersDiv = document.getElementById('genres-filters');


// --- VARIABLES DU JEU ---
let lives = 3, heartFragments = 0, roundsSurvived = 0;
let cleanArtist = '', cleanTitle = '';
let normalizedArtist = '', normalizedTitle = '';
let artistIsFound = false, titleIsFound = false;
let roundTimer, timeLeft = ROUND_DURATION;
let currentFilters = ''; // Stockera les filtres pour la partie en cours

// --- FONCTIONS UTILITAIRES ---

function normalizeString(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

function isSimilar(userInput, correctAnswer) {
    const userWords = userInput.split(' ');
    const correctWords = correctAnswer.split(' ');
    const tolerance = 1;

    return correctWords.every(correctWord =>
        userWords.some(userWord => levenshtein(userWord, correctWord) <= tolerance)
    );
}


// --- FONCTIONS DU JEU ---

function updateUI() {
    livesDisplay.textContent = lives;
    heartsDisplay.textContent = `${heartFragments}/5`;
    timerDisplay.textContent = timeLeft;
    artistFeedback.textContent = `Artiste: ${artistIsFound ? '✅' : '❌'}`;
    titleFeedback.textContent = `Titre: ${titleIsFound ? '✅' : '❌'}`;
}

function showGameOver() {
    gameContainer.style.display = 'none';
    answerScreen.style.display = 'none';
    finalScoreDisplay.textContent = roundsSurvived;
    gameOverScreen.style.display = 'block';
}

function stopTimer() {
    clearInterval(roundTimer);
}

function endRound() {
    stopTimer();
    audioPlayer.pause();
    let summary = '';

    if (artistIsFound && titleIsFound) {
        summary = "Bravo ! Vous avez gagné un fragment de cœur !";
        heartFragments++;
        if (heartFragments >= 5) {
            lives++;
            heartFragments = 0;
            summary += " Vous gagnez une vie supplémentaire !";
        }
    } else if (artistIsFound || titleIsFound) {
        summary = "Vous n'avez pas perdu de vie.";
    } else {
        lives--;
        summary = `Vous perdez une vie. Vies restantes : ${lives}`;
    }
    
    updateUI();

    if (lives <= 0) {
        showGameOver();
        return;
    }

    correctAnswerDisplay.textContent = `${cleanArtist} - ${cleanTitle}`;
    roundSummaryMessage.textContent = summary;
    roundContent.style.display = 'none'; // On cache juste le contenu du round
    answerScreen.style.display = 'block';

    setTimeout(() => {
        answerScreen.style.display = 'none';
        roundContent.style.display = 'block'; // On réaffiche le contenu
        startRound();
    }, ANSWER_SCREEN_DURATION);
}

function startTimer() {
    timeLeft = ROUND_DURATION;
    updateUI();
    roundTimer = setInterval(() => {
        timeLeft--;
        updateUI();
        if (timeLeft <= 0) {
            endRound();
        }
    }, 1000);
}

async function startRound() {
    roundsSurvived++;
    answerInput.value = '';
    answerInput.focus();
    artistIsFound = false;
    titleIsFound = false;
    
    try {
        const response = await fetch(`${API_URL}/random-song?${currentFilters}`);
        if (!response.ok) {
            // Gère le cas où aucun titre ne correspond aux filtres
            if(response.status === 404) throw new Error('404');
            else throw new Error('Erreur réseau');
        }
        const song = await response.json();
        
        const parts = song.fileName.replace('musiques/', '').split('_');
        
        if (parts.length < 2) {
            console.error(`Fichier mal nommé détecté et ignoré : ${song.fileName}`);
            startRound();
            return;
        }

        cleanArtist = parts[0].replace(/-/g, ' ');
        cleanTitle = parts[1].replace(/-/g, ' ');
        normalizedArtist = normalizeString(cleanArtist);
        normalizedTitle = normalizeString(cleanTitle);

        console.log(`Réponse cachée -> Artiste: ${cleanArtist}, Titre: ${cleanTitle}`);

        audioPlayer.src = song.url;
        audioPlayer.play();
        startTimer();

    } catch (error) {
        if (error.message === '404') {
             alert("Aucune chanson ne correspond à vos filtres. Veuillez élargir votre sélection.");
             window.location.reload();
        } else {
            console.error("Impossible de charger la chanson:", error);
            alert("Erreur de chargement.");
        }
    }
}

function checkAnswer() {
    if (lives <= 0) return;
    const userAnswer = normalizeString(answerInput.value);
    if (userAnswer.length === 0) return;

    if (!artistIsFound && isSimilar(userAnswer, normalizedArtist)) artistIsFound = true;
    if (!titleIsFound && isSimilar(userAnswer, normalizedTitle)) titleIsFound = true;
    
    updateUI();
    answerInput.value = '';
    answerInput.focus();

    if (artistIsFound && titleIsFound) {
        endRound();
    }
}

async function populateFilters() {
    try {
        const response = await fetch(`${API_URL}/metadata`);
        if (!response.ok) throw new Error('Impossible de charger les métadonnées');
        const { decades, genres } = await response.json();
        
        decadesFiltersDiv.innerHTML = '<strong>Décennies:</strong> ' + decades.map(d => `<label><input type="checkbox" name="decade" value="${d}"> ${d}s</label>`).join('');
        genresFiltersDiv.innerHTML = '<strong>Genres:</strong> ' + genres.map(g => `<label><input type="checkbox" name="genre" value="${g}"> ${g}</label>`).join('');
    } catch (error) {
        console.error("Impossible de charger les filtres:", error);
        document.getElementById('filter-container').innerHTML = "<p>Impossible de charger les options de filtre.</p>";
    }
}


// --- ÉCOUTEURS D'ÉVÉNEMENTS ---
submitButton.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') checkAnswer(); });

startGameBtn.addEventListener('click', () => {
    const selectedDecades = Array.from(document.querySelectorAll('input[name="decade"]:checked')).map(cb => cb.value);
    const selectedGenres = Array.from(document.querySelectorAll('input[name="genre"]:checked')).map(cb => cb.value);
    
    const params = new URLSearchParams();
    if (selectedDecades.length > 0) params.append('decades', selectedDecades.join(','));
    if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
    currentFilters = params.toString();

    startScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    startRound();
});

if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        window.location.reload();
    });
}

audioPlayer.volume = volumeSlider.value;
volumeSlider.addEventListener('input', () => { audioPlayer.volume = volumeSlider.value; });

// --- INITIALISATION ---
updateUI();
populateFilters();