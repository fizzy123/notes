$(document).ready(function() {
var stage = new createjs.Stage('canvas');

/*
 * INITIALIZATION
 */

var TIER_THRESHOLD = 1000000;
var ZOOM_THRESHOLD = 1000;
var ZOOM_CONSTANT = 1.2;
var FONT = 'monospace';


var colors = [
  '#69D2E7',
  '#A7DBD8',
  '#F38630',
  '#FA6900',

  '#FE4365',
  '#FC9D9A',
  '#F9CDAD',
  '#C8C8A9',
  '#83AF9B',

  '#ECD078',
  '#D95B43',
  '#C02942',
  '#53777A',

  '#CFF09E',
  '#A8DBA8',
  '#79BD9A',
  '#3B8686',

  '#4ECDC4',
  '#C7F464',
  '#FF6B6B',

  '#D1F2A5',
  '#FFC48C',
  '#FF9F80',
  '#F56991'
];

var current = {};
current.x = - stage.canvas.width * 1.8;
current.y = - stage.canvas.height * 1.2;
current.zoom = 0.7;
current.branches = {};
current.nodes = {};
current.loading = false;
current.color = 1;
current.glitching = false;

loadNodes();
var previousZoom = current.zoom;
resize();

function tick(event) {
  if (!event.paused) {
    stage.update();
    if (Math.random() < 0.01 && !current.glitching) {
      console.log(current);
      glitchEffect();
    } else {
      current.glitching = false;
    }
  }
}

createjs.Ticker.addEventListener("tick", tick);

window.addEventListener('resize', resize, false);
function resize() {
  stage.canvas.width = window.innerWidth;
  stage.canvas.height = window.innerHeight;
}

/*
 * TEXT BOXES
 */

function updateTextPosition(id) {
  var node = current.nodes[id];
  checkValid(node);
  var zoom = node.apparentZoom / current.zoom;
  if (node.parentId && current.nodes[node.parentId]) {
    var ref = node.link.parent.localToGlobal(node.link.x, node.link.y);
    node.apparentX = (ref.x) * current.zoom  + current.x;
    node.apparentY = (ref.y) * current.zoom + current.y;
  }
  if ((node.apparentX - current.x) * zoom > stage.canvas.width * 5 ||
      (node.apparentX - current.x) * zoom < -stage.canvas.width * 5 ||
      (node.apparentY - current.y) * zoom > stage.canvas.height * 5 ||
      (node.apparentY - current.y) * zoom < -stage.canvas.height * 5) {
    visible = false;
  }
  
  if (zoom > 7) {
    node.alpha = 0;
    node.visible = false;
  } else if (zoom > 2) {
    node.alpha = (6 - zoom) / 5;
    node.visible = true;
  } else if (zoom > 1) {
    node.alpha = 1;
  } else if (zoom > 0.1) {
    node.alpha = (zoom - 0.1 )/0.9;
    node.visible = true;
  } else {
    node.alpha = 0;
    node.visible = false;
  }

  node.scaleX = zoom;
  node.scaleY = zoom;

  node.x = (node.apparentX - current.x) / current.zoom;
  node.y = (node.apparentY - current.y) / current.zoom;

}

/*
 * PAN AND MOVE
 */

var dragging = false,
  previousMousePosition;

window.onmousedown = function(e) {
  dragging = true;
  biggestPictureSeen = false;
  previousMousePosition = { x: e.clientX, y: e.clientY };
};

window.onmouseup = function(e) {
  dragging = false;
};

window.onmousemove = function(e) {
//  console.log(e.clientX, e.clientY);
  if (dragging) {
    current.x -= (e.clientX - previousMousePosition.x) * current.zoom;
    current.y -= (e.clientY - previousMousePosition.y) * current.zoom;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    if (!current.loading) {
        loadNodes();
    }
    for (var id in current.nodes) {
      updateTextPosition(id);
    }
  }
};

/*
 * ZOOM
 */

window.ondblclick = function doubleClick(e) {
  e.preventDefault();
  onZoom(current.zoom / ZOOM_CONSTANT / ZOOM_CONSTANT, current.x + e.clientX * current.zoom, current.y + e.clientY * current.zoom, e.clientX, e.clientY);
};

var biggestPictureSeen = false,
  zooming = false,
  previous;

function onZoom(zoom, wx, wy, sx, sy) {  // zoom on (wx, wy) (world coordinates) which will be placed on (sx, sy) (screen coordinates)
  wx = (typeof wx === "undefined") ? current.x + stage.canvas.width / 2 * current.zoom : wx;
  wy = (typeof wy === "undefined") ? current.y + stage.canvas.height / 2 * current.zoom : wy;
  sx = (typeof sx === "undefined") ? stage.canvas.width / 2  : sx;
  sy = (typeof sy === "undefined") ? stage.canvas.height / 2 : sy;

  current.x = wx - sx * zoom; current.y = wy - sy * zoom; current.zoom = zoom;

  biggestPictureSeen = false;
  if (!current.loading) {
    loadNodes();
  }
  for (var id in current.nodes) {
    updateTextPosition(id);
    if (id in current.nodes) {
      updateTextPosition(id);
    }
  }
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

if ("onmousewheel" in document) { $('canvas')[0].onmousewheel = mousewheel; }
else { $('canvas')[0].addEventListener('DOMMouseScroll', mousewheel, false); }

/*
 * USEFUL FUNCTIONS
 */

var nodeIds = {};

function loadNodes() {
  var pks;
  pks = {'pks': current.branches};
  current.loading = true;
  if (Object.keys(current.branches).length || !Object.keys(current.nodes).length || current.newAnchor) { // Don't get the initial node again
    pks.anchor = current.newAnchor;
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
      var group;
      Object.keys(data.nodes).forEach(function(nodeId) {
        var parent = data.nodes[nodeId].parent;
        if (parent && current.nodes[parent]) {
          var instances = current.nodes[parent].links;
          instances.forEach(function(instance) {
            if (instance.text == data.nodes[nodeId].key) {
              var group = new createjs.Container();
              group.nodeChildren = data.nodes[nodeId].children;
              group.parentId = data.nodes[nodeId].parent;
              group.body = data.nodes[nodeId].body;
              group.key = data.nodes[nodeId].key;
              group.id = data.nodes[nodeId].id;
              group.link = instance;
              instance.child = group;
              group.apparentX = instance.x * current.zoom  + current.x;
              group.apparentY = instance.y * current.zoom + current.y;
              createNode(group);
            }
          });
        } else if (!parent) {
          group = new createjs.Container();
          group.nodeChildren = data.nodes[nodeId].children;
          group.parentId = data.nodes[nodeId].parent;
          group.body = data.nodes[nodeId].body;
          group.key = data.nodes[nodeId].key;
          group.id = data.nodes[nodeId].id;
          createNode(group);
        }
        // remove nodes that loaded children from current.branches, since they have children now
        delete current.branches[nodeId];
      });

      // establish new anchor
      if (data.anchor && group) {
        establishAnchor(group);
      }

      for (var id in current.nodes) {
        updateTextPosition(id);
      }

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
  current.x = (current.x - offset.x) / offset.zoom;
  current.y = (current.y - offset.y) / offset.zoom;
  current.zoom = current.zoom / offset.zoom;
  Object.keys(current.nodes).forEach(function(nodeId) {
    current.nodes[nodeId].apparentX = (current.nodes[nodeId].apparentX - offset.x) / offset.zoom;
    current.nodes[nodeId].apparentY = (current.nodes[nodeId].apparentY - offset.y) / offset.zoom;
    current.nodes[nodeId].apparentZoom = current.nodes[nodeId].apparentZoom / offset.zoom;
  });
  current.anchor = node.id;
}

var direction = 0;
function createNode(nodeData) {
  if (!(nodeData.id in nodeIds)) {
    nodeIds[nodeData.id] = 0;
  } else {
    nodeIds[nodeData.id] = nodeIds[nodeData.id] + 1;
  }
  if (nodeData.parentId && current.nodes[nodeData.parentId]) {
    delete current.nodes[nodeData.parentId].nodeChildren[nodeData.id];
  }
  nodeData.id = nodeData.id + "-" + nodeIds[nodeData.id];
  if (nodeData.parentId && current.nodes[nodeData.parentId]) {
    current.nodes[nodeData.parentId].nodeChildren[nodeData.id] = true;
  }
  if (!('apparentX' in nodeData) && !('apparentY' in nodeData) && !nodeData.parentId) {
    nodeData.apparentX = 0;
    nodeData.apparentY = 0;
  }
  if (nodeData.parentId && !nodeData.zoom) {
      nodeData.zoom = 1/5;
  } else if (!nodeData.parentId && !nodeData.zoom) {
    nodeData.zoom = 1;
  }

  if (Object.keys(current.nodes).length) {
    var parent = current.nodes[nodeData.parentId];
    nodeData.apparentZoom = parent.apparentZoom * nodeData.zoom;
  } else {
    nodeData.apparentZoom = nodeData.zoom;
  }
  if (!current.nodes[nodeData.id]) {
    createNodeDom(nodeData);
  }

  current.nodes[nodeData.id] = nodeData;
}

function createNodeDom(nodeData) {
  var color = colors[Math.floor(Math.random() * colors.length)];
  if (nodeData.link) {
      color = nodeData.link.color;
  }
  var title = new createjs.Text(nodeData.key, 12 * 5 + "px " + FONT, color);
  title.x = 0;
  title.y = 0;
  title.lineHeight = 12 * 5;
  nodeData.addChild(title);
  nodeData.links = [];

  var position = new createjs.Point(4, 8 + title.getMeasuredHeight());

  var text = new createjs.Text('', "12px " + FONT, '#FFFFFF');
  text.x = position.x;
  text.y = position.y;
  text.lineHeight = 12;
  position = new createjs.Point(text.x + text.getMeasuredWidth(), position.y);

  var bodyLines = nodeData.body.split(/<br>/);
  bodyLines.forEach(function(bodyLine) {
    var click = false;
    if (bodyLine.slice(0,4) === '<div') {
      click = true;
    }
    bodyLine.split(/<[\/]?div.*?>/).forEach(function(bodySection) {
      if (bodySection) {
        var section = new createjs.Text('', "12px " + FONT);
        section.x = position.x;
        section.y = position.y;
        section.lineHeight = 12;
        section.text = bodySection.replace(/&nbsp;/g, '');

        if (click) {

          section.id = nodeData.nodeChildren[section.text];
          section.color = colors[Math.floor(Math.random() * colors.length)];
          section.linkTitle = true;
          nodeData.addChild(section);
          nodeData.links.push(section);
          text.text += " ".repeat(section.text.length);
        } else {
          text.text += bodySection.replace(/&nbsp;/g, '');
        }
        position = new createjs.Point(section.x + section.getMeasuredWidth(), position.y);
        click = !click;
      }
    });
    position = new createjs.Point(4, position.y + 12);
    text.text += '\n';
  });
  nodeData.addChild(text);
  stage.addChild(nodeData);
}

// check if element is withing viewing range
function checkValid(node) {
  if ((node.apparentX - current.x) * node.apparentZoom / current.zoom > stage.canvas.width * 10 ||
      (node.apparentX - current.x) * node.apparentZoom / current.zoom < -stage.canvas.width * 10 ||
      (node.apparentY - current.y) * node.apparentZoom / current.zoom > stage.canvas.height * 10 ||
      (node.apparentY - current.y) * node.apparentZoom / current.zoom < -stage.canvas.height * 10) {
//    node.valid = false;
//    deleteNode(node);
  } else if (node.apparentZoom < current.zoom / ZOOM_THRESHOLD) {
    node.valid = false;
    node.links.forEach(function(link) {
      if (link.child) {
        deleteNode(link.child);
        delete link.child;
      }
    });
  } else if (node.apparentZoom > current.zoom * ZOOM_THRESHOLD) {
    node.valid = false;
    if (node.parentId && current.nodes[node.parentId] && !current.nodes[node.parentId].valid) {
      deleteNode(current.nodes[node.parentId]);
    }
  } else {
    if (!node.valid) {
      node.links.forEach(function(link) {
        if (!link.child) {
          // This is a little confusing but links are the specific text element in a body of text that whole nodes should be attached to
          current.branches[link.id] = node.id;
        }
      });
    }
    node.valid = true;
  }
}

function deleteNode(node) {
  if (node.id === current.anchor) {
    var newAnchor = Object.keys(current.nodes).filter(function(nodeId) {
      return current.nodes[nodeId].valid;
    })[0];
    establishAnchor(current.nodes[newAnchor]);
  }
  stage.removeChild(current.nodes[node.id]);
  delete current.nodes[node.id];
}
});

function glitchEffect() {
  console.log(current);
  createjs.Ticker.pause = true;
  current.glitching = true;
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var parameters = { amount: Math.random() * 99, seed: Math.random() * 100, iterations: 3, quality: Math.random * 99};
  function drawGlitchedImageData(image_data) {
    ctx.putImageData(image_data, 0, 0);
  }
  glitch(ctx.getImageData(0, 0, canvas.clientWidth, canvas.clientHeight), parameters, drawGlitchedImageData);
  setTimeout(function() {
    if (Math.random() < 0.3) {
       glitchEffect();
    } else {
      createjs.Ticker.pause = false;
    }
  }, 1000/6);
}
