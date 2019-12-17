d3.chart = d3.chart || {};

d3.chart.dependencyWheel = function(options) {

  var width = 1000;
  var margin = 150;
  var padding = 0.02;

  function chart(selection) {
    selection.each(function(data) {
        //console.log('data');
        //console.log(data);
      var matrix = data.matrix;
      var packageNames = data.packageNames;
      var packageObjects = data.systemMatrixData;
      var radius = width / 2 - margin;

      // create the layout
      var chord = d3.layout.chord()
        .padding(padding)
        .sortSubgroups(d3.descending);

      // Select the svg element, if it exists.
      var svg = d3.select(this).selectAll("svg").data([data]);

      // Otherwise, create the skeletal chart.
      var gEnter = svg.enter().append("svg:svg")
        .attr("width", width)
        .attr("height", width)
        .attr("class", "dependencyWheel")
        .append("g")
        .attr("transform", "translate(" + (width / 2) + "," + (width / 2) + ")");

      var arc = d3.svg.arc()
        .innerRadius(radius)
        .outerRadius(radius + 20);
        
        
      var fill = function(d) {
        if (d.index === 0) return '#ccc';
        //return "hsl(" + parseInt(((packageNames[d.index][0].charCodeAt() - 97) / 26) * 360, 10) + ",90%,70%)";
        //return "hsl(" + parseInt(((packageNames[d.index][0].charCodeAt() - 97) / 26) * 360, 10) + ",50%,50%)";
        return getRandomColor();
      };
      
      // Returns an event handler for fading a given chord group.
      var click = function(opacity) {
        return function(g, i) {
            //console.log(data);
            //console.log('data.systemType');
            //console.log(data.systemType);
            //Must be a single type and should be a system not a service?
            if((data.systemType=='SINGLE')&&(i==0)){
                //build the original dep wheel
                buildAllSystemMatrix(packageNames[i],packageObjects[i],data);
            }else if((data.systemType=='SINGLE')&&(i!=0)){
                //console.log('Launch Macro:' + packageNames[i]);
                //unique name and launch it...
                launchMacroFromDependencyWheel(packageNames[i],packageObjects[i],data);
            }else{
                buildSingleSystemMatrix(packageNames[i],packageObjects[i],data);    
            }
        };
      };  
      var fade = function(opacity) {
        return function(g, i) {
        if(opacity==0){
            //mouse over
            //console.log(packageNames);
            //console.log(packageNames[i]);
            buildDependencyWheelTable(packageNames[i],packageObjects[i],data);
        }else{
            buildDependencyWheelTable('ALL',packageObjects[i],data);
        }
        
          svg.selectAll(".chord")
              .filter(function(d) {
                return d.source.index != i && d.target.index != i;
              })
            .transition()
              .style("opacity", opacity);
          var groups = [];
          svg.selectAll(".chord")
              .filter(function(d) {
                if (d.source.index == i) {
                  groups.push(d.target.index);
                }
                if (d.target.index == i) {
                  groups.push(d.source.index);
                }
              });
          groups.push(i);
          var length = groups.length;
          //console.log('mouse over');
          //console.log(groups);
          //console.log(groups[0]);
          //console.log(packageNames[(groups[0])]);                    

          svg.selectAll('.group')
              .filter(function(d) {
                for (var i = 0; i < length; i++) {
                  if(groups[i] == d.index) return false;
                }
                return true;
              })
              .transition()
                .style("opacity", opacity);
        };
      };

      chord.matrix(matrix);

      var rootGroup = chord.groups()[0];
      var rotation = - (rootGroup.endAngle - rootGroup.startAngle) / 2 * (180 / Math.PI);

      var g = gEnter.selectAll("g.group")
        .data(chord.groups)
      .enter().append("svg:g")
        .attr("class", "group")
        .attr("transform", function(d) {
          return "rotate(" + rotation + ")";
        });

      g.append("svg:path")
        .style("fill", fill)
        .style("stroke", fill)
        .attr("d", arc)
        .on("mouseover", fade(0))
        .on("click", click(0))
        .on("mouseout", fade(1));

      g.append("svg:text")
        .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
            "translate(" + (radius + 26) + ")" +
            (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .text(function(d) { return packageNames[d.index]; });

      gEnter.selectAll("path.chord")
          .data(chord.chords)
        .enter().append("svg:path")
          .attr("class", "chord")
          .style("stroke", function(d) { return d3.rgb(fill(d.source)).darker(); })
          .style("fill", function(d) { return fill(d.source); })
          .attr("d", d3.svg.chord().radius(radius))
          .attr("transform", function(d) {
            return "rotate(" + rotation + ")";
          })
          .style("opacity", 1);
    });
  }

  chart.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    return chart;
  };

  chart.margin = function(value) {
    if (!arguments.length) return margin;
    margin = value;
    return chart;
  };

  chart.padding = function(value) {
    if (!arguments.length) return padding;
    padding = value;
    return chart;
  };

  return chart;
};
function getDependencyWheelData(){
    showLoadingBlock();
    console.time('getDependencyWheelData');
    //go get the dep wheel stuff that could take some time to load...
    
    var jsonLinkRel = routerURL + '/getDependencyWheelData' + '?'+ getCacheBuster();
    //var jsonLinkRel = routerURL + '/getServiceModels' + '?releaseName=' + releaseName + '&serviceModelName='+ releaseObj.name+'&'+ getCacheBuster();
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            
            console.timeEnd('getDependencyWheelData');
            console.time('wheelOfCheese');
            drawDependencyWheelFromMatrixData(data);
            console.timeEnd('wheelOfCheese');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest) {
            hideLoadingBlock(-1);
            console.timeEnd('getDependencyWheelData');
            console.log('Error in respone');
            console.log(XMLHttpRequest);
        }
    });

    
    
}

