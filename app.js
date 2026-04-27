// ==========================================
// JAVASCRIPT - LOGICA APPLICATIVA
// ==========================================
const CORS_PROXY = "https://corsproxy.io/?";
const API_BASE_URL = "http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno";

const trainCounterDisplay = document.getElementById('train-counter');
const langToggleBtn = document.getElementById('lang-toggle');
const themeToggleBtn = document.getElementById('theme-toggle');
const newsTicker = document.getElementById('news-ticker');
const newsContent = document.getElementById('news-content');
const stationInput = document.getElementById('station-input');
const autocompleteResults = document.getElementById('autocomplete-results');
const searchHistoryContainer = document.getElementById('search-history');
const delayThresholdInput = document.getElementById('delay-threshold');
const toastContainer = document.getElementById('toast-container');
const trainNumberInput = document.getElementById('train-number-input');
const searchTrainBtn = document.getElementById('search-train-btn');
const weatherInput = document.getElementById('weather-input');
const weatherAutocompleteResults = document.getElementById('weather-autocomplete-results');
const searchWeatherBtn = document.getElementById('search-weather-btn');
const weatherHistoryContainer = document.getElementById('weather-history');
const weatherCard = document.getElementById('weather-card');
const weatherContent = document.getElementById('weather-content');

// Elementi Mappa Indipendente
const mapSearchInput = document.getElementById('map-search-input');
const searchMapBtn = document.getElementById('search-map-btn');

const stationBoard = document.getElementById('station-board');
const stationNameDisplay = document.getElementById('station-name');
const btnPartenze = document.getElementById('btn-partenze');
const btnArrivi = document.getElementById('btn-arrivi');
const trainList = document.getElementById('train-list');
const modal = document.getElementById('train-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalInfo = document.getElementById('modal-info');
const fermateList = document.getElementById('fermate-list');

let currentLang = localStorage.getItem('lingua') || 'it';
let stazioneCorrenteId = '';
let stazioneCorrenteNome = '';

const translations = {
    it: { loading: "Caricamento...", news_live: "NEWS LIVE", loading_news: "Caricamento notizie...", search_station: "Cerca Stazione", placeholder_station: "Es. Milano Centrale...", delay_alert: "Avvisami se il ritardo supera:", search_train: "Cerca Treno", placeholder_train: "Es. 9650...", btn_search_path: "Cerca", weather_city: "Meteo Città", placeholder_weather: "Es. Ceggia, Milano...", btn_search_weather: "Meteo", departures: "Partenze", arrivals: "Arrivi", train_detail: "Dettaglio Treno", on_time: "In orario", to: "Per:", from: "Da:", delay_warn: "⚠️ Attenzione: ci sono treni in forte ritardo!", map_title: "Mappa Radar e Percorsi", placeholder_map: "Es. Firenze, Napoli...", btn_search_map: "Cerca" },
    en: { loading: "Loading...", news_live: "LIVE NEWS", loading_news: "Loading news...", search_station: "Search Station", placeholder_station: "E.g. Rome Termini...", delay_alert: "Alert me if delay exceeds:", search_train: "Search Train", placeholder_train: "E.g. 9650...", btn_search_path: "Search", weather_city: "City Weather", placeholder_weather: "E.g. Rome, Milan...", btn_search_weather: "Weather", departures: "Departures", arrivals: "Arrivals", train_detail: "Train Details", on_time: "On time", to: "To:", from: "From:", delay_warn: "⚠️ Warning: some trains are experiencing severe delays!", map_title: "Radar Map & Routes", placeholder_map: "E.g. Florence, Naples...", btn_search_map: "Search" }
};

function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('lingua', lang);
    langToggleBtn.textContent = lang === 'it' ? '🇬🇧 EN' : '🇮🇹 IT';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) el.placeholder = translations[lang][key];
    });
    caricaNews();
    if (weatherInput.value) aggiornaMeteo(weatherInput.value);
    if (stazioneCorrenteId) caricaTabellone(btnPartenze.classList.contains('active') ? 'partenze' : 'arrivi');
}
langToggleBtn.onclick = () => applyLang(currentLang === 'it' ? 'en' : 'it');

try { if (localStorage.getItem('tema') === 'scuro') { document.body.classList.add('dark-theme'); themeToggleBtn.textContent = '☀️'; } } catch (e) {}

