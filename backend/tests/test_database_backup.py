import json
import os
from pathlib import Path
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo, conninfo_to_dict
import pytest

from app.cli.database_backup import backup, decrypt_archive, digest, encrypt_archive, pg_environment, restore, source_url


def test_encrypted_archive_requires_the_private_passphrase_and_detects_tampering(tmp_path):
    plain=tmp_path/'plain.pgdump'; plain.write_bytes(b'synthetic registry backup')
    secret=tmp_path/'backup-key'; secret.write_text('this-is-a-long-private-backup-passphrase')
    secret.chmod(0o600)
    encrypted=tmp_path/'archive.pgdump.enc'
    metadata=encrypt_archive(plain,encrypted,secret.read_bytes())
    restored=tmp_path/'restored.pgdump'
    decrypt_archive(encrypted,restored,metadata,secret.read_bytes())
    assert restored.read_bytes()==plain.read_bytes()
    metadata['tables']=[{'schema':'public','table':'forged','rows':1}]
    with pytest.raises(ValueError,match='manifest integrity'):
        decrypt_archive(encrypted,tmp_path/'forged.pgdump',metadata,secret.read_bytes())
    encrypted.unlink()
    metadata=encrypt_archive(plain,encrypted,secret.read_bytes())
    encrypted.write_bytes(encrypted.read_bytes()+b'changed')
    with pytest.raises(ValueError,match='integrity'):
        decrypt_archive(encrypted,tmp_path/'tampered.pgdump',metadata,secret.read_bytes())


def test_credentials_stay_in_private_temporary_files():
    with pg_environment("host=localhost dbname=titlelock user=app password='private:password\\\\value'") as environment:
        service=Path(environment['PGSERVICEFILE'])
        passfile=Path(environment['PGPASSFILE'])
        assert service.stat().st_mode & 0o777==0o600
        assert passfile.stat().st_mode & 0o777==0o600
        assert 'password' not in service.read_text()
        assert all('private:password' not in value for value in environment.values())
        assert '\\:' in passfile.read_text()
    assert not service.exists() and not passfile.exists()


def test_existing_backup_is_never_overwritten(tmp_path):
    path=tmp_path/'backup.pgdump'
    path.write_bytes(b'existing')
    with pytest.raises(ValueError,match='overwrite'):
        backup('unused',path)
    assert path.read_bytes()==b'existing'


def test_corrupt_archive_is_rejected_before_database_access(tmp_path,monkeypatch):
    path=tmp_path/'backup.pgdump'
    path.write_bytes(b'damaged')
    path.with_name(path.name+'.json').write_text(json.dumps({'version':1,'sha256':'wrong'}))
    monkeypatch.setattr(psycopg,'connect',lambda *args,**kwargs: pytest.fail('No database access before checksum verification'))
    with pytest.raises(ValueError,match='checksum'):
        restore('unused',path)


@pytest.fixture
def databases():
    url=os.environ.get('AUTH_TEST_DATABASE_URL')
    if not url:
        pytest.skip('AUTH_TEST_DATABASE_URL is not configured')
    source='titlelock_backup_test_'+uuid4().hex
    target='titlelock_restore_test_'+uuid4().hex
    admin_url=os.environ.get('AUTH_TEST_ADMIN_DATABASE_URL',url)
    owner=conninfo_to_dict(url)['user']
    created=[]
    try:
        with psycopg.connect(admin_url,autocommit=True) as admin:
            allowed=admin.execute('SELECT rolcreatedb FROM pg_roles WHERE rolname=current_user').fetchone()[0]
            if not allowed:
                pytest.skip('AUTH_TEST_ADMIN_DATABASE_URL with CREATEDB is required for isolated restore testing')
            for name in (source,target):
                admin.execute(sql.SQL('CREATE DATABASE {} OWNER {}').format(sql.Identifier(name),sql.Identifier(owner)))
                created.append(name)
        yield make_conninfo(url,dbname=source,options=''),make_conninfo(url,dbname=target,options='')
    finally:
        with psycopg.connect(admin_url,autocommit=True) as admin:
            for name in reversed(created):
                admin.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(name)))