function getServiceSharedUsageJSONData(){
    showLoadingBlock();
    console.time('buildAllSystemsSharedUsage');
    getAllConsumerProviderForAllServices('SHARED_USAGE', globalSelectedRelease);
    console.timeEnd('buildAllSystemsSharedUsage');
}


function getAllConsumerProviderForAllServices(usageContext, releaseObject){
    console.time('getAllConsumerProviderForAllServices');
    
    showLoadingBlock();
   //console.log('getAllConsumerProviderForAllServices');
    //load all services?
    var cacheBuster = getCacheBuster();
    //make these calls into the new router?
    var serviceModels = releaseObject.serviceModels;
    var allRequests =[];
    for(var i = 0;i<serviceModels.length;i++){
        var jsonLinkRel = serviceModels[i].callBackURL + '&'+ getCacheBuster();
        allRequests.push($.getJSON(jsonLinkRel));
    }
    var defer = $.when.apply($, allRequests);
    defer.done(function () {
        console.timeEnd('getAllConsumerProviderForAllServices');
        //update this to just call no matter if success or fail?
        //once this is returned I can fire a web worker?
        getAllConsumerProviderForAllServicesDefer(arguments[0][0], arguments[1][0], arguments[2][0], usageContext, releaseObject);
        
    }).fail(function (jqXHR, textStatus, errorThrown) {
        textStatus = textStatus.replace('error', 'Error');
        console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
        console.timeEnd('getAllConsumerProviderForAllServices');
        hideLoadingBlock(-1);
    });
}

