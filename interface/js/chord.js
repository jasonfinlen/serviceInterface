function buildit() {
    var id = 'systemChord';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    $('#' + contentID).html('');
    d3.json("data/chordData.json", function (systems) {
        console.log(systems);
        createChord(systems, contentID);
    });
    //how about I ue and ajax call?
    $('#' + headerID).text('System Chord Diagram');
}

function createChord(systems, chordDivID) {
    var width = 900,
    height = 900,
    outerRadius = Math.min(width, height) / 2 - 10,
    innerRadius = outerRadius - 24;
    var formatPercent = d3.format(".1%");
    var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    var layout = d3.layout.chord().padding(.04).sortSubgroups(d3.descending).sortChords(d3.ascending);
    var path = d3.svg.chord().radius(innerRadius);
    var svg = d3.select("#"+ chordDivID).append("svg").attr("width", width).attr("height", height).append("g").attr("id", "circle").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    svg.append("circle").attr("r", outerRadius);
    //format the data to what they want which is a simple array of numbers
    var matrix =[];
    $.each(systems, function (index, item) {
        //get the matrix and push it into new matrix
        //console.log(item.matrix);
        matrix.push(item.matrix);
    });
    layout.matrix(matrix);
    // Add a group per neighborhood.
    var group = svg.selectAll(".group").data(layout.groups).enter().append("g").attr("class", "group").on("mouseover", mouseover);
    // Add a mouseover title.
    group.append("title").text(function (d, i) {
        //console.log(d);
        //console.log(i);
        return systems[i].name + ": " + Math.round(d.value) + "";
    });
    // Add the group arc.
    var groupPath = group.append("path").attr("id", function (d, i) {
        return "group" + i;
    }).attr("d", arc).style("fill", function (d, i) {
        return systems[i].color;
    });
    // Add a text label.
    var groupText = group.append("text").attr("x", 6).attr("dy", 15);
    groupText.append("textPath").attr("xlink:href", function (d, i) {
        return "#group" + i;
    }).text(function (d, i) {
        return systems[i].name;
    });
    // Remove the labels that don't fit. :(
    groupText.filter(function (d, i) {
        return groupPath[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength();
    }).remove();
    // Add the chords.
    var chord = svg.selectAll(".chord").data(layout.chords).enter().append("path").attr("class", "chord").style("fill", function (d) {
        return systems[d.source.index].color;
    }).attr("d", path);
    // Add an elaborate mouseover title for each chord.
    chord.append("title").text(function (d) {
        //return systems[d.source.index].name + " → " + systems[d.target.index].name + ": " + formatPercent(d.source.value) + "\n" + systems[d.target.index].name + " → " + systems[d.source.index].name + ": " + formatPercent(d.target.value);
        //update this to use a custom prop
        return systems[d.source.index].mouseHover;
        
    });
    function mouseover(d, i) {
        chord.classed("fade", function (p) {
            
            return p.source.index != i && p.target.index != i;
        });
    }
}