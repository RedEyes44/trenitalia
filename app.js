// Selezioni DOM Meteo (Nuove per autocompletamento e cronologia)
const weatherCard = document.getElementById('weather-card');
const weatherContent = document.getElementById('weather-content');
const weatherInput = document.getElementById('weather-input');
const searchWeatherBtn = document.getElementById('search-weather-btn');
const weatherAutocompleteResults = document.getElementById('weather-autocomplete-results');
const weatherHistoryContainer = document.getElementById('weather-history');

// Selezioni DOM Altri Elementi
const toastContainer = document.getElementById('toast-container');
const delayThresholdInput = document.getElementById('delay-threshold');
const newsTicker = document.getElementById('news-ticker');
const newsContent = document.getElementById('news-content');
const searchHistoryContainer = document.getElementById('search-history');
const stationInput = document.getElementById('station-input');
const autocompleteResults = document.getElementById('autocomplete-results');
const stationBoard = document.getElementById('station-board');
const stationNameDisplay = document.getElementById('station-name');
const trainList = document.getElementById('train-list');
const btnPartenze = document.getElementById('btn-partenze');
const btnArrivi = document.getElementById('btn-arrivi');
const modal = document.getElementById('train-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalInfo = document.getElementById('modal-info');
const fermateList = document.getElementById('fermate-list');
const themeToggleBtn = document.getElementById('theme-toggle');
const trainCounterDisplay = document.getElementById('train-counter');
const trainNumberInput = document.getElementById('train-number-input');
const searchTrainBtn = document.getElementById('search-train-btn');

// Configurazione API Trenitalia
const CORS_PROXY = "https://corsproxy.io/?";
const API_BASE_URL = "http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno";

let stazioneCorrenteId = '';
let stazioneCorrenteNome = '';

const langToggleBtn = document.getElementById('lang-toggle');
let currentLang = localStorage.getItem('lingua') || 'it';

// Dizionario di sicurezza nel caso l'endpoint language/{lingua} fallisca
const fallbackDict = {
    it: {
        loading: "Caricamento...",
        news_live: "NEWS LIVE",
        loading_news: "Caricamento notizie...",
        search_station: "Cerca Stazione",
        placeholder_station: "Es. Milano Centrale...",
        delay_alert: "Avvisami se il ritardo supera:",
        search_train: "Cerca Treno Diretto",
        placeholder_train: "Es. 9650...",
        btn_search_path: "Cerca Percorso",
        weather_city: "Meteo Città",
        placeholder_weather: "Es. Ceggia, Milano...",
        btn_search_weather: "Cerca Meteo",
        departures: "Partenze",
        arrivals: "Arrivi",
        train_detail: "Dettaglio Treno",
        trains_traveling: "treni in viaggio",
        on_time: "In orario",
        from: "Da:",
        to: "Per:",
        delay_warn: "⚠️ Attenzione: ci sono treni in forte ritardo!"
    },
    en: {
        loading: "Loading...",
        news_live: "LIVE NEWS",
        loading_news: "Loading news...",
        search_station: "Search Station",
        placeholder_station: "E.g. Rome Termini...",
        delay_alert: "Alert me if delay exceeds:",
        search_train: "Search Direct Train",
        placeholder_train: "E.g. 9650...",
        btn_search_path: "Search Route",
        weather_city: "City Weather",
        placeholder_weather: "E.g. Rome, Milan...",
        btn_search_weather: "Get Weather",
        departures: "Departures",
        arrivals: "Arrivals",
        train_detail: "Train Details",
        trains_traveling: "active trains",
        on_time: "On time",
        from: "From:",
        to: "To:",
        delay_warn: "⚠️ Warning: some trains are experiencing severe delays!"
    }
};

let translations = fallbackDict[currentLang];

// Funzione core per scaricare e applicare la lingua
async function applicaLingua(lang) {
    currentLang = lang;
    localStorage.setItem('lingua', lang);
    langToggleBtn.textContent = lang === 'it' ? '🇬🇧 EN' : '🇮🇹 IT';

    // 1. Proviamo a usare l'endpoint
    try {
        const response = await fetch(`${API_BASE_URL}/language/${lang}`);
        if(response.ok) {
            translations = await response.json();
        } else {
            translations = fallbackDict[lang]; // Fallback
        }
    } catch(e) {
        translations = fallbackDict[lang]; // Fallback in caso di errore di rete
    }

    // 2. Sostituiamo i testi HTML standard
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) el.innerHTML = translations[key];
    });

    // 3. Sostituiamo i placeholder degli input
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) el.placeholder = translations[key];
    });

    // 4. Ricarichiamo i dati delle API nella nuova lingua
    caricaNews();
    if (weatherInput.value) aggiornaMeteo(weatherInput.value);
    
    // Aggiorniamo il tabellone se c'è una stazione attiva
    if (stazioneCorrenteId) {
        const tipo = btnPartenze.classList.contains('active') ? 'partenze' : 'arrivi';
        caricaTabellone(tipo);
    }
}

