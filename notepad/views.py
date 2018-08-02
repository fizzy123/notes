import re
import urllib
import logging
from textwrap import TextWrapper

from sqlalchemy import and_
from sqlalchemy.sql.expression import bindparam, func
from flask import render_template, request, jsonify, session, redirect

from notepad import app, db, socketio, csrf, settings
from notepad.models import Note

logger = logging.getLogger(__name__)

@app.route('/', methods=['GET'])
def index_view():
    key = urllib.parse.unquote_plus(request.args.get('key', 'root')).lower()
    note = Note.query.filter(Note.key == key).order_by(Note.id.desc()).first()
    if request.args.get('json', False):
        return jsonify({'body':note.body})
    content = None

    if note:
        redirectTag = "redirect="
        if note.body[:len(redirectTag)] == redirectTag:
            return redirect(note.body.replace(redirectTag, ""))
        content = clientEncodeContent(note.body)

    if not content:
        content = '<br>'
    readonly = '#readonly' in content
    if not session.get('loggedin'):
        readonly = True
    if key == 'login':
        readonly = False
    return render_template('index.html', body=content, key=key, readonly=readonly)

@app.route('/', methods=['POST'])
@csrf.exempt
def index_post():
    body = request.form.get('body')
    key = request.form.get('key').lower()

    if not key:
        key = 'home'
    if key == 'login':
        if body.strip() == settings.password:
            session['loggedin'] = True
            return jsonify({'success': True})
        return jsonify({'success': False})

    Note.write(key, body)

    content = clientEncodeContent(body)
    socketio.emit(key, {'body': content})
    return jsonify({'success': True})

@app.route('/search', methods=['GET'])
def search_view():
    term = urllib.parse.unquote_plus(request.args['term']).lower()
    notes = db.session.query(Note.key).group_by(Note.key).filter(Note.key.contains(term)).limit(10).all()
    notes = [note.key for note in notes]
    return jsonify({'results': notes})

def find_notes(body):
    subq = db.session.query(func.max(Note.id).label("max_id")).group_by(Note.key).subquery()
    notes = Note.query.join(subq, and_(Note.id == subq.c.max_id)) \
                      .filter(bindparam('body', body).contains(Note.key)) \
                      .filter(Note.key != "") \
                      .order_by(func.length(Note.key).desc()) \
                      .all()
    return notes

def clientEncodeContent(body, wrap=False):
    if not body:
        body = ''

    notes = find_notes(body)

    replace_dict = {}
    replace_index = 0
    for note in notes:
        if note.key:
            body = re.sub(r"(^| |\n)" +re.escape(note.key) + r"($| |,|\.|\?|!|\n)", r"\1#REPLACE_ME{}#\2".format(replace_index), body, flags=re.I)
            replace_dict[replace_index] = note
            replace_index = replace_index + 1
    if wrap:
        wrapper = TextWrapper(width=70)
        paragraphs = body.split('\n')
        new_paragraphs = []
        for paragraph in paragraphs:
            new_paragraphs.append(wrapper.fill(paragraph))
        body = '\n'.join(new_paragraphs)

    for key, note in replace_dict.items():
        body = body.replace('#REPLACE_ME{}#'.format(key),
                            '<div class="click">{}</div>'.format(note.key))

    body = re.sub(r"(https?://.*\.(jpg|png|gif))($| |\n)", r'<img src="\1">', body)

    #we can't just do a simple substitution after the first one because image urls also match links.
    for match in re.finditer(r"(https?://[a-zA-Z0-9/:\.?=]*)($| |\n)", body):
        if match.start() - 1 <= 0 and match.end() + 1 < len(body): # check to make sure it's not out of bounds
            if body[match.start() - 1] == '"' and body[match.end() + 1] == '"': # check to see whether it's already in some kind of element
                continue
        body = body.replace(match.group(), '<a href="{0}">{0}</a>'.format(match.group(1)))
    body = body.replace('\n', '<br>')
    return body
