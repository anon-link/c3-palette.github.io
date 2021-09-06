/**
change type: point number, point position
change magnitude: small, medium, large
data:  2(change types) * 3(change magnitudes) * 6(repeats) = 36(scatterplot pairs)
class number is 8, changed class number is 3
conditions: 6
trials: 36(scatterplot pairs) * 6(conditions) = 216(trials)
 */

let final_reference_data, final_comparative_data;
// adding other classes following Gaussian Distribution
let cluster_types = [[50, 100], [20, 50], [100, 50], [50, 20]];
let cluster_type_names = ["large&sparse", "small&sparse", "large&dense", "small&dense"]
let change_types = ["num", "pos"];
let change_types_map = { "number": 0, "position": 1 }
let clusterNum = 8
// generate 3 clusters for each cluster type
let cluster_type_array = new Array(cluster_types.length);
for (let i = 0; i < cluster_types.length; i++) {
    let reference_data = [];
    let mean = [200, 200];
    var rand_data = randnGaussian(cluster_types[i][0], mean, cluster_types[i][1]);
    for (let d of rand_data) {
        let point = {
            x: d.x,
            y: d.y,
            label: i
        };
        point.x = (point.x < -200) ? -200 + getRandomInt(20) : point.x;
        point.x = (point.x > 600) ? 600 - getRandomInt(20) : point.x;
        point.y = (point.y < -200) ? -200 + getRandomInt(20) : point.y;
        point.y = (point.y > 600) ? 600 - getRandomInt(20) : point.y;
        reference_data.push(point);
    }
    let convex_hull_reference = getConvexHull(reference_data);
    let convex_hull, comparative_data, dis;
    let generated_clusters = [];
    // randomly generate 100 clusters with r+random(0,10)
    for (let k = 0; k < 100; k++) {
        rand_data = randnGaussian(cluster_types[i][0], mean, cluster_types[i][1]);
        comparative_data = [];
        for (let d of rand_data) {
            let point = {
                x: d.x,
                y: d.y,
                label: i
            };
            point.x = (point.x < -200) ? -200 + getRandomInt(20) : point.x;
            point.x = (point.x > 600) ? 600 - getRandomInt(20) : point.x;
            point.y = (point.y < -200) ? -200 + getRandomInt(20) : point.y;
            point.y = (point.y > 600) ? 600 - getRandomInt(20) : point.y;
            comparative_data.push(point);
        }
        convex_hull = getConvexHull(comparative_data);
        dis = calcHausdorffDistance(convex_hull_reference, convex_hull);
        generated_clusters.push([dis, comparative_data]);
    }
    generated_clusters.sort(function (a, b) {
        return a[0] - b[0];
    });
    cluster_type_array[i] = new Array(4);
    cluster_type_array[i][0] = reference_data;
    // drawScatterplot(cluster_type_array[i][0], "Reference Cluster - 0 - " + cluster_type_names[i]);
    for (let j = 1; j < 8; j++) { // 8 reference clusters
        cluster_type_array[i][j] = generated_clusters[j - 1][1];
        // drawScatterplot(cluster_type_array[i][j], "Reference Cluster - " + j);
    }
    // generate target cluster
    let sd = cluster_types[i][1];
    if (cluster_types[i][0] === 50 && cluster_types[i][1] === 20) {
        sd = 50;
    } else if (cluster_types[i][0] === 100 && cluster_types[i][1] === 50) {
        sd = 100;
    } else if (cluster_types[i][0] === 20 && cluster_types[i][1] === 50) {
        sd = 20;
    } else if (cluster_types[i][0] === 50 && cluster_types[i][1] === 100) {
        sd = 50;
    }
    rand_data = randnGaussian(cluster_types[i][0], mean, sd);
    comparative_data = [];
    for (let d of rand_data) {
        let point = {
            x: d.x,
            y: d.y,
            label: i
        };
        point.x = (point.x < -200) ? -200 + getRandomInt(20) : point.x;
        point.x = (point.x > 600) ? 600 - getRandomInt(20) : point.x;
        point.y = (point.y < -200) ? -200 + getRandomInt(20) : point.y;
        point.y = (point.y > 600) ? 600 - getRandomInt(20) : point.y;
        comparative_data.push(point);
    }
    cluster_type_array[i][8] = comparative_data; // the 8th element is the target cluster
    // drawScatterplot(cluster_type_array[i][8], "Target Cluster");
    // showInter(cluster_type_array[i][0], cluster_type_array[i][3])
}
function generateScatterplots() {
    // d3.selectAll("svg").remove();
    // console.log("cluster number is ", clusterNum);

    let type_ids = [0, 1, 2, 3];
    shuffle(type_ids);
    let cluster_info = [];
    // generate reference scatterplot
    let generated_data = [];
    let type_order_ids = new Array(cluster_types.length), shape_type_ids;
    for (let i = 0; i < cluster_types.length; i++) {
        shape_type_ids = Array.from(new Array(8).keys());
        shuffle(shape_type_ids)
        type_order_ids[i] = shape_type_ids;
    }
    for (let i = 0; i < clusterNum; i++) {
        let idx = getRandomInt(cluster_types.length);//i % type_ids.length;//
        let change_cluster_data = cluster_type_array[type_ids[idx]][type_order_ids[type_ids[idx]].splice(0, 1)];
        // get random center position
        let mean = [getRandomInt2(200), getRandomInt2(200)];
        while (!checkBoundary(change_cluster_data, [-200, 600], [-200, 600], mean)) {
            mean = [getRandomInt2(200), getRandomInt2(200)];
        }
        let change_cluster_data_copy = [];
        for (let d of change_cluster_data) {
            change_cluster_data_copy.push({
                x: d.x + mean[0],
                y: d.y + mean[1],
                label: i
            })
        }
        cluster_info.push([type_ids[idx], [mean[0] + 200, mean[1] + 200]]);
        changeOrientation(change_cluster_data_copy, 0.01 * getRandomIntInclusive(0, 100), [mean[0] + 200, mean[1] + 200]);
        generated_data = generated_data.concat(change_cluster_data_copy);
    }
    final_reference_data = generated_data;
    let tmp_svg = drawScatterplot(generated_data, "Reference Scatterplot-" + file_count);
    // drawCenters(cluster_info, tmp_svg);

    // generate comparative scatterplot
    /**
     * change type: point number, shape, center position, orientation
     * change size for each type: small=0.3~0.5, large=0.7~1.0
     * change size for scatterplot: small=(1 type with small change), medium=(1 type with large change) or (multiple types with small change), large=(multiple types with large change)
     */
    let change_condition_ids = [];
    function changeClusters(change_cluster_ids, change_size) {
        let reference_data = [].concat(JSON.parse(JSON.stringify(generated_data)));
        change_condition_ids = [];
        let clusters_data = new Array(clusterNum);
        for (let d of reference_data) {
            if (clusters_data[+d.label] == undefined) clusters_data[+d.label] = [];
            clusters_data[+d.label].push(d);
        }
        for (let change_cluster_id of change_cluster_ids) {
            let change_cluster_data = clusters_data[change_cluster_id];
            change_condition_ids.push(cluster_type_names[cluster_info[change_cluster_id][0]]);
            switch (change_type_index) {
                case 0:
                    changePointNumber(change_cluster_data, change_size, cluster_info[change_cluster_id][1], cluster_types[cluster_info[change_cluster_id][0]][1]);
                    break;
                case -1:
                    if (change_cluster_ids.indexOf(change_cluster_id) === 0) {
                        changePointNumber(change_cluster_data, change_size, cluster_info[change_cluster_id][1], cluster_types[cluster_info[change_cluster_id][0]][1]);
                    } else if (change_cluster_ids.indexOf(change_cluster_id) === 1) {
                        let condition_type_id = cluster_info[change_cluster_id][0];
                        let generated_new_cluster = changeShapeLinearInterpolation(change_cluster_data, cluster_type_array[condition_type_id][cluster_type_array[condition_type_id].length - 1], change_size, cluster_info[change_cluster_id][1]);
                        clusters_data[change_cluster_id] = generated_new_cluster;
                    } else {
                        changeCenterPosition(change_cluster_data, change_size, cluster_info[change_cluster_id][1]);
                    }
                    break;
                default:
                    if (Math.random() > 0.5) {
                        let condition_type_id = cluster_info[change_cluster_id][0];
                        let generated_new_cluster = changeShapeLinearInterpolation(change_cluster_data, cluster_type_array[condition_type_id][cluster_type_array[condition_type_id].length - 1], change_size, cluster_info[change_cluster_id][1]);
                        clusters_data[change_cluster_id] = generated_new_cluster;
                    } else {
                        changeCenterPosition(change_cluster_data, change_size, cluster_info[change_cluster_id][1]);
                    }
            }
        }
        // console.log(clusters_data);
        reference_data = [];
        for (let i = 0; i < clusterNum; i++) {
            reference_data = reference_data.concat(clusters_data[i]);
        }
        return reference_data;
    }

    let cluster_ids = Array.from(new Array(clusterNum).keys());
    shuffle(cluster_ids);

    let change_cluster_ids, change_size;
    change_cluster_ids = cluster_ids.slice(0, change_cluster_number);
    switch (change_size_index) {
        case 0:// 1. small change
            change_size = 0.01 * getRandomIntInclusive(10, 30);
            break;
        case 1:// 2. medium change
            change_size = 0.01 * getRandomIntInclusive(40, 60);
            break;
        case 2:// 3. large change
            change_size = 0.01 * getRandomIntInclusive(80, 100);
            break;
    }
    final_comparative_data = changeClusters(change_cluster_ids, change_size);
    drawScatterplot(final_comparative_data, "Comparative Scatterplot");

    //show data in table
    var dataForm = "";
    trials_data[file_count]["change_info"] = [];
    for (let i = 0; i < change_condition_ids.length; i++) {
        dataForm += "<tr style='background-color:" + used_palette[change_cluster_ids[i]] + "\'><td>" + change_size.toFixed(2) + "</td><td>" + change_condition_ids[i] + "</td><td>" + change_types[change_type_index] + "</td></tr>";
        let cluster_id_str = "id-" + change_cluster_ids[i];
        // console.log(cluster_id_str);
        trials_data[file_count]["change_info"].push({
            "cluster_id": change_cluster_ids[i],
            "cluster_type": change_condition_ids[i]
        });
    }
    trials_data[file_count]["change_size"] = change_size.toFixed(2);

    // document.getElementById("#renderDiv-"+file_count+" changeInfoLabel").innerHTML = dataForm;
    d3.select("#renderDiv-" + file_count + " #changeInfoLabel").html(dataForm)
}

