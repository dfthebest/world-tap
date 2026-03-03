const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Popolazione stimata 2024/2025
const popolazioneDati = {
    "India": 1450000000, "Cina": 1419000000, "USA": 345000000, "Indonesia": 283000000,
    "Pakistan": 251000000, "Nigeria": 229000000, "Brasile": 212000000, "Bangladesh": 175000000,
    "Russia": 144000000, "Etiopia": 132000000, "Messico": 130000000, "Giappone": 123000000,
    "Egitto": 116000000, "Filippine": 115000000, "Italia": 59000000, "Francia": 66000000,
    "Germania": 84000000, "Regno Unito": 68000000, "Spagna": 47000000, "Argentina": 46000000,
    "Vaticano": 800, "San Marino": 33000, "Monaco": 36000, "Liechtenstein": 39000
};

// Moltiplicatore richiesto: 5000 tap per abitante
let countries = Object.keys(popolazioneDati).map(name => {
    const totalTap = popolazioneDati[name] * 5000;
    return {
        name: name,
        total: totalTap,
        remaining: totalTap
    };
});

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const wss = new WebSocketServer({ server });

function getSecretRanking() {
    return countries
        .map(c => ({
            country: c.name,
            progress: parseFloat(((c.total - c.remaining) / c.total * 100).toFixed(6))
        }))
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 10); // Mostra solo i primi 10
}

wss.on('connection', (ws) => {
    // Invio iniziale dati
    ws.send(JSON.stringify({ 
        type: "initData", 
        countries: countries.map(c => ({ name: c.name })), 
        ranking: getSecretRanking() 
    }));

    ws.on('message', (rawData) => {
        try {
            const data = JSON.parse(rawData.toString());
            if (data.type === "tap") {
                const country = countries.find(c => c.name === data.country);
                if (country && country.remaining > 0) {
                    country.remaining--;
                    
                    const updatePayload = JSON.stringify({ 
                        type: "update", 
                        ranking: getSecretRanking(),
                        countryName: country.name,
                        newRemaining: country.remaining
                    });

                    wss.clients.forEach(client => {
                        if (client.readyState === 1) client.send(updatePayload);
                    });

                    if (country.remaining <= 0) {
                        const winPayload = JSON.stringify({ type: "winner", country: country.name });
                        wss.clients.forEach(client => {
                            if (client.readyState === 1) client.send(winPayload);
                        });
                        // Reset opzionale qui per nuovo campionato
                    }
                }
            }
        } catch (e) { console.error("Errore parsing:", e); }
    });
});