themeToggleBtn.onclick = () => {
    const isDark = document.body.classList.toggle('dark-theme');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('tema', isDark ? 'scuro' : 'chiaro');
};

function mostraAvviso(messaggio) {
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.textContent = messaggio; toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 5000);
}

async function aggiornaContatore() {
    try {
        const res = await fetch(CORS_PROXY + encodeURIComponent(`${API_BASE_URL}/statistiche/${Date.now()}`));
        const data = await res.json();
        let inViaggio = Array.isArray(data) ? data.reduce((tot, r) => tot + (r.treniCircolanti || 0), 0) : (data.treniCircolanti || 0);
        trainCounterDisplay.innerHTML = inViaggio > 0 ? `<span class="live-dot"></span> ${inViaggio}` : `<span class="live-dot" style="background:#ccc; animation:none"></span> -`;
    } catch (e) { trainCounterDisplay.innerHTML = `<span class="live-dot" style="background:var(--red); animation:none"></span> Offline`; }
}
aggiornaContatore(); setInterval(aggiornaContatore, 60000);

async function caricaNews() {
    try {
        newsContent.innerHTML = translations[currentLang].loading_news;
        newsTicker.classList.remove('hidden');
        const res = await fetch(CORS_PROXY + encodeURIComponent(`${API_BASE_URL}/news/0/it`));
        const news = await res.json();
        if (news && news.length > 0) {
            newsContent.innerHTML = news.map(n => `⚠️ ${n.testo.replace(/<[^>]*>?/gm, '')}`).join(' &nbsp;&nbsp; | &nbsp;&nbsp; ');
        } else { newsTicker.classList.add('hidden'); }
    } catch (e) { newsTicker.classList.add('hidden'); }
}

stationInput.oninput = async (e) => {
    const val = e.target.value.trim();
    if (val.length < 3) return autocompleteResults.classList.add('hidden');
    try {
        const res = await fetch(CORS_PROXY + encodeURIComponent(`${API_BASE_URL}/autocompletaStazione/${val}`));
        const text = await res.text();
        autocompleteResults.innerHTML = '';
        text.split('\n').forEach(r => {
            const [nome, id] = r.split('|');
            if (nome) {
                const li = document.createElement('li'); li.textContent = nome;
                li.onclick = () => {
                    stazioneCorrenteNome = nome; stazioneCorrenteId = id; stationInput.value = nome; autocompleteResults.classList.add('hidden');
                    salvaCronologia('stazioniSalvate', { nome, id }, mostraCronologiaStazioni);
                    caricaTabellone('partenze');
                };
                autocompleteResults.appendChild(li);
            }
        });
        autocompleteResults.classList.remove('hidden');
    } catch(e) {}
};

btnPartenze.onclick = () => caricaTabellone('partenze');
btnArrivi.onclick = () => caricaTabellone('arrivi');

async function caricaTabellone(tipo) {
    stationBoard.classList.remove('hidden');
    stationNameDisplay.textContent = `${translations[currentLang][tipo === 'partenze' ? 'departures' : 'arrivals']} - ${stazioneCorrenteNome}`;
    trainList.innerHTML = `<li>${translations[currentLang].loading}</li>`;
    btnPartenze.className = tipo === 'partenze' ? 'active' : ''; btnArrivi.className = tipo === 'arrivi' ? 'active' : '';

    try {
        const res = await fetch(CORS_PROXY + encodeURIComponent(`${API_BASE_URL}/${tipo}/${stazioneCorrenteId}/${new Date().toString()}`));
        const treni = await res.json();
        trainList.innerHTML = '';
        let treniInRitardo = 0; const soglia = parseInt(delayThresholdInput.value) || 10;

        if (!treni.length) { trainList.innerHTML = '<li>Nessun treno trovato.</li>'; return; }

        treni.forEach((t) => {
            const li = document.createElement('li'); li.className = 'train-item';
            li.innerHTML = `
                <div class="train-info-block">
                    <strong>${t.compTipologiaTreno || ''} ${t.numeroTreno}</strong><br>
                    <small>${tipo === 'partenze' ? translations[currentLang].to + ' ' + t.destinazione : translations[currentLang].from + ' ' + t.origine}</small>
                </div>
                <div style="text-align:right">
                    <div class="orario-glowing">${t.compOrarioPartenzaZeroEffettivo || t.compOrarioArrivoZeroEffettivo || t.compOrarioPartenza || t.compOrarioArrivo || '--:--'}</div>
                    <span class="badge ${t.ritardo > 0 ? 'ritardo-si' : 'ritardo-no'}">${t.ritardo > 0 ? '+' + t.ritardo : translations[currentLang].on_time}</span>
                </div>`;
            li.onclick = () => apriDettaglioTreno(t.numeroTreno);
            trainList.appendChild(li);
            if (t.ritardo >= soglia) treniInRitardo++;
        });

        if (treniInRitardo > 0) mostraAvviso(`${translations[currentLang].delay_warn} (Oltre ${soglia} min)`);
    } catch(e) { trainList.innerHTML = '<li>Errore caricamento dati.</li>'; }
}

