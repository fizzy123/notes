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

# convinience function to account for note history being saved
    @staticmethod
    def write(key, body):
        note = Note(key=key, body=body)
        db.session.add(note)

        notes = Note.query.filter(Note.key == key).order_by(Note.id.desc()).all()
        for note in notes[10:]:
            db.session.delete(note)
        db.session.commit()
        return note


    def __repr__(self):
        return '<Note %r>' % self.key
