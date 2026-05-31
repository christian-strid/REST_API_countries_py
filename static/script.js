const previousPageButton = document.getElementById("previousPageButton");
const nextPageButton = document.getElementById("nextPageButton");

const countriesList = document.getElementById("countriesList");
const pageInfo = document.getElementById("pageInfo");

const searchInput = document.getElementById("searchInput");
const regionFilter = document.getElementById("regionFilter");
const sortSelect = document.getElementById("sortSelect");
const directionSelect = document.getElementById("directionSelect");
const visitedOnlyToggle = document.getElementById("visitedOnlyToggle");

let currentPage = 1;
const PAGE_SIZE = 20;
let totalPages = 1;


// Event listeners
visitedOnlyToggle.addEventListener("change", handleFilterChange);
regionFilter.addEventListener("change", handleFilterChange);
sortSelect.addEventListener("change", handleFilterChange);
directionSelect.addEventListener("change", handleFilterChange);

previousPageButton.addEventListener("click", handlePreviousPage);
nextPageButton.addEventListener("click", handleNextPage);

// searchInput.addEventListener("input", handleSearchInput);


// Starta sidan
loadCountries();


// -----------------------------
// Event-funktioner
// -----------------------------

function handleFilterChange() {
    currentPage = 1;
    loadCountries();
}

function handlePreviousPage() {
    if (currentPage > 1) {
        currentPage = currentPage - 1;
        loadCountries();
    }
}

function handleNextPage() {
    if (currentPage < totalPages) {
        currentPage = currentPage + 1;
        loadCountries();
    }
}

// function handleSearchInput() {
//     console.log("Search value:", searchInput.value);
// }


// -----------------------------
// Huvudfunktion
// -----------------------------

async function loadCountries() {
    const showOnlyVisited = visitedOnlyToggle.checked;

    if (showOnlyVisited) {
        await loadOnlyVisitedCountries();
    } else {
        await loadAllCountries();
    }
}


// -----------------------------
// Ladda alla länder, API-anrop för alla länder och besökta länder
// -----------------------------

async function loadAllCountries() {
    const region = regionFilter.value;
    const sortBy = sortSelect.value;
    const direction = directionSelect.value;

    let url = "/api/countries";
    url += "?page=" + currentPage;
    url += "&limit=" + PAGE_SIZE;
    url += "&sort_by=" + sortBy;
    url += "&direction=" + direction;

    if (region !== "") {
        url += "&region=" + encodeURIComponent(region);
    }

    const countriesResponse = await fetch(url);
    const countriesData = await countriesResponse.json();

    const visitedResponse = await fetch("/api/visited");
    const visitedCountries = await visitedResponse.json();

    totalPages = countriesData.total_pages;

    countriesList.innerHTML = "";

    for (const country of countriesData.countries) {
        const visitedCountry = findVisitedCountry(country.name, visitedCountries);
        renderCountryCard(country, visitedCountry);
    }

    updatePageInfo(countriesData.page, countriesData.total_pages);
}


// -----------------------------
// Ladda endast besökta länder
// -----------------------------

async function loadOnlyVisitedCountries() {
    const response = await fetch("/api/visited");
    let visitedCountries = await response.json();

    const region = regionFilter.value;

    if (region !== "") {
        visitedCountries = filterCountriesByRegion(visitedCountries, region);
    }

    sortCountries(visitedCountries);

    countriesList.innerHTML = "";

    for (const country of visitedCountries) {
        renderCountryCard(country, country);
    }

    previousPageButton.disabled = true;
    nextPageButton.disabled = true;

    let pageInfoText = "Visar alla " + visitedCountries.length + " besökta länder";

    if (region !== "") {
        pageInfoText = pageInfoText + " i regionen " + region;
    }

    pageInfo.textContent = pageInfoText;
}


// -----------------------------
// Rendera kort
// -----------------------------

function renderCountryCard(country, visitedCountry) {
    const card = document.createElement("li");
    card.classList.add("country-card");

    if (visitedCountry !== null) {
        card.classList.add("visited-card");
    }

    const countryHeader = createCountryHeader(country, visitedCountry);
    const countryBody = createCountryBody(country);
    const countryActions = createCountryActions(country, visitedCountry);

    card.appendChild(countryHeader);
    card.appendChild(countryBody);
    card.appendChild(countryActions);

    countriesList.appendChild(card);
}

function createCountryHeader(country, visitedCountry) {
    const header = document.createElement("div");
    header.classList.add("country-card-header");

    const titleContainer = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = country.name;

    const code = document.createElement("span");
    code.textContent = country.cca3;

    titleContainer.appendChild(title);
    titleContainer.appendChild(code);

    header.appendChild(titleContainer);

    if (visitedCountry !== null) {
        const badge = document.createElement("span");
        badge.classList.add("visited-badge");
        badge.textContent = "Besökt";

        header.appendChild(badge);
    }

    return header;
}

function createCountryBody(country) {
    const body = document.createElement("div");
    body.classList.add("country-card-body");

    const capital = document.createElement("p");
    capital.innerHTML = "<strong>Huvudstad:</strong> " + getCapitalText(country);

    const region = document.createElement("p");
    region.innerHTML = "<strong>Region:</strong> " + country.region;

    const population = document.createElement("p");
    population.innerHTML = "<strong>Population:</strong> " + getPopulationText(country);

    body.appendChild(capital);
    body.appendChild(region);
    body.appendChild(population);

    return body;
}

