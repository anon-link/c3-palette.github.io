/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}

// setup x
let xValue = function (d) {
    return d.x;
}; // data -> value
// setup y
let yValue = function (d) {
    return d.y;
}; // data -> value
// setup fill color
let cValue = function (d) {
    return +d.label;
};
//global variables:
let svg_margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
},
    radius = 4,
    SVGWIDTH = 400,
    SVGHEIGHT = 400;
let svg_width = SVGWIDTH - svg_margin.left - svg_margin.right,
    svg_height = SVGHEIGHT - svg_margin.top - svg_margin.bottom;
let bgcolor = "#fff";
xScale = d3.scaleLinear().range([0, svg_width]), // value -> display
    xMap = function (d) {
        return xScale(xValue(d));
    }, // data -> display
    xAxis = d3.axisBottom().scale(xScale).ticks(0);
yScale = d3.scaleLinear().range([svg_height, 0]), // value -> display
    yMap = function (d) {
        return yScale(yValue(d));
    }, // data -> display
    yAxis = d3.axisLeft().scale(yScale).ticks(0);

let Tableau_10_palette = ["#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC"];
let Tableau_20_palette = ["#4E79A7", "#A0CBE8", "#F28E2B", "#FFBE7D", "#59A14F", "#8CD17D", "#B6992D", "#F1CE63", "#499894", "#86BCB6", "#E15759", "#FF9D9A", "#79706E", "#BAB0AC", "#D37295", "#FABFD2", "#B07AA1", "#D4A6C8", "#9D7660", "#D7B5A6"];

function loadData(text, labelSet) {
    //parse pure text to data, and cast string to number
    let source_data = d3.csvParseRows(text, function (d) {
        if (!isNaN(d[0]) && !isNaN(d[1])) {
            return d; //.map(Number);
        }
    }).map(function (d) { // change the array to an object, use the first two feature as the position
        //source data
        var row = {};
        row.label = d[2];
        labelSet.add(row.label);
        row.x = +d[0];
        row.y = +d[1];
        return row;
    });
    return source_data;
}
// function getLabelToClassMapping(labelSet) {
//     var i = 0;
//     var label2class = {};
//     for (let e of labelSet.values()) {
//         label2class[e] = i++;
//     }
//     return label2class;
// }

let test_time, start_time, result;
function drawScatterplot(data, palette, task_id, change_info, sign) {
    let change_ids = []
    if (change_info)
        change_ids = change_info.map(function (d) { return d["cluster_id"] })
    // add the graph canvas to the body of the webpage
    let scatterplot_svg = d3.select("#renderDiv").append("svg").style("margin-left", 20)
        .attr("width", SVGWIDTH).attr("height", SVGHEIGHT).style("background-color", bgcolor);
    let scatterplot = scatterplot_svg.append("g")
        .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");
    // draw dots
    let dots = scatterplot.append("g").selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("id", function (d) {
            return "class_" + cValue(d);
        })
        .attr("r", radius)
        .attr("cx", xMap)
        .attr("cy", yMap)
        .attr("fill", function (d, i) {
            return palette[cValue(d)];
        })
        .style("opacity", function (d) {
            if (sign && change_ids.indexOf(cValue(d)) === -1) {
                return "0.5";
            } else {
                return "1";
            }
        })


    // add the x Axis
    scatterplot.append("g")
        .attr("transform", "translate(0," + svg_height + ")")
        .call(d3.axisBottom(xScale).tickFormat(""));
    scatterplot.append("g")
        .attr("transform", "translate(0," + 0 + ")")
        .call(d3.axisTop(xScale).tickFormat(""));

    // add the y Axis
    scatterplot.append("g")
        .call(d3.axisLeft(yScale).tickFormat(""));
    // add the y Axis
    scatterplot.append("g")
        .attr("transform", "translate(" + svg_width + ",0)")
        .call(d3.axisRight(yScale).tickFormat(""));

    if (task_id === 1) return;

    let circle = scatterplot.append("circle")
        .attr("id", "choosed_cluster")
        .attr("r", 0)
        .style("stroke", bgcolor)
        .style("stroke-width", "1.5px");

    scatterplot_svg.on("mousemove", function () {
        let mouse_pos = [d3.mouse(this)[0] - svg_margin.left, d3.mouse(this)[1] - svg_margin.top];
        // check all points to find the desired
        let min_dis = 10000000000, desired_point = null;
        for (let i = 0; i < data.length; i++) {
            let d = data[i]
            let point_pos = [xMap(d), yMap(d)];
            let dis = (point_pos[0] - mouse_pos[0]) * (point_pos[0] - mouse_pos[0]) + (point_pos[1] - mouse_pos[1]) * (point_pos[1] - mouse_pos[1]);
            if (min_dis >= dis) {
                min_dis = dis;
                desired_point = d;
            }
        }
        if (min_dis > 100) {
            circle.attr("r", 0);
        } else {
            let id = cValue(desired_point);
            circle.attr("cx", mouse_pos[0])
                .attr("cy", mouse_pos[1])
                .attr("fill", palette[id])
                .attr("r", 10)
                .attr("display", "block")
                .on("click", function () {
                    for (let i = 0; i < result.length; i++) {
                        if (result[i][0] === id) {
                            return;
                        }
                    }
                    let consumed_time = (new Date() - test_time) / 1000;
                    result.push([id, consumed_time.toFixed(2)]);
                    test_time = new Date();
                    let div = d3.select("#user_study_div");
                    let span = div.append("span").attr("class", "rect")
                        .style("width", "40px").style("height", "40px").style("display", "inline-block")
                        .style("margin-left", "10px").style("background", palette[id]).style("text-align", "center");
                    // append lock and unlock sign
                    let img = span.append("img").attr("class", "icon_delete").style("padding", "5px").style("display", "none").attr("classId", id)
                        .on("click", function () {
                            span.remove();
                            let j = 0;
                            for (j = 0; j < result.length; j++) {
                                if (result[j][0] === id) {
                                    break;
                                }
                            }
                            result.splice(j, 1);
                        });
                    span.on("mouseover", function () {
                        d3.select(this).select("img").style("display", "block");
                    })
                        .on("mouseout", function () {
                            d3.select(this).select("img").style("display", "none");
                        })
                });
        }

    });
}

