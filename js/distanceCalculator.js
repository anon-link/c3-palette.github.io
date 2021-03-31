
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

    for (let i = 0; i < distanceArray.length; i++) {
        if (distanceArray[i] > kappa[0] && distanceArray[i] <= kappa[1])
            result[i] = Math.exp(distanceArray[i]);
        else if (distanceArray[i] <= kappa[0] || distanceArray[i] > kappa[1])
            result[i] = -1;
        order.push([i, result[i]])
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
