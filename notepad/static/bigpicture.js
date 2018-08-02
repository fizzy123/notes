/*
 *
 * bigpicture.js
 *
 * bigpicture.js is a library that allows infinite panning and infinite zooming in HTML pages.
 *               See it in action on http://www.bigpicture.bi/demo !
 *
 * author:  Joseph Ernest (twitter: @JosephErnest)
 * url:     http://github.com/josephernest/bigpicture.js
 *
 */

var bigpicture = (function() {
  "use strict";

  /*
   * INITIALIZATION
   */

  var TIER_THRESHOLD = 10000000000
  var ZOOM_THRESHOLD = 1000
  var ZOOM_CONSTANT = 1.2
  var bpContainer = document.getElementById('bigpicture-container'),
    bp = document.getElementById('bigpicture');

  if (!bp) { return; }

  bp.setAttribute('spellcheck', false);

  var colors = [
    '#ECD078',
    '#D95B43',
    '#C02942',
    '#542437',
    '#53777A'
  ];


  var params = { x: getQueryVariable('x'), y: getQueryVariable('y'), zoom: getQueryVariable('zoom') };

  var current = {};
  current.x = params.x ? parseFloat(params.x) : - ($(window).width() - 514.02) / 2;
  current.y = params.y ? parseFloat(params.y) : - ($(window).height() - 330) / 2;
  current.zoom = params.zoom ? parseFloat(params.zoom) : 1;
  current.branches = {};
  current.nodes = {};
  current.loading = false;
  current.color = 1;
  var collisionCandidates = [];

  bp.style.left = '0px';
  bp.style.right = '0px';

  loadNodes();
  var previousZoom = current.zoom;

  /*
   * TEXT BOXES
   */

  $(".text").each(function() {updateTextPosition(this);});

  $(bp).on('blur', '.text', function() { if ($(this).html().replace(/^\s+|\s+$/g, '') === '') { $(this).remove(); } });

  $(bp).on('input', '.text', function() { redoSearch = true; });

  function updateTextPosition(e) {
    var node = current.nodes[$(e).attr('id')];
    if (node) {
      if (node.parent && current.nodes[node.parent]) {
        var rect = node.link.getBoundingClientRect();
        node.apparentX = rect.left * current.zoom  + current.x;
        node.apparentY = rect.top * current.zoom + current.y;
        if (node.id === '830-1') {
          console.log(node.link);
          console.log(rect.top);
        }
      }
      checkValid(node);
      if ((node.apparentZoom /current.zoom) > 100) {
        e.style.opacity = 0;
      } else if ((node.apparentZoom /current.zoom) > 50) {
        e.style.opacity = (100 - (node.apparentZoom / current.zoom)) / 50;
      } else if ((node.apparentZoom / current.zoom) > 11) {
        e.style.opacity = 1;
      } else if ((node.apparentZoom /current.zoom) > 0.5) {
        e.style.opacity = ((node.apparentZoom / current.zoom) - 0.5 )/10.5;
      } else {
        e.style.opacity = 0;
      }

      e.style.fontSize = node.apparentZoom / current.zoom + 'px';
      $(e).children('.title')[0].style.fontSize = 8 * node.apparentZoom / current.zoom + 'px';


      e.style.left = (node.apparentX - current.x) / current.zoom + 'px';
      e.style.top = (node.apparentY - current.y) / current.zoom + 'px';

      // image scaling
      $(e).find('img').css('width', 2 * node.apparentZoom / current.zoom + 'px');
      $(e).find('video').css('width', 2 * node.apparentZoom / current.zoom + 'px');

      // iframe scaling
      $(e).find('iframe').css('width', 2 * node.apparentZoom / current.zoom + 'px');
      $(e).find('iframe').css('height', 2 * 9 / 16 * node.apparentZoom / current.zoom + 'px');
    }
  }

  /*
   * PAN AND MOVE
   */

  var dragging = false,
    previousMousePosition;

  bpContainer.onmousedown = function(e) {
    dragging = true;
    biggestPictureSeen = false;
    previousMousePosition = { x: e.pageX, y: e.pageY };
  };

  window.onmouseup = function() {
    dragging = false;
  };

  bpContainer.ondragstart = function(e) {
    e.preventDefault();
  };

  bpContainer.onmousemove = function(e) {
    if (dragging && !e.shiftKey) {       // SHIFT prevents panning / allows selection
      current.x -= (e.pageX - previousMousePosition.x) * current.zoom;
      current.y -= (e.pageY - previousMousePosition.y) * current.zoom;
      $(".text").css({"transitionDuration": "0s"});
      $(".text").each(function() {updateTextPosition(this);});
      previousMousePosition = { x: e.pageX, y: e.pageY };
      if (!current.loading) {
          loadNodes();
      }
    }
  };

  /*
   * ZOOM
   */

  bpContainer.ondblclick = function(e) {
    e.preventDefault();

    onZoom((e.ctrlKey || e.metaKey) ? current.zoom * ZOOM_CONSTANT * ZOOM_CONSTANT : current.zoom / ZOOM_CONSTANT / ZOOM_CONSTANT, current.x + e.clientX * current.zoom, current.y + e.clientY * current.zoom, e.clientX, e.clientY);
  };

  var biggestPictureSeen = false,
    zooming = false,
    previous;

  function onZoom(zoom, wx, wy, sx, sy) {  // zoom on (wx, wy) (world coordinates) which will be placed on (sx, sy) (screen coordinates)
    wx = (typeof wx === "undefined") ? current.x + window.innerWidth / 2 * current.zoom : wx;
    wy = (typeof wy === "undefined") ? current.y + window.innerHeight / 2 * current.zoom : wy;
    sx = (typeof sx === "undefined") ? window.innerWidth / 2  : sx;
    sy = (typeof sy === "undefined") ? window.innerHeight / 2 : sy;

    current.x = wx - sx * zoom; current.y = wy - sy * zoom; current.zoom = zoom;

//    $(".text").css({"transitionDuration": "0.2s"});

    zooming = true;
    setTimeout(function() {
      zooming = false;
    }, 500);

    $(".text").each(function() {updateTextPosition(this);});

    biggestPictureSeen = false;
    if (!current.loading) {
      loadNodes();
    }
  }

  function zoomOnText(res) {
    onZoom($(res).data('zoom') / 20, $(res).data('x'), $(res).data('y'));
  }

  /*
   * SEARCH
   */

  var results = { index: -1, elements: [], text: "" },
    redoSearch = true,
    query;

  function find(txt) {
    results = { index: -1, elements: [], text: txt };
    $(".text").each(function() {
      if ($(this).text().toLowerCase().indexOf(txt.toLowerCase()) != -1) { results.elements.push(this); }
    });
    if (results.elements.length > 0) { results.index = 0; }
  }

  function findNext(txt) {
    if (!txt || txt.replace(/^\s+|\s+$/g, '') === '') { return; }   // empty search
    if (results.index == -1 || results.text != txt || redoSearch) {
      find(txt);
      if (results.index == -1) { return; }       // still no results
      redoSearch = false;
    }
    var res = results.elements[results.index];
    zoomOnText(res);
    results.index += 1;
    if (results.index == results.elements.length) { results.index = 0; }  // loop
  }

  /*
   * MOUSEWHEEL
   */

  var mousewheeldelta = 0, 
    lastE, 
    mousewheeltimer = null, 
    mousewheel;

  if (navigator.appVersion.indexOf("Mac") != -1) {   // Mac OS X
    mousewheel = function(e) {
      e.preventDefault();
      mousewheeldelta += Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
      lastE = e;
      if (!mousewheeltimer) {
        mousewheeltimer = setTimeout(function() {
          onZoom((mousewheeldelta > 0) ? current.zoom / ZOOM_CONSTANT : current.zoom * ZOOM_CONSTANT, current.x + lastE.clientX * current.zoom, current.y + lastE.clientY * current.zoom, lastE.clientX, lastE.clientY);
          mousewheeldelta = 0;
          mousewheeltimer = null; }, 70);
      }
    };
  }
  else {
    mousewheel = function(e) {
      e.preventDefault();
      var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
      onZoom((delta > 0) ? current.zoom / ZOOM_CONSTANT : current.zoom * ZOOM_CONSTANT, current.x + e.clientX * current.zoom, current.y + e.clientY * current.zoom, e.clientX, e.clientY);
    };
  }

  if ("onmousewheel" in document) { bpContainer.onmousewheel = mousewheel; }
  else { bpContainer.addEventListener('DOMMouseScroll', mousewheel, false); }

  /*
   * KEYBOARD SHORTCUTS
   */

  window.onkeydown = function(e) {
    if (((e.ctrlKey && !e.altKey || e.metaKey) && (e.keyCode == 61 || e.keyCode == 187 || e.keyCode == 171 || e.keyCode == 107 || e.key == '+' || e.key == '=' ))   // CTRL+PLUS or COMMAND+PLUS 
    || e.keyCode == 34) {   // PAGE DOWN     // !e.altKey to prevent catching of ALT-GR 
      e.preventDefault();
      onZoom(current.zoom / ZOOM_CONSTANT);
      return;
    }
    if (((e.ctrlKey && !e.altKey || e.metaKey) && (e.keyCode == 54 || e.keyCode == 189 || e.keyCode == 173 || e.keyCode == 167 || e.keyCode == 109 || e.keyCode == 169 || e.keyCode == 219 || e.key == '-' ))   // CTRL+MINUS or COMMAND+MINUS
    || e.keyCode == 33) {   // PAGE UP
      e.preventDefault();
      onZoom(current.zoom * ZOOM_CONSTANT);
      return;
    }
    if ((e.ctrlKey && !e.altKey || e.metaKey) && e.keyCode == 70) {         // CTRL+F
      e.preventDefault();
      setTimeout(function() { query = window.prompt("What are you looking for?", ""); findNext(query); }, 10);
      return;
    }
    if (e.keyCode == 114) {                 // F3
      e.preventDefault();
      if (results.index == -1) { setTimeout(function() { query = window.prompt("What are you looking for?", ""); findNext(query); }, 10); }
      else { findNext(query); }
      return;
    }
    if (e.keyCode == 113) {                 // F2
      e.preventDefault();
      seeBiggestPicture(e);
      return;
    }
  };

  $('.button').click(function() {
    var win = window.open($(this).attr('data-url'), '_blank');
    win.focus();
  });

  /*
   * USEFUL FUNCTIONS
   */

  function colorPercentage(color1, color2, percentage) {
  }

  function isContainedByClass(e, cls) { while (e && e.tagName) { if (e.classList.contains(cls)) { return true; } e = e.parentNode; } return false; }

  function getQueryVariable(id) { var params = window.location.search.substring(1).split("&");  for (var i = 0; i < params.length; i++) { var p = params[i].split("="); if (p[0] == id) { return p[1]; } } return(false); }

  var nodeIds = {};

  function loadNodes() {
    var pks
    pks = {'pks': current.branches}
    current.loading = true
    if (Object.keys(current.branches).length || !Object.keys(current.nodes).length || current.newAnchor) { // Don't get the initial node again
      pks['anchor'] = current.newAnchor
      if (pks['anchor']) {
        pks['anchor'] = pks['anchor'].split('-')[0];
      }
      $.ajax({
        type: "POST",
        url: "/get_children",
        data: JSON.stringify(pks),// gets root node if pk is empty, gets childen of provided pks otherwise
        contentType: "application/json",
        dataType: "json",
        success: function(data) {
        if (data.anchor) {
          data.nodes[data.anchor.id] = data.anchor;
          current.newAnchor = null;
        }
        Object.keys(data.nodes).forEach(function(nodeId) {
          if (data.nodes[nodeId].parent) {
            var instances = $('#' + data.nodes[nodeId].parent).children('.body').children('.link-' + data.nodes[nodeId].id).each(function() {
              var node = Object.assign({}, data.nodes[nodeId]);
              var rect = this.getBoundingClientRect();
              node.link = this;
              node.apparentX = rect.left * current.zoom  + current.x;
              node.apparentY = rect.top * current.zoom + current.y;
              createNode(node);
            });
          } else {
            createNode(data.nodes[nodeId]);
          }
          // remove nodes that loaded children from current.branches, since they have children now
          delete current.branches[nodeId];
        });

        // establish new anchor
        if (data.anchor) {
          establishAnchor(data.anchor);
        }

        // udpates node html element position
        //
        $(".text").each(function() {updateTextPosition(this)});
//        Object.keys(data.nodes).forEach(function(nodeId) {
//          var nodeData = data.nodes[nodeId];
//          if (nodeData.parent) {
//            collisionCandidates = [nodeData.parent].concat(Object.keys(current.nodes[nodeData.parent].children));
//            depth = 0;
//          }
//        });

        // loads more nodes if needed
        if (Object.keys(current.branches).length) {
          loadNodes();
        } else {
          current.loading = false;
        }
      }
      });
    } else {
      current.loading = false;
    }
  }

  var depth;
  function establishAnchor(node) {
    var offset = {
      x: node.apparentX,
      y: node.apparentY,
      zoom: node.apparentZoom
    };
    current.x = (current.x - offset['x']) / offset['zoom'];
    current.y = (current.y - offset['y']) / offset['zoom'];
    current.zoom = current.zoom / offset['zoom'];
    Object.keys(current.nodes).forEach(function(nodeId) {
      current.nodes[nodeId].apparentX = (current.nodes[nodeId].apparentX - offset['x']) / offset['zoom']
      current.nodes[nodeId].apparentY = (current.nodes[nodeId].apparentY - offset['y']) / offset['zoom']
      current.nodes[nodeId].apparentZoom = current.nodes[nodeId].apparentZoom / offset['zoom']
    });
    current.anchor = node.id
  }

  var direction = 0;
  function createNode(nodeData) {
    if (!(nodeData.id in nodeIds)) {
      nodeIds[nodeData.id] = 0;
    } else {
      nodeIds[nodeData.id] = nodeIds[nodeData.id] + 1;
    }
    nodeData.id = nodeData.id + "-" + nodeIds[nodeData.id];
    if (!('apparentX' in nodeData) && !('apparentY' in nodeData) && !nodeData.parent) {
      nodeData.apparentX = 0;
      nodeData.apparentY = 0;
    }
    if (nodeData.parent && !nodeData.zoom) {
        nodeData.zoom = 1/8;
//      nodeData.zoom = 0.1 * Math.pow(0.9, Object.keys(current.nodes[nodeData.parent].children).indexOf(nodeData.id))
    } else if (!nodeData.parent && !nodeData.zoom) {
      nodeData.zoom = 30;
    }

    if (Object.keys(current.nodes).length) {
      if (current.nodes[nodeData.parent]) {
        var parent = current.nodes[nodeData.parent];
        nodeData.apparentZoom = parent.apparentZoom * nodeData.zoom
      }
    } else {
      nodeData.apparentZoom = nodeData.zoom;
    }
    current.nodes[nodeData.id] = nodeData;
    if ($('#' + nodeData.id).length === 0) {
      createNodeDom(nodeData);
    }
  }

  function createNodeDom(nodeData) {
    var newNode = $('<div>')
    newNode.attr('id', nodeData.id)
    newNode.addClass('text')
    if (nodeData.body.match(/gifv$/g)) {
      newNode.html("<video preload='auto' autoplay='autoplay' loop='loop' data-name='" + nodeData.body.split(',')[0] + "' ><source src='" + nodeData.body.split(',')[1].replace('gifv', 'webm') + "' type='video/webm'></source></video>")
      $.ajax({
        url: nodeData.body.split(',')[1].replace('gifv', 'webm'), 
        error: function() {
          newNode.html("<img data-name='" + nodeData.body.split(',')[0] + "' src='" + nodeData.body.split(',')[1].replace('gifv', 'gif') + "'>")
          updateTextPosition(newNode.get(0));
        }
      })
    } else if (nodeData.body.match(/\.(jpeg|jpg|gif|png)$/)) {
      newNode.html("<img data-name='" + nodeData.body.split(',')[0] + "' src='" + nodeData.body.split(',')[1] + "'>")
    } else if (nodeData.body.match(/youtube\.com/)) {
      newNode.html("<iframe data-name'" + nodeData.body.split(',')[0] + "' src='" + nodeData.body.split(',')[1] + "' frameborder='0' allowfullscreen></iframe>")
    } else {
      newNode.html("<div class='title'>" + nodeData.key + "</div><div class='body'>" + nodeData.body + "</div>")
    }
    newNode.find('img').css({"transitionDuration": "0.2s"});
    newNode.find('video').css({"transitionDuration": "0.2s"});
    newNode.find('iframe').css({"transitionDuration": "0.2s"});
    bp.appendChild(newNode.get(0))
  }

  // check if element is withing viewing range
  function checkValid(node) {
    if (node.apparentX > current.x + screen.width * 2 ||
        node.apparentX + $('#' + node.id).width() * 2 < current.x ||
        node.apparentY > current.y + screen.height * 2 ||
        node.apparentY + $('#' + node.id).height() * 2 < current.y ||
        node.apparentZoom < current.zoom / ZOOM_THRESHOLD ||
        node.apparentZoom > current.zoom * ZOOM_THRESHOLD) {
      node.valid = false
      Object.keys(node.children).forEach(function(childId) {
        var child = current.nodes[childId]
        if (child && !child.valid) {
          deleteNode(child)
        }
      })
      if (node.parent && current.nodes[node.parent] && !current.nodes[node.parent].valid) {
        deleteNode(current.nodes[node.parent])
      }
    } else {
      if (!node.valid) {
        Object.keys(node.children).forEach(function(childId) {
          var child = current.nodes[childId]
          if (!child) {
            current.branches[childId] = node.id
          }
        });
        if (!current.nodes[node.parent]) {
          current.newAnchor = node.parent
        }
      }
      node.valid = true
    }
  }
  
  // check if all children are within viewing range
  function checkTreeValid(node) {
    if (typeof(node) === "number") {
      return false
    }
    var treeValid = node.valid
    Object.keys(node.children).forEach(function(childId) {
      if (typeof(child) !== "string") {
        treeValid = treeValid || checkTreeValid(child)
    }
    });
    return treeValid
  }

  function checkAnchorValid() {
    if (!current.anchor) {
      return false
    }
    var anchor = current.nodes[current.anchor]
    var childrenNum = anchor.children.length
    var validChildren = []
    anchor.children.forEach(function(child) {
      if (checkTreeValid(child)) {
        validChildren.push(child)
      }
    })
    if (validChildren.length === 1 && !current.nodes[current.anchor].valid) {
      var oldAnchor = anchor
      establishAnchor(validChildren[0])
      deleteNode(oldAnchor)
      return false
    } else {
      return true;
    }
  }

  function deleteNode(node) {
    if (node.id === current.anchor) {
      var newAnchor = Object.keys(current.nodes).filter(function(nodeId) {
        return current.nodes[nodeId].valid
      })[0];
      establishAnchor(current.nodes[newAnchor])
    }
    delete current.nodes[node.id]
    $('#' + node.id).remove();
  }

  function wordWrap(str, maxWidth) {
    var newLineStr = "\n";
    var done = false;
    var res = '';
    do {                    
      var found = false;
      // Inserts new line at first whitespace of the line
      for (var i = maxWidth - 1; i >= 0; i--) {
        if (testWhite(str.charAt(i))) {
          res = res + [str.slice(0, i), newLineStr].join('');
          str = str.slice(i + 1);
          found = true;
          break;
        }
      }

      // Inserts new line at maxWidth position, the word is too long to wrap
      if (!found) {
        res += [str.slice(0, maxWidth), newLineStr].join('');
        str = str.slice(maxWidth);
      }

      if (str.length < maxWidth) {
        done = true;
      }
    } while (!done);

    return $.trim(res) + " " + str;
  }

  function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
  };
})();
