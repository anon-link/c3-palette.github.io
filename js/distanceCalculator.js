
/**
 * calculating the Color Saliency 
 * reference to "Color Naming Models for Color Selection, Image Editing and Palette Design"
 */
function getColorNameIndex(c) {
    var x = d3.lab(c),
        L = 5 * Math.round(x.L / 5),
        a = 5 * Math.round(x.a / 5),
        b = 5 * Math.round(x.b / 5),
        s = [L, a, b].join(",");
    return color_name_map[s];
}
function getColorSaliency(x) {
    let c = getColorNameIndex(x);
    return (c3.color.entropy(c) - minE) / (maxE - minE);
}
function getNameDifference(x1, x2) {
    let c1 = getColorNameIndex(x1),
        c2 = getColorNameIndex(x2);
    return 1 - c3.color.cosine(c1, c2);
}

/**
 * calculate KNNG distance
 */
function SplitDataByClass(data, label2class) {
    var clusters = {};
    for (let d of data) {
        if (clusters[label2class[d.label]] == undefined)
            clusters[label2class[d.label]] = [];
        clusters[label2class[d.label]].push({
            x: xMap(d),
            y: yMap(d),
            label: d.label
        });
    }
    return clusters;
}

function getKNNG(clusters, k = 2) {
    var labels = [],
        dataset = [];
    for (var i in clusters) {
        for (var d of clusters[i]) {
            labels.push(i);
            dataset.push([d.x, d.y]);
        }
    }

    console.time('build index');
    var index = Flann.fromDataset(dataset);
    console.timeEnd('build index');
    var result = index.multiQuery(dataset, k + 1);

    return [labels, result, dataset];
}

function calculateClassCenter(cluster_points) {
    if (!cluster_points) return { x: 0, y: 0 };
    let mean_x = 0,
        mean_y = 0;
    for (let p of cluster_points) {
        mean_x += p.x;
        mean_y += p.y;
    }
    return {
        x: mean_x / cluster_points.length,
        y: mean_y / cluster_points.length
    };
}


/**
 * local contrast
 */
function calculateKNNGDistance(datasets, knng_neighbors_num = 2) {
    for (let m = 0; m < datasets.length; m++) {
        //auxiliary variables
        var clusters = SplitDataByClass(datasets[m], labelToClass);
        var [labels, knng] = getKNNG(clusters, knng_neighbors_num);
        for (var i = 0; i < knng.length; i++) {
            for (var j in knng[i]) {
                if (labels[i] != labels[j]) {
                    knng_distance[labels[i]][labels[j]] += inverseFunc(knng_neighbors_num * datasets[m].length * Math.sqrt(knng[i][j]) + 1);
                }
            }
        }
    }
}

/**
 * distance between cluster centers
 */
function calculateClassCenterDistance(datasets) {
    let cluster_num = Object.keys(labelToClass).length;
    for (let m = 0; m < datasets.length; m++) {
        var data_clusters = SplitDataByClass(datasets[m], labelToClass);
        let cluster_center = [];
        for (let i = 0; i < cluster_num; i++) {
            cluster_center.push(calculateClassCenter(data_clusters[i]));
        }
        for (let i = 0; i < cluster_num; i++) {
            for (let j = i + 1; j < cluster_num; j++) {
                if (!data_clusters[i] || !data_clusters[j]) {
                    continue;
                }
                dsc_distance[i][j] = dsc_distance[j][i] = inverseFunc(cluster_num * calcEuclidianDistance(cluster_center[i], cluster_center[j]) + 1);
            }
        }
    }
}


/**
 * calculte the changing distance of each class
 * based on LAP(Linear Assignment Program)
 */
