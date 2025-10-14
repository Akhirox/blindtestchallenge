console.log("--- Démarrage du serveur COMPLET avec filtres ---");

const express = require('express');
const cors = require('cors');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

const s3 = new S3Client({
  region: 'auto', endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, },
});

// NOUVEAU: On met en cache les métadonnées pour ne pas scanner R2 à chaque fois
let metadataCache = null;

// NOUVEAU: Route pour récupérer tous les genres et décennies disponibles
app.get('/metadata', async (req, res) => {
    if (metadataCache) return res.json(metadataCache); // Si le cache existe, on le renvoie

    try {
        const listObjectsResponse = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: 'musiques/' }));
        if (!listObjectsResponse.Contents) return res.status(404).json({ error: 'Aucun fichier trouvé.' });

        const genres = new Set();
        const decades = new Set();

        listObjectsResponse.Contents.forEach(file => {
            const parts = file.Key.replace('musiques/', '').split('_');
            if (parts.length >= 4) {
                const year = parseInt(parts[2], 10);
                const genre = parts[3].split('.')[0].replace(/-/g, ' '); // Nettoie le genre
                
                if (!isNaN(year)) decades.add(Math.floor(year / 10) * 10); // ex: 1987 -> 1980
                if (genre) genres.add(genre);
            }
        });

        metadataCache = {
            decades: [...decades].sort(),
            genres: [...genres].sort()
        };
        res.json(metadataCache);

    } catch (error) {
        console.error("Erreur de génération des métadonnées:", error);
        res.status(500).json({ error: 'Erreur interne.' });
    }
});

// MODIFIÉ: La route /random-song accepte maintenant des filtres
app.get('/random-song', async (req, res) => {
    try {
        const { genres, decades } = req.query;
        const selectedGenres = genres ? genres.split(',') : [];
        const selectedDecades = decades ? decades.split(',').map(Number) : [];

        const listObjectsResponse = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: 'musiques/' }));
        let allFiles = listObjectsResponse.Contents.filter(file => !file.Key.endsWith('/'));

        // On filtre la liste de chansons si des filtres sont appliqués
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

app.listen(port, () => console.log(`Serveur démarré sur http://localhost:${port}`));