For future reference, the full reset is one command from the backend_nest/ folder:
  npm run db:reset      # drop the MongoDB database and re-seed it

Or step by step:
  npm run db:seed:undo  # drop the database
  npm run db:seed       # insert seed data (collections and indexes are created automatically)
