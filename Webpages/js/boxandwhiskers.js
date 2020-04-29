var CSV_ADDRESS = "/data/seamus/spotify_songs.csv";
var pad = .5; //between bars
var margins = {
    top: 15,
    bottom: 100,
    left: 60,
    right: 30
}

var xSelectList;
var x2SelectList;
var ySelectList;
var xBuckInput;

function go(def_x1, def_x2, def_y){
    xSelectList = document.getElementById("xSelect");
    x2SelectList = document.getElementById("x2Select");
    ySelectList = document.getElementById("ySelect");
    xBuckInput = document.getElementById("xBuckInput");
    //ySelectList.selectedIndex="8";
    ySelectList.value=def_y;
    xSelectList.value=def_x1;
    x2SelectList.value=def_x2;
    xBuckInput.value="5";

    d3.csv(CSV_ADDRESS, 
            csv_preprocessing_function, 
            createWhiskerChart);
}

function plotUpdate(){
    d3.select("#visframe").selectAll("*").remove();
    
    d3.csv(CSV_ADDRESS, 
            csv_preprocessing_function, 
            createWhiskerChart);
}

function createWhiskerChart(rawData){
    //ogData = rawData;
    var input = processDataForStackedBars(rawData);
    var data = input.data;
    var visframe = document.getElementById("visframe");
    visframe.setAttribute("width", window.innerWidth - 30);
    visframe.setAttribute("height", window.innerHeight * 0.7);
    
    //Universal spacing constraints
    var w = visframe.getAttribute("width");
    var h = visframe.getAttribute("height");

    var plot_width = w - margins.right;
    var plot_height = h - margins.bottom;
    var plot_x = margins.left;
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
        y_field: input.y_field,
        globalMin: input.globalMin,
        globalMax: input.globalMax
    }

    drawWhiskers(data, plotParams);
}

function processDataForStackedBars(rawData){
    //Goal: For each bucket of popularity values, store counts of each key
    //x is discreet, y is continuous

    var x_field = xSelectList.value;
    var x2_field = x2SelectList.value;
    var y_field = ySelectList.value;

    //var x_con = hasContinuousValues(x_field);
    //var y_con = hasContinuousValues(y_field);
    document.getElementById("xOptions").style.visibility = "hidden";

    /*
    var x_max = d3.max(rawData, function(d) {return d[x_field];} );
    var x_min = d3.min(rawData, function(d) {return d[x_field];} );
    var xnum_buckets = xBuckInput.value;
    var bucket_intervals = (x_max - x_min) / xnum_buckets;
    */
    var aggregateData = {};
    var finalData = {};

    //Populate with initial values:
    rawData.forEach( function(row){ 
        let objKey = "" + row[x_field];
        if(x2_field != "none") objKey += " "+row[x2_field];
        if(aggregateData[objKey] === undefined) aggregateData[objKey] = [];

        aggregateData[objKey].push( row[y_field] );
    });

    //Sort data points
    for(objKey in aggregateData)
        aggregateData[objKey].sort( (el1,el2) => {return +el1 - +el2} );

    //Quickly snage global min and max values for making a scale later
    var globalMin = Infinity;
    var globalMax = -Infinity;
    for(objKey in aggregateData){
        if(aggregateData[objKey][0] < globalMin)
            globalMin = aggregateData[objKey][0];
        if(aggregateData[objKey][aggregateData[objKey].length-1] > globalMax)
            globalMax = aggregateData[objKey][aggregateData[objKey].length-1];
    }

    //Find and store median, quartiles, whisker fences, and outliers
    Object.keys(aggregateData).forEach( function(key){
        finalData[key] = {};
        
        //Mean
        let len = aggregateData[key].length;
        let sum = 0; aggregateData[key].forEach(n => sum+=n);
        finalData[key]["mean"] = sum / len;

        //Median
        let median;
        if(len%2==1)
            median = aggregateData[key][Math.floor(len/2)];
        else {
            let m1 = aggregateData[key][len/2];
            let m2 = aggregateData[key][len/2 - 1];
            median = (m1 + m2) / 2;
        }
        finalData[key]["median"] = median;
        
        //Quartiles
        if(len%4!=0){
            finalData[key]["Q1"] = aggregateData[key][Math.floor(len/4)];
            finalData[key]["Q3"] = aggregateData[key][Math.floor(len*3/4)];
        } else {
            m1 = aggregateData[key][len/4];
            m2 = aggregateData[key][len/4 - 1];
            finalData[key]["Q1"] = (m1 + m2) / 2;

            m1 = aggregateData[key][len*3/4];
            m2 = aggregateData[key][len*3/4 - 1];
            finalData[key]["Q3"] = (m1 + m2) / 2;
        }
        
        //Whisker Fences
        let iqr = finalData[key]["Q3"] - finalData[key]["Q1"];
        let lowf = finalData[key]["Q1"] - 1.5*iqr;
        let highf = finalData[key]["Q3"] + 1.5*iqr;
        if(lowf > aggregateData[key][0])
            finalData[key]["lowFence"] = lowf;
        else
            finalData[key]["lowFence"] = aggregateData[key][0];
        if(highf < aggregateData[key][aggregateData[key].length-1])
            finalData[key]["highFence"] = highf;
        else
            finalData[key]["highFence"] = aggregateData[key][aggregateData[key].length-1];

        //Gather Outliers
        for(let i = 0; i < aggregateData[key].length; i++){
            var outliers = []
            let val = aggregateData[key][i];
            if(val < finalData[key]["lowFence"] || 
               val > finalData[key]["highFence"]){
                outliers.push(val);
            }
        }
        finalData[key]["outliers"] = outliers;
    });

    var results = {
        data: finalData,
        x_labels: Object.keys(finalData),
        x_field: x_field,
        x2_field: x2_field,
        y_field: y_field,
        globalMin: globalMin,
        globalMax: globalMax
    }

    return results;
}

