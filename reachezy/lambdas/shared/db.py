import os
import json
import time
import boto3
import psycopg2

_conn = None

def get_db_connection():
    """Reuse DB connection across Lambda invocations (connection pooling).
    Includes 1 retry on initial connection failure for transient RDS issues.
    """
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

    last_error = None
    for attempt in range(2):
        try:
            _conn = psycopg2.connect(
                host=os.environ["DB_HOST"],
                dbname=os.environ["DB_NAME"],
                user=secret["username"],
                password=secret["password"],
                connect_timeout=5,
            )
            _conn.autocommit = False
            return _conn
        except Exception as e:
            last_error = e
            if attempt == 0:
                print(f"DB connection attempt {attempt + 1} failed: {e}, retrying in 1s...")
                time.sleep(1)

    raise last_error
