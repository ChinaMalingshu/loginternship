from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
  __tablename__ = "users"

  id = Column(Integer, primary_key=True, index=True)
  email = Column(String, unique=True, index=True, nullable=False)
  hashed_password = Column(String, nullable=False)
  first_name = Column(String, nullable=False)
  last_name = Column(String, nullable=False)
  dob = Column(String, nullable=True)
  mobile = Column(String, nullable=True)
  country = Column(String, nullable=True)
  bio = Column(Text, nullable=True)
