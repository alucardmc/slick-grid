(function ($) {
    $.extend(true, window, {
        "Ext": {
            "Plugins": {
                "Overlays": Overlays
            }
        }
    });

    function Overlays(options) {
        var $headerOverlay;
        var $rowOverlay;
        var selectionOverlay;
        var $lastActiveCanvas;

        var currentColumn;
        var handleDragging;
        var grid;
        var self = this;
        var handler = new Slick.EventHandler();
        var dragDecorator;

        var defaults = {
            buttonCssClass: null,
            buttonImage: "../images/down.gif",
            decoratorWidth: 1
        };

        function init(g) {
            options = $.extend(true, {}, defaults, options);
            grid = g;

            dragDecorator = new overlayRangeDecorator(grid);

            //$headerOverlay = createRowHeaderOverlay(1200);
            //$rowOverlay = createRowHeaderOverlay(500);
            selectionOverlay = createSelectionOverlay();

            handler.subscribe(grid.onActiveCellChanged, activeCellChanged)
                   .subscribe(grid.onColumnsResized, columnResized)
                   .subscribe(grid.onScroll, gridScrolled);
        }

        function destroy() {
            handler.unsubscribeAll();
            selectionOverlay.$handle.unbind("dragstart", handleOverlayDragStart)
                                    .unbind('drag', handleOverlayDrag)
                                    .unbind('dragend', handleOverlayDragEnd);

            selectionOverlay.$handle.remove();
            $('.selection-cell-overlay').remove();
        }

        function createRowHeaderOverlay(zIndex) {
            return $('<div>')
                    .addClass("header-overlay")
                    .css("position", "absolute")
                    .css("z-index", zIndex)
                    .appendTo('body');
        }

        function createSelectionOverlay() {
            var canvas = grid.getActiveCanvasNode();
            $lastActiveCanvas = canvas;
            var overlay = new Overlay(canvas, 'selection-');

            overlay.$handle
              .bind('draginit', handleOverlayDragInit)
              .bind('dragstart', handleOverlayDragStart)
              .bind('drag', handleOverlayDrag)
              .bind('dragend', handleOverlayDragEnd);

            return overlay;
        }

        function activeCellChanged(e, args) {
            dragDecorator.hide();
            var currentCanvas = grid.getActiveCanvasNode();
            if($lastActiveCanvas != currentCanvas){
                destroy();
                init(grid);
            }

            moveSelectionOverlay(e, args);
            moveHeaderRowOverlays(e, args);
        }

        function columnResized(e, args) {
            moveHeaderRowOverlays(e, args);
            moveSelectionOverlay(e, args);
        }

        function gridScrolled(e, args) {
            moveHeaderRowOverlays(e, args);
            moveSelectionOverlay(e, args);
        }

        function moveHeaderRowOverlays(e, args) {
            if (typeof args.cell != 'undefined') {
                currentColumn = args.cell;
            } else {
                if (!currentColumn) {
                    return;
                }
            }
            if (!grid.getActiveCell()) {
                return;
            }

            var column = grid.getColumns()[currentColumn];

            $(".slick-header > div > div")
                .removeClass("selected-header");

            $('[id$=' + column.id + ']', '.slick-header')
                .addClass('selected-header');

            var headerHeight = $('.slick-header').height();
            var cellPosition = grid.getActiveCellPosition();
            var gridPosition = grid.getGridPosition();

            var headerWidth = Math.min(cellPosition.width + 3,
                                       gridPosition.width - cellPosition.left + 4);

        }

        function moveSelectionOverlay(e, args) {
            var activeCell = grid.getActiveCell();
            var activeCellNode = $(grid.getActiveCellNode());

            if (!activeCell || activeCellNode.hasClass('comment_column__cell')) {
                selectionOverlay.toggle(false);
                return;
            }

            var column = grid.getColumns()[activeCell.cell];
            selectionOverlay.toggle(true);

            // Only show the handle if the cell is editable
            selectionOverlay.$handle.toggle(typeof (column.editor) !== 'undefined');

            var position = grid.getCellNodeBox(activeCell.row, activeCell.cell);

            // Not coming through on the property so re-calculated
            position.height = position.bottom - position.top;
            position.width = position.right - position.left;

            selectionOverlay.$left.css({
                left: position.left - 1,
                top: position.top,
                width: 2,
                height: position.height
            });

            selectionOverlay.$right.css({
                left: position.left + position.width,
                top: position.top,
                width: 2,
                height: position.height
            });

            selectionOverlay.$top.css({
                left: position.left - 1,
                top: position.top - 2,
                width: position.width + 3,
                height: 2
            });

            selectionOverlay.$bottom.css({
                left: position.left - 1,
                top: position.top + position.height,
                width: position.width + 3,
                height: 2
            });

            selectionOverlay.$handle.css({
                left: position.left + position.width - 3,
                top: position.top + position.height - 3,
                width: 1,
                height: 1
            });

            if($(grid.getActiveCellNode()).hasClass('comment_column__cell')){
                selectionOverlay.$handle.hide();
            } else selectionOverlay.$handle.show();
        }

        var _columnOffset,
            _rowOffset,
            _isBottomCanvas,
            _isRightCanvas;
        function handleOverlayDragInit(e, dd) {
            var activeCanvas = $(grid.getActiveCanvasNode());
            var c = activeCanvas.offset();
            var _gridOptions = grid.getOptions();

            _rowOffset = 0;
            _columnOffset = 0;
            _isBottomCanvas = activeCanvas.hasClass( 'grid-canvas-bottom' );

            if ( _gridOptions.frozenRow > -1 && _isBottomCanvas ) {
                _rowOffset = ( _gridOptions.frozenBottom ) ? $('.grid-canvas-bottom').height() : $('.grid-canvas-top').height();
            }

            _isRightCanvas = activeCanvas.hasClass( 'grid-canvas-right' );

            if ( _gridOptions.frozenColumn > -1 && _isRightCanvas ) {
                _columnOffset = $('.grid-canvas-left').width();
            }

            // prevent the grid from cancelling drag'n'drop by default
            e.stopImmediatePropagation();
        }
        function handleOverlayDragStart(e, dd) {
            var cell = grid.getActiveCell();

            if (grid.canCellBeSelected(cell.row, cell.cell)) {
                handleDragging = true;
                e.stopImmediatePropagation();
            }

            if (!handleDragging) {
                return null;
            }

            grid.focus();

            dd.range = { start: cell, end: {} };

            $(this).css({
                "background-color": "transparent",
                "border-color": "transparent"
            });

            return dragDecorator.show(new Slick.Range(cell.row, cell.cell));
        }

        function handleOverlayDrag(e, dd) {
            if (!handleDragging) {
                return;
            }

            var canvas = grid.getActiveCanvasNode();

            e.stopImmediatePropagation();

            var end = grid.getCellFromPoint(
                e.pageX - $(canvas).offset().left + _columnOffset,
                e.pageY - $(canvas).offset().top + _rowOffset);

            if (!grid.canCellBeSelected(end.row, end.cell)) {
                return;
            }

            dd.range.end = end;

            dragDecorator.show(new Slick.Range(dd.range.start.row,
                                               dd.range.start.cell,
                                               end.row,
                                               dd.range.start.cell));
        }

        function handleOverlayDragEnd(e, dd) {
            if (!handleDragging) {
                return;
            }

            handleDragging = false;

            $(this).css({
                "background-color": "",
                "border-color": ""
            });

            dragDecorator.hideHandle();

            self.onFillUpDown.notify({ "grid": grid, "range": dragDecorator.getSelectedRange() }, e, self);

            e.preventDefault();
            e.stopPropagation();
        }

        function Overlay(target, prefix) {
            var className = (prefix || '') + 'cell-overlay';

            this.$left = $('<div>')
                .addClass(className)
                .addClass('left')
                .appendTo(target);
            
            this.$right = $('<div>')
                .addClass(className)
                .addClass('right')
                .appendTo(target);
            
            this.$top = $('<div>')
                .addClass(className)
                .addClass('top')
                .appendTo(target);
            
            this.$bottom = $('<div>')
                .addClass(className)
                .addClass('bottom')
                .appendTo(target);
            
            this.$handle = $('<div>')
                .addClass("handle-overlay")
                .appendTo(target);

            this.toggle = function (showOrHide) {
                this.$left.toggle(showOrHide);
                this.$right.toggle(showOrHide);
                this.$top.toggle(showOrHide);
                this.$bottom.toggle(showOrHide);
                this.$handle.toggle(showOrHide);
            };
        }

        function overlayRangeDecorator(targetGrid) {
            var decorator,
                lastCanvasNode;
            var r;

            function show(range) {
                r = range;
//                if (decorator && grid.getActiveCanvasNode() != lastCanvasNode) {
//                    decorator.destroy();
//                }
                lastCanvasNode = grid.getActiveCanvasNode();
                if(!decorator) decorator = new Overlay(lastCanvasNode, 'selection-');

                var from = targetGrid.getCellNodeBox(range.fromRow, range.fromCell);
                var to = targetGrid.getCellNodeBox(range.toRow, range.toCell);

                decorator.$left.css({
                    top: from.top - 1,
                    left: from.left - 1,
                    height: to.bottom - from.top + 2,
                    width: options.decoratorWidth
                });

                decorator.$right.css({
                    top: from.top - 1,
                    left: to.right +1,
                    height: to.bottom - from.top + 2,
                    width: options.decoratorWidth
                });

                decorator.$top.css({
                    top: from.top - 1,
                    left: to.left - 1,
                    height: options.decoratorWidth,
                    width: to.right - from.left + 2
                });

                decorator.$bottom.css({
                    top: to.bottom ,
                    left: from.left - 1,
                    height: options.decoratorWidth,
                    width: to.right - from.left + 2
                });

                decorator.$handle.css({
                    top: to.bottom - 3,
                    left: from.right - 4,
                    height: 1,
                    width: 1
                });

                return decorator;
            }

            function getSelectedRange() {
                return r;
            }

            function hide() {
                if (decorator) {
                    decorator.toggle(false);
                    decorator = null;
                }
            }

            function hideHandle() {
                decorator.$handle.hide();
            }

            function destroy(){
                this.$handle.remove();
                this.$top.remove();
                this.$bottom.remove();
                this.$right.remove();
                this.$left.remove();
            }

            return {
                destroy: destroy,
                hide: hide,
                hideHandle: hideHandle,
                show: show,
                getSelectedRange: getSelectedRange
            };
        }

        $.extend(this, {
            "init": init,
            "destroy": destroy,
            "onFillUpDown": new Slick.Event()
        });
    }
})(jQuery);