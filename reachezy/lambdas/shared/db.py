import os
import json
import boto3
import psycopg2

_conn = None

def get_db_connection():
    """Reuse DB connection across Lambda invocations (connection pooling)."""
    global _conn
    if _conn and not _conn.closed:
        try:
            _conn.cursor().execute("SELECT 1")
            return _conn
        except Exception:
            _conn = None

    sm = boto3.client("secretsmanager")
    secret = json.loads(
        sm.get_secret_value(SecretId=os.environ["DB_SECRET_ARN"])["SecretString"]
    )

    _conn = psycopg2.connect(
        host=os.environ["DB_HOST"],
        dbname=os.environ["DB_NAME"],
        user=secret["username"],
        password=secret["password"],
        connect_timeout=5,
    )
    _conn.autocommit = False
    return _conn