function calcChangingDistance(datasets) {
    let longest_distance = (SVGWIDTH - svg_margin.left - svg_margin.right) * 1.414;
    for (let i = 0; i < datasets.length - 1; i++) {
        var ref_clusters = SplitDataByClass(datasets[i], labelToClass),
            comp_clusters = SplitDataByClass(datasets[i + 1], labelToClass);
        // console.log(ref_clusters, comp_clusters);
        if (Object.keys(ref_clusters).length < Object.keys(comp_clusters).length) {
            let tmp = ref_clusters;
            ref_clusters = comp_clusters;
            comp_clusters = tmp;
        }
        // for each cluster, calculate the cost
        for (let key in ref_clusters) {
            let ref = ref_clusters[key],
                target = comp_clusters[key];
            if (ref && target) {
                let cost = new Array(ref.length);
                for (let i = 0; i < ref.length; i++) {
                    if (!cost[i]) cost[i] = new Array(target.length);
                    for (let j = 0; j < target.length; j++) {
                        cost[i][j] = calcEuclidianDistance(ref[i], target[j]);
                    }
                }
                let solution = computeMunkres(cost);
                let dist_sum = 0;
                for (let j = 0; j < solution.length; j++) {
                    dist_sum += cost[solution[j][0]][solution[j][1]];
                }

                change_distance[key] += dist_sum / (solution.length * longest_distance) + Math.abs(ref.length - target.length) / ref.length;
            } else {
                change_distance[key] += 1;
            }
        }
    }
    // console.log(change_distance.slice());
    //normalize change_distance
    let change_distance_scale = d3.extent(change_distance);
    if (change_distance_scale[0] > 0) {
        change_distance_scale[0] = 0;
    }
    for (let i = 0; i < change_distance.length; i++) {
        change_distance[i] = (change_distance[i] - change_distance_scale[0]) / (change_distance_scale[1] - change_distance_scale[0] + 0.000000001);
    }
}

function getDeltaDistance(distanceArray) {
    let result = distanceArray.slice();
    let order = []
    if (choosed_emphasized_clusters.length > 0) {
        for (let i = 0; i < distanceArray.length; i++) {
            if (distanceArray[i] > 0)
                result[i] = Math.exp(distanceArray[i]);
            else
                result[i] = -1;
            order.push([i, result[i]])
        }
    } else {
        for (let i = 0; i < distanceArray.length; i++) {
            if (distanceArray[i] > kappa[0] && distanceArray[i] <= kappa[1])
                result[i] = Math.exp(distanceArray[i]);
            else if (distanceArray[i] <= kappa[0] || distanceArray[i] > kappa[1])
                result[i] = -1;
            order.push([i, result[i]])
        }
    }

    // re-order the clusters by the delta distance
    order.sort(function (a, b) {
        return a[1] - b[1];
    })
    for (let i = 0; i < source_datasets.length; i++) {
        var clusters = {};
        for (let d of source_datasets[i]) {
            if (clusters[labelToClass[d.label]] == undefined)
                clusters[labelToClass[d.label]] = [];
            clusters[labelToClass[d.label]].push(d);
        }
        let data = []
        for (let j = 0; j < order.length; j++) {
            data = data.concat(clusters[order[j][0]])
        }
        source_datasets[i] = data;
    }

    return result;
}


/**
 * alpha-Shape graph Implementation
 * using Philippe Rivière’s bl.ocks.org/1b7ddbcd71454d685d1259781968aefc 
 * voronoi.find(x,y) finds the nearest cell to the point (x,y).
 * extent is like: [[30, 30], [width - 30, height - 30]]
 */
