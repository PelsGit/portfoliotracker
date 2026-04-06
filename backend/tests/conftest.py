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


# Synthetic Account CSV matching the real DEGIRO format.
# Columns: Datum,Tijd,Valutadatum,Product,ISIN,Omschrijving,FX,Mutatie,,Saldo,,Order Id
ACCOUNT_CSV_HEADER = "Datum,Tijd,Valutadatum,Product,ISIN,Omschrijving,FX,Mutatie,,Saldo,,Order Id\n"

# A single USD buy: 10 shares @ 50.00 USD, FX 1.10, cost EUR -2.00
SAMPLE_BUY_ROWS = (
    '01-04-2026,15:00,01-04-2026,TEST CORP,US1234567890,Valuta Creditering,"1,10",USD,"500,00",USD,"0,00",aaa-111\n'
    '01-04-2026,15:00,01-04-2026,TEST CORP,US1234567890,Valuta Debitering,,EUR,"-454,55",EUR,"100,00",aaa-111\n'
    '01-04-2026,15:00,01-04-2026,TEST CORP,US1234567890,DEGIRO Transactiekosten en/of kosten van derden,,EUR,"-2,00",EUR,"98,00",aaa-111\n'
    '01-04-2026,15:00,01-04-2026,TEST CORP,US1234567890,"Koop 10 @ 50,00 USD",,USD,"-500,00",USD,"-500,00",aaa-111\n'
)

# A single USD sell: 5 shares @ 80.00 USD, FX 1.08, cost EUR -2.00
SAMPLE_SELL_ROWS = (
    '02-04-2026,16:00,02-04-2026,TEST CORP,US1234567890,Valuta Debitering,"1,08",USD,"-400,00",USD,"0,00",bbb-222\n'
    '02-04-2026,16:00,02-04-2026,TEST CORP,US1234567890,Valuta Creditering,,EUR,"370,37",EUR,"470,37",bbb-222\n'
    '02-04-2026,16:00,02-04-2026,TEST CORP,US1234567890,DEGIRO Transactiekosten en/of kosten van derden,,EUR,"-2,00",EUR,"468,37",bbb-222\n'
    '02-04-2026,16:00,02-04-2026,TEST CORP,US1234567890,"Verkoop 5 @ 80,00 USD",,USD,"400,00",USD,"400,00",bbb-222\n'
)

# Two partial fills under the same order: 3 + 7 = 10 shares
SAMPLE_PARTIAL_FILL_ROWS = (
    '03-04-2026,10:00,03-04-2026,OTHER CORP,US9876543210,Valuta Creditering,"1,10",USD,"150,00",USD,"0,00",ccc-333\n'
    '03-04-2026,10:00,03-04-2026,OTHER CORP,US9876543210,Valuta Debitering,,EUR,"-136,36",EUR,"50,00",ccc-333\n'
    '03-04-2026,10:00,03-04-2026,OTHER CORP,US9876543210,Valuta Creditering,"1,10",USD,"350,00",USD,"0,00",ccc-333\n'
    '03-04-2026,10:00,03-04-2026,OTHER CORP,US9876543210,Valuta Debitering,,EUR,"-318,18",EUR,"50,00",ccc-333\n'
    '03-04-2026,10:00,03-04-2026,OTHER CORP,US9876543210,DEGIRO Transactiekosten en/of kosten van derden,,EUR,"-2,00",EUR,"48,00",ccc-333\n'
    '03-04-2026,10:00,03-04-2026,OTHER CORP,US9876543210,"Koop 3 @ 50,00 USD",,USD,"-150,00",USD,"-150,00",ccc-333\n'
    '03-04-2026,10:00,03-04-2026,OTHER CORP,US9876543210,"Koop 7 @ 50,00 USD",,USD,"-350,00",USD,"-500,00",ccc-333\n'
)

# Non-trade rows that should be ignored
SAMPLE_NON_TRADE_ROWS = (
    '01-04-2026,01:35,01-04-2026,,,iDEAL Deposit,,EUR,"500,00",EUR,"600,00",\n'
    '01-04-2026,20:30,01-04-2026,,,Degiro Cash Sweep Transfer,,EUR,"-200,00",EUR,"400,00",\n'
    '01-04-2026,07:21,01-04-2026,META PLATFORMS INC CLASS A,US30303M1027,Dividend,,USD,"4,20",USD,"3,57",\n'
)

SAMPLE_CSV = ACCOUNT_CSV_HEADER + SAMPLE_BUY_ROWS
SAMPLE_CSV_SELL = ACCOUNT_CSV_HEADER + SAMPLE_SELL_ROWS
SAMPLE_CSV_PARTIAL = ACCOUNT_CSV_HEADER + SAMPLE_PARTIAL_FILL_ROWS
SAMPLE_CSV_MULTI = ACCOUNT_CSV_HEADER + SAMPLE_BUY_ROWS + SAMPLE_SELL_ROWS + SAMPLE_NON_TRADE_ROWS
