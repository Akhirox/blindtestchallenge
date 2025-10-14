// 1. On importe la "brique" Express pour pouvoir l'utiliser
const express = require('express');

// 2. On crée notre application serveur
const app = express();

// 3. On définit le port sur lequel le serveur va écouter.
// Soit une variable d'environnement (pour Railway), soit 3000 par défaut.
const port = process.env.PORT || 3000;

// 4. On crée une "route". C'est une URL que notre serveur va comprendre.
// Ici, c'est la racine du site ("/").
app.get('/', (req, res) => {
  // Quand quelqu'un visite cette URL, on lui envoie ce message.
  res.send('Le serveur du Blind Test Challenge est en ligne !');
});

// 5. On demande au serveur de démarrer et d'écouter les requêtes sur le port défini.
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});