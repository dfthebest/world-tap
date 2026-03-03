const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Paesi (Popolazione est. 2024 * 5000)
// Nota: Per rendere il gioco giocabile, usiamo il calcolo Popolazione * 5000
const rawData = {
    "India": 1450000000, "Cina": 1419000000, "USA": 345000000, "Indonesia": 283000000,
    "Pakistan": 251000000, "Nigeria": 229000000, "Brasile": 212000000, "Bangladesh": 175000000,
    "Russia": 144000000, "Etiopia": 132000000, "Messico": 130000000, "Giappone": 123000000,
    "Egitto": 116000000, "Filippine": 115000000, "DR Congo": 105000000, "Vietnam": 100000000,
    "Iran": 91000000, "Turchia": 86000000, "Germania": 84000000, "Tailandia": 71000000,
    "Regno Unito": 68000000, "Francia": 66000000, "Italia": 59000000, "Sud Africa": 61000000,
    "Spagna": 47000000, "Argentina": 46000000, "Polonia": 37000000, "Canada": 39000000,
    "Vaticano": 800, "San Marino": 33000, "Monaco": 36000
    // ... il server può gestire centinaia di altri paesi qui sotto
};

let countries = Object.keys(rawData).map(name => ({
    name: name,
    total: rawData[name] * 5000,
    remaining: rawData[name] * 5000
}));

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => console.log(`Server on port ${PORT}`));
const wss = new WebSocketServer({ server });

function getSecretRanking() {
    return countries.map(c => ({
        country: c.name,
        // Percentuale di completamento: (Totale - Rimanenti) / Totale * 100
        progress: parseFloat(((c.total - c.remaining) / c.total * 100).toFixed(6))
    })).sort((a, b) => b.progress - a.progress);
}

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: "initData", countries: countries.map(c => ({name: c.name})), ranking: getSecretRanking() }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === "tap") {
            const country = countries.find(c => c.name === data.country);
            if (country && country.remaining > 0) {
                country.remaining--;
                const update = JSON.stringify({ 
                    type: "update", 
                    ranking: getSecretRanking(),
                    countryName: country.name,
                    newRemaining: country.remaining
                });
                wss.clients.forEach(client => client.send(update));
                
                if (country.remaining <= 0) {
                    wss.clients.forEach(client => client.send(JSON.stringify({ type: "winner", country: country.name })));
                }
            }
        }
    });
});