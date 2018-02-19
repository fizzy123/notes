from flask import Flask
from flask_wtf.csrf import CSRFProtect
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO

from . import settings

app = Flask(__name__)
app.config.from_object(settings)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
socketio = SocketIO(app)
csrf = CSRFProtect(app)
db = SQLAlchemy(app)

#pylint: disable=wrong-import-position
from . import views
from . import models
