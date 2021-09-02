// draw saliency map
function drawSaliencyMap(data, cosaliency_values, text) {

    let cosaliency_scores = cosaliency_values.slice();
    let cosaliency_extent = d3.extent(cosaliency_scores)
    if (text == "total-0" || text == "total-1") {
        for (let i = 0; i < cosaliency_scores.length; i++) {//0.6-1.0
            cosaliency_scores[i] = Math.log10(9 * (cosaliency_scores[i] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 1);
            // cosaliency_scores[i] = 0.8 * (cosaliency_scores[i] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 0.2;
        }
    }
    if (text == "alpha-0" || text == "alpha-1")
    // for (let i = 0; i < cosaliency_scores.length; i++) {
    //     cosaliency_scores[i] = Math.log10(8 * (cosaliency_scores[i] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 2);
    //     // cosaliency_scores[i] = 0.7 * (cosaliency_scores[i] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 0.3;
    // }
    {

        let extent_0 = [], extent_1 = []
        for (let i = 0; i < cosaliency_scores.length; i++) {
            if (cosaliency_scores[i] < 0.3) {
                extent_0.push([i, cosaliency_scores[i]])
            } else {
                extent_1.push([i, cosaliency_scores[i]])
            }
        }
        cosaliency_extent = d3.extent(extent_0, function (d) { return d[1]; })
        for (let i = 0; i < extent_0.length; i++) {//0.15-0.45
            cosaliency_scores[extent_0[i][0]] = 0.3 * (extent_0[i][1] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 0.15;
        }
        cosaliency_extent = d3.extent(extent_1, function (d) { return d[1]; })
        for (let i = 0; i < extent_1.length; i++) {//0.7-1.0
            cosaliency_scores[extent_1[i][0]] = 0.2 * (extent_1[i][1] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 0.8;
        }
    }
    if (text == "beta-0" || text == "beta-1")
        for (let i = 0; i < cosaliency_scores.length; i++) {
            cosaliency_scores[i] = Math.log10(8 * (cosaliency_scores[i] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 2);
        }
    if (text == "change-0" || text == "change-1") {
        for (let i = 0; i < cosaliency_scores.length; i++) {
            cosaliency_scores[i] = Math.log10(9 * (cosaliency_scores[i] - cosaliency_extent[0]) / (cosaliency_extent[1] - cosaliency_extent[0]) + 1);
        }
    }


    console.log(text, cosaliency_scores);

    let scatterplot_svg = d3.select("#renderDiv").append("svg")
        .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);
    let scatterplot = scatterplot_svg.style("background-color", "#000").append("g")
        .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");
    // draw dots
    let dots = scatterplot.append("g");
    for (let d of data) {
        // calculate the co-saliency value
        dots.append("circle")
            .attr("class", "dot")
            .attr("id", "class_" + labelToClass[cValue(d)])
            .attr("r", radius)
            .attr("cx", xMap(d))
            .attr("cy", yMap(d))
            .attr("fill", d3.rgb(255 * cosaliency_scores[labelToClass[cValue(d)]], 255 * cosaliency_scores[labelToClass[cValue(d)]], 255 * cosaliency_scores[labelToClass[cValue(d)]]));
    }
    scatterplot_svg.append("text").attr("x", 0).attr("y", 20).attr("fill", "#fff").text(text);

    let svg_width = SVGWIDTH - svg_margin.left - svg_margin.right,
        svg_height = SVGHEIGHT - svg_margin.top - svg_margin.bottom;
    // // add the x Axis
    // scatterplot.append("g")
    //     .attr("transform", "translate(0," + svg_height + ")")
    //     .call(d3.axisBottom(xScale).tickFormat(""));

    // // add the y Axis
    // scatterplot.append("g")
    //     .call(d3.axisLeft(yScale).tickFormat(""));

    // scatterplot.on("click", function () {
    //     savePNG2(scatterplot_svg, text);
    // })

}


function outputCoSaliency(palette) {
    let color_dis = new Array(palette.length)
    for (let i = 0; i < palette.length; i++)
        color_dis[i] = new Array(palette.length)
    let bg_contrast_array = new Array(palette.length)
    for (let i = 0; i < palette.length; i++) {
        for (let j = i + 1; j < palette.length; j++) {
            color_dis[i][j] = color_dis[j][i] = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
        }
        bg_contrast_array[i] = d3_ciede2000(d3.lab(palette[i]), d3.lab(d3.rgb(bgcolor)));
    }
    let total_scores = new Array(palette.length).fill(0)
    let alpha_scores = new Array(palette.length).fill(0)
    let beta_scores = new Array(palette.length).fill(0)
    let cosaliency_lambda = 0.4
    for (let i = 0; i < palette.length; i++) {
        for (let j = 0; j < palette.length; j++) {
            if (i === j) continue;
            alpha_scores[i] += alphaShape_distance[i][j] * color_dis[i][j];
        }
        if (change_distance[i] > kappa)
            beta_scores[i] += non_separability_weights[i] * bg_contrast_array[i];
        else
            beta_scores[i] -= non_separability_weights[i] * bg_contrast_array[i];
        total_scores[i] = cosaliency_lambda * alpha_scores[i] * Math.exp(change_distance[i]) * 100 + (1 - cosaliency_lambda) * beta_scores[i] * Math.exp(change_distance[i]);
    }
    beta_scores = beta_scores.map(d => Math.abs(d))
    console.log("cosaliency scores:", alpha_scores, beta_scores, total_scores);
    return [alpha_scores, beta_scores, total_scores];
}
