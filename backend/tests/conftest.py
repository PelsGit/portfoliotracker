import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


SAMPLE_CSV = (
    "Datum,Tijd,Valutadatum,Product,ISIN,Beurs,Uitvoeringsplaats,"
    "Aantal,Koers,Lokale waarde,Waarde,Wisselkoers,"
    "Transactiekosten en/of,Totaal,Order ID\n"
    '13-03-2024,10:32,15-03-2024,ASML HOLDING,NL0010273215,XAMS,XAMS,'
    '5,"EUR 756,20","EUR -3.781,00","EUR -3.781,00",,'
    '"EUR -2,00","EUR -3.783,00",abc123\n'
)

SAMPLE_CSV_SELL = (
    "Datum,Tijd,Valutadatum,Product,ISIN,Beurs,Uitvoeringsplaats,"
    "Aantal,Koers,Lokale waarde,Waarde,Wisselkoers,"
    "Transactiekosten en/of,Totaal,Order ID\n"
    '13-03-2024,10:32,15-03-2024,ASML HOLDING,NL0010273215,XAMS,XAMS,'
    '-3,"EUR 800,50","EUR 2.401,50","EUR 2.401,50",,'
    '"EUR -2,00","EUR 2.399,50",def456\n'
)