searchTrainBtn.onclick = () => { const num = trainNumberInput.value.trim(); if (num) { apriDettaglioTreno(num); trainNumberInput.value = ''; } };
trainNumberInput.onkeypress = (e) => { if (e.key === 'Enter') searchTrainBtn.click(); };

async function apriDettaglioTreno(num) {
    modal.classList.remove('hidden'); modalTitle.textContent = `${translations[currentLang].train_detail} ${num}`; modalInfo.textContent = translations[currentLang].loading; fermateList.innerHTML = '';
    try {
        const res1 = await fetch(CORS_PROXY + encodeURIComponent(`${API_BASE_URL}/cercaNumeroTrenoTrenoAutocomplete/${num}`));
        const text = await res1.text(); const idFull = text.split('|')[1]?.trim();
        if (!idFull) throw new Error("Non trovato");
        const [numero, origine, data] = idFull.split('-');
        const res2 = await fetch(CORS_PROXY + encodeURIComponent(`${API_BASE_URL}/andamentoTreno/${origine}/${numero}/${data}`));
        const d = await res2.json();

        modalInfo.innerHTML = `<strong>${d.compTipologiaTreno || 'Treno'} ${d.numeroTreno}</strong><br>${translations[currentLang].from} <strong>${d.origine}</strong> - ${translations[currentLang].to} <strong>${d.destinazione}</strong><br>Stato: <strong>${d.compRitardo[0] || translations[currentLang].on_time}</strong>`;

        let idxCorrente = -1; d.fermate.forEach((f, i) => { if (f.arrivoReale || f.partenzaReale) idxCorrente = i; });
        d.fermate.forEach((f, i) => {
            const li = document.createElement('li'); li.className = 'fermata-item';
            if (i < idxCorrente) li.classList.add('fermata-passata'); if (i === idxCorrente && idxCorrente !== -1) li.classList.add('fermata-corrente');
            const orario = f.partenza_teorica || f.arrivo_teorico; const timeStr = orario ? new Date(orario).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--';
            li.innerHTML = `<strong>${f.stazione}</strong><br><small>H: ${timeStr} | Bin: ${f.binarioEffettivoPartenzaDescrizione || f.binarioProgrammatoPartenzaDescrizione || '--'}</small>`;
            fermateList.appendChild(li);
        });

        // Disegna il percorso del treno sulla mappa interattiva!
        disegnaPercorsoTreno(d.fermate);

    } catch(e) { modalInfo.innerHTML = "❌ Errore caricamento percorso."; }
}

closeModalBtn.onclick = () => modal.classList.add('hidden'); window.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

weatherInput.oninput = async (e) => {
    const val = e.target.value.trim(); if (val.length < 3) return weatherAutocompleteResults.classList.add('hidden');
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=15&language=it&format=json`);
        const data = await res.json(); weatherAutocompleteResults.innerHTML = '';
        if (data.results) {
            data.results.filter(c => c.country_code === 'IT').slice(0,5).forEach(c => {
                const li = document.createElement('li'); li.textContent = `${c.name} (${c.admin1})`;
                li.onclick = () => { weatherInput.value = c.name; weatherAutocompleteResults.classList.add('hidden'); aggiornaMeteo(c.name); };
                weatherAutocompleteResults.appendChild(li);
            });
            weatherAutocompleteResults.classList.remove('hidden');
        }
    } catch(e) {}
};

searchWeatherBtn.onclick = async () => {
    const val = weatherInput.value.trim();
    if (val.length >= 3) {
        weatherAutocompleteResults.classList.add('hidden');
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=10&language=it&format=json`);
            const data = await res.json();
            if (data.results) {
                const ita = data.results.filter(c => c.country_code === 'IT');
                if (ita.length > 0) { weatherInput.value = ita[0].name; aggiornaMeteo(ita[0].name); } else weatherCard.classList.add('hidden');
            } else weatherCard.classList.add('hidden');
        } catch(e) {}
    }
};
weatherInput.onkeypress = (e) => { if (e.key === 'Enter') searchWeatherBtn.click(); };

