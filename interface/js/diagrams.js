function initMermaid(){
    mermaid.initialize({
        sequenceDiagram:{
            useMaxWidth  : false
        }
    });
    mermaid.init();
}

function buildDiagramsHTML(diagramList){
    var html = '';
    if((diagramList!=null)&&($.isArray(diagramList))){
        $.each(diagramList, function(index, diagram){
           if((diagram.Title!=null)&&(diagram.Content!=null)){
                mermaid.parseError = function(err,hash){
    				console.log('error:' + err);
    				}
                if(mermaid.parse(diagram.Content)){
                     html+='<div class="card">';
			         html+='<p class="cardtitle">';
				     html+=diagram.Title;
			         html+='</p>';
			         html+='<div class="mermaidHolder">';
				     html+='<div class="mermaid">';
					 html+=diagram.Content;
				     html+='</div>';
			         html+='</div>';
		             html+='</div>';
                }
           }
        });
    }
    return html;
}

function buildCAPMSequenceDiagramsHTML(macroData, uniqueName){
    console.time('buildCAPMSequenceDiagramsHTML');
    //console.log('buildCAPMSequenceDiagramsHTML');
    //console.log(macroData);
    //console.log(uniqueName);
    //only move on if the macroData has names, cats and version
    if((macroData!=null)&&(macroData.ServiceMap!=null)&&(macroData.ServiceMap.ServiceName!=null)&&(macroData.ServiceMap.SchemaVersionNumber!=null)&&(macroData.ServiceMap.Category!=null)){
        var serviceNumber = macroData.ServiceMap.ServiceNumber;
        var serviceName = macroData.ServiceMap.ServiceName;
        var serviceVersion = macroData.ServiceMap.SchemaVersionNumber;
        var serviceCategory = macroData.ServiceMap.Category;
        //no service location available from this object
        var serviceLocation = macroData.ServiceMap.ServiceLocation;
        //console.log(macroData.ServiceMap);
        var consumerURL = compassConsumersURL(serviceNumber, serviceLocation, serviceName + 'Request', serviceVersion, serviceCategory, 'Service', 'e9', '30d');
        var providerURL = compassProvidersURL(serviceNumber, serviceLocation, serviceName + 'Request', serviceVersion, serviceCategory, 'Service', 'e9', '30d');
        consumerURL += '&callback=?';
        providerURL += '&callback=?';
        var allRequests = [];
        allRequests.push($.getJSON(consumerURL));
        allRequests.push($.getJSON(providerURL));
        var requests = $.unique(allRequests);
       	var defer = $.when.apply($, requests);
        defer
          .done(function(){
             buildConsumerProviderDiagrams(serviceNumber, serviceLocation, serviceName, serviceVersion, serviceCategory, arguments, uniqueName);
             console.timeEnd('buildCAPMSequenceDiagramsHTML');
        })
        .fail(function(jqXHR, textStatus, errorThrown){
           console.log('Failed:' + textStatus);
           buildConsumerProviderDiagrams(jqXHR);
           console.timeEnd('buildCAPMSequenceDiagramsHTML');
           //build the accordian anyway?
        }
        );
    }
}

function buildConsumerProviderDiagrams(serviceNumber, serviceLocation, serviceName, serviceVersion, serviceCategory, arguments, uniqueName){
    //console.log(arguments);
    //console.log(arguments[0][0]);
    //console.log(arguments[1][0]);
    var consumerCAPMData = arguments[0][0];
    var providerCAPMData = arguments[1][0];
    //console.log(consumerCAPMData.rows);
    //console.log(providerCAPMData.rows);
    
    //merge the data somehow to draw a diagram?
    var resObj = buildConsumerProviderJSONDataObject(serviceNumber, serviceLocation, serviceName, serviceVersion, serviceCategory, 'xxx', consumerCAPMData,providerCAPMData);
    //console.log(resObj);
    
    var resObj2 = appendMermaidContent(resObj);
    //now I need to draw the mermaid diagram based on this return JSON Data
    //console.log(resObj2);
    var diagramList = [];
    diagramList.push(resObj2.mermaid);
    var mermaidHTML = buildDiagramsHTML(diagramList);
    //console.log('########');
    //console.log(mermaidHTML);
    var tabID = 'tab' + uniqueName;
    var realTimeDiagramsDivID = 'realTimeDiagrams' + uniqueName;
    $("#" + realTimeDiagramsDivID).html(mermaidHTML);
    initMermaid();
}

