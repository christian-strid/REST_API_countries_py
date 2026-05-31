from flask import Flask, jsonify, request, send_from_directory
import json
from pathlib import Path
from urllib.request import urlopen

app = Flask(__name__)

DATA_DIR = Path("data")
COUNTRIES_FILE = DATA_DIR / "countries.json"
COUNTRIES_VISITED_FILE = DATA_DIR / "visited_countries.json"

REST_COUNTRIES_URL = (
    "https://restcountries.com/v3.1/all"
    "?fields=name,capital,cca3,region,population"
)


# Hjälpfunktioner för att läsa och skriva JSON-filer.
def read_json_file(file_path):
    if not file_path.exists():
        return []

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def write_json_file(file_path, data):
    DATA_DIR.mkdir(exist_ok=True)

    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

# Förenkla länder från API:et så att vi bara sparar det vi behöver.
def simplify_country(country):
    name_data = country.get("name")
    common_name = None

    if name_data is not None:
        common_name = name_data.get("common")

    capitals = country.get("capital")
    capital = None

    if capitals is not None:
        if len(capitals) > 0:
            capital = capitals[0]

    simplified_country = {
        "cca3": country.get("cca3"),
        "name": common_name,
        "capital": capital,
        "region": country.get("region"),
        "population": country.get("population")
    }

    return simplified_country


def import_countries_from_api():
    with urlopen(REST_COUNTRIES_URL) as response:
        raw_data = response.read().decode("utf-8")
        countries_from_api = json.loads(raw_data)

    simplified_countries = []

    for country in countries_from_api:
        simplified_country = simplify_country(country)
        simplified_countries.append(simplified_country)

    write_json_file(COUNTRIES_FILE, simplified_countries)

    print("Countries imported successfully")
    print("Number of countries:", len(simplified_countries))



@app.route("/")
def home():
    return send_from_directory("static", "index.html")


# @app.route("/")
# def home():
#     return "Test så att backend fungerar!"


# @app.route("/api/test")
# def test_api():
#     return jsonify({
#         "message": "API fungerar!"
#     })
    

# @app.route("/api/import-countries")
# def import_countries():
#     with urlopen(REST_COUNTRIES_URL) as response:
#         raw_data = response.read().decode("utf-8")
#         countries_from_api = json.loads(raw_data)

#     simplified_countries = [
#         simplify_country(country)
#         for country in countries_from_api
#     ]

#     write_json_file(COUNTRIES_FILE, simplified_countries)

#     return jsonify({
#         "message": "Countries imported successfully",
#         "count": len(simplified_countries)
#     })


# Endpoint för att hämta länder med filtrering, sortering och paginering.
@app.route("/api/countries")
def get_countries():
    countries = read_json_file(COUNTRIES_FILE)

    # Hämta query-parametrar om de finns, annars använd standardvärden.
    region = request.args.get("region", "")
    sort_by = request.args.get("sort_by", "name")
    direction = request.args.get("direction", "asc")

    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 20, type=int)

    if page < 1 or limit < 1:
        return jsonify({
            "error": "page and limit must be 1 or higher"
        }), 400


    # 1. Filtrera
    if region:
        filtered_countries = []
        
        for country in countries:
            if country.get("region", "").lower() == region.lower():
                filtered_countries.append(country)
        countries = filtered_countries

    # 2. Sortera
    allowed_sort_fields = ["name", "population", "region"]

    if sort_by not in allowed_sort_fields:
        return jsonify({
            "error": "sort_by must be 'name', 'population' or 'region'"
        }), 400

    if direction not in ["asc", "desc"]:
        return jsonify({
            "error": "direction must be 'asc' or 'desc'"
        }), 400

    reverse_sort = False
    if direction == "desc":
        reverse_sort = True

    if sort_by == "population":
        # Konvertera till int för att sortera korrekt, hantera saknade värden som 0
        def get_population(country):
            population = country.get("population")

            if population is None:
                return 0

            return int(population)

        countries.sort(
            key=get_population,
            reverse=reverse_sort
        )
    elif sort_by == "name":

        def get_name(country):
            name = country.get("name")

            if name is None:
                return ""

            return name.lower()

        countries.sort(
            key=get_name,
            reverse=reverse_sort
        )

    elif sort_by == "region":

        def get_region(country):
            region = country.get("region")

            if region is None:
                return ""

            return region.lower()

        countries.sort(
            key=get_region,
            reverse=reverse_sort
        )

    # 3. Räkna total
    total_countries = len(countries)

    if total_countries == 0:
        total_pages = 0
    else:
        total_pages = total_countries // limit

        if total_countries % limit != 0:
            total_pages = total_pages + 1

    # 4. Paginera
    start_index = (page - 1) * limit
    end_index = start_index + limit

    paginated_countries = countries[start_index:end_index]

    return jsonify({
        "countries": paginated_countries,
        "page": page,
        "limit": limit,
        "total_countries": total_countries,
        "total_pages": total_pages
    })


