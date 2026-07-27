For future reference, the full reset is just 3 commands from the backend/ folder:
  npx sequelize db:migrate:undo:all   # drop all tables
  npx sequelize db:migrate            # recreate tables
  npx sequelize db:seed:all           # insert seed data