function appendMermaidContent(consumerProviderObject){
    //console.log(consumerProviderObject);
    var lf = '\n';
    //var lf = '&#xA;';
    var mermaidTitle = 'Real Time Diagram (30days)';
    var mermaidContent = 'sequenceDiagram' + lf;
    var mermaidConsumers = '';
    var mermaidConsumerRelationship = '';
    var mermaidProviders = '';
    var mermaidProvidersRelationship = '';

    //now I just need to create mermaid content based on what I have 
    if((consumerProviderObject!=null)&&(consumerProviderObject.consumerList!=null)&&(consumerProviderObject.consumerList.length>0)){
        $.each(consumerProviderObject.consumerList, function(index, consumerObj){
            //I just need to send a consumer to ESB with no issues!
            //console.log(consumerObj);
            mermaidConsumers+= 'participant ' + consumerObj.consumer + lf;
            mermaidConsumerRelationship+= consumerObj.consumer + '->>ESB: '  + numberWithCommas(consumerObj.hits) + ' hits (' + numberWithCommas(consumerObj.elapsed_nr.toFixed(1))+'ms)'+ lf;
            //mermaidContent+=consumerObj.consumer + '->>ESB: ' + consumerObj.hits + ' hits' + lf;  
            //Alice->>John: Hello John, how are you?
        });            
    }
    if((consumerProviderObject!=null)&&(consumerProviderObject.providerList!=null)&&(consumerProviderObject.providerList.length>0)){
        $.each(consumerProviderObject.providerList, function(index, provider){
            //console.log(provider);
            mermaidProvidersRelationship+= 'ESB->>' + provider.provider + ': ' + numberWithCommas(consumerProviderObject.totalHits) + ' hits' + lf;        
        });            
        
    }
    mermaidContent+= mermaidConsumers + lf;
    mermaidContent+= 'participant ESB' + lf;
    mermaidContent+= mermaidConsumerRelationship + lf;
    mermaidContent+= mermaidProvidersRelationship + lf;
    
    var mermaidObject = {};
    mermaidObject.Content = mermaidContent;
    mermaidObject.Title = mermaidTitle;
    consumerProviderObject.mermaid = mermaidObject;
    return consumerProviderObject;
}

function buildConsumerProviderJSONDataObject(serviceObject){
    var consumerProviderObject = {};
    consumerProviderObject.service = serviceObject;
    //before I do anything I should update stuff first?
    if((serviceObject.consumers!=null)&&(serviceObject.consumers.length>0)&&(serviceObject.providers!=null)&&(serviceObject.providers.length>0)){
        var consumerList = returnArray(serviceObject.consumers);
        var providerList = returnArray(serviceObject.providers);
        var mergedConsumerList = [];
        var newConsumerList = [];
        
        var newProviderList = [];
        var totalHits = 0;
        //before adding this I need to do a quick loop and merge stuff that is Q1 vs Q2?
        $.each(consumerList, function(i, currentConsumerObj){
            currentConsumerObj.consumer = resolveConsumerProviderNames(currentConsumerObj.consumer);
            var mergedCurrentConsumerObj = null;
            var currentName = resolveConsumerProviderNames(currentConsumerObj.consumer).toUpperCase();
                $.each(consumerList, function(k, alternateConsumerObj){
                    var alternateName = resolveConsumerProviderNames(alternateConsumerObj.consumer).toUpperCase();
                    //are these the same except for the one Im currently checking...i=k?
                    if((i!=k)&&(alternateName==currentName)){
                        //console.log(alternateName + '==' + currentName);
                        //console.log(currentConsumerObj);
                        //console.log(alternateConsumerObj);
                        mergedCurrentConsumerObj = mergeConsumers(currentConsumerObj, alternateConsumerObj);
                        //console.log('mergedCurrentConsumerObj');
                        //console.log(mergedCurrentConsumerObj);
                    }
                   
                });
                if(mergedCurrentConsumerObj!=null){
                    //console.log('matched:' + serviceName);
                    //only push if not unique?
                    var doNotAddFlag = false;
                    $.each(mergedConsumerList, function(l, con){
                        if(con.consumer==mergedCurrentConsumerObj.consumer){
                            doNotAddFlag = true;
                            return false;
                        }
                    });
                    if(doNotAddFlag==false){
                        mergedConsumerList.push(mergedCurrentConsumerObj);    
                    }
                }else{
                    mergedConsumerList.push(currentConsumerObj);
                }
        });
        
        $.each(mergedConsumerList, function(index, consumerObj){
            //console.log('consumerObj=');
            //console.log(consumerObj);
            if((consumerObj.consumer!=null)&&(consumerObj.consumer!='')){
                //build a new consumerObject 
                var newConsumerObj = {};
                newConsumerObj.consumer = resolveConsumerProviderNames(consumerObj.consumer);
                newConsumerObj.hits = consumerObj.hits;
                totalHits += consumerObj.hits;
                newConsumerObj.p95 = consumerObj.p95;
                newConsumerObj.elapsed_nr = consumerObj.elapsed_nr;
                newConsumerList.push(newConsumerObj);
            }
        });
        $.each(providerList, function(index, providerObj){
            providerObj.name = resolveConsumerProviderNames(providerObj.name);
            if((providerObj.name!=null)&&(providerObj.name.toLowerCase().indexOf('dp:provider:')>-1)){
                var provFullNameArray = providerObj.name.split(':', 3);
                var providerName = resolveConsumerProviderNames(provFullNameArray[2]);
                //console.log(providerName);
                var newProviderObj = providerObj;
                newProviderObj.provider = providerName;
                newProviderList.push(newProviderObj);
            }
        });
        consumerProviderObject.consumerList = newConsumerList;
        //consumerProviderObject.providerList = newProviderList;
        consumerProviderObject.providerList = providerList;
        consumerProviderObject.totalHits = totalHits;
    }
    return consumerProviderObject;
}