function calculateAlphaShape(datasets, extent) {
    alphaShape_distance = new TupleDictionary();
    let cluster_num = Object.keys(labelToClass).length;
    background_distance = new Array(cluster_num).fill(0);
    tmp_distance = new Array(cluster_num);
    for (let i = 0; i < cluster_num; i++) {
        tmp_distance[i] = new Array(cluster_num);
    }
    for (let m = 0; m < datasets.length; m++) {

        let voronoi = d3.voronoi().x(function (d) { return xMap(d); }).y(function (d) { return yMap(d); })
            .extent(extent);
        let diagram = voronoi(datasets[m]);
        let cells = diagram.cells;
        let alpha = 25 * 2;
        let distanceDict = {}, background_distanceDict = {};
        for (let cell of cells) {
            if (cell === undefined) continue;
            let label = labelToClass[cell.site.data.label];
            let dist_arr = []
            cell.halfedges.forEach(function (e) {
                let edge = diagram.edges[e];
                let ea = edge.left;
                if (ea === cell.site || !ea) {
                    ea = edge.right;
                }
                if (ea) {
                    let ea_label = labelToClass[ea.data.label];
                    let dx, dy, dist;
                    dx = cell.site[0] - ea[0];
                    dy = cell.site[1] - ea[1];
                    dist = Math.sqrt(dx * dx + dy * dy);
                    if (label != ea_label) {
                        if (alpha > dist) {
                            if (distanceDict[label] === undefined)
                                distanceDict[label] = {};
                            if (distanceDict[label][ea_label] === undefined)
                                distanceDict[label][ea_label] = [];
                            distanceDict[label][ea_label].push(inverseFunc(dist));
                        }
                    }
                    dist_arr.push(dist);
                }
            });
            if (background_distanceDict[label] === undefined)
                background_distanceDict[label] = [];
            background_distanceDict[label].push(d3.sum(dist_arr) / dist_arr.length)
        }
        // console.log("distanceDict:", distanceDict);


        for (var i in distanceDict) {
            for (var j in distanceDict[i]) {
                i = +i, j = +j;
                var dist;
                if (distanceDict[j] === undefined || distanceDict[j][i] === undefined)
                    dist = 2 * d3.sum(distanceDict[i][j]);
                else
                    dist = d3.sum(distanceDict[i][j]) + d3.sum(distanceDict[j][i]);

                tmp_distance[i][j] += dist;
            }
        }
        console.log("alphaShape_distance:", alphaShape_distance);
        for (var i in background_distanceDict) {
            background_distance[i] += d3.sum(background_distanceDict[i]) / background_distanceDict[i].length;
        }
        console.log("background_distance:", background_distance);

    }
    for (let i = 0; i < cluster_num; i++) {
        for (let j = i + 1; j < cluster_num; j++) {
            if (tmp_distance[i][j] != undefined && tmp_distance[j][i] != undefined) {
                alphaShape_distance.put([i, j], tmp_distance[i][j] + tmp_distance[j][i]);
            }
        }
    }
    // return distanceOf2Clusters;
}

/**
 * alpha-Shape graph Implementation
 * using Philippe Rivière’s bl.ocks.org/1b7ddbcd71454d685d1259781968aefc 
 * voronoi.find(x,y) finds the nearest cell to the point (x,y).
 * extent is like: [[30, 30], [width - 30, height - 30]]
 */
