/******** Our main function ********/
function buildInfoWidget(buildInfoObj) {
    
    var selectedRelease = getSelectedRelease(buildInfoObj);
    $("#buildInfo").html('<p>Last Updated : ' + selectedRelease.builddate + '</p>');
}
