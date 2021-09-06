function saveTable(fileId = 0, type = "pos", magnitude = "s") {
    // source_data.push([final_reference_data, final_comparative_data])
    let data = final_reference_data;
    let str = "";
    for (let i = 0; i < data.length; i++) {
        str += data[i].x;
        str += ",";
        str += data[i].y;
        str += ",";
        str += data[i].label;
        str += "\n";
    }
    downloadFile(fileId + "-" + type + "-" + magnitude + "-ref.csv", str);

    data = final_comparative_data;
    str = "";
    for (let i = 0; i < data.length; i++) {
        str += data[i].x;
        str += ",";
        str += data[i].y;
        str += ",";
        str += data[i].label;
        str += "\n";
    }
    downloadFile(fileId + "-" + type + "-" + magnitude + "-comp.csv", str);
}

function downloadFile(fileName, content) {
    var aTag = document.createElement('a');
    var blob = new Blob(['\ufeff' + content], { type: "text/csv" });
    aTag.download = fileName;
    aTag.href = URL.createObjectURL(blob);
    aTag.click();
    URL.revokeObjectURL(blob);
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}


function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
function getRandomInt2(max) {
    return Math.floor(Math.random() * Math.floor(max)) * Math.pow(-1, Math.round(Math.random()));
}
function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}
function calcEuclidianDistance(a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

/**
 * 
 * @param {array} shapeA 
 * @param {array} shapeB 
 */
function calcHausdorffDistance(shapeA, shapeB) {
    let haus_dis_AB = 0;
    for (let i = 0; i < shapeA.length; i++) {
        let shortest_dis = 1000000;
        for (let j = 0; j < shapeB.length; j++) {
            let dis = calcEuclidianDistance(shapeA[i], shapeB[j]);
            if (dis < shortest_dis)
                shortest_dis = dis;
        }
        if (shortest_dis > haus_dis_AB) {
            haus_dis_AB = shortest_dis;
        }
    }

    let haus_dis_BA = 0;
    for (let i = 0; i < shapeB.length; i++) {
        let shortest_dis = 1000000;
        for (let j = 0; j < shapeA.length; j++) {
            let dis = calcEuclidianDistance(shapeB[i], shapeA[j]);
            if (dis < shortest_dis)
                shortest_dis = dis;
        }
        if (shortest_dis > haus_dis_BA) {
            haus_dis_BA = shortest_dis;
        }
    }

    let haus_dis = Math.max(haus_dis_AB, haus_dis_BA);

    return haus_dis;//Math.pow(haus_dis * Math.sqrt(2) / 600, 1 / 1.4);
}

function boxmullersampling(mu, standard_deviation) {
    let u = Math.random(),
        v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mu + z * standard_deviation;
}
function randnGaussian(num, mean, r) {
    var data = [];
    for (var i = 0; i < num; i++) {
        data.push({
            x: boxmullersampling(mean[0], r),
            y: boxmullersampling(mean[1], r)
        });
    }
    return data;
}
// get normal distribution
function sampleNormal() {
    let v1, v2, s;
    do {
        v1 = 2.0 * Math.random() - 1.0;
        v2 = 2.0 * Math.random() - 1.0;
        s = v1 * v1 + v2 * v2;
    } while (s >= 1.0 || s == 0);

    s = Math.sqrt((-2.0 * Math.log(s)) / s);

    return v1 * s;
}
function getNextGaussianValue(mean, standard_deviation) {
    return mean + sampleNormal() * standard_deviation;
}

/**
 * 
 * @param {*} cx  X coordinate of the central point
 * @param {*} cy  Y coordinate of the central point
 * @param {*} x the coordinates of the point that we'll be rotating
 * @param {*} y the coordinates of the point that we'll be rotating
 * @param {*} angle the angle, in degrees.
 */
function rotate(cx, cy, x, y, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}

/**
 * 
 * @param {array} data 
 */
function getConvexHull(data) {
    let hullPoints = [];
    // Sort the points by X, then by Y (required by the algorithm)
    data.sort(sortPointY);
    data.sort(sortPointX);
    // Calculate the convex hull
    // Takes: an (1) array of points with x() and y() methods defined
    //          (2) Size of the points array
    //          (3) Empty array to store the hull points
    // Returns: The number of hull points, which may differ the the hull points array’s size
    let hullPoints_size = chainHull_2D(data, data.length, hullPoints);
    // console.log("hullPoints_size", hullPoints_size, hullPoints);
    return hullPoints;
}

var margin = {
    top: 20,
    right: 20,
    bottom: 80,
    left: 20
},
    width = 540 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

let Tableau_10_palette = ["#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC"];
let Tableau_20_palette = ["#4E79A7", "#A0CBE8", "#F28E2B", "#FFBE7D", "#59A14F", "#8CD17D", "#B6992D", "#F1CE63", "#499894", "#86BCB6", "#E15759", "#FF9D9A", "#79706E", "#BAB0AC", "#D37295", "#FABFD2", "#B07AA1", "#D4A6C8", "#9D7660", "#D7B5A6"];
let used_palette = Tableau_20_palette;
let bgcolor = "#fff"
/*
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */

// setup x
var xValue = function (d) {
    return d.x;
}, // data -> value
    xScale = d3.scaleLinear().range([0, width]), // value -> display
    xMap = function (d) {
        return xScale(xValue(d));
    }, // data -> display
    xAxis = d3.axisBottom().scale(xScale).ticks(0);

// setup y
var yValue = function (d) {
    return d.y;
}, // data -> value
    yScale = d3.scaleLinear().range([height, 0]), // value -> display
    yMap = function (d) {
        return yScale(yValue(d));
    }, // data -> display
    yAxis = d3.axisLeft().scale(yScale).ticks(0);

// setup fill color
var cValue = function (d) {
    return +d.label;
};
//color = d3.scaleOrdinal(palettes);         // modified to change color palettes
xScale.domain([-200, 600]);
yScale.domain([-200, 600]);

function drawScatterplot(data, svgText, palette) {
    if (!palette) palette = used_palette
    // console.log(data, svgText);
    // console.log(svgText, data);
    var svg = d3.select("#renderDiv-" + file_count).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // y-axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // draw dots
    var dots = svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("id", function (d) { return "cluster-" + cValue(d) })
        .attr("r", 4)
        .attr("cx", xMap)
        .attr("cy", yMap)
        .style("fill", function (d) {
            return palette[cValue(d)];
        });
    svg.append("text").attr("x", 0).attr("y", height + 20).text(svgText);
    return svg;
}

/**
 * cluster attributes:
 * 1. point number
 * 2. position: contains center position change and shape change
 */

/**
 * 
 * @param {array} data cluster data
 * @param {*} size change size, 0.1: small change, 0.3: medium change, 0.5: large change
 * @param {array} mean cluster center
 * @param {*} r cluster radius
 */
function changePointNumber(data, size, mean, r) {
    let change_point_number = parseInt(data.length * size);
    shuffle(data);
    if (Math.random() < 0.5) {
        //  adding points
        for (let i = 0; i < change_point_number; i++) {
            data.push({
                x: getNextGaussianValue(mean[0], r),
                y: getNextGaussianValue(mean[1], r),
                label: data[0].label
            });
        }
    } else {
        //  removing points
        data.splice(0, change_point_number);
    }
    for (let d of data) {
        d.x = (d.x < -200) ? -200 + getRandomInt(20) : d.x;
        d.x = (d.x > 600) ? 600 - getRandomInt(20) : d.x;
        d.y = (d.y < -200) ? -200 + getRandomInt(20) : d.y;
        d.y = (d.y > 600) ? 600 - getRandomInt(20) : d.y;
    }
}

function changeCenterPosition(data, size, mean) {
    // get a random direction: [0,2*pi]
    let theta, x, y;
    let change_distance = 400 * size;
    do {
        theta = Math.random() * 2 * Math.PI;
        x = mean[0] + change_distance * Math.cos(theta);
        y = mean[1] + change_distance * Math.sin(theta);
    } while (x < -100 || x > 500 || y < -100 || y > 500);
    let change_x = change_distance * Math.cos(theta),
        change_y = change_distance * Math.sin(theta);
    for (let d of data) {
        d.x = d.x + change_x;
        d.y = d.y + change_y;
        d.x = (d.x < -200) ? -200 + getRandomInt(20) : d.x;
        d.x = (d.x > 600) ? 600 - getRandomInt(20) : d.x;
        d.y = (d.y < -200) ? -200 + getRandomInt(20) : d.y;
        d.y = (d.y > 600) ? 600 - getRandomInt(20) : d.y;
    }
}

function changeOrientation(data, size, mean) {
    let change_size = 180 * size;
    for (let d of data) {
        let point = rotate(mean[0], mean[1], d.x, d.y, change_size);
        d.x = point[0];
        d.y = point[1];
        d.x = (d.x < -200) ? -200 + getRandomInt(20) : d.x;
        d.x = (d.x > 600) ? 600 - getRandomInt(20) : d.x;
        d.y = (d.y < -200) ? -200 + getRandomInt(20) : d.y;
        d.y = (d.y > 600) ? 600 - getRandomInt(20) : d.y;
    }
}


function changeShapeLinearInterpolation(ref, target, size, mean) {
    // align the cluster center
    let aligned_target = [];
    for (let d of target) {
        aligned_target.push({
            x: d.x + mean[0] - 200,
            y: d.y + mean[1] - 200,
            label: ref[0].label
        });
    }
    // calculate the cost
    let cost = new Array(ref.length);
    for (let i = 0; i < ref.length; i++) {
        if (!cost[i]) cost[i] = new Array(aligned_target.length);
        for (let j = 0; j < aligned_target.length; j++) {
            cost[i][j] = calcEuclidianDistance(ref[i], aligned_target[j]);
        }
    }
    let solution = lap(ref.length, cost);
    let col = solution.col;
    let inter_data = [];
    for (let j = 0; j < col.length; j++) {
        let point_x = ref[col[j]].x + size * (aligned_target[j].x - ref[col[j]].x),
            point_y = ref[col[j]].y + size * (aligned_target[j].y - ref[col[j]].y);
        inter_data.push({
            x: point_x,
            y: point_y,
            label: ref[0].label
        });
    }

    for (let d of inter_data) {
        d.x = (d.x < -200) ? -200 + getRandomInt(20) : d.x;
        d.x = (d.x > 600) ? 600 - getRandomInt(20) : d.x;
        d.y = (d.y < -200) ? -200 + getRandomInt(20) : d.y;
        d.y = (d.y > 600) ? 600 - getRandomInt(20) : d.y;
    }
    return inter_data;
}

function checkBoundary(data, xbound, ybound, bias) {
    for (let d of data) {
        if (d.x + bias[0] < xbound[0] || d.x + bias[0] > xbound[1] || d.y + bias[1] < ybound[0] || d.y + bias[1] > ybound[1]) {
            return false;
        }
    }
    return true;
}

function cloneTheDiv(id) {
    // Selecting div and
    // Cloning the div and
    // renaming the div
    var div = d3.select("div#renderDiv")
        .clone(true)
        .attr("id", "renderDiv-" + id)
    return div;
}


function loadData(text, labelSet, source_datasets) {
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
    // console.log("label set:", labelSet);
    if (labelSet.size > 100) {
        alert("Please load the data with right format.");
        return;
    }
    source_datasets.push(source_data);

}
function getLabelToClassMapping(labelSet) {
    var i = 0;
    var label2class = {};
    for (let e of labelSet.values()) {
        label2class[e] = i++;
        // label2class[e] = +e;
    }
    return label2class;
}

function processScatterData(datasets) {

    calculateAlphaShape(datasets, [[0, 0], [svg_width, svg_height]]);
    calcChangingDistance(datasets);
    delta_change_distance = getDeltaDistance(change_distance);

    let cluster_num = Object.keys(labelToClass).length;
    for (let i = 0; i < cluster_num; i++) {
        for (let j = 0; j < cluster_num; j++) {
            let dist = knng_distance[i][j] + 1.0 * dsc_distance[i][j];
            dist *= Math.exp(change_distance[i]);
            cosaliency_distance[i][j] = dist / source_datasets.length;
        }
    }
    console.log(knng_distance, dsc_distance, change_distance, cosaliency_distance);
}
//calculate distance of 2 colors
function calculateDistOf2Colors(palette) {
    let distanceOf2Colors = new TupleDictionary();
    let color_difference = function (lab1, lab2) {
        // let maxDistance = 122.48163103;
        // let minDistance = 1.02043527056;
        // let dis = (ciede2000(lab1, lab2) - minDistance) / (maxDistance - minDistance);
        let dis = d3_ciede2000(lab1, lab2)
        return dis;
    };
    let contrastToBg = function (lab1, lab2) {
        let c1 = d3.hcl(lab1),
            c2 = d3.hcl(lab2);
        if (!isNaN(c1.l) && !isNaN(c2.l)) {
            let dl = c1.l - c2.l;
            return Math.sqrt(dl * dl) / 100.0;
        } else {
            return 0;
        }
    }
    for (let i = 0; i < palette.length; i++) {
        for (let j = i + 1; j < palette.length; j++) {
            let dis = color_difference(d3.lab(palette[i]), d3.lab(palette[j]));
            distanceOf2Colors.put([i, j], dis);
        }
        distanceOf2Colors.put([i, palette.length], contrastToBg(palette[i], bgcolor));
    }
    return distanceOf2Colors;
}

function reorderData(change_info, cluster_num, source_datasets) {
    let array = Array.from(new Array(cluster_num).keys());
    let change_ids = change_info.map(function (d) { return d["cluster_id"] })
    let order = []
    for (let i = 0; i < cluster_num; i++) {
        if (change_ids.indexOf(i) === -1) {
            order.push(i)
        }
    }
    order = order.concat(change_ids);
    for (let i = 0; i < source_datasets.length; i++) {
        var clusters = {};
        for (let d of source_datasets[i]) {
            if (clusters[d.label] == undefined)
                clusters[d.label] = [];
            clusters[d.label].push(d);
        }
        let data = []
        for (let j = 0; j < order.length; j++) {
            data = data.concat(clusters[order[j]])
        }
        source_datasets[i] = data;
    }

}


class TupleDictionary {
    constructor() {
        this.dict = new Map();
    }

    tupleToString(tuple) {
        return tuple.join(",");
    }

    put(tuple, val) {
        this.dict.set(this.tupleToString(tuple), val);
    }

    get(tuple) {
        return this.dict.get(this.tupleToString(tuple));
    }

    keys() {
        return this.dict.keys();
    }

    length() {
        return this.dict.size;
    }
}

//convert rgb to hex
var rgbToHex = function (rgb) {
    var hex = Number(rgb).toString(16);
    if (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
};
var fullColorHex = function (r, g, b) {
    var red = rgbToHex(r);
    var green = rgbToHex(g);
    var blue = rgbToHex(b);
    return "#" + red + green + blue;
};
function convert2Hex(p) {
    let hex_p = p.map(function (c) {
        c = d3.rgb(c);
        return fullColorHex(parseInt(c.r), parseInt(c.g), parseInt(c.b));
    })
    return hex_p;
}