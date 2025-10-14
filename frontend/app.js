// --- CONFIGURATION ---
const API_URL = 'https://blindtestchallenge-production.up.railway.app';

// --- ÉLÉMENTS HTML ---
const audioPlayer = document.getElementById('audio-player');
const answerInput = document.getElementById('answer-input');
const submitButton = document.getElementById('submit-btn');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives-display');
const heartsDisplay = document.getElementById('hearts-display');

// --- VARIABLES DU JEU ---
let score = 0;
let lives = 3;
let heartFragments = 0;

let currentArtist = '';
let currentTitle = '';

// --- FONCTIONS DU JEU ---

// Met à jour l'affichage des stats
function updateUI() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    heartsDisplay.textContent = `${heartFragments}/5`;
}

// Fonction pour normaliser les chaînes de caractères (enlever accents, majuscules, etc.)
function normalizeString(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Démarre un nouveau round
async function startRound() {
    answerInput.value = ''; // On vide le champ de réponse
    answerInput.focus(); // On met le curseur dedans
    
    try {
        const response = await fetch(`${API_URL}/random-song`);
        if (!response.ok) throw new Error('Erreur réseau');
        
        const song = await response.json();
        
        // On extrait l'artiste et le titre du nom de fichier (ex: Artiste_Titre_Annee_Genre.opus)
        // C'EST ICI QU'ON ADAPTE LA LOGIQUE A VOTRE NOM DE FICHIER
        const parts = song.fileName.replace('musiques/', '').split('_');
        currentArtist = normalizeString(parts[0]);
        currentTitle = normalizeString(parts[1]);

        console.log(`Réponse cachée -> Artiste: ${currentArtist}, Titre: ${currentTitle}`);

        audioPlayer.src = song.url;
        audioPlayer.play();

    } catch (error) {
        console.error("Impossible de charger la chanson:", error);
        alert("Erreur de chargement de la chanson. Le jeu va s'arrêter.");
    }
}

// Vérifie la réponse du joueur
function checkAnswer() {
    if (lives <= 0) return; // Si plus de vie, on ne fait rien

    const userAnswer = normalizeString(answerInput.value);
    if (userAnswer.length === 0) return; // Si la réponse est vide, on ne fait rien

    const artistFound = currentArtist.length > 0 && userAnswer.includes(currentArtist);
    const titleFound = currentTitle.length > 0 && userAnswer.includes(currentTitle);

    if (artistFound && titleFound) {
        // Le joueur a trouvé les deux !
        score++;
        heartFragments++;
        console.log("Bravo ! Artiste ET Titre trouvés !");
        if (heartFragments >= 5) {
            lives++;
            heartFragments = 0;
            console.log("Vie supplémentaire gagnée !");
        }
    } else if (artistFound || titleFound) {
        // Le joueur a trouvé l'un des deux
        score++;
        console.log("Bien ! Artiste OU Titre trouvé !");
    } else {
        // Le joueur n'a rien trouvé
        lives--;
        console.log("Dommage, mauvaise réponse.");
        if (lives <= 0) {
            alert(`Partie terminée ! Votre score final est de ${score}`);
        }
    }

    updateUI(); // On met à jour l'affichage

    if (lives > 0) {
        startRound(); // On lance le round suivant
    }
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---

// Quand on clique sur le bouton "Valider"
submitButton.addEventListener('click', checkAnswer);

// Quand on appuie sur "Entrée" dans le champ de texte
answerInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        checkAnswer();
    }
});

// --- DÉMARRAGE DU JEU ---
// On met tout en place au chargement de la page
updateUI();
// On remplace le bouton "Commencer" par un démarrage direct
// (on pourrait ajouter un écran de démarrage plus tard)
startRound();