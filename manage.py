# file to handle db migrations

# Commands to remember:
#
# python manage.py db init - initialize a db
# python manage.py db migrate - creates a migration
# python manage.py db upgrade - apply migration
from flask_script import Manager
from flask_migrate import Migrate, MigrateCommand

from notepad import app, db

migrate = Migrate(app, db)
manager = Manager(app)

manager.add_command('db', MigrateCommand)


if __name__ == '__main__':
    manager.run()
