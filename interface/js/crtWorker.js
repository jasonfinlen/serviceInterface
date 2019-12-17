onmessage = function (r) {
    console.time('crtWorkerTotal');
    importScripts("crtParser.js");
    importScripts("genericFunctions.js");
    //I think I need some relative URL data to get wgat I need at this stage?
    console.time('settingArrayCRTVariables');
    console.time('settingRDATA');
    var rDataArray = r.data;
    console.timeEnd('settingRDATA');
    var rawCRTList = r.data[0];
    var rawMacroAutoPopulate = r.data[1];
    var url = r.data[2];
    var SOList = r.data[3];
    console.timeEnd('settingArrayCRTVariables');
    console.time('callingmergeCRTwithAutoPopulate');
    var crtDataArray = mergeCRTwithAutoPopulate(rawCRTList, rawMacroAutoPopulate);
    console.timeEnd('callingmergeCRTwithAutoPopulate');
    //I should think about merging the services here as well?
    var crtData = {};
    crtData.tables = crtDataArray;
    //so can I merge the xapthlist stuff in here as well to get a service usage?
    //console.log(SOList);
    //console.log(refObject);
    //now loop through each table and find a match first
    console.time('addingServicesToCRT');
    for (var j = 0; j < crtData.tables.length; j++) {
        var tableObj = crtData.tables[j];
        for (var l = 0; l < tableObj.columns.length; l++) {
            var column = tableObj.columns[l];
            for (var m = 0; m < column.elements.length; m++) {
                var element = column.elements[m];
                for (var i = 0; i < SOList.length; i++) {
                    var SO = SOList[i];
                    if ((SO.xPathList != null) &&(SO.xPathList.length > 0)) {
                        for (var k = 0; k < SO.xPathList.length; k++) {
                            var xPathobj = SO.xPathList[k];
                            if(element.element==xPathobj.name){
                                //console.log(xPathList.name);
                                //console.log(element.element);
                                //console.log(SO);
                                //now add this service to the CRT table
                                //I only want the name and key?
                                var newSO = {};
                                newSO.FormattedDisplayName = SO.FormattedDisplayName;
                                newSO.key = SO.key;
                                if(newSO.xPathList!=null){
                                    newSO.xPathList.push(xPathobj);
                                }else{
                                    newSO.xPathList = [xPathobj];
                                }
                                if(tableObj.services!=null){
                                    //console.log(tableObj.services);
                                    var matched=false;
                                    var replaceIndex = -1;
                                    //only push if this key doesnt already exist?
                                    for(var z = 0;z<tableObj.services.length;z++){
                                        //console.log(tableObj.services[z]);
                                        //console.log(SO.key);
                                        if(tableObj.services[z].key==SO.key){
                                            matched=true;
                                            replaceIndex = z;
                                            break;
                                        }
                                    }
                                    if(matched){
                                        //console.log('matched an existing');
                                        //console.log(tableObj.services);
                                        //console.log(newSO);
                                        //tableObj.services[replaceIndex] = newSO;
                                        tableObj.services[replaceIndex].xPathList.push(xPathobj);
                                    }else{
                                        tableObj.services.push(newSO);    
                                    }
                                    
                                }else{
                                    tableObj.services = [newSO];
                                }
                                
                                

                                //console.log(tableObj);
                                //console.log(crtData);
                                //a=dieforbnw;
                                //also push the table object into the services but Im not sure how useful this is at this stage
                                SO.refDataList.push(tableObj);
                            }
                        }
                    }
                 }
             }   
        }
    }
    console.timeEnd('addingServicesToCRT');
    console.timeEnd('crtWorkerTotal');
    postMessage(crtData);
}