def test_real_dump_restore_preserves_registry_and_revokes_sessions(databases,tmp_path,monkeypatch):
    source,target=databases
    with psycopg.connect(source) as conn:
        conn.execute('CREATE TABLE users(id integer PRIMARY KEY, name text NOT NULL)')
        conn.execute('CREATE TABLE ownerships(id integer PRIMARY KEY,user_id integer REFERENCES users,share_bps integer)')
        conn.execute('CREATE TABLE sale_events(id serial PRIMARY KEY,action text,details jsonb)')
        for table in ('auth_sessions','login_challenges','chain_wallet_challenges'):
            conn.execute(sql.SQL('CREATE TABLE {}(token text,user_id integer REFERENCES users)').format(sql.Identifier(table)))
            conn.execute('INSERT INTO users VALUES (1,%s) ON CONFLICT DO NOTHING',('Synthetic owner',))
            conn.execute(sql.SQL('INSERT INTO {} VALUES (%s,1)').format(sql.Identifier(table)),('restored-credential',))
        conn.execute('INSERT INTO ownerships VALUES (1,1,10000)')
        conn.execute("INSERT INTO sale_events(action,details) VALUES ('TRANSFER_COMPLETED','{\"parcel\":\"SYNTHETIC-1\"}')")
    # A write after the exported snapshot must not change the archived row counts.
    from app.cli import database_backup
    run=database_backup.run_pg
    def concurrent_write(arguments,environment,output=None):
        if arguments[0]=='pg_dump':
            with psycopg.connect(source) as conn:
                conn.execute('INSERT INTO users VALUES (2,%s)',('Newer than backup snapshot',))
        return run(arguments,environment,output)
    monkeypatch.setattr(database_backup,'run_pg',concurrent_write)
    archive=tmp_path/'registry.pgdump'
    with psycopg.connect(source,autocommit=True) as other_session:
        other_session.execute('CREATE TEMP TABLE transient_work(id integer)')
        metadata=backup(source,archive)
    assert archive.stat().st_mode & 0o777==0o600
    assert archive.with_name(archive.name+'.json').stat().st_mode & 0o777==0o600
    assert metadata['sha256']==digest(archive)
    # Even a valid archive can never target the source database.
    with pytest.raises(ValueError,match='separate database'):
        restore(source,archive)
    restore(target,archive)
    with psycopg.connect(target) as conn:
        assert conn.execute('SELECT * FROM users').fetchall()==[(1,'Synthetic owner')]
        assert conn.execute('SELECT user_id,share_bps FROM ownerships').fetchall()==[(1,10000)]
        assert conn.execute('SELECT action,details FROM sale_events').fetchone()==('TRANSFER_COMPLETED',{'parcel':'SYNTHETIC-1'})
        for table in ('auth_sessions','login_challenges','chain_wallet_challenges'):
            assert conn.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier(table))).fetchone()[0]==0
        # Restored sequence advances correctly, beyond the backed-up event.
        assert conn.execute("INSERT INTO sale_events(action) VALUES ('RECOVERY_TEST') RETURNING id").fetchone()[0]==2
    with pytest.raises(ValueError,match='empty'):
        restore(target,archive)


def test_explicit_source_file_overrides_exported_database_url(tmp_path,monkeypatch):
    monkeypatch.setenv('APP_ENV','testing')
    monkeypatch.setenv('DATABASE_URL','host=wrong.example.com dbname=wrong user=wrong')
    config=tmp_path/'source.env'
    expected='host=selected.example.com dbname=selected user=app'
    config.write_text('DATABASE_URL="'+expected+'"\n')
    assert source_url(config)==expected
    with pytest.raises(ValueError,match='does not exist'):
        source_url(tmp_path/'missing.env')


def test_explicit_source_still_runs_production_validation(tmp_path,monkeypatch):
    from pydantic import ValidationError
    monkeypatch.setenv('APP_ENV','production')
    config=tmp_path/'source.env'
    config.write_text('DATABASE_URL="host=selected.example.com dbname=selected user=postgres"\nSECRET_KEY=weak\n')
    with pytest.raises(ValidationError):
        source_url(config)
