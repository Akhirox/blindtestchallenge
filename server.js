console.log("--- VERSION DU SERVEUR AVEC CORS ET RANDOM-SONG (TEST SIMPLIFIÉ) ---");

// --- Imports ---
const express = require('express');
const cors = require('cors');
// La ligne S3 n'est pas nécessaire pour ce test, mais on la laisse pour ne pas tout casser plus tard
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// --- Configuration ---
const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// La configuration S3 n'est pas utilisée dans ce test, mais on la laisse
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

// Voici la route de test, propre et sans l'ancien code
app.get('/random-song', async (req, res) => {
  console.log("--- La route /random-song a été atteinte avec succès ! ---");
  
  res.json({
    fileName: "Artiste-Test_Titre-Test_2025_Pop.opus",
    url: "url_factice",
  });
});

// --- Démarrage du serveur ---
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});