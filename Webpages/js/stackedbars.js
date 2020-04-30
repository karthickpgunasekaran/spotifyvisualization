/*
This script relies on the existence of an SVG element with ID "visframe",
some Select elements with IDs "xSelect" and "ySelect" to choose what the X and Y
variables are, and at least an input with ID "xBuckInput" to tell us how to divide up
continuous values for the X variable.

To use, run the "go()" function. To change parameters, give your desired values to
the previously mentioned Select and input DOMs and run the "plotUpdate()" function.

Capabilities/Limitations:
X variable seems to handle most continuous options. Loudness did not work, and it's
the only option that has negative values, so that may have something to do with it.
Dates do not appear to work. Discreet values do not appear to work, though the processed
data seems to generate how I wanted it to. That may have something to do with the way it
actually produces the graph?

Y variable has only been set up to work for the "Key" field.
*/

var CSV_ADDRESS = "/data/seamus/spotify_songs.csv";
var pad = .05; //between bars
var margins = {
    top: 15,
    bottom: 60,
    left: 30,
    right: 30
}

var xSelectList;
var ySelectList;
var xBuckInput;
var yBuckInput;

function go(){
    xSelectList = document.getElementById("xSelect");
    ySelectList = document.getElementById("ySelect");
    xBuckInput = document.getElementById("xBuckInput");
    yBuckInput = document.getElementById("yBuckInput");
    ySelectList.value="key";
    xSelectList.value="track_popularity";
    xBuckInput.value="5";
    yBuckInput.value="5";
    document.getElementById("yOptions").style.visibility = "hidden";

    d3.csv(CSV_ADDRESS, 
            csv_preprocessing_function, 
            createStackedBarChart);
}

function plotUpdate(){
    d3.select("#visframe").selectAll("*").remove();
    
    d3.csv(CSV_ADDRESS, 
            csv_preprocessing_function, 
            createStackedBarChart);
}

function createStackedBarChart(rawData){
    //ogData = rawData;
    var input = processDataForStackedBars(rawData);
    var data = input.data;
    var visframe = document.getElementById("visframe");
    visframe.setAttribute("width", window.innerWidth - 30);
    visframe.setAttribute("height", window.innerHeight * 0.7);
    
    //Universal spacing constraints
    var w = visframe.getAttribute("width");
    var h = visframe.getAttribute("height");
    var header_height = h/10;
    

    var legend_width = w/6 - margins.left;
    var legend_height = (h - margins.bottom)*.8;
    var legend_x = margins.left;
    var legend_y = margins.top + 40;

    var plot_width = w - legend_width - margins.right - 20;
    var plot_height = h - margins.bottom;
    var plot_x = legend_width + 20;
    var plot_y = margins.top;

    //Make sure the plot and legend are using the same color scale
    var colors = d3.scaleOrdinal(d3.schemeCategory20);

    var plotParams = {
        w: plot_width,
        h: plot_height,
        x: plot_x,
        y: plot_y,
        color: colors,
        x_labels: input.x_labels,
        y_labels: input.y_labels,
        x_field: input.x_field,
        y_field: input.y_field
    }

    var legendParams = {
        w: legend_width,
        h: legend_height,
        x: legend_x,
        y: legend_y,
        color: colors,
        x_field: input.x_field,
        y_field: input.y_field
    }

    var optionParams = {
        x_field: input.x_field,
        y_field: input.y_field
    }

    drawBars(data, plotParams);
    drawLegend(data, legendParams);
}

function processDataForStackedBars(rawData){
    //Goal: For each bucket of popularity values, store counts of each key
    //x is continuous, y is discrete

    //var x_field = "track_popularity";
    //var y_field = "key";
    var x_field = xSelectList.value;
    var y_field = ySelectList.value;

    var x_con = hasContinuousValues(x_field);
    var y_con = hasContinuousValues(y_field);

    var x_max = d3.max(rawData, function(d) {return d[x_field];} );
    var x_min = d3.min(rawData, function(d) {return d[x_field];} );
    var xnum_buckets = xBuckInput.value;
    var bucket_intervals = (x_max - x_min) / xnum_buckets;
    var newData;

    console.log("min", x_min, "max", x_max, "interval", bucket_intervals);

    if(x_con){
        newData = new Array(xnum_buckets);
        for(i = 0; i < xnum_buckets; i++) newData[i] = {};
    } else {
        newData = {}
    }
    
    //Populate newData with instances of Y for every type or bucket of X
    rawData.forEach( function(row){ 
        let bucket;
        if(x_con){
            bucket = Math.floor( (row[x_field] - x_min) /bucket_intervals);
            if(bucket >= newData.length) bucket = newData.length-1;
        } 
        else bucket = row[x_field];

        if(newData[bucket] === undefined) newData[bucket] = {};
        if(row[y_field] in newData[bucket])
            newData[bucket][row[y_field]] += 1;
        else 
            newData[bucket][row[y_field]] = 0;
        
    });

    console.log(newData);

    //Create labels we'll apply to x-axis later
    var xlabels = new Array(xnum_buckets);
    if(x_con){
        for(i = 0; i < xnum_buckets; i++) {
            let end_symbol = ")";
            let min = x_min + i * bucket_intervals;
            let max = x_min + (i+1) * bucket_intervals;
            if(i+1 == xnum_buckets) {
                max = x_min + (i+1) * bucket_intervals;
                end_symbol = "]";
            }
            if(!Number.isInteger(min)) min = min.toFixed(3);
            if(!Number.isInteger(max)) max = max.toFixed(3);
            xlabels[i] = "["+min+" - "+max+end_symbol;
        }
    }

    var ylabels = [0,100];

    var results = {
        data: newData,
        x_labels: xlabels,
        y_labels: ylabels,
        x_field: x_field,
        y_field: y_field
    }

    return results;
}

