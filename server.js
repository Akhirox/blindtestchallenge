console.log("--- Démarrage du serveur FINAL avec Leaderboard ---");

const express = require('express');
const cors = require('cors');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Pool } = require('pg'); // NOUVEAU: Import pour la base de données

const app = express();
app.use(cors());
app.use(express.json()); // NOUVEAU: Pour pouvoir lire les données JSON envoyées par le client
const port = process.env.PORT || 3000;

// NOUVEAU: Connexion à la base de données PostgreSQL
// Utilise la variable d'environnement DATABASE_URL que vous avez configurée sur Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Nécessaire pour les connexions aux bases de données Render
    }
});

// NOUVEAU: Fonction qui s'assure que notre table de scores existe au démarrage
async function createTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                pseudo VARCHAR(50) NOT NULL,
                score INT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Table 'scores' vérifiée/créée avec succès.");
    } catch (err) {
        console.error("Erreur lors de la création de la table 'scores'", err);
    } finally {
        client.release();
    }
}


const s3 = new S3Client({
  region: 'auto', endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, },
});

let metadataCache = null;

app.get('/metadata', async (req, res) => {
    if (metadataCache) return res.json(metadataCache);
    try {
        const listObjectsResponse = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: 'musiques/' }));
        const files = listObjectsResponse.Contents ? listObjectsResponse.Contents.filter(file => !file.Key.endsWith('/')) : [];
        if (files.length === 0) return res.status(404).json({ error: 'Aucun fichier trouvé.' });

        const genres = {};
        const decades = {};
        const songList = [];

        files.forEach(file => {
            const fileName = file.Key.replace('musiques/', '');
            const parts = fileName.split('_');
            if (parts.length >= 4) {
                const year = parseInt(parts[2], 10);
                const decade = Math.floor(year / 10) * 10;
                const genre = parts[3].split('.')[0].replace(/-/g, ' ');
                if (!isNaN(decade)) { decades[decade] = (decades[decade] || 0) + 1; }
                if (genre) { genres[genre] = (genres[genre] || 0) + 1; }
                songList.push({ decade, genre });
            }
        });
        
        const sortedDecades = Object.fromEntries(Object.entries(decades).sort());
        const sortedGenres = Object.fromEntries(Object.entries(genres).sort());

        metadataCache = { decades: sortedDecades, genres: sortedGenres, songList: songList };
        res.json(metadataCache);
    } catch (error) {
        console.error("Erreur de génération des métadonnées:", error);
        res.status(500).json({ error: 'Erreur interne.' });
    }
});

app.get('/random-song', async (req, res) => {
    try {
        const { genres, decades } = req.query;
        const selectedGenres = genres ? genres.split(',') : [];
        const selectedDecades = decades ? decades.split(',').map(Number) : [];

        const listObjectsResponse = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: 'musiques/' }));
        let allFiles = listObjectsResponse.Contents.filter(file => !file.Key.endsWith('/'));

        if (selectedGenres.length > 0 || selectedDecades.length > 0) {
            allFiles = allFiles.filter(file => {
                const parts = file.Key.replace('musiques/', '').split('_');
                if (parts.length < 4) return false;
                const year = parseInt(parts[2], 10);
                const decade = Math.floor(year / 10) * 10;
                const genre = parts[3].split('.')[0].replace(/-/g, ' ');
                const genreMatch = selectedGenres.length === 0 || selectedGenres.includes(genre);
                const decadeMatch = selectedDecades.length === 0 || selectedDecades.includes(decade);
                return genreMatch && decadeMatch;
            });
        }
        if (allFiles.length === 0) return res.status(404).json({ error: 'Aucune chanson ne correspond à vos filtres.' });
        const randomFile = allFiles[Math.floor(Math.random() * allFiles.length)];
        res.json({
            fileName: randomFile.Key,
            url: `https://pub-f0966e74287c434f85d57523b94f82e0.r2.dev/${randomFile.Key}`,
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de la chanson:", error);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

// NOUVELLE ROUTE : Récupérer le leaderboard (Top 10)
app.get('/leaderboard', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT pseudo, score FROM scores ORDER BY score DESC LIMIT 10');
            res.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Erreur de récupération du leaderboard:", error);
        res.status(500).json({ error: 'Erreur interne.' });
    }
});

// NOUVELLE ROUTE : Sauvegarder un score
app.post('/scores', async (req, res) => {
    const { pseudo, score } = req.body;
    if (!pseudo || typeof score !== 'number') {
        return res.status(400).json({ error: 'Pseudo et score sont requis.' });
    }
    try {
        const client = await pool.connect();
        try {
            await client.query('INSERT INTO scores (pseudo, score) VALUES ($1, $2)', [pseudo, score]);
            res.status(201).json({ message: 'Score enregistré !' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Erreur d'enregistrement du score:", error);
        res.status(500).json({ error: 'Erreur interne.' });
    }
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
    createTable(); // On lance la vérification de la table au démarrage
});