function getAllConsumerProviderForAllServicesDefer(enterpriseModels, integrationModels, providerModels, usageContext, releaseObject){
    showLoadingBlock();
   //console.log('getAllConsumerProviderForAllServicesDefer');
    console.time('getAllConsumerProviderForAllServicesDefer');
   //console.log(enterpriseModels);
    console.time('wheelofcheese');
    var enterpriseServiceList = enterpriseModels.models;
    var integrationServiceList = integrationModels.models;
    var providerServiceList = providerModels.models;
    
   //console.log(enterpriseServiceList);
    
    if((enterpriseServiceList!=null)){
        //loop though each and create
        var allRequests = [];
        //for now just get the entry point which whould be the first of the schema lists?
        for (var i = 0; i < enterpriseServiceList.length; i++) {
            var Service = enterpriseServiceList[i];
                if(Service.ServiceNumber!='CORE'){
                    var consumerURL = compassConsumersURLFromServiceObj(Service);
                    var providerURL = compassProvidersURLFromServiceObj(Service);
                    consumerURL += '&callback=?';
                    providerURL += '&callback=?';
                    allRequests.push($.getJSON(consumerURL));
                    allRequests.push($.getJSON(providerURL));
                    //what of the service is new or changed versions?
                }
        }
        //console.log(allRequests);
        var requests = $.unique(allRequests);
           var defer = $.when.apply($, requests);
           defer
           .done(function(){
              //console.log(arguments);
               
               processAllConsumerProviderForAllServices(arguments, usageContext, enterpriseServiceList);
               console.timeEnd('getAllConsumerProviderForAllServicesDefer');
               console.timeEnd('wheelofcheese');
            })
            .fail(function(jqXHR, textStatus, errorThrown){
               console.log('getAllConsumerProviderForAllServicesDefer!', jqXHR, textStatus, errorThrown);
               console.timeEnd('getAllConsumerProviderForAllServicesDefer');
               hideLoadingBlock(-1);
            }
           );
    }
}