function drawBars(data, params){
    var w = params["w"];
    var h = params["h"];
    var x = params["x"];
    var y = params["y"];
    var colors = params["color"];

    var dataKeys = [];
    data.forEach(function(datum){
        var temp = Object.keys(datum);
        if(temp.length > dataKeys.length)
            dataKeys = temp;
    });
    var stack = d3.stack().keys(dataKeys);

    //Data, stacked
    var series = stack(data);

    //Set up scales
    var xScale = d3.scaleBand()
        .domain(d3.range(data.length))
        .range([0, w])
        .paddingInner(pad);

    var yScale = []
    data.forEach(function(d){
        let sum = 0;
        Object.keys(d).forEach(k => sum+=d[k]);
        let localScale = d3.scaleLinear()
                .domain([0,sum])
                .range([0,h]);
        yScale.push(localScale);
    });

    //Create group element for entire section
    var plot = d3.select("#visframe")
        .append("g")
        .attr("transform", "translate("+x+","+y+")");

    // Add a group for each row of data
    var groups = plot.selectAll(".barGroup")
        .data(series)
        .enter()
        .append("g")
        .attr("class", "barGroup")
        .style("fill", function(d, i) {
            return colors(i);
        });
    // console.log(series)
    // Add a rect for each data value
    var rects = groups.selectAll("rect")
        .data(function(d) { 
            return d;
        })
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
            return xScale(i);
        })
        .attr("y", function(d, i) {
            return yScale[i](d[0]);
        })
        .attr("height", function(d, i) {
            return yScale[i](d[1]) - yScale[i](d[0]);
        })
        .attr("width", xScale.bandwidth());


    //AXIS LABELLING:
    //scales for axis labelling purposes
    var xAxScale = d3.scaleBand()
        .domain( params.x_labels )
        .range([0, w])
        .paddingInner(pad);

    var yAxScale = d3.scaleLinear()
            .domain([100,0])
            .range([0,h]);

    var xAxis = plot.append("g")
        .attr("class", "plotMarksAndLabels")
        .attr("transform", "translate("+0+","+(h+pad)+")")
        .call(d3.axisBottom(xAxScale));

    var yAxis = plot.append("g")
        .attr("class", "plotMarksAndLabels")
        .attr("transform", "translate("+(-pad)+","+0+")")
        .call(d3.axisLeft(yAxScale));

    // BOTTOM LABEL
    var bottomRow = plot.append("g")
        .attr("class", "plotMarksAndLabels")
        .attr("transform", "translate("+0+","+(h+margins.bottom - 20)+")");

    bottomRow.append("text")
        .attr("x", w*.5)
        .attr("text-anchor", "middle")
        .text(getReadableName(params.x_field));

}

function drawLegend(data, params){
    var w = params["w"];
    var h = params["h"];
    var x = params["x"];
    var y = params["y"];
    var colors = params["color"];

    var dataKeys = [];
    data.forEach(function(datum){
        var temp = Object.keys(datum);
        if(temp.length > dataKeys.length)
            dataKeys = temp;
    });

    //There will be a header above the legend
    var header_height = h/5;

    var yScale = d3.scaleBand()
        .domain(d3.range(dataKeys.length))
        .range([0, h])
        .paddingInner(pad);

    //Create group element for entire section
    var legend = d3.select("#visframe")
        .append("g")
        .attr("transform", "translate("+x+","+y+")");

    // Add a group for each column of data
    var groups = legend.selectAll(".legGroup")
        .data(dataKeys)
        .enter()
        .append("g")
        .attr("class", "legGroup")
        .style("stroke", "grey")
        .style("fill", function(d, i) {
            return colors(i);
        });

        //RECTS
    var rects = groups.append("rect")
        .attr("x", x+pad)
        .attr("y", function(d, i) {
            return yScale(i);
        })
        .attr("height", 10)
        .attr("width", 10);

        //TEXT
    var labels = groups.append("g")
        .attr("class", "plotMarksAndLabels")
        .append("text")
        .attr("x", x + 20)
        .attr("y", function(d, i) {
            return yScale(i) + 10;
        })
        .style("stroke", "none")
        .attr("class", "plotLabelText")
        .text(function(d){
            return d;
        });

    //HEADER, above legend:
    legend.append("g")
        .attr("class", "plotMarksAndLabels")
        .append("text")
        .attr("x", x+pad)
        .attr("y", 0 - 20)
        .attr("class", "plotLabelText")
        .text("Legend:");

}
