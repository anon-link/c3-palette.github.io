function processData(_data) {
    //scatter plot
    let knng_metric, ns_weight;
    // set the ranges
    let xScale = d3.scaleBand()
        .range([0, svg_width])
        .padding(0.1);
    let yScale = d3.scaleLinear()
        .range([svg_height, 0]);

    let data = [], labels = [];
    for (let i of _data) {
        labels.push(i.x)
        data.push(i.y);
    }
    xScale.domain(labels);
    yScale.domain([0, 1]);


    knng_metric = new TupleDictionary();
    ns_weight = []
    //bar chart
    let baryCenter = new Array(labels.length);
    for (let d of _data) {
        baryCenter[d.x] = [xScale(d.x) + xScale.bandwidth() / 2, svg_height / 2 + yScale(d.y) / 2]
    }
    // only nearest two bars have a distance
    for (let i = 0; i < labels.length - 1; i++) {
        let dist = Math.sqrt((baryCenter[i][0] - baryCenter[i + 1][0]) * (baryCenter[i][0] - baryCenter[i + 1][0]) + (baryCenter[i][1] - baryCenter[i + 1][1]) * (baryCenter[i][1] - baryCenter[i + 1][1]));
        knng_metric.put([i, i + 1], inverseFunc(dist + 1));
        ns_weight[i] = 1 / baryCenter[i][1];
    }
    ns_weight[labels.length - 1] = 1 / baryCenter[labels.length - 1][1];
    console.log("knng scatterplot distance:", knng_metric);
    console.log("knng scatterplot contrast:", ns_weight);
    return [knng_metric, ns_weight];
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

function _doColorAssignment(palette, class_num, knng_metric, ns_weight) {
    // let class_num = palette.length;
    let distanceOf2Colors = calculateDistOf2Colors(palette);
    //best
    let ga = new GA(new Random(Date.now()),
        palette.length,
        (a, b) => a - b,
        (sigma) => E(sigma, knng_metric, ns_weight, distanceOf2Colors),
        (x) => x, 3000);
    let sigmaAndScore = ga.compute();
    console.log("best sigma:", sigmaAndScore);
    let best_palette = new Array(class_num);
    for (let i = 0; i < class_num; i++) {
        best_palette[i] = palette[sigmaAndScore.sigma[i]];
    }
    return [best_palette, sigmaAndScore];
}

let lambda = .4
// Evaluation function
function E(sigma, distanceOf2Clusters, saliencyWeight, distanceOf2Colors) {
    function E_cd(sigma, distanceOf2Clusters, distanceOf2Colors) {
        var score = 0;
        for (var l of distanceOf2Clusters.keys()) {
            var [i, j] = l.split(',');
            var color_pair = sigma[i] < sigma[j] ? [sigma[i], sigma[j]] : [sigma[j], sigma[i]];
            score += lambda * distanceOf2Clusters.get([i, j]) * distanceOf2Colors.get(color_pair);
        }
        return score;
    }
    function E_lc() {
        var score = 0;
        for (var i = 0; i < saliencyWeight.length; i++) {
            var tmp = (1 - lambda) * saliencyWeight[i] * distanceOf2Colors.get([sigma[i], sigma.length]);
            score += tmp;
        }
        return score;
    }
    var score_cd = E_cd(sigma, distanceOf2Clusters, distanceOf2Colors),
        score_lc = E_lc();
    var score = score_cd + score_lc;
    // console.log(score_cd, score_lc);
    return score;
}