function processAllConsumerProviderForAllServices(deferArguments, usageContext, extServiceList){
    showLoadingBlock();
    console.time('processAllConsumerProviderForAllServices');
    //arguments are in pairs of consumer first and then provider
    var capmDataObject = {};
    var serviceList = [];
    var totalHitCount = 0;
    var consumerList = [];
    var providerList = [];
    var systemList = [];
    
    for (i = 0;i<deferArguments.length;i=i+2) {
        var consumerArg = deferArguments[i];
        var providerArg = deferArguments[i+1];
        var capmConsumerData = consumerArg[0];
        var capmProviderData = providerArg[0];
        //just because there is no CAPM data doesnt mean I can ignore it?
        if((capmConsumerData!=null)&&(capmProviderData!=null)){
        //if((capmConsumerData!=null)&&(capmConsumerData.rows!=null)&&(capmConsumerData.rows.length>0)&&(capmProviderData!=null)&&(capmProviderData.rows!=null)&&(capmProviderData.rows.length>0)){
            //Need to verify the consumerData matches the provider data and there is no way of doing that...but I did get the key so I can use that on both?
            var consumerCallBackkey = capmConsumerData.attributes.key;
            var providerCallBackkey = capmProviderData.attributes.key;
            var so = getServiceObjectByKey(consumerCallBackkey, extServiceList);
            if((capmConsumerData.rows==null)||(capmConsumerData.rows.length==0)){
                var fakeCAPMReturnConsumer = {};
                var fakeConsumer = {};
                var fakeColumns = [];
                var attributes = {};
                attributes.key = consumerCallBackkey;
                var fakeRows = [];
                fakeColumns.push("name");
                fakeColumns.push("consumer");
                fakeColumns.push("hits");
                fakeColumns.push("p95");
                fakeColumns.push("elapsed_nr");
                fakeConsumer.consumer = "NONE";
                fakeConsumer.elapsed_nr = 1;
                fakeConsumer.hits = 1000;
                fakeConsumer.p95 = 1;
                fakeConsumer.name = so.ServiceName;
                fakeRows.push(fakeConsumer);
                fakeCAPMReturnConsumer.attributes = attributes;
                fakeCAPMReturnConsumer.columns = fakeColumns;
                fakeCAPMReturnConsumer.rows = fakeRows;
                capmConsumerData = fakeCAPMReturnConsumer;
            }else{
                //console.log(capmConsumerData);
            }
            var consumerRows = returnArray(capmConsumerData.rows);
            if((capmProviderData.rows==null)||(capmProviderData.rows.length==0)){
                var fakeCAPMReturnProvider = {};
                var fakeProvider = {};
                var fakeColumns = [];
                var attributes = {};
                attributes.key = consumerCallBackkey;
                var fakeRows = [];
                fakeColumns.push("id");
                fakeColumns.push("classanme");
                fakeColumns.push("name");
                fakeColumns.push("env");
                fakeColumns.push("domain");
                fakeColumns.push("childCount");
                fakeColumns.push("lastUpdate");
                fakeColumns.push("ms");
                fakeProvider.childCount = 0; 
                fakeProvider.classname = "extendedprofilepoint";
                fakeProvider.domain = "Production"
                fakeProvider.env = "e9";
                fakeProvider.id = 1
                fakeProvider.lastUpdate="0"
                fakeProvider.ms = 1;
                fakeProvider.name = "dp:Provider:NONE"
                fakeRows.push(fakeProvider);
                fakeCAPMReturnProvider.attributes = attributes;
                fakeCAPMReturnProvider.columns = fakeColumns;
                fakeCAPMReturnProvider.rows = fakeRows;
                capmProviderData = fakeCAPMReturnProvider;
            }else{
                
            }
            var providerRows = returnArray(capmProviderData.rows);
            if(so.IsNew){
                //I have to deal with this differently
                //a=newfound;
            }
            if(so.VersionChange){
                //I have to deal with this differently
                //a=newversionfound;
            }
            
            so.consumers = consumerRows;
            so.providers = providerRows;
            if(so==null){
                console.log('No match on the SO by key : ' + consumerCallBackkey); 
                a=dieinaditch;
            }
            so.consumers = [];
            so.providers = [];
            var so = cleanRawCAPMConsumerAndProviderData(capmConsumerData, capmProviderData, so, 'e9');
            //a=firstcallisconsumernone;
            var serviceObject = buildConsumerProviderJSONDataObject(so);
            
            totalHitCount+=serviceObject.totalHits;
            serviceList.push(serviceObject);
            //for each consumer?
            $.each(serviceObject.consumerList, function(index, consumer){
                if(consumerList.indexOf(consumer.consumer) === -1){
                    consumerList.push(consumer.consumer);
                } 
                if(systemList.indexOf(consumer.consumer) === -1){
                    systemList.push(consumer.consumer);
                } 
            });
            $.each(serviceObject.providerList, function(index, provider){
                if(providerList.indexOf(provider.provider) === -1){
                    providerList.push(provider.provider);
                }
                if(systemList.indexOf(provider.provider) === -1){
                    systemList.push(provider.provider);
                }
            });
       }
       else{
            //console.log('Error:');
            //console.log(capmData);
            
        }            
    }
    
    serviceList.totalHitCount = totalHitCount;
    serviceList.consumerList = consumerList;
    serviceList.providerList = providerList;
    serviceList.systemList = systemList;
    console.timeEnd('processAllConsumerProviderForAllServices');
    
    
    //now I can split this data several ways....
    var systemListData = createSystemList(serviceList);
    var systemMatrixData = formatSystemListToMatrix(systemListData);
    var systemDependencyWheelData = formatSystemMatrixToDependencyWheelData(systemMatrixData, systemListData, 'ALL');
    //console.log(systemDependencyWheelData);
    //var singleSystemMatrixData = formatSystemListToSingleMatrix('ICSE', systemListData);
    //var singleSystemMatrixData = formatSystemListToSingleMatrix('DHUB', systemListData);
    //console.log(systemMatrixData);
    //drawChordFromMatrixData(systemMatrixData);
    //console.log(systemDependencyWheelData);
    if(usageContext=='DEPENDENCY_WHEEL'){
        drawDependencyWheelFromMatrixData(systemDependencyWheelData);    
    }else if (usageContext=='SHARED_USAGE'){
        buildSharedUsageAccordion(systemListData);
    }else if (usageContext=='CONSUMER_PROVIDER'){
        buildServiceProviderConsumerListAccordion(systemListData);
        buildSystemChangeListAccordion(systemListData);
    }else{
        console.log('No usage context recognised:' + usageContext); 
    }
    //now hide the dialog
    hideLoadingBlock(-1);
    
}
function buildSingleSystemMatrix(systemName,systemObj,data){
    //console.log(systemName);
    var systemListData = data.systemListData;
    //console.log(systemListData);
    var singleSystemMatrixData = formatSystemListToSingleMatrix(systemName, systemListData);
    var singleSystemDependencyWheelData = formatSystemMatrixToDependencyWheelData(singleSystemMatrixData, systemListData, 'SINGLE');
    //console.log(singleSystemDependencyWheelData);
    drawDependencyWheelFromMatrixData(singleSystemDependencyWheelData);
}
function buildAllSystemMatrix(systemName,systemObj,data){
    //console.log(systemName);
    var systemListData = data.systemListData;
    var systemMatrixData = formatSystemListToMatrix(systemListData);
    var systemDependencyWheelData = formatSystemMatrixToDependencyWheelData(systemMatrixData, systemListData, 'ALL');
    drawDependencyWheelFromMatrixData(systemDependencyWheelData);
}



