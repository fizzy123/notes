import re

import spacy
from sqlalchemy import func

from notepad import db
from notepad.models import Note

nlp = spacy.load('en')

class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String())
    type = db.Column(db.String())
    syllable_count = db.Column(db.Integer())
    next_id = db.Column(db.Integer, db.ForeignKey('word.id'))
    next = db.relationship('Word', uselist=False, remote_side=[id], backref=db.backref('prev', uselist=False))

    def __init__(self, text, type, syllable_count, next=None):
        self.text = text
        self.type = type
        self.syllable_count = syllable_count
        self.next = next

    def dictify(self):
        return {
            'id': self.id,
            'text': self.text,
            'word_type': self.word_type,
            'syllable_count': self.syllable_count,
            'next': self.next.id,
        }

    def __repr__(self):
        return '<%r>' % self.text


    @staticmethod
    def count_syllables(word):
        if Word.query.filter(Word.text == word).first():
            return Word.query.filter(Word.text == word).first().syllable_count
        return len(re.findall(r'[aiouy]+e*|e(?!d$|ly).|[td]ed|le$', word, re.IGNORECASE))

    @staticmethod
    def digest(key='corpus'):
        words = Word.query.all()
        for word in words:
            word.delete()

        note = Note.query.filter(Note.key == key.lower()).order_by(Note.id.desc()).first()

        posts = list(filter(None, note.body.split('\n')))

        for post in posts:
            words = nlp(post)

            old_word = None
            for word in words:
                new_word = Word(text=word.text,
                                word_type=word.tag_ + ' ' + word.dep_,
                                syllable_count=Word.count_syllables(word.text))
                if new_word.syllable_count is 0  and re.search('[aiouye]', new_word.text):
                    new_word.syllable_count = 1
                db.session.add(new_word)
                if old_word:
                    old_word.next = new_word
                db.session.commit()
                old_word = new_word


    @staticmethod
    def generate_text():
        text = ''
        word = Word.query.filter(Word.prev == None).order_by(func.random()).first()
        text = text + word.text
        while word.next:
            words = Word.query.filter(
                func.lower(Word.text) == func.lower(word.text),
                Word.type == word.type,
                Word.next.has(type=word.next.type)).order_by(func.random())

            if len(text.split(' ')) > 10 and words.filter(Word.next == None).first():
                words = words.filter(Word.next.has(next=None))
            word = words.first().next
            if re.search(r"[,.:$?']", word.text):
                text = text + word.text
            else:
                text = text + ' ' + word.text
        return text

    @staticmethod
    def generate_haiku():
        line = 0
        syllable_count = 0
        syllable_limit = 5
        words = Word.query.filter(Word.prev == None).order_by(func.random())
        for word in words:
            if word.syllable_count == 5:
                line = 1
                syllable_limit = 7
            else:
                syllable_count = word.syllable_count
            response = Word._verify_word(word, line, syllable_count, syllable_limit)
            if response:
                return word.text + response
        return None

    @staticmethod
#pylint: disable=too-many-return-statements,too-many-branches
    def _verify_word(word, line, syllable_count, syllable_limit):
        if line > 2:
            if word.next:
                return None
            return word.text
        else:
            if not word.next:
                return None
        text = word.text

        words = Word.query.filter(
            func.lower(Word.text) == func.lower(word.text),
            Word.type == word.type,
            Word.syllable_count < syllable_limit - syllable_count,
            Word.next.has(type=word.next.type)).order_by(func.random())
        if words.first():
            for new_word in words:
                new_word = new_word.next
                new_line = line
                new_syllable_limit = syllable_limit
                new_syllable_count = syllable_count + new_word.syllable_count
                if new_word.syllable_count == 0:
                    text = new_word.text
                elif syllable_count == 0:
                    text = "\n" + new_word.text
                else:
                    text = " " + new_word.text

                if new_syllable_count == new_syllable_limit:
                    if line == 2 and new_word.next:
                        return

                    if line == 0:
                        new_syllable_limit = 7
                    else:
                        new_syllable_limit = 5
                    new_line = line + 1
                    new_syllable_count = 0

                result = Word._verify_word(new_word,
                                           new_line,
                                           new_syllable_count,
                                           new_syllable_limit)
                if result:
                    if result == new_word.text:
                        return text
                    return text + result
        else:
            return None
