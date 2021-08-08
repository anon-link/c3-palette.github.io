/**
 * for each scatterplot pair, generate result for each condition
 * conditions: random, optimized assignment, optimized assignment+alpha blending, c3-palette assignment, palettailor, c3-palette generation
 */
let labelToClass;
function generateRandomAssignment() {
    let cluster_num = Object.keys(labelToClass).length;
    let sigma = used_palette.slice();
    shuffle(sigma)
    return sigma.slice(0, cluster_num);
}

function generateOptimizedAssignment(source_datasets) {
    let cluster_num = Object.keys(labelToClass).length;
    let [knng_metric, ns_weight] = processData(source_datasets[0])
    let [best_palette, sigmaAndScore] = _doColorAssignment(used_palette, cluster_num, knng_metric, ns_weight);
    return best_palette;
}

function generateAlphaBlending(optimized_palette, source_datasets, svgText, change_info) {
    let change_ids = change_info.map(d => d["cluster_id"])
    console.log(change_ids);
    for (let i = 0; i < source_datasets.length; i++) {

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
            .data(source_datasets[i])
            .enter().append("circle")
            .attr("class", "dot")
            .attr("id", function (d) { return "cluster-" + cValue(d) })
            .attr("r", 4)
            .attr("cx", xMap)
            .attr("cy", yMap)
            .style("fill", function (d) {
                return optimized_palette[cValue(d)];
            })
            .style("opacity", function (d) {
                if (change_ids.indexOf(cValue(d)) === -1) {
                    return "0.5";
                } else {
                    return "1";
                }
            })
        svg.append("text").attr("x", 0).attr("y", height + 20).text(svgText);
    }
}

function generateC3PaletteAssignment(source_datasets) {
    let weights = [0.8, 0, 0]
    let cluster_num = Object.keys(labelToClass).length;
    let c3palette = new C3Palette(source_datasets, cluster_num, weights, width, height, used_palette)
    let palette = c3palette.run;

    return palette;
}

function generatePalettailor(source_datasets) {
    let weights = [1, 1, 1]
    let cluster_num = Object.keys(labelToClass).length;
    let palettailor = new Palettailor(source_datasets[0], cluster_num, weights, width, height)
    let palette = palettailor.run;
    return palette;
}

function generateC3PaletteGeneration(source_datasets) {

    let weights = [0.8, 0.5, 0.25]
    let cluster_num = Object.keys(labelToClass).length;
    let c3palette = new C3Palette(source_datasets, cluster_num, weights, width, height)
    let palette = c3palette.run;

    return palette;
}

file_count = 0;
function calcOneTrial() {
    console.log(file_count);
    trials_data = guide_data
    let source_datasets = [];
    d3.text("./raw/" + trials_data[file_count]["file_name"] + "-ref.csv", function (error, text) {
        if (error) throw error;
        let labelSet = new Set();
        loadData(text, labelSet, source_datasets);

        d3.text("./raw/" + trials_data[file_count]["file_name"] + "-comp.csv", function (error2, text2) {
            if (error2) throw error2;
            loadData(text2, labelSet, source_datasets);
            labelToClass = getLabelToClassMapping(labelSet);
            let cluster_num = Object.keys(labelToClass).length;

            cloneTheDiv(file_count)
            reorderData(trials_data[file_count]["change_info"], cluster_num, source_datasets)

            trials_data[file_count]["options"] = new Array(6);
            trials_data[file_count]["options"][0] = generateRandomAssignment();
            drawScatterplot(source_datasets[0], "Random Assignment", trials_data[file_count]["options"][0]);
            drawScatterplot(source_datasets[1], "Random Assignment", trials_data[file_count]["options"][0]);

            //show data in table
            var dataForm = "";
            let change_info = trials_data[file_count]["change_info"];
            for (let i = 0; i < change_info.length; i++) {
                dataForm += "<tr style='background-color:" + trials_data[file_count]["options"][0][change_info[i]["cluster_id"]] + "\'><td>" + trials_data[file_count]["change_size"] + "</td><td>" + change_info[i]["cluster_type"] + "</td><td>" + trials_data[file_count]["change_type"] + "</td></tr>";
            }
            d3.select("#renderDiv-" + file_count + " #tableCaption").text(file_count + " - " + trials_data[file_count]["file_name"])
            d3.select("#renderDiv-" + file_count + " #changeInfoLabel").html(dataForm)

            trials_data[file_count]["options"][1] = generateOptimizedAssignment(source_datasets);
            drawScatterplot(source_datasets[0], "Optimized Assignment", trials_data[file_count]["options"][1]);
            drawScatterplot(source_datasets[1], "Optimized Assignment", trials_data[file_count]["options"][1]);

            // alpha blending
            generateAlphaBlending(trials_data[file_count]["options"][1], source_datasets, "Alpha Blending", change_info)
            trials_data[file_count]["options"][2] = trials_data[file_count]["options"][1].slice()

            trials_data[file_count]["options"][3] = generateC3PaletteAssignment(source_datasets)
            drawScatterplot(source_datasets[0], "C3-Palette Assignment", trials_data[file_count]["options"][2]);
            drawScatterplot(source_datasets[1], "C3-Palette Assignment", trials_data[file_count]["options"][2]);
            // console.log("C3-Palette Assignment");

            trials_data[file_count]["options"][4] = convert2Hex(generatePalettailor(source_datasets));
            drawScatterplot(source_datasets[0], "Palettailor", trials_data[file_count]["options"][3]);
            drawScatterplot(source_datasets[1], "Palettailor", trials_data[file_count]["options"][3]);
            // console.log("Palettailor");

            trials_data[file_count]["options"][5] = convert2Hex(generateC3PaletteGeneration(source_datasets));
            drawScatterplot(source_datasets[0], "C3-Palette Generation", trials_data[file_count]["options"][4]);
            drawScatterplot(source_datasets[1], "C3-Palette Generation", trials_data[file_count]["options"][4]);
            // console.log("C3-Palette Generation");

            if (file_count < trials_data.length - 1) {
                file_count++;
                calcOneTrial();
            } else {
                console.log(JSON.stringify(trials_data));
            }
        });

    });
}
calcOneTrial()