function buildDependencyWheelTable(systemName, systemObj, systemDependencyWheelData){
    
    var htmlmsg = '<h2>' + systemName + '</h2>';
    var htmlcon = '';
    var htmlprov = '';
    if(systemName=='ALL'){
        //not sure what to do yet but might just leave the previous table up there?    
    }else{
    
        //build a table based on systemName
        if((systemDependencyWheelData!=null)&&(systemDependencyWheelData.systemListData!=null)&&(systemDependencyWheelData.systemListData.systemList!=null)){
            if((systemDependencyWheelData.systemType=='SINGLE')&&(systemDependencyWheelData.packageNames[0]!=systemName)){
                //console.log('build a different table?');
                //console.log(systemObj);
                //build body here
                $.each(systemDependencyWheelData.systemListData.serviceList, function(index, serviceObj){
                    //this now needs to be based on a match with the object?
                    
                    if(serviceObj.service.key==systemObj.key){
                        //console.log(serviceObj);
                        $.each(serviceObj.consumerList, function(l, consumer){
                            htmlcon += '<tr>';
                            htmlcon += '<td>' + consumer.consumer + '</td>';
                            htmlcon += '<td>' + numberWithCommas(consumer.hits) + '</td>';
                            htmlcon += '<td>' + formatMilliseconds(consumer.elapsed_nr) + '</td>';
                            htmlcon += '<td>' + formatMilliseconds(consumer.p95) + '</td>';
                            htmlcon += '</tr>';     
                        });
                        if(serviceObj.consumerList.length>0){
                            htmlmsg += '<table class="normalTable dependencyWheelTable">';
                            htmlmsg += '<thead>';
                            htmlmsg += '<tr><th colspan="4">Consumers</th></tr>';
                            htmlmsg += '<tr><th>System</th><th>Hits</th><th>Average</th><th>95%</th></tr>';
                            htmlmsg += '</thead>';
                            htmlmsg += '<tbody>';
                            htmlmsg += htmlcon;
                            htmlmsg += '</tbody>';
                            htmlmsg += '</table>';
                        }
                        $.each(serviceObj.providerList, function(l, provider){
                            htmlprov += '<tr>';
                            htmlprov += '<td>' + provider.provider + '</td>';
                            htmlprov += '<td>' + numberWithCommas(serviceObj.totalHits) + '</td>';
                            htmlprov += '</tr>'; 
                        });
                        if(serviceObj.providerList.length>0){
                            htmlmsg += '<table class="normalTable dependencyWheelTable">';
                            htmlmsg += '<thead>';
                            htmlmsg += '<tr><th colspan="2">Providers</th></tr>';
                            htmlmsg += '<tr><th>System</th><th>Hits</th></tr>';
                            htmlmsg += '</thead>';
                            htmlmsg += '<tbody>';
                            
                            htmlmsg += htmlprov;
                            htmlmsg += '</tbody>';
                            htmlmsg += '</table>';
                        }
                    }
                });
                
            }else{
                htmlmsg += '<table class="normalTable dependencyWheelTable">';
                htmlmsg += '<thead><tr><th>Number</th><th>Name</th><th>Version</th></tr></thead>';
                htmlmsg += '<tbody>';
                //from here I need to find some data to draw up
                $.each(systemDependencyWheelData.systemListData.systemList, function(index, systemObj){
                    if(systemObj.systemName==systemName){
                        if(systemObj.consumerFlag){
                            htmlmsg += '<tr><th colspan="3">Consumes</th></tr>';    
                        }
                        $.each(systemObj.consumerServiceList, function(k, serviceObj){
                            htmlmsg += '<tr>';
                            htmlmsg += '<td>' + serviceObj.service.ServiceNumber + '</td>';
                            htmlmsg += '<td>' + serviceObj.service.FormattedServiceName + '</td>';
                            htmlmsg += '<td>' + serviceObj.service.ServiceVersion + '</td>';
                            htmlmsg += '</tr>'; 
                        });
                        if(systemObj.providerFlag){
                            htmlmsg += '<tr><th colspan="3">Provides</th></tr>';    
                        }
                        
                        $.each(systemObj.providerServiceList, function(l, serviceObj){
                            htmlmsg += '<tr>';
                            htmlmsg += '<td>' + serviceObj.service.ServiceNumber + '</td>';
                            htmlmsg += '<td>' + serviceObj.service.FormattedServiceName + '</td>';
                            htmlmsg += '<td>' + serviceObj.service.ServiceVersion + '</td>';
                            htmlmsg += '</tr>'; 
                        });
                    }
                    
                });
                htmlmsg += '</tbody>';
                htmlmsg += '</table>';
            }
            
        }else{
            htmlmsg += '<p>Error in loading System Data.</p>';
        }
        $("#dependencyWheelTable").html(htmlmsg);
    }
    
}