# Endpoint för att hämta besökta länder med anteckningar och kompletterande information.
@app.route("/api/visited", methods=["GET"])
def get_visited_countries():
    visited_countries = read_json_file(COUNTRIES_VISITED_FILE)
    countries = read_json_file(COUNTRIES_FILE)
    
    result = []
    
    # För varje besökt land, hitta motsvarande information i länder-listan och inkludera den i resultatet.
    for visit in visited_countries:
        
        country_info = None
        # Leta efter landet i den fullständiga listan baserat på namnet.
        for country in countries:
            if country.get("name", "").lower() == visit.get("name", "").lower():
                country_info = country
                break
            
        # Om vi hittar landinformationen, inkludera den i resultatet tillsammans med anteckningen.
        if country_info:
            result.append({
                "name": visit.get("name"),
                "cca3": visit.get("cca3"),
                "note": visit.get("note"),
                "capital": country_info.get("capital"),
                "region": country_info.get("region"),
                "population": country_info.get("population")
            })
            
    return jsonify(result)
    
    # return jsonify(visited_countries)


# Endpoint för att lägga till eller uppdatera ett besökt land.
@app.route("/api/visited/<name>", methods=["POST"])
def add_visited_country(name):
    countries = read_json_file(COUNTRIES_FILE)
    visited_countries = read_json_file(COUNTRIES_VISITED_FILE)

    country = None
    for current_country in countries:
        if current_country.get("name", "").lower() == name.lower():
            country = current_country
            break

    if country is None:
        return jsonify({
            "error": "Country not found"
        }), 404

    body = request.get_json(silent=True) or {}
    note = body.get("note", "")

    existing_visit = None
    for visit in visited_countries:
        if visit.get("name", "").lower() == country["name"].lower():
            existing_visit = visit
            break

    if existing_visit:
        existing_visit["note"] = note
        message = "Visited country updated"
    else:
        visited_countries.append({
            "name": country["name"],
            "cca3": country["cca3"],
            "note": note
        })
        message = "Country marked as visited"

    write_json_file(COUNTRIES_VISITED_FILE, visited_countries)

    return jsonify({
        "message": message,
        "cca3": country["cca3"],
        "name": country["name"],
        "note": note
    }), 201


@app.route("/api/visited/<name>", methods=["PUT"])
def update_visited_country(name):
    visited_countries = read_json_file(COUNTRIES_VISITED_FILE)

    body = request.get_json(silent=True) or {}
    new_note = body.get("note", "")

    visited_country = None
    for visit in visited_countries:
        if visit.get("name", "").lower() == name.lower():
            visited_country = visit
            break

    if visited_country is None:
        return jsonify({
            "error": "Visited country not found"
        }), 404

    visited_country["note"] = new_note

    write_json_file(COUNTRIES_VISITED_FILE, visited_countries)

    return jsonify({
        "message": "Visited country note updated",
        "name": visited_country.get("name"),
        "note": visited_country.get("note")
    })
    
 
@app.route("/api/visited/<name>", methods=["DELETE"])
def delete_visited_country(name):
    visited_countries = read_json_file(COUNTRIES_VISITED_FILE)

    updated_visited_countries = []
    for visit in visited_countries:
        if visit.get("name", "").lower() != name.lower():
            updated_visited_countries.append(visit)

    if len(updated_visited_countries) == len(visited_countries):
        return jsonify({
            "error": "Visited country not found"
        }), 404

    write_json_file(COUNTRIES_VISITED_FILE, updated_visited_countries)

    return jsonify({
        "message": "Visited country removed",
        "name": name
    })  

if __name__ == "__main__":
    import_countries_from_api()
    app.run(debug=True)