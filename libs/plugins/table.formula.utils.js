/**
 * Some custom  features to realize formulas behaviors in tablesheets
 * */

var en_symbs = ['-', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

/***
 * A proof-of-concept cell editor with Excel-like range selection and insertion.
 */
function FormulaEditor(args) {
    var _self = this;
    var grid = args.grid;
    var _editor = new Slick.Editors.Text(args);
    var _selector;

    $.extend(this, _editor);

    function init() {
        // register a plugin to select a range and append it to the textbox
        // since events are fired in reverse order (most recently added are executed first),
        // this will override other plugins like moverows or selection model and will
        // not require the grid to not be in the edit mode
        _selector = new Slick.CellRangeSelector();
        _selector.onCellRangeSelected.subscribe(_self.handleCellRangeSelected);
        grid.registerPlugin(_selector);
    }

    this.destroy = function () {
        _selector.onCellRangeSelected.unsubscribe(_self.handleCellRangeSelected);
        grid.unregisterPlugin(_selector);
        _editor.destroy();
    };

    this.handleCellRangeSelected = function (e, args) {
        _editor.setValue(
            _editor.getValue() +
                grid.getColumns()[args.range.fromCell].name +
                args.range.fromRow +
                ":" +
                grid.getColumns()[args.range.toCell].name +
                args.range.toRow
        );
    };
    init();
}

function doGetCaretPosition (ctrl) {
    //определение положения курсора в инпуте
	var CaretPos = 0;
	// IE Support
	if (document.selection) {

		ctrl.focus ();
		var Sel = document.selection.createRange ();

		Sel.moveStart ('character', -ctrl.value.length);

		CaretPos = Sel.text.length;
	}
	// Firefox support
	else if (ctrl.selectionStart || ctrl.selectionStart == '0')
		CaretPos = ctrl.selectionStart;

	return (CaretPos);

}


