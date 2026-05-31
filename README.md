Det här projektet är en enkel Flask-applikation som visar länder från en lokal JSON-fil och låter användaren markera länder som besökta.

## Förutsättningar

Du behöver ha följande installerat:

- Python
- pip
- Flask

Applikationen är körd via en virtuell miljö.

## Projektstruktur

Exempel på struktur:

```text
REST_API_countries_py
├── app.py
├── data
│   ├── countries.json
│   └── visited_countries.json
├── static
│   ├── index.html
│   ├── style.css
│   └── script.js
└── .venv
```

## Skapa och aktivera Virtuell Miljö

OBS! det krävs ej en virtuell miljö, men om man inte vill installera flask "globalt på datorn" så rekomenderas det.

Öppna terminal i rooten av projektet och skriv följande i terminalen:
```
- python -m venv .venv
```
aktiveras sedan via  powershell
```
powershell
.\.venv\\Scripts\\Activate.ps1
```
eller via cmd
```
win cmd
.venv\Scripts\activate.bat
```

Efter detta borde det stå `(.venv)` i början av terminalen.


## Installera Dependencies
Via terminalen:
```
python -m pip install flask
```
Vid behov kontrollera installationen via terminal:
```
python -m pip list
```

## Starta applikationen
Skriv följande i terminalen:
```
python app.py
```
Något liknande bör då dyka upp i terminalen:
```
Running on http://127.0.0.1:5000
```
## Testa applikationen
```
http://127.0.0.1:5000/
http://localhost:5000/
```

## Testa API-endpoints själv
```
http://localhost:5000/api/countries
http://localhost:5000/api/visited
http://localhost:5000/api/countries?region=Europe (Ändra region till valfritt)
http://localhost:5000/api/countries?sort_by=population&direction=desc (sortera på name, population eller region, ändra desc till asc)
```
