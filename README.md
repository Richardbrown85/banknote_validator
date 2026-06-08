# Banknote Validator

A proof-of-concept banknote validation system using an ESP32 camera module, Google Cloud Vision AI, and a Django web interface.

## How It Works

1. An **ESP32-WROVER** camera module captures an image of a banknote
2. The image is POSTed to a **Django** backend over WiFi
3. **Google Cloud Vision API** analyses the image and returns labels
4. The backend returns an **ACCEPT** or **REJECT** verdict
5. The **frontend** updates automatically via polling and displays the result

## Tech Stack

| Layer | Technology |
|---|---|
| Hardware | Elegoo ESP32-WROVER Camera V1.5 + OV2640 |
| Firmware | C++ (Arduino IDE) |
| Backend | Python / Django |
| Vision AI | Google Cloud Vision API |
| Frontend | HTML / CSS / JavaScript / Bootstrap 5 |

## Project Structure

```
banknote_validator/
├── banknote_validator/   # Django project settings and URLs
├── validator/            # Django app — views and logic
├── static/               # CSS and JavaScript
├── templates/            # HTML frontend
├── sketch_jun3a/         # ESP32 Arduino sketch
├── manage.py
└── .gitignore
```

## Setup

**1. Clone the repo**
```bash
git clone https://github.com/yourusername/banknote-validator.git
cd banknote-validator
```

**2. Create and activate a virtual environment**
```bash
python -m venv venv
venv\Scripts\activate
```

**3. Install dependencies**
```bash
pip install django google-cloud-vision pillow
```

**4. Add your Google credentials**

Download a service account JSON key from Google Cloud Console and update the path in `validator/views.py`.

**5. Run the server**
```bash
C:\venvs\banknote_venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

Then open the frontend at:

```
http://localhost:8000
```

**6. Flash the ESP32**

Open `sketch_jun3a/sketch_jun3a.ino` in Arduino IDE, update your WiFi credentials and Django server IP, then flash to the board.

## ESP32 Board Settings

| Setting | Value |
|---|---|
| Board | ESP32 Dev Module |
| Partition Scheme | Huge APP (3MB No OTA) |
| PSRAM | Enabled |
| Board Package | esp32 by Espressif 2.0.11 |

## Notes

- Frame size locked to CIF (400x296) for clean output on this board
- Google Cloud Vision billing must be enabled on your project
- Credentials JSON is excluded from version control via `.gitignore`

## Status

MVP complete. Keyword tuning and frontend polish in progress.