$(document).ready(function() {
var app = new PIXI.Application(window.innerWidth, window.innerHeight);

document.body.appendChild(app.view);
app.stage.interactive = true;
app.stage.buttonMode = true;

/*
 * INITIALIZATION
 */

var TIER_THRESHOLD = 100;
var ZOOM_THRESHOLD = 100;
var ZOOM_CONSTANT = 1.2;
var FONT = 'monospace';

function resize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
}
window.onresize = resize;

var colors = [
  '#ECD078',
  '#D95B43',
  '#C02942',
  '#542437',
  '#53777A'
];

var current = {};
current.x = - app.renderer.width / 2.5;
current.y = - app.renderer.height / 2.5;
current.zoom = 1;
current.branches = {};
current.nodes = {};
current.loading = false;
current.color = 1;

loadNodes();
var previousZoom = current.zoom;

var test;

/*
 * TEXT BOXES
 */

function updateTextPosition(id) {
  var node = current.nodes[id];
  checkValid(node);
  if (node.parentId && current.nodes[node.parentId]) {
    var ref = new PIXI.Point(node.link.getBounds().left, node.link.getBounds().top);
    node.apparentX = (ref.x + node.getBounds().width/2) * current.zoom  + current.x;
    node.apparentY = (ref.y + node.getBounds().height/2) * current.zoom + current.y;
  }
  if ((node.apparentX - current.x) * node.apparentZoom / current.zoom > app.renderer.width * 5 ||
      (node.apparentX - current.x) * node.apparentZoom / current.zoom < -app.renderer.width * 5 ||
      (node.apparentY - current.y) * node.apparentZoom / current.zoom > app.renderer.height * 5 ||
      (node.apparentY - current.y) * node.apparentZoom / current.zoom < -app.renderer.height * 5) {
    visible = false;
  }
  if ((node.apparentZoom /current.zoom) > 10) {
    node.alpha = 0;
    node.visible = false;
  } else if ((node.apparentZoom /current.zoom) > 5) {
    node.alpha = (10 - (node.apparentZoom / current.zoom)) / 5;
    node.visible = true;
  } else if ((node.apparentZoom / current.zoom) > 1) {
    node.alpha = 1;
  } else if ((node.apparentZoom /current.zoom) > 0.1) {
    node.alpha = ((node.apparentZoom / current.zoom) - 0.1 )/0.9;
    node.visible = true;
  } else {
    node.alpha = 0;
    node.visible = false;
  }

  node.scale = new PIXI.Point(node.apparentZoom / current.zoom / 2, node.apparentZoom / current.zoom / 2 );

  if (node.id === '830-1') {
      console.log(node.position.x, node.position.y);
  }

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
  wx = (typeof wx === "undefined") ? current.x + app.renderer.width / 2 * current.zoom : wx;
  wy = (typeof wy === "undefined") ? current.y + app.renderer.height / 2 * current.zoom : wy;
  sx = (typeof sx === "undefined") ? app.renderer.width / 2  : sx;
  sy = (typeof sy === "undefined") ? app.renderer.height / 2 : sy;

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
              var group = new PIXI.Container();
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
          group = new PIXI.Container();
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
  console.log(nodeData.id);
  if (nodeData.parentId && current.nodes[nodeData.parentId]) {
    current.nodes[nodeData.parentId].nodeChildren[nodeData.id] = true;
  }
  if (!('apparentX' in nodeData) && !('apparentY' in nodeData) && !nodeData.parentId) {
    nodeData.apparentX = 0;
    nodeData.apparentY = 0;
  }
  if (nodeData.parentId && !nodeData.zoom) {
      nodeData.zoom = 1/8;
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
  var title = new PIXI.Text(nodeData.key, {fontFamily: FONT, fontSize: 8 * 12 * 2, fill: 0xC7F464});
  title.x = 0;
  title.y = 0;
  nodeData.addChild(title);
  nodeData.links = [];

  var position = new PIXI.Point(title.getBounds().left, title.getBounds().bottom);

  var text = new PIXI.Text('', {fontFamily: FONT, fontSize: 12 * 2, fill: 0xFFFFFF, leading: 10});
  text.x = position.x;
  text.y = position.y;
  position = new PIXI.Point(text.getBounds().right, position.y);

  var bodyLines = nodeData.body.split(/<br>/);
  bodyLines.forEach(function(bodyLine) {
    var click = false;
    if (bodyLine.slice(0,4) === '<div') {
      click = true;
    }
    bodyLine.split(/<[\/]?div.*?>/).forEach(function(bodySection) {
      if (bodySection) {
        var section = new PIXI.Text('', {fontFamily: FONT, fontSize: 12});
        section.x = position.x;
        section.y = position.y;
        section.text = bodySection.replace(/&nbsp;/g, '');

        if (click) {
          section.id = nodeData.nodeChildren[section.text];
          section.style.fill = 0xC7F464;
          section.linkTitle = true;
          nodeData.addChild(section);
          nodeData.links.push(section);
          text.text += " ".repeat(section.text.length);
        } else {
          text.text += bodySection.replace(/&nbsp;/g, '');
        }
        position = new PIXI.Point(section.getBounds().right, position.y);
        click = !click;
      }
    });
    position = new PIXI.Point(title.getBounds().left, position.y + 10);
    text.text += '\n';
  });
  nodeData.addChild(text);
  if (!test) {
    test = nodeData;
  }
  app.stage.addChild(nodeData);
}

// check if element is withing viewing range
function checkValid(node) {
  if ((node.apparentX - current.x) * node.apparentZoom / current.zoom > app.renderer.width * 10 ||
      (node.apparentX - current.x) * node.apparentZoom / current.zoom < -app.renderer.width * 10 ||
      (node.apparentY - current.y) * node.apparentZoom / current.zoom > app.renderer.height * 10 ||
      (node.apparentY - current.y) * node.apparentZoom / current.zoom < -app.renderer.height * 10) {
    node.valid = false;
    deleteNode(node);
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
  app.stage.removeChild(current.nodes[node.id]);
  delete current.nodes[node.id];
}
});
