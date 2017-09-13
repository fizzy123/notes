from notepad import db

class Note(db.Model):
    __tablename__ = 'notes'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(), nullable=False)
    body = db.Column(db.String())

    def __init__(self, key, body):
        self.key = key
        self.body = body

    def dictify(self):
        return {
            'id': self.id,
            'key': self.key,
            'body': self.body
        }

    def __repr(self):
        return '<Note %r>' % self.key