function groupBy(items,propertyName)
{
    var result = [];
    $.each(items, function(index, item) {
       if ($.inArray(item[propertyName], result)==-1) {
          result.push(item[propertyName]);
       }
    });
    return result;
}

function resolveConsumerProviderNames(inName){
    var indexOfReplacementArray = ['LISA::LISA', 'IMCAAP::CHEALTH', 'Saml::SAML', 'IMRPSPIMMI.CVOR::CVOR', 'appdetails::ELODGEMENT', 'IMMI ESC ::SIEBEL', 'IMRPSPBRDR.RPS::RPS', 'CLIENTSEARCH::CSP', 'SV047_RETRIEVEIDENTITYDOCUMENT::UNKNOWN', 'SV150_RETRIEVEFACIALIMAGE::UNKNOWN', 'SFPATTACHMENT::SFPATTACHMENT'];
    indexOfReplacementArray.push('SV325::UNKNOWN');
    indexOfReplacementArray.push('SV021::UNKNOWN');
    indexOfReplacementArray.push('SV001::UNKNOWN');
    indexOfReplacementArray.push('SV004::UNKNOWN');
    indexOfReplacementArray.push('IMBIOP::BAMS');
    indexOfReplacementArray.push('SV232::UNKNOWN');
    indexOfReplacementArray.push('SV236::UNKNOWN');
    indexOfReplacementArray.push('C1JMI::UNKNOWN');
    indexOfReplacementArray.push('IMOAP::OLA');
    indexOfReplacementArray.push('TRAVELLER::TPC');
    indexOfReplacementArray.push('TRVL::TPC');
    indexOfReplacementArray.push('APIGW::WSGW');
    indexOfReplacementArray.push('IMCWMP::WMAN');
    indexOfReplacementArray.push('USERNAME:NT AUTHORITYIUSR::UNKNOWN');
    indexOfReplacementArray.push('ABTC::ABTC');
    indexOfReplacementArray.push('ATTACHMENT_INTERNAL::SFPATTACHMENT');
	indexOfReplacementArray.push('OA::OLA');
    indexOfReplacementArray.push('ELODGEMENT::ELP');
	indexOfReplacementArray.push('IMSOAP::DESB');
	indexOfReplacementArray.push('DHUBMERGE::DHUB');

    //"C1JMI"
    
    
    var resultName = inName.replace('01:','').replace('02:','');
    $.each(indexOfReplacementArray, function(index, searchAndReplace){
        //these are keyed pairs
        var searchAndReplaceArray = searchAndReplace.split('::',2);
        var searchString = searchAndReplaceArray[0];
        var replaceString = searchAndReplaceArray[1];
        if(resultName.indexOf(searchString)!=-1){
            resultName = replaceString;
        }
    });
    return resultName.toUpperCase();    
}

function mergeConsumers(consumer1, consumer2){
    //if not nulls then do....
    if((consumer1!=null)&&(consumer2!=null)){
        var newConsumerObj = {};
        newConsumerObj.consumer = resolveConsumerProviderNames(consumer1.consumer); 
        newConsumerObj.name = consumer1.name;
        newConsumerObj.hits = undefinedToNumber(consumer1.hits) + undefinedToNumber(consumer2.hits); 
        newConsumerObj.p95 = (undefinedToNumber(consumer1.p95) + undefinedToNumber(consumer2.p95))/2;
        newConsumerObj.elapsed_nr = (undefinedToNumber(consumer1.elapsed_nr) + undefinedToNumber(consumer2.elapsed_nr))/2;
        return newConsumerObj;
    }else if (consumer1!=null){
        return consumer1;
    }else if (consumer2!=null){
        return consumer2;
    }else{
        return null;
    }
}