function drawWhiskers(data, params){
    var w = params["w"];
    var h = params["h"];
    var x = params["x"];
    var y = params["y"];
    var colors = params["color"];

    var dataArray = []
    for(key in data){
        dataArray.push(data[key]);
    }

    //Set up scales
    var xScale = d3.scaleBand()
        .domain(d3.range(dataArray.length))
        .range([0, w])
        .paddingInner(pad);

    var yScale = d3.scaleLinear()
        .domain([params.globalMin, params.globalMax])
        .range([h,0]);

        console.log(params.globalMin, params.globalMax);
        console.log("yScale examples! 0, .2, .5, 1:", yScale(0), yScale(.2), yScale(.5), yScale(1));

    //Create group element for entire section
    var plot = d3.select("#visframe")
        .append("g")
        .attr("transform", "translate("+x+","+y+")");

    // Add a group for each row of data
    var groups = plot.selectAll(".barGroup")
        .data(dataArray)
        .enter()
        .append("g")
        .attr("class", "barGroup")
        .style("fill", function(d, i) {
            return colors(i);
        });

    // Add vertical line that will connect whiskers underneath the box
    var centerline = groups.append("g")
        .attr("class", "plotMarksAndLabels")
        .append("line")
        .attr("class", "plotLineMarks")
        .attr("x1", function(d, i) {
            return xScale(i) + xScale.bandwidth()/2;
        })
        .attr("y1", function(d, i) {
            return yScale(d["lowFence"]);
        })
        .attr("x2", function(d, i) {
            return xScale(i) + xScale.bandwidth()/2;
        })
        .attr("y2", function(d, i) {
            return yScale(d["highFence"]);
        })
        .attr("stroke", "black")
        .attr("stroke-width", "2");
    
    // Add a rect for each data value
    var rects = groups
        .append("rect")
        .attr("x", function(d, i) {
            return xScale(i);
        })
        .attr("y", function(d, i) {
            return yScale(d["Q3"]);
        })
        .attr("height", function(d, i) {
            return yScale(d["Q1"]) - yScale(d["Q3"]);
        })
        .attr("width", xScale.bandwidth());

    var whiskerTopBars = groups.append("g")
        .attr("class", "plotMarksAndLabels")
        .append("line")
        .attr("class", "plotLineMarks")
        .attr("x1", function(d, i) {
            return xScale(i);
        })
        .attr("y1", function(d, i) {
            return yScale(d["highFence"]);
        })
        .attr("x2", function(d, i) {
            return xScale(i) + xScale.bandwidth();
        })
        .attr("y2", function(d, i) {
            return yScale(d["highFence"]);
        })
        .attr("stroke", "black")
        .attr("stroke-width", "2");

    var whiskerBottomBars = groups.append("g")
        .attr("class", "plotMarksAndLabels")
        .append("line")
        .attr("class", "plotLineMarks")
        .attr("x1", function(d, i) {
            return xScale(i);
        })
        .attr("y1", function(d, i) {
            return yScale(d["lowFence"]);
        })
        .attr("x2", function(d, i) {
            return xScale(i) + xScale.bandwidth();
        })
        .attr("y2", function(d, i) {
            return yScale(d["lowFence"]);
        })
        .attr("stroke", "black")
        .attr("stroke-width", "2");

    var medianBars = groups
        .append("line")
        .attr("x1", function(d, i) {
            return xScale(i);
        })
        .attr("y1", function(d, i) {
            return yScale(d["median"]);
        })
        .attr("x2", function(d, i) {
            return xScale(i) + xScale.bandwidth();
        })
        .attr("y2", function(d, i) {
            return yScale(d["median"]);
        })
        .attr("stroke", "black")
        .attr("stroke-width", "2");

    var meanPoints = groups
        .append("circle")
        .attr("cx", function(d, i) {
            return xScale(i) + xScale.bandwidth()/2;
        })
        .attr("cy", function(d, i) {
            return yScale(d["mean"]);
        })
        .attr("r", "2")
        .attr("fill", "black")
        .attr("stroke", "white");

    var outlierPoints = groups.selectAll(".ignoreMe")
        .data(function(d){
            return d["outliers"];
        })
        .enter()
        .append("circle")
        .attr("cx", function(d, i) {
            return xScale(i) + xScale.bandwidth()/2;
        })
        .attr("cy", function(d, i) {
            return yScale(d);
        })
        .attr("r", "2")
        .attr("fill", "black")
        .attr("stroke", "white");

    //AXIS LABELLING:
    //scales for axis labelling purposes
    var xAxScale = d3.scaleBand()
        .domain( params.x_labels )
        .range([0, w])
        .paddingInner(pad);

    /* var yAxScale = d3.scaleLinear()
            .domain([100,0])
            .range([0,h]); */

    var xAxis = plot.append("g")
        .attr("class", "plotMarksAndLabels")
        .attr("transform", "translate("+0+","+h+")")
        .call(d3.axisBottom(xAxScale));
        
    

    var yAxis = plot.append("g")
        .attr("class", "plotMarksAndLabels")
        //.attr("transform", "translate("+0+","+0+")")
        .call(d3.axisLeft(yScale));

    //Coloration of Axes and angling text
    //Angling axis text, courtesy of: http://www.d3noob.org/2013/01/how-to-rotate-text-labels-for-x-axis-of.html
    xAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-25)" );

    // BOTTOM LABEL
    var bottomRow = plot.append("g")
        .attr("class", "plotMarksAndLabels")
        .attr("transform", "translate("+0+","+(h+margins.top + 50)+")");

    bottomRow.append("text")
        .attr("x", w*.5)
        .attr("text-anchor", "middle")
        .text(getReadableName(params.x_field));
}