function showVoronoi(data, extent) {
    let as_svg = d3.select("#renderDiv").append("svg").attr("id", "asIllustration")
        .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);
    let svg_width = SVGWIDTH - svg_margin.left - svg_margin.right,
        svg_height = SVGHEIGHT - svg_margin.top - svg_margin.bottom;

    let asIllu = as_svg.style("background-color", bgcolor)
        .append("g")
        .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");
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

    xScale.domain([d3.min(data, xValue), d3.max(data, xValue)]);
    yScale.domain([d3.min(data, yValue), d3.max(data, yValue)]);

    // construct the data
    var voronoi = d3.voronoi().x(function (d) { return xMap(d); }).y(function (d) { return yMap(d); })
        .extent(extent);
    var polygon = asIllu.append("g")
        .attr("class", "polygons")
        .attr("style", "fill:none;stroke:#000")
        .selectAll("path")
        .data(voronoi.polygons(data))
        .enter().append("path")
        .call(redrawPolygon);
    var diagram = voronoi(data);
    // console.log(diagram);

    // voronoi.find is included in [d3 v4.3.0](https://github.com/d3/d3/releases/v4.3.0)
    // the following lines just add coloring
    diagram.find = function (x, y, radius) {
        var i, next = diagram.find.found || Math.floor(Math.random() * diagram.cells.length);
        var cell = diagram.cells[next] || diagram.cells[next = 0];
        var dx = x - cell.site[0],
            dy = y - cell.site[1],
            dist = dx * dx + dy * dy;

        do {
            cell = diagram.cells[i = next];
            next = null;
            polygon._groups[0][i].setAttribute('fill', '#f5a61d');
            cell.halfedges.forEach(function (e) {
                var edge = diagram.edges[e];
                var ea = edge.left;
                if (ea === cell.site || !ea) {
                    ea = edge.right;
                }
                if (ea) {
                    if (polygon._groups[0][ea.index].getAttribute('fill') != '#f5a61d') {
                        polygon._groups[0][ea.index].setAttribute('fill', '#fbe8ab');
                    }
                    var dx = x - ea[0],
                        dy = y - ea[1],
                        ndist = dx * dx + dy * dy;
                    if (ndist < dist) {
                        dist = ndist;
                        next = ea.index;
                        return;
                    }
                }
            });

        } while (next !== null);

        diagram.find.found = i;
        if (!radius || dist < radius * radius) return cell.site;
    }

    // findcell([extent[1][0] / 2, extent[1][1] / 2]);

    function moved() {
        // findcell(d3.mouse(this));
    }

    function findcell(m) {
        polygon.attr('fill', '');
        var found = diagram.find(m[0], m[1], 50);
        if (found) {
            polygon._groups[0][found.index].setAttribute('fill', 'red');
        }
    }

    function redrawPolygon(polygon) {
        polygon
            .attr("d", function (d) { return d ? "M" + d.join("L") + "Z" : null; });
    }
    // draw dots
    // let dots = scatterplot.append("g").selectAll(".dot")
    //     .data(data)
    //     .enter().append("circle")
    //     .attr("class", "dot")
    //     .attr("id", function (d) {
    //         return "class_" + labelToClass[cValue(d)];
    //     })
    //     .attr("r", radius)
    //     .attr("cx", xMap)
    //     .attr("cy", yMap)
    //     .attr("fill", function (d, i) {
    //         return Tableau_20_palette[labelToClass[cValue(d)]];
    //     });
    let cells = diagram.cells;
    let alpha = 25 * 25 * 2;
    for (let cell of cells) {
        let label = labelToClass[cell.site.data.label];
        cell.halfedges.forEach(function (e) {
            let edge = diagram.edges[e];
            let ea = edge.left;
            if (ea === cell.site || !ea) {
                ea = edge.right;
            }
            if (ea) {
                let ea_label = labelToClass[ea.data.label];
                if (label != ea_label) {
                    let dx = cell.site[0] - ea[0],
                        dy = cell.site[1] - ea[1],
                        dist = dx * dx + dy * dy;
                    if (alpha > dist) {
                        polygon._groups[0][ea.index].setAttribute('fill', '#fbe8ab');
                    }
                }
            }
        });
    }

    asIllu.selectAll(".dot2").append("g")
        .data(data)
        .enter().append("circle") // Uses the enter().append() method
        .attr("class", "dot2") // Assign a class for styling
        .attr("r", function (d) {
            if (d.terminal === 0) {
                return radius - 1;
            } else {
                return radius;
            }
        })
        .attr("cx", xMap)
        .attr("cy", yMap)
        // .style("stroke", function (d) {
        //     if (d.terminal === 0) {
        //         return "#fff";
        //     } else {
        //         return "#fff";
        //     }
        // })
        .style("fill", function (d) { return Tableau_10_palette[labelToClass[cValue(d)]] });

}
