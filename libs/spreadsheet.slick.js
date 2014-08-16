(function (Spreadsheet) {
    $.extend(true, window, {
        "Spreadsheet": {
            "Slick": SpreadsheetSlick
        }
    });

    function SpreadsheetSlick(selector, data, custom_options, controller) {
        /**
         * @param custom_options - параметры таблицы
         */
        var grid;
        var columns = [
            {
                id: 'rowNum',
                field: 'rowNum',
                name: 'rowNum',
                resizable: false,
                selectable: false,
                focusable: false,
                width: 50
            }
        ];
        var dataModel = {
            spreadsheet: Spreadsheet.createSheet(),
            addItem: function(i, row){
                var rows = this.spreadsheet.cells.byRowAndCol,
                    cells_by_pos = this.spreadsheet.cells.byPosition,
                    changedCells = [];
                row = row || [];
                rows.insertAt(i, row);
                rows = rows.slice(i+1).reverse();
                _.each(rows, function(row){
                    if(!row) return;
                    if(row.rowNum) row.rowNum++;
                    _.each(row, function(cell){
                        if(!cell) return;
                        var old_pos = cell.getId();
                        cell.position.row++;
                        cells_by_pos[cell.getId()] = cell;
                        delete cells_by_pos[old_pos];
                    });
                });
            },
            removeItem: function(i){
                var rows = this.spreadsheet.cells.byRowAndCol,
                    cells_by_pos = this.spreadsheet.cells.byPosition,
                    row = _.compact(this.getItem(i));
                rows.removeAt(i);
                rows = rows.slice(i);

                _.each(rows, function(row){
                    if(!row) return;
                    if(row.rowNum) row.rowNum--;
                    _.each(row, function(cell){
                        if(!cell) return;
                        cell.position.row--;
                        cells_by_pos[cell.getId()] = cell;
                    });
                });

                return row;
            },
            getItem: function (i) {
//                var cell = grid.getActiveCell(),
//                    indexCell = cell? cell.cell: false;
//
//                var isAsc = controller.get('isAsc');
                var row = null;

//                if(indexCell) {
//                    //здесь нужно определить какой стобец доставать -
//                    //var cName= grid.getColumns()[indexCell].name;
//                    if(isAsc) {
//                        row = this.spreadsheet.cells.byRowAndCol[i]? this.spreadsheet.cells.byRowAndCol[i][indexCell]:{};
//                    }
//                    else{
//                           row=  this.spreadsheet.cells.byRowAndCol[(this.spreadsheet.cells.length-1) - i]? this.spreadsheet.cells.byRowAndCol[(this.spreadsheet.cells.length-1) - i][indexCell]:{};
//                    }
//                }
//                else {
                   row=  this.spreadsheet.cells.byRowAndCol[i];
//                }
                if (!row) {
                    row = {};
                }
                if (!row.rowNum) row.rowNum = i + 1;
                return row;
            },
            getItemMetadata: function (i) {
                var meta = {
                    cssClasses: '',
                    focusable: true,
                    selectable: true,
                    columns: {
                        'rowNum': {
                            selectable: false,
                            focusable: false
                        }
                    }
                };

                var row = this.getItem(i);
                if (row) {
                    for (var col = 0; col < row.length; col++) {
                        var cell = row[col];
                        if (cell) {
                            var itemMeta = cell.metadata ? cell.metadata : {};
                            meta.columns[cell.position.col] = itemMeta;
                            itemMeta.formatter = CellFormatter;
                        }
                    }
                }
                return meta;
            },
            getLength: function () {
                if (this.spreadsheet &&
                    this.spreadsheet.cells &&
                    this.spreadsheet.cells.byRowAndCol) {
                    return this.spreadsheet.cells.byRowAndCol.length;
                }
                return 0;
            },
            setCellData: function (pos, value) {
                var cell = this.spreadsheet.setCellData(pos, value);
                cell.addValueChangeListener(ValueChangeListener, cell);
                return cell;
            },
            copyCell: function (cellOrPosFrom, cellOrPosTo) {
                var value,
                    cellFrom,
                    cellTo, matches, colFrom, rowFrom,
                    colTo, rowTo,
                    indexesFrom, indexesTo;
                if (typeof cellOrPosFrom == 'string') {
                    cellFrom = this.spreadsheet.getCell(cellOrPosFrom);
                } else {
                    cellFrom = cellOrPosFrom;
                }
                if (typeof cellOrPosTo == 'string') {
                    cellTo = this.spreadsheet.getCell(cellOrPosTo);
                } else {
                    cellTo = cellOrPosTo;
                }
                value = cellFrom.formula;
                if (this.isFormula(value)) {
                    matches = cellFrom.getId().match(/([A-Z]+)([0-9]+)/);
                    if (!matches) return;
                    colFrom = matches[1];
                    rowFrom = matches[2];
                    matches = cellTo.getId().match(/([A-Z]+)([0-9]+)/);
                    if (!matches) return;
                    colTo = matches[1];
                    rowTo = matches[2];
                    indexesFrom = [grid.getColumnIndex(colFrom), parseInt(rowFrom, 10)];
                    indexesTo = [grid.getColumnIndex(colTo), parseInt(rowTo, 10)];
                    matches = value.match(/[A-Z]+[0-9]+/g);
                    if (matches) {
                        var matches_ref, ref_column, ref_column_index, ref_row_index,
                            newCellId,
                            columns = grid.getColumns();
                        matches = _.unique(matches);
                        for (var i = 0; i < matches.length; i++) {
                            matches_ref = matches[i].match(/([A-Z]+)([0-9]+)/);
                            if (!matches_ref) continue;
                            ref_column = _.find(columns, function (c) {
                                return c.id == matches_ref[1];
                            });
                            if (!ref_column) continue;
                            // replace column id for reference
                            ref_column_index = columns.indexOf(ref_column);
                            ref_column_index = ref_column_index + (indexesTo[0] - indexesFrom[0]);
                            if (ref_column_index < 1 || ref_column_index >= columns.length) {
                                value = value.replace(new RegExp(matches[i], 'g'), '#REF!');
                                continue;
                            } else {
                                newCellId = columns[ref_column_index].id;
                            }
                            // replace index row for reference
                            ref_row_index = parseInt(matches_ref[2], 10) + (indexesTo[1] - indexesFrom[1]);
                            if (ref_row_index < 1 || ref_row_index > this.getLength()) {
                                value = value.replace(new RegExp(matches[i], 'g'), '#REF!');
                                continue;
                            } else {
                                newCellId += ref_row_index;
                            }
                            value = value.replace(new RegExp(matches[i], 'g'), newCellId);
                        }
                    }
                }
                return this.setCellData(cellTo.getId(), value);
            },
            isFormula: function (value) {
                if (typeof(value) === 'string') {
                    return value.length > 1 && value.indexOf('=') === 0;
                }
                return false;
            }
        };
        var options = {
            enableColumnReorder: false,
            editable: true,
            enableAddRow: false,
            enableCellNavigation: true,
            asyncEditorLoading: false,
            autoEdit: false,
            enableAsyncPostRender: true,
            asyncPostRenderDelay: 0
        };

        options = $.extend(options, custom_options);

        this.setData = function (data) {
            for (var pos in data) {
                var inData = data[pos];
                var formula = typeof(data[pos]) === "object" ? inData.formula : inData;
                var cell = dataModel.setCellData(pos, formula);

                if (inData.metadata) {
                    cell.setMetadata(inData.metadata);
                }

                cell.notes = inData.notes;

                if (inData.dataValidation) {
                    cell.setDataValidation(
                        inData.dataValidation.type,
                        inData.dataValidation.operator,
                        inData.dataValidation.args,
                        inData.dataValidation.options
                    );
                }

            }
        };

        this.getGrid = function () {
            return grid;
        };

        this.getSpreadsheet = function () {
            return dataModel.spreadsheet;
        };

        this.setData(data);


        //сolumns - переданные в контроллере
        var contrColumns = controller.get('tableWorksheetInstance').getColumns();
        if (contrColumns.length > 0) {
            _.each(contrColumns, function (item) {
                if (item.field == 'rowNum' || (item.hasOwnProperty('customType') && item.customType == 'comment')) {
                    //nothing
                } else {
                    _.extend(item, {
                        editor: FormulaEditor,
                        asyncPostRender: AsyncRenderer,
                        formatter: ColumnFormatterUniversal
                    });
                }
            });
            columns = _.filter(contrColumns, function(c){ return c.field == 'rowNum' || !c.hidden });
        } else {
            //первичаня инициализация столбцов
            var cNum = dataModel.spreadsheet.getColNum();
            for (var c = 0; c < cNum; c++) {
                var name = Spreadsheet.getColumnNameByIndex(c);
                if (name == 'rowNum') {
                    columns.push({
                        id: name,
                        field: c,
                        name: name,
                        sortable: false
                    });
                } else {
                    columns.push({
                        id: name,
                        field: c,
                        name: name,
                        editor: FormulaEditor,
                        formatter: ColumnFormatterUniversal,
                        asyncPostRender: AsyncRenderer,
                        width: 100,
                        format_type: false,
                        format: false
                        //,
//                        sortable: true
                    });
                }
            }
            //save initialized column values to Drive
            controller.get('tableWorksheetInstance').setColumns(columns);
        }
        grid = new Slick.Grid(selector, dataModel, columns, options);
        grid.setSelectionModel(new Slick.CellSelectionModel());
        grid.registerPlugin(new Slick.AutoTooltips());

        grid.onActiveCellChanged.subscribe(function (e, args) {

            $('.spreadsheet-message').fadeOut(function () {
                $(this).remove();
            });

            var cell = grid.getDataItem(args.row)[args.cell - 1];
            if (cell != null && cell.hasDataValidation()) {
                if (cell.dataValidation.showInputMessage()) {
                    var cellNode = $(args.grid.getCellNode(args.row, args.cell));
                    var cellPos = cellNode.position();
                    var cellWidth = cellNode.width();
                    var cellHeight = cellNode.height();
                    var msgUi = $('<div></div>').addClass('spreadsheet-message').css({
                        position: 'absolute',
                        top: cellPos.top + cellHeight + 10,
                        left: cellPos.left + cellWidth / 2,
                        zIndex: 1000,
                        display: 'none'
                    }).appendTo(cellNode.parent()).fadeIn();
                    var title = $('<p></p>').text(cell.dataValidation.options.promptTitle).appendTo(msgUi);
                    var text = $('<p></p>').text(cell.dataValidation.options.promptText).appendTo(msgUi);
                }
            }
        });
        function AsyncRenderer(cellNode, row, dataContext, colDef) {
            if (dataContext) {
                var cell = dataContext[colDef.field];
                if (cell) {
                    try {
                        var result_formatter = colDef.formatter(row, colDef.field, cell.getCalculatedValue(), colDef),
                            result_css = result_formatter[1];
                        if(_.isArray(result_formatter)){
                            if(result_css.color_bg) $(cellNode).addClass(result_css.color_bg);
                            if(result_css.color_font) $(cellNode).addClass(result_css.color_font);
                            $(cellNode).html(result_formatter[0]);
                        } else {
                            $(cellNode).html(result_formatter);
                        }
                    } catch (err) {
                        console.log("cell: " + cell.position + '(' + cell.formula + ') - ' + err);
                        $(cellNode).text('' + EFP.Error.NAME);
                    }
                }
            }
        }

        //объект с фильтрами по столбцам
        var columnFilters =  {};

        /////////////////////
        function filter(item) {
            var me = this;
            //фильтр для столбцов
            for (var columnId in columnFilters) {
                if (columnId !== undefined && columnFilters[columnId] !== "") {
                    var c = grid.getColumns()[grid.getColumnIndex(columnId)];
                    if (item[c.field] != columnFilters[columnId]) {
                        return false;
                    }
                }
            }
            return true;
        }

        //Фильтр столбцов
        $(grid.getHeaderRow()).delegate(":input", "change keyup", function (e) {
            var columnId = $(this).data("columnId");
            if (columnId != null) {
                columnFilters[columnId] = $.trim($(this).val());
                //dataView.refresh();
            }
        });

//        grid.onHeaderRowCellRendered.subscribe(function(e, args) {
//            $(args.node).empty();
//            $("<input type='text'>")
//                .data("columnId", args.column.id)
//                .val(columnFilters[args.column.id])
//                .appendTo(args.node);
//        });

        /////////////////////////

        function CellFormatter(r, c, v, metadata, row) {
            var value;
            if(!v) return '';
            if (v.isCalculated()) {
                value = v.toString();
            } else {
                value = '...';
            }
            return value;
        }

        function FormulaEditor(args) {
            var $input;
            var defaultValue;
            var scope = this;
            var cell = args.item[args.column.field];

            var _editor = new Slick.Editors.Textarea(args);

            //customization
            var _selector;

            this.init = function () {
                if (cell &&
                    cell.hasDataValidation() &&
                    cell.dataValidation.type === 'list' &&
                    cell.dataValidation.options.showDropDown) {

                    var values = cell.dataValidation.getListItems(cell);
                }
                _selector = new Slick.CellRangeSelector();
                _selector.onCellRangeSelected.subscribe(scope.handleCellRangeSelected);
                grid.registerPlugin(_selector);
                $('.selection-cell-overlay').hide();
            };

            this.destroy = function () {
                _selector.onCellRangeSelected.unsubscribe(scope.handleCellRangeSelected);
                grid.unregisterPlugin(_selector);
                //$input.remove();
                _editor.destroy();
                $('.selection-cell-overlay').show();
            };


            this.handleCellRangeSelected = function (e, args) {
                //определить текущее положение курсора
                var //cursorPosition = doGetCaretPosition($('input.editor-formula')[0]),
                    input = $(grid.getActiveCellNode()).find('.editor-text'),
                    cursorPosition = doGetCaretPosition(input),
                    currentVal =  _editor.getValue(),
                    newVal = '',
                    firstCell = grid.getColumns()[args.range.fromCell].name + (args.range.fromRow + 1),
                    secondCell = grid.getColumns()[args.range.toCell].name + (args.range.toRow + 1),
                    rangeVal = firstCell == secondCell ? firstCell : firstCell + ":" + secondCell;

                if (currentVal != '' && currentVal.indexOf('=') === 0 /**&& cursorPosition != 0 */ /*&& cursorPosition!=currentVal.length */) {
                    newVal = //currentVal.substring(0, cursorPosition)
                        currentVal + rangeVal ;//currentVal.substring(cursorPosition, currentVal.length);
                }
                else {
                    //диапазон выбирается без = -указания начала формулы
                    scope.destroy();
                    return;
                }
                //$input.val(newVal);
                _editor.setValue(newVal);
            };


            this.focus = function () {
                //$input.focus();
                var input = $(grid.getActiveCellNode()).children('div');
                input.focus();
            };

            this.getValue = function () {
                //return $input.val();
                return _editor.getValue();
            };

            this.setValue = function (val) {
                //$input.val(val);
                _editor.setValue(val);
            };

            this.loadValue = function (item) {
                defaultValue = "";
                if (cell) {
                    if (cell.isFormula()) {
                        defaultValue = cell.formula;
                    } else {
                        defaultValue = cell.value;
                    }
                }
                var input = $(grid.getActiveCellNode()).children('div');
                _editor.setValue(defaultValue);
                input[0].defaultValue = defaultValue;
                input.select();
            };

            this.serializeValue = function () {
               return _editor.getValue();
            };

            this.parseDate = function(val, format, is_strict){
                // auto-convert date
                format = !format && 'YYYY-MM-DD hh:mm:ss' || format;
                var is_found,
                    patterns = [
                    ['YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/],
                    ['YYYY-MM-DD hh:mm', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/],
                    ['YYYY-MM-DD hh:mm:ss', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/],
                    ['YYYY.MM.DD', /^\d{4}\.\d{2}\.\d{2}$/],
                    ['YYYY.MM.DD hh:mm', /^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/],
                    ['YYYY.MM.DD hh:mm:ss', /^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}$/],
                    ['YYYY/MM/DD', /^\d{4}\/\d{2}\/\d{2}$/],
                    ['YYYY/MM/DD hh:mm', /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/],
                    ['YYYY/MM/DD hh:mm:ss', /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/],
                    ['DD-MM-YYYY', /^\d{2}-\d{2}-\d{4}$/],
                    ['DD-MM-YYYY hh:mm', /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/],
                    ['DD-MM-YYYY hh:mm:ss', /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/],
                    ['DD.MM.YYYY', /^\d{2}\.\d{2}\.\d{4}$/],
                    ['DD.MM.YYYY hh:mm', /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/],
                    ['DD.MM.YYYY hh:mm:ss', /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}$/],
                    ['DD/MM/YYYY', /^\d{2}\/\d{2}\/\d{4}$/],
                    ['DD/MM/YYYY hh:mm', /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/],
                    ['DD/MM/YYYY hh:mm:ss', /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/],
                ]
                // end auto-convert date
                for(var i=0; i<patterns.length; i++){
                    var pattern = patterns[i];
                    if(val.match(pattern[1])){
                        val = moment(val, pattern[0]).format(format);
                        is_found = true;
                        break;
                    }
                };
                if(is_strict && !is_found) return null;
                return val;
            };

            this.applyValue = function (item, state) {
                var cell = item[args.column.field];

                state = this.parseDate(state);
                if (cell) {
                    try {
                        cell.setValue(state);
                    } catch (e) {
                        console.log('Error - setValue to cell');
                        if (e instanceof Spreadsheet.DataValidationException) {
                            if (jQuery !== undefined && jQuery.ui.dialog !== undefined) {
                                var dialogOptions = {
                                    resizable: false,
                                    modal: true,
                                    close: function () {
                                        $(this).remove();
                                    }
                                };
                                if (e.type === 'stop') {
                                    dialogOptions.buttons = {
                                        'Retry': function () {
                                            $(this).dialog("close");
                                            grid.editActiveCell();
                                        },
                                        'Cancel': function () {
                                            $(this).dialog("close");
                                        }
                                    };
                                } else if (e.type === 'warning') {
                                    dialogOptions.buttons = {
                                        'Yes': function () {
                                            $(this).dialog("close");
                                            cell.setValue(state, true);
                                        },
                                        'No': function () {
                                            $(this).dialog("close");
                                            grid.editActiveCell();
                                        },
                                        'Cancel': function () {
                                            $(this).dialog("close");
                                        }
                                    };
                                } else if (e.type === 'information') {
                                    dialogOptions.buttons = {
                                        'Ok': function () {
                                            $(this).dialog("close");
                                            cell.setValue(state, true);
                                        },
                                        'Cancel': function () {
                                            $(this).dialog("close");
                                        }
                                    };
                                }

                                var dialog = $('<div></div>').addClass(e.type).attr('id', 'data-validation-dialog').attr('title', e.title).text(e);
                                dialog.appendTo('body');
                                dialog.dialog(dialogOptions);
                            } else {
                                alert(e);
                            }
                        } else {
                            throw e;
                        }
                    }
                } else {
                    var dataModel = args.grid.getData();
                    var pos = args.column.id + args.item.rowNum;
                    item[args.column.field] = dataModel.setCellData(pos, state);
                }
            };

            this.isValueChanged = function () {
               // return (!($input.val() === "" && defaultValue === null)) && ($input.val() !== defaultValue);
                return (!(_editor.getValue() === "" && defaultValue === null)) && (_editor.getValue() !== defaultValue);
            };

            this.validate = function () {
                if (args.column.validation) {
                    var current_validator_type = args.column.validation.current_validator_type,
                        validate_error_msg = args.column.validation.validate_error_msg,
                        value = args.column.validation.value,
                        current_value = _editor.getValue(),
                        show_error = {
                            valid: false,
                            msg: validate_error_msg || null
                        };
                    $('#js__validator_hint_message').hide();
                    if(current_value){
                        switch(current_validator_type){
                            case 'text_contains':
                                if(_.indexOf(value.toLowerCase(), current_value.toLowerCase()) < 0){
                                    return show_error;
                                }
                                break;
                            case 'text_not_contains':
                                if(_.indexOf(value.toLowerCase(), current_value.toLowerCase()) >= 0){
                                    return show_error;
                                }
                                break;
                            case 'gt':
                                if(value >= parseFloat(current_value)){
                                    return show_error;
                                }
                                break;
                            case 'lt':
                                if(value <= parseFloat(current_value)){
                                    return show_error;
                                }
                                break;
                            case 'equal':
                                if(value != parseFloat(current_value)){
                                    return show_error;
                                }
                                break;
                            case 'not_equal':
                                if(value == parseFloat(current_value)){
                                    return show_error;
                                }
                                break;
                            case 'between':
                                if(current_value < parseFloat(value[0]) || current_value > parseFloat(value[1])){
                                    return show_error;
                                }
                                break;
                            case 'not_between':
                                if(current_value > parseFloat(value[0]) && current_value < parseFloat(value[1])){
                                    return show_error;
                                }
                                break;

                            case 'date_between':
                                var _val_from = moment(this.parseDate(value[0], 'YYYY-MM-DD', true), 'YYYY-MM-DD'),
                                    _val_to = moment(this.parseDate(value[1], 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(!_val_from || !_val_to) return show_error;
                                current_value = moment(this.parseDate(current_value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(!current_value || current_value < _val_from || current_value > _val_to ){
                                    return show_error;
                                }
                                break;
                            case 'date_not_between':
                                var _val_from = moment(this.parseDate(value[0], 'YYYY-MM-DD', true), 'YYYY-MM-DD'),
                                    _val_to = moment(this.parseDate(value[1], 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(!_val_from || !_val_to) return show_error;
                                current_value = moment(this.parseDate(current_value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(!current_value || (current_value >= _val_from && current_value <= _val_to) ){
                                    return show_error;
                                }
                                break;
                            case 'date_equal':
                                value = moment(this.parseDate(value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(!value) return show_error;
                                current_value = moment(this.parseDate(current_value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(current_value != value){
                                    return show_error;
                                }
                                break;
                            case 'date_before':
                                value = moment(this.parseDate(value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(!value) return show_error;
                                current_value = moment(this.parseDate(current_value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(current_value >= value){
                                    return show_error;
                                }
                                break;
                            case 'date_after':
                                value = moment(this.parseDate(value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(!value) return show_error;
                                current_value = moment(this.parseDate(current_value, 'YYYY-MM-DD', true), 'YYYY-MM-DD');
                                if(current_value <= value){
                                    return show_error;
                                }
                                break;
                            default:
                                console.log('error validate type: ', current_validator_type);
                                break;
                        }
                    }
                }

                return {
                    valid: true,
                    msg: null
                };
            };

            this.init();
        }

        window.FormulaEditor = FormulaEditor;
        window.AsyncRenderer = AsyncRenderer;

        function ValueChangeListener(e) {
            grid.invalidateRow(this.position.row - 1);
            grid.invalidateRow(e.cell.position.row - 1);
            grid.render();
        }
    }

})(Spreadsheet);