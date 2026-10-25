"""PostgreSQL backups and offline restore to an empty titlelock_restore_* database."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import tempfile

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict

from ..config import Settings


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def private_secret(path):
    path=Path(path)
    if not path.is_file() or path.stat().st_mode & 0o077:
        raise ValueError('Encryption passphrase file must exist and be chmod 600')
    value=path.read_text().strip()
    if len(value)<24:
        raise ValueError('Encryption passphrase must contain at least 24 characters')
    return value.encode()


def encryption_key(secret, salt):
    return hashlib.pbkdf2_hmac('sha256',secret,salt,600_000,dklen=32)


def manifest_signature(metadata, secret):
    unsigned={key:value for key,value in metadata.items() if key!='manifest_hmac_sha256'}
    salt=bytes.fromhex(unsigned['salt'])
    encoded=json.dumps(unsigned,sort_keys=True,separators=(',',':')).encode()
    return hmac.new(encryption_key(secret,salt),encoded,hashlib.sha256).hexdigest()


def run_openssl(arguments):
    try:
        result=subprocess.run(arguments,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=False)
    except FileNotFoundError:
        raise ValueError('Install OpenSSL for encrypted backups') from None
    if result.returncode:
        raise ValueError('Backup encryption or decryption failed; check archive integrity and the passphrase')


def encrypt_archive(source, destination, secret):
    """AES-256-CBC plus an independent HMAC; OpenSSL receives only a private file path."""
    destination=Path(destination)
    salt=os.urandom(16)
    with tempfile.NamedTemporaryFile(prefix='titlelock-backup-key-',delete=False) as key_file:
        key_path=Path(key_file.name)
        os.chmod(key_path,0o600)
        key_file.write(secret)
    try:
        with open(destination,'xb',opener=lambda path,flags: os.open(path,flags,0o600)):
            pass
        run_openssl(['openssl','enc','-aes-256-cbc','-md','sha256','-pbkdf2','-iter','600000','-salt',
                     '-in',str(source),'-out',str(destination),'-pass',f'file:{key_path}'])
        metadata={'version':2,'cipher':'aes-256-cbc-pbkdf2-hmac-sha256','salt':salt.hex(),
                  'sha256':digest(source),'hmac_sha256':hmac.new(encryption_key(secret,salt),Path(destination).read_bytes(),hashlib.sha256).hexdigest()}
        metadata['manifest_hmac_sha256']=manifest_signature(metadata,secret)
        return metadata
    except BaseException:
        destination.unlink(missing_ok=True)
        raise
    finally:
        key_path.unlink(missing_ok=True)


def decrypt_archive(archive, destination, metadata, secret):
    if metadata.get('version')!=2 or metadata.get('cipher')!='aes-256-cbc-pbkdf2-hmac-sha256':
        raise ValueError('Encrypted backup manifest version does not match')
    try:
        salt=bytes.fromhex(metadata['salt'])
    except (KeyError,ValueError,TypeError):
        raise ValueError('Encrypted backup manifest is invalid') from None
    if not hmac.compare_digest(manifest_signature(metadata,secret),metadata.get('manifest_hmac_sha256','')):
        raise ValueError('Encrypted backup manifest integrity check failed; restore refused')
    actual=hmac.new(encryption_key(secret,salt),Path(archive).read_bytes(),hashlib.sha256).hexdigest()
    if not hmac.compare_digest(actual,metadata.get('hmac_sha256','')):
        raise ValueError('Encrypted backup integrity check failed; restore refused')
    with tempfile.NamedTemporaryFile(prefix='titlelock-backup-key-',delete=False) as key_file:
        key_path=Path(key_file.name)
        os.chmod(key_path,0o600)
        key_file.write(secret)
    try:
        with open(destination,'xb',opener=lambda path,flags: os.open(path,flags,0o600)):
            pass
        run_openssl(['openssl','enc','-d','-aes-256-cbc','-md','sha256','-pbkdf2','-iter','600000',
                     '-in',str(archive),'-out',str(destination),'-pass',f'file:{key_path}'])
        if metadata.get('sha256')!=digest(destination):
            raise ValueError('Encrypted backup plaintext checksum does not match')
    except BaseException:
        Path(destination).unlink(missing_ok=True)
        raise
    finally:
        key_path.unlink(missing_ok=True)


@contextmanager
def pg_environment(url):
    """Keep connection credentials out of command arguments and command output."""
    params=conninfo_to_dict(url)
    password=params.pop('password', None)
    if any('\n' in value or '\r' in value for value in params.values()) or (password and ('\n' in password or '\r' in password)):
        raise ValueError('Multiline database connection parameters are unsupported')
    with tempfile.TemporaryDirectory(prefix='titlelock-pg-') as directory:
        service=Path(directory)/'service.conf'
        service.touch(mode=0o600)
        service.write_text('[titlelock]\n'+''.join(f'{key}={value}\n' for key,value in params.items()))
        environment={key:value for key,value in os.environ.items() if not key.startswith('PG')}
        environment['PGSERVICEFILE']=str(service)
        if password is not None:
            passfile=Path(directory)/'password'
            passfile.touch(mode=0o600)
            escaped=password.replace('\\','\\\\').replace(':','\\:')
            passfile.write_text('*:*:*:*:'+escaped+'\n')
            environment['PGPASSFILE']=str(passfile)
        yield environment


def run_pg(arguments, environment, output=None):
    try:
        result=subprocess.run(arguments, env=environment, stdout=output or subprocess.DEVNULL,
                              stderr=subprocess.PIPE, check=False)
    except FileNotFoundError:
        raise ValueError('Install matching PostgreSQL pg_dump/pg_restore tools on PATH') from None
    if result.returncode:
        # Tool diagnostics may contain credentials or confidential database values.
        raise ValueError(f'{arguments[0]} failed; check tool/server versions, connection and database privileges')


def table_counts(conn):
    tables=conn.execute("""SELECT schemaname,tablename FROM pg_tables
        WHERE schemaname <> 'information_schema' AND left(schemaname,3) <> 'pg_'
        ORDER BY schemaname,tablename""").fetchall()
    return [{'schema':schema,'table':table,'rows':conn.execute(sql.SQL('SELECT count(*) FROM {}.{}').format(
        sql.Identifier(schema),sql.Identifier(table))).fetchone()[0]} for schema,table in tables]


def backup(url, destination):
    destination=Path(destination)
    destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if destination.parent.stat().st_mode & 0o077:
        raise ValueError('Backup directory must be private (chmod 700)')
    manifest=destination.with_name(destination.name+'.json')
    if destination.exists() or manifest.exists():
        raise ValueError('Refusing to overwrite an existing backup')
    created=False
    manifest_created=False
    try:
        with open(destination,'xb',opener=lambda path,flags: os.open(path,flags,0o600)) as output:
            created=True
            with psycopg.connect(url, connect_timeout=5) as conn, pg_environment(url) as environment:
                conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
                snapshot=conn.execute('SELECT pg_export_snapshot()').fetchone()[0]
                counts=table_counts(conn)
                run_pg(['pg_dump','--dbname=service=titlelock','--no-password','--format=custom',
                        '--no-owner','--no-privileges',f'--snapshot={snapshot}'],environment,output)
            output.flush(); os.fsync(output.fileno())
        metadata={'version':1,'created_at':datetime.now(timezone.utc).isoformat(),
                  'sha256':digest(destination),'tables':counts}
        with open(manifest,'x',opener=lambda path,flags: os.open(path,flags,0o600)) as stream:
            manifest_created=True
            json.dump(metadata,stream); stream.flush(); os.fsync(stream.fileno())
        return metadata
    except BaseException:
        if manifest_created:
            manifest.unlink(missing_ok=True)
        if created:
            destination.unlink(missing_ok=True)
        raise


def encrypted_backup(url, destination, passphrase_file):
    destination=Path(destination)
    destination.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    if destination.parent.stat().st_mode & 0o077:
        raise ValueError('Backup directory must be private (chmod 700)')
    manifest=destination.with_name(destination.name+'.json')
    if destination.exists() or manifest.exists():
        raise ValueError('Refusing to overwrite an existing backup')
    if not passphrase_file:
        raise ValueError('Encrypted backup requires --encryption-passphrase-file')
    secret=private_secret(passphrase_file)
    descriptor, raw_name=tempfile.mkstemp(prefix='titlelock-plain-',dir=destination.parent)
    os.close(descriptor)
    raw=Path(raw_name)
    raw.unlink()
    try:
        metadata=backup(url,raw)
        encrypted=encrypt_archive(raw,destination,secret)
        encrypted['created_at']=metadata['created_at']
        encrypted['tables']=metadata['tables']
        encrypted['manifest_hmac_sha256']=manifest_signature(encrypted,secret)
        with open(manifest,'x',opener=lambda path,flags: os.open(path,flags,0o600)) as stream:
            json.dump(encrypted,stream); stream.flush(); os.fsync(stream.fileno())
        return encrypted
    except BaseException:
        destination.unlink(missing_ok=True); manifest.unlink(missing_ok=True)
        raise
    finally:
        raw.unlink(missing_ok=True)
        raw.with_name(raw.name+'.json').unlink(missing_ok=True)


def encrypted_restore(url, archive, passphrase_file):
    archive=Path(archive)
    metadata=json.loads(archive.with_name(archive.name+'.json').read_text())
    secret=private_secret(passphrase_file)
    with tempfile.TemporaryDirectory(prefix='titlelock-decrypt-') as directory:
        raw=Path(directory)/'archive.pgdump'
        decrypt_archive(archive,raw,metadata,secret)
        raw_metadata={'version':1,'sha256':metadata['sha256'],'tables':metadata['tables']}
        raw.with_name(raw.name+'.json').write_text(json.dumps(raw_metadata))
        return restore(url,raw)


def restore(url, archive):
    archive=Path(archive)
    metadata=json.loads(archive.with_name(archive.name+'.json').read_text())
    if metadata.get('version')!=1 or metadata.get('sha256')!=digest(archive):
        raise ValueError('Backup checksum or manifest version does not match; restore refused')
    with psycopg.connect(url, connect_timeout=5, autocommit=True) as conn, pg_environment(url) as environment:
        name=conn.execute('SELECT current_database()').fetchone()[0]
        if not name.startswith('titlelock_restore_'):
            raise ValueError('Restore requires a separate database named titlelock_restore_*')
        if not conn.execute("SELECT pg_try_advisory_lock(hashtext('titlelock-offline-restore'))").fetchone()[0]:
            raise ValueError('Another restore is already running')
        populated=conn.execute("""SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname NOT IN ('public','information_schema')
            AND left(nspname,3) <> 'pg_') OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public') OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public')""").fetchone()[0]
        if populated:
            raise ValueError('Restore target must be empty; existing data will never be replaced')
        run_pg(['pg_restore','--dbname=service=titlelock','--no-password','--exit-on-error','--single-transaction',
                '--no-owner','--no-privileges',str(archive)],environment)
        with conn.transaction():
            if table_counts(conn)!=metadata['tables']:
                raise ValueError('Restored row counts differ; keep this recovery database offline')
            for item in metadata['tables']:
                if item['table'] in ('auth_sessions','login_challenges','chain_wallet_challenges'):
                    conn.execute(sql.SQL('DELETE FROM {}.{}').format(sql.Identifier(item['schema']),sql.Identifier(item['table'])))
        return metadata


def source_url(env_file=None):
    if env_file is None:
        settings=Settings()
    else:
        from dotenv import dotenv_values
        if not env_file.is_file():
            raise ValueError('The selected source environment file does not exist')
        url=dotenv_values(env_file).get('DATABASE_URL')
        if not url:
            raise ValueError('Configure DATABASE_URL in the selected source file')
        # Explicit constructor value wins over exported variables; retain production validation.
        settings=Settings(_env_file=env_file,database_url=url)
    if not settings.database_url:
        raise ValueError('Configure the source DATABASE_URL')
    return settings.database_url


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['backup','restore','encrypted-backup','encrypted-restore'])
    parser.add_argument('archive',type=Path)
    parser.add_argument('--env-file',type=Path,help='Explicit source file; otherwise use normal application configuration')
    parser.add_argument('--target-env-file',type=Path,help='Separate environment file containing the recovery DATABASE_URL')
    parser.add_argument('--encryption-passphrase-file',type=Path,help='Private chmod-600 file containing the backup encryption passphrase')
    args=parser.parse_args()
    try:
        if args.action in ('backup','encrypted-backup'):
            url=source_url(args.env_file)
            if args.action=='encrypted-backup' and not args.encryption_passphrase_file:
                raise ValueError('Encrypted backup requires --encryption-passphrase-file')
            metadata=(encrypted_backup(url,args.archive,args.encryption_passphrase_file) if args.action=='encrypted-backup' else backup(url,args.archive))
            print(f'Backup complete: {len(metadata["tables"])} tables. Keep the archive and its .json manifest together.')
        else:
            if not args.target_env_file or not args.target_env_file.is_file():
                raise ValueError('Restore requires --target-env-file for the separate recovery database')
            from dotenv import dotenv_values
            url=dotenv_values(args.target_env_file).get('DATABASE_URL')
            if not url:
                raise ValueError('Configure DATABASE_URL in the target environment file')
            if args.action=='encrypted-restore':
                if not args.encryption_passphrase_file:
                    raise ValueError('Encrypted restore requires --encryption-passphrase-file')
                encrypted_restore(url,args.archive,args.encryption_passphrase_file)
            else:
                restore(url,args.archive)
            print('Restore verified; login sessions invalidated. Keep offline until chain reconciliation and application checks pass.')
    except (ValueError,OSError,psycopg.Error):
        # Never print connection strings, SQL rows, or raw provider errors.
        parser.exit(1,'Backup/restore failed. Check permissions, configuration, archive integrity and the empty recovery target.\n')


if __name__=='__main__':
    main()