function createCountryActions(country, visitedCountry) {
    const actions = document.createElement("div");
    actions.classList.add("country-card-actions");

    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.placeholder = "Notes...";

    if (visitedCountry !== null) {
        noteInput.value = visitedCountry.note;
    }

    actions.appendChild(noteInput);

    if (visitedCountry !== null) {
        noteInput.addEventListener("blur", function () {
            updateVisitedCountry(country.name, noteInput.value);
        });

        const removeButton = document.createElement("button");
        removeButton.textContent = "Ta bort från besökta";
        removeButton.classList.add("remove-visited-button");

        removeButton.addEventListener("click", function () {
            removeVisitedCountry(country.name);
        });

        actions.appendChild(removeButton);
    } else {
        const markButton = document.createElement("button");
        markButton.textContent = "Markera";
        markButton.classList.add("mark-button");

        markButton.addEventListener("click", function () {
            addVisitedCountry(country.name, noteInput.value);
        });

        actions.appendChild(markButton);
    }

    return actions;
}


// -----------------------------
// Hjälpfunktioner för data
// -----------------------------

function findVisitedCountry(countryName, visitedCountries) {
    for (const visitedCountry of visitedCountries) {
        if (visitedCountry.name.toLowerCase() === countryName.toLowerCase()) {
            return visitedCountry;
        }
    }

    return null;
}

function filterCountriesByRegion(countries, selectedRegion) {
    const filteredCountries = [];

    for (const country of countries) {
        const countryRegion = country.region;

        if (countryRegion !== null && countryRegion !== undefined) {
            if (countryRegion.toLowerCase() === selectedRegion.toLowerCase()) {
                filteredCountries.push(country);
            }
        }
    }

    return filteredCountries;
}


// Sortera länder baserat på valt sorteringsalternativ
function sortCountries(countries) {
    const sortBy = sortSelect.value;

    if (sortBy === "population") {
        sortCountriesByPopulation(countries);
    }

    if (sortBy === "name") {
        sortCountriesByName(countries);
    }

    if (sortBy === "region") {
        sortCountriesByRegion(countries);
    }
}


//-----------------------------
// Hjälpfunktioner för sorteringen
//-----------------------------
function sortCountriesByPopulation(countries) {
    countries.sort(function (firstCountry, secondCountry) {
        let firstPopulation = firstCountry.population;
        let secondPopulation = secondCountry.population;

        if (firstPopulation === null || firstPopulation === undefined) {
            firstPopulation = 0;
        }

        if (secondPopulation === null || secondPopulation === undefined) {
            secondPopulation = 0;
        }

        firstPopulation = Number(firstPopulation);
        secondPopulation = Number(secondPopulation);

        return compareValuesFunk(firstPopulation, secondPopulation);
    });
}

function sortCountriesByName(countries) {
    countries.sort(function (firstCountry, secondCountry) {
        let firstName = firstCountry.name;
        let secondName = secondCountry.name;

        if (firstName === null || firstName === undefined) {
            firstName = "";
        }

        if (secondName === null || secondName === undefined) {
            secondName = "";
        }

        firstName = firstName.toLowerCase();
        secondName = secondName.toLowerCase();

        return compareValuesFunk(firstName, secondName);
    });
}

function sortCountriesByRegion(countries) {
    countries.sort(function (firstCountry, secondCountry) {
        let firstRegion = firstCountry.region;
        let secondRegion = secondCountry.region;

        if (firstRegion === null || firstRegion === undefined) {
            firstRegion = "";
        }

        if (secondRegion === null || secondRegion === undefined) {
            secondRegion = "";
        }

        firstRegion = firstRegion.toLowerCase();
        secondRegion = secondRegion.toLowerCase();

        return compareValuesFunk(firstRegion, secondRegion);
    });
}


function compareValuesFunk(firstValue, secondValue) {
    const direction = directionSelect.value;

    if (firstValue < secondValue) {
        if (direction === "asc") {
            return -1;
        } else {
            return 1;
        }
    }

    if (firstValue > secondValue) {
        if (direction === "asc") {
            return 1;
        } else {
            return -1;
        }
    }

    return 0;
}


function getCapitalText(country) {
    if (country.capital === null || country.capital === undefined) {
        return "Saknas";
    }

    return country.capital;
}

function getPopulationText(country) {
    if (country.population === null || country.population === undefined) {
        return "Saknas";
    }

    return country.population.toLocaleString("sv-SE");
}

function updatePageInfo(page, totalPagesFromApi) {
    pageInfo.textContent = "Sida " + page + " av " + totalPagesFromApi;

    previousPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage >= totalPages;
}


// -----------------------------
// API-anrop visited
// -----------------------------

async function addVisitedCountry(name, note) {
    const encodedName = encodeURIComponent(name);
    const url = "/api/visited/" + encodedName;

    const dataToSend = {
        note: note
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dataToSend)
    });

    if (response.ok === false) {
        alert("Kunde inte markera landet som besökt.");
        return;
    }

    await loadCountries();
}

async function updateVisitedCountry(name, note) {
    const encodedName = encodeURIComponent(name);
    const url = "/api/visited/" + encodedName;

    const dataToSend = {
        note: note
    };

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dataToSend)
    });

    if (response.ok === false) {
        alert("Kunde inte uppdatera anteckningen.");
        return;
    }

    await loadCountries();
}

async function removeVisitedCountry(name) {
    const encodedName = encodeURIComponent(name);
    const url = "/api/visited/" + encodedName;

    const response = await fetch(url, {
        method: "DELETE"
    });

    if (response.ok === false) {
        alert("Kunde inte ta bort landet.");
        return;
    }

    await loadCountries();
}