async function aggiornaMeteo(citta) {
    weatherCard.classList.remove('hidden'); weatherContent.innerHTML = translations[currentLang].loading;
    try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(citta)}?format=j1&lang=${currentLang}`);
        const d = await res.json(); const cur = d.current_condition[0]; const code = cur.weatherCode; let icon = "☁️"; 
        if (code === "113") icon = "☀️"; else if (code === "116" || code === "119") icon = "⛅"; else if (["122", "143", "248", "260"].includes(code)) icon = "🌫️"; else if (["176", "263", "266", "293", "296", "299", "302", "305", "308", "353"].includes(code)) icon = "🌧️"; else if (["200", "386", "389"].includes(code)) icon = "⛈️"; else if (["179", "227", "230", "320", "323", "326", "329", "332", "335", "338", "350", "368", "371", "392", "395"].includes(code)) icon = "❄️";

        weatherContent.innerHTML = `<div class="weather-main"><span class="weather-icon">${icon}</span><span class="weather-temp">${cur.temp_C}°C</span></div><div class="weather-info"><span class="weather-desc">${cur.lang_it ? cur.lang_it[0].value : cur.weatherDesc[0].value}</span><br><span class="weather-details">Vento: ${cur.windspeedKmph} km/h</span></div>`;
        salvaCronologia('meteoSalvati', citta, mostraCronologiaMeteo);
    } catch(e) { weatherCard.classList.add('hidden'); }
}

function salvaCronologia(chiave, dato, callbackMostra) {
    try {
        let hist = JSON.parse(localStorage.getItem(chiave)) || [];
        if (typeof dato === 'object') { hist = hist.filter(s => s && s.id !== dato.id); } else { hist = hist.filter(c => c && typeof c === 'string' && c.toLowerCase() !== dato.toLowerCase()); }
        hist.unshift(dato); if (hist.length > 4) hist.pop(); localStorage.setItem(chiave, JSON.stringify(hist));
    } catch(e) { localStorage.removeItem(chiave); }
    callbackMostra();
}

function mostraCronologiaStazioni() {
    searchHistoryContainer.innerHTML = '';
    (JSON.parse(localStorage.getItem('stazioniSalvate')) || []).forEach(staz => {
        if(!staz) return;
        const b = document.createElement('button'); b.className = 'history-btn'; b.textContent = `🕒 ${staz.nome}`;
        b.onclick = () => { stationInput.value = staz.nome; stazioneCorrenteNome = staz.nome; stazioneCorrenteId = staz.id; caricaTabellone('partenze'); };
        searchHistoryContainer.appendChild(b);
    });
}

function mostraCronologiaMeteo() {
    weatherHistoryContainer.innerHTML = '';
    (JSON.parse(localStorage.getItem('meteoSalvati')) || []).forEach(c => {
        if(!c) return;
        const b = document.createElement('button'); b.className = 'history-btn'; b.textContent = `🌤️ ${c}`;
        b.onclick = () => { weatherInput.value = c; aggiornaMeteo(c); };
        weatherHistoryContainer.appendChild(b);
    });
}

document.addEventListener('click', (e) => {
    if (!stationInput.contains(e.target) && !autocompleteResults.contains(e.target)) autocompleteResults.classList.add('hidden');
    if (!weatherInput.contains(e.target) && !weatherAutocompleteResults.contains(e.target)) weatherAutocompleteResults.classList.add('hidden');
});

const delayChips = document.querySelectorAll('.delay-chip');
delayChips.forEach(chip => {
    chip.addEventListener('click', () => {
        delayChips.forEach(c => c.classList.remove('active')); chip.classList.add('active');
        const hiddenInput = document.getElementById('delay-threshold'); if(hiddenInput) hiddenInput.value = chip.getAttribute('data-value');
    });
});

// ==========================================
// MAPPA INTERATTIVA LEAFLET (INDIPENDENTE E PERCORSI)
// ==========================================
let map = null;
let mapMarker = null;
let trainPathLayer = null;
let stationMarkersLayer = null;

function checkMapInit(lat, lon, zoom) {
    if (!map) {
        map = L.map('map').setView([lat, lon], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        stationMarkersLayer = L.layerGroup().addTo(map);
    }
}

function pulisciMappa() {
    if (mapMarker) { map.removeLayer(mapMarker); mapMarker = null; }
    if (trainPathLayer) { map.removeLayer(trainPathLayer); trainPathLayer = null; }
    if (stationMarkersLayer) stationMarkersLayer.clearLayers();
}

// Ricerca Indipendente
searchMapBtn.onclick = () => {
    const query = mapSearchInput.value.trim();
    if (query) mostraSuMappa(query);
};
mapSearchInput.onkeypress = (e) => { if (e.key === 'Enter') searchMapBtn.click(); };

async function mostraSuMappa(query) {
    checkMapInit(41.9028, 12.4964, 6);
    pulisciMappa();

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        
        let lat, lon;
        if (data && data.length > 0) {
            lat = data[0].lat; lon = data[0].lon;
        } else {
            const fbUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=it&format=json`;
            const fbRes = await fetch(fbUrl);
            const fbData = await fbRes.json();
            if (fbData.results && fbData.results.length > 0) {
                lat = fbData.results[0].latitude; lon = fbData.results[0].longitude;
            }
        }

        if (lat && lon) {
            map.flyTo([lat, lon], 12, { duration: 1.5 });
            mapMarker = L.marker([lat, lon]).addTo(map).bindPopup(`<strong>${query}</strong>`).openPopup();
        } else {
            mostraAvviso("Posizione non trovata sulla mappa.");
        }
    } catch (e) { console.error(e); }
}

