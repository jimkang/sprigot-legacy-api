var Divider = {
  expanderArrow: null,
  graph: null,
  textStuff: null,
  camera: null
};

Divider.init = function init(sprigotSel, graph, textStuff, camera) {
  this.graph = graph;
  this.textStuff = textStuff;
  this.camera = camera;

  this.expanderArrow = sprigotSel.append('div').classed('divider', true)
    .append('svg').classed('arrowboard', true)
      .append('polygon').attr({
        id: 'expanderArrow',
        fill: 'rgba(0, 0, 64, 0.4)',
        stroke: '#E0EBFF',
        'stroke-width': 1,
        points: '0,0 32,24 0,48',
        transform: 'translate(0, 0)'
      });

  this.expanderArrow.on('click', this.toggleGraphExpansion.bind(this));
};

Divider.syncExpanderArrow = function syncExpanderArrow() {
  var textPaneIsHidden = this.textStuff.pane.classed('collapsedPane');
  var xOffset = textPaneIsHidden ? 36 : 6;
  var transformString = 'translate(' + xOffset + ', 0) ';
  transformString += ('scale(' + (textPaneIsHidden ? '-1' : '1') + ', 1)');

  this.expanderArrow
    .transition()
      .duration(500).ease('linear').attr('transform', transformString)
      .attr('stroke-opacity', 0.5).attr('stroke-width', 2)
    .transition().delay(501).duration(500)
      .attr('stroke-opacity', 0.15).attr('stroke-width', 1);
}

Divider.toggleGraphExpansion = function toggleGraphExpansion() {
  var textPaneIsHidden = this.textStuff.pane.classed('collapsedPane');
  var shouldHideTextPane = !textPaneIsHidden;

  this.textStuff.pane.classed('collapsedPane', shouldHideTextPane)
    .classed('pane', !shouldHideTextPane);
  this.graph.pane.classed('expandedPane', shouldHideTextPane)
    .classed('pane', !shouldHideTextPane);

  this.syncExpanderArrow();

  if (this.graph.focusEl) {
    this.camera.panToElement(d3.select(Graph.focusEl));
  }
}