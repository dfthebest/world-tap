const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Database Popolazione
const worldPop = {
    "Afghanistan": 42200000, "Albania": 2800000, "Algeria": 45600000, "Andorra": 80000, "Angola": 36600000, "Argentina": 46000000, "Armenia": 2700000, "Australia": 26400000, "Austria": 9000000, "Azerbaijan": 10100000, "Bahamas": 410000, "Bahrain": 1500000, "Bangladesh": 173000000, "Barbados": 280000, "Belarus": 9200000, "Belgium": 11700000, "Belize": 410000, "Benin": 13700000, "Bhutan": 780000, "Bolivia": 12300000, "Bosnia and Herzegovina": 3200000, "Botswana": 2600000, "Brazil": 215000000, "Brunei": 450000, "Bulgaria": 6400000, "Burkina Faso": 23200000, "Burundi": 13200000, "Cambodia": 16900000, "Cameroon": 28600000, "Canada": 38900000, "Cape Verde": 590000, "Central African Republic": 5700000, "Chad": 18200000, "Chile": 19600000, "China": 1412000000, "Colombia": 52000000, "Comoros": 850000, "Congo": 102000000, "Costa Rica": 5200000, "Croatia": 3800000, "Cuba": 11000000, "Cyprus": 1200000, "Czech Republic": 10500000, "Denmark": 5900000, "Djibouti": 1100000, "Dominica": 72000, "Dominican Republic": 11300000, "Ecuador": 18100000, "Egypt": 112000000, "El Salvador": 6300000, "Equatorial Guinea": 1700000, "Eritrea": 3700000, "Estonia": 1300000, "Eswatini": 1200000, "Ethiopia": 126000000, "Fiji": 930000, "Finland": 5500000, "France": 68000000, "Gabon": 2400000, "Gambia": 2700000, "Georgia": 3700000, "Germany": 84000000, "Ghana": 34000000, "Greece": 10400000, "Grenada": 125000, "Guatemala": 18000000, "Guinea": 14200000, "Guyana": 810000, "Haiti": 11700000, "Honduras": 10600000, "Hungary": 9600000, "Iceland": 375000, "India": 1428000000, "Indonesia": 277000000, "Iran": 89000000, "Iraq": 45500000, "Ireland": 5100000, "Israel": 9700000, "Italy": 58900000, "Jamaica": 2800000, "Japan": 123000000, "Jordan": 11300000, "Kazakhstan": 19600000, "Kenya": 55000000, "Korea, South": 51800000, "Kuwait": 4300000, "Kyrgyzstan": 7000000, "Laos": 7600000, "Latvia": 1800000, "Lebanon": 5300000, "Lesotho": 2300000, "Liberia": 5400000, "Libya": 6800000, "Liechtenstein": 39000, "Lithuania": 2700000, "Luxembourg": 650000, "Madagascar": 30000000, "Malawi": 21000000, "Malaysia": 34000000, "Maldives": 520000, "Mali": 23000000, "Malta": 530000, "Mauritania": 4800000, "Mauritius": 1300000, "Mexico": 128000000, "Moldova": 2500000, "Monaco": 36000, "Mongolia": 3400000, "Montenegro": 620000, "Morocco": 37800000, "Mozambique": 33900000, "Myanmar": 54500000, "Namibia": 2600000, "Nepal": 30900000, "Netherlands": 17800000, "New Zealand": 5200000, "Nicaragua": 7000000, "Niger": 27000000, "Nigeria": 223000000, "Norway": 5500000, "Oman": 4600000, "Pakistan": 240000000, "Palau": 180000, "Panama": 4500000, "Paraguay": 6800000, "Peru": 34000000, "Philippines": 117000000, "Poland": 37700000, "Portugal": 10400000, "Qatar": 2700000, "Romania": 19000000, "Russia": 144000000, "Rwanda": 14000000, "San Marino": 34000, "Saudi Arabia": 36900000, "Senegal": 17700000, "Serbia": 6600000, "Singapore": 5900000, "Slovakia": 5400000, "Slovenia": 2100000, "South Africa": 60000000, "Spain": 47500000, "Sri Lanka": 21900000, "Sudan": 48000000, "Sweden": 10500000, "Switzerland": 8800000, "Syria": 23000000, "Taiwan": 23900000, "Thailand": 71600000, "Tunisia": 12400000, "Turkey": 85000000, "Ukraine": 37000000, "UAE": 9500000, "UK": 67700000, "USA": 339000000, "Uruguay": 3400000, "Uzbekistan": 35000000, "Vatican City": 800, "Venezuela": 28000000, "Vietnam": 99000000, "Yemen": 34000000, "Zambia": 20500000, "Zimbabwe": 16600000
};

let countries = Object.keys(worldPop).map(name => ({
    name: name,
    total: worldPop[name] * 5000,
    remaining: worldPop[name] * 5000
}));

app.use(express.static(path.join(__dirname, 'public')));

const wss = new WebSocketServer({ server });

function getSecretRanking() {
    return countries
        .map(c => ({
            country: c.name,
            progress: parseFloat(((c.total - c.remaining) / c.total * 100).toFixed(7))
        }))
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 15);
}

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(msg);
    });
}

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ 
        type: "initData", 
        countries: countries.map(c => ({name: c.name})), 
        ranking: getSecretRanking(),
        online: wss.clients.size 
    }));
    
    broadcast({ type: "onlineCount", count: wss.clients.size });

    ws.on('message', (rawData) => {
        try {
            const data = JSON.parse(rawData.toString());
            
            if (data.type === "selectCountry" || data.type === "requestSync") {
                const country = countries.find(c => c.name === data.country);
                if (country) {
                    ws.send(JSON.stringify({
                        type: "sync",
                        countryName: country.name,
                        remaining: country.remaining
                    }));
                }
            }

            if (data.type === "tap") {
                const country = countries.find(c => c.name === data.country);
                if (country && country.remaining > 0) {
                    country.remaining--;
                    broadcast({ 
                        type: "update", 
                        ranking: getSecretRanking(),
                        countryName: country.name,
                        newRemaining: country.remaining
                    });
                }
            }
        } catch (e) {}
    });

    ws.on('close', () => broadcast({ type: "onlineCount", count: wss.clients.size }));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));