async function geocodeStazione(nome) {
    let cleanName = nome.replace(/\(.*\)/g, '').split('-')[0].replace(/ CENTRALE| TERMINI| S\. LUCIA| P\. GARIBALDI| ROGOREDO| MESTRE/gi, '').trim();
    const cacheKey = 'geo_' + cleanName;
    if(sessionStorage.getItem(cacheKey)) return JSON.parse(sessionStorage.getItem(cacheKey));

    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1&language=it&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const coords = [data.results[0].latitude, data.results[0].longitude];
            sessionStorage.setItem(cacheKey, JSON.stringify(coords));
            return coords;
        }
    } catch(e) {}
    return null;
}

// Disegna il percorso sulla mappa!
async function disegnaPercorsoTreno(fermate) {
    checkMapInit(41.9028, 12.4964, 6);
    pulisciMappa();

    const coordsPromises = fermate.map(f => geocodeStazione(f.stazione));
    const coordsResults = await Promise.all(coordsPromises);

    const validPoints = [];
    
    fermate.forEach((f, i) => {
        const coords = coordsResults[i];
        if (coords) {
            validPoints.push(coords);
            const marker = L.circleMarker(coords, {
                color: '#e11d48', radius: 5, fillColor: '#fff', fillOpacity: 1, weight: 2
            }).bindPopup(`<strong>${f.stazione}</strong><br>Arrivo: ${f.arrivo_teorico ? new Date(f.arrivo_teorico).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '--'}`);
            stationMarkersLayer.addLayer(marker);
        }
    });

    if (validPoints.length > 1) {
        trainPathLayer = L.polyline(validPoints, {
            color: '#06b6d4', weight: 4, opacity: 0.8, dashArray: '10, 10', lineJoin: 'round'
        }).addTo(map);
        map.fitBounds(trainPathLayer.getBounds(), { padding: [50, 50] });
    } else if (validPoints.length === 1) {
        map.flyTo(validPoints[0], 14);
    }
}

// INIT
applyLang(currentLang);
mostraCronologiaStazioni();
mostraCronologiaMeteo();

// Inizializza la mappa all'avvio
setTimeout(() => {
    checkMapInit(41.9028, 12.4964, 6);
}, 500);