if (false) {
    console.log(trials_data.length);
    // extract selected trials
    for (let i of selected_ids) {
        trials_data.push(raw_trials_data[i])
    }
    console.log(JSON.stringify(trials_data));
    console.log(trials_data.length);
}

if (false) {
    // extract selected trials
    let extracted_data = []
    for (let i of selected_ids) {
        extracted_data.push(raw_trials_data[i])
    }
    // rename file_id
    for (let i = 0; i < extracted_data.length; i++) {
        extracted_data[i]["file_id"] = i
    }
    console.log(JSON.stringify(extracted_data));
    console.log(extracted_data.length);
}

if (false) {
    // extract training data
    let extracted_data = []
    for (let d of training_data_ids) {
        raw_trials_data[d[0]]["options"] = raw_trials_data[d[0]]["options"][d[1]]
        extracted_data.push(raw_trials_data[d[0]])
    }
    // rename file_id
    for (let i = 0; i < extracted_data.length; i++) {
        extracted_data[i]["file_id"] = i
    }
    console.log(JSON.stringify(extracted_data));
    console.log(extracted_data.length);
}
/**
 * show all
 */
function showAllData() {
    console.log(file_count);
    // console.log(final_data);
    // final_data = raw_trials_data
    // if (selected_ids.indexOf(file_count) != -1) {
    //     file_count++;
    //     showAllData();
    //     return;
    // }
    let source_datasets = [];
    d3.text("./final_selected_data/" + final_data[file_count]["file_name"] + "-ref.csv", function (error, text) {
        if (error) throw error;
        let labelSet = new Set();
        loadData(text, labelSet, source_datasets);
        // downloadFile(final_data[file_count]["file_name"] + "-ref.csv", text);

        d3.text("./final_selected_data/" + final_data[file_count]["file_name"] + "-comp.csv", function (error2, text2) {
            if (error2) throw error2;
            loadData(text2, labelSet, source_datasets);
            // downloadFile(final_data[file_count]["file_name"] + "-comp.csv", text2);
            labelToClass = getLabelToClassMapping(labelSet);
            let cluster_num = Object.keys(labelToClass).length;

            cloneTheDiv(file_count)
            reorderData(final_data[file_count]["change_info"], cluster_num, source_datasets)

            drawScatterplot(source_datasets[0], "Random Assignment", final_data[file_count]["options"][0]);
            drawScatterplot(source_datasets[1], "Random Assignment", final_data[file_count]["options"][0]);

            //show data in table
            var dataForm = "";
            let change_info = final_data[file_count]["change_info"];
            for (let i = 0; i < change_info.length; i++) {
                dataForm += "<tr style='background-color:" + final_data[file_count]["options"][0][change_info[i]["cluster_id"]] + "\'><td>" + final_data[file_count]["change_size"] + "</td><td>" + change_info[i]["cluster_type"] + "</td><td>" + final_data[file_count]["change_type"] + "</td></tr>";
            }
            d3.select("#renderDiv-" + file_count + " #tableCaption").text(file_count + " - " + final_data[file_count]["file_name"])
            d3.select("#renderDiv-" + file_count + " #changeInfoLabel").html(dataForm)

            drawScatterplot(source_datasets[0], "Optimized Assignment", final_data[file_count]["options"][1]);
            drawScatterplot(source_datasets[1], "Optimized Assignment", final_data[file_count]["options"][1]);

            // alpha blending
            generateAlphaBlending(final_data[file_count]["options"][1], source_datasets, "Alpha Blending", change_info)

            drawScatterplot(source_datasets[0], "C3-Palette Assignment", final_data[file_count]["options"][2]);
            drawScatterplot(source_datasets[1], "C3-Palette Assignment", final_data[file_count]["options"][2]);
            // console.log("C3-Palette Assignment");

            drawScatterplot(source_datasets[0], "Palettailor", final_data[file_count]["options"][3]);
            drawScatterplot(source_datasets[1], "Palettailor", final_data[file_count]["options"][3]);
            // console.log("Palettailor");

            drawScatterplot(source_datasets[0], "C3-Palette Generation", final_data[file_count]["options"][4]);
            drawScatterplot(source_datasets[1], "C3-Palette Generation", final_data[file_count]["options"][4]);
            // console.log("C3-Palette Generation");

            if (file_count < final_data.length - 1) {
                file_count++;
                showAllData();
            } else {
                // console.log(JSON.stringify(final_data));
            }
        });

    });
}
// showAllData()
console.log(final_data.length);

