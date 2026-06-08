CREATE TABLE IF NOT EXISTS health_check (
                                            id SERIAL PRIMARY KEY,
                                            status VARCHAR(50)
    );

INSERT INTO health_check(status) VALUES ('ok');