// Al click del bottone, invertiamo la lingua
langToggleBtn.addEventListener('click', () => {
    applicaLingua(currentLang === 'it' ? 'en' : 'it');
});

// Applica la lingua all'avvio
applicaLingua(currentLang);

// --- 1. RICERCA STAZIONE ---
async function cercaStazione(testo) {
    const endpoint = `${API_BASE_URL}/autocompletaStazione/${testo}`;
    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(endpoint));
        const data = await response.text(); 
        elaboraRisultati(data);
    } catch (error) { console.error("Errore ricerca:", error); }
}

function elaboraRisultati(testoApi) {
    autocompleteResults.innerHTML = '';
    const righe = testoApi.trim().split('\n');
    if (!righe.length || righe[0] === "") {
        autocompleteResults.classList.add('hidden');
        return;
    }

    righe.forEach(riga => {
        const [nome, id] = riga.split('|');
        if (nome && id) {
            const li = document.createElement('li');
            li.textContent = nome;
            li.onclick = () => {
                stationInput.value = nome;
                stazioneCorrenteNome = nome;
                stazioneCorrenteId = id;
                autocompleteResults.classList.add('hidden');
                
                salvaRicerca(nome, id); 
                caricaTabellone('partenze');
            };
            autocompleteResults.appendChild(li);
        }
    });
    autocompleteResults.classList.remove('hidden');
}

stationInput.oninput = (e) => {
    const val = e.target.value.trim();
    if (val.length >= 3) cercaStazione(val);
    else autocompleteResults.classList.add('hidden');
};

// --- 2. TABELLONE ---
async function caricaTabellone(tipo) {
    stationBoard.classList.remove('hidden');

    stationNameDisplay.textContent = `${tipo === 'partenze' ? 'Partenze' : 'Arrivi'} - ${stazioneCorrenteNome}`;
    trainList.innerHTML = '<li>Caricamento...</li>';

    btnPartenze.className = tipo === 'partenze' ? 'active' : '';
    btnArrivi.className = tipo === 'arrivi' ? 'active' : '';

    const now = new Date().toString();
    const endpoint = `${API_BASE_URL}/${tipo}/${stazioneCorrenteId}/${now}`;

    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(endpoint));
        const treni = await response.json();
        mostraTreni(treni, tipo);
    } catch (e) { trainList.innerHTML = '<li>Errore nel caricamento dati.</li>'; }
}

btnPartenze.onclick = () => caricaTabellone('partenze');
btnArrivi.onclick = () => caricaTabellone('arrivi');

function mostraTreni(treni, tipo) {
    trainList.innerHTML = '';
    if (!treni.length) { trainList.innerHTML = '<li>Nessun treno trovato.</li>'; return; }

    treni.forEach(t => {
        const ritardo = t.ritardo;
        const li = document.createElement('li');
        li.className = 'train-item';
        li.innerHTML = `
            <div>
                <strong>${t.compTipologiaTreno} ${t.numeroTreno}</strong><br>
                <small>${tipo === 'partenze' ? 'Per: ' + t.destinazione : 'Da: ' + t.origine}</small>
            </div>
            <div style="text-align:right">
                <div>
                ${t.compOrarioPartenzaZeroEffettivo || t.compOrarioArrivoZeroEffettivo || t.compOrarioPartenza || t.compOrarioArrivo || '--:--'}
                </div>
                <span class="badge ${ritardo > 0 ? 'ritardo-si' : 'ritardo-no'}">
                    ${ritardo > 0 ? '+' + ritardo : 'In orario'}
                </span>
            </div>
        `;
        li.onclick = () => apriDettaglioTreno(t.numeroTreno);
        trainList.appendChild(li);
    });

    const soglia = parseInt(delayThresholdInput.value);
    let treniInRitardo = 0;

    treni.forEach(t => {
        if (t.ritardo > soglia) {
            treniInRitardo++;
        }
    });

    if (treniInRitardo > 0) {
        mostraAvviso(`⚠️ Attenzione: ci sono ${treniInRitardo} treni con oltre ${soglia} min di ritardo!`);
    }
}

