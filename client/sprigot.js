var margin = {top: 20, right: 10, bottom: 20, left: 10};

var settings = {
  serverURL: 'http://127.0.0.1:3000',
  // serverURL: 'http://192.168.1.104:3000'
  treeNodeAnimationDuration: 750
};

var Sprigot = {
  docId: null,
  graph: null
};

Sprigot.init = function init(docId, focusSprigId) {
  this.docId = docId;

  var sprigotSel = d3.select('body').append('section').attr('id', 'sprigot');

  this.graph = createGraph();
  this.graph.init(sprigotSel, Camera, TreeRenderer, TextStuff, Historian);

  Divider.init(sprigotSel, this.graph, TextStuff, Camera);
  TextStuff.init(sprigotSel, this.graph, TreeRenderer, Store, this, Divider);
  Historian.init(this.graph.treeNav, this.docId);

  Divider.syncExpanderArrow();
  this.initDocEventResponders();

  Store.getSprigTree(docId, function done(error, sprigTree) {
    if (error) {
      console.log('Error while getting sprig:', error);
      return;
    }

    if (sprigTree) {
      var sanitizedTree = sanitizeTreeForD3(sprigTree);
      this.graph.loadNodeTreeToGraph(sanitizedTree, focusSprigId);
      console.log('Loaded tree:', sprigTree);
    }
    else {
      console.log('Sprig tree not found.');
    }
  }
  .bind(this));
}

Sprigot.initDocEventResponders = function initDocEventResponders() {
  var doc = d3.select(document);
  if (TextStuff.editAvailable) {
    doc.on('click', TextStuff.endEditing.bind(TextStuff));
  }
  doc.on('keyup', this.respondToDocKeyUp.bind(this));
  doc.on('keydown', this.respondToDocKeyDown.bind(this));
};

Sprigot.respondToDocKeyUp = function respondToDocKeyUp() {
  // CONSIDER: Disabling all of this listening when editing is going on.

  // Esc
  if (d3.event.keyCode === 27) {
    d3.event.stopPropagation();
    if (TextStuff.editZone.classed('editing')) {
      TextStuff.changeEditMode(false);
    }
  }
  else if (!TextStuff.editZone.classed('editing')) {
    switch (d3.event.which) {
      // 'e'.
      case 69:
        d3.event.stopPropagation();
        if (TextStuff.editZone.style('display') === 'block') {
          TextStuff.changeEditMode(true);
        }
        break;
      // Down arrow.
      case 40:
        this.graph.treeNav.respondToDownArrow();
        break;
      // Up arrow.
      case 38:
        this.graph.treeNav.respondToUpArrow();
        break;
      // Left arrow.
      case 37:
        this.graph.treeNav.respondToLeftArrow();
        break;
      // Right arrow.
      case 39:
        this.graph.treeNav.respondToRightArrow();
        break;
      // equal key
      case 187:
        if (d3.event.shiftKey) {
          respondToAddChildSprigCmd();
        }
        break;
    }
  }
}

Sprigot.respondToDocKeyDown = function respondToDocKeyDown() {
  // cmd+delete keys
  if ((d3.event.metaKey || d3.event.ctrlKey) && d3.event.which === 8) {
    TextStuff.showDeleteSprigDialog();
  }
}

Sprigot.respondToAddChildSprigCmd = function respondToAddChildSprigCmd() {
  d3.event.stopPropagation();
  if (TextStuff.editZone.classed('editing')) {
    TextStuff.changeEditMode(false);
  }

  var newSprig = {
    id: TextStuff.makeId(8),
    doc: this.docId,
    title: 'New Sprig',
    body: ''
  };

  var currentChildren = this.graph.focusNode.children;
  if (!currentChildren) {
    currentChildren = this.graph.focusNode._children;
  }
  if (!currentChildren) {
    currentChildren = [];
  }
  currentChildren.push(newSprig);

  this.graph.focusNode.children = currentChildren;

  TextStuff.changeEditMode(true);

  Store.saveChildAndParentSprig(newSprig, serializeTreedNode(this.graph.focusNode));

  TreeRenderer.update(this.graph.nodeRoot, settings.treeNodeAnimationDuration, 
    function done() {
      this.graph.focusOnSprig(newSprig.id);
      TextStuff.showTextpaneForTreeNode(newSprig);
    }
  );
}

Sprigot.respondToDeleteSprigCmd = function respondToDeleteSprigCmd() {
  d3.event.stopPropagation();
  if (TextStuff.editZone.classed('editing')) {
    TextStuff.changeEditMode(false, true);
  }

  var parentNode = this.graph.focusNode.parent;
  var childIndex = parentNode.children.indexOf(this.graph.focusNode);
  parentNode.children.splice(childIndex, 1);

  var sprigToDelete = {
    id: this.graph.focusNode.id,
    doc: this.docId
  };

  Store.deleteChildAndSaveParentSprig(sprigToDelete, 
    serializeTreedNode(parentNode));

  TreeRenderer.update(this.graph.nodeRoot, settings.treeNodeAnimationDuration, 
    function doneUpdating() {
      setTimeout(function clickOnParentOfDeletedNode() {
        this.graph.treeNav.chooseTreeNode(parentNode, 
          d3.select('#' + parentNode.id).node());
      },
      500);
    }
  );
}

