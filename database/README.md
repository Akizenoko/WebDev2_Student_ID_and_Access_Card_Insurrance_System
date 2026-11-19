## Database Setup

The database is not stored in git. Each person creates their own copy locally.

### Requirements
- PostgreSQL installed (version 18 used here), with `psql` available in the terminal
- Node.js

### Steps

Run all commands from the project root.

1. **Create the database**
   ```bash
   psql -U postgres -c "CREATE DATABASE student_id_db;"
   ```

2. **Create the tables**
   ```bash
   psql -U postgres -d student_id_db -f database/schema.sql
   ```

3. **Create your `.env` file from the template**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and replace `YOURPASSWORD` with your own Postgres password.
   Never commit `.env`. (Tip: `ls -a` shows files that start with a dot.)

4. **Install packages**
   ```bash
   npm install
   ```

5. **Test the connection**
   ```bash
   node -e "import('./server/db/pool.js').then(async m => { const r = await m.default.query('select now()'); console.log(r.rows[0]); process.exit(); })"
   ```
   You should see an object with a timestamp.

6. **Seed the database** (needed before you can log in)
   ```bash
   node server/db/seed.js
   ```

### Using pgAdmin instead of psql
Create a database named `student_id_db`, open the Query Tool on it, open `database/schema.sql`, and run it. Then continue from step 3.

## Running the App

Start the backend server:
```bash
node server/index.js
```

then start the server for react 
"npm run dev"



FOR OTP 

install 
npm install nodemailer

add this to your server .env
EMAIL_USER=wmsuid@gmail.com
EMAIL_APP_PASSWORD=hoisfpdzihpccrbl

also run this again for the db 
psql -U postgres -d student_id_db -f database/schema.sql
