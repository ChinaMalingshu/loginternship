# Flask Frontend + API

This folder contains a lightweight Flask application that serves the HTML files located in `../python/` and also exposes the registration/login APIs.

## Install dependencies

```bash
cd flask_backend
python -m venv .venv
.venv\Scripts\activate
pip install flask flask-cors sqlalchemy bcrypt
```

## Run the server

```bash
python app.py
```

The app listens on `http://localhost:8000`. It serves:

- `GET /` → login page (`python/index.html`)
- `GET /register` → register page
- `POST /api/register` → create users (password hashed with bcrypt)
- `POST /api/login` → verify credentials