async function apriDettaglioTreno(num) {
    modal.classList.remove('hidden');
    modalTitle.textContent = `Treno ${num}`;
    modalInfo.textContent = "Caricamento percorso... ⏳";
    fermateList.innerHTML = '';

    try {
        const searchUrl = `${API_BASE_URL}/cercaNumeroTrenoTrenoAutocomplete/${num}`;
        const res = await fetch(CORS_PROXY + encodeURIComponent(searchUrl));
        const text = await res.text();
        const idFull = text.split('|')[1]?.trim();
        if (!idFull) throw new Error("Dati treno non trovati");

        const [numero, origine, data] = idFull.split('-');
        const detailUrl = `${API_BASE_URL}/andamentoTreno/${origine}/${numero}/${data}`;
        const resDetail = await fetch(CORS_PROXY + encodeURIComponent(detailUrl));
        const d = await resDetail.json();

        modalInfo.innerHTML = `
            <strong>${d.compTipologiaTreno || 'Treno'} ${d.numeroTreno}</strong><br>
            Da: <strong>${d.origine}</strong> - A: <strong>${d.destinazione}</strong><br>
            Stato: <strong>${d.compRitardo[0] || "In orario"}</strong>
        `;

        let indiceUltimaFermata = -1;
        d.fermate.forEach((f, i) => {
            if (f.arrivoReale || f.partenzaReale) {
                indiceUltimaFermata = i;
            }
        });

        d.fermate.forEach((f, index) => {
            const fLi = document.createElement('li');
            fLi.className = 'fermata-item';

            if (index < indiceUltimaFermata) {
                fLi.classList.add('fermata-passata');
            }

            if (index === indiceUltimaFermata && indiceUltimaFermata !== -1) {
                fLi.classList.add('fermata-corrente');
            }

            const orarioProg = f.partenza_teorica || f.arrivo_teorico;
            const orarioFormat = orarioProg ? new Date(orarioProg).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--';

            fLi.innerHTML = `
                <strong>${f.stazione}</strong><br>
                <small>Orario previsto: ${orarioFormat} | Bin: ${f.binarioEffettivoPartenzaDescrizione || f.binarioProgrammatoPartenzaDescrizione || '--'}</small>
            `;
            fermateList.appendChild(fLi);
        });

    } catch (e) { 
        console.error("Errore Dettaglio:", e);
        modalInfo.innerHTML = "❌ Dettagli del percorso non disponibili in questo momento."; 
    }
}

closeModalBtn.onclick = () => modal.classList.add('hidden');

// --- 5. BONUS: CRONOLOGIA STAZIONI ---
function mostraCronologia() {
    searchHistoryContainer.innerHTML = '';
    let cronologia = JSON.parse(localStorage.getItem('stazioniSalvate')) || [];

    cronologia.forEach(stazione => {
        const btn = document.createElement('button');
        btn.className = 'history-btn';
        btn.innerHTML = `🕒 ${stazione.nome}`;
        
        btn.onclick = () => {
            stationInput.value = stazione.nome;
            stazioneCorrenteNome = stazione.nome;
            stazioneCorrenteId = stazione.id;
            caricaTabellone('partenze');
        };
        searchHistoryContainer.appendChild(btn);
    });
}

function salvaRicerca(nome, id) {
    let cronologia = JSON.parse(localStorage.getItem('stazioniSalvate')) || [];
    cronologia = cronologia.filter(s => s.id !== id);
    cronologia.unshift({ nome, id });
    if (cronologia.length > 4) cronologia.pop();
    
    localStorage.setItem('stazioniSalvate', JSON.stringify(cronologia));
    mostraCronologia();
}

mostraCronologia();

