"""Persistent synthetic Sepolia demo, isolated from main and Anvil records."""
import argparse
import secrets
from pathlib import Path
import psycopg
from dotenv import set_key, dotenv_values
from fastapi.testclient import TestClient
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from ..auth.repository import AuthRepository
from ..config import Settings, get_settings
from ..main import create_app
from .review_officer import review

ENV = Path(__file__).parents[2] / '.env.sepolia'
PASSWORD = 'Demo-Only-Password-2026!'
SCHEMA = 'titlelock_sepolia_demo'


def setup():
    existing = Settings(_env_file=ENV)
    if existing.app_env == 'production':
        raise RuntimeError('Synthetic demo setup is disabled in production')
    if existing.database_url:
        params=conninfo_to_dict(existing.database_url)
        if params.get('dbname')!='titlelock_auth_test' or params.get('options')!=f'-c search_path={SCHEMA}':
            raise RuntimeError('Refusing to modify a database outside the isolated Sepolia test schema')
        if dotenv_values(ENV).get('SEPOLIA_DEMO_SETUP_COMPLETE')=='true':
            print('Sepolia demo already configured; no records changed.')
            return
        scoped=existing.database_url
        base=make_conninfo(scoped,options='')
    else:
        params=conninfo_to_dict(get_settings().database_url)
        params['dbname']='titlelock_auth_test'
        base=make_conninfo(**params)
        scoped=make_conninfo(base,options=f'-c search_path={SCHEMA}')
    # Save stable secrets before any account is created so an interrupted setup resumes.
    for key,value in {'DATABASE_URL':scoped,'SECRET_KEY':existing.secret_key or secrets.token_urlsafe(48),
                      'SALE_TOKEN_SECRET':existing.sale_token_secret.get_secret_value() or secrets.token_urlsafe(48),
                      'REGISTRAR_SIGNUP_CODE':existing.registrar_signup_code.get_secret_value() or secrets.token_urlsafe(32),
                      'LOGIN_OTP_ENABLED':'false','FRONTEND_ORIGINS':'["http://localhost:5003","http://127.0.0.1:5003"]'}.items():
        set_key(ENV,key,value)
    ENV.chmod(0o600)
    settings=Settings(_env_file=ENV)
    with psycopg.connect(base, autocommit=True) as conn:
        conn.execute(f'CREATE SCHEMA IF NOT EXISTS {SCHEMA}')
    with psycopg.connect(scoped, autocommit=True) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),identity_reference text UNIQUE NOT NULL,
            display_name text,account_status text NOT NULL DEFAULT 'ACTIVE',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
            CREATE TABLE IF NOT EXISTS parcels(ulpin text PRIMARY KEY,current_owner_user_id uuid REFERENCES users(id),survey_number text,
            area_sqm numeric,registration_office text,ownership_type text,title_status text,risk_status text,frozen boolean DEFAULT false,
            freeze_reason text,last_registered_date date,transfer_history jsonb NOT NULL DEFAULT '[]',updated_at timestamptz DEFAULT now());
            CREATE TABLE IF NOT EXISTS ownerships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),parcel_id text REFERENCES parcels(ulpin),
            user_id uuid REFERENCES users(id),share_bps integer CHECK(share_bps>0 AND share_bps<=10000),active boolean NOT NULL);
            CREATE TABLE IF NOT EXISTS encumbrances(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),parcel_id text REFERENCES parcels(ulpin),status text,details jsonb,created_at timestamptz DEFAULT now());
            CREATE TABLE IF NOT EXISTS disputes(LIKE encumbrances INCLUDING ALL);''')
        for migration in sorted((Path(__file__).parents[2] / 'migrations').glob('*.sql')):
            conn.execute(migration.read_text())
    repo=AuthRepository(scoped)
    with repo.connect() as conn:
        complete=conn.execute("SELECT EXISTS(SELECT 1 FROM parcels p JOIN ownerships o ON o.parcel_id=p.ulpin WHERE p.ulpin='DEMO-SEPOLIA-001' AND o.active) AND (SELECT count(*) FROM auth_accounts WHERE username IN ('vedant_sepolia','yash_sepolia','rahul_sepolia'))=3 AS complete").fetchone()['complete']
    if complete:
        set_key(ENV,'SEPOLIA_DEMO_SETUP_COMPLETE','true')
        print('Existing Sepolia fixture preserved, including completed transfers.')
        return
    code=settings.registrar_signup_code.get_secret_value()
    client = TestClient(create_app(settings))
    ids = {}
    for name, display, role in [('vedant_sepolia','Vedant (Synthetic Seller)','CITIZEN'),
                               ('yash_sepolia','Yash (Synthetic Buyer)','CITIZEN'),
                               ('rahul_sepolia','Rahul (Synthetic Registrar)','REGISTRAR')]:
        data = {'username':name,'name':display,'email':name+'@example.com','password':PASSWORD,
                'phone':'+919000000001','role':role}
        data.update({'officerId':'SYNTHETIC-SEPOLIA-OFFICER','registrarCode':code} if role=='REGISTRAR' else {'aadhaar':'234567890123'})
        existing_account = AuthRepository(scoped).find_user(name)
        if existing_account:
            ids[name] = existing_account['user_id']
            continue
        response = client.post('/api/auth/signup', json=data)
        if response.status_code != 201:
            raise RuntimeError(f'Synthetic account setup failed: {response.status_code}')
        ids[name] = AuthRepository(scoped).find_user(name)['user_id']
    repo = AuthRepository(scoped)
    review(repo,'rahul_sepolia','APPROVED','SYNTHETIC-SEPOLIA-TEST-ONLY',settings.secret_key,'SYNTHETIC-SEPOLIA-OFFICER')
    with repo.connect() as conn:
        conn.execute('''INSERT INTO parcels(ulpin,current_owner_user_id,survey_number,area_sqm,registration_office,ownership_type,title_status,risk_status)
            VALUES ('DEMO-SEPOLIA-001',%s,'SYNTHETIC-SURVEY-001',100,'Synthetic test office','SOLE','VERIFIED','LOW')''',(ids['vedant_sepolia'],))
        conn.execute("INSERT INTO ownerships(parcel_id,user_id,share_bps,active) VALUES ('DEMO-SEPOLIA-001',%s,10000,true)",(ids['vedant_sepolia'],))
    set_key(ENV,'SEPOLIA_DEMO_SETUP_COMPLETE','true')
    ENV.chmod(0o600)
    print('Created isolated synthetic accounts and DEMO-SEPOLIA-001. Main and Anvil records unchanged.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['setup','serve'])
    args = parser.parse_args()
    if args.action=='setup':
        setup()
        return
    import uvicorn
    settings = Settings(_env_file=ENV)
    if settings.app_env == 'production':
        raise RuntimeError('Synthetic demo server is disabled in production')
    if f'search_path={SCHEMA}' not in settings.database_url or settings.chain_id!=11155111:
        raise RuntimeError('Configure the isolated Sepolia schema before starting this demo')
    app = create_app(settings)
    dist = ENV.parents[1] / 'frontend/dist'
    app.mount('/assets',StaticFiles(directory=dist/'assets'),name='assets')
    @app.get('/{path:path}',include_in_schema=False)
    def frontend(path: str):
        from fastapi import HTTPException
        if path.startswith('api/'):
            raise HTTPException(404)
        return FileResponse(dist/'index.html')
    uvicorn.run(app,host='127.0.0.1',port=5003)


if __name__=='__main__':
    main()
