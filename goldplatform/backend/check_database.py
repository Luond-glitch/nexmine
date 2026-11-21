
from sqlalchemy import text
from app.db import engine

print("\n========== NEXMINE DATABASE TEST ==========\n")

try:
    with engine.connect() as connection:

        print("Database type:", engine.dialect.name)

        if engine.dialect.name != "postgresql":
            print("WARNING: Database is not PostgreSQL.")
        else:
            result = connection.execute(text("""
                SELECT
                    current_database(),
                    current_user,
                    version(),
                    inet_server_addr(),
                    inet_server_port()
            """)).fetchone()

            print("\nSUCCESS: PostgreSQL is connected!")
            print("------------------------------------------")
            print("Database:", result[0])
            print("User:", result[1])
            print("Version:", result[2])
            print("Server IP:", result[3])
            print("Port:", result[4])

except Exception as e:
    print("\nCONNECTION FAILED!")
    print("Error:", str(e))

print("\n==========================================")
