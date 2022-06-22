  DROP TABLE IF EXISTS signatures;
  DROP TABLE IF EXISTS users;

  CREATE TABLE signatures (
       id SERIAL PRIMARY KEY,
       signature VARCHAR NOT NULL CHECK (signature != ''),
       user_id  INT NOT NULL
   );
   

   

 CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       first VARCHAR NOT NULL CHECK (first != ''),
       last VARCHAR NOT NULL CHECK (last != ''),
       email VARCHAR NOT NULL UNIQUE CHECK (email != ''),
       passwd VARCHAR NOT NULL CHECK (passwd != '')
   );