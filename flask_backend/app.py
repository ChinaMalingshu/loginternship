from datetime import datetime, date
from pathlib import Path

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

try:
  from .database import SessionLocal, engine
  from .models import Base, User
  from .security import hash_password, verify_password
except ImportError:
  from database import SessionLocal, engine  # type: ignore
  from models import Base, User  # type: ignore
  from security import hash_password, verify_password  # type: ignore

Base.metadata.create_all(bind=engine)

def ensure_user_columns():
  inspector = inspect(engine)
  try:
    columns = {column["name"] for column in inspector.get_columns("users")}
  except Exception:
    return

  with engine.begin() as connection:
    if "country" not in columns:
      connection.execute(text("ALTER TABLE users ADD COLUMN country VARCHAR"))
    if "bio" not in columns:
      connection.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))


ensure_user_columns()

BACKEND_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BACKEND_DIR.parent
TEMPLATE_DIR = BACKEND_DIR / "templates"

app = Flask(
  __name__,
  static_folder=str(FRONTEND_DIR),
  static_url_path="",
  template_folder=str(TEMPLATE_DIR),
)

CORS(
  app,
  origins=[
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "null",
  ],
  supports_credentials=True,
)


def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


def serialize_user(user: User):
  return {
    "id": user.id,
    "email": user.email,
    "first_name": user.first_name,
    "last_name": user.last_name,
    "mobile": (user.mobile or ""),
    "dob": (user.dob or ""),
    "country": getattr(user, "country", "") or "",
    "bio": getattr(user, "bio", "") or "",
  }


@app.route("/")
def serve_login():
  return app.send_static_file("index.html")


@app.route("/register")
def serve_register():
  return app.send_static_file("register.html")


@app.route("/dashboard")
def serve_dashboard():
  return render_template("dashboard.html")


@app.route("/health")
def health():
  return jsonify(status="ok")


@app.post("/api/register")
def register():
  data = request.get_json(force=True)

  required_fields = ("first_name", "last_name", "email", "password")
  missing = [field for field in required_fields if not data.get(field)]
  if missing:
    return jsonify(detail="Missing required fields."), 400

  first_name = data["first_name"].strip()
  last_name = data["last_name"].strip()
  if not first_name.isalpha() or not last_name.isalpha():
    return jsonify(detail="Names may only contain letters."), 400

  dob = (data.get("dob") or "").strip()
  mobile = (data.get("mobile") or "").strip()
  if mobile and len("".join(filter(str.isdigit, mobile))) < 10:
    return jsonify(detail="Mobile number must contain at least 10 digits."), 400

  country = (data.get("country") or "").strip()
  bio = (data.get("bio") or "").strip()

  with next(get_db()) as db:
    user = User(
      email=data["email"].strip(),
      first_name=first_name,
      last_name=last_name,
      dob=dob or None,
      mobile=mobile or None,
      country=country or None,
      bio=bio or None,
      hashed_password=hash_password(data["password"]),
    )
    db.add(user)
    try:
      db.commit()
    except IntegrityError:
      db.rollback()
      return jsonify(detail="Email already registered"), 400

    return jsonify(message="Registration successful", user=serialize_user(user)), 201


@app.post("/api/login")
def login():
  data = request.get_json(force=True)
  identifier = (data.get("identifier") or "").strip()
  password = data.get("password") or ""

  if not identifier or not password:
    return jsonify(detail="Invalid credentials"), 401

  with next(get_db()) as db:
    user = db.query(User).filter(User.email == identifier).first()

    if not user or not verify_password(password, user.hashed_password):
      return jsonify(detail="Invalid credentials"), 401

    return jsonify(message="Login successful", user=serialize_user(user))


@app.put("/api/users/<int:user_id>")
def update_user(user_id: int):
  data = request.get_json(force=True)

  errors = {}

  first_name = (data.get("first_name") or "").strip()
  last_name = (data.get("last_name") or "").strip()
  dob = (data.get("dob") or "").strip()
  mobile = (data.get("mobile") or "").strip()
  country = (data.get("country") or "").strip()
  bio = (data.get("bio") or "").strip()

  if not first_name:
    errors["first_name"] = "First name is required."
  elif not first_name.isalpha():
    errors["first_name"] = "First name may only contain letters."

  if not last_name:
    errors["last_name"] = "Last name is required."
  elif not last_name.isalpha():
    errors["last_name"] = "Last name may only contain letters."

  if dob:
    try:
      parsed_dob = datetime.strptime(dob, "%Y-%m-%d").date()
    except ValueError:
      errors["dob"] = "Enter date in YYYY-MM-DD format."
    else:
      if parsed_dob > date.today():
        errors["dob"] = "Date of birth cannot be in the future."

  if mobile:
    digits = "".join(filter(str.isdigit, mobile))
    if len(digits) < 10:
      errors["mobile"] = "Enter at least 10 digits for the phone number."

  if len(bio) > 280:
    errors["bio"] = "Bio must be 280 characters or fewer."

  if errors:
    return jsonify(detail="Validation error.", errors=errors), 400

  with next(get_db()) as db:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
      return jsonify(detail="User not found."), 404

    user.first_name = first_name
    user.last_name = last_name
    user.dob = dob or None
    user.mobile = mobile or None
    user.country = country or None
    user.bio = bio or None

    db.commit()
    db.refresh(user)

    return jsonify(message="Profile updated.", user=serialize_user(user))


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=8000, debug=True)