function formatSystemMatrixToDependencyWheelData(systemMatrixData,systemListData,systemType){
//console.log(systemMatrixData);
//console.log(systemListData);
var systemDependencyWheelData = {};
    var matrixDataArray = []; 
    var packageNamesObject = {};
    var matrixServiceLists = [];
    //console.log(systemMatrixData);
    
    
    $.each(systemMatrixData, function(index, system){
        //console.log(system)
        matrixDataArray.push(system.matrix);
        packageNamesObject[index] = system.name;
    });
    
    systemDependencyWheelData.matrix=matrixDataArray;
    systemDependencyWheelData.packageNames=packageNamesObject;
    systemDependencyWheelData.systemListData=systemListData;
    systemDependencyWheelData.systemType=systemType;
    systemDependencyWheelData.systemMatrixData=systemMatrixData;
    
    //console.log('systemDependencyWheelData');
    //console.log(systemDependencyWheelData);
    return systemDependencyWheelData;
}

function drawDependencyWheelFromMatrixData(matrixData) {
    if(matrixData.systemMatrixData.length>0){
        var id = 'dependencyWheelDiagram';
        $('#' + id).html('');
        var systemChartchart = d3.chart.dependencyWheel();
        d3.select('#' + id).datum(matrixData).call(chart);
    }
}

function drawChordFromMatrixData(matrixData) {
    var id = 'dependencyWheelDiagram';
    $('#' + id).html('');
    createChord(matrixData, id);
}