// --- 6. BONUS: CONTATORE TRENI IN TEMPO REALE ---
async function aggiornaContatore() {
    const timestamp = Date.now();
    const endpoint = `${API_BASE_URL}/statistiche/${timestamp}`;
    
    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(endpoint));
        const statistiche = await response.json();
        
        let inViaggio = 0;
        if (Array.isArray(statistiche)) {
            inViaggio = statistiche.reduce((tot, reg) => tot + (reg.treniCircolanti || 0), 0);
        } else {
            inViaggio = statistiche.treniCircolanti || Object.values(statistiche).length || 0;
        }

        if (inViaggio > 0) {
            trainCounterDisplay.innerHTML = `<span class="live-dot">●</span> ${inViaggio} treni in viaggio`;
        } else {
            trainCounterDisplay.innerHTML = `<span class="live-dot" style="color: #ccc; animation: none;">●</span> Dati in attesa`;
        }
    } catch (error) {
        trainCounterDisplay.innerHTML = `<span class="live-dot" style="color: #ff3b30; animation: none;">●</span> Offline`;
    }
}

aggiornaContatore();
setInterval(aggiornaContatore, 60000);

// --- TEMA SCURO ---
try {
    const savedTheme = localStorage.getItem('tema');
    if (savedTheme === 'scuro') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
    }
} catch (e) {}

themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    try {
        localStorage.setItem('tema', isDark ? 'scuro' : 'chiaro');
    } catch (e) {}
});

// --- 7. BONUS: NOTIFICHE RITARDO ---
function mostraAvviso(messaggio) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = messaggio;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// --- 8. RICERCA DIRETTA TRENO ---
searchTrainBtn.addEventListener('click', () => {
    const numero = trainNumberInput.value.trim();
    if (numero !== '') {
        apriDettaglioTreno(numero);
        trainNumberInput.value = ''; 
    }
});

trainNumberInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchTrainBtn.click();
});

// --- 9. BONUS: NEWS IN TEMPO REALE ---
// --- 9. BONUS: NEWS IN TEMPO REALE ---
async function caricaNews() {
    // 1. Forziamo SEMPRE l'italiano per l'API, altrimenti Trenitalia non restituisce nulla
    const endpoint = `${API_BASE_URL}/news/0/it`;
    
    try {
        // 2. Mostriamo temporaneamente la scritta "Loading..." nella lingua corretta
        newsContent.innerHTML = translations['loading_news'];
        newsTicker.classList.remove('hidden');

        const response = await fetch(CORS_PROXY + encodeURIComponent(endpoint));
        const newsArray = await response.json();
        
        if (newsArray && newsArray.length > 0) {
            // 3. Inseriamo le notizie reali (che resteranno in italiano)
            const testoUnito = newsArray.map(news => {
                let testoPulito = news.testo.replace(/<[^>]*>?/gm, ''); 
                return `⚠️ ${testoPulito}`;
            }).join(' &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; ');
            
            newsContent.innerHTML = testoUnito;
        } else {
            newsTicker.classList.add('hidden');
        }
    } catch (error) {
        console.warn("Impossibile caricare le news in questo momento.");
        newsTicker.classList.add('hidden');
    }
}
caricaNews();

// --- 10. BONUS: METEO AVANZATO (AUTOCOMPLETAMENTO + WTTR.IN) ---

