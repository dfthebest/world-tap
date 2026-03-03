const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Dati iniziali (Popolazione semplificata / 1000 per rendere il gioco fattibile)
let countries = [
    { name: "Italia", remaining: 59000 },
    { name: "USA", remaining: 331000 },
    { name: "Cina", remaining: 1412000 },
    { name: "Vaticano", remaining: 800 }
];

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => console.log(`Server attivo su porta ${PORT}`));
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    // Invia i dati appena qualcuno si connette
    ws.send(JSON.stringify({ type: "initData", countries, ranking: countries }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === "tap") {
            const country = countries.find(c => c.name === data.country);
            if (country && country.remaining > 0) {
                country.remaining--;
                // Invia l'aggiornamento a TUTTI
                const update = JSON.stringify({ type: "update", ranking: countries });
                wss.clients.forEach(client => client.send(update));
                
                if (country.remaining <= 0) {
                    wss.clients.forEach(client => client.send(JSON.stringify({ type: "winner", country: country.name })));
                }
            }
        }
    });
});