function formatSystemListToSingleMatrix(inSystemName, systemListData){
    console.time('formatSystemListToSingleMatrix');
    //console.log(systemListData);
    var systemMatrix = [];
    $.each(systemListData.systemList, function(index, systemObj){
        if(inSystemName==systemObj.systemName){
            //console.log(systemObj);
            //console.log(systemObj.consumerServiceList);
            //console.log(systemObj.providerServiceList);
            //loop through every service and make that a node?
            var systemMatrixObj = {};
            systemMatrixObj.name = inSystemName;
            systemMatrixObj.color = getRandomColor();
            systemMatrix.push(systemMatrixObj);
            var totalHits = 0;
            $.each(systemObj.consumerServiceList, function(index, consumingService){
                var consumerMatrixObj = {};
                consumerMatrixObj.name='Consumes : ' + consumingService.service.ServiceNumber;
                //consumerMatrixObj.name=consumingService.serviceNumber;
                consumerMatrixObj.serviceNumber=consumingService.service.ServiceNumber;
                consumerMatrixObj.serviceName=consumingService.service.ServiceName;
                consumerMatrixObj.key=consumingService.service.key;
                consumerMatrixObj.color = getRandomColor();
                consumerMatrixObj.totalHits = consumingService.totalHits;
                totalHits+=consumingService.totalHits;
                consumerMatrixObj.type = 'consumer';
                //console.log(consumingService);
                systemMatrix.push(consumerMatrixObj);
                
            });
            $.each(systemObj.providerServiceList, function(index, providerService){
                var providerMatrixObj = {};
                providerMatrixObj.name='Provides : ' + providerService.service.ServiceNumber;
                providerMatrixObj.serviceNumber=providerService.service.ServiceNumber;
                providerMatrixObj.serviceName=providerService.service.ServiceName;
                providerMatrixObj.key=providerService.service.key;
                providerMatrixObj.color = getRandomColor();
                providerMatrixObj.totalHits = providerService.totalHits;
                totalHits+=providerService.totalHits;
                providerMatrixObj.type = 'provider';
                //console.log(providerService);
                systemMatrix.push(providerMatrixObj);
            });
            systemMatrix[0].totalHits = totalHits;
            
        }
    });
    
    
    //now loop through this matrix and add the arrays of relationships
    //console.log(systemMatrix);
    //console.log(systemMatrix[0]);
    //console.log(systemMatrix[1]);
    
    $.each(systemMatrix, function(i, system){
        var matrixArray = [];
        //now I need to loop again
        $.each(systemMatrix, function(k, subsystem){
            if((i==0)&&(k==0)){
                matrixArray.push(0);
            }else if(i==0){
                matrixArray.push(system.totalHits/100);
            }else if(k==0){
                matrixArray.push(system.totalHits);
            }else{
                matrixArray.push(0);
            }
        });
        system.matrix = matrixArray; 
    });
    //console.log(systemMatrix);
    console.timeEnd('formatSystemListToSingleMatrix');
    return systemMatrix;
} 
 