// A. Funzione per cercare le città nella mappa e mostrarle nella tendina
async function cercaCittaMeteo(testo) {
    if (testo.length < 3) {
        weatherAutocompleteResults.classList.add('hidden');
        return;
    }
    
    // Usiamo Open-Meteo SOLO come motore di ricerca per farti apparire i nomi giusti
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(testo)}&count=5&language=it&format=json`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        weatherAutocompleteResults.innerHTML = '';
        if (data.results && data.results.length > 0) {
            data.results.forEach(citta => {
                const li = document.createElement('li');
                // Mostra il nome della città e la provincia (se c'è) per distinguere comuni con nomi uguali
                const extraInfo = citta.admin1 ? ` (${citta.admin1})` : '';
                li.textContent = `${citta.name}${extraInfo}`;
                
                li.onclick = () => {
                    weatherInput.value = citta.name; 
                    weatherAutocompleteResults.classList.add('hidden');
                    salvaRicercaMeteo(citta.name);
                    aggiornaMeteo(citta.name);
                };
                weatherAutocompleteResults.appendChild(li);
            });
            weatherAutocompleteResults.classList.remove('hidden');
        } else {
            weatherAutocompleteResults.classList.add('hidden');
        }
    } catch (error) {
        console.error("Errore autocomplete meteo:", error);
    }
}

// B. Gestione degli eventi di scrittura nell'input meteo
weatherInput.addEventListener('input', (e) => cercaCittaMeteo(e.target.value.trim()));

// Nascondi le tendine se l'utente clicca fuori
document.addEventListener('click', (e) => {
    if (!stationInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
        autocompleteResults.classList.add('hidden');
    }
    if (!weatherInput.contains(e.target) && !weatherAutocompleteResults.contains(e.target)) {
        weatherAutocompleteResults.classList.add('hidden');
    }
});

// C. Gestione Cronologia Meteo
function mostraCronologiaMeteo() {
    weatherHistoryContainer.innerHTML = '';
    let cronologia = JSON.parse(localStorage.getItem('meteoSalvati')) || [];

    cronologia.forEach(citta => {
        const btn = document.createElement('button');
        btn.className = 'history-btn';
        btn.innerHTML = `🌤️ ${citta}`;
        
        btn.onclick = () => {
            weatherInput.value = citta;
            aggiornaMeteo(citta);
        };
        weatherHistoryContainer.appendChild(btn);
    });
}

function salvaRicercaMeteo(citta) {
    let cronologia = JSON.parse(localStorage.getItem('meteoSalvati')) || [];
    cronologia = cronologia.filter(c => c.toLowerCase() !== citta.toLowerCase());
    cronologia.unshift(citta);
    if (cronologia.length > 4) cronologia.pop();
    
    localStorage.setItem('meteoSalvati', JSON.stringify(cronologia));
    mostraCronologiaMeteo();
}

mostraCronologiaMeteo();

// D. Funzione per scaricare il Meteo effettivo
async function aggiornaMeteo(citta) {
    if (!citta) return;
    
    try {
        weatherContent.innerHTML = 'Caricamento meteo... ⏳';
        weatherCard.classList.remove('hidden');

        // Effettuiamo la chiamata API a wttr.in per scaricare il clima
        // Passiamo currentLang (it o en) all'endpoint wttr.in
        const weatherUrl = `https://wttr.in/${encodeURIComponent(citta)}?format=j1&lang=${currentLang}`;
        const weatherRes = await fetch(weatherUrl);
        
        if (!weatherRes.ok) throw new Error("Città non trovata o errore API");
        
        const weatherData = await weatherRes.json();
        const current = weatherData.current_condition[0];
        
        const temp = current.temp_C;
        const wind = current.windspeedKmph;
        const desc = current.lang_it ? current.lang_it[0].value : current.weatherDesc[0].value;
        const code = current.weatherCode;
        
        let icon = "☁️"; 
        if (code === "113") icon = "☀️"; 
        else if (code === "116" || code === "119") icon = "⛅"; 
        else if (["122", "143", "248", "260"].includes(code)) icon = "🌫️"; 
        else if (["176", "263", "266", "293", "296", "299", "302", "305", "308", "353"].includes(code)) icon = "🌧️"; 
        else if (["200", "386", "389"].includes(code)) icon = "⛈️"; 
        else if (["179", "227", "230", "320", "323", "326", "329", "332", "335", "338", "350", "368", "371", "392", "395"].includes(code)) icon = "❄️"; 

        weatherContent.innerHTML = `
            <div class="weather-main">
                <span class="weather-icon">${icon}</span>
                <span class="weather-temp">${temp}°C</span>
            </div>
            <div class="weather-info">
                <span class="weather-desc">${desc}</span>
                <span class="weather-details">Vento: ${wind} km/h</span>
            </div>
        `;
    } catch (error) {
        // Nessun messaggio a schermo: se fallisce, nasconde semplicemente la card
        console.warn("Meteo non disponibile (ignoro silenziosamente):", error);
        weatherCard.classList.add('hidden');
    }
}

// Avvio della ricerca cliccando sul tasto o premendo invio
searchWeatherBtn.addEventListener('click', () => {
    const citta = weatherInput.value.trim();
    
    // Se la stringa ha senso (almeno 3 lettere), procede. Altrimenti NON FA NULLA.
    if (citta.length >= 3) {
        weatherAutocompleteResults.classList.add('hidden');
        salvaRicercaMeteo(citta);
        aggiornaMeteo(citta);
    }
});

weatherInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeatherBtn.click();
});