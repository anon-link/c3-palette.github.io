// file id, preserved file id, removed changed cluster id
let change_infos = [
    // pos l
    [1, 1, [3, 4]],// position change
    [3, 0, [1, 5]], // shape change
    [5, 0, [7]], // position + shape
    [0, 1, [2]], // 2 shape
    [2, 1, []],
    [4, 1, []],
    // pos m
    [9, 1, [2, 3]],// position change
    [6, 1, [6, 3]], // shape change
    [8, 0, [3]], // position + shape
    [10, 0, [5]], // position + shape
    [7, 1, []],
    [11, 1, []],
    // pos s
    [12, 0, [3, 7]],// position change
    [15, 0, [4, 2]], // shape change
    [16, 1, [5]], // position + shape
    [17, 0, [4]], // position + shape
    [13, 1, []],
    [14, 1, []],
    // num l
    [19, 0, [7, 0]],
    [21, 1, [5, 2]],
    [22, 0, [6]],
    [20, 0, [0]],
    [18, 1, []],
    [23, 1, []],
    // num m
    [29, 0, [3, 2]],
    [27, 1, [4, 6]],
    [24, 0, [1]],
    [25, 0, [5]],
    [26, 1, []],
    [28, 1, []],
    // num s
    [32, 0, [0, 1]],
    [33, 1, [4, 2]],
    [30, 0, [7]],
    [31, 1, [0]],
    [34, 1, []],
    [35, 1, []]
]

change_infos = [
    [0, 0, []], // 3
    [1, 0, [7, 3]], // 1
    [2, 0, [4]] // 2

]
trials_data = training_data

let process_id = 0

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
    source_datasets.push(source_data);
}
function processData() {
    let id = change_infos[process_id][0],
        change_info = trials_data[id]["change_info"];
    source_datasets = []

    d3.text("./" + trials_data[id]["file_name"] + "-ref.csv", function (error, text) {
        if (error) throw error;
        let labelSet = new Set();
        loadData(text, labelSet);

        d3.text("./" + trials_data[id]["file_name"] + "-comp.csv", function (error, text) {
            if (error) throw error;
            loadData(text, labelSet);

            // split data to clusters
            let ref = splitData2Clusters(source_datasets[0]),
                comp = splitData2Clusters(source_datasets[1])

            let changed_info = [], changed_ref = [], changed_comp = []
            for (let c of change_info) {
                if (change_infos[process_id][2].indexOf(c["cluster_id"]) != -1) {
                    if (change_infos[process_id][1])
                        ref[c["cluster_id"]] = comp[c["cluster_id"]]
                    else {
                        comp[c["cluster_id"]] = ref[c["cluster_id"]]
                    }
                } else {
                    changed_info.push(c)
                }
            }
            trials_data[id]["change_info"] = changed_info

            // save to file
            for (let d in ref) {
                changed_ref = changed_ref.concat(ref[d])
            }
            saveTable(changed_ref, trials_data[id]["file_name"] + "-ref.csv")
            for (let d in comp) {
                changed_comp = changed_comp.concat(comp[d])
            }
            saveTable(changed_comp, trials_data[id]["file_name"] + "-comp.csv")

            console.log(process_id, trials_data[id]["file_id"], trials_data[id]["file_name"]);
            process_id++;

        });
    });

}

function splitData2Clusters(data) {
    var clusters = {};
    for (let d of data) {
        if (clusters[d.label] == undefined)
            clusters[d.label] = [];
        clusters[d.label].push(d);
    }
    return clusters;
}
function saveTable(data, name) {
    let str = "";
    for (let i = 0; i < data.length; i++) {
        str += data[i].x;
        str += ",";
        str += data[i].y;
        str += ",";
        str += data[i].label;
        str += "\n";
    }
    downloadFile(name, str);
}

function downloadFile(fileName, content) {
    var aTag = document.createElement('a');
    var blob = new Blob(['\ufeff' + content], { type: "text/csv" });
    aTag.download = fileName;
    aTag.href = URL.createObjectURL(blob);
    aTag.click();
    URL.revokeObjectURL(blob);
}


let interval = setInterval(function () {

    if (process_id < change_infos.length) {
        processData()
    } else {
        console.log(JSON.stringify(trials_data));
        clearInterval(interval)
    }
}, 1000)