function reorderData(change_info, cluster_num, source_datasets) {
    let change_ids = change_info.map(function (d) { return d["cluster_id"] })
    let order = []
    for (let i = 0; i < cluster_num; i++) {
        if (change_ids.indexOf(i) === -1) {
            order.push(i)
        }
    }
    order = order.concat(change_ids);
    var clusters = {};
    for (let i = 0; i < source_datasets.length; i++) {
        let d = source_datasets[i]
        if (clusters[d.label] == undefined)
            clusters[d.label] = [];
        clusters[d.label].push(d);
    }
    let data = []
    for (let j = 0; j < order.length; j++) {
        data = data.concat(clusters[order[j]])
    }
    return data;

}

function drawBarchart(data, palette, sign, id) {
    // set the ranges
    xScale = d3.scaleBand()
        .range([0, svg_width])
        .padding(0.1);
    yScale = d3.scaleLinear()
        .range([svg_height, 0]);
    let barchart_svg = d3.select("#renderDiv").append("svg")
        .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);

    let barchart = barchart_svg.style("background-color", bgcolor)
        .append("g")
        .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");

    // add the x Axis
    barchart.append("g")
        .attr("transform", "translate(0," + svg_height + ")")
        .call(d3.axisBottom(xScale).tickFormat(""));

    // add the y Axis
    barchart.append("g")
        .call(d3.axisLeft(yScale).tickFormat(""));

    barchart.selectAll("bars")
        .data(data)
        .enter().append("rect")
        .attr("class", "bars")
        .attr("id", function (d) {
            return cValue(d);
        })
        .style("fill", function (d) {
            return palette[cValue(d)];
        })
        .attr("x", function (d) {
            return xScale(cValue(d));
        })
        .attr("width", xScale.bandwidth())
        .attr("y", function (d) {
            return yScale(yValue(d));
        })
        .attr("height", function (d) {
            return svg_height - yScale(yValue(d));
        })
        .attr("rx", 10).attr("ry", 10)
        .attr("item-color", function (d) {
            return palette[cValue(d)];
        })
        .style("opacity", function (d) {
            if (sign && cValue(d) != id) {
                return "0.5";
            } else {
                return "1";
            }
        })
        .on("click", function () {
            var url = "/result/3",
                data = {
                    test_id: test_id,
                    total_time: (new Date() - test_time) / 1000,
                    result: +d3.select(this).attr("id")
                };
            $.post(url, data, function (d) {
                window.location.href = d;
            });
        });
}