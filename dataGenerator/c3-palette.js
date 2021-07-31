class C3Palette {
    constructor(data, class_number, weights, width, height, palette) {
        this.data = data;
        this.classNumber = class_number;
        this.weights = weights;
        this.width = width;
        this.height = height;
        this.givenPalette = palette;

        this.alphaShape_distance = [];
        this.change_distance = []
        this.delta_change_distance = []
        this.initial_scores = [-1, -1]
        this.kappa = [0, 1]
    }

    get run() {
        return this.calcPalette();
    }

    calcPalette() {
        let xValue = d => d.x, yValue = d => d.y;
        let xScale = d3.scaleLinear().range([0, this.width]), // value -> display
            xMap = function (d) {
                return xScale(xValue(d));
            };
        let yScale = d3.scaleLinear().range([this.height, 0]), // value -> display
            yMap = function (d) {
                return yScale(yValue(d));
            };
        let dataset = [];
        for (let i = 0; i < this.data.length; i++) {
            dataset = dataset.concat(this.data[i]);
        }
        xScale.domain(d3.extent(dataset, xValue));
        yScale.domain(d3.extent(dataset, yValue));

        this.alphaShape_distance = this.calculateAlphaShape(this.data, [[0, 0], [this.width, this.height]], xMap, yMap);
        this.change_distance = this.calcChangingDistance(xMap, yMap);
        this.delta_change_distance = this.getDeltaDistance(this.change_distance);
        for (let i = 0; i < this.classNumber; i++) {
            for (let j = 0; j < this.classNumber; j++) {
                if (i === j) continue;
                this.alphaShape_distance[i][j] *= Math.exp(this.change_distance[i]) / this.classNumber;
            }
            this.delta_change_distance[i] /= this.classNumber;
        }
        console.log(this.alphaShape_distance, this.change_distance, this.delta_change_distance);

        let colors_scope = { "hue_scope": [0, 360], "lumi_scope": [35, 95] };
        let best_color;
        if (this.givenPalette) {
            best_color = this.doColorAssignment(this.givenPalette, this.classNumber)
        } else {
            best_color = this.simulatedAnnealing2FindBestPalette(this.classNumber, colors_scope);
        }


        let palette = new Array(this.classNumber);
        for (let i = 0; i < this.classNumber; i++) {
            palette[i] = best_color.id[i];
        }
        return palette;
    }


    /**
     * alpha-Shape graph Implementation
     * using Philippe Rivière’s bl.ocks.org/1b7ddbcd71454d685d1259781968aefc 
     * voronoi.find(x,y) finds the nearest cell to the point (x,y).
     * extent is like: [[30, 30], [width - 30, height - 30]]
     */
    calculateAlphaShape(datasets, extent, xMap, yMap) {
        let alphaShape_distance = new Array(this.classNumber);
        for (let i = 0; i < this.classNumber; i++) {
            alphaShape_distance[i] = new Array(this.classNumber).fill(0);
        }
        for (let m = 0; m < datasets.length; m++) {
            let voronoi = d3.voronoi().x(function (d) { return xMap(d); }).y(function (d) { return yMap(d); })
                .extent(extent);
            let diagram = voronoi(datasets[m]);
            let cells = diagram.cells;
            let alpha = 25 * 2;
            let distanceDict = {};
            for (let cell of cells) {
                if (cell === undefined) continue;
                let label = labelToClass[cell.site.data.label];
                // console.log(cell.halfedges);
                cell.halfedges.forEach(function (e) {
                    let edge = diagram.edges[e];
                    let ea = edge.left;
                    if (ea === cell.site || !ea) {
                        ea = edge.right;
                    }
                    if (ea) {
                        let ea_label = labelToClass[ea.data.label];
                        if (label != ea_label) {
                            let dx, dy, dist;
                            dx = cell.site[0] - ea[0];
                            dy = cell.site[1] - ea[1];
                            dist = Math.sqrt(dx * dx + dy * dy);
                            if (alpha > dist) {
                                if (distanceDict[label] === undefined)
                                    distanceDict[label] = {};
                                if (distanceDict[label][ea_label] === undefined)
                                    distanceDict[label][ea_label] = [];
                                distanceDict[label][ea_label].push(inverseFunc(dist) / cell.halfedges.length);
                            }
                        }
                    }
                });
            }
            console.log("distanceDict:", distanceDict);

            for (var i in distanceDict) {
                for (var j in distanceDict[i]) {
                    i = +i, j = +j;
                    alphaShape_distance[i][j] += d3.sum(distanceDict[i][j]);
                }
            }
        }
        console.log("alphaShape_distance:", alphaShape_distance);

        return alphaShape_distance;
    }

    SplitDataByClass(data, xMap, yMap) {
        var clusters = {};
        for (let d of data) {
            if (clusters[d.label] == undefined)
                clusters[d.label] = [];
            clusters[d.label].push({
                x: xMap(d),
                y: yMap(d),
                label: d.label
            });
        }
        return clusters;
    }

    /**
     * calculte the changing distance of each class
     * based on LAP(Linear Assignment Program)
     */
    calcChangingDistance(xMap, yMap) {
        let longest_distance = this.width * 1.414;
        let change_distance = new Array(this.classNumber).fill(0);
        for (let i = 0; i < this.data.length - 1; i++) {
            var ref_clusters = this.SplitDataByClass(this.data[i], xMap, yMap),
                comp_clusters = this.SplitDataByClass(this.data[i + 1], xMap, yMap);
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
        return change_distance;
    }

    getDeltaDistance(distanceArray) {
        let result = distanceArray.slice();
        for (let i = 0; i < distanceArray.length; i++) {
            if (distanceArray[i] > this.kappa[0] && distanceArray[i] <= this.kappa[1])
                result[i] = Math.exp(distanceArray[i]);
            else if (distanceArray[i] <= this.kappa[0] || distanceArray[i] > this.kappa[1])
                result[i] = -1;
        }

        return result;
    }


    evaluatePalette(p) {
        let color_dis = new Array(p.length)
        for (let i = 0; i < p.length; i++)
            color_dis[i] = new Array(p.length)
        let bg_contrast_array = new Array(p.length)
        let name_difference = 0,
            color_discrimination_constraint = 100000;
        for (let i = 0; i < p.length; i++) {
            for (let j = i + 1; j < p.length; j++) {
                color_dis[i][j] = color_dis[j][i] = d3_ciede2000(d3.lab(p[i]), d3.lab(p[j]));
                name_difference += getNameDifference(p[i], p[j]);
                color_discrimination_constraint = (color_discrimination_constraint > color_dis[i][j]) ? color_dis[i][j] : color_discrimination_constraint;
            }
            bg_contrast_array[i] = d3_ciede2000(d3.lab(p[i]), d3.lab(d3.rgb(bgcolor)));
            color_discrimination_constraint = (color_discrimination_constraint > bg_contrast_array[i]) ? bg_contrast_array[i] : color_discrimination_constraint;
        }
        let cosaliency_score = 0;
        let tmp_pd = 0, tmp_cb = 0
        for (let i = 0; i < p.length; i++) {
            for (let j = 0; j < p.length; j++) {
                if (i === j) continue;
                tmp_pd += this.alphaShape_distance[i][j] * color_dis[i][j];
            }
            tmp_cb += this.delta_change_distance[i] * bg_contrast_array[i];
        }
        if (this.initial_scores[0] === -1) {
            this.initial_scores[0] = tmp_pd;
            this.initial_scores[1] = tmp_cb;
        }
        cosaliency_score = (1 - this.weights[0]) * tmp_pd / this.initial_scores[0] + this.weights[0] * tmp_cb / Math.abs(this.initial_scores[1]);
        name_difference /= p.length * (p.length - 1) * 0.25;
        color_discrimination_constraint *= 0.1;
        // console.log(cosaliency_score, name_difference, color_discrimination_constraint);

        return cosaliency_score + this.weights[1] * name_difference + this.weights[2] * color_discrimination_constraint;
    }

    doColorAssignment(palette, class_number) {
        let iterate_times = 0;
        //default parameters
        let max_temper = 100000,
            dec = 0.99,
            max_iteration_times = 10000000,
            end_temper = 0.001;
        let cur_temper = max_temper;
        //generate a totally random palette
        let color_palette = palette;
        //evaluate the default palette
        let o = {
            id: color_palette,
            score: this.evaluatePalette(color_palette.slice(0, class_number))
        },
            preferredObj = o;

        while (cur_temper > end_temper) {
            for (let i = 0; i < 1; i++) {//disturb at each temperature
                iterate_times++;
                color_palette = o.id.slice();
                let idx_0, idx_1;
                // randomly shuffle two colors of the palette 
                idx_0 = getRandomIntInclusive(0, class_number - 1);
                idx_1 = getRandomIntInclusive(0, class_number - 1);
                while (idx_0 === idx_1) {
                    idx_1 = getRandomIntInclusive(0, class_number - 1);
                }
                if (Math.random() < 0.5) {
                    idx_0 = getRandomIntInclusive(0, class_number - 1);
                    idx_1 = getRandomIntInclusive(class_number + 1, color_palette.length - 1);
                }

                let tmp = color_palette[idx_0];
                color_palette[idx_0] = color_palette[idx_1];
                color_palette[idx_1] = tmp;
                let o2 = {
                    id: color_palette,
                    score: this.evaluatePalette(color_palette.slice(0, class_number))
                };

                let delta_score = o.score - o2.score;
                if (delta_score <= 0 || delta_score > 0 && Math.random() <= Math.exp((-delta_score) / cur_temper)) {
                    o = o2;
                    if (preferredObj.score - o.score < 0) {
                        preferredObj = o;
                    }
                }
                if (iterate_times > max_iteration_times) {
                    break;
                }
            }

            cur_temper *= dec;
        }

        return preferredObj;
    }

    /**
     * using simulated annealing to find the best palette of given data
     * @param {*} palette_size 
     * @param {*} evaluateFunc 
     * @param {*} colors_scope: hue range, lightness range, saturation range
     * @param {*} flag 
     */
    simulatedAnnealing2FindBestPalette(palette_size, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [35, 85] }) {
        let iterate_times = 0;
        //default parameters
        let max_temper = 100000,
            dec = 0.99,
            max_iteration_times = 10000000,
            end_temper = 0.001;
        let cur_temper = max_temper;
        //generate a totally random palette
        let color_palette = this.getColorPaletteRandom(palette_size);
        //evaluate the default palette
        let o = {
            id: color_palette,
            score: this.evaluatePalette(color_palette)
        },
            preferredObj = o;

        while (cur_temper > end_temper) {
            for (let i = 0; i < 1; i++) {//disturb at each temperature
                iterate_times++;
                color_palette = o.id.slice();
                this.disturbColors(color_palette, colors_scope);
                let color_palette_2 = color_palette.slice();
                let o2 = {
                    id: color_palette_2,
                    score: this.evaluatePalette(color_palette_2)
                };

                let delta_score = o.score - o2.score;
                if (delta_score <= 0 || delta_score > 0 && Math.random() <= Math.exp((-delta_score) / cur_temper)) {
                    o = o2;
                    if (preferredObj.score - o.score < 0) {
                        preferredObj = o;
                    }
                }
                if (iterate_times > max_iteration_times) {
                    break;
                }
            }

            cur_temper *= dec;
        }

        return preferredObj;
    }

    getColorPaletteRandom(palette_size) {
        let palette = [];
        for (let i = 0; i < palette_size; i++) {
            let rgb = d3.rgb(getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255));
            palette.push(rgb);
        }
        return palette;
    }

    randomDisturbColors(palette, colors_scope) {
        let disturb_step = 50;
        // random disturb one color
        let idx = getRandomIntInclusive(0, palette.length - 1),
            rgb = d3.rgb(palette[idx]),
            color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step))),
            hcl = d3.hcl(color);
        color = d3.rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
        palette[idx] = d3.rgb(norm255(color.r), norm255(color.g), norm255(color.b));
        let count = 0, sign;
        while ((sign = this.isDiscriminative(palette)) > 0) {
            count += 1;
            if (count >= 100) break;
            rgb = d3.rgb(palette[sign])
            color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step)))
            hcl = d3.hcl(color);
            if (hcl.h >= 85 && hcl.h <= 114 && hcl.l >= 35 && hcl.l <= 75) {
                if (Math.abs(hcl.h - 85) > Math.abs(hcl.h - 114)) {
                    hcl.h = 115;
                } else {
                    hcl.h = 84;
                }
            }
            palette[sign] = d3.rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
        }
    }

    isDiscriminative(palette) {
        for (let i = 0; i < palette.length; i++) {
            for (let j = i + 1; j < palette.length; j++) {
                let color_dis = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
                if (color_dis < 10) {
                    return j;
                }
            }
            if (d3_ciede2000(d3.lab(palette[i]), d3.lab(bgcolor)) < 10) {
                return i;
            }
        }
        return -1;
    }

    /**
     * only use color discrimination
     * @param {} palette 
     * @param {*} colors_scope 
     */
    disturbColors(palette, colors_scope) {
        if (Math.random() < 0.5) {
            this.randomDisturbColors(palette, colors_scope);
        } else {
            // randomly shuffle two colors of the palette 
            let idx_0 = getRandomIntInclusive(0, palette.length - 1),
                idx_1 = getRandomIntInclusive(0, palette.length - 1);
            while (idx_0 === idx_1) {
                idx_1 = getRandomIntInclusive(0, palette.length - 1);
            }
            let tmp = palette[idx_0];
            palette[idx_0] = palette[idx_1];
            palette[idx_1] = tmp;
        }
    }

}