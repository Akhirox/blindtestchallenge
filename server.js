const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Serveur de test minimal - Blind Test Challenge');
});

app.listen(port, () => {
  console.log(`Serveur de test démarré sur http://localhost:${port}`);
});