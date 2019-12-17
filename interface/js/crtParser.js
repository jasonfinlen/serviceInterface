function mergeCRTwithAutoPopulate(rawCRTList,rawMacroAutoPopulate){
    //So I expect a few tables
    console.time('mergeCRTwithAutoPopulate');
    var resultArray = [];
    var logCounter = 0;
    //get the array of functions
    var functionArray = getFunctionListFromAutoPopulate(rawMacroAutoPopulate);
    if((rawCRTList.tables!=null)&&(rawCRTList.tables.t!=null)){
        var tableList = returnArray(rawCRTList.tables.t);
        for(var i = 0;i<tableList.length;i++){
            var table = tableList[i];
            var tableObj = {};
            tableObj.name=table.n;
            tableObj.columns = [];
            var rows = returnArray(table.r);
            //now get how many cols I have as its the same for all rows...
            //has rows got a lenth?
            if(rows.length>1){
                var columnLength = rows[0].c.length;
                var rowLength = rows.length;
                //So here I know how many objects to create so start that based on cols
                for (var colIndex = 0;colIndex<columnLength;colIndex++){
                    var columnObject = {};
                    columnObject.name = rows[0].c[colIndex].n;
                    columnObject.elements = [];
                    columnObject.data = [];
                    for (var rowIndex = 0;rowIndex<rowLength;rowIndex++){
                        //add the data to the data array
                        columnObject.data.push(rows[rowIndex].c[colIndex].$);
                    }
                    tableObj.columns.push(columnObject);
                    tableObj.dataLength = rowLength;
                    //now check this against the function list?
                    //console.log(functionArray);
                    for(var functionIndex=0;functionIndex<functionArray.length;functionIndex++){
                        var functionObj = functionArray[functionIndex];
                        //console.log(functionObj);
                        if((functionObj.table!=null)&&(functionObj.fromcolumn!=null)&&(functionObj.element!=null)){
                            //console.log(functionObj);
                            //console.log(tableObj.name+'=='+functionObj.table);
                            //console.log(functionObj.fromcolumn+'=='+columnObject.name);
                            //console.log(columnObject);
                            if((functionObj.table==tableObj.name)&&(functionObj.fromcolumn==columnObject.name)){
                                columnObject.elements.push(functionObj);
                                tableObj.isReferenced = true;                                
                            }
                        }
                    }
                }
                resultArray.push(tableObj);
            }
        }
    }
    console.timeEnd('mergeCRTwithAutoPopulate');
    return resultArray;
}