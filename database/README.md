## Database setup (PostgreSQL)

The database is not stored in git. Each person creates their own copy locally.

### Requirements
- PostgreSQL installed (version 18 used here), with `psql` available in the terminal
- Node.js

### Steps

Run all commands from the project root.

1. Create the database:
   psql -U postgres -c "CREATE DATABASE student_id_db;"

2. Create the tables:
   psql -U postgres -d student_id_db -f database/schema.sql

3. Create your own `.env` file from the template:

    `ls -a` to view file starting in dot

   cp .env.example .env
   Open `.env` and replace `YOURPASSWORD` with your own postgres password. Never commit `.env`.

4. Install packages:
   npm install

5. Test the connection:
   just paste this

   node -e "import('./server/db/pool.js').then(async m => { const r = await m.default.query('select now()'); console.log(r.rows[0]); process.exit(); })"
   You should see an object with a timestamp.

### Using pgAdmin instead of psql
Create a database named `student_id_db`, open the Query Tool on it, open `database/schema.sql`, and run it.

run this before testing the login 
"node server/db/seed.js"

run server 
"node server/index.js"

then start the server for react 
"npm run dev"