function formatSystemListToMatrix(systemListData){
    console.time('formatSystemListToMatrix');
    systemMatrix = [];
    $.each(systemListData.systemList, function(index, systemObj){
        //now push the name?
        var systemMatrixObj = {};
        systemMatrixObj.name = systemObj.systemName;
        systemMatrixObj.color = getRandomColor();
        //color
        //matrix array
        var matrixArray = [];
        //so now I have this system I need to get every system that it uses?
        //console.log(systemObj);
        outboundWeight = systemObj.consumerServiceList.length;
        inboundWeight = systemObj.providerServiceList.length;
        var consumerUseList = [];
        $.each(systemObj.consumerServiceList, function(l,serviceObj){
            //console.log(serviceObj);
            $.each(serviceObj.providerList, function(k,provider){
                if(provider.provider!=systemObj.systemName){
                    consumerUseList.push(provider.provider);
                }
            });
            $.each(serviceObj.consumerList, function(k,consumer){
                if(consumer.consumer!=systemObj.systemName){
                    consumerUseList.push(consumer.consumer);
                }
            });
        });
        var providerUseList = [];
        $.each(systemObj.providerServiceList, function(l,serviceObj){
            $.each(serviceObj.providerList, function(k,provider){
                if(provider.provider!=systemObj.systemName){
                    consumerUseList.push(provider.provider);
                }
            });
            $.each(serviceObj.consumerList, function(k,consumer){
                if(consumer.consumer!=systemObj.systemName){
                    consumerUseList.push(consumer.consumer);
                }
            });

        });
        //now I have a list of everything it connects to?
        //console.log(consumerUseList);
        //console.log(providerUseList);
        //now I need to loop through these against my original list to build the string of connects?
        var mouseHoverText = '';
        $.each(systemListData.systemList, function(h, systemObjUse){
            if(systemObjUse.systemName!=systemObj.systemName){
                if(consumerUseList.indexOf(systemObjUse.systemName)>-1){
                    //this means its connected to this system
                    mouseHoverText+=systemObjUse.systemName + '\n';
                    matrixArray.push(1);
                }else{
                    matrixArray.push(0);
                }
            }else{
                matrixArray.push(0);
            }
            
        });
        systemMatrixObj.mouseHover = mouseHoverText;
        systemMatrixObj.matrix = matrixArray;
        
        systemMatrix.push(systemMatrixObj);
    });
    console.timeEnd('formatSystemListToMatrix');
    return systemMatrix;
}




function createSystemList(serviceList){
    console.time('createSystemList');
    //console.log(serviceList);
    //console.log(serviceList.systemList);
    var system2ServiceObj = {};
    var systemList = [];
    
    var systemProviderList = [];
    //Loop through my list of systems and find stuff that uses it?    
    $.each(serviceList.systemList, function(index, systemName){
        //console.log(systemName);
        var systemObject = {};
        systemObject.consumerFlag = false;
        systemObject.providerFlag = false;
        systemObject.systemName = systemName;
        var consumerServiceList = [];
        var providerServiceList = [];
        var totalConsumerHits = 0;
        //now find services to put under this?
        $.each(serviceList, function(k, serviceObj){
            var serviceName = serviceObj.serviceName;
            //now loop though each consumer looking for this name?
            $.each(serviceObj.consumerList, function(l, consumer){
                var consumerName = consumer.consumer;
                var consumerHits = consumer.hits;
                if(consumerName==systemName){
                    //its a match
                    systemObject.consumerFlag = true;
                    totalConsumerHits = totalConsumerHits + consumerHits;
                    //console.log('consumer Match');
                    consumerServiceList.push(serviceObj);
                }
            });
            systemObject.totalConsumerHits = totalConsumerHits;
            systemObject.consumerServiceList = consumerServiceList;
            $.each(serviceObj.providerList, function(l, provider){
                var providerName = provider.provider;
                if(providerName==systemName){
                    //its a match
                    systemObject.providerFlag = true;
                    //console.log('provider Match');
                    providerServiceList.push(serviceObj);
                }
            });
        });
        systemObject.providerServiceList = providerServiceList;
        systemList.push(systemObject);
        
    });
    system2ServiceObj.systemList = systemList;
    //maintaining the rogonal servicelist in this object
    system2ServiceObj.serviceList = serviceList;
    //console.log(system2ServiceObj.systemList);
    console.timeEnd('createSystemList');
    return system2ServiceObj;
}
function launchMacroFromDependencyWheel(serviceName,clickedServiceObj,systemDependencyWheelData){
console.log('clickedServiceObj');
console.log(clickedServiceObj);
newMacroTab(clickedServiceObj.key);

}

function drawit() {
    var id = 'systemChord';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    $('#' + contentID).html('');
    d3.json("../../serviceRepository/data/chordData.json", function (systems) {
        //console.log(systems);
        createChord(systems, contentID);
    });
    //how about I ue and ajax call?
    $('#' + headerID).text('System Chord Diagram');
}

