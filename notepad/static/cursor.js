function createRange(node, chars, range) {
    if (!range) {
        range = document.createRange()
        range.selectNode(node);
        range.setStart(node, 0);
    }

    if (chars.count === 0) {
        range.setEnd(node, chars.count);
    } else if (node && chars.count >0) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.length < chars.count) {
                chars.count -= node.textContent.length;
            } else {
                range.setEnd(node, chars.count);
                chars.count = 0;
            }
        } else {
           for (var lp = 0; lp < node.childNodes.length; lp++) {
                if (node.childNodes[lp].nodeName === 'BR') {
                  chars.count -= 1
                  if (chars.count === 0) {
                    range.setEnd(node, lp + 1)
                  }
                } else {
                  range = createRange(node.childNodes[lp], chars, range);
                }
                if (chars.count === 0) {
                    break;
                }
            }
        }
    } 

    return range;
};

function setCurrentCursorPosition(chars, parentId) {
    if (chars >= 0) {
        var selection = window.getSelection();

        range = createRange(document.getElementById(parentId), { count: chars });

        if (range) {
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
};

function isChildOf(node, parentId) {
    while (node !== null) {
        if (node.id === parentId) {
            return true;
        }
        node = node.parentNode;
    }

    return false;
};

function getCurrentCursorPosition(parentId) {
    var selection = window.getSelection(),
        charCount = -1,
        node;

    if (selection.focusNode) {
        if (isChildOf(selection.focusNode, parentId)) {
            node = selection.focusNode; 
            charCount = selection.focusOffset;
            if (node && node.childNodes && node.childNodes.length && node.childNodes[charCount] && node.childNodes[charCount].nodeName == 'BR' ) {
              node = node.childNodes[charCount]
              charCount = 1
              // two brs right next to one another has weird behvaiors
              if (node.previousSibling && node.previousSibling.nodeName == 'BR') {
                charCount = 0
              }
            }

            while (node) {
                if (node.id === parentId) {
                    break;
                }

                if (node.previousSibling) {
                    node = node.previousSibling;
                    if (node.nodeName == 'BR' || (node.childNodes.length === 1 && node.childNodes[0].nodeName == 'BR')) {
                      charCount += 1
                    } else {
                      charCount += node.textContent.length;
                    }
                } else {
                     node = node.parentNode;
                     if (node === null) {
                         break
                     }
                }
            }
        }
    }

    return charCount;
}

function selectElementContents(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}