function checkTmp() {
    let source_datasets = [];
    let file_count_tmp = replaced_palette[file_count][0]
    final_data[file_count_tmp]["options"][4] = replaced_palette[file_count][2]
    d3.text("./selected_data/" + final_data[file_count_tmp]["file_name"] + "-ref.csv", function (error, text) {
        if (error) throw error;
        let labelSet = new Set();
        loadData(text, labelSet, source_datasets);

        d3.text("./selected_data/" + final_data[file_count_tmp]["file_name"] + "-comp.csv", function (error2, text2) {
            if (error2) throw error2;
            loadData(text2, labelSet, source_datasets);
            labelToClass = getLabelToClassMapping(labelSet);
            let cluster_num = Object.keys(labelToClass).length;

            cloneTheDiv(file_count)
            reorderData(final_data[file_count_tmp]["change_info"], cluster_num, source_datasets)

            //show data in table
            var dataForm = "";
            let change_info = final_data[file_count_tmp]["change_info"];
            for (let i = 0; i < change_info.length; i++) {
                dataForm += "<tr style='background-color:" + final_data[file_count_tmp]["options"][0][change_info[i]["cluster_id"]] + "\'><td>" + final_data[file_count_tmp]["change_size"] + "</td><td>" + change_info[i]["cluster_type"] + "</td><td>" + final_data[file_count_tmp]["change_type"] + "</td></tr>";
            }
            d3.select("#renderDiv-" + file_count + " #tableCaption").text(file_count_tmp + " - " + final_data[file_count_tmp]["file_name"])
            d3.select("#renderDiv-" + file_count + " #changeInfoLabel").html(dataForm)

            drawScatterplot(source_datasets[0], "C3-Palette Generation", replaced_palette[file_count][2]);
            drawScatterplot(source_datasets[1], "C3-Palette Generation", replaced_palette[file_count][2]);
            // console.log("C3-Palette Generation");

            if (file_count_tmp < final_data.length - 1) {
                file_count++;
                checkTmp();
            } else {
                console.log(final_data.length);
                console.log(JSON.stringify(final_data));
            }
        });

    });
}

// checkTmp()

function showTrainingData() {
    let source_datasets = [];
    final_data = training_data
    d3.text("./selected_data/" + final_data[file_count]["file_name"] + "-ref.csv", function (error, text) {
        if (error) throw error;
        let labelSet = new Set();
        loadData(text, labelSet, source_datasets);

        d3.text("./selected_data/" + final_data[file_count]["file_name"] + "-comp.csv", function (error2, text2) {
            if (error2) throw error2;
            loadData(text2, labelSet, source_datasets);
            labelToClass = getLabelToClassMapping(labelSet);
            let cluster_num = Object.keys(labelToClass).length;

            cloneTheDiv(file_count)
            reorderData(final_data[file_count]["change_info"], cluster_num, source_datasets)

            drawScatterplot(source_datasets[0], "d", final_data[file_count]["options"]);
            drawScatterplot(source_datasets[1], "d", final_data[file_count]["options"]);
            // console.log("C3-Palette Generation");

            if (file_count < final_data.length - 1) {
                file_count++;
                showTrainingData();
            } else {
                console.log(final_data.length);
                // console.log(JSON.stringify(final_data));
            }
        });

    });
}
// showTrainingData()

function addMagnitude() {
    let magnitude = 0;
    for (let i = 0; i < final_data_replaced.length; i++) {
        let s = final_data_replaced[i]["change_size"]
        if (s >= 0.8) {
            magnitude = 2;
        } else if (s >= 0.4) {
            magnitude = 1;
        } else {
            magnitude = 0;
        }
        final_data_replaced[i]["magnitude"] = magnitude

        final_data_replaced[i]["options"].splice(2, 0, final_data_replaced[i]["options"][1])
    }
    console.log(JSON.stringify(final_data_replaced));
}
// addMagnitude()