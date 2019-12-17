onmessage = function(e) {
    //console.log('Worker: Message received from main script');
    importScripts("xsdParser.js");
    importScripts("genericFunctions.js");
    importScripts("compareObjects.js");
    //I think I need some relative URL data to get wgat I need at this stage?
    //getAllServicesJSONData();
    var currentReleaseObjects = e.data[0];
    var previousReleaseObjects = e.data[1];
    var url = e.data[2];
    var release = e.data[3];
    //console.log(currentReleaseObjects);
    //console.log(url);
    //console.log(release);
    console.time('allSchemaMacroObjectsFetch');
    var allSchemaMacroObjects = processSchemaData(currentReleaseObjects, previousReleaseObjects);
    console.timeEnd('allSchemaMacroObjectsFetch');
    console.time('compareReleases');
    //console.log(allSchemaMacroObjects);
    var serviceChangesArray = compareReleases(allSchemaMacroObjects);
    console.timeEnd('compareReleases');
    //console.log('Worker: Posting message back to main script');
    //console.log('serviceChangesArray');
    //console.log(serviceChangesArray);
    postMessage(serviceChangesArray);
}



