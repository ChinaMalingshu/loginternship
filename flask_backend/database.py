from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

SQLALCHEMY_DATABASE_URL = "sqlite:///./auth.db"

engine = create_engine(
  SQLALCHEMY_DATABASE_URL,
  connect_args={"check_same_thread": False},
)

SessionLocal = scoped_session(
  sessionmaker(autocommit=False, autoflush=False, bind=engine)
)
