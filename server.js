console.log("--- Démarrage du serveur COMPLET avec CORS et R2 ---");

// --- Imports ---
const express = require('express');
const cors = require('cors');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// --- Configuration ---
const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// --- Routes de l'API ---
app.get('/', (req, res) => {
  res.send('Le serveur du Blind Test Challenge est en ligne !');
});

app.get('/random-song', async (req, res) => {
  try {
    const listObjectsResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: 'musiques/',
      })
    );

    const allObjects = listObjectsResponse.Contents;
    if (!allObjects || allObjects.length === 0) {
      return res.status(404).json({ error: 'Aucune chanson trouvée dans le dossier musiques/.' });
    }
    
    const songFiles = allObjects.filter(file => !file.Key.endsWith('/'));
    if (songFiles.length === 0) {
        return res.status(404).json({ error: 'Aucun fichier de chanson trouvé.' });
    }

    const randomFile = songFiles[Math.floor(Math.random() * songFiles.length)];
    const fileName = randomFile.Key;

    const publicUrl = `https://pub-f0966e74287c434f85d57523b94f82e0.r2.dev/${fileName}`;

    res.json({
      fileName: fileName,
      url: publicUrl,
    });

  } catch (error) {
    console.error("Erreur lors de la récupération de la chanson:", error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// --- Démarrage du serveur ---
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});