let file_count = 0;
// for each change magnitude, each change type, we generate 100 scatterplot pairs, then choose 6 representative scatterplots from 100
let trials_data = new Array(100);
let class_num = 8, repeat_count = 0;
let change_size_array = [[0.1, 0.3], [0.4, 0.6], [0.8, 1.0]];
let change_cluster_number = 3, change_size_index = 2, change_type_index = 1;
let change_sizes = ["s", "m", "l"]


function startGenerator() {
    // for each change type, for each change cluster number, for each change size, repeat 10 times
    let interval = setInterval(function () {
        console.log(file_count, change_types[change_type_index], change_size_index, repeat_count);
        trials_data[file_count] = {
            "file_id": file_count,
            "file_name": file_count + "-" + change_types[change_type_index] + "-" + change_sizes[change_size_index],
            "options": class_num,
            "change_type": -1,
            "change_size_type": change_size_index
        };
        cloneTheDiv(file_count)
        generateScatterplots()
        // source_data.push([final_reference_data, final_comparative_data])
        saveTable(file_count, change_types[change_type_index], change_sizes[change_size_index]);
        file_count += 1;

        repeat_count++;
        if (repeat_count === 100) {
            console.log(trials_data);
            console.log(JSON.stringify(trials_data));
            d3.select("#renderDiv").style("display", "none")
            clearInterval(interval);
        }
    }, 1000);
}

function generateGuideData() {
    // contains all change types with large change magnitude
    let interval = setInterval(function () {
        trials_data[file_count] = {
            "file_id": file_count,
            "file_name": "guide",
            "options": class_num,
            "change_type": "guide",
            "change_size_type": change_size_index
        };
        cloneTheDiv(file_count)
        generateScatterplots()
        // source_data.push([final_reference_data, final_comparative_data])
        saveTable(file_count, "guide", change_sizes[change_size_index]);
        file_count += 1;

        repeat_count++;
        if (repeat_count === 10) {
            console.log(trials_data);
            console.log(JSON.stringify(trials_data));
            d3.select("#renderDiv").style("display", "none")
            clearInterval(interval);
        }
    }, 1000);
}
change_type_index = -1
generateGuideData();