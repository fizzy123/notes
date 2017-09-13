import re
import urllib
import logging

from sqlalchemy import and_
from sqlalchemy.sql.expression import bindparam, func
from flask import render_template, request, jsonify

from notepad import app, db, socketio
from notepad.models import Note

logger = logging.getLogger(__name__)

@app.route('/', methods=['GET'])
def index_view():
    key = urllib.parse.unquote_plus(request.args.get('key', 'root')).lower()
    note = Note.query.filter(Note.key == key).order_by(Note.id.desc()).first()
    content = None
    if note:
        content = clientEncodeContent(note.body)

    if not content:
        content = '<br>'
    readonly = '#readonly' in content
    return render_template('index.html', body=content, key=key, readonly=readonly)

@app.route('/', methods=['POST'])
def index_post():
    body = request.form.get('body')
    key = request.form.get('key').lower()

    if not key:
        key = 'root'

    note = Note(key=key, body=body)
    db.session.add(note)
    db.session.commit()

    notes = Note.query.filter(Note.key == key).order_by(Note.id.desc()).all()
    for note in notes[10:]:
        db.session.delete(note)
    db.session.commit()

    content = clientEncodeContent(body)
    socketio.emit(key, {'body': content})
    return jsonify({'success': True})

def clientEncodeContent(body):
    if not body:
        body = ''

    subq = db.session.query(func.max(Note.id).label("max_id")).group_by(Note.key).subquery()
    notes = Note.query.join(subq, and_(Note.id == subq.c.max_id)) \
                      .filter(bindparam('body', body).contains(Note.key)) \
                      .order_by(func.length(Note.body).desc()) \
                      .all()

    for note in notes:
        if note.key:
            key_words = note.key.split(' ')
#pylint: disable=line-too-long
            formatted_key_words = ['<div class="click">{}</div>'.format(word) for word in key_words]
            body = re.sub(r"([^>]??)" + re.escape(note.key) + r"([^<]??)", r"\1" + ' '.join(formatted_key_words) + r"\2", body)
    body = re.sub(r"(https?:.*\.(jpg|png|gif))", r'<img src="\1">', body)
    body = body.replace('\n', '<br>')
    return body

@app.route('/link', methods=['POST'])
def link_post():
    text = request.form.get('text')
    index = int(request.form.get('index'))
    notes = Note.query.filter(bindparam('body', text).contains(Note.key)) \
                      .order_by(func.length(Note.body).desc()) \
                      .all()
    for note in notes:
        for m in re.finditer(note.key, text, re.IGNORECASE):
            if m.start() < index and m.end() > index:
                return jsonify({"term": note.key})
    return jsonify({"term":""})
